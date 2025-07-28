import { useState, useEffect, useMemo, useRef, useDeferredValue, useContext } from 'react';
import styles from '../../styles/LIVEMT.module.css';
import { getFilteredNumber } from '../../library/utils/filterUtils';
import React from 'react';
import { useLottery } from '../../contexts/LotteryContext';
import { FilterContext } from '../../contexts/FilterContext';

const usePrizeAnimation = (tinh, prizeType, digits, isAnimating, renderPrizeValue) => {
    const animationFrameRef = useRef(null);

    useEffect(() => {
        if (!isAnimating) {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
            return;
        }

        const animate = () => {
            const elements = document.querySelectorAll(
                `.${styles.digit}[data-status="animating"][data-tinh="${tinh}"][data-prize="${prizeType}"]`
            );
            elements.forEach(el => {
                el.classList.add(styles.animate);
            });
            animationFrameRef.current = requestAnimationFrame(animate);
        };

        animationFrameRef.current = requestAnimationFrame(animate);
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
        };
    }, [isAnimating, tinh, prizeType]);

    return renderPrizeValue(tinh, prizeType, digits);
};

const PrizeCell = React.memo(({ tinh, prizeType, digits, renderPrizeValue, isAnimating }) => (
    <span className={styles.span4}>
        {usePrizeAnimation(tinh, prizeType, digits, isAnimating, renderPrizeValue)}
    </span>
));

const LotteryTable = React.memo(({ liveData, today, station }) => {
    const { allHeads, allTails, stationsData } = useMemo(() => {
        if (!Array.isArray(liveData) || liveData.length === 0) {
            return { allHeads: Array(10).fill().map(() => []), allTails: Array(10).fill().map(() => []), stationsData: [] };
        }

        const allHeads = Array(10).fill().map(() => []);
        const allTails = Array(10).fill().map(() => []);
        const stationsData = liveData.map(stationData => {
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
    }, [liveData]);

    return (
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
                                                <span key={numIdx} className={item.isEighth || item.isSpecial ? styles.highlight1 : ''}>
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
                                                <span key={numIdx} className={item.isEighth || item.isSpecial ? styles.highlight1 : ''}>
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
    );
});

let globalSSE = null;
const getSharedSSE = (station, date, sessionId) => {
    if (!globalSSE || globalSSE.readyState === 2) {
        globalSSE = new EventSource(
            `https://backendkqxs-1.onrender.com/api/ketquaxs/xsmt/sse?station=${station}&date=${date}&clientId=${sessionId}`
        );
        globalSSE.onerror = () => {
            console.log(`SSE error for session ${sessionId}, closing and cleaning up`);
            if (globalSSE) {
                globalSSE.close();
                globalSSE = null;
            }
        };
    } else if (globalSSE.readyState === 0) {
        console.log(`SSE connection for session ${sessionId} is still connecting, waiting...`);
    } else {
        console.log(`Reusing existing SSE connection for session ${sessionId}`);
    }
    return globalSSE;
};

const LiveResult = React.memo(({ isLiveWindow = true }) => {
    const animationQueue = useMemo(
        () => [
            'eightPrizes_0',
            'sevenPrizes_0',
            'sixPrizes_0',
            'sixPrizes_1',
            'sixPrizes_2',
            'fivePrizes_0',
            'fourPrizes_0',
            'fourPrizes_1',
            'fourPrizes_2',
            'fourPrizes_3',
            'fourPrizes_4',
            'fourPrizes_5',
            'fourPrizes_6',
            'threePrizes_0',
            'threePrizes_1',
            'secondPrize_0',
            'firstPrize_0',
            'specialPrize_0',
        ],
        []
    );
    const lotteryContext = useLottery();
    if (!lotteryContext) {
        console.error('LiveResult must be used within a LotteryProvider');
        return <div className={styles.error}>Lỗi: Component không được bao bọc bởi LotteryProvider</div>;
    }
    const { liveData: contextLiveData, setLiveData, setIsLiveDataComplete } = lotteryContext;
    const deferredLiveData = useDeferredValue(contextLiveData);
    const [isTodayLoading, setIsTodayLoading] = useState(true);
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const [animatingPrizes, setAnimatingPrizes] = useState({});
    const mountedRef = useRef(false);
    const sseRef = useRef(null);
    const lastDataRef = useRef(null);
    const lastUpdatedRef = useRef({});
    const pollingIntervalRef = useRef(null);
    const sessionIdRef = useRef(null);
    const station = 'xsmt';
    const today = new Date().toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).replace(/\//g, '-');
    const maxRetries = 15;
    const retryInterval = 1000;
    const fetchMaxRetries = 2;
    const fetchRetryInterval = 1000;
    const pollingIntervalMs = 2000;
    const sseKeepAliveTimeout = 150000;

    const { filterTypes, handleFilterChange } = useContext(FilterContext);

    const prizeDigits = useMemo(
        () => ({
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
        }),
        []
    );

    const provincesByDay = useMemo(
        () => ({
            1: [
                { tinh: 'kon-tum', tentinh: 'Kon Tum' },
                { tinh: 'khanh-hoa', tentinh: 'Khánh Hòa' },
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
        }),
        []
    );

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
        const beforeUnloadHandler = () => {
            console.log(`Page unload for session ${sessionIdRef.current}`);
            sessionStorage.setItem(
                `sseSession:${station}:${today}`,
                JSON.stringify({
                    sessionId: sessionIdRef.current,
                    lastConnected: Date.now(),
                    lastUpdated: lastUpdatedRef.current,
                })
            );
        };

        // Tạo sessionId mới
        sessionIdRef.current = `${Date.now()}${Math.random().toString(36).slice(2)}`;
        console.log(`New session ID generated: ${sessionIdRef.current}`);

        // Gọi fetchInitialData song song ngay khi mount
        const fetchInitialData = async (specificTinh = null) => {
            try {
                const provincesToFetch = specificTinh
                    ? emptyResult.filter(item => item.tinh === specificTinh)
                    : emptyResult;
                const fetchPromises = provincesToFetch.map(item =>
                    fetch(
                        `https://backendkqxs-1.onrender.com/api/ketquaxs/xsmt/sse/initial?station=${station}&date=${today.replace(/\//g, '-')}&tinh=${item.tinh}`,
                        { mode: 'cors' }
                    ).then(res => {
                        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
                        return res.json();
                    })
                );
                const serverDataArray = await Promise.all(fetchPromises);
                if (!mountedRef.current) return;

                setLiveData(prev => {
                    const updatedData = prev.map(item => {
                        const serverItem = serverDataArray.find(s => s.tinh === item.tinh) || item;
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
                        }
                        return updatedItem;
                    });
                    lastDataRef.current = updatedData;
                    const isComplete = updatedData.every(item =>
                        Object.keys(prizeDigits).every(key => item[key] !== '...' && item[key] !== '***')
                    );
                    setIsLiveDataComplete(isComplete);
                    setIsTodayLoading(false);
                    setRetryCount(0);
                    setError(null);
                    console.log(`Initial data updated for session ${sessionIdRef.current}:`, updatedData);
                    return updatedData;
                });

                const initialAnimatingPrizes = serverDataArray.reduce((acc, item) => {
                    const nextPrize = animationQueue.find(prize => item[prize] === '...') || null;
                    acc[item.tinh] = nextPrize;
                    return acc;
                }, {});
                setAnimatingPrizes(initialAnimatingPrizes);
            } catch (err) {
                console.error(`Error fetching initial data for session ${sessionIdRef.current}:`, err.message);
                if (retryCount < fetchMaxRetries && mountedRef.current) {
                    setTimeout(() => {
                        fetchInitialData(specificTinh);
                    }, fetchRetryInterval);
                } else if (mountedRef.current) {
                    setError('Không thể lấy dữ liệu ban đầu, đang dựa vào dữ liệu mặc định...');
                    setIsTodayLoading(false);
                }
            }
        };

        fetchInitialData();

        window.addEventListener('beforeunload', beforeUnloadHandler);

        return () => {
            mountedRef.current = false;
            window.removeEventListener('beforeunload', beforeUnloadHandler);
            if (sseRef.current) {
                sseRef.current.close();
                sseRef.current = null;
                globalSSE = null;
            }
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
            console.log(`Cleaned up LiveResult for session ${sessionIdRef.current}`);
        };
    }, [today, station, setLiveData, setIsLiveDataComplete, emptyResult, prizeDigits, animationQueue]);

    useEffect(() => {
        if (!mountedRef.current || !isLiveWindow) return;

        const connectSSE = () => {
            try {
                sseRef.current = getSharedSSE(station, today, sessionIdRef.current);
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
                        // Gọi lại để đảm bảo dữ liệu mới nhất
                        emptyResult.forEach(item => fetchInitialData(item.tinh));
                    }
                };

                sseRef.current.onerror = () => {
                    console.log(`SSE error, retrying... Retry count: ${retryCount + 1} for session ${sessionIdRef.current}`);
                    if (mountedRef.current) {
                        setError('Mất kết nối trực tiếp, đang thử lại SSE...');
                        if (retryCount < maxRetries) {
                            setTimeout(() => {
                                if (mountedRef.current && !sseRef.current) {
                                    setRetryCount(prev => prev + 1);
                                    connectSSE();
                                }
                            }, retryInterval);
                        } else {
                            console.log(`Max retries reached, starting polling for session ${sessionIdRef.current}`);
                            startPolling();
                        }
                    }
                };

                sseRef.current.addEventListener('canary', (event) => {
                    console.log(`Received canary message for session ${sessionIdRef.current}:`, event.data);
                });

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
                                    lastUpdatedRef.current[data.tinh] = data.lastUpdated || Date.now();
                                    return updatedItem;
                                });
                                lastDataRef.current = updatedData;
                                const isComplete = updatedData.every(item =>
                                    Object.keys(prizeDigits).every(key => item[key] !== '...' && item[key] !== '***')
                                );
                                setIsLiveDataComplete(isComplete);
                                setRetryCount(0);
                                setError(null);
                                console.log(`LiveData updated from SSE full for session ${sessionIdRef.current}:`, updatedData);
                                return updatedData;
                            });

                            setAnimatingPrizes(prev => {
                                const nextPrize = animationQueue.find(prize => data[prize] === '...') || null;
                                return { ...prev, [data.tinh]: nextPrize };
                            });
                        }
                    } catch (error) {
                        console.error(`Error processing full event for session ${sessionIdRef.current}:`, error);
                    }
                });

                Object.keys(prizeDigits).forEach(prizeType => {
                    sseRef.current.addEventListener(prizeType, (event) => {
                        try {
                            const data = JSON.parse(event.data);
                            console.log(`Received SSE ${prizeType} event (tỉnh ${data.tinh}) for session ${sessionIdRef.current}:`, data);
                            if (data && data.drawDate === today && mountedRef.current) {
                                setLiveData(prev => {
                                    const updatedData = prev.map(item => {
                                        if (item.tinh !== data.tinh || item[prizeType] === data.prizeData) return item;
                                        const updatedItem = {
                                            ...item,
                                            [prizeType]: data.prizeData,
                                            tentinh: data.tentinh || item.tentinh,
                                            year: data.year || item.year,
                                            month: data.month || item.month,
                                            drawDate: data.drawDate || item.drawDate,
                                            lastUpdated: data.lastUpdated || Date.now(),
                                        };
                                        lastUpdatedRef.current[data.tinh] = data.lastUpdated || Date.now();
                                        return updatedItem;
                                    });
                                    lastDataRef.current = updatedData;
                                    const isComplete = updatedData.every(item =>
                                        Object.keys(prizeDigits).every(key => item[key] !== '...' && item[key] !== '***')
                                    );
                                    setIsLiveDataComplete(isComplete);
                                    console.log(`LiveData updated from SSE ${prizeType} for session ${sessionIdRef.current}:`, updatedData);
                                    return updatedData;
                                });

                                setAnimatingPrizes(prev => {
                                    const nextPrize = animationQueue.find(prize => data[prize] === '...') || null;
                                    return { ...prev, [data.tinh]: nextPrize };
                                });
                            }
                        } catch (error) {
                            console.error(`Error processing ${prizeType} event for session ${sessionIdRef.current}:`, error);
                        }
                    });
                });
            } catch (error) {
                console.error(`Error setting up SSE for session ${sessionIdRef.current}:`, error);
                if (mountedRef.current) {
                    setError('Lỗi thiết lập kết nối SSE, đang sử dụng polling...');
                    startPolling();
                }
            }
        };

        const startPolling = () => {
            if (sseRef.current && sseRef.current.readyState !== 2) {
                console.log(`Polling skipped as SSE is active (readyState: ${sseRef.current.readyState}) for session ${sessionIdRef.current}`);
                return;
            }

            try {
                const isIncomplete = contextLiveData.some(item =>
                    Object.keys(prizeDigits).some(key => item[key] === '...' || item[key] === '***')
                );
                if (!isIncomplete) {
                    console.log(`Data complete, stopping polling for session ${sessionIdRef.current}`);
                    return;
                }

                console.log(`Starting polling for session ${sessionIdRef.current}`);
                pollingIntervalRef.current = setInterval(async () => {
                    try {
                        const fetchPromises = emptyResult.map(item =>
                            fetch(
                                `https://backendkqxs-1.onrender.com/api/ketquaxs/xsmt/sse/initial?station=${station}&date=${today.replace(/\//g, '-')}&tinh=${item.tinh}`,
                                { mode: 'cors' }
                            ).then(res => {
                                if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
                                return res.json();
                            })
                        );
                        const serverDataArray = await Promise.all(fetchPromises);
                        if (!mountedRef.current) return;

                        setLiveData(prev => {
                            const updatedData = prev.map(item => {
                                const serverItem = serverDataArray.find(s => s.tinh === item.tinh) || item;
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
                                    tentinh: serverItem.tentinh || item.tentinh,
                                    year: serverItem.year || item.year,
                                    month: serverItem.month || item.month,
                                    drawDate: serverItem.drawDate || item.drawDate,
                                    lastUpdated: serverItem.lastUpdated || Date.now(),
                                };
                                lastUpdatedRef.current[item.tinh] = updatedItem.lastUpdated;
                                return updatedItem;
                            });
                            lastDataRef.current = updatedData;
                            const isComplete = updatedData.every(item =>
                                Object.keys(prizeDigits).every(key => item[key] !== '...' && item[key] !== '***')
                            );
                            setIsLiveDataComplete(isComplete);
                            setError(null);
                            console.log(`LiveData updated from polling for session ${sessionIdRef.current}:`, updatedData);
                            return updatedData;
                        });
                    } catch (error) {
                        console.error(`Polling error for session ${sessionIdRef.current}:`, error);
                        if (mountedRef.current) {
                            setError('Không thể lấy dữ liệu, đang thử lại...');
                        }
                    }
                }, pollingIntervalMs);
            } catch (error) {
                console.error(`Error starting polling for session ${sessionIdRef.current}:`, error);
                if (mountedRef.current) {
                    setError('Lỗi thiết lập polling, vui lòng thử lại...');
                }
            }
        };

        connectSSE();

        return () => {
            console.log(`Cleaning up useEffect for session ${sessionIdRef.current}, isLiveWindow: ${isLiveWindow}`);
            if (sseRef.current) {
                sseRef.current.close();
                sseRef.current = null;
                globalSSE = null;
            }
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
        };
    }, [isLiveWindow, station, today, setLiveData, setIsLiveDataComplete, emptyResult, prizeDigits]);



    useEffect(() => {
        if (!mountedRef.current || !deferredLiveData?.length) return;

        const newAnimatingPrizes = {};
        let hasChanges = false;

        deferredLiveData.forEach(stationData => {
            const currentPrize = animatingPrizes[stationData.tinh];
            const nextPrize = animationQueue.find(prize => stationData[prize] === '...') || null;
            if (currentPrize !== nextPrize) {
                newAnimatingPrizes[stationData.tinh] = nextPrize;
                hasChanges = true;
            } else {
                newAnimatingPrizes[stationData.tinh] = currentPrize;
            }
        });

        if (hasChanges) {
            setAnimatingPrizes(newAnimatingPrizes);
            console.log('Updated animatingPrizes:', newAnimatingPrizes);
        }
    }, [deferredLiveData, animationQueue, animatingPrizes]);

    const renderPrizeValue = useMemo(() => {
        return (tinh, prizeType, digits) => {
            const isAnimating = animatingPrizes[tinh] === prizeType && deferredLiveData.find(item => item.tinh === tinh)?.[prizeType] === '...';
            const className = `${styles.running_number} ${styles[`running_${digits}`]}`;
            const prizeValue = deferredLiveData.find(item => item.tinh === tinh)?.[prizeType] || '...';
            const filterKey = today + station;
            const filterType = filterTypes[filterKey] || 'all';
            const filteredValue = getFilteredNumber(prizeValue, filterType);
            const displayDigits = filterType === 'last2' ? 2 : filterType === 'last3' ? 3 : digits;
            const isSpecialOrEighth = prizeType === 'specialPrize_0' || prizeType === 'eightPrizes_0';

            console.log(`Rendering prize for ${tinh}, ${prizeType}: prizeValue=${prizeValue}, filterType=${filterType}, filteredValue=${filteredValue}`);

            return (
                <span className={`${className} ${isSpecialOrEighth ? styles.highlight : ''}`} data-status={isAnimating ? 'animating' : 'static'}>
                    {isAnimating ? (
                        <span className={styles.digit_container}>
                            {Array.from({ length: displayDigits }).map((_, i) => (
                                <span
                                    key={i}
                                    className={`${styles.digit} ${isAnimating ? styles.animate : ''}`}
                                    data-status={isAnimating ? 'animating' : 'static'}
                                    data-tinh={tinh}
                                    data-prize={prizeType}
                                    data-index={i}
                                ></span>
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
                                    <span
                                        key={i}
                                        className={`${styles.digit12} ${isSpecialOrEighth ? styles.highlight1 : ''}`}
                                        data-status="static"
                                        data-tinh={tinh}
                                        data-prize={prizeType}
                                        data-index={i}
                                    >
                                        {digit}
                                    </span>
                                ))}
                        </span>
                    )}
                </span>
            );
        };
    }, [deferredLiveData, animatingPrizes, filterTypes, station, today]);

    const tableKey = today + station;
    const currentFilter = filterTypes[tableKey] || 'all';

    if (!Array.isArray(deferredLiveData) || !deferredLiveData.length) {
        return <div className={styles.error}>Đang tải dữ liệu...</div>;
    }

    return (
        <div className={styles.containerKQs}>
            {error && <div className={styles.error}>{error}</div>}
            {isTodayLoading && <div className={styles.loading}>Đang chờ kết quả ngày {today}...</div>}
            <div className={styles.kqxs} style={{ '--num-columns': deferredLiveData.length }}>
                <div className={styles.header}>
                    <div className={styles.tructiep}>
                        <span className={styles.kqxs__title1}>Tường thuật trực tiếp...</span>
                    </div>
                    <h1 className={styles.kqxs__title}>XSMT - Kết quả Xổ số Miền Trung - SXMT {today}</h1>
                    <div className={styles.kqxs__action}>
                        <a className={styles.kqxs__actionLink} href="#!">
                            XSMT
                        </a>
                        <a className={`${styles.kqxs__actionLink} ${styles.dayOfWeek}`} href="#!">
                            {deferredLiveData[0]?.dayOfWeek}
                        </a>
                        <a className={styles.kqxs__actionLink} href="#!">
                            {today}
                        </a>
                    </div>
                </div>
                <table className={styles.tableXS}>
                    <thead>
                        <tr>
                            <th></th>
                            {deferredLiveData.map(stationData => (
                                <th key={stationData.tinh} className={styles.stationName}>
                                    {stationData.tentinh}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className={`${styles.tdTitle} ${styles.highlight}`}>G8</td>
                            {deferredLiveData.map(item => (
                                <td key={item.tinh} className={styles.rowXS}>
                                    <PrizeCell
                                        tinh={item.tinh}
                                        prizeType="eightPrizes_0"
                                        digits={2}
                                        renderPrizeValue={renderPrizeValue}
                                        isAnimating={animatingPrizes[item.tinh] === 'eightPrizes_0' && item.eightPrizes_0 === '...'}
                                    />
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className={styles.tdTitle}>G7</td>
                            {deferredLiveData.map(item => (
                                <td key={item.tinh} className={styles.rowXS}>
                                    <PrizeCell
                                        tinh={item.tinh}
                                        prizeType="sevenPrizes_0"
                                        digits={3}
                                        renderPrizeValue={renderPrizeValue}
                                        isAnimating={animatingPrizes[item.tinh] === 'sevenPrizes_0' && item.sevenPrizes_0 === '...'}
                                    />
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className={styles.tdTitle}>G6</td>
                            {deferredLiveData.map(item => (
                                <td key={item.tinh} className={styles}>
                                    {[0, 1, 2].map(idx => (
                                        <PrizeCell
                                            key={idx}
                                            tinh={item.tinh}
                                            prizeType={`sixPrizes_${idx}`}
                                            digits={4}
                                            renderPrizeValue={renderPrizeValue}
                                            isAnimating={animatingPrizes[item.tinh] === `sixPrizes_${idx}` && item[`sixPrizes_${idx}`] === '...'}
                                        />
                                    ))}
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className={`${styles.tdTitle} ${styles.g3}`}>G5</td>
                            {deferredLiveData.map(item => (
                                <td key={item.tinh} className={styles.rowXS}>
                                    <PrizeCell
                                        tinh={item.tinh}
                                        prizeType="fivePrizes_0"
                                        digits={4}
                                        renderPrizeValue={renderPrizeValue}
                                        isAnimating={animatingPrizes[item.tinh] === 'fivePrizes_0' && item.fivePrizes_0 === '...'}
                                    />
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className={styles.tdTitle}>G4</td>
                            {deferredLiveData.map(item => (
                                <td key={item.tinh} className={styles}>
                                    {[0, 1, 2, 3, 4, 5, 6].map(idx => (
                                        <PrizeCell
                                            key={idx}
                                            tinh={item.tinh}
                                            prizeType={`fourPrizes_${idx}`}
                                            digits={5}
                                            renderPrizeValue={renderPrizeValue}
                                            isAnimating={animatingPrizes[item.tinh] === `fourPrizes_${idx}` && item[`fourPrizes_${idx}`] === '...'}
                                        />
                                    ))}
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className={`${styles.tdTitle} ${styles.g3}`}>G3</td>
                            {deferredLiveData.map(item => (
                                <td key={item.tinh} className={styles}>
                                    {[0, 1].map(idx => (
                                        <PrizeCell
                                            key={idx}
                                            tinh={item.tinh}
                                            prizeType={`threePrizes_${idx}`}
                                            digits={5}
                                            renderPrizeValue={renderPrizeValue}
                                            isAnimating={animatingPrizes[item.tinh] === `threePrizes_${idx}` && item[`threePrizes_${idx}`] === '...'}
                                        />
                                    ))}
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className={styles.tdTitle}>G2</td>
                            {deferredLiveData.map(item => (
                                <td key={item.tinh} className={styles.rowXS}>
                                    <PrizeCell
                                        tinh={item.tinh}
                                        prizeType="secondPrize_0"
                                        digits={5}
                                        renderPrizeValue={renderPrizeValue}
                                        isAnimating={animatingPrizes[item.tinh] === 'secondPrize_0' && item.secondPrize_0 === '...'}
                                    />
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className={styles.tdTitle}>G1</td>
                            {deferredLiveData.map(item => (
                                <td key={item.tinh} className={styles.rowXS}>
                                    <PrizeCell
                                        tinh={item.tinh}
                                        prizeType="firstPrize_0"
                                        digits={5}
                                        renderPrizeValue={renderPrizeValue}
                                        isAnimating={animatingPrizes[item.tinh] === 'firstPrize_0' && item.firstPrize_0 === '...'}
                                    />
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className={`${styles.tdTitle} ${styles.highlight}`}>ĐB</td>
                            {deferredLiveData.map(item => (
                                <td key={item.tinh} className={styles.rowXS}>
                                    <PrizeCell
                                        tinh={item.tinh}
                                        prizeType="specialPrize_0"
                                        digits={6}
                                        renderPrizeValue={renderPrizeValue}
                                        isAnimating={animatingPrizes[item.tinh] === 'specialPrize_0' && item.specialPrize_0 === '...'}
                                    />
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
                            <label htmlFor={`filterAll-${tableKey}`}>Đầy đủ</label>
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
            <LotteryTable liveData={deferredLiveData} today={today} station={station} />
        </div>
    );
});

export default LiveResult;