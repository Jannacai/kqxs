import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';
import { getCombinedPostData } from '../api/post/index';
import Link from 'next/link';
import styles from '../../styles/postDetail.module.css';

export async function getServerSideProps(context) {
    const { id } = context.query;
    let post = null;
    let relatedPosts = [];
    let footballPosts = [];
    let error = null;

    try {
        const actualId = id.includes('-') ? id.split('-').pop() : id;
        const data = await getCombinedPostData(actualId, true);
        post = data.post;
        relatedPosts = [...new Map(data.related.map(item => [item._id, item])).values()].slice(0, 4);
        footballPosts = [...new Map(data.football.map(item => [item._id, item])).values()].slice(0, 3);
    } catch (err) {
        error = err.message || 'Đã có lỗi xảy ra khi lấy chi tiết bài viết';
    }

    return {
        props: {
            post,
            relatedPosts,
            footballPosts,
            error,
        },
    };
}

const PostDetail = ({ post, relatedPosts, footballPosts, error }) => {
    const router = useRouter();
    const [state, setState] = useState({
        relatedPostsPool: relatedPosts || [],
        footballPostsPool: footballPosts || [],
        relatedPosts: relatedPosts.slice(0, 4) || [],
        footballPosts: footballPosts.slice(0, 3) || [],
        relatedIndex: 4,
        footballIndex: 3,
    });

    const defaultDescription = 'Đọc tin tức mới nhất tại XSMB.WIN - Cập nhật thông tin nhanh chóng, chính xác!';
    const defaultImage = 'https://xsmb.win/facebook.png';

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    const interval = setInterval(() => {
                        setState((prev) => {
                            if (prev.relatedPostsPool.length === 0 && prev.footballPostsPool.length === 0) return prev;

                            const newRelatedPosts = prev.relatedPostsPool.length > 4
                                ? [...prev.relatedPosts.slice(0, 3), prev.relatedPostsPool[prev.relatedIndex] || prev.relatedPosts[3]]
                                : prev.relatedPosts;
                            const newFootballPosts = prev.footballPostsPool.length > 3
                                ? [...prev.footballPosts.slice(0, 2), prev.footballPostsPool[prev.footballIndex] || prev.footballPosts[2]]
                                : prev.footballPosts;
                            const uniqueRelatedPosts = [...new Map(newRelatedPosts.map(item => [item._id, item])).values()];
                            const uniqueFootballPosts = [...new Map(newFootballPosts.map(item => [item._id, item])).values()];
                            return {
                                ...prev,
                                relatedPosts: uniqueRelatedPosts.length >= 4 ? uniqueRelatedPosts : prev.relatedPosts,
                                footballPosts: uniqueFootballPosts.length >= 3 ? uniqueFootballPosts : prev.footballPosts,
                                relatedIndex: (prev.relatedIndex + 1) % prev.relatedPostsPool.length,
                                footballIndex: (prev.footballIndex + 1) % prev.footballPostsPool.length,
                            };
                        });
                    }, 90000);
                    return () => clearInterval(interval);
                }
            },
            { threshold: 0.1 }
        );

        const relatedPostsSection = document.querySelector(`.${styles.relatedPosts}`);
        if (relatedPostsSection) observer.observe(relatedPostsSection);
        return () => observer.disconnect();
    }, [state.relatedIndex, state.footballIndex, state.relatedPostsPool, state.footballPostsPool]);

    const formattedDate = useMemo(() => {
        if (!post?.createdAt) return 'Ngày đăng';
        try {
            const date = new Date(post.createdAt);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        } catch {
            return 'Ngày đăng';
        }
    }, [post?.createdAt]);

    const displayedRelatedPosts = useMemo(() => state.relatedPosts.slice(0, 4), [state.relatedPosts]);
    const displayedFootballPosts = useMemo(() => state.footballPosts.slice(0, 3), [state.footballPosts]);

    if (error) {
        return <p className={styles.error}>{error}</p>;
    }

    if (!post) {
        return <p className={styles.error}>Bài viết không tồn tại.</p>;
    }

    const metaDescription = post.mainContents && post.mainContents[0]?.description
        ? post.mainContents[0].description.length > 160
            ? `${post.mainContents[0].description.substring(0, 157)}...`
            : post.mainContents[0].description
        : defaultDescription;

    const canonicalUrl = `https://xsmb.win/tin-tuc/${post.slug}-${post._id}`;
    const imageUrl = post.mainContents?.find(content => content.img && /\.(jpg|jpeg|png|gif)$/i.test(content.img))?.img || defaultImage;

    const isValidImage = (url) => {
        return url && /\.(jpg|jpeg|png|gif)$/i.test(url) && url.startsWith('https://');
    };

    const finalImageUrl = isValidImage(imageUrl) ? imageUrl : defaultImage;

    const structuredData = {
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        'headline': post.title,
        'datePublished': post.createdAt,
        'dateModified': post.createdAt,
        'author': {
            '@type': 'Person',
            'name': post.author?.username || 'Admin',
        },
        'image': finalImageUrl ? [finalImageUrl] : [],
        'description': metaDescription,
        'mainEntityOfPage': {
            '@type': 'WebPage',
            '@id': canonicalUrl,
        },
        'publisher': {
            '@type': 'Organization',
            'name': 'XSMB.WIN',
            'logo': {
                '@type': 'ImageObject',
                'url': 'https://xsmb.win/logo.png',
            },
        },
    };

    const RelatedPostItem = React.memo(({ post }) => {
        const postImage = post.mainContents?.find(content => content.img && /\.(jpg|jpeg|png|gif)$/i.test(content.img))?.img;
        return (
            <Link href={`/tin-tuc/${post.slug}-${post._id}`} className={styles.relatedItem} title={post.title} aria-label={`Xem bài viết ${post.title}`}>
                {postImage && (
                    <Image
                        src={postImage}
                        alt={post.title}
                        className={styles.relatedImage}
                        width={300}
                        height={200}
                        loading="lazy"
                    />
                )}
                <h3 className={styles.relatedItemTitle}>{post.title}</h3>
            </Link>
        );
    });

    const FootballPostItem = React.memo(({ post }) => {
        const postImage = post.mainContents?.find(content => content.img && /\.(jpg|jpeg|png|gif)$/i.test(content.img))?.img;
        const postDescription = post.mainContents && post.mainContents[0]?.description || '';
        return (
            <Link href={`/tin-tuc/${post.slug}-${post._id}`} className={styles.footballItem} title={post.title} aria-label={`Xem bài viết ${post.title}`}>
                {postImage && (
                    <Image
                        src={postImage}
                        alt={post.title}
                        className={styles.footballImage}
                        width={300}
                        height={200}
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
                <meta name="author" content={post.author?.username || 'Admin'} />
                <meta property="og:title" content={post.title.slice(0, 60)} />
                <meta property="og:description" content={metaDescription} />
                <meta property="og:type" content="article" />
                <meta property="og:url" content={canonicalUrl} />
                <meta property="og:site_name" content="XSMB.WIN" />
                <meta property="og:locale" content="vi_VN" />
                <meta property="fb:app_id" content={process.env.FB_APP_ID || ''} />
                {finalImageUrl && post.mainContents?.[0]?.img === finalImageUrl && (
                    <>
                        <meta property="og:image" content={finalImageUrl} />
                        <meta property="og:image:secure_url" content={finalImageUrl} />
                        <meta property="og:image:width" content="1200" />
                        <meta property="og:image:height" content="630" />
                        <meta property="og:image:type" content={finalImageUrl.endsWith('.png') ? 'image/png' : 'image/jpeg'} />
                        <meta property="og:image:alt" content={post.title} />
                        <meta name="twitter:image" content={finalImageUrl} />
                        <meta name="twitter:image:alt" content={post.title} />
                        <link rel="preload" href={finalImageUrl} as="image" /> {/* Chỉ preload nếu hình ảnh là đầu tiên */}
                    </>
                )}
                <meta property="zalo:official_account_id" content={process.env.ZALO_OA_ID || ''} />
                <meta property="zalo:share_url" content={canonicalUrl} />
                {finalImageUrl && post.mainContents?.[0]?.img === finalImageUrl && (
                    <>
                        <meta property="zalo-img" content={finalImageUrl} />
                        <meta property="zalo-img:width" content="600" />
                        <meta property="zalo-img:height" content="600" />
                    </>
                )}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={post.title.slice(0, 60)} />
                <meta name="twitter:description" content={metaDescription} />
                <link rel="canonical" href={canonicalUrl} />
                <link rel="alternate" hrefLang="vi" href={canonicalUrl} />
                <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
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
                            <span className={styles.author}>Tác giả: {post.author?.username || 'Admin'}</span>
                        </div>
                        <RenderContent
                            contentOrder={post.contentOrder}
                            mainContents={post.mainContents}
                            title={post.title}
                        />
                        <button
                            className={styles.backButton}
                            onClick={() => router.push('/tin-tuc')}
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

const RenderContent = React.memo(({ contentOrder, mainContents, title }) => {
    if (!contentOrder || contentOrder.length === 0 || !mainContents) {
        return <p className={styles.noContent}>Không có nội dung để hiển thị.</p>;
    }

    return (
        <div className={styles.content}>
            {contentOrder.map((item, index) => {
                if (item.type === 'mainContent' && mainContents[item.index]) {
                    const content = mainContents[item.index];
                    return (
                        <div key={`mainContent-${index}`} className={`${styles.mainContent} ${content.isImageFirst ? styles.imageFirst : ''}`}>
                            {content.h2 && (
                                <h2 className={styles.subSectionTitle}>{content.h2}</h2>
                            )}
                            {content.isImageFirst ? (
                                <>
                                    {content.img && /\.(jpg|jpeg|png|gif)$/i.test(content.img) && (
                                        <figure className={styles.imageWrapper}>
                                            <Image
                                                src={content.img}
                                                srcSet={`${content.img} 1200w, ${content.img.replace(/\/upload\//, '/upload/w_800/')} 800w, ${content.img.replace(/\/upload\//, '/upload/w_400/')} 400w`}
                                                sizes="(max-width: 768px) 100vw, 800px"
                                                alt={content.h2 || title}
                                                className={styles.image}
                                                width={800}
                                                height={450}
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
                                    {content.img && /\.(jpg|jpeg|png|gif)$/i.test(content.img) && (
                                        <figure className={styles.imageWrapper}>
                                            <Image
                                                src={content.img}
                                                srcSet={`${content.img} 1200w, ${content.img.replace(/\/upload\//, '/upload/w_800/')} 800w, ${content.img.replace(/\/upload\//, '/upload/w_400/')} 400w`}
                                                sizes="(max-width: 768px) 100vw, 800px"
                                                alt={content.h2 || title}
                                                className={styles.image}
                                                width={800}
                                                height={450}
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

export default PostDetail;