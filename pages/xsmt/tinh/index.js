import { apiMT } from "../../api/kqxs/kqxsMT";
import { useState, useEffect } from "react";
import styles from '../../../styles/kqxsMTTinh.module.css';
import { getFilteredNumber } from "../../../library/utils/filterUtils";
import { useRouter } from 'next/router';

const KQXS = (props) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterTypes, setFilterTypes] = useState({});
    const [isRunning, setIsRunning] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    const router = useRouter();
    let dayof;

    const station = props.station || "xsmt";
    const date = props.data3 && /^\d{2}-\d{2}-\d{4}$/.test(props.data3)
        ? props.data3
        : (dayof = props.data3);
    const tinh = props.tinh;

    const startHour = 16;
    const startMinute = 15;
    const duration = 30 * 60 * 1000;
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
                tentinh: item.tentinh || item.tinh || item.tentinh || `Tỉnh ${dataArray.indexOf(item) + 1}`,
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
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();

            const startTime = new Date();
            startTime.setHours(startHour, startMinute, 0, 0);
            const endTime = new Date(startTime.getTime() + duration);

            if (now >= startTime && now <= endTime) {
                setIsRunning(true);
            } else {
                setIsRunning(false);
            }
        };

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
                console.log('Fetch interval stopped after 30 minutes.');
            }, duration);
        }

        return () => {
            console.log('Cleaning up intervals...');
            clearInterval(timeCheckInterval);
            if (fetchInterval) clearInterval(fetchInterval);
        };
    }, [station, date, tinh, dayof, isRunning]);

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
        ]
            .filter(num => num != null && num !== '')
            .map((num) => getFilteredNumber(num, 'last2'))
            .filter(num => num != null && num !== '' && !isNaN(num));

        const heads = Array(10).fill().map(() => []);
        const tails = Array(10).fill().map(() => []);

        allNumbers.forEach((number) => {
            if (number != null && number !== '') {
                const numStr = number.toString().padStart(2, '0');
                const head = parseInt(numStr[0]);
                const tail = parseInt(numStr[numStr.length - 1]);

                if (!isNaN(head) && head >= 0 && head <= 9 && !isNaN(tail) && tail >= 0 && tail <= 9) {
                    heads[head].push(numStr);
                    tails[tail].push(numStr);
                }
            }
        });

        for (let i = 0; i < 10; i++) {
            heads[i].sort((a, b) => parseInt(a) - parseInt(b));
            tails[i].sort((a, b) => parseInt(a) - parseInt(b));
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
            {currentData.map((dayData) => {
                const tableKey = dayData.drawDate;
                const currentFilter = filterTypes[tableKey] || 'all';

                const stationData = dayData.stations[0];
                const { heads, tails } = getHeadAndTailNumbers(stationData);

                return (
                    <div key={tableKey}>
                        <div className={styles.kqxs}>
                            <h2 className={styles.kqxs__title}>
                                Kết quả Xổ Số – {stationData.tentinh}
                            </h2>
                            <div className={styles.kqxs__action}>

                                <a className={`${styles.kqxs__actionLink}`} href="#!">{stationData.tentinh} </a>
                                <a className={`${styles.kqxs__actionLink}`} href="#!"> {dayData.dayOfWeek}</a>
                                <a className={`${styles.kqxs__actionLink}`} href="#!"> {dayData.drawDate}</a>
                            </div>
                            <table className={styles.tableXS}>
                                <tbody>
                                    {/* G8 */}
                                    <tr>
                                        <td className={`${styles.tdTitle} ${styles.highlight}`}>G8</td>
                                        <td className={styles.rowXS}>
                                            <span className={`${styles.prizeNumber} ${styles.highlight}`}>
                                                {(stationData.eightPrizes || [])[0] ? getFilteredNumber(stationData.eightPrizes[0], currentFilter) : '-'}
                                            </span>
                                        </td>
                                    </tr>
                                    {/* G7 */}
                                    <tr>
                                        <td className={styles.tdTitle}>G7</td>
                                        <td className={styles.rowXS}>
                                            <span className={styles.prizeNumber}>
                                                {(stationData.sevenPrizes || [])[0] ? getFilteredNumber(stationData.sevenPrizes[0], currentFilter) : '-'}
                                            </span>
                                        </td>
                                    </tr>
                                    {/* G6 */}
                                    <tr>
                                        <td className={styles.tdTitle}>G6</td>
                                        <td className={styles.rowXS}>
                                            {(stationData.sixPrizes || []).slice(0, 3).map((kq, idx) => (
                                                <span key={idx} className={styles.prizeNumber}>
                                                    {getFilteredNumber(kq, currentFilter)}
                                                    {idx < (stationData.sixPrizes || []).slice(0, 3).length - 1 && <span className={styles.prizeSeparator}></span>}
                                                </span>
                                            ))}
                                        </td>
                                    </tr>
                                    {/* G5 */}
                                    <tr>
                                        <td className={`${styles.tdTitle} ${styles.g3}`}>G5</td>
                                        <td className={styles.rowXS}>
                                            <span className={`${styles.prizeNumber} ${styles.g3}`}>
                                                {(stationData.fivePrizes || [])[0] ? getFilteredNumber(stationData.fivePrizes[0], currentFilter) : '-'}
                                            </span>
                                        </td>
                                    </tr>
                                    {/* G4 */}
                                    <tr>
                                        <td className={styles.tdTitle}>G4</td>
                                        <td className={styles.rowXS}>
                                            {(stationData.fourPrizes || []).slice(0, 4).map((kq, idx) => (
                                                <span key={idx} className={styles.prizeNumber}>
                                                    {getFilteredNumber(kq, currentFilter)}
                                                    {idx < (stationData.fourPrizes || []).slice(0, 4).length - 1 && <span className={styles.prizeSeparator}></span>}
                                                </span>
                                            ))}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={styles.tdTitle}>G4</td>
                                        <td className={styles.rowXS}>
                                            {(stationData.fourPrizes || []).slice(4, 7).map((kq, idx) => (
                                                <span key={idx} className={styles.prizeNumber}>
                                                    {getFilteredNumber(kq, currentFilter)}
                                                    {idx < (stationData.fourPrizes || []).slice(4, 7).length - 1 && <span className={styles.prizeSeparator}></span>}
                                                </span>
                                            ))}
                                        </td>
                                    </tr>
                                    {/* G3 */}
                                    <tr>
                                        <td className={`${styles.tdTitle} ${styles.g3}`}>G3</td>
                                        <td className={styles.rowXS}>
                                            {(stationData.threePrizes || []).slice(0, 2).map((kq, idx) => (
                                                <span key={idx} className={`${styles.prizeNumber} ${styles.g3}`}>
                                                    {getFilteredNumber(kq, currentFilter)}
                                                    {idx < (stationData.threePrizes || []).slice(0, 2).length - 1 && <span className={styles.prizeSeparator}></span>}
                                                </span>
                                            ))}
                                        </td>
                                    </tr>
                                    {/* G2 */}
                                    <tr>
                                        <td className={styles.tdTitle}>G2</td>
                                        <td className={styles.rowXS}>
                                            <span className={styles.prizeNumber}>
                                                {(stationData.secondPrize || [])[0] ? getFilteredNumber(stationData.secondPrize[0], currentFilter) : '-'}
                                            </span>
                                        </td>
                                    </tr>
                                    {/* G1 */}
                                    <tr>
                                        <td className={styles.tdTitle}>G1</td>
                                        <td className={styles.rowXS}>
                                            <span className={styles.prizeNumber}>
                                                {(stationData.firstPrize || [])[0] ? getFilteredNumber(stationData.firstPrize[0], currentFilter) : '-'}
                                            </span>
                                        </td>
                                    </tr>
                                    {/* ĐB */}
                                    <tr>
                                        <td className={`${styles.tdTitle} ${styles.highlight}`}>ĐB</td>
                                        <td className={styles.rowXS}>
                                            <span className={`${styles.prizeNumber} ${styles.highlight} ${styles.gdb}`}>
                                                {(stationData.specialPrize || [])[0] ? getFilteredNumber(stationData.specialPrize[0], currentFilter) : '-'}
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
                                    <span className={styles.title}>Bảng Lô Tô – {stationData.tentinh} {dayData.dayOfWeek} – {dayData.drawDate}</span>
                                </div>
                                <table className={styles.tableKey}>
                                    <thead>
                                        <tr>
                                            <th className={styles.t_h}>Đầu</th>
                                            <th>Lô Tô</th>
                                            <th className={styles.t_h}>Đuôi</th>
                                            <th>Lô Tô</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Array.from({ length: 10 }, (_, idx) => (
                                            <tr key={idx}>
                                                <td className={styles.t_h}>{idx}</td>
                                                <td>{heads[idx].join(', ')}</td>
                                                <td className={styles.t_h}>{idx}</td>
                                                <td>{tails[idx].join(', ')}</td>
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