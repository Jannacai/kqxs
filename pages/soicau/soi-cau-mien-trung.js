
import React, { useState, useCallback, useEffect } from 'react';
import Head from 'next/head';
import { apiMT } from '../api/kqxs/kqxsMT';
import styles from '../../styles/soicauMT.module.css';
import moment from 'moment';

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
                {Array(12).fill().map((_, index) => <SkeletonRow key={index} />)}
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
                    <th>Giải 8</th>
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
                    <td><div className={styles.skeleton}></div></td>
                </tr>
            </tbody>
        </table>
    </div>
);

const SoiCauBachThuMT = ({ initialLotteryData, initialSoiCauData, initialHistory, initialFrequencies, initialRelatedNumbers, initialProvinces }) => {
    const [soiCauResults, setSoiCauResults] = useState(initialSoiCauData.predictions || []);
    const [combinedPrediction, setCombinedPrediction] = useState(initialSoiCauData.combinedPrediction || '');
    const [additionalSuggestions, setAdditionalSuggestions] = useState(initialSoiCauData.additionalSuggestions || []);
    const [selectedDays, setSelectedDays] = useState(initialSoiCauData.dataRange?.days || 10);
    const [tinh, setTinh] = useState(initialSoiCauData.metadata?.province || (initialProvinces.length > 0 ? initialProvinces[0] : 'Huế'));
    const [availableProvinces, setAvailableProvinces] = useState(initialProvinces || []);
    const [loadingLottery, setLoadingLottery] = useState(false);
    const [loadingSoiCau, setLoadingSoiCau] = useState(false);
    const [error, setError] = useState(null);
    const [metadata, setMetadata] = useState(initialSoiCauData.metadata || {});
    const [lotteryData, setLotteryData] = useState(initialLotteryData || []);
    const [history, setHistory] = useState(initialHistory || []);
    const [frequencies, setFrequencies] = useState(initialFrequencies || []);
    const [relatedNumbers, setRelatedNumbers] = useState(initialRelatedNumbers || { loKep: [], loGan: [] });

    const dayOptions = [3, 5, 7, 10, 14];
    const currentDate = moment().format('DD/MM/YYYY');
    const isBeforeResultTime = new Date().getHours() < 17 || (new Date().getHours() === 17 && new Date().getMinutes() < 35);
    const isCurrentDate = true;
    const predictionDate = isBeforeResultTime ? currentDate : moment().add(1, 'days').format('DD/MM/YYYY');

    const fetchProvinces = useCallback(async (date, retryCount = 1) => {
        try {
            const targetDate = isBeforeResultTime ? date : moment(date, 'DD/MM/YYYY').add(1, 'days').format('DD/MM/YYYY');
            const provinces = await apiMT.getProvinces(targetDate);
            if (provinces.length === 0 && retryCount > 0) {
                console.warn(`Không tìm thấy tỉnh cho ngày ${ targetDate }. Thử lại với ngày trước đó.`);
                const prevDate = moment(targetDate, 'DD/MM/YYYY').subtract(1, 'days').format('DD/MM/YYYY');
                return fetchProvinces(prevDate, retryCount - 1);
            }
            setAvailableProvinces(provinces || []);
            if (provinces.length > 0 && !tinh) {
                setTinh(provinces[0]);
            } else if (provinces.length === 0) {
                setError(`Không tìm thấy tỉnh nào cho ngày ${ targetDate }. Vui lòng chọn ngày khác hoặc kiểm tra dữ liệu.`);
                setTinh('Huế');
            }
        } catch (err) {
            if (retryCount > 0) {
                console.warn(`Lỗi khi tải tỉnh cho ngày ${ date }: ${ err.message }. Thử lại với ngày trước đó.`);
                const prevDate = moment(date, 'DD/MM/YYYY').subtract(1, 'days').format('DD/MM/YYYY');
                return fetchProvinces(prevDate, retryCount - 1);
            }
            setError(`Không thể tải danh sách tỉnh: ${ err.message }. Vui lòng thử lại hoặc chọn ngày khác.`);
            setAvailableProvinces([]);
            setTinh('Huế');
        }
    }, [tinh, isBeforeResultTime]);

    const fetchLotteryData = useCallback(async (date, tinh) => {
        if (!tinh) {
            setError('Vui lòng chọn tỉnh.');
            return;
        }
        if (isCurrentDate && isBeforeResultTime) {
            setLotteryData([]);
            return;
        }
        setLoadingLottery(true);
        setError(null);
        try {
            const targetDate = moment(date, 'DD/MM/YYYY').format('DD-MM-YYYY');
            const data = await apiMT.getLottery('xsmt', targetDate, tinh);
            setLotteryData(Array.isArray(data) ? data : data ? [data] : []);
        } catch (err) {
            setError(`Không thể tải dữ liệu xổ số: ${ err.message }. Vui lòng thử lại hoặc chọn tỉnh khác.`);
            setLotteryData([]);
        } finally {
            setLoadingLottery(false);
        }
    }, [isCurrentDate, isBeforeResultTime]);

    const fetchSoiCauData = useCallback(async (date, days) => {
        if (!tinh) {
            setError('Vui lòng chọn tỉnh trước khi tải dữ liệu soi cầu.');
            return;
        }
        setLoadingSoiCau(true);
        setError(null);
        try {
            const targetDate = isBeforeResultTime ? date : moment(date, 'DD/MM/YYYY').add(1, 'days').format('DD/MM/YYYY');
            const response = await apiMT.getBachThuMT(targetDate, days, tinh);
            if (!response || !response.predictions || !response.metadata) {
                throw new Error('Dữ liệu soi cầu không hợp lệ hoặc rỗng.');
            }
            setSoiCauResults(response.predictions || []);
            setCombinedPrediction(response.combinedPrediction || '');
            setAdditionalSuggestions(response.additionalSuggestions || []);
            setMetadata(response.metadata || {});
            setHistory(response.history || []);
            setFrequencies(response.frequencies || []);
            setRelatedNumbers({
                loKep: response.relatedNumbers?.loKep || [],
                loGan: response.relatedNumbers?.loGan || [],
            });
            if (response.metadata?.message && response.predictions.length === 0) {
                setError(response.metadata.message || `Không có dữ liệu soi cầu cho tỉnh ${ tinh } vào ngày ${ targetDate }.`);
            }
        } catch (err) {
            const errorMessage = err.message.includes('429')
                ? 'Quá nhiều yêu cầu, vui lòng chờ 5 giây trước khi thử lại.'
                : err.message.includes('Dữ liệu xổ số không hợp lệ')
                    ? 'Dữ liệu xổ số không hợp lệ. Vui lòng thử lại sau.'
                    : err.message || `Không thể tải dữ liệu soi cầu cho tỉnh ${ tinh }. Vui lòng thử lại hoặc chọn tỉnh khác.`;
            setError(errorMessage);
            setSoiCauResults([]);
            setCombinedPrediction('');
            setAdditionalSuggestions([]);
            setMetadata({});
            setHistory([]);
            setFrequencies([]);
            setRelatedNumbers({ loKep: [], loGan: [] });
        } finally {
            setLoadingSoiCau(false);
        }
    }, [tinh, isBeforeResultTime]);

    const handleDaysChange = useCallback((e) => {
        const newDays = parseInt(e.target.value);
        if (dayOptions.includes(newDays)) {
            setSelectedDays(newDays);
        }
    }, [dayOptions]);

    const handleTinhChange = useCallback((e) => {
        setTinh(e.target.value);
    }, []);

    useEffect(() => {
        fetchProvinces(currentDate);
        fetchLotteryData(currentDate, tinh);
        fetchSoiCauData(currentDate, selectedDays);
    }, [currentDate, selectedDays, tinh, fetchProvinces, fetchLotteryData, fetchSoiCauData]);

    useEffect(() => {
        const handleScroll = () => {
            const btn = document.querySelector(`.${ styles.scrollToTopBtn } `);
            if (btn) {
                btn.style.display = window.scrollY > 300 ? 'block' : 'none';
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const pageTitle = 'Soi Cầu Bạch Thủ Miền Trung - Dự Đoán Hôm Nay';
    const pageDescription = `Dự đoán bạch thủ lô miền Trung hôm nay(${ metadata.predictionFor || '' }) cho tỉnh ${ tinh || '' } dựa trên nhiều phương pháp, sử dụng kết quả xổ số từ ${ metadata.dataFrom || '' } đến ${ metadata.dataTo || '' }.`;

    return (
        <div className="container">
            <Head>
                <title>{pageTitle}</title>
                <meta name="description" content={pageDescription} />
                <meta property="og:title" content={pageTitle} />
                <meta property="og:description" content={pageDescription} />
                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://yourdomain.com/soicau/bach-thu-mt" />
                <meta property="og:image" content="https://yourdomain.com/images/soicau-bach-thu-mt.jpg" />
                <link rel="canonical" href="https://yourdomain.com/soicau/bach-thu-mt" />
            </Head>

            <div className={styles.container}>
                <div className={styles.titleGroup}>
                    <h1 className={styles.title}>{pageTitle}</h1>
                </div>

                <div className={styles.groupSelect}>
                    <div className={styles.selectGroup}>
                        <span className={styles.options}>Tỉnh:</span>
                        <select className={styles.select} value={tinh} onChange={handleTinhChange}>
                            {availableProvinces.length > 0 ? (
                                availableProvinces.map(province => (
                                    <option key={province} value={province}>{province}</option>
                                ))
                            ) : (
                                <option value="Huế">Huế (mặc định)</option>
                            )}
                        </select>
                        <span className={styles.options}>Số ngày phân tích:</span>
                        <select className={styles.select} value={selectedDays} onChange={handleDaysChange}>
                            {dayOptions.map(day => <option key={day} value={day}>{day} ngày</option>)}
                        </select>
                    </div>
                </div>

                <div className={styles.content}>
                    {error && <p className={styles.error}>{error}</p>}

                    <div className={styles.metadata}>
                        <h2 className={styles.heading}>Thông tin dự đoán</h2>
                        <table className={styles.metadataTable}>
                            <tbody>
                                <tr><td><strong>Dự đoán cho ngày:</strong></td><td>{metadata.predictionFor || 'Chưa có dữ liệu'}</td></tr>
                                <tr><td><strong>Tỉnh:</strong></td><td>{tinh || 'Chưa chọn tỉnh'}</td></tr>
                                <tr><td><strong>Giải đặc biệt (ngày {metadata.dataTo || ''}):</strong></td><td>{metadata.specialPrize || 'Chưa có dữ liệu'}</td></tr>
                                <tr><td><strong>Giải nhất (ngày {metadata.dataTo || ''}):</strong></td><td>{metadata.firstPrize || 'Chưa có dữ liệu'}</td></tr>
                                <tr><td><strong>Bạch thủ lô:</strong></td><td>{soiCauResults.length > 0 ? soiCauResults.filter(r => r.number).map(r => r.number).join(', ') || 'Chưa có dữ liệu' : 'Chưa có dữ liệu'}</td></tr>
                                <tr><td><strong>Dự đoán tổng hợp:</strong></td><td>{combinedPrediction || 'Chưa có dữ liệu'}</td></tr>
                            </tbody>
                        </table>
                    </div>

                    {loadingLottery && <SkeletonLotteryTable />}
                    {!loadingLottery && !error && lotteryData.length > 0 && !isBeforeResultTime && (
                        <div className={styles.tableWrapper}>
                            <h2 className={styles.heading}>Kết quả xổ số ngày {metadata.dataTo || 'Chưa có dữ liệu'}</h2>
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
                                        <th>Giải 8</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lotteryData.slice(0, 1).map((result, index) => (
                                        <tr key={index}>
                                            <td className={styles.specialPrize}>{result.specialPrize?.[0] || 'Chưa có dữ liệu'}</td>
                                            <td>{result.firstPrize?.[0] || 'Chưa có dữ liệu'}</td>
                                            <td>{result.secondPrize?.join(', ') || 'Chưa có dữ liệu'}</td>
                                            <td>{result.threePrizes?.join(', ') || 'Chưa có dữ liệu'}</td>
                                            <td>{result.fourPrizes?.join(', ') || 'Chưa có dữ liệu'}</td>
                                            <td>{result.fivePrizes?.join(', ') || 'Chưa có dữ liệu'}</td>
                                            <td>{result.sixPrizes?.join(', ') || 'Chưa có dữ liệu'}</td>
                                            <td>{result.sevenPrizes?.join(', ') || 'Chưa có dữ liệu'}</td>
                                            <td>{result.eightPrizes?.join(', ') || 'Chưa có dữ liệu'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {!loadingLottery && !error && lotteryData.length === 0 && !isBeforeResultTime && (
                        <p className={styles.noData}>Không có dữ liệu xổ số cho tỉnh {tinh}. Vui lòng chọn tỉnh khác hoặc kiểm tra lại ngày.</p>
                    )}

                    <h2 className={styles.heading}>Dự đoán bạch thủ lô cho ngày {metadata.predictionFor || 'Chưa có dữ liệu'}</h2>
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
                                                                                            : result.method === 'Khoảng cách'
                                                                                                ? 'Tính khoảng cách giữa 2 số cuối của giải đặc biệt liên tiếp.'
                                                                                                : 'Phân tích xu hướng số xuất hiện trong 3 ngày gần nhất.'}
                                                </span>
                                            </td>
                                            <td className={result.number ? styles.highlight : ''}>
                                                {result.number || 'Chưa có dữ liệu'}
                                            </td>
                                            <td>{result.frame || 'Không áp dụng'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {!loadingSoiCau && soiCauResults.length === 0 && !error && (
                        <p className={styles.noData}>Không có dự đoán bạch thủ lô cho tỉnh {tinh}. Vui lòng chọn tỉnh khác hoặc thử lại.</p>
                    )}

                    <h3 className={styles.h3}>Dự đoán tổng hợp</h3>
                    <p className={styles.desc}>
                        Bạch thủ lô tổng hợp: <strong className={styles.highlight}>{combinedPrediction || 'Chưa có dữ liệu'}</strong>
                    </p>
                    {additionalSuggestions.length > 0 && (
                        <p className={styles.desc}>
                            Gợi ý thêm: <strong>{additionalSuggestions.join(', ')}</strong>
                        </p>
                    )}

                    <h3 className={styles.h3}>Số liên quan</h3>
                    <div className={styles.relatedNumbers}>
                        <div><strong>Lô kép:</strong> {relatedNumbers.loKep.length > 0 ? relatedNumbers.loKep.join(', ') : 'Không có'}</div>
                        <div><strong>Lô gan:</strong> {relatedNumbers.loGan.length > 0 ? relatedNumbers.loGan.slice(0, 10).join(', ') : 'Không có'}</div>
                    </div>

                    <h3 className={styles.h3}>Tần suất xuất hiện</h3>
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
                                    {frequencies.map((freq, index) => (
                                        <tr key={index}>
                                            <td className={styles.highlight}>{freq.number}</td>
                                            <td>{freq.count}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className={styles.noData}>Không có dữ liệu tần suất xuất hiện cho tỉnh {tinh}.</p>
                    )}

                    <h3 className={styles.h3}>Lịch sử dự đoán</h3>
                    {history.length > 0 ? (
                        <div className={styles.tableWrapper}>
                            <table className={styles.historyTable}>
                                <thead>
                                    <tr>
                                        <th>Ngày</th>
                                        <th>Tỉnh</th>
                                        <th>Dự đoán</th>
                                        <th>Kết quả</th>
                                        <th>Trúng</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.map((item, index) => (
                                        <tr key={index}>
                                            <td>{item.date}</td>
                                            <td>{item.provinces}</td>
                                            <td>
                                                {item.predictions
                                                    .filter(p => p.number)
                                                    .map(p => p.number)
                                                    .join(', ') || 'Chưa có dữ liệu'}
                                            </td>
                                            <td>
                                                {item.actualNumbers?.length > 0
                                                    ? item.actualNumbers.map((num, i) => (
                                                        <span key={i} className={styles.matchedNumber}>{num}{i < item.actualNumbers.length - 1 ? ', ' : ''}</span>
                                                    ))
                                                    : 'Không có'}
                                            </td>
                                            <td className={item.isHit ? styles.hit : styles.miss}>
                                                {item.isHit ? 'Trúng' : 'Trượt'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className={styles.noData}>Không có lịch sử dự đoán cho tỉnh {tinh}.</p>
                    )}
                </div>

                <button className={styles.scrollToTopBtn} onClick={scrollToTop} title="Quay lại đầu trang">
                    ↑
                </button>
            </div>
        </div>
    );
};

export async function getServerSideProps(context) {
    const { date = moment().format('DD/MM/YYYY'), days = '10', tinh = '' } = context.query;
    let initialLotteryData = [];
    let initialSoiCauData = { predictions: [], combinedPrediction: '', additionalSuggestions: [], metadata: {}, dataRange: { days: parseInt(days) } };
    let initialHistory = [];
    let initialFrequencies = [];
    let initialRelatedNumbers = { loKep: [], loGan: [] };
    let initialProvinces = [];

    try {
        const currentTime = new Date();
        const isBeforeResultTime = currentTime.getHours() < 17 || (currentTime.getHours() === 17 && currentTime.getMinutes() < 35);
        const targetDate = isBeforeResultTime ? date : moment(date, 'DD/MM/YYYY').add(1, 'days').format('DD/MM/YYYY');

        initialProvinces = await apiMT.getProvinces(targetDate);
        const selectedTinh = tinh || (initialProvinces.length > 0 ? initialProvinces[0] : 'Huế');
        if (selectedTinh) {
            const targetLotteryDate = moment(date, 'DD/MM/YYYY').format('DD-MM-YYYY');
            initialLotteryData = await apiMT.getLottery('xsmt', targetLotteryDate, selectedTinh);
            initialLotteryData = Array.isArray(initialLotteryData) ? initialLotteryData : initialLotteryData ? [initialLotteryData] : [];

            const soiCauResponse = await apiMT.getBachThuMT(targetDate, days, selectedTinh);
            if (soiCauResponse && soiCauResponse.predictions && soiCauResponse.metadata) {
                initialSoiCauData = {
                    predictions: soiCauResponse.predictions || [],
                    combinedPrediction: soiCauResponse.combinedPrediction || '',
                    additionalSuggestions: soiCauResponse.additionalSuggestions || [],
                    metadata: soiCauResponse.metadata || {},
                    dataRange: soiCauResponse.dataRange || { days: parseInt(days) },
                };
                initialHistory = soiCauResponse.history || [];
                initialFrequencies = soiCauResponse.frequencies || [];
                initialRelatedNumbers = {
                    loKep: soiCauResponse.relatedNumbers?.loKep || [],
                    loGan: soiCauResponse.relatedNumbers?.loGan || [],
                };
            }
        }
    } catch (err) {
        console.error('Error in getServerSideProps:', err.message);
    }

    return {
        props: {
            initialLotteryData,
            initialSoiCauData,
            initialHistory,
            initialFrequencies,
            initialRelatedNumbers,
            initialProvinces,
        },
    };
}

export default SoiCauBachThuMT;
