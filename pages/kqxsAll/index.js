import { api } from "../api/kqxs/kqxsMB";
import { useState, useEffect } from "react";
import styles from '../../public/css/kqxs.module.css'; // Adjusted path (assuming CSS is in /styles)
import { getFilteredNumber } from "../utils/filterUtils";
import { useRouter } from 'next/router';

const KQXS = (props) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterTypes, setFilterTypes] = useState({});

    const router = useRouter();
    let dayof;
    // Extract station and date from props or fallback
    const station = props.station || "xsmb"; // Make station configurable
    const date = props.data3 && /^\d{2}-\d{2}-\d{4}$/.test(props.data3)
        ? props.data3
        : dayof = props.data3; // Validate date format
    // const dayofweek = props.dayof;

    console.log("date kqxsALL", date);
    useEffect(() => {
        async function fetchDataOnce() {
            try {
                const result = await api.getLottery(station, date, dayof);
                const dataArray = Array.isArray(result) ? result : [result]; // Ensure array

                const formattedData = dataArray.map(item => ({
                    ...item,
                    drawDate: new Date(item.drawDate).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                    }),
                }));
                setData(formattedData);

                const initialFilters = formattedData.reduce((acc, item) => {
                    acc[item.drawDate + item.station] = 'all';
                    return acc;
                }, {});
                setFilterTypes(initialFilters);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching lottery data:', error);
                setLoading(false);
            }
        }
        fetchDataOnce();
    }, [station, date]); // Add dependencies

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
        ].map((num) => getFilteredNumber(num, 'last2'));

        const heads = Array(10).fill().map(() => []);
        const tails = Array(10).fill().map(() => []);

        allNumbers.forEach((number) => {
            const numStr = number.toString().padStart(2, '0');
            const head = parseInt(numStr[0]);
            const tail = parseInt(numStr[numStr.length - 1]);
            heads[head].push(numStr);
            tails[tail].push(numStr);
        });

        for (let i = 0; i < 10; i++) {
            heads[i].sort((a, b) => parseInt(a) - parseInt(b));
            tails[i].sort((a, b) => parseInt(a) - parseInt(b));
        }

        return { heads, tails };
    };

    if (loading) {
        return <div>Đang tải dữ liệu...</div>;
    }

    return (
        <div className={styles.containerKQ}>
            {data.map((data2) => {
                const tableKey = data2.drawDate + data2.station;
                const currentFilter = filterTypes[tableKey] || 'all';
                const { heads, tails } = getHeadAndTailNumbers(data2);

                return (
                    <div key={tableKey}>
                        <div className={styles.kqxs} key={tableKey}>
                            <h2 className={styles.kqxs__title}>Kết Quả Xổ Số  -<span> {data2.station}</span> Hôm Nay</h2>
                            <div className={styles.kqxs__action}>
                                <a className={styles.kqxs__actionLink} href="#!">{data2.station}</a>
                                <a className={`${styles.kqxs__actionLink} ${styles.dayOfWeek}`} href="#!">{data2.dayOfWeek}</a>
                                <a className={styles.kqxs__actionLink} href="#!"> {data2.drawDate}</a>
                            </div>
                            <table className={styles.tableXS}>
                                <tbody>
                                    <tr>
                                        <td className={`${styles.code} ${styles.rowXS}`}>
                                            <span className={styles.span0}>{data2.maDB}</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={`${styles.tdTitle} ${styles.highlight}`}>ĐB</td>
                                        <td className={styles.rowXS}>
                                            {(data2.specialPrize || []).map((kq, index) => (
                                                <span key={kq || index} className={`${styles.span1} ${styles.highlight} ${styles.gdb}`}>
                                                    {getFilteredNumber(kq, currentFilter)}
                                                </span>
                                            ))}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={styles.tdTitle}>G1</td>
                                        <td className={styles.rowXS}>
                                            {(data2.firstPrize || []).map((kq, index) => (
                                                <span key={kq || index} className={styles.span1}>
                                                    {getFilteredNumber(kq, currentFilter)}
                                                </span>
                                            ))}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={styles.tdTitle}>G2</td>
                                        <td className={styles.rowXS}>
                                            {(data2.secondPrize || []).map((kq, index) => (
                                                <span key={kq || index} className={styles.span2}>
                                                    {getFilteredNumber(kq, currentFilter)}
                                                </span>
                                            ))}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={`${styles.tdTitle} ${styles.g3}`}>G3</td>
                                        <td className={styles.rowXS}>
                                            {(data2.threePrizes || []).slice(0, 3).map((kq, index) => (
                                                <span key={kq || index} className={`${styles.span3} ${styles.g3}`}>
                                                    {getFilteredNumber(kq, currentFilter)}
                                                </span>
                                            ))}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={styles.tdTitle}></td>
                                        <td className={styles.rowXS}>
                                            {(data2.threePrizes || []).slice(3, 6).map((kq, index) => (
                                                <span key={kq || index} className={styles.span3}>
                                                    {getFilteredNumber(kq, currentFilter)}
                                                </span>
                                            ))}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={styles.tdTitle}>G4</td>
                                        <td className={styles.rowXS}>
                                            {(data2.fourPrizes || []).map((kq, index) => (
                                                <span key={kq || index} className={styles.span4}>
                                                    {getFilteredNumber(kq, currentFilter)}
                                                </span>
                                            ))}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={`${styles.tdTitle} ${styles.g3}`}>G5</td>
                                        <td className={styles.rowXS}>
                                            {(data2.fivePrizes || []).slice(0, 3).map((kq, index) => (
                                                <span key={kq || index} className={`${styles.span3} ${styles.g3}`}>
                                                    {getFilteredNumber(kq, currentFilter)}
                                                </span>
                                            ))}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={styles.tdTitle}></td>
                                        <td className={styles.rowXS}>
                                            {(data2.fivePrizes || []).slice(3, 6).map((kq, index) => (
                                                <span key={kq || index} className={styles.span3}>
                                                    {getFilteredNumber(kq, currentFilter)}
                                                </span>
                                            ))}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={styles.tdTitle}>G6</td>
                                        <td className={styles.rowXS}>
                                            {(data2.sixPrizes || []).map((kq, index) => (
                                                <span key={index} className={styles.span3}>
                                                    {getFilteredNumber(kq, currentFilter)}
                                                </span>
                                            ))}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={styles.tdTitle}>G7</td>
                                        <td className={styles.rowXS}>
                                            {(data2.sevenPrizes || []).map((kq, index) => (
                                                <span key={index} className={`${styles.span4} ${styles.highlight}`}>
                                                    {getFilteredNumber(kq, currentFilter)}
                                                </span>
                                            ))}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            <div className={styles.action}>
                                <div aria-label="Tùy chọn lọc số" className={styles.filter__options} role="radiogroup">
                                    <div className={styles.optionInput} >
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
                                    <div className={styles.optionInput} >
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
                                <span className={styles.desc}>{data2.station}</span>
                                <span className={styles.dayOfWeek}>{`${data2.dayOfWeek} - `}</span>
                                <span className={styles.desc}> {data2.drawDate}</span>

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
                                            <td>{heads[index].join(', ')}</td>
                                            <td className={styles.t_h}>{index}</td>
                                            <td>{tails[index].join(', ')}</td>
                                        </tr>
                                    ))}

                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })}
        </div>

    );
};

export default KQXS;