import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import styles from '../../styles/LivekqxsMB.module.css';
import { getFilteredNumber } from "../../library/utils/filterUtils";
import React from 'react';
import { useLottery } from '../../contexts/LotteryContext';
import sseManager from '../../utils/SSEManager';
import { cacheStrategy } from '../../utils/cacheStrategy';

// ✅ SIMPLIFIED: Sử dụng SSEManager thay vì globalSSEManager phức tạp
// SSEManager đã được import và sẽ quản lý tất cả SSE connections

// BỔ SUNG: Performance monitoring để theo dõi hiệu suất
const performanceMonitor = {
    startTime: Date.now(),
    metrics: {
        sseConnections: 0,
        batchUpdates: 0,
        localStorageOps: 0,
        animations: 0,
        memoryUsage: 0
    },
    log: (metric, value = 1) => {
        if (process.env.NODE_ENV === 'development') {
            performanceMonitor.metrics[metric] += value;
            if (performanceMonitor.metrics[metric] % 10 === 0) {
                debugLog(`📊 Performance XSMB - ${metric}: ${performanceMonitor.metrics[metric]}`);
            }
        }
    }
};

// BỔ SUNG: Tối ưu console.log - chỉ log trong development
const debugLog = (message, data = null) => {
    if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 XSMB Debug: ${message}`, data);
    }
};

// BỔ SUNG: Tối ưu animation performance - di chuyển vào trong component
const LiveResult = React.memo(({ station, getHeadAndTailNumbers = null, handleFilterChange = null, filterTypes = null, isLiveWindow, isModal = false, isForum = false }) => {
    const [modalFilter, setModalFilter] = useState('all');
    const { xsmbLiveData, setXsmbLiveData, setIsXsmbLiveDataComplete } = useLottery() || { xsmbLiveData: null, setXsmbLiveData: null, setIsXsmbLiveDataComplete: null };
    const [isTodayLoading, setIsTodayLoading] = useState(true);
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const [animatingPrize, setAnimatingPrize] = useState(null);
    const [sseStatus, setSseStatus] = useState('connecting');

    // ✅ SIMPLIFIED: Chỉ giữ lại các refs cần thiết
    const mountedRef = useRef(false);
    const animationTimeoutsRef = useRef(new Map());
    const animationQueueRef = useRef(new Map());
    const animationThrottleRef = useRef(new Map());

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
    // ✅ SIMPLIFIED: Không cần các constants phức tạp nữa

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

    // BỔ SUNG: Tối ưu expensive calculations với useMemo - FINAL OPTIMIZATION
    const processedLiveData = useMemo(() => {
        if (!xsmbLiveData) return null;

        // Pre-calculate tất cả filtered values một lần
        const filteredPrizes = {};
        const prizeKeys = Object.keys(xsmbLiveData).filter(key =>
            key.includes('Prize') && xsmbLiveData[key] !== '...' && xsmbLiveData[key] !== '***'
        );

        // Batch process tất cả prize values
        prizeKeys.forEach(key => {
            filteredPrizes[key] = getFilteredNumber(xsmbLiveData[key], currentFilter);
        });

        return {
            ...xsmbLiveData,
            filteredPrizes,
            // Pre-calculate completion status
            isComplete: Object.values(xsmbLiveData).every(
                val => typeof val === 'string' && val !== '...' && val !== '***'
            )
        };
    }, [xsmbLiveData, currentFilter]);

    // ✅ SIMPLIFIED: Không cần localStorage logic phức tạp nữa

    // BỔ SUNG: Animation với requestAnimationFrame như XSMT
    // BỔ SUNG: Tối ưu animation performance cho 200+ client
    const setAnimationWithTimeout = useCallback((prizeType) => {
        if (animationTimeoutsRef.current.has(prizeType)) {
            clearTimeout(animationTimeoutsRef.current.get(prizeType));
        }

        // LOG: Bắt đầu animation
        console.log(`🎬 SSE XSMB - Animation started:`, {
            prizeType: prizeType,
            timestamp: new Date().toLocaleTimeString('vi-VN')
        });

        // Sử dụng requestAnimationFrame để đảm bảo smooth cho nhiều client
        requestAnimationFrame(() => {
            if (mountedRef.current) {
                setAnimatingPrize(prizeType);
            }
        });

        // Giảm timeout để tối ưu performance
        const timeoutId = setTimeout(() => {
            requestAnimationFrame(() => {
                if (mountedRef.current) {
                    setAnimatingPrize(null);
                    // LOG: Kết thúc animation
                    console.log(`🎬 SSE XSMB - Animation ended:`, {
                        prizeType: prizeType,
                        timestamp: new Date().toLocaleTimeString('vi-VN')
                    });
                }
            });
            animationTimeoutsRef.current.delete(prizeType);
        }, 1200); // Giảm từ 2000ms xuống 1200ms

        animationTimeoutsRef.current.set(prizeType, timeoutId);
    }, []);

    // ✅ SIMPLIFIED: Không cần batch update logic phức tạp nữa

    // ✅ SIMPLIFIED: Không cần memory monitoring phức tạp nữa

    // ✅ SIMPLIFIED: Cleanup function đơn giản
    useEffect(() => {
        mountedRef.current = true;

        return () => {
            mountedRef.current = false;

            // Cleanup animation timeouts
                animationTimeoutsRef.current.forEach((timeoutId) => {
                    clearTimeout(timeoutId);
                });
                animationTimeoutsRef.current.clear();

            // Clear animation queues
            animationQueueRef.current.clear();
            animationThrottleRef.current.clear();

            // ✅ TỐI ƯU: Clear cache debounce timeout
            if (cacheDebounceRef.current) {
                clearTimeout(cacheDebounceRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (!setXsmbLiveData || !setIsXsmbLiveDataComplete) return;

        // ✅ SIMPLIFIED: Sử dụng SSEManager thay vì logic phức tạp
        console.log(`🔄 Setting up SSE for ${currentStation} using SSEManager`);

        // Fetch initial data
        const fetchInitialData = async () => {
            try {
                // THÊM: Kiểm tra cache trước
                const cacheStartTime = performance.now();
                const { data: cachedData, source } = cacheStrategy.loadData();
                const cacheLoadTime = performance.now() - cacheStartTime;

                if (cachedData && mountedRef.current) {
                    console.log(`📦 Using cached data from: ${source} (${cacheLoadTime.toFixed(2)}ms)`);
                    setXsmbLiveData(cachedData);
                        setIsXsmbLiveDataComplete(false);
                        setIsTodayLoading(false);
                        setError(null);
                    return; // Không fetch từ server nếu có cache valid
                } else {
                    console.log(`🔄 No valid cache found (${cacheLoadTime.toFixed(2)}ms), fetching from server`);
                }

                // Existing logic unchanged
                const response = await fetch(`https://backendkqxs-1.onrender.com/api/kqxs/${currentStation}/sse/initial?station=${currentStation}&date=${today}`);
                    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                    const serverData = await response.json();

                    if (mountedRef.current) {
                    setXsmbLiveData(serverData);
                    setIsXsmbLiveDataComplete(false);
                        setIsTodayLoading(false);
                        setError(null);

                    // ✅ TỐI ƯU: Cache data mới với debounce
                    debouncedCache(serverData, false);
                }
            } catch (error) {
                console.error('Lỗi fetch initial data:', error);
                        if (mountedRef.current) {
                    setError('Không thể kết nối đến server. Vui lòng thử lại sau.');
                        setIsTodayLoading(false);
                }
            }
        };

        // Subscribe to SSE using SSEManager
        console.log(`🔄 About to subscribe to ${currentStation}`);
        const unsubscribe = sseManager.subscribe(currentStation, (data) => {
            console.log(`🎯 SSE CALLBACK TRIGGERED for ${currentStation}:`, data);

            if (!mountedRef.current) {
                console.log(`⚠️ Component unmounted, ignoring SSE data`);
                return;
            }

            console.log(`📡 Received SSE data for ${currentStation}:`, data);

            // Handle individual prize updates - Backend format: { prizeType: value, ... }
                const prizeTypes = [
                'firstPrize_0', 'secondPrize_0', 'secondPrize_1',
                    'threePrizes_0', 'threePrizes_1', 'threePrizes_2', 'threePrizes_3', 'threePrizes_4', 'threePrizes_5',
                    'fourPrizes_0', 'fourPrizes_1', 'fourPrizes_2', 'fourPrizes_3',
                    'fivePrizes_0', 'fivePrizes_1', 'fivePrizes_2', 'fivePrizes_3', 'fivePrizes_4', 'fivePrizes_5',
                    'sixPrizes_0', 'sixPrizes_1', 'sixPrizes_2',
                    'sevenPrizes_0', 'sevenPrizes_1', 'sevenPrizes_2', 'sevenPrizes_3',
                'maDB', 'specialPrize_0'
            ];

            // Check for individual prize updates
            for (const prizeType of prizeTypes) {
                if (data[prizeType] !== undefined) {
                    const value = data[prizeType];

                    console.log(`🎯 SSE ${currentStation} - Nhận ${prizeType}:`, {
                        value: value,
                                    timestamp: new Date().toLocaleTimeString('vi-VN'),
                        isLive: value !== '...' && value !== '***'
                    });

                    // Update live data
                    setXsmbLiveData(prev => {
                        const updatedData = { ...prev, [prizeType]: value, lastUpdated: data.lastUpdated || Date.now() };

                        // ✅ TỐI ƯU: Sử dụng debounced cache thay vì cache trực tiếp
                        // Cache sẽ được gọi sau 500ms và chỉ mỗi 3 giây
                        debouncedCache(updatedData, false);

                        return updatedData;
                    });

                    // Trigger animation for new data
                    if (value !== '...' && value !== '***') {
                        console.log(`🎬 SSE ${currentStation} - Bắt đầu animation cho ${prizeType}:`, value);
                                    setAnimationWithTimeout(prizeType);
                                }

                    // Update completion status
                    setIsXsmbLiveDataComplete(false);
                    setIsTodayLoading(false);
                    setRetryCount(0);
                    setError(null);
                    break; // Chỉ xử lý 1 prize type mỗi lần
                }
            }

            // Handle full data update
            if (data.full) {
                console.log(`📊 SSE ${currentStation} - Nhận kết quả đầy đủ`);
                setXsmbLiveData(data);
                setIsXsmbLiveDataComplete(true);
                            setIsTodayLoading(false);
                            setRetryCount(0);
                            setError(null);

                // ✅ TỐI ƯU: Cache complete data ngay lập tức (không debounce)
                // Vì đây là kết quả cuối cùng, cần cache ngay
                cacheStrategy.cacheCompleteData(data);
            }
        });

        // Fetch initial data
        fetchInitialData();

        // ✅ THÊM: Log cache stats sau khi setup
        setTimeout(() => {
            const stats = cacheStrategy.getCacheStats();
            console.log('📊 Cache Stats after setup:', stats);
        }, 1000);

        // Cleanup function
        return () => {
            console.log(`🧹 Cleaning up SSE subscription for ${currentStation}`);
            unsubscribe();

            // Log stats after cleanup
            setTimeout(() => {
                sseManager.getStats();
            }, 100);
        };
    }, [currentStation, today, setXsmbLiveData, setIsXsmbLiveDataComplete]);

    // ✅ IMPROVED: Logic animation tối ưu từ mã cũ
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

    // BỔ SUNG: renderPrizeValue tối ưu - FINAL VERSION
    const renderPrizeValue = (prizeType, digits = 5) => {
        const isAnimating = animatingPrize === prizeType && xsmbLiveData[prizeType] === '...';
        const className = `${styles.running_number} ${styles[`running_${digits}`]}`;

        // Xác định số chữ số cần hiển thị dựa trên bộ lọc
        let displayDigits = digits;
        if (currentFilter === 'last2') {
            displayDigits = 2;
        } else if (currentFilter === 'last3') {
            displayDigits = Math.min(digits, 3); // Giới hạn tối đa 3 số
        }

        return (
            <span className={className} data-status={isAnimating ? 'animating' : 'static'}>
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
                        {getFilteredNumber(xsmbLiveData[prizeType], currentFilter)
                            .padStart(displayDigits, '0')
                            .split('')
                            .map((digit, i) => (
                                <span key={i} data-status="static" data-index={i}>
                                    {digit}
                                </span>
                            ))}
                    </span>
                )}
            </span>
        );
    };

    // ✅ TỐI ƯU: Thêm debounce cho cache để tránh gọi quá nhiều
    const cacheDebounceRef = useRef(null);
    const lastCacheTimeRef = useRef(0);
    const CACHE_DEBOUNCE_DELAY = 3000; // Tăng lên 3 giây để giảm tải hơn

    // ✅ TỐI ƯU: Helper function để cache với debounce
    const debouncedCache = useCallback((data, isComplete = false) => {
        const now = Date.now();

        // Chỉ cache nếu đã qua 3 giây từ lần cache cuối
        if (now - lastCacheTimeRef.current < CACHE_DEBOUNCE_DELAY) {
            return;
        }

        // Clear timeout cũ nếu có
        if (cacheDebounceRef.current) {
            clearTimeout(cacheDebounceRef.current);
        }

        // Set timeout để cache sau 500ms
        cacheDebounceRef.current = setTimeout(() => {
            if (mountedRef.current) {
                const startTime = performance.now();

                if (isComplete) {
                    cacheStrategy.cacheCompleteData(data);
                    console.log(`🏁 Cached complete data in ${(performance.now() - startTime).toFixed(2)}ms`);
                } else {
                    cacheStrategy.cacheLiveData(data);
                    console.log(`📦 Cached live data in ${(performance.now() - startTime).toFixed(2)}ms`);
                }

                lastCacheTimeRef.current = Date.now();
            }
        }, 500);
    }, []);

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
    return (hours === 18 && minutes >= 10 && minutes <= 33);
}

export default React.memo(LiveResult);