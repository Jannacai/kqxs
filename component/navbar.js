import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import styles from '../public/css/navbar.module.css';
import { api } from '../pages/api/kqxs/kqxsMB';
import { useRouter } from 'next/router';

const NavBar = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const hasFetched = useRef(false);
    const router = useRouter();
    const { slug } = router.query;

    useEffect(() => {
        async function fetchDataOnce() {
            if (hasFetched.current) return;
            hasFetched.current = true;

            try {
                setLoading(true);
                const result = await api.getLottery('xsmb'); // Gọi API với station cố định
                const dataArray = Array.isArray(result) ? result : [result];
                const formattedData = dataArray.map(item => ({
                    ...item,

                }));
                setData(formattedData);
            } catch (error) {
                console.error('Lỗi:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchDataOnce();
    }, []);

    if (loading) return <div>Loading...</div>;

    return (
        <nav className={styles.navbar}>
            <ul className={styles.nav_list}>
                <li className={styles.nav_item}><Link href="/" className={styles.nav_itemLink}>Home</Link></li>
                <li className={styles.nav_item}><Link href="/xsmb" className={styles.nav_itemLink}>XSMB</Link>
                    <ul className={styles.nav__menu}>
                        <li><Link className={styles.nav_menuLink} href="/xsmb/thu-2">Thứ 2</Link></li>
                        <li><Link className={styles.nav_menuLink} href="/xsmb/thu-3">Thứ 3</Link></li>
                        <li><Link className={styles.nav_menuLink} href="/xsmb/thu-4">Thứ 4</Link></li>
                        <li><Link className={styles.nav_menuLink} href="/xsmb/thu-5">Thứ 5</Link></li>
                        <li><Link className={styles.nav_menuLink} href="/xsmb/thu-6">Thứ 6</Link></li>
                        <li><Link className={styles.nav_menuLink} href="/xsmb/thu-7">Thứ 7</Link></li>
                        <li><Link className={styles.nav_menuLink} href="/xsmb/chu-nhat">Chủ Nhật</Link></li>
                    </ul>
                </li>
                <li className={styles.nav_item}><Link href="/xsmn" className={styles.nav_itemLink}>XSMN</Link>
                    <ul className={styles.nav__menu}>
                        <li><Link className={styles.nav_menuLink} href="/xsmn-15-03-2025">Thứ 2</Link></li>
                        <li><Link className={styles.nav_menuLink} href="">Thứ 3</Link></li>
                        <li><Link className={styles.nav_menuLink} href="">Thứ 4</Link></li>
                        <li><Link className={styles.nav_menuLink} href="">Thứ 5</Link></li>
                        <li><Link className={styles.nav_menuLink} href="">Thứ 6</Link></li>
                        <li><Link className={styles.nav_menuLink} href="">Thứ 7</Link></li>
                        <li><Link className={styles.nav_menuLink} href="">Chủ Nhật</Link></li>
                    </ul>
                </li>
                <li className={styles.nav_item}><Link href="/xsmt" className={styles.nav_itemLink}>XSMT</Link>
                    <ul className={styles.nav__menu}>
                        <li><Link className={styles.nav_menuLink} href="/xsmt-thu-2">Thứ 2</Link></li>
                        <li><Link className={styles.nav_menuLink} href="">Thứ 3</Link></li>
                        <li><Link className={styles.nav_menuLink} href="">Thứ 4</Link></li>
                        <li><Link className={styles.nav_menuLink} href="">Thứ 5</Link></li>
                        <li><Link className={styles.nav_menuLink} href="">Thứ 6</Link></li>
                        <li><Link className={styles.nav_menuLink} href="">Thứ 7</Link></li>
                        <li><Link className={styles.nav_menuLink} href="">Chủ Nhật</Link></li>
                    </ul>
                </li>
                <li className={styles.nav_item}><Link href="/news" className={styles.nav_itemLink}>Tin TỨC</Link></li>
                <li className={styles.nav_item}><Link href="/soicau" className={styles.nav_itemLink}>Soi Cầu</Link></li>
                <li className={styles.nav_item}><Link href="/thongke" className={styles.nav_itemLink}>Thống kê</Link></li>
            </ul>
        </nav>
    );
};

export default NavBar;