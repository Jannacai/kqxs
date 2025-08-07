import Head from 'next/head';
import { useRouter } from 'next/router';
import { useMemo } from 'react';

/**
 * Component SEO tối ưu cho navigation và trang web
 * Cung cấp meta tags động và structured data
 */
const SEOOptimizedHead = ({
    title,
    description,
    keywords,
    image,
    url,
    type = 'website',
    publishedTime,
    modifiedTime,
    author,
    section,
    tags = []
}) => {
    const router = useRouter();

    // Tối ưu: Sử dụng useMemo để cache các giá trị SEO
    const seoData = useMemo(() => {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://xosobactrungnam.com';
        const fullUrl = url ? `${baseUrl}${url}` : `${baseUrl}${router.asPath}`;

        return {
            title: title || 'Xổ Số Bắc Trung Nam - Kết Quả Xổ Số Miền Bắc, Miền Trung, Miền Nam',
            description: description || 'Cập nhật kết quả xổ số miền Bắc, miền Trung, miền Nam hàng ngày. Thống kê, soi cầu, tạo dàn đặc biệt chính xác nhất.',
            keywords: keywords || 'xổ số, kết quả xổ số, xổ số miền bắc, xổ số miền trung, xổ số miền nam, soi cầu, thống kê, tạo dàn',
            image: image || `${baseUrl}/asset/img/og-image.jpg`,
            url: fullUrl,
            type,
            publishedTime,
            modifiedTime,
            author: author || 'Xổ Số Bắc Trung Nam',
            section: section || 'Xổ Số',
            tags: tags.length > 0 ? tags : ['xổ số', 'kết quả', 'thống kê', 'soi cầu']
        };
    }, [title, description, keywords, image, url, router.asPath, type, publishedTime, modifiedTime, author, section, tags]);

    // Tối ưu: Tạo structured data cho SEO
    const structuredData = useMemo(() => {
        const data = {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "Xổ Số Bắc Trung Nam",
            "url": process.env.NEXT_PUBLIC_BASE_URL || 'https://xosobactrungnam.com',
            "description": seoData.description,
            "potentialAction": {
                "@type": "SearchAction",
                "target": {
                    "@type": "EntryPoint",
                    "urlTemplate": "https://xosobactrungnam.com/search?q={search_term_string}"
                },
                "query-input": "required name=search_term_string"
            }
        };

        // Tối ưu: Thêm Article schema nếu là bài viết
        if (type === 'article') {
            data["@type"] = "Article";
            data["headline"] = seoData.title;
            data["description"] = seoData.description;
            data["image"] = seoData.image;
            data["author"] = {
                "@type": "Person",
                "name": seoData.author
            };
            data["publisher"] = {
                "@type": "Organization",
                "name": "Xổ Số Bắc Trung Nam",
                "logo": {
                    "@type": "ImageObject",
                    "url": `${process.env.NEXT_PUBLIC_BASE_URL || 'https://xosobactrungnam.com'}/asset/img/logo.png`
                }
            };
            if (publishedTime) data["datePublished"] = publishedTime;
            if (modifiedTime) data["dateModified"] = modifiedTime;
            if (section) data["articleSection"] = section;
            if (tags.length > 0) data["keywords"] = tags.join(', ');
        }

        return data;
    }, [seoData, type, publishedTime, modifiedTime, section, tags]);

    // Tối ưu: Tạo breadcrumb structured data
    const breadcrumbData = useMemo(() => {
        const pathSegments = router.asPath.split('/').filter(Boolean);
        const breadcrumbs = [
            {
                "@type": "ListItem",
                "position": 1,
                "name": "Trang chủ",
                "item": process.env.NEXT_PUBLIC_BASE_URL || 'https://xosobactrungnam.com'
            }
        ];

        let currentPath = '';
        pathSegments.forEach((segment, index) => {
            currentPath += `/${segment}`;
            const name = segment
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

            breadcrumbs.push({
                "@type": "ListItem",
                "position": index + 2,
                "name": name,
                "item": `${process.env.NEXT_PUBLIC_BASE_URL || 'https://xosobactrungnam.com'}${currentPath}`
            });
        });

        return {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": breadcrumbs
        };
    }, [router.asPath]);

    return (
        <Head>
            {/* Tối ưu: Meta tags cơ bản */}
            <title>{seoData.title}</title>
            <meta name="description" content={seoData.description} />
            <meta name="keywords" content={seoData.keywords} />
            <meta name="author" content={seoData.author} />
            <meta name="robots" content="index, follow" />
            <meta name="googlebot" content="index, follow" />

            {/* Tối ưu: Open Graph tags */}
            <meta property="og:title" content={seoData.title} />
            <meta property="og:description" content={seoData.description} />
            <meta property="og:image" content={seoData.image} />
            <meta property="og:url" content={seoData.url} />
            <meta property="og:type" content={seoData.type} />
            <meta property="og:site_name" content="Xổ Số Bắc Trung Nam" />
            <meta property="og:locale" content="vi_VN" />

            {/* Tối ưu: Twitter Card tags */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={seoData.title} />
            <meta name="twitter:description" content={seoData.description} />
            <meta name="twitter:image" content={seoData.image} />
            <meta name="twitter:site" content="@xosobactrungnam" />

            {/* Tối ưu: Canonical URL */}
            <link rel="canonical" href={seoData.url} />

            {/* Tối ưu: Alternate languages */}
            <link rel="alternate" hrefLang="vi" href={seoData.url} />
            <link rel="alternate" hrefLang="x-default" href={seoData.url} />

            {/* Tối ưu: Preconnect cho performance */}
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link rel="preconnect" href="https://api.xosobactrungnam.com" />

            {/* Tối ưu: DNS prefetch cho các domain bên ngoài */}
            <link rel="dns-prefetch" href="//www.google-analytics.com" />
            <link rel="dns-prefetch" href="//www.googletagmanager.com" />

            {/* Tối ưu: Structured Data */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(structuredData)
                }}
            />

            {/* Tối ưu: Breadcrumb Structured Data */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(breadcrumbData)
                }}
            />

            {/* Tối ưu: Additional meta tags cho mobile */}
            <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
            <meta name="theme-color" content="#007bff" />
            <meta name="msapplication-TileColor" content="#007bff" />
            <meta name="apple-mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-status-bar-style" content="default" />
            <meta name="apple-mobile-web-app-title" content="Xổ Số Bắc Trung Nam" />

            {/* Tối ưu: Favicon */}
            <link rel="icon" type="image/x-icon" href="/favicon/favicon.ico" />
            <link rel="icon" type="image/png" sizes="32x32" href="/favicon/favicon-32x32.png" />
            <link rel="icon" type="image/png" sizes="16x16" href="/favicon/favicon-16x16.png" />
            <link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-touch-icon.png" />
            <link rel="manifest" href="/favicon/site.webmanifest" />

            {/* Tối ưu: Security headers */}
            <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
            <meta httpEquiv="X-Frame-Options" content="DENY" />
            <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />

            {/* Tối ưu: Performance hints */}
            <link rel="preload" href="/asset/img/LOGOxsmn_win.png" as="image" />
            <link rel="preload" href="/styles/globals.css" as="style" />

            {/* Tối ưu: Service Worker */}
            <link rel="serviceworker" href="/sw.js" />
        </Head>
    );
};

export default SEOOptimizedHead;
