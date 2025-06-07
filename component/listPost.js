import Image from "next/image";
import Link from "next/link";
import Head from "next/head";
import imgItem from "../public/asset/img/backgrond.png";
import { useRouter } from "next/router";
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import styles from "../styles/listpost.module.css";

const getStartOfDay = (date) => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    return start.getTime();
};

const ListPost = (props) => {
    const router = useRouter();
    const allPosts = props.appa;
    const displaySlots = 4;
    const timerDuration = 3000;

    const allRecentSortedPosts = useMemo(() => {
        if (!Array.isArray(allPosts)) return [];
        return allPosts; // Backend đã lọc và sắp xếp
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

    if (totalPosts === 0) {
        return (
            <div className={styles.postContainer}>
                <h2 className={styles.postTitle}>Tin Tức Bóng Đá 24h</h2>
                <p>Không có bài viết nào trong 2 ngày gần đây.</p>
                <Link href="/posts/archive" aria-label="Xem bài viết cũ">
                    Xem bài viết cũ hơn
                </Link>
            </div>
        );
    }

    return (
        <div className={styles.postContainer} onMouseEnter={() => { setIsPaused(true); resetTimer(); }} onMouseLeave={() => { setIsPaused(false); }}>
            <Head>
                <title>Tin Tức Bóng Đá 24h</title>
                <meta name="description" content="Cập nhật tin tức bóng đá mới nhất trong 24h qua" />
                <meta property="og:title" content="Tin Tức Bóng Đá 24h" />
                <meta property="og:description" content="Cập nhật tin tức bóng đá mới nhất trong 24h qua" />
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
                                headline: post.title,
                                description: post.description?.slice(0, 100),
                                image: post.img || imgItem.src,
                                datePublished: post.createdAt,
                                url: `https://yourdomain.com/post/${post._id}`,
                            },
                        })),
                    })}
                </script>
            </Head>
            <h2 className={styles.postTitle}>Tin Tức Bóng Đá 24h</h2>
            <div className={styles.listPostWrapper}>
                <div className={styles.listPost}>
                    {postsCurrentlyOnDisplay.map((post, index) => {
                        const itemClassName = `${styles.itemPost} ${index === 1 ? styles.active : ''}`;
                        const uniqueKey = `${post?._id || `post-${index}`}-${index}`;
                        let formattedDate = 'Ngày đăng';
                        if (post.createdAt) {
                            try {
                                const date = new Date(post.createdAt);
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
                        return (
                            <div key={uniqueKey} className={itemClassName} role="article">
                                <Link href={`/post/${post._id}`} aria-label={`Xem bài viết ${post.title}`}>

                                    <img
                                        className={styles.imgPost}
                                        src={post.img && post.img.startsWith('http') ? post.img : imgItem.src}
                                        alt={`Hình ảnh bài viết: ${post.title}`}
                                        onError={(e) => { e.target.onerror = null; e.target.src = imgItem.src }}
                                    />

                                </Link>
                                <span className={styles.postDate}>{formattedDate}</span>
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
                {totalPosts > 1 && (
                    <div className={styles.controls}>
                        <button onClick={handlePrev} aria-label="Bài viết trước"><i className="fa-solid fa-chevron-left"></i></button>
                        <button onClick={handleNext} aria-label="Bài viết tiếp theo"><i className="fa-solid fa-chevron-right"></i></button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ListPost;