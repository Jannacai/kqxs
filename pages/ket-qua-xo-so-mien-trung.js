import Head from 'next/head';
import KQXS from './xsmt/index';
import Calendar from '../component/caledar';
import ThongKe from '../component/thongKe';
import ListXSMT from '../component/listXSMT';
import ListXSMB from '../component/listXSMB';
import ListXSMN from '../component/listXSMN';
import PostList from './tin-tuc/list';
import TableDate from '../component/tableDateKQXS';
import CongCuHot from '../component/CongCuHot';
import { apiMT } from './api/kqxs/kqxsMT';
import Chat from './chat/chat';

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
    const canonicalUrl = 'https://www.xsmb.win/ket-qua-xo-so-mien-trung';
    const title = `XSMT - Kết Quả Xổ Số Miền Trung - KQXSMT Hôm Nay ${drawDate}`;
    const description = `XSMT - Xem kết quả xổ số Miền Trung ngày ${drawDate} nhanh và chính xác, tường thuật SXMT lúc 17h10 trực tiếp từ trường quay. Xem giải đặc biệt, lô tô, đầu đuôi tại xsmb.win!`;

    return (
        <>
            <Head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>{title}</title>
                <meta name="description" content={description} />
                <meta
                    name="keywords"
                    content="xổ số miền trung, xsmt, kqxs, kết quả xổ số miền trung, xổ số hôm nay, kqxsmt, sxmt, lô tô, đầu đuôi, soi cầu xsmt"
                />
                <meta name="robots" content="index, follow" />

                {/* Open Graph Tags */}
                <meta property="og:title" content={title} />
                <meta property="og:description" content={description} />
                <meta property="og:type" content="website" />
                <meta property="og:url" content={canonicalUrl} />
                <meta property="og:image" content="https://xsmb.win/xsmt.png" />
                <meta property="og:image:width" content="1200" />
                <meta property="og:image:height" content="630" />
                <meta property="og:image:secure_url" content="https://xsmb.win/xsmt.png" />
                <meta property="og:image:type" content="image/png" />
                <meta property="og:image:alt" content={`Kết quả xổ số miền Trung ${drawDate}`} />
                <meta property="og:site_name" content="XSMT" />
                <meta property="og:locale" content="vi_VN" />
                <meta property="fb:app_id" content={process.env.FB_APP_ID || ''} />

                {/* Zalo */}
                <meta property="og:app_id" content={process.env.ZALO_APP_ID || ''} />
                <meta property="zalo:official_account_id" content={process.env.ZALO_OA_ID || ''} />
                <meta property="zalo:share_url" content={canonicalUrl} />
                <meta property="zalo:og:image" content="https://xsmb.win/zalotelegram.png" />
                <meta property="zalo:og:image:width" content="600" />
                <meta property="zalo:og:image:height" content="600" />

                {/* Telegram */}
                <meta name="telegram:channel" content={process.env.TELEGRAM_CHANNEL || '@YourChannel'} />
                <meta name="telegram:share_url" content={canonicalUrl} />
                <meta
                    name="telegram:description"
                    content={`Cập nhật XSMT nhanh nhất ngày ${drawDate} tại ${process.env.TELEGRAM_CHANNEL || '@YourChannel'}!`}
                />
                <meta name="telegram:og:image" content="https://xsmb.win/zalotelegram.png" />

                {/* Twitter Cards */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={title} />
                <meta name="twitter:description" content={description} />
                <meta name="twitter:image" content="https://xsmb.win/xsmt.png" />
                <meta name="twitter:image:alt" content={`Kết quả xổ số miền Trung ${drawDate}`} />

                <link rel="canonical" href={canonicalUrl} />
                <link rel="alternate" hrefLang="vi" href={canonicalUrl} />

                {/* JSON-LD Schema */}
                <script type="application/ld+json">
                    {JSON.stringify([
                        {
                            "@context": "https://schema.org",
                            "@type": "Dataset",
                            "name": `Kết Quả Xổ Số Miền Trung ${drawDate}`,
                            "description": `Kết quả xổ số Miền Trung ngày ${drawDate} với các giải thưởng và thống kê.`,
                            "temporalCoverage": drawDate,
                            "keywords": ["xổ số", "miền trung", "kết quả", "xsmt", "lô tô", "đầu đuôi", "soi cầu xsmt"],
                            "url": canonicalUrl,
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
                            }
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
                            ]
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
                                    "name": "Xổ Số Miền Trung",
                                    "item": "https://www.xsmb.win/ket-qua-xo-so-mien-trung"
                                }
                            ]
                        }
                    ])}
                </script>
            </Head>
            <div>
                <div className='container'>
                    <div className='navigation'>
                        <Calendar />
                        <ListXSMB />
                        <ListXSMT />
                        <ListXSMN />
                    </div>
                    <div>
                        <TableDate />
                        <div className='groupbanner3'>
                            <a href='https://m.dktin.top/reg/104600' tabIndex={-1}>
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
                            <span>Đang tải kết quả...</span>
                        )}
                        <div className="desc1" style={{ minHeight: '200px' }}>
                            <h1 className='heading'>XSMT.WIN | Kết Quả Xổ Số Miền Trung Nhanh Nhất - Chính Xác Nhất</h1>
                            <p>
                                Cập nhật kết quả xổ số Miền Trung (XSMT) ngày {drawDate} lúc 17h10 trực tiếp từ trường quay các tỉnh. Xem chi tiết giải đặc biệt, lô tô, đầu đuôi và thống kê nhanh chóng tại xsmb.win. Khám phá thêm <a href="/ket-qua-xo-so-mien-bac">XSMB</a>, <a href="/ket-qua-xo-so-mien-nam">XSMN</a>, và <a href="/thong-ke-xsmt">thống kê XSMT</a> để phân tích chi tiết!
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
                <div className='container'>
                    {/* <PostList /> */}
                </div>
            </div>
        </>
    );
};

export default XSMT;