import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
    return (
        <Html lang="vi">
            <Head>
                {/* Meta Tags SEO Nâng Cao */}
                <title>XSMB - Kết Quả Xổ Số Miền Bắc Nhanh Chóng, Chính Xác 2025</title>
                <meta name="description" content="Cập nhật kết quả xổ số miền Bắc (XSMB) nhanh nhất, chính xác nhất. Thống kê, dự đoán XSMB, kết nối qua Zalo, Telegram tại xsmb.win." />
                <meta name="keywords" content="xsmb, kết quả xổ số miền bắc, xổ số 2025, xsmb hôm nay, xsmb trực tiếp, zalo xsmb, telegram xsmb" />
                <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
                <meta name="author" content="XSMB Team" />
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />

                {/* Open Graph Tags (Tối ưu cho tất cả mạng xã hội) */}
                <meta property="og:title" content="XSMB - Kết Quả Xổ Số Miền Bắc Nhanh Chóng, Chính Xác 2025" /> {/* Header */}
                <meta property="og:description" content="Cập nhật kết quả XSMB nhanh nhất, chính xác nhất. Tham gia cộng đồng tại Zalo và Telegram để nhận thông tin mới nhất tại xsmb.win!" /> {/* Content */}
                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://xsmb.win/" />
                <meta property="og:image" content="https://xsmb.win/xsmbwin.png" /> {/* Ảnh */}
                <meta property="og:image:width" content="500" />
                <meta property="og:image:height" content="500" />
                <meta property="og:image:secure_url" content="https://xsmb.win/xsmbwin.png" />
                <meta property="og:site_name" content="XSMB" />
                <meta property="og:locale" content="vi_VN" />

                {/* Thêm OG Tags cụ thể cho Zalo */}
                <meta property="og:app_id" content="your-zalo-app-id" />
                <meta property="zalo:official_account_id" content="your-zalo-oa-id" />
                <meta property="zalo:share_url" content="https://xsmb.win/" />

                {/* Thêm OG Tags cụ thể cho Telegram */}
                <meta name="telegram:channel" content="@YourChannel" />
                <meta name="telegram:share_url" content="https://xsmb.win/" />
                <meta name="telegram:description" content="Cập nhật XSMB nhanh nhất, tham gia Telegram tại @YourChannel để nhận kết quả!" />

                {/* Twitter Cards (Tối ưu cho Twitter/X) */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="XSMB - Kết Quả Xổ Số Miền Bắc Nhanh Chóng, Chính Xác 2025" /> {/* Header */}
                <meta name="twitter:description" content="Cập nhật XSMB nhanh nhất, chính xác nhất. Kết nối qua Zalo và Telegram tại xsmb.win!" /> {/* Content */}
                <meta name="twitter:image" content="https://xsmb.win/xsmbwin.png" /> {/* Ảnh */}
                <meta name="twitter:image:alt" content="Kết quả xổ số miền Bắc 2025" />

                {/* LinkedIn OG Tags */}
                <meta property="og:image" content="https://xsmb.win/xsmbwin.png" />
                <meta property="og:image:width" content="1200" />
                <meta property="og:image:height" content="627" />

                {/* Pinterest Rich Pins */}
                <meta property="og:image" content="https://xsmb.win/xsmbwin.png" />
                <meta property="og:image:width" content="1000" />
                <meta property="og:image:height" content="1500" />

                {/* Canonical và JSON-LD Schema */}
                <link rel="canonical" href="https://xsmb.win/" />
                <script type="application/ld+json">
                    {JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "WebSite",
                        "name": "XSMB",
                        "url": "https://xsmb.win/",
                        "description": "Cập nhật kết quả xổ số miền Bắc nhanh chóng, chính xác.",
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
                <link href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&family=Sora:wght@100..800&family=Roboto:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet" />
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