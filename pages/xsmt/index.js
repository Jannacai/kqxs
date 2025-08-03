import { apiMT } from "../api/kqxs/kqxsMT";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import styles from '../../styles/kqxsMT.module.css';
import { getFilteredNumber } from "../../library/utils/filterUtils";
import { useRouter } from 'next/router';
import LiveResult from './LiveResult';
import React from 'react';
import { useLottery } from '../../contexts/LotteryContext';

// Print Button Component - Tối ưu hiệu suất
const PrintButton = React.memo(({ onPrint, selectedDate }) => {
    const [showPrintOptions, setShowPrintOptions] = useState(false);
    const [selectedSize, setSelectedSize] = useState('A4');

    const printSizes = useMemo(() => [
        { value: 'A4', label: 'A4 (210×297mm)' },
        { value: 'A5', label: 'A5 (148×210mm)' },
        { value: 'A6', label: 'A6 (105×148mm)' },
        { value: 'A7', label: 'A7 (74×105mm)' }
    ], []);

    return (
        <div className={styles.printContainer}>
            <button
                className={styles.printButton}
                onClick={() => setShowPrintOptions(!showPrintOptions)}
                title="In kết quả"
            >
                🖨️ In Vé Dò
            </button>

            {showPrintOptions && (
                <div className={styles.printOptions}>
                    <div className={styles.printOptionsHeader}>
                        <span>Chọn kích thước giấy:</span>
                        <button
                            className={styles.closeButton}
                            onClick={() => setShowPrintOptions(false)}
                        >
                            ✕
                        </button>
                    </div>
                    <div className={styles.printSizeOptions}>
                        {printSizes.map(size => (
                            <button
                                key={size.value}
                                className={`${styles.printSizeButton} ${selectedSize === size.value ? styles.selected : ''}`}
                                onClick={() => {
                                    setSelectedSize(size.value);
                                    onPrint(size.value, selectedDate);
                                }}
                            >
                                {size.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
});

PrintButton.displayName = 'PrintButton';

const CACHE_DURATION = 24 * 60 * 60 * 1000; // Cache 24 giờ
const DAYS_PER_PAGE = 3; // Mỗi trang chứa 3 ngày gần nhất

const KQXS = (props) => {
    const { liveData, isLiveDataComplete } = useLottery();
    const [data, setData] = useState(props.data || []);
    const [loading, setLoading] = useState(true);
    const [loadingPage, setLoadingPage] = useState(false);
    const [filterTypes, setFilterTypes] = useState({});
    const [isLiveWindow, setIsLiveWindow] = useState(false); // ✅ Đồng bộ với XSMB
    const [currentPage, setCurrentPage] = useState(1);
    const [hasTriggeredScraper, setHasTriggeredScraper] = useState(false);
    const [lastLiveUpdate, setLastLiveUpdate] = useState(null);
    const [loadedPages, setLoadedPages] = useState(new Set([1])); // Track loaded pages
    const [totalDays, setTotalDays] = useState(0); // Tổng số ngày từ backend
    const [pageData, setPageData] = useState({}); // Data theo page: {1: [...], 2: [...], ...}
    const intervalRef = useRef(null);
    const tableRef = useRef(null);
    const router = useRouter();

    // ✅ TỐI ƯU: Sử dụng useRef để tham chiếu đến fetchData - giống XSMB
    const fetchDataRef = useRef();

    const hour = 17;
    const minutes1 = 10;
    const minutes2 = 14;

    const dayof = props.dayofMT;
    const station = props.station || "xsmt";
    const date = props.data3;
    const tinh = props.tinh;

    const startHour = hour;
    const startMinute = minutes1;
    const duration = 30 * 60 * 1000; // 30 phút

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
    }).replace(/\//g, '/');

    const CACHE_KEY = `xsmt_data_${station}_${date || 'null'}_${tinh || 'null'}_${dayof || 'null'}`;
    const UPDATE_KEY = `xsmt_updated_${today}`; // Cờ để theo dõi cập nhật ngày hiện tại

    // ✅ TỐI ƯU: Logic cache đơn giản và hiệu quả
    const cleanOldCache = () => {
        const now = new Date().getTime();
        const keysToRemove = [];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes('xsmt_data') || key.includes('xsmt_updated'))) {
                const cacheTime = parseInt(localStorage.getItem(key));
                if (now - cacheTime > CACHE_DURATION) {
                    keysToRemove.push(key);
                }
            }
        }

        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            console.log(`🧹 Đã xóa cache hết hạn: ${key}`);
        });
    };

    // ✅ TỐI ƯU: Loại bỏ isLiveWindowActive - dư thừa vì đã có isLiveWindow

    // ✅ TỐI ƯU: Logic fetchData đơn giản và hiệu quả
    const fetchData = useCallback(async (page = currentPage, forceRefresh = false) => {
        try {
            const vietnamTime = getVietnamTime();
            const now = vietnamTime.getTime();

            // Cache key đơn giản
            const CACHE_KEY = `xsmt_data_${station}_${date || 'null'}_${tinh || 'null'}_${dayof || 'null'}_page_${page}`;
            const cachedData = localStorage.getItem(CACHE_KEY);
            const cachedTime = localStorage.getItem(`${CACHE_KEY}_time`);
            const cacheAge = cachedTime ? now - parseInt(cachedTime) : Infinity;

            // Trong live window, chỉ sử dụng cache
            if (isLiveWindow) {
                console.log('🔄 Live window active - sử dụng cached data');
                if (cachedData) {
                    setPageData(prevPageData => ({
                        ...prevPageData,
                        [page]: JSON.parse(cachedData)
                    }));
                }
                setLoading(false);
                return;
            }

            // Cache-first strategy
            if (cachedData && cacheAge < CACHE_DURATION && !forceRefresh) {
                console.log(`📦 Cache hit: ${CACHE_KEY}`);
                setPageData(prevPageData => ({
                    ...prevPageData,
                    [page]: JSON.parse(cachedData)
                }));
                setLoading(false);
                return;
            }

            // Fetch từ API
            console.log('🔄 Fetching from API for page:', page);
            const result = await apiMT.getLottery(station, date, tinh, dayof, {
                page,
                limit: DAYS_PER_PAGE * 10,
                daysPerPage: DAYS_PER_PAGE
            });

            const dataArray = Array.isArray(result) ? result : [result];
            const formattedData = dataArray.map(item => ({
                ...item,
                drawDate: new Date(item.drawDate).toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                }),
                drawDateRaw: new Date(item.drawDate),
                tentinh: item.tentinh || `Tỉnh ${dataArray.indexOf(item) + 1}`,
                tinh: item.tinh || item.station,
            }));

            const groupedByDate = formattedData.reduce((acc, item) => {
                const dateKey = item.drawDate;
                if (!acc[dateKey]) acc[dateKey] = [];
                acc[dateKey].push(item);
                return acc;
            }, {});

            const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
                const dateA = new Date(groupedByDate[a][0].drawDateRaw);
                const dateB = new Date(groupedByDate[b][0].drawDateRaw);
                return dateB - dateA;
            });

            const finalData = sortedDates.map(date => ({
                drawDate: date,
                stations: groupedByDate[date],
                dayOfWeek: groupedByDate[date][0].dayOfWeek,
            }));

            // Cập nhật state
            setPageData(prevPageData => ({
                ...prevPageData,
                [page]: finalData
            }));

            // ✅ TỐI ƯU: Chỉ tạo cache nếu không vừa clear cache - giống XSMB
            const justClearedCache = localStorage.getItem('just_cleared_cache');
            if (!justClearedCache) {
                localStorage.setItem(CACHE_KEY, JSON.stringify(finalData));
                localStorage.setItem(`${CACHE_KEY}_time`, now.toString());
                console.log('✅ Đã tạo cache mới');
            } else {
                console.log('🔄 Vừa clear cache, không tạo cache mới');
                localStorage.removeItem('just_cleared_cache');
            }

            // Cập nhật totalDays
            if (page === 1) {
                setTotalDays(Math.max(30, sortedDates.length * 10));
            }

            setFilterTypes(prevFilters => ({
                ...prevFilters,
                ...finalData.reduce((acc, item) => {
                    acc[item.drawDate] = prevFilters[item.drawDate] || 'all';
                    return acc;
                }, {}),
            }));

            setLoading(false);
        } catch (error) {
            console.error('Error fetching lottery data:', error);
            setLoading(false);
        }
    }, [station, date, tinh, dayof, currentPage, isLiveWindow]);

    // ✅ TỐI ƯU: Cập nhật ref khi fetchData thay đổi - giống XSMB
    useEffect(() => {
        fetchDataRef.current = fetchData;
    }, [fetchData]);

    // ✅ TỐI ƯU: Hàm clear cache đơn giản và hiệu quả - giống XSMB
    const clearCacheForToday = useCallback(() => {
        const keysToRemove = [
            `xsmt_data_${station}_${today}_null`,
            `xsmt_data_${station}_null_null`,
            CACHE_KEY,
            `${CACHE_KEY}_time`
        ];

        // ✅ TỐI ƯU: Batch operations
        const operations = [
            ...keysToRemove.map(key => ({ type: 'remove', key })),
            { type: 'remove', key: UPDATE_KEY },
            { type: 'set', key: 'just_cleared_cache', value: Date.now().toString() }
        ];

        // Batch localStorage operations
        operations.forEach(({ type, key, value }) => {
            if (type === 'remove') {
                localStorage.removeItem(key);
            } else if (type === 'set') {
                localStorage.setItem(key, value);
            }
        });

        console.log('🗑️ Đã xóa cache cho ngày hôm nay');
    }, [station, today, CACHE_KEY]);

    // ✅ TỐI ƯU: Loại bỏ clearCacheAtSpecificTime - dư thừa vì đã có clear khi LiveResult ẩn đi

    const isLiveMode = useMemo(() => {
        if (!props.data3) return true;
        if (props.data3 === today) return true;
        const dayMap = {
            'thu-2': 'Thứ Hai',
            'thu-3': 'Thứ Ba',
            'thu-4': 'Thứ Tư',
            'thu-5': 'Thứ Năm',
            'thu-6': 'Thứ Sáu',
            'thu-7': 'Thứ Bảy',
            'chu-nhat': 'Chủ Nhật'
        };
        const todayDayOfWeek = new Date().toLocaleString('vi-VN', { weekday: 'long' });
        const inputDayOfWeek = dayMap[props.data3?.toLowerCase()];
        return inputDayOfWeek && inputDayOfWeek === todayDayOfWeek;
    }, [props.data3, today]);

    // ✅ TỐI ƯU: useEffect đơn giản để khởi tạo data
    useEffect(() => {
        cleanOldCache();

        // Khởi tạo data từ cache hoặc API
        const CACHE_KEY = `xsmt_data_${station}_${date || 'null'}_${tinh || 'null'}_${dayof || 'null'}_page_1`;
        const cachedData = localStorage.getItem(CACHE_KEY);

        if (cachedData && isLiveWindow) {
            console.log('🔄 Live window active - sử dụng cached data');
            const parsedData = JSON.parse(cachedData);
            setPageData({ 1: parsedData });
            if (totalDays === 0) {
                setTotalDays(Math.max(30, parsedData.length * 2));
            }
            setLoading(false);
        } else {
            console.log('🔄 Fetching initial data');
            fetchData();
        }
    }, [fetchData, isLiveWindow]);

    // ✅ TỐI ƯU: Loại bỏ useEffect clear cache - dư thừa vì đã có clear khi LiveResult ẩn đi

    // ✅ TỐI ƯU: Cập nhật cache khi liveData đầy đủ - loại bỏ clear cache dư thừa
    useEffect(() => {
        if (isLiveDataComplete && liveData && liveData.drawDate === today) {
            console.log('🔄 Live data complete, cập nhật cache');

            setPageData(prevPageData => {
                // Loại bỏ dữ liệu cũ của ngày hôm nay và thêm liveData
                const currentPage1Data = Array.isArray(prevPageData[1]) ? prevPageData[1] : [];
                const filteredData = currentPage1Data.filter(item => item.drawDate !== today);
                const formattedLiveData = {
                    ...liveData,
                    drawDate: new Date(liveData.drawDate).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                    }),
                    specialPrize: [liveData.specialPrize_0],
                    firstPrize: [liveData.firstPrize_0],
                    secondPrize: [liveData.secondPrize_0],
                    threePrizes: [
                        liveData.threePrizes_0, liveData.threePrizes_1, liveData.threePrizes_2,
                        liveData.threePrizes_3, liveData.threePrizes_4, liveData.threePrizes_5,
                    ],
                    fourPrizes: [
                        liveData.fourPrizes_0, liveData.fourPrizes_1, liveData.fourPrizes_2, liveData.fourPrizes_3,
                    ],
                    fivePrizes: [
                        liveData.fivePrizes_0, liveData.fivePrizes_1, liveData.fivePrizes_2,
                        liveData.fivePrizes_3, liveData.fivePrizes_4, liveData.fivePrizes_5,
                    ],
                    sixPrizes: [liveData.sixPrizes_0, liveData.sixPrizes_1, liveData.sixPrizes_2],
                    sevenPrizes: [
                        liveData.sevenPrizes_0, liveData.sevenPrizes_1, liveData.sevenPrizes_2, liveData.sevenPrizes_3,
                    ],
                };
                const newData = [formattedLiveData, ...filteredData].sort((a, b) =>
                    new Date(b.drawDate.split('/').reverse().join('-')) - new Date(a.drawDate.split('/').reverse().join('-'))
                );

                // Lưu cache mới
                localStorage.setItem(CACHE_KEY, JSON.stringify(newData));
                localStorage.setItem(`${CACHE_KEY}_time`, getVietnamTime().getTime().toString());
                localStorage.setItem(UPDATE_KEY, getVietnamTime().getTime().toString());
                setLastLiveUpdate(getVietnamTime().getTime());

                console.log('✅ Đã cập nhật cache với live data mới');
                return {
                    ...prevPageData,
                    [1]: newData
                };
            });

            setFilterTypes(prev => ({
                ...prev,
                [`${liveData.drawDate}${liveData.station}`]: prev[`${liveData.drawDate}${liveData.station}`] || 'all',
            }));
        }
    }, [isLiveDataComplete, liveData, today, CACHE_KEY]);

    // ✅ TỐI ƯU: Logic kích hoạt LiveResult - giống XSMB 100%
    useEffect(() => {
        let cacheClearedForLiveWindow = false; // Flag tránh clear cache nhiều lần khi LiveResult ẩn đi
        let lastCheckMinute = -1; // Tránh check cùng 1 phút nhiều lần
        let isActive = true; // Flag để tránh memory leak

        const checkTime = () => {
            if (!isActive) return;

            try {
                const vietnamTime = getVietnamTime();
                const vietnamHours = vietnamTime.getHours();
                const vietnamMinutes = vietnamTime.getMinutes();
                const vietnamSeconds = vietnamTime.getSeconds();

                // Tạo thời gian bắt đầu và kết thúc
                const startTime = new Date(vietnamTime);
                startTime.setHours(startHour, startMinute, 0, 0); // 17:10
                const endTime = new Date(startTime.getTime() + duration); // 17:40

                // Kiểm tra khung giờ trực tiếp
                const isLive = vietnamTime >= startTime && vietnamTime <= endTime;
                const wasLiveWindow = isLiveWindow;

                // Debug log để kiểm tra logic
                console.log('🕐 CheckTime debug:', {
                    currentTime: vietnamTime.toLocaleTimeString(),
                    startTime: startTime.toLocaleTimeString(),
                    endTime: endTime.toLocaleTimeString(),
                    isLive,
                    wasLiveWindow,
                    isLiveWindow,
                    cacheClearedForLiveWindow
                });

                // ✅ TỐI ƯU: Chỉ check khi thực sự cần
                const currentMinute = vietnamHours * 60 + vietnamMinutes;
                if (currentMinute === lastCheckMinute) {
                    return; // Bỏ qua nếu đã check phút này
                }
                lastCheckMinute = currentMinute;

                setIsLiveWindow(isLive); // ✅ Đồng bộ với XSMB

                // Log chỉ khi thay đổi
                if (wasLiveWindow !== isLive) {
                    console.log('Debug - Live window changed:', {
                        vietnamTime: vietnamTime.toLocaleTimeString(),
                        isLive,
                        wasLiveWindow
                    });
                }

                // ✅ TỐI ƯU: Clear cache khi LiveResult ẩn đi - ĐÂY LÀ CƠ CHẾ DUY NHẤT
                if (wasLiveWindow && !isLive && wasLiveWindow !== undefined && !cacheClearedForLiveWindow) {
                    console.log('🔄 LiveResult ẩn đi - Clear cache để hiển thị kết quả mới');
                    console.log('Debug - Thông tin clear cache:', {
                        wasLiveWindow,
                        isLive,
                        cacheClearedForLiveWindow,
                        vietnamTime: vietnamTime.toLocaleTimeString(),
                        startTime: startTime.toLocaleTimeString(),
                        endTime: endTime.toLocaleTimeString()
                    });
                    clearCacheForToday();
                    setTimeout(() => {
                        if (isActive && fetchDataRef.current) {
                            console.log('🔄 Force refresh sau khi clear cache');
                            fetchDataRef.current(1, true);
                        }
                    }, 2000);
                    cacheClearedForLiveWindow = true;
                }

                // Test case: Force clear cache để debug
                if (process.env.NODE_ENV === 'development' && vietnamHours === 23 && vietnamMinutes === 59) {
                    console.log('🧪 Test case: Force clear cache');
                    clearCacheForToday();
                }

                // Test case: Force clear cache mỗi phút để debug
                if (process.env.NODE_ENV === 'development' && vietnamSeconds === 0) {
                    console.log('🧪 Test case: Force clear cache mỗi phút');
                    clearCacheForToday();
                }

                // Reset flag khi LiveResult xuất hiện lại
                if (isLive) {
                    cacheClearedForLiveWindow = false;
                }

                // ✅ TỐI ƯU: Loại bỏ kiểm tra trạng thái không cần thiết - Scheduler tự động chạy
                if (
                    isLive &&
                    vietnamHours === hour &&
                    vietnamMinutes === minutes2 &&
                    vietnamSeconds <= 5 &&
                    !hasTriggeredScraper
                ) {
                    // Scheduler tự động kích hoạt, chỉ log để debug
                    if (isActive && process.env.NODE_ENV !== 'production') {
                        console.log('🕐 Đang trong khung giờ kích hoạt scheduler (17h14)');
                    }
                    if (isActive) {
                        setHasTriggeredScraper(true);
                    }
                }

                // Reset lúc 00:00
                if (vietnamHours === 0 && vietnamMinutes === 0 && vietnamSeconds === 0) {
                    setHasTriggeredScraper(false);
                    localStorage.removeItem(UPDATE_KEY);
                    cacheClearedForLiveWindow = false;
                }
            } catch (error) {
                console.error('Lỗi trong checkTime:', error);
            }
        };

        checkTime();

        // ✅ TỐI ƯU: Interval thông minh - chậm hơn khi không trong live window
        const getIntervalTime = () => {
            try {
                const vietnamTime = getVietnamTime();
                const vietnamHours = vietnamTime.getHours();
                const vietnamMinutes = vietnamTime.getMinutes();

                const startTime = new Date(vietnamTime);
                startTime.setHours(startHour, startMinute, 0, 0);
                const endTime = new Date(startTime.getTime() + duration);
                const isLive = vietnamTime >= startTime && vietnamTime <= endTime;

                return isLive ? 5000 : 30000; // 5s khi live, 30s khi không live
            } catch (error) {
                console.error('Lỗi khi tính interval:', error);
                return 30000; // Fallback to 30s
            }
        };

        let intervalId = setInterval(checkTime, getIntervalTime());

        // ✅ TỐI ƯU: Thay đổi interval khi cần
        const updateInterval = () => {
            if (!isActive) return;
            try {
                clearInterval(intervalId);
                intervalId = setInterval(checkTime, getIntervalTime());
            } catch (error) {
                console.error('Lỗi khi update interval:', error);
            }
        };

        // Update interval mỗi phút
        const intervalUpdateId = setInterval(updateInterval, 60000);

        return () => {
            isActive = false;
            clearInterval(intervalId);
            clearInterval(intervalUpdateId);
        };
    }, [hasTriggeredScraper]); // ✅ TỐI ƯU: Loại bỏ clearCacheForToday khỏi dependencies

    const handleFilterChange = useCallback((key, value) => {
        setFilterTypes((prev) => ({
            ...prev,
            [key]: value,
        }));
    }, []);

    const getHeadAndTailNumbers = useCallback((data2) => {
        const allNumbers = [
            ...(data2.eightPrizes || []).map(num => ({ num, isEighth: true })),
            ...(data2.specialPrize || []).map(num => ({ num, isSpecial: true })),
            ...(data2.firstPrize || []).map(num => ({ num })),
            ...(data2.secondPrize || []).map(num => ({ num })),
            ...(data2.threePrizes || []).map(num => ({ num })),
            ...(data2.fourPrizes || []).map(num => ({ num })),
            ...(data2.fivePrizes || []).map(num => ({ num })),
            ...(data2.sixPrizes || []).map(num => ({ num })),
            ...(data2.sevenPrizes || []).map(num => ({ num })),
        ]
            .filter(item => item.num != null && item.num !== '')
            .map((item) => ({
                num: getFilteredNumber(item.num, 'last2'),
                isEighth: item.isEighth || false,
                isSpecial: item.isSpecial || false,
            }))
            .filter(item => item.num != null && item.num !== '' && !isNaN(item.num));

        const heads = Array(10).fill().map(() => []);
        const tails = Array(10).fill().map(() => []);

        allNumbers.forEach((item) => {
            if (item.num != null && item.num !== '') {
                const numStr = item.num.toString().padStart(2, '0');
                const head = parseInt(numStr[0]);
                const tail = parseInt(numStr[numStr.length - 1]);

                if (!isNaN(head) && head >= 0 && head <= 9 && !isNaN(tail) && tail >= 0 && tail <= 9) {
                    heads[head].push({ num: numStr, isEighth: item.isEighth, isSpecial: item.isSpecial });
                    tails[tail].push({ num: numStr, isEighth: item.isEighth, isSpecial: item.isSpecial });
                }
            }
        });

        for (let i = 0; i < 10; i++) {
            heads[i].sort((a, b) => parseInt(a.num) - parseInt(b.num));
            tails[i].sort((a, b) => parseInt(a.num) - parseInt(b.num));
        }

        return { heads, tails };
    }, []);

    // Helper function để kiểm tra pageData an toàn
    const getPageDataSafely = useCallback((page) => {
        const data = pageData[page];
        return Array.isArray(data) ? data : [];
    }, [pageData]);

    // Helper function để kiểm tra pageData có tồn tại không
    const hasPageData = useCallback((page) => {
        const data = pageData[page];
        return data && Array.isArray(data) && data.length > 0;
    }, [pageData]);

    // Khởi tạo pageData với cấu trúc đúng
    useEffect(() => {
        // Đảm bảo pageData luôn có cấu trúc đúng
        setPageData(prevPageData => {
            const newPageData = { ...prevPageData };

            // Đảm bảo page 1 luôn có array
            if (!Array.isArray(newPageData[1])) {
                newPageData[1] = [];
                console.log('📊 Khởi tạo pageData[1] với array rỗng');
            }

            return newPageData;
        });
    }, []);

    // Đơn giản hóa virtual scrolling - chỉ render current page
    const currentPageData = useMemo(() => {
        return getPageDataSafely(currentPage);
    }, [getPageDataSafely, currentPage]);

    // Tính toán totalPages dựa trên totalRecords
    const totalPages = Math.ceil(totalDays / DAYS_PER_PAGE);

    // Fallback: Nếu totalPages = 0, ít nhất phải có 1 page
    const effectiveTotalPages = Math.max(1, totalPages);

    // Debug pagination
    console.log('📊 Pagination Debug:', {
        totalDays,
        DAYS_PER_PAGE,
        totalPages,
        effectiveTotalPages,
        currentPage,
        pageDataKeys: Object.keys(pageData),
        loadedPages: Array.from(loadedPages),
        hasData: Object.keys(pageData).length > 0,
        currentPageDataLength: currentPageData.length,
        hasPage1Data: hasPageData(1),
        hasCurrentPageData: hasPageData(currentPage),
        currentPageDays: currentPageData.map(day => day.drawDate)
    });

    const goToPage = async (page) => {
        console.log(`🔄 goToPage called: page=${page}, totalPages=${effectiveTotalPages}, currentPage=${currentPage}`);

        if (page >= 1 && page <= effectiveTotalPages) {
            console.log(`✅ Chuyển đến page ${page}`);
            setCurrentPage(page);
            tableRef.current?.scrollIntoView({ behavior: 'smooth' });

            // Lazy load data cho page mới nếu chưa có
            if (!hasPageData(page) && !loadedPages.has(page)) {
                console.log(`🔄 Lazy loading data cho page ${page}`);
                setLoadingPage(true);
                try {
                    await fetchData(page);
                    setLoadedPages(prev => new Set([...prev, page]));
                } finally {
                    setLoadingPage(false);
                }
            } else {
                console.log(`📦 Page ${page} đã có data hoặc đã được load`);
            }
        } else {
            console.warn(`❌ Không thể chuyển đến page ${page}: page < 1 hoặc page > ${effectiveTotalPages}`);
        }
    };

    useEffect(() => {
        if (tableRef.current) {
            tableRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [currentPage]);

    // Preload next page khi user scroll gần cuối
    const shouldPreloadNextPage = useMemo(() => {
        return currentPage < effectiveTotalPages && !loadedPages.has(currentPage + 1);
    }, [currentPage, effectiveTotalPages, loadedPages]);

    useEffect(() => {
        if (shouldPreloadNextPage && !isLiveWindow) {
            console.log('🔄 Preloading next page:', currentPage + 1);
            fetchData(currentPage + 1);
        }
    }, [shouldPreloadNextPage, currentPage, isLiveWindow, fetchData]);

    // Auto-create next page nếu cần
    useEffect(() => {
        if (currentPageData.length > 0 && currentPage === effectiveTotalPages && !isLiveWindow) {
            // Nếu đang ở page cuối và có data, tự động tạo page tiếp theo
            const nextPage = currentPage + 1;
            if (!hasPageData(nextPage) && !loadedPages.has(nextPage)) {
                console.log(`🔄 Auto-creating next page: ${nextPage}`);
                fetchData(nextPage);
                setTotalDays(prev => Math.max(prev, nextPage * DAYS_PER_PAGE));
            }
        }
    }, [currentPageData, currentPage, effectiveTotalPages, isLiveWindow, hasPageData, loadedPages, fetchData]);

    const todayData = currentPageData.find(item => item.drawDate === today);

    // Tối ưu print functions với useMemo và useCallback
    const fontSizes = useMemo(() => ({
        A4: {
            title: '28px',
            subtitle: '20px',
            subtitle1: '28px',
            header: '28px',
            prizeLabel: '20px',
            prizeValue: '28px',
            specialPrize: '30px',
            footer: '15px',
            cellPadding: '1px',
            rowHeight: '30px',
            numberSpacing: '5px'
        },
        A5: {
            title: '20px',
            subtitle: '14px',
            subtitle1: '20px',

            header: '18px',
            prizeLabel: '18px',
            prizeValue: '20px',
            specialPrize: '23px',
            footer: '10px',
            cellPadding: '0px',
            rowHeight: '30px',
            numberSpacing: '0px'
        },
        A6: {
            title: '24px',
            subtitle: '20px',
            subtitle1: '24px',
            header: '24px',
            prizeLabel: '12px',
            prizeValue: '30px',
            specialPrize: '30px',
            footer: '14px',
            cellPadding: '0px',
            rowHeight: '40px',
            numberSpacing: '0px'
        },
        A7: {
            title: '24px',
            subtitle: '10px',
            subtitle1: '24px',
            header: '20px',
            prizeLabel: '10px',
            prizeValue: '30px',
            specialPrize: '30px',
            footer: '16px',
            cellPadding: '0px',
            rowHeight: '30px',
            numberSpacing: '0px'
        }
    }), []);

    const generatePrintContent = useCallback((size, selectedDate = null) => {
        const sizes = fontSizes[size];

        // Tìm ngày được chọn hoặc fallback về ngày đầu tiên
        const targetDayData = selectedDate
            ? currentPageData.find(day => day.drawDate === selectedDate)
            : currentPageData[0];

        const generateTableRow = (prizeLabel, allStationsData, isSpecial = false) => {
            if (!allStationsData || allStationsData.length === 0) return '';

            let rowHTML = `
            <tr>
                <td class="tdTitle ${prizeLabel === 'G8' || prizeLabel === 'ĐB' ? 'highlight' : ''} ${prizeLabel === 'G5' || prizeLabel === 'G3' ? 'g3' : ''
                }" style="padding: ${sizes.cellPadding}; font-size: ${sizes.prizeLabel}; font-weight: bold; width: 5%; border: 2px solid #000; text-align: center; background-color: #f8f9fa;">
                    ${prizeLabel}
                </td>
        `;

            allStationsData.forEach((stationData) => {
                let prizeData = [];
                let maxItems = 1;

                switch (prizeLabel) {
                    case 'G8':
                        prizeData = stationData.eightPrizes || [];
                        break;
                    case 'G7':
                        prizeData = stationData.sevenPrizes || [];
                        break;
                    case 'G6':
                        prizeData = stationData.sixPrizes || [];
                        maxItems = 3;
                        break;
                    case 'G5':
                        prizeData = stationData.fivePrizes || [];
                        maxItems = 3;
                        break;
                    case 'G4':
                        prizeData = stationData.fourPrizes || [];
                        maxItems = 7;
                        break;
                    case 'G3':
                        prizeData = stationData.threePrizes || [];
                        maxItems = 2;
                        break;
                    case 'G2':
                        prizeData = stationData.secondPrize || [];
                        break;
                    case 'G1':
                        prizeData = stationData.firstPrize || [];
                        break;
                    case 'ĐB':
                        prizeData = stationData.specialPrize || [];
                        break;
                    default:
                        prizeData = [];
                }

                const currentFilter = filterTypes[allStationsData[0]?.drawDate] || 'all';
                let numbersHTML = prizeData
                    .slice(0, maxItems)
                    .map((num, idx) => `
                    <span class="prizeNumber ${prizeLabel === 'G8' || prizeLabel === 'ĐB' ? 'highlight' : ''
                        } ${prizeLabel === 'ĐB' ? 'gdb' : ''} ${prizeLabel === 'G5' || prizeLabel === 'G3' ? 'g3' : ''
                        }" style="font-size: ${isSpecial ? sizes.specialPrize : sizes.prizeValue
                        }; font-weight: bold; display: block;">
                        ${num ? getFilteredNumber(num, currentFilter) : '-'}
                    </span>
                `)
                    .join('');

                rowHTML += `
                <td class="rowXS" style="padding: ${sizes.cellPadding}; border: 2px solid #000; text-align: center; vertical-align: middle; min-width: 100px; line-height: 1.5;">
                    ${numbersHTML}
                </td>
            `;
            });

            rowHTML += '</tr>';
            return rowHTML;
        };

        if (!targetDayData || !Array.isArray(targetDayData.stations) || targetDayData.stations.length === 0) {
            return '<div>Không có dữ liệu để in</div>';
        }

        let stations = [...targetDayData.stations];

        if (stations.length <= 1) {
            currentPageData.forEach((otherDayData) => {
                if (Array.isArray(otherDayData.stations)) {
                    otherDayData.stations.forEach((station) => {
                        const existingStation = stations.find((s) => s.tentinh === station.tentinh);
                        if (!existingStation) {
                            stations.push(station);
                        }
                    });
                }
            });
        }

        let printHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Kết Quả Xổ Số Miền Trung - ${targetDayData?.drawDate || 'N/A'} </title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 0;
                }
                .containerKQ {
                    padding: 5px;
                }
                .header {
                    text-align: center;
                    margin-bottom: 0px;
                    line-height: 1.0;
                }
                .kqxs__title {
                    font-size: ${sizes.title};
                    font-weight: bold;
                    margin-bottom: 1px;
                    line-height: 1.0;
                }
                .tableXS {
                    width: 100%;
                    border-collapse: collapse;
                    table-layout: fixed;
                    margin-bottom: 0px;
                }
                .tableXS th,
                .tableXS td {
                    border: 2px solid #000;
                    text-align: center;
                    vertical-align: middle;
                }
                .tableXS th:first-child {
                    width: 5%;
                }
                .tableXS th:not(:first-child) {
                    width: ${100 / (stations.length + 1)}%;
                }
                .stationName {
                    font-size: ${sizes.header};
                    background-color: #e9ecef;
                    font-weight: bold;
                    padding: ${sizes.cellPadding};
                }
                .tdTitle {
                    font-size: ${sizes.prizeLabel};
                    font-weight: bold;
                    background-color: #f8f9fa;
                    padding: ${sizes.cellPadding};
                }
                .rowXS {
                    padding: ${sizes.cellPadding};
                    line-height: 1.5;
                }
                .prizeNumber {
                    font-size: ${sizes.prizeValue};
                    font-weight: bold;
                    display: block;
                }
                .highlight {
                    color: #ff0000;
                }
                .gdb {
                    font-size: ${sizes.specialPrize};
                }
                .g3 {
                    color: #0066cc;
                }
                .footer {
                    text-align: center;
                    margin-top: 5px;
                    font-size: ${sizes.footer};
                    color: #666;
                    line-height: 1.1;
                }
                @media print {
                    @page {
                        size: ${size};
                        margin: 8mm;
                    }
                    .tableXS th:first-child {
                        width: 5% !important;
                    }
                    .tableXS th:not(:first-child) {
                        width: ${100 / (stations.length + 1)}% !important;
                    }
                }
                @media screen {
                    body {
                        max-width: ${size === 'A4' ? '210mm' : size === 'A5' ? '148mm' : size === 'A6' ? '105mm' : '74mm'};
                        margin: 10px auto;
                        background: white;
                    }
                }
            </style>
        </head>
        <body>
            <div class="containerKQ">
                <div class="header">
                    <h1 class="kqxs__title">KẾT QUẢ XỔ SỐ MIỀN TRUNG - XSMB.WIN</h1>
                    <p class="kqxs__title" style="font-size: ${sizes.subtitle1}; margin-bottom: 0px; line-height: 1.0;">Ngày: ${targetDayData?.drawDate || 'N/A'}</p>
                    <p style="font-size: ${sizes.subtitle}; color: #666; margin-bottom: 0px; line-height: 1.0;">In từ XSMB.WIN - ${new Date().toLocaleDateString('vi-VN')}</p>
                </div>
                <table class="tableXS">
                    <thead>
                        <tr>
                            <th class="stationName"></th>
                            ${stations
                .map(
                    (station) => `
                                <th class="stationName">${station.tentinh || `Tỉnh ${stations.indexOf(station) + 1}`}</th>
                            `
                )
                .join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${[
                { label: 'G8', highlight: true },
                { label: 'G7' },
                { label: 'G6' },
                { label: 'G5', g3: true },
                { label: 'G4' },
                { label: 'G3', g3: true },
                { label: 'G2' },
                { label: 'G1' },
                { label: 'ĐB', highlight: true, isSpecial: true },
            ]
                .map(({ label, highlight, g3, isSpecial }) => {
                    const hasData = stations.some((station) => {
                        let prizeData = [];
                        switch (label) {
                            case 'G8':
                                prizeData = station.eightPrizes || [];
                                break;
                            case 'G7':
                                prizeData = station.sevenPrizes || [];
                                break;
                            case 'G6':
                                prizeData = station.sixPrizes || [];
                                break;
                            case 'G5':
                                prizeData = station.fivePrizes || [];
                                break;
                            case 'G4':
                                prizeData = station.fourPrizes || [];
                                break;
                            case 'G3':
                                prizeData = station.threePrizes || [];
                                break;
                            case 'G2':
                                prizeData = station.secondPrize || [];
                                break;
                            case 'G1':
                                prizeData = station.firstPrize || [];
                                break;
                            case 'ĐB':
                                prizeData = station.specialPrize || [];
                                break;
                            default:
                                prizeData = [];
                        }
                        return prizeData.length > 0;
                    });
                    return hasData ? generateTableRow(label, stations, isSpecial) : '';
                })
                .join('')}
                    </tbody>
                </table>
                <div class="footer">
                    <p style="margin: 1px 0; line-height: 1.1;">Nguồn: xsmb.win - Truy cập ngay để xem kết quả trực tiếp nhanh nhất - chính xác nhất</p>
                    <p style="margin: 1px 0; line-height: 1.1;">Chú ý: Thông tin chỉ mang tính chất tham khảo</p>
                    <p style="margin: 1px 0; line-height: 1.1;">💥CHÚC MỌI NGƯỜI 1 NGÀY THUẬN LỢI VÀ THÀNH CÔNG💥</p>
                </div>
            </div>
        </body>
        </html>
    `;

        return printHTML;
    }, [currentPageData, fontSizes, filterTypes, getFilteredNumber, currentPage]);

    const handlePrint = useCallback(
        (size, selectedDate = null) => {
            try {
                const printWindow = window.open('', '_blank', 'width=800,height=600');

                if (!printWindow) {
                    alert('Không thể mở cửa sổ in. Vui lòng cho phép popup.');
                    return;
                }

                const printContent = generatePrintContent(size, selectedDate);
                const targetDate = selectedDate || currentPageData[0]?.drawDate || 'N/A';

                printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Kết quả XSMT - ${targetDate}</title>
                    <meta charset="UTF-8">
                </head>
                <body>
                    ${printContent}
                </body>
                </html>
            `);

                printWindow.document.close();

                setTimeout(() => {
                    printWindow.focus();
                    printWindow.print();
                    setTimeout(() => {
                        printWindow.close();
                    }, 1000);
                }, 100);
            } catch (error) {
                console.error('Lỗi khi in:', error);
                alert('Có lỗi xảy ra khi in. Vui lòng thử lại.');
            }
        },
        [generatePrintContent]
    );

    return (
        <div ref={tableRef} className={styles.containerKQ}>
            {isLiveMode && isLiveWindow && (
                <LiveResult
                    station={station}
                    today={today}
                    getHeadAndTailNumbers={getHeadAndTailNumbers}
                    handleFilterChange={handleFilterChange}
                    filterTypes={filterTypes}
                    isLiveWindow={isLiveWindow}
                />
            )}

            <div>
                {currentPageData.map((dayData, index) => {
                    const actualIndex = (currentPage - 1) * DAYS_PER_PAGE + index;
                    const tableKey = dayData.drawDate;
                    const currentFilter = filterTypes[tableKey] || 'all';

                    // Kiểm tra dayData.stations có phải là array không
                    if (!Array.isArray(dayData.stations)) {
                        console.warn('dayData.stations is not an array:', dayData);
                        return null; // Skip rendering this item
                    }

                    // Lấy tất cả tỉnh từ ngày hiện tại và các ngày khác
                    let allStations = [...dayData.stations];

                    // Nếu chỉ có 1 tỉnh, thử lấy từ các ngày khác
                    if (allStations.length <= 1) {
                        console.log('⚠️ Web display: Chỉ có 1 tỉnh, thử lấy từ ngày khác...');
                        currentPageData.forEach(otherDayData => {
                            if (Array.isArray(otherDayData.stations)) {
                                otherDayData.stations.forEach(station => {
                                    const existingStation = allStations.find(s => s.tentinh === station.tentinh);
                                    if (!existingStation) {
                                        allStations.push(station);
                                    }
                                });
                            }
                        });
                        console.log('✅ Web display: Tìm thấy tổng cộng', allStations.length, 'tỉnh');
                    }

                    const allHeads = Array(10).fill().map(() => []);
                    const allTails = Array(10).fill().map(() => []);
                    const stationsData = allStations.map(stationData => {
                        const { heads, tails } = getHeadAndTailNumbers(stationData);
                        for (let i = 0; i < 10; i++) {
                            allHeads[i].push(heads[i]);
                            allTails[i].push(tails[i]);
                        }
                        return { tentinh: stationData.tentinh, station: stationData.tinh || stationData.station };
                    });

                    return (
                        <div key={tableKey} data-index={actualIndex} className={styles.lazyItem}>
                            <div className={styles.kqxs}>
                                <div className={styles.header}>
                                    <div className={styles.headerTop}>
                                        <h1 className={styles.kqxs__title}>XSMT - Kết quả Xổ số Miền Trung - SXMT {dayData.drawDate}</h1>
                                        <PrintButton onPrint={handlePrint} selectedDate={dayData.drawDate} />
                                    </div>
                                    <div className={styles.kqxs__action}>
                                        <a className={`${styles.kqxs__actionLink} `} href="#!">XSMT</a>
                                        <a className={`${styles.kqxs__actionLink} ${styles.dayOfWeek} `} href="#!">{dayData.dayOfWeek}</a>
                                        <a className={styles.kqxs__actionLink} href="#!">{dayData.drawDate}</a>
                                    </div>
                                </div>
                                <table className={styles.tableXS}>
                                    <thead>
                                        <tr>
                                            <th></th>
                                            {allStations.map(stationData => (
                                                <th key={stationData.tinh || stationData.station} className={styles.stationName}>
                                                    {stationData.tentinh || `Tỉnh ${allStations.indexOf(stationData) + 1} `}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className={`${styles.tdTitle} ${styles.highlight} `}>G8</td>
                                            {allStations.map(stationData => (
                                                <td key={stationData.tinh || stationData.station} className={styles.rowXS}>
                                                    <span className={`${styles.prizeNumber} ${styles.highlight} `}>
                                                        {(stationData.eightPrizes || [])[0] ? getFilteredNumber(stationData.eightPrizes[0], currentFilter) : '-'}
                                                    </span>
                                                </td>
                                            ))}
                                        </tr>
                                        <tr>
                                            <td className={styles.tdTitle}>G7</td>
                                            {allStations.map(stationData => (
                                                <td key={stationData.tinh || stationData.station} className={styles.rowXS}>
                                                    <span className={styles.prizeNumber}>
                                                        {(stationData.sevenPrizes || [])[0] ? getFilteredNumber(stationData.sevenPrizes[0], currentFilter) : '-'}
                                                    </span>
                                                </td>
                                            ))}
                                        </tr>
                                        <tr>
                                            <td className={styles.tdTitle}>G6</td>
                                            {allStations.map(stationData => (
                                                <td key={stationData.tinh || stationData.station} className={styles.rowXS}>
                                                    {(stationData.sixPrizes || []).slice(0, 3).map((kq, idx) => (
                                                        <span key={idx} className={styles.prizeNumber}>
                                                            {getFilteredNumber(kq, currentFilter)}
                                                            {idx < (stationData.sixPrizes || []).slice(0, 3).length - 1 && <br />}
                                                        </span>
                                                    ))}
                                                </td>
                                            ))}
                                        </tr>
                                        <tr>
                                            <td className={`${styles.tdTitle} ${styles.g3} `}>G5</td>
                                            {allStations.map(stationData => (
                                                <td key={stationData.tinh || stationData.station} className={styles.rowXS}>
                                                    {(stationData.fivePrizes || []).slice(0, 3).map((kq, idx) => (
                                                        <span key={idx} className={`${styles.prizeNumber} ${styles.g3} `}>
                                                            {getFilteredNumber(kq, currentFilter)}
                                                            {idx < (stationData.fivePrizes || []).slice(0, 3).length - 1 && <br />}
                                                        </span>
                                                    ))}
                                                </td>
                                            ))}
                                        </tr>
                                        <tr>
                                            <td className={styles.tdTitle}>G4</td>
                                            {dayData.stations.map(stationData => (
                                                <td key={stationData.tinh || stationData.station} className={styles.rowXS}>
                                                    {(stationData.fourPrizes || []).slice(0, 7).map((kq, idx) => (
                                                        <span key={idx} className={styles.prizeNumber}>
                                                            {getFilteredNumber(kq, currentFilter)}
                                                            {idx < (stationData.fourPrizes || []).slice(0, 7).length - 1 && <br />}
                                                        </span>
                                                    ))}
                                                </td>
                                            ))}
                                        </tr>
                                        <tr>
                                            <td className={`${styles.tdTitle} ${styles.g3} `}>G3</td>
                                            {allStations.map(stationData => (
                                                <td key={stationData.tinh || stationData.station} className={styles.rowXS}>
                                                    {(stationData.threePrizes || []).slice(0, 2).map((kq, idx) => (
                                                        <span key={idx} className={`${styles.prizeNumber} ${styles.g3} `}>
                                                            {getFilteredNumber(kq, currentFilter)}
                                                            {idx < (stationData.threePrizes || []).slice(0, 2).length - 1 && <br />}
                                                        </span>
                                                    ))}
                                                </td>
                                            ))}
                                        </tr>
                                        <tr>
                                            <td className={styles.tdTitle}>G2</td>
                                            {allStations.map(stationData => (
                                                <td key={stationData.tinh || stationData.station} className={styles.rowXS}>
                                                    <span className={styles.prizeNumber}>
                                                        {(stationData.secondPrize || [])[0] ? getFilteredNumber(stationData.secondPrize[0], currentFilter) : '-'}
                                                    </span>
                                                </td>
                                            ))}
                                        </tr>
                                        <tr>
                                            <td className={styles.tdTitle}>G1</td>
                                            {allStations.map(stationData => (
                                                <td key={stationData.tinh || stationData.station} className={styles.rowXS}>
                                                    <span className={styles.prizeNumber}>
                                                        {(stationData.firstPrize || [])[0] ? getFilteredNumber(stationData.firstPrize[0], currentFilter) : '-'}
                                                    </span>
                                                </td>
                                            ))}
                                        </tr>
                                        <tr>
                                            <td className={`${styles.tdTitle} ${styles.highlight} `}>ĐB</td>
                                            {allStations.map(stationData => (
                                                <td key={stationData.tinh || stationData.station} className={styles.rowXS}>
                                                    <span className={`${styles.prizeNumber} ${styles.highlight} ${styles.gdb} `}>
                                                        {(stationData.specialPrize || [])[0] ? getFilteredNumber(stationData.specialPrize[0], currentFilter) : '-'}
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
                                                id={`filterAll - ${tableKey} `}
                                                type="radio"
                                                name={`filterOption - ${tableKey} `}
                                                value="all"
                                                checked={currentFilter === 'all'}
                                                onChange={() => handleFilterChange(tableKey, 'all')}
                                            />
                                            <label htmlFor={`filterAll - ${tableKey} `}>Tất cả</label>
                                        </div>
                                        <div className={styles.optionInput}>
                                            <input
                                                id={`filterTwo - ${tableKey} `}
                                                type="radio"
                                                name={`filterOption - ${tableKey} `}
                                                value="last2"
                                                checked={currentFilter === 'last2'}
                                                onChange={() => handleFilterChange(tableKey, 'last2')}
                                            />
                                            <label htmlFor={`filterTwo - ${tableKey} `}>2 số cuối</label>
                                        </div>
                                        <div className={styles.optionInput}>
                                            <input
                                                id={`filterThree - ${tableKey} `}
                                                type="radio"
                                                name={`filterOption - ${tableKey} `}
                                                value="last3"
                                                checked={currentFilter === 'last3'}
                                                onChange={() => handleFilterChange(tableKey, 'last3')}
                                            />
                                            <label htmlFor={`filterThree - ${tableKey} `}>3 số cuối</label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.TKe_container}>
                                <div className={styles.TKe_content}>
                                    <div className={styles.TKe_contentTitle}>
                                        <span className={styles.title}>Thống kê lô tô theo Đầu - </span>
                                        <span className={styles.dayOfWeek}>{`${dayData.dayOfWeek} - `}</span>
                                        <span className={styles.desc}>{dayData.drawDate}</span>
                                    </div>
                                    <table className={styles.tableKey}>
                                        <thead>
                                            <tr>
                                                <th className={styles.t_h}>Đầu</th>
                                                {stationsData.map(station => (
                                                    <th key={station.station}>
                                                        {station.tentinh || `Tỉnh ${stationsData.indexOf(station) + 1} `}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Array.from({ length: 10 }, (_, idx) => (
                                                <tr key={idx}>
                                                    <td className={styles.t_h}>{idx}</td>
                                                    {allHeads[idx].map((headNumbers, stationIdx) => (
                                                        <td key={stationIdx}>
                                                            {headNumbers.map((item, numIdx) => (
                                                                <span
                                                                    key={numIdx}
                                                                    className={
                                                                        item.isEighth || item.isSpecial
                                                                            ? styles.highlightPrize
                                                                            : ''
                                                                    }
                                                                >
                                                                    {item.num}
                                                                    {numIdx < headNumbers.length - 1 && ', '}
                                                                </span>
                                                            ))}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className={styles.TKe_content}>
                                    <div className={styles.TKe_contentTitle}>
                                        <span className={styles.title}>Thống kê lô tô theo Đuôi - </span>
                                        <span className={styles.dayOfWeek}>{`${dayData.dayOfWeek} - `}</span>
                                        <span className={styles.desc}>{dayData.drawDate}</span>
                                    </div>
                                    <table className={styles.tableKey}>
                                        <thead>
                                            <tr>
                                                <th className={styles.t_h}>Đuôi</th>
                                                {stationsData.map(station => (
                                                    <th key={station.station}>
                                                        {station.tentinh || `Tỉnh ${stationsData.indexOf(station) + 1} `}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Array.from({ length: 10 }, (_, idx) => (
                                                <tr key={idx}>
                                                    <td className={styles.t_h}>{idx}</td>
                                                    {allTails[idx].map((tailNumbers, stationIdx) => (
                                                        <td key={stationIdx}>
                                                            {tailNumbers.map((item, numIdx) => (
                                                                <span
                                                                    key={numIdx}
                                                                    className={
                                                                        item.isEighth || item.isSpecial
                                                                            ? styles.highlightPrize
                                                                            : ''
                                                                    }
                                                                >
                                                                    {item.num}
                                                                    {numIdx < tailNumbers.length - 1 && ', '}
                                                                </span>
                                                            ))}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {effectiveTotalPages > 1 && !isLiveWindow && (
                <div className={styles.pagination}>
                    <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1 || loadingPage}
                        className={styles.paginationButton}
                    >
                        {loadingPage ? 'Đang tải...' : 'Trước'}
                    </button>
                    <span>
                        Trang {currentPage} / {effectiveTotalPages}
                        ({currentPageData.length} ngày hiện tại)
                    </span>
                    <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === effectiveTotalPages || loadingPage}
                        className={styles.paginationButton}
                    >
                        {loadingPage ? 'Đang tải...' : 'Sau'}
                    </button>
                </div>
            )}

            {/* Test button để trigger clear cache */}
            {process.env.NODE_ENV === 'development' && (
                <div style={{ marginTop: '20px', textAlign: 'center' }}>
                    <button
                        onClick={() => {
                            console.log('🧪 Test: Force clear cache');
                            clearCacheForToday();
                        }}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#ff6b6b',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer'
                        }}
                    >
                        Test Clear Cache
                    </button>
                </div>
            )}
        </div>
    );
};

export default React.memo(KQXS);
// cần test 17/06 sửa để cập nhập cache