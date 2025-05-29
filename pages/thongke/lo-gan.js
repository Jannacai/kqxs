import React, { useState, useCallback, useEffect } from 'react';
import Head from 'next/head';
import { apiMB } from '../api/kqxs/kqxsMB';
import { apiMT } from '../api/kqxs/kqxsMT';
import { apiMN } from '../api/kqxs/kqxsMN';
import styles from '../../styles/logan.module.css';
import ThongKe from '../../component/thongKe';
import Link from 'next/link';
import { useRouter } from 'next/router';

// Skeleton Loading Component
const SkeletonRow = () => (
    <tr>
        <td className={styles.number}><div className={styles.skeleton}></div></td>
        <td className={styles.date}><div className={styles.skeleton}></div></td>
        <td className={styles.gapDraws}><div className={styles.skeleton}></div></td>
        <td className={styles.maxGap}><div className={styles.skeleton}></div></td>
    </tr>
);

const SkeletonTable = () => (
    <table className={styles.tableLoGan}>
        <thead>
            <tr>
                <th>Bộ số</th>
                <th>Ngày ra cuối</th>
                <th>Ngày gan</th>
                <th>Gan max</th>
            </tr>
        </thead>
        <tbody>
            {Array(5).fill().map((_, index) => <SkeletonRow key={index} />)}
        </tbody>
    </table>
);

// Province to slug mapping
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

// Southern provinces
const mienNamProvinces = [
    "Vũng Tàu", "Cần Thơ", "Đồng Tháp", "TP.Hồ Chí Minh", "Cà Mau", "Bến Tre", "Bạc Liêu", "Sóc Trăng",
    "Đồng Nai", "An Giang", "Tây Ninh", "Bình Thuận", "Vĩnh Long", "Bình Dương", "Trà Vinh", "Long An", "Bình Phước",
    "Hậu Giang", "Kiên Giang", "Tiền Giang", "Đà Lạt"
];

// Central provinces
const mienTrungProvinces = [
    "Huế", "Phú Yên", "Đắk Lắk", "Quảng Nam", "Khánh Hòa", "Đà Nẵng", "Bình Định", "Quảng Trị",
    "Ninh Thuận", "Gia Lai", "Quảng Ngãi", "Đắk Nông", "Kon Tum"
];

const Logan = ({ initialStats, initialMetadata, initialDays, initialRegion, initialTinh }) => {
    const router = useRouter();
    const [stats, setStats] = useState(initialStats || []);
    const [metadata, setMetadata] = useState(initialMetadata || {});
    const [days, setDays] = useState(initialDays || 6);
    const [region, setRegion] = useState(initialRegion || 'Miền Bắc');
    const [tinh, setTinh] = useState(initialTinh || null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isExpanded, setIsExpanded] = useState(false);

    const fetchLoGanStats = useCallback(async (days, region, tinh) => {
        setLoading(true);
        setError(null);
        try {
            console.log('Fetching stats with days:', days, 'region:', region, 'tinh:', tinh);
            let data;
            if (region === 'Miền Bắc') {
                data = await apiMB.getLoGanStats(days);
            } else if (region === 'Miền Trung') {
                data = await apiMT.getLoGanStats(days, tinh);
            } else if (region === 'Miền Nam') {
                data = await apiMN.getLoGanStats(days, tinh);
            }
            setStats(data.statistics);
            setMetadata(data.metadata);
        } catch (err) {
            const errorMessage = err.message || 'Có lỗi xảy ra khi lấy dữ liệu.';
            setError(errorMessage);
            setStats([]);
            setMetadata({});
        } finally {
            setLoading(false);
        }
    }, []);

    const handleTinhChange = useCallback((e) => {
        const selectedValue = e.target.value;
        if (selectedValue === 'Miền Bắc') {
            setRegion('Miền Bắc');
            setTinh(null);
        } else {
            const provinceName = e.target.options[e.target.selectedIndex].text;
            const selectedRegion = e.target.options[e.target.selectedIndex].parentElement.label;
            setRegion(selectedRegion);
            setTinh(provinceSlugs[provinceName]);
        }
    }, []);

    const handleDaysChange = useCallback((e) => {
        const selectedDays = Number(e.target.value);
        setDays(selectedDays);
    }, []);

    const toggleContent = () => {
        setIsExpanded(!isExpanded);
    };

    useEffect(() => {
        fetchLoGanStats(days, region, tinh);
    }, [days, region, tinh, fetchLoGanStats]);

    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.scrollY || document.documentElement.scrollTop;
            const windowHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrollPercentage = (scrollTop / windowHeight) * 100;
            const scrollBtn = document.getElementById('scrollToTopBtn');
            if (scrollPercentage > 50) {
                scrollBtn.style.display = 'block';
            } else {
                scrollBtn.style.display = 'none';
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const select = document.querySelector(`.${styles.selectBox}`);
        if (select) {
            select.addEventListener('change', () => {
                select.classList.add('active');
            });
            if (select.value === (tinh || 'Miền Bắc')) {
                select.classList.add('active');
            }
            return () => select.removeEventListener('change', () => { });
        }
    }, [tinh]);

    const getTitle = () => {
        const provinceName = region === 'Miền Bắc' ? 'Miền Bắc' : Object.keys(provinceSlugs).find(key => provinceSlugs[key] === tinh) || '';
        const regionText = region === 'Miền Bắc' ? (
            <span className={styles.highlightProvince}>Miền Bắc</span>
        ) : (
            <>{region} - <span className={styles.highlightProvince}>{provinceName}</span></>
        );
        const daysText = days === 6 ? 'Dưới 7 ngày' :
            days === 7 ? 'Từ 7 đến 14 ngày' :
                days === 14 ? 'Từ 14 đến 28 ngày' :
                    days === 30 ? 'Trong 30 ngày' : 'Trong 60 ngày';
        return (
            <>
                Thống kê Lô Gan Xổ Số
                {regionText}<br></br>
                <span className={styles.highlightDraws}>{daysText}</span>
            </>
        );
    };

    const getMessage = () => {
        const provinceName = region === 'Miền Bắc' ? 'Miền Bắc' : Object.keys(provinceSlugs).find(key => provinceSlugs[key] === tinh) || '';
        const regionText = region === 'Miền Bắc' ? (
            <span className={styles.highlightProvince}>Miền Bắc</span>
        ) : (
            <>{region} - <span className={styles.highlightProvince}>{provinceName}</span></>
        );
        const daysText = days === 6 ? 'Dưới 7 ngày' :
            days === 7 ? 'Từ 7 đến 14 ngày' :
                days === 14 ? 'Từ 14 đến 28 ngày' :
                    days === 30 ? 'Trong 30 ngày' : 'Trong 60 ngày';
        return (
            <>
                Thống kê Lô Gan trong<br></br>
                <span className={styles.highlightDraws}>{daysText}</span> Xổ số {regionText}
            </>
        );
    };

    const pageTitle = region === 'Miền Bắc'
        ? `Thống kê Lô Gan Miền Bắc lâu chưa về nhất`
        : `Thống kê Lô Gan ${region} - ${Object.keys(provinceSlugs).find(key => provinceSlugs[key] === tinh) || ''} lâu chưa về nhất`;
    const pageDescription = `Xem bảng thống kê Lô Gan ${region === 'Miền Bắc' ? 'Miền Bắc' : `${region} - ${Object.keys(provinceSlugs).find(key => provinceSlugs[key] === tinh) || ''}`} lâu chưa về nhất. Cập nhật dữ liệu từ ${metadata.startDate || 'N/A'} đến ${metadata.endDate || 'N/A'}.`;

    return (
        <div className="container">
            <Head>
                <title>{pageTitle}</title>
                <meta name="description" content={pageDescription} />
                <meta property="og:title" content={pageTitle} />
                <meta property="og:description" content={pageDescription} />
                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://xsmb.win/thongke/logan" />
                <meta property="og:image" content="https://xsmb.win/zalotelegram.png" />
                <link rel="canonical" href="https://xsmb.win/thongke/logan" />
            </Head>

            <div className={styles.container}>
                <div className={styles.titleGroup}>
                    <h1 className={styles.title}>{getTitle()}</h1>
                    <div className={styles.actionBtn}>

                        <Link className={styles.actionTK} href="/thongke/dau-duoi">
                            Thống Kê Đầu Đuôi
                        </Link>
                        <Link
                            className={`${styles.actionTK} ${router.pathname.startsWith('/thongke/lo-gan') ? styles.active : ''}`}
                            href="/thongke/lo-gan"
                        >
                            Thống Kê Lô Gan
                        </Link>
                        <Link className={styles.actionTK} href="/thongke/giai-dac-biet">
                            Thống Kê Giải Đặc Biệt
                        </Link>
                    </div>
                </div>

                <div className={styles.content}>
                    <div className="metadata">
                        <h2 className={styles.title}>{getMessage()}</h2>
                    </div>

                    <div className={styles.groupSelect}>
                        <div className={styles.selectGroup}>
                            <label className={styles.options}>Chọn tỉnh:</label>
                            <select
                                className={styles.selectBox}
                                onChange={handleTinhChange}
                                value={tinh || 'Miền Bắc'}
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
                                className={styles.selectBox}
                                value={days}
                                onChange={handleDaysChange}
                            >
                                <option value={6}>6 ngày</option>
                                <option value={7}>7 đến 14 ngày</option>
                                <option value={14}>14 đến 28 ngày</option>
                                <option value={30}>30 ngày</option>
                                <option value={60}>60 ngày</option>
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
                    {!loading && !error && stats.length > 0 && (
                        <table className={styles.tableLoGan}>
                            <thead>
                                <tr>
                                    <th>Bộ số</th>
                                    <th>Ngày ra cuối</th>
                                    <th>Ngày gan</th>
                                    <th>Gan max</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.map((stat, index) => (
                                    <tr key={index}>
                                        <td className={`${styles.number} ${styles.highlight}`}>
                                            {stat.number}
                                        </td>
                                        <td className={styles.date}>{stat.lastAppeared}</td>
                                        <td className={`${styles.gapDraws} ${stat.gapDraws > 10 ? styles.highlight : ''}`}>
                                            {stat.gapDraws} <span>ngày</span>
                                        </td>
                                        <td className={`${styles.maxGap} ${stat.maxGap > 20 ? styles.highlight : ''}`}>
                                            {stat.maxGap} <span>ngày</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                    {!loading && !error && stats.length === 0 && metadata.message && (
                        <p className={styles.noData}>{metadata.message}</p>
                    )}
                </div>

                <div className={styles.groupContent}>
                    <h2 className={styles.heading}>XSMN.WIN - Thống Kê Lô Gan Chính Xác Nhất</h2>
                    <div className={`${styles.contentWrapper} ${isExpanded ? styles.expanded : styles.collapsed}`}>
                        <h3 className={styles.h3}>Thống kê Lô Gan Miền Bắc là gì?</h3>
                        <p className={styles.desc}>
                            Thống kê lô gan Miền Bắc (hay còn gọi là lô khan Miền Bắc, số rắn) là thống kê những cặp số lô tô (2 số cuối) lâu chưa về trên bảng kết quả Miền Bắc trong một khoảng thời gian, ví dụ như 5 ngày hoặc hơn. Đây là những con loto gan lì không chịu xuất hiện. Số ngày gan (kỳ gan) là số lần mở thưởng mà bộ số đó chưa về tính đến hôm nay.
                        </p>
                        <h3 className={styles.h3}>Thống kê lô khan Miền Bắc gồm có những gì?</h3>
                        <p className={styles.desc}>
                            Những con lô lâu chưa về (lô lên gan) từ 00-99, số ngày gan và số ngày gan cực đại, kỷ lục lâu chưa về nhất (gan max) là tổng bao nhiêu ngày.
                        </p>
                        <p className={styles.desc}>
                            Thống kê cặp lô gan xổ số Miền Bắc (bao gồm 1 số và số lộn của chính nó) lâu chưa về nhất tính đến hôm nay cùng với thời gian gan cực đại của các cặp số đó.
                        </p>
                        <p className={styles.desc}>
                            Người chơi xổ số sẽ dễ dàng nhận biết lô gan XSMB bằng cách xem thống kê những con lô ít xuất hiện nhất trong bảng kết quả. Gan Cực Đại: Số lần kỷ lục mà một con số lâu nhất chưa về.
                        </p>
                        <h3 className={styles.h3}>Ý nghĩa các cột trong bảng lô gan</h3>
                        <p className={styles.desc}>
                            Cột số: thống kê các cặp loto đã lên gan, tức là cặp 2 số cuối của các giải có ít nhất 10 ngày liên tiếp chưa xuất hiện trong bảng kết quả đã về trong 24h qua.
                        </p>
                        <p className={styles.desc}>
                            Ngày gần nhất: thời điểm về của các cặp lô gan, tức là ngày cuối cùng mà lô đó xuất hiện trước khi lì ra trong kết quả xổ số Miền Bắc tới nay.
                        </p>
                        <p className={styles.desc}>
                            Số ngày gan: số ngày mà con số lô tô đó chưa ra.
                        </p>
                        <p className={styles.desc}>
                            Sử dụng công cụ thống kê chuẩn xác từ các kết quả cũ, XSMN.WIN cung cấp cho bạn thống kê lô gan Miền Bắc chuẩn xác nhất. Với tính năng này, người chơi sẽ có thêm thông tin tham khảo để chọn cho mình con số may mắn, mang đến cơ hội trúng thưởng cao hơn. Chúc bạn may mắn!
                        </p>
                        <p className={styles.desc}>
                            Thống kê lô gan. Xem thống kê lô gan hôm nay nhanh và chính xác nhất tại <a className={styles.action} href="/">XSMN.WIN</a>.
                        </p>
                    </div>
                    <button
                        className={styles.toggleBtn}
                        onClick={toggleContent}
                    >
                        {isExpanded ? 'Thu gọn' : 'Xem thêm'}
                    </button>
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
            <ThongKe />

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
            data = await apiMB.getLoGanStats(days);
        } else if (region === 'Miền Trung') {
            data = await apiMT.getLoGanStats(days, tinh);
        } else if (region === 'Miền Nam') {
            data = await apiMN.getLoGanStats(days, tinh);
        }

        return {
            props: {
                initialStats: data.statistics || [],
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
                initialStats: [],
                initialMetadata: {},
                initialDays: 30,
                initialRegion: 'Miền Bắc',
                initialTinh: null,
            },
        };
    }
}

export default Logan;