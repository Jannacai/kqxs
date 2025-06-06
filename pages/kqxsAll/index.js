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

const KQXS = ({ station, date, dayOfWeek, data }) => {
    const lotteryContext = useLottery();
    const { liveData, isLiveDataComplete } = lotteryContext || {};
    const [data1, setData] = useState(data || []);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterTypes, setFilterTypes] = useState({});
    const [currentPage, setCurrentPage] = useState(1);
    const [isLiveWindow, setIsLiveWindow] = useState(false);
    const [hasTriggeredScraper, setHasTriggeredScraper] = useState(false);
    const hour = 18;
    const minute1 = 16;
    const minute2 = 26;

    const router = useRouter();
    const itemsPerPage = 3;

    const today = new Date().toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).replace(/\//g, '-');

    const startHour = hour;
    const startMinute = minute1;
    const duration = 22 * 60 * 1000;

    const CACHE_KEY = `LiveData_${station}_${date || 'null'}_${dayOfWeek || 'null'}`;

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const checkTime = () => {
            const now = new Date();
            const startTime = new Date();
            startTime.setHours(startHour, startMinute, 0, 0);
            const endTime = new Date(startTime.getTime() + duration);

            const isLive = now >= startTime && now <= endTime;
            setIsLiveWindow(prev => (prev !== isLive ? isLive : prev));

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
        if (!date) return true;
        if (date === today) return true;
        const dayMap = {
            'thu-2': 'Thứ Hai',
            'thu-3': 'Thứ Ba',
            'thu-4': 'Thứ Tư',
            'thu-5': 'Thứ Năm',
            'thu-6': 'Thứ Sáu',
            'thu-7': 'Thứ Bảy',
            'chu-nhat': 'Chủ Nhật',
        };
        const todayDayOfWeek = new Date().toLocaleString('vi-VN', { weekday: 'long' });
        const inputDayOfWeek = dayMap[dayOfWeek?.toLowerCase()];
        return inputDayOfWeek && inputDayOfWeek === todayDayOfWeek;
    }, [date, today, dayOfWeek]);

    const fetchData = useCallback(async () => {
        try {
            const now = new Date();
            const isUpdateWindow = now.getHours() === 18 && now.getMinutes() >= 14 && now.getMinutes() <= 35;

            if (typeof window !== 'undefined') {
                const cachedData = localStorage.getItem(CACHE_KEY);
                const cachedTime = localStorage.getItem(`${CACHE_KEY}_time`);
                const cacheAge = cachedTime ? now.getTime() - parseInt(cachedTime) : Infinity;

                if (!isUpdateWindow && cachedData && cacheAge < CACHE_DURATION) {
                    setData(JSON.parse(cachedData));
                    setLoading(false);
                    return;
                }
            }

            if (data1 && Array.isArray(data1) && data1.length > 0) {
                const dayMap = {
                    'thu-2': 'Thứ Hai',
                    'thu-3': 'Thứ Ba',
                    'thu-4': 'Thứ Tư',
                    'thu-5': 'Thứ Năm',
                    'thu-6': 'Thứ Sáu',
                    'thu-7': 'Thứ Bảy',
                    'chu-nhat': 'Chủ Nhật',
                };
                const isPropsDataValid = data1.every(item => {
                    const itemDate = new Date(item.drawDate).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                    }).replace(/\//g, '-');
                    const matchesStation = item.station === station;
                    const matchesDate = !date || itemDate === date;
                    const matchesDayOfWeek = !dayOfWeek || item.dayOfWeek.toLowerCase() === dayMap[dayOfWeek.toLowerCase()]?.toLowerCase();
                    return matchesStation && matchesDate && matchesDayOfWeek;
                });

                if (isPropsDataValid) {
                    const formattedData = data1.map(item => ({
                        ...item,
                        drawDate: new Date(item.drawDate).toLocaleDateString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                        }).replace(/\//g, '-'),
                    }));
                    setData(formattedData);
                    if (typeof window !== 'undefined') {
                        localStorage.setItem(CACHE_KEY, JSON.stringify(formattedData));
                        localStorage.setItem(`${CACHE_KEY}_time`, now.getTime().toString());
                    }
                    setLoading(false);
                    return;
                }
            }

            const result = await apiMB.getLottery(station, date, dayOfWeek);
            const dataArray = Array.isArray(result) ? result : [result];

            const formattedData = dataArray.map(item => ({
                ...item,
                drawDate: new Date(item.drawDate).toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                }).replace(/\//g, '-'),
            }));

            setData(prevData => {
                const newDataStr = JSON.stringify(formattedData);
                if (JSON.stringify(prevData) !== newDataStr) {
                    return [...formattedData];
                }
                return prevData;
            });

            if (typeof window !== 'undefined') {
                localStorage.setItem(CACHE_KEY, JSON.stringify(formattedData));
                localStorage.setItem(`${CACHE_KEY}_time`, now.getTime().toString());
            }

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
    }, [station, date, dayOfWeek, data1]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (typeof window === 'undefined' || !isLiveDataComplete || !liveData || liveData.drawDate !== today) return;

        setData(prevData => {
            const filteredData = prevData.filter(item => item.drawDate !== today);
            const formattedLiveData = {
                ...liveData,
                drawDate: new Date(liveData.drawDate).toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                }).replace(/\//g, '-'),
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
                new Date(b.drawDate.split('-').reverse().join('-')) - new Date(a.drawDate.split('-').reverse().join('-'))
            );
            if (typeof window !== 'undefined') {
                localStorage.setItem(CACHE_KEY, JSON.stringify(newData));
                localStorage.setItem(`${CACHE_KEY}_time`, new Date().getTime().toString());
            }
            return newData;
        });
        setFilterTypes(prev => ({
            ...prev,
            [`${liveData.drawDate}${liveData.station}`]: prev[`${liveData.drawDate}${liveData.station}`] || 'all',
        }));
    }, [isLiveDataComplete, liveData, today, CACHE_KEY]);

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

    const totalPages = useMemo(() => Math.ceil(data1.length / itemsPerPage), [data1]);
    const startIndex = useMemo(() => (currentPage - 1) * itemsPerPage, [currentPage]);
    const endIndex = useMemo(() => startIndex + itemsPerPage, [startIndex]);
    const currentData = useMemo(() => data1.slice(startIndex, endIndex), [data1, startIndex, endIndex]);

    const goToPage = useCallback((page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
            if (typeof window !== 'undefined') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
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
            {data1.length > 1 && (
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

export async function getServerSideProps(context) {
    const { query } = context;
    const station = query.station || 'xsmb';
    const date = query.date || new Date().toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).replace(/\//g, '-');
    const dayOfWeek = query.dayOfWeek || null;

    try {
        const result = await apiMB.getLottery(station, date, dayOfWeek);
        const dataArray = Array.isArray(result) ? result : [result];

        const formattedData = dataArray.map(item => ({
            ...item,
            drawDate: new Date(item.drawDate).toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
            }).replace(/\//g, '-'),
        }));

        return {
            props: {
                station,
                date,
                dayOfWeek,
                data: formattedData,
            },
        };
    } catch (error) {
        console.error('Lỗi khi lấy dữ liệu trong getServerSideProps:', error);
        return {
            props: {
                station,
                date,
                dayOfWeek,
                data: [],
            },
        };
    }
}

export default React.memo(KQXS);