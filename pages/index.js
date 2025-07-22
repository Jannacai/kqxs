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
const PostList = dynamic(() => import('./tin-tuc/list'), { ssr: false });
const Chat = dynamic(() => import('./chat/chat'), { ssr: false });

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
                <meta property="og:image" content="/XSMB.png" />
                <meta property="og:image:width" content="1200" />
                <meta property="og:image:height" content="630" />
                <meta property="og:image:alt" content="Kết quả xổ số miền Bắc 2025" />
                <meta property="og:site_name" content="XSMB" />
                <meta property="og:locale" content="vi_VN" />

                {/* JSON-LD Schema */}
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            '@context': 'https://schema.org',
                            '@graph': [
                                {
                                    '@type': 'Dataset',
                                    name: `Kết Quả Xổ Số Miền Bắc ${drawDate}`,
                                    description: `Kết quả xổ số Miền Bắc ngày ${drawDate} với các giải thưởng và thống kê.`,
                                    temporalCoverage: drawDate,
                                    keywords: ['xổ số', 'miền bắc', 'kết quả', 'xsmb', 'lô tô', 'đầu đuôi', 'soi cầu xsmb'],
                                    url: canonicalUrl,
                                },
                                {
                                    '@type': 'Organization',
                                    name: 'XSMB',
                                    url: 'https://xsmb.win',
                                    logo: '/logo.png',
                                    sameAs: ['https://zalo.me/your-zalo-oa-link', 'https://t.me/YourChannel'],
                                    license: 'https://creativecommons.org/licenses/by/4.0/',
                                },
                                {
                                    '@type': 'WebSite',
                                    name: 'XSMB',
                                    url: 'https://xsmb.win',
                                    potentialAction: {
                                        '@type': 'SearchAction',
                                        target: 'https://xsmb.win/search?q={search_term_string}',
                                        'query-input': 'required name=search_term_string',
                                    },
                                },
                            ],
                        }),
                    }}
                />
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
                        <h1 className="heading">XSMB.WIN | Trang Kết Quả Xổ Số Miền Bắc Nhanh Nhất - Chính Xác Nhất - XSMB</h1>
                        <p>
                            Kết quả xổ số Miền Bắc được cập nhật hàng ngày, bao gồm giải đặc biệt, lô tô và thống kê chi tiết. Xem thêm kết quả
                            Xổ Số VN chuyên cập nhật kết quả XSMB tất cả các ngày trong tuần nhanh chóng, chính xác nhất. Lô thủ, người xem,… có thể truy cập vào web xsmb.win để theo dõi KQXSMB miễn phí.
                            <a href="/ket-qua-xo-so-mien-trung">XSMT</a> và <a href="/ket-qua-xo-so-mien-nam">XSMN</a> để so sánh!
                        </p>
                        <br />
                        <p className="note">Chú ý: Mọi hành vi liên quan đến vi phạm pháp luật chúng tôi KHÔNG khuyến khích và KHÔNG chịu trách nhiệm.</p>
                    </div>
                </div>
                <div>
                    <div>
                        <ThongKe />
                        {/* <Chat /> */}
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