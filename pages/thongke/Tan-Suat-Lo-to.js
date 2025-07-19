
import React, { useState, useCallback, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { apiMB } from '../api/kqxs/kqxsMB';
import { apiMT } from '../api/kqxs/kqxsMT';
import { apiMN } from '../api/kqxs/kqxsMN';
import styles from '../../styles/tansuatLoto.module.css';
import ThongKe from '../../component/thongKe';
import CongCuHot from '../../component/CongCuHot';
import Link from 'next/link';

// Skeleton Loading Component cho bảng Tần Suất Loto
const SkeletonRow = () => (
    <tr>
        <td className="py-2 px-4"><div className={styles.skeleton}></div></td>
        <td className="py-2 px-4"><div className={styles.skeleton}></div></td>
        <td className="py-2 px-4"><div className={styles.skeleton}></div></td>
    </tr>
);

const SkeletonTable = () => (
    <table className={styles.tableTanSuatLoto}>
        <thead>
            <tr>
                <th>Số</th>
                <th>Lần xuất hiện</th>
                <th>Tỷ lệ</th>
            </tr>
        </thead>
        <tbody>
            {Array(10).fill().map((_, index) => <SkeletonRow key={index} />)}
        </tbody>
    </table>
);

// Ánh xạ tên tỉnh sang slug
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

const TanSuatLoto = ({ initialStats, initialMetadata, initialDays, initialRegion, initialTinh }) => {
    const router = useRouter();
    const [stats, setStats] = useState(initialStats || []);
    const [metadata, setMetadata] = useState(initialMetadata || {});
    const [days, setDays] = useState(initialDays || 30);
    const [region, setRegion] = useState(initialRegion || 'Miền Bắc');
    const [tinh, setTinh] = useState(initialTinh || null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isExpanded, setIsExpanded] = useState(false);

    // Hàm xử lý chuyển đổi trạng thái thu gọn/xem thêm
    const toggleContent = () => {
        setIsExpanded(!isExpanded);
    };

    const fetchTanSuatLotoStats = useCallback(async (days, region, tinh) => {
        setLoading(true);
        setError(null);
        try {
            console.log('Fetching Tần Suất Loto stats with days:', days, 'region:', region, 'tinh:', tinh);

            let data;
            if (region === 'Miền Bắc') {
                data = await apiMB.getTanSuatLotoStats(days);
            } else if (region === 'Miền Trung') {
                data = await apiMT.getTanSuatLotoStats(days, tinh);
            } else if (region === 'Miền Nam') {
                data = await apiMN.getTanSuatLotoStats(days, tinh);
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

    const handleDaysChange = useCallback((e) => {
        const selectedDays = Number(e.target.value);
        setDays(selectedDays);
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

    useEffect(() => {
        fetchTanSuatLotoStats(days, region, tinh);
    }, [days, region, tinh, fetchTanSuatLotoStats]);

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

    const getMessage = () => {
        const regionText = region === 'Miền Bắc' ? 'Miền Bắc' : `${region} - ${Object.keys(provinceSlugs).find(key => provinceSlugs[key] === tinh)} `;
        return (
            <>
                Thống kê Tần Suất Loto trong{' '}
                <span className={styles.totalDraws}>{metadata.totalDraws || 0}</span>{' '}
                lần quay Xổ số{' '}
                <span className={styles.regionText}>{regionText}</span>
            </>
        );
    };

    const getTitle = () => {
        const regionText = region === 'Miền Bắc' ? 'Miền Bắc' : `${region} - ${Object.keys(provinceSlugs).find(key => provinceSlugs[key] === tinh)} `;
        return `Thống kê Tần Suất Loto Xổ Số ${regionText} `;
    };

    const pageTitle = getTitle();
    const pageDescription = `Xem bảng thống kê Tần Suất Loto Xổ số ${region === 'Miền Bắc' ? 'Miền Bắc' : `${region} - ${Object.keys(provinceSlugs).find(key => provinceSlugs[key] === tinh)}`} trong ${metadata.filterType || ''}. Cập nhật dữ liệu từ ${metadata.startDate || ''} đến ${metadata.endDate || ''}.`;

    // Chia dữ liệu thành 2 phần: 00-49 và 50-99
    const leftStats = stats.slice(0, 50); // 00-49
    const rightStats = stats.slice(50);   // 50-99

    // Tính ngưỡng highlight (ví dụ: trung bình + 1 độ lệch chuẩn)
    const counts = stats.map(stat => stat.count);
    const mean = counts.reduce((sum, count) => sum + count, 0) / counts.length;
    const variance = counts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / counts.length;
    const stdDev = Math.sqrt(variance);
    const highlightThreshold = mean + stdDev;

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
                <meta property="og:url" content={`https://yourdomain.com/thongke/tan-suat-loto`} />
                <meta property="og:image" content="https://yourdomain.com/images/thongke-tan-suat-loto.jpg" />
                <link rel="canonical" href="https://yourdomain.com/thongke/tan-suat-loto" />
            </Head >

            <div className={styles.container}>
                <div className={styles.titleGroup}>
                    <h1 className={styles.title}>{pageTitle}</h1>
                    <div className={styles.actionBtn}>
                        <Link className={styles.actionTK} href="/thongke/dau-duoi">
                            Thống Kê Đầu Đuôi
                        </Link>
                        <Link
                            className={`${styles.actionTK} ${router.pathname.startsWith('/thongke/Tan-Suat-Lo-to') ? styles.active : ''}`}
                            href="/thongke/Tan-Suat-Lo-to"
                        >
                            Thống Kê Tần Suất Loto
                        </Link>
                        <Link className={styles.actionTK} href="/thongke/giai-dac-biet">
                            Thống Kê Giải Đặc Biệt
                        </Link>
                    </div>
                </div>
                <div className="groupbanner3">
                    <a href='https://m.dktin.top/reg/104600' tabIndex={-1}>
                        <video
                            className="banner3"
                            src='/banner3.mp4'
                            autoPlay
                            loop
                            muted
                            playsInline
                            alt='xổ số bắc trung nam'
                            suppressHydrationWarning
                        />
                    </a>
                </div>

                <div className={styles.content}>
                    <div>
                        <div className={styles.metadata}>
                            <p>{getMessage()}</p>
                        </div>

                        <div className={styles.group_Select}>
                            <div className={styles.selectGroup}>
                                <label className={styles.options}>Chọn tỉnh:</label>
                                <select className={styles.seclect} onChange={handleTinhChange}
                                    aria-label="Chọn tỉnh hoặc vùng để xem tần suất loto"
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
                                <select className={styles.seclect} value={days} onChange={handleDaysChange}
                                    aria-label="Chọn thời gian để xem tần suất loto">
                                    <option value={30}>30 ngày</option>
                                    <option value={60}>60 ngày</option>
                                    <option value={90}>90 ngày</option>
                                    <option value={120}>120 ngày</option>
                                    <option value={180}>6 tháng</option>
                                    <option value={365}>1 năm</option>
                                </select>
                            </div>

                            <div>
                                <p className={styles.dateTime}><span>Ngày bắt đầu:</span> {metadata.startDate}</p>
                                <p className={styles.dateTime}><span>Ngày kết thúc:</span> {metadata.endDate}</p>
                            </div>
                        </div>

                        {loading && (
                            <div className={styles.tableContainer}>
                                <div className={styles.tableWrapper}>
                                    <div className={styles.tableTitle}>Số 00-49</div>
                                    <SkeletonTable />
                                </div>
                                <div className={styles.tableWrapper}>
                                    <div className={styles.tableTitle}>Số 50-99</div>
                                    <SkeletonTable />
                                </div>
                            </div>
                        )}

                        {error && <p className={styles.error}>{error}</p>}

                        {!loading && !error && stats.length > 0 && (
                            <div className={styles.tableContainer}>
                                <div className={styles.tableWrapper}>
                                    <div className={styles.tableTitle}>Số 00-49</div>
                                    <table className={styles.tableTanSuatLoto}>
                                        <thead>
                                            <tr>
                                                <th>Số</th>
                                                <th>Lần xuất hiện</th>
                                                <th>Tỷ lệ</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {leftStats.map((stat, index) => (
                                                <tr
                                                    key={index}
                                                    className={stat.count >= highlightThreshold ? styles.highlight : ''}
                                                >
                                                    <td>{stat.number}</td>
                                                    <td>{stat.count}</td>
                                                    <td>
                                                        <div className={styles.appearance}>
                                                            <div
                                                                className={styles.progressBar}
                                                                style={{ width: `${parseFloat(stat.percentage)}%` }}
                                                            ></div>
                                                            <span>{stat.percentage}</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className={styles.tableWrapper}>
                                    <div className={styles.tableTitle}>Số 50-99</div>
                                    <table className={styles.tableTanSuatLoto}>
                                        <thead>
                                            <tr>
                                                <th>Số</th>
                                                <th>Lần xuất hiện</th>
                                                <th>Tỷ lệ</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rightStats.map((stat, index) => (
                                                <tr
                                                    key={index}
                                                    className={stat.count >= highlightThreshold ? styles.highlight : ''}
                                                >
                                                    <td>{stat.number}</td>
                                                    <td>{stat.count}</td>
                                                    <td>
                                                        <div className={styles.appearance}>
                                                            <div
                                                                className={styles.progressBar}
                                                                style={{ width: `${parseFloat(stat.percentage)}%` }}
                                                            ></div>
                                                            <span>{stat.percentage}</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {!loading && !error && stats.length === 0 && metadata.message && (
                            <p className={styles.noData}>{metadata.message}</p>
                        )}
                    </div>
                </div>

                <div className={styles.Group_Content}>
                    <h2 className={styles.heading}>Xổ Số 3 Miền - Thống Kê Tần Suất Loto Chính Xác Nhất</h2>
                    <div className={`${styles.contentWrapper} ${isExpanded ? styles.expanded : styles.collapsed}`}>
                        <h3 className={styles.h3}>Thống Kê Tần Suất Loto Là Gì?</h3>
                        <p className={styles.desc}>
                            Thống kê Tần Suất Loto là bảng thống kê số lần xuất hiện của các số loto (từ 00 đến 99) trong kết quả xổ số trong một khoảng thời gian nhất định (30, 60, 90, 120, 180 ngày hoặc 1 năm). Đây là công cụ hữu ích giúp người chơi nhận biết các số xuất hiện nhiều hoặc ít để đưa ra quyết định chơi loto hiệu quả hơn.
                        </p>
                        <h3 className={styles.h3}>Thông Tin Trong Thống Kê Tần Suất Loto:</h3>
                        <p className={styles.desc}>- Tần suất xuất hiện của các số loto (00-99) trong các giải xổ số.</p>
                        <p className={styles.desc}>- Phần trăm xuất hiện của từng số, đi kèm số lần xuất hiện cụ thể.</p>
                        <p className={styles.desc}>- Khoảng thời gian thống kê (30 ngày, 60 ngày,..., 1 năm), cùng với ngày bắt đầu và ngày kết thúc.</p>
                        <h3 className={styles.h3}>Ý Nghĩa Của Thống Kê Tần Suất Loto:</h3>
                        <p className={styles.desc}>- Giúp người chơi nhận biết xu hướng xuất hiện của các số loto, từ đó chọn số may mắn để chơi.</p>
                        <p className={styles.desc}>- Thanh ngang màu cam thể hiện trực quan tỷ lệ xuất hiện, giúp người chơi dễ dàng nhận biết số nào xuất hiện nhiều nhất hoặc ít nhất.</p>
                        <h3 className={styles.h3}>Lợi Ích Của Thống Kê Tần Suất Loto:</h3>
                        <p className={styles.desc}>- Cung cấp dữ liệu chính xác, cập nhật nhanh chóng từ kết quả xổ số.</p>
                        <p className={styles.desc}>- Giúp người chơi có thêm thông tin để tăng cơ hội trúng thưởng.</p>
                        <p className={styles.desc}>
                            Xổ Số 3 Miền cung cấp công cụ thống kê Tần Suất Loto hoàn toàn miễn phí. Chúc bạn may mắn!
                        </p>
                        <p className={styles.desc}>
                            Thống kê Tần Suất Loto. Xem thống kê Tần Suất Loto hôm nay nhanh và chính xác nhất tại <a className={styles.action} href='/'>Xổ Số 3 Miền.</a>
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

            <div>
                <ThongKe />
                <CongCuHot />
                <div className="banner1">
                    <a href='https://m.dktin.top/reg/104600' tabIndex={-1}>
                        <video
                            className="videobanner"
                            src='/banner2.mp4'
                            autoPlay
                            loop
                            muted
                            playsInline
                            alt='xổ số bắc trung nam'
                            suppressHydrationWarning
                        />
                    </a>
                </div>
            </div>
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

export async function getServerSideProps() {
    try {
        const days = 30;
        const region = 'Miền Bắc';
        const tinh = null;

        let data;
        if (region === 'Miền Bắc') {
            data = await apiMB.getTanSuatLotoStats(days);
        } else if (region === 'Miền Trung') {
            data = await apiMT.getTanSuatLotoStats(days, tinh);
        } else if (region === 'Miền Nam') {
            data = await apiMN.getTanSuatLotoStats(days, tinh);
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
};

export default TanSuatLoto;
