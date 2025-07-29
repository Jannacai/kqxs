


import Link from 'next/link';
import styles from '../../styles/DienDan.module.css';
import { useRouter } from 'next/router';

export default function NavBarDienDan() {
    const router = useRouter();

    return (
        <nav className={styles.headerNav}>
            <ul className={styles.headerNavList}>
                <li className={`${styles.headerNavItem} ${router.pathname === '/diendan' ? styles.active : ''}`}>
                    <Link className={styles.headerNavLink} href="/diendan">
                        🏠 Trang Chủ
                    </Link>
                </li>
                <li className={`${styles.headerNavItem} ${router.pathname.startsWith('/soi-cau') ? styles.active : ''}`}>
                    <Link className={styles.headerNavLink} href="/soicau">
                        🔮 Soi Cầu Vip
                    </Link>
                </li>
                <li className={`${styles.headerNavItem} ${router.pathname.startsWith('/thanh-vien') ? styles.active : ''}`}>
                    <Link className={styles.headerNavLink} href="/thanh-vien">
                        👥 Thành Viên
                    </Link>
                </li>
                <li className={`${styles.headerNavItem} ${router.pathname.startsWith('/cong-cu') ? styles.active : ''}`}>
                    <Link className={styles.headerNavLink} href="/cong-cu">
                        🛠️ Công Cụ Tạo Dàn Vip
                    </Link>
                </li>
            </ul>
        </nav>
    );
}

