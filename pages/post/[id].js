import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
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
    const [relatedPostsPool, setRelatedPostsPool] = useState([]);
    const [footballPostsPool, setFootballPostsPool] = useState([]);
    const [relatedIndex, setRelatedIndex] = useState(0);
    const [footballIndex, setFootballIndex] = useState(0);

    const fetchWithRetry = async (fetchFn, maxRetries = 3, delay = 10000) => {
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await fetchFn();
            } catch (err) {
                if (err.message.includes("429") && i < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
                    continue;
                }
                throw err;
            }
        }
    };

    const fetchPost = useCallback(async () => {
        if (!id) return;
        try {
            const data = await getPostById(id, true);
            setPost(data);
            setLoading(false);
        } catch (err) {
            setError(err.message || "Đã có lỗi xảy ra khi lấy chi tiết bài viết");
            setLoading(false);
        }
    }, [id]);

    const fetchRelatedPostsPool = useCallback(async () => {
        if (!post?.category) return;
        try {
            const response = await fetchWithRetry(() =>
                getPosts(null, 1, 15, post.category, true)
            );
            const seenIds = new Set();
            const filteredPosts = response.posts
                .filter(p => p._id !== id && !seenIds.has(p._id) && seenIds.add(p._id))
                .slice(0, 15);
            console.log("Related Posts Pool:", filteredPosts.map(p => p._id));
            setRelatedPostsPool(filteredPosts);
            setRelatedPosts(filteredPosts.slice(0, 4));
            setRelatedIndex(4);
        } catch (err) {
            console.error("Error fetching related posts pool:", err);
            if (err.message.includes("429")) {
                setError("Quá nhiều yêu cầu, vui lòng đợi một chút...");
            }
        }
    }, [id, post?.category]);

    const fetchFootballPostsPool = useCallback(async () => {
        try {
            const response = await fetchWithRetry(() =>
                getPosts(null, 1, 15, "Thể thao", true)
            );
            const seenIds = new Set();
            const filteredPosts = response.posts
                .filter(p => p._id !== id && !seenIds.has(p._id) && seenIds.add(p._id))
                .slice(0, 15);
            console.log("Football Posts Pool:", filteredPosts.map(p => p._id));
            setFootballPostsPool(filteredPosts);
            setFootballPosts(filteredPosts.slice(0, 3));
            setFootballIndex(3);
        } catch (err) {
            console.error("Error fetching football posts pool:", err);
            if (err.message.includes("429")) {
                setError("Quá nhiều yêu cầu, vui lòng đợi một chút...");
            }
        }
    }, [id]);

    useEffect(() => {
        fetchPost();
    }, [fetchPost]);

    useEffect(() => {
        if (post?.category) {
            fetchRelatedPostsPool();
            fetchFootballPostsPool();
        }
    }, [post?.category, fetchRelatedPostsPool, fetchFootballPostsPool]);

    useEffect(() => {
        const rotatePosts = () => {
            setRelatedPosts(prev => {
                if (relatedPostsPool.length === 0) return prev;
                const currentIds = new Set(prev.map(p => p._id));
                let nextIndex = relatedIndex;
                let nextPost = relatedPostsPool[nextIndex];

                while (nextPost && currentIds.has(nextPost._id) && nextIndex < relatedPostsPool.length) {
                    nextIndex = (nextIndex + 1) % relatedPostsPool.length;
                    nextPost = relatedPostsPool[nextIndex];
                }

                const newPosts = [...prev.slice(0, 3), nextPost || prev[3]];
                console.log("Related Posts Updated:", newPosts.map(p => p._id));
                setRelatedIndex((nextIndex + 1) % relatedPostsPool.length);
                return newPosts;
            });

            setFootballPosts(prev => {
                if (footballPostsPool.length === 0) return prev;
                const currentIds = new Set(prev.map(p => p._id));
                let nextIndex = footballIndex;
                let nextPost = footballPostsPool[nextIndex];

                while (nextPost && currentIds.has(nextPost._id) && nextIndex < footballPostsPool.length) {
                    nextIndex = (nextIndex + 1) % footballPostsPool.length;
                    nextPost = footballPostsPool[nextIndex];
                }

                const newPosts = [...prev.slice(0, 2), nextPost || prev[2]];
                console.log("Football Posts Updated:", newPosts.map(p => p._id));
                setFootballIndex((nextIndex + 1) % footballPostsPool.length);
                return newPosts;
            });

            setTimeout(() => {
                setRelatedPosts(prev => {
                    if (prev.length < 4) return prev;
                    const newPosts = [prev[3], ...prev.slice(0, 3)];
                    console.log("Related Posts Rotated:", newPosts.map(p => p._id));
                    return newPosts;
                });
                setFootballPosts(prev => {
                    if (prev.length < 3) return prev;
                    const newPosts = [prev[2], ...prev.slice(0, 2)];
                    console.log("Football Posts Rotated:", newPosts.map(p => p._id));
                    return newPosts;
                });
            }, 5000);
        };

        const interval = setInterval(rotatePosts, 10000);
        return () => clearInterval(interval);
    }, [relatedIndex, footballIndex, relatedPostsPool, footballPostsPool]);

    const formattedDate = useMemo(() => {
        if (!post?.createdAt) return "Ngày đăng";
        try {
            const date = new Date(post.createdAt);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        } catch (error) {
            console.error("Error formatting date:", error);
            return "Ngày đăng";
        }
    }, [post?.createdAt]);

    const displayedRelatedPosts = useMemo(() => relatedPosts.slice(0, 4), [relatedPosts]);
    const displayedFootballPosts = useMemo(() => footballPosts.slice(0, 3), [footballPosts]);

    if (loading) {
        return <p className={styles.loading}>Đang tải...</p>;
    }

    if (error) {
        return <p className={styles.error}>{error}</p>;
    }

    if (!post) {
        return <p className={styles.error}>Bài viết không tồn tại.</p>;
    }

    const metaDescription = post.description.length > 160
        ? `${post.description.substring(0, 157)}...`
        : post.description;

    const structuredData = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": post.title,
        "datePublished": post.createdAt,
        "author": {
            "@type": "Person",
            "name": post.author?.username || "Admin"
        },
        "image": post.img || "/backgrond.png",
        "description": metaDescription,
        "publisher": {
            "@type": "Organization",
            "name": "XSMB.WIN",
            "logo": {
                "@type": "ImageObject",
                "url": "/logo.png"
            }
        }
    };

    const RelatedPostItem = React.memo(({ post }) => (
        <Link href={`/post/${post._id}`} className={styles.relatedItem} title={post.title}>
            <img
                src={post.img || '/backgrond.png'}
                alt={post.title}
                className={styles.relatedImage}
                loading="lazy"
                onError={(e) => { e.target.src = '/backgrond.png'; }}
            />
            <h3 className={styles.relatedItemTitle}>{post.title}</h3>
        </Link>
    ));

    const FootballPostItem = React.memo(({ post }) => (
        <Link href={`/post/${post._id}`} className={styles.footballItem} title={post.title}>
            <img
                src={post.img || '/backgrond.png'}
                alt={post.title}
                className={styles.footballImage}
                loading="lazy"
                onError={(e) => { e.target.src = '/backgrond.png'; }}
            />
            <div className={styles.footballContent}>
                <h3 className={styles.footballItemTitle}>{post.title}</h3>
                <p className={styles.footballItemExcerpt}>
                    {post.description.length > 100
                        ? `${post.description.substring(0, 100)}...`
                        : post.description}
                </p>
            </div>
        </Link>
    ));

    return (
        <>
            <Head>
                <title>{post.title} - XSMB.WIN</title>
                <meta name="description" content={metaDescription} />
                <meta name="keywords" content={`${post.title}, ${post.category}, tin tức, XSMB.WIN`} />
                <meta name="author" content={post.author?.username || "Admin"} />
                <meta property="og:title" content={post.title} />
                <meta property="og:description" content={metaDescription} />
                <meta property="og:image" content={post.img || "/backgrond.png"} />
                <meta property="og:type" content="article" />
                <meta property="og:url" content={`https://xsmb.win/post/${id}`} />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={post.title} />
                <meta name="twitter:description" content={metaDescription} />
                <meta name="twitter:image" content={post.img || "/backgrond.png"} />
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
            </Head>
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
                                    loading="lazy"
                                    onError={(e) => { e.target.src = '/backgrond.png'; }}
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
                            {displayedFootballPosts.length > 0 ? (
                                displayedFootballPosts.map((footballPost) => (
                                    <FootballPostItem key={footballPost._id} post={footballPost} />
                                ))
                            ) : (
                                <p className={styles.noFootball}>Không có bài viết bóng đá.</p>
                            )}
                        </div>
                    </div>
                    <div className={styles.relatedPosts}>
                        <h2 className={styles.relatedTitle}>Bài viết liên quan</h2>
                        {displayedRelatedPosts.length > 0 ? (
                            displayedRelatedPosts.map((relatedPost) => (
                                <RelatedPostItem key={relatedPost._id} post={relatedPost} />
                            ))
                        ) : (
                            <p className={styles.noRelated}>Không có bài viết liên quan.</p>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default PostDetail;

const RenderContent = React.memo(({ content, img2, caption2, title }) => {
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
                        loading="lazy"
                        onError={(e) => { e.target.src = '/backgrond.png'; }}
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
});