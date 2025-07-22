import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
    return (
        <Html lang="vi">
            <Head>
                {/* Meta Tags Cơ Bản */}
                <meta charSet="UTF-8" />
                <meta name="robots" content="index, follow" />
                <meta name="theme-color" content="#c80505" />

                {/* Preconnect và DNS Prefetch */}
                <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
                <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
                <link rel="dns-prefetch" href="https://cdnjs.cloudflare.com" />
                <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossOrigin="anonymous" />

                {/* Google Tag Manager với defer */}
                <script async defer src="https://www.googletagmanager.com/gtag/js?id=G-32BNFX1ZW5"></script>
                <script>
                    {`window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-32BNFX1ZW5');`}
                </script>

                {/* JSON-LD Schema Cơ Bản */}
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

                {/* Font với font-display: swap (giảm số lượng font) */}
                <link
                    href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&family=Sora:wght@400;600&display=swap"
                    rel="stylesheet"
                />
                <link
                    rel="stylesheet"
                    href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css"
                />

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