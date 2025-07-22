
import styles from "../styles/listXSMB.module.css"
import Link from "next/link";
const ListXSMB = () => {

    return (
        <div id="list" className={styles.container}>
            <h3 className={styles.title}>
                {/* <span className={styles.icon}><i className="fa-solid fa-chart-simple"></i></span> */}
                Xổ Số Miền Bắc
                {/* <span className={styles.iconDown}><i class="fa-solid fa-circle-chevron-down"></i></span> */}
            </h3>
            <ul className={styles.list}>
                <li className={styles.item}>
                    <Link title="Xổ Số Miền Bắc - Nam Định" href="/xsmb/tinh/nam-dinh" className={styles.action_Link}>Nam Định</Link>
                </li>
                <li className={styles.item}>
                    <Link title="Xổ Số Miền Bắc - Hà Nội" href="/xsmb/tinh/ha-noi" className={styles.action_Link}>Hà Nội</Link>
                </li>
                <li className={styles.item}>
                    <Link title="Xổ Số Miền Bắc - Thái Bình" href="/xsmb/tinh/thai-binh" className={styles.action_Link}>Thái Bình</Link>
                </li>
                <li className={styles.item}>
                    <Link title="Xổ Số Miền Bắc - Quảng Ninh" href="/xsmb/tinh/quang-ninh" className={styles.action_Link}>Quảng Ninh </Link>
                </li>
                <li className={styles.item}>
                    <Link title="Xổ Số Miền Bắc - Bắc Ninh" href="/xsmb/tinh/bac-ninh" className={styles.action_Link}>Bắc Ninh</Link>
                </li>
                <li className={styles.item}>
                    <Link title="Xổ Số Miền Bắc - Hải Phòng" href="/xsmb/tinh/hai-phong" className={styles.action_Link}>Hải Phòng</Link>
                </li>
            </ul>
        </div>
    )
}
export default ListXSMB;