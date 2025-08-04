import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import KQXS from './index';
import Calendar from '../../component/caledar';
import styles from "../../public/css/itemsKQXS.module.css";
import ThongKe from '../../component/thongKe';
import CongCuHot from '../../component/CongCuHot';
import ListXSMT from '../../component/listXSMT';
import ListXSMB from '../../component/listXSMB';
import ListXSMN from '../../component/listXSMN';


import Image from 'next/image';
// Giả lập API để lấy thông tin ngày


export default function XsmbPage() {
    const router = useRouter();
    const { slug } = router.query; // slug sẽ là mảng hoặc undefined
    const [error, setError] = useState(null);

    // ✅ SỬA LỖI: Phân biệt slug là ngày hay thứ
    const slugValue = Array.isArray(slug) ? slug.join('-') : slug;
    const station = 'xsmb';

    // Kiểm tra xem slug có phải là ngày (DD-MM-YYYY) hay thứ (thu-2)
    const isDateSlug = slugValue && /^\d{2}-\d{2}-\d{4}$/.test(slugValue);
    const isDayOfWeekSlug = slugValue && /^thu-|chu-nhat$/.test(slugValue);

    console.log("Station:", station, "Slug:", slugValue);
    console.log('Is Date Slug:', isDateSlug, 'Is DayOfWeek Slug:', isDayOfWeekSlug);

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
                data3={isDateSlug ? slugValue : null} // Ngày cụ thể nếu slug là ngày
                data4={isDayOfWeekSlug ? slugValue : null} // Thứ trong tuần nếu slug là thứ
                station={station}
            />
            <div>
                <ThongKe></ThongKe>
                <CongCuHot />
            </div>
        </div>
    );
}
