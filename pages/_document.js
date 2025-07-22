import { Html, Head, Main, NextScript } from 'next/document';
import Script from 'next/script';

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
                <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link rel="preconnect" href="https://backendkqxs-1.onrender.com" crossOrigin="anonymous" />
                <link rel="preconnect" href="https://back-end-diendan.onrender.com" crossOrigin="anonymous" />

                {/* Preload Poppins font */}
                {/* <link
                    rel="preload"
                    href="/fonts/Poppins-Regular.woff2"
                    as="font"
                    type="font/woff2"
                    crossOrigin="anonymous"
                /> */}

                {/* Google Tag Manager */}
                <Script
                    strategy="lazyOnload"
                    src="https://www.googletagmanager.com/gtag/js?id=G-32BNFX1ZW5"
                />
                <Script strategy="lazyOnload">
                    {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-32BNFX1ZW5');
          `}
                </Script>

                {/* Font Poppins cục bộ */}
                {/* <style>
                    {`
            @font-face {
              font-family: 'Poppins';
              font-display: swap;
              src: url('/fonts/Poppins-Regular.woff2') format('woff2');
              font-weight: 400;
              font-style: normal;
            }
          `}
                </style> */}

                {/* Favicon */}
                <link rel="icon" type="image/png" sizes="32x32" href="/favicon/favicon-32x32.png" />
                <link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-icon-180x180.png" />
                <link rel="manifest" href="/favicon/manifest.json" />
                <meta name="theme-color" content="#ffffff" />

                {/* JSON-LD Schema */}
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            '@context': 'https://schema.org',
                            '@type': 'WebSite',
                            name: 'XSMB',
                            url: 'https://xsmb.win/',
                            description:
                                'Cập nhật nhanh kết quả xổ số miền Bắc (XSMB), miền Trung (XSMT), miền Nam (XSMN) chính xác nhất năm 2025.',
                            potentialAction: {
                                '@type': 'SearchAction',
                                target: 'https://xsmb.win/search?q={search_term_string}',
                                'query-input': 'required name=search_term_string',
                            },
                            sameAs: ['https://zalo.me/your-zalo-oa-link', 'https://t.me/YourChannel'],
                            license: 'https://creativecommons.org/licenses/by/4.0/',
                            creator: {
                                '@type': 'Organization',
                                name: 'XSMB.WIN',
                                url: 'https://www.xsmb.win',
                            },
                        }),
                    }}
                />
            </Head>
            <body>
                <Main />
                <NextScript />
            </body>
        </Html>
    );
}