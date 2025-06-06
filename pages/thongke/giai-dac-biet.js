import React, { useState, useCallback, useEffect } from 'react';
import Head from 'next/head';
import styles from '../../styles/giaidacbiet.module.css';
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
    "Hậu Giang", "Kiên Giang", "Tiền Giang", "Đà Lạt"
];

const mienTrungProvinces = [
    "Huế", "Phú Yên", "Đắk Lắk", "Quảng Nam", "Khánh Hòa", "Đà Nẵng", "Bình Định", "Quảng Trị",
    "Ninh Thuận", "Gia Lai", "Quảng Ngãi", "Đắk Nông", "Kon Tum"
];

// Skeleton Loading Component cho bảng 1 cột
const SkeletonRowSingleColumn = () => (
    <tr>
        <td className={styles.number}><div className={styles.skeleton}></div></td>
        <td className={styles.date}><div className={styles.skeleton}></div></td>
        <td className={styles.tinh}><div className={styles.skeleton}></div></td>
    </tr>
);

// Skeleton Loading Component cho bảng 3 cột
const SkeletonRowThreeColumns = () => (
    <tr>
        <td><div className={styles.skeleton}></div></td>
        <td><div className={styles.skeleton}></div></td>
        <td><div className={styles.skeleton}></div></td>
    </tr>
);

const SkeletonTableSingleColumn = () => (
    <table className={styles.table}>
        <thead>
            <tr>
                <th>Giải Đặc Biệt</th>
                <th>Ngày</th>
                <th>Tỉnh</th>
            </tr>
        </thead>
        <tbody>
            {Array(5).fill().map((_, index) => <SkeletonRowSingleColumn key={index} />)}
        </tbody>
    </table>
);

const SkeletonTableThreeColumns = () => (
    <table className={styles.table}>
        <thead>
            <tr>
                <th>Giải Đặc Biệt</th>
                <th>Giải Đặc Biệt</th>
                <th>Giải Đặc Biệt</th>
            </tr>
        </thead>
        <tbody>
            {Array(5).fill().map((_, index) => <SkeletonRowThreeColumns key={index} />)}
        </tbody>
    </table>
);

const GiaiDacBiet = ({ initialStats, initialMetadata, initialDays, initialRegion, initialTinh }) => {
    const [stats, setStats] = useState(initialStats || []);
    const router = useRouter();

    const [metadata, setMetadata] = useState(initialMetadata || {});
    const [days, setDays] = useState(initialDays || 10);
    const [region, setRegion] = useState(initialRegion || 'Miền Bắc');
    const [tinh, setTinh] = useState(initialTinh || (initialRegion === 'Miền Trung' ? 'hue' : initialRegion === 'Miền Nam' ? 'vung-tau' : null));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isExpanded, setIsExpanded] = useState(false);

    // Hàm gọi API cho Miền Bắc
    const fetchSpecialPrizeStatsMB = useCallback(async (days) => {
        setLoading(true);
        setError(null);
        try {
            const data = await apiMB.getSpecialStats(days);
            setStats(data.statistics || []);
            setMetadata(data.metadata || {});
        } catch (err) {
            setError(err.message || 'Có lỗi xảy ra khi lấy dữ liệu Miền Bắc.');
            setStats([]);
            setMetadata({});
        } finally {
            setLoading(false);
        }
    }, []);

    // Hàm gọi API cho Miền Trung
    const fetchSpecialPrizeStatsMT = useCallback(async (days, tinh) => {
        setLoading(true);
        setError(null);
        try {
            console.log('Calling apiMT.getSpecialStats with days:', days, 'tinh:', tinh);
            const data = await apiMT.getSpecialStats(days, tinh);
            setStats(data.statistics || []);
            setMetadata(data.metadata || {});
        } catch (err) {
            setError(err.message || 'Có lỗi xảy ra khi lấy dữ liệu Miền Trung.');
            setStats([]);
            setMetadata({});
        } finally {
            setLoading(false);
        }
    }, []);

    // Hàm gọi API cho Miền Nam
    const fetchSpecialPrizeStatsMN = useCallback(async (days, tinh) => {
        setLoading(true);
        setError(null);
        try {
            console.log('Calling apiMN.getSpecialStats with days:', days, 'tinh:', tinh);
            const data = await apiMN.getSpecialStats(days, tinh);
            setStats(data.statistics || []);
            setMetadata(data.metadata || {});
        } catch (err) {
            setError(err.message || 'Có lỗi xảy ra khi lấy dữ liệu Miền Nam.');
            setStats([]);
            setMetadata({});
        } finally {
            setLoading(false);
        }
    }, []);

    // Hàm chọn API phù hợp để gọi dựa trên region
    const fetchSpecialPrizeStats = useCallback(() => {
        if (region === 'Miền Bắc') {
            fetchSpecialPrizeStatsMB(days);
        } else if (region === 'Miền Trung') {
            const tinhToUse = tinh || 'hue';
            fetchSpecialPrizeStatsMT(days, tinhToUse);
        } else if (region === 'Miền Nam') {
            const tinhToUse = tinh || 'vung-tau';
            fetchSpecialPrizeStatsMN(days, tinhToUse);
        }
    }, [region, days, tinh, fetchSpecialPrizeStatsMB, fetchSpecialPrizeStatsMT, fetchSpecialPrizeStatsMN]);

    const handleRegionChange = useCallback((e) => {
        const selectedValue = e.target.value;
        if (selectedValue === 'Miền Bắc') {
            setRegion('Miền Bắc');
            setTinh(null);
        } else {
            const provinceName = e.target.options[e.target.selectedIndex].text;
            const selectedRegion = e.target.options[e.target.selectedIndex].parentElement.label || 'Miền Trung';
            setRegion(selectedRegion);
            const newTinh = provinceSlugs[provinceName] || 'hue';
            setTinh(newTinh);
            console.log('Selected province:', provinceName, 'tinh:', newTinh, 'region:', selectedRegion);
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
        console.log('useEffect triggered with region:', region, 'tinh:', tinh, 'days:', days);
        fetchSpecialPrizeStats();
    }, [days, region, tinh, fetchSpecialPrizeStats]);

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

    // Chia dữ liệu thành 3 phần dựa trên số lượng mục
    const splitStatsIntoThreeColumns = () => {
        if (!stats.length) {
            return { column1: [], column2: [], column3: [] };
        }

        const totalItems = stats.length;
        const itemsPerColumn = Math.floor(totalItems / 3);
        const remainder = totalItems % 3;

        const column1Count = itemsPerColumn + (remainder > 0 ? 1 : 0);
        const column2Count = itemsPerColumn + (remainder > 1 ? 1 : 0);
        const column3Count = itemsPerColumn;

        const column1 = stats.slice(0, column1Count);
        const column2 = stats.slice(column1Count, column1Count + column2Count);
        const column3 = stats.slice(column1Count + column2Count);

        return {
            column1,
            column2,
            column3,
        };
    };

    const { column1, column2, column3 } = splitStatsIntoThreeColumns();

    const getTitle = () => {
        const regionText = region === 'Miền Bắc' ? 'MIỀN BẮC' : `${region.toUpperCase()} - ${Object.keys(provinceSlugs).find(key => provinceSlugs[key] === tinh) || ''} `;
        return `Danh sách giải đặc biệt ${regionText} `;
    };

    const pageTitle = getTitle();
    const pageDescription = `Xem danh sách giải đặc biệt ${region === 'Miền Bắc' ? 'Miền Bắc' : `${region} - ${Object.keys(provinceSlugs).find(key => provinceSlugs[key] === tinh) || ''}`} trong ${metadata.filterType || ''}.`;

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
                <meta property="og:url" content={`https://xsmb.win/thongke/giai-dac-biet`} />
                <meta property="og:image" content="https://xsmb.win/zalotelegram.png" />
                <link rel="canonical" href="https://xsmb.win/thongke/giai-dac-biet" />
            </Head>

            <div className={styles.container}>
                <div className={styles.titleGroup}>
                    <h1 className={styles.title}>{pageTitle}</h1>
                    <div className={styles.actionBtn}>
                        <Link className={`${styles.actionTK} ${router.pathname.startsWith('/thongke/giai-dac-biet') ? styles.active : ''}`} href="giai-dac-biet">Thống Kê Giải Đặc Biệt </Link>
                        <Link className={`${styles.actionTK} ${router.pathname.startsWith('/thongke/dau-duoi') ? styles.active : ''}`} href="dau-duoi">Thống Kê Đầu Đuôi </Link>
                        <Link className={`${styles.actionTK} ${router.pathname.startsWith('/thongke/giai-dac-biet-tuan') ? styles.active : ''}`} href="giai-dac-biet-tuan">Thống Kê Giải Đặc Biệt Tuần </Link>

                    </div>
                </div>

                <div className={styles.content}>
                    <div className="metadata">
                        <p className={styles.title}>Danh sách giải đặc biệt từ {metadata.startDate || ''} đến {metadata.endDate || ''}</p>
                    </div>

                    <div className={styles.group_Select}>
                        <div className={styles.selectGroup}>
                            <label className={styles.options}>Chọn tỉnh: </label>
                            <select className={styles.select} onChange={handleRegionChange}
                                aria-label="Chọn tỉnh để xem thống kê giải đặc biệt"
                                >
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
                        </div>

                        <div className={styles.selectGroup}>
                            <label className={styles.options}>Chọn thời gian: </label>
                            <select className={styles.select} value={days} onChange={handleDaysChange}
                                aria-label="Chọn thời gian để xem thống kê giải đặc biệt"
                                >
                                <option value={10}>10 ngày</option>
                                <option value={20}>20 ngày</option>
                                <option value={30}>30 ngày</option>
                                <option value={60}>2 tháng</option>
                                <option value={90}>3 tháng</option>
                                <option value={180}>6 tháng</option>
                                <option value={270}>9 tháng</option>
                                <option value={365}>1 năm</option>
                            </select>
                        </div>
                    </div>

                    {loading && (days >= 20 ? <SkeletonTableThreeColumns /> : <SkeletonTableSingleColumn />)}

                    {error && <p className={styles.error}>{error}</p>}

                    {!loading && !error && stats.length > 0 && (
                        <>
                            {days >= 20 ? (
                                <table className={styles.table}>
                                    <caption className={styles.caption}>Thống kê Giải Đặc Biệt {region} {tinh ? `- ${Object.keys(provinceSlugs).find(key => provinceSlugs[key] === tinh)}` : ''} trong {days} ngày</caption>
                                    <thead>
                                        <tr>
                                            <th>Giải Đặc Biệt</th>
                                            <th>Giải Đặc Biệt</th>
                                            <th>Giải Đặc Biệt</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(() => {
                                            const maxRows = Math.max(column1.length, column2.length, column3.length);
                                            const rows = [];

                                            for (let i = 0; i < maxRows; i++) {
                                                const stat1 = column1[i] || {};
                                                const stat2 = column2[i] || {};
                                                const stat3 = column3[i] || {};

                                                rows.push(
                                                    <tr key={i}>
                                                        <td>
                                                            {stat1.number && (
                                                                <div className={styles.entry}>
                                                                    <div className={styles.number}>{stat1.number}</div>
                                                                    <div className={styles.date}>{stat1.drawDate}</div>
                                                                    {(region === 'Miền Trung' || region === 'Miền Nam') && stat1.tinh && (
                                                                        // SỬA LỖI: Hiển thị tenth thay vì tinh
                                                                        <div className={styles.tinh}>{stat1.tenth || Object.keys(provinceSlugs).find(key => provinceSlugs[key] === stat1.tinh) || stat1.tinh}</div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td>
                                                            {stat2.number && (
                                                                <div className={styles.entry}>
                                                                    <div className={styles.number}>{stat2.number}</div>
                                                                    <div className={styles.date}>{stat2.drawDate}</div>
                                                                    {(region === 'Miền Trung' || region === 'Miền Nam') && stat2.tinh && (
                                                                        <div className={styles.tinh}>{stat2.tenth || Object.keys(provinceSlugs).find(key => provinceSlugs[key] === stat2.tinh) || stat2.tinh}</div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td>
                                                            {stat3.number && (
                                                                <div className={styles.entry}>
                                                                    <div className={styles.number}>{stat3.number}</div>
                                                                    <div className={styles.date}>{stat3.drawDate}</div>
                                                                    {(region === 'Miền Trung' || region === 'Miền Nam') && stat3.tinh && (
                                                                        <div className={styles.tinh}>{stat3.tenth || Object.keys(provinceSlugs).find(key => provinceSlugs[key] === stat3.tinh) || stat3.tinh}</div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            }
                                            return rows;
                                        })()}
                                    </tbody>
                                </table>
                            ) : (
                                    <table className={styles.table}>
                                        <caption className={styles.caption}>Thống kê Giải Đặc Biệt{region} {tinh ? `- ${Object.keys(provinceSlugs).find(key => provinceSlugs[key] === tinh)}` : ''} trong {days} ngày</caption>
                                    <thead>
                                        <tr>
                                            <th>Giải Đặc Biệt</th>
                                            <th>Ngày</th>
                                            {(region === 'Miền Trung' || region === 'Miền Nam') && <th>Tỉnh</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats.map((stat, index) => (
                                            <tr key={index}>
                                                <td className={styles.number}>{stat.number}</td>
                                                <td className={styles.date}>{stat.drawDate}</td>
                                                {(region === 'Miền Trung' || region === 'Miền Nam') && (
                                                    // SỬA LỖI: Hiển thị tenth thay vì tinh
                                                    <td className={styles.tinh}>{stat.tenth || Object.keys(provinceSlugs).find(key => provinceSlugs[key] === stat.tinh) || stat.tinh}</td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </>
                    )}

                    {!loading && !error && stats.length === 0 && metadata.message && (
                        <p className={styles.noData}>{metadata.message}</p>
                    )}
                </div>

                <div className={styles.Group_Content}>
                    <h2 className={styles.heading}>XSMB.WIN nơi thống kê giải ĐB, kết quả xổ số Miền Bắc theo tuần, tháng và năm nhanh, chính xác và hoàn toàn miễn phí.</h2>
                    <div className={`${styles.contentWrapper} ${isExpanded ? styles.expanded : styles.collapsed}`}>
                        <h3 className={styles.h3}>Thống Kê giải ĐB. Thống kê kết quả xổ số</h3>
                        <p className={styles.desc}>Thống Kê giải đặc biệt là phương pháp thống kê chỉ duy nhất giải đặc biệt trong bảng kết quả xổ số có nhiều giải khác nhau.</p>
                        <p className={styles.desc}>Thống kê giải đặc biệt là một trong những cách thống kê nhanh và tiện lợi dành cho những người chơi xổ số chỉ quan tâm duy nhất đến giải đặc biệt.</p>
                        <h3 className={styles.h3}>Thống kê giải đặc biệt gồm có:</h3>
                        <p className={styles.desc}><strong className={styles.strong}>- TK giải đặc biệt theo tuần:</strong> là thống kê giải đặc biệt theo mỗi tuần. Trong 1 năm có 53 tuần, nghĩa là sẽ có 53 lần thống kê tuần của giải đặc biệt.</p>
                        <p className={styles.desc}><strong className={styles.strong}>- TK giải đặc biệt theo tháng:</strong> là thống kê giải đặc biệt theo mỗi tháng. Mỗi năm có 12 tháng, nghĩa là sẽ có 12 lần thống kê tháng giải đặc biệt.</p>
                        <p className={styles.desc}><strong className={styles.strong}>- TK giải đặc biệt theo năm:</strong> là thống kê giải đặc biệt theo từng năm.</p>
                        <h3 className={styles.h3}>Tại sao lại cần TK giải đặc biệt?</h3>
                        <p className={styles.desc}>Nhiều người chơi sẽ thường theo dõi TK giải đặc biệt và quan sát số ngày về để nâng cao xác suất trúng thưởng.</p>
                        <p className={styles.desc}>Về cơ bản, TK giải đặc biệt là một cách thức để người chơi có thể dự đoán kết quả xổ số. Tuy nhiên, việc quay xổ số có tính chất hoàn toàn ngẫu nhiên và không dựa trên bất kỳ quy luật. Chính vì vậy, bạn khó có thể dự đoán được kết quả chính xác và có cơ may trúng thưởng</p>
                        <p className={styles.desc}>Do vậy, bạn không nên quá phụ thuộc vào TK giải đặc biệt xổ số Miền Bắc mà chỉ nên đánh xổ số với tinh thần giải trí, thoải mái.</p>
                        <h3 className={styles.h3}>Thống kê giải đặc biệt Miền Bắc có những gì? Bảng 2 số cuối giải đặc biệt lâu về nhất</h3>
                        <p className={styles.desc}>– Bảng TK KQXSMB thông tin của 10 cặp 2 số cuối kết quả giải đặc biệt lâu chưa về nhất hôm nay.</p>
                        <h3 className={styles.h3}>Bảng đầu đuôi giải đặc biệt Miền Bắc lâu chưa về</h3>
                        <p className={styles.desc}>– Thống kê cho người xem nắm thông tin các số hàng chục và hàng đơn vị của KQXS Miền Bắc chưa về trong thời gian gần đây.</p>
                        <h3 className={styles.h3}>Bảng thống kê giải đặc biệt ngày này năm xưa</h3>
                        <p className={styles.desc}>– Cung cấp cho người xem thông tin các giải đặc biệt về cùng ngày hôm đó trong những năm trước đó.</p>
                        <p className={styles.desc}>Thông tin của TK giải ĐB luôn được cập nhật ngay sau khi có kết quả xổ số trong ngày, mọi thông số đều đảm bảo sự chính xác tuyệt đối cho người xem theo dõi</p>
                        <p className={styles.desc}>Xổ Số VN luôn mang đến cho bạn những thông tin chính xác và kịp thời. Với tính năng TK giải đặc biệt này, người chơi sẽ có thêm thông tin để tham khảo và chọn cho mình con số may mắn, mang đến cơ hội trúng thưởng cao hơn.</p>
                        <p className={styles.desc}>TK giải đặc biệt. TK KQXSMB. TK giải đặc biệt XSMB. TK giải đặc biệt XSMB theo tuần, tháng, năm được tổng hợp nhanh chóng và chính xác tại <a className={styles.action} href='/'>XSMB.WIN</a></p>
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
        const days = 10;
        const data = await apiMB.getSpecialStats(days);

        return {
            props: {
                initialStats: data.statistics || [],
                initialMetadata: data.metadata || {},
                initialDays: days,
                initialRegion: 'Miền Bắc',
                initialTinh: null,
            },
        };
    } catch (error) {
        console.error('Error in getServerSideProps:', error.message);
        return {
            props: {
                initialStats: [],
                initialMetadata: {},
                initialDays: 10,
                initialRegion: 'Miền Bắc',
                initialTinh: null,
            },
        };
    }
}

export default GiaiDacBiet;