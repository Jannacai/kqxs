"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import io from 'socket.io-client';
import moment from 'moment';
import 'moment-timezone';
import styles from '../../../styles/eventHotNews.module.css';
import EditPostModal from '../../../component/EditPostModal';
import {
    FaBullhorn,
    FaCalendar,
    FaBolt,
    FaEye,
    FaUserPlus,
    FaRocket,
    FaClock,
    FaExclamationTriangle,
    FaArrowLeft,
    FaArrowRight,
    FaSpinner,
    FaEdit,
    FaTrash,
    FaPlus
} from 'react-icons/fa';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL3 || 'http://localhost:5001';
const SOCKET_URL = process.env.NEXT_PUBLIC_BACKEND_URL3 || 'http://localhost:5001';

export default function EventHotNews() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [tab, setTab] = useState('event');
    const [items, setItems] = useState([]);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [socket, setSocket] = useState(null);
    const [editItem, setEditItem] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (status === 'authenticated') {
            const newSocket = io(SOCKET_URL, {
                query: { token: session.accessToken },
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000
            });
            setSocket(newSocket);

            newSocket.on('connect', () => {
                console.log(`Connected to WebSocket: ${newSocket.id} `);
                newSocket.emit('joinEventFeed');
                newSocket.emit('join', { room: 'lotteryFeed' });
            });

            newSocket.on('NEW_EVENT', (data) => {
                console.log('Received NEW_EVENT:', data);
                if (data.type === tab) {
                    setItems((prev) => {
                        const updatedItems = [data, ...prev.filter(item => item._id !== data._id)];
                        return updatedItems.slice(0, 20);
                    });
                }
            });

            newSocket.on('NEW_LOTTERY_REGISTRATION', (data) => {
                console.log('Received NEW_LOTTERY_REGISTRATION:', data);
                if (data.data.eventId) {
                    setItems((prev) =>
                        prev.map((item) =>
                            item._id.toString() === data.data.eventId.toString()
                                ? { ...item, registrationCount: (item.registrationCount || 0) + 1 }
                                : item
                        )
                    );
                }
            });

            newSocket.on('EVENT_UPDATED', (data) => {
                console.log('Received EVENT_UPDATED:', data);
                if (data.type === tab) {
                    setItems((prev) =>
                        prev.map((item) =>
                            item._id.toString() === data._id.toString() ? { ...item, ...data } : item
                        )
                    );
                }
            });

            newSocket.on('EVENT_DELETED', (data) => {
                console.log('Received EVENT_DELETED:', data);
                if (data.type === tab) {
                    setItems((prev) => prev.filter((item) => item._id.toString() !== data.eventId));
                    setTotal((prev) => prev - 1);
                }
            });

            newSocket.on('NEW_COMMENT', (data) => {
                console.log('Received NEW_COMMENT:', data);
                setItems((prev) =>
                    prev.map((item) =>
                        item._id.toString() === data.eventId.toString()
                            ? { ...item, commentCount: data.commentCount }
                            : item
                    )
                );
            });

            newSocket.on('COMMENT_DELETED', (data) => {
                console.log('Received COMMENT_DELETED:', data);
                setItems((prev) =>
                    prev.map((item) =>
                        item._id.toString() === data.eventId.toString()
                            ? { ...item, commentCount: data.commentCount }
                            : item
                    )
                );
            });

            newSocket.on('NEW_REPLY', (data) => {
                console.log('Received NEW_REPLY:', data);
                setItems((prev) =>
                    prev.map((item) =>
                        item._id.toString() === data.eventId.toString()
                            ? { ...item, commentCount: data.commentCount }
                            : item
                    )
                );
            });

            newSocket.on('REPLY_DELETED', (data) => {
                console.log('Received REPLY_DELETED:', data);
                setItems((prev) =>
                    prev.map((item) =>
                        item._id.toString() === data.eventId.toString()
                            ? { ...item, commentCount: data.commentCount }
                            : item
                    )
                );
            });

            newSocket.on('connect_error', (error) => {
                console.error('WebSocket connection error:', error.message);
            });

            newSocket.on('disconnect', () => {
                console.log('WebSocket disconnected');
            });

            return () => {
                newSocket.disconnect();
                console.log('WebSocket cleanup');
            };
        }
    }, [status, session, tab]);

    useEffect(() => {
        fetchItems();
    }, [tab, page]);



    const fetchItems = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/api/events`, {
                params: { type: tab, page, limit: 20 },
                headers: { Authorization: `Bearer ${session?.accessToken} ` }
            });
            setItems(res.data.events);
            setTotal(res.data.total);
            setError('');
        } catch (err) {
            setError(err.response?.data?.message || 'Đã có lỗi khi lấy danh sách');
            console.error('Error fetching items:', err.message);
        } finally {
            setIsLoading(false);
        }
    }, [tab, page, session]);

    const handleItemClick = useCallback((id) => {
        router.push(`/diendan/events/${id} `);
    }, [router]);

    const handlePostDiscussion = useCallback(() => {
        router.push('/diendan/postthaoluan');
    }, [router]);

    const handleEdit = useCallback((item) => {
        setEditItem(item);
    }, []);

    const handleDelete = useCallback(async (id) => {
        if (!confirm('Bạn có chắc muốn xóa bài viết này?')) return;
        try {
            await axios.delete(`${API_BASE_URL}/api/events/${id} `, {
                headers: { Authorization: `Bearer ${session?.accessToken} ` }
            });
            setError('');
            fetchItems(); // Refresh the list
        } catch (err) {
            setError(err.response?.data?.message || 'Đã có lỗi khi xóa bài viết');
            alert(err.response?.data?.message || 'Đã có lỗi khi xóa bài viết');
        }
    }, [session, fetchItems]);

    const handleCloseModal = useCallback(() => {
        setEditItem(null);
    }, []);

    // Kiểm tra xem item có được đăng trong ngày hiện tại không
    const isNewItem = (createdAt) => {
        const today = moment.tz('Asia/Ho_Chi_Minh').startOf('day');
        const itemDate = moment.tz(createdAt, 'Asia/Ho_Chi_Minh').startOf('day');
        return today.isSame(itemDate);
    };

    if (status === 'loading') {
        return (
            <div className={styles.loadingContainer}>
                <FaSpinner className={styles.loadingIcon} />
                <span>Đang tải...</span>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Header Section */}
            <div className={styles.header}>
                <div className={styles.headerContent}>
                    <h1 className={styles.title}>
                        <FaBullhorn className={styles.titleIcon} />
                        Tin Tức & Sự Kiện
                    </h1>
                    <div className={styles.stats}>
                        <span className={styles.statItem}>
                            <span className={styles.statIcon}>📊</span>
                            Tổng: {total}
                        </span>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className={styles.tabContainer}>
                <div className={styles.tabGroup}>
                    <button
                        className={`${styles.tab} ${tab === 'event' ? styles.active : ''}`}
                        onClick={() => { setTab('event'); setPage(1); }}
                    >
                        <FaCalendar className={styles.tabIcon} />
                        Sự kiện VIP
                    </button>
                    <button
                        className={`${styles.tab} ${tab === 'hot_news' ? styles.active : ''}`}
                        onClick={() => { setTab('hot_news'); setPage(1); }}
                    >
                        <FaBolt className={styles.tabIcon} />
                        Tin hot
                    </button>
                    <button
                        className={`${styles.tab} ${tab === 'discussion' ? styles.active : ''}`}
                        onClick={() => { setTab('discussion'); setPage(1); }}
                    >
                        <span className={styles.tabIcon}>♻️</span>
                        Thảo luận
                    </button>
                </div>

                {status === 'authenticated' && tab === 'discussion' && (
                    <button
                        className={styles.postButton}
                        onClick={handlePostDiscussion}
                    >
                        <FaPlus className={styles.postButtonIcon} />
                        Đăng bài thảo luận
                    </button>
                )}
            </div>

            {/* Content Section */}
            <div className={styles.content}>
                {error && (
                    <div className={styles.errorMessage}>
                        <FaExclamationTriangle className={styles.errorIcon} />
                        <span>{error}</span>
                    </div>
                )}

                {isLoading && (
                    <div className={styles.loadingMessage}>
                        <FaSpinner className={styles.loadingIcon} />
                        <span>Đang tải dữ liệu...</span>
                    </div>
                )}

                {!isLoading && items.length === 0 && (
                    <div className={styles.emptyState}>
                        <span className={styles.emptyIcon}>📝</span>
                        <p>Không có bài viết nào</p>
                    </div>
                )}

                {!isLoading && items.length > 0 && (
                    <div className={styles.itemsList}>
                        {items.map((item) => (
                            <div key={item._id} className={styles.item}>
                                <div
                                    className={styles.itemContent}
                                    onClick={() => handleItemClick(item._id)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            handleItemClick(item._id);
                                        }
                                    }}
                                >
                                    <div className={styles.itemHeader}>
                                        <div className={styles.itemLabels}>
                                            <span
                                                className={styles.itemLabel}
                                                data-label={item.label}
                                            >
                                                {item.label}
                                            </span>
                                            {isNewItem(item.createdAt) && (
                                                <span className={styles.newLabel}>HOT NEW</span>
                                            )}
                                        </div>
                                        <h3 className={styles.itemTitle}>{item.title}</h3>
                                    </div>

                                    <div className={styles.itemStats}>
                                        <div className={styles.statGroup}>
                                            <FaEye className={styles.statIcon} />
                                            <span className={styles.statValue}>{item.viewCount || 0}</span>
                                            <span className={styles.statLabel}>lượt xem</span>
                                        </div>

                                        {item.type === 'event' && (
                                            <div className={styles.statGroup}>
                                                <FaUserPlus className={styles.statIcon} />
                                                <span className={styles.statValue}>{item.registrationCount || 0}</span>
                                                <span className={styles.statLabel}>tham gia</span>
                                            </div>
                                        )}

                                        <div className={styles.statGroup}>
                                            <FaRocket className={styles.statIcon} />
                                            <span className={styles.statValue}>{item.commentCount || 0}</span>
                                            <span className={styles.statLabel}>bình luận</span>
                                        </div>
                                    </div>

                                    <div className={styles.itemMeta}>
                                        <div className={styles.metaInfo}>
                                            <FaClock className={styles.metaIcon} />
                                            <span className={styles.metaText}>
                                                Đăng bởi: {item.createdBy?.fullname || 'Ẩn danh'}
                                            </span>
                                        </div>
                                        <div className={styles.metaInfo}>
                                            <span className={styles.metaDate}>
                                                {moment.tz(item.createdAt, 'Asia/Ho_Chi_Minh').format('DD/MM/YYYY HH:mm:ss')}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.itemActions}>
                                    {session?.user?.role === 'ADMIN' && (
                                        <>
                                            <button
                                                className={`${styles.actionButton} ${styles.editButton}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEdit(item);
                                                }}
                                            >
                                                <FaEdit className={styles.actionIcon} />
                                                Sửa
                                            </button>
                                            <button
                                                className={`${styles.actionButton} ${styles.deleteButton}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(item._id);
                                                }}
                                            >
                                                <FaTrash className={styles.actionIcon} />
                                                Xóa
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Pagination */}
            {total > 20 && (
                <div className={styles.pagination}>
                    <button
                        className={styles.paginationButton}
                        disabled={page === 1}
                        onClick={() => setPage(page - 1)}
                    >
                        <FaArrowLeft className={styles.paginationIcon} />
                        Trang trước
                    </button>
                    <span className={styles.pageInfo}>Trang {page}</span>
                    <button
                        className={styles.paginationButton}
                        disabled={page * 20 >= total}
                        onClick={() => setPage(page + 1)}
                    >
                        Trang sau
                        <FaArrowRight className={styles.paginationIcon} />
                    </button>
                </div>
            )}

            {/* Edit Modal */}
            {editItem && (
                <EditPostModal
                    item={editItem}
                    onClose={handleCloseModal}
                    onSuccess={() => fetchItems()}
                />
            )}


        </div>
    );
}