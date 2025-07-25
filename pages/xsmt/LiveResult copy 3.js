import { useState, useEffect, useMemo, useRef } from "react";
import styles from '../../styles/LIVEMT.module.css';
import { getFilteredNumber } from "../../library/utils/filterUtils";
import React from 'react';
import { useLottery } from '../../contexts/LotteryContext';

const LiveResult = React.memo(({ getHeadAndTailNumbers, handleFilterChange, filterTypes, isLiveWindow }) => {
    const lotteryContext = useLottery();
    if (!lotteryContext) {
        console.error('LiveResult must be used within a LotteryProvider');
        return <div className={styles.error}>Lỗi: Component không được bao bọc bởi LotteryProvider</div>;
    }
    const { liveData: contextLiveData, setLiveData, setIsLiveDataComplete } = lotteryContext;
    const [isTodayLoading, setIsTodayLoading] = useState(true);
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const [animatingPrizes, setAnimatingPrizes] = useState({}); // { tinh: prizeType }
    const mountedRef = useRef(false);
    const sseRef = useRef(null);
    const lastDataRef = useRef(null);
    const lastUpdatedRef = useRef({});
    const pollingIntervalRef = useRef(null);
    const closeConnectionTimeoutRef = useRef(null);
    const sessionIdRef = useRef(null);
    const station = 'xsmt';
    const today = new Date().toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).replace(/\//g, '-');
    const maxRetries = 10;
    const retryInterval = 5000;
    const fetchMaxRetries = 2;
    const fetchRetryInterval = 10000;
    const pollingIntervalMs = 5000;
    const sseKeepAliveTimeout = 90000;

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
        0: [
            { tinh: 'kon-tum', tentinh: 'Kon Tum' },
            { tinh: 'khanh-hoa', tentinh: 'Khánh Hòa' },
            { tinh: 'hue', tentinh: 'Thừa Thiên Huế' },
        ],
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
            { tinh: 'binh-dinh', tentinh: 'Bình Định' },
            { tinh: 'quang-tri', tentinh: 'Quảng Trị' },
            { tinh: 'quang-binh', tentinh: 'Quảng Bình' },
        ],
        // 5: [
        //     { tinh: 'gia-lai', tentinh: 'Gia Lai' },
        //     { tinh: 'ninh-thuan', tentinh: 'Ninh Thuận' },
        // ],
        6: [
            { tinh: 'da-nang', tentinh: 'Đà Nẵng' },
            { tinh: 'quang-ngai', tentinh: 'Quảng Ngãi' },
            { tinh: 'dak-nong', tentinh: 'Đắk Nông' },
        ],
    }), []);

    const emptyResult = useMemo(() => {
        const dayOfWeekIndex = new Date().getDay();
        const provinces = provincesByDay[dayOfWeekIndex] || provincesByDay[6];
        return provinces.map(province => ({
            drawDate: today,
            station,
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
        let sessionData = JSON.parse(sessionStorage.getItem(`sseSession:${station}:${today}`));
        if (!sessionData || !sessionData.sessionId || !sessionData.lastConnected || (Date.now() - sessionData.lastConnected > sseKeepAliveTimeout)) {
            sessionIdRef.current = `${Date.now()}${Math.random().toString(36).slice(2)}`;
            sessionData = { sessionId: sessionIdRef.current, lastConnected: Date.now() };
            sessionStorage.setItem(`sseSession:${station}:${today}`, JSON.stringify(sessionData));
            console.log(`New session ID generated: ${sessionIdRef.current}`);
        } else {
            sessionIdRef.current = sessionData.sessionId;
            console.log(`Reusing session ID: ${sessionIdRef.current}`);
        }

        const handleBeforeUnload = () => {
            console.log(`Page reload detected for session ${sessionIdRef.current} at ${new Date().toISOString()}`);
            sessionStorage.setItem(`sseSession:${station}:${today}`, JSON.stringify({
                sessionId: sessionIdRef.current,
                lastConnected: Date.now(),
            }));
        };
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            mountedRef.current = false;
            window.removeEventListener('beforeunload', handleBeforeUnload);
            if (sseRef.current && !pollingIntervalRef.current) {
                console.log(`Scheduling SSE close in ${sseKeepAliveTimeout / 1000}s for session ${sessionIdRef.current}`);
                closeConnectionTimeoutRef.current = setTimeout(() => {
                    if (sseRef.current && !mountedRef.current && !pollingIntervalRef.current) {
                        console.log(`Closing SSE connection after ${sseKeepAliveTimeout / 1000}s for session ${sessionIdRef.current}`);
                        sseRef.current.close();
                        sseRef.current = null;
                        sessionStorage.removeItem(`sseSession:${station}:${today}`);
                    }
                }, sseKeepAliveTimeout);
            }
        };
    }, [station, today]);

    useEffect(() => {
        if (!mountedRef.current) return;

        // Kiểm tra context và liveData
        if (!setLiveData || !setIsLiveDataComplete || !isLiveWindow) {
            setLiveData(emptyResult);
            setIsTodayLoading(true);
            setError(null);
            lastDataRef.current = emptyResult;
            return;
        }

        const fetchInitialData = async (retry = 0) => {
            try {
                const response = await fetch(
                    `http://localhost:5000/api/ketquaxs/xsmt/sse/initial?station=${station}&date=${today.replace(/\//g, '-')}`
                );
                if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                const serverData = await response.json();
                console.log(`Initial data fetched for session ${sessionIdRef.current}:`, serverData);

                const updatedData = emptyResult.map(item => {
                    const serverItem = serverData.find(s => s.tinh === item.tinh) || item;
                    const updatedItem = { ...item };
                    let shouldUpdate = false;
                    for (const key in serverItem) {
                        if (key in prizeDigits && serverItem[key] !== '...' && serverItem[key] !== item[key]) {
                            updatedItem[key] = serverItem[key];
                            shouldUpdate = true;
                        }
                    }
                    if (shouldUpdate) {
                        updatedItem.lastUpdated = serverItem.lastUpdated || Date.now();
                        lastUpdatedRef.current[item.tinh] = updatedItem.lastUpdated;
                        localStorage.setItem(`liveData:${station}:${item.tinh}:${today}`, JSON.stringify(updatedItem));
                    }
                    return updatedItem;
                });

                if (mountedRef.current && JSON.stringify(updatedData) !== JSON.stringify(lastDataRef.current)) {
                    setLiveData(updatedData);
                    lastDataRef.current = updatedData;
                    const isComplete = updatedData.every(item =>
                        Object.keys(prizeDigits).every(key => item[key] !== '...' && item[key] !== '***')
                    );
                    setIsLiveDataComplete(isComplete);
                    setIsTodayLoading(false);
                    setRetryCount(0);
                    setError(null);
                    console.log(`Initial data updated for session ${sessionIdRef.current}:`, updatedData);
                }
            } catch (err) {
                console.error(`Error fetching initial data (retry ${retry + 1}) for session ${sessionIdRef.current}:`, err.message);
                if (retry < fetchMaxRetries) {
                    setTimeout(() => {
                        if (mountedRef.current) {
                            fetchInitialData(retry + 1);
                        }
                    }, fetchRetryInterval);
                } else if (mountedRef.current) {
                    setLiveData(emptyResult);
                    lastDataRef.current = emptyResult;
                    setIsLiveDataComplete(false);
                    setIsTodayLoading(false);
                    setError('Không thể lấy dữ liệu ban đầu, đang dựa vào dữ liệu mặc định...');
                }
            }
        };

        const connectSSE = () => {
            if (!station || !today || !/^\d{2}-\d{2}-\d{4}$/.test(today)) {
                console.warn(`Invalid station or today value for session ${sessionIdRef.current}:`, { station, today });
                if (mountedRef.current) {
                    setError('Dữ liệu không hợp lệ...');
                    setIsTodayLoading(false);
                }
                return;
            }

            const sessionData = JSON.parse(sessionStorage.getItem(`sseSession:${station}:${today}`));
            if (sessionData && sseRef.current && Date.now() - sessionData.lastConnected < sseKeepAliveTimeout) {
                console.log(`Reusing existing SSE connection for session ${sessionIdRef.current}`);
                return;
            }

            if (sseRef.current) {
                console.log(`Closing existing SSE connection for session ${sessionIdRef.current}`);
                sseRef.current.close();
                sseRef.current = null;
            }

            sseRef.current = new EventSource(
                `http://localhost:5000/api/ketquaxs/xsmt/sse?station=${station}&date=${today.replace(/\//g, '-')}`
            );
            console.log(`SSE connection initiated for session ${sessionIdRef.current}, date ${today}`);

            sseRef.current.onopen = () => {
                console.log(`SSE connection opened for session ${sessionIdRef.current}`);
                if (mountedRef.current) {
                    setError(null);
                    if (pollingIntervalRef.current) {
                        console.log(`Stopping polling due to successful SSE connection for session ${sessionIdRef.current}`);
                        clearInterval(pollingIntervalRef.current);
                        pollingIntervalRef.current = null;
                    }
                    sessionStorage.setItem(`sseSession:${station}:${today}`, JSON.stringify({
                        sessionId: sessionIdRef.current,
                        lastConnected: Date.now(),
                    }));
                }
            };

            sseRef.current.onerror = () => {
                console.log(`SSE error, starting polling... Retry count: ${retryCount + 1} for session ${sessionIdRef.current}`);
                if (mountedRef.current) {
                    setError('Mất kết nối trực tiếp, đang sử dụng polling...');
                    startPolling();
                }
                sseRef.current.close();
                sseRef.current = null;
                if (retryCount < maxRetries) {
                    setTimeout(() => {
                        if (mountedRef.current && !pollingIntervalRef.current) {
                            setRetryCount(prev => prev + 1);
                            connectSSE();
                        }
                    }, retryInterval);
                }
            };

            sseRef.current.addEventListener('full', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log(`Received SSE full event (tỉnh ${data.tinh}) for session ${sessionIdRef.current}:`, data);
                    if (data && data.drawDate === today && mountedRef.current) {
                        setLiveData(prev => {
                            const updatedData = prev.map(item => {
                                if (item.tinh !== data.tinh) return item;
                                const hasChanges = Object.keys(prizeDigits).some(key => data[key] !== item[key] && data[key] !== '...');
                                if (!hasChanges) return item;
                                const updatedItem = {
                                    ...item,
                                    ...Object.keys(prizeDigits).reduce((acc, key) => {
                                        acc[key] = data[key] !== undefined && data[key] !== '...' ? data[key] : item[key];
                                        return acc;
                                    }, {}),
                                    tentinh: data.tentinh || item.tentinh,
                                    year: data.year || item.year,
                                    month: data.month || item.month,
                                    drawDate: data.drawDate || item.drawDate,
                                    lastUpdated: data.lastUpdated || Date.now(),
                                };
                                return updatedItem;
                            });
                            lastDataRef.current = updatedData;
                            lastUpdatedRef.current[data.tinh] = data.lastUpdated || Date.now();
                            localStorage.setItem(`liveData:${station}:${data.tinh}:${today}`, JSON.stringify(updatedData.find(item => item.tinh === data.tinh)));
                            const isComplete = updatedData.every(item =>
                                Object.keys(prizeDigits).every(key => item[key] !== '...' && item[key] !== '***')
                            );
                            setIsLiveDataComplete(isComplete);
                            setIsTodayLoading(false);
                            setRetryCount(0);
                            setError(null);
                            console.log(`LiveData updated from SSE full for session ${sessionIdRef.current}:`, updatedData);
                            return updatedData;
                        });
                    }
                } catch (error) {
                    console.error(`Error processing full event for session ${sessionIdRef.current}:`, error);
                }
            });

            sseRef.current.addEventListener('canary', (event) => {
                console.log(`Received canary message for session ${sessionIdRef.current}:`, event.data);
                if (mountedRef.current) {
                    sessionStorage.setItem(`sseSession:${station}:${today}`, JSON.stringify({
                        sessionId: sessionIdRef.current,
                        lastConnected: Date.now(),
                    }));
                }
            });
        };

        const startPolling = () => {
            if (sseRef.current) {
                console.log(`Polling skipped as SSE is active for session ${sessionIdRef.current}`);
                return () => { };
            }

            const isIncomplete = contextLiveData.some(item =>
                Object.keys(prizeDigits).some(key => item[key] === '...' || item[key] === '***')
            );
            if (!isIncomplete) {
                console.log(`Data complete, stopping polling for session ${sessionIdRef.current}`);
                return () => { };
            }

            console.log(`Starting polling for session ${sessionIdRef.current}`);
            pollingIntervalRef.current = setInterval(async () => {
                try {
                    const response = await fetch(
                        `http://localhost:5000/api/ketquaxs/xsmt/sse/initial?station=${station}&date=${today.replace(/\//g, '-')}`
                    );
                    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                    const serverData = await response.json();
                    console.log(`Polling data received for session ${sessionIdRef.current}:`, serverData);

                    if (mountedRef.current) {
                        setLiveData(prev => {
                            const updatedData = prev.map(item => {
                                const serverItem = serverData.find(s => s.tinh === item.tinh) || item;
                                const hasChanges = Object.keys(prizeDigits).some(key => serverItem[key] !== item[key] && serverItem[key] !== '...');
                                if (!hasChanges) return item;
                                const updatedItem = {
                                    ...item,
                                    ...Object.keys(prizeDigits).reduce((acc, key) => {
                                        if (serverItem[key] !== '...' && serverItem[key] !== undefined) {
                                            acc[key] = serverItem[key];
                                        }
                                        return acc;
                                    }, {}),
                                    tentinh: serverItem.tentinh || item.tinh,
                                    year: serverItem.year || item.year,
                                    month: serverItem.month || item.month,
                                    drawDate: serverItem.drawDate || item.drawDate,
                                    lastUpdated: serverItem.lastUpdated || Date.now(),
                                };
                                return updatedItem;
                            });
                            lastDataRef.current = updatedData;
                            serverData.forEach(item => {
                                lastUpdatedRef.current[item.tinh] = item.lastUpdated || Date.now();
                                localStorage.setItem(`liveData:${station}:${item.tinh}:${today}`, JSON.stringify(updatedData.find(d => d.tinh === item.tinh)));
                            });
                            const isComplete = updatedData.every(item =>
                                Object.keys(prizeDigits).every(key => item[key] !== '...' && item[key] !== '***')
                            );
                            setIsLiveDataComplete(isComplete);
                            console.log(`LiveData updated from polling for session ${sessionIdRef.current}:`, updatedData);
                            return updatedData;
                        });
                        setError(null);
                    }
                } catch (error) {
                    console.error(`Polling error for session ${sessionIdRef.current}:`, error);
                    if (mountedRef.current) {
                        setError('Không thể lấy dữ liệu, đang thử lại...');
                    }
                }
            }, pollingIntervalMs);

            return () => {
                if (pollingIntervalRef.current) {
                    console.log(`Clearing polling interval for session ${sessionIdRef.current}`);
                    clearInterval(pollingIntervalRef.current);
                    pollingIntervalRef.current = null;
                }
            };
        };

        fetchInitialData();
        connectSSE();

        return () => {
            console.log(`Cleaning up useEffect for session ${sessionIdRef.current}, isLiveWindow: ${isLiveWindow}`);
            if (closeConnectionTimeoutRef.current) {
                console.log(`Canceling scheduled SSE close for session ${sessionIdRef.current}`);
                clearTimeout(closeConnectionTimeoutRef.current);
                closeConnectionTimeoutRef.current = null;
            }
            if (pollingIntervalRef.current) {
                console.log(`Clearing polling interval during cleanup for session ${sessionIdRef.current}`);
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
        };
    }, [isLiveWindow, station, today, setLiveData, setIsLiveDataComplete, emptyResult]);

    const animationQueue = useMemo(() => [
        'eightPrizes_0', 'sevenPrizes_0',
        'sixPrizes_0', 'sixPrizes_1', 'sixPrizes_2',
        'fivePrizes_0',
        'fourPrizes_0', 'fourPrizes_1', 'fourPrizes_2', 'fourPrizes_3', 'fourPrizes_4', 'fourPrizes_5', 'fourPrizes_6',
        'threePrizes_0', 'threePrizes_1',
        'secondPrize_0', 'firstPrize_0', 'specialPrize_0'
    ], []);

    useEffect(() => {
        const newAnimatingPrizes = { ...animatingPrizes };
        let hasChanges = false;

        if (Array.isArray(contextLiveData) && contextLiveData.length > 0) {
            contextLiveData.forEach(stationData => {
                const currentPrize = animatingPrizes[stationData.tinh];
                if (!currentPrize || stationData[currentPrize] !== '...') {
                    const nextPrize = animationQueue.find(prize => stationData[prize] === '...') || null;
                    if (newAnimatingPrizes[stationData.tinh] !== nextPrize) {
                        newAnimatingPrizes[stationData.tinh] = nextPrize;
                        hasChanges = true;
                    }
                }
            });
        }

        if (hasChanges) {
            setAnimatingPrizes(newAnimatingPrizes);
        }
    }, [contextLiveData, animationQueue, animatingPrizes]);

    const renderPrizeValue = useMemo(() => {
        return (tinh, prizeType, digits = 5) => {
            const isAnimating = animatingPrizes[tinh] === prizeType && contextLiveData.find(item => item.tinh === tinh)?.[prizeType] === '...';
            const className = `${styles.running_number} ${styles[`running_${digits}`]}`;
            const prizeValue = contextLiveData.find(item => item.tinh === tinh)?.[prizeType] || '...';
            const filteredValue = getFilteredNumber(prizeValue, filterTypes[today + station] || 'all');
            const displayDigits = filterTypes[today + station] === 'last2' ? 2 : filterTypes[today + station] === 'last3' ? 3 : digits;
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
    }, [contextLiveData, animatingPrizes, filterTypes, station, today]);

    const tableKey = today + station;
    const currentFilter = filterTypes[tableKey] || 'all';

    const { allHeads, allTails, stationsData } = useMemo(() => {
        if (!Array.isArray(contextLiveData) || contextLiveData.length === 0) {
            return { allHeads: Array(10).fill().map(() => []), allTails: Array(10).fill().map(() => []), stationsData: [] };
        }

        const allHeads = Array(10).fill().map(() => []);
        const allTails = Array(10).fill().map(() => []);
        const stationsData = contextLiveData.map(stationData => {
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

            for (let i = 0; i < 10; i++) {
                allHeads[i].push(heads[i]);
                allTails[i].push(tails[i]);
            }
            return { tentinh: stationData.tentinh, station: stationData.station, tinh: stationData.tinh };
        });
        return { allHeads, allTails, stationsData };
    }, [contextLiveData]);

    if (!Array.isArray(contextLiveData) || !contextLiveData.length) {
        return <div className={styles.error}>Đang tải dữ liệu...</div>;
    }

    return (
        <div className={styles.containerKQs}>
            {error && <div className={styles.error}>{error}</div>}
            {isTodayLoading && (
                <div className={styles.loading}>Đang chờ kết quả ngày {today}...</div>
            )}
            <div className={styles.kqxs} style={{ '--num-columns': contextLiveData.length }}>
                <div className={styles.header}>
                    <div className={styles.tructiep}><span className={styles.kqxs__title1}>Tường thuật trực tiếp...</span></div>
                    <h1 className={styles.kqxs__title}>XSMT - Kết quả Xổ số Miền Trung - SXMT {today}</h1>
                    <div className={styles.kqxs__action}>
                        <a className={styles.kqxs__actionLink} href="#!">XSMT</a>
                        <a className={`${styles.kqxs__actionLink} ${styles.dayOfWeek}`} href="#!">{contextLiveData[0]?.dayOfWeek}</a>
                        <a className={styles.kqxs__actionLink} href="#!">{today}</a>
                    </div>
                </div>
                <table className={styles.tableXS}>
                    <thead>
                        <tr>
                            <th></th>
                            {contextLiveData.map(stationData => (
                                <th key={stationData.tinh} className={styles.stationName}>
                                    {stationData.tentinh}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className={`${styles.tdTitle} ${styles.highlight}`}>G8</td>
                            {contextLiveData.map(item => (
                                <td key={item.tinh} className={styles.rowXS}>
                                    <span className={`${styles.span4} ${styles.highlight}`}>
                                        {renderPrizeValue(item.tinh, 'eightPrizes_0', 2)}
                                    </span>
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className={styles.tdTitle}>G7</td>
                            {contextLiveData.map(item => (
                                <td key={item.tinh} className={styles.rowXS}>
                                    <span className={styles.span4}>
                                        {renderPrizeValue(item.tinh, 'sevenPrizes_0', 3)}
                                    </span>
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className={styles.tdTitle}>G6</td>
                            {contextLiveData.map(item => (
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
                            {contextLiveData.map(item => (
                                <td key={item.tinh} className={styles.rowXS}>
                                    <span className={`${styles.span3} ${styles.g3}`}>
                                        {renderPrizeValue(item.tinh, 'fivePrizes_0', 4)}
                                    </span>
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className={styles.tdTitle}>G4</td>
                            {contextLiveData.map(item => (
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
                            {contextLiveData.map(item => (
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
                            {contextLiveData.map(item => (
                                <td key={item.tinh} className={styles.rowXS}>
                                    <span className={styles.span1}>
                                        {renderPrizeValue(item.tinh, 'secondPrize_0', 5)}
                                    </span>
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className={styles.tdTitle}>G1</td>
                            {contextLiveData.map(item => (
                                <td key={item.tinh} className={styles.rowXS}>
                                    <span className={styles.span1}>
                                        {renderPrizeValue(item.tinh, 'firstPrize_0', 5)}
                                    </span>
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className={`${styles.tdTitle} ${styles.highlight}`}>ĐB</td>
                            {contextLiveData.map(item => (
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
                        <span className={styles.dayOfWeek}>{`${contextLiveData[0]?.dayOfWeek} - `}</span>
                        <span className={styles.desc}>{today}</span>
                    </div>
                    <table className={styles.tableKey} style={{ '--num-columns': contextLiveData.length }}>
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
                        <span className={styles.dayOfWeek}>{`${contextLiveData[0]?.dayOfWeek} - `}</span>
                        <span className={styles.desc}>{today}</span>
                    </div>
                    <table className={styles.tableKey} style={{ '--num-columns': contextLiveData.length }}>
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
});

export default LiveResult;
// Cần test cho 25/7