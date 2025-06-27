import { useState, useEffect, useMemo, useCallback } from "react";
import styles from '../../styles/kqxsMN.module.css';
import { getFilteredNumber } from "../../library/utils/filterUtils";
import React from 'react';

const LiveResult = ({ station, today, getHeadAndTailNumbers, handleFilterChange, filterTypes, isLiveWindow }) => {
    const [liveData, setLiveData] = useState([]);
    const [isTodayLoading, setIsTodayLoading] = useState(true);
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const [isDataReady, setIsDataReady] = useState(false);
    const [animatingPrizes, setAnimatingPrizes] = useState({}); // { tinh: prizeType }
    const [animatingNumbers, setAnimatingNumbers] = useState({}); // { tinh_prizeType: number }
    const maxRetries = 50;
    const retryInterval = 10000;

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
        }));
    }, [today, station]);

    const fetchInitialData = async () => {
        try {
            const dayOfWeekIndex = new Date().getDay();
            const provinces = provincesByDay[dayOfWeekIndex] || provincesByDay[6];
            const results = await Promise.all(
                provinces.map(async (province) => {
                    try {
                        const response = await fetch(
                            `https://backendkqxs.onrender.com/api/ketqua/xsmn/sse/initial?station=${station}&tinh=${province.tinh}&date=${today.replace(/\//g, '-')}`
                        );
                        const data = await response.json();
                        if (response.status !== 200) {
                            throw new Error(data.error || 'Lỗi khi lấy dữ liệu ban đầu');
                        }
                        return {
                            drawDate: data.drawDate,
                            station: data.station,
                            dayOfWeek: data.dayOfWeek,
                            tentinh: data.tentinh,
                            tinh: data.tinh,
                            year: data.year,
                            month: data.month,
                            specialPrize_0: data.specialPrize_0 || '...',
                            firstPrize_0: data.firstPrize_0 || '...',
                            secondPrize_0: data.secondPrize_0 || '...',
                            threePrizes_0: data.threePrizes_0 || '...',
                            threePrizes_1: data.threePrizes_1 || '...',
                            fourPrizes_0: data.fourPrizes_0 || '...',
                            fourPrizes_1: data.fourPrizes_1 || '...',
                            fourPrizes_2: data.fourPrizes_2 || '...',
                            fourPrizes_3: data.fourPrizes_3 || '...',
                            fourPrizes_4: data.fourPrizes_4 || '...',
                            fourPrizes_5: data.fourPrizes_5 || '...',
                            fourPrizes_6: data.fourPrizes_6 || '...',
                            fivePrizes_0: data.fivePrizes_0 || '...',
                            sixPrizes_0: data.sixPrizes_0 || '...',
                            sixPrizes_1: data.sixPrizes_1 || '...',
                            sixPrizes_2: data.sixPrizes_2 || '...',
                            sevenPrizes_0: data.sevenPrizes_0 || '...',
                            eightPrizes_0: data.eightPrizes_0 || '...',
                        };
                    } catch (err) {
                        console.error(`Lỗi khi lấy dữ liệu ban đầu cho tỉnh ${province.tinh}:`, err.message);
                        return {
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
                        };
                    }
                })
            );
            setLiveData(results);
            setIsTodayLoading(false);
            setError(null);
            setIsDataReady(results.some(item => item.specialPrize_0 !== '...' || item.firstPrize_0 !== '...'));
        } catch (err) {
            console.error('Lỗi khi lấy dữ liệu ban đầu:', err.message);
            setLiveData(emptyResult);
            setIsTodayLoading(false);
            setError('Không có dữ liệu cho ngày hôm nay, đang chờ kết quả trực tiếp...');
            setIsDataReady(false);
        }
    };

    useEffect(() => {
        if (isLiveWindow) {
            fetchInitialData();
        } else {
            setLiveData([]);
            setIsTodayLoading(true);
            setRetryCount(0);
            setError(null);
            setIsDataReady(false);
        }
    }, [isLiveWindow, emptyResult, today, station]);

    useEffect(() => {
        if (!isLiveWindow) {
            setLiveData([]);
            setIsTodayLoading(true);
            setRetryCount(0);
            setError(null);
            setIsDataReady(false);
            return;
        }

        const dayOfWeekIndex = new Date().getDay();
        const provinces = provincesByDay[dayOfWeekIndex] || provincesByDay[6];
        const eventSources = [];
        let pendingUpdates = {};
        let debounceTimeout = null;

        const updateLiveData = () => {
            setLiveData(prev => {
                const updatedData = prev.map(item => ({
                    ...item,
                    ...pendingUpdates[item.tinh],
                }));
                pendingUpdates = {};
                const hasRealData = updatedData.some(
                    item => item.specialPrize_0 !== '...' || item.firstPrize_0 !== '...'
                );
                if (hasRealData) setIsDataReady(true);
                return updatedData;
            });
            setIsTodayLoading(false);
            setRetryCount(0);
            setError(null);
        };

        const connectSSE = (tinh) => {
            console.log(`Kết nối SSE cho tỉnh ${tinh}... (Thử lần ${retryCount + 1}/${maxRetries + 1})`);
            const eventSource = new EventSource(
                `https://backendkqxs.onrender.com/api/ketqua/xsmn/sse?station=${station}&tinh=${tinh}&date=${today.replace(/\//g, '-')}`
            );
            eventSources.push(eventSource);

            const prizeTypes = [
                'specialPrize_0', 'firstPrize_0', 'secondPrize_0',
                'threePrizes_0', 'threePrizes_1',
                'fourPrizes_0', 'fourPrizes_1', 'fourPrizes_2', 'fourPrizes_3', 'fourPrizes_4', 'fourPrizes_5', 'fourPrizes_6',
                'fivePrizes_0',
                'sixPrizes_0', 'sixPrizes_1', 'sixPrizes_2',
                'sevenPrizes_0', 'eightPrizes_0'
            ];

            prizeTypes.forEach(prizeType => {
                eventSource.addEventListener(prizeType, (event) => {
                    console.log(`Nhận sự kiện SSE cho ${prizeType} (tỉnh ${tinh}):`, event.data);
                    try {
                        const data = JSON.parse(event.data);
                        if (data && data[prizeType] && data.tinh) {
                            pendingUpdates = {
                                ...pendingUpdates,
                                [data.tinh]: {
                                    ...pendingUpdates[data.tinh],
                                    [prizeType]: data[prizeType],
                                    tentinh: data.tentinh || data.tentinh,
                                    year: data.year || data.year,
                                    month: data.month || data.month,
                                },
                            };

                            clearTimeout(debounceTimeout);
                            debounceTimeout = setTimeout(updateLiveData, 50); // Debounce 50ms
                        }
                    } catch (error) {
                        console.error(`Lỗi xử lý sự kiện SSE ${prizeType} (tỉnh ${tinh}):`, error);
                    }
                });
            });

            eventSource.onerror = () => {
                console.log(`Lỗi SSE cho tỉnh ${tinh}, đóng kết nối...`);
                eventSource.close();
                if (retryCount < maxRetries) {
                    setTimeout(() => {
                        setRetryCount(prev => prev + 1);
                    }, retryInterval);
                } else {
                    setError('Mất kết nối trực tiếp, đang tải dữ liệu thủ công...');
                    fetchInitialData();
                }
            };
        };

        provinces.forEach(province => connectSSE(province.tinh));

        return () => {
            console.log('Đóng tất cả kết nối SSE...');
            eventSources.forEach(eventSource => eventSource.close());
            clearTimeout(debounceTimeout);
        };
    }, [isLiveWindow, station, today, retryCount, maxRetries, retryInterval, provincesByDay]);

    useEffect(() => {
        if (!isLiveWindow || !liveData.length) return;

        const animationQueue = [
            'eightPrizes_0', 'sevenPrizes_0',
            'sixPrizes_0', 'sixPrizes_1', 'sixPrizes_2',
            'fivePrizes_0',
            'fourPrizes_0', 'fourPrizes_1', 'fourPrizes_2', 'fourPrizes_3', 'fourPrizes_4', 'fourPrizes_5', 'fourPrizes_6',
            'threePrizes_0', 'threePrizes_1',
            'secondPrize_0', 'firstPrize_0', 'specialPrize_0'
        ];

        const findNextPrize = (stationData) => {
            return animationQueue.find(prize => stationData[prize] === '...') || null;
        };

        liveData.forEach(stationData => {
            const currentPrize = animatingPrizes[stationData.tinh];
            if (!currentPrize || stationData[currentPrize] !== '...') {
                const nextPrize = findNextPrize(stationData);
                setAnimatingPrizes(prev => ({
                    ...prev,
                    [stationData.tinh]: nextPrize
                }));
                if (currentPrize && stationData[currentPrize] !== '...') {
                    setAnimatingNumbers(prev => {
                        const newNumbers = { ...prev };
                        delete newNumbers[`${stationData.tinh}_${currentPrize}`];
                        return newNumbers;
                    });
                }
            }
        });

        const intervalId = setInterval(() => {
            setAnimatingNumbers(prev => {
                const newNumbers = { ...prev };
                liveData.forEach(stationData => {
                    const prizeType = animatingPrizes[stationData.tinh];
                    if (prizeType && stationData[prizeType] === '...') {
                        const digits = prizeType === 'eightPrizes_0' ? 2 :
                            prizeType === 'sevenPrizes_0' ? 3 :
                                prizeType === 'specialPrize_0' ? 6 : 5;
                        newNumbers[`${stationData.tinh}_${prizeType}`] = Math.floor(Math.random() * Math.pow(10, digits))
                            .toString()
                            .padStart(digits, '0');
                    }
                });
                return newNumbers;
            });
        }, 100); // Tăng interval lên 100ms

        return () => clearInterval(intervalId);
    }, [isLiveWindow, liveData, animatingPrizes]);

    const renderPrizeNumber = useCallback((tinh, prizeType, digits = 5) => {
        const isAnimating = animatingPrizes[tinh] === prizeType && liveData.find(item => item.tinh === tinh)?.[prizeType] === '...';
        const value = isAnimating ? animatingNumbers[`${tinh}_${prizeType}`] || '0'.repeat(digits) : liveData.find(item => item.tinh === tinh)?.[prizeType] || '...';
        const className = `${styles.runningNumber} ${styles[`running_${digits}`]}`;

        return (
            <span className={className} data-state={isAnimating ? 'animating' : 'static'}>
                {isAnimating ? (
                    <span className={styles.digitContainer}>
                        {value.split('').slice(-digits).map((digit, idx) => (
                            <span key={idx} className={styles.digit} data-state="animating">
                                {digit}
                            </span>
                        ))}
                    </span>
                ) : value === '...' ? (
                    <span className={styles.spinner}></span>
                ) : (
                    getFilteredNumber(value, filterTypes[today + station] || 'all') || '-'
                )}
            </span>
        );
    }, [animatingPrizes, animatingNumbers, liveData, filterTypes, today, station]);

    if (!liveData.length) return null;

    const allHeads = Array(10).fill().map(() => []);
    const allTails = Array(10).fill().map(() => []);
    const stationsData = liveData.map(stationData => {
        const lastTwoNumbers = [];
        const addNumber = (num) => {
            if (num && num !== '...' && num !== '***' && /^\d+$/.test(num)) {
                const last2 = num.slice(-2).padStart(2, '0');
                lastTwoNumbers.push({ num: last2, isSpecial: num === stationData.specialPrize_0, isEighth: num === stationData.eightPrizes_0 });
            }
        };

        addNumber(stationData.specialPrize_0);
        addNumber(stationData.firstPrize_0);
        addNumber(stationData.secondPrize_0);
        [0, 1].forEach(i => addNumber(stationData[`threePrizes_${i}`]));
        [0, 1, 2, 3, 4, 5, 6].forEach(i => addNumber(stationData[`fourPrizes_${i}`]));
        addNumber(stationData.fivePrizes_0);
        [0, 1, 2].forEach(i => addNumber(stationData[`sixPrizes_${i}`]));
        addNumber(stationData.sevenPrizes_0);
        addNumber(stationData.eightPrizes_0);

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

    return (
        <div className={styles.containerKQs}>
            <div className={styles.statusContainer}>
                {error && <div className={styles.error}>{error}</div>}
                {isTodayLoading && (
                    <div className={styles.loading}>Đang chờ kết quả ngày {today}...</div>
                )}
            </div>
            <div className={styles.kqxs} style={{ '--num-columns': liveData.length }}>
                <div className={styles.groupHeader}>
                    <h2 className={styles.kqxs__title}>Kết Quả Xổ Số Miền Nam - {today}</h2>
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
                                    <span className={`${styles.prizeNumber} ${styles.highlight}`}>
                                        {renderPrizeNumber(item.tinh, 'eightPrizes_0', 2)}
                                    </span>
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className={styles.tdTitle}>G7</td>
                            {liveData.map(item => (
                                <td key={item.tinh} className={styles.rowXS}>
                                    <span className={styles.prizeNumber}>
                                        {renderPrizeNumber(item.tinh, 'sevenPrizes_0', 3)}
                                    </span>
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className={styles.tdTitle}>G6</td>
                            {liveData.map(item => (
                                <td key={item.tinh} className={styles.rowXS}>
                                    {[0, 1, 2].map(idx => (
                                        <span key={idx} className={styles.prizeNumber}>
                                            {renderPrizeNumber(item.tinh, `sixPrizes_${idx}`, 4)}
                                            {idx < 2 && <br />}
                                        </span>
                                    ))}
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className={`${styles.tdTitle} ${styles.g3}`}>G5</td>
                            {liveData.map(item => (
                                <td key={item.tinh} className={styles.rowXS}>
                                    <span className={`${styles.prizeNumber} ${styles.g3}`}>
                                        {renderPrizeNumber(item.tinh, 'fivePrizes_0', 4)}
                                    </span>
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className={styles.tdTitle}>G4</td>
                            {liveData.map(item => (
                                <td key={item.tinh} className={styles.rowXS}>
                                    {[0, 1, 2, 3, 4, 5, 6].map(idx => (
                                        <span key={idx} className={styles.prizeNumber}>
                                            {renderPrizeNumber(item.tinh, `fourPrizes_${idx}`, 5)}
                                            {idx < 6 && <br />}
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
                                        <span key={idx} className={`${styles.prizeNumber} ${styles.g3}`}>
                                            {renderPrizeNumber(item.tinh, `threePrizes_${idx}`, 5)}
                                            {idx < 1 && <br />}
                                        </span>
                                    ))}
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className={styles.tdTitle}>G2</td>
                            {liveData.map(item => (
                                <td key={item.tinh} className={styles.rowXS}>
                                    <span className={styles.prizeNumber}>
                                        {renderPrizeNumber(item.tinh, 'secondPrize_0', 5)}
                                    </span>
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className={styles.tdTitle}>G1</td>
                            {liveData.map(item => (
                                <td key={item.tinh} className={styles.rowXS}>
                                    <span className={styles.prizeNumber}>
                                        {renderPrizeNumber(item.tinh, 'firstPrize_0', 5)}
                                    </span>
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className={`${styles.tdTitle} ${styles.highlight}`}>ĐB</td>
                            {liveData.map(item => (
                                <td key={item.tinh} className={styles.rowXS}>
                                    <span className={`${styles.prizeNumber} ${styles.highlight} ${styles.gdb}`}>
                                        {renderPrizeNumber(item.tinh, 'specialPrize_0', 6)}
                                    </span>
                                </td>
                            ))}
                        </tr>
                    </tbody>
                </table>
                <div className={styles.action}>
                    <div aria-label="default" className={styles.filter__options} role="radiogroup">
                        <div className={styles.optionInput}>
                            <input
                                id={`filterAll-${today + station}`}
                                type="radio"
                                name={`filterOption-${today + station}`}
                                value="all"
                                checked={filterTypes[today + station] === 'all'}
                                onChange={() => handleFilterChange(today + station, 'all')}
                            />
                            <label htmlFor={`filterAll-${today + station}`}>Đầy đủ</label>
                        </div>
                        <div className={styles.optionInput}>
                            <input
                                id={`filterTwo-${today + station}`}
                                type="radio"
                                name={`filterOption-${today + station}`}
                                value="last2"
                                checked={filterTypes[today + station] === 'last2'}
                                onChange={() => handleFilterChange(today + station, 'last2')}
                            />
                            <label htmlFor={`filterTwo-${today + station}`}>2 số cuối</label>
                        </div>
                        <div className={styles.optionInput}>
                            <input
                                id={`filterThree-${today + station}`}
                                type="radio"
                                name={`filterOption-${today + station}`}
                                value="last3"
                                checked={filterTypes[today + station] === 'last3'}
                                onChange={() => handleFilterChange(today + station, 'last3')}
                            />
                            <label htmlFor={`filterThree-${today + station}`}>3 số cuối</label>
                        </div>
                    </div>
                </div>
            </div>
            <div className={styles.TKe_container}>
                <div className={styles.TKe_content}>
                    <div className={styles.TKe_contentTitle}>
                        <span className={styles.title}>Thống kê lô tô theo Đầu - </span>
                        <span className={styles.dayOfWeek}>{liveData[0]?.dayOfWeek} - </span>
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
                                            {headNumbers.map((item, numIdx) => (
                                                <span
                                                    key={numIdx}
                                                    className={item.isEighth || item.isSpecial ? styles.highlightPrize : ''}
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
                        <span className={styles.dayOfWeek}>{liveData[0]?.dayOfWeek} - </span>
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
                                            {tailNumbers.map((item, numIdx) => (
                                                <span
                                                    key={numIdx}
                                                    className={item.isEighth || item.isSpecial ? styles.highlightPrize : ''}
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
};

export default React.memo(LiveResult);