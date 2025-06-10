import { useState, useEffect, useMemo, useCallback } from "react";
import styles from '../../public/css/kqxsMB.module.css';
import { getFilteredNumber } from "../../library/utils/filterUtils";
import { useRouter } from 'next/router';
import { apiMB } from "../api/kqxs/kqxsMB";
import React from 'react';
import LiveResult from './LiveResult';
import { useInView } from 'react-intersection-observer';
import { useLottery } from '../../contexts/LotteryContext';

const CACHE_DURATION = 24 * 60 * 60 * 1000; // Cache 24 giờ

const SkeletonLoading = () => (
    <div className={styles.skeleton}>
        <div className={styles.skeletonRow}></div>
        <div className={styles.skeletonRow}></div>
        <div className={styles.skeletonRow}></div>
    </div>
);

const KQXS = (props) => {
    const { liveData, isLiveDataComplete } = useLottery();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterTypes, setFilterTypes] = useState({});
    const [currentPage, setCurrentPage] = useState(1);
    const [isLiveWindow, setIsLiveWindow] = useState(false);
    const [hasTriggeredScraper, setHasTriggeredScraper] = useState(false);
    const hour = 18;
    const minute1 = 13;
    const minute2 = 14;

    const router = useRouter();
    const dayof = props.data4;
    const station = props.station || "xsmb";
    const date = props.data3;

    const itemsPerPage = 3;

    const today = new Date().toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });

    const startHour = hour;
    const startMinute = minute1;
    const duration = 22 * 60 * 1000;

    const CACHE_KEY = `xsmb_data_${station}_${date || 'null'}_${dayof || 'null'}`;

    useEffect(() => {
        const checkTime = () => {
            const now = new Date();
            const startTime = new Date();
            startTime.setHours(startHour, startMinute, 0, 0);
            const endTime = new Date(startTime.getTime() + duration);

            const isLive = now >= startTime && now <= endTime;
            setIsLiveWindow(prev => prev !== isLive ? isLive : prev);

            if (
                isLive &&
                now.getHours() === hour &&
                now.getMinutes() === minute2 &&
                now.getSeconds() <= 5 &&
                !hasTriggeredScraper
            ) {
                apiMB.triggerScraper(today, station)
                    .then((data) => {
                        if (process.env.NODE_ENV !== 'production') {
                            console.log('Scraper kích hoạt thành công:', data.message);
                        }
                        setHasTriggeredScraper(true);
                    })
                    .catch((error) => {
                        if (process.env.NODE_ENV !== 'production') {
                            console.error('Lỗi khi kích hoạt scraper:', error.message);
                        }
                    });
            }

            if (now.getHours() === 0 && now.getMinutes() === 0 && now.getSeconds() === 0) {
                setHasTriggeredScraper(false);
            }
        };

        checkTime();
        const intervalId = setInterval(checkTime, 5000);
        return () => clearInterval(intervalId);
    }, [hasTriggeredScraper, station, today]);

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

    const fetchData = useCallback(async () => {
        try {
            const now = new Date();
            const cachedData = localStorage.getItem(CACHE_KEY);
            const cachedTime = localStorage.getItem(`${CACHE_KEY}_time`);
            const cacheAge = cachedTime ? now.getTime() - parseInt(cachedTime) : Infinity;

            // Ưu tiên liveData nếu có
            const liveCache = localStorage.getItem(`liveData:${station}:${today}`);
            if (liveCache) {
                const liveDataParsed = JSON.parse(liveCache);
                const isComplete = Object.values(liveDataParsed).every(
                    val => typeof val === 'string' && val !== '...' && val !== '***'
                );
                if (isComplete) {
                    const formattedLiveData = {
                        ...liveDataParsed,
                        drawDate: new Date(liveDataParsed.drawDate).toLocaleDateString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                        }),
                        specialPrize: [liveDataParsed.specialPrize_0],
                        firstPrize: [liveDataParsed.firstPrize_0],
                        secondPrize: [liveDataParsed.secondPrize_0, liveDataParsed.secondPrize_1],
                        threePrizes: [
                            liveDataParsed.threePrizes_0, liveDataParsed.threePrizes_1, liveDataParsed.threePrizes_2,
                            liveDataParsed.threePrizes_3, liveDataParsed.threePrizes_4, liveDataParsed.threePrizes_5,
                        ],
                        fourPrizes: [
                            liveDataParsed.fourPrizes_0, liveDataParsed.fourPrizes_1, liveDataParsed.fourPrizes_2, liveDataParsed.fourPrizes_3,
                        ],
                        fivePrizes: [
                            liveDataParsed.fivePrizes_0, liveDataParsed.fivePrizes_1, liveDataParsed.fivePrizes_2,
                            liveDataParsed.fivePrizes_3, liveDataParsed.fivePrizes_4, liveDataParsed.fivePrizes_5,
                        ],
                        sixPrizes: [liveDataParsed.sixPrizes_0, liveDataParsed.sixPrizes_1, liveDataParsed.sixPrizes_2],
                        sevenPrizes: [
                            liveDataParsed.sevenPrizes_0, liveDataParsed.sevenPrizes_1, liveDataParsed.sevenPrizes_2, liveDataParsed.sevenPrizes_3,
                        ],
                    };
                    const newData = [formattedLiveData];
                    setData(newData);
                    localStorage.setItem(CACHE_KEY, JSON.stringify(newData));
                    localStorage.setItem(`${CACHE_KEY}_time`, now.getTime().toString());
                    setLoading(false);
                    return;
                }
            }

            if (cachedData && cacheAge < CACHE_DURATION) {
                setData(JSON.parse(cachedData));
                setLoading(false);
                return;
            }

            if (props.data && Array.isArray(props.data) && props.data.length > 0) {
                const dayMap = {
                    'thu-2': 'Thứ Hai',
                    'thu-3': 'Thứ Ba',
                    'thu-4': 'Thứ Tư',
                    'thu-5': 'Thứ Năm',
                    'thu-6': 'Thứ Sáu',
                    'thu-7': 'Thứ Bảy',
                    'chu-nhat': 'Chủ Nhật'
                };
                const isPropsDataValid = props.data.every(item => {
                    const itemDate = new Date(item.drawDate).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                    });
                    const matchesStation = item.station === station;
                    const matchesDate = !date || itemDate === date;
                    const matchesDayOfWeek = !dayof || item.dayOfWeek.toLowerCase() === dayMap[dayof.toLowerCase()]?.toLowerCase();
                    return matchesStation && matchesDate && matchesDayOfWeek;
                });

                if (isPropsDataValid) {
                    const formattedData = props.data.map(item => ({
                        ...item,
                        drawDate: new Date(item.drawDate).toLocaleDateString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                        }),
                    }));
                    setData(formattedData);
                    localStorage.setItem(CACHE_KEY, JSON.stringify(formattedData));
                    localStorage.setItem(`${CACHE_KEY}_time`, now.getTime().toString());
                    setLoading(false);
                    return;
                }
            }

            const result = await apiMB.getLottery(station, date, dayof);
            const dataArray = Array.isArray(result) ? result : [result];

            const formattedData = dataArray.map(item => ({
                ...item,
                drawDate: new Date(item.drawDate).toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                }),
            }));

            setData(prevData => {
                const newDataStr = JSON.stringify(formattedData);
                if (JSON.stringify(prevData) !== newDataStr) {
                    return [...formattedData];
                }
                return prevData;
            });

            localStorage.setItem(CACHE_KEY, JSON.stringify(formattedData));
            localStorage.setItem(`${CACHE_KEY}_time`, now.getTime().toString());

            setFilterTypes(prevFilters => {
                const newFilters = formattedData.reduce((acc, item) => {
                    acc[item.drawDate + item.station] = prevFilters[item.drawDate + item.station] || 'all';
                    return acc;
                }, {});
                if (JSON.stringify(prevFilters) !== JSON.stringify(newFilters)) {
                    return newFilters;
                }
                return prevFilters;
            });

            setLoading(false);
            setError(null);
        } catch (error) {
            console.error('Lỗi khi lấy dữ liệu xổ số:', error);
            setError('Không thể tải dữ liệu, vui lòng thử lại sau');
            setLoading(false);
        }
    }, [station, date, dayof, props.data]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        const updateFromLiveData = () => {
            if (liveData && liveData.drawDate === today && isLiveDataComplete) {
                setData(prevData => {
                    const filteredData = prevData.filter(item => item.drawDate !== today);
                    const formattedLiveData = {
                        ...liveData,
                        drawDate: new Date(liveData.drawDate).toLocaleDateString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                        }),
                        specialPrize: [liveData.specialPrize_0],
                        firstPrize: [liveData.firstPrize_0],
                        secondPrize: [liveData.secondPrize_0, liveData.secondPrize_1],
                        threePrizes: [
                            liveData.threePrizes_0, liveData.threePrizes_1, liveData.threePrizes_2,
                            liveData.threePrizes_3, liveData.threePrizes_4, liveData.threePrizes_5,
                        ],
                        fourPrizes: [
                            liveData.fourPrizes_0, liveData.fourPrizes_1, liveData.fourPrizes_2, liveData.fourPrizes_3,
                        ],
                        fivePrizes: [
                            liveData.fivePrizes_0, liveData.fivePrizes_1, liveData.fivePrizes_2,
                            liveData.fivePrizes_3, liveData.fivePrizes_4, liveData.fivePrizes_5,
                        ],
                        sixPrizes: [liveData.sixPrizes_0, liveData.sixPrizes_1, liveData.sixPrizes_2],
                        sevenPrizes: [
                            liveData.sevenPrizes_0, liveData.sevenPrizes_1, liveData.sevenPrizes_2, liveData.sevenPrizes_3,
                        ],
                    };
                    const newData = [formattedLiveData, ...filteredData].sort((a, b) =>
                        new Date(b.drawDate.split('/').reverse().join('-')) - new Date(a.drawDate.split('/').reverse().join('-'))
                    );
                    localStorage.setItem(CACHE_KEY, JSON.stringify(newData));
                    localStorage.setItem(`${CACHE_KEY}_time`, new Date().getTime().toString());
                    return newData;
                });
            }
        };

        updateFromLiveData();
        const intervalId = setInterval(updateFromLiveData, 60000);
        return () => clearInterval(intervalId);
    }, [liveData, isLiveDataComplete, today, CACHE_KEY]);

    const handleFilterChange = useCallback((pageKey, value) => {
        setFilterTypes(prev => ({ ...prev, [pageKey]: value }));
    }, []);

    const getHeadAndTailNumbers = useMemo(() => (data2) => {
        const specialNumbers = (data2.specialPrize || []).map(num => getFilteredNumber(num, 'last2'));
        const sevenNumbers = (data2.sevenPrizes || []).map(num => getFilteredNumber(num, 'last2'));
        const allNumbers = [
            ...specialNumbers,
            ...sevenNumbers,
            ...(data2.firstPrize || []).map(num => getFilteredNumber(num, 'last2')),
            ...(data2.secondPrize || []).map(num => getFilteredNumber(num, 'last2')),
            ...(data2.threePrizes || []).map(num => getFilteredNumber(num, 'last2')),
            ...(data2.fourPrizes || []).map(num => getFilteredNumber(num, 'last2')),
            ...(data2.fivePrizes || []).map(num => getFilteredNumber(num, 'last2')),
            ...(data2.sixPrizes || []).map(num => getFilteredNumber(num, 'last2')),
        ].filter(num => num && num !== '' && !isNaN(num));

        const heads = Array(10).fill().map(() => []);
        const tails = Array(10).fill().map(() => []);

        allNumbers.forEach(number => {
            const numStr = number.toString().padStart(2, '0');
            const head = parseInt(numStr[0]);
            const tail = parseInt(numStr[1]);

            if (!isNaN(head) && !isNaN(tail)) {
                const isHighlighted = specialNumbers.includes(numStr) || sevenNumbers.includes(numStr);
                heads[head].push({ value: numStr, isHighlighted });
                tails[tail].push({ value: numStr, isHighlighted });
            }
        });

        for (let i = 0; i < 10; i++) {
            heads[i].sort((a, b) => parseInt(a.value) - parseInt(b.value));
            tails[i].sort((a, b) => parseInt(a.value) - parseInt(b.value));
        }

        return { heads, tails };
    }, []);

    const totalPages = useMemo(() => Math.ceil(data.length / itemsPerPage), [data]);
    const startIndex = useMemo(() => (currentPage - 1) * itemsPerPage, [currentPage]);
    const endIndex = useMemo(() => startIndex + itemsPerPage, [startIndex]);
    const currentData = useMemo(() => data.slice(startIndex, endIndex), [data, startIndex, endIndex]);

    const goToPage = useCallback((page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [totalPages]);

    if (loading) {
        return <SkeletonLoading />;
    }

    if (error) {
        return <div className={styles.error}>{error}</div>;
    }

    const LoToTable = React.memo(({ data2, heads, tails }) => {
        const { ref, inView } = useInView({
            triggerOnce: true,
            threshold: 0.1,
        });

        return (
            <div className={styles.TKe_content}>
                <h2 className={styles.TKe_contentTitle}>
                    <span className={styles.title}>Bảng Lô Tô - </span>
                    <span className={styles.desc}>{data2.tentinh} -</span>
                    <span className={styles.dayOfWeek}>{`${data2.dayOfWeek} - `}</span>
                    <span className={styles.desc}>{data2.drawDate}</span>
                </h2>
                <div ref={ref}>
                    {inView ? (
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
                                            {heads[index].length > 0 ? (
                                                heads[index].map((num, idx) => (
                                                    <span
                                                        key={`${num.value}-${idx}`}
                                                        className={num.isHighlighted ? styles.highlight1 : ''}
                                                    >
                                                        {num.value}{idx < heads[index].length - 1 ? ', ' : ''}
                                                    </span>
                                                ))
                                            ) : (
                                                '-'
                                            )}
                                        </td>
                                        <td className={styles.t_h}>{index}</td>
                                        <td>
                                            {tails[index].length > 0 ? (
                                                tails[index].map((num, idx) => (
                                                    <span
                                                        key={`${num.value}-${idx}`}
                                                        className={num.isHighlighted ? styles.highlight1 : ''}
                                                    >
                                                        {num.value}{idx < tails[index].length - 1 ? ', ' : ''}
                                                    </span>
                                                ))
                                            ) : (
                                                '-'
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className={styles.placeholder}>Đang tải bảng lô tô...</div>
                    )}
                </div>
            </div>
        );
    });

    return (
        <div className={styles.containerKQ}>
            {isLiveMode && isLiveWindow && (
                <LiveResult
                    station={station}
                    today={today}
                    getHeadAndTailNumbers={getHeadAndTailNumbers}
                    handleFilterChange={handleFilterChange}
                    filterTypes={filterTypes}
                    isLiveWindow={isLiveWindow}
                />
            )}
            {currentData.map((data2) => {
                const tableKey = data2.drawDate + data2.tinh;
                const currentFilter = filterTypes[tableKey] || 'all';
                const { heads, tails } = getHeadAndTailNumbers(data2);

                return (
                    <div key={tableKey}>
                        <div className={styles.kqxs}>
                            <div className={styles.header}>
                                <h1 className={styles.kqxs__title}>
                                    Kết Quả Xổ Số - <span>{data2.station}</span> ({data2.tentinh})
                                </h1>
                                <div className={styles.kqxs__action}>
                                    <a className={styles.kqxs__actionLink} href="#!">{data2.station}</a>
                                    <a className={`${styles.kqxs__actionLink} ${styles.dayOfWeek}`} href="#!">{data2.dayOfWeek}</a>
                                    <a className={styles.kqxs__actionLink} href="#!">{data2.drawDate}</a>
                                </div>
                            </div>
                            <table className={styles.tableXS}>
                                <tbody>
                                    <tr>
                                        <td className={`${styles.code} ${styles.rowXS}`}>
                                            <span className={styles.span0}>
                                                {data2.maDB === '...' ? <span className={styles.ellipsis}></span> : data2.maDB}
                                            </span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={`${styles.tdTitle} ${styles.highlight}`}>ĐB</td>
                                        <td className={styles.rowXS}>
                                            {(data2.specialPrize || []).map((kq, index) => (
                                                <span
                                                    key={`${kq}-${index}`}
                                                    className={`${styles.span1} ${styles.highlight} ${styles.gdb}`}
                                                >
                                                    {kq === '...' ? <span className={styles.ellipsis}></span> : getFilteredNumber(kq, currentFilter)}
                                                </span>
                                            ))}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={styles.tdTitle}>G1</td>
                                        <td className={styles.rowXS}>
                                            {(data2.firstPrize || []).map((kq, index) => (
                                                <span key={`${kq}-${index}`} className={styles.span1}>
                                                    {kq === '...' ? <span className={styles.ellipsis}></span> : getFilteredNumber(kq, currentFilter)}
                                                </span>
                                            ))}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={styles.tdTitle}>G2</td>
                                        <td className={styles.rowXS}>
                                            {(data2.secondPrize || []).map((kq, index) => (
                                                <span key={`${kq}-${index}`} className={styles.span2}>
                                                    {kq === '...' ? <span className={styles.ellipsis}></span> : getFilteredNumber(kq, currentFilter)}
                                                </span>
                                            ))}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={`${styles.tdTitle} ${styles.g3}`}>G3</td>
                                        <td className={styles.rowXS}>
                                            {(data2.threePrizes || []).slice(0, 3).map((kq, index) => (
                                                <span
                                                    key={`${kq}-${index}`}
                                                    className={`${styles.span3} ${styles.g3}`}
                                                >
                                                    {kq === '...' ? <span className={styles.ellipsis}></span> : getFilteredNumber(kq, currentFilter)}
                                                </span>
                                            ))}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={styles.tdTitle}></td>
                                        <td className={styles.rowXS}>
                                            {(data2.threePrizes || []).slice(3, 6).map((kq, index) => (
                                                <span key={`${kq}-${index}`} className={styles.span3}>
                                                    {kq === '...' ? <span className={styles.ellipsis}></span> : getFilteredNumber(kq, currentFilter)}
                                                </span>
                                            ))}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={styles.tdTitle}>G4</td>
                                        <td className={styles.rowXS}>
                                            {(data2.fourPrizes || []).map((kq, index) => (
                                                <span key={`${kq}-${index}`} className={styles.span4}>
                                                    {kq === '...' ? <span className={styles.ellipsis}></span> : getFilteredNumber(kq, currentFilter)}
                                                </span>
                                            ))}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={`${styles.tdTitle} ${styles.g3}`}>G5</td>
                                        <td className={styles.rowXS}>
                                            {(data2.fivePrizes || []).slice(0, 3).map((kq, index) => (
                                                <span
                                                    key={`${kq}-${index}`}
                                                    className={`${styles.span3} ${styles.g3}`}
                                                >
                                                    {kq === '...' ? <span className={styles.ellipsis}></span> : getFilteredNumber(kq, currentFilter)}
                                                </span>
                                            ))}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={styles.tdTitle}></td>
                                        <td className={styles.rowXS}>
                                            {(data2.fivePrizes || []).slice(3, 6).map((kq, index) => (
                                                <span key={`${kq}-${index}`} className={styles.span3}>
                                                    {kq === '...' ? <span className={styles.ellipsis}></span> : getFilteredNumber(kq, currentFilter)}
                                                </span>
                                            ))}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={styles.tdTitle}>G6</td>
                                        <td className={styles.rowXS}>
                                            {(data2.sixPrizes || []).map((kq, index) => (
                                                <span key={`${kq}-${index}`} className={styles.span3}>
                                                    {kq === '...' ? <span className={styles.ellipsis}></span> : getFilteredNumber(kq, currentFilter)}
                                                </span>
                                            ))}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={styles.tdTitle}>G7</td>
                                        <td className={styles.rowXS}>
                                            {(data2.sevenPrizes || []).map((kq, index) => (
                                                <span
                                                    key={`${kq}-${index}`}
                                                    className={`${styles.span4} ${styles.highlight}`}
                                                >
                                                    {kq === '...' ? <span className={styles.ellipsis}></span> : getFilteredNumber(kq, currentFilter)}
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
                        <LoToTable
                            data2={data2}
                            heads={heads}
                            tails={tails}
                        />
                    </div>
                );
            })}
            {data.length > 1 && (
                <div className={styles.pagination}>
                    <a
                        href={`/ket-qua-xo-so-mien-bac?page=${currentPage - 1}`}
                        onClick={(e) => {
                            e.preventDefault();
                            goToPage(currentPage - 1);
                        }}
                        className={`${styles.paginationButton} ${currentPage === 1 ? styles.disabled : ''}`}
                    >
                        Trước
                    </a>
                    <span>Trang {currentPage} / {totalPages}</span>
                    <a
                        href={`/ket-qua-xo-so-mien-bac?page=${currentPage + 1}`}
                        onClick={(e) => {
                            e.preventDefault();
                            goToPage(currentPage + 1);
                        }}
                        className={`${styles.paginationButton} ${currentPage === totalPages ? styles.disabled : ''}`}
                    >
                        Sau
                    </a>
                </div>
            )}
        </div>
    );
};

export default React.memo(KQXS);