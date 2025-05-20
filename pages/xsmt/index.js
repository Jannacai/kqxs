import { apiMT } from "../api/kqxs/kqxsMT";
import { useState, useEffect } from "react";
import styles from '../../styles/kqxsMT.module.css';
import { getFilteredNumber } from "../../library/utils/filterUtils";
import { useRouter } from 'next/router';
import LiveResult from './LiveResult';

const KQXS = (props) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterTypes, setFilterTypes] = useState({});
    const [isRunning, setIsRunning] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasTriggeredScraper, setHasTriggeredScraper] = useState(false);

    const router = useRouter();
    let dayof;

    const station = props.station || "xsmt";
    const date = props.data3 && /^\d{2}-\d{2}-\d{4}$/.test(props.data3)
        ? props.data3
        : (dayof = props.data3);
    const tinh = props.tinh;
    const today = new Date().toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });

    const startHour = 17;
    const startMinute = 10;
    const duration = 23 * 60 * 1000;
    const itemsPerPage = 3;

    const fetchData = async () => {
        try {
            const result = await apiMT.getLottery(station, date, tinh, dayof);
            const dataArray = Array.isArray(result) ? result : [result];

            const formattedData = dataArray.map(item => ({
                ...item,
                drawDate: new Date(item.drawDate).toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                }),
                drawDateRaw: new Date(item.drawDate),
                tentinh: item.tentinh || `Tỉnh ${dataArray.indexOf(item) + 1}`,
            }));

            const groupedByDate = formattedData.reduce((acc, item) => {
                const dateKey = item.drawDate;
                if (!acc[dateKey]) {
                    acc[dateKey] = [];
                }
                acc[dateKey].push(item);
                return acc;
            }, {});

            const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
                const dateA = new Date(groupedByDate[a][0].drawDateRaw);
                const dateB = new Date(groupedByDate[b][0].drawDateRaw);
                return dateB - dateA;
            });

            const finalData = sortedDates.map(date => ({
                drawDate: date,
                stations: groupedByDate[date],
                dayOfWeek: groupedByDate[date][0].dayOfWeek,
            }));

            console.log('Grouped and sorted data:', finalData);
            setData(finalData);

            const initialFilters = finalData.reduce((acc, item) => {
                acc[item.drawDate] = 'all';
                return acc;
            }, {});
            setFilterTypes(initialFilters);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching lottery data:', error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        const checkTime = () => {
            const now = new Date();
            const startTime = new Date();
            startTime.setHours(startHour, startMinute, 0, 0);
            const endTime = new Date(startTime.getTime() + duration);

            const isLive = now >= startTime && now <= endTime;
            setIsRunning(isLive);

            if (
                isLive &&
                now.getHours() === 17 &&
                now.getMinutes() === 52 &&
                now.getSeconds() === 0 &&
                !hasTriggeredScraper
            ) {
                apiMT.triggerScraper(date || today, station)
                    .then((data) => {
                        console.log('Scraper kích hoạt thành công:', data.message);
                        setHasTriggeredScraper(true);
                    })
                    .catch((error) => {
                        console.error('Lỗi khi kích hoạt scraper:', error.message);
                    });
            }

            if (now.getHours() === 0 && now.getMinutes() === 0 && now.getSeconds() === 0) {
                setHasTriggeredScraper(false);
            }
        };

        checkTime();
        const timeCheckInterval = setInterval(checkTime, 1000);

        let fetchInterval;
        if (isRunning) {
            console.log('Starting fetch interval...');
            fetchInterval = setInterval(() => {
                console.log('Fetching data at:', new Date().toLocaleTimeString());
                fetchData();
            }, 20000);

            setTimeout(() => {
                clearInterval(fetchInterval);
                setIsRunning(false);
                console.log('Fetch interval stopped after 23 minutes.');
            }, duration);
        }

        return () => {
            console.log('Cleaning up intervals...');
            clearInterval(timeCheckInterval);
            if (fetchInterval) clearInterval(fetchInterval);
        };
    }, [station, date, tinh, isRunning, hasTriggeredScraper]);

    const handleFilterChange = (key, value) => {
        setFilterTypes((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const getHeadAndTailNumbers = (data2) => {
        const allNumbers = [
            ...(data2.specialPrize || []),
            ...(data2.firstPrize || []),
            ...(data2.secondPrize || []),
            ...(data2.threePrizes || []),
            ...(data2.fourPrizes || []),
            ...(data2.fivePrizes || []),
            ...(data2.sixPrizes || []),
            ...(data2.sevenPrizes || []),
            ...(data2.eightPrizes || []),
        ].filter(num => num != null && num !== '');

        const heads = Array(10).fill().map(() => []);
        const tails = Array(10).fill().map(() => []);

        allNumbers.forEach((number, idx) => {
            if (number != null && number !== '') {
                const numStr = number.toString().padStart(2, '0');
                const head = parseInt(numStr[0]);
                const tail = parseInt(numStr[numStr.length - 1]);
                const isSpecial = data2.specialPrize?.includes(number);
                const isEighth = data2.eightPrizes?.includes(number);

                if (!isNaN(head) && head >= 0 && head <= 9 && !isNaN(tail) && tail >= 0 && tail <= 9) {
                    heads[head].push({ num: numStr, isSpecial, isEighth });
                    tails[tail].push({ num: numStr, isSpecial, isEighth });
                }
            }
        });

        for (let i = 0; i < 10; i++) {
            heads[i].sort((a, b) => parseInt(a.num) - parseInt(b.num));
            tails[i].sort((a, b) => parseInt(a.num) - parseInt(b.num));
        }

        return { heads, tails };
    };

    const totalPages = Math.ceil(data.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentData = data.slice(startIndex, endIndex);

    const goToPage = (page) => {
        if (page >= 1 && page <= totalPages) {
            console.log(`Navigating to page ${page}`);
            setCurrentPage(page);
        }
    };

    useEffect(() => {
        console.log(`currentPage updated to ${currentPage}`);
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }, [currentPage]);

    if (loading) {
        return <div>Đang tải dữ liệu...</div>;
    }

    return (
        <div className={styles.containerKQ}>
            {isRunning && (
                <LiveResult
                    station={station}
                    today={today}
                    getHeadAndTailNumbers={getHeadAndTailNumbers}
                    handleFilterChange={handleFilterChange}
                    filterTypes={filterTypes}
                    isLiveWindow={isRunning}
                />
            )}
            {currentData.map((dayData) => {
                const tableKey = dayData.drawDate;
                const currentFilter = filterTypes[tableKey] || 'all';

                const allHeads = Array(10).fill().map(() => []);
                const allTails = Array(10).fill().map(() => []);
                const stationsData = dayData.stations.map(stationData => {
                    const { heads, tails } = getHeadAndTailNumbers(stationData);
                    for (let i = 0; i < 10; i++) {
                        allHeads[i].push(heads[i]);
                        allTails[i].push(tails[i]);
                    }
                    return { tentinh: stationData.tentinh, station: stationData.station };
                });

                return (
                    <div key={tableKey}>
                        <div className={styles.kqxs}>
                            <h2 className={styles.kqxs__title}>Kết Quả Xổ Số Miền Trung - {dayData.drawDate}</h2>
                            <div className={styles.kqxs__action}>
                                <a className={styles.kqxs__actionLink} href="#!">XSMT</a>
                                <a className={`${styles.kqxs__actionLink} ${styles.dayOfWeek}`} href="#!">{dayData.dayOfWeek}</a>
                                <a className={styles.kqxs__actionLink} href="#!">{dayData.drawDate}</a>
                            </div>
                            <table className={styles.tableXS}>
                                <thead>
                                    <tr>
                                        <th></th>
                                        {dayData.stations.map(stationData => (
                                            <th key={stationData.station} className={styles.stationName}>
                                                {stationData.tentinh || `Tỉnh ${dayData.stations.indexOf(stationData) + 1}`}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className={`${styles.tdTitle} ${styles.highlight}`}>G8</td>
                                        {dayData.stations.map(stationData => (
                                            <td key={stationData.station} className={styles.rowXS}>
                                                <span className={`${styles.prizeNumber} ${styles.highlight}`}>
                                                    {(stationData.eightPrizes || [])[0] ? getFilteredNumber(stationData.eightPrizes[0], currentFilter) : '-'}
                                                </span>
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className={styles.tdTitle}>G7</td>
                                        {dayData.stations.map(stationData => (
                                            <td key={stationData.station} className={styles.rowXS}>
                                                <span className={styles.prizeNumber}>
                                                    {(stationData.sevenPrizes || [])[0] ? getFilteredNumber(stationData.sevenPrizes[0], currentFilter) : '-'}
                                                </span>
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className={styles.tdTitle}>G6</td>
                                        {dayData.stations.map(stationData => (
                                            <td key={stationData.station} className={styles.rowXS}>
                                                {(stationData.sixPrizes || []).slice(0, 3).map((kq, idx) => (
                                                    <span key={idx} className={styles.prizeNumber}>
                                                        {getFilteredNumber(kq, currentFilter)}
                                                        {idx < (stationData.sixPrizes || []).slice(0, 3).length - 1 && <br />}
                                                    </span>
                                                ))}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className={`${styles.tdTitle} ${styles.g3}`}>G5</td>
                                        {dayData.stations.map(stationData => (
                                            <td key={stationData.station} className={styles.rowXS}>
                                                {(stationData.fivePrizes || []).slice(0, 3).map((kq, idx) => (
                                                    <span key={idx} className={`${styles.prizeNumber} ${styles.g3}`}>
                                                        {getFilteredNumber(kq, currentFilter)}
                                                        {idx < (stationData.fivePrizes || []).slice(0, 3).length - 1 && <br />}
                                                    </span>
                                                ))}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className={styles.tdTitle}>G4</td>
                                        {dayData.stations.map(stationData => (
                                            <td key={stationData.station} className={styles.rowXS}>
                                                {(stationData.fourPrizes || []).slice(0, 7).map((kq, idx) => (
                                                    <span key={idx} className={styles.prizeNumber}>
                                                        {getFilteredNumber(kq, currentFilter)}
                                                        {idx < (stationData.fourPrizes || []).slice(0, 7).length - 1 && <br />}
                                                    </span>
                                                ))}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className={`${styles.tdTitle} ${styles.g3}`}>G3</td>
                                        {dayData.stations.map(stationData => (
                                            <td key={stationData.station} className={styles.rowXS}>
                                                {(stationData.threePrizes || []).slice(0, 2).map((kq, idx) => (
                                                    <span key={idx} className={`${styles.prizeNumber} ${styles.g3}`}>
                                                        {getFilteredNumber(kq, currentFilter)}
                                                        {idx < (stationData.threePrizes || []).slice(0, 2).length - 1 && <br />}
                                                    </span>
                                                ))}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className={styles.tdTitle}>G2</td>
                                        {dayData.stations.map(stationData => (
                                            <td key={stationData.station} className={styles.rowXS}>
                                                <span className={styles.prizeNumber}>
                                                    {(stationData.secondPrize || [])[0] ? getFilteredNumber(stationData.secondPrize[0], currentFilter) : '-'}
                                                </span>
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className={styles.tdTitle}>G1</td>
                                        {dayData.stations.map(stationData => (
                                            <td key={stationData.station} className={styles.rowXS}>
                                                <span className={styles.prizeNumber}>
                                                    {(stationData.firstPrize || [])[0] ? getFilteredNumber(stationData.firstPrize[0], currentFilter) : '-'}
                                                </span>
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className={`${styles.tdTitle} ${styles.highlight}`}>ĐB</td>
                                        {dayData.stations.map(stationData => (
                                            <td key={stationData.station} className={styles.rowXS}>
                                                <span className={`${styles.prizeNumber} ${styles.highlight} ${styles.gdb}`}>
                                                    {(stationData.specialPrize || [])[0] || '-'}
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
                                    <span className={styles.dayOfWeek}>{`${dayData.dayOfWeek} - `}</span>
                                    <span className={styles.desc}>{dayData.drawDate}</span>
                                </div>
                                <table className={styles.tableKey}>
                                    <thead>
                                        <tr>
                                            <th className={styles.t_h}>Đầu</th>
                                            {stationsData.map(station => (
                                                <th key={station.station}>
                                                    {station.tentinh || `Tỉnh ${stationsData.indexOf(station) + 1}`}
                                                </th>
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
                                    <span className={styles.dayOfWeek}>{`${dayData.dayOfWeek} - `}</span>
                                    <span className={styles.desc}>{dayData.drawDate}</span>
                                </div>
                                <table className={styles.tableKey}>
                                    <thead>
                                        <tr>
                                            <th className={styles.t_h}>Đuôi</th>
                                            {stationsData.map(station => (
                                                <th key={station.station}>
                                                    {station.tentinh || `Tỉnh ${stationsData.indexOf(station) + 1}`}
                                                </th>
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

export default KQXS;