import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { getPostById, getPosts } from "../api/post/index";
import Link from "next/link";
import styles from "../../styles/postDetail.module.css";

const PostDetail = () => {
    const router = useRouter();
    const { id } = router.query;
    const [post, setPost] = useState(null);
    const [relatedPosts, setRelatedPosts] = useState([]);
    const [footballPosts, setFootballPosts] = useState([]);
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

        const fetchRelatedPosts = async () => {
            try {
                const response = await getPosts(null, 1, 5);
                const filteredPosts = response.posts
                    .filter(p => p._id !== id)
                    .slice(0, 4);
                setRelatedPosts(filteredPosts);
            } catch (err) {
                console.error("Error fetching related posts:", err);
            }
        };

        const fetchFootballPosts = async () => {
            try {
                const response = await getPosts(null, 1, 4, "Thể thao"); // Lấy bài viết Thể thao
                const filteredPosts = response.posts
                    .filter(p => p._id !== id)
                    .slice(0, 3); // Giới hạn 3 bài
                setFootballPosts(filteredPosts);
            } catch (err) {
                console.error("Error fetching football posts:", err);
            }
        };

        fetchPost();
        fetchRelatedPosts();
        fetchFootballPosts();
    }, [id]);

    if (loading) {
        return <p className={styles.loading}>Đang tải...</p>;
    }

    if (error) {
        return <p className={styles.error}>{error}</p>;
    }

    if (!post) {
        return <p className={styles.error}>Bài viết không tồn tại.</p>;
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
        <div className={styles.pageWrapper}>
            <div className={styles.container}>
                <div className={styles.contentWrapper}>
                    <h1 className={styles.title}>{post.title}</h1>
                    <div className={styles.meta}>
                        <span className={styles.date}>Ngày {formattedDate}</span>
                        <span className={styles.author}>Tác giả: {post.author?.username || "Admin"}</span>
                    </div>
                    {post.img ? (
                        <figure className={styles.imageWrapper}>
                            <img
                                src={post.img}
                                alt={post.title}
                                className={styles.image}
                                onError={(e) => { e.target.src = '/placeholder.png'; }}
                            />
                            {post.caption && (
                                <figcaption className={styles.caption}>{post.caption}</figcaption>
                            )}
                        </figure>
                    ) : (
                        <div className={styles.imagePlaceholder}>
                            Không có hình ảnh
                        </div>
                    )}
                    <RenderContent content={post.description} img2={post.img2} caption2={post.caption2} title={post.title} />
                    <p className={styles.source}>Nguồn: {post.source || "Theo XSMB.WIN"}</p>
                    <button className={styles.backButton} onClick={() => router.push("/news")}>
                        Đến Trang Tin Tức
                    </button>
                    <div className={styles.footballPosts}>
                        <h2 className={styles.footballTitle}>Tin bóng đá nổi bật</h2>
                        {footballPosts.length > 0 ? (
                            footballPosts.map((footballPost) => (
                                <Link
                                    key={footballPost._id}
                                    href={`/post/${footballPost._id}`}
                                    className={styles.footballItem}
                                >
                                    <img
                                        src={footballPost.img || '/placeholder.png'}
                                        alt={footballPost.title}
                                        className={styles.footballImage}
                                        onError={(e) => { e.target.src = '/placeholder.png'; }}
                                    />
                                    <div className={styles.footballContent}>
                                        <h3 className={styles.footballItemTitle}>{footballPost.title}</h3>
                                        <p className={styles.footballItemExcerpt}>
                                            {footballPost.description.length > 100
                                                ? `${footballPost.description.substring(0, 100)}...`
                                                : footballPost.description}
                                        </p>
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <p className={styles.noFootball}>Không có bài viết bóng đá.</p>
                        )}
                    </div>
                </div>
                <div className={styles.relatedPosts}>
                    <h2 className={styles.relatedTitle}>Bài viết liên quan</h2>
                    {relatedPosts.length > 0 ? (
                        relatedPosts.map((relatedPost) => (
                            <Link
                                key={relatedPost._id}
                                href={`/post/${relatedPost._id}`}
                                className={styles.relatedItem}
                            >
                                <img
                                    src={relatedPost.img || '/placeholder.png'}
                                    alt={relatedPost.title}
                                    className={styles.relatedImage}
                                    onError={(e) => { e.target.src = '/placeholder.png'; }}
                                />
                                <h3 className={styles.relatedItemTitle}>{relatedPost.title}</h3>
                            </Link>
                        ))
                    ) : (
                        <p className={styles.noRelated}>Không có bài viết liên quan.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PostDetail;

const RenderContent = ({ content, img2, caption2, title }) => {
    if (!content) {
        return null;
    }

    const paragraphs = content
        .split(/\n\s*\n/)
        .filter(paragraph => paragraph.trim() !== '');

    const midIndex = Math.floor(paragraphs.length / 2);
    const firstHalf = paragraphs.slice(0, midIndex);
    const secondHalf = paragraphs.slice(midIndex);

    return (
        <div className={styles.content}>
            {firstHalf.map((paragraph, index) => (
                <p className={styles.description} key={`first-${index}`}>
                    {paragraph}
                </p>
            ))}
            {img2 && (
                <figure className={styles.imageWrapper}>
                    <img
                        src={img2}
                        alt={`Hình ảnh bổ sung cho ${title}`}
                        className={styles.image}
                        onError={(e) => { e.target.src = '/placeholder.png'; }}
                    />
                    {caption2 && (
                        <figcaption className={styles.caption}>{caption2}</figcaption>
                    )}
                </figure>
            )}
            {secondHalf.map((paragraph, index) => (
                <p className={styles.description} key={`second-${index}`}>
                    {paragraph}
                </p>
            ))}
        </div>
    );
};