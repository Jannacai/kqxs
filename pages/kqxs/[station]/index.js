import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
// import KQXS from '../../../component/item/KQXS';

export default function KQXSByStation() {
    const router = useRouter();
    const { station } = router.query;
    const [currentDate, setCurrentDate] = useState('');

    useEffect(() => {
        // Lấy ngày hiện tại và format thành DD-MM-YYYY
        const today = new Date();
        const day = String(today.getDate()).padStart(2, '0');
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const year = today.getFullYear();
        const formattedDate = `${day}-${month}-${year}`;
        setCurrentDate(formattedDate);
    }, []);

    return (
        <div>
            <KQXS station={station} date={currentDate}>{"Miền Bắc"}</KQXS>
        </div>
    );
} 