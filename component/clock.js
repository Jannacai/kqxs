// components/Clock.js
import { useState, useEffect } from 'react';
import styles from '../styles/clock.module.css';

const Clock = () => {
    const [dateTime, setDateTime] = useState({
        date: '',
        time: '',
    });

    useEffect(() => {
        const updateClock = () => {
            const now = new Date();

            // Lấy ngày, tháng, năm
            const day = String(now.getDate()).padStart(2, '0');
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const year = now.getFullYear();

            // Lấy giờ, phút, giây
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');

            // Định dạng ngày và giờ
            const dateString = `${day}/${month}/${year}`;
            const timeString = `${hours}:${minutes}:${seconds}`;

            setDateTime({ date: dateString, time: timeString });
        };

        // Cập nhật ngay lần đầu
        updateClock();
        // Cập nhật mỗi giây
        const intervalId = setInterval(updateClock, 1000);

        // Dọn dẹp interval khi component unmount
        return () => clearInterval(intervalId);
    }, []);

    return (
        <div className={styles.clockContainer}>
            <div className={styles.date}>Ngày: {dateTime.date}</div>
            <div className={styles.time}>Giờ: {dateTime.time}</div>
        </div>
    );
};

export default Clock;