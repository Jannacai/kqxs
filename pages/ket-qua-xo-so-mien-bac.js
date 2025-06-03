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

// Lazy load components
const PostList = dynamic(() => import('./post/list.js'), { ssr: false });
const ThongKe = dynamic(() => import('../component/thongKe.js'), { ssr: true });

export async function getStaticProps() {
    const now = new Date();
    const isUpdateWindow = now.getHours() === 18 && now.getMinutes() >= 10 && now.getMinutes() <= 35;
    const revalidateTime = isUpdateWindow ? 10 : 3600; // 10 giây trong khung giờ cập nhật, 1 giờ ngoài khung giờ

    try {
        const initialData = await apiMB.getLottery('xsmb', null, null);
        return {
            props: {
                initialData,
            },
            revalidate: revalidateTime,
        };
    } catch (error) {
        console.error('Lỗi khi lấy dữ liệu ban đầu:', error);
        return {
            props: {
                initialData: [],
            },
            revalidate: revalidateTime,
        };
    }
}

const XSMB = ({ initialData }) => {
    const today = new Date().toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).replace(/\//g, '/');
    const drawDate = Array.isArray(initialData) && initialData[0]?.drawDate
        ? new Date(initialData[0].drawDate).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        }).replace(/\//g, '/')
        : today;

    const title = `Kết Quả Xổ Số Miền Bắc - ${drawDate}`;
    const description = `Xem kết quả xổ số Miền Bắc ngày ${drawDate} với thông tin chi tiết về giải đặc biệt, lô tô, đầu đuôi.`;
    const canonicalUrl = 'https://www.xsmb.win/ket-qua-xo-so-mien-bac';

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
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>{title}</title>
                <meta name="description" content={description} />
                <meta name="keywords" content="xổ số miền bắc, kqxs, lô tô, đầu đuôi, xsmb" />
                <meta name="robots" content="index, follow" />

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
                <meta name="telegram:description" content={`Cập nhật XSMB nhanh nhất ngày ${drawDate} tại ${process.env.TELEGRAM_CHANNEL || '@YourChannel'} !`} />
                <meta name="telegram:og:image" content="https://xsmb.win/zalotelegram.png" />

                {/* Twitter Cards */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={title} />
                <meta name="twitter:description" content={description} />
                <meta name="twitter:image" content="https://xsmb.win/facebook.png" />
                <meta name="twitter:image:alt" content="Kết quả xổ số miền Bắc 2025" />

                {/* Canonical và Alternate */}
                <link rel="canonical" href={canonicalUrl} />
                <link rel="alternate" hrefLang="vi" href={canonicalUrl} />

                {/* JSON-LD Schema */}
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
                <div className="container">
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
                    <div>
                        <ThongKe />
                        <CongCuHot />
                    </div>
                </div>
                <div className='container'>
                    <PostList />
                </div>
            </div>
        </>
    );
};

export default XSMB;