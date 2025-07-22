
import styles from "../styles/listXSMT.module.css"
import Link from "next/link";
const ListXSMT = () => {


    return (
        <div id="list" className={styles.container}>
            <h3 className={styles.title}>
                {/* <span className={styles.icon}><i class="fa-solid fa-mountain-sun"></i></span> */}
                Xổ Số Miền Trung
                {/* <span className={styles.iconDown}><i class="fa-solid fa-circle-chevron-left"></i></span> */}
            </h3>
            <ul className={styles.list}>
                <li className={styles.item}>
                    <Link title="Kết Quả Xổ Số Huế" href="/xsmt/tinh/hue" className={styles.action_Link}>Huế</Link>
                </li>
                <li className={styles.item}>
                    <Link title="Kết Quả Xổ Số Phú Yên" href="/xsmt/tinh/phu-yen" className={styles.action_Link}>Phú Yên</Link>
                </li>
                <li className={styles.item}>
                    <Link title="Kết Quả Xổ Số Đắk Lắk" href="/xsmt/tinh/dak-lak" className={styles.action_Link}>Đắk Lắk</Link>
                </li>
                <li className={styles.item}>
                    <Link title="Kết Quả Xổ Số Quảng Nam" href="/xsmt/tinh/quang-nam" className={styles.action_Link}>Quảng Nam </Link>
                </li>
                <li className={styles.item}>
                    <Link title="Kết Quả Xổ Số Khánh Hòa " href="/xsmt/tinh/khanh-hoa" className={styles.action_Link}>Khánh Hòa</Link>
                </li>
                <li className={styles.item}>
                    <Link title="Kết Quả Xổ Số Đà Nẵng" href="/xsmt/tinh/da-nang" className={styles.action_Link}>Đà Nẵng</Link>
                </li>
                <li className={styles.item}>
                    <Link title="Kết Quả Xổ Số Bình Định" href="/xsmt/tinh/binh-dinh" className={styles.action_Link}>Bình Định</Link>
                </li>
                <li className={styles.item}>
                    <Link title="Kết Quả Xổ Số Quảng Trị" href="/xsmt/tinh/quang-tri" className={styles.action_Link}>Quảng Trị</Link>
                </li>
                <li className={styles.item}>
                    <Link title="Kết Quả Xổ Số Ninh Thuận " href="/xsmt/tinh/ninh-thuan" className={styles.action_Link}>Ninh Thuận</Link>
                </li>
                <li className={styles.item}>
                    <Link title="Kết Quả Xổ Số Gia Lai" href="/xsmt/tinh/gia-lai" className={styles.action_Link}>Gia Lai</Link>
                </li>
                <li className={styles.item}>
                    <Link title="Kết Quả Xổ Số Quảng Ngãi " href="/xsmt/tinh/quang-ngai" className={styles.action_Link}>Quảng Ngãi</Link>
                </li>

                <li className={styles.item}>
                    <Link title="Kết Quả Xổ Số Đắk Nông" href="/xsmt/tinh/dak-nong" className={styles.action_Link}>Đắk Nông</Link>
                </li>

                <li className={styles.item}>
                    <Link title="Kết Quả Xổ Số Kon Tum" href="/xsmt/tinh/kon-tum" className={styles.action_Link}>Kon Tum</Link>
                </li>
            </ul>
        </div>
    )
}
export default ListXSMT;