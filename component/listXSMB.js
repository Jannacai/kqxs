
import styles from "../styles/listXSMB.module.css"
import Link from "next/link";
const ListXSMB = () => {


    return (
        <div id="list" className={styles.container}>
            <h3 className={styles.title}>
                <span className={styles.icon}><i className="fa-solid fa-chart-simple"></i></span>
                Xổ Số Miền Bắc
                <span className={styles.iconDown}><i class="fa-solid fa-circle-chevron-down"></i></span>
            </h3>
            <ul className={styles.list}>
                <li className={styles.item}>
                    <Link as="/thong-ke-lo-gan" title="Thống Kê Lô Gan" href="" className={styles.action_Link}>Nam Định</Link>
                </li>
                <li className={styles.item}>
                    <Link as="/thong-ke-lo-gan" title="Thống Kê Lô Gan" href="" className={styles.action_Link}>Hà Nội</Link>
                </li>
                <li className={styles.item}>
                    <Link as="/thong-ke-lo-gan" title="Thống Kê Lô Gan" href="" className={styles.action_Link}>Thái Bình</Link>
                </li>
                <li className={styles.item}>
                    <Link as="/thong-ke-lo-gan" title="Thống Kê Lô Gan" href="" className={styles.action_Link}>Quảng Ninh </Link>
                </li>
                <li className={styles.item}>
                    <Link as="/thong-ke-lo-gan" title="Thống Kê Lô Gan" href="" className={styles.action_Link}>Bắc Ninh</Link>
                </li>
                <li className={styles.item}>
                    <Link as="/thong-ke-lo-gan" title="Thống Kê Lô Gan" href="" className={styles.action_Link}>Hải Phòng</Link>
                </li>
            </ul>
        </div>
    )
}
export default ListXSMB;