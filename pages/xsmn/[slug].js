import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import KQXS from './xosomn';
import Calendar from '../../component/caledar';
import styles from "../../public/css/itemsKQXS.module.css";
import ThongKe from '../../component/thongKe';
import CongCuHot from '../../component/CongCuHot';
import ListXSMT from '../../component/listXSMT';
import ListXSMB from '../../component/listXSMB';
import ListXSMN from '../../component/listXSMN';

import Image from 'next/image';
// Giả lập API để lấy thông tin ngày


export default function XsmtPage() {
    const router = useRouter();
    const { slug } = router.query; // slug sẽ là mảng hoặc undefined
    const [error, setError] = useState(null);

    // Xử lý slug thành chuỗi (nếu có)
    const slugDayofweek = Array.isArray(slug) ? slug.join('-') : slug; // Ví dụ: "thu-2" hoặc null
    const station = 'xsmt'; // Slug cố định cho xsmb

    console.log("Station:", station, "Slug:", slugDayofweek);
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

        <div className="container">
            <div>
                <Calendar></Calendar>
                <ListXSMB></ListXSMB>
                <ListXSMT></ListXSMT>
                <ListXSMN></ListXSMN>
            </div>

            <KQXS data3={slugDayofweek}></KQXS>

            <div>
                <ThongKe></ThongKe>
                <CongCuHot />
            </div>
        </div>
    );
}

