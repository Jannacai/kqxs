import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import KQXS from '../kqxsAll/index';
import Calendar from '../../component/caledar';
import styles from "../../public/css/itemsKQXS.module.css";
import Image from 'next/image';
// Giả lập API để lấy thông tin ngày


export default function XsmbPage() {
    const router = useRouter();
    const { slug } = router.query; // slug sẽ là mảng hoặc undefined
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Xử lý slug thành chuỗi (nếu có)
    const slugDayofweek = Array.isArray(slug) ? slug.join('-') : slug; // Ví dụ: "thu-2" hoặc null
    const station = 'xsmb'; // Slug cố định cho xsmb

    console.log("Station:", station, "Slug:", slugDayofweek);
    useEffect(() => {
        // Giả lập tải dữ liệu (bỏ logic ngày tháng)
        setTimeout(() => {
            setLoading(false);
        }, 1000);
    }, [slugDayofweek]);

    if (loading) {
        return (
            <div className={styles.containerStyle}>
                <div className={styles.Lazyloading}>
                    <Image width={500}
                        height={300}
                        objectFit="cover"
                        className={styles.imggg} src='/asset/img/loading.png' />
                </div>
            </div>
        );
    }
    console.log('Slug DayOfWeek---', slugDayofweek);

    if (error) {
        return (
            <div className={styles.containerStyle}>
                <p>{error}</p>
                <button className={styles.buttonStyle} onClick={() => router.push('/')}>
                    Quay lại lịch
                </button>
            </div>
        );
    }

    return (

        <div className={styles.containerStyle}>
            <Calendar></Calendar>
            <KQXS data3={slugDayofweek}></KQXS>

            {/* <h1 className={styles.titleStyle} >Thông tin ngày {dayInfo.date}</h1>
            <h2 className={styles.subtitleStyle}>Sự kiện:</h2>
            <ul className={styles.listStyle}>
                {dayInfo.events.map((event, index) => (
                    <li key={index} className={styles.listItemStyle}>
                        {event}
                    </li>
                ))}
            </ul>
            <h2 className={styles.subtitleStyle}>Ghi chú:</h2>
            <p className={styles.noteStyle}>{dayInfo.note}</p> */}
            {/* <button className={styles.buttonStyle} onClick={() => router.push('/')}>
                Quay lại lịch
            </button> */}
        </div>
    );
}

