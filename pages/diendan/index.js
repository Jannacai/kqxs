"use client";

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

    return (
        <div className={styles.background}>
            <h1 className={styles.title}>Diễn Đàn Quay Số Tốt Nhất Hiện Nay</h1>
            <NavBarDienDan />
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

            <div className={styles.group1}>
                <div className='container'>
                    <div className={styles.sukienmoi}>
                        <h2 id="latest-event" className={styles.h6}>📌Sự kiện mới nhất hôm nay</h2>
                        <LatestEventDetail />
                    </div>
                    <div>
                        <h2 id="user-list" className={styles.h6}>👥Thành Viên Nhóm</h2>
                        <UserList />
                    </div>
                </div>
            </div>
            <div className="container">
                <div className={styles.group2}>
                    <h2 id="announcements" className={styles.h3}>🔔Thông báo mới</h2>
                    <Thongbao />
                </div>
                <div className={styles.tinhot}>
                    <h2 id="hot-events" className={styles.h3}>🌟Tin hot & Sự kiện</h2>
                    <Event />
                </div>
                <div>
                    <h2 id="group-chat" className={styles.h3}>🎯Giao Lưu Chốt Số</h2>
                    <GroupChat session={session} />
                </div>
            </div>
            <div className={styles.group0}>
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
                    <div>
                        <h2 id="leaderboard-2" className={styles.h4}>👑Bảng xếp hạng</h2>
                        <Leaderboard />
                    </div>
                </div>
            </div>
        </div>
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