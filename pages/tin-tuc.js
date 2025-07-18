import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import Head from "next/head";
import Image from "next/image";
import { getPosts, getCategories } from "../pages/api/post";
import styles from "../styles/tintuc.module.css";

const EnhancedNewsFeed = () => {
    const [state, setState] = useState({
        categories: [],
        selectedCategory: null,
        postsByCategory: {},
        displayedPostsByCategory: {},
        rotationIndices: {},
        heroPost: null,
        subHeroPosts: [],
        footballPosts: [],
        loading: true,
        error: null,
    });
    const postsPerCategory = 6;
    const displayPerCategory = 3;
    const defaultImage = "/facebook.png";

    // Loại bỏ bài viết trùng lặp
    const deduplicatePosts = useCallback((posts) => {
        const seen = new Set();
        return posts.filter((post) => {
            if (post && post._id && !seen.has(post._id)) {
                seen.add(post._id);
                return true;
            }
            return false;
        });
    }, []);

    // Lấy danh mục
    const fetchCategories = useCallback(async () => {
        try {
            const data = await getCategories();
            setState((prev) => ({
                ...prev,
                categories: Array.isArray(data) ? data : ["Thể thao", "Đời sống", "Giải trí", "Tin hot"],
            }));
        } catch (err) {
            console.error("Error fetching categories:", err);
            setState((prev) => ({
                ...prev,
                categories: ["Thể thao", "Đời sống", "Giải trí", "Tin hot"],
                error: "Không thể tải danh mục, sử dụng mặc định.",
            }));
        }
    }, []);

    // Lấy bài viết
    const fetchPosts = useCallback(async () => {
        setState((prev) => ({ ...prev, loading: true }));
        try {
            if (state.selectedCategory) {
                const data = await getPosts(null, 1, postsPerCategory, state.selectedCategory);
                const fetchedPosts = Array.isArray(data.posts)
                    ? deduplicatePosts(data.posts).slice(0, postsPerCategory)
                    : [];
                setState((prev) => ({
                    ...prev,
                    postsByCategory: { [state.selectedCategory]: fetchedPosts },
                    displayedPostsByCategory: { [state.selectedCategory]: fetchedPosts.slice(0, displayPerCategory) },
                    rotationIndices: { [state.selectedCategory]: displayPerCategory },
                    heroPost: fetchedPosts[0] || null,
                    subHeroPosts: fetchedPosts.slice(0, 3),
                    footballPosts: fetchedPosts.filter((post) => post.category.includes("Thể thao")).slice(0, 3),
                    loading: false,
                }));
            } else {
                // Gộp yêu cầu API cho tất cả danh mục
                const allPostsData = await Promise.all(
                    state.categories.map((category) =>
                        getPosts(null, 1, postsPerCategory, category).then((data) => ({
                            category,
                            posts: Array.isArray(data.posts) ? deduplicatePosts(data.posts).slice(0, postsPerCategory) : [],
                        }))
                    )
                );

                const newPostsByCategory = {};
                const newDisplayedPosts = {};
                const newIndices = {};
                const allPosts = [];

                allPostsData.forEach(({ category, posts }) => {
                    newPostsByCategory[category] = posts;
                    newDisplayedPosts[category] = posts.slice(0, displayPerCategory);
                    newIndices[category] = displayPerCategory;
                    allPosts.push(...posts);
                });

                setState((prev) => ({
                    ...prev,
                    postsByCategory: newPostsByCategory,
                    displayedPostsByCategory: newDisplayedPosts,
                    rotationIndices: newIndices,
                    heroPost: deduplicatePosts(allPosts)[0] || null,
                    subHeroPosts: deduplicatePosts(allPosts).slice(0, 3),
                    footballPosts: deduplicatePosts(allPosts)
                        .filter((post) => post.category.includes("Thể thao"))
                        .slice(0, 3),
                    loading: false,
                }));
            }
        } catch (err) {
            console.error("Error fetching posts:", err);
            setState((prev) => ({
                ...prev,
                error: "Không thể tải bài viết",
                postsByCategory: {},
                displayedPostsByCategory: {},
                loading: false,
            }));
        }
    }, [state.selectedCategory, state.categories, deduplicatePosts]);

    // Xoay vòng bài viết với IntersectionObserver
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    const interval = setInterval(() => {
                        setState((prev) => {
                            const updatedDisplayed = { ...prev.displayedPostsByCategory };
                            Object.keys(prev.displayedPostsByCategory).forEach((category) => {
                                const postsPool = prev.postsByCategory[category] || [];
                                if (postsPool.length <= displayPerCategory) return;
                                const currentIndex = prev.rotationIndices[category] || displayPerCategory;
                                const nextIndex = (currentIndex % postsPool.length) || displayPerCategory;
                                const newPost = postsPool[nextIndex];

                                if (newPost) {
                                    updatedDisplayed[category] = [
                                        newPost,
                                        ...prev.displayedPostsByCategory[category].slice(0, displayPerCategory - 1),
                                    ];
                                    updatedDisplayed[category] = deduplicatePosts(updatedDisplayed[category]);
                                }

                                prev.rotationIndices[category] = nextIndex + 1;
                            });
                            return { ...prev, displayedPostsByCategory: updatedDisplayed };
                        });
                    }, 30000);
                    return () => clearInterval(interval);
                }
            },
            { threshold: 0.1 }
        );

        const contentWrapper = document.querySelector(`.${styles.contentWrapper}`);
        if (contentWrapper) observer.observe(contentWrapper);
        return () => observer.disconnect();
    }, [deduplicatePosts, state.postsByCategory, state.rotationIndices]);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    useEffect(() => {
        if (state.categories.length > 0) {
            fetchPosts();
        }
    }, [fetchPosts, state.categories]);

    // Format ngày
    const formatDate = useCallback((createdAt) => {
        if (!createdAt) return "Ngày đăng";
        try {
            const date = new Date(createdAt);
            const day = String(date.getDate()).padStart(2, "0");
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        } catch {
            return "Ngày đăng";
        }
    }, []);

    // Lấy hình ảnh hợp lệ
    const getValidImage = useCallback((post) => {
        if (!post.mainContents || !Array.isArray(post.mainContents)) {
            return defaultImage;
        }
        const validImage = post.mainContents.find((content) => content.img && content.img.startsWith("http"));
        return validImage ? validImage.img : defaultImage;
    }, []);

    // Lấy mô tả
    const getPostDescription = useCallback((post) => {
        if (!post.mainContents || !Array.isArray(post.mainContents) || !post.mainContents[0]?.description) {
            return "";
        }
        return post.mainContents[0].description.slice(0, 150);
    }, []);

    // Gán màu danh mục
    const getCategoryColor = useCallback((category) => {
        const categoryColors = {
            "Thể thao": "#22c55e",
            "Đời sống": "#e11d48",
            "Giải trí": "#f59e0b",
            "Tin hot": "#ef4444",
            "Công nghệ": "#3b82f6",
            "Sức khỏe": "#8b5cf6",
        };
        return categoryColors[category] || "#6b7280";
    }, []);

    // Component HeroPost
    const HeroPost = React.memo(({ post }) => (
        <Link href={`/tin-tuc/${post.slug}-${post._id}`} className={styles.heroPost}>
            <Image
                src={getValidImage(post)}
                alt={post.title}
                className={styles.heroImage}
                width={800}
                height={450}
                priority
            />
            <div className={styles.heroContent}>
                <div className={styles.heroMeta}>
                    <span className={styles.postDate}>{formatDate(post.createdAt)}</span>
                    {Array.isArray(post.category) &&
                        post.category.map((cat, idx) => (
                            <span
                                key={`${cat}-${idx}`}
                                className={styles.postCategory}
                                style={{ "--category-color": getCategoryColor(cat) }}
                            >
                                {cat}
                            </span>
                        ))}
                </div>
                <h2 className={styles.heroTitle}>{post.title}</h2>
                <p className={styles.heroExcerpt}>{getPostDescription(post) || "Không có mô tả"}...</p>
            </div>
        </Link>
    ));

    // Component SubHeroPost
    const SubHeroPost = React.memo(({ post }) => (
        <Link href={`/tin-tuc/${post.slug}-${post._id}`} className={styles.subHeroPost}>
            <Image
                src={getValidImage(post)}
                alt={post.title}
                className={styles.subHeroImage}
                width={400}
                height={225}
                loading="lazy"
            />
            <h3 className={styles.subHeroTitle}>{post.title}</h3>
        </Link>
    ));

    // Component FootballPost
    const FootballPost = React.memo(({ post }) => (
        <Link href={`/tin-tuc/${post.slug}-${post._id}`} className={styles.footballPost}>
            <Image
                src={getValidImage(post)}
                alt={post.title}
                className={styles.footballImage}
                width={300}
                height={200}
                loading="lazy"
            />
            <h3 className={styles.footballTitle}>{post.title}</h3>
        </Link>
    ));

    // Component PostItem
    const PostItem = React.memo(({ post }) => (
        <Link href={`/tin-tuc/${post.slug}-${post._id}`} className={styles.postItem}>
            <Image
                src={getValidImage(post)}
                alt={post.title}
                className={styles.postImage}
                width={300}
                height={200}
                loading="lazy"
            />
            <div className={styles.postContent}>
                <div className={styles.postMeta}>
                    <span className={styles.postDate}>{formatDate(post.createdAt)}</span>
                    {Array.isArray(post.category) &&
                        post.category.map((cat, idx) => (
                            <span
                                key={`${cat}-${idx}`}
                                className={styles.postCategory}
                                style={{ "--category-color": getCategoryColor(cat) }}
                            >
                                {cat}
                            </span>
                        ))}
                </div>
                <h3 className={styles.postTitle}>{post.title}</h3>
                <p className={styles.postExcerpt}>{getPostDescription(post) || "Không có mô tả"}...</p>
            </div>
        </Link>
    ));

    // SEO metadata
    const metaDescription = "Tin tức tổng hợp mới nhất từ XSMB.WIN - Cập nhật tin tức nóng hổi về thể thao, đời sống, giải trí, công nghệ và hơn thế nữa!";
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "Tin tức tổng hợp - XSMB.WIN",
        description: metaDescription,
        publisher: {
            "@type": "Organization",
            name: "XSMB.WIN",
            logo: {
                "@type": "Image",
                url: "https://xsmb.win/logo.png",
            },
        },
    };

    if (state.loading) {
        return (
            <div className={styles.loading}>
                <div className={styles.skeletonMenu}></div>
                <div className={styles.skeletonHero}></div>
                <div className={styles.skeletonSubHero}></div>
                <div className={styles.skeletonPost}></div>
            </div>
        );
    }

    if (state.error) {
        return <p className={styles.error}>{state.error}</p>;
    }

    return (
        <>
            <Head>
                <meta charSet="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>Tin tức tổng hợp - XSMB.WIN</title>
                <meta name="description" content={metaDescription} />
                <meta name="robots" content="index, follow" />
                <meta property="og:title" content="Tin tức tổng hợp - XSMB.WIN" />
                <meta property="og:description" content={metaDescription} />
                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://xsmb.win/tin-tuc" />
                <meta property="og:image" content={defaultImage} />
                <meta property="og:site_name" content="XSMB.WIN" />
                <meta property="og:locale" content="vi_VN" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="Tin tức tổng hợp - XSMB.WIN" />
                <meta name="twitter:description" content={metaDescription} />
                <meta name="twitter:image" content={defaultImage} />
                <link rel="canonical" href="https://xsmb.win/tin-tuc" />
                <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
            </Head>
            <div className={styles.pageWrapper}>
                <div className={styles.container}>
                    <nav className={styles.categoryMenu}>
                        <button
                            className={`${styles.categoryButton} ${!state.selectedCategory ? styles.active : ""}`}
                            onClick={() => setState((prev) => ({ ...prev, selectedCategory: null }))}
                        >
                            Tất cả
                        </button>
                        {state.categories ? state.categories.map((category) => (
                            <button
                                key={category}
                                className={`${styles.categoryButton} ${state.selectedCategory === category ? styles.active : ""}`}
                                onClick={() => setState((prev) => ({ ...prev, selectedCategory: category }))}
                                style={{ "--category-color": getCategoryColor(category) }}
                            >
                                {category}
                            </button>
                        )) : []}
                    </nav>
                    <div className={styles.mainContent}>
                        <div className={styles.heroSection}>
                            {state.heroPost && <HeroPost post={state.heroPost} />}
                            <div className={styles.subHeroSection}>
                                <h2 className={styles.subHeroTitle}>Tin tức tổng hợp</h2>
                                <div className={styles.subHeroGrid}>
                                    {state.subHeroPosts.length > 0 ? (
                                        state.subHeroPosts.map((post) => <SubHeroPost key={post._id} post={post} />)
                                    ) : (
                                        <p className={styles.noPosts}>Không có bài viết nổi bật.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                        <aside className={styles.footballSidebar}>
                            <h2 className={styles.sidebarTitle}>Tin bóng đá</h2>
                            {state.footballPosts.length > 0 ? (
                                state.footballPosts.map((post) => <FootballPost key={post._id} post={post} />)
                            ) : (
                                <p className={styles.noPosts}>Không có bài viết bóng đá.</p>
                            )}
                        </aside>
                    </div>
                    <div className={styles.contentWrapper}>
                        <div className={styles.postsWrapper}>
                            {state.selectedCategory ? (
                                <section className={styles.categorySection}>
                                    <h2 className={styles.categoryTitle}>{state.selectedCategory}</h2>
                                    <div className={styles.postsList}>
                                        {state.displayedPostsByCategory[state.selectedCategory]?.length > 0 ? (
                                            state.displayedPostsByCategory[state.selectedCategory].map((post) => (
                                                <PostItem key={post._id} post={post} />
                                            ))
                                        ) : (
                                            <p className={styles.noPosts}>Không có bài viết nào trong danh mục này.</p>
                                        )}
                                    </div>
                                </section>
                            ) : (
                                state.categories.map((category) => (
                                    <section key={category} className={styles.categorySection}>
                                        <h2 className={styles.categoryTitle}>{category}</h2>
                                        <div className={styles.postsList}>
                                            {state.displayedPostsByCategory[category]?.length > 0 ? (
                                                state.displayedPostsByCategory[category].map((post) => (
                                                    <PostItem key={post._id} post={post} />
                                                ))
                                            ) : (
                                                <p className={styles.noPosts}>Không có bài viết nào trong danh mục này.</p>
                                            )}
                                        </div>
                                    </section>
                                ))
                            )}
                        </div>
                        <div className={styles.bannerContainer}>
                            <a href='https://m.dktin.top/reg/104600' tabIndex={-1}>
                                <video
                                    className={styles.bannervideo}
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
                </div>
            </div>
        </>
    );
};

export default EnhancedNewsFeed;