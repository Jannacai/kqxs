import styles from "../styles/congcuHot.module.css";
import Link from "next/link";
import { useRouter } from "next/router";
import React from "react";
import logo from '../public/asset/img/hot.png';
import Image from 'next/image';

const CongCuHot = () => {
    const router = useRouter();

    const items = [
        { title: "Tạo dàn nhanh đặc biệt", href: "/tao-dan-dac-biet" },
        { title: "Tạo dàn 2D", href: "/taodanso/dan-2d/tao-dan-2d" },
        { title: "Tạo dàn 3D/4D", href: "/taodanso/dan-3d4d/tao-dan-3d4d" },
        { title: "Tạo dàn 9X0X ngẫu nhiên", href: "/TaoDanD/tao-dan-ngau-nhien9x0x/" },
        { title: "Soi cầu miền Bắc", href: "/soicau/soi-cau-mien-bac" },
        { title: "Soi cầu miền Trung", href: "/soicau/soi-cau-mien-trung" },
        { title: "Soi cầu miền Nam", href: "#" },
    ];

    return (
        <div>
            {/* <Image className={styles.hot} src={logo} alt='xổ số bắc trung nam' /> */}
            <div className={styles.container}>
                <h3 className={styles.title}>
                    <span className={styles.icon}><i class="fa-solid fa-fire"></i></span>
                    Công Cụ Hot
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

export default React.memo(CongCuHot);