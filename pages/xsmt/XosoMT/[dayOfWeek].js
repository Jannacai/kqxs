import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import KQXS from '../index';
import Calendar from '../../../component/caledar';
import styles from "../../../public/css/itemsKQXS.module.css";
import ThongKe from '../../../component/thongKe';
import CongCuHot from '../../../component/CongCuHot';
import ListXSMT from '../../../component/listXSMT';
import ListXSMB from '../../../component/listXSMB';
import ListXSMN from '../../../component/listXSMN';

import Image from 'next/image';
// Giả lập API để lấy thông tin ngày


export default function XsmnPage() {
    const router = useRouter();
    const { dayOfWeek } = router.query; // slug sẽ là mảng hoặc undefined
    const [error, setError] = useState(null);

    // Xử lý slug thành chuỗi (nếu có)
    const slugDayofweek = Array.isArray(dayOfWeek) ? dayOfWeek.join('-') : dayOfWeek; // Ví dụ: "thu-2" hoặc null
    const station = 'xsmt'; // Slug cố định cho xsmb


    console.log('Slug DayOfWeek MT---', slugDayofweek);

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
            <KQXS dayofMT={slugDayofweek}></KQXS>
            <div>
                <ThongKe></ThongKe>
                <CongCuHot />
            </div>
        </div>
    );
}

