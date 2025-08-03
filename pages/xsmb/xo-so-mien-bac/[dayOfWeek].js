import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import KQXS from '../../kqxsAll/index';
import Calendar from '../../../component/caledar';
import styles from "../../../public/css/itemsKQXS.module.css";
import ThongKe from '../../../component/thongKe';
import CongCuHot from '../../../component/CongCuHot';
import ListXSMT from '../../../component/listXSMT';
import ListXSMB from '../../../component/listXSMB';
import ListXSMN from '../../../component/listXSMN';

import Image from 'next/image';

// ✅ CẢI THIỆN: Validation cho dayOfWeek parameter
const validateDayOfWeek = (dayOfWeek) => {
    if (!dayOfWeek) return { isValid: false, error: 'Không có thông tin thứ' };

    const validDayOfWeeks = ['thu-2', 'thu-3', 'thu-4', 'thu-5', 'thu-6', 'thu-7', 'chu-nhat'];
    const dayOfWeekValue = Array.isArray(dayOfWeek) ? dayOfWeek.join('-') : dayOfWeek;

    if (!validDayOfWeeks.includes(dayOfWeekValue)) {
        return {
            isValid: false,
            error: `Thứ không hợp lệ: ${dayOfWeekValue}. Các thứ hợp lệ: ${validDayOfWeeks.join(', ')}`
        };
    }

    return { isValid: true, type: 'dayofweek', value: dayOfWeekValue };
};

export default function XsmbPage() {
    const router = useRouter();
    const { dayOfWeek } = router.query;
    const [error, setError] = useState(null);
    const [isValidating, setIsValidating] = useState(true);

    // ✅ CẢI THIỆN: Validation logic - reset khi dayOfWeek thay đổi
    useEffect(() => {
        if (!router.isReady) return;

        // Reset states khi dayOfWeek thay đổi
        setError(null);
        setIsValidating(true);

        const validation = validateDayOfWeek(dayOfWeek);
        if (!validation.isValid) {
            setError(validation.error);
        }
        setIsValidating(false);

        // ✅ DEBUG: Log router changes
        console.log('🔄 Router dayOfWeek changed:', dayOfWeek);
    }, [dayOfWeek, router.isReady]);

    const station = 'xsmb';

    // ✅ DEBUG: Logging để debug
    console.log("Station:", station, "DayOfWeek:", dayOfWeek);
    console.log('DayOfWeek parameter---', dayOfWeek);

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

    // ✅ CẢI THIỆN: Xử lý dayOfWeek an toàn
    const validation = validateDayOfWeek(dayOfWeek);

    // ✅ DEBUG: Logging để debug
    console.log('🔍 DayOfWeek validation result:', validation);
    console.log('🔍 Props sẽ truyền cho KQXS:', {
        data3: null,
        data4: validation.type === 'dayofweek' ? validation.value : null,
        station: station
    });

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
                data4={validation.type === 'dayofweek' ? validation.value : null} // Thứ trong tuần
                station={station}
            />
            <div>
                <ThongKe></ThongKe>
                <CongCuHot />
            </div>
        </div>
    );
}

