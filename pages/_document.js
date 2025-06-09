import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
    const defaultImage = "https://xsmb.win/facebook.png"; // Hình ảnh mặc định (1200x630px)
    const defaultDescription = "Cập nhật nhanh kết quả xổ số miền Bắc (XSMB), miền Trung (XSMT), miền Nam (XSMN) chính xác nhất năm 2025.";
    const defaultTitle = "XSMB.WIN - Kết quả xổ số và tin tức mới nhất";

    return (
        <Html lang="vi">
            <Head>
                {/* Meta Tags Cơ Bản */}
                <meta charSet="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <meta name="robots" content="index, follow" />
                <meta name="description" content={defaultDescription} />
                <meta name="author" content="XSMB.WIN" />

                {/* Open Graph Tags */}
                <meta property="og:title" content={defaultTitle} />
                <meta property="og:description" content={defaultDescription} />
                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://xsmb.win/" />
                <meta property="og:image" content={defaultImage} />
                <meta property="og:image:secure_url" content={defaultImage} />
                <meta property="og:image:width" content="1200" />
                <meta property="og:image:height" content="630" />
                <meta property="og:image:type" content="image/jpeg" />
                <meta property="og:image:alt" content="XSMB.WIN Logo" />
                <meta property="og:site_name" content="XSMB.WIN" />
                <meta property="og:locale" content="vi_VN" />
                <meta property="fb:app_id" content={process.env.FB_APP_ID || ''} />

                {/* Zalo */}
                <meta property="zalo:official_account_id" content={process.env.ZALO_OA_ID || ''} />
                <meta property="zalo:share_url" content="https://xsmb.win/" />
                <meta property="zalo:og:image" content="https://xsmb.win/zalotelegram.png" />
                <meta property="zalo:og:image:width" content="600" />
                <meta property="zalo:og:image:height" content="600" />

                {/* Twitter Cards */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={defaultTitle} />
                <meta name="twitter:description" content={defaultDescription} />
                <meta name="twitter:image" content={defaultImage} />
                <meta name="twitter:image:alt" content="XSMB.WIN Logo" />

                {/* Canonical URL mặc định */}
                <link rel="canonical" href="https://xsmb.win/" />

                {/* Google Tag Manager */}
                <script async src="https://www.googletagmanager.com/gtag/js?id=G-32BNFX1ZW5"></script>
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            window.dataLayer = window.dataLayer || [];
                            function gtag(){dataLayer.push(arguments);}
                            gtag('js', new Date());
                            gtag('config', 'G-32BNFX1ZW5');
                        `,
                    }}
                />

                {/* JSON-LD Schema */}
                <script type="application/ld+json">
                    {JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "WebSite",
                        "name": "XSMB.WIN",
                        "url": "https://xsmb.win/",
                        "description": defaultDescription,
                        "potentialAction": {
                            "@type": "SearchAction",
                            "target": "https://xsmb.win/search?q={search_term_string}",
                            "query-input": "required name=search_term_string"
                        },
                        "sameAs": [
                            "https://zalo.me/your-zalo-oa-link",
                            "https://t.me/YourChannel"
                        ],
                        "license": "https://creativecommons.org/licenses/by/4.0/",
                        "creator": {
                            "@type": "Organization",
                            "name": "XSMB.WIN",
                            "url": "https://xsmb.win/"
                        }
                    })}
                </script>

                {/* Font và Icon */}
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link
                    href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&family=Sora:wght@400;600&display=swap"
                    rel="stylesheet"
                />
                <link
                    rel="stylesheet"
                    href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css"
                    integrity="sha512-6+0fcjA1qG8rZJ7+0PT6V3eJ6j+0PT6V3eJ6j+0PT6V3eJ6j+0PT6V3eJ6j"
                    crossOrigin="anonymous"
                />

                {/* Favicon */}
                <link rel="icon" type="image/png" sizes="32x32" href="/favicon/favicon-32x32.png" />
                <link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-icon-180x180.png" />
                <link rel="manifest" href="/favicon/manifest.json" />
                <meta name="theme-color" content="#ffffff" />

                {/* Preload hình ảnh mặc định */}
                <link rel="preload" href={defaultImage} as="image" />
            </Head>
            <body>
                <Main />
                <NextScript />
            </body>
        </Html>
    );
}