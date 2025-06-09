
import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import Head from "next/head";
import { getPosts, getCategories } from "../pages/api/post";
import styles from "../styles/tintuc.module.css";

const EnhancedNewsFeed = () => {
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [heroPostsPool, setHeroPostsPool] = useState([]);
    const [subHeroPostsPool, setSubHeroPostsPool] = useState([]);
    const [footballPostsPool, setFootballPostsPool] = useState([]);
    const [heroPost, setHeroPost] = useState(null);
    const [subHeroPosts, setSubHeroPosts] = useState([]);
    const [footballPosts, setFootballPosts] = useState([]);
    const [heroIndex, setHeroIndex] = useState(0);
    const [subHeroIndex, setSubHeroIndex] = useState(0);
    const [footballIndex, setFootballIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const postsPerCategory = 15;
    const defaultImage = "/facebook.png"; // Thay bằng hình ảnh cục bộ hoặc URL công khai

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
                const fetchedPosts = Array.isArray(data.posts) ? deduplicatePosts(data.posts).slice(0, postsPerCategory) : [];
                console.log("Fetched posts for", selectedCategory, fetchedPosts);
                setHeroPostsPool(fetchedPosts);
                setSubHeroPostsPool(fetchedPosts);
                setFootballPostsPool(fetchedPosts.filter((post) => post.category.includes("Thể thao")));
                setHeroPost(fetchedPosts[0] || null);
                setSubHeroPosts(fetchedPosts.slice(0, 4));
                setFootballPosts(fetchedPosts.filter((post) => post.category.includes("Thể thao")).slice(0, 3));
                setHeroIndex(1);
                setSubHeroIndex(4);
                setFootballIndex(3);
            } else {
                const allPosts = [];
                for (const category of categories) {
                    const data = await getPosts(null, 1, postsPerCategory, category);
                    const categoryPosts = Array.isArray(data.posts) ? deduplicatePosts(data.posts).slice(0, postsPerCategory) : [];
                    allPosts.push({ category, posts: categoryPosts });
                    console.log("Fetched posts for", category, categoryPosts);
                }
                const combinedPosts = deduplicatePosts(allPosts.flatMap((group) => group.posts));
                setHeroPostsPool(combinedPosts);
                setSubHeroPostsPool(combinedPosts);
                setFootballPostsPool(combinedPosts.filter((post) => post.category.includes("Thể thao")));
                setHeroPost(combinedPosts[0] || null);
                setSubHeroPosts(combinedPosts.slice(0, 4));
                setFootballPosts(combinedPosts.filter((post) => post.category.includes("Thể thao")).slice(0, 3));
                setHeroIndex(1);
                setSubHeroIndex(4);
                setFootballIndex(3);
            }
            setLoading(false);
        } catch (err) {
            console.error("Error fetching posts:", err);
            setError("Không thể tải bài viết");
            setHeroPostsPool([]);
            setSubHeroPostsPool([]);
            setFootballPostsPool([]);
            setLoading(false);
        }
    }, [selectedCategory, categories, deduplicatePosts]);

    // Xử lý bài viết mới
    const handleNewPost = useCallback(
        (event) => {
            const newPost = event.detail;
            console.log("New post received:", newPost);
            if (!newPost || !newPost._id || !newPost.title || !newPost.slug || !Array.isArray(newPost.category)) {
                console.warn("Invalid new post:", newPost);
                return;
            }

            setHeroPostsPool((prev) => {
                if (selectedCategory && !newPost.category.includes(selectedCategory)) return prev;
                let newPool = [...prev];
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
                return deduplicatePosts(newPool).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            });

            setSubHeroPostsPool((prev) => {
                if (selectedCategory && !newPost.category.includes(selectedCategory)) return prev;
                let newPool = [...prev];
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
                return deduplicatePosts(newPool).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            });

            setFootballPostsPool((prev) => {
                if (!newPost.category.includes("Thể thao")) return prev;
                let newPool = [...prev];
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
                return deduplicatePosts(newPool).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            });
        },
        [selectedCategory, deduplicatePosts]
    );

    // Xoay vòng hero post
    useEffect(() => {
        const rotateHeroPost = () => {
            if (heroPostsPool.length <= 1) return;
            setHeroPost((prev) => {
                const currentId = prev?._id;
                let nextIndex = heroIndex;
                let nextPost = heroPostsPool[nextIndex];
                let attempts = 0;
                const maxAttempts = heroPostsPool.length;

                while (nextPost && nextPost._id === currentId && attempts < maxAttempts) {
                    nextIndex = (nextIndex + 1) % heroPostsPool.length;
                    nextPost = heroPostsPool[nextIndex];
                    attempts++;
                }

                setHeroIndex((nextIndex + 1) % heroPostsPool.length);
                return nextPost || prev;
            });
        };

        const interval = setInterval(rotateHeroPost, 15000);
        return () => clearInterval(interval);
    }, [heroIndex, heroPostsPool]);

    // Xoay vòng sub-hero posts
    useEffect(() => {
        const rotateSubHeroPosts = () => {
            if (subHeroPostsPool.length <= 4) return;
            setSubHeroPosts((prev) => {
                if (prev.length < 4) return prev;
                const currentIds = new Set(prev.map((p) => p._id));
                let nextIndex = subHeroIndex;
                let nextPost = subHeroPostsPool[nextIndex];
                let attempts = 0;
                const maxAttempts = subHeroPostsPool.length;

                while (nextPost && (currentIds.has(nextPost._id) || !nextPost) && attempts < maxAttempts) {
                    nextIndex = (nextIndex + 1) % subHeroPostsPool.length;
                    nextPost = subHeroPostsPool[nextIndex];
                    attempts++;
                }

                const newPosts = [...prev.slice(0, 3), nextPost || prev[3]];
                const uniqueNewPosts = deduplicatePosts(newPosts);
                setSubHeroIndex((nextIndex + 1) % subHeroPostsPool.length);
                return uniqueNewPosts.length >= 4 ? uniqueNewPosts : prev;
            });
        };

        const interval = setInterval(rotateSubHeroPosts, 25000);
        return () => clearInterval(interval);
    }, [subHeroIndex, subHeroPostsPool, deduplicatePosts]);

    // Xoay vòng football posts
    useEffect(() => {
        const rotateFootballPosts = () => {
            if (footballPostsPool.length <= 3) return;
            setFootballPosts((prev) => {
                if (prev.length < 3) return prev;
                const currentIds = new Set(prev.map((p) => p._id));
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
                const uniqueNewPosts = deduplicatePosts(newPosts);
                setFootballIndex((nextIndex + 1) % footballPostsPool.length);
                return uniqueNewPosts.length >= 3 ? uniqueNewPosts : prev;
            });
        };

        const interval = setInterval(rotateFootballPosts, 20000);
        return () => clearInterval(interval);
    }, [footballIndex, footballPostsPool, deduplicatePosts]);

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
            return `${ day } /${month}/${ year } `;
        } catch {
            return "Ngày đăng";
        }
    }, []);

    // Lấy hình ảnh hợp lệ từ mainContents
    const getValidImage = useCallback((post) => {
        if (!post.mainContents || !Array.isArray(post.mainContents)) {
            return defaultImage;
        }
        const validImage = post.mainContents.find(content => content.img && content.img.startsWith('http'));
        return validImage ? validImage.img : defaultImage;
    }, []);

    // Lấy mô tả từ mainContents
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
        <Link href={`/tin-tuc/${post.slug}-${post._id} `} className={styles.heroPost}>
            <img
                src={getValidImage(post)}
                alt={post.title}
                className={styles.heroImage}
                loading="eager"
            />
            <div className={styles.heroContent}>
                <div className={styles.heroMeta}>
                    <span className={styles.postDate}>{formatDate(post.createdAt)}</span>
                    {Array.isArray(post.category) &&
                        post.category.map((cat, idx) => (
                            <span
                                key={`${ cat } -${ idx } `}
                                className={styles.postCategory}
                                style={{ "--category-color": getCategoryColor(cat) }}
                            >
                                {cat}
                            </span>
                        ))}
                </div>
                <h2 className={styles.heroTitle}>{post.title}</h2>
                <p className={styles.heroExcerpt}>
                    {getPostDescription(post) || "Không có mô tả"}...
                </p>
            </div>
        </Link>
    ));

    // Component SubHeroPost
    const SubHeroPost = React.memo(({ post }) => (
        <Link href={`/tin-tuc/${post.slug}-${post._id} `} className={styles.subHeroPost}>
            <img
                src={getValidImage(post)}
                alt={post.title}
                className={styles.subHeroImage}
                loading="eager"
            />
            <h3 className={styles.subHeroTitle}>{post.title}</h3>
        </Link>
    ));

    // Component FootballPost
    const FootballPost = React.memo(({ post }) => (
        <Link href={`tin-tuc/${post.slug}-${post._id } `} className={styles.footballPost}>
            <img
                src={getValidImage(post)}
                alt={post.title}
                className={styles.footballImage}
                loading="lazy"
            />
            <h3 className={styles.footballTitle}>{post.title}</h3>
        </Link>
    ));

    // Component PostItem
    const PostItem = React.memo(({ post }) => (
        <Link href={`/tin-tuc/${post.slug}-${post._id}`} className={styles.postItem}>
            <img
                src={getValidImage(post)}
                alt={post.title}
                className={styles.postImage}
                loading="lazy"
            />
            <div className={styles.postContent}>
                <div className={styles.postMeta}>
                    <span className={styles.postDate}>{formatDate(post.createdAt)}</span>
                    {Array.isArray(post.category) &&
                        post.category.map((cat, idx) => (
                            <span
                                key={`${ cat } -${ idx } `}
                                className={styles.postCategory}
                                style={{ "--category-color": getCategoryColor(cat) }}
                            >
                                {cat}
                            </span>
                        ))}
                </div>
                <h3 className={styles.postTitle}>{post.title}</h3>
                <p className={styles.postExcerpt}>
                    {getPostDescription(post) || "Không có mô tả"}...
                </p>
            </div>
        </Link>
    ));

    // Danh sách bài viết hiển thị
    const displayedPosts = useMemo(() => {
        if (selectedCategory) {
            return deduplicatePosts(heroPostsPool).filter(
                (post) =>
                    post._id !== heroPost?._id &&
                    !subHeroPosts.some((shp) => shp._id === post._id) &&
                    !footballPosts.some((fp) => fp._id === post._id)
            );
        }
        return categories.map((category) => ({
            category,
            posts: deduplicatePosts(
                heroPostsPool.filter((post) => post.category.includes(category))
            ).filter(
                (post) =>
                    post._id !== heroPost?._id &&
                    !subHeroPosts.some((shp) => shp._id === post._id) &&
                    !footballPosts.some((fp) => fp._id === post._id)
            ),
        }));
    }, [selectedCategory, heroPostsPool, heroPost, subHeroPosts, footballPosts, categories, deduplicatePosts]);

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
                            className={`${ styles.categoryButton } ${ !selectedCategory ? styles.active : "" } `}
                            onClick={() => setSelectedCategory(null)}
                        >
                            Tất cả
                        </button>
                        {categories.map((category) => (
                            <button
                                key={category}
                                className={`${ styles.categoryButton } ${ selectedCategory === category ? styles.active : "" } `}
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
                            <div className={styles.subHeroGrid}>
                                {subHeroPosts.length > 0 ? (
                                    subHeroPosts.map((post) => <SubHeroPost key={post._id} post={post} />)
                                ) : (
                                    <p className={styles.noPosts}>Không có bài viết nổi bật.</p>
                                )}
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
                    <div className={styles.postsWrapper}>
                        {selectedCategory ? (
                            <section className={styles.categorySection}>
                                <h2 className={styles.categoryTitle}>{selectedCategory}</h2>
                                <div className={styles.postsList}>
                                    {displayedPosts.length > 0 ? (
                                        displayedPosts.map((post) => <PostItem key={post._id} post={post} />)
                                    ) : (
                                        <p className={styles.noPosts}>Không có bài viết nào trong danh mục này.</p>
                                    )}
                                </div>
                            </section>
                        ) : (
                            displayedPosts.map(({ category, posts }) => (
                                <section key={category} className={styles.categorySection}>
                                    <h2 className={styles.categoryTitle}>{category}</h2>
                                    <div className={styles.postsList}>
                                        {posts.length > 0 ? (
                                            posts.map((post) => <PostItem key={post._id} post={post} />)
                                        ) : (
                                            <p className={styles.noPosts}>Không có bài viết nào trong danh mục này.</p>
                                        )}
                                    </div>
                                </section>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default EnhancedNewsFeed;
