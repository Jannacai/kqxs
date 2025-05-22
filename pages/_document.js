import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
    return (
        <Html lang="vi">
            <Head>
                {/* Meta Tags Cơ Bản */}
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <meta name="robots" content="index, follow" />

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
                        ]
                    })}
                </script>

                {/* Font và Icon */}
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
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