import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import styles from '../public/css/navbar.module.css';
import UserAvatar from './UserAvatar';
import { useRouter } from 'next/router';
import logo from '../public/asset/img/LOGOxsmn_win.png';
import Image from 'next/image';
import { useSession } from 'next-auth/react'; // Thêm useSession

const NavBar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isMenuOpenList, setIsMenuOpenList] = useState('');
    const scrollPositionRef = useRef(0);
    const router = useRouter();
    const { status } = useSession(); // Lấy trạng thái đăng nhập từ NextAuth

    useEffect(() => {
        if (isMenuOpen) {
            scrollPositionRef.current = window.scrollY;
            document.body.classList.add('navbar-open');
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollPositionRef.current}px`;
            document.body.style.width = '100%';
            document.body.style.overflow = 'hidden';
        } else {
            document.body.classList.remove('navbar-open');
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            document.body.style.overflow = '';
            window.scrollTo(0, scrollPositionRef.current);
        }

        const handlePopstate = () => {
            if (isMenuOpen) {
                setTimeout(() => {
                    setIsMenuOpen(false);
                    setIsMenuOpenList('');
                }, 400);
            }
        };

        window.addEventListener('popstate', handlePopstate);

        return () => {
            window.removeEventListener('popstate', handlePopstate);
            document.body.classList.remove('navbar-open');
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            document.body.style.overflow = '';
        };
    }, [isMenuOpen]);

    const toggleMenu = () => {
        setIsMenuOpen((prev) => {
            if (prev) {
                setIsMenuOpenList('');
            }
            return !prev;
        });
    };

    const toggleMenuList = (menuId) => {
        setIsMenuOpenList(isMenuOpenList === menuId ? '' : menuId);
    };

    return (
        <div>
            <span className={styles.iconMenu} onClick={toggleMenu}>
                <i className="fa-solid fa-bars"></i>
            </span>
            {/* Nav Bar Ngang */}
            <div className={styles.NavbarMobileNgang}>
                <ul className={styles.nav_listNgang}>
                    <li
                        className={`${styles.nav_itemNgang} ${router.pathname.startsWith('/ket-qua-xo-so-mien-bac') ? styles.active : ''
                            }`}
                    >
                        <Link href="/ket-qua-xo-so-mien-bac" className={styles.nav_itemLinkNgang}>
                            XSMB
                        </Link>
                    </li>
                    <li
                        className={`${styles.nav_itemNgang} ${router.pathname.startsWith('/ket-qua-xo-so-mien-nam') ? styles.active : ''
                            }`}
                    >
                        <Link href="/ket-qua-xo-so-mien-nam" className={styles.nav_itemLinkNgang}>
                            XSMN
                        </Link>
                    </li>
                    <li
                        className={`${styles.nav_itemNgang} ${router.pathname.startsWith('/ket-qua-xo-so-mien-trung') ? styles.active : ''
                            }`}
                    >
                        <Link href="/ket-qua-xo-so-mien-trung" className={styles.nav_itemLinkNgang}>
                            XSMT
                        </Link>
                    </li>
                    <li
                        className={`${styles.nav_itemNgang} ${router.pathname.startsWith('/thongke') ? styles.active : ''
                            }`}
                    >
                        <Link href="/thongke/lo-gan" className={styles.nav_itemLinkNgang}>
                            Thống kê
                        </Link>
                    </li>
                    <li
                        className={`${styles.nav_itemNgang} ${router.pathname.startsWith('/tao-dan-de-dac-biet') ? styles.active : ''
                            }`}
                    >
                        <Link href="/tao-dan-de-dac-biet/" className={styles.nav_itemLinkNgang}>
                            Tạo Dàn
                        </Link>
                    </li>
                    <li
                        className={`${styles.nav_itemNgang} ${router.pathname.startsWith('/tin-tuc') ? styles.active : ''
                            }`}
                    >
                        <Link href="/tin-tuc" className={styles.nav_itemLinkNgang}>
                            Tin Tức
                        </Link>
                    </li>
                    <li
                        className={`${styles.nav_itemNgang} ${router.pathname === '/soicau/soi-cau-mien-bac' ? styles.active : ''
                            }`}
                    >
                        <Link href="/soicau/soi-cau-mien-bac" className={styles.nav_itemLinkNgang}>
                            Soi Cầu
                        </Link>
                    </li>
                    <li
                        className={`${styles.nav_itemNgang} ${router.pathname.startsWith('/quaythu') ? styles.active : ''
                            }`}
                    >
                        <Link href="#" className={styles.nav_itemLinkNgang}>
                            Quay Thử
                        </Link>
                    </li>
                    <li
                        className={`${styles.nav_itemNgang} ${router.pathname === '/diendan' ? styles.active : ''
                            }`}
                    >
                        <Link href="#" className={styles.nav_itemLinkNgang}>
                            Diễn Đàn
                        </Link>
                    </li>
                </ul>
            </div>

            {/* Tablet Mobile */}
            <div className={`${styles.mobileNavbar} ${!isMenuOpen ? styles.hidden : ''}`}>
                <div
                    onClick={toggleMenu}
                    className={`${styles.overlay} ${isMenuOpen ? styles.menuOpen : ''}`}
                ></div>
                <div className={`${styles.menuDrawer} ${isMenuOpen ? styles.menuOpen : ''}`}>
                    <div className={styles.header__logo}>
                        <Image
                            className={styles.header__logo__img}
                            src={logo}
                            alt="xổ số bắc trung nam"
                        />
                    </div>
                    <div className={styles.scrollableMenu}>
                        <nav className={styles.navbarMobile}>
                            <ul className={styles.nav_listMobile}>
                                <li
                                    className={`${styles.nav_itemMobile} ${router.pathname === '/' ? styles.active : ''
                                        }`}
                                >
                                    <div className={styles.grouplinkMobile}>
                                        <Link
                                            href="/"
                                            className={styles.nav_itemLinkMobile}
                                            onClick={toggleMenu}
                                        >
                                            <span className={styles.iconNav}>
                                                <i className="fa-solid fa-house-circle-check"></i>
                                            </span>{' '}
                                            Home
                                        </Link>
                                    </div>
                                </li>
                                <li
                                    className={`${styles.nav_itemMobile} ${router.pathname.startsWith('/ket-qua-xo-so-mien-bac') ? styles.active : ''
                                        }`}
                                >
                                    <div className={styles.grouplinkMobile}>
                                        <Link
                                            href="/ket-qua-xo-so-mien-bac"
                                            className={styles.nav_itemLinkMobile}
                                            onClick={toggleMenu}
                                        >
                                            <span className={styles.iconNav}>
                                                <i className="fa-solid fa-globe"></i>
                                            </span>{' '}
                                            XSMB
                                        </Link>
                                        <span onClick={() => toggleMenuList('xsmb')} className={styles.icon}>
                                            <i
                                                className={`fa-solid ${isMenuOpenList === 'xsmb' ? 'fa-chevron-up' : 'fa-chevron-down'
                                                    }`}
                                            ></i>
                                        </span>
                                    </div>
                                    <ul
                                        className={`${styles.nav__menuMobile} ${isMenuOpenList === 'xsmb' ? styles.menuList : ''
                                            }`}
                                    >
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === '/xsmb/xo-so-mien-bac/thu-2' ? styles.active : ''
                                                    }`}
                                                href="/xsmb/xo-so-mien-bac/thu-2"
                                                onClick={toggleMenu}
                                            >
                                                Thứ 2
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === '/xsmb/xo-so-mien-bac/thu-3' ? styles.active : ''
                                                    }`}
                                                href="/xsmb/xo-so-mien-bac/thu-3"
                                                onClick={toggleMenu}
                                            >
                                                Thứ 3
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === '/xsmb/xo-so-mien-bac/thu-4' ? styles.active : ''
                                                    }`}
                                                href="/xsmb/xo-so-mien-bac/thu-4"
                                                onClick={toggleMenu}
                                            >
                                                Thứ 4
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === '/xsmb/xo-so-mien-bac/thu-5' ? styles.active : ''
                                                    }`}
                                                href="/xsmb/xo-so-mien-bac/thu-5"
                                                onClick={toggleMenu}
                                            >
                                                Thứ 5
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === '/xsmb/xo-so-mien-bac/thu-6' ? styles.active : ''
                                                    }`}
                                                href="/xsmb/xo-so-mien-bac/thu-6"
                                                onClick={toggleMenu}
                                            >
                                                Thứ 6
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === '/xsmb/xo-so-mien-bac/thu-7' ? styles.active : ''
                                                    }`}
                                                href="/xsmb/xo-so-mien-bac/thu-7"
                                                onClick={toggleMenu}
                                            >
                                                Thứ 7
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === '/xsmb/xo-so-mien-bac/chu-nhat'
                                                    ? styles.active
                                                    : ''
                                                    }`}
                                                href="/xsmb/xo-so-mien-bac/chu-nhat"
                                                onClick={toggleMenu}
                                            >
                                                Chủ Nhật
                                            </Link>
                                        </li>
                                    </ul>
                                </li>
                                <li
                                    className={`${styles.nav_itemMobile} ${router.pathname.startsWith('/ket-qua-xo-so-mien-nam') ? styles.active : ''
                                        }`}
                                >
                                    <div className={styles.grouplinkMobile}>
                                        <Link
                                            href="/ket-qua-xo-so-mien-nam"
                                            className={styles.nav_itemLinkMobile}
                                            onClick={toggleMenu}
                                        >
                                            <span className={styles.iconNav}>
                                                <i className="fa-solid fa-globe"></i>
                                            </span>{' '}
                                            XSMN
                                        </Link>
                                        <span onClick={() => toggleMenuList('xsmn')} className={styles.icon}>
                                            <i
                                                className={`fa-solid ${isMenuOpenList === 'xsmn' ? 'fa-chevron-up' : 'fa-chevron-down'
                                                    }`}
                                            ></i>
                                        </span>
                                    </div>
                                    <ul
                                        className={`${styles.nav__menuMobile} ${isMenuOpenList === 'xsmn' ? styles.menuList : ''
                                            }`}
                                    >
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === '/xsmn/thu-2' ? styles.active : ''
                                                    }`}
                                                href="/xsmn/thu-2"
                                                onClick={toggleMenu}
                                            >
                                                Thứ 2
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === '/xsmn/thu-3' ? styles.active : ''
                                                    }`}
                                                href="/xsmn/thu-3"
                                                onClick={toggleMenu}
                                            >
                                                Thứ 3
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === '/xsmn/thu-4' ? styles.active : ''
                                                    }`}
                                                href="/xsmn/thu-4"
                                                onClick={toggleMenu}
                                            >
                                                Thứ 4
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === '/xsmn/thu-5' ? styles.active : ''
                                                    }`}
                                                href="/xsmn/thu-5"
                                                onClick={toggleMenu}
                                            >
                                                Thứ 5
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === '/xsmn/thu-6' ? styles.active : ''
                                                    }`}
                                                href="/xsmn/thu-6"
                                                onClick={toggleMenu}
                                            >
                                                Thứ 6
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === '/xsmn/thu-7' ? styles.active : ''
                                                    }`}
                                                href="/xsmn/thu-7"
                                                onClick={toggleMenu}
                                            >
                                                Thứ 7
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === '/xsmn/chu-nhat' ? styles.active : ''
                                                    }`}
                                                href="/xsmn/chu-nhat"
                                                onClick={toggleMenu}
                                            >
                                                Chủ Nhật
                                            </Link>
                                        </li>
                                    </ul>
                                </li>
                                <li
                                    className={`${styles.nav_itemMobile} ${router.pathname.startsWith('/ket-qua-xo-so-mien-trung') ? styles.active : ''
                                        }`}
                                >
                                    <div className={styles.grouplinkMobile}>
                                        <Link
                                            href="/ket-qua-xo-so-mien-trung"
                                            className={styles.nav_itemLinkMobile}
                                            onClick={toggleMenu}
                                        >
                                            <span className={styles.iconNav}>
                                                <i className="fa-solid fa-globe"></i>
                                            </span>{' '}
                                            XSMT
                                        </Link>
                                        <span onClick={() => toggleMenuList('xsmt')} className={styles.icon}>
                                            <i
                                                className={`fa-solid ${isMenuOpenList === 'xsmt' ? 'fa-chevron-up' : 'fa-chevron-down'
                                                    }`}
                                            ></i>
                                        </span>
                                    </div>
                                    <ul
                                        className={`${styles.nav__menuMobile} ${isMenuOpenList === 'xsmt' ? styles.menuList : ''
                                            }`}
                                    >
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === '/xsmt/xo-so-mien-trung/thu-2'
                                                    ? styles.active
                                                    : ''
                                                    }`}
                                                href="/xsmt/xo-so-mien-trung/thu-2"
                                                onClick={toggleMenu}
                                            >
                                                Thứ 2
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === '/xsmt/xo-so-mien-trung/thu-3'
                                                    ? styles.active
                                                    : ''
                                                    }`}
                                                href="/xsmt/xo-so-mien-trung/thu-3"
                                                onClick={toggleMenu}
                                            >
                                                Thứ 3
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === '/xsmt/xo-so-mien-trung/thu-4'
                                                    ? styles.active
                                                    : ''
                                                    }`}
                                                href="/xsmt/xo-so-mien-trung/thu-4"
                                                onClick={toggleMenu}
                                            >
                                                Thứ 4
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === '/xsmt/xo-so-mien-trung/thu-5'
                                                    ? styles.active
                                                    : ''
                                                    }`}
                                                href="/xsmt/xo-so-mien-trung/thu-5"
                                                onClick={toggleMenu}
                                            >
                                                Thứ 5
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === '/xsmt/xo-so-mien-trung/thu-6'
                                                    ? styles.active
                                                    : ''
                                                    }`}
                                                href="/xsmt/xo-so-mien-trung/thu-6"
                                                onClick={toggleMenu}
                                            >
                                                Thứ 6
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === '/xsmt/xo-so-mien-trung/thu-7'
                                                    ? styles.active
                                                    : ''
                                                    }`}
                                                href="/xsmt/xo-so-mien-trung/thu-7"
                                                onClick={toggleMenu}
                                            >
                                                Thứ 7
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === '/xsmt/xo-so-mien-trung/chu-nhat'
                                                    ? styles.active
                                                    : ''
                                                    }`}
                                                href="/xsmt/xo-so-mien-trung/chu-nhat"
                                                onClick={toggleMenu}
                                            >
                                                Chủ Nhật
                                            </Link>
                                        </li>
                                    </ul>
                                </li>
                                <li
                                    className={`${styles.nav_itemMobile} ${router.pathname.startsWith('/thongke') ? styles.active : ''
                                        }`}
                                >
                                    <div className={styles.grouplinkMobile}>
                                        <Link
                                            href="/thongke/lo-gan"
                                            className={styles.nav_itemLinkMobile}
                                            onClick={toggleMenu}
                                        >
                                            <span className={styles.iconNav}>
                                                <i className="fa-solid fa-layer-group"></i>
                                            </span>{' '}
                                            Thống Kê
                                        </Link>
                                        <span onClick={() => toggleMenuList('thongke')} className={styles.icon}>
                                            <i
                                                className={`fa-solid ${isMenuOpenList === 'thongke' ? 'fa-chevron-up' : 'fa-chevron-down'
                                                    }`}
                                            ></i>
                                        </span>
                                    </div>
                                    <ul
                                        className={`${styles.nav__menuMobile} ${isMenuOpenList === 'thongke' ? styles.menuList : ''
                                            }`}
                                    >
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === '/thongke/lo-gan' ? styles.active : ''
                                                    }`}
                                                href="/thongke/lo-gan"
                                                onClick={toggleMenu}
                                            >
                                                Thống Kê Logan
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === '/thongke/giai-dac-biet' ? styles.active : ''
                                                    }`}
                                                href="/thongke/giai-dac-biet"
                                                onClick={toggleMenu}
                                            >
                                                Thống Kê giải đặc biệt
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === '/thongke/dau-duoi' ? styles.active : ''
                                                    }`}
                                                href="/thongke/dau-duoi"
                                                onClick={toggleMenu}
                                            >
                                                Thống Kê đầu đuôi loto
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === '/thongke/giai-dac-biet-tuan' ? styles.active : ''
                                                    }`}
                                                href="/thongke/giai-dac-biet-tuan"
                                                onClick={toggleMenu}
                                            >
                                                Bảng đặc biệt tuần/tháng
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === '/thongke/Tan-Suat-Lo-to' ? styles.active : ''
                                                    }`}
                                                href="/thongke/Tan-Suat-Lo-to"
                                                onClick={toggleMenu}
                                            >
                                                Tần Suất Loto
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === '/thongke/Tan-Suat-Lo-Cap' ? styles.active : ''
                                                    }`}
                                                href="/thongke/Tan-Suat-Lo-Cap"
                                                onClick={toggleMenu}
                                            >
                                                Tần Suất Lô Cặp
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === '#' ? styles.active : ''
                                                    }`}
                                                href="#"
                                                onClick={toggleMenu}
                                            >
                                                Tần suất giải đặc biệt
                                            </Link>
                                        </li>
                                    </ul>
                                </li>
                                <li
                                    className={`${styles.nav_itemMobile} ${router.pathname.startsWith('/tao-dan-de-dac-biet') ? styles.active : ''
                                        }`}
                                >
                                    <div className={styles.grouplinkMobile}>
                                        <Link
                                            href="/tao-dan-de-dac-biet/"
                                            className={styles.nav_itemLinkMobile}
                                            onClick={toggleMenu}
                                        >
                                            <span className={styles.iconNav}>
                                                <i className="fa-solid fa-marker"></i>
                                            </span>{' '}
                                            Tạo Dàn
                                        </Link>
                                        <span
                                            onClick={() => toggleMenuList('tao-dan-de-dac-biet')}
                                            className={styles.icon}
                                        >
                                            <i
                                                className={`fa-solid ${isMenuOpenList === 'tao-dan-de-dac-biet'
                                                    ? 'fa-chevron-up'
                                                    : 'fa-chevron-down'
                                                    }`}
                                            ></i>
                                        </span>
                                    </div>
                                    <ul
                                        className={`${styles.nav__menuMobile} ${isMenuOpenList === 'tao-dan-de-dac-biet' ? styles.menuList : ''
                                            }`}
                                    >
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === '/tao-dan-de-dac-biet' ? styles.active : ''
                                                    }`}
                                                href="/tao-dan-de-dac-biet/"
                                                onClick={toggleMenu}
                                            >
                                                Tạo Nhanh Dàn Đặc Biệt
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === '/taodande/dan-2d/tao-dan-de-2d'
                                                    ? styles.active
                                                    : ''
                                                    }`}
                                                href="/taodande/dan-2d/tao-dan-de-2d"
                                                onClick={toggleMenu}
                                            >
                                                Tạo Dàn 2D
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === '/taodande/dan-3d4d/tao-dan-de-3d4d'
                                                    ? styles.active
                                                    : ''
                                                    }`}
                                                href="/taodande/dan-3d4d/tao-dan-de-3d4d"
                                                onClick={toggleMenu}
                                            >
                                                Tạo Dàn 3D-4D
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === '/taodande/tao-dan-ngau-nhien9x0x'
                                                    ? styles.active
                                                    : ''
                                                    }`}
                                                href="/taodande/tao-dan-ngau-nhien9x0x/"
                                                onClick={toggleMenu}
                                            >
                                                Tạo Dàn 9X0X Ngẫu Nhiên
                                            </Link>
                                        </li>
                                    </ul>
                                </li>
                                <li
                                    className={`${styles.nav_itemMobile} ${router.pathname.startsWith('/tin-tuc') ? styles.active : ''
                                        }`}
                                >
                                    <div className={styles.grouplinkMobile}>
                                        <Link
                                            href="/tin-tuc"
                                            className={styles.nav_itemLinkMobile}
                                            onClick={toggleMenu}
                                        >
                                            <span className={styles.iconNav}>
                                                <i className="fa-solid fa-newspaper"></i>
                                            </span>{' '}
                                            Tin Tức
                                        </Link>
                                        <span onClick={() => toggleMenuList('tin-tuc')} className={styles.icon}>
                                            <i
                                                className={`fa-solid ${isMenuOpenList === 'tin-tuc' ? 'fa-chevron-up' : 'fa-chevron-down'
                                                    }`}
                                            ></i>
                                        </span>
                                    </div>
                                    <ul
                                        className={`${styles.nav__menuMobile} ${isMenuOpenList === 'tin-tuc' ? styles.menuList : ''
                                            }`}
                                    >
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === '#' ? styles.active : ''
                                                    }`}
                                                href="#"
                                                onClick={toggleMenu}
                                            >
                                                Bóng Đá Mới Nhất
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === '#' ? styles.active : ''
                                                    }`}
                                                href="#"
                                                onClick={toggleMenu}
                                            >
                                                Đời Sống
                                            </Link>
                                        </li>
                                    </ul>
                                </li>
                                <li
                                    className={`${styles.nav_itemMobile} ${router.pathname === '/soicau/soi-cau-mien-bac' ? styles.active : ''
                                        }`}
                                >
                                    <div className={styles.grouplinkMobile}>
                                        <Link
                                            href="/soicau/soi-cau-mien-bac"
                                            className={styles.nav_itemLinkMobile}
                                            onClick={toggleMenu}
                                        >
                                            <span className={styles.iconNav}>
                                                <i className="fa-solid fa-splotch"></i>
                                            </span>{' '}
                                            Soi Cầu
                                        </Link>
                                        <span onClick={() => toggleMenuList('soicau')} className={styles.icon}>
                                            <i
                                                className={`fa-solid ${isMenuOpenList === 'soicau' ? 'fa-chevron-up' : 'fa-chevron-down'
                                                    }`}
                                            ></i>
                                        </span>
                                    </div>
                                    <ul
                                        className={`${styles.nav__menuMobile} ${isMenuOpenList === 'soicau' ? styles.menuList : ''
                                            }`}
                                    >
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === '/soicau/soi-cau-mien-bac' ? styles.active : ''
                                                    }`}
                                                href="/soicau/soi-cau-mien-bac"
                                                onClick={toggleMenu}
                                            >
                                                Soi Cầu Miền Bắc
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === '/soicau/soi-cau-mien-trung' ? styles.active : ''
                                                    }`}
                                                href="/soicau/soi-cau-mien-trung"
                                                onClick={toggleMenu}
                                            >
                                                Soi Cầu Miền Trung
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === '#' ? styles.active : ''
                                                    }`}
                                                href="#"
                                                onClick={toggleMenu}
                                            >
                                                Soi Cầu Miền Nam
                                            </Link>
                                        </li>
                                    </ul>
                                </li>
                                <li
                                    className={`${styles.nav_itemMobile} ${router.pathname.startsWith('/quaythu') ? styles.active : ''
                                        }`}
                                >
                                    <div className={styles.grouplinkMobile}>
                                        <Link
                                            href="#"
                                            className={styles.nav_itemLinkMobile}
                                            onClick={toggleMenu}
                                        >
                                            <span className={styles.iconNav}>
                                                <i className="fa-solid fa-arrows-spin"></i>
                                            </span>{' '}
                                            Quay Thử
                                        </Link>
                                        <span onClick={() => toggleMenuList('quaythu')} className={styles.icon}>
                                            <i
                                                className={`fa-solid ${isMenuOpenList === 'quaythu' ? 'fa-chevron-up' : 'fa-chevron-down'
                                                    }`}
                                            ></i>
                                        </span>
                                    </div>
                                    <ul
                                        className={`${styles.nav__menuMobile} ${isMenuOpenList === 'quaythu' ? styles.menuList : ''
                                            }`}
                                    >
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === '/quaythu/mienbac' ? styles.active : ''
                                                    }`}
                                                href="#"
                                                onClick={toggleMenu}
                                            >
                                                Quay Thử XSMB
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === '/quaythu/mientrung' ? styles.active : ''
                                                    }`}
                                                href="#"
                                                onClick={toggleMenu}
                                            >
                                                Quay Thử XSMT
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === 'quaythu/miennam' ? styles.active : ''
                                                    }`}
                                                href="#"
                                                onClick={toggleMenu}
                                            >
                                                Quay Thử XSMN
                                            </Link>
                                        </li>
                                    </ul>
                                </li>
                                <li
                                    className={`${styles.nav_itemMobile} ${router.pathname === '/diendan' ? styles.active : ''
                                        }`}
                                >
                                    <div className={styles.grouplinkMobile}>
                                        <Link
                                            href="#"
                                            className={styles.nav_itemLinkMobile}
                                            onClick={toggleMenu}
                                        >
                                            <span className={styles.iconNav}>
                                                <i className="fa-solid fa-people-roof"></i>
                                            </span>{' '}
                                            Diễn Đàn
                                        </Link>
                                    </div>
                                </li>
                                <li
                                    className={`${styles.nav_itemMobile} ${status === 'authenticated'
                                        ? router.pathname === '/dang-bai-viet'
                                        : router.pathname === '/login'
                                            ? styles.active
                                            : ''
                                        }`}
                                >
                                    <div className={styles.grouplinkMobile}>
                                        <Link
                                            href={status === 'authenticated' ? '/dang-bai-viet' : '/login'}
                                            className={styles.nav_itemLinkMobile}
                                            onClick={toggleMenu}
                                        >
                                            <span className={styles.iconNav}>
                                                <i
                                                    className={`fa-solid ${status === 'authenticated' ? 'fa-pen-to-square' : 'fa-user-plus'
                                                        }`}
                                                ></i>
                                            </span>
                                            {status === 'authenticated' ? 'Đăng bài viết mới' : 'Đăng Nhập'}
                                        </Link>
                                    </div>
                                </li>
                            </ul>
                            <UserAvatar />
                        </nav>
                    </div>
                </div>
            </div>
            {/* PC header */}
            <div>
                <nav className={styles.navbar}>
                    <div className="container">
                        <ul className={styles.nav_list}>
                            <li
                                className={`${styles.nav_item} ${router.pathname === '/' ? styles.active : ''}`}
                            >
                                <div className={styles.grouplink}>
                                    <span className={styles.icon}>
                                        <i className="fa-solid fa-house-circle-check"></i>
                                    </span>
                                    <Link href="/" className={styles.nav_itemLink}>
                                        Home
                                    </Link>
                                </div>
                            </li>
                            <li
                                className={`${styles.nav_item} ${router.pathname.startsWith('/ket-qua-xo-so-mien-bac') ? styles.active : ''
                                    }`}
                            >
                                <div className={styles.grouplink}>
                                    <Link href="/ket-qua-xo-so-mien-bac" className={styles.nav_itemLink}>
                                        XSMB
                                    </Link>
                                    <span className={styles.icon}>
                                        <i className="fa-solid fa-chevron-down"></i>
                                    </span>
                                </div>
                                <ul className={styles.nav__menu}>
                                    <li>
                                        <Link className={styles.nav_menuLink} href="/xsmb/xo-so-mien-bac/thu-2">
                                            Thứ 2
                                        </Link>
                                    </li>
                                    <li>
                                        <Link className={styles.nav_menuLink} href="/xsmb/xo-so-mien-bac/thu-3">
                                            Thứ 3
                                        </Link>
                                    </li>
                                    <li>
                                        <Link className={styles.nav_menuLink} href="/xsmb/xo-so-mien-bac/thu-4">
                                            Thứ 4
                                        </Link>
                                    </li>
                                    <li>
                                        <Link className={styles.nav_menuLink} href="/xsmb/xo-so-mien-bac/thu-5">
                                            Thứ 5
                                        </Link>
                                    </li>
                                    <li>
                                        <Link className={styles.nav_menuLink} href="/xsmb/xo-so-mien-bac/thu-6">
                                            Thứ 6
                                        </Link>
                                    </li>
                                    <li>
                                        <Link className={styles.nav_menuLink} href="/xsmb/xo-so-mien-bac/thu-7">
                                            Thứ 7
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            className={styles.nav_menuLink}
                                            href="/xsmb/xo-so-mien-bac/chu-nhat"
                                        >
                                            Chủ Nhật
                                        </Link>
                                    </li>
                                </ul>
                            </li>
                            <li
                                className={`${styles.nav_item} ${router.pathname.startsWith('/ket-qua-xo-so-mien-nam') ? styles.active : ''
                                    }`}
                            >
                                <div className={styles.grouplink}>
                                    <Link href="/ket-qua-xo-so-mien-nam" className={styles.nav_itemLink}>
                                        XSMN
                                    </Link>
                                    <span className={styles.icon}>
                                        <i className="fa-solid fa-chevron-down"></i>
                                    </span>
                                </div>
                                <ul className={styles.nav__menu}>
                                    <li>
                                        <Link className={styles.nav_menuLink} href="/xsmn/thu-2">
                                            Thứ 2
                                        </Link>
                                    </li>
                                    <li>
                                        <Link className={styles.nav_menuLink} href="/xsmn/thu-3">
                                            Thứ 3
                                        </Link>
                                    </li>
                                    <li>
                                        <Link className={styles.nav_menuLink} href="/xsmn/thu-4">
                                            Thứ 4
                                        </Link>
                                    </li>
                                    <li>
                                        <Link className={styles.nav_menuLink} href="/xsmn/thu-5">
                                            Thứ 5
                                        </Link>
                                    </li>
                                    <li>
                                        <Link className={styles.nav_menuLink} href="/xsmn/thu-6">
                                            Thứ 6
                                        </Link>
                                    </li>
                                    <li>
                                        <Link className={styles.nav_menuLink} href="/xsmn/thu-7">
                                            Thứ 7
                                        </Link>
                                    </li>
                                    <li>
                                        <Link className={styles.nav_menuLink} href="/xsmn/chu-nhat">
                                            Chủ Nhật
                                        </Link>
                                    </li>
                                </ul>
                            </li>
                            <li
                                className={`${styles.nav_item} ${router.pathname.startsWith('/ket-qua-xo-so-mien-trung') ? styles.active : ''
                                    }`}
                            >
                                <div className={styles.grouplink}>
                                    <Link href="/ket-qua-xo-so-mien-trung" className={styles.nav_itemLink}>
                                        XSMT
                                    </Link>
                                    <span className={styles.icon}>
                                        <i className="fa-solid fa-chevron-down"></i>
                                    </span>
                                </div>
                                <ul className={styles.nav__menu}>
                                    <li>
                                        <Link
                                            className={styles.nav_menuLink}
                                            href="/xsmt/xo-so-mien-trung/thu-2"
                                        >
                                            Thứ 2
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            className={styles.nav_menuLink}
                                            href="/xsmt/xo-so-mien-trung/thu-3"
                                        >
                                            Thứ 3
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            className={styles.nav_menuLink}
                                            href="/xsmt/xo-so-mien-trung/thu-4"
                                        >
                                            Thứ 4
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            className={styles.nav_menuLink}
                                            href="/xsmt/xo-so-mien-trung/thu-5"
                                        >
                                            Thứ 5
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            className={styles.nav_menuLink}
                                            href="/xsmt/xo-so-mien-trung/thu-6"
                                        >
                                            Thứ 6
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            className={styles.nav_menuLink}
                                            href="/xsmt/xo-so-mien-trung/thu-7"
                                        >
                                            Thứ 7
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            className={styles.nav_menuLink}
                                            href="/xsmt/xo-so-mien-trung/chu-nhat"
                                        >
                                            Chủ Nhật
                                        </Link>
                                    </li>
                                </ul>
                            </li>
                            <li
                                className={`${styles.nav_item} ${router.pathname.startsWith('/thongke') ? styles.active : ''
                                    }`}
                            >
                                <div className={styles.grouplink}>
                                    <Link href="/thongke/lo-gan" className={styles.nav_itemLink}>
                                        Thống kê
                                    </Link>
                                    <span className={styles.icon}>
                                        <i className="fa-solid fa-chevron-down"></i>
                                    </span>
                                </div>
                                <ul className={styles.nav__menu}>
                                    <li>
                                        <Link className={styles.nav_menuLink} href="/thongke/lo-gan">
                                            Thống Kê Logan
                                        </Link>
                                    </li>
                                    <li>
                                        <Link className={styles.nav_menuLink} href="/thongke/giai-dac-biet">
                                            Thống Kê giải đặc biệt
                                        </Link>
                                    </li>
                                    <li>
                                        <Link className={styles.nav_menuLink} href="/thongke/dau-duoi">
                                            Thống Kê đầu đuôi loto
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            className={styles.nav_menuLink}
                                            href="/thongke/giai-dac-biet-tuan"
                                        >
                                            Bảng đặc biệt tuần/tháng
                                        </Link>
                                    </li>
                                    <li>
                                        <Link className={styles.nav_menuLink} href="/thongke/Tan-Suat-Lo-to">
                                            Tần Suất Loto
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            className={styles.nav_menuLink}
                                            href="/thongke/Tan-Suat-Lo-Cap"
                                        >
                                            Tần Suất Lô Cặp
                                        </Link>
                                    </li>
                                </ul>
                            </li>
                            <li
                                className={`${styles.nav_item} ${router.pathname.startsWith('/tao-dan-de-dac-biet') ? styles.active : ''
                                    }`}
                            >
                                <div className={styles.grouplink}>
                                    <Link href="/tao-dan-de-dac-biet/" className={styles.nav_itemLink}>
                                        Tạo Dàn
                                    </Link>
                                    <span className={styles.icon}>
                                        <i className="fa-solid fa-chevron-down"></i>
                                    </span>
                                </div>
                                <ul className={styles.nav__menu}>
                                    <li>
                                        <Link className={styles.nav_menuLink} href="/tao-dan-de-dac-biet/">
                                            Tạo Nhanh Dàn Đặc Biệt
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            className={styles.nav_menuLink}
                                            href="/taodande/dan-2d/tao-dan-de-2d"
                                        >
                                            Tạo Dàn 2D
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            className={styles.nav_menuLink}
                                            href="/taodande/dan-3d4d/tao-dan-de-3d4d"
                                        >
                                            Tạo Dàn 3D-4D
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            className={styles.nav_menuLink}
                                            href="/taodande/tao-dan-ngau-nhien9x0x/"
                                        >
                                            Tạo Dàn 9X0X Ngẫu Nhiên
                                        </Link>
                                    </li>
                                </ul>
                            </li>
                            <li
                                className={`${styles.nav_item} ${router.pathname.startsWith('/tin-tuc') ? styles.active : ''
                                    }`}
                            >
                                <div className={styles.grouplink}>
                                    <Link href="/tin-tuc" className={styles.nav_itemLink}>
                                        Tin Tức
                                    </Link>
                                    <span className={styles.icon}>
                                        <i className="fa-solid fa-chevron-down"></i>
                                    </span>
                                </div>
                                <ul className={styles.nav__menu}>
                                    <li>
                                        <Link className={styles.nav_menuLink} href="#">
                                            Bóng Đá Mới Nhất
                                        </Link>
                                    </li>
                                    <li>
                                        <Link className={styles.nav_menuLink} href="#">
                                            Đời Sống
                                        </Link>
                                    </li>
                                </ul>
                            </li>
                            <li
                                className={`${styles.nav_item} ${router.pathname === '/soicau' ? styles.active : ''
                                    }`}
                            >
                                <div className={styles.grouplink}>
                                    <Link href="/soicau/soi-cau-mien-bac" className={styles.nav_itemLink}>
                                        Soi Cầu
                                    </Link>
                                    <span className={styles.icon}>
                                        <i className="fa-solid fa-chevron-down"></i>
                                    </span>
                                </div>
                                <ul className={styles.nav__menu}>
                                    <li>
                                        <Link className={styles.nav_menuLink} href="/soicau/soi-cau-mien-bac">
                                            Soi Cầu Miền Bắc
                                        </Link>
                                    </li>
                                    <li>
                                        <Link className={styles.nav_menuLink} href="/soicau/soi-cau-mien-trung">
                                            Soi Cầu Miền Trung
                                        </Link>
                                    </li>
                                    <li>
                                        <Link className={styles.nav_menuLink} href="#">
                                            Soi Cầu Miền Nam
                                        </Link>
                                    </li>
                                </ul>
                            </li>
                            <li
                                className={`${styles.nav_item} ${router.pathname.startsWith('/quaythu') ? styles.active : ''
                                    }`}
                            >
                                <div className={styles.grouplink}>
                                    <Link href="#" className={styles.nav_itemLink}>
                                        Quay Thử
                                    </Link>
                                    <span className={styles.icon}>
                                        <i className="fa-solid fa-chevron-down"></i>
                                    </span>
                                </div>
                                <ul className={styles.nav__menu}>
                                    <li>
                                        <Link className={styles.nav_menuLink} href="#">
                                            Quay Thử XSMB
                                        </Link>
                                    </li>
                                    <li>
                                        <Link className={styles.nav_menuLink} href="#">
                                            Quay Thử XSMT
                                        </Link>
                                    </li>
                                    <li>
                                        <Link className={styles.nav_menuLink} href="#">
                                            Quay Thử XSMN
                                        </Link>
                                    </li>
                                </ul>
                            </li>
                            <li
                                className={`${styles.nav_item} ${router.pathname === '/diendan' ? styles.active : ''
                                    }`}
                            >
                                <Link href="/chat/chat" className={styles.nav_itemLink}>
                                    Diễn Đàn
                                </Link>
                            </li>
                            <li
                                className={`${styles.nav_item} ${status === 'authenticated'
                                    ? router.pathname === '/dang-bai-viet'
                                    : router.pathname === '/login'
                                        ? styles.active
                                        : ''
                                    }`}
                            >
                                <Link
                                    href={status === 'authenticated' ? '/dang-bai-viet' : '/login'}
                                    className={styles.nav_itemLink}
                                >
                                    <span>
                                        <i
                                            className={`fa-solid ${status === 'authenticated' ? 'fa-pen-to-square' : 'fa-user-plus'
                                                }`}
                                        ></i>
                                    </span>
                                    {status === 'authenticated' ? 'Đăng bài' : ''}
                                </Link>
                            </li>
                        </ul>
                    </div>
                    <UserAvatar />
                </nav>
            </div>
        </div>
    );
};

export default NavBar;