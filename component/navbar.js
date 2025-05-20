import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import styles from '../public/css/navbar.module.css';
import { apiMB } from '../pages/api/kqxs/kqxsMB';
import UserAvatar from './UserAvatar';
import { useRouter } from 'next/router';
import logo from '../public/asset/img/logo5.png';
import Image from 'next/image';

const NavBar = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isMenuOpenList, setIsMenuOpenList] = useState("");
    const scrollPositionRef = useRef(0);

    const hasFetched = useRef(false);
    const router = useRouter();

    useEffect(() => {
        async function fetchDataOnce() {
            if (hasFetched.current) return;
            hasFetched.current = true;

            try {
                setLoading(true);
                const result = await apiMB.getLottery('xsmb');
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

    useEffect(() => {
        // Xử lý body khi navbar mở/đóng
        if (isMenuOpen) {
            scrollPositionRef.current = window.scrollY;
            document.body.classList.add("navbar-open");
            document.body.style.position = "fixed";
            document.body.style.top = `-${scrollPositionRef.current}px`;
            document.body.style.width = "100%";
            document.body.style.overflow = "hidden";
        } else {
            document.body.classList.remove("navbar-open");
            document.body.style.position = "";
            document.body.style.top = "";
            document.body.style.width = "";
            document.body.style.overflow = "";
            window.scrollTo(0, scrollPositionRef.current);
        }

        // Xử lý sự kiện popstate để đóng navbar khi nhấn "trở lại"
        const handlePopstate = () => {
            if (isMenuOpen) {
                // Trì hoãn để đảm bảo hiệu ứng ẩn hoàn thành
                setTimeout(() => {
                    setIsMenuOpen(false);
                    setIsMenuOpenList(""); // Đóng submenu nếu có
                }, 400); // Phù hợp với thời gian transition của .menuDrawer (0.4s)
            }
        };

        window.addEventListener('popstate', handlePopstate);

        // Cleanup
        return () => {
            window.removeEventListener('popstate', handlePopstate);
            document.body.classList.remove("navbar-open");
            document.body.style.position = "";
            document.body.style.top = "";
            document.body.style.width = "";
            document.body.style.overflow = "";
        };
    }, [isMenuOpen]);

    const toggleMenu = () => {
        setIsMenuOpen((prev) => {
            if (prev) {
                setIsMenuOpenList("");
            }
            return !prev;
        });
    };

    const toggleMenuList = (menuId) => {
        setIsMenuOpenList(isMenuOpenList === menuId ? "" : menuId);
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div>
            <span className={styles.iconMenu} onClick={toggleMenu}>
                <i className="fa-solid fa-bars"></i>
            </span>
            {/* Nav Bar Ngang */}
            <div className={styles.NavbarMobileNgang}>
                <ul className={styles.nav_listNgang}>
                    <li className={`${styles.nav_itemNgang} ${router.pathname.startsWith('/xsmb') ? styles.active : ''}`}>

                        <Link href="/xsmb" className={styles.nav_itemLinkNgang}>XSMB </Link>

                    </li>
                    <li className={`${styles.nav_itemNgang} ${router.pathname.startsWith('/xsmn') ? styles.active : ''}`}>

                        <Link href="/xsmn" className={styles.nav_itemLinkNgang}>XSMN </Link>

                    </li>
                    <li className={`${styles.nav_itemNgang} ${router.pathname.startsWith('/xsmt') ? styles.active : ''}`}>

                        <Link href="/xsmt" className={styles.nav_itemLinkNgang}>XSMT </Link>

                    </li>
                    <li className={`${styles.nav_itemNgang} ${router.pathname.startsWith('/thongke') ? styles.active : ''}`}>

                        <Link href="/thongke/logan" className={styles.nav_itemLinkNgang}>Thống kê </Link>

                    </li>
                    <li className={`${styles.nav_itemNgang} ${router.pathname.startsWith('/taodan') ? styles.active : ''}`}>

                        <Link href="/TaoDan/" className={styles.nav_itemLinkNgang}>Tạo Dàn</Link>

                    </li>
                    <li className={`${styles.nav_itemNgang} ${router.pathname.startsWith('/news') ? styles.active : ''}`}>

                        <Link href="/news" className={styles.nav_itemLinkNgang}>Tin TỨC</Link>

                    </li>
                    <li className={`${styles.nav_itemNgang} ${router.pathname === '/soicau' ? styles.active : ''}`}>

                        <Link href="/soicau" className={styles.nav_itemLinkNgang}>Soi Cầu</Link>

                    </li>
                    <li className={`${styles.nav_itemNgang} ${router.pathname.startsWith('/quaythu') ? styles.active : ''}`}>

                        <Link href="/quaythu/" className={styles.nav_itemLinkNgang}>Quay Thử</Link>

                    </li>
                    <li className={`${styles.nav_itemNgang} ${router.pathname === '/diendan' ? styles.active : ''}`}>
                        <Link href="/diendan/" className={styles.nav_itemLinkNgang}>Diễn Đàn</Link>
                    </li>
                </ul>
            </div>


            {/* Tablet Mobile */}
            <div className={`${styles.mobileNavbar} ${!isMenuOpen ? styles.hidden : ''}`}>
                <div
                    onClick={toggleMenu}
                    className={`${styles.overlay} ${isMenuOpen ? styles.menuOpen : ""}`}
                ></div>
                <div
                    className={`${styles.menuDrawer} ${isMenuOpen ? styles.menuOpen : ""}`}
                >
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
                                    className={`${styles.nav_itemMobile} ${router.pathname === "/" ? styles.active : ""
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
                                            </span>  Home
                                        </Link>

                                    </div>
                                </li>
                                <li
                                    className={`${styles.nav_itemMobile} ${router.pathname.startsWith("/xsmb") ? styles.active : ""
                                        }`}
                                >
                                    <div className={styles.grouplinkMobile}>
                                        <Link
                                            href="/xsmb"
                                            className={styles.nav_itemLinkMobile}
                                            onClick={toggleMenu}
                                        >
                                            <span className={styles.iconNav}><i class="fa-solid fa-globe"></i></span> XSMB
                                        </Link>
                                        <span
                                            onClick={() => toggleMenuList("xsmb")}
                                            className={styles.icon}
                                        >
                                            <i
                                                className={`fa-solid ${isMenuOpenList === "xsmb"
                                                    ? "fa-chevron-up"
                                                    : "fa-chevron-down"
                                                    }`}
                                            ></i>
                                        </span>
                                    </div>
                                    <ul
                                        className={`${styles.nav__menuMobile} ${isMenuOpenList === "xsmb" ? styles.menuList : ""
                                            }`}
                                    >
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === "/xsmb/thu-2" ? styles.active : ""
                                                    }`}
                                                href="/xsmb/thu-2"
                                                onClick={toggleMenu}
                                            >
                                                Thứ 2
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === "/xsmb/thu-3" ? styles.active : ""
                                                    }`}
                                                href="/xsmb/thu-3"
                                                onClick={toggleMenu}
                                            >
                                                Thứ 3
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === "/xsmb/thu-4" ? styles.active : ""
                                                    }`}
                                                href="/xsmb/thu-4"
                                                onClick={toggleMenu}
                                            >
                                                Thứ 4
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === "/xsmb/thu-5" ? styles.active : ""
                                                    }`}
                                                href="/xsmb/thu-5"
                                                onClick={toggleMenu}
                                            >
                                                Thứ 5
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === "/xsmb/thu-6" ? styles.active : ""
                                                    }`}
                                                href="/xsmb/thu-6"
                                                onClick={toggleMenu}
                                            >
                                                Thứ 6
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === "/xsmb/thu-7" ? styles.active : ""
                                                    }`}
                                                href="/xsmb/thu-7"
                                                onClick={toggleMenu}
                                            >
                                                Thứ 7
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === "/xsmb/chu-nhat" ? styles.active : ""
                                                    }`}
                                                href="/xsmb/chu-nhat"
                                                onClick={toggleMenu}
                                            >
                                                Chủ Nhật
                                            </Link>
                                        </li>
                                    </ul>
                                </li>
                                <li
                                    className={`${styles.nav_itemMobile} ${router.pathname.startsWith("/xsmn") ? styles.active : ""
                                        }`}
                                >
                                    <div className={styles.grouplinkMobile}>
                                        <Link
                                            href="/xsmn"
                                            className={styles.nav_itemLinkMobile}
                                            onClick={toggleMenu}
                                        >
                                            <span className={styles.iconNav}><i class="fa-solid fa-globe"></i></span>  XSMN
                                        </Link>
                                        <span
                                            onClick={() => toggleMenuList("xsmn")}
                                            className={styles.icon}
                                        >
                                            <i
                                                className={`fa-solid ${isMenuOpenList === "xsmn"
                                                    ? "fa-chevron-up"
                                                    : "fa-chevron-down"
                                                    }`}
                                            ></i>
                                        </span>
                                    </div>
                                    <ul
                                        className={`${styles.nav__menuMobile} ${isMenuOpenList === "xsmn" ? styles.menuList : ""
                                            }`}
                                    >
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === "/xsmn/thu-2" ? styles.active : ""
                                                    }`}
                                                href="/xsmn/thu-2"
                                                onClick={toggleMenu}
                                            >
                                                Thứ 2
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === "/xsmn/thu-3" ? styles.active : ""
                                                    }`}
                                                href="/xsmn/thu-3"
                                                onClick={toggleMenu}
                                            >
                                                Thứ 3
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === "/xsmn/thu-4" ? styles.active : ""
                                                    }`}
                                                href="/xsmn/thu-4"
                                                onClick={toggleMenu}
                                            >
                                                Thứ 4
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === "/xsmn/thu-5" ? styles.active : ""
                                                    }`}
                                                href="/xsmn/thu-5"
                                                onClick={toggleMenu}
                                            >
                                                Thứ 5
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === "/xsmn/thu-6" ? styles.active : ""
                                                    }`}
                                                href="/xsmn/thu-6"
                                                onClick={toggleMenu}
                                            >
                                                Thứ 6
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === "/xsmn/thu-7" ? styles.active : ""
                                                    }`}
                                                href="/xsmn/thu-7"
                                                onClick={toggleMenu}
                                            >
                                                Thứ 7
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === "/xsmn/chu-nhat" ? styles.active : ""
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
                                    className={`${styles.nav_itemMobile} ${router.pathname.startsWith("/xsmt") ? styles.active : ""
                                        }`}
                                >
                                    <div className={styles.grouplinkMobile}>
                                        <Link
                                            href="/xsmt"
                                            className={styles.nav_itemLinkMobile}
                                            onClick={toggleMenu}
                                        >
                                            <span className={styles.iconNav}><i class="fa-solid fa-globe"></i></span>   XSMT
                                        </Link>
                                        <span
                                            onClick={() => toggleMenuList("xsmt")}
                                            className={styles.icon}
                                        >
                                            <i
                                                className={`fa-solid ${isMenuOpenList === "xsmt"
                                                    ? "fa-chevron-up"
                                                    : "fa-chevron-down"
                                                    }`}
                                            ></i>
                                        </span>
                                    </div>
                                    <ul
                                        className={`${styles.nav__menuMobile} ${isMenuOpenList === "xsmt" ? styles.menuList : ""
                                            }`}
                                    >
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === "/xsmt/thu-2" ? styles.active : ""
                                                    }`}
                                                href="/xsmt/thu-2"
                                                onClick={toggleMenu}
                                            >
                                                Thứ 2
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === "/xsmt/thu-3" ? styles.active : ""
                                                    }`}
                                                href="/xsmt/thu-3"
                                                onClick={toggleMenu}
                                            >
                                                Thứ 3
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === "/xsmt/thu-4" ? styles.active : ""
                                                    }`}
                                                href="/xsmt/thu-4"
                                                onClick={toggleMenu}
                                            >
                                                Thứ 4
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === "/xsmt/thu-5" ? styles.active : ""
                                                    }`}
                                                href="/xsmt/thu-5"
                                                onClick={toggleMenu}
                                            >
                                                Thứ 5
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === "/xsmt/thu-6" ? styles.active : ""
                                                    }`}
                                                href="/xsmt/thu-6"
                                                onClick={toggleMenu}
                                            >
                                                Thứ 6
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === "/xsmt/thu-7" ? styles.active : ""
                                                    }`}
                                                href="/xsmt/thu-7"
                                                onClick={toggleMenu}
                                            >
                                                Thứ 7
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === "/xsmt/chu-nhat" ? styles.active : ""
                                                    }`}
                                                href="/xsmt/chu-nhat"
                                                onClick={toggleMenu}
                                            >
                                                Chủ Nhật
                                            </Link>
                                        </li>
                                    </ul>
                                </li>
                                <li
                                    className={`${styles.nav_itemMobile} ${router.pathname.startsWith("/thongke") ? styles.active : ""
                                        }`}
                                >
                                    <div className={styles.grouplinkMobile}>
                                        <Link
                                            href="/thongke/logan"
                                            className={styles.nav_itemLinkMobile}
                                            onClick={toggleMenu}
                                        >
                                            <span className={styles.iconNav}><i class="fa-solid fa-layer-group"></i></span> Thống Kê
                                        </Link>
                                        <span
                                            onClick={() => toggleMenuList("thongke")}
                                            className={styles.icon}
                                        >
                                            <i
                                                className={`fa-solid ${isMenuOpenList === "thongke"
                                                    ? "fa-chevron-up"
                                                    : "fa-chevron-down"
                                                    }`}
                                            ></i>
                                        </span>
                                    </div>
                                    <ul
                                        className={`${styles.nav__menuMobile} ${isMenuOpenList === "thongke" ? styles.menuList : ""
                                            }`}
                                    >
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === "/thongke/logan" ? styles.active : ""
                                                    }`}
                                                href="/thongke/logan"
                                                onClick={toggleMenu}
                                            >
                                                Thống Kê Logan
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === "/thongke/giaidacbiet" ? styles.active : ""
                                                    }`}
                                                href="/thongke/giaidacbiet"
                                                onClick={toggleMenu}
                                            >
                                                Thống Kê giải đặc biệt
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === "/thongke/dauduoi" ? styles.active : ""
                                                    }`}
                                                href="/thongke/dauduoi"
                                                onClick={toggleMenu}
                                            >
                                                Thống Kê đầu đuôi loto
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === "/thongke/giaidacbiettuan" ? styles.active : ""
                                                    }`}
                                                href="/thongke/giaidacbiettuan"
                                                onClick={toggleMenu}
                                            >
                                                Bảng đặc biệt tuần/tháng
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === "/thongke/TanSuatLoto" ? styles.active : ""
                                                    }`}
                                                href="/thongke/TanSuatLoto"
                                                onClick={toggleMenu}
                                            >
                                                Tần Suất Loto
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === "/thongke/TanSuatLoCap" ? styles.active : ""
                                                    }`}
                                                href="/thongke/TanSuatLoCap"
                                                onClick={toggleMenu}
                                            >
                                                Tần Suất Lô Cặp
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === "/xsmb/chu-nhat" ? styles.active : ""
                                                    }`}
                                                href="/xsmb/chu-nhat"
                                                onClick={toggleMenu}
                                            >
                                                Tần suất giải đặc biệt
                                            </Link>
                                        </li>
                                    </ul>
                                </li>
                                <li
                                    className={`${styles.nav_itemMobile} ${router.pathname.startsWith("/taodan") ? styles.active : ""
                                        }`}
                                >
                                    <div className={styles.grouplinkMobile}>
                                        <Link
                                            href="/TaoDan/"
                                            className={styles.nav_itemLinkMobile}
                                            onClick={toggleMenu}
                                        >
                                            <span className={styles.iconNav}><i class="fa-solid fa-marker"></i></span> Tạo Dàn
                                        </Link>
                                        <span
                                            onClick={() => toggleMenuList("taodan")}
                                            className={styles.icon}
                                        >
                                            <i
                                                className={`fa-solid ${isMenuOpenList === "taodan"
                                                    ? "fa-chevron-up"
                                                    : "fa-chevron-down"
                                                    }`}
                                            ></i>
                                        </span>
                                    </div>
                                    <ul
                                        className={`${styles.nav__menuMobile} ${isMenuOpenList === "taodan" ? styles.menuList : ""
                                            }`}
                                    >
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === "/TaoDan/" ? styles.active : ""
                                                    }`}
                                                href="/TaoDan/"
                                                onClick={toggleMenu}
                                            >
                                                Tạo Nhanh Dàn Đặc Biệt
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === "/TaoDanD/2D/" ? styles.active : ""
                                                    }`}
                                                href="/TaoDanD/2D/"
                                                onClick={toggleMenu}
                                            >
                                                Tạo Dàn 2D
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === "/TaoDanD/3D4D/" ? styles.active : ""
                                                    }`}
                                                href="/TaoDanD/3D4D/"
                                                onClick={toggleMenu}
                                            >
                                                Tạo Dàn 3D-4D
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === "/TaoDanD/Ngaunhien9x0x" ? styles.active : ""
                                                    }`}
                                                href="/TaoDanD/Ngaunhien9x0x"
                                                onClick={toggleMenu}
                                            >
                                                Tạo Dàn 9X0X Ngẫu Nhiên
                                            </Link>
                                        </li>
                                    </ul>
                                </li>
                                <li
                                    className={`${styles.nav_itemMobile} ${router.pathname.startsWith("/news") ? styles.active : ""
                                        }`}
                                >
                                    <div className={styles.grouplinkMobile}>
                                        <Link
                                            href="/news"
                                            className={styles.nav_itemLinkMobile}
                                            onClick={toggleMenu}
                                        >
                                            <span className={styles.iconNav}><i class="fa-solid fa-newspaper"></i></span> Tin Tức
                                        </Link>
                                        <span
                                            onClick={() => toggleMenuList("news")}
                                            className={styles.icon}
                                        >
                                            <i
                                                className={`fa-solid ${isMenuOpenList === "news"
                                                    ? "fa-chevron-up"
                                                    : "fa-chevron-down"
                                                    }`}
                                            ></i>
                                        </span>
                                    </div>
                                    <ul
                                        className={`${styles.nav__menuMobile} ${isMenuOpenList === "news" ? styles.menuList : ""
                                            }`}
                                    >
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === "/thongke/logan" ? styles.active : ""
                                                    }`}
                                                href="/thongke/logan"
                                                onClick={toggleMenu}
                                            >
                                                Bóng Đá Mới Nhất
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === "/thongke/giaidacbiet" ? styles.active : ""
                                                    }`}
                                                href="/thongke/giaidacbiet"
                                                onClick={toggleMenu}
                                            >
                                                Đời Sống
                                            </Link>
                                        </li>
                                    </ul>
                                </li>
                                <li
                                    className={`${styles.nav_itemMobile} ${router.pathname === "/soicau/soicauMB" ? styles.active : ""
                                        }`}
                                >
                                    <div className={styles.grouplinkMobile}>
                                        <Link
                                            href="/soicau/soicauMB"
                                            className={styles.nav_itemLinkMobile}
                                            onClick={toggleMenu}
                                        >
                                            <span className={styles.iconNav}><i class="fa-solid fa-splotch"></i></span> Soi Cầu
                                        </Link>
                                        <span
                                            onClick={() => toggleMenuList("soicau")}
                                            className={styles.icon}
                                        >
                                            <i
                                                className={`fa-solid ${isMenuOpenList === "soicau"
                                                    ? "fa-chevron-up"
                                                    : "fa-chevron-down"
                                                    }`}
                                            ></i>
                                        </span>
                                    </div>
                                    <ul
                                        className={`${styles.nav__menuMobile} ${isMenuOpenList === "soicau" ? styles.menuList : ""
                                            }`}
                                    >
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === "/thongke/logan" ? styles.active : ""
                                                    }`}
                                                href="/soicau/soicauMB"
                                                onClick={toggleMenu}
                                            >
                                                Soi Cầu Miền Bắc
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === "/thongke/giaidacbiet" ? styles.active : ""
                                                    }`}
                                                href="/thongke/giaidacbiet"
                                                onClick={toggleMenu}
                                            >
                                                Soi Cầu Miền Bắc
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === "/thongke/dauduoi" ? styles.active : ""
                                                    }`}
                                                href="/thongke/dauduoi"
                                                onClick={toggleMenu}
                                            >
                                                Soi Cầu Miền Bắc
                                            </Link>
                                        </li>
                                    </ul>
                                </li>
                                <li
                                    className={`${styles.nav_itemMobile} ${router.pathname.startsWith("/quaythu") ? styles.active : ""
                                        }`}
                                >
                                    <div className={styles.grouplinkMobile}>
                                        <Link
                                            href="/quaythu/"
                                            className={styles.nav_itemLinkMobile}
                                            onClick={toggleMenu}
                                        >
                                            <span className={styles.iconNav}><i class="fa-solid fa-arrows-spin"></i></span> Quay Thử
                                        </Link>
                                        <span
                                            onClick={() => toggleMenuList("quaythu")}
                                            className={styles.icon}
                                        >
                                            <i
                                                className={`fa-solid ${isMenuOpenList === "quaythu"
                                                    ? "fa-chevron-up"
                                                    : "fa-chevron-down"
                                                    }`}
                                            ></i>
                                        </span>
                                    </div>
                                    <ul
                                        className={`${styles.nav__menuMobile} ${isMenuOpenList === "quaythu" ? styles.menuList : ""
                                            }`}
                                    >
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === "/thongke/logan" ? styles.active : ""
                                                    }`}
                                                href="/thongke/logan"
                                                onClick={toggleMenu}
                                            >
                                                Quay Thử XSMB
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === "/thongke/giaidacbiet" ? styles.active : ""
                                                    }`}
                                                href="/thongke/giaidacbiet"
                                                onClick={toggleMenu}
                                            >
                                                Quay Thử XSMT
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                className={`${styles.nav_menuLinkMobile} ${router.pathname === "/thongke/dauduoi" ? styles.active : ""
                                                    }`}
                                                href="/thongke/dauduoi"
                                                onClick={toggleMenu}
                                            >
                                                Quay Thử XSMN
                                            </Link>
                                        </li>
                                    </ul>
                                </li>
                                <li
                                    className={`${styles.nav_itemMobile} ${router.pathname === "/diendan" ? styles.active : ""
                                        }`}
                                >
                                    <div className={styles.grouplinkMobile}>
                                        <Link
                                            href="/diendan/"
                                            className={styles.nav_itemLinkMobile}
                                            onClick={toggleMenu}
                                        >
                                            <span className={styles.iconNav}><i class="fa-solid fa-people-roof"></i></span> Diễn Đàn
                                        </Link>
                                    </div>
                                </li>
                                <li
                                    className={`${styles.nav_itemMobile} ${router.pathname === "/login" ? styles.active : ""
                                        }`}
                                >
                                    <div className={styles.grouplinkMobile}>
                                        <Link
                                            href="/login"
                                            className={styles.nav_itemLinkMobile}
                                            onClick={toggleMenu}
                                        >
                                            <span className={styles.iconNav}>
                                                <i className="fa-solid fa-user-plus"></i>
                                            </span>
                                            Đăng Nhập
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
                            <li className={`${styles.nav_item} ${router.pathname === '/' ? styles.active : ''}`}>
                                <div className={styles.grouplink}>
                                    <span className={styles.icon}><i className="fa-solid fa-house-circle-check"></i></span>
                                    <Link href="/" className={styles.nav_itemLink}>Home</Link>
                                </div>
                            </li>
                            <li className={`${styles.nav_item} ${router.pathname.startsWith('/xsmb') ? styles.active : ''}`}>
                                <div className={styles.grouplink}>
                                    <Link href="/xsmb" className={styles.nav_itemLink}>XSMB </Link>
                                    <span className={styles.icon}><i className="fa-solid fa-chevron-down"></i></span>
                                </div>
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
                            <li className={`${styles.nav_item} ${router.pathname.startsWith('/xsmn') ? styles.active : ''}`}>
                                <div className={styles.grouplink}>
                                    <Link href="/xsmn" className={styles.nav_itemLink}>XSMN </Link>
                                    <span className={styles.icon}><i className="fa-solid fa-chevron-down"></i></span>
                                </div>
                                <ul className={styles.nav__menu}>
                                    <li><Link className={styles.nav_menuLink} href="/xsmn/thu-2">Thứ 2</Link></li>
                                    <li><Link className={styles.nav_menuLink} href="/xsmn/thu-3">Thứ 3</Link></li>
                                    <li><Link className={styles.nav_menuLink} href="/xsmn/thu-4">Thứ 4</Link></li>
                                    <li><Link className={styles.nav_menuLink} href="/xsmn/thu-5">Thứ 5</Link></li>
                                    <li><Link className={styles.nav_menuLink} href="/xsmn/thu-6">Thứ 6</Link></li>
                                    <li><Link className={styles.nav_menuLink} href="/xsmn/thu-7">Thứ 7</Link></li>
                                    <li><Link className={styles.nav_menuLink} href="/xsmn/chu-nhat">Chủ Nhật</Link></li>
                                </ul>
                            </li>
                            <li className={`${styles.nav_item} ${router.pathname.startsWith('/xsmt') ? styles.active : ''}`}>
                                <div className={styles.grouplink}>
                                    <Link href="/xsmt" className={styles.nav_itemLink}>XSMT </Link>
                                    <span className={styles.icon}><i className="fa-solid fa-chevron-down"></i></span>
                                </div>
                                <ul className={styles.nav__menu}>
                                    <li><Link className={styles.nav_menuLink} href="/xsmt/thu-2">Thứ 2</Link></li>
                                    <li><Link className={styles.nav_menuLink} href="/xsmt/thu-3">Thứ 3</Link></li>
                                    <li><Link className={styles.nav_menuLink} href="/xsmt/thu-4">Thứ 4</Link></li>
                                    <li><Link className={styles.nav_menuLink} href="/xsmt/thu-5">Thứ 5</Link></li>
                                    <li><Link className={styles.nav_menuLink} href="/xsmt/thu-6">Thứ 6</Link></li>
                                    <li><Link className={styles.nav_menuLink} href="/xsmt/thu-7">Thứ 7</Link></li>
                                    <li><Link className={styles.nav_menuLink} href="/xsmt/chu-nhat">Chủ Nhật</Link></li>
                                </ul>
                            </li>
                            <li className={`${styles.nav_item} ${router.pathname.startsWith('/thongke') ? styles.active : ''}`}>
                                <div className={styles.grouplink}>
                                    <Link href="/thongke/logan" className={styles.nav_itemLink}>Thống kê </Link>
                                    <span className={styles.icon}><i className="fa-solid fa-chevron-down"></i></span>
                                </div>
                                <ul className={styles.nav__menu}>
                                    <li><Link className={styles.nav_menuLink} href="/thongke/logan">Thống Kê Logan</Link></li>
                                    <li><Link className={styles.nav_menuLink} href="/thongke/giaidacbiet">Thống Kê giải đặc biệt</Link></li>
                                    <li><Link className={styles.nav_menuLink} href="/thongke/dauduoi">Thống Kê đầu đuôi loto</Link></li>
                                    <li><Link className={styles.nav_menuLink} href="/thongke/giaidacbiettuan">Bảng đặc biệt tuần/tháng</Link></li>
                                    <li><Link className={styles.nav_menuLink} href="/thongke/TanSuatLoto">Tần Suất Loto</Link></li>
                                    <li><Link className={styles.nav_menuLink} href="/thongke/TanSuatLoCap">Tần Suất Lô Cặp</Link></li>
                                    <li><Link className={styles.nav_menuLink} href="/xsmb/chu-nhat">Tần suất giải đặc biệt</Link></li>
                                </ul>
                            </li>
                            <li className={`${styles.nav_item} ${router.pathname.startsWith('/taodan') ? styles.active : ''}`}>
                                <div className={styles.grouplink}>
                                    <Link href="/TaoDan/" className={styles.nav_itemLink}>Tạo Dàn</Link>
                                    <span className={styles.icon}><i className="fa-solid fa-chevron-down"></i></span>
                                </div>
                                <ul className={styles.nav__menu}>
                                    <li><Link className={styles.nav_menuLink} href="/TaoDan/">Tạo Nhanh Dàn Đặc Biệt </Link></li>
                                    <li><Link className={styles.nav_menuLink} href="/TaoDanD/2D/">Tạo Dàn 2D</Link></li>
                                    <li><Link className={styles.nav_menuLink} href="/TaoDanD/3D4D/">Tạo Dàn 3D-4D</Link></li>
                                    <li><Link className={styles.nav_menuLink} href="/TaoDanD/Ngaunhien9x0x">Tạo Dàn 9X0X Ngẫu Nhiên</Link></li>
                                </ul>
                            </li>
                            <li className={`${styles.nav_item} ${router.pathname.startsWith('/news') ? styles.active : ''}`}>
                                <div className={styles.grouplink}>
                                    <Link href="/news" className={styles.nav_itemLink}>Tin TỨC</Link>
                                    <span className={styles.icon}><i className="fa-solid fa-chevron-down"></i></span>
                                </div>
                                <ul className={styles.nav__menu}>
                                    <li><Link className={styles.nav_menuLink} href="/thongke/logan">Bóng Đá Mới Nhất</Link></li>
                                    <li><Link className={styles.nav_menuLink} href="/thongke/giaidacbiet">Đời Sống</Link></li>
                                </ul>
                            </li>
                            <li className={`${styles.nav_item} ${router.pathname === '/soicau' ? styles.active : ''}`}>
                                <div className={styles.grouplink}>
                                    <Link href="/soicau/soicauMB" className={styles.nav_itemLink}>Soi Cầu</Link>
                                    <span className={styles.icon}><i className="fa-solid fa-chevron-down"></i></span>
                                </div>
                                <ul className={styles.nav__menu}>
                                    <li><Link className={styles.nav_menuLink} href="/soicau/soicauMB">Soi Cầu Miền Bắc</Link></li>
                                    <li><Link className={styles.nav_menuLink} href="/soicau/soicauMT">Soi Cầu Miền Trung</Link></li>
                                    <li><Link className={styles.nav_menuLink} href="/soicau/soicauMN">Soi Cầu Miền Nam</Link></li>
                                </ul>
                            </li>
                            <li className={`${styles.nav_item} ${router.pathname.startsWith('/quaythu') ? styles.active : ''}`}>
                                <div className={styles.grouplink}>
                                    <Link href="/quaythu/" className={styles.nav_itemLink}>Quay Thử</Link>
                                    <span className={styles.icon}><i className="fa-solid fa-chevron-down"></i></span>
                                </div>
                                <ul className={styles.nav__menu}>
                                    <li><Link className={styles.nav_menuLink} href="/thongke/logan">Quay Thử XSMB</Link></li>
                                    <li><Link className={styles.nav_menuLink} href="/thongke/giaidacbiet">Quay Thử XSMT</Link></li>
                                    <li><Link className={styles.nav_menuLink} href="/thongke/dauduoi">Quay Thử XSMN</Link></li>
                                </ul>
                            </li>
                            <li className={`${styles.nav_item} ${router.pathname === '/diendan' ? styles.active : ''}`}>
                                <Link href="/diendan/" className={styles.nav_itemLink}>Diễn Đàn</Link>
                            </li>
                            <li className={`${styles.nav_item} ${router.pathname === '/login' ? styles.active : ''}`}>
                                <Link href="/login" className={styles.nav_itemLink}><span><i className="fa-solid fa-user-plus"></i></span></Link>
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