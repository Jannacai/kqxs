import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import ThongKe from '../../../component/thongKe';
import Dan3D from './Dan3D';
import Dan4D from './Dan4D';
import styles from '../../../styles/taodan3D4D.module.css';
import Link from 'next/link';

const TaoDanDac3D4D = () => {
    const [selectedDan, setSelectedDan] = useState('3D');
    const [isExpanded, setIsExpanded] = useState(false);
    const [showScrollTop, setShowScrollTop] = useState(false);

    const toggleContent = () => {
        setIsExpanded(!isExpanded);
    };

    const getTitle = () => {
        return `Tạo Dàn 3D/4D - Công Cụ Tối Ưu Xổ Số`;
    };

    const getDescription = () => {
        return `Tạo dàn số 3D (000-999) hoặc 4D (0000-9999) với công cụ tối ưu từ Xổ Số 3 Miền. Hỗ trợ người chơi lựa chọn dàn số hiệu quả nhất.`;
    };

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 300);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className='container'>
            
                <Head>
                    <title>{getTitle()}</title>
                    <meta name="description" content={getDescription()} />
                    <meta property="og:title" content={getTitle()} />
                    <meta property="og:description" content={getDescription()} />
                    <meta property="og:type" content="website" />
                <meta property="og:url" content="https://xsmb.win/tao-dan-3d-4d" />
                <meta property="og:image" content="https://xsmb.win/images/tao-dan-3d-4d.jpg" />
                <link rel="canonical" href="https://xsmb.win/tao-dan-3d-4d" />
                </Head>
                <script type="application/ld+json">
                    {JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "Article",
                        "headline": "Tạo Dàn 3D/4D - Công Cụ Tối Ưu Xổ Số",
                        "description": "Tạo dàn số 3D (000-999) hoặc 4D (0000-9999) với công cụ tối ưu từ Xổ Số 3 Miền. Hỗ trợ người chơi lựa chọn dàn số hiệu quả nhất.",
                        "publisher": {
                            "@type": "Organization",
                            "name": "Xổ Số 3 Miền",
                            "url": "https://xsmb.win"
                        },
                        "mainEntityOfPage": {
                            "@type": "WebPage",
                            "@id": "https://xsmb.win/tao-dan-3d-4d"
                        },
                        "datePublished": "2025-05-12",
                        "dateModified": "2025-05-12"
                    })}
                </script>
                <article className={styles.container}>
                    <h1 className={styles.title}>{getTitle()}</h1>
                    <div className={styles.buttonGroup} style={{ marginBottom: '20px', justifyContent: 'center' }}>
                        <Link href="/TaoDanD/2D/"
                            className={`${styles.filterButton} ${selectedDan === '2D' ? styles.active : ''}`}
                        >
                            Tạo Dàn 2D
                        </Link>
                        <button
                            onClick={() => setSelectedDan('3D')}
                            className={`${styles.filterButton} ${selectedDan === '3D' ? styles.active : ''}`}
                        >
                            Tạo Dàn 3D
                        </button>
                        <button
                            onClick={() => setSelectedDan('4D')}
                            className={`${styles.filterButton} ${selectedDan === '4D' ? styles.active : ''}`}
                        >
                            Tạo Dàn 4D
                        </button>
                    </div>
                    {selectedDan === '3D' ? <Dan3D /> : <Dan4D />}
                    <section className={styles.contentSection}>
                        <h2 className={styles.title}>Tạo Dàn 3D/4D - Hướng Dẫn Và Lợi Ích</h2>
                        <div className={`${styles.contentSectionInner} ${isExpanded ? styles.expanded : styles.collapsed}`}>
                            <h3>Tạo Dàn 3D/4D Là Gì?</h3>
                            <p>
                                Tạo dàn 3D/4D là công cụ giúp người chơi xổ số tạo ra danh sách số từ 000-999 (3D) hoặc 0000-9999 (4D) dựa trên các số đã chọn. Công cụ này phân loại số thành các mức (levels) để hỗ trợ tối ưu hóa lựa chọn.
                            </p>
                            <h3>Cách Sử Dụng:</h3>
                            <p>- Nhập các số vào ô text (ví dụ: 123, 1234).</p>
                            <p>- Công cụ sẽ tự động tạo dàn số và phân loại theo tần suất xuất hiện.</p>
                            <h3>Lợi Ích:</h3>
                            <p>- Tiết kiệm thời gian khi tạo dàn số lớn.</p>
                            <p>- Hỗ trợ phân tích tần suất để chọn số may mắn.</p>
                            <p>
                                Tận dụng công cụ miễn phí này tại <a href="/">Xổ Số 3 Miền</a> để tăng cơ hội trúng thưởng!
                            </p>
                        </div>
                        <button
                            className={styles.toggleContentButton}
                            onClick={toggleContent}
                        >
                            {isExpanded ? 'Thu gọn' : 'Xem thêm'}
                        </button>
                    </section>
                    {showScrollTop && (
                        <button onClick={scrollToTop} className={styles.scrollTopButton}>↑</button>
                    )}
                </article>
            <ThongKe />
        </div>
    );
};

export default TaoDanDac3D4D;