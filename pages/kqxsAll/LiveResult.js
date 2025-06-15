import { useState, useEffect, useMemo } from "react";
import styles from '../../styles/LivekqxsMB.module.css';
import { getFilteredNumber } from "../../library/utils/filterUtils";
import { apiMB } from "../api/kqxs/kqxsMB";
import React from 'react';
import { useLottery } from '../../contexts/LotteryContext';

const LiveResult = ({ station, today, getHeadAndTailNumbers, handleFilterChange, filterTypes, isLiveWindow }) => {
    const { liveData, setLiveData, setIsLiveDataComplete } = useLottery() || {};
    const [isTodayLoading, setIsTodayLoading] = useState(true);
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const [animatingPrize, setAnimatingPrize] = useState(null); // Theo dõi prizeType đang animating
    const [animatingNumbers, setAnimatingNumbers] = useState({}); // Lưu số animating

    const maxRetries = 50;
    const retryInterval = 10000;
    const fetchMaxRetries = 3;
    const fetchRetryInterval = 5000;

    const emptyResult = useMemo(() => ({
        drawDate: today,
        station: station || 'xsmb',
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
        if (!setLiveData || !setIsLiveDataComplete) return;

        const cachedLiveData = localStorage.getItem(`liveData:${station}:${today}`);
        if (cachedLiveData) {
            try {
                const parsedData = JSON.parse(cachedLiveData);
                setLiveData(parsedData);
                const isComplete = Object.values(parsedData).every(
                    val => typeof val === 'string' && val !== '...' && val !== '***'
                );
                setIsLiveDataComplete(isComplete);
                setIsTodayLoading(false);
            } catch (error) {
                console.error('Error parsing cachedLiveData:', error);
                setLiveData(emptyResult);
                setIsLiveDataComplete(false);
                setIsTodayLoading(isLiveWindow ? true : false);
            }
        } else {
            setLiveData(emptyResult);
            setIsLiveDataComplete(false);
            setIsTodayLoading(isLiveWindow ? true : false);
        }

        if (!isLiveWindow) {
            setRetryCount(0);
            setError(null);
        }
    }, [isLiveWindow, emptyResult, station, today, setLiveData, setIsLiveDataComplete]);

    useEffect(() => {
        let eventSource;
        let updateInterval = null;

        const fetchInitialData = async (retry = 0) => {
            if (!station || !today || !/^\d{2}-\d{2}-\d{4}$/.test(today)) {
                console.warn('Invalid station or today value:', { station, today });
                setError('');
                setIsTodayLoading(false);
                return;
            }

            try {
                const response = await fetch(`https://backendkqxs.onrender.com/api/kqxs/xsmb/sse/initial?station=${station}&date=${today}`);
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                const initialData = await response.json();
                if (initialData) {
                    setLiveData(prev => {
                        const updatedData = { ...prev, ...initialData };
                        localStorage.setItem(`liveData:${station}:${today}`, JSON.stringify(updatedData));
                        const isComplete = Object.values(updatedData).every(
                            val => typeof val === 'string' && val !== '...' && val !== '***'
                        );
                        setIsLiveDataComplete(isComplete);
                        setIsTodayLoading(false);
                        return updatedData;
                    });
                    setRetryCount(0);
                    setError(null);
                }
            } catch (error) {
                console.error(`Lỗi khi lấy dữ liệu khởi tạo từ Redis (lần ${retry + 1}):`, error.message);
                if (retry < fetchMaxRetries) {
                    setTimeout(() => fetchInitialData(retry + 1), fetchRetryInterval);
                } else {
                    setError('Không thể lấy dữ liệu ban đầu, đang dựa vào dữ liệu cục bộ...');
                    setIsTodayLoading(false);
                }
            }
        };

        const connectSSE = () => {
            if (!station || !today) {
                console.warn('Không thể kết nối connect SSE: Invalid station or today');
                return;
            }
            eventSource = new EventSource(`https://backendkqxs.onrender.com/api/kqxs/xsmb/sse?station=${station}&date=${today}`);

            // Định nghĩa thứ tự animating
            const animationQueue = [
                'firstPrize_0', // Giải 1
                'secondPrize_0', 'secondPrize_1', // Giải 2
                'threePrizes_0', 'threePrizes_1', 'threePrizes_2', 'threePrizes_3', 'threePrizes_4', 'threePrizes_5', // Giải 3
                'fourPrizes_0', 'fourPrizes_1', 'fourPrizes_2', 'fourPrizes_3', // Giải 4
                'fivePrizes_0', 'fivePrizes_1', 'fivePrizes_2', 'fivePrizes_3', 'fivePrizes_4', 'fivePrizes_5', // Giải 5
                'sixPrizes_0', 'sixPrizes_1', 'sixPrizes_2', // Giải 6
                'sevenPrizes_0', 'sevenPrizes_1', 'sevenPrizes_2', 'sevenPrizes_3', // Giải 7
                'specialPrize_0' // Giải đặc biệt
            ];

            let currentIndex = 0; // Theo dõi vị trí trong animationQueue

            const prizeTypes = [
                'maDB', 'specialPrize_0', 'firstPrize_0', 'secondPrize_0', 'secondPrize_1',
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
                        console.log("data từ redis", data);
                        if (data && data[prizeType]) {
                            // Bắt đầu animating cho prizeType đầu tiên khi nhận dữ liệu rỗng
                            if (data[prizeType] === '...' && prizeType !== 'maDB' && currentIndex < animationQueue.length) {
                                const nextPrize = animationQueue[currentIndex];
                                if (nextPrize === prizeType && !animatingPrize) {
                                    setAnimatingPrize(nextPrize);
                                    updateInterval = setInterval(() => {
                                        setAnimatingNumbers(prev => ({
                                            ...prev,
                                            [nextPrize]: Math.floor(Math.random() * 100000).toString().padStart(5, '0')
                                        }));
                                    }, 100);
                                }
                            }

                            setLiveData(prev => {
                                const updatedData = {
                                    ...prev,
                                    [prizeType]: data[prizeType],
                                    tentinh: data.tentinh || prev.tentinh,
                                    tinh: data.tinh || prev.tinh,
                                    year: data.year || prev.year,
                                    month: data.month || prev.month,
                                };
                                localStorage.setItem(`liveData:${station}:${today}`, JSON.stringify(updatedData));
                                const isComplete = Object.values(updatedData).every(
                                    val => typeof val === 'string' && val !== '...' && val !== '***'
                                );
                                setIsLiveDataComplete(isComplete);
                                // Dừng animating và chuyển sang prizeType tiếp theo khi có kết quả
                                if (data[prizeType] !== '...' && animatingPrize === prizeType && updateInterval) {
                                    clearInterval(updateInterval);
                                    setAnimatingNumbers(prev => ({ ...prev, [prizeType]: null }));
                                    setAnimatingPrize(null);
                                    currentIndex++; // Chuyển sang phần tử tiếp theo
                                    if (currentIndex < animationQueue.length) {
                                        const nextPrize = animationQueue[currentIndex];
                                        if (liveData[nextPrize] === '...' && nextPrize !== 'maDB') {
                                            setAnimatingPrize(nextPrize);
                                            updateInterval = setInterval(() => {
                                                setAnimatingNumbers(prev => ({
                                                    ...prev,
                                                    [nextPrize]: Math.floor(Math.random() * 100000).toString().padStart(5, '0')
                                                }));
                                            }, 150);
                                        }
                                    }
                                }
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
                    setLiveData(emptyResult);
                    setIsLiveDataComplete(false);
                }
            };
        };

        if (isLiveWindow && retryCount <= maxRetries && setLiveData) {
            fetchInitialData();
            connectSSE();
        }

        return () => {
            if (eventSource) {
                console.log('Đóng kết nối SSE...');
                eventSource.close();
            }
            if (updateInterval) clearInterval(updateInterval);
        };
    }, [isLiveWindow, station, retryCount, maxRetries, retryInterval, today, setLiveData, setIsLiveDataComplete]);

    if (!liveData) {
        return <div className={styles.error}>Đang tải dữ liệu...</div>;
    }

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
        for (let i = 0; i < 2; i++) addNumber(liveData[`secondPrize_${i}`]);
        for (let i = 0; i < 6; i++) addNumber(liveData[`threePrizes_${i}`]);
        for (let i = 0; i < 4; i++) addNumber(liveData[`fourPrizes_${i}`]);
        for (let i = 0; i < 6; i++) addNumber(liveData[`fivePrizes_${i}`]);
        for (let i = 0; i < 3; i++) addNumber(liveData[`sixPrizes_${i}`]);
        for (let i = 0; i < 4; i++) addNumber(liveData[`sevenPrizes_${i}`]);

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

    // Hàm render giá trị với hiệu ứng animating
    const renderPrizeValue = (prizeType, digits = 5) => {
        const isAnimating = animatingPrize === prizeType && liveData[prizeType] === '...';
        const value = isAnimating ? animatingNumbers[prizeType] || '0'.repeat(digits) : liveData[prizeType];
        const className = `${styles.running_number} ${styles[`running_${digits}`]} ${isAnimating ? styles[`running_number[data-status="animating"]`] : ''}`;

        return (
            <span className={className} data-status={isAnimating ? 'animating' : 'static'}>
                {isAnimating ? (
                    <span className={styles.digit_container}>
                        {Array.from({ length: 5 }, (_, i) => (
                            <span key={i} className={styles.digit}>
                                {Math.floor(Math.random() * 10)}
                            </span>
                        ))}
                    </span>
                ) : liveData[prizeType] === '...' ? (
                    <span className={styles.ellipsis}></span>
                ) : (
                    getFilteredNumber(liveData[prizeType], currentFilter)
                )}
            </span>
        );
    };

    return (
        <div className={styles.live}>
            {error && <div className={styles.error}>{error}</div>}
            {isTodayLoading && (
                <div className={styles.loading}>Đang chờ kết quả ngày {today}...</div>
            )}
            <div className={styles.kqxs}>
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
                                    {liveData.maDB === '...' ? <span className={styles.ellipsis}></span> : liveData.maDB}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td className={`${styles.tdTitle} ${styles.highlight}`}>ĐB</td>
                            <td className={styles.rowXS}>
                                <span className={`${styles.span1} ${styles.highlight} ${styles.gdb}`}>
                                    {renderPrizeValue('specialPrize_0', 5)}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td className={styles.tdTitle}>G1</td>
                            <td className={styles.rowXS}>
                                <span className={styles.span1}>
                                    {renderPrizeValue('firstPrize_0', 5)}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td className={styles.tdTitle}>G2</td>
                            <td className={styles.rowXS}>
                                {[0, 1].map(i => (
                                    <span key={i} className={styles.span2}>
                                        {renderPrizeValue(`secondPrize_${i}`, 5)}
                                    </span>
                                ))}
                            </td>
                        </tr>
                        <tr>
                            <td className={`${styles.tdTitle} ${styles.g3}`}>G3</td>
                            <td className={styles.rowXS}>
                                {[0, 1, 2].map(i => (
                                    <span key={i} className={`${styles.span3} ${styles.g3}`}>
                                        {renderPrizeValue(`threePrizes_${i}`, 5)}
                                    </span>
                                ))}
                            </td>
                        </tr>
                        <tr>
                            <td className={styles.tdTitle}></td>
                            <td className={styles.rowXS}>
                                {[3, 4, 5].map(i => (
                                    <span key={i} className={styles.span3}>
                                        {renderPrizeValue(`threePrizes_${i}`, 5)}
                                    </span>
                                ))}
                            </td>
                        </tr>
                        <tr>
                            <td className={styles.tdTitle}>G4</td>
                            <td className={styles.rowXS}>
                                {[0, 1, 2, 3].map(i => (
                                    <span key={i} className={styles.span4}>
                                        {renderPrizeValue(`fourPrizes_${i}`, 5)}
                                    </span>
                                ))}
                            </td>
                        </tr>
                        <tr>
                            <td className={`${styles.tdTitle} ${styles.g3}`}>G5</td>
                            <td className={styles.rowXS}>
                                {[0, 1, 2].map(i => (
                                    <span key={i} className={`${styles.span3} ${styles.g3}`}>
                                        {renderPrizeValue(`fivePrizes_${i}`, 5)}
                                    </span>
                                ))}
                            </td>
                        </tr>
                        <tr>
                            <td className={styles.tdTitle}></td>
                            <td className={styles.rowXS}>
                                {[3, 4, 5].map(i => (
                                    <span key={i} className={styles.span3}>
                                        {renderPrizeValue(`fivePrizes_${i}`, 5)}
                                    </span>
                                ))}
                            </td>
                        </tr>
                        <tr>
                            <td className={styles.tdTitle}>G6</td>
                            <td className={styles.rowXS}>
                                {[0, 1, 2].map(i => (
                                    <span key={i} className={styles.span3}>
                                        {renderPrizeValue(`sixPrizes_${i}`, 5)}
                                    </span>
                                ))}
                            </td>
                        </tr>
                        <tr>
                            <td className={styles.tdTitle}>G7</td>
                            <td className={styles.rowXS}>
                                {[0, 1, 2, 3].map(i => (
                                    <span key={i} className={`${styles.span4} ${styles.highlight}`}>
                                        {renderPrizeValue(`sevenPrizes_${i}`, 5)}
                                    </span>
                                ))}
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

// Sử dụng getServerSideProps để truyền props và bật SSR
export async function getServerSideProps(context) {
    const today = new Date().toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).replace(/\//g, '-');
    return {
        props: {
            station: 'xsmb',
            today,
            isLiveWindow: isWithinLiveWindow(), // Hàm kiểm tra khung giờ trực tiếp
            filterTypes: {}, // Có thể lấy từ context hoặc database nếu cần
            getHeadAndTailNumbers: null, // Placeholder, cần triển khai nếu dùng
            handleFilterChange: null, // Placeholder, cần triển khai nếu dùng
        },
    };
}

// Hàm kiểm tra khung giờ trực tiếp (18:14–18:36)
function isWithinLiveWindow() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    return (hours === 18 && minutes >= 12 && minutes <= 32);
}

export default React.memo(LiveResult);