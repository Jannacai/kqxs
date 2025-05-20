// pages/posts/[id].js
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { getPostById } from "../api/post/index";
import styles from "../../styles/postDetail.module.css";
import Calendar from "../../component/caledar";
import ThongKe from "../../component/thongKe"
import ListXSMB from "../../component/listXSMB"
import ListXSMT from "../../component/listXSMT"
import ListXSMN from "../../component/listXSMN"
import PostList from "./list"
const PostDetail = () => {
    const router = useRouter();
    const { id } = router.query; // Lấy ID từ URL
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!id) return; // Đợi id được lấy từ router

        const fetchPost = async () => {
            try {
                // console.log("Fetching post with ID:", id);
                const data = await getPostById(id);
                // console.log("Post data:", data);
                setPost(data);
                setLoading(false);
            } catch (err) {
                // console.error("Error fetching post:", err);
                setError(err.message || "Đã có lỗi xảy ra khi lấy chi tiết bài viết");
                setLoading(false);
            }
        };

        fetchPost();
    }, [id]);

    if (loading) {
        return <p>Đang tải...</p>;
    }

    if (error) {
        return <p className={styles.error}>{error}</p>;
    }

    if (!post) {
        return <p>Bài viết không tồn tại.</p>;
    }
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
    return (
        <div>
            <div className="container">
                <div>
                    <Calendar></Calendar>
                    <ListXSMB></ListXSMB>
                    <ListXSMT></ListXSMT>
                    <ListXSMN></ListXSMN>
                </div>

                <div>
                    <p className={styles.date}>Ngày {formattedDate}</p>
                    <h1 className={styles.title}>{post.title}</h1>
                    <p className={styles.author}>Tác giả: {post.author?.username || "Admin"}</p>
                    {/* <p className={styles.description}>{post.description}</p> */}
                    {post.img ? (
                        <img
                            src={post.img}
                            alt={post.title}
                            className={styles.image}
                        />
                    ) : (<p>ko có hình</p>)}
                    <p className={styles.chuthich}>{post.title}</p>
                    <RenderContent content={post.description} />
                    <p className={styles.nguon}>Nguồn: { }</p>

                    <button className={styles.backButton} onClick={() => router.push("/news")}>
                        Đến Trang Tin Tức
                    </button>
                </div>
                <ThongKe></ThongKe>
            </div>
            <PostList></PostList>
        </div>
    );
};

export default PostDetail;

const RenderContent = ({ content }) => {
    if (!content) {
        return null;
    }

    const paragraphs = content
        .split(/\n\s*\n/) // Regex để tách đoạn
        .filter(paragraph => paragraph.trim() !== '');

    return (
        // Thêm một div bao bọc với class để có thể style nếu cần
        <div >
            {paragraphs.map((paragraph, index) => (
                <p className={styles.description} key={index}>
                    {paragraph}
                </p>
            ))}
        </div>
    );
};