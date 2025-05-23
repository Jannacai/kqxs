import styles from "../public/css/thongke.module.css";
import Link from "next/link";
import { useRouter } from "next/router";
import React from "react";
import logo from '../public/asset/img/hot.png';
import Image from 'next/image';

const ThongKe = () => {
    const router = useRouter();

    const items = [
        { title: "Thống Kê Lô Gan", href: "/thongke/logan" },
        { title: "Thống kê giải đặc biệt", href: "/thongke/giaidacbiet" },
        { title: "Thống kê đầu đuôi loto", href: "/thongke/dauduoi" },
        { title: "Bảng đặc biệt tuần/tháng", href: "/thongke/giaidacbiettuan" },
        { title: "Tần suất Loto", href: "/thongke/TanSuatLoto" },
        { title: "Tần suất Lô Cặp", href: "/thongke/TanSuatLoCap" },
    ];

    return (
        <div>
            {/* <Image className={styles.hot} src={logo} alt='xổ số bắc trung nam' /> */}
            <div className={styles.container}>
                <h3 className={styles.title}>
                    <span className={styles.icon}><i className="fa-solid fa-chart-simple"></i></span>
                    Thống Kê Hot
                </h3>
                <ul className={styles.list}>
                    {items.map((item, index) => (
                        <li key={index} className={styles.item}>
                            <Link
                                href={item.href}
                                className={`${styles.action_Link} ${router.pathname === item.href ? styles.active : ""}`}
                                title={item.title}
                            >
                                {item.title}
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        </div >
    );
};

export default React.memo(ThongKe);