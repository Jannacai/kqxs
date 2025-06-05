import Head from 'next/head';
import dynamic from 'next/dynamic';
import KQXS from './xsmn/xosomn';
import Calendar from '../component/caledar';
import ListXSMT from '../component/listXSMT';
import ListXSMB from '../component/listXSMB';
import ListXSMN from '../component/listXSMN';
import TableDate from '../component/tableDateKQXS';
import CongCuHot from '../component/CongCuHot';
import { apiMN } from './api/kqxs/kqxsMN';
import styles from '../public/css/kqxsMB.module.css';
import Skeleton from 'react-loading-skeleton';

// Lazy load components
const PostList = dynamic(() => import('./post/list.js'), { ssr: false });
const ThongKe = dynamic(() => import('../component/thongKe.js'), { ssr: true });
const DynamicCalendar = dynamic(() => import('../component/caledar'), { ssr: false });
const DynamicListXSMB = dynamic(() => import('../component/listXSMB'), { ssr: false });
const DynamicListXSMT = dynamic(() => import('../component/listXSMT'), { ssr: false });
const DynamicListXSMN = dynamic(() => import('../component/listXSMN'), { ssr: false });
const DynamicCongCuHot = dynamic(() => import('../component/CongCuHot'), { ssr: false });

export async function getStaticProps() {
    const now = new Date();
    const isUpdateWindow = now.getHours() === 12 && now.getMinutes() >= 15 && now.getMinutes() <= 38;
    const revalidateTime = isUpdateWindow ? 10 : 21600; // 10 giây trong khung giờ cập nhật, 6 giờ ngoài khung giờ

    try {
        const initialData = await apiMN.getLottery('xsmn', null, null, null, { limit: 3 });
        return {
            props: { initialData },
            revalidate: revalidateTime,
        };
    } catch (error) {
        console.error('Lỗi khi lấy dữ liệu ban đầu:', {
            message: error.message,
            stack: error.stack,
        });
        return {
            props: { initialData: [] },
            revalidate: revalidateTime,
        };
    }
}

const XSMN = ({ initialData }) => {
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

    const title = `Kết Quả Xổ Số Miền Nam - ${drawDate}`;
    const description = `Xem kết quả xổ số Miền Nam ngày ${drawDate} với thông tin chi tiết về giải đặc biệt, lô tô, đầu đuôi.`;
    const canonicalUrl = 'https://www.xsmb.win/ket-qua-xo-so-mien-nam';

    if (!Array.isArray(initialData) || initialData.length === 0) {
        return (
            <div className={styles.container}>
                <Skeleton count={10} height={30} />
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
                <meta name="keywords" content="xổ số miền nam, kqxs, lô tô, đầu đuôi, xsmn, xosomn, kqxsmn" />
                <meta name="robots" content="index, follow" />

                <meta property="og:title" content={title} />
                <meta property="og:description" content={description} />
                <meta property="og:type" content="website" />
                <meta property="og:url" content={canonicalUrl} />
                <meta property="og:image" content="https://xsmb.win/facebook.png" />
                <meta property="og:image:width" content="1200" />
                <meta property="og:image:height" content="630" />
                <meta property="og:image:secure_url" content="https://xsmb.win/facebook.png" />
                <meta property="og:image:type" content="image/png" />
                <meta property="og:image:alt" content="Kết quả xổ số miền Nam 2025" />
                <meta property="og:site_name" content="XSMN" />
                <meta property="og:locale" content="vi_VN" />
                <meta property="fb:app_id" content={process.env.FB_APP_ID || ''} />

                <meta property="og:app_id" content={process.env.ZALO_APP_ID || ''} />
                <meta property="zalo:official_account_id" content={process.env.ZALO_OA_ID || ''} />
                <meta property="zalo:share_url" content={canonicalUrl} />
                <meta property="zalo:og:image" content="https://xsmb.win/zalotelegram.png" />
                <meta property="zalo:og:image:width" content="600" />
                <meta property="zalo:og:image:height" content="600" />

                <meta name="telegram:channel" content={process.env.TELEGRAM_CHANNEL || '@YourChannel'} />
                <meta name="telegram:share_url" content={canonicalUrl} />
                <meta name="telegram:description" content={`Cập nhật XSMN nhanh nhất ngày ${drawDate} tại ${process.env.TELEGRAM_CHANNEL || '@YourChannel'}!`} />
                <meta name="telegram:og:image" content="https://xsmb.win/zalotelegram.png" />

                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={title} />
                <meta name="twitter:description" content={description} />
                <meta name="twitter:image" content="https://xsmb.win/facebook.png" />
                <meta name="twitter:image:alt" content="Kết quả xổ số miền Nam 2025" />

                <link rel="canonical" href={canonicalUrl} />
                <link rel="alternate" hrefLang="vi" href={canonicalUrl} />

                <script type="application/ld+json">
                    {JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "Dataset",
                        "name": `Kết Quả Xổ Số Miền Nam ${drawDate}`,
                        "description": `Kết quả xổ số Miền Nam ngày ${drawDate} với các giải thưởng và thống kê.`,
                        "temporalCoverage": drawDate,
                        "keywords": ["xổ số", "miền nam", "kết quả", "xsmn"],
                        "url": canonicalUrl,
                        "publisher": {
                            "@type": "Organization",
                            "name": "XSMN",
                            "url": "https://www.xsmb.win",
                        },
                    })}
                </script>
            </Head>
            <div>
                <div className="container">
                    <div className='navigation'>
                        <DynamicCalendar />
                        <DynamicListXSMB />
                        <DynamicListXSMT />
                        <DynamicListXSMN />
                    </div>
                    <div>
                        <TableDate />
                        {initialData ? (
                            <KQXS data={initialData} station="xsmn">Miền Nam</KQXS>
                        ) : (
                            <span>Đang tải kết quả...</span>
                        )}
                        <div className="desc1">
                            <h1 className='heading'>XSMB.WIN | Trang Kết Quả Xổ Số Miền Bắc Nhanh Nhất - Chính Xác Nhất - XSMB</h1>
                            <p>
                                Kết quả xổ số Miền Bắc được cập nhật hàng ngày, bao gồm giải đặc biệt, lô tô và thống kê chi tiết. Xem thêm kết quả
                                Xổ Số VN chuyên cập nhật kết quả XSMB tất cả các ngày trong tuần nhanh chóng, chính xác nhất. Lô thủ, người xem,… có thể truy cập vào web xsmb.win để theo dõi KQXSMB miễn phí.<a href="/ket-qua-xo-so-mien-trung">XSMT</a> và <a href="/ket-qua-xo-so-mien-nam">XSMN</a> để so sánh!
                            </p>
                            <br></br> <p className='note'>Chú ý: Mọi hành vi liên quan đến vi phạm pháp luật chúng tôi KHÔNG khuyến khích và KHÔNG chịu trách nhiệm.</p>
                        </div>
                    </div>
                    <div>
                        <ThongKe />
                        <DynamicCongCuHot />
                    </div>
                </div>
                <div className='container'>
                    {/* <PostList /> */}
                </div>
            </div>
        </>
    );
};

export default XSMN;