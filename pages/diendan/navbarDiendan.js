


import Link from 'next/link';
import styles from '../../styles/DienDan.module.css';
import { useRouter } from 'next/router';

export default function NavBarDienDan() {
    const router = useRouter();

    return (
        <div className={styles.NavBarDienDan}>
            <nav className={styles.NavBarDienDan}>
                <ul className={styles.navListDienDan}>
                    <li className={`${styles.nav_item} ${router.pathname.startsWith('/diendan') ? styles.active : ''
                        }`}><Link className={styles.item} href="/diendan">Trang Chủ</Link></li>
                    <li className={`${styles.nav_item} ${router.pathname.startsWith('#') ? styles.active : ''
                        }`}><Link className={styles.item} href="#">Soi Cầu Vip</Link></li>
                    <li className={`${styles.nav_item} ${router.pathname.startsWith('#') ? styles.active : ''
                        }`}><Link className={styles.item} href="#">Thành Viên</Link></li>
                    <li className={`${styles.nav_item} ${router.pathname.startsWith('#') ? styles.active : ''
                        }`}><Link className={styles.item} href="#">Công Cụ Tạo Dàn Vip</Link></li>
                </ul>
            </nav>
        </div>
    );
}

