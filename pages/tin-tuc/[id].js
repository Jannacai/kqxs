import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { getCombinedPostData } from "../api/post/index";
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

    const fetchWithRetry = async (fetchFn, maxRetries = 3, delay = 3000) => {
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

    const fetchPostData = useCallback(async () => {
        if (!id) return;
        try {
            const actualId = id.includes('-') ? id.split('-').pop() : id;
            const data = await fetchWithRetry(() => getCombinedPostData(actualId, true));
            console.log("Fetched data:", data);
            setPost(data.post);
            const uniqueRelated = [...new Map(data.related.map(item => [item._id, item])).values()];
            const uniqueFootball = [...new Map(data.football.map(item => [item._id, item])).values()];
            setRelatedPostsPool(uniqueRelated.slice(0, 15) || []);
            setFootballPostsPool(uniqueFootball.slice(0, 15) || []);
            setRelatedPosts(uniqueRelated.slice(0, 4) || []);
            setFootballPosts(uniqueFootball.slice(0, 3) || []);
            setRelatedIndex(4);
            setFootballIndex(3);
            setLoading(false);
        } catch (err) {
            console.error("Fetch error:", err);
            setError(err.message || "Đã có lỗi xảy ra khi lấy chi tiết bài viết");
            setLoading(false);
        }
    }, [id]);

    // Xử lý bài viết mới
    useEffect(() => {
        const handleNewPost = (event) => {
            const newPost = event.detail;
            console.log("New post received:", newPost);
            if (!newPost || !newPost._id || newPost._id === post?._id) return;

            // Cập nhật relatedPostsPool
            setRelatedPostsPool(prev => {
                if (!Array.isArray(newPost.category) || !newPost.category.some(cat => post?.category?.includes(cat))) return prev;
                let newPool = [...prev];
                if (newPool.length >= 15) {
                    const oldestIndex = newPool.reduce((maxIndex, item, index, arr) =>
                        new Date(item.createdAt) < new Date(arr[maxIndex].createdAt) ? index : maxIndex, 0);
                    newPool[oldestIndex] = newPost;
                } else {
                    newPool.push(newPost);
                }
                newPool = newPool.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                console.log("Updated relatedPostsPool:", newPool.map(p => p._id));
                return newPool;
            });

            // Cập nhật footballPostsPool
            setFootballPostsPool(prev => {
                if (!Array.isArray(newPost.category) || !newPost.category.includes("Thể thao")) return prev;
                let newPool = [...prev];
                if (newPool.length >= 15) {
                    const oldestIndex = newPool.reduce((maxIndex, item, index, arr) =>
                        new Date(item.createdAt) < new Date(arr[maxIndex].createdAt) ? index : maxIndex, 0);
                    newPool[oldestIndex] = newPost;
                } else {
                    newPool.push(newPost);
                }
                newPool = newPool.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                console.log("Updated footballPostsPool:", newPool.map(p => p._id));
                return newPool;
            });
        };

        window.addEventListener('newPostCreated', handleNewPost);
        return () => window.removeEventListener('newPostCreated', handleNewPost);
    }, [post?.category, post?._id]);

    useEffect(() => {
        fetchPostData();
    }, [fetchPostData]);

    useEffect(() => {
        const rotatePosts = () => {
            if (relatedPostsPool.length === 0 || footballPostsPool.length === 0) {
                console.log("Pool rỗng, bỏ qua xoay vòng");
                return;
            }

            setRelatedPosts(prev => {
                if (prev.length < 4) return prev;
                const currentIds = new Set(prev.map(p => p._id));
                let nextIndex = relatedIndex;
                let nextPost = relatedPostsPool[nextIndex];
                let attempts = 0;
                const maxAttempts = relatedPostsPool.length;

                while (nextPost && (currentIds.has(nextPost._id) || !nextPost) && attempts < maxAttempts) {
                    nextIndex = (nextIndex + 1) % relatedPostsPool.length;
                    nextPost = relatedPostsPool[nextIndex];
                    attempts++;
                }

                const newPosts = [...prev.slice(0, 3), nextPost || prev[3]];
                const uniqueNewPosts = [...new Map(newPosts.map(item => [item._id, item])).values()];
                console.log("Related Posts Updated:", uniqueNewPosts.map(p => p._id));
                setRelatedIndex((nextIndex + 1) % relatedPostsPool.length);
                return uniqueNewPosts.length >= 4 ? uniqueNewPosts : prev;
            });

            setFootballPosts(prev => {
                if (prev.length < 3) return prev;
                const currentIds = new Set(prev.map(p => p._id));
                let nextIndex = footballIndex;
                let nextPost = footballPostsPool[nextIndex];
                let attempts = 0;
                const maxAttempts = footballPostsPool.length;

                while (nextPost && (currentIds.has(nextPost._id) || !nextPost) && attempts < maxAttempts) {
                    nextIndex = (nextIndex + 1) % footballPostsPool.length;
                    nextPost = footballPostsPool[nextIndex];
                    attempts++;
                }

                const newPosts = [...prev.slice(0, 2), nextPost || prev[2]];
                const uniqueNewPosts = [...new Map(newPosts.map(item => [item._id, item])).values()];
                console.log("Football Posts Updated:", uniqueNewPosts.map(p => p._id));
                setFootballIndex((nextIndex + 1) % footballPostsPool.length);
                return uniqueNewPosts.length >= 3 ? uniqueNewPosts : prev;
            });

            setTimeout(() => {
                setRelatedPosts(prev => {
                    if (prev.length < 4) return prev;
                    const newPosts = [prev[3], ...prev.slice(0, 3)];
                    const uniqueNewPosts = [...new Map(newPosts.map(item => [item._id, item])).values()];
                    console.log("Related Posts Rotated:", uniqueNewPosts.map(p => p._id));
                    return uniqueNewPosts.length >= 4 ? uniqueNewPosts : prev;
                });
                setFootballPosts(prev => {
                    if (prev.length < 3) return prev;
                    const newPosts = [prev[2], ...prev.slice(0, 2)];
                    const uniqueNewPosts = [...new Map(newPosts.map(item => [item._id, item])).values()];
                    console.log("Football Posts Rotated:", uniqueNewPosts.map(p => p._id));
                    return uniqueNewPosts.length >= 3 ? uniqueNewPosts : prev;
                });
            }, 10000);
        };

        const interval = setInterval(rotatePosts, 20000);
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

    const metaDescription = post.description.length > 150
        ? `${post.description.substring(0, 147)}...`
        : post.description;

    const canonicalUrl = `https://xsmb.win/tin-tuc/${post.slug}-${post._id}`;
    const keywords = [post.title, ...post.category, "tin tức", "XSMB.WIN"].join(", ");
    const imageUrl = post.img && post.img.startsWith('http') ? post.img : "https://xsmb.win/facebook.png";

    const structuredData = {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        "headline": post.title,
        "datePublished": post.createdAt,
        "dateModified": post.createdAt,
        "author": {
            "@type": "Person",
            "name": post.author?.username || "Admin"
        },
        "image": [imageUrl],
        "description": metaDescription,
        "keywords": keywords,
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": canonicalUrl
        },
        "publisher": {
            "@type": "Organization",
            "name": "XSMB.WIN",
            "logo": {
                "@type": "ImageObject",
                "url": "https://xsmb.win/logo.png"
            }
        }
    };

    const RelatedPostItem = React.memo(({ post }) => (
        <Link href={`/tin-tuc/${post.slug}-${post._id}`} className={styles.relatedItem} title={post.title}>
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
        <Link href={`/tin-tuc/${post.slug}-${post._id}`} className={styles.footballItem} title={post.title}>
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

    // Hàm gán màu cho danh mục
    const getCategoryColor = (category) => {
        const categoryColors = {
            'Thể thao': '#22c55e', // Xanh lá
            'Đời sống': '#e11d48', // Hồng
            'Giải trí': '#f59e0b', // Vàng
            'Tin hot': '#ef4444', // Đỏ
            'Công nghệ': '#3b82f6', // Xanh dương
            'Sức khỏe': '#8b5cf6', // Tím
        };
        return categoryColors[category] || '#6b7280'; // Màu xám mặc định
    };

    return (
        <>
            <Head>
                <meta charSet="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>{`${post.title} - Tin Tức XSMB.WIN`}</title>
                <meta name="description" content={metaDescription} />
                <meta name="keywords" content={keywords} />
                <meta name="robots" content="index, follow" />
                <meta name="author" content={post.author?.username || "Admin"} />

                {/* Open Graph Tags (Facebook, Google) */}
                <meta property="og:title" content={post.title} />
                <meta property="og:description" content={metaDescription} />
                <meta property="og:type" content="article" />
                <meta property="og:url" content={canonicalUrl} />
                <meta property="og:image" content={imageUrl} />
                <meta property="og:image:width" content="1200" />
                <meta property="og:image:height" content="630" />
                <meta property="og:image:secure_url" content={imageUrl} />
                <meta property="og:image:type" content="image/jpeg" />
                <meta property="og:image:alt" content={post.title} />
                <meta property="og:site_name" content="XSMB.WIN" />
                <meta property="og:locale" content="vi_VN" />
                <meta property="fb:app_id" content={process.env.FB_APP_ID || ''} />

                {/* Zalo */}
                <meta property="zalo:official_account_id" content={process.env.ZALO_OA_ID || ''} />
                <meta property="zalo:share_url" content={canonicalUrl} />
                <meta property="zalo:og:image" content={imageUrl} />
                <meta property="zalo:og:image:width" content="600" />
                <meta property="zalo:og:image:height" content="600" />

                {/* Twitter Cards */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={post.title} />
                <meta name="twitter:description" content={metaDescription} />
                <meta name="twitter:image" content={imageUrl} />
                <meta name="twitter:image:alt" content={post.title} />

                {/* Canonical và Alternate */}
                <link rel="canonical" href={canonicalUrl} />
                <link rel="alternate" hrefLang="vi" href={canonicalUrl} />

                {/* JSON-LD Schema */}
                <script type="application/ld+json">
                    {JSON.stringify(structuredData)}
                </script>
            </Head>
            <div className={styles.pageWrapper}>
                <div className={styles.container}>
                    <div className={styles.contentWrapper}>
                        <h1 className={styles.title}>{post.title}</h1>
                        <div className={styles.meta}>
                            <span className={styles.date}>Ngày {formattedDate}</span>
                            {Array.isArray(post.category) && post.category.map((cat, idx) => (
                                <span
                                    key={`${cat}-${idx}`}
                                    className={styles.category}
                                    style={{ '--category-color': getCategoryColor(cat) }}
                                >
                                    {cat}
                                </span>
                            ))}
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