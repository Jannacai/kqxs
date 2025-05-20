import React, { useState, useCallback, useEffect, useRef } from 'react';
import Head from 'next/head';
import styles from '../../styles/giaidacbiettuan.module.css';
import ThongKe from '../../component/thongKe';
import { apiMB } from '../api/kqxs/kqxsMB';
import { apiMT } from '../api/kqxs/kqxsMT';
import { apiMN } from '../api/kqxs/kqxsMN';

// Danh sách tỉnh
const provinceSlugs = {
    "Vũng Tàu": "vung-tau",
    "Cần Thơ": "can-tho",
    "Đồng Tháp": "dong-thap",
    "TP.Hồ Chí Minh": "tphcm",
    "Cà Mau": "ca-mau",
    "Bến Tre": "ben-tre",
    "Bạc Liêu": "bac-lieu",
    "Sóc Trăng": "soc-trang",
    "Đồng Nai": "dong-nai",
    "An Giang": "an-giang",
    "Tây Ninh": "tay-ninh",
    "Bình Thuận": "binh-thuan",
    "Vĩnh Long": "vinh-long",
    "Trà Vinh": "tra-vinh",
    "Long An": "long-an",
    "Bình Phước": "binh-phuoc",
    "Hậu Giang": "hau-giang",
    "Kiên Giang": "kien-giang",
    "Tiền Giang": "tien-giang",
    "Đà Lạt": "da-lat",
    "Bình Dương": "binh-duong",
    "Huế": "hue",
    "Phú Yên": "phu-yen",
    "Đắk Lắk": "dak-lak",
    "Quảng Nam": "quang-nam",
    "Khánh Hòa": "khanh-hoa",
    "Đà Nẵng": "da-nang",
    "Bình Định": "binh-dinh",
    "Quảng Trị": "quang-tri",
    "Ninh Thuận": "ninh-thuan",
    "Gia Lai": "gia-lai",
    "Quảng Ngãi": "quang-ngai",
    "Đắk Nông": "dak-nong",
    "Kon Tum": "kon-tum"
};

// Danh sách tỉnh Miền Nam và Miền Trung
const mienNamProvinces = [
    "Vũng Tàu", "Cần Thơ", "Đồng Tháp", "TP.Hồ Chí Minh", "Cà Mau", "Bến Tre", "Bạc Liêu", "Sóc Trăng",
    "Đồng Nai", "An Giang", "Tây Ninh", "Bình Thuận", "Vĩnh Long", "Trà Vinh", "Long An", "Bình Phước",
    "Hậu Giang", "Kiên Giang", "Tiền Giang", "Đà Lạt", "Bình Dương"
];

const mienTrungProvinces = [
    "Huế", "Phú Yên", "Đắk Lắk", "Quảng Nam", "Khánh Hòa", "Đà Nẵng", "Bình Định", "Quảng Trị",
    "Ninh Thuận", "Gia Lai", "Quảng Ngãi", "Đắk Nông", "Kon Tum"
];

// Skeleton Loading Component cho bảng 7 cột (Thứ 2 đến CN)
const SkeletonRowDaysOfWeek = () => (
    <tr>
        {Array(7).fill().map((_, index) => (
            <td key={index}><div className={styles.skeleton}></div></td>
        ))}
    </tr>
);

const SkeletonTableDaysOfWeek = () => (
    <table className={styles.table}>
        <thead>
            <tr>
                <th>Thứ 2</th>
                <th>Thứ 3</th>
                <th>Thứ 4</th>
                <th>Thứ 5</th>
                <th>Thứ 6</th>
                <th>Thứ 7</th>
                <th>CN</th>
            </tr>
        </thead>
        <tbody>
            {Array(5).fill().map((_, index) => <SkeletonRowDaysOfWeek key={index} />)}
        </tbody>
    </table>
);

const GiaiDacBietTheoTuan = ({ initialStats, initialMetadata, initialMonth, initialYear, initialRegion, initialTinh }) => {
    const [stats, setStats] = useState(initialStats || []);
    const [metadata, setMetadata] = useState(initialMetadata || {});
    const [month, setMonth] = useState(initialMonth || new Date().getMonth() + 1);
    const [year, setYear] = useState(initialYear || new Date().getFullYear());
    const [region, setRegion] = useState(initialRegion || 'Miền Bắc');
    const [tinh, setTinh] = useState(initialTinh || null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const abortControllerRef = useRef(null);

    // Hàm gọi API cho Miền Bắc
    const fetchSpecialPrizeStatsByWeekMB = useCallback(async (month, year) => {
        setLoading(true);
        setError(null);
        try {
            console.log('Calling apiMB.getSpecialStatsByWeek with month:', month, 'year:', year);
            const data = await apiMB.getSpecialStatsByWeek(month, year);
            console.log('Dữ liệu API Miền Bắc:', data);
            setStats(data.statistics || []);
            setMetadata(data.metadata || {});
            if (!data.statistics || data.statistics.length === 0) {
                console.log('Không có dữ liệu giải đặc biệt cho Miền Bắc trong khoảng thời gian đã chọn.');
                setError(`Không có dữ liệu giải đặc biệt cho Miền Bắc trong tháng ${month}/${year}.`);
            }
        } catch (err) {
            console.log('Lỗi khi lấy dữ liệu Miền Bắc:', err.message);
            setError(`Không có dữ liệu giải đặc biệt cho Miền Bắc trong tháng ${month}/${year}.`);
            setStats([]);
            setMetadata({});
        } finally {
            setLoading(false);
        }
    }, []);

    // Hàm gọi API cho Miền Trung
    const fetchSpecialPrizeStatsByWeekMT = useCallback(async (month, year, tinh, signal) => {
        setLoading(true);
        setError(null);
        try {
            if (tinh === 'all') {
                const promises = mienTrungProvinces.map(async (province) => {
                    const provinceTinh = provinceSlugs[province];
                    console.log('Calling apiMT.getSpecialStatsByWeek with month:', month, 'year:', year, 'tinh:', provinceTinh);
                    try {
                        const data = await apiMT.getSpecialStatsByWeek(month, year, provinceTinh, { signal });
                        console.log(`Dữ liệu API Miền Trung (tỉnh: ${province}):`, data);
                        return {
                            stats: (data.statistics || []).map(stat => ({
                                ...stat,
                                tinh: provinceTinh,
                                tenth: province
                            })),
                            metadata: data.metadata || {}
                        };
                    } catch (err) {
                        if (err.name === 'AbortError') {
                            console.log(`Request cho tỉnh ${provinceTinh} bị hủy.`);
                            return { stats: [], metadata: {} };
                        }
                        console.warn(`Không lấy được dữ liệu cho tỉnh ${provinceTinh} (Miền Trung):`, err.message);
                        return { stats: [], metadata: {} };
                    }
                });

                const results = await Promise.all(promises);
                const allStats = results.flatMap(result => result.stats);
                const combinedMetadata = results.reduce((acc, result) => ({
                    startDate: acc.startDate || result.metadata.startDate,
                    endDate: acc.endDate || result.metadata.endDate,
                    totalDraws: (acc.totalDraws || 0) + (result.metadata.totalDraws || 0),
                    month: result.metadata.month || acc.month,
                    year: result.metadata.year || acc.year,
                    totalNumbers: (acc.totalNumbers || 0) + (result.metadata.totalNumbers || 0)
                }), {});

                console.log('Dữ liệu API Miền Trung (sau gộp):', allStats);
                if (signal.aborted) return;
                setStats(allStats);
                setMetadata(combinedMetadata);
                if (!allStats || allStats.length === 0) {
                    console.log(`Không có dữ liệu giải đặc biệt cho Miền Trung trong tháng ${month}/${year}.`);
                    setError(`Không có dữ liệu giải đặc biệt cho Miền Trung trong tháng ${month}/${year}.`);
                }
            } else {
                console.log('Calling apiMT.getSpecialStatsByWeek with month:', month, 'year:', year, 'tinh:', tinh);
                const data = await apiMT.getSpecialStatsByWeek(month, year, tinh, { signal });
                console.log('Dữ liệu API Miền Trung:', data);
                const mappedStats = (data.statistics || []).map(stat => ({
                    ...stat,
                    tinh,
                    tenth: Object.keys(provinceSlugs).find(key => provinceSlugs[key] === tinh)
                }));
                if (signal.aborted) return;
                setStats(mappedStats);
                setMetadata(data.metadata || {});
                if (!mappedStats || mappedStats.length === 0) {
                    console.log(`Không có dữ liệu giải đặc biệt cho Miền Trung (tỉnh: ${tinh}) trong tháng ${month}/${year}.`);
                    setError(`Không có dữ liệu giải đặc biệt cho Miền Trung (tỉnh: ${tinh}) trong tháng ${month}/${year}.`);
                }
            }
        } catch (err) {
            if (err.name === 'AbortError') {
                console.log('Request Miền Trung bị hủy.');
                return;
            }
            console.log('Lỗi khi lấy dữ liệu Miền Trung:', err.message);
            if (signal.aborted) return;
            setError(`Không có dữ liệu giải đặc biệt cho Miền Trung (tỉnh: ${tinh || 'tất cả'}) trong tháng ${month}/${year}.`);
            setStats([]);
            setMetadata({});
        } finally {
            if (!signal.aborted) setLoading(false);
        }
    }, []);

    // Hàm gọi API cho Miền Nam
    const fetchSpecialPrizeStatsByWeekMN = useCallback(async (month, year, tinh, signal) => {
        setLoading(true);
        setError(null);
        try {
            if (tinh === 'all') {
                const promises = mienNamProvinces.map(async (province) => {
                    const provinceTinh = provinceSlugs[province];
                    console.log('Calling apiMN.getSpecialStatsByWeek with month:', month, 'year:', year, 'tinh:', provinceTinh);
                    try {
                        const data = await apiMN.getSpecialStatsByWeek(month, year, provinceTinh, { signal });
                        console.log(`Dữ liệu API Miền Nam (tỉnh: ${province}):`, data);
                        return {
                            stats: (data.statistics || []).map(stat => ({
                                ...stat,
                                tinh: provinceTinh,
                                tenth: province
                            })),
                            metadata: data.metadata || {}
                        };
                    } catch (err) {
                        if (err.name === 'AbortError') {
                            console.log(`Request cho tỉnh ${provinceTinh} bị hủy.`);
                            return { stats: [], metadata: {} };
                        }
                        console.warn(`Không lấy được dữ liệu cho tỉnh ${provinceTinh} (Miền Nam):`, err.message);
                        return { stats: [], metadata: {} };
                    }
                });

                const results = await Promise.all(promises);
                const allStats = results.flatMap(result => result.stats);
                const combinedMetadata = results.reduce((acc, result) => ({
                    startDate: acc.startDate || result.metadata.startDate,
                    endDate: acc.endDate || result.metadata.endDate,
                    totalDraws: (acc.totalDraws || 0) + (result.metadata.totalDraws || 0),
                    month: result.metadata.month || acc.month,
                    year: result.metadata.year || acc.year,
                    totalNumbers: (acc.totalNumbers || 0) + (result.metadata.totalNumbers || 0)
                }), {});

                console.log('Dữ liệu API Miền Nam (sau gộp):', allStats);
                if (signal.aborted) return;
                setStats(allStats);
                setMetadata(combinedMetadata);
                if (!allStats || allStats.length === 0) {
                    console.log(`Không có dữ liệu giải đặc biệt cho Miền Nam trong tháng ${month}/${year}.`);
                    setError(`Không có dữ liệu giải đặc biệt cho Miền Nam trong tháng ${month}/${year}.`);
                }
            } else {
                console.log('Calling apiMN.getSpecialStatsByWeek with month:', month, 'year:', year, 'tinh:', tinh);
                const data = await apiMN.getSpecialStatsByWeek(month, year, tinh, { signal });
                console.log('Dữ liệu API Miền Nam:', data);
                const mappedStats = (data.statistics || []).map(stat => ({
                    ...stat,
                    tinh,
                    tenth: Object.keys(provinceSlugs).find(key => provinceSlugs[key] === tinh)
                }));
                if (signal.aborted) return;
                setStats(mappedStats);
                setMetadata(data.metadata || {});
                if (!mappedStats || mappedStats.length === 0) {
                    console.log(`Không có dữ liệu giải đặc biệt cho Miền Nam (tỉnh: ${tinh}) trong tháng ${month}/${year}.`);
                    setError(`Không có dữ liệu giải đặc biệt cho Miền Nam (tỉnh: ${tinh}) trong tháng ${month}/${year}.`);
                }
            }
        } catch (err) {
            if (err.name === 'AbortError') {
                console.log('Request Miền Nam bị hủy.');
                return;
            }
            console.log('Lỗi khi lấy dữ liệu Miền Nam:', err.message);
            if (signal.aborted) return;
            setError(`Không có dữ liệu giải đặc biệt cho Miền Nam (tỉnh: ${tinh || 'tất cả'}) trong tháng ${month}/${year}.`);
            setStats([]);
            setMetadata({});
        } finally {
            if (!signal.aborted) setLoading(false);
        }
    }, []);

    // Hàm chọn API phù hợp để gọi dựa trên region
    const fetchSpecialPrizeStatsByWeek = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        if (region === 'Miền Bắc') {
            fetchSpecialPrizeStatsByWeekMB(month, year);
        } else if (region === 'Miền Trung') {
            const tinhToUse = tinh || 'all';
            fetchSpecialPrizeStatsByWeekMT(month, year, tinhToUse, signal);
        } else if (region === 'Miền Nam') {
            const tinhToUse = tinh || 'all';
            fetchSpecialPrizeStatsByWeekMN(month, year, tinhToUse, signal);
        }
    }, [region, month, year, tinh, fetchSpecialPrizeStatsByWeekMB, fetchSpecialPrizeStatsByWeekMT, fetchSpecialPrizeStatsByWeekMN]);

    const handleRegionChange = useCallback((e) => {
        const selectedRegion = e.target.value;
        setRegion(selectedRegion);
        if (selectedRegion === 'Miền Bắc') {
            setTinh(null);
        } else {
            setTinh('all');
            console.log('Selected region:', selectedRegion, 'default tinh: all');
        }
    }, []);

    const handleMonthChange = useCallback((e) => {
        const selectedMonth = Number(e.target.value);
        setMonth(selectedMonth);
    }, []);

    const handleYearChange = useCallback((e) => {
        const selectedYear = Number(e.target.value);
        setYear(selectedYear);
    }, []);

    const toggleContent = () => {
        setIsExpanded(!isExpanded);
    };

    useEffect(() => {
        console.log('useEffect triggered with region:', region, 'tinh:', tinh, 'month:', month, 'year:', year);
        fetchSpecialPrizeStatsByWeek();
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [region, tinh, month, year, fetchSpecialPrizeStatsByWeek]);

    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.scrollY || document.documentElement.scrollTop;
            const windowHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrollPercentage = (scrollTop / windowHeight) * 100;
            const scrollToTopBtn = document.getElementById('scrollToTopBtn');

            if (scrollPercentage > 50) {
                scrollToTopBtn.style.display = 'block';
            } else {
                scrollToTopBtn.style.display = 'none';
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Hàm tổ chức dữ liệu theo ngày trong tuần
    const organizeStatsByDayOfWeek = () => {
        const daysOfWeek = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];

        const daysInMonth = new Date(year, month, 0).getDate();
        const allDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

        const dayStats = allDays.map(day => {
            const date = new Date(year, month - 1, day);
            const dayOfWeekIndex = (date.getDay() + 6) % 7; // Điều chỉnh để Thứ 2 = 0
            const dayOfWeek = daysOfWeek[dayOfWeekIndex];
            const displayDate = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
            const compareDate = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;

            const matchingStats = stats.filter(s => {
                if (!s.drawDate) return false;
                let normalizedDate;
                try {
                    normalizedDate = s.drawDate.replace(/\s/g, '').replace(/\/+/g, '/');
                    const [dayApi, monthApi, yearApi] = normalizedDate.split('/');
                    if (!dayApi || !monthApi || !yearApi) throw new Error('Ngày không đầy đủ');
                    normalizedDate = `${dayApi.padStart(2, '0')}/${monthApi.padStart(2, '0')}/${yearApi}`;
                    return normalizedDate === compareDate;
                } catch (e) {
                    console.warn(`Lỗi định dạng ngày cho stat: ${s.drawDate || 'undefined'}`, e.message);
                    return false;
                }
            });

            console.log(`Ngày ${displayDate}:`, matchingStats.length > 0 ? `Có ${matchingStats.length} kết quả` : 'Không có dữ liệu');

            return {
                day,
                date: displayDate,
                dayOfWeek,
                dayOfWeekIndex,
                stats: matchingStats.length > 0 ? matchingStats : null,
            };
        });

        const rows = [];
        let currentRow = Array(7).fill(null);

        dayStats.forEach(dayStat => {
            const { dayOfWeekIndex, stats, date } = dayStat;

            if (dayOfWeekIndex === 0 && currentRow.some(slot => slot !== null)) {
                rows.push(currentRow);
                currentRow = Array(7).fill(null);
            }

            currentRow[dayOfWeekIndex] = { stats, date };
        });

        if (currentRow.some(slot => slot !== null)) {
            rows.push(currentRow);
        }

        console.log('Dữ liệu tuần:', rows);
        return rows;
    };

    const weeks = organizeStatsByDayOfWeek();

    const getTitle = () => {
        const regionText = region === 'Miền Bắc' ? 'MIỀN BẮC' : `${region.toUpperCase()}${tinh && tinh !== 'all' ? ` - ${Object.keys(provinceSlugs).find(key => provinceSlugs[key] === tinh) || ''}` : ''}`;
        return `Thống kê giải đặc biệt theo tuần ${regionText} tháng ${month}/${year}`;
    };

    const pageTitle = getTitle();
    const pageDescription = `Xem thống kê giải đặc biệt theo tuần ${region === 'Miền Bắc' ? 'Miền Bắc' : `${region}${tinh && tinh !== 'all' ? ` - ${Object.keys(provinceSlugs).find(key => provinceSlugs[key] === tinh) || ''}` : ''}`} trong tháng ${month}/${year}.`;

    return (
        <div className="container">
            <Head>
                <title>{pageTitle}</title>
                <meta name="description" content={pageDescription} />
                <meta property="og:title" content={pageTitle} />
                <meta property="og:description" content={pageDescription} />
                <meta property="og:type" content="website" />
                <meta property="og:url" content={`https://yourdomain.com/thongke/giai-dac-biet-theo-tuan`} />
                <meta property="og:image" content="https://yourdomain.com/images/thongke-giaidacbiet-theo-tuan.jpg" />
                <link rel="canonical" href="https://yourdomain.com/thongke/giai-dac-biet-theo-tuan" />
            </Head>

            <div className={styles.container}>
                <div className={styles.titleGroup}>
                    <h1 className={styles.title}>{pageTitle}</h1>
                </div>

                <div className={styles.content}>
                    <div className="metadata">
                        <p className={styles.title}>Thống kê giải đặc biệt từ {metadata.startDate || ''} đến {metadata.endDate || ''}</p>
                    </div>

                    <div className={styles.group_Select}>
                        <label className={styles.options}>Chọn miền: </label>
                        <select className={styles.select} onChange={handleRegionChange} value={region}>
                            <option value="Miền Bắc">Miền Bắc</option>
                            <option value="Miền Trung">Miền Trung</option>
                            <option value="Miền Nam">Miền Nam</option>
                        </select>

                        {(region === 'Miền Trung' || region === 'Miền Nam') && (
                            <>
                                <label className={styles.options}>Chọn tỉnh: </label>
                                <select
                                    className={styles.select}
                                    onChange={(e) => {
                                        const provinceName = e.target.options[e.target.selectedIndex].text;
                                        const newTinh = provinceName === 'Tất cả' ? 'all' : provinceSlugs[provinceName];
                                        setTinh(newTinh);
                                        console.log('Selected province:', provinceName, 'tinh:', newTinh, 'region:', region);
                                    }}
                                    value={tinh || 'all'}
                                >
                                    <option value="all">Tất cả</option>
                                    <optgroup label={region}>
                                        {(region === 'Miền Trung' ? mienTrungProvinces : mienNamProvinces).map(province => (
                                            <option key={provinceSlugs[province]} value={provinceSlugs[province]}>
                                                {province}
                                            </option>
                                        ))}
                                    </optgroup>
                                </select>
                            </>
                        )}

                        <label className={styles.options}>Chọn tháng: </label>
                        <select className={styles.select} value={month} onChange={handleMonthChange}>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                <option key={m} value={m}>{`Tháng ${m}`}</option>
                            ))}
                        </select>

                        <label className={styles.options}>Chọn năm: </label>
                        <select className={styles.select} value={year} onChange={handleYearChange}>
                            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>

                    {loading && <SkeletonTableDaysOfWeek />}

                    {error && <p className={styles.error}>{error}</p>}

                    {!loading && !error && (
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Thứ 2</th>
                                    <th>Thứ 3</th>
                                    <th>Thứ 4</th>
                                    <th>Thứ 5</th>
                                    <th>Thứ 6</th>
                                    <th>Thứ 7</th>
                                    <th>CN</th>
                                </tr>
                            </thead>
                            <tbody>
                                {weeks.length > 0 ? (
                                    weeks.map((week, weekIndex) => (
                                        <tr key={weekIndex}>
                                            {week.map((slot, dayIndex) => (
                                                <td key={dayIndex}>
                                                    {slot && slot.stats ? (
                                                        <div className={styles.entry}>
                                                            {slot.stats.map((stat, statIndex) => (
                                                                <div key={statIndex} className={styles.statItem}>
                                                                    <div className={styles.number}>
                                                                        {stat.number.slice(0, -2)}
                                                                        <span className={styles.lastTwo}>
                                                                            {stat.number.slice(-2)}
                                                                        </span>
                                                                    </div>
                                                                    <div className={styles.date}>{slot.date}</div>
                                                                    {(region === 'Miền Trung' || region === 'Miền Nam') && stat.tinh && (
                                                                        <div className={styles.tinh}>
                                                                            {stat.tenth || Object.keys(provinceSlugs).find(key => provinceSlugs[key] === stat.tinh) || stat.tinh}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : null}
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7} className={styles.noData}>
                                            Không có dữ liệu giải đặc biệt trong khoảng thời gian đã chọn.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className={styles.Group_Content}>
                    <h2 className={styles.heading}>Thống kê giải đặc biệt theo tuần tại Xổ số 3 Miền</h2>
                    <div className={`${styles.contentWrapper} ${isExpanded ? styles.expanded : styles.collapsed}`}>
                        <h3 className={styles.h3}>Thống Kê giải đặc biệt theo ngày trong tuần</h3>
                        <p className={styles.desc}>Chức năng này cho phép người dùng xem thống kê giải đặc biệt theo các ngày trong tuần (Thứ 2, Thứ 3, ..., Chủ Nhật) trong một tháng, đồng thời có thể chọn từng tháng trong năm để xem giải đặc biệt tương ứng.</p>
                        <p className={styles.desc}>Thống kê được hiển thị theo các ngày trong tuần, mỗi ô hiển thị giải đặc biệt đã xuất hiện trong ngày đó của tháng đã chọn, cùng với thông tin về ngày xổ số.</p>
                        <h3 className={styles.h3}>Lợi ích của việc thống kê theo ngày trong tuần</h3>
                        <p className={styles.desc}>Người chơi có thể theo dõi xu hướng của giải đặc biệt theo từng ngày trong tuần, từ đó đưa ra nhận định và lựa chọn số may mắn phù hợp.</p>
                        <p className={styles.desc}>Chức năng này đặc biệt hữu ích cho những ai muốn phân tích chi tiết hơn về giải đặc biệt trong một khoảng thời gian ngắn (theo ngày trong tuần).</p>
                    </div>
                    <button
                        className={styles.toggleBtn}
                        onClick={toggleContent}
                    >
                        {isExpanded ? 'Thu gọn' : 'Xem thêm'}
                    </button>
                </div>
            </div>

            <ThongKe region={region} tinh={tinh} />

            <button
                id="scrollToTopBtn"
                className={styles.scrollToTopBtn}
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                title="Quay lại đầu trang"
            >
                ↑
            </button>
        </div>
    );
};

// Fetch dữ liệu phía server (SSR)
export async function getServerSideProps() {
    try {
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        const data = await apiMB.getSpecialStatsByWeek(month, year);
        console.log('Dữ liệu SSR Miền Bắc:', data);

        return {
            props: {
                initialStats: data.statistics || [],
                initialMetadata: data.metadata || {},
                initialMonth: month,
                initialYear: year,
                initialRegion: 'Miền Bắc',
                initialTinh: null,
            },
        };
    } catch (error) {
        console.error('Error in getServerSideProps:', error.message);
        return {
            props: {
                initialStats: [],
                initialMetadata: { message: 'Không có dữ liệu giải đặc biệt trong khoảng thời gian đã chọn.' },
                initialMonth: new Date().getMonth() + 1,
                initialYear: new Date().getFullYear(),
                initialRegion: 'Miền Bắc',
                initialTinh: null,
            },
        };
    }
}

export default GiaiDacBietTheoTuan;