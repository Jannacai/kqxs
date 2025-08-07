import React from 'react';
import Link from 'next/link';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import styles from '../public/css/navbar.module.css';
import UserAvatar from './UserAvatar';
import { useRouter } from 'next/router';
import logo from '../public/asset/img/LOGOxsmn_win.png';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import {
    FaBars,
    FaHome,
    FaGlobe,
    FaChevronUp,
    FaChevronDown,
    FaLayerGroup,
    FaMarker,
    FaNewspaper,
    FaSplotch,
    FaUsers,
    FaPenSquare,
    FaUserPlus,
} from 'react-icons/fa';

// Tối ưu: Tạo component riêng cho menu items để tránh re-render không cần thiết
const MenuItem = React.memo(({ href, children, isActive, onClick, icon, className = '', onMouseEnter }) => (
    <li className={`${styles.nav_itemMobile} ${isActive ? styles.active : ''}`}>
        <div className={styles.grouplinkMobile}>
            <Link
                href={href}
                className={`${styles.nav_itemLinkMobile} ${className}`}
                onClick={onClick}
                prefetch={true}
                onMouseEnter={onMouseEnter} // Tối ưu: Prefetch khi hover
            >
                {icon && <span className={styles.iconNav}>{icon}</span>}
                {children}
            </Link>
        </div>
    </li>
));

// Tối ưu: Tạo component cho submenu items
const SubMenuItem = React.memo(({ href, children, isActive, onClick, onMouseEnter }) => (
    <li>
        <Link
            className={`${styles.nav_menuLinkMobile} ${isActive ? styles.active : ''}`}
            href={href}
            onClick={onClick}
            prefetch={true}
            onMouseEnter={onMouseEnter} // Tối ưu: Prefetch khi hover
        >
            {children}
        </Link>
    </li>
));

const NavBar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isMenuOpenList, setIsMenuOpenList] = useState('');
    const [isNavigating, setIsNavigating] = useState(false); // Tối ưu: Loading state
    const scrollPositionRef = useRef(0);
    const router = useRouter();
    const { status } = useSession();
    const prefetchTimeoutRef = useRef(null); // Tối ưu: Debounce prefetch

    // Tối ưu: Sử dụng useMemo để cache các giá trị tính toán
    const isAuthenticated = useMemo(() => status === 'authenticated', [status]);

    // Tối ưu: Debounced prefetch function
    const debouncedPrefetch = useCallback((href) => {
        if (prefetchTimeoutRef.current) {
            clearTimeout(prefetchTimeoutRef.current);
        }
        prefetchTimeoutRef.current = setTimeout(() => {
            router.prefetch(href);
        }, 100);
    }, [router]);

    // Tối ưu: Sử dụng useCallback để tránh re-render không cần thiết
    const toggleMenu = useCallback(() => {
        setIsMenuOpen((prev) => {
            if (prev) {
                setIsMenuOpenList('');
            }
            return !prev;
        });
    }, []);

    const toggleMenuList = useCallback((menuId) => {
        setIsMenuOpenList((prev) => (prev === menuId ? '' : menuId));
    }, []);

    // Tối ưu: Navigation với loading state
    const navigateWithLoading = useCallback(async (href) => {
        if (isNavigating) return; // Prevent multiple navigation

        setIsNavigating(true);
        try {
            await router.push(href);
        } catch (error) {
            console.error('Navigation error:', error);
        } finally {
            setIsNavigating(false);
        }
    }, [router, isNavigating]);

    // Tối ưu: Prefetch các trang quan trọng khi component mount
    useEffect(() => {
        // Prefetch các trang chính với priority
        const prefetchPages = [
            '/ket-qua-xo-so-mien-bac',
            '/ket-qua-xo-so-mien-nam',
            '/ket-qua-xo-so-mien-trung',
            '/thongke/lo-gan',
            '/tao-dan-de-dac-biet/',
            '/tin-tuc',
            '/soicau/soi-cau-mien-bac'
        ];

        // Tối ưu: Prefetch với delay để không block initial render
        const prefetchWithDelay = () => {
            prefetchPages.forEach(page => {
                router.prefetch(page);
            });
        };

        // Delay prefetch để ưu tiên render UI trước
        const timeoutId = setTimeout(prefetchWithDelay, 1000);

        return () => {
            clearTimeout(timeoutId);
            if (prefetchTimeoutRef.current) {
                clearTimeout(prefetchTimeoutRef.current);
            }
        };
    }, [router]);

    useEffect(() => {
        if (isMenuOpen) {
            scrollPositionRef.current = window.scrollY;
            document.body.classList.add('navbar-open');
        } else {
            document.body.classList.remove('navbar-open');
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
        };
    }, [isMenuOpen]);

    // Tối ưu: Sử dụng useMemo để cache menu items
    const mobileMenuItems = useMemo(() => [
        {
            href: '/',
            label: 'Home',
            icon: <FaHome />,
            isActive: router.pathname === '/'
        },
        {
            href: '/diendan',
            label: 'Diễn Đàn',
            icon: <FaUsers />,
            isActive: router.pathname === '/diendan'
        },
        {
            href: '/ket-qua-xo-so-mien-bac',
            label: 'XSMB',
            icon: <FaGlobe />,
            isActive: router.pathname.startsWith('/ket-qua-xo-so-mien-bac'),
            submenu: 'xsmb',
            subItems: [
                { href: '/xsmb/xo-so-mien-bac/thu-2', label: 'Thứ 2' },
                { href: '/xsmb/xo-so-mien-bac/thu-3', label: 'Thứ 3' },
                { href: '/xsmb/xo-so-mien-bac/thu-4', label: 'Thứ 4' },
                { href: '/xsmb/xo-so-mien-bac/thu-5', label: 'Thứ 5' },
                { href: '/xsmb/xo-so-mien-bac/thu-6', label: 'Thứ 6' },
                { href: '/xsmb/xo-so-mien-bac/thu-7', label: 'Thứ 7' },
                { href: '/xsmb/xo-so-mien-bac/chu-nhat', label: 'Chủ Nhật' }
            ]
        },
        {
            href: '/ket-qua-xo-so-mien-nam',
            label: 'XSMN',
            icon: <FaGlobe />,
            isActive: router.pathname.startsWith('/ket-qua-xo-so-mien-nam'),
            submenu: 'xsmn',
            subItems: [
                { href: '/xsmn/thu-2', label: 'Thứ 2' },
                { href: '/xsmn/thu-3', label: 'Thứ 3' },
                { href: '/xsmn/thu-4', label: 'Thứ 4' },
                { href: '/xsmn/thu-5', label: 'Thứ 5' },
                { href: '/xsmn/thu-6', label: 'Thứ 6' },
                { href: '/xsmn/thu-7', label: 'Thứ 7' },
                { href: '/xsmn/chu-nhat', label: 'Chủ Nhật' }
            ]
        },
        {
            href: '/ket-qua-xo-so-mien-trung',
            label: 'XSMT',
            icon: <FaGlobe />,
            isActive: router.pathname.startsWith('/ket-qua-xo-so-mien-trung'),
            submenu: 'xsmt',
            subItems: [
                { href: '/xsmt/thu-2', label: 'Thứ 2' },
                { href: '/xsmt/thu-3', label: 'Thứ 3' },
                { href: '/xsmt/thu-4', label: 'Thứ 4' },
                { href: '/xsmt/thu-5', label: 'Thứ 5' },
                { href: '/xsmt/thu-6', label: 'Thứ 6' },
                { href: '/xsmt/thu-7', label: 'Thứ 7' },
                { href: '/xsmt/chu-nhat', label: 'Chủ Nhật' }
            ]
        },
        {
            href: '/thongke/lo-gan',
            label: 'Thống Kê',
            icon: <FaLayerGroup />,
            isActive: router.pathname.startsWith('/thongke'),
            submenu: 'thongke',
            subItems: [
                { href: '/thongke/lo-gan', label: 'Lô Gan' },
                { href: '/thongke/giai-dac-biet', label: 'Giải Đặc Biệt' },
                { href: '/thongke/giai-dac-biet-tuan', label: 'Giải Đặc Biệt Tuần' },
                { href: '/thongke/dau-duoi', label: 'Đầu Đuôi' },
                { href: '/thongke/Tan-Suat-Lo-Cap', label: 'Tần Suất Lô Cặp' },
                { href: '/thongke/Tan-Suat-Lo-to', label: 'Tần Suất Lô Tô' }
            ]
        },
        {
            href: '/tao-dan-de-dac-biet/',
            label: 'Tạo Dàn',
            icon: <FaMarker />,
            isActive: router.pathname.startsWith('/tao-dan-de-dac-biet'),
            submenu: 'tao-dan-de-dac-biet',
            subItems: [
                { href: '/tao-dan-de-dac-biet/', label: 'Tạo Nhanh Dàn Đặc Biệt' },
                { href: '/taodande/dan-2d/tao-dan-de-2d', label: 'Tạo Dàn 2D' },
                { href: '/taodande/dan-3d4d/tao-dan-de-3d4d', label: 'Tạo Dàn 3D-4D' },
                { href: '/taodande/tao-dan-ngau-nhien9x0x/', label: 'Tạo Dàn 9X0X Ngẫu Nhiên' }
            ]
        },
        {
            href: '/tin-tuc',
            label: 'Tin Tức',
            icon: <FaNewspaper />,
            isActive: router.pathname.startsWith('/tin-tuc'),
            submenu: 'tin-tuc',
            subItems: [
                { href: '#', label: 'Bóng Đá Mới Nhất' },
                { href: '#', label: 'Đời Sống' }
            ]
        },
        {
            href: '/soicau/soi-cau-mien-bac',
            label: 'Soi Cầu',
            icon: <FaSplotch />,
            isActive: router.pathname === '/soicau/soi-cau-mien-bac',
            submenu: 'soicau',
            subItems: [
                { href: '/soicau/soi-cau-mien-bac', label: 'Soi Cầu Miền Bắc' },
                { href: '/soicau/soi-cau-mien-trung', label: 'Soi Cầu Miền Trung' },
                { href: '#', label: 'Soi Cầu Miền Nam' }
            ]
        }
    ], [router.pathname, isAuthenticated]);

    return (
        <div>
            <span className={styles.iconMenu} onClick={toggleMenu}>
                <FaBars />
            </span>

            {/* Nav Bar Ngang - Tối ưu với prefetch */}
            <div className={styles.NavbarMobileNgang}>
                <ul className={styles.nav_listNgang}>
                    {mobileMenuItems.slice(0, 7).map((item, index) => (
                        <li
                            key={index}
                            className={`${styles.nav_itemNgang} ${item.isActive ? styles.active : ''}`}
                        >
                            <Link
                                href={item.href}
                                className={styles.nav_itemLinkNgang}
                                prefetch={true}
                                onMouseEnter={() => debouncedPrefetch(item.href)} // Tối ưu: Hover prefetch
                            >
                                {item.label}
                        </Link>
                    </li>
                    ))}
                </ul>
            </div>

            {/* Tablet Mobile - Tối ưu với React.memo và prefetch */}
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
                            width={150}
                            height={50}
                            priority={true} // Tối ưu: Load logo với priority
                        />
                    </div>
                    <div className={styles.scrollableMenu}>
                        <nav className={styles.navbarMobile}>
                            <ul className={styles.nav_listMobile}>
                                {mobileMenuItems.map((item, index) => (
                                    <li
                                        key={index}
                                        className={`${styles.nav_itemMobile} ${item.isActive ? styles.active : ''}`}
                                >
                                    <div className={styles.grouplinkMobile}>
                                            <Link
                                                href={item.href}
                                            className={styles.nav_itemLinkMobile}
                                                onClick={toggleMenu}
                                                prefetch={true}
                                                onMouseEnter={() => debouncedPrefetch(item.href)} // Tối ưu: Hover prefetch
                                        >
                                            <span className={styles.iconNav}>
                                                    {item.icon}
                                            </span>{' '}
                                                {item.label}
                                            </Link>
                                            {item.submenu && (
                                                <span onClick={() => toggleMenuList(item.submenu)} className={styles.icon}>
                                                    {isMenuOpenList === item.submenu ? <FaChevronUp /> : <FaChevronDown />}
                                        </span>
                                            )}
                                    </div>
                                        {item.submenu && (
                                            <ul
                                                className={`${styles.nav__menuMobile} ${isMenuOpenList === item.submenu ? styles.menuList : ''}`}
                                            >
                                                {item.subItems.map((subItem, subIndex) => (
                                                    <SubMenuItem
                                                        key={subIndex}
                                                        href={subItem.href}
                                                        isActive={router.pathname === subItem.href}
                                                onClick={toggleMenu}
                                                        onMouseEnter={() => debouncedPrefetch(subItem.href)} // Tối ưu: Hover prefetch
                                                    >
                                                        {subItem.label}
                                                    </SubMenuItem>
                                                ))}
                                    </ul>
                                        )}
                                </li>
                                ))}
                            </ul>
                        </nav>
                    </div>
                </div>
            </div>

            {/* PC header - Tối ưu với prefetch và lazy loading */}
            <div>
                <nav className={styles.navbar}>
                    <div className="containerS">
                        <ul className={styles.nav_list}>
                            {mobileMenuItems.map((item, index) => (
                            <li
                                    key={index}
                                    className={`${styles.nav_item} ${item.isActive ? styles.active : ''}`}
                            >
                                <div className={styles.grouplink}>
                                        {item.icon && (
                                    <span className={styles.icon}>
                                                {item.icon}
                                    </span>
                                        )}
                                        <Link
                                            href={item.href}
                                            className={styles.nav_itemLink}
                                            prefetch={true}
                                            onMouseEnter={() => debouncedPrefetch(item.href)} // Tối ưu: Hover prefetch
                                        >
                                            {item.label}
                                        </Link>
                                        {item.submenu && (
                                    <span className={styles.icon}>
                                        <FaChevronDown />
                                    </span>
                                        )}
                                </div>
                                    {item.submenu && (
                                <ul className={styles.nav__menu}>
                                            {item.subItems.map((subItem, subIndex) => (
                                                <li key={subIndex}>
                                                    <Link
                                                        className={styles.nav_menuLink}
                                                        href={subItem.href}
                                                        prefetch={true}
                                                        onMouseEnter={() => debouncedPrefetch(subItem.href)} // Tối ưu: Hover prefetch
                                                    >
                                                        {subItem.label}
                                        </Link>
                                    </li>
                                            ))}
                                </ul>
                                    )}
                            </li>
                            ))}
                        </ul>
                    </div>
                </nav>
            </div>

            {/* Tối ưu: Loading indicator khi đang navigate */}
            {isNavigating && (
                <div className={styles.navigationLoading}>
                    <div className={styles.loadingSpinner}></div>
                </div>
            )}
        </div>
    );
};

export default NavBar;