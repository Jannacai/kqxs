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
    const title = `Kết Quả Xổ Số Miền Bắc - ${initialData[0]?.drawDate || 'Hôm Nay'}`;
    const description = `Xem kết quả xổ số Miền Bắc ngày ${initialData[0]?.drawDate || 'hôm nay'} với thông tin chi tiết về giải đặc biệt, lô tô, đầu đuôi.`;

    return (
        <>
            <Head>
                <title>{title}</title>
                <meta name="description" content={description} />
                <meta name="keywords" content="xổ số miền bắc, kqxs, lô tô, đầu đuôi" />
                <meta name="robots" content="index, follow" />
                <meta property="og:title" content={title} />
                <meta property="og:description" content={description} />
                <meta property="og:type" content="website" />
                <script type="application/ld+json">
                    {JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "Dataset",
                        "name": `Kết Quả Xổ Số Miền Bắc ${initialData[0]?.drawDate}`,
                        "description": `Kết quả xổ số Miền Bắc ngày ${initialData[0]?.drawDate} với các giải thưởng và thống kê.`,
                        "temporalCoverage": initialData[0]?.drawDate,
                        "keywords": ["xổ số", "miền bắc", "kết quả"],
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