import Head from 'next/head';
import dynamic from 'next/dynamic';
import KQXS from './kqxsAll/index';
import Calendar from '../component/caledar';
import ListXSMT from '../component/listXSMT';
import ListXSMB from '../component/listXSMB';
import ListXSMN from '../component/listXSMN';
import TableDate from '../component/tableDateKQXS';
import CongCuHot from '../component/CongCuHot';
import { apiMB } from './api/kqxs/kqxsMB';
import styles from '../public/css/kqxsMB.module.css';


// Lazy load components với loading states

const ThongKe = dynamic(() => import('../component/thongKe.js'), {
    ssr: true,
    loading: () => <div className={styles.skeleton} style={{ height: '300px' }} />
});

export async function getStaticProps() {
    const now = new Date();
    const isUpdateWindow = now.getHours() === 18 && now.getMinutes() >= 10 && now.getMinutes() <= 35;
    const revalidateTime = isUpdateWindow ? 10 : 3600;
    const drawDate = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;

    try {
        const initialData = await apiMB.getLottery('xsmb', null, null);
        return {
            props: {
                initialData,
                drawDate,
            },
            revalidate: revalidateTime,
        };
    } catch (error) {
        console.error('Lỗi khi lấy dữ liệu ban đầu:', error);
        return {
            props: {
                initialData: [],
                drawDate,
            },
            revalidate: revalidateTime,
        };
    }
}

const XSMB = ({ initialData, drawDate }) => {
    const canonicalUrl = 'https://www.xsmb.win/ket-qua-xo-so-mien-bac';

    // Tối ưu title theo từ khóa người dùng
    const title = `XSMB Hôm Nay ${drawDate} - Kết Quả Xổ Số Miền Bắc Nhanh Nhất | XSMB.WIN`;

    // Tối ưu description theo search intent
    const description = `XSMB hôm nay ${drawDate} - Xem kết quả xổ số Miền Bắc ngày ${drawDate} nhanh và chính xác nhất. Tường thuật SXMB lúc 18h15 trực tiếp từ trường quay. Xem giải đặc biệt, lô tô, đầu đuôi tại xsmb.win!`;

    if (!Array.isArray(initialData) || initialData.length === 0) {
        return (
            <div className={styles.container}>
                <div className={styles.error}>
                    Không có dữ liệu XSMB. Vui lòng thử lại sau.
                </div>
            </div>
        );
    }

    return (
        <>
            <Head>
                <meta charSet="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>{title}</title>
                <meta name="description" content={description} />

                {/* Tối ưu keywords theo từ khóa người dùng */}
                <meta
                    name="keywords"
                    content="xổ số miền bắc, xsmb hôm nay, kết quả xổ số miền bắc, xổ số hôm nay, xsmb ngày hôm nay, kqxs miền bắc, xổ số bắc, soi cầu xsmb, thống kê xổ số miền bắc, lô tô đầu đuôi xsmb"
                />
                <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />

                {/* E-A-T Signals */}
                <meta name="author" content="XSMB.WIN" />
                <meta name="publisher" content="XSMB.WIN" />
                <meta name="copyright" content="XSMB.WIN" />
                <meta name="language" content="vi" />
                <meta name="geo.region" content="VN" />
                <meta name="geo.placename" content="Việt Nam" />

                {/* Open Graph Tags - Tối ưu cho social sharing */}
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

                {/* Zalo - Tối ưu cho thị trường Việt Nam */}
                <meta property="og:app_id" content={process.env.ZALO_APP_ID || ''} />
                <meta property="zalo:official_account_id" content={process.env.ZALO_OA_ID || ''} />
                <meta property="zalo:share_url" content={canonicalUrl} />
                <meta property="zalo:og:image" content="https://xsmb.win/zalotelegram.png" />
                <meta property="zalo:og:image:width" content="600" />
                <meta property="zalo:og:image:height" content="600" />

                {/* Telegram - Voice search optimization */}
                <meta name="telegram:channel" content={process.env.TELEGRAM_CHANNEL || '@YourChannel'} />
                <meta name="telegram:share_url" content={canonicalUrl} />
                <meta
                    name="telegram:description"
                    content={`Cập nhật XSMB nhanh nhất ngày ${drawDate} tại ${process.env.TELEGRAM_CHANNEL || '@YourChannel'}!`}
                />
                <meta name="telegram:og:image" content="https://xsmb.win/zalotelegram.png" />

                {/* Twitter Cards - Enhanced */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={title} />
                <meta name="twitter:description" content={description} />
                <meta name="twitter:image" content="https://xsmb.win/XSMB.png" />
                <meta name="twitter:image:alt" content={`Kết quả xổ số miền Bắc ${drawDate}`} />
                <meta name="twitter:site" content="@xsmb_win" />
                <meta name="twitter:creator" content="@xsmb_win" />

                {/* Canonical và Alternate */}
                <link rel="canonical" href={canonicalUrl} />
                <link rel="alternate" hrefLang="vi" href={canonicalUrl} />
                <link rel="alternate" hrefLang="x-default" href={canonicalUrl} />

                {/* Preload critical resources - Chỉ preload resources thực sự cần thiết */}
                <link rel="preload" href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" as="fetch" crossorigin="anonymous" />

                {/* Enhanced JSON-LD Schema cho 2024 */}
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
                                "url": "https://www.xsmb.win",
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
                                "url": "https://www.xsmb.win"
                            },
                            "license": "https://creativecommons.org/licenses/by/4.0/",
                            "creator": {
                                "@type": "Organization",
                                "name": "XSMB.WIN",
                                "url": "https://www.xsmb.win"
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
                            "@type": "Organization",
                            "name": "XSMB.WIN",
                            "url": "https://www.xsmb.win",
                            "logo": "https://xsmb.win/logo.png",
                            "description": "Website cung cấp kết quả xổ số Miền Bắc nhanh nhất và chính xác nhất",
                            "foundingDate": "2020",
                            "address": {
                                "@type": "PostalAddress",
                                "addressCountry": "VN"
                            },
                            "contactPoint": {
                                "@type": "ContactPoint",
                                "contactType": "customer service",
                                "availableLanguage": "Vietnamese"
                            },
                            "sameAs": [
                                "https://zalo.me/your-zalo-oa-link",
                                "https://t.me/YourChannel",
                                "https://www.facebook.com/xsmb.win"
                            ]
                        },
                        {
                            "@context": "https://schema.org",
                            "@type": "WebSite",
                            "name": "XSMB.WIN",
                            "url": "https://www.xsmb.win",
                            "description": "Website xổ số Miền Bắc hàng đầu Việt Nam",
                            "potentialAction": {
                                "@type": "SearchAction",
                                "target": "https://www.xsmb.win/search?q={search_term_string}",
                                "query-input": "required name=search_term_string"
                            },
                            "publisher": {
                                "@type": "Organization",
                                "name": "XSMB.WIN"
                            }
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
                                    "name": "Xổ Số Miền Bắc",
                                    "item": "https://www.xsmb.win/ket-qua-xo-so-mien-bac"
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
                                }
                            ]
                        }
                    ])}
                </script>
            </Head>
            <div>
                <div className="container">
                    <div className="navigation">
                        <Calendar />
                        <ListXSMB />
                        <ListXSMT />
                        <ListXSMN />
                    </div>
                    <div>
                        {/* <TableDate /> */}
                        
                        {/* Fixed height container để tránh layout shift */}
                        <div style={{ minHeight: '400px' }}>
                            {initialData ? (
                                <KQXS data={initialData} station="xsmb">Miền Bắc</KQXS>
                            ) : (
                                <div className={styles.skeleton} style={{ height: '400px' }}>
                                    <div className={styles.skeletonRow}></div>
                                    <div className={styles.skeletonRow}></div>
                                    <div className={styles.skeletonRow}></div>
                                </div>
                            )}
                        </div>
                        {/* Fixed height cho desc1 để tránh layout shift */}
                        <div className="desc1" style={{
                            minHeight: '200px',
                            height: 'auto',
                            overflow: 'hidden'
                        }}>
                            <h1 className='heading'>XSMB Hôm Nay {drawDate} - Kết Quả Xổ Số Miền Bắc Nhanh Nhất</h1>
                            <p>
                                <strong>XSMB hôm nay {drawDate}</strong> - Cập nhật kết quả xổ số Miền Bắc ngày {drawDate} lúc 18h15 trực tiếp từ trường quay. Xem chi tiết <strong>giải đặc biệt</strong>, <strong>lô tô</strong>, <strong>đầu đuôi</strong> và thống kê nhanh chóng tại <strong>xsmb.win</strong>. Khám phá thêm <a href="/ket-qua-xo-so-mien-trung">XSMT</a>, <a href="/ket-qua-xo-so-mien-nam">XSMN</a>, và <a href="/thong-ke-xsmb">thống kê XSMB</a> để phân tích chi tiết!
                            </p>
                            <br />
                            <p className='note'>Chú ý: Mọi hành vi liên quan đến vi phạm pháp luật chúng tôi KHÔNG khuyến khích và KHÔNG chịu trách nhiệm.</p>
                        </div>
                    </div>
                    <div>
                        <ThongKe />
                        {/* <Chat /> */}
                        <CongCuHot />
                        <div className='banner1'>
                            <a href='https://m.dktin.top/reg/104600' tabIndex={-1}>
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
                    </div>
                </div>
                <div className="container">
                    {/* <PostList /> */}
                </div>
            </div>
        </>
    );
};

export default XSMB;