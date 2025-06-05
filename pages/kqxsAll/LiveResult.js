import { useState, useEffect, useMemo } from "react";
import styles from '../../public/css/kqxsMB.module.css';
import { getFilteredNumber } from "../../library/utils/filterUtils";
import { apiMB } from "../api/kqxs/kqxsMB";
import React from 'react';

// In styles để kiểm tra


const LiveResult = ({ station, today, getHeadAndTailNumbers, handleFilterChange, filterTypes, isLiveWindow }) => {
    const [liveData, setLiveData] = useState(null);
    const [isTodayLoading, setIsTodayLoading] = useState(true);
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const [isDataReady, setIsDataReady] = useState(false);
    const maxRetries = 50;
    const retryInterval = 10000;

    const emptyResult = useMemo(() => ({
        drawDate: today,
        station: station,
        dayOfWeek: new Date().toLocaleString('vi-VN', { weekday: 'long' }),
        tentinh: "Miền Bắc",
        tinh: "MB",
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        maDB: "...",
        specialPrize_0: "...",
        firstPrize_0: "...",
        secondPrize_0: "...",
        secondPrize_1: "...",
        threePrizes_0: "...",
        threePrizes_1: "...",
        threePrizes_2: "...",
        threePrizes_3: "...",
        threePrizes_4: "...",
        threePrizes_5: "...",
        fourPrizes_0: "...",
        fourPrizes_1: "...",
        fourPrizes_2: "...",
        fourPrizes_3: "...",
        fivePrizes_0: "...",
        fivePrizes_1: "...",
        fivePrizes_2: "...",
        fivePrizes_3: "...",
        fivePrizes_4: "...",
        fivePrizes_5: "...",
        sixPrizes_0: "...",
        sixPrizes_1: "...",
        sixPrizes_2: "...",
        sevenPrizes_0: "...",
        sevenPrizes_1: "...",
        sevenPrizes_2: "...",
        sevenPrizes_3: "...",
    }), [today, station]);

    useEffect(() => {
        if (isLiveWindow) {
            setLiveData(emptyResult);
            setIsDataReady(false);
        } else {
            setLiveData(null);
            setIsTodayLoading(true);
            setRetryCount(0);
            setError(null);
            setIsDataReady(false);
        }
    }, [isLiveWindow, emptyResult]);

    const fetchFallbackData = async () => {
        try {
            const result = await apiMB.getLottery(station, today, undefined);
            const dataArray = Array.isArray(result) ? result : [result];
            const todayData = dataArray.find(item =>
                new Date(item.drawDate).toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                }) === today
            ) || emptyResult;

            const formattedData = { ...emptyResult };
            formattedData.maDB = todayData.maDB || '...';
            formattedData.specialPrize_0 = todayData.specialPrize?.[0] || '...';
            formattedData.firstPrize_0 = todayData.firstPrize?.[0] || '...';
            formattedData.secondPrize_0 = todayData.secondPrize?.[0] || '...';
            formattedData.secondPrize_1 = todayData.secondPrize?.[1] || '...';
            formattedData.threePrizes_0 = todayData.threePrizes?.[0] || '...';
            formattedData.threePrizes_1 = todayData.threePrizes?.[1] || '...';
            formattedData.threePrizes_2 = todayData.threePrizes?.[2] || '...';
            formattedData.threePrizes_3 = todayData.threePrizes?.[3] || '...';
            formattedData.threePrizes_4 = todayData.threePrizes?.[4] || '...';
            formattedData.threePrizes_5 = todayData.threePrizes?.[5] || '...';
            formattedData.fourPrizes_0 = todayData.fourPrizes?.[0] || '...';
            formattedData.fourPrizes_1 = todayData.fourPrizes?.[1] || '...';
            formattedData.fourPrizes_2 = todayData.fourPrizes?.[2] || '...';
            formattedData.fourPrizes_3 = todayData.fourPrizes?.[3] || '...';
            formattedData.fivePrizes_0 = todayData.fivePrizes?.[0] || '...';
            formattedData.fivePrizes_1 = todayData.fivePrizes?.[1] || '...';
            formattedData.fivePrizes_2 = todayData.fivePrizes?.[2] || '...';
            formattedData.fivePrizes_3 = todayData.fivePrizes?.[3] || '...';
            formattedData.fivePrizes_4 = todayData.fivePrizes?.[4] || '...';
            formattedData.fivePrizes_5 = todayData.fivePrizes?.[5] || '...';
            formattedData.sixPrizes_0 = todayData.sixPrizes?.[0] || '...';
            formattedData.sixPrizes_1 = todayData.sixPrizes?.[1] || '...';
            formattedData.sixPrizes_2 = todayData.sixPrizes?.[2] || '...';
            formattedData.sevenPrizes_0 = todayData.sevenPrizes?.[0] || '...';
            formattedData.sevenPrizes_1 = todayData.sevenPrizes?.[1] || '...';
            formattedData.sevenPrizes_2 = todayData.sevenPrizes?.[2] || '...';
            formattedData.sevenPrizes_3 = todayData.sevenPrizes?.[3] || '...';

            setLiveData(formattedData);
            setIsTodayLoading(false);
            setError(null);
            setIsDataReady(true);
        } catch (err) {
            console.error('Lỗi khi gọi API fallback:', err.message);
            setLiveData(emptyResult);
            setIsTodayLoading(false);
            setError('Không có dữ liệu cho ngày hôm nay, đang chờ kết quả trực tiếp...');
            setIsDataReady(false);
        }
    };

    useEffect(() => {
        let eventSource;

        const connectSSE = () => {
            eventSource = new EventSource(`http://localhost:5000/api/kqxs/xsmb/sse?station=${station}`);

            const prizeTypes = [
                'maDB',
                'specialPrize_0',
                'firstPrize_0',
                'secondPrize_0', 'secondPrize_1',
                'threePrizes_0', 'threePrizes_1', 'threePrizes_2', 'threePrizes_3', 'threePrizes_4', 'threePrizes_5',
                'fourPrizes_0', 'fourPrizes_1', 'fourPrizes_2', 'fourPrizes_3',
                'fivePrizes_0', 'fivePrizes_1', 'fivePrizes_2', 'fivePrizes_3', 'fivePrizes_4', 'fivePrizes_5',
                'sixPrizes_0', 'sixPrizes_1', 'sixPrizes_2',
                'sevenPrizes_0', 'sevenPrizes_1', 'sevenPrizes_2', 'sevenPrizes_3',
            ];

            prizeTypes.forEach(prizeType => {
                eventSource.addEventListener(prizeType, (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (data && data[prizeType]) {
                            setLiveData(prev => {
                                const updatedData = {
                                    ...prev,
                                    [prizeType]: data[prizeType],
                                    tentinh: data.tentinh || prev.tentinh,
                                    tinh: data.tinh || prev.tinh,
                                    year: data.year || prev.year,
                                    month: data.month || prev.month,
                                };
                                console.log('Cập nhật liveData:', updatedData);
                                setIsDataReady(true);
                                return updatedData;
                            });
                            setIsTodayLoading(false);
                            setRetryCount(0);
                            setError(null);
                        }
                    } catch (error) {
                        console.error(`Lỗi xử lý sự kiện ${prizeType}:`, error);
                    }
                });
            });

            eventSource.onerror = () => {
                console.log('Lỗi SSE, đóng kết nối...');
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

        if (isLiveWindow && retryCount <= maxRetries) {
            connectSSE();
        }

        return () => {
            if (eventSource) {
                console.log('Đóng kết nối SSE...');
                eventSource.close();
            }
        };
    }, [isLiveWindow, station, retryCount, maxRetries, retryInterval]);

    if (!liveData) return null;

    const tableKey = liveData.drawDate + liveData.station;
    const currentFilter = filterTypes[tableKey] || 'all';

    const getPrizeNumbers = () => {
        const lastTwoNumbers = [];
        const addNumber = (num) => {
            if (num && num !== '...' && num !== '***' && /^\d+$/.test(num)) {
                const last2 = num.slice(-2).padStart(2, '0');
                lastTwoNumbers.push(last2);
            }
        };

        addNumber(liveData.maDB);
        addNumber(liveData.specialPrize_0);
        addNumber(liveData.firstPrize_0);
        for (let i = 0; i < 2; i++) {
            addNumber(liveData[`secondPrize_${i}`]);
        }
        for (let i = 0; i < 6; i++) {
            addNumber(liveData[`threePrizes_${i}`]);
        }
        for (let i = 0; i < 4; i++) {
            addNumber(liveData[`fourPrizes_${i}`]);
        }
        for (let i = 0; i < 6; i++) {
            addNumber(liveData[`fivePrizes_${i}`]);
        }
        for (let i = 0; i < 3; i++) {
            addNumber(liveData[`sixPrizes_${i}`]);
        }
        for (let i = 0; i < 4; i++) {
            addNumber(liveData[`sevenPrizes_${i}`]);
        }

        const heads = Array(10).fill().map(() => []);
        const tails = Array(10).fill().map(() => []);

        lastTwoNumbers.forEach((last2) => {
            if (last2.length === 2) {
                const head = parseInt(last2[0], 10);
                const tail = parseInt(last2[1], 10);
                if (!isNaN(head) && !isNaN(tail)) {
                    heads[head].push(last2);
                    tails[tail].push(last2);
                }
            }
        });

        console.log('Last Two Numbers:', lastTwoNumbers);
        console.log('Heads:', heads);
        console.log('Tails:', tails);
        return { heads, tails };
    };

    const { heads, tails } = getPrizeNumbers();
    const sevenPrizes = [
        getFilteredNumber(liveData.sevenPrizes_0 || '...', 'last2'),
        getFilteredNumber(liveData.sevenPrizes_1 || '...', 'last2'),
        getFilteredNumber(liveData.sevenPrizes_2 || '...', 'last2'),
        getFilteredNumber(liveData.sevenPrizes_3 || '...', 'last2'),
    ].filter(num => num && num !== '...' && num !== '***');
    const specialPrize = getFilteredNumber(liveData.specialPrize_0 || '...', 'last2');

    return (
        <div className={styles.live}>
            {error && <div className={styles.error}>{error}</div>}
            {isTodayLoading && (
                <div className={styles.loading}>Đang chờ kết quả ngày {today}...</div>
            )}
            <div className={styles.kqxs}>
                {/* Thêm div header để đồng bộ với KQXS */}
                <div className={styles.header}>
                    <h2 className={styles.kqxs__title}>
                        Kết Quả Xổ Số - <span>{liveData.station}</span> ({liveData.tentinh})
                    </h2>
                    <div className={styles.kqxs__action}>
                        <a className={styles.kqxs__actionLink} href="#!">{liveData.station}</a>
                        <a className={`${styles.kqxs__actionLink} ${styles.dayOfWeek}`} href="#!">{liveData.dayOfWeek}</a>
                        <a className={styles.kqxs__actionLink} href="#!">{liveData.drawDate}</a>
                    </div>
                </div>
                <table className={styles.tableXS}>
                    <tbody>
                        <tr>
                            <td className={`${styles.code} ${styles.rowXS}`}>
                                <span className={styles.span0}>
                                    {liveData.maDB === '...' || liveData.maDB === '***' ? (
                                        <span className={styles.ellipsis}></span>
                                    ) : (
                                        liveData.maDB
                                    )}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td className={`${styles.tdTitle} ${styles.highlight}`}>ĐB</td>
                            <td className={styles.rowXS}>
                                <span className={`${styles.span1} ${styles.gdb} ${styles.highlight}`}>
                                    {liveData.specialPrize_0 === '...' || liveData.specialPrize_0 === '***' ? (
                                        <span className={styles.ellipsis}></span>
                                    ) : (
                                        getFilteredNumber(liveData.specialPrize_0, currentFilter)
                                    )}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td className={styles.tdTitle}>G1</td>
                            <td className={styles.rowXS}>
                                <span className={styles.span1}>
                                    {liveData.firstPrize_0 === '...' || liveData.firstPrize_0 === '***' ? (
                                        <span className={styles.ellipsis}></span>
                                    ) : (
                                        getFilteredNumber(liveData.firstPrize_0, currentFilter)
                                    )}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td className={styles.tdTitle}>G2</td>
                            <td className={styles.rowXS}>
                                <span className={styles.span2}>
                                    {liveData.secondPrize_0 === '...' || liveData.secondPrize_0 === '***' ? (
                                        <span className={styles.ellipsis}></span>
                                    ) : (
                                        getFilteredNumber(liveData.secondPrize_0, currentFilter)
                                    )}
                                </span>
                                <span className={styles.span2}>
                                    {liveData.secondPrize_1 === '...' || liveData.secondPrize_1 === '***' ? (
                                        <span className={styles.ellipsis}></span>
                                    ) : (
                                        getFilteredNumber(liveData.secondPrize_1, currentFilter)
                                    )}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td className={`${styles.tdTitle} ${styles.g3}`}>G3</td>
                            <td className={styles.rowXS}>
                                <span className={`${styles.span3} ${styles.g3}`}>
                                    {liveData.threePrizes_0 === '...' || liveData.threePrizes_0 === '***' ? (
                                        <span className={styles.ellipsis}></span>
                                    ) : (
                                        getFilteredNumber(liveData.threePrizes_0, currentFilter)
                                    )}
                                </span>
                                <span className={`${styles.span3} ${styles.g3}`}>
                                    {liveData.threePrizes_1 === '...' || liveData.threePrizes_1 === '***' ? (
                                        <span className={styles.ellipsis}></span>
                                    ) : (
                                        getFilteredNumber(liveData.threePrizes_1, currentFilter)
                                    )}
                                </span>
                                <span className={`${styles.span3} ${styles.g3}`}>
                                    {liveData.threePrizes_2 === '...' || liveData.threePrizes_2 === '***' ? (
                                        <span className={styles.ellipsis}></span>
                                    ) : (
                                        getFilteredNumber(liveData.threePrizes_2, currentFilter)
                                    )}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td className={styles.tdTitle}></td>
                            <td className={styles.rowXS}>
                                <span className={styles.span3}>
                                    {liveData.threePrizes_3 === '...' || liveData.threePrizes_3 === '***' ? (
                                        <span className={styles.ellipsis}></span>
                                    ) : (
                                        getFilteredNumber(liveData.threePrizes_3, currentFilter)
                                    )}
                                </span>
                                <span className={styles.span3}>
                                    {liveData.threePrizes_4 === '...' || liveData.threePrizes_4 === '***' ? (
                                        <span className={styles.ellipsis}></span>
                                    ) : (
                                        getFilteredNumber(liveData.threePrizes_4, currentFilter)
                                    )}
                                </span>
                                <span className={styles.span3}>
                                    {liveData.threePrizes_5 === '...' || liveData.threePrizes_5 === '***' ? (
                                        <span className={styles.ellipsis}></span>
                                    ) : (
                                        getFilteredNumber(liveData.threePrizes_5, currentFilter)
                                    )}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td className={styles.tdTitle}>G4</td>
                            <td className={styles.rowXS}>
                                <span className={styles.span4}>
                                    {liveData.fourPrizes_0 === '...' || liveData.fourPrizes_0 === '***' ? (
                                        <span className={styles.ellipsis}></span>
                                    ) : (
                                        getFilteredNumber(liveData.fourPrizes_0, currentFilter)
                                    )}
                                </span>
                                <span className={styles.span4}>
                                    {liveData.fourPrizes_1 === '...' || liveData.fourPrizes_1 === '***' ? (
                                        <span className={styles.ellipsis}></span>
                                    ) : (
                                        getFilteredNumber(liveData.fourPrizes_1, currentFilter)
                                    )}
                                </span>
                                <span className={styles.span4}>
                                    {liveData.fourPrizes_2 === '...' || liveData.fourPrizes_2 === '***' ? (
                                        <span className={styles.ellipsis}></span>
                                    ) : (
                                        getFilteredNumber(liveData.fourPrizes_2, currentFilter)
                                    )}
                                </span>
                                <span className={styles.span4}>
                                    {liveData.fourPrizes_3 === '...' || liveData.fourPrizes_3 === '***' ? (
                                        <span className={styles.ellipsis}></span>
                                    ) : (
                                        getFilteredNumber(liveData.fourPrizes_3, currentFilter)
                                    )}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td className={`${styles.tdTitle} ${styles.g3}`}>G5</td>
                            <td className={styles.rowXS}>
                                <span className={`${styles.span3} ${styles.g3}`}>
                                    {liveData.fivePrizes_0 === '...' || liveData.fivePrizes_0 === '***' ? (
                                        <span className={styles.ellipsis}></span>
                                    ) : (
                                        getFilteredNumber(liveData.fivePrizes_0, currentFilter)
                                    )}
                                </span>
                                <span className={`${styles.span3} ${styles.g3}`}>
                                    {liveData.fivePrizes_1 === '...' || liveData.fivePrizes_1 === '***' ? (
                                        <span className={styles.ellipsis}></span>
                                    ) : (
                                        getFilteredNumber(liveData.fivePrizes_1, currentFilter)
                                    )}
                                </span>
                                <span className={`${styles.span3} ${styles.g3}`}>
                                    {liveData.fivePrizes_2 === '...' || liveData.fivePrizes_2 === '***' ? (
                                        <span className={styles.ellipsis}></span>
                                    ) : (
                                        getFilteredNumber(liveData.fivePrizes_2, currentFilter)
                                    )}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td className={styles.tdTitle}></td>
                            <td className={styles.rowXS}>
                                <span className={styles.span3}>
                                    {liveData.fivePrizes_3 === '...' || liveData.fivePrizes_3 === '***' ? (
                                        <span className={styles.ellipsis}></span>
                                    ) : (
                                        getFilteredNumber(liveData.fivePrizes_3, currentFilter)
                                    )}
                                </span>
                                <span className={styles.span3}>
                                    {liveData.fivePrizes_4 === '...' || liveData.fivePrizes_4 === '***' ? (
                                        <span className={styles.ellipsis}></span>
                                    ) : (
                                        getFilteredNumber(liveData.fivePrizes_4, currentFilter)
                                    )}
                                </span>
                                <span className={styles.span3}>
                                    {liveData.fivePrizes_5 === '...' || liveData.fivePrizes_5 === '***' ? (
                                        <span className={styles.ellipsis}></span>
                                    ) : (
                                        getFilteredNumber(liveData.fivePrizes_5, currentFilter)
                                    )}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td className={styles.tdTitle}>G6</td>
                            <td className={styles.rowXS}>
                                <span className={styles.span3}>
                                    {liveData.sixPrizes_0 === '...' || liveData.sixPrizes_0 === '***' ? (
                                        <span className={styles.ellipsis}></span>
                                    ) : (
                                        getFilteredNumber(liveData.sixPrizes_0, currentFilter)
                                    )}
                                </span>
                                <span className={styles.span3}>
                                    {liveData.sixPrizes_1 === '...' || liveData.sixPrizes_1 === '***' ? (
                                        <span className={styles.ellipsis}></span>
                                    ) : (
                                        getFilteredNumber(liveData.sixPrizes_1, currentFilter)
                                    )}
                                </span>
                                <span className={styles.span3}>
                                    {liveData.sixPrizes_2 === '...' || liveData.sixPrizes_2 === '***' ? (
                                        <span className={styles.ellipsis}></span>
                                    ) : (
                                        getFilteredNumber(liveData.sixPrizes_2, currentFilter)
                                    )}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td className={styles.tdTitle}>G7</td>
                            <td className={styles.rowXS}>
                                <span className={`${styles.span4} ${styles.highlight}`}>
                                    {liveData.sevenPrizes_0 === '...' || liveData.sevenPrizes_0 === '***' ? (
                                        <span className={styles.ellipsis}></span>
                                    ) : (
                                        getFilteredNumber(liveData.sevenPrizes_0, currentFilter)
                                    )}
                                </span>
                                <span className={`${styles.span4} ${styles.highlight}`}>
                                    {liveData.sevenPrizes_1 === '...' || liveData.sevenPrizes_1 === '***' ? (
                                        <span className={styles.ellipsis}></span>
                                    ) : (
                                        getFilteredNumber(liveData.sevenPrizes_1, currentFilter)
                                    )}
                                </span>
                                <span className={`${styles.span4} ${styles.highlight}`}>
                                    {liveData.sevenPrizes_2 === '...' || liveData.sevenPrizes_2 === '***' ? (
                                        <span className={styles.ellipsis}></span>
                                    ) : (
                                        getFilteredNumber(liveData.sevenPrizes_2, currentFilter)
                                    )}
                                </span>
                                <span className={`${styles.span4} ${styles.highlight}`}>
                                    {liveData.sevenPrizes_3 === '...' || liveData.sevenPrizes_3 === '***' ? (
                                        <span className={styles.ellipsis}></span>
                                    ) : (
                                        getFilteredNumber(liveData.sevenPrizes_3, currentFilter)
                                    )}
                                </span>
                            </td>
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
            <div className={styles.TKe_content}>
                <div className={styles.TKe_contentTitle}>
                    <span className={styles.title}>Bảng Lô Tô - </span>
                    <span className={styles.desc}>{liveData.tentinh}</span>
                    <span className={styles.dayOfWeek}>{`${liveData.dayOfWeek} - `}</span>
                    <span className={styles.desc}>{liveData.drawDate}</span>
                </div>
                <table className={styles.tableKey}>
                    <tbody>
                        <tr>
                            <td className={styles.t_h}>Đầu</td>
                            <td>Lô tô</td>
                            <td className={styles.t_h}>Đuôi</td>
                            <td>Lô tô</td>
                        </tr>
                        {Array.from({ length: 10 }, (_, index) => (
                            <tr key={index}>
                                <td className={styles.t_h}>{index}</td>
                                <td>
                                    {heads && heads[index] && heads[index].length > 0 ? (
                                        heads[index].map((num, idx) => (
                                            <span
                                                key={idx}
                                                className={
                                                    sevenPrizes.includes(num) || num === specialPrize
                                                        ? styles.highlight1
                                                        : ''
                                                }
                                            >
                                                {num}
                                            </span>
                                        )).reduce((prev, curr, i) => [prev, i ? ', ' : '', curr], [])
                                    ) : '-'}
                                </td>
                                <td className={styles.t_h}>{index}</td>
                                <td>
                                    {tails && tails[index] && tails[index].length > 0 ? (
                                        tails[index].map((num, idx) => (
                                            <span
                                                key={idx}
                                                className={
                                                    sevenPrizes.includes(num) || num === specialPrize
                                                        ? styles.highlight1
                                                        : ''
                                                }
                                            >
                                                {num}
                                            </span>
                                        )).reduce((prev, curr, i) => [prev, i ? ', ' : '', curr], [])
                                    ) : '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default React.memo(LiveResult);