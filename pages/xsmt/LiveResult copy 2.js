import { useState, useEffect, useMemo, useRef } from "react";
import styles from '../../styles/LIVEMT.module.css';
import { getFilteredNumber } from "../../library/utils/filterUtils";
import React from 'react';
import { useLottery } from '../../contexts/LotteryContext';

const LiveResult = ({ getHeadAndTailNumbers, handleFilterChange, filterTypes, isLiveWindow }) => {
    const { liveData, setLiveData, setIsLiveDataComplete } = useLottery() || {
        liveData: null,
        setLiveData: () => console.warn('setLiveData not available'),
        setIsLiveDataComplete: () => console.warn('setIsLiveDataComplete not available'),
    };
    const [isTodayLoading, setIsTodayLoading] = useState(true);
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const [animatingPrizes, setAnimatingPrizes] = useState({});
    const [isSSEConnected, setIsSSEConnected] = useState({}); // Trạng thái kết nối SSE cho từng tỉnh
    const mountedRef = useRef(false);
    const sseRefs = useRef({});
    const pollingIntervalRef = useRef(null);
    const station = 'xsmt';
    const today = new Date().toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).replace(/\//g, '-');


    const maxRetries = 50;
    const retryInterval = 2000;
    const fetchMaxRetries = 3;
    const fetchRetryInterval = 5000;
    const pollingIntervalMs = 5000;

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
            if (pollingIntervalRef.current) {
                clearTimeout(pollingIntervalRef.current);
            }
        };
    }, []);

    useEffect(() => {
        console.log('useEffect triggered with:', { station, today });

        if (!setLiveData || !setIsLiveDataComplete || !isLiveWindow) {
            setTimeout(() => {
                if (mountedRef.current) {
                    setLiveData(emptyResult);
                    setIsTodayLoading(true);
                    setError(null);
                }
            }, 0);
            return;
        }

        if (!station || !today || !/^\d{2}-\d{2}-\d{4}$/.test(today)) {
            setTimeout(() => {
                if (mountedRef.current) {
                    console.warn('Invalid station or today value before connectSSE:', { station, today });
                    setError('Dữ liệu không hợp lệ: Ngày phải có định dạng DD-MM-YYYY');
                    setIsTodayLoading(false);
                }
            }, 0);
            return;
        }

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
                                `http://localhost:5000/api/ketquaxs/xsmt/sse/initial?station=${station}&tinh=${province.tinh}&date=${today}`
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

        const startPolling = (province) => {
            if (!mountedRef.current || isSSEConnected[province]) {
                console.log(`Không kích hoạt polling cho ${province} vì SSE đang hoạt động hoặc component unmounted`);
                return;
            }

            const poll = async () => {
                try {
                    const response = await fetch(
                        `http://localhost:5000/api/ketquaxs/xsmt/sse/initial?station=${station}&tinh=${province}&date=${today}`
                    );
                    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                    const serverData = await response.json();
                    console.log(`Dữ liệu từ polling cho ${province}:`, serverData);

                    if (mountedRef.current) {
                        setLiveData(prev => {
                            const currentData = Array.isArray(prev) && prev.length > 0 ? prev : emptyResult;
                            let shouldUpdate = false;
                            const updatedData = currentData.map(item => {
                                if (item.tinh !== province) return item;
                                const { lastUpdated, ...serverDataWithoutTimestamp } = serverData;
                                const { lastUpdated: currentLastUpdated, ...itemWithoutTimestamp } = item;
                                if (JSON.stringify(serverDataWithoutTimestamp) === JSON.stringify(itemWithoutTimestamp)) {
                                    console.log(`Bỏ qua polling cho ${item.tinh} vì dữ liệu giống hệt`);
                                    return item;
                                }
                                if (serverData.lastUpdated && item.lastUpdated >= serverData.lastUpdated) {
                                    console.log(`Bỏ qua polling cho ${item.tinh} vì dữ liệu không mới hơn: server lastUpdated=${serverData.lastUpdated}, current lastUpdated=${item.lastUpdated}`);
                                    return item;
                                }
                                const updatedItem = { ...item };
                                for (const key in serverData) {
                                    if (serverData[key] !== '...' && item[key] !== serverData[key]) {
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

                            if (!shouldUpdate) {
                                console.log('Không cập nhật liveData từ polling vì không có thay đổi');
                                return prev;
                            }

                            const isComplete = updatedData.every(item =>
                                Object.values(item).every(val => typeof val === 'string' && val !== '...' && val !== '***')
                            );
                            setTimeout(() => {
                                if (mountedRef.current) {
                                    setIsLiveDataComplete?.(isComplete);
                                    setError(null);
                                }
                            }, 0);
                            console.log('Cập nhật liveData từ polling:', updatedData);
                            return updatedData;
                        });
                    }
                } catch (error) {
                    console.error(`Lỗi khi polling dữ liệu cho ${province}:`, error);
                    if (mountedRef.current) {
                        setTimeout(() => {
                            setError(`Không thể lấy dữ liệu cho ${province}, đang thử lại...`);
                        }, 0);
                    }
                }
                if (mountedRef.current && !isSSEConnected[province]) {
                    pollingIntervalRef.current = setTimeout(() => poll(), pollingIntervalMs);
                }
            };

            poll();
        };

        const connectSSE = () => {
            const dayOfWeekIndex = new Date().getDay();
            const provinces = provincesByDay[dayOfWeekIndex] || provincesByDay[6];

            const sources = provinces.map(province => {
                const source = new EventSource(
                    `http://localhost:5000/api/ketquaxs/xsmt/sse?station=${station}&date=${today}&tinh=${province.tinh}`
                );
                console.log(`Kết nối SSE cho tỉnh ${province.tinh}, URL: http://localhost:5000/api/ketquaxs/xsmt/sse?station=${station}&date=${today}&tinh=${province.tinh}`);
                sseRefs.current[province.tinh] = source;

                source.onmessage = event => {
                    if (!mountedRef.current) return;
                    console.log(`[Frontend] Nhận dữ liệu thô từ SSE cho tỉnh ${province.tinh}:`, event.data);
                    try {
                        const data = JSON.parse(event.data);
                        console.log(`[Frontend] Nhận sự kiện SSE: ${data.prizeType || 'full'} (tỉnh ${data.tinh})`, data);

                        if (data.prizeType === 'full') {
                            setLiveData(prev => {
                                const currentData = Array.isArray(prev) && prev.length > 0 ? prev : emptyResult;
                                const updatedData = currentData.map(item => {
                                    if (item.tinh !== data.tinh) return item;
                                    if (data.lastUpdated && item.lastUpdated >= data.lastUpdated) {
                                        console.log(`[Frontend] Bỏ qua cập nhật SSE full cho ${item.tinh} vì dữ liệu không mới hơn: server lastUpdated=${data.lastUpdated}, current lastUpdated=${item.lastUpdated}`);
                                        return item;
                                    }
                                    const updatedItem = { ...item, ...data, lastUpdated: data.lastUpdated || Date.now() };
                                    localStorage.setItem(`liveData:${station}:${item.tinh}:${today}`, JSON.stringify(updatedItem));
                                    console.log(`[Frontend] Cập nhật liveData từ SSE full cho ${item.tinh}:`, updatedItem);
                                    return updatedItem;
                                });
                                return updatedData;
                            });
                        } else {
                            setLiveData(prev => {
                                const currentData = Array.isArray(prev) && prev.length > 0 ? prev : emptyResult;
                                let shouldUpdate = false;
                                const updatedData = currentData.map(item => {
                                    if (item.tinh !== data.tinh) return item;
                                    const prizeValue = data.value || data[data.prizeType];
                                    if (!prizeValue || (item[data.prizeType] === prizeValue && item.lastUpdated >= data.lastUpdated)) {
                                        console.log(`[Frontend] Bỏ qua cập nhật ${data.prizeType} cho ${item.tinh} vì giá trị không thay đổi hoặc không mới hơn: ${prizeValue}, server lastUpdated=${data.lastUpdated}, current lastUpdated=${item.lastUpdated}`);
                                        return item;
                                    }
                                    shouldUpdate = true;
                                    const updatedItem = {
                                        ...item,
                                        [data.prizeType]: prizeValue,
                                        lastUpdated: data.lastUpdated || Date.now(),
                                    };
                                    localStorage.setItem(`liveData:${station}:${item.tinh}:${today}`, JSON.stringify(updatedItem));
                                    console.log(`[Frontend] Cập nhật liveData từ SSE cho ${data.prizeType} của ${item.tinh}:`, updatedItem);
                                    return updatedItem;
                                });
                                if (!shouldUpdate) {
                                    console.log(`[Frontend] Không cập nhật liveData vì không có thay đổi cho ${data.prizeType}`);
                                    return prev;
                                }
                                return updatedData;
                            });
                        }

                        setTimeout(() => {
                            if (mountedRef.current) {
                                const isComplete = liveData.every(item =>
                                    Object.values(item).every(val => typeof val === 'string' && val !== '...' && val !== '***')
                                );
                                setIsLiveDataComplete?.(isComplete);
                                console.log(`[Frontend] Kiểm tra trạng thái hoàn chỉnh: isComplete=${isComplete}`);
                            }
                        }, 0);
                    } catch (error) {
                        console.error(`[Frontend] Lỗi phân tích dữ liệu SSE cho tỉnh ${province.tinh}:`, error.message, event.data);
                    }
                };

                source.onopen = () => {
                    console.log(`[Frontend] Kết nối SSE mở thành công cho tỉnh ${province.tinh}`);
                    if (mountedRef.current) {
                        setIsSSEConnected(prev => ({ ...prev, [province.tinh]: true }));
                        if (pollingIntervalRef.current) {
                            clearTimeout(pollingIntervalRef.current);
                            pollingIntervalRef.current = null;
                            console.log(`[Frontend] Ngừng polling cho ${province.tinh} vì SSE đã kết nối`);
                        }
                    }
                };

                source.onerror = (error) => {
                    console.error(`[Frontend] Lỗi kết nối SSE cho tỉnh ${province.tinh}:`, error);
                    if (mountedRef.current) {
                        setIsSSEConnected(prev => ({ ...prev, [province.tinh]: false }));
                        setTimeout(() => {
                            setError(`Mất kết nối SSE với tỉnh ${province.tinh}, chuyển sang polling...`);
                            startPolling(province.tinh);
                        }, 0);
                    }
                };

                return { source, province: province.tinh };
            });

            return () => {
                sources.forEach(({ source, province }) => {
                    source.close();
                    console.log(`Đóng kết nối SSE cho tỉnh ${province}`);
                    setIsSSEConnected(prev => ({ ...prev, [province]: false }));
                });
                sseRefs.current = {};
            };
        };

        fetchInitialData();
        const cleanupSSE = connectSSE();

        return () => {
            console.log('Cleaning up useEffect...');
            cleanupSSE();
            if (pollingIntervalRef.current) {
                clearTimeout(pollingIntervalRef.current);
            }
        };
    }, [isLiveWindow, station, today, setLiveData, setIsLiveDataComplete, provincesByDay, emptyResult]);

    useEffect(() => {
        if (!liveData || !liveData.length) {
            setTimeout(() => {
                if (mountedRef.current) {
                    setAnimatingPrizes({});
                }
            }, 0);
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
                setTimeout(() => {
                    if (mountedRef.current) {
                        setAnimatingPrizes(prev => ({
                            ...prev,
                            [stationData.tinh]: nextPrize
                        }));
                    }
                }, 0);
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
        const prizeValue = liveData.find(item => item.tinh === tinh)?.[prizeType] || '...';
        const filteredValue = getFilteredNumber(prizeValue, currentFilter);
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
    };

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
// cần test 24/7