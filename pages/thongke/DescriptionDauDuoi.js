import styles from '../../styles/dauduoi.module.css';

const DescriptionContent = () => (
    <div className={styles.contentWrapper}>
        <h3 className={styles.h3}>Thông Tin Trong Thống Kê Đầu Đuôi:</h3>
        <p className={styles.desc}>- Tần suất xuất hiện của Đầu số (0-9) và Đuôi số (0-9) trong 2 số cuối của các giải.</p>
        <p className={styles.desc}>- Phần trăm xuất hiện của từng Đầu/Đuôi, đi kèm số lần xuất hiện cụ thể.</p>
        <p className={styles.desc}>- Khoảng thời gian thống kê (30 ngày, 60 ngày, 90 ngày,..., 1 năm), cùng với ngày bắt đầu và ngày kết thúc.</p>
        <h3 className={styles.h3}>Ý Nghĩa Của Bảng Đầu Đuôi:</h3>
        <p className={styles.desc}>- **Đầu số**: Thống kê tần suất của chữ số đầu tiên trong 2 số cuối của các giải, ví dụ Đầu 0, Đầu 1,..., Đầu 9.</p>
        <p className={styles.desc}>- **Đuôi số**: Thống kê tần suất của chữ số cuối cùng trong 2 số cuối của các giải, ví dụ Đuôi 0, Đuôi 1,..., Đuôi 9.</p>
        <p className={styles.desc}>- Thanh ngang màu xanh dương thể hiện trực quan phần trăm xuất hiện, giúp người chơi dễ dàng nhận biết chữ số nào xuất hiện nhiều nhất hoặc ít nhất.</p>
        <h3 className={styles.h3}>Lợi Ích Của Thống Kê Đầu Đuôi:</h3>
        <p className={styles.desc}>- Giúp người chơi nhận biết xu hướng xuất hiện của các chữ số, từ đó chọn số may mắn để chơi loto.</p>
        <p className={styles.desc}>- Cung cấp dữ liệu chính xác, cập nhật nhanh chóng từ kết quả xổ số.</p>
        <h3 className={styles.h3}>Mẹo Sử Dụng Thống Kê Đầu Đuôi</h3>
        <p className={styles.desc}>
            Kết hợp thống kê đầu đuôi với các công cụ khác như thống kê lô gan hoặc giải đặc biệt để tăng cơ hội trúng thưởng. Ưu tiên chọn các đầu/đuôi có tần suất xuất hiện cao trong thời gian gần đây, nhưng cũng lưu ý đến các số ít xuất hiện vì chúng có thể sắp về.
        </p>
        <p className={styles.desc}>
            XSMN.WIN cung cấp công cụ thống kê Đầu Đuôi loto hoàn toàn miễn phí, giúp người chơi có thêm thông tin để tăng cơ hội trúng thưởng. Chúc bạn may mắn!
        </p>
        <p className={styles.desc}>
            Thống kê Đầu Đuôi loto. Xem thống kê Đầu Đuôi hôm nay nhanh và chính xác tại <a href="https://xsmb.win" className={styles.action}>XSMN.WIN</a>.
        </p>
    </div>
);

export default DescriptionContent;