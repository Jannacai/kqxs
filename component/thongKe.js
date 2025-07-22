import styles from "../public/css/thongke.module.css";
import Link from "next/link";
import { useRouter } from "next/router";
import React from "react";
import logo from '../public/asset/img/hot.png';
import Image from 'next/image';

const ThongKe = () => {
    const router = useRouter();

    const items = [
        { title: "Thống kê Lô Gan", href: "/thongke/lo-gan" },
        { title: "Thống kê Giải Đặc Biệt", href: "/thongke/giai-dac-biet" },
        { title: "Thống kê Đầu Đuôi Loto", href: "/thongke/dau-duoi" },
        { title: "Bảng đặc biệt tuần/tháng", href: "/thongke/giai-dac-biet-tuan" },
        { title: "Tần suất Loto", href: "/thongke/Tan-Suat-Lo-to" },
        { title: "Tần suất Lô Cặp", href: "/thongke/Tan-Suat-Lo-Cap" },
        { title: "Tần suất Lô Rơi", href: "#" },
        { title: "Tần suất Giải Đặc Biệt", href: "#" },
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
                        <li key={item.title} className={styles.item}>
                            <Link
                                href={item.href}
                                className={`${styles.action_Link} ${router.pathname === item.href ? styles.active : ""}`}
                                title={item.title}
                                onClick={(e) => item.href === '#' && e.preventDefault()}
                            >
                                {item.title}
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default React.memo(ThongKe);