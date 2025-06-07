import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { getPostById } from "../api/post/index";
import styles from "../../styles/postDetail.module.css";
import Calendar from "../../component/caledar";
import ThongKe from "../../component/thongKe";
import ListXSMB from "../../component/listXSMB";
import ListXSMT from "../../component/listXSMT";
import ListXSMN from "../../component/listXSMN";
import PostList from "./list";

const PostDetail = () => {
    const router = useRouter();
    const { id } = router.query;
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!id) return;

        const fetchPost = async () => {
            try {
                const data = await getPostById(id);
                console.log("Post data:", data);
                setPost(data);
                setLoading(false);
            } catch (err) {
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

    let formattedDate = 'Ngày đăng';
    if (post.createdAt) {
        try {
            const date = new Date(post.createdAt);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            formattedDate = `${day}/${month}/${year}`;
        } catch (error) {
            console.error("Error formatting date:", error);
        }
    }

    return (
        <div>
            <div className="container">
                <div>
                    <Calendar />
                    <ListXSMB />
                    <ListXSMT />
                    <ListXSMN />
                </div>
                <div className={styles.contentWrapper}>
                    <p className={styles.date}>Ngày {formattedDate}</p>
                    <h1 className={styles.title}>{post.title}</h1>
                    <p className={styles.author}>Tác giả: {post.author?.username || "Admin"}</p>
                    {post.img ? (
                        <img
                            src={post.img}
                            alt={post.title}
                            className={styles.image}
                            onError={(e) => { e.target.src = '/placeholder.png'; }}
                        />
                    ) : (
                        <div className={styles.imagePlaceholder}>
                            Không có hình ảnh
                        </div>
                    )}
                    <p className={styles.chuthich}>{post.title}</p>
                    <RenderContent content={post.description} img2={post.img2} title={post.title} />
                    <p className={styles.nguon}>Nguồn: {post.source || "Không rõ"}</p>
                    <button className={styles.backButton} onClick={() => router.push("/news")}>
                        Đến Trang Tin Tức
                    </button>
                </div>
                <ThongKe />
            </div>
            <PostList />
        </div>
    );
};

export default PostDetail;

const RenderContent = ({ content, img2, title }) => {
    if (!content) {
        return null;
    }

    const paragraphs = content
        .split(/\n\s*\n/)
        .filter(paragraph => paragraph.trim() !== '');

    // Chia nội dung thành 2 phần: trước và sau 50%
    const midIndex = Math.floor(paragraphs.length / 2);
    const firstHalf = paragraphs.slice(0, midIndex);
    const secondHalf = paragraphs.slice(midIndex);

    return (
        <div>
            {firstHalf.map((paragraph, index) => (
                <p className={styles.description} key={`first-${index}`}>
                    {paragraph}
                </p>
            ))}
            {img2 && (
                <img
                    src={img2}
                    alt={`Hình ảnh bổ sung cho ${title}`}
                    className={styles.image}
                    onError={(e) => { e.target.src = '/placeholder.png'; }}
                />
            )}
            {secondHalf.map((paragraph, index) => (
                <p className={styles.description} key={`second-${index}`}>
                    {paragraph}
                </p>
            ))}
        </div>
    );
};