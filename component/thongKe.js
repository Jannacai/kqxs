
import styles from "../public/css/thongke.module.css";
import Link from "next/link";
const ThongKe = () => {


    return (
        <div className={styles.container}>
            <h3 className={styles.title}>
                <span className={styles.icon}><i className="fa-solid fa-chart-simple"></i></span>
                Thống Kê Hot</h3>
            <ul className={styles.list}>
                <li className={styles.item}>
                    <Link as="/thong-ke-lo-gan" title="Thống Kê Lô Gan" href="" className={styles.action_Link}>Thống Kê Lô Gan</Link>
                </li>
                <li className={styles.item}>
                    <Link as="/thong-ke-lo-gan" title="Thống Kê Lô Gan" href="" className={styles.action_Link}>Thống kê giải đặc biệt</Link>
                </li>
                <li className={styles.item}>
                    <Link as="/thong-ke-lo-gan" title="Thống Kê Lô Gan" href="" className={styles.action_Link}>Thống kê đầu đuôi loto</Link>
                </li>
                <li className={styles.item}>
                    <Link as="/thong-ke-lo-gan" title="Thống Kê Lô Gan" href="" className={styles.action_Link}>Bảng đặc biệt tuần </Link>
                </li>
                <li className={styles.item}>
                    <Link as="/thong-ke-lo-gan" title="Thống Kê Lô Gan" href="" className={styles.action_Link}>Bảng đặc biệt tháng</Link>
                </li>
                <li className={styles.item}>
                    <Link as="/thong-ke-lo-gan" title="Thống Kê Lô Gan" href="" className={styles.action_Link}>Bảng đặc biệt năm</Link>
                </li>
                <li className={styles.item}>
                    <Link as="/thong-ke-lo-gan" title="Thống Kê Lô Gan" href="" className={styles.action_Link}>Tần suất giải đặc biệt</Link>
                </li>
                <li className={styles.item}>
                    <Link as="/thong-ke-lo-gan" title="Thống Kê Lô Gan" href="" className={styles.action_Link}>Tần suất cặp Loto</Link>
                </li>
                <li className={styles.item}>
                    <Link as="/thong-ke-lo-gan" title="Thống Kê Lô Gan" href="" className={styles.action_Link}>Tần suất Lô rơi</Link>
                </li>
                <li className={styles.item}>
                    <Link as="/thong-ke-lo-gan" title="Thống Kê Lô Gan" href="" className={styles.action_Link}>Thống kê chu kỳ dàn loto</Link>
                </li>
                <li className={styles.item}>
                    <Link as="/thong-ke-lo-gan" title="Thống Kê Lô Gan" href="" className={styles.action_Link}>Thống kê chu kỳ dàn loto</Link>
                </li>
            </ul>
        </div>
    );
}
export default ThongKe;