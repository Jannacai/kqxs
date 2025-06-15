import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import Head from "next/head";
import { getPosts, getCategories } from "../pages/api/post";
import styles from "../styles/tintuc.module.css";

const EnhancedNewsFeed = () => {
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [postsByCategory, setPostsByCategory] = useState({});
    const [displayedPostsByCategory, setDisplayedPostsByCategory] = useState({});
    const [heroPost, setHeroPost] = useState(null);
    const [subHeroPosts, setSubHeroPosts] = useState([]);
    const [footballPosts, setFootballPosts] = useState([]);
    const [rotationIndices, setRotationIndices] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const postsPerCategory = 15;
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
            setCategories(Array.isArray(data) ? data : ["Thể thao", "Đời sống", "Giải trí", "Tin hot"]);
        } catch (err) {
            console.error("Error fetching categories:", err);
            setCategories(["Thể thao", "Đời sống", "Giải trí", "Tin hot"]);
            setError("Không thể tải danh mục, sử dụng mặc định.");
        }
    }, []);

    // Lấy bài viết
    const fetchPosts = useCallback(async () => {
        setLoading(true);
        try {
            if (selectedCategory) {
                const data = await getPosts(null, 1, postsPerCategory, selectedCategory);
                const fetchedPosts = Array.isArray(data.posts)
                    ? deduplicatePosts(data.posts).slice(0, postsPerCategory)
                    : [];
                setPostsByCategory({ [selectedCategory]: fetchedPosts });
                setDisplayedPostsByCategory({ [selectedCategory]: fetchedPosts.slice(0, displayPerCategory) });
                setRotationIndices({ [selectedCategory]: displayPerCategory });
                setHeroPost(fetchedPosts[0] || null);
                setSubHeroPosts(fetchedPosts.slice(0, 3));
                setFootballPosts(fetchedPosts.filter((post) => post.category.includes("Thể thao")).slice(0, 3));
            } else {
                const newPostsByCategory = {};
                const newDisplayedPosts = {};
                const newIndices = {};
                const allPosts = [];

                for (const category of categories) {
                    const data = await getPosts(null, 1, postsPerCategory, category);
                    const categoryPosts = Array.isArray(data.posts)
                        ? deduplicatePosts(data.posts).slice(0, postsPerCategory)
                        : [];
                    newPostsByCategory[category] = categoryPosts;
                    newDisplayedPosts[category] = categoryPosts.slice(0, displayPerCategory);
                    newIndices[category] = displayPerCategory;
                    allPosts.push(...categoryPosts);
                }

                setPostsByCategory(newPostsByCategory);
                setDisplayedPostsByCategory(newDisplayedPosts);
                setRotationIndices(newIndices);
                const combinedPosts = deduplicatePosts(allPosts);
                setHeroPost(combinedPosts[0] || null);
                setSubHeroPosts(combinedPosts.slice(0, 3));
                setFootballPosts(combinedPosts.filter((post) => post.category.includes("Thể thao")).slice(0, 3));
            }
            setLoading(false);
        } catch (err) {
            console.error("Error fetching posts:", err);
            setError("Không thể tải bài viết");
            setPostsByCategory({});
            setDisplayedPostsByCategory({});
            setLoading(false);
        }
    }, [selectedCategory, categories, deduplicatePosts]);

    // Xử lý bài viết mới
    const handleNewPost = useCallback(
        (event) => {
            const newPost = event.detail;
            if (!newPost || !newPost._id || !newPost.title || !newPost.slug || !Array.isArray(newPost.category)) {
                // console.warn("Invalid new post:", newPost);
                return;
            }

            setPostsByCategory((prev) => {
                const updated = { ...prev };
                newPost.category.forEach((category) => {
                    if (selectedCategory && category !== selectedCategory) return;
                    if (!updated[category]) updated[category] = [];
                    let newPool = [...updated[category]];
                    if (newPool.length >= postsPerCategory) {
                        const oldestIndex = newPool.reduce(
                            (maxIndex, item, index, arr) =>
                                new Date(item.createdAt) < new Date(arr[maxIndex].createdAt) ? index : maxIndex,
                            0
                        );
                        newPool[oldestIndex] = newPost;
                    } else {
                        newPool.push(newPost);
                    }
                    updated[category] = deduplicatePosts(newPool)
                        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                        .slice(0, postsPerCategory);
                });
                return updated;
            });

            setDisplayedPostsByCategory((prev) => {
                const updated = { ...prev };
                newPost.category.forEach((category) => {
                    if (selectedCategory && category !== selectedCategory) return;
                    updated[category] = postsByCategory[category]?.slice(0, displayPerCategory) || [];
                });
                return updated;
            });

            setRotationIndices((prev) => {
                const updated = { ...prev };
                newPost.category.forEach((category) => {
                    if (selectedCategory && category !== selectedCategory) return;
                    updated[category] = displayPerCategory;
                });
                return updated;
            });
        },
        [selectedCategory, deduplicatePosts, postsByCategory]
    );

    // Xoay vòng bài viết
    useEffect(() => {
        const rotateCategoryPosts = () => {
            setDisplayedPostsByCategory((prev) => {
                const updated = { ...prev };
                Object.keys(prev).forEach((category) => {
                    const postsPool = postsByCategory[category] || [];
                    if (postsPool.length <= displayPerCategory) return;
                    const currentIndex = rotationIndices[category] || displayPerCategory;
                    const nextIndex = (currentIndex % postsPool.length) || displayPerCategory;
                    const newPost = postsPool[nextIndex];

                    if (newPost) {
                        updated[category] = [newPost, ...prev[category].slice(0, displayPerCategory - 1)];
                        updated[category] = deduplicatePosts(updated[category]);
                    }

                    setRotationIndices((indices) => ({
                        ...indices,
                        [category]: nextIndex + 1,
                    }));
                });
                return updated;
            });
        };

        const interval = setInterval(rotateCategoryPosts, 25000);
        return () => clearInterval(interval);
    }, [postsByCategory, rotationIndices, deduplicatePosts]);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    useEffect(() => {
        if (categories.length > 0) {
            fetchPosts();
        }
    }, [fetchPosts, categories]);

    useEffect(() => {
        window.addEventListener("newPostCreated", handleNewPost);
        return () => window.removeEventListener("newPostCreated", handleNewPost);
    }, [handleNewPost]);

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
            <img src={getValidImage(post)} alt={post.title} className={styles.heroImage} loading="eager" />
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
            <img src={getValidImage(post)} alt={post.title} className={styles.subHeroImage} loading="eager" />
            <h3 className={styles.subHeroTitle}>{post.title}</h3>
        </Link>
    ));

    // Component FootballPost
    const FootballPost = React.memo(({ post }) => (
        <Link href={`/tin-tuc/${post.slug}-${post._id}`} className={styles.footballPost}>
            <img src={getValidImage(post)} alt={post.title} className={styles.footballImage} loading="lazy" />
            <h3 className={styles.footballTitle}>{post.title}</h3>
        </Link>
    ));

    // Component PostItem
    const PostItem = React.memo(({ post }) => (
        <Link href={`/tin-tuc/${post.slug}-${post._id}`} className={styles.postItem}>
            <img src={getValidImage(post)} alt={post.title} className={styles.postImage} loading="lazy" />
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
                "@type": "ImageObject",
                url: "https://xsmb.win/logo.png",
            },
        },
    };

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className={styles.skeletonMenu}></div>
                <div className={styles.skeletonHero}></div>
                <div className={styles.skeletonSubHero}></div>
                <div className={styles.skeletonPost}></div>
            </div>
        );
    }

    if (error) {
        return <p className={styles.error}>{error}</p>;
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
                            className={`${styles.categoryButton} ${!selectedCategory ? styles.active : ""}`}
                            onClick={() => setSelectedCategory(null)}
                        >
                            Tất cả
                        </button>
                        {categories.map((category) => (
                            <button
                                key={category}
                                className={`${styles.categoryButton} ${selectedCategory === category ? styles.active : ""}`}
                                onClick={() => setSelectedCategory(category)}
                                style={{ "--category-color": getCategoryColor(category) }}
                            >
                                {category}
                            </button>
                        ))}
                    </nav>
                    <div className={styles.mainContent}>
                        <div className={styles.heroSection}>
                            {heroPost && <HeroPost post={heroPost} />}
                            <div className={styles.subHeroSection}>
                                <h2 className={styles.subHeroTitle}>Tin tức tổng hợp</h2>
                                <div className={styles.subHeroGrid}>
                                    {subHeroPosts.length > 0 ? (
                                        subHeroPosts.map((post) => <SubHeroPost key={post._id} post={post} />)
                                    ) : (
                                        <p className={styles.noPosts}>Không có bài viết nổi bật.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                        <aside className={styles.footballSidebar}>
                            <h2 className={styles.sidebarTitle}>Tin bóng đá</h2>
                            {footballPosts.length > 0 ? (
                                footballPosts.map((post) => <FootballPost key={post._id} post={post} />)
                            ) : (
                                <p className={styles.noPosts}>Không có bài viết bóng đá.</p>
                            )}
                        </aside>
                    </div>
                    <div className={styles.contentWrapper}>
                        <div className={styles.postsWrapper}>
                            {selectedCategory ? (
                                <section className={styles.categorySection}>
                                    <h2 className={styles.categoryTitle}>{selectedCategory}</h2>
                                    <div className={styles.postsList}>
                                        {displayedPostsByCategory[selectedCategory]?.length > 0 ? (
                                            displayedPostsByCategory[selectedCategory].map((post) => (
                                                <PostItem key={post._id} post={post} />
                                            ))
                                        ) : (
                                            <p className={styles.noPosts}>Không có bài viết nào trong danh mục này.</p>
                                        )}
                                    </div>
                                </section>
                            ) : (
                                categories.map((category) => (
                                    <section key={category} className={styles.categorySection}>
                                        <h2 className={styles.categoryTitle}>{category}</h2>
                                        <div className={styles.postsList}>
                                            {displayedPostsByCategory[category]?.length > 0 ? (
                                                displayedPostsByCategory[category].map((post) => (
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
                            {/* Add your banner image here, e.g., <img src="/path/to/your-banner.jpg" alt="Banner" /> */}
                            {/* <img src="https://xsmb.win/backgrond.png" alt="Banner" />
                            <img src="https://xsmb.win/backgrond.png" alt="Banner" /> */}
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