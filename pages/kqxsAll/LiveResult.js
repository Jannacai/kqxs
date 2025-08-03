import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import styles from '../../styles/LivekqxsMB.module.css';
import { getFilteredNumber } from "../../library/utils/filterUtils";
import React from 'react';
import { useLottery } from '../../contexts/LotteryContext';

const LiveResult = React.memo(({ station, getHeadAndTailNumbers = null, handleFilterChange = null, filterTypes = null, isLiveWindow, isModal = false, isForum = false }) => {
    const [modalFilter, setModalFilter] = useState('all');
    const { xsmbLiveData, setXsmbLiveData, setIsXsmbLiveDataComplete } = useLottery() || { xsmbLiveData: null, setXsmbLiveData: null, setIsXsmbLiveDataComplete: null };
    const [isTodayLoading, setIsTodayLoading] = useState(true);
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const [animatingPrize, setAnimatingPrize] = useState(null);
    const [sseStatus, setSseStatus] = useState('connecting');
    const mountedRef = useRef(false);
    const sseRef = useRef(null);
    const sseSetupRef = useRef(false);
    const updateTimeoutRef = useRef(null);

    // Cache cho initial data để tránh fetch lại mỗi lần mount
    const initialDataCache = useRef(new Map());
    const cacheTimeout = 1 * 60 * 1000;
    const prizeCache = useRef(new Map());
    const prizeCacheTimeout = 20 * 1000;
    const sseConnectionPool = useRef(new Map());
    const sseReconnectDelay = 1000;

    // BỔ SUNG: Batch update để tối ưu performance cho 200+ client
    const batchUpdateRef = useRef(new Map());
    const batchTimeoutRef = useRef(null);
    const animationTimeoutsRef = useRef(new Map());
    const localStorageRef = useRef(new Map());
    const localStorageTimeoutRef = useRef(null);
    const LIVE_DATA_TTL = 40 * 60 * 1000; // 40 phút như XSMT
    const cleanupIntervalRef = useRef(null);

    const currentStation = station || 'xsmb';

    // BỔ SUNG: Helper function để lấy thời gian Việt Nam - TỐI ƯU
    let cachedVietnamTime = null;
    let lastCacheTime = 0;
    const CACHE_TIME_DURATION = 1000; // Cache 1 giây

    const getVietnamTime = () => {
        const now = Date.now();
        if (!cachedVietnamTime || (now - lastCacheTime) > CACHE_TIME_DURATION) {
            cachedVietnamTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
            lastCacheTime = now;
        }
        return cachedVietnamTime;
    };

    const today = getVietnamTime().toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).replace(/\//g, '-');
    const maxRetries = 50;
    const retryInterval = 2000;
    const fetchMaxRetries = 3;
    const fetchRetryInterval = 5000;
    const pollingIntervalMs = 7000;
    const regularPollingIntervalMs = 10000;

    // BỔ SUNG: Pre-calculated prize digits mapping như XSMT
    const prizeDigits = {
        maDB: 2,
        specialPrize_0: 5,
        firstPrize_0: 5,
        secondPrize_0: 5,
        secondPrize_1: 5,
        threePrizes_0: 5,
        threePrizes_1: 5,
        threePrizes_2: 5,
        threePrizes_3: 5,
        threePrizes_4: 5,
        threePrizes_5: 5,
        fourPrizes_0: 4,
        fourPrizes_1: 4,
        fourPrizes_2: 4,
        fourPrizes_3: 4,
        fivePrizes_0: 4,
        fivePrizes_1: 4,
        fivePrizes_2: 4,
        fivePrizes_3: 4,
        fivePrizes_4: 4,
        fivePrizes_5: 4,
        sixPrizes_0: 3,
        sixPrizes_1: 3,
        sixPrizes_2: 3,
        sevenPrizes_0: 2,
        sevenPrizes_1: 2,
        sevenPrizes_2: 2,
        sevenPrizes_3: 2,
    };

    const emptyResult = useMemo(() => ({
        drawDate: today,
        station: currentStation,
        dayOfWeek: getVietnamTime().toLocaleString('vi-VN', { weekday: 'long' }),
        tentinh: "Miền Bắc",
        tinh: "MB",
        year: getVietnamTime().getFullYear(),
        month: getVietnamTime().getMonth() + 1,
        maDB: "...",
        specialPrize_0: "...",
        firstPrize_0: "...",
        secondPrize_0: "...",
        secondPrize_1: "...",
        threePrizes_0: "...",
        threePrizes_1: "...",
        threePrizes_2: "...",
        threePrizes_3: "...",
        threePrizes_4: "...",
        threePrizes_5: "...",
        fourPrizes_0: "...",
        fourPrizes_1: "...",
        fourPrizes_2: "...",
        fourPrizes_3: "...",
        fivePrizes_0: "...",
        fivePrizes_1: "...",
        fivePrizes_2: "...",
        fivePrizes_3: "...",
        fivePrizes_4: "...",
        fivePrizes_5: "...",
        sixPrizes_0: "...",
        sixPrizes_1: "...",
        sixPrizes_2: "...",
        sevenPrizes_0: "...",
        sevenPrizes_1: "...",
        sevenPrizes_2: "...",
        sevenPrizes_3: "...",
        lastUpdated: 0,
    }), [today, currentStation]);

    // BỔ SUNG: Khai báo currentFilter trước khi sử dụng trong useCallback
    const tableKey = today + currentStation;
    const currentFilter = isModal ? modalFilter : (filterTypes && filterTypes[tableKey]) || 'all';

    // BỔ SUNG: Tối ưu expensive calculations với useMemo như XSMT
    const processedLiveData = useMemo(() => {
        if (!xsmbLiveData) return null;

        return {
            ...xsmbLiveData,
            // Pre-calculate filtered values
            filteredPrizes: Object.keys(xsmbLiveData).reduce((acc, key) => {
                if (key.includes('Prize') && xsmbLiveData[key] !== '...' && xsmbLiveData[key] !== '***') {
                    acc[key] = getFilteredNumber(xsmbLiveData[key], currentFilter);
                }
                return acc;
            }, {})
        };
    }, [xsmbLiveData, currentFilter]);

    // BỔ SUNG: Debounced localStorage update như XSMT
    const debouncedLocalStorageUpdate = useCallback((key, value) => {
        localStorageRef.current.set(key, value);

        if (localStorageTimeoutRef.current) {
            clearTimeout(localStorageTimeoutRef.current);
        }

        localStorageTimeoutRef.current = setTimeout(() => {
            localStorageRef.current.forEach((value, key) => {
                try {
                    // Thêm timestamp cho liveData
                    const dataWithTimestamp = {
                        data: value,
                        timestamp: Date.now(),
                        ttl: LIVE_DATA_TTL
                    };
                    localStorage.setItem(key, JSON.stringify(dataWithTimestamp));
                } catch (error) {
                    console.error('❌ Lỗi lưu localStorage:', error);
                }
            });
            localStorageRef.current.clear();
        }, 100); // Debounce 100ms như XSMT
    }, []);

    // BỔ SUNG: Cleanup old localStorage data như XSMT
    const cleanupOldLiveData = useCallback(() => {
        try {
            const now = Date.now();
            const keysToRemove = [];

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('liveData:')) {
                    try {
                        const storedData = localStorage.getItem(key);
                        if (storedData) {
                            const parsed = JSON.parse(storedData);
                            if (parsed.timestamp && (now - parsed.timestamp > LIVE_DATA_TTL)) {
                                keysToRemove.push(key);
                            }
                        }
                    } catch (error) {
                        keysToRemove.push(key);
                    }
                }
            }

            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
                console.log(`🧹 Đã xóa liveData cũ: ${key}`);
            });

            if (keysToRemove.length > 0) {
                console.log(`🧹 Đã cleanup ${keysToRemove.length} liveData entries`);
            }
        } catch (error) {
            console.error('❌ Lỗi cleanup liveData:', error);
        }
    }, []);

    // BỔ SUNG: Animation với requestAnimationFrame như XSMT
    const setAnimationWithTimeout = useCallback((prizeType) => {
        if (animationTimeoutsRef.current.has(prizeType)) {
            clearTimeout(animationTimeoutsRef.current.get(prizeType));
        }

        requestAnimationFrame(() => {
            setAnimatingPrize(prizeType);
        });

        const timeoutId = setTimeout(() => {
            requestAnimationFrame(() => {
                if (mountedRef.current) {
                    setAnimatingPrize(null);
                }
            });
            animationTimeoutsRef.current.delete(prizeType);
        }, 2000);

        animationTimeoutsRef.current.set(prizeType, timeoutId);
    }, []);

    // BỔ SUNG: Batch update live data như XSMT
    const batchUpdateLiveData = useCallback((prizeType, value) => {
        const key = `${prizeType}`;
        batchUpdateRef.current.set(key, { prizeType, value });

        // Cache prize type riêng lẻ ngay lập tức
        if (value && value !== '...' && value !== '***') {
            const prizeCacheKey = `${currentStation}:${prizeType}`;
            prizeCache.current.set(prizeCacheKey, {
                value: value,
                timestamp: Date.now()
            });
            console.log(`📦 Cached prize ${prizeType} = ${value} cho XSMB`);

            // Trigger animation cho dữ liệu mới
            if (mountedRef.current) {
                console.log(`🎬 Trigger animation cho ${prizeType} = ${value} (XSMB)`);
                setAnimationWithTimeout(prizeType);
            }
        }

        if (batchTimeoutRef.current) {
            clearTimeout(batchTimeoutRef.current);
        }

        batchTimeoutRef.current = setTimeout(() => {
            if (batchUpdateRef.current.size > 0 && setXsmbLiveData) {
                console.log('🔄 Bắt đầu batch update với:', Array.from(batchUpdateRef.current.values()));
                setXsmbLiveData(prev => {
                    console.log('🔄 Prev liveData:', prev);
                    const updatedData = { ...prev };
                    let hasChanges = false;

                    batchUpdateRef.current.forEach(({ prizeType: updatePrizeType, value: updateValue }) => {
                        console.log(`🔄 Cập nhật ${updatePrizeType} = ${updateValue} cho XSMB`);
                        updatedData[updatePrizeType] = updateValue;
                        hasChanges = true;

                        // Trigger animation cho dữ liệu mới nếu component đang mounted
                        if (mountedRef.current && updateValue && updateValue !== '...' && updateValue !== '***') {
                            console.log(`🎬 Trigger animation cho ${updatePrizeType} = ${updateValue} (XSMB)`);
                            setAnimationWithTimeout(updatePrizeType);
                        }
                    });

                    if (hasChanges) {
                        updatedData.lastUpdated = Date.now();
                        // Sử dụng debounced localStorage
                        debouncedLocalStorageUpdate(`liveData:${currentStation}:${today}`, updatedData);
                    }

                    const isComplete = Object.values(updatedData).every(
                        val => typeof val === 'string' && val !== '...' && val !== '***'
                    );
                    setIsXsmbLiveDataComplete(isComplete);
                    setIsTodayLoading(false);
                    setRetryCount(0);
                    setError(null);

                    console.log('🔄 Batch update liveData:', updatedData);
                    return updatedData;
                });

                // Clear batch
                batchUpdateRef.current.clear();
            }
        }, 50); // Batch update trong 50ms như XSMT
    }, [setXsmbLiveData, debouncedLocalStorageUpdate, currentStation, today]);

    const debouncedSetLiveData = useCallback((newData) => {
        if (updateTimeoutRef.current) {
            clearTimeout(updateTimeoutRef.current);
        }
        updateTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current && setXsmbLiveData) {
                setXsmbLiveData(newData);
            }
        }, 100);
    }, [setXsmbLiveData]);

    useEffect(() => {
        mountedRef.current = true;

        // BỔ SUNG: Setup cleanup interval như XSMT
        cleanupIntervalRef.current = setInterval(cleanupOldLiveData, 10 * 60 * 1000); // 10 phút

        return () => {
            mountedRef.current = false;
            if (sseRef.current) {
                sseRef.current.close();
                sseRef.current = null;
            }
            // Clear timeout nếu có
            if (updateTimeoutRef.current) {
                clearTimeout(updateTimeoutRef.current);
                updateTimeoutRef.current = null;
            }

            // Clear localStorage timeout
            if (localStorageTimeoutRef.current) {
                clearTimeout(localStorageTimeoutRef.current);
                localStorageTimeoutRef.current = null;
            }

            // Clear batch update timeout
            if (batchTimeoutRef.current) {
                clearTimeout(batchTimeoutRef.current);
                batchTimeoutRef.current = null;
            }

            // Clear tất cả animation timeouts
            animationTimeoutsRef.current.forEach((timeoutId) => {
                clearTimeout(timeoutId);
            });
            animationTimeoutsRef.current.clear();

            // Clear batch update ref
            batchUpdateRef.current.clear();

            // Clear prize cache cũ (giữ cache mới để tái sử dụng)
            const now = Date.now();
            for (const [key, value] of prizeCache.current.entries()) {
                if (now - value.timestamp > prizeCacheTimeout) {
                    prizeCache.current.delete(key);
                }
            }

            // Clear initial data cache cũ (giữ cache mới để tái sử dụng)
            for (const [key, value] of initialDataCache.current.entries()) {
                if (now - value.timestamp > cacheTimeout) {
                    initialDataCache.current.delete(key);
                }
            }

            // Đóng tất cả SSE connections
            if (sseRef.current) {
                console.log('🔌 Đóng kết nối SSE...');
                sseRef.current.close();
            }
            sseRef.current = null;

            // Clear connection pool
            sseConnectionPool.current.clear();

            sseSetupRef.current = false; // Reset để có thể thiết lập lại
        };
    }, [cleanupOldLiveData]);

    useEffect(() => {
        if (!setXsmbLiveData || !setIsXsmbLiveDataComplete) return;

        let pollingInterval;

        const fetchInitialData = async (retry = 0) => {
            try {
                const cacheKey = `${currentStation}:${today}`;
                const cachedData = initialDataCache.current.get(cacheKey);

                // Kiểm tra nếu đang trong giờ live (18h-18h59)
                const vietnamTime = getVietnamTime();
                const currentHour = vietnamTime.getHours();
                const isLiveHour = currentHour === 18;

                // Clear cache nếu đã qua giờ live (19h trở đi)
                if (currentHour >= 19) {
                    console.log('🕐 Đã qua giờ live, clear cache để lấy dữ liệu mới');
                    initialDataCache.current.clear();
                    localStorage.removeItem(`liveData:${currentStation}:${today}`);
                }

                if (cachedData && Date.now() - cachedData.timestamp < cacheTimeout) {
                    if (mountedRef.current) {
                        setXsmbLiveData(cachedData.data);
                        setIsXsmbLiveDataComplete(false);
                        setIsTodayLoading(false);
                        setError(null);
                    }
                    return;
                }

                // Nếu không phải giờ live và đang ở modal, gọi API cache
                if (!isLiveHour && currentStation === 'xsmb' && isModal) {
                    console.log('🕐 Không phải giờ live XSMB và đang ở modal, gọi API cache...');
                    // Không gửi ngày hiện tại, chỉ lấy bản mới nhất
                    const response = await fetch(`http://localhost:5000/api/kqxs/xsmb/latest`);
                    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                    const serverData = await response.json();

                    if (mountedRef.current) {
                        // Sử dụng ngày từ dữ liệu thực tế thay vì ngày hiện tại
                        const formatDate = (dateString) => {
                            if (!dateString) return today;
                            try {
                                const date = new Date(dateString);
                                return date.toLocaleDateString('vi-VN');
                            } catch (error) {
                                console.error('Lỗi format ngày:', error);
                                return today;
                            }
                        };

                        const dataWithCorrectDate = {
                            ...serverData,
                            // Đảm bảo hiển thị đúng ngày từ dữ liệu MongoDB
                            drawDate: formatDate(serverData.drawDate),
                            dayOfWeek: serverData.dayOfWeek || 'Chủ nhật'
                        };

                        setXsmbLiveData(dataWithCorrectDate);
                        setIsXsmbLiveDataComplete(true);
                        setIsTodayLoading(false);
                        setRetryCount(0);
                        setError(null);

                        // Cache dữ liệu
                        initialDataCache.current.set(cacheKey, {
                            data: dataWithCorrectDate,
                            timestamp: Date.now()
                        });
                    }
                    return;
                }

                // Trang chính luôn sử dụng SSE, không gọi API cache
                if (!isModal) {
                    console.log('🔄 Trang chính XSMB, sử dụng SSE...');
                }

                // Modal trong giờ live cũng sử dụng SSE như trang chính
                if (isModal && isLiveHour) {
                    console.log('🔄 Modal XSMB trong giờ live, sử dụng SSE...');
                    // Clear cache để đảm bảo lấy dữ liệu mới nhất
                    initialDataCache.current.clear();
                    localStorage.removeItem(`liveData:${currentStation}:${today}`);

                    // Sử dụng SSE trực tiếp như XSMT
                    console.log('🔄 Modal XSMB trong giờ live, kết nối SSE trực tiếp...');
                }

                // Tiếp tục với SSE cho cả trang chính và modal trong giờ live
                console.log('🔄 Tiếp tục với SSE cho XSMB...');

                const response = await fetch(`http://localhost:5000/api/kqxs/xsmb/sse/initial?station=${currentStation}&date=${today}`);
                if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                const serverData = await response.json();

                const cachedLiveData = localStorage.getItem(`liveData:${currentStation}:${today}`);
                let initialData = cachedLiveData ? JSON.parse(cachedLiveData) : { ...emptyResult };

                if (mountedRef.current) {
                    const updatedData = { ...initialData };
                    let shouldUpdate = !initialData.lastUpdated || serverData.lastUpdated > initialData.lastUpdated;
                    for (const key in serverData) {
                        if (serverData[key] !== '...' || !updatedData[key] || updatedData[key] === '...' || updatedData[key] === '***') {
                            updatedData[key] = serverData[key];
                            shouldUpdate = true;
                        }
                    }
                    if (shouldUpdate) {
                        updatedData.lastUpdated = serverData.lastUpdated || Date.now();
                        setXsmbLiveData(updatedData);
                        debouncedLocalStorageUpdate(`liveData:${currentStation}:${today}`, updatedData);

                        initialDataCache.current.set(cacheKey, {
                            data: updatedData,
                            timestamp: Date.now()
                        });

                        const isComplete = Object.values(updatedData).every(
                            val => typeof val === 'string' && val !== '...' && val !== '***'
                        );
                        setIsXsmbLiveDataComplete(isComplete);
                        setIsTodayLoading(false);
                        setRetryCount(0);
                        setError(null);
                    } else {
                        setXsmbLiveData(initialData);
                        setIsXsmbLiveDataComplete(false);
                        setIsTodayLoading(false);
                    }
                }
            } catch (error) {
                console.error(`Lỗi khi lấy dữ liệu khởi tạo XSMB (lần ${retry + 1}):`, error.message);
                if (retry < fetchMaxRetries) {
                    setTimeout(() => {
                        if (mountedRef.current) {
                            fetchInitialData(retry + 1);
                        }
                    }, fetchRetryInterval);
                } else {
                    if (mountedRef.current) {
                        setError(`Không thể kết nối đến server. Vui lòng thử lại sau.`);
                        setIsTodayLoading(false);
                    }
                }
            }
        };

        const connectSSE = () => {
            // Kiểm tra nếu component đã unmount
            if (!mountedRef.current) {
                console.log('⚠️ Component đã unmount, bỏ qua thiết lập SSE');
                return;
            }

            if (!currentStation || !today || !/^\d{2}-\d{2}-\d{4}$/.test(today)) {
                console.warn('⚠️ Invalid station or today value:', { currentStation, today });
                if (mountedRef.current) {
                    setError('Dữ liệu đang tải...');
                    setIsTodayLoading(false);
                }
                return;
            }

            // Kiểm tra nếu đã thiết lập SSE rồi
            if (sseSetupRef.current) {
                console.log('⚠️ SSE đã được thiết lập, bỏ qua');
                return;
            }

            // Kiểm tra nếu đang trong Fast Refresh
            if (typeof window !== 'undefined' && window.__NEXT_DATA__?.buildId !== window.__NEXT_DATA__?.buildId) {
                console.log('⚠️ Đang trong Fast Refresh, bỏ qua thiết lập SSE');
                return;
            }

            // Kiểm tra nếu không phải giờ live cho XSMB (chỉ áp dụng cho modal)
            const vietnamTime = getVietnamTime();
            const currentHour = vietnamTime.getHours();
            const isLiveHour = currentHour === 18;

            // Chỉ kiểm tra giờ live cho modal, trang chính luôn kết nối SSE
            if (!isLiveHour && currentStation === 'xsmb' && isModal) {
                console.log('🕐 Không phải giờ live XSMB và đang ở modal, bỏ qua SSE setup');
                return;
            }

            // Modal trong giờ live cũng kết nối SSE
            if (isModal && isLiveHour) {
                console.log('🔄 Modal XSMB trong giờ live, kết nối SSE...');
            }

            console.log('✅ Bắt đầu thiết lập SSE cho XSMB');
            sseSetupRef.current = true;

            // Reset animation state khi bắt đầu SSE setup
            setAnimatingPrize(null);
            console.log('🔄 Reset animation state cho SSE setup');

            const connectionKey = `${today}`;

            // Kiểm tra connection pool trước
            if (sseConnectionPool.current.has(connectionKey)) {
                const existingConnection = sseConnectionPool.current.get(connectionKey);
                if (existingConnection.readyState === EventSource.OPEN) {
                    console.log(`🔌 SSE connection cho XSMB đã tồn tại và đang hoạt động`);
                    sseRef.current = existingConnection;
                    return;
                } else {
                    // Đóng connection cũ nếu không hoạt động
                    existingConnection.close();
                    sseConnectionPool.current.delete(connectionKey);
                }
            }

            // Kiểm tra nếu đã có connection đang hoạt động
            if (sseRef.current && sseRef.current.readyState !== EventSource.CLOSED) {
                console.log(`🔌 SSE connection cho XSMB đã tồn tại và đang hoạt động`);
                return;
            }

            if (sseRef.current) {
                console.log(`🔌 Đóng kết nối SSE cũ cho XSMB`);
                sseRef.current.close();
            }

            const sseUrl = `http://localhost:5000/api/kqxs/xsmb/sse?station=${currentStation}&date=${today}`;
            console.log(`�� Tạo SSE connection cho XSMB:`, sseUrl);

            try {
                const newConnection = new EventSource(sseUrl);
                sseRef.current = newConnection;
                sseConnectionPool.current.set(connectionKey, newConnection);
                setSseStatus('connecting');
                console.log(`✅ SSE connection created for XSMB`);

                newConnection.onopen = () => {
                    console.log(`🟢 SSE connection opened for XSMB`);
                    setSseStatus('connected');
                    if (mountedRef.current) {
                        setError(null);
                        setRetryCount(0); // Reset retry count khi connection thành công
                    }
                };

                newConnection.onerror = () => {
                    console.log(`🔴 SSE error for XSMB, reconnecting... Retry count: ${retryCount + 1}`);
                    setSseStatus('error');
                    if (mountedRef.current) {
                        setError('Đang kết nối lại SSE...');
                    }

                    // Đóng connection hiện tại
                    if (sseRef.current) {
                        sseRef.current.close();
                        sseRef.current = null;
                    }
                    sseConnectionPool.current.delete(connectionKey);

                    // Chỉ retry nếu chưa vượt quá giới hạn và component vẫn mounted
                    if (retryCount < maxRetries && mountedRef.current) {
                        setTimeout(() => {
                            if (mountedRef.current) {
                                setRetryCount(prev => prev + 1);
                                connectSSE();
                            }
                        }, sseReconnectDelay); // Sử dụng delay ngắn hơn
                    } else if (mountedRef.current) {
                        setError('Mất kết nối SSE, vui lòng refresh trang...');
                    }
                };

                const prizeTypes = [
                    'maDB', 'specialPrize_0', 'firstPrize_0', 'secondPrize_0', 'secondPrize_1',
                    'threePrizes_0', 'threePrizes_1', 'threePrizes_2', 'threePrizes_3', 'threePrizes_4', 'threePrizes_5',
                    'fourPrizes_0', 'fourPrizes_1', 'fourPrizes_2', 'fourPrizes_3',
                    'fivePrizes_0', 'fivePrizes_1', 'fivePrizes_2', 'fivePrizes_3', 'fivePrizes_4', 'fivePrizes_5',
                    'sixPrizes_0', 'sixPrizes_1', 'sixPrizes_2',
                    'sevenPrizes_0', 'sevenPrizes_1', 'sevenPrizes_2', 'sevenPrizes_3',
                ];

                prizeTypes.forEach(prizeType => {
                    newConnection.addEventListener(prizeType, (event) => {
                        try {
                            const data = JSON.parse(event.data);
                            console.log(`📡 Nhận sự kiện SSE: ${prizeType} = ${data[prizeType]} (XSMB)`, data);
                            if (data && data[prizeType] && mountedRef.current) {
                                // Cập nhật ngay lập tức cho tất cả giải
                                console.log(`🚀 Cập nhật ngay lập tức: ${prizeType} = ${data[prizeType]} (XSMB)`);

                                batchUpdateLiveData(prizeType, data[prizeType]);

                                // Thêm animation cho giải mới
                                if (data[prizeType] !== '...' && data[prizeType] !== '***') {
                                    console.log(`🎬 Trigger animation từ SSE cho ${prizeType} = ${data[prizeType]} (XSMB)`);
                                    setAnimationWithTimeout(prizeType);
                                }
                            }
                        } catch (error) {
                            console.error(`❌ Lỗi xử lý sự kiện ${prizeType} (XSMB):`, error);
                        }
                    });
                });

                newConnection.addEventListener('full', (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        console.log(`📡 Nhận sự kiện SSE full (XSMB):`, data);
                        if (data && mountedRef.current) {
                            batchUpdateLiveData('full', data);
                            setIsTodayLoading(false);
                            setRetryCount(0);
                            setError(null);
                        }
                    } catch (error) {
                        console.error(`❌ Lỗi xử lý sự kiện full (XSMB):`, error);
                    }
                });

                newConnection.addEventListener('canary', (event) => {
                    console.log(`📡 Received canary message for XSMB:`, event.data);
                });
            } catch (error) {
                console.error(`❌ Lỗi tạo SSE cho XSMB:`, error);
                setSseStatus('error');
            }
        };

        // Loại bỏ polling - chỉ sử dụng SSE
        console.log('🚫 Đã loại bỏ polling, chỉ sử dụng SSE');

        fetchInitialData();
        connectSSE();

        return () => {
            // Clear timeout nếu có
            if (updateTimeoutRef.current) {
                clearTimeout(updateTimeoutRef.current);
                updateTimeoutRef.current = null;
            }

            // Clear localStorage timeout
            if (localStorageTimeoutRef.current) {
                clearTimeout(localStorageTimeoutRef.current);
                localStorageTimeoutRef.current = null;
            }

            // Clear batch update timeout
            if (batchTimeoutRef.current) {
                clearTimeout(batchTimeoutRef.current);
                batchTimeoutRef.current = null;
            }

            // Clear tất cả animation timeouts
            animationTimeoutsRef.current.forEach((timeoutId) => {
                clearTimeout(timeoutId);
            });
            animationTimeoutsRef.current.clear();

            // Clear batch update ref
            batchUpdateRef.current.clear();

            // Clear prize cache cũ (giữ cache mới để tái sử dụng)
            const now = Date.now();
            for (const [key, value] of prizeCache.current.entries()) {
                if (now - value.timestamp > prizeCacheTimeout) {
                    prizeCache.current.delete(key);
                }
            }

            // Clear initial data cache cũ (giữ cache mới để tái sử dụng)
            for (const [key, value] of initialDataCache.current.entries()) {
                if (now - value.timestamp > cacheTimeout) {
                    initialDataCache.current.delete(key);
                }
            }

            // Đóng tất cả SSE connections
            if (sseRef.current) {
                console.log('🔌 Đóng kết nối SSE trong cleanup...');
                sseRef.current.close();
            }
            sseRef.current = null;

            // Clear connection pool
            sseConnectionPool.current.clear();

            sseSetupRef.current = false; // Reset để có thể thiết lập lại
        };
    }, [isLiveWindow, currentStation, today, setXsmbLiveData, setIsXsmbLiveDataComplete, batchUpdateLiveData, setAnimationWithTimeout, debouncedLocalStorageUpdate, isModal]);

    useEffect(() => {
        if (!xsmbLiveData) {
            setAnimatingPrize(null);
            return;
        }

        const animationQueue = [
            'firstPrize_0',
            'secondPrize_0', 'secondPrize_1',
            'threePrizes_0', 'threePrizes_1', 'threePrizes_2', 'threePrizes_3', 'threePrizes_4', 'threePrizes_5',
            'fourPrizes_0', 'fourPrizes_1', 'fourPrizes_2', 'fourPrizes_3',
            'fivePrizes_0', 'fivePrizes_1', 'fivePrizes_2', 'fivePrizes_3', 'fivePrizes_4', 'fivePrizes_5',
            'sixPrizes_0', 'sixPrizes_1', 'sixPrizes_2',
            'sevenPrizes_0', 'sevenPrizes_1', 'sevenPrizes_2', 'sevenPrizes_3',
            'specialPrize_0',
        ];

        const findNextAnimatingPrize = () => {
            for (const prize of animationQueue) {
                if (xsmbLiveData[prize] === '...') {
                    return prize;
                }
            }
            return null;
        };

        if (!animatingPrize || xsmbLiveData[animatingPrize] !== '...') {
            const nextPrize = findNextAnimatingPrize();
            setAnimatingPrize(nextPrize);
        }
    }, [xsmbLiveData, animatingPrize]);

    if (!xsmbLiveData) {
        return <div className={styles.error}>Đang tải dữ liệu...</div>;
    }

    const getPrizeNumbers = () => {
        const lastTwoNumbers = [];
        const addNumber = (num) => {
            if (num && num !== '...' && num !== '***' && /^\d+$/.test(num)) {
                const last2 = num.slice(-2).padStart(2, '0');
                lastTwoNumbers.push(last2);
            }
        };

        addNumber(xsmbLiveData.maDB);
        addNumber(xsmbLiveData.specialPrize_0);
        addNumber(xsmbLiveData.firstPrize_0);
        for (let i = 0; i < 2; i++) addNumber(xsmbLiveData[`secondPrize_${i}`]);
        for (let i = 0; i < 6; i++) addNumber(xsmbLiveData[`threePrizes_${i}`]);
        for (let i = 0; i < 4; i++) addNumber(xsmbLiveData[`fourPrizes_${i}`]);
        for (let i = 0; i < 6; i++) addNumber(xsmbLiveData[`fivePrizes_${i}`]);
        for (let i = 0; i < 3; i++) addNumber(xsmbLiveData[`sixPrizes_${i}`]);
        for (let i = 0; i < 4; i++) addNumber(xsmbLiveData[`sevenPrizes_${i}`]);

        const heads = Array(10).fill().map(() => []);
        const tails = Array(10).fill().map(() => []);

        lastTwoNumbers.forEach((last2) => {
            if (last2.length === 2) {
                const head = parseInt(last2[0], 10);
                const tail = parseInt(last2[1], 10);
                if (!isNaN(head) && !isNaN(tail)) {
                    heads[head].push(last2);
                    tails[tail].push(last2);
                }
            }
        });

        return { heads, tails };
    };

    // BỔ SUNG: Tối ưu modal layout với useMemo
    const modalLayout = useMemo(() => {
        if (!isModal) return null;

        return {
            shouldShowModal: isModal,
            modalFilter,
            setModalFilter,
            tableKey,
            currentFilter: modalFilter
        };
    }, [isModal, modalFilter, tableKey]);

    // BỔ SUNG: Tối ưu prize rendering với useMemo
    const prizeRenderingData = useMemo(() => {
        if (!xsmbLiveData) return null;

        return {
            heads: getPrizeNumbers().heads,
            tails: getPrizeNumbers().tails,
            sevenPrizes: [
                getFilteredNumber(xsmbLiveData.sevenPrizes_0 || '...', 'last2'),
                getFilteredNumber(xsmbLiveData.sevenPrizes_1 || '...', 'last2'),
                getFilteredNumber(xsmbLiveData.sevenPrizes_2 || '...', 'last2'),
                getFilteredNumber(xsmbLiveData.sevenPrizes_3 || '...', 'last2'),
            ].filter(num => num && num !== '...' && num !== '***'),
            specialPrize: getFilteredNumber(xsmbLiveData.specialPrize_0 || '...', 'last2')
        };
    }, [xsmbLiveData]);

    // Sử dụng dữ liệu đã được memoize
    const { heads, tails } = prizeRenderingData ? prizeRenderingData : { heads: [], tails: [] };
    const sevenPrizes = prizeRenderingData ? prizeRenderingData.sevenPrizes : [];
    const specialPrize = prizeRenderingData ? prizeRenderingData.specialPrize : '';

    // BỔ SUNG: renderPrizeValue tối ưu như XSMT
    const renderPrizeValue = useCallback((prizeType, digits = 5) => {
        const isAnimating = animatingPrize === prizeType && xsmbLiveData[prizeType] === '...';
        const className = `${styles.running_number} ${styles[`running_${digits}`]}`;

        // Sử dụng pre-calculated filtered value nếu có
        const filteredValue = processedLiveData?.filteredPrizes?.[prizeType] || getFilteredNumber(xsmbLiveData[prizeType], currentFilter);

        let displayDigits = digits;
        if (currentFilter === 'last2') {
            displayDigits = 2;
        } else if (currentFilter === 'last3') {
            displayDigits = Math.min(digits, 3);
        }

        const isSpecialOrEighth = prizeType === 'specialPrize_0' || prizeType === 'maDB';

        return (
            <span className={`${className} ${isSpecialOrEighth ? styles.highlight : ''}`} data-status={isAnimating ? 'animating' : 'static'}>
                {isAnimating ? (
                    <span className={styles.digit_container}>
                        {Array.from({ length: displayDigits }).map((_, i) => (
                            <span key={i} className={styles.digit} data-status="animating" data-index={i}></span>
                        ))}
                    </span>
                ) : xsmbLiveData[prizeType] === '...' ? (
                    <span className={styles.ellipsis}></span>
                ) : (
                    <span className={styles.digit_container}>
                        {filteredValue
                            .padStart(displayDigits, '0')
                            .split('')
                            .map((digit, i) => (
                                <span key={i} className={`${styles.digit12} ${isSpecialOrEighth ? styles.highlight1 : ''}`} data-status="static" data-index={i}>
                                    {digit}
                                </span>
                            ))}
                    </span>
                )}
            </span>
        );
    }, [animatingPrize, xsmbLiveData, processedLiveData, currentFilter]);

    return (
        <div className={styles.live}>
            {error && <div className={styles.error}>{error}</div>}
            {isTodayLoading && (
                <div className={styles.loading}>Đang chờ kết quả ngày {today}...</div>
            )}
            {sseStatus === 'error' && (
                <div className={styles.warning}>⚠️ Kết nối không ổn định, đang sử dụng polling...</div>
            )}

            {/* Layout mới cho modal XSMB */}
            {isModal ? (
                <div className={styles.modalLayout}>
                    {/* Bảng kết quả XSMB - thiết kế mới */}
                    <div className={styles.kqxsModal}>
                        <div className={styles.modalHeader}>
                            <div className={styles.modalTructiep}>
                                {/* Luôn hiển thị trạng thái static, không có hiệu ứng live */}
                                <span className={styles.modalKqxsTitle1Static}>
                                    Kết quả Xổ số Miền Bắc
                                </span>
                            </div>
                            <h1 className={styles.modalKqxsTitle}>
                                XSMB - Kết quả Xổ số Miền Bắc - SXMB
                            </h1>
                            <div className={styles.modalKqxsAction}>
                                <a className={styles.modalKqxsActionLink} href="#!">{xsmbLiveData.station}</a>
                                <a className={`${styles.modalKqxsActionLink} ${styles.dayOfWeek}`} href="#!">{xsmbLiveData.dayOfWeek}</a>
                                <a className={styles.modalKqxsActionLink} href="#!">{xsmbLiveData.drawDate}</a>
                                <a className={styles.modalKqxsActionLink} href="#!"> ({xsmbLiveData.tentinh})</a>
                            </div>
                        </div>

                        {/* Bảng kết quả với thiết kế mới */}
                        <div className={styles.compactTable}>
                            <table className={styles.modalTable}>
                                <tbody>
                                    <tr>
                                        <td className={styles.modalPrizeLabel}>Mã DB</td>
                                        <td>
                                            <div className={styles.modalPrizeContainer}>
                                                <span className={styles.modalPrizeNumber}>
                                                    {xsmbLiveData.maDB === '...' ? <span className={styles.ellipsis}></span> : xsmbLiveData.maDB}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={styles.modalPrizeLabel}>ĐB</td>
                                        <td>
                                            <div className={styles.modalPrizeContainer}>
                                                <span className={`${styles.modalPrizeNumber} ${styles.special}`}>
                                                    {renderPrizeValue('specialPrize_0', 5)}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={styles.modalPrizeLabel}>G1</td>
                                        <td>
                                            <div className={styles.modalPrizeContainer}>
                                                <span className={styles.modalPrizeNumber}>
                                                    {renderPrizeValue('firstPrize_0', 5)}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={styles.modalPrizeLabel}>G2</td>
                                        <td>
                                            <div className={styles.modalPrizeContainer}>
                                                {[0, 1].map(i => (
                                                    <span key={i} className={styles.modalPrizeNumber} style={{ marginRight: '8px' }}>
                                                        {renderPrizeValue(`secondPrize_${i}`, 5)}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={styles.modalPrizeLabel}>G3</td>
                                        <td>
                                            <div className={styles.modalPrizeContainer}>
                                                {[0, 1, 2, 3, 4, 5].map(i => (
                                                    <span key={i} className={styles.modalPrizeNumber} style={{ marginRight: '8px' }}>
                                                        {renderPrizeValue(`threePrizes_${i}`, 5)}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={styles.modalPrizeLabel}>G4</td>
                                        <td>
                                            <div className={styles.modalPrizeContainer}>
                                                {[0, 1, 2, 3].map(i => (
                                                    <span key={i} className={styles.modalPrizeNumber} style={{ marginRight: '8px' }}>
                                                        {renderPrizeValue(`fourPrizes_${i}`, 4)}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={styles.modalPrizeLabel}>G5</td>
                                        <td>
                                            <div className={styles.modalPrizeContainer}>
                                                {[0, 1, 2, 3, 4, 5].map(i => (
                                                    <span key={i} className={styles.modalPrizeNumber} style={{ marginRight: '8px' }}>
                                                        {renderPrizeValue(`fivePrizes_${i}`, 4)}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={styles.modalPrizeLabel}>G6</td>
                                        <td>
                                            <div className={styles.modalPrizeContainer}>
                                                {[0, 1, 2].map(i => (
                                                    <span key={i} className={styles.modalPrizeNumber} style={{ marginRight: '8px' }}>
                                                        {renderPrizeValue(`sixPrizes_${i}`, 3)}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={styles.modalPrizeLabel}>G7</td>
                                        <td>
                                            <div className={styles.modalPrizeContainer}>
                                                {[0, 1, 2, 3].map(i => (
                                                    <span key={i} className={`${styles.modalPrizeNumber} ${styles.special}`} style={{ marginRight: '8px' }}>
                                                        {renderPrizeValue(`sevenPrizes_${i}`, 2)}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Nút lọc số với thiết kế mới */}
                        <div className={styles.modalAction}>
                            <div aria-label="Tùy chọn lọc số" className={styles.modalFilterOptions} role="radiogroup">
                                <div className={styles.modalOptionInput}>
                                    <input
                                        id={`modalFilterAll-${tableKey}`}
                                        type="radio"
                                        name={`modalFilterOption-${tableKey}`}
                                        value="all"
                                        checked={modalFilter === 'all'}
                                        onChange={() => setModalFilter('all')}
                                    />
                                    <label htmlFor={`modalFilterAll-${tableKey}`}>Đầy Đủ</label>
                                </div>
                                <div className={styles.modalOptionInput}>
                                    <input
                                        id={`modalFilterTwo-${tableKey}`}
                                        type="radio"
                                        name={`modalFilterOption-${tableKey}`}
                                        value="last2"
                                        checked={modalFilter === 'last2'}
                                        onChange={() => setModalFilter('last2')}
                                    />
                                    <label htmlFor={`modalFilterTwo-${tableKey}`}>2 Số Đuôi</label>
                                </div>
                                <div className={styles.modalOptionInput}>
                                    <input
                                        id={`modalFilterThree-${tableKey}`}
                                        type="radio"
                                        name={`modalFilterOption-${tableKey}`}
                                        value="last3"
                                        checked={modalFilter === 'last3'}
                                        onChange={() => setModalFilter('last3')}
                                    />
                                    <label htmlFor={`modalFilterThree-${tableKey}`}>3 Số Đuôi</label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bảng thống kê đầu đuôi với thiết kế mới */}
                    <div className={styles.modalSidebar}>
                        <div className={styles.modalStatsTablesContainer}>
                            {/* Bảng đầu */}
                            <div className={styles.modalStatsTableWrapper}>
                                <div className={styles.modalStatsTableHeader}>Đầu</div>
                                <div className={styles.modalStatsTableContent}>
                                    {Array.from({ length: 10 }, (_, i) => (
                                        <div key={`head-${i}`} className={styles.modalStatsTableRow}>
                                            <div className={styles.modalStatsNumber}>{i}</div>
                                            <div className={styles.modalStatsNumbers}>
                                                {heads && heads[i] && heads[i].length > 0 ? (
                                                    heads[i].map((num, idx) => (
                                                        <span
                                                            key={idx}
                                                            className={`${styles.modalStatsPrize} ${sevenPrizes.includes(num) || num === specialPrize ? styles.special : ''
                                                                }`}
                                                        >
                                                            {num}
                                                            {idx < heads[i].length - 1 && ', '}
                                                        </span>
                                                    ))
                                                ) : '-'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Bảng đuôi */}
                            <div className={styles.modalStatsTableWrapper}>
                                <div className={styles.modalStatsTableHeader}>Đuôi</div>
                                <div className={styles.modalStatsTableContent}>
                                    {Array.from({ length: 10 }, (_, i) => (
                                        <div key={`tail-${i}`} className={styles.modalStatsTableRow}>
                                            <div className={styles.modalStatsNumber}>{i}</div>
                                            <div className={styles.modalStatsNumbers}>
                                                {tails && tails[i] && tails[i].length > 0 ? (
                                                    tails[i].map((num, idx) => (
                                                        <span
                                                            key={idx}
                                                            className={`${styles.modalStatsPrize} ${sevenPrizes.includes(num) || num === specialPrize ? styles.special : ''
                                                                }`}
                                                        >
                                                            {num}
                                                            {idx < tails[i].length - 1 && ', '}
                                                        </span>
                                                    ))
                                                ) : '-'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* Layout cũ cho trang chính */
                <div className={styles.kqxs}>
                    <div className={styles.header}>
                        <div className={styles.tructiep}><span className={styles.kqxs__title1}>Tường thuật trực tiếp...</span></div>
                        <h1 className={styles.kqxs__title}>
                            XSMB - Kết quả Xổ số Miền Bắc - SXMB
                        </h1>
                        <div className={styles.kqxs__action}>
                            <a className={styles.kqxs__actionLink} href="#!">{xsmbLiveData.station}</a>
                            <a className={`${styles.kqxs__actionLink} ${styles.dayOfWeek}`} href="#!">{xsmbLiveData.dayOfWeek}</a>
                            <a className={styles.kqxs__actionLink} href="#!">{xsmbLiveData.drawDate}</a>
                            <a className={styles.kqxs__actionLink} href="#!"> ({xsmbLiveData.tentinh})</a>
                        </div>
                    </div>
                    <table className={styles.tableXS}>
                        <tbody>
                            <tr>
                                <td className={`${styles.code} ${styles.rowXS}`}>
                                    <span className={styles.span0}>
                                        {xsmbLiveData.maDB === '...' ? <span className={styles.ellipsis}></span> : xsmbLiveData.maDB}
                                    </span>
                                </td>
                            </tr>
                            <tr>
                                <td className={`${styles.tdTitle} ${styles.highlight}`}>ĐB</td>
                                <td className={styles.rowXS}>
                                    <span className={`${styles.span1} ${styles.highlight} ${styles.gdb}`}>
                                        {renderPrizeValue('specialPrize_0', 5)}
                                    </span>
                                </td>
                            </tr>
                            <tr>
                                <td className={styles.tdTitle}>G1</td>
                                <td className={styles.rowXS}>
                                    <span className={styles.span1}>
                                        {renderPrizeValue('firstPrize_0', 5)}
                                    </span>
                                </td>
                            </tr>
                            <tr>
                                <td className={styles.tdTitle}>G2</td>
                                <td className={styles.rowXS}>
                                    {[0, 1].map(i => (
                                        <span key={i} className={styles.span2}>
                                            {renderPrizeValue(`secondPrize_${i}`, 5)}
                                        </span>
                                    ))}
                                </td>
                            </tr>
                            <tr>
                                <td className={`${styles.tdTitle} ${styles.g3}`}>G3</td>
                                <td className={styles.rowXS}>
                                    {[0, 1, 2].map(i => (
                                        <span key={i} className={`${styles.span3} ${styles.g3}`}>
                                            {renderPrizeValue(`threePrizes_${i}`, 5)}
                                        </span>
                                    ))}
                                </td>
                            </tr>
                            <tr>
                                <td className={styles.tdTitle}></td>
                                <td className={styles.rowXS}>
                                    {[3, 4, 5].map(i => (
                                        <span key={i} className={styles.span3}>
                                            {renderPrizeValue(`threePrizes_${i}`, 5)}
                                        </span>
                                    ))}
                                </td>
                            </tr>
                            <tr>
                                <td className={styles.tdTitle}>G4</td>
                                <td className={styles.rowXS}>
                                    {[0, 1, 2, 3].map(i => (
                                        <span key={i} className={styles.span4}>
                                            {renderPrizeValue(`fourPrizes_${i}`, 4)}
                                        </span>
                                    ))}
                                </td>
                            </tr>
                            <tr>
                                <td className={`${styles.tdTitle} ${styles.g3}`}>G5</td>
                                <td className={styles.rowXS}>
                                    {[0, 1, 2].map(i => (
                                        <span key={i} className={`${styles.span3} ${styles.g3}`}>
                                            {renderPrizeValue(`fivePrizes_${i}`, 4)}
                                        </span>
                                    ))}
                                </td>
                            </tr>
                            <tr>
                                <td className={styles.tdTitle}></td>
                                <td className={styles.rowXS}>
                                    {[3, 4, 5].map(i => (
                                        <span key={i} className={styles.span3}>
                                            {renderPrizeValue(`fivePrizes_${i}`, 4)}
                                        </span>
                                    ))}
                                </td>
                            </tr>
                            <tr>
                                <td className={styles.tdTitle}>G6</td>
                                <td className={styles.rowXS}>
                                    {[0, 1, 2].map(i => (
                                        <span key={i} className={styles.span3}>
                                            {renderPrizeValue(`sixPrizes_${i}`, 3)}
                                        </span>
                                    ))}
                                </td>
                            </tr>
                            <tr>
                                <td className={styles.tdTitle}>G7</td>
                                <td className={styles.rowXS}>
                                    {[0, 1, 2, 3].map(i => (
                                        <span key={i} className={`${styles.span4} ${styles.highlight}`}>
                                            {renderPrizeValue(`sevenPrizes_${i}`, 2)}
                                        </span>
                                    ))}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <div className={styles.action}>
                        <div aria-label="Tùy chọn lọc số" className={styles.filter__options} role="radiogroup">
                            <div className={styles.optionInput}>
                                <input
                                    id={`filterAll-${tableKey}`}
                                    type="radio"
                                    name={`filterOption-${tableKey}`}
                                    value="all"
                                    checked={currentFilter === 'all'}
                                    onChange={() => handleFilterChange(tableKey, 'all')}
                                />
                                <label htmlFor={`filterAll-${tableKey}`}>Đầy Đủ</label>
                            </div>
                            <div className={styles.optionInput}>
                                <input
                                    id={`filterTwo-${tableKey}`}
                                    type="radio"
                                    name={`filterOption-${tableKey}`}
                                    value="last2"
                                    checked={currentFilter === 'last2'}
                                    onChange={() => handleFilterChange(tableKey, 'last2')}
                                />
                                <label htmlFor={`filterTwo-${tableKey}`}>2 Số Đuôi</label>
                            </div>
                            <div className={styles.optionInput}>
                                <input
                                    id={`filterThree-${tableKey}`}
                                    type="radio"
                                    name={`filterOption-${tableKey}`}
                                    value="last3"
                                    checked={currentFilter === 'last3'}
                                    onChange={() => handleFilterChange(tableKey, 'last3')}
                                />
                                <label htmlFor={`filterThree-${tableKey}`}>3 Số Đuôi</label>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bảng thống kê cho trang chính */}
            {!isModal && (
                <div className={styles.TKe_content}>
                    <div className={styles.TKe_contentTitle}>
                        <span className={styles.title}>Bảng Lô Tô - </span>
                        <span className={styles.desc}>{xsmbLiveData.tentinh}</span>
                        <span className={styles.dayOfWeek}>{`${xsmbLiveData.dayOfWeek} - `}</span>
                        <span className={styles.desc}>{xsmbLiveData.drawDate}</span>
                    </div>
                    <table className={styles.tableKey}>
                        <tbody>
                            <tr>
                                <td className={styles.t_h}>Đầu</td>
                                <td>Lô tô</td>
                                <td className={styles.t_h}>Đuôi</td>
                                <td>Lô tô</td>
                            </tr>
                            {Array.from({ length: 10 }, (_, index) => (
                                <tr key={index}>
                                    <td className={styles.t_h}>{index}</td>
                                    <td>
                                        {heads && heads[index] && heads[index].length > 0 ? (
                                            heads[index].map((num, idx) => (
                                                <span
                                                    key={idx}
                                                    className={
                                                        sevenPrizes.includes(num) || num === specialPrize
                                                            ? styles.highlight1
                                                            : ''
                                                    }
                                                >
                                                    {num}
                                                </span>
                                            )).reduce((prev, curr, i) => [prev, i ? ', ' : '', curr], [])
                                        ) : '-'}
                                    </td>
                                    <td className={styles.t_h}>{index}</td>
                                    <td>
                                        {tails && tails[index] && tails[index].length > 0 ? (
                                            tails[index].map((num, idx) => (
                                                <span
                                                    key={idx}
                                                    className={
                                                        sevenPrizes.includes(num) || num === specialPrize
                                                            ? styles.highlight1
                                                            : ''
                                                    }
                                                >
                                                    {num}
                                                </span>
                                            )).reduce((prev, curr, i) => [prev, i ? ', ' : '', curr], [])
                                        ) : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
});

export async function getServerSideProps(context) {
    const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).replace(/\//g, '-');
    return {
        props: {
            station: 'xsmb',
            today,
            isLiveWindow: isWithinLiveWindow(),
            filterTypes: {},
            getHeadAndTailNumbers: null,
            handleFilterChange: null,
        },
    };
}

function isWithinLiveWindow() {
    const vietTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    const hours = vietTime.getHours();
    const minutes = vietTime.getMinutes();
    return (hours === 18 && minutes >= 10 && minutes <= 34);
}

export default React.memo(LiveResult);