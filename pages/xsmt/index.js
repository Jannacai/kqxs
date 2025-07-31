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

const CACHE_DURATION = 24 * 60 * 60 * 1000; // Cache 24 giờ
const LIVE_CACHE_DURATION = 40 * 60 * 1000; // Cache 40 phút cho live data
const ITEMS_PER_PAGE = 3;
const VISIBLE_ITEMS = 2; // Chỉ render 2 items visible

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
    const [visibleRange, setVisibleRange] = useState({ start: 0, end: VISIBLE_ITEMS });
    const [isInLiveWindow, setIsInLiveWindow] = useState(false);
    const intervalRef = useRef(null);
    const tableRef = useRef(null);
    const observerRef = useRef(null);
    const router = useRouter();

    const hour = 16;
    const minutes1 = 11;
    const minutes2 = 2;

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
            if (key.endsWith('_time')) {
                const cacheTime = parseInt(localStorage.getItem(key));
                if (now - cacheTime > CACHE_DURATION) {
                    localStorage.removeItem(key);
                    localStorage.removeItem(key.replace('_time', ''));
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

    // Tối ưu fetchData cho live window
    const fetchData = useCallback(async (page = currentPage, forceRefresh = false) => {
        // Trong live window, không fetch data mới
        if (isLiveWindowActive) {
            console.log('🔄 Live window active - sử dụng cached data');
            const CACHE_KEY_PAGE = `xsmt_data_${station}_${date || 'null'}_${tinh || 'null'}_${dayof || 'null'}_page_${page}`;
            const cachedData = localStorage.getItem(CACHE_KEY_PAGE);
            if (cachedData) {
                setData(JSON.parse(cachedData));
            }
            setLoading(false);
            return;
        }

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

            // Cache key với page
            const CACHE_KEY_PAGE = `xsmt_data_${station}_${date || 'null'}_${tinh || 'null'}_${dayof || 'null'}_page_${page}`;
            const cachedData = localStorage.getItem(CACHE_KEY_PAGE);
            const cachedTime = localStorage.getItem(`${CACHE_KEY_PAGE}_time`);
            const cacheAge = cachedTime ? now.getTime() - parseInt(cachedTime) : Infinity;

            // Cache-first strategy: Ưu tiên cache trước
            if (cachedData && cacheAge < CACHE_DURATION && !forceRefresh) {
                console.log(`📦 Cache hit: ${CACHE_KEY_PAGE}, age: ${Math.round(cacheAge / 1000 / 60)} phút`);

                const cachedDataParsed = JSON.parse(cachedData);
                if (page === 1) {
                    setData(cachedDataParsed);
                } else {
                    setData(prevData => {
                        const existingDates = prevData.map(item => item.drawDate);
                        const newData = cachedDataParsed.filter(item => !existingDates.includes(item.drawDate));
                        return [...prevData, ...newData];
                    });
                }
                setLoading(false);
                return; // Không gọi API nếu cache còn valid
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
                    setData(cachedDataParsed);
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
                    limit: ITEMS_PER_PAGE
                });

                const result = await apiMT.getLottery(station, date, tinh, dayof, {
                    page,
                    limit: ITEMS_PER_PAGE
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

                const finalData = sortedDates.map(date => ({
                    drawDate: date,
                    stations: groupedByDate[date],
                    dayOfWeek: groupedByDate[date][0].dayOfWeek,
                }));

                // Kiểm tra dữ liệu mới
                const cachedDataParsed = cachedData ? JSON.parse(cachedData) : [];
                const hasNewData = JSON.stringify(finalData) !== JSON.stringify(cachedDataParsed);

                if (hasNewData || !cachedData || forceRefresh) {
                    // Nếu là page 1, thay thế toàn bộ data
                    if (page === 1) {
                        setData(finalData);
                    } else {
                        // Nếu là page khác, append vào data hiện tại
                        setData(prevData => {
                            const existingDates = prevData.map(item => item.drawDate);
                            const newData = finalData.filter(item => !existingDates.includes(item.drawDate));
                            return [...prevData, ...newData];
                        });
                    }

                    localStorage.setItem(CACHE_KEY_PAGE, JSON.stringify(finalData));
                    localStorage.setItem(`${CACHE_KEY_PAGE}_time`, now.getTime().toString());
                    if (isPostLiveWindow || forceRefresh) {
                        localStorage.setItem(UPDATE_KEY, now.getTime().toString());
                        setLastLiveUpdate(now.getTime());
                    }
                    console.log('✅ Đã cập nhật data mới từ API cho page:', page);
                } else if (cachedData) {
                    if (page === 1) {
                        setData(cachedDataParsed);
                    } else {
                        setData(prevData => {
                            const existingDates = prevData.map(item => item.drawDate);
                            const newData = cachedDataParsed.filter(item => !existingDates.includes(item.drawDate));
                            return [...prevData, ...newData];
                        });
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
                    if (page === 1) {
                        setData(JSON.parse(cachedData));
                    } else {
                        setData(prevData => {
                            const existingDates = prevData.map(item => item.drawDate);
                            const newData = JSON.parse(cachedData).filter(item => !existingDates.includes(item.drawDate));
                            return [...prevData, ...newData];
                        });
                    }
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
        // Trong live window, chỉ load cached data, không fetch API
        if (isLiveWindowActive) {
            console.log('🔄 Live window active - chỉ load cached data');
            const CACHE_KEY_PAGE_1 = `xsmt_data_${station}_${date || 'null'}_${tinh || 'null'}_${dayof || 'null'}_page_1`;
            const cachedData = localStorage.getItem(CACHE_KEY_PAGE_1);
            if (cachedData) {
                setData(JSON.parse(cachedData));
            }
            setLoading(false);
        } else {
            // Chỉ fetch data nếu không trong live window
            if (!isInLiveWindow) {
                fetchData();
            } else {
                console.log('🔄 Trong live window, sử dụng cached data');
                // Load cached data nếu có
                const CACHE_KEY_PAGE_1 = `xsmt_data_${station}_${date || 'null'}_${tinh || 'null'}_${dayof || 'null'}_page_1`;
                const cachedData = localStorage.getItem(CACHE_KEY_PAGE_1);
                if (cachedData) {
                    setData(JSON.parse(cachedData));
                }
                setLoading(false);
            }
        }
    }, [fetchData, isInLiveWindow, isLiveWindowActive]);

    // Tối ưu useEffect cho liveData - chỉ update khi không trong live window
    useEffect(() => {
        if (isLiveDataComplete && liveData && Array.isArray(liveData) && liveData.some(item => item.drawDate === today) && !isLiveWindowActive) {
            console.log('🔄 Live data complete, cập nhật cache và force refresh');

            setData(prevData => {
                // Loại bỏ dữ liệu cũ của ngày hôm nay
                const filteredData = prevData.filter(item => item.drawDate !== today);
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
                const CACHE_KEY_PAGE_1 = `xsmt_data_${station}_${date || 'null'}_${tinh || 'null'}_${dayof || 'null'}_page_1`;
                localStorage.setItem(CACHE_KEY_PAGE_1, JSON.stringify(newData));
                localStorage.setItem(`${CACHE_KEY_PAGE_1}_time`, new Date().getTime().toString());
                localStorage.setItem(UPDATE_KEY, new Date().getTime().toString());
                setLastLiveUpdate(new Date().getTime());
                return newData;
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

    const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const currentData = data.slice(startIndex, endIndex);

    const goToPage = async (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
            tableRef.current?.scrollIntoView({ behavior: 'smooth' });

            // Lazy load data cho page mới nếu chưa có
            const startIndex = (page - 1) * ITEMS_PER_PAGE;
            const endIndex = startIndex + ITEMS_PER_PAGE;
            const hasDataForPage = data.slice(startIndex, endIndex).length > 0;

            if (!hasDataForPage && !loadedPages.has(page)) {
                console.log(`🔄 Lazy loading data cho page ${page}`);
                setLoadingPage(true);
                try {
                    await fetchData(page);
                    setLoadedPages(prev => new Set([...prev, page]));
                } finally {
                    setLoadingPage(false);
                }
            }
        }
    };

    useEffect(() => {
        if (tableRef.current) {
            tableRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [currentPage]);

    // Intersection Observer cho lazy rendering
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const index = parseInt(entry.target.dataset.index);
                        setVisibleRange(prev => ({
                            start: Math.max(0, index - 1),
                            end: Math.min(data.length, index + VISIBLE_ITEMS)
                        }));
                    }
                });
            },
            {
                rootMargin: '50px',
                threshold: 0.1
            }
        );

        observerRef.current = observer;

        // Observe tất cả các elements có data-index
        const elements = document.querySelectorAll('[data-index]');
        elements.forEach(el => observer.observe(el));

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [data.length]);

    // Debounced scroll handler cho virtual scrolling
    const handleScroll = useCallback(
        debounce(() => {
            if (!tableRef.current) return;

            const rect = tableRef.current.getBoundingClientRect();
            const windowHeight = window.innerHeight;

            // Tính toán visible range dựa trên scroll position
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const containerTop = rect.top + scrollTop;
            const containerHeight = rect.height;

            const startIndex = Math.floor((scrollTop - containerTop) / 200); // Ước tính 200px per item
            const endIndex = Math.min(data.length, startIndex + VISIBLE_ITEMS + 1);

            setVisibleRange({
                start: Math.max(0, startIndex),
                end: endIndex
            });
        }, 100),
        [data.length]
    );

    useEffect(() => {
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [handleScroll]);

    // Chỉ render visible items để tối ưu performance
    const visibleData = useMemo(() => {
        return data.slice(visibleRange.start, visibleRange.end);
    }, [data, visibleRange]);

    // Preload next page khi user scroll gần cuối
    const shouldPreloadNextPage = useMemo(() => {
        return visibleRange.end >= data.length - 1 && !loadedPages.has(currentPage + 1);
    }, [visibleRange.end, data.length, loadedPages, currentPage]);

    useEffect(() => {
        if (shouldPreloadNextPage && !isInLiveWindow) {
            console.log('🔄 Preloading next page:', currentPage + 1);
            fetchData(currentPage + 1);
        }
    }, [shouldPreloadNextPage, currentPage, isInLiveWindow, fetchData]);

    const todayData = data.find(item => item.drawDate === today);
    const provinces = todayData ? todayData.stations.map(station => ({
        tinh: station.tinh || station.station,
        tentinh: station.tentinh
    })) : [];

    if (loading) {
        return (
            <div className={styles.containerKQ}>
                <Skeleton count={6} height={30} />
            </div>
        );
    }

    return (
        <div ref={tableRef} className={`${styles.containerKQ} ${isLiveWindowActive ? styles.liveWindowActive : ''}`}>
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
            <div className={`${isLiveWindowActive ? styles.liveOptimized : ''}`}>
                {visibleData.map((dayData, index) => {
                    const actualIndex = visibleRange.start + index;
                    const tableKey = dayData.drawDate;
                    const currentFilter = filterTypes[tableKey] || 'all';

                    const allHeads = Array(10).fill().map(() => []);
                    const allTails = Array(10).fill().map(() => []);
                    const stationsData = dayData.stations.map(stationData => {
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
                                    <h1 className={styles.kqxs__title}>XSMT - Kết quả Xổ số Miền Trung - SXMT {dayData.drawDate}</h1>
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
                                            {dayData.stations.map(stationData => (
                                                <th key={stationData.tinh || stationData.station} className={styles.stationName}>
                                                    {stationData.tentinh || `Tỉnh ${dayData.stations.indexOf(stationData) + 1} `}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className={`${styles.tdTitle} ${styles.highlight} `}>G8</td>
                                            {dayData.stations.map(stationData => (
                                                <td key={stationData.tinh || stationData.station} className={styles.rowXS}>
                                                    <span className={`${styles.prizeNumber} ${styles.highlight} `}>
                                                        {(stationData.eightPrizes || [])[0] ? getFilteredNumber(stationData.eightPrizes[0], currentFilter) : '-'}
                                                    </span>
                                                </td>
                                            ))}
                                        </tr>
                                        <tr>
                                            <td className={styles.tdTitle}>G7</td>
                                            {dayData.stations.map(stationData => (
                                                <td key={stationData.tinh || stationData.station} className={styles.rowXS}>
                                                    <span className={styles.prizeNumber}>
                                                        {(stationData.sevenPrizes || [])[0] ? getFilteredNumber(stationData.sevenPrizes[0], currentFilter) : '-'}
                                                    </span>
                                                </td>
                                            ))}
                                        </tr>
                                        <tr>
                                            <td className={styles.tdTitle}>G6</td>
                                            {dayData.stations.map(stationData => (
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
                                            {dayData.stations.map(stationData => (
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
                                            {dayData.stations.map(stationData => (
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
                                            {dayData.stations.map(stationData => (
                                                <td key={stationData.tinh || stationData.station} className={styles.rowXS}>
                                                    <span className={styles.prizeNumber}>
                                                        {(stationData.secondPrize || [])[0] ? getFilteredNumber(stationData.secondPrize[0], currentFilter) : '-'}
                                                    </span>
                                                </td>
                                            ))}
                                        </tr>
                                        <tr>
                                            <td className={styles.tdTitle}>G1</td>
                                            {dayData.stations.map(stationData => (
                                                <td key={stationData.tinh || stationData.station} className={styles.rowXS}>
                                                    <span className={styles.prizeNumber}>
                                                        {(stationData.firstPrize || [])[0] ? getFilteredNumber(stationData.firstPrize[0], currentFilter) : '-'}
                                                    </span>
                                                </td>
                                            ))}
                                        </tr>
                                        <tr>
                                            <td className={`${styles.tdTitle} ${styles.highlight} `}>ĐB</td>
                                            {dayData.stations.map(stationData => (
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

            {data.length > 1 && !isLiveWindowActive && (
                <div className={styles.pagination}>
                    <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1 || loadingPage}
                        className={styles.paginationButton}
                    >
                        {loadingPage ? 'Đang tải...' : 'Trước'}
                    </button>
                    <span>Trang {currentPage} / {totalPages}</span>
                    <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages || loadingPage}
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