import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import styles from '../../styles/LIVEMN.module.css';
import { getFilteredNumber } from "../../library/utils/filterUtils";
import React from 'react';
import { useLottery } from '../../contexts/LotteryContext';

const LiveResult = React.memo(({ station, getHeadAndTailNumbers = null, handleFilterChange = null, filterTypes = null, isLiveWindow, isModal = false, isForum = false }) => {
    const [modalFilter, setModalFilter] = useState('all');
    const { liveData, setLiveData, setIsLiveDataComplete } = useLottery() || { liveData: null, setLiveData: null, setIsLiveDataComplete: null };
    const [isTodayLoading, setIsTodayLoading] = useState(true);
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const [animatingPrizes, setAnimatingPrizes] = useState({});
    const [sseStatus, setSseStatus] = useState({});
    const mountedRef = useRef(false);
    const sseRefs = useRef({});
    const sseSetupRef = useRef(false);
    const updateTimeoutRef = useRef(null);
    const initialDataCache = useRef(new Map());
    const cacheTimeout = 30 * 1000; // Giảm xuống 30 giây
    const prizeCache = useRef(new Map());
    const prizeCacheTimeout = 15 * 1000; // Giảm xuống 15 giây
    const sseConnectionPool = useRef(new Map());
    const sseReconnectDelay = 1000;

    // Thêm ref để track animation state
    const animationStateRef = useRef({});
    const isInitializingRef = useRef(false);

    const today = useMemo(() => new Date().toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).replace(/\//g, '-'), []);

    const provincesByDay = useMemo(() => ({
        0: [
            { tinh: 'tien-giang', tentinh: 'Tiền Giang' },
            { tinh: 'kien-giang', tentinh: 'Kiên Giang' },
            { tinh: 'da-lat', tentinh: 'Đà Lạt' },
        ],
        1: [
            { tinh: 'tphcm', tentinh: 'TP.HCM' },
            { tinh: 'dong-thap', tentinh: 'Đồng Tháp' },
            { tinh: 'ca-mau', tentinh: 'Cà Mau' },
        ],
        2: [
            { tinh: 'ben-tre', tentinh: 'Bến Tre' },
            { tinh: 'vung-tau', tentinh: 'Vũng Tàu' },
            { tinh: 'bac-lieu', tentinh: 'Bạc Liêu' },
        ],
        3: [
            { tinh: 'dong-nai', tentinh: 'Đồng Nai' },
            { tinh: 'can-tho', tentinh: 'Cần Thơ' },
            { tinh: 'soc-trang', tentinh: 'Sóc Trăng' },
        ],
        4: [
            { tinh: 'tay-ninh', tentinh: 'Tây Ninh' },
            { tinh: 'an-giang', tentinh: 'An Giang' },
            { tinh: 'binh-thuan', tentinh: 'Bình Thuận' },
        ],
        5: [
            { tinh: 'vinh-long', tentinh: 'Vĩnh Long' },
            { tinh: 'binh-duong', tentinh: 'Bình Dương' },
            { tinh: 'tra-vinh', tentinh: 'Trà Vinh' },
        ],
        6: [
            { tinh: 'tphcm', tentinh: 'TP.HCM' },
            { tinh: 'long-an', tentinh: 'Long An' },
            { tinh: 'binh-phuoc', tentinh: 'Bình Phước' },
            { tinh: 'hau-giang', tentinh: 'Hậu Giang' },
        ],
    }), []);

    const emptyResult = useMemo(() => {
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

    const tableKey = today + station;
    const currentFilter = isModal ? modalFilter : (filterTypes && filterTypes[tableKey]) || 'all';

    const processedLiveData = useMemo(() => {
        if (!liveData || !Array.isArray(liveData)) return [];
        return liveData.map(item => ({
            ...item,
            filteredPrizes: Object.keys(item).reduce((acc, key) => {
                if (key.includes('Prize') && item[key] !== '...' && item[key] !== '***') {
                    acc[key] = getFilteredNumber(item[key], currentFilter);
                }
                return acc;
            }, {})
        }));
    }, [liveData, currentFilter]);

    const renderPrizeValue = useCallback((tinh, prizeType, digits = 5) => {
        // Sử dụng ref state để tránh stale closure
        const isAnimating = animationStateRef.current[tinh] === prizeType &&
            processedLiveData.find(item => item.tinh === tinh)?.[prizeType] === '...';
        const className = `${styles.running_number} ${styles[`running_${digits}`]}`;
        const prizeValue = processedLiveData.find(item => item.tinh === tinh)?.[prizeType] || '...';
        const filteredValue = processedLiveData.find(item => item.tinh === tinh)?.filteredPrizes?.[prizeType] || getFilteredNumber(prizeValue, currentFilter);
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
    }, [processedLiveData, currentFilter]); // Loại bỏ animatingPrizes khỏi dependencies

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

    const getCachedOrFetchInitialData = useCallback(async (province, targetDate) => {
        const cacheKey = `${station}:${province.tinh}:${targetDate}`;
        const cached = initialDataCache.current.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < cacheTimeout) {
            console.log(`📦 Sử dụng cached data cho ${province.tinh} (cache age: ${Math.round((Date.now() - cached.timestamp) / 1000)}s)`);
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

            // Force fetch fresh data nếu cache quá cũ (trên 15 giây)
            const cacheAge = Date.now() - cached.timestamp;
            if (cacheAge > 15 * 1000) {
                console.log(`🔄 Cache quá cũ (${Math.round(cacheAge / 1000)}s), force fetch fresh data cho ${province.tinh}`);
                // Không return cached data, tiếp tục fetch fresh data
            } else {
                return mergedData;
            }
        }

        try {
            const response = await fetch(
                `https://backendkqxs-1.onrender.com/api/ketqua/xsmn/sse/initial?station=${station}&tinh=${province.tinh}&date=${targetDate.replace(/\//g, '-')}`
            );
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const serverData = await response.json();

            initialDataCache.current.set(cacheKey, {
                data: serverData,
                timestamp: Date.now()
            });

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
            if (cached) {
                console.log(`🔄 Fallback to cached data cho ${province.tinh}`);
                return cached.data;
            }
            throw error;
        }
    }, [station]);

    const localStorageRef = useRef(new Map());
    const localStorageTimeoutRef = useRef(null);
    const LIVE_DATA_TTL = 40 * 60 * 1000;

    const debouncedLocalStorageUpdate = useCallback((key, value) => {
        localStorageRef.current.set(key, value);

        if (localStorageTimeoutRef.current) {
            clearTimeout(localStorageTimeoutRef.current);
        }

        localStorageTimeoutRef.current = setTimeout(() => {
            localStorageRef.current.forEach((value, key) => {
                try {
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
        }, 100);
    }, []);

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

    useEffect(() => {
        const cleanupInterval = setInterval(cleanupOldLiveData, 10 * 60 * 1000);

        // Tự động invalidate cache mỗi 30 giây để đảm bảo dữ liệu mới nhất
        const cacheInvalidationInterval = setInterval(() => {
            console.log('🔄 Auto invalidate cache để đảm bảo dữ liệu mới nhất');
            initialDataCache.current.clear();
            prizeCache.current.clear();
        }, 30 * 1000);

        return () => {
            clearInterval(cleanupInterval);
            clearInterval(cacheInvalidationInterval);
        };
    }, [cleanupOldLiveData]);

    const animationTimeoutsRef = useRef(new Map());

    const setAnimationWithTimeout = useCallback((tinh, prizeType) => {
        // Kiểm tra nếu component đang unmount hoặc initializing
        if (!mountedRef.current || isInitializingRef.current) {
            console.log('⚠️ Bỏ qua animation - component đang unmount hoặc initializing');
            return;
        }

        const animationKey = `${tinh}-${prizeType}`;

        // Clear timeout cũ nếu có
        if (animationTimeoutsRef.current.has(animationKey)) {
            clearTimeout(animationTimeoutsRef.current.get(animationKey));
            animationTimeoutsRef.current.delete(animationKey);
        }

        // Update animation state ref ngay lập tức
        animationStateRef.current[tinh] = prizeType;

        // Sử dụng setTimeout thay vì requestAnimationFrame để tránh timing issues
        const timeoutId = setTimeout(() => {
            if (mountedRef.current) {
                setAnimatingPrizes(prev => {
                    const newState = { ...prev };
                    if (newState[tinh] === prizeType) {
                        delete newState[tinh];
                        // Cập nhật ref
                        delete animationStateRef.current[tinh];
                    }
                    return newState;
                });
            }
            animationTimeoutsRef.current.delete(animationKey);
        }, 2000);

        animationTimeoutsRef.current.set(animationKey, timeoutId);

        // Update state với delay nhỏ để đảm bảo DOM đã sẵn sàng
        setTimeout(() => {
            if (mountedRef.current) {
                setAnimatingPrizes(prev => ({
                    ...prev,
                    [tinh]: prizeType
                }));
            }
        }, 50);

    }, []);

    const batchUpdateRef = useRef(new Map());
    const batchTimeoutRef = useRef(null);

    const batchUpdateLiveData = useCallback((tinh, prizeType, value) => {
        const key = `${tinh}-${prizeType}`;
        batchUpdateRef.current.set(key, { tinh, prizeType, value });

        if (value && value !== '...' && value !== '***') {
            const prizeCacheKey = `${station}:${tinh}:${prizeType}`;
            prizeCache.current.set(prizeCacheKey, {
                value: value,
                timestamp: Date.now()
            });
            console.log(`📦 Cached prize ${prizeType} = ${value} cho ${tinh}`);

            // Invalidate initial data cache khi có dữ liệu mới
            const initialCacheKey = `${station}:${tinh}:${today}`;
            const cachedInitialData = initialDataCache.current.get(initialCacheKey);
            if (cachedInitialData) {
                console.log(`🔄 Invalidating initial cache cho ${tinh} do có dữ liệu mới`);
                initialDataCache.current.delete(initialCacheKey);
            }
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

                                // Trigger animation cho dữ liệu mới nếu component đang mounted
                                if (mountedRef.current && updateValue && updateValue !== '...' && updateValue !== '***') {
                                    console.log(`🎬 Trigger animation cho ${updatePrizeType} = ${updateValue} (${updateTinh})`);
                                    // Delay nhỏ để đảm bảo state đã được update
                                    setTimeout(() => {
                                        if (mountedRef.current) {
                                            setAnimationWithTimeout(updateTinh, updatePrizeType);
                                        }
                                    }, 100);
                                }
                            }
                        });

                        if (hasChanges) {
                            updatedItem.lastUpdated = Date.now();
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

                batchUpdateRef.current.clear();
            }
        }, 50);
    }, [setLiveData, debouncedLocalStorageUpdate, station, today]);

    useEffect(() => {
        mountedRef.current = true;
        isInitializingRef.current = true;
        console.log('🔄 LiveResult component mounted');

        // Reset animation state với delay để đảm bảo DOM đã sẵn sàng
        setTimeout(() => {
            if (mountedRef.current) {
                setAnimatingPrizes({});
                animationStateRef.current = {};
                isInitializingRef.current = false;
                console.log('🔄 Reset animation state completed');
            }
        }, 100);

        return () => {
            console.log('🔄 LiveResult component unmounting');
            mountedRef.current = false;
            isInitializingRef.current = true;

            // Clear tất cả animation timeouts
            console.log('🧹 Clear animation timeouts...');
            animationTimeoutsRef.current.forEach((timeoutId) => {
                clearTimeout(timeoutId);
            });
            animationTimeoutsRef.current.clear();

            // Clear animation state
            setAnimatingPrizes({});
            animationStateRef.current = {};

            // Clear batch update timeout
            if (batchTimeoutRef.current) {
                clearTimeout(batchTimeoutRef.current);
                batchTimeoutRef.current = null;
            }

            // Clear batch update ref
            batchUpdateRef.current.clear();

            // Đóng tất cả SSE connections
            Object.values(sseRefs.current).forEach(sse => {
                console.log('🔌 Đóng kết nối SSE...');
                sse.close();
            });
            sseRefs.current = {};

            // Reset SSE setup flag
            sseSetupRef.current = false;
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
            setTimeout(() => {
                if (mountedRef.current) {
                    setLiveData(emptyResult);
                    setIsTodayLoading(true);
                    setError(null);
                }
            }, 0);
            return;
        }

        if (sseSetupRef.current) {
            console.log('⚠️ SSE đã được thiết lập, bỏ qua');
            return;
        }

        if (typeof window !== 'undefined' && window.__NEXT_DATA__?.buildId !== window.__NEXT_DATA__?.buildId) {
            console.log('⚠️ Đang trong Fast Refresh, bỏ qua thiết lập SSE');
            return;
        }

        console.log('✅ Bắt đầu thiết lập SSE cho XSMN');
        sseSetupRef.current = true;

        // Reset animation state với delay để đảm bảo không conflict
        setTimeout(() => {
            if (mountedRef.current) {
                setAnimatingPrizes({});
                animationStateRef.current = {};
                console.log('🔄 Reset animation state cho SSE setup');
            }
        }, 150);

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
                                if (parsed.data && parsed.timestamp) {
                                    const now = Date.now();
                                    if (now - parsed.timestamp > LIVE_DATA_TTL) {
                                        initialData = {
                                            ...emptyResult.find(item => item.tinh === province.tinh),
                                            lastUpdated: 0,
                                        };
                                    } else {
                                        initialData = {
                                            ...parsed.data,
                                            lastUpdated: parsed.timestamp,
                                        };
                                    }
                                } else {
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
                            const serverData = await getCachedOrFetchInitialData(province, today);
                            console.log(`📡 Dữ liệu từ /initial cho ${province.tinh}:`, serverData);

                            const updatedData = { ...initialData };
                            let shouldUpdate = !initialData.lastUpdated || serverData.lastUpdated > initialData.lastUpdated;
                            let hasNewData = false;

                            for (const key in serverData) {
                                if (serverData[key] !== '...' || !updatedData[key] || updatedData[key] === '...' || updatedData[key] === '***') {
                                    updatedData[key] = serverData[key];
                                    shouldUpdate = true;

                                    // Kiểm tra nếu có dữ liệu mới và component đang mounted
                                    if (serverData[key] !== '...' && serverData[key] !== '***' && mountedRef.current) {
                                        hasNewData = true;
                                        console.log(`🎬 Có dữ liệu mới: ${key} = ${serverData[key]} cho ${province.tinh}`);
                                    }
                                }
                            }

                            // Trigger animation cho dữ liệu mới nếu có
                            if (hasNewData && mountedRef.current) {
                                const prizeTypes = [
                                    'eightPrizes_0', 'sevenPrizes_0', 'sixPrizes_0', 'sixPrizes_1', 'sixPrizes_2',
                                    'fivePrizes_0', 'fourPrizes_0', 'fourPrizes_1', 'fourPrizes_2', 'fourPrizes_3',
                                    'fourPrizes_4', 'fourPrizes_5', 'fourPrizes_6', 'threePrizes_0', 'threePrizes_1',
                                    'secondPrize_0', 'firstPrize_0', 'specialPrize_0'
                                ];

                                prizeTypes.forEach(prizeType => {
                                    if (serverData[prizeType] && serverData[prizeType] !== '...' && serverData[prizeType] !== '***') {
                                        console.log(`🎬 Trigger animation cho dữ liệu có sẵn: ${prizeType} = ${serverData[prizeType]} (${province.tinh})`);
                                        setAnimationWithTimeout(province.tinh, prizeType);
                                    }
                                });
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
            if (!mountedRef.current) {
                console.log('⚠️ Component đã unmount, bỏ qua thiết lập SSE');
                return;
            }

            const targetDate = new Date(today.split('-').reverse().join('-'));
            const dayOfWeekIndex = targetDate.getDay();
            const provinces = provincesByDay[dayOfWeekIndex] || provincesByDay[6];
            console.log('🔌 Thiết lập SSE cho provinces:', provinces.map(p => p.tinh));

            provinces.forEach(province => {
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

                if (sseConnectionPool.current.has(connectionKey)) {
                    const existingConnection = sseConnectionPool.current.get(connectionKey);
                    if (existingConnection.readyState === EventSource.OPEN) {
                        console.log(`🔌 SSE connection cho ${province.tinh} đã tồn tại và đang hoạt động`);
                        sseRefs.current[province.tinh] = existingConnection;
                        return;
                    } else {
                        existingConnection.close();
                        sseConnectionPool.current.delete(connectionKey);
                    }
                }

                if (sseRefs.current[province.tinh] && sseRefs.current[province.tinh].readyState !== EventSource.CLOSED) {
                    console.log(`🔌 SSE connection cho ${province.tinh} đã tồn tại và đang hoạt động`);
                    return;
                }

                if (sseRefs.current[province.tinh]) {
                    console.log(`🔌 Đóng kết nối SSE cũ cho ${province.tinh}`);
                    sseRefs.current[province.tinh].close();
                }

                const sseUrl = `https://backendkqxs-1.onrender.com/api/ketqua/xsmn/sse?station=${station}&tinh=${province.tinh}&date=${today.replace(/\//g, '-')}`;
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
                            setRetryCount(0);
                        }
                    };

                    newConnection.onerror = () => {
                        console.log(`🔴 SSE error for ${province.tinh}, reconnecting... Retry count: ${retryCount + 1}`);
                        setSseStatus(prev => ({ ...prev, [province.tinh]: 'error' }));
                        if (mountedRef.current) {
                            setError('Đang kết nối lại SSE...');
                        }

                        if (sseRefs.current[province.tinh]) {
                            sseRefs.current[province.tinh].close();
                            sseRefs.current[province.tinh] = null;
                        }
                        sseConnectionPool.current.delete(connectionKey);

                        if (retryCount < maxRetries && mountedRef.current) {
                            setTimeout(() => {
                                if (mountedRef.current) {
                                    setRetryCount(prev => prev + 1);
                                    retrySSEForProvince(province.tinh);
                                }
                            }, sseReconnectDelay);
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
                                    console.log(`🚀 Cập nhật ngay lập tức: ${prizeType} = ${data[prizeType]} (tỉnh ${province.tinh})`);

                                    // Force invalidate cache khi có dữ liệu mới từ SSE
                                    const initialCacheKey = `${station}:${province.tinh}:${today}`;
                                    if (initialDataCache.current.has(initialCacheKey)) {
                                        console.log(`🔄 Force invalidate cache cho ${province.tinh} do SSE update`);
                                        initialDataCache.current.delete(initialCacheKey);
                                    }

                                    batchUpdateLiveData(province.tinh, prizeType, data[prizeType]);
                                    if (data[prizeType] !== '...' && data[prizeType] !== '***') {
                                        console.log(`🎬 Trigger animation từ SSE cho ${prizeType} = ${data[prizeType]} (${province.tinh})`);
                                        // Delay để đảm bảo batch update đã hoàn thành
                                        setTimeout(() => {
                                            if (mountedRef.current) {
                                                setAnimationWithTimeout(province.tinh, prizeType);
                                            }
                                        }, 150);
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

        const retrySSEForProvince = (tinh) => {
            if (!mountedRef.current) return;

            console.log(`🔄 Retry SSE cho tỉnh ${tinh}`);

            if (sseRefs.current[tinh]) {
                sseRefs.current[tinh].close();
                sseRefs.current[tinh] = null;
            }

            const sseUrl = `https://backendkqxs-1.onrender.com/api/ketqua/xsmn/sse?station=${station}&tinh=${tinh}&date=${today.replace(/\//g, '-')}`;
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
                                console.log(`🚀 Cập nhật ngay lập tức (retry): ${prizeType} = ${data[prizeType]} (tỉnh ${tinh})`);
                                batchUpdateLiveData(tinh, prizeType, data[prizeType]);
                                if (data[prizeType] !== '...' && data[prizeType] !== '***') {
                                    console.log(`🎬 Trigger animation từ retry SSE cho ${prizeType} = ${data[prizeType]} (${tinh})`);
                                    // Delay để đảm bảo batch update đã hoàn thành
                                    setTimeout(() => {
                                        if (mountedRef.current) {
                                            setAnimationWithTimeout(tinh, prizeType);
                                        }
                                    }, 150);
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
            setTimeout(() => {
                if (mountedRef.current) {
                    setLiveData(emptyResult);
                }
            }, 0);
        }

        fetchInitialData();
        connectSSE();

        return () => {
            if (updateTimeoutRef.current) {
                clearTimeout(updateTimeoutRef.current);
                updateTimeoutRef.current = null;
            }

            if (localStorageTimeoutRef.current) {
                clearTimeout(localStorageTimeoutRef.current);
                localStorageTimeoutRef.current = null;
            }

            if (batchTimeoutRef.current) {
                clearTimeout(batchTimeoutRef.current);
                batchTimeoutRef.current = null;
            }

            animationTimeoutsRef.current.forEach((timeoutId) => {
                clearTimeout(timeoutId);
            });
            animationTimeoutsRef.current.clear();

            batchUpdateRef.current.clear();

            const now = Date.now();
            for (const [key, value] of prizeCache.current.entries()) {
                if (now - value.timestamp > prizeCacheTimeout) {
                    prizeCache.current.delete(key);
                }
            }

            for (const [key, value] of initialDataCache.current.entries()) {
                if (now - value.timestamp > cacheTimeout) {
                    initialDataCache.current.delete(key);
                }
            }

            Object.values(sseRefs.current).forEach(sse => {
                console.log('🔌 Đóng kết nối SSE trong cleanup...');
                sse.close();
            });
            sseRefs.current = {};

            sseConnectionPool.current.clear();
            sseSetupRef.current = false;
        };
    }, [isLiveWindow, station, today, setLiveData, setIsLiveDataComplete, provincesByDay, emptyResult, debouncedLocalStorageUpdate, batchUpdateLiveData, setAnimationWithTimeout, getCachedOrFetchInitialData]);

    useEffect(() => {
        if (!liveData || !liveData.length || isInitializingRef.current) {
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

        // Delay để đảm bảo không conflict với initialization
        setTimeout(() => {
            if (!mountedRef.current || isInitializingRef.current) return;

            setAnimatingPrizes(prev => {
                const newAnimatingPrizes = { ...prev };
                let hasChanges = false;

                processedLiveData.forEach(stationData => {
                    const currentPrize = prev[stationData.tinh];
                    if (!currentPrize || stationData[currentPrize] !== '...') {
                        const nextPrize = animationQueue.find(prize => stationData[prize] === '...') || null;
                        if (nextPrize !== currentPrize) {
                            newAnimatingPrizes[stationData.tinh] = nextPrize;
                            animationStateRef.current[stationData.tinh] = nextPrize;
                            hasChanges = true;
                        }
                    }
                });

                return hasChanges ? newAnimatingPrizes : prev;
            });
        }, 200);

    }, [liveData]);

    useEffect(() => {
        console.log('🔄 LiveResult component re-render với liveData:', liveData);
    }, [liveData]);

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
                                        <td className={`${styles.tdTitle} ${styles.g3}`}>G3</td>
                                        {processedLiveData.map(item => (
                                            <td key={item.tinh} className={styles.rowXS}>
                                                <div className={styles.modalPrizeContainer}>
                                                    {[0, 1].map(idx => (
                                                        <span key={idx} className={`${styles.modalPrizeNumber} ${styles.g3}`}>
                                                            {renderPrizeValue(item.tinh, `threePrizes_${idx}`, 5)}
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
                                        <td className={`${styles.tdTitle} ${styles.highlight}`}>ĐB</td>
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
                <div className={styles.kqxs} style={{ '--num-columns': processedLiveData.length }}>
                    <div className={styles.header}>
                        <div className={styles.tructiep}><span className={styles.kqxs__title1}>Tường thuật trực tiếp...</span></div>
                        <h1 className={styles.kqxs__title}>XSMN - Kết quả Xổ số Miền Nam - SXMN {today}</h1>
                        <div className={styles.kqxs__action}>
                            <a className={styles.kqxs__actionLink} href="#!">XSMN</a>
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

            {!isForum && !isModal && (
                <div className={styles.TKe_container}>
                    <div className={styles.TKe_content}>
                        <div className={styles.TKe_contentTitle}>
                            <span className={styles.title}>Bảng Lô Tô - </span>
                            <span className={styles.desc}>Miền Nam</span>
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
                            <span className={styles.desc}>Miền Nam</span>
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


