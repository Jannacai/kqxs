import { useState, useEffect, useMemo } from "react";
import styles from '../../styles/kqxsMT.module.css';
import { getFilteredNumber } from "../../library/utils/filterUtils";
import { apiMT } from "../api/kqxs/kqxsMT";
import React from 'react';

console.log('styles.spinner:', styles.spinner);

const LiveResult = ({ station, today, getHeadAndTailNumbers, handleFilterChange, filterTypes, isLiveWindow }) => {
    const [liveData, setLiveData] = useState([]);
    const [isTodayLoading, setIsTodayLoading] = useState(true);
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const [isDataReady, setIsDataReady] = useState(false);
    const maxRetries = 50;
    const retryInterval = 10000;

    const provincesByDay = useMemo(() => ({
        1: [
            { tinh: 'phu-yen', tentinh: 'Phú Yên' },
            { tinh: 'hue', tentinh: 'Thừa Thiên Huế' },
        ],
        2: [
            { tinh: 'dak-lak', tentinh: 'Đắk Lắk' },
            { tinh: 'quang-nam', tentinh: 'Quảng Nam' },
        ],
        3: [
            { tinh: 'da-nang', tentinh: 'Đà Nẵng' },
            { tinh: 'khanh-hoa', tentinh: 'Khánh Hòa' },
        ],
        4: [
            { tinh: 'binh-dinh', tentinh: 'Bình Định' },
            { tinh: 'quang-tri', tentinh: 'Quảng Trị' },
            { tinh: 'quang-binh', tentinh: 'Quảng Bình' },
        ],
        5: [
            { tinh: 'gia-lai', tentinh: 'Gia Lai' },
            { tinh: 'ninh-thuan', tentinh: 'Ninh Thuận' },
        ],
        6: [
            { tinh: 'da-nang', tentinh: 'Đà Nẵng' },
            { tinh: 'quang-ngai', tentinh: 'Quảng Ngãi' },
            { tinh: 'dak-nong', tentinh: 'Đắk Nông' },
        ],
        0: [
            { tinh: 'kon-tum', tentinh: 'Kon Tum' },
            { tinh: 'khanh-hoa', tentinh: 'Khánh Hòa' },
            { tinh: 'hue', tentinh: 'Thừa Thiên Huế' },
        ]
    }), []);

    const emptyResult = useMemo(() => {
        const dateParts = today.split('/'); // today format: DD/MM/YYYY
        const date = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);
        const dayOfWeekIndex = date.getDay();
        const provinces = provincesByDay[dayOfWeekIndex] || provincesByDay[6];
        return provinces.map(province => ({
            drawDate: today,
            station: station,
            dayOfWeek: date.toLocaleString('vi-VN', { weekday: 'long' }),
            tentinh: province.tentinh,
            tinh: province.tinh,
            year: date.getFullYear(),
            month: date.getMonth() + 1,
            specialPrize_0: "...",
            firstPrize_0: "...",
            secondPrize_0: "...",
            threePrizes_0: "...",
            threePrizes_1: "...",
            fourPrizes_0: "...",
            fourPrizes_1: "...",
            fourPrizes_2: "...",
            fourPrizes_3: "...",
            fourPrizes_4: "...",
            fourPrizes_5: "...",
            fourPrizes_6: "...",
            fivePrizes_0: "...",
            sixPrizes_0: "...",
            sixPrizes_1: "...",
            sixPrizes_2: "...",
            sevenPrizes_0: "...",
            eightPrizes_0: "...",
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
            const result = await apiMT.getLottery(station, today, undefined);
            const dataArray = Array.isArray(result) ? result : [result];
            const todayData = dataArray.filter(item =>
                new Date(item.drawDate).toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                }) === today
            );

            const dateParts = today.split('/');
            const date = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);
            const dayOfWeekIndex = date.getDay();
            const provinces = provincesByDay[dayOfWeekIndex] || provincesByDay[6];
            const formattedData = provinces.map(province => {
                const matchedData = todayData.find(item => item.tinh === province.tinh) || {};
                return {
                    drawDate: today,
                    station: station,
                    dayOfWeek: date.toLocaleString('vi-VN', { weekday: 'long' }),
                    tentinh: province.tentinh,
                    tinh: province.tinh,
                    year: date.getFullYear(),
                    month: date.getMonth() + 1,
                    specialPrize_0: matchedData.specialPrize?.[0] || "...",
                    firstPrize_0: matchedData.firstPrize?.[0] || "...",
                    secondPrize_0: matchedData.secondPrize?.[0] || "...",
                    threePrizes_0: matchedData.threePrizes?.[0] || "...",
                    threePrizes_1: matchedData.threePrizes?.[1] || "...",
                    fourPrizes_0: matchedData.fourPrizes?.[0] || "...",
                    fourPrizes_1: matchedData.fourPrizes?.[1] || "...",
                    fourPrizes_2: matchedData.fourPrizes?.[2] || "...",
                    fourPrizes_3: matchedData.fourPrizes?.[3] || "...",
                    fourPrizes_4: matchedData.fourPrizes?.[4] || "...",
                    fourPrizes_5: matchedData.fourPrizes?.[5] || "...",
                    fourPrizes_6: matchedData.fourPrizes?.[6] || "...",
                    fivePrizes_0: matchedData.fivePrizes?.[0] || "...",
                    sixPrizes_0: matchedData.sixPrizes?.[0] || "...",
                    sixPrizes_1: matchedData.sixPrizes?.[1] || "...",
                    sixPrizes_2: matchedData.sixPrizes?.[2] || "...",
                    sevenPrizes_0: matchedData.sevenPrizes?.[0] || "...",
                    eightPrizes_0: matchedData.eightPrizes?.[0] || "...",
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

        const dateParts = today.split('/');
        const date = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);
        const dayOfWeekIndex = date.getDay();
        const provinces = provincesByDay[dayOfWeekIndex] || provincesByDay[6];
        const eventSources = [];

        const connectSSE = (tinh) => {
            console.log(`Kết nối SSE cho tỉnh ${tinh}... (Thử lần ${retryCount + 1}/${maxRetries + 1})`);
            const eventSource = new EventSource(
                `https://backendkqxs.onrender.com/api/ketquaxs/xsmt/sse?station=${station}&tinh=${tinh}&date=${today.replace(/\//g, '-')}`
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
                                    item.specialPrize_0 !== '...' || item.firstPrize_0 !== '...'
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
            eventSources.push(eventSource => eventSource.close());
        };
    }, [isLiveWindow, station, today, retryCount, maxRetries, retryInterval, provincesByDay]);

    if (!liveData.length) return null;

    const tableKey = today + station;
    const currentFilter = filterTypes[tableKey] || 'all';

    const allHeads = Array(10).fill().map(() => []);
    const allTails = Array(10).fill().map(() => []);
    const stationsData = liveData.map(stationData => {
        // Ánh xạ dữ liệu chi tiết sang mảng cho getHeadAndTailNumbers
        const mappedData = {
            ...stationData,
            specialPrize: [stationData.specialPrize_0],
            firstPrize: [stationData.firstPrize_0],
            secondPrize: [stationData.secondPrize_0],
            threePrizes: [stationData.threePrizes_0, stationData.threePrizes_1],
            fourPrizes: [
                stationData.fourPrizes_0, stationData.fourPrizes_1, stationData.fourPrizes_2,
                stationData.fourPrizes_3, stationData.fourPrizes_4, stationData.fourPrizes_5, stationData.fourPrizes_6
            ],
            fivePrizes: [stationData.fivePrizes_0],
            sixPrizes: [stationData.sixPrizes_0, stationData.sixPrizes_1, stationData.sixPrizes_2],
            sevenPrizes: [stationData.sevenPrizes_0],
            eightPrizes: [stationData.eightPrizes_0],
        };
        const { heads, tails } = getHeadAndTailNumbers(mappedData);
        for (let i = 0; i < 10; i++) {
            allHeads[i].push(heads[i]);
            allTails[i].push(tails[i]);
        }
        return { tentinh: stationData.tentinh, station: stationData.station, tinh: stationData.tinh };
    });

    return (
        <div className={styles.containerKQ}>
            <div className={styles.statusContainer}>
                {error && <div className={styles.error}>{error}</div>}
                {isTodayLoading && (
                    <div className={styles.loading}>Đang chờ kết quả ngày {today}...</div>
                )}
            </div>
            <div className={styles.kqxs} style={{ '--num-columns': liveData.length }}>
                <h2 className={styles.kqxs__title}>Kết Quả Xổ Số Miền Trung - {today}</h2>
                <div className={styles.kqxs__action}>
                    <a className={styles.kqxs__actionLink} href="#!">XSMT</a>
                    <a className={`${styles.kqxs__actionLink} ${styles.dayOfWeek}`} href="#!">{liveData[0]?.dayOfWeek}</a>
                    <a className={styles.kqxs__actionLink} href="#!">{today}</a>
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
                                        {stationData.eightPrizes_0 === '...' ? (
                                            <span className={styles.spinner}></span>
                                        ) : (
                                            getFilteredNumber(stationData.eightPrizes_0, currentFilter) || '-'
                                        )}
                                    </span>
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className={styles.tdTitle}>G7</td>
                            {liveData.map(stationData => (
                                <td key={stationData.tinh} className={styles.rowXS}>
                                    <span className={styles.prizeNumber}>
                                        {stationData.sevenPrizes_0 === '...' ? (
                                            <span className={styles.spinner}></span>
                                        ) : (
                                            getFilteredNumber(stationData.sevenPrizes_0, currentFilter) || '-'
                                        )}
                                    </span>
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className={styles.tdTitle}>G6</td>
                            {liveData.map(stationData => (
                                <td key={stationData.tinh} className={styles.rowXS}>
                                    {[stationData.sixPrizes_0, stationData.sixPrizes_1, stationData.sixPrizes_2].map((kq, idx) => (
                                        <span key={idx} className={styles.prizeNumber}>
                                            {kq === '...' ? (
                                                <span className={styles.spinner}></span>
                                            ) : (
                                                getFilteredNumber(kq, currentFilter) || '-'
                                            )}
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
                                        {stationData.fivePrizes_0 === '...' ? (
                                            <span className={styles.spinner}></span>
                                        ) : (
                                            getFilteredNumber(stationData.fivePrizes_0, currentFilter) || '-'
                                        )}
                                    </span>
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className={styles.tdTitle}>G4</td>
                            {liveData.map(stationData => (
                                <td key={stationData.tinh} className={styles.rowXS}>
                                    {[
                                        stationData.fourPrizes_0, stationData.fourPrizes_1, stationData.fourPrizes_2,
                                        stationData.fourPrizes_3, stationData.fourPrizes_4, stationData.fourPrizes_5,
                                        stationData.fourPrizes_6
                                    ].map((kq, idx) => (
                                        <span key={idx} className={styles.prizeNumber}>
                                            {kq === '...' ? (
                                                <span className={styles.spinner}></span>
                                            ) : (
                                                getFilteredNumber(kq, currentFilter) || '-'
                                            )}
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
                                    {[stationData.threePrizes_0, stationData.threePrizes_1].map((kq, idx) => (
                                        <span key={idx} className={`${styles.prizeNumber} ${styles.g3}`}>
                                            {kq === '...' ? (
                                                <span className={styles.spinner}></span>
                                            ) : (
                                                getFilteredNumber(kq, currentFilter) || '-'
                                            )}
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
                                        {stationData.secondPrize_0 === '...' ? (
                                            <span className={styles.spinner}></span>
                                        ) : (
                                            getFilteredNumber(stationData.secondPrize_0, currentFilter) || '-'
                                        )}
                                    </span>
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className={styles.tdTitle}>G1</td>
                            {liveData.map(stationData => (
                                <td key={stationData.tinh} className={styles.rowXS}>
                                    <span className={styles.prizeNumber}>
                                        {stationData.firstPrize_0 === '...' ? (
                                            <span className={styles.spinner}></span>
                                        ) : (
                                            getFilteredNumber(stationData.firstPrize_0, currentFilter) || '-'
                                        )}
                                    </span>
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className={`${styles.tdTitle} ${styles.highlight}`}>ĐB</td>
                            {liveData.map(stationData => (
                                <td key={stationData.tinh} className={styles.rowXS}>
                                    <span className={`${styles.prizeNumber} ${styles.highlight} ${styles.gdb}`}>
                                        {stationData.specialPrize_0 === '...' ? (
                                            <span className={styles.spinner}></span>
                                        ) : (
                                            stationData.specialPrize_0 || '-'
                                        )}
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