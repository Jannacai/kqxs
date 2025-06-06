import styles from '../../styles/logan.module.css';

const DescriptionContent = () => (
    <div className={`${styles.contentWrapper} ${styles.expanded}`}>
        <h3 className={styles.h3}>Thống kê lô khan Miền Bắc gồm có những gì?</h3>
        <p className={styles.desc}>
            Những con lô lâu chưa về (lô lên gan) từ 00-99, số ngày gan và số ngày gan cực đại, kỷ lục lâu chưa về nhất (gan max) là tổng bao nhiêu ngày.
        </p>
        <p className={styles.desc}>
            Thống kê cặp lô gan xổ số Miền Bắc (bao gồm 1 số và số lộn của chính nó) lâu chưa về nhất tính đến hôm nay cùng với thời gian gan cực đại của các cặp số đó.
        </p>
        <p className={styles.desc}>
            Người chơi xổ số sẽ dễ dàng nhận biết lô gan XSMB bằng cách xem thống kê những con lô ít xuất hiện nhất trong bảng kết quả. Gan Cực Đại: Số lần kỷ lục mà một con số lâu nhất chưa về.
        </p>
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
            Sử dụng công cụ thống kê chuẩn xác từ các kết quả cũ, XSMB.WIN cung cấp cho bạn thống kê lô gan Miền Bắc chuẩn xác nhất. Với tính năng này, người chơi sẽ có thêm thông tin tham khảo để chọn cho mình con số may mắn, mang đến cơ hội trúng thưởng cao hơn. Chúc bạn may mắn!
        </p>
        <p className={styles.desc}>
            Thống kê lô gan. Xem thống kê lô gan hôm nay nhanh và chính xác nhất tại <a className={styles.action} href="/">XSMN.WIN</a>.
        </p>
    </div>
);

export default DescriptionContent;