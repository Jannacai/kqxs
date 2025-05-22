import React, { useState, useEffect, useMemo, useRef } from 'react';
import styles from '../../styles/kqxsMN.module.css';
import { apiMN } from '../api/kqxs/kqxsMN';
import { getFilteredNumber } from '../../library/utils/filterUtils';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

const provincesByDay = {
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
    0: [
        { tinh: 'tien-giang', tentinh: 'Tiền Giang' },
        { tinh: 'kien-giang', tentinh: 'Kiên Giang' },
        { tinh: 'da-lat', tentinh: 'Đà Lạt' },
    ],
};

const LiveResult = ({ station, today, getHeadAndTailNumbers, handleFilterChange, filterTypes, isLiveWindow }) => {
    const [liveData, setLiveData] = useState({});
    const [isTodayLoading, setIsTodayLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isDataReady, setIsDataReady] = useState(false);
    const eventSources = useRef({});
    const retryCounts = useRef({});
    const initialDataTimeout = useRef({});

    const todayValue = today || new Date().toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });


    const dateObj = new Date(todayValue.split('/').reverse().join('/'));


    const dayOfWeekIndex = dateObj.getDay();
    const provinces = provincesByDay[dayOfWeekIndex] || provincesByDay[0];

    const emptyResult = useMemo(
        () => ({
            eightPrizes: ['...'],
            sevenPrizes: ['...'],
            sixPrizes: ['...', '...', '...'],
            fivePrizes: ['...'],
            fourPrizes: ['...', '...', '...', '...', '...', '...', '...'],
            threePrizes: ['...', '...'],
            secondPrize: ['...'],
            firstPrize: ['...'],
            specialPrize: ['...'],
            tentinh: '',
            tinh: '',
            year: dateObj.getFullYear(),
            month: dateObj.getMonth() + 1,
            drawDate: today,
            dayOfWeek: dateObj.toLocaleString('vi-VN', { weekday: 'long' }),
        }),
        [today]
    );

    useEffect(() => {
        if (Object.keys(liveData).length === 0 && provinces.length > 0) {
            const initialData = provinces.reduce((acc, province) => {
                acc[province.tinh] = {
                    ...emptyResult,
                    tentinh: province.tentinh,
                    tinh: province.tinh,
                };
                return acc;
            }, {});
            console.log('Khởi tạo liveData:', JSON.stringify(initialData, null, 2));
            setLiveData(initialData);
            setIsTodayLoading(true);
        }
    }, [emptyResult, provinces]);

    const connectSSE = (province, attempt = 1, maxRetries = 100) => {
        const provinceSlug = province.tinh;
        const url = `${API_BASE_URL}/api/ketqua/xsmn/sse?station=${station}&tinh=${provinceSlug}&date=${today}`;
        console.log(`Kết nối SSE cho tỉnh ${province.tentinh}: ${url} (Thử lần ${attempt}/${maxRetries})`);

        const eventSource = new EventSource(url);
        eventSources.current[provinceSlug] = eventSource;
        retryCounts.current[provinceSlug] = attempt;

        eventSource.onopen = () => {
            console.log(`Kết nối SSE mở cho tỉnh ${province.tentinh} (state: OPEN, readyState: ${eventSource.readyState})`);
            retryCounts.current[provinceSlug] = 1;

            initialDataTimeout.current[provinceSlug] = setTimeout(() => {
                console.log(`Không nhận được dữ liệu SSE cho ${province.tentinh} sau 10s, thử fallback...`);
                fetchFallbackData(province);
            }, 10000);
        };

        eventSource.onmessage = (event) => {
            console.log(`Nhận raw message SSE cho ${province.tentinh}:`, event.data);
            try {
                const parsed = JSON.parse(event.data);
                console.log(`Nhận message SSE cho ${province.tentinh}:`, JSON.stringify(parsed, null, 2));
                const data = parsed.data || parsed;
                handleSseData(data, provinceSlug, province.tentinh);
            } catch (parseErr) {
                console.error(`Lỗi parse message SSE cho ${province.tentinh}:`, parseErr.message, event.data);
            }
        };

        eventSource.addEventListener('initial', (event) => {
            console.log(`Nhận raw initial SSE cho ${province.tentinh}:`, event.data);
            try {
                const parsed = JSON.parse(event.data);
                console.log(`Nhận initial SSE cho ${province.tentinh}:`, JSON.stringify(parsed, null, 2));
                const data = parsed.data || parsed;
                handleSseData(data, provinceSlug, province.tentinh);
            } catch (parseErr) {
                console.error(`Lỗi parse initial SSE cho ${province.tentinh}:`, parseErr.message, event.data);
            }
        });

        eventSource.addEventListener('update', (event) => {
            console.log(`Nhận raw update SSE cho ${province.tentinh}:`, event.data);
            try {
                const parsed = JSON.parse(event.data);
                console.log(`Nhận update SSE cho ${province.tentinh}:`, JSON.stringify(parsed, null, 2));
                const data = parsed.data || parsed;
                handleSseData(data, provinceSlug, province.tentinh);
            } catch (parseErr) {
                console.error(`Lỗi parse update SSE cho ${province.tentinh}:`, parseErr.message, event.data);
            }
        });

        eventSource.addEventListener('message', (event) => {
            console.log(`Nhận raw generic message SSE cho ${province.tentinh}:`, event.data);
            try {
                const parsed = JSON.parse(event.data);
                console.log(`Nhận generic message SSE cho ${province.tentinh}:`, JSON.stringify(parsed, null, 2));
                const data = parsed.data || parsed;
                handleSseData(data, provinceSlug, province.tentinh);
            } catch (parseErr) {
                console.error(`Lỗi parse generic message SSE cho ${province.tentinh}:`, parseErr.message, event.data);
            }
        });

        const prizeTypes = [
            'specialPrize',
            'firstPrize',
            'secondPrize',
            'threePrizes',
            'fourPrizes',
            'fivePrizes',
            'sixPrizes',
            'sevenPrizes',
            'eightPrizes',
        ];
        prizeTypes.forEach((prizeType) => {
            eventSource.addEventListener(prizeType, (event) => {
                console.log(`Nhận raw ${prizeType} SSE cho ${province.tentinh}:`, event.data);
                try {
                    const parsed = JSON.parse(event.data);
                    console.log(`Nhận ${prizeType} SSE cho ${province.tentinh}:`, JSON.stringify(parsed, null, 2));
                    const prizeData = parsed.prizeData || parsed[prizeType] || parsed;
                    if (prizeData) {
                        setLiveData((prev) => {
                            const updatedData = {
                                ...prev,
                                [provinceSlug]: {
                                    ...prev[provinceSlug],
                                    [prizeType]: Array.isArray(prizeData) ? [...prizeData] : [prizeData],
                                    tentinh: province.tentinh,
                                    tinh: provinceSlug,
                                },
                            };
                            console.log(`Cập nhật liveData cho ${province.tentinh} (${prizeType}):`, updatedData[provinceSlug][prizeType]);
                            return updatedData;
                        });
                        setError(null);
                        clearTimeout(initialDataTimeout.current[provinceSlug]);
                    }
                } catch (parseErr) {
                    console.error(`Lỗi parse ${prizeType} SSE cho ${province.tentinh}:`, parseErr.message, event.data);
                }
            });
        });

        const handleSseData = (data, provinceSlug, tentinh) => {
            let parsedData = data;
            if (typeof data === 'string') {
                try {
                    parsedData = JSON.parse(data);
                } catch (e) {
                    console.error(`Lỗi parse dữ liệu SSE cho ${tentinh}:`, e.message, data);
                    return;
                }
            }

            setLiveData((prev) => {
                const currentData = prev[provinceSlug] || {};
                const updatedData = { ...currentData };

                let hasChanges = false;
                Object.keys(parsedData).forEach((key) => {
                    if (key.includes('_') && /\d$/.test(key)) {
                        const [basePrizeType, index] = key.split('_');
                        const idx = parseInt(index, 10);
                        if (!updatedData[basePrizeType]) {
                            updatedData[basePrizeType] = [];
                        }
                        if (updatedData[basePrizeType][idx] !== parsedData[key]) {
                            updatedData[basePrizeType][idx] = parsedData[key];
                            hasChanges = true;
                        }
                    } else if (key !== 'tentinh' && key !== 'tinh' && key !== 'drawDate' && key !== 'year' && key !== 'month' && key !== 'dayOfWeek') {
                        const newValue = Array.isArray(parsedData[key]) ? [...parsedData[key]] : [parsedData[key]];
                        if (JSON.stringify(updatedData[key]) !== JSON.stringify(newValue)) {
                            updatedData[key] = newValue;
                            hasChanges = true;
                        }
                    }
                });

                if (!hasChanges) {
                    console.log(`Không có thay đổi trong liveData cho ${tentinh}`);
                    return prev;
                }

                console.log(`Cập nhật liveData cho ${tentinh}:`, JSON.stringify(updatedData, null, 2));
                return {
                    ...prev,
                    [provinceSlug]: { ...updatedData, tentinh, tinh: provinceSlug },
                };
            });

            const hasRealData = Object.values(parsedData).some(
                (value) => Array.isArray(value) ? value.some((num) => num !== '...' && num !== '***') : value !== '...' && value !== '***'
            );
            if (hasRealData) {
                setIsDataReady(true);
                setIsTodayLoading(false);
                setError(null);
                clearTimeout(initialDataTimeout.current[provinceSlug]);
            }
        };

        eventSource.onerror = (err) => {
            console.error(`Lỗi SSE cho tỉnh ${province.tentinh}:`, err);
            console.log(`EventSource state: ${eventSource.readyState === 0 ? 'CONNECTING' : eventSource.readyState === 1 ? 'OPEN' : 'CLOSED'}`);
            eventSource.close();
            clearTimeout(initialDataTimeout.current[provinceSlug]);
            if (retryCounts.current[provinceSlug] < maxRetries) {
                console.log(`Thử lại kết nối SSE cho ${province.tentinh} sau 20s (lần ${retryCounts.current[provinceSlug] + 1}/${maxRetries})`);
                retryCounts.current[provinceSlug]++;
                setTimeout(() => connectSSE(province, retryCounts.current[provinceSlug], maxRetries), 20000);
            } else {
                console.log(`Đã đạt số lần thử tối đa cho ${province.tentinh}, chuyển sang fallback`);
                setError(`Mất kết nối trực tiếp cho ${province.tentinh}, đang tải dữ liệu thủ công...`);
                fetchFallbackData(province);
            }
        };
    };

    useEffect(() => {
        console.log('Thiết lập SSE với provinces:', JSON.stringify(provinces), 'Station:', station, 'Today:', today);
        provinces.forEach((province) => {
            if (!eventSources.current[province.tinh]) {
                connectSSE(province);
            }
        });

        return () => {
            Object.keys(eventSources.current).forEach((provinceSlug) => {
                console.log(`Đóng kết nối SSE cho tỉnh ${provinceSlug}...`);
                eventSources.current[provinceSlug]?.close();
                clearTimeout(initialDataTimeout.current[provinceSlug]);
            });
            eventSources.current = {};
            retryCounts.current = {};
            initialDataTimeout.current = {};
        };
    }, [provinces, station, today]);

    const fetchFallbackData = async (province) => {
        try {
            console.log(`Thử lấy dữ liệu fallback cho ${province.tentinh} ngày ${today}`);
            const result = await apiMN.getLottery(station, today, province.tinh);
            console.log(`Dữ liệu thô từ API fallback cho ${province.tentinh}:`, JSON.stringify(result, null, 2));
            const dataArray = Array.isArray(result) ? result : [result];
            const todayData =
                dataArray.find((item) =>
                    new Date(item.drawDate).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                    }) === today
                ) || {
                    ...emptyResult,
                    tentinh: province.tentinh,
                    tinh: province.tinh,
                };

            const formattedData = {
                ...todayData,
                drawDate: today,
                dayOfWeek: dateObj.toLocaleString('vi-VN', { weekday: 'long' }),
                tentinh: province.tentinh,
                tinh: province.tinh,
            };

            console.log(`Dữ liệu fallback cho ${province.tentinh}:`, JSON.stringify(formattedData, null, 2));
            setLiveData((prev) => ({
                ...prev,
                [province.tinh]: formattedData,
            }));
            setIsTodayLoading(false);
            setError(null);
            setIsDataReady(true);
        } catch (err) {
            console.error(`Lỗi khi gọi API fallback cho ${province.tentinh}:`, err.message);
            setLiveData((prev) => ({
                ...prev,
                [province.tinh]: {
                    ...emptyResult,
                    tentinh: province.tentinh,
                    tinh: province.tinh,
                },
            }));
            setIsTodayLoading(false);
            setError(`Không có dữ liệu cho ${province.tentinh} ngày hôm nay, đang chờ kết quả trực tiếp...`);
            setIsDataReady(false);
        }
    };

    useEffect(() => {
        if (Object.keys(liveData).length > 0) {
            console.log('liveData updated:', JSON.stringify(liveData, null, 2));
        }
    }, [liveData]);

    if (!Object.keys(liveData).length) {
        console.log('liveData rỗng, không render');
        return null;
    }

    const stationsData = provinces.map((province) => {
        const stationData = liveData[province.tinh] || emptyResult;
        const { heads, tails } = getHeadAndTailNumbers(stationData);
        return { tentinh: province.tentinh, heads, tails };
    });

    const allHeads = Array(10)
        .fill()
        .map(() => []);
    const allTails = Array(10)
        .fill()
        .map(() => []);
    stationsData.forEach(({ heads, tails }, idx) => {
        for (let i = 0; i < 10; i++) {
            allHeads[i][idx] = heads[i];
            allTails[i][idx] = tails[i];
        }
    });

    const tableKey = today;
    const currentFilter = filterTypes[tableKey] || 'all';

    return (
        <div className={styles.containerKQ}>
            <div className={styles.statusContainer}>
                {error && <div className={styles.error}>{error}</div>}
                {isTodayLoading && <div className={styles.loading}>Đang chờ kết quả ngày {today}...</div>}
            </div>
            <div className={styles.kqxs}>
                <h2 className={styles.kqxs__title}>Kết Quả Xổ Số Miền Nam - {today}</h2>
                <div className={styles.kqxs__action}>
                    <a className={styles.kqxs__actionLink} href="#!">
                        XSMN
                    </a>
                    <a className={`${styles.kqxs__actionLink} ${styles.dayOfWeek}`} href="#!">
                        {liveData[provinces[0]?.tinh]?.dayOfWeek || emptyResult.dayOfWeek}
                    </a>
                    <a className={styles.kqxs__actionLink} href="#!">
                        {today}
                    </a>
                </div>
                <table className={styles.tableXS}>
                    <thead>
                        <tr>
                            <th></th>
                            {provinces.map((province) => (
                                <th key={province.tinh} className={styles.stationName}>
                                    {liveData[province.tinh]?.tentinh || province.tentinh}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className={`${styles.tdTitle} ${styles.highlight}`}>G8</td>
                            {provinces.map((province) => (
                                <td key={province.tinh} className={styles.rowXS}>
                                    {(liveData[province.tinh]?.eightPrizes || ['...']).map((kq, index) => (
                                        <span key={`${province.tinh}-eight-${index}`} className={`${styles.prizeNumber} ${styles.highlight}`}>
                                            {kq === '...' || kq === '***' || !kq ? (
                                                <span className={styles.spinner}></span>
                                            ) : (
                                                getFilteredNumber(kq, currentFilter) || '-'
                                            )}
                                        </span>
                                    ))}
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className={styles.tdTitle}>G7</td>
                            {provinces.map((province) => (
                                <td key={province.tinh} className={styles.rowXS}>
                                    {(liveData[province.tinh]?.sevenPrizes || ['...']).map((kq, index) => (
                                        <span key={`${province.tinh}-seven-${index}`} className={styles.prizeNumber}>
                                            {kq === '...' || kq === '***' || !kq ? (
                                                <span className={styles.spinner}></span>
                                            ) : (
                                                getFilteredNumber(kq, currentFilter) || '-'
                                            )}
                                        </span>
                                    ))}
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className={styles.tdTitle}>G6</td>
                            {provinces.map((province) => (
                                <td key={province.tinh} className={styles.rowXS}>
                                    {(liveData[province.tinh]?.sixPrizes || ['...', '...', '...']).slice(0, 3).map((kq, index) => (
                                        <span key={`${province.tinh}-six-${index}`} className={styles.prizeNumber}>
                                            {kq === '...' || kq === '***' || !kq ? (
                                                <span className={styles.spinner}></span>
                                            ) : (
                                                getFilteredNumber(kq, currentFilter) || '-'
                                            )}
                                            {index < 2 && <br />}
                                        </span>
                                    ))}
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className={`${styles.tdTitle} ${styles.g3}`}>G5</td>
                            {provinces.map((province) => (
                                <td key={province.tinh} className={styles.rowXS}>
                                    {(liveData[province.tinh]?.fivePrizes || ['...']).slice(0, 1).map((kq, index) => (
                                        <span key={`${province.tinh}-five-${index}`} className={`${styles.prizeNumber} ${styles.g3}`}>
                                            {kq === '...' || kq === '***' || !kq ? (
                                                <span className={styles.spinner}></span>
                                            ) : (
                                                getFilteredNumber(kq, currentFilter) || '-'
                                            )}
                                        </span>
                                    ))}
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className={styles.tdTitle}>G4</td>
                            {provinces.map((province) => (
                                <td key={province.tinh} className={styles.rowXS}>
                                    {(liveData[province.tinh]?.fourPrizes || ['...', '...', '...', '...', '...', '...', '...']).slice(0, 7).map((kq, index) => (
                                        <span key={`${province.tinh}-four-${index}`} className={styles.prizeNumber}>
                                            {kq === '...' || kq === '***' || !kq ? (
                                                <span className={styles.spinner}></span>
                                            ) : (
                                                getFilteredNumber(kq, currentFilter) || '-'
                                            )}
                                            {index < 6 && <br />}
                                        </span>
                                    ))}
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className={`${styles.tdTitle} ${styles.g3}`}>G3</td>
                            {provinces.map((province) => (
                                <td key={province.tinh} className={styles.rowXS}>
                                    {(liveData[province.tinh]?.threePrizes || ['...', '...']).slice(0, 2).map((kq, index) => (
                                        <span key={`${province.tinh}-three-${index}`} className={`${styles.prizeNumber} ${styles.g3}`}>
                                            {kq === '...' || kq === '***' || !kq ? (
                                                <span className={styles.spinner}></span>
                                            ) : (
                                                getFilteredNumber(kq, currentFilter) || '-'
                                            )}
                                            {index < 1 && <br />}
                                        </span>
                                    ))}
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className={styles.tdTitle}>G2</td>
                            {provinces.map((province) => (
                                <td key={province.tinh} className={styles.rowXS}>
                                    {(liveData[province.tinh]?.secondPrize || ['...']).map((kq, index) => (
                                        <span key={`${province.tinh}-second-${index}`} className={styles.prizeNumber}>
                                            {kq === '...' || kq === '***' || !kq ? (
                                                <span className={styles.spinner}></span>
                                            ) : (
                                                getFilteredNumber(kq, currentFilter) || '-'
                                            )}
                                        </span>
                                    ))}
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className={styles.tdTitle}>G1</td>
                            {provinces.map((province) => (
                                <td key={province.tinh} className={styles.rowXS}>
                                    {(liveData[province.tinh]?.firstPrize || ['...']).map((kq, index) => (
                                        <span key={`${province.tinh}-first-${index}`} className={styles.prizeNumber}>
                                            {kq === '...' || kq === '***' || !kq ? (
                                                <span className={styles.spinner}></span>
                                            ) : (
                                                getFilteredNumber(kq, currentFilter) || '-'
                                            )}
                                        </span>
                                    ))}
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className={`${styles.tdTitle} ${styles.highlight}`}>ĐB</td>
                            {provinces.map((province) => (
                                <td key={province.tinh} className={styles.rowXS}>
                                    {(liveData[province.tinh]?.specialPrize || ['...']).map((kq, index) => (
                                        <span key={`${province.tinh}-special-${index}`} className={`${styles.prizeNumber} ${styles.highlight} ${styles.gdb}`}>
                                            {kq === '...' || kq === '***' || !kq ? (
                                                <span className={styles.spinner}></span>
                                            ) : (
                                                getFilteredNumber(kq, currentFilter) || '-'
                                            )}
                                        </span>
                                    ))}
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
                        <span className={styles.dayOfWeek}>{liveData[provinces[0]?.tinh]?.dayOfWeek || emptyResult.dayOfWeek} - </span>
                        <span className={styles.desc}>{today}</span>
                    </div>
                    <table className={styles.tableKey}>
                        <thead>
                            <tr>
                                <th className={styles.t_h}>Đầu</th>
                                {provinces.map((province) => (
                                    <th key={province.tinh}>{liveData[province.tinh]?.tentinh || province.tentinh}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {Array.from({ length: 10 }, (_, idx) => (
                                <tr key={idx}>
                                    <td className={styles.t_h}>{idx}</td>
                                    {allHeads[idx].map((headNumbers, stationIdx) => (
                                        <td key={stationIdx}>
                                            {headNumbers.length > 0
                                                ? headNumbers.map((item, numIdx) => (
                                                    <span
                                                        key={numIdx}
                                                        className={item.isEighth || item.isSpecial ? styles.highlightPrize : ''}
                                                    >
                                                        {item.num}
                                                        {numIdx < headNumbers.length - 1 && ', '}
                                                    </span>
                                                ))
                                                : '-'}
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
                        <span className={styles.dayOfWeek}>{liveData[provinces[0]?.tinh]?.dayOfWeek || emptyResult.dayOfWeek} - </span>
                        <span className={styles.desc}>{today}</span>
                    </div>
                    <table className={styles.tableKey}>
                        <thead>
                            <tr>
                                <th className={styles.t_h}>Đuôi</th>
                                {provinces.map((province) => (
                                    <th key={province.tinh}>{liveData[province.tinh]?.tentinh || province.tinh}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {Array.from({ length: 10 }, (_, idx) => (
                                <tr key={idx}>
                                    <td className={styles.t_h}>{idx}</td>
                                    {allTails[idx].map((tailNumbers, stationIdx) => (
                                        <td key={stationIdx}>
                                            {tailNumbers.length > 0
                                                ? tailNumbers.map((item, numIdx) => (
                                                    <span
                                                        key={numIdx}
                                                        className={item.isEighth || item.isSpecial ? styles.highlightPrize : ''}
                                                    >
                                                        {item.num}
                                                        {numIdx < tailNumbers.length - 1 && ', '}
                                                    </span>
                                                ))
                                                : '-'}
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