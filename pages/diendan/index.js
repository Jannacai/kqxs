"use client";

import Vinhdanh from './vinhdanh';
import Event from './events';
import Thongbao from './thongbao';
import Leaderboard from './bangxephang';
import styles from '../../styles/DienDan.module.css';

export default function DienDan() {
    return (
        <div className="container">
            <div>
                <Vinhdanh />
                <Thongbao />
            </div>

            <div className={styles.container}>
                <h1 className={styles.title}>Diễn Đàn Quay Số</h1>
                <Event />
                
            </div>
            <div className={styles.leaderboardSection}>
                <Leaderboard />
            </div>
        </div>
    );
}