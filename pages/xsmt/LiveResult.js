import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import styles from '../../styles/LIVEMT.module.css';
import { getFilteredNumber } from "../../library/utils/filterUtils";
import React from 'react';
import { useLottery } from '../../contexts/LotteryContext';
// import ViewCounter from "../views/ViewCounter";

const LiveResult = React.memo(({ station, getHeadAndTailNumbers = null, handleFilterChange = null, filterTypes = null, isLiveWindow, isModal = false, isForum = false }) => {
    // State cho filter trong modal
    const [modalFilter, setModalFilter] = useState('all');
    const { liveData, setLiveData, setIsLiveDataComplete } = useLottery() || { liveData: null, setLiveData: null, setIsLiveDataComplete: null };
    const [isTodayLoading, setIsTodayLoading] = useState(true);
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const [animatingPrizes, setAnimatingPrizes] = useState({}); // { tinh: prizeType }
    const [sseStatus, setSseStatus] = useState({}); // { tinh: 'connecting' | 'connected' | 'error' }
    const mountedRef = useRef(false);
    const sseRefs = useRef({}); // { tinh: EventSource }
    const sseSetupRef = useRef(false); // Theo dõi việc đã thiết lập SSE
    const updateTimeoutRef = useRef(null); // Debounce cho setLiveData

    // Cache cho initial data để tránh fetch lại mỗi lần mount
    const initialDataCache = useRef(new Map());
    const cacheTimeout = 1 * 60 * 1000; // 2 phút thay vì 5 phút để bắt kịp kết quả mới

    // Cache cho từng prize type riêng lẻ với timestamp
    const prizeCache = useRef(new Map()); // { `${station}:${tinh}:${prizeType}`: { value, timestamp } }
    const prizeCacheTimeout = 20 * 1000; // 30 giây cho từng prize

    // Tối ưu SSE connection với connection pooling
    const sseConnectionPool = useRef(new Map()); // { `${tinh}:${date}`: EventSource }
    const sseReconnectDelay = 1000; // 1 giây thay vì 2 giây - DI CHUYỂN LÊN ĐÂY

    // Tất cả hooks phải được gọi trước khi có logic khác
    const today = useMemo(() => new Date().toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).replace(/\//g, '-'), []);

    const provincesByDay = useMemo(() => ({
        1: [
            { tinh: 'phu-yen', tentinh: 'Phú Yên' },
            { tinh: 'hue', tentinh: 'Thừa Thiên Huế' },
        ],
        2: [
            { tinh: 'dak-lak', tentinh: 'Đắk Lắk' },
            { tinh: 'quang-nam', tentinh: 'Quảng Nam' },
        ],
        3: [
            { tinh: 'da-nang', tentinh: 'Đà Nẵng' },
            { tinh: 'khanh-hoa', tentinh: 'Khánh Hòa' },
        ],
        4: [
            { tinh: 'binh-dinh', tentinh: 'Bình Định' },
            { tinh: 'quang-tri', tentinh: 'Quảng Trị' },
            { tinh: 'quang-binh', tentinh: 'Quảng Bình' },
        ],
        5: [
            { tinh: 'gia-lai', tentinh: 'Gia Lai' },
            { tinh: 'ninh-thuan', tentinh: 'Ninh Thuận' },
        ],
        6: [
            { tinh: 'da-nang', tentinh: 'Đà Nẵng' },
            { tinh: 'quang-ngai', tentinh: 'Quảng Ngãi' },
            { tinh: 'dak-nong', tentinh: 'Đắk Nông' },
        ],
        0: [
            { tinh: 'kon-tum', tentinh: 'Kon Tum' },
            { tinh: 'khanh-hoa', tentinh: 'Khánh Hòa' },
            { tinh: 'hue', tentinh: 'Thừa Thiên Huế' },
        ]
    }), []);

    const emptyResult = useMemo(() => {
        // Sử dụng ngày được yêu cầu thay vì ngày hiện tại
        const targetDate = new Date(today.split('-').reverse().join('-'));
        const dayOfWeekIndex = targetDate.getDay();
        const provinces = provincesByDay[dayOfWeekIndex] || provincesByDay[6];
        console.log('📊 Xác định tỉnh cho client:', {
            today,
            dayOfWeekIndex,
            provinces: provinces.map(p => p.tinh),
            availableProvinces: provincesByDay[dayOfWeekIndex] ? provincesByDay[dayOfWeekIndex].map(p => p.tinh) : []
        });
        return provinces.map(province => ({
            drawDate: today,
            station: station,
            dayOfWeek: targetDate.toLocaleString('vi-VN', { weekday: 'long' }),
            tentinh: province.tentinh,
            tinh: province.tinh,
            year: new Date().getFullYear(),
            month: new Date().getMonth() + 1,
            specialPrize_0: '...',
            firstPrize_0: '...',
            secondPrize_0: '...',
            threePrizes_0: '...',
            threePrizes_1: '...',
            fourPrizes_0: '...',
            fourPrizes_1: '...',
            fourPrizes_2: '...',
            fourPrizes_3: '...',
            fourPrizes_4: '...',
            fourPrizes_5: '...',
            fourPrizes_6: '...',
            fivePrizes_0: '...',
            sixPrizes_0: '...',
            sixPrizes_1: '...',
            sixPrizes_2: '...',
            sevenPrizes_0: '...',
            eightPrizes_0: '...',
            lastUpdated: 0,
        }));
    }, [today, station, provincesByDay]);

    // Khai báo currentFilter trước khi sử dụng trong useCallback
    const tableKey = today + station;
    const currentFilter = isModal ? modalFilter : (filterTypes && filterTypes[tableKey]) || 'all';

    // Tối ưu expensive calculations với useMemo - DI CHUYỂN LÊN TRƯỚC
    const processedLiveData = useMemo(() => {
        if (!liveData || !Array.isArray(liveData)) return [];

        return liveData.map(item => ({
            ...item,
            // Pre-calculate filtered values
            filteredPrizes: Object.keys(item).reduce((acc, key) => {
                if (key.includes('Prize') && item[key] !== '...' && item[key] !== '***') {
                    acc[key] = getFilteredNumber(item[key], currentFilter);
                }
                return acc;
            }, {})
        }));
    }, [liveData, currentFilter]);

    // Di chuyển useCallback xuống sau processedLiveData
    const renderPrizeValue = useCallback((tinh, prizeType, digits = 5) => {
        const isAnimating = animatingPrizes[tinh] === prizeType && processedLiveData.find(item => item.tinh === tinh)?.[prizeType] === '...';
        const className = `${styles.running_number} ${styles[`running_${digits}`]}`;
        const prizeValue = processedLiveData.find(item => item.tinh === tinh)?.[prizeType] || '...';

        // Sử dụng pre-calculated filtered value nếu có
        const processedItem = processedLiveData.find(item => item.tinh === tinh);
        const filteredValue = processedItem?.filteredPrizes?.[prizeType] || getFilteredNumber(prizeValue, currentFilter);

        const displayDigits = currentFilter === 'last2' ? 2 : currentFilter === 'last3' ? 3 : digits;
        const isSpecialOrEighth = prizeType === 'specialPrize_0' || prizeType === 'eightPrizes_0';

        return (
            <span className={`${className} ${isSpecialOrEighth ? styles.highlight : ''}`} data-status={isAnimating ? 'animating' : 'static'}>
                {isAnimating ? (
                    <span className={styles.digit_container}>
                        {Array.from({ length: displayDigits }).map((_, i) => (
                            <span key={i} className={styles.digit} data-status="animating" data-index={i}></span>
                        ))}
                    </span>
                ) : prizeValue === '...' ? (
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
    }, [animatingPrizes, processedLiveData, currentFilter]);

    // Các biến thông thường (không phải hooks)
    const maxRetries = 50;
    const retryInterval = 2000;
    const fetchMaxRetries = 3;
    const fetchRetryInterval = 5000;
    const prizeDigits = {
        specialPrize_0: 6,
        firstPrize_0: 5,
        secondPrize_0: 5,
        threePrizes_0: 5,
        threePrizes_1: 5,
        fourPrizes_0: 5,
        fourPrizes_1: 5,
        fourPrizes_2: 5,
        fourPrizes_3: 5,
        fourPrizes_4: 5,
        fourPrizes_5: 5,
        fourPrizes_6: 5,
        fivePrizes_0: 4,
        sixPrizes_0: 4,
        sixPrizes_1: 4,
        sixPrizes_2: 4,
        sevenPrizes_0: 3,
        eightPrizes_0: 2,
    };

    // Hàm lấy cached data hoặc fetch mới với tối ưu cho real-time
    const getCachedOrFetchInitialData = useCallback(async (province, targetDate) => {
        const cacheKey = `${station}:${province.tinh}:${targetDate}`;
        const cached = initialDataCache.current.get(cacheKey);

        // Kiểm tra cache với timeout ngắn hơn cho real-time data
        if (cached && Date.now() - cached.timestamp < cacheTimeout) {
            console.log(`📦 Sử dụng cached data cho ${province.tinh} (cache age: ${Math.round((Date.now() - cached.timestamp) / 1000)}s)`);

            // Merge với prize cache để có data mới nhất
            const mergedData = { ...cached.data };
            const prizeTypes = [
                'eightPrizes_0', 'sevenPrizes_0', 'sixPrizes_0', 'sixPrizes_1', 'sixPrizes_2',
                'fivePrizes_0', 'fourPrizes_0', 'fourPrizes_1', 'fourPrizes_2', 'fourPrizes_3',
                'fourPrizes_4', 'fourPrizes_5', 'fourPrizes_6', 'threePrizes_0', 'threePrizes_1',
                'secondPrize_0', 'firstPrize_0', 'specialPrize_0'
            ];

            prizeTypes.forEach(prizeType => {
                const prizeCacheKey = `${station}:${province.tinh}:${prizeType}`;
                const prizeCached = prizeCache.current.get(prizeCacheKey);
                if (prizeCached && Date.now() - prizeCached.timestamp < prizeCacheTimeout) {
                    mergedData[prizeType] = prizeCached.value;
                    console.log(`📦 Sử dụng cached prize ${prizeType} = ${prizeCached.value} cho ${province.tinh}`);
                }
            });

            return mergedData;
        }

        try {
            const response = await fetch(
                `https://backendkqxs-1.onrender.com/api/ketquaxs/xsmt/sse/initial?station=${station}&tinh=${province.tinh}&date=${targetDate.replace(/\//g, '-')}`
            );
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const serverData = await response.json();

            // Cache data mới
            initialDataCache.current.set(cacheKey, {
                data: serverData,
                timestamp: Date.now()
            });

            // Cache từng prize type riêng lẻ
            const prizeTypes = [
                'eightPrizes_0', 'sevenPrizes_0', 'sixPrizes_0', 'sixPrizes_1', 'sixPrizes_2',
                'fivePrizes_0', 'fourPrizes_0', 'fourPrizes_1', 'fourPrizes_2', 'fourPrizes_3',
                'fourPrizes_4', 'fourPrizes_5', 'fourPrizes_6', 'threePrizes_0', 'threePrizes_1',
                'secondPrize_0', 'firstPrize_0', 'specialPrize_0'
            ];

            prizeTypes.forEach(prizeType => {
                if (serverData[prizeType] && serverData[prizeType] !== '...' && serverData[prizeType] !== '***') {
                    const prizeCacheKey = `${station}:${province.tinh}:${prizeType}`;
                    prizeCache.current.set(prizeCacheKey, {
                        value: serverData[prizeType],
                        timestamp: Date.now()
                    });
                }
            });

            console.log(`📡 Fetched fresh data cho ${province.tinh}:`, serverData);
            return serverData;
        } catch (error) {
            console.error(`❌ Lỗi fetch data cho ${province.tinh}:`, error);
            // Fallback to cached data nếu có
            if (cached) {
                console.log(`🔄 Fallback to cached data cho ${province.tinh}`);
                return cached.data;
            }
            throw error;
        }
    }, [station]);

    // Tối ưu localStorage operations với debounce
    const localStorageRef = useRef(new Map());
    const localStorageTimeoutRef = useRef(null);
    const LIVE_DATA_TTL = 40 * 60 * 1000; // 40 phút cho liveData - đủ cho live window và page transitions

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
        }, 100); // Debounce 100ms
    }, []);

    // Auto-cleanup cho liveData localStorage - xóa data cũ để tránh memory leak
    // TTL 40 phút đủ cho live window và smooth page transitions
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
                            // Kiểm tra nếu có timestamp và đã hết hạn
                            if (parsed.timestamp && (now - parsed.timestamp > LIVE_DATA_TTL)) {
                                keysToRemove.push(key);
                            }
                        }
                    } catch (error) {
                        // Nếu không parse được, có thể là data cũ format, xóa luôn
                        keysToRemove.push(key);
                    }
                }
            }

            // Xóa các key đã hết hạn
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

    // Chạy cleanup mỗi 10 phút (thay vì mỗi giờ) để phù hợp với TTL 40 phút
    useEffect(() => {
        const cleanupInterval = setInterval(cleanupOldLiveData, 10 * 60 * 1000); // 10 phút
        return () => clearInterval(cleanupInterval);
    }, [cleanupOldLiveData]);

    // Tối ưu animation timeout với requestAnimationFrame
    const animationTimeoutsRef = useRef(new Map());

    const setAnimationWithTimeout = useCallback((tinh, prizeType) => {
        // Clear timeout cũ nếu có
        if (animationTimeoutsRef.current.has(`${tinh}-${prizeType}`)) {
            clearTimeout(animationTimeoutsRef.current.get(`${tinh}-${prizeType}`));
        }

        // Sử dụng requestAnimationFrame để tối ưu performance
        requestAnimationFrame(() => {
            setAnimatingPrizes(prev => ({
                ...prev,
                [tinh]: prizeType
            }));
        });

        // Set timeout mới
        const timeoutId = setTimeout(() => {
            requestAnimationFrame(() => {
                setAnimatingPrizes(prev => {
                    const newState = { ...prev };
                    if (newState[tinh] === prizeType) {
                        delete newState[tinh];
                    }
                    return newState;
                });
            });
            animationTimeoutsRef.current.delete(`${tinh}-${prizeType}`);
        }, 2000);

        animationTimeoutsRef.current.set(`${tinh}-${prizeType}`, timeoutId);
    }, []);

    // Batch update cho multiple SSE events
    const batchUpdateRef = useRef(new Map());
    const batchTimeoutRef = useRef(null);

    const batchUpdateLiveData = useCallback((tinh, prizeType, value) => {
        const key = `${tinh}-${prizeType}`;
        batchUpdateRef.current.set(key, { tinh, prizeType, value });

        // Cache prize type riêng lẻ ngay lập tức
        if (value && value !== '...' && value !== '***') {
            const prizeCacheKey = `${station}:${tinh}:${prizeType}`;
            prizeCache.current.set(prizeCacheKey, {
                value: value,
                timestamp: Date.now()
            });
            console.log(`📦 Cached prize ${prizeType} = ${value} cho ${tinh}`);
        }

        if (batchTimeoutRef.current) {
            clearTimeout(batchTimeoutRef.current);
        }

        batchTimeoutRef.current = setTimeout(() => {
            if (batchUpdateRef.current.size > 0 && setLiveData) {
                console.log('🔄 Bắt đầu batch update với:', Array.from(batchUpdateRef.current.values()));
                setLiveData(prev => {
                    console.log('🔄 Prev liveData:', prev);
                    const updatedData = prev.map(item => {
                        let updatedItem = { ...item };
                        let hasChanges = false;

                        batchUpdateRef.current.forEach(({ tinh: updateTinh, prizeType: updatePrizeType, value: updateValue }) => {
                            if (item.tinh === updateTinh) {
                                console.log(`🔄 Cập nhật ${updatePrizeType} = ${updateValue} cho ${updateTinh}`);
                                updatedItem[updatePrizeType] = updateValue;
                                hasChanges = true;
                            }
                        });

                        if (hasChanges) {
                            updatedItem.lastUpdated = Date.now();
                            // Sử dụng debounced localStorage
                            debouncedLocalStorageUpdate(`liveData:${station}:${item.tinh}:${today}`, updatedItem);
                        }

                        return updatedItem;
                    });

                    const isComplete = updatedData.every(item =>
                        Object.values(item).every(val => typeof val === 'string' && val !== '...' && val !== '***')
                    );
                    setIsLiveDataComplete(isComplete);
                    setIsTodayLoading(false);
                    setRetryCount(0);
                    setError(null);

                    console.log('🔄 Batch update liveData:', updatedData);
                    return updatedData;
                });

                // Clear batch
                batchUpdateRef.current.clear();
            }
        }, 50); // Batch update trong 50ms
    }, [setLiveData, debouncedLocalStorageUpdate, station, today]);

    useEffect(() => {
        mountedRef.current = true;
        console.log('🔄 LiveResult component mounted');
        return () => {
            console.log('🔄 LiveResult component unmounting');
            mountedRef.current = false;
            Object.values(sseRefs.current).forEach(sse => {
                console.log('🔌 Đóng kết nối SSE...');
                sse.close();
            });
            sseRefs.current = {};
        };
    }, []);

    useEffect(() => {
        console.log('🎯 LiveResult useEffect triggered:', {
            setLiveData: !!setLiveData,
            setIsLiveDataComplete: !!setIsLiveDataComplete,
            isLiveWindow,
            station,
            today,
            mountedRef: mountedRef.current
        });

        if (!setLiveData || !setIsLiveDataComplete || !isLiveWindow) {
            console.log('⚠️ Early return - không thiết lập SSE vì điều kiện không đủ');
            // Sử dụng setTimeout để tránh setState trong render phase
            setTimeout(() => {
                if (mountedRef.current) {
                    setLiveData(emptyResult);
                    setIsTodayLoading(true);
                    setError(null);
                }
            }, 0);
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

        console.log('✅ Bắt đầu thiết lập SSE cho XSMT');
        sseSetupRef.current = true;

        const fetchInitialData = async (retry = 0) => {
            try {
                const dayOfWeekIndex = new Date().getDay();
                const provinces = provincesByDay[dayOfWeekIndex] || provincesByDay[6];
                console.log('📊 Lấy dữ liệu ban đầu cho provinces:', provinces.map(p => p.tinh));

                const results = await Promise.all(
                    provinces.map(async (province) => {
                        const cachedData = localStorage.getItem(`liveData:${station}:${province.tinh}:${today}`);
                        let initialData;

                        if (cachedData) {
                            try {
                                const parsed = JSON.parse(cachedData);

                                // Xử lý format mới với timestamp
                                if (parsed.data && parsed.timestamp) {
                                    const now = Date.now();
                                    if (now - parsed.timestamp > LIVE_DATA_TTL) {
                                        // Data đã hết hạn, sử dụng empty result
                                        initialData = {
                                            ...emptyResult.find(item => item.tinh === province.tinh),
                                            lastUpdated: 0,
                                        };
                                    } else {
                                        // Data còn hạn, sử dụng data
                                        initialData = {
                                            ...parsed.data,
                                            lastUpdated: parsed.timestamp,
                                        };
                                    }
                                } else {
                                    // Format cũ (backward compatibility)
                                    initialData = {
                                        ...parsed,
                                        lastUpdated: parsed.lastUpdated || 0,
                                    };
                                }
                            } catch (error) {
                                console.error('❌ Lỗi parse cached data:', error);
                                initialData = {
                                    ...emptyResult.find(item => item.tinh === province.tinh),
                                    lastUpdated: 0,
                                };
                            }
                        } else {
                            initialData = {
                                ...emptyResult.find(item => item.tinh === province.tinh),
                                lastUpdated: 0,
                            };
                        }

                        try {
                            // Sử dụng cached data hoặc fetch mới
                            const serverData = await getCachedOrFetchInitialData(province, today);
                            console.log(`📡 Dữ liệu từ /initial cho ${province.tinh}:`, serverData);

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
                                localStorage.setItem(`liveData:${station}:${province.tinh}:${today}`, JSON.stringify(updatedData));
                            }
                            return updatedData;
                        } catch (err) {
                            console.error(`❌ Lỗi khi lấy dữ liệu ban đầu cho ${province.tinh} (lần ${retry + 1}):`, err.message);
                            return initialData;
                        }
                    })
                );

                if (mountedRef.current) {
                    setLiveData(results);
                    const isComplete = results.every(item =>
                        Object.values(item).every(val => typeof val === 'string' && val !== '...' && val !== '***')
                    );
                    setIsLiveDataComplete(isComplete);
                    setIsTodayLoading(false);
                    setRetryCount(0);
                    setError(null);
                    console.log('✅ Đã cập nhật dữ liệu ban đầu:', results);
                }
            } catch (err) {
                console.error('❌ Lỗi khi lấy dữ liệu ban đầu:', err.message);
                if (retry < fetchMaxRetries) {
                    setTimeout(() => {
                        if (mountedRef.current) {
                            fetchInitialData(retry + 1);
                        }
                    }, fetchRetryInterval);
                } else if (mountedRef.current) {
                    const dayOfWeekIndex = new Date().getDay();
                    const provinces = provincesByDay[dayOfWeekIndex] || provincesByDay[6];
                    const results = provinces.map(province => {
                        const cachedData = localStorage.getItem(`liveData:${station}:${province.tinh}:${today}`);
                        if (cachedData) {
                            try {
                                const parsed = JSON.parse(cachedData);
                                // Xử lý format mới với timestamp
                                if (parsed.data && parsed.timestamp) {
                                    const now = Date.now();
                                    if (now - parsed.timestamp > LIVE_DATA_TTL) {
                                        return emptyResult.find(item => item.tinh === province.tinh);
                                    } else {
                                        return {
                                            ...parsed.data,
                                            lastUpdated: parsed.timestamp,
                                        };
                                    }
                                } else {
                                    // Format cũ (backward compatibility)
                                    return parsed;
                                }
                            } catch (error) {
                                console.error('❌ Lỗi parse cached data trong fallback:', error);
                                return emptyResult.find(item => item.tinh === province.tinh);
                            }
                        }
                        return emptyResult.find(item => item.tinh === province.tinh);
                    });
                    setLiveData(results);
                    setIsLiveDataComplete(false);
                    setIsTodayLoading(false);
                    setError('Không thể lấy dữ liệu ban đầu, đang dựa vào dữ liệu cục bộ...');
                }
            }
        };

        const connectSSE = () => {
            // Kiểm tra nếu component đã unmount
            if (!mountedRef.current) {
                console.log('⚠️ Component đã unmount, bỏ qua thiết lập SSE');
                return;
            }

            // Sử dụng ngày được yêu cầu thay vì ngày hiện tại
            const targetDate = new Date(today.split('-').reverse().join('-'));
            const dayOfWeekIndex = targetDate.getDay();
            const provinces = provincesByDay[dayOfWeekIndex] || provincesByDay[6];
            console.log('🔌 Thiết lập SSE cho provinces:', provinces.map(p => p.tinh));

            provinces.forEach(province => {
                // Kiểm tra lại mountedRef trước khi thiết lập cho từng tỉnh
                if (!mountedRef.current) {
                    console.log('⚠️ Component đã unmount, bỏ qua thiết lập SSE cho', province.tinh);
                    return;
                }

                if (!station || !today || !/^\d{2}-\d{2}-\d{4}$/.test(today)) {
                    console.warn('⚠️ Invalid station or today value:', { station, today });
                    if (mountedRef.current) {
                        setError('Dữ liệu đang tải...');
                        setIsTodayLoading(false);
                    }
                    return;
                }

                const connectionKey = `${province.tinh}:${today}`;

                // Kiểm tra connection pool trước
                if (sseConnectionPool.current.has(connectionKey)) {
                    const existingConnection = sseConnectionPool.current.get(connectionKey);
                    if (existingConnection.readyState === EventSource.OPEN) {
                        console.log(`🔌 SSE connection cho ${province.tinh} đã tồn tại và đang hoạt động`);
                        sseRefs.current[province.tinh] = existingConnection;
                        return;
                    } else {
                        // Đóng connection cũ nếu không hoạt động
                        existingConnection.close();
                        sseConnectionPool.current.delete(connectionKey);
                    }
                }

                // Kiểm tra nếu đã có connection đang hoạt động
                if (sseRefs.current[province.tinh] && sseRefs.current[province.tinh].readyState !== EventSource.CLOSED) {
                    console.log(`🔌 SSE connection cho ${province.tinh} đã tồn tại và đang hoạt động`);
                    return;
                }

                if (sseRefs.current[province.tinh]) {
                    console.log(`🔌 Đóng kết nối SSE cũ cho ${province.tinh}`);
                    sseRefs.current[province.tinh].close();
                }

                const sseUrl = `https://backendkqxs-1.onrender.com/api/ketquaxs/xsmt/sse?station=${station}&tinh=${province.tinh}&date=${today.replace(/\//g, '-')}`;
                console.log(`🔌 Tạo SSE connection cho ${province.tinh}:`, sseUrl);

                try {
                    const newConnection = new EventSource(sseUrl);
                    sseRefs.current[province.tinh] = newConnection;
                    sseConnectionPool.current.set(connectionKey, newConnection);
                    setSseStatus(prev => ({ ...prev, [province.tinh]: 'connecting' }));
                    console.log(`✅ SSE connection created for ${province.tinh}`);

                    newConnection.onopen = () => {
                        console.log(`🟢 SSE connection opened for ${province.tinh}`);
                        setSseStatus(prev => ({ ...prev, [province.tinh]: 'connected' }));
                        if (mountedRef.current) {
                            setError(null);
                            setRetryCount(0); // Reset retry count khi connection thành công
                        }
                    };

                    newConnection.onerror = () => {
                        console.log(`🔴 SSE error for ${province.tinh}, reconnecting... Retry count: ${retryCount + 1}`);
                        setSseStatus(prev => ({ ...prev, [province.tinh]: 'error' }));
                        if (mountedRef.current) {
                            setError('Đang kết nối lại SSE...');
                        }

                        // Đóng connection hiện tại
                        if (sseRefs.current[province.tinh]) {
                            sseRefs.current[province.tinh].close();
                            sseRefs.current[province.tinh] = null;
                        }
                        sseConnectionPool.current.delete(connectionKey);

                        // Chỉ retry nếu chưa vượt quá giới hạn và component vẫn mounted
                        if (retryCount < maxRetries && mountedRef.current) {
                            setTimeout(() => {
                                if (mountedRef.current) {
                                    setRetryCount(prev => prev + 1);
                                    // Chỉ retry cho tỉnh này thay vì toàn bộ connectSSE
                                    retrySSEForProvince(province.tinh);
                                }
                            }, sseReconnectDelay); // Sử dụng delay ngắn hơn
                        } else if (mountedRef.current) {
                            setError('Mất kết nối SSE, vui lòng refresh trang...');
                        }
                    };

                    const prizeTypes = [
                        'eightPrizes_0', 'sevenPrizes_0',
                        'sixPrizes_0', 'sixPrizes_1', 'sixPrizes_2',
                        'fivePrizes_0',
                        'fourPrizes_0', 'fourPrizes_1', 'fourPrizes_2', 'fourPrizes_3', 'fourPrizes_4', 'fourPrizes_5', 'fourPrizes_6',
                        'threePrizes_0', 'threePrizes_1',
                        'secondPrize_0', 'firstPrize_0', 'specialPrize_0'
                    ];

                    prizeTypes.forEach(prizeType => {
                        sseRefs.current[province.tinh].addEventListener(prizeType, (event) => {
                            try {
                                const data = JSON.parse(event.data);
                                console.log(`📡 Nhận sự kiện SSE: ${prizeType} = ${data[prizeType]} (tỉnh ${province.tinh})`, data);
                                if (data && data[prizeType] && mountedRef.current) {
                                    // Cập nhật ngay lập tức cho tất cả giải
                                    console.log(`🚀 Cập nhật ngay lập tức: ${prizeType} = ${data[prizeType]} (tỉnh ${province.tinh})`);

                                    batchUpdateLiveData(province.tinh, prizeType, data[prizeType]);

                                    // Thêm animation cho giải mới
                                    if (data[prizeType] !== '...' && data[prizeType] !== '***') {
                                        setAnimationWithTimeout(province.tinh, prizeType);
                                    }
                                }
                            } catch (error) {
                                console.error(`❌ Lỗi xử lý sự kiện ${prizeType} (tỉnh ${province.tinh}):`, error);
                            }
                        });
                    });

                    sseRefs.current[province.tinh].addEventListener('full', (event) => {
                        try {
                            const data = JSON.parse(event.data);
                            console.log(`📡 Nhận sự kiện SSE full (tỉnh ${province.tinh}):`, data);
                            if (data && mountedRef.current) {
                                batchUpdateLiveData(province.tinh, 'full', data);
                                setIsTodayLoading(false);
                                setRetryCount(0);
                                setError(null);
                            }
                        } catch (error) {
                            console.error(`❌ Lỗi xử lý sự kiện full (tỉnh ${province.tinh}):`, error);
                        }
                    });

                    sseRefs.current[province.tinh].addEventListener('canary', (event) => {
                        console.log(`📡 Received canary message for ${province.tinh}:`, event.data);
                    });
                } catch (error) {
                    console.error(`❌ Lỗi tạo SSE cho ${province.tinh}:`, error);
                    setSseStatus(prev => ({ ...prev, [province.tinh]: 'error' }));
                }
            });
        };

        // Loại bỏ polling - chỉ sử dụng SSE
        console.log('🚫 Đã loại bỏ polling, chỉ sử dụng SSE');

        // Hàm retry cho một tỉnh cụ thể
        const retrySSEForProvince = (tinh) => {
            if (!mountedRef.current) return;

            console.log(`🔄 Retry SSE cho tỉnh ${tinh}`);

            // Đóng connection cũ nếu có
            if (sseRefs.current[tinh]) {
                sseRefs.current[tinh].close();
                sseRefs.current[tinh] = null;
            }

            // Tạo connection mới
            const sseUrl = `https://backendkqxs-1.onrender.com/api/ketquaxs/xsmt/sse?station=${station}&tinh=${tinh}&date=${today.replace(/\//g, '-')}`;
            console.log(`🔌 Tạo SSE connection mới cho ${tinh}:`, sseUrl);

            try {
                sseRefs.current[tinh] = new EventSource(sseUrl);
                setSseStatus(prev => ({ ...prev, [tinh]: 'connecting' }));

                sseRefs.current[tinh].onopen = () => {
                    console.log(`🟢 SSE connection reopened for ${tinh}`);
                    setSseStatus(prev => ({ ...prev, [tinh]: 'connected' }));
                    if (mountedRef.current) {
                        setError(null);
                        setRetryCount(0);
                    }
                };

                // Thêm lại event listeners
                const prizeTypes = [
                    'eightPrizes_0', 'sevenPrizes_0',
                    'sixPrizes_0', 'sixPrizes_1', 'sixPrizes_2',
                    'fivePrizes_0',
                    'fourPrizes_0', 'fourPrizes_1', 'fourPrizes_2', 'fourPrizes_3', 'fourPrizes_4', 'fourPrizes_5', 'fourPrizes_6',
                    'threePrizes_0', 'threePrizes_1',
                    'secondPrize_0', 'firstPrize_0', 'specialPrize_0'
                ];

                prizeTypes.forEach(prizeType => {
                    sseRefs.current[tinh].addEventListener(prizeType, (event) => {
                        try {
                            const data = JSON.parse(event.data);
                            if (data && data[prizeType] && mountedRef.current) {
                                // Cập nhật ngay lập tức cho tất cả giải
                                console.log(`🚀 Cập nhật ngay lập tức (retry): ${prizeType} = ${data[prizeType]} (tỉnh ${tinh})`);

                                batchUpdateLiveData(tinh, prizeType, data[prizeType]);

                                // Thêm animation cho giải mới
                                if (data[prizeType] !== '...' && data[prizeType] !== '***') {
                                    setAnimationWithTimeout(tinh, prizeType);
                                }
                            }
                        } catch (error) {
                            console.error(`❌ Lỗi xử lý sự kiện ${prizeType} (tỉnh ${tinh}):`, error);
                        }
                    });
                });

            } catch (error) {
                console.error(`❌ Lỗi tạo SSE cho ${tinh}:`, error);
                setSseStatus(prev => ({ ...prev, [tinh]: 'error' }));
            }
        };

        if (!Array.isArray(liveData)) {
            // Sử dụng setTimeout để tránh setState trong render phase
            setTimeout(() => {
                if (mountedRef.current) {
                    setLiveData(emptyResult);
                }
            }, 0);
        }

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
            Object.values(sseRefs.current).forEach(sse => {
                console.log('🔌 Đóng kết nối SSE trong cleanup...');
                sse.close();
            });
            sseRefs.current = {};

            // Clear connection pool
            sseConnectionPool.current.clear();

            sseSetupRef.current = false; // Reset để có thể thiết lập lại
        };
    }, [isLiveWindow, station, today, setLiveData, setIsLiveDataComplete, provincesByDay, emptyResult, debouncedLocalStorageUpdate, batchUpdateLiveData, setAnimationWithTimeout, getCachedOrFetchInitialData]);

    useEffect(() => {
        if (!liveData || !liveData.length) {
            setAnimatingPrizes({});
            return;
        }

        const animationQueue = [
            'eightPrizes_0', 'sevenPrizes_0',
            'sixPrizes_0', 'sixPrizes_1', 'sixPrizes_2',
            'fivePrizes_0',
            'fourPrizes_0', 'fourPrizes_1', 'fourPrizes_2', 'fourPrizes_3', 'fourPrizes_4', 'fourPrizes_5', 'fourPrizes_6',
            'threePrizes_0', 'threePrizes_1',
            'secondPrize_0', 'firstPrize_0', 'specialPrize_0'
        ];

        setAnimatingPrizes(prev => {
            const newAnimatingPrizes = { ...prev };
            let hasChanges = false;

            processedLiveData.forEach(stationData => {
                const currentPrize = prev[stationData.tinh];
                if (!currentPrize || stationData[currentPrize] !== '...') {
                    const nextPrize = animationQueue.find(prize => stationData[prize] === '...') || null;
                    if (nextPrize !== currentPrize) {
                        newAnimatingPrizes[stationData.tinh] = nextPrize;
                        hasChanges = true;
                    }
                }
            });

            return hasChanges ? newAnimatingPrizes : prev;
        });
    }, [liveData]);

    useEffect(() => {
        console.log('🔄 LiveResult component re-render với liveData:', liveData);
    }, [liveData]);

    // Debug useEffect để theo dõi processedLiveData
    useEffect(() => {
        console.log('🔄 ProcessedLiveData updated:', processedLiveData);
    }, [processedLiveData]);

    if (!processedLiveData || !processedLiveData.length) {
        return <div className={styles.error}>Đang tải dữ liệu...</div>;
    }

    const getPrizeNumbers = (stationData) => {
        const lastTwoNumbers = [];
        const addNumber = (num, isSpecial = false, isEighth = false) => {
            if (num && num !== '...' && num !== '***' && /^\d+$/.test(num)) {
                const last2 = num.slice(-2).padStart(2, '0');
                lastTwoNumbers.push({ num: last2, isSpecial, isEighth });
            }
        };

        // Thêm các giải theo thứ tự
        addNumber(stationData.eightPrizes_0, false, true);
        addNumber(stationData.sevenPrizes_0);
        addNumber(stationData.sixPrizes_0);
        addNumber(stationData.sixPrizes_1);
        addNumber(stationData.sixPrizes_2);
        addNumber(stationData.fivePrizes_0);
        addNumber(stationData.fourPrizes_0);
        addNumber(stationData.fourPrizes_1);
        addNumber(stationData.fourPrizes_2);
        addNumber(stationData.fourPrizes_3);
        addNumber(stationData.fourPrizes_4);
        addNumber(stationData.fourPrizes_5);
        addNumber(stationData.fourPrizes_6);
        addNumber(stationData.threePrizes_0);
        addNumber(stationData.threePrizes_1);
        addNumber(stationData.secondPrize_0);
        addNumber(stationData.firstPrize_0);
        addNumber(stationData.specialPrize_0, true);

        return lastTwoNumbers;
    };

    // Tính toán đầu đuôi
    const allHeads = [];
    const allTails = [];

    for (let i = 0; i < 10; i++) {
        const heads = [];
        const tails = [];

        processedLiveData.forEach(stationData => {
            const prizeNumbers = getPrizeNumbers(stationData);
            const headNumbers = prizeNumbers.filter(item => item.num.startsWith(i.toString()));
            const tailNumbers = prizeNumbers.filter(item => item.num.endsWith(i.toString()));

            heads.push(headNumbers);
            tails.push(tailNumbers);
        });

        allHeads.push(heads);
        allTails.push(tails);
    }

    const stationsData = processedLiveData.filter(item => item && item.tinh);

    return (
        <div className={`${styles.containerKQs} ${isModal ? styles.modalContainer : ''} ${isForum ? styles.forumContainer : ''}`}>
            {error && <div className={styles.error}>{error}</div>}
            {isTodayLoading && (
                <div className={styles.loading}>Đang chờ kết quả ngày {today}...</div>
            )}

            {isModal && isForum ? (
                // Layout 2 cột cho modal forum
                <div className={styles.modalLayout}>
                    <div className={styles.modalMainContent}>
                        <div className={styles.modalTableContainer}>
                            <table className={styles.modalResultsTable}>
                                <thead>
                                    <tr>
                                        <th>Giải</th>
                                        {processedLiveData.map(stationData => (
                                            <th key={stationData.tinh}>{stationData.tentinh}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className={styles.modalPrizeLabel}>G8</td>
                                        {processedLiveData.map(stationData => (
                                            <td key={stationData.tinh}>
                                                <div className={styles.modalPrizeContainer}>
                                                    <span className={`${styles.modalPrizeNumber} ${styles.eighth}`}>
                                                        {renderPrizeValue(stationData.tinh, 'eightPrizes_0', 2)}
                                                    </span>
                                                </div>
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className={styles.modalPrizeLabel}>G7</td>
                                        {processedLiveData.map(stationData => (
                                            <td key={stationData.tinh}>
                                                <div className={styles.modalPrizeContainer}>
                                                    <span className={styles.modalPrizeNumber}>
                                                        {renderPrizeValue(stationData.tinh, 'sevenPrizes_0', 3)}
                                                    </span>
                                                </div>
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className={styles.modalPrizeLabel}>G6</td>
                                        {processedLiveData.map(stationData => (
                                            <td key={stationData.tinh}>
                                                <div className={styles.modalPrizeContainer}>
                                                    {[0, 1, 2].map(idx => (
                                                        <span key={idx} className={styles.modalPrizeNumber}>
                                                            {renderPrizeValue(stationData.tinh, `sixPrizes_${idx}`, 4)}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className={styles.modalPrizeLabel}>G5</td>
                                        {processedLiveData.map(stationData => (
                                            <td key={stationData.tinh}>
                                                <div className={styles.modalPrizeContainer}>
                                                    <span className={styles.modalPrizeNumber}>
                                                        {renderPrizeValue(stationData.tinh, 'fivePrizes_0', 4)}
                                                    </span>
                                                </div>
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className={styles.modalPrizeLabel}>G4</td>
                                        {processedLiveData.map(stationData => (
                                            <td key={stationData.tinh}>
                                                <div className={styles.modalPrizeContainer}>
                                                    {[0, 1, 2, 3, 4, 5, 6].map(idx => (
                                                        <span key={idx} className={styles.modalPrizeNumber}>
                                                            {renderPrizeValue(stationData.tinh, `fourPrizes_${idx}`, 5)}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className={styles.modalPrizeLabel}>G3</td>
                                        {processedLiveData.map(stationData => (
                                            <td key={stationData.tinh}>
                                                <div className={styles.modalPrizeContainer}>
                                                    {[0, 1].map(idx => (
                                                        <span key={idx} className={styles.modalPrizeNumber}>
                                                            {renderPrizeValue(stationData.tinh, `threePrizes_${idx}`, 5)}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className={styles.modalPrizeLabel}>G2</td>
                                        {processedLiveData.map(stationData => (
                                            <td key={stationData.tinh}>
                                                <div className={styles.modalPrizeContainer}>
                                                    <span className={styles.modalPrizeNumber}>
                                                        {renderPrizeValue(stationData.tinh, 'secondPrize_0', 5)}
                                                    </span>
                                                </div>
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className={styles.modalPrizeLabel}>G1</td>
                                        {processedLiveData.map(stationData => (
                                            <td key={stationData.tinh}>
                                                <div className={styles.modalPrizeContainer}>
                                                    <span className={styles.modalPrizeNumber}>
                                                        {renderPrizeValue(stationData.tinh, 'firstPrize_0', 5)}
                                                    </span>
                                                </div>
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className={styles.modalPrizeLabel}>ĐB</td>
                                        {processedLiveData.map(stationData => (
                                            <td key={stationData.tinh}>
                                                <div className={styles.modalPrizeContainer}>
                                                    <span className={`${styles.modalPrizeNumber} ${styles.special}`}>
                                                        {renderPrizeValue(stationData.tinh, 'specialPrize_0', 6)}
                                                    </span>
                                                </div>
                                            </td>
                                        ))}
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Thêm nút lọc số cho modal */}
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
                                                {allHeads[i].map((headNumbers, index) => (
                                                    headNumbers.map((item, numIdx) => (
                                                        <span
                                                            key={numIdx}
                                                            className={`${styles.modalStatsPrize} ${item.isEighth ? styles.eighth : ''} ${item.isSpecial ? styles.special : ''}`}
                                                        >
                                                            {item.num}
                                                            {numIdx < headNumbers.length - 1 && ', '}
                                                        </span>
                                                    ))
                                                ))}
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
                                                {allTails[i].map((tailNumbers, index) => (
                                                    tailNumbers.map((item, numIdx) => (
                                                        <span
                                                            key={numIdx}
                                                            className={`${styles.modalStatsPrize} ${item.isEighth ? styles.eighth : ''} ${item.isSpecial ? styles.special : ''}`}
                                                        >
                                                            {item.num}
                                                            {numIdx < tailNumbers.length - 1 && ', '}
                                                        </span>
                                                    ))
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                // Layout thông thường cho trang chính
                <div className={styles.kqxs} style={{ '--num-columns': processedLiveData.length }}>
                    <div className={styles.header}>
                        <div className={styles.tructiep}><span className={styles.kqxs__title1}>Tường thuật trực tiếp...</span></div>
                        <h1 className={styles.kqxs__title}>XSMT - Kết quả Xổ số Miền Trung - SXMT {today}</h1>
                        <div className={styles.kqxs__action}>
                            <a className={styles.kqxs__actionLink} href="#!">XSMT</a>
                            <a className={`${styles.kqxs__actionLink} ${styles.dayOfWeek}`} href="#!">{processedLiveData[0]?.dayOfWeek}</a>
                            <a className={styles.kqxs__actionLink} href="#!">{today}</a>
                        </div>
                    </div>
                    <table className={styles.tableXS}>
                        <thead>
                            <tr>
                                <th></th>
                                {processedLiveData.map(stationData => (
                                    <th key={stationData.tinh} className={styles.stationName}>
                                        {stationData.tentinh}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className={`${styles.tdTitle} ${styles.highlight}`}>G8</td>
                                {processedLiveData.map(item => (
                                    <td key={item.tinh} className={styles.rowXS}>
                                        <span className={`${styles.span4} ${styles.highlight}`}>
                                            {renderPrizeValue(item.tinh, 'eightPrizes_0', 2)}
                                        </span>
                                    </td>
                                ))}
                            </tr>
                            <tr>
                                <td className={styles.tdTitle}>G7</td>
                                {processedLiveData.map(item => (
                                    <td key={item.tinh} className={styles.rowXS}>
                                        <span className={styles.span4}>
                                            {renderPrizeValue(item.tinh, 'sevenPrizes_0', 3)}
                                        </span>
                                    </td>
                                ))}
                            </tr>
                            <tr>
                                <td className={styles.tdTitle}>G6</td>
                                {processedLiveData.map(item => (
                                    <td key={item.tinh} className={styles.rowXS}>
                                        {[0, 1, 2].map(idx => (
                                            <span key={idx} className={styles.span3}>
                                                {renderPrizeValue(item.tinh, `sixPrizes_${idx}`, 4)}
                                            </span>
                                        ))}
                                    </td>
                                ))}
                            </tr>
                            <tr>
                                <td className={`${styles.tdTitle} ${styles.g3}`}>G5</td>
                                {processedLiveData.map(item => (
                                    <td key={item.tinh} className={styles.rowXS}>
                                        <span className={`${styles.span3} ${styles.g3}`}>
                                            {renderPrizeValue(item.tinh, 'fivePrizes_0', 4)}
                                        </span>
                                    </td>
                                ))}
                            </tr>
                            <tr>
                                <td className={styles.tdTitle}>G4</td>
                                {processedLiveData.map(item => (
                                    <td key={item.tinh} className={styles.rowXS}>
                                        {[0, 1, 2, 3, 4, 5, 6].map(idx => (
                                            <span key={idx} className={styles.span4}>
                                                {renderPrizeValue(item.tinh, `fourPrizes_${idx}`, 5)}
                                            </span>
                                        ))}
                                    </td>
                                ))}
                            </tr>
                            <tr>
                                <td className={`${styles.tdTitle} ${styles.g3}`}>G3</td>
                                {processedLiveData.map(item => (
                                    <td key={item.tinh} className={styles.rowXS}>
                                        {[0, 1].map(idx => (
                                            <span key={idx} className={`${styles.span3} ${styles.g3}`}>
                                                {renderPrizeValue(item.tinh, `threePrizes_${idx}`, 5)}
                                            </span>
                                        ))}
                                    </td>
                                ))}
                            </tr>
                            <tr>
                                <td className={styles.tdTitle}>G2</td>
                                {processedLiveData.map(item => (
                                    <td key={item.tinh} className={styles.rowXS}>
                                        <span className={styles.span1}>
                                            {renderPrizeValue(item.tinh, 'secondPrize_0', 5)}
                                        </span>
                                    </td>
                                ))}
                            </tr>
                            <tr>
                                <td className={styles.tdTitle}>G1</td>
                                {processedLiveData.map(item => (
                                    <td key={item.tinh} className={styles.rowXS}>
                                        <span className={styles.span1}>
                                            {renderPrizeValue(item.tinh, 'firstPrize_0', 5)}
                                        </span>
                                    </td>
                                ))}
                            </tr>
                            <tr>
                                <td className={`${styles.tdTitle} ${styles.highlight}`}>ĐB</td>
                                {processedLiveData.map(item => (
                                    <td key={item.tinh} className={styles.rowXS}>
                                        <span className={`${styles.span1} ${styles.highlight} ${styles.gdb}`}>
                                            {renderPrizeValue(item.tinh, 'specialPrize_0', 6)}
                                        </span>
                                    </td>
                                ))}
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
                                    onChange={() => handleFilterChange && handleFilterChange(tableKey, 'all')}
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
                                    onChange={() => handleFilterChange && handleFilterChange(tableKey, 'last2')}
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
                                    onChange={() => handleFilterChange && handleFilterChange(tableKey, 'last3')}
                                />
                                <label htmlFor={`filterThree-${tableKey}`}>3 Số Đuôi</label>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Chỉ hiển thị bảng thống kê đầu đuôi khi không phải forum */}
            {!isForum && !isModal && (
                <div className={styles.TKe_container}>
                    <div className={styles.TKe_content}>
                        <div className={styles.TKe_contentTitle}>
                            <span className={styles.title}>Bảng Lô Tô - </span>
                            <span className={styles.desc}>Miền Trung</span>
                            <span className={styles.dayOfWeek}>{`${processedLiveData[0]?.dayOfWeek} - `}</span>
                            <span className={styles.desc}>{today}</span>
                        </div>
                        <table className={styles.tableKey} style={{ '--num-columns': processedLiveData.length }}>
                            <thead>
                                <tr>
                                    <th className={styles.t_h}>Đầu</th>
                                    {processedLiveData.map(station => (
                                        <th key={station.tinh}>{station.tentinh}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {Array.from({ length: 10 }, (_, idx) => (
                                    <tr key={idx}>
                                        <td className={styles.t_h}>{idx}</td>
                                        {allHeads[idx].map((headNumbers, index) => (
                                            <td key={index}>
                                                {headNumbers.length > 0 ? (
                                                    headNumbers.map((item, numIdx) => (
                                                        <span
                                                            key={numIdx}
                                                            className={item.isEighth || item.isSpecial ? styles.highlight1 : ''}
                                                        >
                                                            {item.num}
                                                            {numIdx < headNumbers.length - 1 && ', '}
                                                        </span>
                                                    ))
                                                ) : '-'}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className={styles.TKe_content}>
                        <div className={styles.TKe_contentTitle}>
                            <span className={styles.title}>Bảng Lô Tô - </span>
                            <span className={styles.desc}>Miền Trung</span>
                            <span className={styles.dayOfWeek}>{`${processedLiveData[0]?.dayOfWeek} - `}</span>
                            <span className={styles.desc}>{today}</span>
                        </div>
                        <table className={styles.tableKey} style={{ '--num-columns': processedLiveData.length }}>
                            <thead>
                                <tr>
                                    <th className={styles.t_h}>Đuôi</th>
                                    {processedLiveData.map(station => (
                                        <th key={station.tinh}>{station.tentinh}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {Array.from({ length: 10 }, (_, idx) => (
                                    <tr key={idx}>
                                        <td className={styles.t_h}>{idx}</td>
                                        {allTails[idx].map((tailNumbers, index) => (
                                            <td key={index}>
                                                {tailNumbers.length > 0 ? (
                                                    tailNumbers.map((item, numIdx) => (
                                                        <span
                                                            key={numIdx}
                                                            className={item.isEighth || item.isSpecial ? styles.highlight1 : ''}
                                                        >
                                                            {item.num}
                                                            {numIdx < tailNumbers.length - 1 && ', '}
                                                        </span>
                                                    ))
                                                ) : '-'}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
});

export default LiveResult;