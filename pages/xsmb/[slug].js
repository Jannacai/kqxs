import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import KQXS from '../kqxsAll/index';
import Calendar from '../../component/caledar';
import styles from "../../public/css/itemsKQXS.module.css";
import ThongKe from '../../component/thongKe';
import CongCuHot from '../../component/CongCuHot';
import ListXSMT from '../../component/listXSMT';
import ListXSMB from '../../component/listXSMB';
import ListXSMN from '../../component/listXSMN';

import Image from 'next/image';

// ✅ CẢI THIỆN: Validation cho slug parameter - hỗ trợ cả thứ và ngày
const validateSlug = (slug) => {
    if (!slug) return { isValid: false, error: 'Không có thông tin ngày' };

    const slugValue = Array.isArray(slug) ? slug.join('-') : slug;

    // ✅ Kiểm tra xem có phải là thứ trong tuần không
    const validSlugs = ['thu-2', 'thu-3', 'thu-4', 'thu-5', 'thu-6', 'thu-7', 'chu-nhat'];
    if (validSlugs.includes(slugValue)) {
        return { isValid: true, type: 'dayofweek', value: slugValue };
    }

    // ✅ Kiểm tra xem có phải là ngày cụ thể không (format DD-MM-YYYY)
    const dateRegex = /^\d{2}-\d{2}-\d{4}$/;
    if (dateRegex.test(slugValue)) {
        // Kiểm tra ngày hợp lệ
        const [day, month, year] = slugValue.split('-').map(Number);
        const parsedDate = new Date(year, month - 1, day);

        if (isNaN(parsedDate.getTime())) {
            return {
                isValid: false,
                error: `Ngày không hợp lệ: ${slugValue}`
            };
        }

        // Không cho phép ngày trong tương lai
        const today = new Date();
        today.setHours(23, 59, 59, 999); // Cuối ngày hôm nay

        if (parsedDate > today) {
            return {
                isValid: false,
                error: `Không thể xem kết quả cho ngày trong tương lai: ${slugValue}`
            };
        }

        return { isValid: true, type: 'date', value: slugValue };
    }

    // ✅ Nếu không phải thứ cũng không phải ngày
    return {
        isValid: false,
        error: `Thông tin không hợp lệ: ${slugValue}. Hỗ trợ: thứ (thu-2, thu-3, etc.) hoặc ngày (DD-MM-YYYY)`
    };
};

export default function XsmbPage() {
    const router = useRouter();
    const { slug } = router.query;
    const [error, setError] = useState(null);
    const [isValidating, setIsValidating] = useState(true);

    // ✅ CẢI THIỆN: Validation logic - reset khi slug thay đổi
    useEffect(() => {
        if (!router.isReady) return;

        // Reset states khi slug thay đổi
        setError(null);
        setIsValidating(true);

        const validation = validateSlug(slug);
        if (!validation.isValid) {
            setError(validation.error);
        }
        setIsValidating(false);

        // ✅ DEBUG: Log router changes
        console.log('🔄 Router slug changed:', slug);
    }, [slug, router.isReady]);

    const station = 'xsmb';

    // ✅ CẢI THIỆN: Logging để debug
    console.log("Station:", station, "Slug:", slug);
    console.log('Slug Date---', slug);

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

    // ✅ CẢI THIỆN: Xử lý slug an toàn - hỗ trợ cả thứ và ngày
    const validation = validateSlug(slug);

    // ✅ DEBUG: Logging để debug
    console.log('🔍 Slug validation result:', validation);
    console.log('🔍 Props sẽ truyền cho KQXS:', {
        data3: validation.type === 'date' ? validation.value : null,
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
                data3={validation.type === 'date' ? validation.value : null} // Ngày cụ thể nếu là date
                data4={validation.type === 'dayofweek' ? validation.value : null} // Thứ trong tuần nếu là dayofweek
                station={station}
            />
            <div>
                <ThongKe></ThongKe>
                <CongCuHot />
            </div>
        </div>
    );
}

