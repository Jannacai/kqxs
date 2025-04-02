import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import KQXS from '../pages/kqxsAll/index';
import Calendar from '../component/caledar';

import Image from 'next/image';
// Giả lập API để lấy thông tin ngày
const fetchDayInfo = async (day, month, year) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                date: `${day}-${month}-${year}`,
                events: [
                    `Sự kiện 1 vào ngày ${day}/${month}/${year}`,
                    `Sự kiện 2 vào ngày ${day}/${month}/${year}`,
                ],
                note: `Ghi chú cho ngày ${day}/${month}/${year}`,
            });
        }, 1000);
    });
};

export default function DayDetail() {
    const router = useRouter();
    const { slug } = router.query;
    const [dayInfo, setDayInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    console.log("data3..........", slug);
    useEffect(() => {
        if (slug) {
            const [day, month, year] = slug.split('-').map(Number);
            fetchDayInfo(day, month, year)
                .then((data) => {
                    setDayInfo(data);
                    setLoading(false);
                })
                .catch((err) => {
                    setError('Không thể tải thông tin ngày');
                    setLoading(false);
                });
        }
    }, [slug]);

    if (loading) {
        return (
            <div >
                {/* <div >
                    <Image width={500}
                        height={300}
                        objectFit="cover"
                        className={styles.imggg} src='/asset/img/loading.png' />
                </div> */}
            </div>
        );
    }

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
            <KQXS data3={slug}></KQXS>
        </div>
    );
}

