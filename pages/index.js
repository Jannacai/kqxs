import Head from 'next/head';
import dynamic from 'next/dynamic';
import Calendar from '../component/caledar';
import ThongKe from '../component/thongKe';
import ListXSMT from '../component/listXSMT';
import ListXSMB from '../component/listXSMB';
import ListXSMN from '../component/listXSMN';
import PostList from './post/list';
import TableDate from '../component/tableDateKQXS';
const KQXS = dynamic(() => import('./kqxsAll/index'), { ssr: false });

export default function Home() {
    const today = new Date();
    const drawDate = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;

    const title = `XSMB - Kết Quả Xổ Số Miền Bắc - KQXSMB Hôm Nay ${drawDate}`;
    const description = `Xem kết quả xổ số Miền Bắc ngày ${drawDate} nhanh nhất, chính xác với thông tin giải đặc biệt, lô tô, đầu đuôi, thống kê đa dạng, tạo dàn 2D, 3D, 4D, dàn ngẫu nhiên 9x0x đặc biệt.`;
    const canonicalUrl = 'https://xsmb.win';

    return (
        <div>
            <Head>
                <title>{title}</title>
                <meta name="description" content={description} />
                <meta
                    name="keywords"
                    content="xổ số miền bắc, kqxs, lô tô, đầu đuôi, xsmb, xsmt, xsmn, xosomb, xosomt, xosomn, taodan, thống kê xổ số miền bắc, xổ số hôm nay, kết quả xổ số trực tiếp, dự đoán xsmb, xsmb hôm nay, kết quả xổ số miền bắc hôm nay, lô đề, xổ số miền bắc trực tiếp, thống kê lô đề, soi cầu xsmb, xsmb 2025"
                />
                <meta name="robots" content="index, follow" />
                <link rel="alternate" hrefLang="vi" href={canonicalUrl} />

                {/* Open Graph Tags */}
                <meta property="og:title" content={title} />
                <meta property="og:description" content={description} />
                <meta property="og:type" content="website" />
                <meta property="og:url" content={canonicalUrl} />
                <meta property="og:image" content="https://xsmb.win/facebook.png" />
                <meta property="og:image:width" content="1200" />
                <meta property="og:image:height" content="630" />
                <meta property="og:image:secure_url" content="https://xsmb.win/facebook.png" />
                <meta property="og:image:type" content="image/png" />
                <meta property="og:image:alt" content="Kết quả xổ số miền Bắc 2025" />
                <meta property="og:site_name" content="XSMB" />
                <meta property="og:locale" content="vi_VN" />
                <meta property="fb:app_id" content="your-facebook-app-id" />

                {/* Zalo */}
                <meta property="og:app_id" content="your-zalo-app-id" />
                <meta property="zalo:official_account_id" content="your-zalo-oa-id" />
                <meta property="zalo:share_url" content={canonicalUrl} />
                <meta property="zalo:og:image" content="https://xsmb.win/zalotelegram.png" />
                <meta property="zalo:og:image:width" content="600" />
                <meta property="zalo:og:image:height" content="600" />

                {/* Telegram */}
                <meta name="telegram:channel" content="@YourChannel" />
                <meta name="telegram:share_url" content={canonicalUrl} />
                <meta name="telegram:description" content={`Cập nhật XSMB nhanh nhất ngày ${drawDate} tại @YourChannel!`} />
                <meta name="telegram:og:image" content="https://xsmb.win/zalotelegram.png" />

                {/* Twitter Cards */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={title} />
                <meta name="twitter:description" content={description} />
                <meta name="twitter:image" content="https://xsmb.win/facebook.png" />
                <meta name="twitter:image:alt" content="Kết quả xổ số miền Bắc 2025" />

                {/* Canonical */}
                <link rel="canonical" href={canonicalUrl} />

                {/* JSON-LD Schema */}
                <script type="application/ld+json">
                    {JSON.stringify([
                        {
                            "@context": "https://schema.org",
                            "@type": "Dataset",
                            "name": `Kết Quả Xổ Số Miền Bắc ${drawDate}`,
                            "description": `Kết quả xổ số Miền Bắc ngày ${drawDate} với các giải thưởng và thống kê.`,
                            "temporalCoverage": drawDate,
                            "keywords": ["xổ số", "miền bắc", "kết quả", "xsmb", "lô tô", "đầu đuôi", "soi cầu xsmb"],
                            "url": canonicalUrl,
                        },
                        {
                            "@context": "https://schema.org",
                            "@type": "Organization",
                            "name": "XSMB",
                            "url": "https://xsmb.win",
                            "logo": "https://xsmb.win/logo.png",
                            "sameAs": [
                                "https://zalo.me/your-zalo-oa-link",
                                "https://t.me/YourChannel"
                            ]
                        },
                        {
                            "@context": "https://schema.org",
                            "@type": "WebSite",
                            "name": "XSMB",
                            "url": "https://xsmb.win",
                            "potentialAction": {
                                "@type": "SearchAction",
                                "target": "https://xsmb.win/search?q={search_term_string}",
                                "query-input": "required name=search_term_string"
                            }
                        }
                    ])}
                </script>
            </Head>
            <div className='container'>
                <div className='navigation'>
                    <Calendar />
                    <ListXSMB />
                    <ListXSMT />
                    <ListXSMN />
                </div>
                <div>
                    <TableDate />
                    <KQXS>{"Miền Bắc"}</KQXS>
                </div>
                <ThongKe />
            </div>
            <div className='container'>
                <PostList />
            </div>
        </div>
    );
}