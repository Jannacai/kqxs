import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import styles from '../../styles/LIVEMT.module.css';
import { getFilteredNumber } from "../../library/utils/filterUtils";
import React from 'react';
import { useLottery } from '../../contexts/LotteryContext';

const LiveResult = ({ station, today, handleFilterChange, filterTypes, isLiveWindow }) => {
    const { liveData, setLiveData, setIsLiveDataComplete, isLiveDataComplete } = useLottery() || { liveData: null, setLiveData: null, setIsLiveDataComplete: null, isLiveDataComplete: false };
    const [isTodayLoading, setIsTodayLoading] = useState(true);
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const [animatingPrizes, setAnimatingPrizes] = useState({});
    const mountedRef = useRef(false);
    const sseRef = useRef(null);
    const debounceRef = useRef(null);

    const maxRetries = 10;
    const retryInterval = 5000; // Tăng lên 5000ms
    const fetchMaxRetries = 3;
    const fetchRetryInterval = 5000;
    const pollingIntervalMs = 10000;
    const regularPollingIntervalMs = 30000;

    console.log('Dependencies useEffect:', { isLiveWindow, station, today, setLiveData, setIsLiveDataComplete, isLiveDataComplete });

    const prizeDigits = useMemo(() => ({
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
    }), []);

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
        const dayOfWeekIndex = new Date().getDay();
        const provinces = provincesByDay[dayOfWeekIndex] || provincesByDay[6];
        return provinces.map(province => ({
            drawDate: today,
            station: 'xsmt',
            dayOfWeek: new Date().toLocaleString('vi-VN', { weekday: 'long' }),
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
    }, [today]);

    const getPrizeNumbers = useCallback((stationData) => {
        const lastTwoNumbers = [];
        const addNumber = (num, isSpecial = false, isEighth = false) => {
            if (num && num !== '...' && num !== '***' && /^\d+$/.test(num)) {
                const last2 = num.slice(-2).padStart(2, '0');
                lastTwoNumbers.push({ num: last2, isSpecial, isEighth });
            }
        };

        addNumber(stationData.specialPrize_0, true);
        addNumber(stationData.firstPrize_0);
        addNumber(stationData.secondPrize_0);
        for (let i = 0; i < 2; i++) addNumber(stationData[`threePrizes_${i}`]);
        for (let i = 0; i < 7; i++) addNumber(stationData[`fourPrizes_${i}`]);
        addNumber(stationData.fivePrizes_0);
        for (let i = 0; i < 3; i++) addNumber(stationData[`sixPrizes_${i}`]);
        addNumber(stationData.sevenPrizes_0);
        addNumber(stationData.eightPrizes_0, false, true);

        const heads = Array(10).fill().map(() => []);
        const tails = Array(10).fill().map(() => []);

        lastTwoNumbers.forEach(item => {
            const last2 = item.num;
            if (last2.length === 2) {
                const head = parseInt(last2[0], 10);
                const tail = parseInt(last2[1], 10);
                if (!isNaN(head) && !isNaN(tail)) {
                    heads[head].push(item);
                    tails[tail].push(item);
                }
            }
        });

        return { heads, tails };
    }, []);

    const renderPrizeValue = useCallback((tinh, prizeType, digits = 5) => {
        const isAnimating = animatingPrizes[tinh] === prizeType && liveData.find(item => item.tinh === tinh)?.[prizeType] === '...';
        const className = `${styles.running_number} ${styles[`running_${digits}`]}`;
        const prizeValue = liveData.find(item => item.tinh === tinh)?.[prizeType] || '...';
        const filteredValue = getFilteredNumber(prizeValue, filterTypes[today + station] || 'all');
        const displayDigits = (filterTypes[today + station] || 'all') === 'last2' ? 2 : (filterTypes[today + station] || 'all') === 'last3' ? 3 : digits;
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
    }, [animatingPrizes, liveData, filterTypes, today, station]);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            if (sseRef.current) {
                console.log('Đóng kết nối SSE trong cleanup...');
                sseRef.current.close();
                sseRef.current = null;
            }
        };
    }, []);

    const debounceUpdate = useCallback((updateFn) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(updateFn, 100);
    }, []);

    const fetchInitialData = async (retry = 0) => {
        console.log('Bắt đầu fetchInitialData, retry:', retry);
        try {
            const dayOfWeekIndex = new Date().getDay();
            const provinces = provincesByDay[dayOfWeekIndex] || provincesByDay[6];
            console.log('Các tỉnh sẽ fetch:', provinces.map(p => p.tinh));
            const formattedToday = today.replace(/\//g, '-');

            const results = await Promise.all(
                provinces.map(async (province) => {
                    const cacheKey = `liveData:xsmt:${province.tinh}:${today}`;
                    const cachedData = localStorage.getItem(cacheKey);
                    let initialData = cachedData ? JSON.parse(cachedData) : {
                        ...emptyResult.find(item => item.tinh === province.tinh),
                        lastUpdated: 0,
                    };
                    console.log(`Kiểm tra cache cho ${province.tinh}:`, cachedData ? 'Có cache' : 'Không có cache');

                    try {
                        const url = `https://backendkqxs-1.onrender.com/api/ketquaxs/xsmt/sse/initial?station=xsmt&tinh=${province.tinh}&date=${formattedToday}`;
                        console.log(`Gửi yêu cầu /initial: ${url}`);
                        const response = await fetch(url);
                        if (!response.ok) {
                            throw new Error(`HTTP error! Status: ${response.status}`);
                        }
                        const serverData = await response.json();
                        console.log(`Dữ liệu từ /initial cho ${province.tinh}:`, serverData);

                        const updatedData = { ...initialData };
                        let shouldUpdate = !initialData.lastUpdated || serverData.lastUpdated >= initialData.lastUpdated;
                        for (const key in serverData) {
                            if (serverData[key] !== '...' || !updatedData[key] || updatedData[key] === '...' || updatedData[key] === '***') {
                                updatedData[key] = serverData[key];
                                shouldUpdate = true;
                            }
                        }
                        if (shouldUpdate) {
                            updatedData.lastUpdated = serverData.lastUpdated || Date.now();
                            console.log(`Lưu cache cho ${province.tinh}:`, updatedData);
                            localStorage.setItem(cacheKey, JSON.stringify(updatedData));
                        }
                        return updatedData;
                    } catch (err) {
                        console.error(`Lỗi khi lấy dữ liệu /initial cho ${province.tinh} (lần ${retry + 1}):`, err.message);
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
                console.log('Đã cập nhật dữ liệu ban đầu:', results);
            }
        } catch (err) {
            console.error('Lỗi tổng quát trong fetchInitialData:', { error: err.message, retry });
            if (retry < fetchMaxRetries && mountedRef.current) {
                setTimeout(() => {
                    fetchInitialData(retry + 1);
                }, fetchRetryInterval);
            } else if (mountedRef.current) {
                const dayOfWeekIndex = new Date().getDay();
                const provinces = provincesByDay[dayOfWeekIndex] || provincesByDay[6];
                const results = provinces.map(province => {
                    const cacheKey = `liveData:xsmt:${province.tinh}:${today}`;
                    const cachedData = localStorage.getItem(cacheKey);
                    return cachedData ? JSON.parse(cachedData) : emptyResult.find(item => item.tinh === province.tinh);
                });
                setLiveData(results);
                setIsLiveDataComplete(false);
                setIsTodayLoading(false);
                setError('Không thể lấy dữ liệu ban đầu, sử dụng dữ liệu cục bộ...');
                console.log('Sử dụng dữ liệu cục bộ do lỗi:', results);
            }
        }
    };

    const connectSSE = () => {
        const formattedToday = today.replace(/\//g, '-');
        if (!formattedToday || !/^\d{2}-\d{2}-\d{4}$/.test(formattedToday)) {
            console.warn('Ngày không hợp lệ:', { today, formattedToday });
            if (mountedRef.current) {
                setError('Dữ liệu ngày không hợp lệ');
                setIsTodayLoading(false);
            }
            return;
        }

        if (sseRef.current) {
            console.log('Đóng kết nối SSE hiện tại...');
            sseRef.current.close();
            sseRef.current = null;
        }

        const dayOfWeekIndex = new Date().getDay();
        const provinces = provincesByDay[dayOfWeekIndex] || provincesByDay[6];
        const sseUrl = `https://backendkqxs-1.onrender.com/api/ketquaxs/xsmt/sse/all?station=xsmt&date=${formattedToday}`;
        console.log(`Khởi tạo kết nối SSE tổng hợp, ngày: ${today}, tỉnh: ${provinces.map(p => p.tinh).join(', ')}`, { sseUrl });
        sseRef.current = new EventSource(sseUrl);

        sseRef.current.onopen = () => {
            console.log('Kết nối SSE đã mở thành công', { sseUrl, readyState: sseRef.current.readyState });
            if (mountedRef.current) {
                setError(null);
                setRetryCount(0);
            }
        };

        sseRef.current.onerror = (err) => {
            console.error('Lỗi SSE:', {
                error: err,
                message: err.message || 'Không có thông tin lỗi cụ thể',
                readyState: sseRef.current?.readyState,
                retryCount,
                sseUrl,
                time: Date.now(),
                networkStatus: navigator.onLine ? 'Online' : 'Offline'
            });
            if (mountedRef.current) {
                setError('Đang kết nối lại...');
                sseRef.current.close();
                sseRef.current = null;
                if (retryCount < maxRetries) {
                    setTimeout(() => {
                        if (mountedRef.current) {
                            setRetryCount(prev => {
                                const newCount = prev + 1;
                                console.log(`Thử kết nối lại SSE (lần ${newCount}/${maxRetries})`);
                                return newCount;
                            });
                            connectSSE();
                        }
                    }, retryInterval);
                } else {
                    console.error('Đã vượt quá số lần thử lại SSE, chuyển sang polling');
                    setError('Mất kết nối trực tiếp, sử dụng polling...');
                }
            }
        };

        sseRef.current.addEventListener('init', (event) => {
            console.log('Nhận sự kiện SSE init:', { data: event.data, readyState: sseRef.current?.readyState });
        });

        sseRef.current.addEventListener('ping', (event) => {
            console.log('Nhận tin nhắn ping:', { data: event.data, time: Date.now() });
        });

        sseRef.current.addEventListener('canary', (event) => {
            console.log('Nhận tin nhắn canary:', { data: event.data, time: Date.now() });
        });

        const prizeTypes = [
            'specialPrize_0', 'firstPrize_0', 'secondPrize_0',
            'threePrizes_0', 'threePrizes_1',
            'fourPrizes_0', 'fourPrizes_1', 'fourPrizes_2', 'fourPrizes_3', 'fourPrizes_4', 'fourPrizes_5', 'fourPrizes_6',
            'fivePrizes_0',
            'sixPrizes_0', 'sixPrizes_1', 'sixPrizes_2',
            'sevenPrizes_0', 'eightPrizes_0'
        ];

        prizeTypes.forEach(prizeType => {
            sseRef.current.addEventListener(prizeType, (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log(`Nhận sự kiện SSE: ${prizeType} (tỉnh ${data.tinh})`, { data, readyState: sseRef.current?.readyState });
                    if (data && data[prizeType] && mountedRef.current) {
                        debounceUpdate(() => {
                            setLiveData(prev => {
                                const updatedData = prev.map(item => {
                                    if (item.tinh !== data.tinh) return item;
                                    if (data[prizeType] === '...' && item[prizeType] !== '...' && item[prizeType] !== '***') {
                                        console.warn(`Bỏ qua ${prizeType} = "..." vì đã có giá trị: ${item[prizeType]}`);
                                        return item;
                                    }
                                    const updatedItem = {
                                        ...item,
                                        [prizeType]: data[prizeType],
                                        tentinh: data.tentinh || item.tentinh,
                                        year: data.year || item.year,
                                        month: data.month || item.month,
                                        lastUpdated: data.lastUpdated || Date.now(),
                                    };
                                    localStorage.setItem(`liveData:xsmt:${data.tinh}:${today}`, JSON.stringify(updatedItem));
                                    return updatedItem;
                                });
                                const isComplete = updatedData.every(item =>
                                    Object.values(item).every(val => typeof val === 'string' && val !== '...' && val !== '***')
                                );
                                setIsLiveDataComplete(isComplete);
                                setIsTodayLoading(false);
                                setRetryCount(0);
                                setError(null);
                                console.log('Cập nhật liveData từ SSE:', updatedData);
                                return updatedData;
                            });
                        });
                    }
                } catch (error) {
                    console.error(`Lỗi xử lý sự kiện ${prizeType}:`, { error, data: event.data });
                }
            });
        });

        sseRef.current.addEventListener('full', (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log(`Nhận sự kiện SSE full (tỉnh ${data.tinh}):`, { data, readyState: sseRef.current?.readyState });
                if (data && mountedRef.current) {
                    debounceUpdate(() => {
                        setLiveData(prev => {
                            const updatedData = prev.map(item => {
                                if (item.tinh !== data.tinh) return item;
                                const updatedItem = { ...item };
                                let shouldUpdate = false;
                                for (const key in data) {
                                    if (data[key] !== '...' || !updatedItem[key] || updatedItem[key] === '...' || updatedItem[key] === '***') {
                                        updatedItem[key] = data[key];
                                        shouldUpdate = true;
                                    }
                                }
                                if (shouldUpdate) {
                                    updatedItem.lastUpdated = data.lastUpdated || Date.now();
                                    localStorage.setItem(`liveData:xsmt:${data.tinh}:${today}`, JSON.stringify(updatedItem));
                                }
                                return updatedItem;
                            });
                            const isComplete = updatedData.every(item =>
                                Object.values(item).every(val => typeof val === 'string' && val !== '...' && val !== '***')
                            );
                            setIsLiveDataComplete(isComplete);
                            console.log('Cập nhật liveData từ SSE full:', updatedData);
                            return updatedData;
                        });
                        setIsTodayLoading(false);
                        setRetryCount(0);
                        setError(null);
                    });
                }
            } catch (error) {
                console.error(`Lỗi xử lý sự kiện full:`, { error, data: event.data });
            }
        });
    };

    const startPolling = () => {
        let pollingInterval;
        const poll = () => {
            console.log('Polling check - SSE readyState:', sseRef.current?.readyState);
            if (sseRef.current?.readyState === 1) {
                console.log('Dừng polling vì SSE đang hoạt động');
                return;
            }
            const dayOfWeekIndex = new Date().getDay();
            const provinces = provincesByDay[dayOfWeekIndex] || provincesByDay[6];
            const isIncomplete = (liveData || emptyResult).some(item =>
                Object.values(item).some(val => typeof val === 'string' && (val === '...' || val === '***'))
            );
            const interval = isIncomplete ? pollingIntervalMs : regularPollingIntervalMs;

            pollingInterval = setTimeout(async () => {
                try {
                    const results = await Promise.all(
                        provinces.map(async province => {
                            const url = `https://backendkqxs-1.onrender.com/api/ketquaxs/xsmt/sse/initial?station=xsmt&tinh=${province.tinh}&date=${today.replace(/\//g, '-')}`;
                            console.log(`Gửi yêu cầu polling: ${url}`);
                            const response = await fetch(url);
                            if (!response.ok) {
                                throw new Error(`HTTP error! Status: ${response.status}`);
                            }
                            const serverData = await response.json();
                            console.log(`Dữ liệu từ polling cho ${province.tinh}:`, serverData);
                            return { province: province.tinh, data: serverData };
                        })
                    );

                    if (mountedRef.current) {
                        debounceUpdate(() => {
                            setLiveData(prev => {
                                const currentData = Array.isArray(prev) && prev.length > 0 ? prev : emptyResult;
                                const updatedData = currentData.map(item => {
                                    const serverData = results.find(r => r.province === item.tinh)?.data;
                                    if (!serverData) return item;
                                    const updatedItem = { ...item };
                                    let shouldUpdate = !item.lastUpdated || serverData.lastUpdated >= item.lastUpdated;
                                    for (const key in serverData) {
                                        if (serverData[key] !== '...' || !updatedItem[key] || updatedItem[key] === '...' || updatedItem[key] === '***') {
                                            updatedItem[key] = serverData[key];
                                            shouldUpdate = true;
                                        }
                                    }
                                    if (shouldUpdate) {
                                        updatedItem.lastUpdated = serverData.lastUpdated || Date.now();
                                        console.log(`Lưu cache cho ${item.tinh}:`, updatedItem);
                                        localStorage.setItem(`liveData:xsmt:${item.tinh}:${today}`, JSON.stringify(updatedItem));
                                    }
                                    return updatedItem;
                                });
                                const isComplete = updatedData.every(item =>
                                    Object.values(item).every(val => typeof val === 'string' && val !== '...' && val !== '***')
                                );
                                setIsLiveDataComplete(isComplete);
                                console.log('Cập nhật liveData từ polling:', updatedData);
                                return updatedData;
                            });
                            setError(null);
                        });
                    }
                } catch (error) {
                    console.error('Lỗi khi polling dữ liệu:', { error: error.message });
                    if (mountedRef.current) {
                        setError('Không thể lấy dữ liệu, đang thử lại...');
                    }
                }
                if (mountedRef.current) {
                    poll();
                }
            }, interval);
        };
        poll();
        return () => {
            if (pollingInterval) {
                console.log('Dừng polling interval');
                clearTimeout(pollingInterval);
            }
        };
    };

    useEffect(() => {
        if (!setLiveData || !setIsLiveDataComplete || !isLiveWindow) {
            console.log('Không chạy SSE/polling do thiếu điều kiện:', { setLiveData, setIsLiveDataComplete, isLiveWindow });
            setLiveData(emptyResult);
            setIsTodayLoading(true);
            setError(null);
            return;
        }

        console.log('Khởi động fetchInitialData, connectSSE, và startPolling');
        fetchInitialData();
        connectSSE();
        const cleanupPolling = startPolling();

        return () => {
            console.log('Cleanup useEffect: Đóng SSE và polling');
            if (sseRef.current) {
                console.log('Đóng kết nối SSE trong cleanup...');
                sseRef.current.close();
                sseRef.current = null;
            }
            cleanupPolling();
        };
    }, [isLiveWindow, station, today, setLiveData, setIsLiveDataComplete, emptyResult]);

    useEffect(() => {
        if (!liveData || !liveData.length) {
            console.log('Không có liveData, đặt lại animatingPrizes');
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

        liveData.forEach(stationData => {
            const currentPrize = animatingPrizes[stationData.tinh];
            if (!currentPrize || stationData[currentPrize] !== '...') {
                const nextPrize = animationQueue.find(prize => stationData[prize] === '...') || null;
                setAnimatingPrizes(prev => ({
                    ...prev,
                    [stationData.tinh]: nextPrize
                }));
            }
        });
    }, [liveData]);

    if (!liveData || !liveData.length) {
        console.log('Render: Không có liveData, hiển thị thông báo đang tải');
        return <div className={styles.error}>Đang tải dữ liệu...</div>;
    }

    const tableKey = today + station;
    const currentFilter = filterTypes[tableKey] || 'all';

    const allHeads = Array(10).fill().map(() => []);
    const allTails = Array(10).fill().map(() => []);
    const stationsData = liveData.map(stationData => {
        const { heads, tails } = getPrizeNumbers(stationData);
        for (let i = 0; i < 10; i++) {
            allHeads[i].push(heads[i]);
            allTails[i].push(tails[i]);
        }
        return { tentinh: stationData.tentinh, station: stationData.station, tinh: stationData.tinh };
    });

    console.log('Render: Hiển thị bảng kết quả', { liveData, currentFilter });
    return (
        <div className={styles.containerKQs}>
            {error && <div className={styles.error}>{error}</div>}
            {isTodayLoading && (
                <div className={styles.loading}>Đang chờ kết quả ngày {today}...</div>
            )}
            <div className={styles.kqxs} style={{ '--num-columns': liveData.length }}>
                <div className={styles.header}>
                    <div className={styles.tructiep}><span className={styles.kqxs__title1}>Tường thuật trực tiếp...</span></div>
                    <h1 className={styles.kqxs__title}>XSMT - Kết quả Xổ số Miền Trung - SXMT {today}</h1>
                    <div className={styles.kqxs__action}>
                        <a className={styles.kqxs__actionLink} href="#!">XSMT</a>
                        <a className={`${styles.kqxs__actionLink} ${styles.dayOfWeek}`} href="#!">{liveData[0]?.dayOfWeek}</a>
                        <a className={styles.kqxs__actionLink} href="#!">{today}</a>
                    </div>
                </div>
                <table className={styles.tableXS}>
                    <thead>
                        <tr>
                            <th></th>
                            {liveData.map(stationData => (
                                <th key={stationData.tinh} className={styles.stationName}>
                                    {stationData.tentinh}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className={`${styles.tdTitle} ${styles.highlight}`}>G8</td>
                            {liveData.map(item => (
                                <td key={item.tinh} className={styles.rowXS}>
                                    <span className={`${styles.span4} ${styles.highlight}`}>
                                        {renderPrizeValue(item.tinh, 'eightPrizes_0', 2)}
                                    </span>
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className={styles.tdTitle}>G7</td>
                            {liveData.map(item => (
                                <td key={item.tinh} className={styles.rowXS}>
                                    <span className={styles.span4}>
                                        {renderPrizeValue(item.tinh, 'sevenPrizes_0', 3)}
                                    </span>
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className={styles.tdTitle}>G6</td>
                            {liveData.map(item => (
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
                            {liveData.map(item => (
                                <td key={item.tinh} className={styles.rowXS}>
                                    <span className={`${styles.span3} ${styles.g3}`}>
                                        {renderPrizeValue(item.tinh, 'fivePrizes_0', 4)}
                                    </span>
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className={styles.tdTitle}>G4</td>
                            {liveData.map(item => (
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
                            {liveData.map(item => (
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
                            {liveData.map(item => (
                                <td key={item.tinh} className={styles.rowXS}>
                                    <span className={styles.span1}>
                                        {renderPrizeValue(item.tinh, 'secondPrize_0', 5)}
                                    </span>
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className={styles.tdTitle}>G1</td>
                            {liveData.map(item => (
                                <td key={item.tinh} className={styles.rowXS}>
                                    <span className={styles.span1}>
                                        {renderPrizeValue(item.tinh, 'firstPrize_0', 5)}
                                    </span>
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className={`${styles.tdTitle} ${styles.highlight}`}>ĐB</td>
                            {liveData.map(item => (
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
            <div className={styles.TKe_container}>
                <div className={styles.TKe_content}>
                    <div className={styles.TKe_contentTitle}>
                        <span className={styles.title}>Bảng Lô Tô - </span>
                        <span className={styles.desc}>Miền Trung</span>
                        <span className={styles.dayOfWeek}>{`${liveData[0]?.dayOfWeek} - `}</span>
                        <span className={styles.desc}>{today}</span>
                    </div>
                    <table className={styles.tableKey} style={{ '--num-columns': liveData.length }}>
                        <thead>
                            <tr>
                                <th className={styles.t_h}>Đầu</th>
                                {stationsData.map(station => (
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
                        <span className={styles.dayOfWeek}>{`${liveData[0]?.dayOfWeek} - `}</span>
                        <span className={styles.desc}>{today}</span>
                    </div>
                    <table className={styles.tableKey} style={{ '--num-columns': liveData.length }}>
                        <thead>
                            <tr>
                                <th className={styles.t_h}>Đuôi</th>
                                {stationsData.map(station => (
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
        </div>
    );
};

export default React.memo(LiveResult);