"use client";
import Link from 'next/link';
import Head from 'next/head';

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

export default function DienDan({ session }) {
    console.log('Session in DienDan:', JSON.stringify(session, null, 2));

    const scrollToSection = (sectionId) => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };
    const canonicalUrl = 'https://www.xsmb.win/diendan';
    const title = `Diễn Đàn Quay Số`;
    const description = `Thảo luận về xác suất và thống kê: Áp dụng các kiến thức toán học vào việc phân tích các trò quay số.

Chia sẻ các thuật toán: Bạn có đang nghiên cứu một thuật toán tạo số ngẫu nhiên tối ưu, hay một mô hình dự đoán kết quả quay số? Hãy chia sẻ và cùng nhau phát triển!`;
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
        <div className={styles.background}>
            <h1 className={styles.title}>Diễn Đàn Quay Số Tốt Nhất Hiện Nay</h1>
            <div className={styles.dangnhap}>
                <NavBarDienDan />
                <Link className={styles.item1} href="/login">Đăng Ký/Đăng Nhập</Link>
            </div>

            {/* Thanh navigation */}
            <nav className={styles.navBar}>
                <h2 className={styles.titlenavbar}>Menu Danh Mục</h2>
                <ul className={styles.navList1}>
                    <li><button onClick={() => scrollToSection('latest-event')}>Sự kiện mới nhất</button></li>
                    <li><button onClick={() => scrollToSection('user-list')}>Thành Viên Nhóm</button></li>
                    <li><button onClick={() => scrollToSection('announcements')}>Thông báo mới</button></li>
                    <li><button onClick={() => scrollToSection('hot-events')}>Tin hot & Sự kiện</button></li>
                    <li><button onClick={() => scrollToSection('group-chat')}>Giao Lưu Chốt Số</button></li>
                </ul>
                <ul className={styles.navList} >
                    <li><button onClick={() => scrollToSection('event-registration')}>Danh sách đăng ký Events</button></li>
                    <li><button onClick={() => scrollToSection('vinhdanh')}>Bảng vinh danh trúng giải</button></li>
                    <li><button onClick={() => scrollToSection('leaderboard-1')}>Bảng xếp hạng Top 50</button></li>
                    <li><button onClick={() => scrollToSection('rules')}>Quy Định Diễn Đàn</button></li>
                    <li><button onClick={() => scrollToSection('leaderboard-2')}>Chốt Số Nhanh</button></li>
                </ul>
            </nav>
            <div className={styles.tinhot}>
                <h2 id="hot-events" className={styles.h3}>🌟Bảng Tin hot & Sự kiện</h2>
                <Event />
            </div>
            <div className={styles.group}>
                <div className='container'>
                    <div className={styles.sukienmoi}>
                        <h2 id="latest-event" className={styles.h6}>📌Cập nhập Sự kiện mới nhất hôm nay</h2>
                        <LatestEventDetail />
                    </div>
                    <div className={styles.group2}>
                        <h2 id="announcements" className={styles.h3}>🔔Thông báo mới</h2>
                        <Thongbao />
                    </div>
                </div>
            </div>

            <div className={styles.group0}>
                <div className='container'>
                    <div className={styles.vinhdanh}>
                        <h2 id="group-chat" className={styles.h3}>🎯Giao Lưu Chốt Số</h2>
                        <GroupChat session={session} />
                    </div>
                    <div>
                        <h2 id="user-list" className={styles.h6}>👥Thành Viên Nhóm</h2>
                        <UserList />
                    </div>
                </div>
            </div>

            <div className={styles.group}>
                <div className='container'>
                    <div className={styles.vinhdanh}>
                        <h2 id="vinhdanh" className={styles.h4}>🏆Bảng vinh danh trúng giải</h2>
                        <Vinhdanh />
                    </div>
                    <div>
                        <h2 id="leaderboard-1" className={styles.h4}>👑Bảng xếp hạng</h2>
                        <Leaderboard />
                    </div>
                </div>
            </div>
            <h2 id="event-registration" className={styles.h3}>📜Danh sách đăng ký Events</h2>
            <Lichsudangky />
            <div className={styles.group3}>
                <div className='container'>
                    <div className={styles.quydinh}>
                        <h2 id="rules" className={styles.h2}>⚖️Hướng Dẫn - Quy Định Diễn Đàn</h2>
                        <Quydinh />
                    </div>
                    {/* <div>
                        <h2 id="leaderboard-2" className={styles.h4}>👑Bảng xếp hạng</h2>
                        <Leaderboard />
                    </div> */}
                </div>
            </div>
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