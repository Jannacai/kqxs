import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import KQXS from './index';
import Calendar from '../../../component/caledar';
import styles from "../../../public/css/itemsKQXS.module.css";
import ThongKe from '../../../component/thongKe';
import CongCuHot from '../../../component/CongCuHot';
import ListXSMT from '../../../component/listXSMT';
import ListXSMB from '../../../component/listXSMB';
import ListXSMN from '../../../component/listXSMN';
import { LotteryProvider } from '../../../contexts/LotteryContext';

import Image from 'next/image';
// Giả lập API để lấy thông tin ngày


export default function XsmtPage() {
    const router = useRouter();
    const { tinh } = router.query; // slug sẽ là mảng hoặc undefined
    const [error, setError] = useState(null);
    console.log("tinh", tinh);
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
            <LotteryProvider>

                <KQXS tinh={tinh}></KQXS>
            </LotteryProvider>
            <div>
                <ThongKe></ThongKe>
                <CongCuHot />
            </div>
        </div>
    );
}

