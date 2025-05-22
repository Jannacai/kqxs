import Head from 'next/head';
import KQXS from '../pages/kqxsAll/index';
import Calendar from '../component/caledar';
import ThongKe from '../component/thongKe';
import ListXSMT from '../component/listXSMT';
import ListXSMB from '../component/listXSMB';
import ListXSMN from '../component/listXSMN';
import PostList from './post/list';
import TableDate from '../component/tableDateKQXS';
import { apiMB } from '../pages/api/kqxs/kqxsMB';

export async function getStaticProps() {
    try {
        const initialData = await apiMB.getLottery('xsmb', null, null);
        return {
            props: {
                initialData,
            },
            revalidate: 60,
        };
    } catch (error) {
        console.error('Lỗi khi lấy dữ liệu ban đầu:', error);
        return {
            props: {
                initialData: [],
            },
            revalidate: 60,
        };
    }
}

const XSMN = ({ initialData }) => {
    const drawDate = initialData[0]?.drawDate || 'Hôm Nay';
    const title = `Kết Quả Xổ Số Miền Bắc - ${initialData[0]?.drawDate || 'Hôm Nay'}`;
    const description = `Xem kết quả xổ số Miền Bắc ngày ${initialData[0]?.drawDate || 'hôm nay'} với thông tin chi tiết về giải đặc biệt, lô tô, đầu đuôi.`;
    const canonicalUrl = 'https://xsmb.win/xsmb';

    return (
        <>
            <Head>
                <title>{title}</title>
                <meta name="description" content={description} />
                <meta name="keywords" content="xổ số miền bắc, kqxs, lô tô, đầu đuôi, xsmb" />
                <meta name="robots" content="index, follow" />

                {/* Open Graph Tags (Tối ưu cho các mạng xã hội) */}
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
                <meta property="fb:app_id" content="your-facebook-app-id" /> {/* Thay bằng App ID thực tế */}

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
                <meta name="twitter:image:alt" content="Kết quả xổ số miền Bắc 2025" /> {/* Sửa lỗi */}

                {/* Canonical */}
                <link rel="canonical" href={canonicalUrl} />

                {/* JSON-LD Schema (Sửa lỗi) */}
                <script type="application/ld+json">
                    {JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "Dataset",
                        "name": `Kết Quả Xổ Số Miền Bắc ${drawDate}`,
                        "description": `Kết quả xổ số Miền Bắc ngày ${drawDate} với các giải thưởng và thống kê.`,
                        "temporalCoverage": drawDate,
                        "keywords": ["xổ số", "miền bắc", "kết quả", "xsmb"],
                        "url": canonicalUrl,
                    })}
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
                        <KQXS data={initialData} station="xsmb">Miền Bắc</KQXS>
                    </div>
                    <ThongKe />
                </div>
                <div className='container'>
                    <PostList />
                </div>
            </div>
        </>
    );
};

export default XSMN;