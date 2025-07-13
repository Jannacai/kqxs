import React, { useState, useCallback, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { apiMB } from '../api/kqxs/kqxsMB';
import styles from '../../styles/soicau.module.css';
import moment from 'moment';
import { debounce } from 'lodash';
import { createClient } from 'redis';
import Thongke from '../../component/thongKe';
import CongCuHot from '../../component/CongCuHot';

// Cấu hình giá trị cứng
const SOI_CAU_CONFIG = {
    dayOptions: [3, 5, 7, 10, 14],
    defaultDays: 10,
    minYear: 2000,
    maxYear: new Date().getFullYear(),
};

// Skeleton Loading Components
const SkeletonRow = () => (
    <tr>
        <td className="py-2 px-4"><div className={styles.skeleton}></div></td>
        <td className="py-2 px-4"><div className={styles.skeleton}></div></td>
        <td className="py-2 px-4"><div className={styles.skeleton}></div></td>
    </tr>
);

const SkeletonTable = () => (
    <div className={styles.tableWrapper}>
        <table className={styles.tableSoiCau}>
            <thead>
                <tr>
                    <th>Phương pháp</th>
                    <th>Kết quả dự đoán</th>
                    <th>Gợi ý nuôi khung</th>
                </tr>
            </thead>
            <tbody>
                {Array(11).fill().map((_, index) => <SkeletonRow key={index} />)}
            </tbody>
        </table>
    </div>
);

const SkeletonLotteryTable = () => (
    <div className={styles.tableWrapper}>
        <table className={styles.lotteryTable}>
            <thead>
                <tr>
                    <th>ĐB</th>
                    <th>Giải 1</th>
                    <th>Giải 2</th>
                    <th>Giải 3</th>
                    <th>Giải 4</th>
                    <th>Giải 5</th>
                    <th>Giải 6</th>
                    <th>Giải 7</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><div className={styles.skeleton}></div></td>
                    <td><div className={styles.skeleton}></div></td>
                    <td><div className={styles.skeleton}></div></td>
                    <td><div className={styles.skeleton}></div></td>
                    <td><div className={styles.skeleton}></div></td>
                    <td><div className={styles.skeleton}></div></td>
                    <td><div className={styles.skeleton}></div></td>
                    <td><div className={styles.skeleton}></div></td>
                </tr>
            </tbody>
        </table>
    </div>
);

const SoiCauBachThuMB = React.memo(({ initialLotteryData, initialSoiCauData, initialDate, initialHistory, initialFrequencies, initialRelatedNumbers }) => {
    const [soiCauResults, setSoiCauResults] = useState(initialSoiCauData.predictions || []);
    const [combinedPrediction, setCombinedPrediction] = useState(initialSoiCauData.combinedPrediction || '');
    const [additionalSuggestions, setAdditionalSuggestions] = useState(initialSoiCauData.additionalSuggestions || []);
    const [selectedDate, setSelectedDate] = useState({
        day: initialDate ? moment(initialDate, 'DD/MM/YYYY').format('DD') : moment().format('DD'),
        month: initialDate ? moment(initialDate, 'DD/MM/YYYY').format('MM') : moment().format('MM'),
        year: initialDate ? moment(initialDate, 'DD/MM/YYYY').format('YYYY') : moment().format('YYYY'),
    });
    const [selectedDays, setSelectedDays] = useState(initialSoiCauData.dataRange?.days || SOI_CAU_CONFIG.defaultDays);
    const [loadingLottery, setLoadingLottery] = useState(false);
    const [loadingSoiCau, setLoadingSoiCau] = useState(false);
    const [error, setError] = useState(null);
    const [suggestedDate, setSuggestedDate] = useState(null);
    const [metadata, setMetadata] = useState(initialSoiCauData.metadata || {});
    const [lotteryData, setLotteryData] = useState(initialLotteryData || []);
    const [history, setHistory] = useState(initialHistory || []);
    const [frequencies, setFrequencies] = useState(initialFrequencies || []);
    const [relatedNumbers, setRelatedNumbers] = useState(initialRelatedNumbers || { loKep: [], loGan: [] });

    const days = useMemo(() => Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0')), []);
    const months = useMemo(() => Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')), []);
    const years = useMemo(() => Array.from({ length: SOI_CAU_CONFIG.maxYear - SOI_CAU_CONFIG.minYear + 1 }, (_, i) => (SOI_CAU_CONFIG.minYear + i).toString()), []);
    const dayOptions = SOI_CAU_CONFIG.dayOptions;

    const isCurrentDate = moment(`${selectedDate.day}/${selectedDate.month}/${selectedDate.year}`, 'DD/MM/YYYY').isSame(moment(), 'day');
    const isBeforeResultTime = new Date().getHours() < 18 || (new Date().getHours() === 18 && new Date().getMinutes() < 40);

    const retryFetch = async (fn, retries = 3, delay = 5000) => {
        for (let i = 0; i < retries; i++) {
            try {
                return await fn();
            } catch (err) {
                if (err.message.includes('429') && i < retries - 1) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
                throw err;
            }
        }
    };

    const fetchLotteryData = useCallback(async (date) => {
        if (isCurrentDate && isBeforeResultTime) {
            setLotteryData([]);
            return;
        }
        setLoadingLottery(true);
        setError(null);
        try {
            const targetDate = moment(date, 'DD/MM/YYYY').format('DD-MM-YYYY');
            const data = await retryFetch(() => apiMB.getLottery('xsmb', targetDate));
            setLotteryData(Array.isArray(data) ? data : data ? [data] : []);
        } catch (err) {
            setError('Không thể tải dữ liệu xổ số. Vui lòng thử lại hoặc chọn ngày khác.');
            setLotteryData([]);
        } finally {
            setLoadingLottery(false);
        }
    }, [isCurrentDate, isBeforeResultTime]);

    const fetchSoiCauData = useCallback(async (date, days) => {
        setLoadingSoiCau(true);
        setError(null);
        setSuggestedDate(null);
        try {
            const response = await retryFetch(() => apiMB.getBachThuMB(date, days));
            setSoiCauResults(response.predictions || []);
            setCombinedPrediction(response.combinedPrediction || '');
            setAdditionalSuggestions(response.additionalSuggestions || []);
            setMetadata(response.metadata || {});
            setHistory(response.history || []);
            setFrequencies(response.frequencies || []);
            setRelatedNumbers({
                loKep: response.numbers?.filter(num => num[0] === num[1]) || [],
                loGan: Array.from({ length: 100 }, (_, i) => i.toString().padStart(2, '0')).filter(num => !response.numbers?.includes(num)) || [],
            });
            if (response.metadata?.message) {
                setError(response.metadata.message);
            }
        } catch (err) {
            const errorMessage = err.message.includes('429')
                ? 'Quá nhiều yêu cầu, vui lòng chờ 5 giây trước khi thử lại.'
                : err.message.includes('Dữ liệu xổ số không hợp lệ')
                    ? `Dữ liệu xổ số không hợp lệ. Vui lòng chọn ngày khác hoặc thử lại sau.`
                    : err.message || 'Không thể tải dữ liệu soi cầu. Vui lòng thử lại hoặc chọn ngày khác.';
            setError(errorMessage);
            setSoiCauResults([]);
            setCombinedPrediction('');
            setAdditionalSuggestions([]);
            setMetadata({});
            setHistory([]);
            setFrequencies([]);
            setRelatedNumbers({ loKep: [], loGan: [] });
            if (err.message.includes('Không tìm thấy dữ liệu') || err.message.includes('Dữ liệu xổ số không hợp lệ')) {
                setSuggestedDate(err.suggestedDate || null);
            }
        } finally {
            setLoadingSoiCau(false);
        }
    }, []);

    const handleDateChange = useCallback((field) => (e) => {
        setSelectedDate((prev) => ({ ...prev, [field]: e.target.value }));
    }, []);

    const handleDaysChange = useCallback((e) => {
        const newDays = parseInt(e.target.value);
        if (dayOptions.includes(newDays)) {
            setSelectedDays(newDays);
        }
    }, [dayOptions]);

    const handleSuggestedDate = () => {
        if (suggestedDate) {
            const [day, month, year] = suggestedDate.split('/');
            setSelectedDate({ day, month, year });
        }
    };

    const debouncedFetchData = useCallback(
        debounce(async (date, days) => {
            setLoadingLottery(true);
            setLoadingSoiCau(true);
            setError(null);
            try {
                const [lotteryData, soiCauData] = await Promise.all([
                    isCurrentDate && isBeforeResultTime ? Promise.resolve([]) : retryFetch(() => apiMB.getLottery('xsmb', moment(date, 'DD/MM/YYYY').format('DD-MM-YYYY'))),
                    retryFetch(() => apiMB.getBachThuMB(date, days)),
                ]);

                setLotteryData(Array.isArray(lotteryData) ? lotteryData : lotteryData ? [lotteryData] : []);
                setSoiCauResults(soiCauData.predictions || []);
                setCombinedPrediction(soiCauData.combinedPrediction || '');
                setAdditionalSuggestions(soiCauData.additionalSuggestions || []);
                setMetadata(soiCauData.metadata || {});
                setHistory(soiCauData.history || []);
                setFrequencies(soiCauData.frequencies || []);
                setRelatedNumbers({
                    loKep: soiCauData.numbers?.filter(num => num[0] === num[1]) || [],
                    loGan: Array.from({ length: 100 }, (_, i) => i.toString().padStart(2, '0')).filter(num => !soiCauData.numbers?.includes(num)) || [],
                });
                if (soiCauData.metadata?.message) {
                    setError(soiCauData.metadata.message);
                }
            } catch (err) {
                const errorMessage = err.message.includes('429')
                    ? 'Quá nhiều yêu cầu, vui lòng chờ 5 giây trước khi thử lại.'
                    : err.message.includes('Dữ liệu xổ số không hợp lệ')
                        ? `Dữ liệu xổ số không hợp lệ. Vui lòng chọn ngày khác hoặc thử lại sau.`
                        : err.message || 'Không thể tải dữ liệu. Vui lòng thử lại hoặc chọn ngày khác.';
                setError(errorMessage);
                setLotteryData([]);
                setSoiCauResults([]);
                setCombinedPrediction('');
                setAdditionalSuggestions([]);
                setMetadata({});
                setHistory([]);
                setFrequencies([]);
                setRelatedNumbers({ loKep: [], loGan: [] });
                if (err.message.includes('Không tìm thấy dữ liệu') || err.message.includes('Dữ liệu xổ số không hợp lệ')) {
                    setSuggestedDate(err.suggestedDate || null);
                }
            } finally {
                setLoadingLottery(false);
                setLoadingSoiCau(false);
            }
        }, 500),
        [isCurrentDate, isBeforeResultTime]
    );

    useEffect(() => {
        const savedState = localStorage.getItem('soiCauState');
        if (savedState) {
            const { selectedDate, selectedDays } = JSON.parse(savedState);
            setSelectedDate(selectedDate);
            setSelectedDays(selectedDays);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('soiCauState', JSON.stringify({ selectedDate, selectedDays }));
        const date = `${selectedDate.day}/${selectedDate.month}/${selectedDate.year}`;
        if (moment(date, 'DD/MM/YYYY').isValid()) {
            debouncedFetchData(date, selectedDays);
        } else {
            setError('Ngày không hợp lệ');
        }
    }, [selectedDate.day, selectedDate.month, selectedDate.year, selectedDays, debouncedFetchData]);

    useEffect(() => {
        const handleScroll = () => {
            const btn = document.querySelector(`.${styles.scrollToTopBtn}`);
            if (btn) {
                btn.style.display = window.scrollY > 300 ? 'block' : 'none';
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const pageTitle = `Soi Cầu Bạch Thủ Miền Bắc - Dự Đoán Ngày ${metadata.predictionFor || moment().format('DD/MM/YYYY')}`;
    const pageDescription = `Dự đoán bạch thủ lô miền Bắc ngày ${metadata.predictionFor || moment().format('DD/MM/YYYY')} dựa trên nhiều phương pháp, sử dụng dữ liệu xổ số từ ${metadata.dataFrom || 'trước đó'} đến ${metadata.dataTo || 'hôm nay'}.`;
    const pageImage = 'https://yourdomain.com/images/soicau-bach-thu-mb.jpg';

    return (
        <div className="container">
            <Head>
                <title>{pageTitle}</title>
                <meta name="description" content={pageDescription} />
                <meta property="og:title" content={pageTitle} />
                <meta property="og:description" content={pageDescription} />
                <meta property="og:type" content="website" />
                <meta property="og:url" content={`https://yourdomain.com/soicau/bach-thu-mb?date=${selectedDate.day}-${selectedDate.month}-${selectedDate.year}`} />
                <meta property="og:image" content={pageImage} />
                <link rel="canonical" href={`https://yourdomain.com/soicau/bach-thu-mb?date=${selectedDate.day}-${selectedDate.month}-${selectedDate.year}`} />
                <script type="application/ld+json">
                    {JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'WebPage',
                        name: pageTitle,
                        description: pageDescription,
                        url: `https://yourdomain.com/soicau/bach-thu-mb?date=${selectedDate.day}-${selectedDate.month}-${selectedDate.year}`,
                        datePublished: moment().toISOString(),
                        dateModified: moment().toISOString(),
                    })}
                </script>
            </Head>

            <div className={styles.container}>
                <div className={styles.titleGroup}>
                    <h1 className={styles.title}>{pageTitle}</h1>
                </div>

                <div className={styles.groupSelect}>
                    <div className={styles.selectGroup}>
                        <span className={styles.options}>Ngày:</span>
                        <select className={styles.select} value={selectedDate.day} onChange={handleDateChange('day')}>
                            {days.map((day) => (
                                <option key={day} value={day}>{day}</option>
                            ))}
                        </select>
                        <span className={styles.options}>Tháng:</span>
                        <select className={styles.select} value={selectedDate.month} onChange={handleDateChange('month')}>
                            {months.map((month) => (
                                <option key={month} value={month}>{month}</option>
                            ))}
                        </select>
                        <span className={styles.options}>Năm:</span>
                        <select className={styles.select} value={selectedDate.year} onChange={handleDateChange('year')}>
                            {years.map((year) => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                        <span className={styles.options}>Số ngày dữ liệu:</span>
                        <select className={styles.select} value={selectedDays} onChange={handleDaysChange}>
                            {dayOptions.map((day) => (
                                <option key={day} value={day}>{day} ngày</option>
                            ))}
                        </select>
                        {suggestedDate && (
                            <button className={styles.suggestedDateBtn} onClick={handleSuggestedDate}>
                                Dùng ngày gợi ý: {suggestedDate}
                            </button>
                        )}
                    </div>
                </div>

                <div className={styles.content}>
                    {error && <p className={styles.error}>{error}</p>}

                    <div className={styles.metadata}>
                        <h2 className={styles.heading}>Thông tin dự đoán</h2>
                        <table className={styles.metadataTable}>
                            <tbody>
                                <tr><td><strong>Dự đoán cho ngày:</strong></td><td>{metadata.predictionFor || ''}</td></tr>
                                <tr><td><strong>Giải đặc biệt (ngày {metadata.dataTo || ''}):</strong></td><td>{metadata.specialPrize || ''}</td></tr>
                                <tr><td><strong>Giải nhất (ngày {metadata.dataTo || ''}):</strong></td><td>{metadata.firstPrize || ''}</td></tr>
                                <tr><td><strong>Bạch thủ lô:</strong></td><td>{soiCauResults.length > 0 ? soiCauResults.filter(r => r.number).map(r => r.number).join(', ') || '' : ''}</td></tr>
                                <tr><td><strong>Dự đoán tổng hợp:</strong></td><td>{combinedPrediction}</td></tr>
                            </tbody>
                        </table>
                    </div>

                    {loadingLottery && <SkeletonLotteryTable />}
                    {!loadingLottery && !error && lotteryData.length > 0 && !isCurrentDate && (
                        <div className={styles.tableWrapper}>
                            <h2 className={styles.heading}>Kết quả xổ số ngày {metadata.dataTo || ''}</h2>
                            <table className={styles.lotteryTable}>
                                <thead>
                                    <tr>
                                        <th>ĐB</th>
                                        <th>Giải 1</th>
                                        <th>Giải 2</th>
                                        <th>Giải 3</th>
                                        <th>Giải 4</th>
                                        <th>Giải 5</th>
                                        <th>Giải 6</th>
                                        <th>Giải 7</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lotteryData.slice(0, 1).map((result, index) => (
                                        <tr key={index}>
                                            <td className={styles.specialPrize}>{result.specialPrize?.[0] || ''}</td>
                                            <td>{result.firstPrize?.[0] || ''}</td>
                                            <td>{result.secondPrize?.join(', ') || ''}</td>
                                            <td>{result.threePrizes?.join(', ') || ''}</td>
                                            <td>{result.fourPrizes?.join(', ') || ''}</td>
                                            <td>{result.fivePrizes?.join(', ') || ''}</td>
                                            <td>{result.sixPrizes?.join(', ') || ''}</td>
                                            <td>{result.sevenPrizes?.join(', ') || ''}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {!loadingLottery && !error && lotteryData.length === 0 && !isCurrentDate && (
                        <p className={styles.noData}>Không có dữ liệu xổ số cho ngày này.</p>
                    )}

                    <h2 className={styles.heading}>Dự đoán bạch thủ lô cho ngày {metadata.predictionFor || ''}</h2>
                    {loadingSoiCau && <SkeletonTable />}
                    {!loadingSoiCau && soiCauResults.length > 0 && (
                        <div className={styles.tableWrapper}>
                            <table className={styles.tableSoiCau}>
                                <thead>
                                    <tr>
                                        <th>Phương pháp <span className={styles.tooltipIcon}>ℹ️</span></th>
                                        <th>Kết quả dự đoán</th>
                                        <th>Gợi ý nuôi khung</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {soiCauResults.map((result, index) => (
                                        <tr key={index}>
                                            <td className={styles.method}>
                                                {result.method}
                                                <span className={styles.tooltip}>
                                                    {result.method === 'Pascal'
                                                        ? 'Ghép 2 số cuối của giải đặc biệt và giải nhất, cộng các số liền kề đến khi còn 2 số.'
                                                        : result.method === 'Hình Quả Trám'
                                                            ? 'Tìm mẫu A-B-A hoặc B-A-B trong các giải, số ở giữa là bạch thủ lô.'
                                                            : result.method === 'Tần suất lô cặp'
                                                                ? 'Chọn số từ cặp số có tần suất xuất hiện cao nhất.'
                                                                : result.method === 'Lô gan kết hợp'
                                                                    ? 'Chọn số gần đạt ngưỡng gan nhưng có tần suất cao.'
                                                                    : result.method === 'Lô rơi'
                                                                        ? 'Chọn số xuất hiện liên tục trong 2-3 ngày gần nhất ở cùng vị trí giải.'
                                                                        : result.method === 'Lô kép theo chu kỳ'
                                                                            ? 'Dự đoán lô kép dựa trên chu kỳ xuất hiện trong 30-100 ngày.'
                                                                            : result.method === 'Biên độ tần suất'
                                                                                ? 'Chọn số có tần suất trung bình trong 7-14 ngày.'
                                                                                : result.method === 'Chu kỳ số'
                                                                                    ? 'Dự đoán số dựa trên chu kỳ xuất hiện trong 30 ngày.'
                                                                                    : result.method === 'Tổng các chữ số'
                                                                                        ? 'Tính tổng các chữ số từ giải đặc biệt và giải nhất, rút gọn về 2 chữ số.'
                                                                                        : result.method === 'Đảo ngược'
                                                                                            ? 'Đảo ngược 2 số cuối của giải đặc biệt.'
                                                                                            : 'Tính khoảng cách giữa 2 số cuối của giải đặc biệt liên tiếp.'}
                                                </span>
                                            </td>
                                            <td className={result.number ? styles.highlight : styles.noData}>
                                                {result.number || ''}
                                            </td>
                                            <td>{result.frame || ''}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {!loadingSoiCau && soiCauResults.length === 0 && (
                        <p className={styles.noData}>Không tìm thấy kết quả soi cầu.</p>
                    )}
                    <h3 className={styles.h3}>Dự đoán tổng hợp: <span className={styles.highlight}>{combinedPrediction}</span></h3>
                    {additionalSuggestions.length > 0 && (
                        <>
                            <h3 className={styles.h3}>Số gợi ý bổ sung:</h3>
                            <p className={styles.desc}>{additionalSuggestions.join(', ')}</p>
                        </>
                    )}

                    <h2 className={styles.heading}>Lịch sử dự đoán (10 ngày trước)</h2>
                    {loadingSoiCau ? (
                        <SkeletonTable />
                    ) : history.length > 0 ? (
                        <div className={styles.tableWrapper}>
                            <table className={styles.historyTable}>
                                <thead>
                                    <tr>
                                        <th>Ngày</th>
                                        <th>Dự đoán</th>
                                        <th>Kết quả thực tế</th>
                                        <th>Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.map((entry, index) => (
                                        <tr key={index}>
                                            <td>{entry.date}</td>
                                            <td>{entry.predictions.filter(p => p.number).map(p => p.number).join(', ') || ''}</td>
                                            <td>
                                                {entry.actualNumbers.length > 0 ? (
                                                    entry.actualNumbers.map((num, idx) => (
                                                        <span key={idx} className={styles.matchedNumber}>
                                                            {num}{idx < entry.actualNumbers.length - 1 ? ', ' : ''}
                                                        </span>
                                                    ))
                                                ) : ''}
                                            </td>
                                            <td className={entry.isHit ? styles.hit : styles.miss}>
                                                {entry.isHit ? 'Trúng' : 'Trượt'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className={styles.noData}>Không có dữ liệu lịch sử.</p>
                    )}

                    <h2 className={styles.heading}>Top 10 số xuất hiện nhiều nhất ({selectedDays} ngày)</h2>
                    {frequencies.length > 0 ? (
                        <div className={styles.tableWrapper}>
                            <table className={styles.frequencyTable}>
                                <thead>
                                    <tr>
                                        <th>Số</th>
                                        <th>Số lần xuất hiện</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {frequencies.slice(0, 10).map((freq, index) => (
                                        <tr key={index}>
                                            <td className={styles.highlight}>{freq.number}</td>
                                            <td>{freq.count}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className={styles.noData}>Không có số nào xuất hiện từ 3 lần trở lên.</p>
                    )}

                    <h2 className={styles.heading}>Số liên quan</h2>
                    <div className={styles.relatedNumbers}>
                        <div><strong>Lô kép:</strong> {relatedNumbers.loKep.length > 0 ? relatedNumbers.loKep.join(', ') : 'Không có'}</div>
                        <div><strong>Lô gan ({selectedDays} ngày):</strong> {relatedNumbers.loGan.length > 0 ? relatedNumbers.loGan.slice(0, 5).join(', ') + (relatedNumbers.loGan.length > 5 ? '...' : '') : 'Không có'}</div>
                    </div>

                    <div className={styles.groupContent}>
                        <h2 className={styles.heading}>Phương pháp soi cầu</h2>
                        <div className={styles.contentWrapper}>
                            <h3 className={styles.h3}>Phương pháp Pascal</h3>
                            <p className={styles.desc}>Ghép 2 số cuối của giải đặc biệt và giải nhất, cộng các số liền kề đến khi còn 2 số.</p>
                            <h3 className={styles.h3}>Phương pháp Hình Quả Trám</h3>
                            <p className={styles.desc}>Tìm mẫu A-B-A hoặc B-A-B trong các giải, số ở giữa là bạch thủ lô.</p>
                            <h3 className={styles.h3}>Phương pháp Tần suất lô cặp</h3>
                            <p className={styles.desc}>Chọn số từ cặp số có tần suất xuất hiện cao nhất.</p>
                            <h3 className={styles.h3}>Phương pháp Lô gan kết hợp</h3>
                            <p className={styles.desc}>Chọn số gần đạt ngưỡng gan nhưng có tần suất cao.</p>
                            <h3 className={styles.h3}>Phương pháp Lô rơi</h3>
                            <p className={styles.desc}>Chọn số xuất hiện liên tục trong 2-3 ngày gần nhất ở cùng vị trí giải.</p>
                            <h3 className={styles.h3}>Phương pháp Lô kép theo chu kỳ</h3>
                            <p className={styles.desc}>Dự đoán lô kép dựa trên chu kỳ xuất hiện trong 30-100 ngày.</p>
                            <h3 className={styles.h3}>Phương pháp Biên độ tần suất</h3>
                            <p className={styles.desc}>Chọn số có tần suất trung bình trong 7-14 ngày.</p>
                            <h3 className={styles.h3}>Phương pháp Chu kỳ số</h3>
                            <p className={styles.desc}>Dự đoán số dựa trên chu kỳ xuất hiện trong 30 ngày.</p>
                            <h3 className={styles.h3}>Phương pháp Tổng các chữ số</h3>
                            <p className={styles.desc}>Tính tổng các chữ số từ giải đặc biệt và giải nhất, rút gọn về 2 chữ số.</p>
                            <h3 className={styles.h3}>Phương pháp Đảo ngược</h3>
                            <p className={styles.desc}>Đảo ngược 2 số cuối của giải đặc biệt.</p>
                            <h3 className={styles.h3}>Phương pháp Khoảng cách</h3>
                            <p className={styles.desc}>Tính khoảng cách giữa 2 số cuối của giải đặc biệt liên tiếp.</p>
                            <h3 className={styles.h3}>Cách sử dụng:</h3>
                            <p className={styles.desc}>
                                - Chọn ngày và số ngày dữ liệu để phân tích.<br />
                                - Xem kết quả từ các phương pháp và số gợi ý bổ sung.<br />
                                - Kiểm tra lịch sử dự đoán để đánh giá độ chính xác.<br />
                                - Nếu không có dữ liệu, thử ngày gợi ý từ hệ thống.
                            </p>
                        </div>
                    </div>
                </div>

                <button className={styles.scrollToTopBtn} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                    ↑
                </button>
            </div>
            <div>
                <Thongke />
                <CongCuHot />
            </div>
        </div>
    );
});

export async function getServerSideProps() {
    const redisClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    await redisClient.connect();

    try {
        const cacheKey = `soicau:mb:${moment().format('DD-MM-YYYY')}:${SOI_CAU_CONFIG.defaultDays}`;
        const cached = await redisClient.get(cacheKey);
        if (cached) {
            await redisClient.disconnect();
            return { props: JSON.parse(cached) };
        }

        const currentTime = moment();
        const isAfterResultTime = currentTime.hour() >= 18 && currentTime.minute() >= 40;
        const defaultDate = isAfterResultTime
            ? moment().add(1, 'days').format('DD/MM/YYYY')
            : moment().format('DD/MM/YYYY');
        const lotteryDate = moment(defaultDate, 'DD/MM/YYYY').format('DD-MM-YYYY');
        const defaultDays = SOI_CAU_CONFIG.defaultDays;

        const [lotteryData, soiCauData] = await Promise.all([
            moment(defaultDate, 'DD/MM/YYYY').isSame(moment(), 'day') && !isAfterResultTime
                ? Promise.resolve([])
                : apiMB.getLottery('xsmb', lotteryDate),
            apiMB.getBachThuMB(defaultDate, defaultDays),
        ]);

        const frequencies = (soiCauData.frequencies || []).slice(0, 10);
        const loKep = (soiCauData.numbers || []).filter(num => num[0] === num[1]);
        const loGan = Array.from({ length: 100 }, (_, i) => i.toString().padStart(2, '0'))
            .filter(num => !soiCauData.numbers?.includes(num));

        const props = {
            initialLotteryData: Array.isArray(lotteryData) ? lotteryData : lotteryData ? [lotteryData] : [],
            initialSoiCauData: soiCauData || { predictions: [], combinedPrediction: '', additionalSuggestions: [], metadata: {}, dataRange: { days: defaultDays }, history: [], frequencies: [] },
            initialDate: defaultDate,
            initialHistory: soiCauData.history || [],
            initialFrequencies: frequencies,
            initialRelatedNumbers: { loKep, loGan },
        };

        await redisClient.setEx(cacheKey, 3600, JSON.stringify(props));
        await redisClient.disconnect();
        return { props };
    } catch (error) {
        console.error('Error in getServerSideProps:', error.message);
        await redisClient.disconnect();
        return {
            props: {
                initialLotteryData: [],
                initialSoiCauData: { predictions: [], combinedPrediction: '', additionalSuggestions: [], metadata: {}, dataRange: { days: SOI_CAU_CONFIG.defaultDays }, history: [], frequencies: [] },
                initialDate: moment().format('DD/MM/YYYY'),
                initialHistory: [],
                initialFrequencies: [],
                initialRelatedNumbers: { loKep: [], loGan: [] },
            },
        };
    }
}

export default SoiCauBachThuMB;