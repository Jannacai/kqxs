import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
    return (
        <Html lang="vi">
            <Head>
                {/* Meta Tags Cơ Bản */}
                <meta charSet="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <meta name="robots" content="index, follow" />

                <meta property="og:image" content="https://xsmb.win/facebook.png" />
                <meta property="og:image:width" content="1200" />
                <meta property="og:image:height" content="630" />
                <meta property="og:image:secure_url" content="https://xsmb.win/facebook.png" />
                <meta property="og:image:type" content="image/png" />

                {/* Zalo */}
                <meta property="zalo:og:image" content="https://xsmb.win/zalotelegram.png" />
                <meta property="zalo:og:image:width" content="600" />
                <meta property="zalo:og:image:height" content="600" />

                {/* Twitter */}
                <meta name="twitter:image" content="https://xsmb.win/facebook.png" />

                {/* Google Tag Manager */}
                <script async src="https://www.googletagmanager.com/gtag/js?id=G-32BNFX1ZW5"></script>
                <script>
                    {`window.dataLayer = window.dataLayer || [];
                    function gtag(){dataLayer

.push(arguments);}
                    gtag('js', new Date());
                    gtag('config', 'G-32BNFX1ZW5');`}
                </script>

                {/* JSON-LD Schema Cơ Bản (Không chứa thông tin động) */}
                <script type="application/ld+json">
                    {JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "WebSite",
                        "name": "XSMB",
                        "url": "https://xsmb.win/",
                        "description": "Cập nhật nhanh kết quả xổ số miền Bắc (XSMB), miền Trung (XSMT), miền Nam (XSMN) chính xác nhất năm 2025.",
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
                            "url": "https://www.xsmb.win"
                        }
                    })}
                </script>

                {/* Font và Icon */}
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&family=Sora:wght@400;600&display=swap" rel="stylesheet" />
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css" />

                {/* Favicon */}
                <link rel="icon" type="image/png" sizes="32x32" href="/favicon/favicon-32x32.png" />
                <link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-icon-180x180.png" />
                <link rel="manifest" href="/favicon/manifest.json" />
                <meta name="theme-color" content="#ffffff" />
            </Head>
            <body>
                <Main />
                <NextScript />
            </body>
        </Html>
    );
}