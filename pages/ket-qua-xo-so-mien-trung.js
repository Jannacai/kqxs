import Head from 'next/head';
import { useMemo } from 'react';
import KQXS from './xsmt/index';
import Calendar from '../component/caledar';
import ThongKe from '../component/thongKe';
import ListXSMT from '../component/listXSMT';
import ListXSMB from '../component/listXSMB';
import ListXSMN from '../component/listXSMN';
import TableDate from '../component/tableDateKQXS';
import CongCuHot from '../component/CongCuHot';
import { apiMT } from './api/kqxs/kqxsMT';

export async function getStaticProps() {
    const now = new Date();
    const isUpdateWindow = now.getHours() === 17 && now.getMinutes() >= 11 && now.getMinutes() <= 32;
    const revalidateTime = isUpdateWindow ? 10 : 21600; // 10 giây trong khung giờ cập nhật, 6 giờ ngoài khung giờ
    const drawDate = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;

    try {
        const initialData = await apiMT.getLottery('xsmt', null, null, null, { limit: 3 });
        return {
            props: {
                initialData,
                drawDate,
            },
            revalidate: revalidateTime,
        };
    } catch (error) {
        console.error('Lỗi khi lấy dữ liệu ban đầu:', {
            message: error.message,
            stack: error.stack,
        });
        return {
            props: {
                initialData: [],
                drawDate,
            },
            revalidate: revalidateTime,
        };
    }
}

const XSMT = ({ initialData, drawDate }) => {
    // Memoize SEO data để tránh re-create objects
    const seoData = useMemo(() => {
        const canonicalUrl = 'https://www.xsmb.win/ket-qua-xo-so-mien-trung';
        const title = `XSMT - Kết Quả Xổ Số Miền Trung - KQXSMT Hôm Nay ${drawDate}`;
        const description = `XSMT - Xem kết quả xổ số Miền Trung ngày ${drawDate} nhanh và chính xác, tường thuật SXMT lúc 17h10 trực tiếp từ trường quay. Xem giải đặc biệt, lô tô, đầu đuôi tại xsmb.win!`;

        return {
            canonicalUrl,
            title,
            description,
            keywords: "xổ số miền trung, xsmt, kqxs, kết quả xổ số miền trung, xổ số hôm nay, kqxsmt, sxmt, lô tô, đầu đuôi, soi cầu xsmt, xổ số miền trung hôm nay, kết quả xổ số miền trung ngày hôm nay, xổ số miền trung ngày hôm nay, kết quả xổ số miền trung hôm nay, xổ số miền trung ngày hôm nay, kết quả xổ số miền trung ngày hôm nay, xổ số miền trung hôm nay, kết quả xổ số miền trung hôm nay, xổ số miền trung ngày hôm nay, kết quả xổ số miền trung ngày hôm nay"
        };
    }, [drawDate]);

    // Memoize JSON-LD schema để tránh re-create
    const jsonLdSchema = useMemo(() => [
        {
            "@context": "https://schema.org",
            "@type": "Dataset",
            "name": `Kết Quả Xổ Số Miền Trung ${drawDate}`,
            "description": `Kết quả xổ số Miền Trung ngày ${drawDate} với các giải thưởng và thống kê chi tiết.`,
            "temporalCoverage": drawDate,
            "keywords": ["xổ số", "miền trung", "kết quả", "xsmt", "lô tô", "đầu đuôi", "soi cầu xsmt", "xổ số miền trung hôm nay"],
            "url": seoData.canonicalUrl,
            "publisher": {
                "@type": "Organization",
                "name": "XSMT",
                "url": "https://www.xsmb.win",
            },
            "license": "https://creativecommons.org/licenses/by/4.0/",
            "creator": {
                "@type": "Organization",
                "name": "XSMB.WIN",
                "url": "https://www.xsmb.win"
            },
            "dateModified": new Date().toISOString(),
            "datePublished": new Date().toISOString()
        },
        {
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "XSMT",
            "url": "https://www.xsmb.win",
            "logo": "https://xsmb.win/logo.png",
            "sameAs": [
                "https://zalo.me/your-zalo-oa-link",
                "https://t.me/YourChannel"
            ],
            "contactPoint": {
                "@type": "ContactPoint",
                "contactType": "customer service",
                "availableLanguage": "Vietnamese"
            }
        },
        {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "XSMT",
            "url": "https://www.xsmb.win",
            "potentialAction": {
                "@type": "SearchAction",
                "target": "https://www.xsmb.win/search?q={search_term_string}",
                "query-input": "required name=search_term_string"
            },
            "description": "Trang web xem kết quả xổ số miền Trung nhanh nhất, chính xác nhất"
        },
        {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                {
                    "@type": "ListItem",
                    "position": 1,
                    "name": "Trang chủ",
                    "item": "https://www.xsmb.win"
                },
                {
                    "@type": "ListItem",
                    "position": 2,
                    "name": "Xổ Số Miền Trung",
                    "item": "https://www.xsmb.win/ket-qua-xo-so-mien-trung"
                }
            ]
        },
        {
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": `Kết Quả Xổ Số Miền Trung ${drawDate}`,
            "description": `Kết quả xổ số Miền Trung ngày ${drawDate} với đầy đủ các giải thưởng và thống kê chi tiết.`,
            "image": "https://xsmb.win/xsmt.png",
            "author": {
                "@type": "Organization",
                "name": "XSMB.WIN"
            },
            "publisher": {
                "@type": "Organization",
                "name": "XSMT",
                "logo": {
                    "@type": "ImageObject",
                    "url": "https://xsmb.win/logo.png"
                }
            },
            "datePublished": new Date().toISOString(),
            "dateModified": new Date().toISOString(),
            "mainEntityOfPage": {
                "@type": "WebPage",
                "@id": seoData.canonicalUrl
            }
        }
    ], [drawDate, seoData.canonicalUrl]);

    return (
        <>
            <Head>
                <meta charSet="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
                <title>{seoData.title}</title>
                <meta name="description" content={seoData.description} />
                <meta name="keywords" content={seoData.keywords} />
                <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
                <meta name="googlebot" content="index, follow" />
                <meta name="bingbot" content="index, follow" />

                {/* Performance & Security Headers */}
                <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
                <meta name="format-detection" content="telephone=no" />
                <meta name="theme-color" content="#ff0000" />
                <meta name="msapplication-TileColor" content="#ff0000" />
                <meta name="mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="default" />
                <meta name="apple-mobile-web-app-title" content="XSMT" />

                {/* Open Graph Tags - Enhanced */}
                <meta property="og:title" content={seoData.title} />
                <meta property="og:description" content={seoData.description} />
                <meta property="og:type" content="website" />
                <meta property="og:url" content={seoData.canonicalUrl} />
                <meta property="og:image" content="https://xsmb.win/xsmt.png" />
                <meta property="og:image:width" content="1200" />
                <meta property="og:image:height" content="630" />
                <meta property="og:image:secure_url" content="https://xsmb.win/xsmt.png" />
                <meta property="og:image:type" content="image/png" />
                <meta property="og:image:alt" content={`Kết quả xổ số miền Trung ${drawDate}`} />
                <meta property="og:site_name" content="XSMT" />
                <meta property="og:locale" content="vi_VN" />
                <meta property="og:locale:alternate" content="en_US" />
                <meta property="fb:app_id" content={process.env.FB_APP_ID || ''} />

                {/* Zalo - Enhanced */}
                <meta property="og:app_id" content={process.env.ZALO_APP_ID || ''} />
                <meta property="zalo:official_account_id" content={process.env.ZALO_OA_ID || ''} />
                <meta property="zalo:share_url" content={seoData.canonicalUrl} />
                <meta property="zalo:og:image" content="https://xsmb.win/zalotelegram.png" />
                <meta property="zalo:og:image:width" content="600" />
                <meta property="zalo:og:image:height" content="600" />

                {/* Telegram - Enhanced */}
                <meta name="telegram:channel" content={process.env.TELEGRAM_CHANNEL || '@YourChannel'} />
                <meta name="telegram:share_url" content={seoData.canonicalUrl} />
                <meta
                    name="telegram:description"
                    content={`Cập nhật XSMT nhanh nhất ngày ${drawDate} tại ${process.env.TELEGRAM_CHANNEL || '@YourChannel'}!`}
                />
                <meta name="telegram:og:image" content="https://xsmb.win/zalotelegram.png" />

                {/* Twitter Cards - Enhanced */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={seoData.title} />
                <meta name="twitter:description" content={seoData.description} />
                <meta name="twitter:image" content="https://xsmb.win/xsmt.png" />
                <meta name="twitter:image:alt" content={`Kết quả xổ số miền Trung ${drawDate}`} />
                <meta name="twitter:site" content="@xsmb_win" />
                <meta name="twitter:creator" content="@xsmb_win" />

                {/* Canonical & Alternate */}
                <link rel="canonical" href={seoData.canonicalUrl} />
                <link rel="alternate" hrefLang="vi" href={seoData.canonicalUrl} />
                <link rel="alternate" hrefLang="x-default" href={seoData.canonicalUrl} />

                {/* Preload critical resources */}
                <link rel="preload" href="/banner3.mp4" as="fetch" type="video/mp4" />
                <link rel="preload" href="/banner2.mp4" as="fetch" type="video/mp4" />
                <link rel="dns-prefetch" href="//xsmb.win" />
                <link rel="dns-prefetch" href="//www.google-analytics.com" />

                {/* JSON-LD Schema - Enhanced */}
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSchema) }}
                />
            </Head>

            <main>
                <div className='container'>
                    <nav className='navigation' role="navigation" aria-label="Điều hướng chính">
                        <Calendar />
                        <ListXSMB />
                        <ListXSMT />
                        <ListXSMN />
                    </nav>

                    <section>
                        <TableDate />
                        <div className='groupbanner3'>
                            <a href='https://m.dktin.top/reg/104600' tabIndex={-1} aria-label="Quảng cáo">
                                <video
                                    className='banner3'
                                    src='/banner3.mp4'
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    alt='xổ số bắc trung nam'
                                    loading="lazy"
                                    suppressHydrationWarning
                                />
                            </a>
                        </div>

                        {initialData ? (
                            <KQXS data={initialData} station="xsmt">Miền Trung</KQXS>
                        ) : (
                            <div role="status" aria-live="polite">
                                <span>Đang tải kết quả...</span>
                            </div>
                        )}

                        <article className="desc1" style={{ minHeight: '200px' }}>
                            <h1 className='heading'>XSMT.WIN | Kết Quả Xổ Số Miền Trung Nhanh Nhất - Chính Xác Nhất</h1>
                            <p>
                                Cập nhật kết quả xổ số Miền Trung (XSMT) ngày {drawDate} lúc 17h10 trực tiếp từ trường quay các tỉnh.
                                Xem chi tiết <strong>giải đặc biệt</strong>, <strong>lô tô</strong>, <strong>đầu đuôi</strong> và
                                <strong>thống kê</strong> nhanh chóng tại xsmb.win. Khám phá thêm{' '}
                                <a href="/ket-qua-xo-so-mien-bac" title="Kết quả xổ số miền Bắc">XSMB</a>,{' '}
                                <a href="/ket-qua-xo-so-mien-nam" title="Kết quả xổ số miền Nam">XSMN</a>, và{' '}
                                <a href="/thong-ke-xsmt" title="Thống kê XSMT">thống kê XSMT</a> để phân tích chi tiết!
                            </p>
                            <br />
                            <p className='note' role="note">
                                <strong>Chú ý:</strong> Mọi hành vi liên quan đến vi phạm pháp luật chúng tôi KHÔNG khuyến khích và KHÔNG chịu trách nhiệm.
                            </p>
                        </article>
                    </section>

                    <aside>
                        <ThongKe />
                        <CongCuHot />
                        <div className='banner1'>
                            <a href='https://m.dktin.top/reg/104600' tabIndex={-1} aria-label="Quảng cáo">
                                <video
                                    className='header__logo--img'
                                    src='/banner2.mp4'
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    alt='xổ số bắc trung nam'
                                    loading="lazy"
                                    suppressHydrationWarning
                                />
                            </a>
                        </div>
                    </aside>
                </div>
            </main>
        </>
    );
};

XSMT.displayName = 'XSMT';

export default XSMT;