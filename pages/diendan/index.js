"use client";

import Vinhdanh from './vinhdanh';
import Event from './events';
import LatestEventDetail from './events/LatestEventDetail';
import Thongbao from './thongbao';
import Leaderboard from './bangxephang';
import GroupChat from './groupchat';
import styles from '../../styles/DienDan.module.css';
import { getSession } from 'next-auth/react';

export default function DienDan({ session }) {
    console.log('Session in DienDan:', JSON.stringify(session, null, 2));
    return (
        <div className="container">
            <div className={styles.group2}>
                <h2 className={styles.h2}>Bảng vinh danh trúng giải</h2>
                <Vinhdanh />
                <h2 className={styles.h3}>🔔 Thông báo mới</h2>
                <Thongbao />
            </div>

            <div className={styles.container}>
                <h1 className={styles.title}>Diễn Đàn Quay Số</h1>
                <div className={styles.group1}>
                    <LatestEventDetail />
                    <Event />
                </div>
            </div>

            <div className={styles.leaderboardSection}>
                <h2 className={styles.h4}>Bảng xếp hạng</h2>
                <Leaderboard />
                <h2 className={styles.h5}>Giao Lưu Chốt Số</h2>
                <GroupChat session={session} />
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