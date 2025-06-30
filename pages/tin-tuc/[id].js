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

    const defaultDescription = "Đọc tin tức mới nhất tại XSMB.WIN - Cập nhật thông tin nhanh chóng, chính xác!";

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
            setError(err.message || "Đã có lỗi xảy ra khi lấy chi tiết bài viết");
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        const handleNewPost = (event) => {
            const newPost = event.detail;
            if (!newPost || !newPost._id || newPost._id === post?._id) return;

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
                return newPool.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            });

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
                return newPool.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
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
            if (relatedPostsPool.length === 0 || footballPostsPool.length === 0) return;

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
                setFootballIndex((nextIndex + 1) % footballPostsPool.length);
                return uniqueNewPosts.length >= 3 ? uniqueNewPosts : prev;
            });
        };

        const interval = setInterval(rotatePosts, 60000);
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
            return "Ngày đăng";
        }
    }, [post?.createdAt]);

    const displayedRelatedPosts = useMemo(() => relatedPosts.slice(0, 4), [relatedPosts]);
    const displayedFootballPosts = useMemo(() => footballPosts.slice(0, 3), [footballPosts]);

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className={styles.skeletonTitle}></div>
                <div className={styles.skeletonImage}></div>
                <div className={styles.skeletonText}></div>
            </div>
        );
    }

    if (error) {
        return <p className={styles.error}>{error}</p>;
    }

    if (!post) {
        return <p className={styles.error}>Bài viết không tồn tại.</p>;
    }

    // Lấy metaDescription từ mainContents[0].description
    const metaDescription = post.mainContents && post.mainContents[0]?.description
        ? post.mainContents[0].description.length > 160
            ? `${post.mainContents[0].description.substring(0, 157)}...`
            : post.mainContents[0].description
        : defaultDescription;

    const canonicalUrl = `https://xsmb.win/tin-tuc/${post.slug}-${post._id}`;
    // Lấy imageUrl từ ảnh đầu tiên trong mainContents
    const imageUrl = post.mainContents?.find(content => content.img?.startsWith('https'))?.img || null;

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
        "image": imageUrl ? [imageUrl] : [],
        "description": metaDescription,
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

    const RelatedPostItem = React.memo(({ post }) => {
        // Lấy img và title từ mainContents cho related posts
        const postImage = post.mainContents?.find(content => content.img?.startsWith('https'))?.img;
        return (
            <Link href={`/tin-tuc/${post.slug}-${post._id}`} className={styles.relatedItem} title={post.title} aria-label={`Xem bài viết ${post.title}`}>
                {postImage && (
                    <img
                        src={postImage}
                        alt={post.title}
                        className={styles.relatedImage}
                        loading="lazy"
                    />
                )}
                <h3 className={styles.relatedItemTitle}>{post.title}</h3>
            </Link>
        );
    });

    const FootballPostItem = React.memo(({ post }) => {
        // Lấy img và description từ mainContents cho football posts
        const postImage = post.mainContents?.find(content => content.img?.startsWith('https'))?.img;
        const postDescription = post.mainContents && post.mainContents[0]?.description || "";
        return (
            <Link href={`/tin-tuc/${post.slug}-${post._id}`} className={styles.footballItem} title={post.title} aria-label={`Xem bài viết ${post.title}`}>
                {postImage && (
                    <img
                        src={postImage}
                        alt={post.title}
                        className={styles.footballImage}
                        loading="lazy"
                    />
                )}
                <div className={styles.footballContent}>
                    <h3 className={styles.footballItemTitle}>{post.title}</h3>
                    <p className={styles.footballItemExcerpt}>
                        {postDescription.length > 100
                            ? `${postDescription.substring(0, 100)}...`
                            : postDescription}
                    </p>
                </div>
            </Link>
        );
    });

    const getCategoryColor = (category) => {
        const categoryColors = {
            'Thể thao': '#22c55e',
            'Đời sống': '#e11d48',
            'Giải trí': '#f59e0b',
            'Tin hot': '#ef4444',
            'Công nghệ': '#3b82f6',
            'Sức khỏe': '#8b5cf6',
        };
        return categoryColors[category] || '#6b7280';
    };

    return (
        <>
            <Head>
                <meta charSet="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>{post.title.slice(0, 60)}</title>
                <meta name="description" content={metaDescription} />
                <meta name="robots" content="index, follow" />
                <meta name="author" content={post.author?.username || "Admin"} />

                {imageUrl && (
                    <>
                        <meta property="og:image" content={imageUrl} />
                        <meta property="og:image:secure_url" content={imageUrl} />
                        <meta property="og:image:width" content="1200" />
                        <meta property="og:image:height" content="630" />
                        <meta property="og:image:type" content="image/jpeg" />
                        <meta property="og:image:alt" content={post.title} />
                        <meta name="twitter:image" content={imageUrl} />
                        <meta name="twitter:image:alt" content={post.title} />
                        <link rel="preload" href={imageUrl} as="image" />
                    </>
                )}

                <meta property="og:title" content={post.title.slice(0, 60)} />
                <meta property="og:description" content={metaDescription} />
                <meta property="og:type" content="article" />
                <meta property="og:url" content={canonicalUrl} />
                <meta property="og:site_name" content="XSMB.WIN" />
                <meta property="og:locale" content="vi_VN" />
                <meta property="fb:app_id" content={process.env.FB_APP_ID || ''} />

                <meta property="zalo:official_account_id" content={process.env.ZALO_OA_ID || ''} />
                <meta property="zalo:share_url" content={canonicalUrl} />
                {imageUrl && (
                    <>
                        <meta property="zalo-img" content={imageUrl} />
                        <meta property="zalo-img:width" content="600" />
                        <meta property="zalo-img:height" content="600" />
                    </>
                )}

                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={post.title.slice(0, 60)} />
                <meta name="twitter:description" content={metaDescription} />

                <link rel="canonical" href={canonicalUrl} />
                <link rel="alternate" hrefLang="vi" href={canonicalUrl} />

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
                            {Array.isArray(post.category) && post.category.length > 0 && post.category.map((cat, idx) => (
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
                        <RenderContent
                            contentOrder={post.contentOrder}
                            mainContents={post.mainContents}
                            title={post.title}
                        />
                        <button
                            className={styles.backButton}
                            onClick={() => router.push("/tin-tuc")}
                            aria-label="Quay lại trang tin tức"
                        >
                            Đến Trang Tin Tức
                        </button>
                        <div className={styles.groupbanner3}>
                            <a href='https://m.dktin.top/reg/104600' tabIndex={-1}>
                                <video
                                    className={styles.banner3}
                                    src='/banner3.mp4'
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    alt='xổ số bắc trung nam'
                                    suppressHydrationWarning
                                />
                            </a>
                        </div>
                        {displayedFootballPosts.length > 0 && (
                            <div className={styles.footballPosts}>
                                <h2 className={styles.footballTitle}>Tin bóng đá nổi bật</h2>
                                {displayedFootballPosts.map((footballPost) => (
                                    <FootballPostItem key={footballPost._id} post={footballPost} />
                                ))}
                            </div>
                        )}
                    </div>
                    {displayedRelatedPosts.length > 0 && (

                        <div className={styles.relatedPosts}>
                            <div className={styles.groupbanner4}>
                                <a href='https://m.dktin.top/reg/104600' tabIndex={-1}>
                                    <video
                                        className={styles.banner3}
                                        src='/banner3.mp4'
                                        autoPlay
                                        loop
                                        muted
                                        playsInline
                                        alt='xổ số bắc trung nam'
                                        suppressHydrationWarning
                                    />
                                </a>
                            </div>
                            <h2 className={styles.relatedTitle}>Bài viết liên quan</h2>
                            {displayedRelatedPosts.map((relatedPost) => (
                                <RelatedPostItem key={relatedPost._id} post={relatedPost} />
                            ))}

                            <div className={styles.banner1}>
                                <a href='https://m.dktin.top/reg/104600' tabIndex={-1}>
                                    <video
                                        className={styles.videobanner}
                                        src='/banner2.mp4'
                                        autoPlay
                                        loop
                                        muted
                                        playsInline
                                        alt='xổ số bắc trung nam'
                                        suppressHydrationWarning
                                    />
                                </a>
                            </div>
                        </div>

                    )}

                </div>
            </div>
        </>
    );
};

export default PostDetail;

const RenderContent = React.memo(({ contentOrder, mainContents, title }) => {
    if (!contentOrder || contentOrder.length === 0 || !mainContents) {
        return <p className={styles.noContent}>Không có nội dung để hiển thị.</p>;
    }

    return (
        <div className={styles.content}>
            {contentOrder.map((item, index) => {
                if (item.type === "mainContent" && mainContents[item.index]) {
                    const content = mainContents[item.index];
                    return (
                        <div key={`mainContent-${index}`} className={`${styles.mainContent} ${content.isImageFirst ? styles.imageFirst : ''}`}>
                            {content.h2 && (
                                <h2 className={styles.subSectionTitle}>{content.h2}</h2>
                            )}
                            {content.isImageFirst ? (
                                <>
                                    {content.img && (
                                        <figure className={styles.imageWrapper}>
                                            <img
                                                src={content.img}
                                                srcSet={`${content.img} 1200w, ${content.img.replace('.jpg', '-medium.jpg')} 800w, ${content.img.replace('.jpg', '-small.jpg')} 400w`}
                                                sizes="(max-width: 768px) 100vw, 800px"
                                                alt={content.h2 || title}
                                                className={styles.image}
                                                loading="lazy"
                                            />
                                            {content.caption && (
                                                <figcaption className={styles.caption}>{content.caption}</figcaption>
                                            )}
                                        </figure>
                                    )}
                                    {content.description && (
                                        <div className={styles.description}>
                                            {content.description.split(/\n\s*\n/).filter(p => p.trim()).map((paragraph, i) => (
                                                <p key={`para-${i}`}>{paragraph}</p>
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    {content.description && (
                                        <div className={styles.description}>
                                            {content.description.split(/\n\s*\n/).filter(p => p.trim()).map((paragraph, i) => (
                                                <p key={`para-${i}`}>{paragraph}</p>
                                            ))}
                                        </div>
                                    )}
                                    {content.img && (
                                        <figure className={styles.imageWrapper}>
                                            <img
                                                src={content.img}
                                                srcSet={`${content.img} 1200w, ${content.img.replace('.jpg', '-medium.jpg')} 800w, ${content.img.replace('.jpg', '-small.jpg')} 400w`}
                                                sizes="(max-width: 768px) 100vw, 800px"
                                                alt={content.h2 || title}
                                                className={styles.image}
                                                loading="lazy"
                                            />
                                            {content.caption && (
                                                <figcaption className={styles.caption}>{content.caption}</figcaption>
                                            )}
                                        </figure>
                                    )}
                                </>
                            )}
                        </div>
                    );
                }
                return null;
            })}
        </div>
    );
});