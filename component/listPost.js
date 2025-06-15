import Image from "next/image";
import Link from "next/link";
import Head from "next/head";
import imgItem from "../public/backgrond.png"; // Đảm bảo file tồn tại
import { useRouter } from "next/router";
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import styles from "../styles/listpost.module.css";

// Hàm gán màu cho danh mục
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

// Hàm làm sạch URL hình ảnh, đồng bộ với DetailPost
const cleanImageUrl = (url) => {
    if (!url || typeof url !== 'string') {
        // console.warn(`Invalid image URL: ${url}, using fallback image`);
        return imgItem.src;
    }
    try {
        const urlObj = new URL(url);
        if (!urlObj.protocol.startsWith('https')) {
            // console.warn(`Non-HTTPS image URL: ${url}, using fallback image`);
            return imgItem.src;
        }
        return urlObj.toString();
    } catch {
        // console.warn(`Failed to parse image URL: ${url}, using fallback image`);
        return imgItem.src;
    }
};

const ListPost = (props) => {
    const router = useRouter();
    const allPosts = props.appa;

    // Log để debug dữ liệu đầu vào
    useEffect(() => {
        // console.log('ListPost props.appa:', JSON.stringify(allPosts, null, 2));
        allPosts?.forEach((post, index) => {
            // console.log(`Post ${index} (ID: ${post?._id}) mainContents:`, JSON.stringify(post?.mainContents, null, 2));
            post?.mainContents?.forEach((content, contentIndex) => {
                if (content?.img) {
                    // console.log(`Post ${post._id} content ${contentIndex} image URL: ${content.img}`);
                }
            });
        });
    }, [allPosts]);

    const displaySlots = 4;
    const timerDuration = 6000;

    const allRecentSortedPosts = useMemo(() => {
        if (!Array.isArray(allPosts) || allPosts.length === 0) {
            // console.warn('No posts available in props.appa');
            return [];
        }
        return allPosts;
    }, [allPosts]);

    const totalPosts = allRecentSortedPosts.length;
    const [highlightIndex, setHighlightIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const timeoutRef = useRef(null);

    const postsCurrentlyOnDisplay = useMemo(() => {
        if (totalPosts === 0) {
            return [];
        }
        const displayArray = [];
        for (let i = 0; i < displaySlots; i++) {
            const actualIndex = (highlightIndex + i) % totalPosts;
            displayArray.push(allRecentSortedPosts[actualIndex]);
        }
        return displayArray;
    }, [allRecentSortedPosts, highlightIndex, totalPosts]);

    const resetTimer = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
    }, []);

    const startTimer = useCallback(() => {
        resetTimer();
        if (!isPaused && totalPosts > 1) {
            timeoutRef.current = setTimeout(() => {
                setHighlightIndex((prevIndex) => (prevIndex + 1) % totalPosts);
            }, timerDuration);
        }
    }, [isPaused, totalPosts, resetTimer]);

    useEffect(() => {
        startTimer();
        return () => resetTimer();
    }, [highlightIndex, isPaused, startTimer]);

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

    // Hàm lấy ảnh, đồng bộ với DetailPost
    const getPostImage = (post) => {
        if (!post || !post.mainContents || !Array.isArray(post.mainContents)) {
            console.warn(`Post ${post?._id || 'unknown'} has no valid mainContents, using fallback image`);
            return imgItem.src;
        }
        const validImage = post.mainContents.find(content => content?.img?.startsWith('https'));
        if (!validImage) {
            // console.warn(`Post ${post?._id || 'unknown'} has no valid HTTPS image in mainContents, using fallback image`);
            return imgItem.src;
        }
        const cleanedUrl = cleanImageUrl(validImage.img);
        // console.log(`Post ${post._id} selected image URL: ${cleanedUrl}`);
        return cleanedUrl;
    };

    // Hàm lấy mô tả từ mainContents
    const getPostDescription = (post) => {
        if (!post || !post.mainContents || !Array.isArray(post.mainContents) || !post.mainContents[0]?.description) {
            return "";
        }
        const description = post.mainContents[0].description;
        return typeof description === 'string' && description.length > 0 ? description.slice(0, 100) + "..." : "";
    };

    if (totalPosts === 0) {
        return (
            <div className={styles.postContainer}>
                <h2 className={styles.postTitle}>Tin Tức Mới Nhất 24h</h2>
                <p>Không có bài viết nào trong 2 ngày gần đây.</p>
                <Link href="/posts/archive" aria-label="Xem bài viết cũ">
                    Xem bài viết cũ hơn
                </Link>
            </div>
        );
    }

    return (
        <div className={styles.postContainer} onMouseEnter={() => { setIsPaused(true); resetTimer(); }} onMouseLeave={() => { setIsPaused(false); startTimer(); }}>
            <Head>
                <meta name="description" content="Cập nhật tin tức mới nhất trong 24h qua" />
                <meta property="og:title" content="Tin Tức 24h" />
                <meta property="og:description" content="Cập nhật tin tức mới nhất trong 24h qua" />
                <meta property="og:type" content="website" />
                <script type="application/ld+json">
                    {JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "ItemList",
                        itemListElement: postsCurrentlyOnDisplay.map((post, index) => ({
                            "@type": "ListItem",
                            position: index + 1,
                            item: {
                                "@type": "NewsArticle",
                                headline: post?.title || "Bài viết không có tiêu đề",
                                description: getPostDescription(post),
                                image: getPostImage(post),
                                datePublished: post?.createdAt || new Date().toISOString(),
                                url: post ? `https://xsmb.win/tin-tuc/${post.slug}-${post._id}` : '#',
                            },
                        })),
                    })}
                </script>
            </Head>
            <h2 className={styles.postTitle}>Tin Tức Mới Nhất 24h</h2>
            <div className={styles.listPostWrapper}>
                <div className={styles.listPost}>
                    {postsCurrentlyOnDisplay.map((post, index) => {
                        const itemClassName = `${styles.itemPost} ${index === 1 ? styles.active : ''}`;
                        const uniqueKey = `${post?._id || `post-${index}`}-${index}`;
                        let formattedDate = 'Ngày đăng';
                        if (post?.createdAt) {
                            try {
                                const date = new Date(post.createdAt);
                                if (isNaN(date.getTime())) throw new Error('Invalid date');
                                const day = String(date.getDate()).padStart(2, '0');
                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                const year = date.getFullYear();
                                formattedDate = `${day}/${month}/${year}`;
                            } catch (error) {
                                console.error("Error formatting date:", post.createdAt, error);
                            }
                        }
                        if (!post) {
                            return <div key={uniqueKey} className={styles.itemPlaceholder}></div>;
                        }
                        const postImage = getPostImage(post);
                        const postDescription = getPostDescription(post);
                        return (
                            <div key={uniqueKey} className={itemClassName} role="article">
                                <Link href={`/tin-tuc/${post.slug}-${post._id}`} aria-label={`Xem bài viết ${post.title || 'không tiêu đề'}`}>
                                    <Image
                                        className={styles.imgPost}
                                        src={postImage}
                                        alt={`Hình ảnh bài viết: ${post.title || 'không tiêu đề'}`}
                                        width={400}
                                        height={250}
                                        onError={(e) => {
                                            // console.warn(`Failed to load image for post ${post._id}: ${postImage}`);
                                            e.target.src = imgItem.src;
                                        }}
                                        placeholder="blur"
                                        blurDataURL={imgItem.src}
                                        loading="lazy"
                                    />
                                </Link>
                                <div className={styles.postMeta}>
                                    <span className={styles.postDate}>{formattedDate}</span>
                                    {Array.isArray(post.category) && post.category.length > 0 && post.category.map((cat, idx) => (
                                        <span
                                            key={`${cat}-${idx}`}
                                            className={styles.postCategory}
                                            style={{ '--category-color': getCategoryColor(cat) }}
                                        >
                                            {cat}
                                        </span>
                                    ))}
                                </div>
                                <h3
                                    className={styles.title}
                                    onClick={() => router.push(`/tin-tuc/${post.slug}-${post._id}`)}
                                >
                                    {post.title || 'Không có tiêu đề'}
                                </h3>
                                <p className={styles.desc}>
                                    {postDescription}
                                </p>
                            </div>
                        );
                    })}
                </div>
                <div className={styles.controls}>
                    <button
                        onClick={handlePrev}
                        aria-label="Bài viết trước"
                        disabled={totalPosts <= 1}
                        className={totalPosts <= 1 ? styles.disabled : ''}
                    >
                        <i className="fa-solid fa-chevron-left"></i>
                    </button>
                    <button
                        onClick={handleNext}
                        aria-label="Bài viết tiếp theo"
                        disabled={totalPosts <= 1}
                        className={totalPosts <= 1 ? styles.disabled : ''}
                    >
                        <i className="fa-solid fa-chevron-right"></i>
                    </button>
                </div>
                {totalPosts > displaySlots && (
                    <div className={styles.dotControls}>
                        {Array.from({ length: totalPosts }).map((_, index) => (
                            <button
                                key={`dot-${index}`}
                                className={`${styles.dot} ${highlightIndex === index ? styles.activeDot : ''}`}
                                onClick={() => handleManualChange(index)}
                                aria-label={`Chuyển đến bài viết ${index + 1}`}
                            ></button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ListPost;