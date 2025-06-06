import styles from '../../styles/logan.module.css';

const DescriptionContent = () => (
    <div className={`${styles.contentWrapper} ${styles.expanded}`}>
        <h3 className={styles.h3}>Ý nghĩa các cột trong bảng lô gan</h3>
        <p className={styles.desc}>
            Cột số: thống kê các cặp loto đã lên gan, tức là cặp 2 số cuối của các giải có ít nhất 10 ngày liên tiếp chưa xuất hiện trong bảng kết quả đã về trong 24h qua.
        </p>
        <p className={styles.desc}>
            Ngày gần nhất: thời điểm về của các cặp lô gan, tức là ngày cuối cùng mà lô đó xuất hiện trước khi lì ra trong kết quả xổ số Miền Bắc tới nay.
        </p>
        <p className={styles.desc}>
            Số ngày gan: số ngày mà con số lô tô đó chưa ra.
        </p>
        <p className={styles.desc}>
            Sử dụng công cụ thống kê chuẩn xác từ các kết quả cũ, XSMN.WIN cung cấp cho bạn thống kê lô gan Miền Bắc chuẩn xác nhất. Với tính năng này, người chơi sẽ có thêm thông tin tham khảo để chọn cho mình con số may mắn, mang đến cơ hội trúng thưởng cao hơn. Chúc bạn may mắn!
        </p>
        <p className={styles.desc}>
            Thống kê lô gan. Xem thống kê lô gan hôm nay nhanh và chính xác nhất tại <a className={styles.action} href="/">XSMN.WIN</a>.
        </p>
    </div>
);

export default DescriptionContent;