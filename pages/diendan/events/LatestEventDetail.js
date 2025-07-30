"use client";

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import moment from 'moment';
import 'moment-timezone';
import parse from 'html-react-parser';
import styles from '../../../styles/forumOptimized.module.css';
import { FaCalendar, FaEye, FaUserPlus, FaClock, FaArrowRight, FaExclamationTriangle } from 'react-icons/fa';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL3 || 'http://localhost:5001';

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
        <p key={`para-${index}`} className={styles.eventDescriptionCompact}>
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
        setPage(Math.max(1, page - 1));
    };

    const handleNextPage = () => {
        setPage(page + 1);
    };

    const formatDate = (date) => {
        return moment(date).tz('Asia/Ho_Chi_Minh').format('DD/MM/YYYY HH:mm');
    };

    const truncateText = (text, maxLength = 150) => {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    };

    if (isLoading) {
        return (
            <div className={styles.eventCompact}>
                <div className={styles.compactHeader}>
                    <div className={styles.compactTitle}>Sự Kiện Mới Nhất</div>
                    <div className={styles.compactSubtitle}>Đang tải...</div>
                </div>
                <div className={styles.compactContent}>
                    <div className={styles.loadingMessage}>Đang tải sự kiện...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.eventCompact}>
                <div className={styles.compactHeader}>
                    <div className={styles.compactTitle}>Sự Kiện Mới Nhất</div>
                    <div className={styles.compactSubtitle}>Có lỗi xảy ra</div>
                </div>
                <div className={styles.compactContent}>
                    <div className={styles.errorMessage}>
                        <FaExclamationTriangle />
                        <span>{error}</span>
                    </div>
                </div>
            </div>
        );
    }

    if (!item) {
        return (
            <div className={styles.eventCompact}>
                <div className={styles.compactHeader}>
                    <div className={styles.compactTitle}>Sự Kiện Mới Nhất</div>
                    <div className={styles.compactSubtitle}>Không có sự kiện nào</div>
                </div>
                <div className={styles.compactContent}>
                    <div className={styles.emptyMessage}>
                        Không có sự kiện nào cho hôm nay
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.eventCompact}>
            {/* Compact Header */}
            {/* <div className={styles.compactHeader}>
                <div className={styles.compactTitle}>Sự Kiện Mới Nhất</div>
                <div className={styles.compactSubtitle}>Sự kiện quan trọng nhất hôm nay</div>
            </div> */}

            {/* Compact Content */}
            <div className={`${styles.compactContent} ${styles.compactContent.large}`}>
                {/* Featured Event */}
                <div className={styles.featuredEventCompact}>
                    <div
                        className={styles.eventItemCompact}
                        onClick={handleViewDetails}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleViewDetails(e);
                            }
                        }}
                    >
                        <div className={styles.eventIconCompact}>
                            <FaCalendar />
                        </div>

                        <div className={styles.eventInfoCompact}>
                            <div className={styles.eventNameCompact}>
                                {item.title}
                                {item.isHot && <span className={styles.hotBadge}>HOT</span>}
                            </div>

                            <div className={styles.eventDescriptionCompact}>
                                {truncateText(item.content)}
                            </div>

                            <div className={styles.eventMetaCompact}>
                                <span>
                                    <FaClock />
                                    {formatDate(item.createdAt)}
                                </span>
                                <span>
                                    <FaEye />
                                    {item.viewCount || 0} lượt xem
                                </span>
                                {item.registrationCount && (
                                    <span>
                                        <FaUserPlus />
                                        {item.registrationCount} tham gia
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* View Details Icon */}
                        <div className={styles.viewDetailsIcon}>
                            <FaArrowRight />
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <div className={styles.eventNavigationCompact}>
                    <button
                        className={styles.navButton}
                        onClick={handlePreviousPage}
                        disabled={page === 1}
                    >
                        Sự kiện trước
                    </button>
                    <span className={styles.pageIndicator}>
                        Trang {page}
                    </span>
                    <button
                        className={styles.navButton}
                        onClick={handleNextPage}
                    >
                        Sự kiện tiếp
                    </button>
                </div>
            </div>


        </div>
    );
}