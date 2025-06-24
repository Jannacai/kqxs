import { useState, useEffect, useMemo } from "react";
import styles from '../../styles/kqxsMN.module.css';
import { getFilteredNumber } from "../../library/utils/filterUtils";
import { apiMN } from "../api/kqxs/kqxsMN";
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

    useEffect(() => {
        if (isLiveWindow) {
            setLiveData(emptyResult);
            setIsDataReady(false);
        } else {
            setLiveData([]);
            setIsTodayLoading(true);
            setRetryCount(0);
            setError(null);
            setIsDataReady(false);
        }
    }, [isLiveWindow, emptyResult]);

    const fetchFallbackData = async () => {
        try {
            const result = await apiMN.getLottery(station, today, undefined);
            const dataArray = Array.isArray(result) ? result : [result];
            const todayData = dataArray.filter(item =>
                new Date(item.drawDate).toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                }) === today
            );

            const dayOfWeekIndex = new Date().getDay();
            const provinces = provincesByDay[dayOfWeekIndex] || provincesByDay[6];
            const formattedData = provinces.map(province => {
                const matchedData = todayData.find(item => item.tinh === province.tinh) || {};
                return {
                    drawDate: today,
                    station: station,
                    dayOfWeek: new Date().toLocaleString('vi-VN', { weekday: 'long' }),
                    tentinh: province.tentinh,
                    tinh: province.tinh,
                    year: new Date().getFullYear(),
                    month: new Date().getMonth() + 1,
                    specialPrize_0: matchedData.specialPrize?.[0] || '...',
                    firstPrize_0: matchedData.firstPrize?.[0] || '...',
                    secondPrize_0: matchedData.secondPrize?.[0] || '...',
                    threePrizes_0: matchedData.threePrizes?.[0] || '...',
                    threePrizes_1: matchedData.threePrizes?.[1] || '...',
                    fourPrizes_0: matchedData.fourPrizes?.[0] || '...',
                    fourPrizes_1: matchedData.fourPrizes?.[1] || '...',
                    fourPrizes_2: matchedData.fourPrizes?.[2] || '...',
                    fourPrizes_3: matchedData.fourPrizes?.[3] || '...',
                    fourPrizes_4: matchedData.fourPrizes?.[4] || '...',
                    fourPrizes_5: matchedData.fourPrizes?.[5] || '...',
                    fourPrizes_6: matchedData.fourPrizes?.[6] || '...',
                    fivePrizes_0: matchedData.fivePrizes?.[0] || '...',
                    sixPrizes_0: matchedData.sixPrizes?.[0] || '...',
                    sixPrizes_1: matchedData.sixPrizes?.[1] || '...',
                    sixPrizes_2: matchedData.sixPrizes?.[2] || '...',
                    sevenPrizes_0: matchedData.sevenPrizes?.[0] || '...',
                    eightPrizes_0: matchedData.eightPrizes?.[0] || '...',
                };
            });

            setLiveData(formattedData);
            setIsTodayLoading(false);
            setError(null);
            setIsDataReady(todayData.length > 0);
        } catch (err) {
            console.error('Lỗi khi gọi API fallback:', err.message);
            setLiveData(emptyResult);
            setIsTodayLoading(false);
            setError('Không có dữ liệu cho ngày hôm nay, đang chờ kết quả trực tiếp...');
            setIsDataReady(false);
        }
    };

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
                            setLiveData(prev => {
                                const updatedData = prev.map(item => {
                                    if (item.tinh === data.tinh) {
                                        return {
                                            ...item,
                                            [prizeType]: data[prizeType],
                                            tentinh: data.tentinh || item.tentinh,
                                            year: data.year || item.year,
                                            month: data.month || item.month,
                                        };
                                    }
                                    return item;
                                });
                                console.log('Cập nhật liveData:', updatedData);

                                const hasRealData = updatedData.some(item =>
                                    item.specialPrize_0 !== '...' ||
                                    item.firstPrize_0 !== '...'
                                );
                                if (hasRealData) {
                                    setIsDataReady(true);
                                }

                                return updatedData;
                            });
                            setIsTodayLoading(false);
                            setRetryCount(0);
                            setError(null);
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
                    fetchFallbackData();
                }
            };
        };

        provinces.forEach(province => connectSSE(province.tinh));

        return () => {
            console.log('Đóng tất cả kết nối SSE...');
            eventSources.forEach(eventSource => eventSource.close());
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
            }

            if (animatingPrizes[stationData.tinh]) {
                const prizeType = animatingPrizes[stationData.tinh];
                const intervalId = setInterval(() => {
                    setAnimatingNumbers(prev => ({
                        ...prev,
                        [`${stationData.tinh}_${prizeType}`]: Math.floor(Math.random() * 1000000).toString().padStart(6, '0')
                    }));
                }, 50);

                return () => clearInterval(intervalId);
            }
        });

    }, [isLiveWindow, liveData, animatingPrizes]);

    const renderPrizeNumber = (tinh, prizeType, digits = 5) => {
        const isAnimating = animatingPrizes[tinh] === prizeType && liveData.find(item => item.tinh === tinh)?.[prizeType] === '...';
        const value = isAnimating ? animatingNumbers[`${tinh}_${prizeType}`] || '0'.repeat(digits) : liveData.find(item => item.tinh === tinh)?.[prizeType] || '...';
        const className = `${styles.runningNumber} ${styles[`running_${digits}`]} ${isAnimating ? styles.animating : ''}`;

        return (
            <span className={className} data-state={isAnimating ? 'animating' : 'static'}>
                {isAnimating ? (
                    <span className={styles.digitContainer}>
                        {value.split('').slice(-digits).map((digit, idx) => (
                            <span key={idx} className={styles.digit}>
                                {digit}
                            </span>
                        ))}
                    </span>
                ) : value === '...' ? (
                    <span className={styles.spinner}></span>
                ) : (
                    getFilteredNumber(value, currentFilter) || '-'
                )}
            </span>
        );
    };

    if (!liveData.length) return null;

    const tableKey = today + station;
    const currentFilter = filterTypes[tableKey] || 'all';

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
                            {liveData.map(stationData => (
                                <td key={stationData.tinh} className={styles.rowXS}>
                                    <span className={`${styles.prizeNumber} ${styles.highlight}`}>
                                        {renderPrizeNumber(stationData.tinh, 'eightPrizes_0', 2)}
                                    </span>
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className={styles.tdTitle}>G7</td>
                            {liveData.map(stationData => (
                                <td key={stationData.tinh} className={styles.rowXS}>
                                    <span className={styles.prizeNumber}>
                                        {renderPrizeNumber(stationData.tinh, 'sevenPrizes_0', 3)}
                                    </span>
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className={styles.tdTitle}>G6</td>
                            {liveData.map(stationData => (
                                <td key={stationData.tinh} className={styles.rowXS}>
                                    {[0, 1, 2].map(idx => (
                                        <span key={idx} className={styles.prizeNumber}>
                                            {renderPrizeNumber(stationData.tinh, `sixPrizes_${idx}`, 4)}
                                            {idx < 2 && <br />}
                                        </span>
                                    ))}
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className={`${styles.tdTitle} ${styles.g3}`}>G5</td>
                            {liveData.map(stationData => (
                                <td key={stationData.tinh} className={styles.rowXS}>
                                    <span className={`${styles.prizeNumber} ${styles.g3}`}>
                                        {renderPrizeNumber(stationData.tinh, 'fivePrizes_0', 4)}
                                    </span>
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className={styles.tdTitle}>G4</td>
                            {liveData.map(stationData => (
                                <td key={stationData.tinh} className={styles.rowXS}>
                                    {[0, 1, 2, 3, 4, 5, 6].map(idx => (
                                        <span key={idx} className={styles.prizeNumber}>
                                            {renderPrizeNumber(stationData.tinh, `fourPrizes_${idx}`, 5)}
                                            {idx < 6 && <br />}
                                        </span>
                                    ))}
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className={`${styles.tdTitle} ${styles.g3}`}>G3</td>
                            {liveData.map(stationData => (
                                <td key={stationData.tinh} className={styles.rowXS}>
                                    {[0, 1].map(idx => (
                                        <span key={idx} className={`${styles.prizeNumber} ${styles.g3}`}>
                                            {renderPrizeNumber(stationData.tinh, `threePrizes_${idx}`, 5)}
                                            {idx < 1 && <br />}
                                        </span>
                                    ))}
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className={styles.tdTitle}>G2</td>
                            {liveData.map(stationData => (
                                <td key={stationData.tinh} className={styles.rowXS}>
                                    <span className={styles.prizeNumber}>
                                        {renderPrizeNumber(stationData.tinh, 'secondPrize_0', 5)}
                                    </span>
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className={styles.tdTitle}>G1</td>
                            {liveData.map(stationData => (
                                <td key={stationData.tinh} className={styles.rowXS}>
                                    <span className={styles.prizeNumber}>
                                        {renderPrizeNumber(stationData.tinh, 'firstPrize_0', 5)}
                                    </span>
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className={`${styles.tdTitle} ${styles.highlight}`}>ĐB</td>
                            {liveData.map(stationData => (
                                <td key={stationData.tinh} className={styles.rowXS}>
                                    <span className={`${styles.prizeNumber} ${styles.highlight} ${styles.gdb}`}>
                                        {renderPrizeNumber(stationData.tinh, 'specialPrize_0', 6)}
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
                            <label htmlFor={`filterAll-${tableKey}`}>Tất cả</label>
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
                            <label htmlFor={`filterTwo-${tableKey}`}>2 số cuối</label>
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
                            <label htmlFor={`filterThree-${tableKey}`}>3 số cuối</label>
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
                                    {allHeads[idx].map((headNumbers, stationIdx) => (
                                        <td key={stationIdx}>
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
                                    {allTails[idx].map((tailNumbers, stationIdx) => (
                                        <td key={stationIdx}>
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