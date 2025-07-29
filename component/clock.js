import { useState, useEffect, useRef } from 'react';
import styles from '../styles/clock.module.css';
import isEqual from 'lodash/isEqual'; // Thêm lodash để so sánh sâu

const Clock = () => {
    const [dateTime, setDateTime] = useState({
        date: '',
        time: '',
    });
    const prevDateTimeRef = useRef(dateTime); // Lưu trữ giá trị trước đó

    useEffect(() => {
        const updateClock = () => {
            const now = new Date();

            const day = String(now.getDate()).padStart(2, '0');
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const year = now.getFullYear();

            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');

            const dateString = `${day}/${month}/${year}`;
            const timeString = `${hours}:${minutes}:${seconds}`;

            const newDateTime = { date: dateString, time: timeString };

            // Chỉ cập nhật nếu dữ liệu thay đổi
            if (!isEqual(newDateTime, prevDateTimeRef.current)) {
                setDateTime(newDateTime);
                prevDateTimeRef.current = newDateTime;
            }
        };

        updateClock(); // Cập nhật lần đầu
        const intervalId = setInterval(updateClock, 1000);

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