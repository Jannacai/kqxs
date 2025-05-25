
import React, { useState, useCallback, useEffect } from 'react';
import Head from 'next/head';
import { apiMB } from '../api/kqxs/kqxsMB';
import { apiMT } from '../api/kqxs/kqxsMT';
import { apiMN } from '../api/kqxs/kqxsMN';
import styles from '../../styles/logan.module.css';
import ThongKe from '../../component/thongKe';

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
    <table className={styles.table}>
        <thead>
            <tr>
                <th>Bộ số</th>
                <th>Ngày ra cuối cùng</th>
                <th>Số ngày gan</th>
                <th>Gan cực đại</th>
            </tr>
        </thead>
        <tbody>
            {Array(5).fill().map((_, index) => <SkeletonRow key={index} />)}
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
    "Đồng Nai", "An Giang", "Tây Ninh", "Bình Thuận", "Vĩnh Long", "Trà Vinh", "Long An", "Bình Phước",
    "Hậu Giang", "Kiên Giang", "Tiền Giang", "Đà Lạt"
];

// Danh sách tỉnh Miền Trung
const mienTrungProvinces = [
    "Huế", "Phú Yên", "Đắk Lắk", "Quảng Nam", "Khánh Hòa", "Đà Nẵng", "Bình Định", "Quảng Trị",
    "Ninh Thuận", "Gia Lai", "Quảng Ngãi", "Đắk Nông", "Kon Tum"
];

const Logan = ({ initialStats, initialMetadata, initialDays, initialRegion, initialTinh }) => {
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

    const handleRegionChange = useCallback((e) => {
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

    const getMessage = () => {
        const regionText = region === 'Miền Bắc' ? 'Miền Bắc' : `${region} - ${Object.keys(provinceSlugs).find(key => provinceSlugs[key] === tinh)} `;
        return `Bảng thống kê Lô Gan Xổ Số ${regionText} ${metadata.filterType} `;
    };

    const getTitle = () => {
        const regionText = region === 'Miền Bắc' ? 'MIỀN BẮC' : `${region.toUpperCase()} - ${Object.keys(provinceSlugs).find(key => provinceSlugs[key] === tinh)} `;
        return `Thống kê lô gan ${regionText} lâu chưa về nhất`;
    };

    const pageTitle = getTitle();
    const pageDescription = `Xem bảng thống kê lô gan ${region === 'Miền Bắc' ? 'Miền Bắc' : `${region} - ${Object.keys(provinceSlugs).find(key => provinceSlugs[key] === tinh)}`} lâu chưa về nhất.Cập nhật dữ liệu từ ${metadata.startDate} đến ${metadata.endDate}.`;

    return (
        <div className="container">
            <Head>
                <title>{pageTitle}</title>
                <meta name="description" content={pageDescription} />
                <meta property="og:title" content={pageTitle} />
                <meta property="og:description" content={pageDescription} />
                <meta property="og:type" content="website" />
                <meta property="og:url" content={`https://yourdomain.com/thongke/logan`} />
                <meta property="og:image" content="https://yourdomain.com/images/thongke-logan.jpg" />
                <link rel="canonical" href="https://yourdomain.com/thongke/logan" />
            </Head >

            <div className={styles.container}>
                <div className={styles.titleGroup}>
                    <h1 className={styles.title}>{pageTitle}</h1>
                </div>

                <div className={styles.content}>
                    <div className="metadata">
                        <p className={styles.title}>{getMessage()}</p>
                    </div>

                    <div className={styles.group_Select}>
                        <label className={styles.options}>Chọn Tỉnh: </label>
                        <select className={styles.select} onChange={handleRegionChange}>
                            <option value="Miền Bắc">Miền Bắc</option>
                            <optgroup label="Miền Nam">
                                {mienNamProvinces.map(province => (
                                    <option key={provinceSlugs[province]} value={provinceSlugs[province]}>
                                        {province}
                                    </option>
                                ))}
                            </optgroup>
                            <optgroup label="Miền Trung">
                                {mienTrungProvinces.map(province => (
                                    <option key={provinceSlugs[province]} value={provinceSlugs[province]}>
                                        {province}
                                    </option>
                                ))}
                            </optgroup>
                        </select>

                        <label className={styles.options}>Chọn thời gian: </label>
                        <select className={styles.select} value={days} onChange={handleDaysChange}>
                            <option value={6}>Dưới 7 ngày</option>
                            <option value={7}>Từ 7 đến 14 ngày</option>
                            <option value={14}>Từ 14 đến 28 ngày</option>
                            <option value={30}>Trong 30 ngày qua</option>
                            <option value={60}>Trong 60 ngày qua</option>
                        </select>

                        <div>
                            <p className={styles.dateTime}><span>Ngày bắt đầu:</span> {metadata.startDate}</p>
                            <p className={styles.dateTime}><span>Ngày kết thúc:</span> {metadata.endDate}</p>
                        </div>
                    </div>

                    {loading && <SkeletonTable />}

                    {error && <p className={styles.error}>{error}</p>}

                    {!loading && !error && stats.length > 0 && (
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Bộ số</th>
                                    <th>Ngày ra cuối cùng</th>
                                    <th>Số ngày gan</th>
                                    <th>Gan cực đại</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.map((stat, index) => (
                                    <tr key={index}>
                                        <td className={styles.number}>{stat.number}</td>
                                        <td className={styles.date}>{stat.lastAppeared}</td>
                                        <td className={styles.gapDraws}>{stat.gapDraws} <span>ngày</span></td>
                                        <td className={styles.maxGap}>{stat.maxGap} <span>ngày</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {!loading && !error && stats.length === 0 && metadata.message && (
                        <p className={styles.noData}>{metadata.message}</p>
                    )}
                </div>

                <div className={styles.Group_Content}>
                    <h2 className={styles.heading}>Xổ Số 3 Miền nơi cập nhật Thống kê lô gan Miền Bắc nhanh chóng, kịp thời và chính xác nhất hàng ngày. Và đặc biệt là hoàn toàn miễn phí</h2>
                    <div className={`${styles.contentWrapper} ${isExpanded ? styles.expanded : styles.collapsed}`}>
                        <h3 className={styles.h3}>Thống kê Lô Gan Miền Bắc là gì?</h3>
                        <p className={styles.desc}>Thống kê lô gan Miền Bắc (hay còn gọi là lô khan Miền Bắc, số rắn) là thống kê những cặp số lô tô (2 số cuối) lâu chưa về trên bảng kết quả Miền Bắc trong một khoảng thời gian, ví dụ như 5 ngày hay 10 ngày. Đây là những con loto gan lỳ không chịu xuất hiện. Số ngày gan (kỳ gan) là số lần mở thưởng mà bộ số đó chưa về tính đến hôm nay.</p>
                        <h3 className={styles.h3}>Thống kê lô khan Miền Bắc gồm có những thông tin sau:</h3>
                        <p className={styles.desc}>Những con lô lâu chưa về (lô lên gan) từ 00-99, số ngày gan và số ngày gan cực đại, kỷ lục lâu chưa về nhất (gan max) là tổng bao nhiêu ngày</p>
                        <p className={styles.desc}>Thống kê cặp lô gan xổ số Miền Bắc (bao gồm 1 số và số lộn của chính nó) lâu chưa về nhất tính đến hôm nay cùng với thời gian gan cực đại của các cặp số đó</p>
                        <p className={styles.desc}>Thống kê giải đặc biệt Miền Bắc lâu chưa về đề gan, thống kê đầu, đuôi ĐB (hàng chục, hàng đơn vị của giải đặc biệt) và số ngày chưa về.</p>
                        <p className={styles.desc}>Người chơi xổ số sẽ dễ dàng nhận biết lô gan XSMB bằng cách xem theo dõi thống kê những con lô ít xuất hiện nhất trong bảng kết quả. Gan Cực Đại: Số lần kỷ lục mà một con số lâu nhất chưa về. Trường hợp lô kép lâu ngày xuất hiện thì được là lô kép gan (hay lô kép khan).</p>
                        <h3 className={styles.h3}>Ý nghĩa các cột bảng lô gan:</h3>
                        <p className={styles.desc}>- Cột số: thống kê các cặp loto đã lên gan, tức là cặp 2 số cuối của các giải có ít nhất 10 ngày liên tiếp chưa xuất hiện trong bảng kết quả đã về 24h qua.</p>
                        <p className={styles.desc}>- Ngày ra gần nhất: thời điểm về của các cặp lô gan, tức là ngày cuối cùng mà lô đó xuất hiện trước khi lì không về trong kết quả xổ số Miền Bắc tới nay.</p>
                        <p className={styles.desc}>- Số ngày gan: số ngày mà con số lô tô đó chưa ra.</p>
                        <p className={styles.desc}>Tại đây, trang cung cấp cho người xem thông tin của 5 bảng liên quan:</p>
                        <p className={styles.desc}>- Các bộ số và cặp số lô gan KQXSMB nhất hiện nay và nó đã gan bao nhiêu ngày.</p>
                        <p className={styles.desc}>- Soi cầu lô gan bạch thủ giải đặc biệt Miền Bắc lâu chưa về nhất là các số nào.</p>
                        <p className={styles.desc}>- Đầu đuôi giải đặc biệt lâu chưa ra về trong thời gian gần đây.</p>
                        <h3 className={styles.h3}>Phương pháp đánh theo lô gan hiệu quả:</h3>
                        <p className={styles.desc}>- Những cặp số xuôi và số lộn của chính nó hay đi cùng nhau lâu chưa về và thời gian gan cực đại của cặp đó.</p>
                        <p className={styles.desc}>- Thống kê giải đặc biệt lâu chưa xuất hiện.</p>
                        <p className={styles.desc}>- Thống kê ngày ra theo đầu – số hàng chục hoặc đuôi – hàng đơn vị của 2 số cuối giải đặc biệt.</p>
                        <p className={styles.desc}>- Tổng gan cực đại.</p>
                        <p className={styles.desc}>Sử dụng công cụ thống kê chuẩn xác từ các kết quả cũ, Xổ Số VN cung cấp cho bạn thống kê lô gan Miền Bắc chuẩn xác nhất. Với tính năng này, người chơi sẽ có thêm thông tin tham khảo để chọn cho mình con số may mắn, mang đến cơ hội trúng thưởng cao hơn. Chúc các bạn may mắn!</p>
                        <p className={styles.desc}>Thống kê lô gan. Tk lô. Thống kê lô gan Miền Bắc. Lô gan Miền Bắc. Lô Gan. Xem thống kê lô gan hôm nay nhanh và chính xác nhất tại <a className={styles.action} href='/'>Xổ Số 3 Miền.</a></p>
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
        </div >
    );
};

// Fetch dữ liệu phía server (SSR)
export async function getServerSideProps() {
    try {
        const days = 6;
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
                initialDays: 6,
                initialRegion: 'Miền Bắc',
                initialTinh: null,
            },
        };
    }
}

export default Logan;
