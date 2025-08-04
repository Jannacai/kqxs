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


export default function XsmbPage() {
    const router = useRouter();
    const { dayOfWeek } = router.query; // slug sẽ là mảng hoặc undefined
    const [error, setError] = useState(null);

    // ✅ SỬA LỖI: Xử lý dayOfWeek đúng cách
    const dayOfWeekValue = Array.isArray(dayOfWeek) ? dayOfWeek.join('-') : dayOfWeek;
    const station = 'xsmb';

    // Validate dayOfWeek
    const validDayOfWeeks = ['thu-2', 'thu-3', 'thu-4', 'thu-5', 'thu-6', 'thu-7', 'chu-nhat'];
    const isValidDayOfWeek = validDayOfWeeks.includes(dayOfWeekValue);

    console.log('DayOfWeek Value:', dayOfWeekValue);
    console.log('Is Valid DayOfWeek:', isValidDayOfWeek);

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
            <KQXS
                data3={null} // Không có ngày cụ thể
                data4={isValidDayOfWeek ? dayOfWeekValue : null} // Thứ trong tuần
                station={station}
            />

            <div>
                <ThongKe></ThongKe>
                <CongCuHot />
            </div>
        </div>
    );
}
