import Head from 'next/head';
import dynamic from 'next/dynamic';
import Image from 'next/image';
// Dynamic imports
const Calendar = dynamic(() => import('../component/caledar'), { ssr: false });
const ThongKe = dynamic(() => import('../component/thongKe'), { ssr: false });
const ListXSMB = dynamic(() => import('../component/listXSMB'), { ssr: false });
const ListXSMT = dynamic(() => import('../component/listXSMT'), { ssr: false });
const ListXSMN = dynamic(() => import('../component/listXSMN'), { ssr: false });
const CongCuHot = dynamic(() => import('../component/CongCuHot'), { ssr: false });
const TableDate = dynamic(() => import('../component/tableDateKQXS'), { ssr: false });
const KQXS = dynamic(() => import('./kqxsAll/index'), { ssr: true });

export async function getServerSideProps() {
    const today = new Date();
    const drawDate = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;

    return {
        props: {
            drawDate,
        },
    };
}

export default function Home({ drawDate }) {
    // ✅ Tối ưu title theo từ khóa người dùng
    const title = `XSMB Hôm Nay ${drawDate} - Kết Quả Xổ Số Miền Bắc Nhanh Nhất | XSMB.WIN`;
    
    // ✅ Tối ưu description theo search intent
    const description = `XSMB hôm nay ${drawDate} - Xem kết quả xổ số Miền Bắc ngày ${drawDate} nhanh và chính xác nhất. Tường thuật SXMB lúc 18h15 trực tiếp từ trường quay. Xem giải đặc biệt, lô tô, đầu đuôi tại xsmb.win!`;
    
    const canonicalUrl = 'https://xsmb.win';

    return (
        <div>
            <Head>
                <title>{title}</title>
                <meta name="description" content={description} />
                
                {/* ✅ Tối ưu keywords theo từ khóa người dùng */}
                <meta
                    name="keywords"
                    content="xổ số miền bắc, xsmb hôm nay, kết quả xổ số miền bắc, xổ số hôm nay, xsmb ngày hôm nay, kqxs miền bắc, xổ số bắc, soi cầu xsmb, thống kê xổ số miền bắc, lô tô đầu đuôi xsmb, xổ số trực tiếp, kết quả xổ số hôm nay, xsmb 2025"
                />
                
                {/* ✅ E-A-T Signals */}
                <meta name="author" content="XSMB.WIN" />
                <meta name="publisher" content="XSMB.WIN" />
                <meta name="copyright" content="XSMB.WIN" />
                <meta name="language" content="vi" />
                <meta name="geo.region" content="VN" />
                <meta name="geo.placename" content="Việt Nam" />
                <meta name="geo.position" content="10.8231;106.6297" />
                <meta name="ICBM" content="10.8231, 106.6297" />
                
                {/* ✅ Enhanced Robots */}
                <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
                <meta name="googlebot" content="index, follow" />
                <meta name="bingbot" content="index, follow" />
                
                {/* ✅ Canonical & Alternate */}
                <link rel="canonical" href={canonicalUrl} />
                <link rel="alternate" hrefLang="vi" href={canonicalUrl} />
                <link rel="alternate" hrefLang="x-default" href={canonicalUrl} />

                {/* ✅ Open Graph - Tối ưu cho social sharing */}
                <meta property="og:title" content={title} />
                <meta property="og:description" content={description} />
                <meta property="og:type" content="website" />
                <meta property="og:url" content={canonicalUrl} />
                <meta property="og:image" content="https://xsmb.win/XSMB.png" />
                <meta property="og:image:width" content="1200" />
                <meta property="og:image:height" content="630" />
                <meta property="og:image:secure_url" content="https://xsmb.win/XSMB.png" />
                <meta property="og:image:type" content="image/png" />
                <meta property="og:image:alt" content={`Kết quả xổ số miền Bắc ${drawDate}`} />
                <meta property="og:site_name" content="XSMB.WIN" />
                <meta property="og:locale" content="vi_VN" />
                <meta property="og:locale:alternate" content="en_US" />
                <meta property="fb:app_id" content={process.env.FB_APP_ID || ''} />

                {/* ✅ Zalo - Tối ưu cho thị trường Việt Nam */}
                <meta property="og:app_id" content={process.env.ZALO_APP_ID || ''} />
                <meta property="zalo:official_account_id" content={process.env.ZALO_OA_ID || ''} />
                <meta property="zalo:share_url" content={canonicalUrl} />
                <meta property="zalo:og:image" content="https://xsmb.win/zalotelegram.png" />
                <meta property="zalo:og:image:width" content="600" />
                <meta property="zalo:og:image:height" content="600" />

                {/* ✅ Telegram - Voice search optimization */}
                <meta name="telegram:channel" content={process.env.TELEGRAM_CHANNEL || '@YourChannel'} />
                <meta name="telegram:share_url" content={canonicalUrl} />
                <meta
                    name="telegram:description"
                    content={`Cập nhật XSMB nhanh nhất ngày ${drawDate} tại ${process.env.TELEGRAM_CHANNEL || '@YourChannel'}!`}
                />
                <meta name="telegram:og:image" content="https://xsmb.win/zalotelegram.png" />

                {/* ✅ Twitter Cards - Enhanced */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={title} />
                <meta name="twitter:description" content={description} />
                <meta name="twitter:image" content="https://xsmb.win/XSMB.png" />
                <meta name="twitter:image:alt" content={`Kết quả xổ số miền Bắc ${drawDate}`} />
                <meta name="twitter:site" content="@xsmb_win" />
                <meta name="twitter:creator" content="@xsmb_win" />

                {/* ✅ Enhanced JSON-LD Schema cho 2024 */}
                <script type="application/ld+json">
                    {JSON.stringify([
                        {
                            "@context": "https://schema.org",
                            "@type": ["Dataset", "WebPage", "NewsArticle"],
                            "name": `Kết Quả Xổ Số Miền Bắc ${drawDate}`,
                            "headline": `XSMB Hôm Nay ${drawDate} - Kết Quả Xổ Số Miền Bắc`,
                            "description": `Kết quả xổ số Miền Bắc ngày ${drawDate} với các giải thưởng và thống kê chi tiết.`,
                            "temporalCoverage": drawDate,
                            "keywords": ["xổ số", "miền bắc", "kết quả", "xsmb", "lô tô", "đầu đuôi", "soi cầu xsmb", "xổ số hôm nay"],
                            "url": canonicalUrl,
                            "mainEntityOfPage": {
                                "@type": "WebPage",
                                "@id": canonicalUrl
                            },
                            "publisher": {
                                "@type": "Organization",
                                "name": "XSMB.WIN",
                                "url": "https://xsmb.win",
                                "logo": {
                                    "@type": "ImageObject",
                                    "url": "https://xsmb.win/logo.png",
                                    "width": 200,
                                    "height": 60
                                },
                                "sameAs": [
                                    "https://zalo.me/your-zalo-oa-link",
                                    "https://t.me/YourChannel",
                                    "https://www.facebook.com/xsmb.win"
                                ]
                            },
                            "author": {
                                "@type": "Organization",
                                "name": "XSMB.WIN",
                                "url": "https://xsmb.win"
                            },
                            "license": "https://creativecommons.org/licenses/by/4.0/",
                            "creator": {
                                "@type": "Organization",
                                "name": "XSMB.WIN",
                                "url": "https://xsmb.win"
                            },
                            "datePublished": new Date().toISOString(),
                            "dateModified": new Date().toISOString(),
                            "inLanguage": "vi-VN",
                            "isAccessibleForFree": true,
                            "accessMode": ["textual", "visual"],
                            "accessibilityControl": ["fullKeyboardControl", "fullMouseControl"],
                            "accessibilityFeature": ["readingOrder", "structuralNavigation", "tableOfContents"],
                            "accessibilityHazard": "none",
                            "accessibilityAPI": "ARIA"
                        },
                        {
                            "@context": "https://schema.org",
                            "@type": "BreadcrumbList",
                            "itemListElement": [
                                {
                                    "@type": "ListItem",
                                    "position": 1,
                                    "name": "Trang chủ",
                                    "item": "https://xsmb.win"
                                }
                            ]
                        },
                        {
                            "@context": "https://schema.org",
                            "@type": "FAQPage",
                            "mainEntity": [
                                {
                                    "@type": "Question",
                                    "name": "Xổ số Miền Bắc quay lúc mấy giờ?",
                                    "acceptedAnswer": {
                                        "@type": "Answer",
                                        "text": "Xổ số Miền Bắc quay lúc 18h15 hàng ngày từ thứ 2 đến chủ nhật."
                                    }
                                },
                                {
                                    "@type": "Question",
                                    "name": "Xem kết quả XSMB ở đâu nhanh nhất?",
                                    "acceptedAnswer": {
                                        "@type": "Answer",
                                        "text": "Xem kết quả XSMB nhanh nhất tại xsmb.win - website cập nhật kết quả trực tiếp từ trường quay."
                                    }
                                },
                                {
                                    "@type": "Question",
                                    "name": "Kết quả xổ số Miền Bắc hôm nay có gì?",
                                    "acceptedAnswer": {
                                        "@type": "Answer",
                                        "text": `Kết quả xổ số Miền Bắc ngày ${drawDate} bao gồm: giải đặc biệt, giải nhất, giải nhì, giải ba, giải tư, giải năm, giải sáu, giải bảy và các thống kê lô tô, đầu đuôi chi tiết.`
                                    }
                                }
                            ]
                        }
                    ])}
                </script>
            </Head>
            <div className="container">
                <div className="navigation">
                    <Calendar />
                    <ListXSMB />
                    <ListXSMT />
                    <ListXSMN />
                </div>
                <div>
                    <TableDate />
                    <div className="groupbanner3">
                        <a href="https://m.dktin.top/reg/104600" tabIndex={-1}>
                            <video
                                className="banner3"
                                src="/banner3.mp4"
                                autoPlay
                                loop
                                muted
                                playsInline
                                alt="xổ số bắc trung nam"
                                loading="lazy"
                                suppressHydrationWarning
                            />
                        </a>
                    </div>
                    <KQXS>{"Miền Bắc"}</KQXS>
                    <div className="desc1" style={{ minHeight: '200px' }}>
                        <h1 className="heading">XSMB Hôm Nay {drawDate} - Kết Quả Xổ Số Miền Bắc Nhanh Nhất</h1>
                        <p>
                            <strong>XSMB hôm nay {drawDate}</strong> - Cập nhật kết quả xổ số Miền Bắc ngày {drawDate} lúc 18h15 trực tiếp từ trường quay. Xem chi tiết <strong>giải đặc biệt</strong>, <strong>lô tô</strong>, <strong>đầu đuôi</strong> và thống kê nhanh chóng tại <strong>xsmb.win</strong>. Khám phá thêm <a href="/ket-qua-xo-so-mien-trung">XSMT</a>, <a href="/ket-qua-xo-so-mien-nam">XSMN</a>, và <a href="/thong-ke-xsmb">thống kê XSMB</a> để phân tích chi tiết!
                        </p>
                        <br />
                        <p className="note">Chú ý: Mọi hành vi liên quan đến vi phạm pháp luật chúng tôi KHÔNG khuyến khích và KHÔNG chịu trách nhiệm.</p>
                    </div>
                </div>
                <div>
                    <div>
                        <ThongKe />
                        <CongCuHot />
                    </div>
                    <div className="banner1">
                        <a href="https://m.dktin.top/reg/104600" tabIndex={-1}>
                            <video
                                className="header__logo--img"
                                src="/banner2.mp4"
                                autoPlay
                                loop
                                muted
                                playsInline
                                alt="xổ số bắc trung nam"
                                loading="lazy"
                                suppressHydrationWarning
                            />
                        </a>
                    </div>
                </div>
            </div>
            <div className="container">
                {/* <PostList /> */}
            </div>
        </div>
    );
}