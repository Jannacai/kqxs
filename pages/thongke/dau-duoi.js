import React, { useState, useCallback, useEffect } from 'react';
import Head from 'next/head';
import { apiMB } from '../api/kqxs/kqxsMB';
import { apiMT } from '../api/kqxs/kqxsMT';
import { apiMN } from '../api/kqxs/kqxsMN';
import styles from '../../styles/dauduoi.module.css';
import ThongKe from '../../component/thongKe';
import Link from 'next/link';
import { useRouter } from 'next/router';

// Skeleton Loading Component cho bảng Đầu/Đuôi
const SkeletonRow = () => (
    <tr>
        <td className="py-2 px-4"><div className={styles.skeleton}></div></td>
        <td className="py-2 px-4"><div className={styles.skeleton}></div></td>
        <td className="py-2 px-4"><div className={styles.skeleton}></div></td>
    </tr>
);

const SkeletonTable = () => (
    <table className={styles.tableDauDuoi}>
        <thead>
            <tr>
                <th>Số</th>
                <th>Đầu</th>
                <th>Đuôi</th>
            </tr>
        </thead>
        <tbody>
            {Array(5).fill().map((_, index) => <SkeletonRow key={index} />)}
        </tbody>
    </table>
);

// Skeleton cho bảng Đặc Biệt
const SkeletonSpecialTable = () => (
    <table className={styles.tableSpecialDauDuoi}>
        <thead>
            <tr>
                <th>Số</th>
                <th>Đầu Đặc Biệt</th>
                <th>Đuôi Đặc Biệt</th>
            </tr>
        </thead>
        <tbody>
            {Array(5).fill().map((_, index) => <SkeletonRow key={index} />)}
        </tbody>
    </table>
);

// Skeleton Loading Component cho bảng Đầu/Đuôi theo ngày
const SkeletonRowByDate = () => (
    <tr>
        {Array(11).fill().map((_, index) => (
            <td key={index} className="py-2 px-4"><div className={styles.skeleton}></div></td>
        ))}
    </tr>
);

const SkeletonTableByDate = (props) => (
    <table className={styles.tableDauDuoiByDate}>
        <thead>
            <tr>
                <th>Ngày</th>
                {Array(10).fill().map((_, index) => (
                    <th key={index}>{props.type === 'dau' ? `Đầu ${index} ` : `Đuôi ${index} `}</th>
                ))}
            </tr>
        </thead>
        <tbody>
            {Array(5).fill().map((_, index) => <SkeletonRowByDate key={index} />)}
        </tbody>
    </table>
);

// Ánh xạ tên tỉnh sang slug (không dấu)
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
    "Bình Dương": "binh-duong",
    "Trà Vinh": "tra-vinh",
    "Long An": "long-an",
    "Bình Phước": "binh-phuoc",
    "Hậu Giang": "hau-giang",
    "Kiên Giang": "kien-giang",
    "Tiền Giang": "tien-giang",
    "Đà Lạt": "da-lat",
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

// Danh sách tỉnh Miền Nam
const mienNamProvinces = [
    "Vũng Tàu", "Cần Thơ", "Đồng Tháp", "TP.Hồ Chí Minh", "Cà Mau", "Bến Tre", "Bạc Liêu", "Sóc Trăng",
    "Đồng Nai", "An Giang", "Tây Ninh", "Bình Thuận", "Vĩnh Long", "Bình Dương", "Trà Vinh", "Long An", "Bình Phước",
    "Hậu Giang", "Kiên Giang", "Tiền Giang", "Đà Lạt"
];

// Danh sách tỉnh Miền Trung
const mienTrungProvinces = [
    "Huế", "Phú Yên", "Đắk Lắk", "Quảng Nam", "Khánh Hòa", "Đà Nẵng", "Bình Định", "Quảng Trị",
    "Ninh Thuận", "Gia Lai", "Quảng Ngãi", "Đắk Nông", "Kon Tum"
];

const DauDuoi = ({ initialDauStats, initialDuoiStats, initialSpecialDauDuoiStats, initialMetadata, initialDays, initialRegion, initialTinh }) => {
    // State cho bảng 1 (Đầu/Đuôi của tất cả các giải)
    const router = useRouter();
    const [dauStats, setDauStats] = useState(initialDauStats || []);
    const [duoiStats, setDuoiStats] = useState(initialDuoiStats || []);
    const [metadata, setMetadata] = useState(initialMetadata || {});
    const [days, setDays] = useState(initialDays || 30);
    const [region, setRegion] = useState(initialRegion || 'Miền Bắc');
    const [tinh, setTinh] = useState(initialTinh || null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // State cho bảng 2 (Đầu/Đuôi giải Đặc Biệt)
    const [specialDauDuoiStats, setSpecialDauDuoiStats] = useState(initialSpecialDauDuoiStats || []);
    const [specialDays, setSpecialDays] = useState(initialDays || 30);
    const [specialRegion, setSpecialRegion] = useState(initialRegion || 'Miền Bắc');
    const [specialTinh, setSpecialTinh] = useState(initialTinh || null);
    const [specialMetadata, setSpecialMetadata] = useState(initialMetadata || {});
    const [specialLoading, setSpecialLoading] = useState(false);
    const [specialError, setSpecialError] = useState(null);

    // State cho bảng Đầu Loto theo ngày (bảng 3)
    const [dauStatsByDate, setDauStatsByDate] = useState({});
    const [dauByDateDays, setDauByDateDays] = useState(initialDays || 30);
    const [dauByDateRegion, setDauByDateRegion] = useState(initialRegion || 'Miền Bắc');
    const [dauByDateTinh, setDauByDateTinh] = useState(initialTinh || null);
    const [dauByDateMetadata, setDauByDateMetadata] = useState(initialMetadata || {});
    const [dauByDateLoading, setDauByDateLoading] = useState(false);
    const [dauByDateError, setDauByDateError] = useState(null);

    // State cho bảng Đuôi Loto theo ngày (bảng 4)
    const [duoiStatsByDate, setDuoiStatsByDate] = useState({});
    const [duoiByDateDays, setDuoiByDateDays] = useState(initialDays || 30);
    const [duoiByDateRegion, setDuoiByDateRegion] = useState(initialRegion || 'Miền Bắc');
    const [duoiByDateTinh, setDuoiByDateTinh] = useState(initialTinh || null);
    const [duoiByDateMetadata, setDuoiByDateMetadata] = useState(initialMetadata || {});
    const [duoiByDateLoading, setDuoiByDateLoading] = useState(false);
    const [duoiByDateError, setDuoiByDateError] = useState(null);

    // State cho chức năng thu gọn/xem thêm
    const [isExpanded, setIsExpanded] = useState(false);

    // Hàm xử lý chuyển đổi trạng thái thu gọn/xem thêm
    const toggleContent = () => {
        setIsExpanded(!isExpanded);
    };

    // Kết hợp Đầu/Đuôi của bảng 1 thành một mảng để hiển thị trên cùng hàng
    const combinedDauDuoiStats = dauStats.map((dauStat, index) => ({
        number: index,
        dauCount: dauStat.count,
        dauPercentage: dauStat.percentage,
        duoiCount: duoiStats[index].count,
        duoiPercentage: duoiStats[index].percentage,
    }));

    const fetchDauDuoiStats = useCallback(async (days, region, tinh) => {
        setLoading(true);
        setError(null);
        try {
            console.log('Fetching Đầu Đuôi stats with days:', days, 'region:', region, 'tinh:', tinh);
            let data;
            if (region === 'Miền Bắc') {
                data = await apiMB.getDauDuoiStats(days);
            } else if (region === 'Miền Trung') {
                data = await apiMT.getDauDuoiStats(days, tinh);
            } else if (region === 'Miền Nam') {
                data = await apiMN.getDauDuoiStats(days, tinh);
            }
            setDauStats(data.dauStatistics);
            setDuoiStats(data.duoiStatistics);
            setMetadata(data.metadata);
        } catch (err) {
            const errorMessage = err.message || 'Có lỗi xảy ra khi lấy dữ liệu.';
            setError(errorMessage);
            setDauStats([]);
            setDuoiStats([]);
            setMetadata({});
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchSpecialDauDuoiStats = useCallback(async (specialDays, specialRegion, specialTinh) => {
        setSpecialLoading(true);
        setSpecialError(null);
        try {
            console.log('Fetching Special Đầu Đuôi stats:', { specialDays, specialRegion, specialTinh });
            let specialData;
            if (specialRegion === 'Miền Bắc') {
                specialData = await apiMB.getDauDuoiStats(specialDays);
            } else if (specialRegion === 'Miền Trung') {
                specialData = await apiMT.getDauDuoiStats(specialDays, specialTinh);
            } else if (specialRegion === 'Miền Nam') {
                specialData = await apiMN.getDauDuoiStats(specialDays, specialTinh);
            }
            console.log('Fetched special data:', specialData);
            setSpecialDauDuoiStats(specialData.specialDauDuoiStats || []);
            setSpecialMetadata(specialData.metadata || {});
        } catch (err) {
            const errorMessage = err.message || 'Có lỗi xảy ra khi lấy dữ liệu.';
            console.error('Fetch special error:', errorMessage);
            setSpecialError(errorMessage);
            setSpecialDauDuoiStats([]);
            setSpecialMetadata({});
        } finally {
            setSpecialLoading(false);
        }
    }, []);

    const fetchDauStatsByDate = useCallback(async (dauByDateDays, dauByDateRegion, dauByDateTinh) => {
        setDauByDateLoading(true);
        setDauByDateError(null);
        try {
            console.log('Fetching Đầu stats by date with dauByDateDays:', dauByDateDays, 'dauByDateRegion:', dauByDateRegion, 'dauByDateTinh:', dauByDateTinh);
            let data;
            if (dauByDateRegion === 'Miền Bắc') {
                data = await apiMB.getDauDuoiStatsByDate(dauByDateDays);
            } else if (dauByDateRegion === 'Miền Trung') {
                data = await apiMT.getDauDuoiStatsByDate(dauByDateDays, dauByDateTinh);
            } else if (dauByDateRegion === 'Miền Nam') {
                data = await apiMN.getDauDuoiStatsByDate(dauByDateDays, dauByDateTinh);
            }
            setDauStatsByDate(data.dauStatsByDate);
            setDauByDateMetadata(data.metadata);
        } catch (err) {
            const errorMessage = err.message || 'Có lỗi xảy ra khi lấy dữ liệu.';
            setDauByDateError(errorMessage);
            setDauStatsByDate({});
            setDauByDateMetadata({});
        } finally {
            setDauByDateLoading(false);
        }
    }, []);

    const fetchDuoiStatsByDate = useCallback(async (duoiByDateDays, duoiByDateRegion, duoiByDateTinh) => {
        setDuoiByDateLoading(true);
        setDuoiByDateError(null);
        try {
            console.log('Fetching Đuôi stats by date with duoiByDateDays:', duoiByDateDays, 'duoiByDateRegion:', duoiByDateRegion, 'duoiByDateTinh:', duoiByDateTinh);
            let data;
            if (duoiByDateRegion === 'Miền Bắc') {
                data = await apiMB.getDauDuoiStatsByDate(duoiByDateDays);
            } else if (duoiByDateRegion === 'Miền Trung') {
                data = await apiMT.getDauDuoiStatsByDate(duoiByDateDays, duoiByDateTinh);
            } else if (duoiByDateRegion === 'Miền Nam') {
                data = await apiMN.getDauDuoiStatsByDate(duoiByDateDays, duoiByDateTinh);
            }
            setDuoiStatsByDate(data.duoiStatsByDate);
            setDuoiByDateMetadata(data.metadata);
        } catch (err) {
            const errorMessage = err.message || 'Có lỗi xảy ra khi lấy dữ liệu.';
            setDuoiByDateError(errorMessage);
            setDuoiStatsByDate({});
            setDuoiByDateMetadata({});
        } finally {
            setDuoiByDateLoading(false);
        }
    }, []);

    const handleDaysChange = useCallback((e) => {
        const selectedDays = Number(e.target.value);
        setDays(selectedDays);
    }, []);

    const handleSpecialDaysChange = useCallback((e) => {
        const selectedSpecialDays = Number(e.target.value);
        console.log('Selected special days:', selectedSpecialDays);
        setSpecialDays(selectedSpecialDays);
    }, []);

    const handleDauByDateDaysChange = useCallback((e) => {
        const selectedDauByDateDays = Number(e.target.value);
        setDauByDateDays(selectedDauByDateDays);
    }, []);

    const handleDuoiByDateDaysChange = useCallback((e) => {
        const selectedDuoiByDateDays = Number(e.target.value);
        setDuoiByDateDays(selectedDuoiByDateDays);
    }, []);

    const handleTinhChange = useCallback((e) => {
        const selectedValue = e.target.value;
        console.log('Selected value:', selectedValue);
        if (selectedValue === 'Miền Bắc') {
            setRegion('Miền Bắc');
            setTinh(null);
            fetchDauDuoiStats(days, 'Miền Bắc', null);
        } else {
            const provinceName = e.target.options[e.target.selectedIndex].text;
            const selectedRegion = e.target.options[e.target.selectedIndex].parentElement.label;
            setRegion(selectedRegion);
            setTinh(provinceSlugs[provinceName]);
            fetchDauDuoiStats(days, selectedRegion, provinceSlugs[provinceName]);
        }
    }, [days, fetchDauDuoiStats]);

    const handleSpecialTinhChange = useCallback((e) => {
        const selectedValue = e.target.value;
        console.log('Selected special value:', selectedValue);
        if (selectedValue === 'Miền Bắc') {
            setSpecialRegion('Miền Bắc');
            setSpecialTinh(null);
            fetchSpecialDauDuoiStats(specialDays, 'Miền Bắc', null);
        } else {
            const provinceName = e.target.options[e.target.selectedIndex].text;
            const selectedRegion = e.target.options[e.target.selectedIndex].parentElement.label;
            setSpecialRegion(selectedRegion);
            setSpecialTinh(provinceSlugs[provinceName]);
            fetchSpecialDauDuoiStats(specialDays, selectedRegion, provinceSlugs[provinceName]);
        }
    }, [specialDays, fetchSpecialDauDuoiStats]);

    const handleDauByDateTinhChange = useCallback((e) => {
        const selectedValue = e.target.value;
        if (selectedValue === 'Miền Bắc') {
            setDauByDateRegion('Miền Bắc');
            setDauByDateTinh(null);
            fetchDauStatsByDate(dauByDateDays, 'Miền Bắc', null);
        } else {
            const provinceName = e.target.options[e.target.selectedIndex].text;
            const selectedRegion = e.target.options[e.target.selectedIndex].parentElement.label;
            setDauByDateRegion(selectedRegion);
            setDauByDateTinh(provinceSlugs[provinceName]);
            fetchDauStatsByDate(dauByDateDays, selectedRegion, provinceSlugs[provinceName]);
        }
    }, [dauByDateDays, fetchDauStatsByDate]);

    const handleDuoiByDateTinhChange = useCallback((e) => {
        const selectedValue = e.target.value;
        if (selectedValue === 'Miền Bắc') {
            setDuoiByDateRegion('Miền Bắc');
            setDuoiByDateTinh(null);
            fetchDuoiStatsByDate(duoiByDateDays, 'Miền Bắc', null);
        } else {
            const provinceName = e.target.options[e.target.selectedIndex].text;
            const selectedRegion = e.target.options[e.target.selectedIndex].parentElement.label;
            setDuoiByDateRegion(selectedRegion);
            setDuoiByDateTinh(provinceSlugs[provinceName]);
            fetchDuoiStatsByDate(duoiByDateDays, selectedRegion, provinceSlugs[provinceName]);
        }
    }, [duoiByDateDays, fetchDuoiStatsByDate]);

    useEffect(() => {
        fetchDauDuoiStats(days, region, tinh);
    }, [days, region, tinh, fetchDauDuoiStats]);

    useEffect(() => {
        fetchSpecialDauDuoiStats(specialDays, specialRegion, specialTinh);
    }, [specialDays, specialRegion, specialTinh, fetchSpecialDauDuoiStats]);

    useEffect(() => {
        fetchDauStatsByDate(dauByDateDays, dauByDateRegion, dauByDateTinh);
    }, [dauByDateDays, dauByDateRegion, dauByDateTinh, fetchDauStatsByDate]);

    useEffect(() => {
        fetchDuoiStatsByDate(duoiByDateDays, duoiByDateRegion, duoiByDateTinh);
    }, [duoiByDateDays, duoiByDateRegion, duoiByDateTinh, fetchDuoiStatsByDate]);

    // Logic hiển thị nút "Quay lại đầu trang"
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

    // Thêm trạng thái active cho select
    useEffect(() => {
        const selects = document.querySelectorAll(`.${styles.seclect}`);
        selects.forEach(select => {
            select.addEventListener('change', () => {
                selects.forEach(s => s.classList.remove('active'));
                select.classList.add('active');
            });
            if (
                select.value === (tinh || 'Miền Bắc') ||
                select.value === (specialTinh || 'Miền Bắc') ||
                select.value === (dauByDateTinh || 'Miền Bắc') ||
                select.value === (duoiByDateTinh || 'Miền Bắc')
            ) {
                select.classList.add('active');
            }
        });
        return () => {
            selects.forEach(select => {
                select.removeEventListener('change', () => { });
            });
        };
    }, [tinh, specialTinh, dauByDateTinh, duoiByDateTinh]);

    const getMessage = () => {
        const provinceName = region === 'Miền Bắc' ? 'Miền Bắc' : Object.keys(provinceSlugs).find(key => provinceSlugs[key] === tinh);
        const regionText = region === 'Miền Bắc' ? (
            <span className={styles.highlightProvince}>Miền Bắc</span>
        ) : (
            <>
                {region} - <span className={styles.highlightProvince}>{provinceName}</span>
            </>
        );
        return (
            <>
                Thống kê Đầu / Đuôi Loto trong{' '}<br></br>
                <span className={styles.highlightDraws}>{metadata.totalDraws || 0} lần quay</span>{' '}
                Xổ số {regionText}
            </>
        );
    };

    const getSpecialMessage = () => {
        const provinceName = specialRegion === 'Miền Bắc' ? 'Miền Bắc' : Object.keys(provinceSlugs).find(key => provinceSlugs[key] === specialTinh);
        const regionText = specialRegion === 'Miền Bắc' ? (
            <span className={styles.highlightProvince}>Miền Bắc</span>
        ) : (
            <>
                {specialRegion} - <span className={styles.highlightProvince}>{provinceName}</span>
            </>
        );
        return (
            <>
                Thống kê Đầu / Đuôi Giải Đặc Biệt trong{' '}<br></br>
                <span className={styles.highlightDraws}>{specialMetadata.totalDraws || 0} lần quay</span>{' '}
                Xổ số {regionText}
            </>
        );
    };

    const getDauByDateMessage = () => {
        const provinceName = dauByDateRegion === 'Miền Bắc' ? 'Miền Bắc' : Object.keys(provinceSlugs).find(key => provinceSlugs[key] === dauByDateTinh);
        const regionText = dauByDateRegion === 'Miền Bắc' ? (
            <span className={styles.highlightProvince}>Miền Bắc</span>
        ) : (
            <>
                {dauByDateRegion} - <span className={styles.highlightProvince}>{provinceName}</span>
            </>
        );
        return (
            <>
                Thống kê Đầu Loto theo ngày - Xổ số<br></br>
                {regionText}
            </>
        );
    };

    const getDuoiByDateMessage = () => {
        const provinceName = duoiByDateRegion === 'Miền Bắc' ? 'Miền Bắc' : Object.keys(provinceSlugs).find(key => provinceSlugs[key] === duoiByDateTinh);
        const regionText = duoiByDateRegion === 'Miền Bắc' ? (
            <span className={styles.highlightProvince}>Miền Bắc</span>
        ) : (
            <>
                {duoiByDateRegion} - <span className={styles.highlightProvince}>{provinceName}</span>
            </>
        );
        return (
            <>
                Thống kê Đuôi Loto theo ngày - Xổ số <br></br>
                {regionText}
            </>
        );
    };

    const getTitle = () => {
        const provinceName = region === 'Miền Bắc' ? 'Miền Bắc' : Object.keys(provinceSlugs).find(key => provinceSlugs[key] === tinh);
        const regionText = region === 'Miền Bắc' ? (
            <span className={styles.highlightProvince}>Miền Bắc</span>
        ) : (
            <>
                {region} - <span className={styles.highlightProvince}>{provinceName}</span>
            </>
        );
        return (
            <>
                Thống kê Đầu Đuôi Loto Xổ Số {regionText}
            </>
        );
    };

    const pageTitle = getTitle();
    const pageDescription = `Xem bảng thống kê Đầu Đuôi loto Xổ số ${region === 'Miền Bắc' ? 'Miền Bắc' : `${region} - ${Object.keys(provinceSlugs).find(key => provinceSlugs[key] === tinh)}`} trong ${metadata.filterType || ''}. Cập nhật dữ liệu từ ${metadata.startDate || ''} đến ${metadata.endDate || ''}.`;

    // Tính tổng cho Đầu
    const dauTotalsByDate = Array(10).fill(0);
    const dauStatsByDateArray = Object.entries(dauStatsByDate).map(([date, stats]) => {
        const row = { date, stats: Array(10).fill(0) };
        stats.forEach((count, index) => {
            row.stats[index] = count;
            dauTotalsByDate[index] += count;
        });
        return row;
    });

    // Tính tổng cho Đuôi
    const duoiTotalsByDate = Array(10).fill(0);
    const duoiStatsByDateArray = Object.entries(duoiStatsByDate).map(([date, stats]) => {
        const row = { date, stats: Array(10).fill(0) };
        stats.forEach((count, index) => {
            row.stats[index] = count;
            duoiTotalsByDate[index] += count;
        });
        return row;
    });

    return (
        <div className="container">
            <Head>
                <title>{pageTitle}</title>
                <meta name="description" content={pageDescription} />
                <meta property="og:title" content={pageTitle} />
                <meta property="og:description" content={pageDescription} />
                <meta property="og:type" content="website" />
                <meta property="og:url" content={`https://xsmb.win/thongke/dau-duoi`} />
                <meta property="og:image" content="https://xsmb.win/zalotelegram.png" />
                <link rel="canonical" href="https://xsmb.win/thongke/dau-duoi" />
            </Head>

            <div className={styles.container}>
                <div className={styles.titleGroup}>
                    <h1 className={styles.title}>{pageTitle}</h1>
                    <div className={styles.actionBtn}>
                        <Link className={`${styles.actionTK} ${router.pathname.startsWith('/thongke/dau-duoi') ? styles.active : ''}`} href="dau-duoi">Thống Kê Đầu Đuôi </Link>
                        <Link className={styles.actionTK} href="giai-dac-biet">Thống Kê Giải Đặc Biệt </Link>
                        <Link className={styles.actionTK} href="giai-dac-biet-tuan">Thống Kê Giải Đặc Biệt Tuần </Link>
                    </div>
                </div>

                <div className={styles.content}>
                    {/* Bảng 1: Thống kê Đầu/Đuôi Loto (tất cả các giải) */}
                    <div>
                        <div className="metadata">
                            <h2 className={styles.title}>{getMessage()}</h2>
                        </div>

                        <div className={styles.group_Select}>
                            <div className={styles.selectGroup}>
                                <label className={styles.options}>Chọn tỉnh:</label>
                                <select
                                    className={styles.seclect}
                                    onChange={handleTinhChange}
                                    value={tinh ? tinh : "Miền Bắc"}
                                >
                                    <option value="Miền Bắc">Miền Bắc</option>
                                    <optgroup label="Miền Nam">
                                        {mienNamProvinces.map(prov => (
                                            <option key={provinceSlugs[prov]} value={provinceSlugs[prov]}>
                                                {prov}
                                            </option>
                                        ))}
                                    </optgroup>
                                    <optgroup label="Miền Trung">
                                        {mienTrungProvinces.map(prov => (
                                            <option key={provinceSlugs[prov]} value={provinceSlugs[prov]}>
                                                {prov}
                                            </option>
                                        ))}
                                    </optgroup>
                                </select>
                            </div>

                            <div className={styles.selectGroup}>
                                <label className={styles.options}>Chọn thời gian:</label>
                                <select
                                    className={styles.seclect}
                                    value={days}
                                    onChange={handleDaysChange}
                                >
                                    <option value={30}>30 ngày</option>
                                    <option value={60}>60 ngày</option>
                                    <option value={90}>90 ngày</option>
                                    <option value={120}>120 ngày</option>
                                    <option value={180}>6 tháng</option>
                                    <option value={365}>1 năm</option>
                                </select>
                            </div>

                            <div>
                                <p className={styles.dateTime}>
                                    <span>Ngày bắt đầu:</span> {metadata.startDate || 'N/A'}
                                </p>
                                <p className={styles.dateTime}>
                                    <span>Ngày kết thúc:</span> {metadata.endDate || 'N/A'}
                                </p>
                            </div>
                        </div>

                        {loading && <SkeletonTable />}
                        {error && <p className={styles.error}>{error}</p>}
                        {!loading && !error && combinedDauDuoiStats.length > 0 && (
                            <div>
                                <table className={styles.tableDauDuoi}>
                                    <thead>
                                        <tr>
                                            <th>Số</th>
                                            <th>Đầu Loto</th>
                                            <th>Đuôi Loto</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {combinedDauDuoiStats.map((stat, index) => (
                                            <tr key={index}>
                                                <td>{stat.number}</td>
                                                <td>
                                                    <div className={styles.appearance}>
                                                        <div
                                                            className={styles.progressBar}
                                                            style={{ width: `${parseFloat(stat.dauPercentage)}%` }}
                                                        ></div>
                                                        <span>{stat.dauPercentage} ({stat.dauCount})</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className={styles.appearance}>
                                                        <div
                                                            className={styles.progressBar}
                                                            style={{ width: `${parseFloat(stat.duoiPercentage)}%` }}
                                                        ></div>
                                                        <span>{stat.duoiPercentage} ({stat.duoiCount})</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {!loading && !error && combinedDauDuoiStats.length === 0 && metadata.message && (
                            <p className={styles.noData}>{metadata.message}</p>
                        )}
                    </div>
                </div>

                <div className={styles.content}>
                    {/* Bảng 2: Thống kê Đầu/Đuôi giải Đặc Biệt */}
                    {specialLoading && <SkeletonSpecialTable />}
                    {specialError && <p className={styles.error}>{specialError}</p>}
                    {!specialLoading && !specialError && specialDauDuoiStats.length > 0 && (
                        <div className="mt-8">
                            <div className="metadata">
                                <h2 className={`${styles.title} ${styles.title2}`}>{getSpecialMessage()}</h2>
                            </div>

                            <div className={styles.group_Select}>
                                <div className={styles.selectGroup}>
                                    <label className={styles.options}>Chọn tỉnh:</label>
                                    <select
                                        className={styles.seclect}
                                        onChange={handleSpecialTinhChange}
                                        value={specialTinh ? specialTinh : "Miền Bắc"}
                                    >
                                        <option value="Miền Bắc">Miền Bắc</option>
                                        <optgroup label="Miền Nam">
                                            {mienNamProvinces.map(prov => (
                                                <option key={provinceSlugs[prov]} value={provinceSlugs[prov]}>
                                                    {prov}
                                                </option>
                                            ))}
                                        </optgroup>
                                        <optgroup label="Miền Trung">
                                            {mienTrungProvinces.map(prov => (
                                                <option key={provinceSlugs[prov]} value={provinceSlugs[prov]}>
                                                    {prov}
                                                </option>
                                            ))}
                                        </optgroup>
                                    </select>
                                </div>

                                <div className={styles.selectGroup}>
                                    <label className={styles.options}>Chọn thời gian:</label>
                                    <select
                                        className={styles.seclect}
                                        value={specialDays}
                                        onChange={handleSpecialDaysChange}
                                    >
                                        <option value={30}>30 ngày</option>
                                        <option value={60}>60 ngày</option>
                                        <option value={90}>90 ngày</option>
                                        <option value={120}>120 ngày</option>
                                        <option value={180}>6 tháng</option>
                                        <option value={365}>1 năm</option>
                                    </select>
                                </div>

                                <div>
                                    <p className={styles.dateTime}>
                                        <span>Ngày bắt đầu:</span> {specialMetadata.startDate || 'N/A'}
                                    </p>
                                    <p className={styles.dateTime}>
                                        <span>Ngày kết thúc:</span> {specialMetadata.endDate || 'N/A'}
                                    </p>
                                </div>
                            </div>

                            <table className={styles.tableSpecialDauDuoi}>
                                <thead>
                                    <tr>
                                        <th>Số</th>
                                        <th>Đầu Đặc Biệt</th>
                                        <th>Đuôi Đặc Biệt</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {specialDauDuoiStats.map((stat, index) => (
                                        <tr key={index}>
                                            <td>{stat.number}</td>
                                            <td>
                                                <div className={styles.appearance}>
                                                    <div
                                                        className={styles.progressBar}
                                                        style={{ width: `${parseFloat(stat.dauPercentage) || 0}%` }}
                                                    ></div>
                                                    <span>{stat.dauPercentage || '0'} ({stat.dauCount || 0})</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className={styles.appearance}>
                                                    <div
                                                        className={styles.progressBar}
                                                        style={{ width: `${parseFloat(stat.duoiPercentage) || 0}%` }}
                                                    ></div>
                                                    <span>{stat.duoiPercentage || '0'} ({stat.duoiCount || 0})</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {!specialLoading && !specialError && specialDauDuoiStats.length === 0 && specialMetadata.message && (
                        <p className={styles.noData}>{specialMetadata.message}</p>
                    )}
                </div>

                <div className={styles.content}>
                    {/* Bảng 3: Thống kê Đầu Loto theo ngày */}
                    <div>
                        <div className="metadata">
                            <h2 className={styles.title}>{getDauByDateMessage()}</h2>
                        </div>

                        <div className={styles.group_Select}>
                            <div className={styles.selectGroup}>
                                <label className={styles.options}>Chọn tỉnh:</label>
                                <select
                                    className={styles.seclect}
                                    onChange={handleDauByDateTinhChange}
                                    value={dauByDateTinh ? dauByDateTinh : "Miền Bắc"}
                                >
                                    <option value="Miền Bắc">Miền Bắc</option>
                                    <optgroup label="Miền Nam">
                                        {mienNamProvinces.map(prov => (
                                            <option key={provinceSlugs[prov]} value={provinceSlugs[prov]}>
                                                {prov}
                                            </option>
                                        ))}
                                    </optgroup>
                                    <optgroup label="Miền Trung">
                                        {mienTrungProvinces.map(prov => (
                                            <option key={provinceSlugs[prov]} value={provinceSlugs[prov]}>
                                                {prov}
                                            </option>
                                        ))}
                                    </optgroup>
                                </select>
                            </div>

                            <div className={styles.selectGroup}>
                                <label className={styles.options}>Chọn thời gian:</label>
                                <select
                                    className={styles.seclect}
                                    value={dauByDateDays}
                                    onChange={handleDauByDateDaysChange}
                                >
                                    <option value={30}>30 ngày</option>
                                    <option value={60}>60 ngày</option>
                                    <option value={90}>90 ngày</option>
                                    <option value={120}>120 ngày</option>
                                    <option value={180}>6 tháng</option>
                                    <option value={365}>1 năm</option>
                                </select>
                            </div>

                            <div>
                                <p className={styles.dateTime}>
                                    <span>Ngày bắt đầu:</span> {dauByDateMetadata.startDate || 'N/A'}
                                </p>
                                <p className={styles.dateTime}>
                                    <span>Ngày kết thúc:</span> {dauByDateMetadata.endDate || 'N/A'}
                                </p>
                            </div>
                        </div>

                        {/* <h2 className={styles.h3}>Thống kê Đầu Loto Theo Ngày</h2> */}
                        {dauByDateLoading && <SkeletonTableByDate type="dau" />}
                        {dauByDateError && <p className={styles.error}>{dauByDateError}</p>}
                        {!dauByDateLoading && !dauByDateError && dauStatsByDateArray.length > 0 && (
                            <div>
                                <table className={styles.tableDauDuoiByDate}>
                                    <thead>
                                        <tr>
                                            <th>Ngày</th>
                                            {Array(10).fill().map((_, index) => (
                                                <th key={index}>Đầu {index}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dauStatsByDateArray.map((row, rowIndex) => (
                                            <tr key={row.date}>
                                                <td>{row.date}</td>
                                                {row.stats.map((count, colIndex) => (
                                                    <td
                                                        key={colIndex}
                                                        className={count >= 4 ? styles.highlight : ''}
                                                    >
                                                        {count} lần
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                        <tr className={styles.totalRow}>
                                            <td>Tổng</td>
                                            {dauTotalsByDate.map((total, index) => (
                                                <td
                                                    key={index}
                                                    className={total >= 4 ? styles.highlight : ''}
                                                >
                                                    {total}
                                                </td>
                                            ))}
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {!dauByDateLoading && !dauByDateError && dauStatsByDateArray.length === 0 && dauByDateMetadata.message && (
                            <p className={styles.noData}>{dauByDateMetadata.message}</p>
                        )}
                    </div>
                </div>

                <div className={styles.content}>
                    {/* Bảng 4: Thống kê Đuôi Loto theo ngày */}
                    <div>
                        <div className="metadata">
                            <h2 className={styles.title}>{getDuoiByDateMessage()}</h2>
                        </div>

                        <div className={styles.group_Select}>
                            <div className={styles.selectGroup}>
                                <label className={styles.options}>Chọn tỉnh:</label>
                                <select
                                    className={styles.seclect}
                                    onChange={handleDuoiByDateTinhChange}
                                    value={duoiByDateTinh ? duoiByDateTinh : "Miền Bắc"}
                                >
                                    <option value="Miền Bắc">Miền Bắc</option>
                                    <optgroup label="Miền Nam">
                                        {mienNamProvinces.map(prov => (
                                            <option key={provinceSlugs[prov]} value={provinceSlugs[prov]}>
                                                {prov}
                                            </option>
                                        ))}
                                    </optgroup>
                                    <optgroup label="Miền Trung">
                                        {mienTrungProvinces.map(prov => (
                                            <option key={provinceSlugs[prov]} value={provinceSlugs[prov]}>
                                                {prov}
                                            </option>
                                        ))}
                                    </optgroup>
                                </select>
                            </div>

                            <div className={styles.selectGroup}>
                                <label className={styles.options}>Chọn thời gian:</label>
                                <select
                                    className={styles.seclect}
                                    value={duoiByDateDays}
                                    onChange={handleDuoiByDateDaysChange}
                                >
                                    <option value={30}>30 ngày</option>
                                    <option value={60}>60 ngày</option>
                                    <option value={90}>90 ngày</option>
                                    <option value={120}>120 ngày</option>
                                    <option value={180}>6 tháng</option>
                                    <option value={365}>1 năm</option>
                                </select>
                            </div>

                            <div>
                                <p className={styles.dateTime}>
                                    <span>Ngày bắt đầu:</span> {duoiByDateMetadata.startDate || 'N/A'}
                                </p>
                                <p className={styles.dateTime}>
                                    <span>Ngày kết thúc:</span> {duoiByDateMetadata.endDate || 'N/A'}
                                </p>
                            </div>
                        </div>

                        {/* <h2 className={styles.h3}>Thống kê Đuôi Loto Theo Ngày</h2> */}
                        {duoiByDateLoading && <SkeletonTableByDate type="duoi" />}
                        {duoiByDateError && <p className={styles.error}>{duoiByDateError}</p>}
                        {!duoiByDateLoading && !duoiByDateError && duoiStatsByDateArray.length > 0 && (
                            <div>
                                <table className={styles.tableDauDuoiByDate}>
                                    <thead>
                                        <tr>
                                            <th>Ngày</th>
                                            {Array(10).fill().map((_, index) => (
                                                <th key={index}>Đuôi {index}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {duoiStatsByDateArray.map((row, rowIndex) => (
                                            <tr key={row.date}>
                                                <td>{row.date}</td>
                                                {row.stats.map((count, colIndex) => (
                                                    <td
                                                        key={colIndex}
                                                        className={count >= 4 ? styles.highlight : ''}
                                                    >
                                                        {count} lần
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                        <tr className={styles.totalRow}>
                                            <td>Tổng</td>
                                            {duoiTotalsByDate.map((total, index) => (
                                                <td
                                                    key={index}
                                                    className={total >= 4 ? styles.highlight : ''}
                                                >
                                                    {total}
                                                </td>
                                            ))}
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {!duoiByDateLoading && !duoiByDateError && duoiStatsByDateArray.length === 0 && duoiByDateMetadata.message && (
                            <p className={styles.noData}>{duoiByDateMetadata.message}</p>
                        )}
                    </div>
                </div>

                <div className={styles.Group_Content}>
                    <h2 className={styles.heading}>XSMN.WIN - Thống Kê Đầu Đuôi Loto Chính Xác Nhất</h2>
                    <div className={`${styles.contentWrapper} ${isExpanded ? styles.expanded : styles.collapsed}`}>
                        <h3 className={styles.h3}>Thống Kê Đầu Đuôi Loto Là Gì?</h3>
                        <p className={styles.desc}>
                            Thống kê Đầu Đuôi loto là bảng thống kê tần suất xuất hiện của các chữ số đầu (Đầu) và chữ số cuối (Đuôi) trong 2 số cuối của các giải xổ số trong một khoảng thời gian nhất định (30 hoặc 60 ngày). Đây là công cụ hữu ích giúp người chơi nhận biết các chữ số nào đang xuất hiện nhiều hoặc ít để đưa ra quyết định chơi loto hiệu quả hơn.
                        </p>
                        <h3 className={styles.h3}>Thông Tin Trong Thống Kê Đầu Đuôi:</h3>
                        <p className={styles.desc}>- Tần suất xuất hiện của Đầu số (0-9) và Đuôi số (0-9) trong 2 số cuối của các giải.</p>
                        <p className={styles.desc}>- Phần trăm xuất hiện của từng Đầu/Đuôi, đi kèm số lần xuất hiện cụ thể.</p>
                        <p className={styles.desc}>- Khoảng thời gian thống kê (30 ngày hoặc 60 ngày hoặc 90,...1 năm), cùng với ngày bắt đầu và ngày kết thúc.</p>
                        <h3 className={styles.h3}>Ý Nghĩa Của Các Bảng Đầu Đuôi:</h3>
                        <p className={styles.desc}>- **Đầu số**: Thống kê tần suất của chữ số đầu tiên trong 2 số cuối của các giải, ví dụ Đầu 0, Đầu 1,..., Đầu 9.</p>
                        <p className={styles.desc}>- **Đuôi số**: Thống kê tần suất của chữ số cuối cùng trong 2 số cuối của các giải, ví dụ Đuôi 0, Đuôi 1,..., Đuôi 9.</p>
                        <p className={styles.desc}>- Thanh ngang màu xanh thể hiện trực quan phần trăm xuất hiện, giúp người chơi dễ dàng nhận biết chữ số nào xuất hiện nhiều nhất hoặc ít nhất.</p>
                        <h3 className={styles.h3}>Lợi Ích Của Thống Kê Đầu Đuôi:</h3>
                        <p className={styles.desc}>- Giúp người chơi nhận biết xu hướng xuất hiện của các chữ số, từ đó chọn số may mắn để chơi loto.</p>
                        <p className={styles.desc}>- Cung cấp dữ liệu chính xác, cập nhật nhanh chóng từ kết quả xổ số.</p>
                        <p className={styles.desc}>
                            XSMB.WIN cung cấp công cụ thống kê Đầu Đuôi loto hoàn toàn miễn phí, giúp người chơi có thêm thông tin để tăng cơ hội trúng thưởng. Chúc bạn may mắn!
                        </p>
                        <p className={styles.desc}>
                            Thống kê Đầu Đuôi loto. Xem thống kê Đầu Đuôi hôm nay nhanh và chính xác nhất tại <a className={styles.action} href='/'>XSMB.WIN.</a>
                        </p>
                    </div>
                    <button
                        className={styles.toggleBtn}
                        onClick={toggleContent}
                    >
                        {isExpanded ? 'Thu gọn' : 'Xem thêm'}
                    </button>
                </div>
            </div>

            <ThongKe />

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

export async function getServerSideProps() {
    try {
        const days = 30;
        const region = 'Miền Bắc';
        const tinh = null;

        let data;
        if (region === 'Miền Bắc') {
            data = await apiMB.getDauDuoiStats(days);
        } else if (region === 'Miền Trung') {
            data = await apiMT.getDauDuoiStats(days, tinh);
        } else if (region === 'Miền Nam') {
            data = await apiMN.getDauDuoiStats(days, tinh);
        }

        return {
            props: {
                initialDauStats: data.dauStatistics || [],
                initialDuoiStats: data.duoiStatistics || [],
                initialSpecialDauDuoiStats: data.specialDauDuoiStats || [],
                initialMetadata: data.metadata || {},
                initialDays: days,
                initialRegion: region,
                initialTinh: tinh,
            },
        };
    } catch (error) {
        console.error('Error in getServerSideProps:', error.message);
        return {
            props: {
                initialDauStats: [],
                initialDuoiStats: [],
                initialSpecialDauDuoiStats: [],
                initialMetadata: {},
                initialDays: 30,
                initialRegion: 'Miền Bắc',
                initialTinh: null,
            },
        };
    }
}

export default DauDuoi;