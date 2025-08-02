"use client";
import Link from 'next/link';
import Head from 'next/head';
import { useState } from 'react';

import Vinhdanh from './vinhdanh';
import Event from './events';
import LatestEventDetail from './events/LatestEventDetail';
import Thongbao from './thongbao';
import Leaderboard from './bangxephang';
import GroupChat from './groupchat';
import Lichsudangky from './lichsudangky';
import styles from '../../styles/DienDan.module.css';
import { getSession } from 'next-auth/react';
import Quydinh from './Quydinh';
import UserList from './UserList';
import NavBarDienDan from './navbarDiendan';
import UserAvatar from '../../component/UserAvatar';
import LiveResultButton from '../../components/LiveResultButton';
import VietnamTimeDisplay from '../../components/VietnamTimeDisplay';

export default function DienDan({ session }) {
    console.log('Session in DienDan:', JSON.stringify(session, null, 2));
    const [activeSection, setActiveSection] = useState('home');
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const scrollToSection = (sectionId) => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        setActiveSection(sectionId);
    };

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    const canonicalUrl = 'https://www.xsmb.win/diendan';
    const title = `Diễn Đàn Quay Số - Cộng Đồng Xổ Số Việt Nam`;
    const description = `Thảo luận về xác suất và thống kê: Áp dụng các kiến thức toán học vào việc phân tích các trò quay số. Chia sẻ các thuật toán: Bạn có đang nghiên cứu một thuật toán tạo số ngẫu nhiên tối ưu, hay một mô hình dự đoán kết quả quay số? Hãy chia sẻ và cùng nhau phát triển!`;

    return (<>
        <Head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>{title}</title>
            <meta name="description" content={description} />
            <meta
                name="keywords"
                content="xổ số miền bắc, xsmb, kqxs, kết quả xổ số miền bắc, xổ số hôm nay, kqxsmb, sxmb, lô tô, đầu đuôi, soi cầu xsmb"
            />
            <meta name="robots" content="index, follow" />

            {/* Open Graph Tags */}
            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />
            <meta property="og:type" content="website" />
            <meta property="og:url" content={canonicalUrl} />
            <meta property="og:image" content="https://xsmb.win/XSMB.png" />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
            <meta property="og:image:secure_url" content="https://xsmb.win/XSMB.png" />
            <meta property="og:image:type" content="image/png" />
            <meta property="og:image:alt" content={`Kết quả xổ số miền Bắc `} />
            <meta property="og:site_name" content="XSMB" />
            <meta property="og:locale" content="vi_VN" />
            <meta property="fb:app_id" content={process.env.FB_APP_ID || ''} />

            {/* Zalo */}
            <meta property="og:app_id" content={process.env.ZALO_APP_ID || ''} />
            <meta property="zalo:official_account_id" content={process.env.ZALO_OA_ID || ''} />
            <meta property="zalo:share_url" content={canonicalUrl} />
            <meta property="zalo:og:image" content="https://xsmb.win/zalotelegram.png" />
            <meta property="zalo:og:image:width" content="600" />
            <meta property="zalo:og:image:height" content="600" />

            {/* Telegram */}
            <meta name="telegram:channel" content={process.env.TELEGRAM_CHANNEL || '@YourChannel'} />
            <meta name="telegram:share_url" content={canonicalUrl} />
            <meta
                name="telegram:description"
                content={`Cập nhật XSMB nhanh nhất ngày  tại ${process.env.TELEGRAM_CHANNEL || '@YourChannel'}!`}
            />
            <meta name="telegram:og:image" content="https://xsmb.win/zalotelegram.png" />

            {/* Twitter Cards */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={title} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content="https://xsmb.win/XSMB.png" />
            <meta name="twitter:image:alt" content={`Kết quả xổ số miền Bắc `} />

            <link rel="canonical" href={canonicalUrl} />
            <link rel="alternate" hrefLang="vi" href={canonicalUrl} />

            {/* JSON-LD Schema */}
            <script type="application/ld+json">
                {JSON.stringify([
                    {
                        "@context": "https://schema.org",
                        "@type": ["Dataset", "WebPage"],
                        "name": `Kết Quả Xổ Số Miền Bắc `,
                        "description": `Kết quả xổ số Miền Bắc ngày  với các giải thưởng và thống kê.`,

                        "keywords": ["xổ số", "miền bắc", "kết quả", "xsmb", "lô tô", "đầu đuôi", "soi cầu xsmb"],
                        "url": canonicalUrl,
                        "publisher": {
                            "@type": "Organization",
                            "name": "XSMB",
                            "url": "https://www.xsmb.win"
                        },
                        "license": "https://creativecommons.org/licenses/by/4.0/",
                        "creator": {
                            "@type": "Organization",
                            "name": "XSMB.WIN",
                            "url": "https://www.xsmb.win"
                        }
                    },
                    {
                        "@context": "https://schema.org",
                        "@type": "Organization",
                        "name": "XSMB",
                        "url": "https://www.xsmb.win",
                        "logo": "https://xsmb.win/logo.png",
                        "sameAs": [
                            "https://zalo.me/your-zalo-oa-link",
                            "https://t.me/YourChannel"
                        ]
                    },
                    {
                        "@context": "https://schema.org",
                        "@type": "WebSite",
                        "name": "XSMB",
                        "url": "https://www.xsmb.win",
                        "potentialAction": {
                            "@type": "SearchAction",
                            "target": "https://www.xsmb.win/search?q={search_term_string}",
                            "query-input": "required name=search_term_string"
                        }
                    },
                    {
                        "@context": "https://schema.org",
                        "@type": "BreadcrumbList",
                        "itemListElement": [
                            {
                                "@type": "ListItem",
                                "position": 1,
                                "name": "Trang chủ",
                                "item": "https://www.xsmb.win"
                            },
                            {
                                "@type": "ListItem",
                                "position": 2,
                                "name": "Xổ Số Miền Bắc",
                                "item": "https://www.xsmb.win/ket-qua-xo-so-mien-bac"
                            }
                        ]
                    }
                ])}
            </script>
        </Head>

        {/* Forum Layout Wrapper */}
        <div className={styles.forumLayoutWrapper}>
            {/* Back to main site button */}
            <div className={styles.backToMain}>
                <Link href="/" className={styles.backButton}>
                    ← Quay lại trang chủ
                </Link>
            </div>

            {/* Mobile Menu Toggle */}
            <button className={styles.mobileMenuToggle} onClick={toggleSidebar}>
                <span></span>
                <span></span>
                <span></span>
            </button>

            {/* Overlay for mobile */}
            {sidebarOpen && (
                <div className={styles.overlay} onClick={toggleSidebar}></div>
            )}

            <div className={styles.forumLayout}>
                {/* Header */}
                <header className={styles.forumHeader}>
                    <div className={styles.headerContent}>
                        <div className={styles.logoSection}>
                            <h1 className={styles.forumTitle}>Diễn Đàn Xổ Số</h1>
                            <p className={styles.forumSubtitle}>Cộng đồng chia sẻ kinh nghiệm</p>
                        </div>
                        <div className={styles.headerActions}>
                            <NavBarDienDan />
                            <UserAvatar />
                        </div>
                    </div>
                </header>

                {/* Main Layout */}
                <div className={styles.mainLayout}>
                    {/* Left Sidebar */}
                    <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
                        <div className={styles.sidebarHeader}>
                            <h3>Danh Mục</h3>
                            <button className={styles.closeSidebar} onClick={toggleSidebar}>
                                ×
                            </button>
                        </div>

                        <nav className={styles.sidebarNav}>
                            {/* Thông tin chính */}
                            <div className={styles.navSection}>
                                <h4>📢 Thông Tin Chính</h4>
                                <ul>
                                    <li>
                                        <button
                                            className={`${styles.navButton} ${activeSection === 'latest-event' ? styles.active : ''}`}
                                            onClick={() => scrollToSection('latest-event')}
                                        >
                                            📌 Sự Kiện Mới Nhất
                                        </button>
                                    </li>
                                    <li>
                                        <button
                                            className={`${styles.navButton} ${activeSection === 'hot-events' ? styles.active : ''}`}
                                            onClick={() => scrollToSection('hot-events')}
                                        >
                                            🌟 Tin Hot & Sự Kiện
                                        </button>
                                    </li>
                                    <li>
                                        <button
                                            className={`${styles.navButton} ${activeSection === 'announcements' ? styles.active : ''}`}
                                            onClick={() => scrollToSection('announcements')}
                                        >
                                            🔔 Thông Báo Mới
                                        </button>
                                    </li>
                                </ul>
                            </div>

                            {/* Cộng đồng */}
                            <div className={styles.navSection}>
                                <h4>👥 Cộng Đồng</h4>
                                <ul>
                                    <li>
                                        <button
                                            className={`${styles.navButton} ${activeSection === 'user-list' ? styles.active : ''}`}
                                            onClick={() => scrollToSection('user-list')}
                                        >
                                            👥 Thành Viên Nhóm
                                        </button>
                                    </li>
                                </ul>
                            </div>

                            {/* Thành tích */}
                            <div className={styles.navSection}>
                                <h4>🏆 Thành Tích</h4>
                                <ul>
                                    <li>
                                        <button
                                            className={`${styles.navButton} ${activeSection === 'vinhdanh' ? styles.active : ''}`}
                                            onClick={() => scrollToSection('vinhdanh')}
                                        >
                                            🏆 Bảng Vinh Danh
                                        </button>
                                    </li>
                                    <li>
                                        <button
                                            className={`${styles.navButton} ${activeSection === 'leaderboard' ? styles.active : ''}`}
                                            onClick={() => scrollToSection('leaderboard')}
                                        >
                                            👑 Bảng Xếp Hạng
                                        </button>
                                    </li>
                                </ul>
                            </div>

                            {/* Quản lý */}
                            <div className={styles.navSection}>
                                <h4>📋 Quản Lý</h4>
                                <ul>
                                    <li>
                                        <button
                                            className={`${styles.navButton} ${activeSection === 'event-registration' ? styles.active : ''}`}
                                            onClick={() => scrollToSection('event-registration')}
                                        >
                                            📜 Danh Sách Đăng Ký
                                        </button>
                                    </li>
                                    <li>
                                        <button
                                            className={`${styles.navButton} ${activeSection === 'rules' ? styles.active : ''}`}
                                            onClick={() => scrollToSection('rules')}
                                        >
                                            ⚖️ Quy Định Diễn Đàn
                                        </button>
                                    </li>
                                </ul>
                            </div>
                        </nav>
                    </aside>

                    {/* Center Content */}
                    <main className={styles.centerContent}>
                        {/* Top Row - Sự kiện quan trọng nhất */}
                        <div className={styles.topRow}>
                            {/* Sự Kiện Mới Nhất - Chiếm 60% */}
                            <section id="latest-event" className={`${styles.contentSection} ${styles.largeSection}`}>
                                <div className={styles.sectionHeader}>
                                    <h2>📌 Sự Kiện Mới Nhất</h2>
                                    <p>Sự kiện quan trọng nhất hôm nay</p>
                                </div>
                                <div className={styles.sectionContent}>
                                    <LatestEventDetail />
                                </div>
                            </section>

                            {/* Second Row - Tin hot */}
                            <div className={styles.secondRow}>
                                {/* Tin Hot & Sự Kiện - Full width */}
                                <section id="hot-events" className={`${styles.contentSection} ${styles.fullWidthSection}`}>
                                    {/* <div className={styles.sectionHeader}>
                                        <h2>🌟 Tin Hot & Sự Kiện</h2>
                                        <p>Cập nhật thông tin mới nhất</p>
                                    </div> */}
                                    <div className={styles.sectionContent}>
                                        <Event />
                                    </div>
                                </section>
                            </div>

                            {/* Thông Báo Mới - Chiếm 40% */}
                            <section id="announcements" className={`${styles.contentSection} ${styles.smallSection}`}>
                                {/* <div className={styles.sectionHeader}>
                                    <h2>🔔 Thông Báo Mới</h2>
                                    <p>Thông báo từ ban quản trị</p>
                                </div> */}
                                <div className={styles.sectionContent}>
                                    <Thongbao />
                                </div>
                            </section>
                        </div>



                        {/* Third Row - Thành viên và Vinh danh */}
                        <div className={styles.thirdRow}>
                            {/* Thành Viên Nhóm - Chiếm 40% */}
                            <section id="user-list" className={`${styles.contentSection} ${styles.mediumSection}`}>
                                {/* <div className={styles.sectionHeader}>
                                    <h2>👥 Thành Viên Nhóm</h2>
                                    <p>Danh sách thành viên tích cực</p>
                                </div> */}
                                <div className={styles.sectionContent}>
                                    <UserList />
                                </div>
                            </section>

                            {/* Bảng Vinh Danh - Chiếm 60% */}
                            <section id="vinhdanh" className={`${styles.contentSection} ${styles.largeSection}`}>
                                <div className={styles.sectionHeader}>
                                    <h2>🏆 Bảng Vinh Danh</h2>
                                    <p>Những thành viên xuất sắc nhất</p>
                                </div>
                                <div className={styles.sectionContent}>
                                    <Vinhdanh />
                                </div>
                            </section>
                        </div>

                        {/* Fourth Row - Bảng xếp hạng và Quản lý */}
                        <div className={styles.fourthRow}>
                            {/* Bảng Xếp Hạng - Chiếm 70% */}
                            <section id="leaderboard" className={`${styles.contentSection} ${styles.largeSection}`}>
                                {/* <div className={styles.sectionHeader}>
                                    <h2>👑 Bảng Xếp Hạng</h2>
                                    <p>Top 50 thành viên hàng đầu</p>
                                </div> */}
                                <div className={styles.sectionContent}>
                                    <Leaderboard />
                                </div>
                            </section><section id="event-registration" className={`${styles.contentSection} ${styles.smallSection}`}>
                                {/* <div className={styles.sectionHeader}>
                                    <h2>📜 Đăng Ký Events</h2>
                                    <p>Theo dõi sự kiện</p>
                                </div> */}
                                <div className={styles.sectionContent}>
                                    <Lichsudangky />
                                </div>
                            </section>
                            <section id="rules" className={`${styles.contentSection} ${styles.smallSection}`}>
                                <div className={styles.sectionHeader}>
                                    <h2>⚖️ Quy Định Diễn Đàn</h2>
                                    <p>Hướng dẫn và quy định cộng đồng</p>
                                </div>
                                <div className={styles.sectionContent}>
                                    <Quydinh />
                                </div>
                            </section>
                            {/* Danh Sách Đăng Ký - Chiếm 30% */}

                        </div>

                        {/* Bottom Row - Quy định (Full width) */}

                    </main>

                    {/* Right Sidebar - Fixed Group Chat */}
                    <aside className={styles.rightSidebar}>
                        {/* <div className={styles.rightSidebarHeader}>
                            <h3>💬 Giao Lưu Chốt Số</h3>
                            <p>Thảo luận và chia sẻ kinh nghiệm</p>
                        </div> */}
                        <div className={styles.rightSidebarContent}>
                            <GroupChat session={session} />
                        </div>
                    </aside>
                </div>
            </div>

            {/* Live XSMT Button */}
            <LiveResultButton
                station="xsmt"
                isLiveWindow={true}
                buttonText="Xem XSMT Live"
                buttonStyle="primary"
                size="medium"
                isForum={true}
                position="bottom-left"
            />

            {/* Live XSMN Button */}
            <LiveResultButton
                station="xsmn"
                isLiveWindow={true}
                buttonText="Xem XSMN Live"
                buttonStyle="secondary"
                size="medium"
                isForum={true}
                position="bottom-right"
            />

            {/* Live XSMB Button */}
            <LiveResultButton
                station="xsmb"
                isLiveWindow={true}
                buttonText="Xem XSMB Live"
                buttonStyle="xsmb"
                size="medium"
                isForum={true}
                position="bottom-left"
            />

            {/* Vietnam Time Display */}
            <VietnamTimeDisplay />
        </div>
    </>
    );
}

export async function getServerSideProps(context) {
    const session = await getSession(context);
    console.log('Session in getServerSideProps:', JSON.stringify(session, null, 2));
    return {
        props: {
            session: session || null,
        },
    };
}