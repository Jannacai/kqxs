import React, { useState, useCallback, useEffect, useRef } from 'react';
import Head from 'next/head';
import styles from '../../styles/giaidacbiettuan.module.css';
import ThongKe from '../../component/thongKe';
import CongCuHot from '../../component/CongCuHot';
import { apiMB } from '../api/kqxs/kqxsMB';
import { apiMT } from '../api/kqxs/kqxsMT';
import { apiMN } from '../api/kqxs/kqxsMN';
import Link from 'next/link';
import { useRouter } from 'next/router';
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
    <table className={styles.table} aria-label="Bảng skeleton cho thống kê giải đặc biệt">
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
    const router = useRouter();
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
            const data = await apiMB.getSpecialStatsByWeek(month, year);
            setStats(data.statistics || []);
            setMetadata(data.metadata || {});
            if (!data.statistics || data.statistics.length === 0) {
                setError(`Không có dữ liệu giải đặc biệt cho Miền Bắc trong tháng ${month}/${year}.`);
            }
        } catch (err) {
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
                    try {
                        const data = await apiMT.getSpecialStatsByWeek(month, year, provinceTinh, { signal });
                        return {
                            stats: (data.statistics || []).map(stat => ({
                                ...stat,
                                tinh: provinceTinh,
                                tenth: province
                            })),
                            metadata: data.metadata || {}
                        };
                    } catch (err) {
                        if (err.name === 'AbortError') return { stats: [], metadata: {} };
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

                if (signal.aborted) return;
                setStats(allStats);
                setMetadata(combinedMetadata);
                if (!allStats || allStats.length === 0) {
                    setError(`Không có dữ liệu giải đặc biệt cho Miền Trung trong tháng ${month}/${year}.`);
                }
            } else {
                const data = await apiMT.getSpecialStatsByWeek(month, year, tinh, { signal });
                const mappedStats = (data.statistics || []).map(stat => ({
                    ...stat,
                    tinh,
                    tenth: Object.keys(provinceSlugs).find(key => provinceSlugs[key] === tinh)
                }));
                if (signal.aborted) return;
                setStats(mappedStats);
                setMetadata(data.metadata || {});
                if (!mappedStats || mappedStats.length === 0) {
                    setError(`Không có dữ liệu giải đặc biệt cho Miền Trung (tỉnh: ${tinh}) trong tháng ${month}/${year}.`);
                }
            }
        } catch (err) {
            if (err.name === 'AbortError') return;
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
                    try {
                        const data = await apiMN.getSpecialStatsByWeek(month, year, provinceTinh, { signal });
                        return {
                            stats: (data.statistics || []).map(stat => ({
                                ...stat,
                                tinh: provinceTinh,
                                tenth: province
                            })),
                            metadata: data.metadata || {}
                        };
                    } catch (err) {
                        if (err.name === 'AbortError') return { stats: [], metadata: {} };
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

                if (signal.aborted) return;
                setStats(allStats);
                setMetadata(combinedMetadata);
                if (!allStats || allStats.length === 0) {
                    setError(`Không có dữ liệu giải đặc biệt cho Miền Nam trong tháng ${month}/${year}.`);
                }
            } else {
                const data = await apiMN.getSpecialStatsByWeek(month, year, tinh, { signal });
                const mappedStats = (data.statistics || []).map(stat => ({
                    ...stat,
                    tinh,
                    tenth: Object.keys(provinceSlugs).find(key => provinceSlugs[key] === tinh)
                }));
                if (signal.aborted) return;
                setStats(mappedStats);
                setMetadata(data.metadata || {});
                if (!mappedStats || mappedStats.length === 0) {
                    setError(`Không có dữ liệu giải đặc biệt cho Miền Nam (tỉnh: ${tinh}) trong tháng ${month}/${year}.`);
                }
            }
        } catch (err) {
            if (err.name === 'AbortError') return;
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

    // Hàm tổ chức dữ liệu theo ngày trong tuần (tối ưu hóa)
    const organizeStatsByDayOfWeek = () => {
        const daysOfWeek = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];
        const daysInMonth = new Date(year, month, 0).getDate();
        const rows = [];
        let currentRow = Array(7).fill(null);

        // Cache normalized stats to avoid repeated processing
        const normalizedStats = stats.map(stat => {
            if (!stat.drawDate) return null;
            try {
                const normalizedDate = stat.drawDate.replace(/\s/g, '').replace(/\/+/g, '/');
                const [dayApi, monthApi, yearApi] = normalizedDate.split('/');
                if (!dayApi || !monthApi || !yearApi) return null;
                return {
                    ...stat,
                    normalizedDate: `${dayApi.padStart(2, '0')}/${monthApi.padStart(2, '0')}/${yearApi}`
                };
            } catch {
                return null;
            }
        }).filter(Boolean);

        // Process each day in the month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month - 1, day);
            const dayOfWeekIndex = (date.getDay() + 6) % 7; // Adjust so Monday = 0
            const displayDate = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;

            // Find matching stats for the current date
            const matchingStats = normalizedStats
                .filter(s => s.normalizedDate === displayDate)
                .map(s => ({ ...s, drawDate: displayDate }));

            if (dayOfWeekIndex === 0 && currentRow.some(slot => slot !== null)) {
                rows.push(currentRow);
                currentRow = Array(7).fill(null);
            }

            currentRow[dayOfWeekIndex] = matchingStats.length > 0 ? { stats: matchingStats, date: displayDate } : null;
        }

        if (currentRow.some(slot => slot !== null)) {
            rows.push(currentRow);
        }

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
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <meta name="robots" content="index, follow" />
                <meta property="og:url" content={`https://xsmb.win/thongke/giai-dac-biet-theo-tuan`} />
                <meta property="og:image" content="https://xsmb.win/zalotelegram.png" />
                <link rel="canonical" href="https://xsmb.win/thongke/giai-dac-biet-theo-tuan" />
            </Head>

            <div className={styles.container}>
                <div className={styles.titleGroup}>
                    <h1 className={styles.title}>{pageTitle}</h1>
                    <div className={styles.actionBtn}>
                        <Link className={styles.actionTK} href="giai-dac-biet">Thống Kê Giải Đặc Biệt </Link>
                        <Link className={`${styles.actionTK} ${router.pathname.startsWith('/thongke/dau-duoi') ? styles.active : ''}`} href="dau-duoi">Thống Kê Đầu Đuôi </Link>
                        <Link className={`${styles.actionTK} ${router.pathname.startsWith('/thongke/giai-dac-biet-tuan') ? styles.active : ''}`} href="giai-dac-biet-tuan">Thống Kê Giải Đặc Biệt Tuần </Link>

                    </div>
                </div>

                <div className={styles.content}>
                    <div className="metadata">
                        <p className={styles.title}>Thống kê giải đặc biệt từ {metadata.startDate || ''} đến {metadata.endDate || ''}</p>
                    </div>

                    {/* Bộ lọc: Miền, Tỉnh, Tháng, Năm */}
                    <div className={styles.group_Select}>

                        <div className={styles.selectGroup}>
                            <label className={styles.options}>Chọn miền: </label>
                            <select className={styles.select} onChange={handleRegionChange} value={region}
                                aria-label="Chọn miền để xem thống kê giải đặc biệt tuần"
                                    >
                                <option value="Miền Bắc">Miền Bắc</option>
                                <option value="Miền Trung">Miền Trung</option>
                                <option value="Miền Nam">Miền Nam</option>
                            </select>
                        </div>

                        {(region === 'Miền Trung' || region === 'Miền Nam') && (
                            <>
                                <div className={styles.selectGroup}>
                                    <label className={styles.options}>Chọn tỉnh: </label>
                                    <select
                                        className={styles.select}

                                        onChange={(e) => {
                                            const provinceName = e.target.options[e.target.selectedIndex].text;
                                            const newTinh = provinceName === 'Tất cả' ? 'all' : provinceSlugs[provinceName];
                                            setTinh(newTinh);
                                        }}
                                        value={tinh || 'all'}
                                        aria-label="Chọn tỉnh để xem thống kê giải đặc biệt tuần"

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
                                </div>
                            </>
                        )}

                        <div className={styles.selectGroup}>
                            <label className={styles.options}>Chọn tháng: </label>
                            <select className={styles.select} value={month} onChange={handleMonthChange}
                                aria-label="Chọn tháng để xem thống kê giải đặc biệt tuần"
                                >
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                    <option key={m} value={m}>{`Tháng ${m}`}</option>
                                ))}
                            </select>
                        </div>

                        <div className={styles.selectGroup}>
                            <label className={styles.options}>Chọn năm: </label>
                            <select className={styles.select} value={year} onChange={handleYearChange}
                                aria-label="Chọn năm để xem thống kê giải đặc biệt tuần"
                                >
                                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Bảng kết quả */}
                    {loading && <SkeletonTableDaysOfWeek />}

                    {error && <p className={styles.error}>{error}</p>}

                    {!loading && !error && (
                        <div className={styles.tableContainer}>
                            <table className={styles.table} aria-label="Bảng thống kê giải đặc biệt theo tuần">
                                <caption className={styles.caption}>Thống kê Giải Đặc Biệt Tuần {region} {tinh ? `- ${Object.keys(provinceSlugs).find(key => provinceSlugs[key] === tinh)}` : ''} trong {days} ngày</caption>
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
                        </div>
                    )}
                </div>

                {/* Phần nội dung mô tả */}
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

            <div>
                <ThongKe region={region} tinh={tinh} />
                <CongCuHot />
            </div>
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