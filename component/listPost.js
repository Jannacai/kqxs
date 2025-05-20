import styles from "../styles/listpost.module.css";
import Image from "next/image";
import imgItem from "../public/asset/img/backgrond.png";
import { useRouter } from "next/router";
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';

const getStartOfDay = (date) => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    return start.getTime();
};

const ListPost = (props) => {
    const router = useRouter();
    const allPosts = props.appa;
    const displaySlots = 4; // Luôn hiển thị 4 ô
    const timerDuration = 3000; // 5 giây

    // --- Bước 1: Lọc và Sắp xếp TẤT CẢ bài viết trong 2 ngày gần nhất ---
    const allRecentSortedPosts = useMemo(() => {
        // ... (Logic lọc và sắp xếp như cũ, trả về mảng allRecentSortedPosts) ...
        if (!Array.isArray(allPosts)) return [];
        const now = new Date();
        const todayStart = getStartOfDay(now);
        const yesterdayStart = todayStart - (24 * 60 * 60 * 1000);
        const recentPosts = allPosts.filter(post => {
            const postTime = post.createdAt ? new Date(post.createdAt).getTime() : 0;
            return postTime >= yesterdayStart;
        });
        return recentPosts.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
        });
    }, [allPosts]);

    const totalPosts = allRecentSortedPosts.length;

    // --- Bước 2: State quản lý index được highlight ---
    const [highlightIndex, setHighlightIndex] = useState(0); // Index trong allRecentSortedPosts
    const [isPaused, setIsPaused] = useState(false);
    const timeoutRef = useRef(null);

    // --- Bước 3: Tính toán 4 bài viết hiển thị (Sliding window + Wrap-around) ---
    const postsCurrentlyOnDisplay = useMemo(() => {
        if (totalPosts === 0) {
            return [];
        }

        const displayArray = [];
        for (let i = 0; i < displaySlots; i++) {
            // Tính index thực tế trong mảng allRecentSortedPosts, có xử lý vòng lặp
            const actualIndex = (highlightIndex + i) % totalPosts;
            displayArray.push(allRecentSortedPosts[actualIndex]);
        }
        // Đảm bảo luôn trả về 4 item (hoặc ít hơn nếu totalPosts < 4)
        // Nếu totalPosts < 4, mảng sẽ có các phần tử lặp lại do phép modulo
        // Nếu muốn tránh lặp lại khi totalPosts < 4 và chỉ hiển thị số lượng thực tế:
        // return displayArray.slice(0, totalPosts);
        // Nhưng vì yêu cầu là "luôn xuất hiện 4 item", chúng ta giữ nguyên displayArray
        return displayArray;

    }, [allRecentSortedPosts, highlightIndex, totalPosts]);

    // --- Timer và Reset (Cập nhật highlightIndex) ---
    const resetTimer = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
    }, []);

    const startTimer = useCallback(() => {
        resetTimer();
        // Chỉ chạy timer nếu có nhiều hơn 1 bài và không bị pause
        if (!isPaused && totalPosts > 1) {
            timeoutRef.current = setTimeout(() => {
                // Chuyển highlight sang item tiếp theo trong danh sách đầy đủ
                setHighlightIndex((prevIndex) => (prevIndex + 1) % totalPosts);
            }, timerDuration);
        }
    }, [isPaused, totalPosts, resetTimer]);

    useEffect(() => {
        startTimer();
        return () => resetTimer();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [highlightIndex, isPaused, startTimer]); // Chạy lại khi index hoặc trạng thái pause thay đổi

    // --- Nút điều khiển (Cập nhật highlightIndex) ---
    const handleManualChange = (newIndex) => {
        setIsPaused(true);
        setHighlightIndex(newIndex);
    };

    const handlePrev = () => {
        if (totalPosts <= 1) return;
        const newIndex = (highlightIndex - 1 + totalPosts) % totalPosts;
        handleManualChange(newIndex);
    };

    const handleNext = () => {
        if (totalPosts <= 1) return;
        const newIndex = (highlightIndex + 1) % totalPosts;
        handleManualChange(newIndex);
    };

    // --- Hiển thị và Xử lý Hover ---
    if (totalPosts === 0) {
        return (
            <div className={styles.postContainer}>
                <h2 className={styles.postTitle}>Tin Tức Bóng Đá 24h</h2>
                <p>Không có bài viết nào trong 2 ngày gần đây.</p>
            </div>
        );
    }

    return (
        <div
            className={styles.postContainer}
            onMouseEnter={() => { setIsPaused(true); resetTimer(); }}
            onMouseLeave={() => { setIsPaused(false); }}
        >
            {/* Có thể bỏ thông tin trang nếu không còn phù hợp */}
            <h2 className={styles.postTitle}>Tin Tức Bóng Đá 24h</h2>

            <div className={styles.listPostWrapper}>
                {/* Render 4 item đã tính toán */}
                <div className={styles.listPost}>
                    {postsCurrentlyOnDisplay.map((post, index) => {
                        const itemClassName = `${styles.itemPost} ${index === 1 ? styles.active : ''}`;
                        const uniqueKey = `${post?._id || `post-${index}`}-${index}`;
                        // --- PHẦN ĐỊNH DẠNG NGÀY THÁNG ---
                        let formattedDate = 'Ngày đăng';
                        if (post.createdAt) {
                            try {
                                const date = new Date(post.createdAt);
                                // Lấy ngày, tháng (+1 vì getMonth trả về từ 0-11), năm
                                const day = date.getDate();
                                const month = date.getMonth() + 1;
                                const year = date.getFullYear();

                                // Dùng padStart để thêm '0' nếu ngày/tháng nhỏ hơn 10
                                const formattedDay = String(day).padStart(2, '0');
                                const formattedMonth = String(month).padStart(2, '0');

                                // Kết hợp lại theo định dạng dd/MM/yyyy
                                formattedDate = `${formattedDay}/${formattedMonth}/${year}`;
                            } catch (error) {
                                console.error("Error formatting date:", post.createdAt, error);
                                // Giữ giá trị mặc định nếu có lỗi
                            }
                        }
                        // --- KẾT THÚC PHẦN ĐỊNH DẠNG ---
                        // Kiểm tra nếu post không tồn tại (trường hợp cực hiếm)
                        if (!post) {
                            return <div key={uniqueKey} className={styles.itemPlaceholder}></div>; // Hoặc một placeholder
                        }

                        return (
                            <div key={uniqueKey} className={itemClassName}>
                                <a href={`/post/${post._id}`} onClick={(e) => { e.preventDefault(); router.push(`/post/${post._id}`); }}>
                                    <img
                                        className={styles.imgPost}
                                        src={post.img || imgItem.src}
                                        alt={post.title || "Ảnh bài viết"}
                                        onError={(e) => { e.target.onerror = null; e.target.src = imgItem.src }}
                                    />
                                </a>
                                <span className={styles.postDate}>
                                    {formattedDate}
                                </span>
                                <h3 className={styles.title} onClick={() => router.push(`/post/${post._id}`)}>
                                    {post.title}
                                </h3>
                                <p className={styles.desc}>
                                    {post.description?.slice(0, 100)}...
                                </p>
                            </div>
                        );
                    })}
                </div>

                {/* Nút điều khiển chuyển highlight */}
                {totalPosts > 1 && ( // Chỉ hiển thị nút nếu có nhiều hơn 1 bài tổng cộng
                    <div className={styles.controls}>
                        <button onClick={handlePrev} aria-label="Bài viết trước"><i class="fa-solid fa-chevron-left"></i></button>
                        <button onClick={handleNext} aria-label="Bài viết tiếp theo"><i class="fa-solid fa-chevron-right"></i></button>
                    </div>
                )}
            </div>
        </div>
    );
}
export default ListPost;