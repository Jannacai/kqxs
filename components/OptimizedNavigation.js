import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
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

// Tối ưu: Lazy load các component không cần thiết ngay lập tức
const UserAvatar = dynamic(() => import('../component/UserAvatar'), {
    ssr: false,
    loading: () => <div className="avatar-skeleton" />
});

// Tối ưu: Tạo component riêng cho menu items để tránh re-render không cần thiết
const MenuItem = React.memo(({ href, children, isActive, onClick, icon, className = '', prefetch = true }) => (
    <li className={`nav-item ${isActive ? 'active' : ''}`}>
        <div className="group-link">
            <Link
                href={href}
                className={`nav-item-link ${className}`}
                onClick={onClick}
                prefetch={prefetch}
                scroll={false} // Tối ưu: Tránh scroll không cần thiết
            >
                {icon && <span className="icon-nav">{icon}</span>}
                {children}
            </Link>
        </div>
    </li>
));

// Tối ưu: Tạo component cho submenu items
const SubMenuItem = React.memo(({ href, children, isActive, onClick, prefetch = true }) => (
    <li>
        <Link
            className={`nav-menu-link ${isActive ? 'active' : ''}`}
            href={href}
            onClick={onClick}
            prefetch={prefetch}
            scroll={false}
        >
            {children}
        </Link>
    </li>
));

// Tối ưu: Tạo hook riêng cho navigation logic
const useNavigationOptimization = () => {
    const router = useRouter();
    const { status } = useSession();

    // Tối ưu: Sử dụng useMemo để cache các giá trị tính toán
    const isAuthenticated = useMemo(() => status === 'authenticated', [status]);

    // Tối ưu: Prefetch các trang quan trọng khi component mount
    useEffect(() => {
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

        const timer = setTimeout(prefetchWithDelay, 1000);
        return () => clearTimeout(timer);
    }, [router]);

    return { isAuthenticated, router };
};

// Tối ưu: Tạo component chính với performance optimization
const OptimizedNavigation = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isMenuOpenList, setIsMenuOpenList] = useState('');
    const scrollPositionRef = useRef(0);
    const { isAuthenticated, router } = useNavigationOptimization();

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

    // Tối ưu: Sử dụng useMemo để cache menu items
    const menuItems = useMemo(() => [
        {
            href: '/',
            label: 'Home',
            icon: <FaHome />,
            isActive: router.pathname === '/'
        },
        {
            href: '#',
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
                { href: '/xsmt/xo-so-mien-trung/thu-2', label: 'Thứ 2' },
                { href: '/xsmt/xo-so-mien-trung/thu-3', label: 'Thứ 3' },
                { href: '/xsmt/xo-so-mien-trung/thu-4', label: 'Thứ 4' },
                { href: '/xsmt/xo-so-mien-trung/thu-5', label: 'Thứ 5' },
                { href: '/xsmt/xo-so-mien-trung/thu-6', label: 'Thứ 6' },
                { href: '/xsmt/xo-so-mien-trung/thu-7', label: 'Thứ 7' },
                { href: '/xsmt/xo-so-mien-trung/chu-nhat', label: 'Chủ Nhật' }
            ]
        },
        {
            href: '/thongke/lo-gan',
            label: 'Thống Kê',
            icon: <FaLayerGroup />,
            isActive: router.pathname.startsWith('/thongke'),
            submenu: 'thongke',
            subItems: [
                { href: '/thongke/lo-gan', label: 'Thống Kê Logan' },
                { href: '/thongke/giai-dac-biet', label: 'Thống Kê giải đặc biệt' },
                { href: '/thongke/dau-duoi', label: 'Thống Kê đầu đuôi loto' },
                { href: '/thongke/giai-dac-biet-tuan', label: 'Bảng đặc biệt tuần/tháng' },
                { href: '/thongke/Tan-Suat-Lo-to', label: 'Tần Suất Loto' },
                { href: '/thongke/Tan-Suat-Lo-Cap', label: 'Tần Suất Lô Cặp' },
                { href: '#', label: 'Tần suất giải đặc biệt' }
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
        },
        {
            href: isAuthenticated ? '/dang-bai-viet' : '/login',
            label: isAuthenticated ? 'Đăng bài viết mới' : 'Đăng Nhập',
            icon: isAuthenticated ? <FaPenSquare /> : <FaUserPlus />,
            isActive: isAuthenticated ? router.pathname === '/dang-bai-viet' : router.pathname === '/login'
        }
    ], [router.pathname, isAuthenticated]);

    // Tối ưu: Xử lý scroll position khi menu mở/đóng
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

    return (
        <div className="optimized-navigation">
            {/* Mobile Menu Toggle */}
            <button
                className="icon-menu"
                onClick={toggleMenu}
                aria-label="Toggle menu"
            >
                <FaBars />
            </button>

            {/* Horizontal Navigation Bar */}
            <div className="navbar-mobile-horizontal">
                <ul className="nav-list-horizontal">
                    {menuItems.slice(0, 7).map((item, index) => (
                        <MenuItem
                            key={index}
                            href={item.href}
                            isActive={item.isActive}
                            prefetch={true}
                        >
                            {item.label}
                        </MenuItem>
                    ))}
                </ul>
            </div>

            {/* Mobile/Tablet Navigation */}
            <div className={`mobile-navbar ${!isMenuOpen ? 'hidden' : ''}`}>
                <div
                    onClick={toggleMenu}
                    className={`overlay ${isMenuOpen ? 'menu-open' : ''}`}
                />
                <div className={`menu-drawer ${isMenuOpen ? 'menu-open' : ''}`}>
                    <div className="header-logo">
                        <img
                            className="header-logo-img"
                            src="/asset/img/LOGOxsmn_win.png"
                            alt="xổ số bắc trung nam"
                            width={150}
                            height={50}
                            loading="eager"
                        />
                    </div>
                    <div className="scrollable-menu">
                        <nav className="navbar-mobile">
                            <ul className="nav-list-mobile">
                                {menuItems.map((item, index) => (
                                    <li
                                        key={index}
                                        className={`nav-item-mobile ${item.isActive ? 'active' : ''}`}
                                    >
                                        <div className="group-link-mobile">
                                            <Link
                                                href={item.href}
                                                className="nav-item-link-mobile"
                                                onClick={toggleMenu}
                                                prefetch={true}
                                                scroll={false}
                                            >
                                                <span className="icon-nav">
                                                    {item.icon}
                                                </span>
                                                {item.label}
                                            </Link>
                                            {item.submenu && (
                                                <button
                                                    onClick={() => toggleMenuList(item.submenu)}
                                                    className="icon"
                                                    aria-label={`Toggle ${item.label} submenu`}
                                                >
                                                    {isMenuOpenList === item.submenu ? <FaChevronUp /> : <FaChevronDown />}
                                                </button>
                                            )}
                                        </div>
                                        {item.submenu && (
                                            <ul
                                                className={`nav-menu-mobile ${isMenuOpenList === item.submenu ? 'menu-list' : ''}`}
                                            >
                                                {item.subItems.map((subItem, subIndex) => (
                                                    <SubMenuItem
                                                        key={subIndex}
                                                        href={subItem.href}
                                                        isActive={router.pathname === subItem.href}
                                                        onClick={toggleMenu}
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

            {/* Desktop Navigation */}
            <nav className="navbar-desktop">
                <div className="container">
                    <ul className="nav-list-desktop">
                        {menuItems.slice(0, 7).map((item, index) => (
                            <li
                                key={index}
                                className={`nav-item-desktop ${item.isActive ? 'active' : ''}`}
                            >
                                <div className="group-link">
                                    {item.icon && (
                                        <span className="icon">
                                            {item.icon}
                                        </span>
                                    )}
                                    <Link
                                        href={item.href}
                                        className="nav-item-link"
                                        prefetch={true}
                                        scroll={false}
                                    >
                                        {item.label}
                                    </Link>
                                    {item.submenu && (
                                        <span className="icon">
                                            <FaChevronDown />
                                        </span>
                                    )}
                                </div>
                                {item.submenu && (
                                    <ul className="nav-menu">
                                        {item.subItems.map((subItem, subIndex) => (
                                            <li key={subIndex}>
                                                <Link
                                                    className="nav-menu-link"
                                                    href={subItem.href}
                                                    prefetch={true}
                                                    scroll={false}
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
                <UserAvatar />
            </nav>
        </div>
    );
};

export default OptimizedNavigation;
