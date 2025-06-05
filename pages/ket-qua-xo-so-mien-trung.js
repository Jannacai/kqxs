import Head from 'next/head';
import KQXS from './xsmt/index';
import Calendar from '../component/caledar';
import ThongKe from '../component/thongKe';
import ListXSMT from '../component/listXSMT';
import ListXSMB from '../component/listXSMB';
import ListXSMN from '../component/listXSMN';
import PostList from './post/list';
import TableDate from '../component/tableDateKQXS';
import CongCuHot from '../component/CongCuHot';
import { apiMT } from './api/kqxs/kqxsMT';

export async function getStaticProps() {
    const now = new Date();
    const isUpdateWindow = now.getHours() === 14 && now.getMinutes() >= 11 && now.getMinutes() <= 34;
    const revalidateTime = isUpdateWindow ? 10 : 21600; // 10 giây trong khung giờ cập nhật, 6 giờ ngoài khung giờ

    try {
        const initialData = await apiMT.getLottery('xsmt', null, null, null, { limit: 3 });
        return {
            props: {
                initialData,
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
            },
            revalidate: revalidateTime,
        };
    }
}

const XSMT = ({ initialData }) => {
    const drawDate = initialData[0]?.drawDate || 'Hôm Nay';
    const title = `Kết Quả Xổ Số Miền Trung - ${initialData[0]?.drawDate || 'Hôm Nay'}`;
    const description = `Xem kết quả xổ số Miền Trung ngày ${initialData[0]?.drawDate || 'hôm nay'} với thông tin chi tiết về giải đặc biệt, lô tô, đầu đuôi.`;
    const canonicalUrl = 'https://www.xsmb.win/ket-qua-xo-so-mien-trung';

    return (
        <>
            <Head>
                <title>{title}</title>
                <meta name="description" content={description} />
                <meta name="keywords" content="xổ số miền trung, kqxs, lô tô, đầu đuôi, xsmt, kqxsmt" />
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
                <meta property="og:image:alt" content="Kết quả xổ số miền Trung 2025" />
                <meta property="og:site_name" content="XSMT" />
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
                <meta name="telegram:description" content={`Cập nhật XSMT nhanh nhất ngày ${drawDate} tại @YourChannel!`} />
                <meta name="telegram:og:image" content="https://xsmb.win/zalotelegram.png" />

                {/* Twitter Cards */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={title} />
                <meta name="twitter:description" content={description} />
                <meta name="twitter:image" content="https://xsmb.win/facebook.png" />
                <meta name="twitter:image:alt" content="Kết quả xổ số miền Trung 2025" />

                {/* Canonical */}
                <link rel="canonical" href={canonicalUrl} />

                {/* JSON-LD Schema */}
                <script type="application/ld+json">
                    {JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "Dataset",
                        "name": `Kết Quả Xổ Số Miền Trung ${drawDate}`,
                        "description": `Kết quả xổ số Miền Trung ngày ${drawDate} với các giải thưởng và thống kê.`,
                        "temporalCoverage": drawDate,
                        "keywords": ["xổ số", "miền trung", "kết quả", "xsmt"],
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
                        <KQXS data={initialData} station="xsmt">Miền Trung</KQXS>
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
                        <CongCuHot />
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