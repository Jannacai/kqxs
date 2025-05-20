import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../../../styles/taodan2D.module.css';
import TaoDan2DLogic from './Dan2D';
import TaoDan2DContent from './TaoDan2DContent';
import ThongKe from '../../../component/thongKe';

// Component Share Buttons
const ShareButtons = ({ url, title }) => {
    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);

    const shareLinks = {
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedTitle}`,
        telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
        zalo: `https://chat.zalo.me/?chat_target=share&url=${encodedUrl}&desc=${encodedTitle}`,
        instagram: "#", // Sao chép link cho Instagram
    };

    const handleInstagramShare = () => {
        navigator.clipboard.writeText(url).then(() => {
            alert('Link đã được sao chép! Bạn có thể dán vào Instagram Story hoặc Bio.');
        }).catch(err => {
            console.error('Failed to copy link:', err);
            alert('Không thể sao chép link. Vui lòng sao chép thủ công.');
        });
    };

    return (
        <div className={styles.shareButtons}>
            <h3 className={styles.shareTitle}>Chia sẻ công cụ này:</h3>
            <div className={styles.buttonGroup}>
                <a
                    href={shareLinks.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${styles.shareButton} ${styles.facebookButton}`}
                >
                    Facebook
                </a>
                <a
                    href={shareLinks.telegram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${styles.shareButton} ${styles.telegramButton}`}
                >
                    Telegram
                </a>
                <a
                    href={shareLinks.zalo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${styles.shareButton} ${styles.zaloButton}`}
                >
                    Zalo
                </a>
                <button
                    onClick={handleInstagramShare}
                    className={`${styles.shareButton} ${styles.instagramButton}`}
                >
                    Instagram
                </button>
            </div>
        </div>
    );
};

const TaoDan2DPage = () => {
    // URL và tiêu đề của trang (thay bằng URL thực tế)
    const pageUrl = "https://yourwebsite.com/tao-dan-2d";
    const pageTitle = "Tạo Dàn Đề 2D - Chuẩn Xác, Nhanh Chóng | Xổ Số 3 Miền";

    return (
        <div className='container'>
            <div className={styles.container}>
                <Head>
                    {/* Thẻ meta cơ bản cho SEO */}
                    <title>{pageTitle}</title>
                    <meta
                        name="description"
                        content="Tạo dàn đề 2D chuẩn xác, nhanh chóng với công cụ tự động tại Xổ Số 3 Miền. Hướng dẫn chi tiết cách tạo dàn đề 2D hiệu quả cho người chơi."
                    />
                    <meta
                        name="keywords"
                        content="tạo dàn đề, dàn đề 2D, công cụ tạo dàn đề, tạo dàn đề tự động, Xổ Số 3 Miền"
                    />
                    <meta name="robots" content="index, follow" />
                    <meta name="author" content="Xổ Số 3 Miền" />
                    <meta charSet="UTF-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

                    {/* Thẻ OpenGraph cho mạng xã hội (Facebook, Instagram, Zalo, Telegram) */}
                    <meta property="og:title" content={pageTitle} />
                    <meta
                        property="og:description"
                        content="Tạo dàn đề 2D chuẩn xác, nhanh chóng với công cụ tự động tại Xổ Số 3 Miền. Hướng dẫn chi tiết cách tạo dàn đề 2D hiệu quả cho người chơi."
                    />
                    <meta property="og:type" content="website" />
                    <meta property="og:url" content={pageUrl} />
                    <meta
                        property="og:image"
                        content="https://th.bing.com/th/id/R.3d5deab0dc13ba833e705f4a6f33b8af?rik=FNI7nW%2bvaJ%2bWeQ&riu=http%3a%2f%2f1.bp.blogspot.com%2f-6XD0keDBlFs%2fU2fvF3R2fWI%2fAAAAAAAAAS8%2fvfp6yri28eE%2fs1600%2fCircular%2bLogo%2bHiRes.jpg&ehk=NF58LzLFVX7F04YLKNKfd8ieJQNT7r1B%2bfq%2b8FoYXf0%3d&risl=&pid=ImgRaw&r=0" // Thay bằng URL hình ảnh thực tế
                    />
                    <meta property="og:image:width" content="1200" />
                    <meta property="og:image:height" content="630" />
                    <meta property="og:site_name" content="Xổ Số 3 Miền" />
                    <meta
                        property="og:image:alt"
                        content="Công cụ tạo dàn đề 2D tại Xổ Số 3 Miền"
                    />

                    {/* Thẻ Twitter Card (cho Twitter/X) */}
                    <meta name="twitter:card" content="summary_large_image" />
                    <meta name="twitter:title" content={pageTitle} />
                    <meta
                        name="twitter:description"
                        content="Tạo dàn đề 2D chuẩn xác, nhanh chóng với công cụ tự động tại Xổ Số 3 Miền. Hướng dẫn chi tiết cách tạo dàn đề 2D hiệu quả cho người chơi."
                    />
                    <meta
                        name="twitter:image"
                        content="https://th.bing.com/th/id/R.3d5deab0dc13ba833e705f4a6f33b8af?rik=FNI7nW%2bvaJ%2bWeQ&riu=http%3a%2f%2f1.bp.blogspot.com%2f-6XD0keDBlFs%2fU2fvF3R2fWI%2fAAAAAAAAAS8%2fvfp6yri28eE%2fs1600%2fCircular%2bLogo%2bHiRes.jpg&ehk=NF58LzLFVX7F04YLKNKfd8ieJQNT7r1B%2bfq%2b8FoYXf0%3d&risl=&pid=ImgRaw&r=0" // Thay bằng URL hình ảnh thực tế
                    />
                    <meta
                        name="twitter:image:alt"
                        content="Công cụ tạo dàn đề 2D tại Xổ Số 3 Miền"
                    />
                    <meta name="twitter:site" content="@yourtwitterhandle" />
                </Head>
                <h1 className={styles.title}>Tạo Dàn Đề 2D - Nhanh Nhất</h1>
                <Link className={styles.action} href="3D4D/">Tạo Dàn 3D/4D</Link>
                <TaoDan2DLogic />
                <ShareButtons url={pageUrl} title={pageTitle} />
                <TaoDan2DContent />
            </div>
            <ThongKe />
        </div>
    );
};

export default TaoDan2DPage;