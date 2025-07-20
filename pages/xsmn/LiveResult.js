import { useState, useEffect, useMemo, useRef } from "react";
import styles from '../../styles/LIVEMN.module.css';
import { getFilteredNumber } from "../../library/utils/filterUtils";
import React from 'react';
import { useLottery } from '../../contexts/LotteryContext';
import ViewCounter from "../views/ViewCounter";

const LiveResult = ({ station, today, getHeadAndTailNumbers, handleFilterChange, filterTypes, isLiveWindow }) => {
    const { liveData, setLiveData, setIsLiveDataComplete } = useLottery() || { liveData: null, setLiveData: null, setIsLiveDataComplete: null };
    const [isTodayLoading, setIsTodayLoading] = useState(true);
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const [animatingPrizes, setAnimatingPrizes] = useState({}); // { tinh: prizeType }
    const mountedRef = useRef(false);
    const sseRefs = useRef({}); // { tinh: EventSource }

    const maxRetries = 50;
    const retryInterval = 2000;
    const fetchMaxRetries = 3;
    const fetchRetryInterval = 5000;
    const pollingIntervalMs = 2000;
    const regularPollingIntervalMs = 7000;

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
        const dayOfWeekIndex = new Date().getDay();
        const provinces = provincesByDay[dayOfWeekIndex] || provincesByDay[6];
        return provinces.map(province => ({
            drawDate: today,
            station: station,
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
    }, [today, station]);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            Object.values(sseRefs.current).forEach(sse => {
                console.log('Đóng kết nối SSE...');
                sse.close();
            });
            sseRefs.current = {};
        };
    }, []);

    useEffect(() => {
        if (!setLiveData || !setIsLiveDataComplete || !isLiveWindow) {
            setLiveData(emptyResult);
            setIsTodayLoading(true);
            setError(null);
            return;
        }

        let pollingInterval;

        const fetchInitialData = async (retry = 0) => {
            try {
                const dayOfWeekIndex = new Date().getDay();
                const provinces = provincesByDay[dayOfWeekIndex] || provincesByDay[6];
                const results = await Promise.all(
                    provinces.map(async (province) => {
                        const cachedData = localStorage.getItem(`liveData:${station}:${province.tinh}:${today}`);
                        let initialData = cachedData ? JSON.parse(cachedData) : {
                            ...emptyResult.find(item => item.tinh === province.tinh),
                            lastUpdated: 0,
                        };

                        try {
                            const response = await fetch(
                                `https://backendkqxs-1.onrender.com/api/ketqua/xsmn/sse/initial?station=${station}&tinh=${province.tinh}&date=${today.replace(/\//g, '-')}`
                            );
                            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                            const serverData = await response.json();
                            console.log(`Dữ liệu từ /initial cho ${province.tinh}:`, serverData);

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
                            console.error(`Lỗi khi lấy dữ liệu ban đầu cho ${province.tinh} (lần ${retry + 1}):`, err.message);
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
                console.error('Lỗi khi lấy dữ liệu ban đầu:', err.message);
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
                        return cachedData ? JSON.parse(cachedData) : emptyResult.find(item => item.tinh === province.tinh);
                    });
                    setLiveData(results);
                    setIsLiveDataComplete(false);
                    setIsTodayLoading(false);
                    setError('Không thể lấy dữ liệu ban đầu, đang dựa vào dữ liệu cục bộ...');
                }
            }
        };

        const connectSSE = () => {
            const dayOfWeekIndex = new Date().getDay();
            const provinces = provincesByDay[dayOfWeekIndex] || provincesByDay[6];

            provinces.forEach(province => {
                if (!station || !today || !/^\d{2}-\d{2}-\d{4}$/.test(today)) {
                    console.warn('Invalid station or today value:', { station, today });
                    if (mountedRef.current) {
                        setError('Dữ liệu đang tải...');
                        setIsTodayLoading(false);
                    }
                    return;
                }

                if (sseRefs.current[province.tinh]) {
                    sseRefs.current[province.tinh].close();
                }

                sseRefs.current[province.tinh] = new EventSource(
                    `https://backendkqxs-1.onrender.com/api/ketqua/xsmn/sse?station=${station}&tinh=${province.tinh}&date=${today.replace(/\//g, '-')}`
                );
                console.log(`Khởi tạo kết nối SSE cho tỉnh ${province.tinh}, ngày: ${today}`);

                sseRefs.current[province.tinh].onopen = () => {
                    console.log(`SSE connection opened for ${province.tinh}`);
                    if (mountedRef.current) {
                        setError(null);
                    }
                };

                sseRefs.current[province.tinh].onerror = () => {
                    console.log(`SSE error for ${province.tinh}, reconnecting... Retry count: ${retryCount + 1}`);
                    if (mountedRef.current) {
                        setError('Đang kết nối lại...');
                    }
                    sseRefs.current[province.tinh].close();
                    sseRefs.current[province.tinh] = null;
                    if (retryCount < maxRetries) {
                        setTimeout(() => {
                            if (mountedRef.current) {
                                setRetryCount(prev => prev + 1);
                                connectSSE();
                            }
                        }, retryInterval);
                    } else if (mountedRef.current) {
                        setError('Mất kết nối trực tiếp, đang sử dụng polling...');
                    }
                };

                const prizeTypes = [
                    'specialPrize_0', 'firstPrize_0', 'secondPrize_0',
                    'threePrizes_0', 'threePrizes_1',
                    'fourPrizes_0', 'fourPrizes_1', 'fourPrizes_2', 'fourPrizes_3', 'fourPrizes_4', 'fourPrizes_5', 'fourPrizes_6',
                    'fivePrizes_0',
                    'sixPrizes_0', 'sixPrizes_1', 'sixPrizes_2',
                    'sevenPrizes_0', 'eightPrizes_0'
                ];

                prizeTypes.forEach(prizeType => {
                    sseRefs.current[province.tinh].addEventListener(prizeType, (event) => {
                        try {
                            const data = JSON.parse(event.data);
                            console.log(`Nhận sự kiện SSE: ${prizeType} = ${data[prizeType]} (tỉnh ${province.tinh})`, data);
                            if (data && data[prizeType] && mountedRef.current) {
                                setLiveData(prev => {
                                    const updatedData = prev.map(item => {
                                        if (item.tinh !== province.tinh) return item;
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
                                        localStorage.setItem(`liveData:${station}:${province.tinh}:${today}`, JSON.stringify(updatedItem));
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
                            }
                        } catch (error) {
                            console.error(`Lỗi xử lý sự kiện ${prizeType} (tỉnh ${province.tinh}):`, error);
                        }
                    });
                });

                sseRefs.current[province.tinh].addEventListener('full', (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        console.log(`Nhận sự kiện SSE full (tỉnh ${province.tinh}):`, data);
                        if (data && mountedRef.current) {
                            setLiveData(prev => {
                                const updatedData = prev.map(item => {
                                    if (item.tinh !== province.tinh) return item;
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
                                        localStorage.setItem(`liveData:${station}:${province.tinh}:${today}`, JSON.stringify(updatedItem));
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
                        }
                    } catch (error) {
                        console.error(`Lỗi xử lý sự kiện full (tỉnh ${province.tinh}):`, error);
                    }
                });

                sseRefs.current[province.tinh].addEventListener('canary', (event) => {
                    console.log(`Received canary message for ${province.tinh}:`, event.data);
                });
            });
        };

        const startPolling = () => {
            const poll = () => {
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
                                const response = await fetch(
                                    `https://backendkqxs-1.onrender.com/api/ketqua/xsmn/sse/initial?station=${station}&tinh=${province.tinh}&date=${today.replace(/\//g, '-')}`
                                );
                                if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                                const serverData = await response.json();
                                console.log(`Dữ liệu từ polling cho ${province.tinh}:`, serverData);
                                return { province: province.tinh, data: serverData };
                            })
                        );

                        if (mountedRef.current) {
                            setLiveData(prev => {
                                const currentData = Array.isArray(prev) && prev.length > 0 ? prev : emptyResult;
                                const updatedData = currentData.map(item => {
                                    const serverData = results.find(r => r.province === item.tinh)?.data;
                                    if (!serverData) return item;
                                    const updatedItem = { ...item };
                                    let shouldUpdate = !item.lastUpdated || serverData.lastUpdated > item.lastUpdated;
                                    for (const key in serverData) {
                                        if (serverData[key] !== '...' || !updatedItem[key] || updatedItem[key] === '...' || updatedItem[key] === '***') {
                                            updatedItem[key] = serverData[key];
                                            shouldUpdate = true;
                                        }
                                    }
                                    if (shouldUpdate) {
                                        updatedItem.lastUpdated = serverData.lastUpdated || Date.now();
                                        localStorage.setItem(`liveData:${station}:${item.tinh}:${today}`, JSON.stringify(updatedItem));
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
                        }
                    } catch (error) {
                        console.error('Lỗi khi polling dữ liệu:', error);
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
        };

        if (!Array.isArray(liveData)) {
            setLiveData(emptyResult);
        }

        fetchInitialData();
        connectSSE();
        startPolling();

        return () => {
            Object.values(sseRefs.current).forEach(sse => {
                console.log('Đóng kết nối SSE trong cleanup...');
                sse.close();
            });
            sseRefs.current = {};
            if (pollingInterval) {
                clearTimeout(pollingInterval);
            }
        };
    }, [isLiveWindow, station, today, setLiveData, setIsLiveDataComplete, provincesByDay, emptyResult]);

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
    }, [liveData, animatingPrizes]);

    if (!liveData || !liveData.length) {
        return <div className={styles.error}>Đang tải dữ liệu...</div>;
    }

    const tableKey = today + station;
    const currentFilter = filterTypes[tableKey] || 'all';

    const getPrizeNumbers = (stationData) => {
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
    };

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

    const renderPrizeValue = (tinh, prizeType, digits = 5) => {
        const isAnimating = animatingPrizes[tinh] === prizeType && liveData.find(item => item.tinh === tinh)?.[prizeType] === '...';
        const className = `${styles.running_number} ${styles[`running_${digits}`]}`;

        return (
            <span className={className} data-status={isAnimating ? 'animating' : 'static'}>
                {isAnimating ? (
                    <span className={styles.digit_container}>
                        {Array.from({ length: digits }).map((_, i) => (
                            <span key={i} className={styles.digit} data-status="animating" data-index={i}></span>
                        ))}
                    </span>
                ) : liveData.find(item => item.tinh === tinh)?.[prizeType] === '...' ? (
                    <span className={styles.ellipsis}></span>
                ) : (
                    <span className={styles.digit_container}>
                        {getFilteredNumber(liveData.find(item => item.tinh === tinh)?.[prizeType] || '...', currentFilter)
                            .padStart(digits, '0')
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
    };

    return (
        <div className={styles.containerKQs}>
            {error && <div className={styles.error}>{error}</div>}
            {isTodayLoading && (
                <div className={styles.loading}>Đang chờ kết quả ngày {today}...</div>
            )}
            <div className={styles.kqxs} style={{ '--num-columns': liveData.length }}>
                <div className={styles.header}>
                    <div className={styles.tructiep}><span className={styles.kqxs__title1}>Tường thuật trực tiếp...</span><ViewCounter /></div>
                    <h1 className={styles.kqxs__title}>XSMN - Kết quả Xổ số Miền Nam - SXMN {today}</h1>
                    <div className={styles.kqxs__action}>
                        <a className={styles.kqxs__actionLink} href="#!">XSMN</a>
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
                        <span className={styles.desc}>Miền Nam</span>
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
                        <span className={styles.desc}>Miền Nam</span>
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