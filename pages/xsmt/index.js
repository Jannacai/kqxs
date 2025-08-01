import { apiMT } from "../api/kqxs/kqxsMT";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import styles from '../../styles/kqxsMT.module.css';
import { getFilteredNumber } from "../../library/utils/filterUtils";
import { useRouter } from 'next/router';
import LiveResult from './LiveResult';
import { debounce } from 'lodash';
import Skeleton from 'react-loading-skeleton';
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
                🖨️ In
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
const LIVE_CACHE_DURATION = 40 * 60 * 1000; // Cache 40 phút cho live data
const DAYS_PER_PAGE = 3; // Mỗi trang chứa 3 ngày gần nhất
const VISIBLE_ITEMS = 3; // Render 3 items visible để match với DAYS_PER_PAGE

const KQXS = (props) => {
    const { liveData, isLiveDataComplete } = useLottery();
    const [data, setData] = useState(props.data || []);
    const [loading, setLoading] = useState(true);
    const [loadingPage, setLoadingPage] = useState(false);
    const [filterTypes, setFilterTypes] = useState({});
    const [isRunning, setIsRunning] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasTriggeredScraper, setHasTriggeredScraper] = useState(false);
    const [lastLiveUpdate, setLastLiveUpdate] = useState(null);
    const [loadedPages, setLoadedPages] = useState(new Set([1])); // Track loaded pages
    const [isInLiveWindow, setIsInLiveWindow] = useState(false);
    const [totalDays, setTotalDays] = useState(0); // Tổng số ngày từ backend
    const [pageData, setPageData] = useState({}); // Data theo page: {1: [...], 2: [...], ...}
    const intervalRef = useRef(null);
    const tableRef = useRef(null);
    const router = useRouter();

    const hour = 8;
    const minutes1 = 42;
    const minutes2 = 13;

    const dayof = props.dayofMT;
    const station = props.station || "xsmt";
    const date = props.data3;
    const tinh = props.tinh;

    const startHour = hour;
    const startMinute = minutes1;
    const duration = 30 * 60 * 1000;

    const today = new Date().toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).replace(/\//g, '/');

    const CACHE_KEY = `xsmt_data_${station}_${date || 'null'}_${tinh || 'null'}_${dayof || 'null'}`;
    const UPDATE_KEY = `xsmt_updated_${today}`; // Cờ để theo dõi cập nhật ngày hiện tại

    const triggerScraperDebounced = useCallback(
        debounce((today, station, provinces) => {
            apiMT.triggerScraper(today, station, provinces)
                .then((data) => {
                    console.log('Scraper kích hoạt thành công:', data.message);
                    setHasTriggeredScraper(true);
                    fetchData();
                })
                .catch((error) => {
                    console.error('Lỗi khi kích hoạt scraper:', error.message);
                });
        }, 1000),
        []
    );

    const cleanOldCache = () => {
        const now = new Date().getTime();
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.endsWith('_time')) {
                const cacheTime = parseInt(localStorage.getItem(key));
                if (now - cacheTime > CACHE_DURATION) {
                    localStorage.removeItem(key);
                    localStorage.removeItem(key.replace('_time', ''));
                    console.log(`🧹 Đã xóa cache hết hạn: ${key}`);
                }
            }
        }
    };

    // Tối ưu cho live window - tắt tất cả logic không cần thiết
    const isLiveWindowActive = useMemo(() => {
        const now = new Date();
        const vietnamTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
        const vietnamHours = vietnamTime.getHours();
        const vietnamMinutes = vietnamTime.getMinutes();
        return vietnamHours === 17 && vietnamMinutes >= 10 && vietnamMinutes <= 59;
    }, []);

    // Tối ưu fetchData cho live window - tránh fetch không cần thiết
    const fetchData = useCallback(async (page = currentPage, forceRefresh = false) => {
        // Trong live window, không fetch data mới - chỉ sử dụng cached data
        if (isLiveWindowActive) {
            console.log('🔄 Live window active - sử dụng cached data');
            const CACHE_KEY_PAGE = `xsmt_data_${station}_${date || 'null'}_${tinh || 'null'}_${dayof || 'null'}_page_${page}`;
            const cachedData = localStorage.getItem(CACHE_KEY_PAGE);
            if (cachedData) {
                setPageData(prevPageData => ({
                    ...prevPageData,
                    [page]: JSON.parse(cachedData)
                }));
            }
            setLoading(false);
            return;
        }

        // Nếu không trong live window, fetch data bình thường
        try {
            const now = new Date();
            const vietnamTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
            const vietnamHours = vietnamTime.getHours();
            const vietnamMinutes = vietnamTime.getMinutes();
            const isUpdateWindow = vietnamHours === 17 && vietnamMinutes >= 10 && vietnamMinutes <= 59;
            const isPostLiveWindow = vietnamHours > 17 || (vietnamHours === 17 && vietnamMinutes > 59);
            const hasUpdatedToday = localStorage.getItem(UPDATE_KEY);

            // Cập nhật live window state
            setIsInLiveWindow(isUpdateWindow);

            // Cache key với page và daysPerPage
            const CACHE_KEY_PAGE = `xsmt_data_${station}_${date || 'null'}_${tinh || 'null'}_${dayof || 'null'}_page_${page}_days_${DAYS_PER_PAGE}`;
            const cachedData = localStorage.getItem(CACHE_KEY_PAGE);
            const cachedTime = localStorage.getItem(`${CACHE_KEY_PAGE}_time`);
            const cacheAge = cachedTime ? now.getTime() - parseInt(cachedTime) : Infinity;

            // Cache-first strategy: Ưu tiên cache trước
            if (cachedData && cacheAge < CACHE_DURATION && !forceRefresh) {
                console.log(`📦 Cache hit: ${CACHE_KEY_PAGE}, age: ${Math.round(cacheAge / 1000 / 60)} phút`);

                const cachedDataParsed = JSON.parse(cachedData);
                setPageData(prevPageData => ({
                    ...prevPageData,
                    [page]: cachedDataParsed
                }));
                setLoading(false);
                return; // Không gọi API nếu cache còn valid
            } else if (cachedData && cacheAge >= CACHE_DURATION) {
                console.log(`⏰ Cache expired: ${CACHE_KEY_PAGE}, age: ${Math.round(cacheAge / 1000 / 60)} phút`);
            } else if (!cachedData) {
                console.log(`❌ Cache miss: ${CACHE_KEY_PAGE}`);
            }

            // Logic cache invalidation thông minh - chỉ gọi API khi thực sự cần
            const shouldFetchFromAPI =
                forceRefresh || // Force refresh từ live data
                (!cachedData || cacheAge >= CACHE_DURATION) || // Cache hết hạn hoặc không có
                (isPostLiveWindow && !hasUpdatedToday) || // Sau live window và chưa update
                (lastLiveUpdate && (now.getTime() - lastLiveUpdate) > LIVE_CACHE_DURATION); // Live data cũ

            // Trong live window, không fetch data mới
            if (isUpdateWindow) {
                console.log('🔄 Trong live window, không fetch data mới');
                if (cachedData) {
                    const cachedDataParsed = JSON.parse(cachedData);
                    setPageData(prevPageData => ({
                        ...prevPageData,
                        [page]: cachedDataParsed
                    }));
                }
                setLoading(false);
                return;
            }

            if (shouldFetchFromAPI) {
                console.log('Fetching from API', {
                    forceRefresh,
                    isUpdateWindow,
                    isPostLiveWindow,
                    hasUpdatedToday: !!hasUpdatedToday,
                    cacheAge: Math.round(cacheAge / 1000 / 60) + ' phút',
                    lastLiveUpdate: lastLiveUpdate ? Math.round((now.getTime() - lastLiveUpdate) / 1000 / 60) + ' phút' : 'null',
                    page,
                    daysPerPage: DAYS_PER_PAGE
                });

                // Thêm retry logic cho API call
                let result;
                let retryCount = 0;
                const maxRetries = 3;

                while (retryCount < maxRetries) {
                    try {
                        result = await apiMT.getLottery(station, date, tinh, dayof, {
                            page,
                            limit: DAYS_PER_PAGE * 10, // Lấy nhiều records để đảm bảo có đủ data
                            daysPerPage: DAYS_PER_PAGE
                        });
                        break; // Thành công, thoát loop
                    } catch (error) {
                        retryCount++;
                        console.warn(`🔄 API call failed (attempt ${retryCount}/${maxRetries}):`, error.message);

                        if (retryCount >= maxRetries) {
                            console.error('❌ API call failed after all retries');
                            // Fallback to cache nếu có
                            if (cachedData) {
                                console.log('📦 Fallback to cached data');
                                const cachedDataParsed = JSON.parse(cachedData);
                                setPageData(prevPageData => ({
                                    ...prevPageData,
                                    [page]: cachedDataParsed
                                }));
                                setLoading(false);
                                return;
                            }
                            throw error; // Re-throw nếu không có cache fallback
                        }

                        // Wait before retry
                        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                    }
                }
                const dataArray = Array.isArray(result) ? result : [result];

                const formattedData = dataArray.map(item => ({
                    ...item,
                    drawDate: new Date(item.drawDate).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                    }),
                    drawDateRaw: new Date(item.drawDate),
                    tentinh: item.tentinh || `Tỉnh ${dataArray.indexOf(item) + 1} `,
                    tinh: item.tinh || item.station,
                }));

                const groupedByDate = formattedData.reduce((acc, item) => {
                    const dateKey = item.drawDate;
                    if (!acc[dateKey]) {
                        acc[dateKey] = [];
                    }
                    acc[dateKey].push(item);
                    return acc;
                }, {});

                const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
                    const dateA = new Date(groupedByDate[a][0].drawDateRaw);
                    const dateB = new Date(groupedByDate[b][0].drawDateRaw);
                    return dateB - dateA;
                });

                // Backend đã trả về đúng 3 ngày cho page này, không cần slice nữa
                const finalData = sortedDates.map(date => ({
                    drawDate: date,
                    stations: groupedByDate[date],
                    dayOfWeek: groupedByDate[date][0].dayOfWeek,
                }));

                console.log(`📊 Page ${page} data:`, {
                    totalRecords: dataArray.length,
                    uniqueDates: sortedDates.length,
                    finalDataLength: finalData.length,
                    dates: sortedDates,
                    backendDaysPerPage: DAYS_PER_PAGE,
                    firstDate: sortedDates[0] || 'N/A',
                    lastDate: sortedDates[sortedDates.length - 1] || 'N/A',
                    currentTime: new Date().toLocaleDateString('vi-VN'),
                    cacheStatus: cachedData ? 'hit' : 'miss',
                    forceRefresh: forceRefresh
                });

                // Kiểm tra dữ liệu mới
                const cachedDataParsed = cachedData ? JSON.parse(cachedData) : [];
                const hasNewData = JSON.stringify(finalData) !== JSON.stringify(cachedDataParsed);

                if (hasNewData || !cachedData || forceRefresh) {
                    // Tách biệt data theo page thay vì append
                    setPageData(prevPageData => ({
                        ...prevPageData,
                        [page]: finalData
                    }));

                    // Cập nhật totalDays dựa trên số lượng ngày thực tế
                    if (page === 1) {
                        // Nếu là page 1, ước tính tổng số ngày dựa trên số ngày có sẵn
                        // Backend đã trả về đúng 3 ngày cho page 1, ước tính tổng số ngày
                        const estimatedTotalDays = Math.max(30, sortedDates.length * 10); // Ước tính dựa trên số ngày có sẵn
                        setTotalDays(estimatedTotalDays);
                        console.log(`📊 Ước tính totalDays: ${estimatedTotalDays} dựa trên ${sortedDates.length} ngày có sẵn`);
                    } else {
                        // Nếu là page khác, cập nhật totalDays nếu cần
                        setTotalDays(prev => {
                            const newTotal = Math.max(prev, page * DAYS_PER_PAGE + finalData.length);
                            console.log(`📊 Cập nhật totalDays: ${prev} -> ${newTotal}`);
                            return newTotal;
                        });
                    }

                    localStorage.setItem(CACHE_KEY_PAGE, JSON.stringify(finalData));
                    localStorage.setItem(`${CACHE_KEY_PAGE}_time`, now.getTime().toString());
                    if (isPostLiveWindow || forceRefresh) {
                        localStorage.setItem(UPDATE_KEY, now.getTime().toString());
                        setLastLiveUpdate(now.getTime());
                    }
                    console.log('✅ Đã cập nhật data mới từ API cho page:', page, 'với', finalData.length, 'ngày');
                } else if (cachedData) {
                    // Sử dụng cached data cho page này
                    setPageData(prevPageData => ({
                        ...prevPageData,
                        [page]: cachedDataParsed
                    }));

                    // Cập nhật totalDays nếu cần
                    if (page === 1 && totalDays === 0) {
                        const estimatedTotalDays = Math.max(30, cachedDataParsed.length * 2);
                        setTotalDays(estimatedTotalDays);
                        console.log(`📊 Ước tính totalDays từ cache: ${estimatedTotalDays}`);
                    }

                    console.log('📦 Sử dụng cached data cho page:', page);
                }

                setFilterTypes(prevFilters => ({
                    ...prevFilters,
                    ...finalData.reduce((acc, item) => {
                        acc[item.drawDate] = prevFilters[item.drawDate] || 'all';
                        return acc;
                    }, {}),
                }));

                setLoading(false);
            } else {
                console.log('📦 Sử dụng cached data (điều kiện không thỏa mãn) cho page:', page);
                if (cachedData) {
                    setPageData(prevPageData => ({
                        ...prevPageData,
                        [page]: JSON.parse(cachedData)
                    }));
                }
                setLoading(false);
            }
        } catch (error) {
            console.error('Error fetching lottery data:', error);
            setLoading(false);
        }
    }, [station, date, tinh, dayof, currentPage, lastLiveUpdate, isLiveWindowActive]);

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

    useEffect(() => {
        cleanOldCache();

        // Tối ưu: Chỉ fetch data khi cần thiết
        if (isLiveWindowActive) {
            console.log('🔄 Live window active - chỉ load cached data');
            const CACHE_KEY_PAGE_1 = `xsmt_data_${station}_${date || 'null'}_${tinh || 'null'}_${dayof || 'null'}_page_1_days_${DAYS_PER_PAGE}`;
            const cachedData = localStorage.getItem(CACHE_KEY_PAGE_1);
            if (cachedData) {
                const parsedData = JSON.parse(cachedData);
                setPageData({ 1: parsedData });
                // Khởi tạo totalDays từ cached data
                if (totalDays === 0) {
                    const estimatedTotalDays = Math.max(30, parsedData.length * 2);
                    setTotalDays(estimatedTotalDays);
                    console.log(`📊 Khởi tạo totalDays từ cache: ${estimatedTotalDays}`);
                }
            }
            setLoading(false);
        } else if (!isInLiveWindow) {
            // Chỉ fetch data nếu không trong live window và không đang trong live window
            console.log('🔄 Normal mode - fetch data từ API');
            fetchData();
        } else {
            console.log('🔄 Trong live window, sử dụng cached data');
            // Load cached data nếu có
            const CACHE_KEY_PAGE_1 = `xsmt_data_${station}_${date || 'null'}_${tinh || 'null'}_${dayof || 'null'}_page_1_days_${DAYS_PER_PAGE}`;
            const cachedData = localStorage.getItem(CACHE_KEY_PAGE_1);
            if (cachedData) {
                const parsedData = JSON.parse(cachedData);
                setPageData({ 1: parsedData });
                // Khởi tạo totalDays từ cached data
                if (totalDays === 0) {
                    const estimatedTotalDays = Math.max(30, parsedData.length * 2);
                    setTotalDays(estimatedTotalDays);
                    console.log(`📊 Khởi tạo totalDays từ cache: ${estimatedTotalDays}`);
                }
            }
            setLoading(false);
        }
    }, [fetchData, isInLiveWindow, isLiveWindowActive]);

    // Tối ưu useEffect cho liveData - chỉ update khi không trong live window
    useEffect(() => {
        if (isLiveDataComplete && liveData && Array.isArray(liveData) && liveData.some(item => item.drawDate === today) && !isLiveWindowActive) {
            console.log('🔄 Live data complete, cập nhật cache và force refresh');

            // Cập nhật pageData cho page 1
            setPageData(prevPageData => {
                // Đảm bảo currentPage1Data luôn là array
                const currentPage1Data = Array.isArray(prevPageData[1]) ? prevPageData[1] : [];

                console.log('📊 Updating pageData[1] with live data:', {
                    currentPage1DataLength: currentPage1Data.length,
                    liveDataLength: liveData.length,
                    today
                });

                // Loại bỏ dữ liệu cũ của ngày hôm nay
                const filteredData = currentPage1Data.filter(item => item.drawDate !== today);
                const formattedLiveData = {
                    drawDate: today,
                    drawDateRaw: new Date(today.split('/').reverse().join('-')),
                    dayOfWeek: new Date().toLocaleString('vi-VN', { weekday: 'long' }),
                    stations: liveData.map(item => ({
                        ...item,
                        tentinh: item.tentinh || `Tỉnh ${liveData.indexOf(item) + 1}`,
                        tinh: item.tinh || item.station || station,
                        specialPrize: [item.specialPrize_0],
                        firstPrize: [item.firstPrize_0],
                        secondPrize: [item.secondPrize_0],
                        threePrizes: [item.threePrizes_0, item.threePrizes_1],
                        fourPrizes: [
                            item.fourPrizes_0, item.fourPrizes_1, item.fourPrizes_2,
                            item.fourPrizes_3, item.fourPrizes_4, item.fourPrizes_5,
                            item.fourPrizes_6
                        ],
                        fivePrizes: [item.fivePrizes_0],
                        sixPrizes: [item.sixPrizes_0, item.sixPrizes_1, item.sixPrizes_2],
                        sevenPrizes: [item.sevenPrizes_0],
                        eightPrizes: [item.eightPrizes_0],
                    })),
                };
                const newData = [formattedLiveData, ...filteredData].sort((a, b) =>
                    new Date(b.drawDate.split('/').reverse().join('-')) - new Date(a.drawDate.split('/').reverse().join('-'))
                );

                // Chỉ cache cho page 1
                const CACHE_KEY_PAGE_1 = `xsmt_data_${station}_${date || 'null'}_${tinh || 'null'}_${dayof || 'null'}_page_1_days_${DAYS_PER_PAGE}`;
                localStorage.setItem(CACHE_KEY_PAGE_1, JSON.stringify(newData));
                localStorage.setItem(`${CACHE_KEY_PAGE_1}_time`, new Date().getTime().toString());
                localStorage.setItem(UPDATE_KEY, new Date().getTime().toString());
                setLastLiveUpdate(new Date().getTime());

                return {
                    ...prevPageData,
                    [1]: newData
                };
            });

            setFilterTypes(prev => ({
                ...prev,
                [today]: prev[today] || 'all',
            }));

            // Force refresh từ API sau 5 phút để đảm bảo data consistency (chỉ page 1)
            setTimeout(() => {
                console.log('🔄 Force refresh từ API sau live window (page 1)');
                fetchData(1, true);
            }, 5 * 60 * 1000); // 5 phút
        }
    }, [isLiveDataComplete, liveData, today, station, fetchData, isLiveWindowActive]);

    useEffect(() => {
        const checkTime = () => {
            // Lấy thời gian theo múi giờ Việt Nam (+07:00)
            const now = new Date();
            const vietnamTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
            const vietnamHours = vietnamTime.getHours();
            const vietnamMinutes = vietnamTime.getMinutes();
            const vietnamSeconds = vietnamTime.getSeconds();

            // Tạo thời gian bắt đầu và kết thúc theo giờ Việt Nam
            const startTime = new Date(vietnamTime);
            startTime.setHours(startHour, startMinute, 0, 0); // 17:10
            const endTime = new Date(startTime.getTime() + duration); // 17:35

            // Kiểm tra khung giờ trực tiếp
            const isLive = vietnamTime >= startTime && vietnamTime <= endTime;
            setIsRunning(prev => prev !== isLive ? isLive : prev);

            // Reset lúc 00:00 +07:00
            if (vietnamHours === 0 && vietnamMinutes === 0 && vietnamSeconds === 0) {
                setHasTriggeredScraper(false);
                localStorage.removeItem(UPDATE_KEY); // Xóa cờ cập nhật ngày cũ
            }

            const dayOfWeekIndex = vietnamTime.getDay();
            const todayData = {
                1: [
                    { tinh: 'hue', tentinh: 'Huế' },
                    { tinh: 'phu-yen', tentinh: 'Phú Yên' },
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
                    { tinh: 'hue', tentinh: 'Huế' },
                    { tinh: 'kon-tum', tentinh: 'Kon Tum' },
                    { tinh: 'khanh-hoa', tentinh: 'Khánh Hòa' },
                ],
            };

            const provinces = todayData[dayOfWeekIndex] || [];

            if (
                isLive &&
                vietnamHours === hour &&
                vietnamMinutes === minutes2 &&
                vietnamSeconds <= 5 &&
                !hasTriggeredScraper &&
                provinces.length > 0
            ) {
                triggerScraperDebounced(today, station, provinces);
            }
        };

        checkTime();
        intervalRef.current = setInterval(checkTime, 5000);
        return () => {
            clearInterval(intervalRef.current);
            triggerScraperDebounced.cancel();
        };
    }, [hasTriggeredScraper, station, today, triggerScraperDebounced]);

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
        if (shouldPreloadNextPage && !isInLiveWindow) {
            console.log('🔄 Preloading next page:', currentPage + 1);
            fetchData(currentPage + 1);
        }
    }, [shouldPreloadNextPage, currentPage, isInLiveWindow, fetchData]);

    // Auto-create next page nếu cần
    useEffect(() => {
        if (currentPageData.length > 0 && currentPage === effectiveTotalPages && !isInLiveWindow) {
            // Nếu đang ở page cuối và có data, tự động tạo page tiếp theo
            const nextPage = currentPage + 1;
            if (!hasPageData(nextPage) && !loadedPages.has(nextPage)) {
                console.log(`🔄 Auto-creating next page: ${nextPage}`);
                fetchData(nextPage);
                setTotalDays(prev => Math.max(prev, nextPage * DAYS_PER_PAGE));
            }
        }
    }, [currentPageData, currentPage, effectiveTotalPages, isInLiveWindow, hasPageData, loadedPages, fetchData]);

    const todayData = currentPageData.find(item => item.drawDate === today);
    const provinces = todayData && Array.isArray(todayData.stations) ? todayData.stations.map(station => ({
        tinh: station.tinh || station.station,
        tentinh: station.tentinh
    })) : [];

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
        <div ref={tableRef} className={`${styles.containerKQ} ${isLiveWindowActive ? styles.liveWindowActive : ''}`}>
            {/* Pre-allocate space cho LiveResult để tránh CLS */}
            <div className={`${styles.liveResultPlaceholder} ${isLiveMode && isRunning ? styles.active : ''}`}>
                {isLiveMode && isRunning && (
                    <div className={styles.liveResultContainer}>
                        <LiveResult
                            station={station}
                            today={today}
                            getHeadAndTailNumbers={getHeadAndTailNumbers}
                            handleFilterChange={handleFilterChange}
                            filterTypes={filterTypes}
                            isLiveWindow={isRunning}
                            provinces={provinces}
                        />
                    </div>
                )}
            </div>

            <div className={`${isLiveWindowActive ? styles.liveOptimized : ''}`}>
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

            {effectiveTotalPages > 1 && !isLiveWindowActive && (
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
        </div>
    );
};

export default React.memo(KQXS);
// cần test 17/06 sửa để cập nhập cache