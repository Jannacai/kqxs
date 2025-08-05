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

// ✅ VALIDATION: Kiểm tra format ngày DD-MM-YYYY
const validateDate = (dateStr) => {
    if (!dateStr) return { isValid: false, error: 'Không có thông tin ngày' };

    // Kiểm tra format DD-MM-YYYY
    const dateRegex = /^\d{2}-\d{2}-\d{4}$/;
    if (!dateRegex.test(dateStr)) {
        return {
            isValid: false,
            error: `Format ngày không hợp lệ: ${dateStr}. Format đúng: DD-MM-YYYY`
        };
    }

    // Kiểm tra ngày hợp lệ
    const [day, month, year] = dateStr.split('-').map(Number);
    const parsedDate = new Date(year, month - 1, day);

    if (isNaN(parsedDate.getTime())) {
        return {
            isValid: false,
            error: `Ngày không hợp lệ: ${dateStr}`
        };
    }

    // Không cho phép ngày trong tương lai
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Cuối ngày hôm nay

    if (parsedDate > today) {
        return {
            isValid: false,
            error: `Không thể xem kết quả cho ngày trong tương lai: ${dateStr}`
        };
    }

    return { isValid: true, date: dateStr };
};

export default function XsmbDatePage() {
    const router = useRouter();
    const { date } = router.query;
    const [error, setError] = useState(null);
    const [isValidating, setIsValidating] = useState(true);

    // ✅ VALIDATION: Kiểm tra date parameter
    useEffect(() => {
        if (!router.isReady) return;

        const validation = validateDate(date);
        if (!validation.isValid) {
            setError(validation.error);
        }
        setIsValidating(false);
    }, [date, router.isReady]);

    const station = 'xsmb';

    // ✅ DEBUG: Logging để debug
    console.log("Station:", station, "Date:", date);
    console.log('Date parameter---', date);

    if (isValidating) {
        return (
            <div className={styles.containerStyle}>
                <p>Đang tải...</p>
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
        <div className="container">
            <div>
                <Calendar></Calendar>
                <ListXSMB></ListXSMB>
                <ListXSMT></ListXSMT>
                <ListXSMN></ListXSMN>
            </div>
            <KQXS
                data3={date}        // ✅ TRUYỀN NGÀY CỤ THỂ
                data4={null}        // Không truyền thứ trong tuần
                station={station}
            />
            <div>
                <ThongKe></ThongKe>
                <CongCuHot />
            </div>
        </div>
    );
} 