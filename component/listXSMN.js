
import styles from "../styles/listXSMN.module.css"
import Link from "next/link";
const ListXSMN = () => {


    return (
        <div id="list" className={styles.container}>
            <h3 className={styles.title}>
                <span className={styles.icon}><i class="fa-solid fa-landmark"></i></span>
                Xổ Số Miền Nam
                <span className={styles.iconDown}><i class="fa-solid fa-circle-chevron-left"></i></span>
            </h3>
            <ul className={styles.list}>
                <li className={styles.item}>
                    <Link title="Thống Kê Lô Gan" href="/xsmn/tinh/vung-tau" className={styles.action_Link}>Vũng Tàu</Link>
                </li>
                <li className={styles.item}>
                    <Link title="Thống Kê Lô Gan" href="/xsmn/tinh/can-tho" className={styles.action_Link}>Cần Thơ</Link>
                </li>
                <li className={styles.item}>
                    <Link title="Thống Kê Lô Gan" href="/xsmn/tinh/dong-thap" className={styles.action_Link}>Đồng Tháp</Link>
                </li>
                <li className={styles.item}>
                    <Link title="Thống Kê Lô Gan" href="/xsmn/tinh/tphcm" className={styles.action_Link}>TP.Hồ Chí Minh </Link>
                </li>
                <li className={styles.item}>
                    <Link title="Thống Kê Lô Gan" href="/xsmn/tinh/ca-mau" className={styles.action_Link}>Cà Mau</Link>
                </li>
                <li className={styles.item}>
                    <Link title="Thống Kê Lô Gan" href="/xsmn/tinh/ben-tre" className={styles.action_Link}>Bến Tre</Link>
                </li>
                <li className={styles.item}>
                    <Link title="Thống Kê Lô Gan" href="/xsmn/tinh/bac-lieu" className={styles.action_Link}>Bạc Liêu</Link>
                </li>
                <li className={styles.item}>
                    <Link title="Thống Kê Lô Gan" href="/xsmn/tinh/soc-trang" className={styles.action_Link}>Sóc Trăng</Link>
                </li>
                <li className={styles.item}>
                    <Link title="Thống Kê Lô Gan" href="/xsmn/tinh/dong-nai" className={styles.action_Link}>Đồng Nai</Link>
                </li>
                <li className={styles.item}>
                    <Link title="Thống Kê Lô Gan" href="/xsmn/tinh/an-giang" className={styles.action_Link}>An Giang</Link>
                </li>
                <li className={styles.item}>
                    <Link title="Thống Kê Lô Gan" href="/xsmn/tinh/tay-ninh" className={styles.action_Link}>Tây Ninh</Link>
                </li>

                <li className={styles.item}>
                    <Link title="Thống Kê Lô Gan" href="/xsmn/tinh/binh-thuan" className={styles.action_Link}>Bình Thuận</Link>
                </li>

                <li className={styles.item}>
                    <Link title="Thống Kê Lô Gan" href="/xsmn/tinh/vinh-long" className={styles.action_Link}>Vĩnh Long</Link>
                </li>

                <li className={styles.item}>
                    <Link title="Thống Kê Lô Gan" href="/xsmn/tinh/binh-duong" className={styles.action_Link}>Bình Dương</Link>
                </li>

                <li className={styles.item}>
                    <Link title="Thống Kê Lô Gan" href="/xsmn/tinh/tra-vinh" className={styles.action_Link}>Trà Vinh</Link>
                </li>
                <li className={styles.item}>
                    <Link title="Thống Kê Lô Gan" href="/xsmn/tinh/long-an" className={styles.action_Link}>Long An</Link>
                </li>
                <li className={styles.item}>
                    <Link title="Thống Kê Lô Gan" href="/xsmn/tinh/binh-phuoc" className={styles.action_Link}>Bình Phước</Link>
                </li>
                <li className={styles.item}>
                    <Link title="Thống Kê Lô Gan" href="/xsmn/tinh/hau-giang" className={styles.action_Link}>Hậu Giang</Link>
                </li>
                <li className={styles.item}>
                    <Link title="Thống Kê Lô Gan" href="/xsmn/tinh/kien-giang" className={styles.action_Link}>Kiên Giang</Link>
                </li>
                <li className={styles.item}>
                    <Link title="Thống Kê Lô Gan" href="/xsmn/tinh/tien-giang" className={styles.action_Link}>Tiền Giang</Link>
                </li>
                <li className={styles.item}>
                    <Link title="Thống Kê Lô Gan" href="/xsmn/tinh/da-lat" className={styles.action_Link}>Đà Lạt</Link>
                </li>
            </ul>
        </div>
    )
}
export default ListXSMN;