"use client";

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import moment from 'moment';
import 'moment-timezone';
import parse from 'html-react-parser';
import styles from '../../../styles/latestEventDetail.module.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

const renderTextContent = (text) => {
    if (!text) return null;

    // Kiểm tra xem text có chứa thẻ HTML hay không
    const hasHTML = /<([A-Za-z][A-Za-z0-9]*)\b[^>]*>(.*?)</.test(text);

    if (hasHTML) {
        // Nếu text chứa HTML, render trực tiếp bằng html-react-parser
        return <>{parse(text)}</>;
    }

    // Nếu không chứa HTML, xử lý như văn bản thuần
    const paragraphs = text.split(/\n\s*\n|\n/).filter(p => p.trim());
    return paragraphs.map((paragraph, index) => (
        <p key={`para-${index}`} className={styles.itemContent}>
            {paragraph}
        </p>
    ));
};

export default function LatestEventDetail() {
    const { data: session } = useSession();
    const router = useRouter();
    const [item, setItem] = useState(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [page, setPage] = useState(1);
    const modalRef = useRef(null);

    useEffect(() => {
        const fetchEventByPage = async () => {
            try {
                const todayStart = moment().tz('Asia/Ho_Chi_Minh').startOf('day').toDate();
                const todayEnd = moment().tz('Asia/Ho_Chi_Minh').endOf('day').toDate();
                const res = await axios.get(`${API_BASE_URL}/api/events`, {
                    params: {
                        type: 'event',
                        page: page,
                        limit: 1,
                        startDate: todayStart.toISOString(),
                        endDate: todayEnd.toISOString()
                    },
                    headers: session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}
                });
                if (res.data.events && res.data.events.length > 0) {
                    setItem(res.data.events[0]);
                    setError('');
                } else {
                    setError(`Không tìm thấy sự kiện nào cho trang ${page}`);
                }
            } catch (err) {
                console.error('Error fetching event for page:', err.message, err.response?.data);
                setError(err.response?.data?.message || `Đã có lỗi khi lấy chi tiết sự kiện cho trang ${page}`);
            } finally {
                setIsLoading(false);
            }
        };
        fetchEventByPage();
    }, [session, page]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                setShowModal(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleViewDetails = (e) => {
        e.stopPropagation();
        if (item?._id) {
            router.push(`/diendan/events/${item._id}`);
        }
    };

    const handleOpenModal = (e) => {
        e.stopPropagation();
        setShowModal(true);
    };

    const handleCloseModal = (e) => {
        e.stopPropagation();
        setShowModal(false);
    };

    const handlePreviousPage = () => {
        if (page > 1) {
            setPage(page - 1);
            setIsLoading(true);
            setShowModal(false);
        }
    };

    const handleNextPage = () => {
        setPage(page + 1);
        setIsLoading(true);
        setShowModal(false);
    };

    if (isLoading) {
        return <div className={styles.loading}>Đang tải...</div>;
    }

    if (error && !item) {
        return (
            <div className={styles.container}>
                <p className={styles.error}>{error}</p>
                <div className={styles.pagination}>
                    {page > 1 && (
                        <button
                            className={styles.pageButton}
                            onClick={handlePreviousPage}
                        >
                            Trang trước
                        </button>
                    )}
                    <span className={styles.pageInfo}>Trang {page}</span>
                    <button
                        className={styles.pageButton}
                        onClick={handleNextPage}
                    >
                        Trang sau
                    </button>
                </div>
            </div>
        );
    }

    if (!item) {
        return (
            <div className={styles.container}>
                <p className={styles.error}>Không tìm thấy sự kiện nào trong ngày hôm nay</p>
                <div className={styles.pagination}>
                    {page > 1 && (
                        <button
                            className={styles.pageButton}
                            onClick={handlePreviousPage}
                        >
                            Trang trước
                        </button>
                    )}
                    <span className={styles.pageInfo}>Trang {page}</span>
                    <button
                        className={styles.pageButton}
                        onClick={handleNextPage}
                    >
                        Trang sau
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className={styles.container} onClick={handleOpenModal}>
                <h1 className={styles.title}>Sự kiện mới nhất hôm nay</h1>
                <div className={styles.groupTitle}>
                    <h2 className={styles.itemTitle} onClick={handleOpenModal}>🔥{item.title}</h2>
                    <div>
                        {item.startTime && (
                            <p className={styles.itemMeta}>
                                <i className="fa-solid fa-clock"></i> Thời gian bắt đầu: {moment.tz(item.startTime, 'Asia/Ho_Chi_Minh').format('DD/MM/YYYY HH:mm:ss')}
                            </p>
                        )}
                        {item.endTime && (
                            <p className={styles.itemMeta}>
                                <i className="fa-solid fa-clock"></i> Thời gian kết thúc: {moment.tz(item.endTime, 'Asia/Ho_Chi_Minh').format('DD/MM/YYYY HH:mm:ss')}
                            </p>
                        )}
                    </div>
                </div>
                <div className={styles.contentWrapper1}>
                    <div className={styles.itemMeta2}>
                        <strong className={styles.h3}><i className="fa-solid fa-fire"></i> Thể lệ cuộc thi:</strong><br />
                        {renderTextContent(item.content)}
                    </div>
                </div>
                {item.rewards && (
                    <div className={styles.contentWrapper1}>
                        <div className={styles.itemMeta1}>
                            <strong className={styles.h32}>🏆Phần Thưởng:</strong><br />
                            {renderTextContent(item.rewards)}
                        </div>
                    </div>
                )}
                <button
                    className={styles.viewDetailsButton}
                    onClick={handleViewDetails}
                >
                    👉Tham Gia Ngay
                </button>
                {showModal && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modal} ref={modalRef}>
                            <h2 className={styles.modalTitle}>{item.title}</h2>
                            <div className={styles.contentWrapper}>
                                <div className={styles.modalContent}>
                                    {renderTextContent(item.content)}
                                </div>
                            </div>
                            {item.startTime && (
                                <div className={styles.modalMeta}>
                                    <strong>Thời gian bắt đầu:</strong> {moment.tz(item.startTime, 'Asia/Ho_Chi_Minh').format('DD/MM/YYYY HH:mm:ss')}
                                </div>
                            )}
                            {item.endTime && (
                                <div className={styles.modalMeta}>
                                    <strong>Thời gian kết thúc:</strong> {moment.tz(item.endTime, 'Asia/Ho_Chi_Minh').format('DD/MM/YYYY HH:mm:ss')}
                                </div>
                            )}
                            {item.rules && (
                                <div className={styles.contentWrapper}>
                                    <div className={styles.modalMeta}>
                                        <strong>Quy định:</strong>
                                        {renderTextContent(item.rules)}
                                    </div>
                                </div>
                            )}
                            {item.rewards && (
                                <div className={styles.contentWrapper}>
                                    <div className={styles.modalMeta}>
                                        <strong>Phần thưởng:</strong>
                                        {renderTextContent(item.rewards)}
                                    </div>
                                </div>
                            )}
                            {item.scoringMethod && (
                                <div className={styles.contentWrapper}>
                                    <div className={styles.modalMeta}>
                                        <strong>Cách tính điểm:</strong>
                                        {renderTextContent(item.scoringMethod)}
                                    </div>
                                </div>
                            )}
                            {item.notes && (
                                <div className={styles.contentWrapper}>
                                    <div className={styles.modalMeta}>
                                        <strong>Ghi chú:</strong>
                                        {renderTextContent(item.notes)}
                                    </div>
                                </div>
                            )}
                            <button
                                className={styles.closeButton}
                                onClick={handleCloseModal}
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                )}
            </div>
            <div className={styles.pagination}>
                {page > 1 && (
                    <button
                        className={styles.pageButton}
                        onClick={handlePreviousPage}
                    >
                        Trang trước
                    </button>
                )}
                <span className={styles.pageInfo}>Trang {page}</span>
                <button
                    className={styles.pageButton}
                    onClick={handleNextPage}
                >
                    Trang sau
                </button>
            </div>
        </div>
    );
}