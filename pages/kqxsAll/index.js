import { apiMB } from "../api/kqxs/kqxsMB";
import { useState, useEffect, useMemo, useCallback } from "react";
import styles from '../../public/css/kqxsMB.module.css';
import { getFilteredNumber } from "../utils/filterUtils";
import { useRouter } from 'next/router';
import React from 'react';
import LiveResult from './LiveResult';

const KQXS = (props) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterTypes, setFilterTypes] = useState({});
    const [currentPage, setCurrentPage] = useState(1);
    const [isLiveWindow, setIsLiveWindow] = useState(false);
    const [hasTriggeredScraper, setHasTriggeredScraper] = useState(false);
    const hour = 18;
    const minute1 = 10;
    const minute2 = 15;

    const router = useRouter();
    let dayof;

    const station = props.station || "xsmb";
    const date = props.data3 && /^\d{2}-\d{2}-\d{4}$/.test(props.data3)
        ? props.data3
        : (dayof = props.data3);

    const itemsPerPage = 3;

    const today = new Date().toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });

    const startHour = hour;
    const startMinute = minute1;
    const duration = 22 * 60 * 1000;

    useEffect(() => {
        const checkTime = () => {
            const now = new Date();
            const startTime = new Date();
            startTime.setHours(startHour, startMinute, 0, 0);
            const endTime = new Date(startTime.getTime() + duration);

            const isLive = now >= startTime && now <= endTime;
            console.log('Current time:', now);
            console.log('Start time:', startTime);
            console.log('End time:', endTime);
            console.log('isLiveWindow:', isLive);
            setIsLiveWindow(isLive);

            // Kích hoạt scraper lúc 18:15:00
            if (
                isLive &&
                now.getHours() === hour &&
                now.getMinutes() === minute2 &&
                now.getSeconds() === 0 &&
                !hasTriggeredScraper
            ) {
                apiMB.triggerScraper(today, station)
                    .then((data) => {
                        console.log('Scraper kích hoạt thành công:', data.message);
                        setHasTriggeredScraper(true);
                    })
                    .catch((error) => {
                        console.error('Lỗi khi kích hoạt scraper:', error.message);
                    });
            }

            // Reset hasTriggeredScraper vào đầu ngày mới
            if (now.getHours() === 0 && now.getMinutes() === 0 && now.getSeconds() === 0) {
                setHasTriggeredScraper(false);
            }
        };

        checkTime();
        const intervalId = setInterval(checkTime, 1000);
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

            setData([...formattedData]);
            const initialFilters = formattedData.reduce((acc, item) => {
                acc[item.drawDate + item.station] = 'all';
                return acc;
            }, {});
            setFilterTypes(initialFilters);
            setLoading(false);
            setError(null);
        } catch (error) {
            console.error('Lỗi khi lấy dữ liệu xổ số:', error);
            setError('Không thể tải dữ liệu, vui lòng thử lại sau');
            setLoading(false);
        }
    }, [station, date, dayof]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleFilterChange = useCallback((key, value) => {
        setFilterTypes(prev => ({ ...prev, [key]: value }));
    }, []);

    const getHeadAndTailNumbers = useMemo(() => (data2) => {
        const allNumbers = [
            ...(data2.specialPrize || []),
            ...(data2.firstPrize || []),
            ...(data2.secondPrize || []),
            ...(data2.threePrizes || []),
            ...(data2.fourPrizes || []),
            ...(data2.fivePrizes || []),
            ...(data2.sixPrizes || []),
            ...(data2.sevenPrizes || []),
        ]
            .filter(num => num && num !== '...')
            .map(num => getFilteredNumber(num, 'last2'))
            .filter(num => num && !isNaN(num));

        const heads = Array(10).fill().map(() => []);
        const tails = Array(10).fill().map(() => []);

        allNumbers.forEach(number => {
            const numStr = number.toString().padStart(2, '0');
            const head = parseInt(numStr[0]);
            const tail = parseInt(numStr[numStr.length - 1]);

            if (!isNaN(head) && !isNaN(tail)) {
                heads[head].push(numStr);
                tails[tail].push(numStr);
            }
        });

        for (let i = 0; i < 10; i++) {
            heads[i].sort((a, b) => parseInt(a) - parseInt(b));
            tails[i].sort((a, b) => parseInt(a) - parseInt(b));
        }

        return { heads, tails };
    }, []);

    const totalPages = Math.ceil(data.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentData = data.slice(startIndex, endIndex);

    const goToPage = useCallback((page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    }, [totalPages]);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [currentPage]);

    if (loading) {
        return <div className={styles.loading}>Đang tải dữ liệu...</div>;
    }

    if (error) {
        return <div className={styles.error}>{error}</div>;
    }

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
                const tableKey = data2.drawDate + data2.station;
                const currentFilter = filterTypes[tableKey] || 'all';
                const { heads, tails } = getHeadAndTailNumbers(data2);
                const sevenPrizes = (data2.sevenPrizes || []).map(num => getFilteredNumber(num, 'last2'));
                const specialPrize = (data2.specialPrize || []).map(num => getFilteredNumber(num, 'last2'));

                return (
                    <div key={tableKey}>
                        <div className={styles.kqxs}>
                            <h2 className={styles.kqxs__title}>
                                Kết Quả Xổ Số - <span>{data2.station}</span> ({data2.tentinh})
                            </h2>
                            <div className={styles.kqxs__action}>
                                <a className={styles.kqxs__actionLink} href="#!">{data2.station}</a>
                                <a className={`${styles.kqxs__actionLink} ${styles.dayOfWeek}`} href="#!">{data2.dayOfWeek}</a>
                                <a className={styles.kqxs__actionLink} href="#!">{data2.drawDate}</a>
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
                                                    key={kq || index}
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
                                                <span key={kq || index} className={styles.span1}>
                                                    {kq === '...' ? <span className={styles.ellipsis}></span> : getFilteredNumber(kq, currentFilter)}
                                                </span>
                                            ))}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={styles.tdTitle}>G2</td>
                                        <td className={styles.rowXS}>
                                            {(data2.secondPrize || []).map((kq, index) => (
                                                <span key={kq || index} className={styles.span2}>
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
                                                    key={kq || index}
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
                                                <span key={kq || index} className={styles.span3}>
                                                    {kq === '...' ? <span className={styles.ellipsis}></span> : getFilteredNumber(kq, currentFilter)}
                                                </span>
                                            ))}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={styles.tdTitle}>G4</td>
                                        <td className={styles.rowXS}>
                                            {(data2.fourPrizes || []).map((kq, index) => (
                                                <span key={kq || index} className={styles.span4}>
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
                                                    key={kq || index}
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
                                                <span key={kq || index} className={styles.span3}>
                                                    {kq === '...' ? <span className={styles.ellipsis}></span> : getFilteredNumber(kq, currentFilter)}
                                                </span>
                                            ))}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={styles.tdTitle}>G6</td>
                                        <td className={styles.rowXS}>
                                            {(data2.sixPrizes || []).map((kq, index) => (
                                                <span key={index} className={styles.span3}>
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
                                                    key={index}
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
                        <div className={styles.TKe_content}>
                            <div className={styles.TKe_contentTitle}>
                                <span className={styles.title}>Bảng Lô Tô - </span>
                                <span className={styles.desc}>{data2.tentinh}</span>
                                <span className={styles.dayOfWeek}>{`${data2.dayOfWeek} - `}</span>
                                <span className={styles.desc}>{data2.drawDate}</span>
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
                                                {heads[index].map((num, idx) => (
                                                    <span
                                                        key={idx}
                                                        className={
                                                            sevenPrizes.includes(num) || specialPrize.includes(num)
                                                                ? styles.highlight1
                                                                : ''
                                                        }
                                                    >
                                                        {num}
                                                    </span>
                                                )).reduce((prev, curr, i) => [prev, i ? ', ' : '', curr], [])}
                                            </td>
                                            <td className={styles.t_h}>{index}</td>
                                            <td>
                                                {tails[index].map((num, idx) => (
                                                    <span
                                                        key={idx}
                                                        className={
                                                            sevenPrizes.includes(num) || specialPrize.includes(num)
                                                                ? styles.highlight1
                                                                : ''
                                                        }
                                                    >
                                                        {num}
                                                    </span>
                                                )).reduce((prev, curr, i) => [prev, i ? ', ' : '', curr], [])}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })}
            {data.length > 1 && (
                <div className={styles.pagination}>
                    <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={styles.paginationButton}
                    >
                        Trước
                    </button>
                    <span>Trang {currentPage} / {totalPages}</span>
                    <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={styles.paginationButton}
                    >
                        Sau
                    </button>
                </div>
            )}
        </div>
    );
};

export default React.memo(KQXS);