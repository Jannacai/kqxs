import { Html, Head, Main, NextScript } from 'next/document';
import Script from 'next/script';

export default function Document() {
    return (
        <Html lang="vi">
            <Head>
                {/* Meta Tags Cơ Bản - Chỉ dành cho global */}
                <meta charSet="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
                <meta name="theme-color" content="#c80505" />
                <meta name="color-scheme" content="light dark" />
                <meta name="format-detection" content="telephone=no" />

                {/* DNS Prefetch & Preconnect - Tối ưu performance */}
                <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
                <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
                <link rel="dns-prefetch" href="https://backendkqxs-1.onrender.com" />
                <link rel="dns-prefetch" href="https://back-end-diendan.onrender.com" />
                <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link rel="preconnect" href="https://backendkqxs-1.onrender.com" crossOrigin="anonymous" />
                <link rel="preconnect" href="https://back-end-diendan.onrender.com" crossOrigin="anonymous" />

                {/* Favicon - Global cho toàn bộ site */}
                <link rel="icon" type="image/png" sizes="32x32" href="/favicon/favicon-32x32.png" />
                <link rel="icon" type="image/png" sizes="16x16" href="/favicon/favicon-16x16.png" />
                <link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-icon-180x180.png" />
                <link rel="apple-touch-icon" sizes="152x152" href="/favicon/apple-icon-152x152.png" />
                <link rel="apple-touch-icon" sizes="144x144" href="/favicon/apple-icon-144x144.png" />
                <link rel="apple-touch-icon" sizes="120x120" href="/favicon/apple-icon-120x120.png" />
                <link rel="apple-touch-icon" sizes="114x114" href="/favicon/apple-icon-114x114.png" />
                <link rel="apple-touch-icon" sizes="76x76" href="/favicon/apple-icon-76x76.png" />
                <link rel="apple-touch-icon" sizes="72x72" href="/favicon/apple-icon-72x72.png" />
                <link rel="apple-touch-icon" sizes="60x60" href="/favicon/apple-icon-60x60.png" />
                <link rel="apple-touch-icon" sizes="57x57" href="/favicon/apple-icon-57x57.png" />
                <link rel="manifest" href="/favicon/manifest.json" />
                <meta name="msapplication-TileColor" content="#c80505" />
                <meta name="msapplication-TileImage" content="/favicon/ms-icon-144x144.png" />
                <meta name="theme-color" content="#c80505" />

                {/* Google Tag Manager - Global tracking */}
                <Script
                    strategy="lazyOnload"
                    src="https://www.googletagmanager.com/gtag/js?id=G-32BNFX1ZW5"
                />
                <Script strategy="lazyOnload">
                    {`
                        window.dataLayer = window.dataLayer || [];
                        function gtag(){dataLayer.push(arguments);}
                        gtag('js', new Date());
                        gtag('config', 'G-32BNFX1ZW5', {
                            page_title: document.title,
                            page_location: window.location.href
                        });
                    `}
                </Script>

                {/* Global JSON-LD Schema - Chỉ cho website chung */}
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            '@context': 'https://schema.org',
                            '@type': 'WebSite',
                            name: 'XSMB.WIN',
                            url: 'https://xsmb.win',
                            description: 'Website cung cấp kết quả xổ số Miền Bắc, Miền Trung, Miền Nam nhanh nhất và chính xác nhất',
                            inLanguage: 'vi-VN',
                            isAccessibleForFree: true,
                            potentialAction: {
                                '@type': 'SearchAction',
                                target: 'https://xsmb.win/search?q={search_term_string}',
                                'query-input': 'required name=search_term_string'
                            },
                            publisher: {
                                '@type': 'Organization',
                                name: 'XSMB.WIN',
                                url: 'https://xsmb.win',
                                logo: {
                                    '@type': 'ImageObject',
                                    url: 'https://xsmb.win/logo.png',
                                    width: 200,
                                    height: 60
                                },
                                foundingDate: '2020',
                                address: {
                                    '@type': 'PostalAddress',
                                    addressCountry: 'VN'
                                },
                                contactPoint: {
                                    '@type': 'ContactPoint',
                                    contactType: 'customer service',
                                    availableLanguage: 'Vietnamese'
                                }
                            },
                            creator: {
                                '@type': 'Organization',
                                name: 'XSMB.WIN',
                                url: 'https://xsmb.win'
                            },
                            license: 'https://creativecommons.org/licenses/by/4.0/',
                            sameAs: [
                                'https://zalo.me/your-zalo-oa-link',
                                'https://t.me/YourChannel',
                                'https://www.facebook.com/xsmb.win'
                            ]
                        })
                    }}
                />

                {/* Global Security Headers - Chỉ dùng meta tags được hỗ trợ */}
                <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
                <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
                <meta httpEquiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
                <meta httpEquiv="Permissions-Policy" content="camera=(), microphone=(), geolocation=()" />

                {/* Global Performance Hints - Chỉ preload resources thực sự cần thiết */}
                <link rel="preload" href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" as="fetch" crossOrigin="anonymous" />
            </Head>
            <body>
                <Main />
                <NextScript />
            </body>
        </Html>
    );
}