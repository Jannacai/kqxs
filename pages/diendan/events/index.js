"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import io from 'socket.io-client';
import moment from 'moment';
import 'moment-timezone';
import styles from '../../../styles/forumOptimized.module.css';
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
    FaSpinner
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
                            ? { ...item, commentCount: (item.commentCount || 0) + 1 }
                            : item
                    )
                );
            });

            newSocket.on('disconnect', () => {
                console.log('Disconnected from WebSocket');
            });

            return () => {
                newSocket.disconnect();
            };
        }
    }, [session, status, tab]);

    const fetchItems = useCallback(async () => {
        try {
            const headers = session?.accessToken
                ? { Authorization: `Bearer ${session.accessToken}`, 'Content-Type': 'application/json' }
                : { 'Content-Type': 'application/json' };

            const res = await axios.get(`${API_BASE_URL}/api/events`, {
                params: {
                    type: tab,
                    page: page,
                    limit: 10
                },
                headers
            });

            if (res.data.events) {
                setItems(res.data.events);
                setTotal(res.data.total);
                setError('');
            }
        } catch (err) {
            console.error('Error fetching items:', err.message);
            setError(err.response?.data?.message || 'Đã có lỗi khi tải dữ liệu');
        }
    }, [session?.accessToken, tab, page]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    const handleTabChange = (newTab) => {
        setTab(newTab);
        setPage(1);
        setItems([]);
    };

    const handleViewDetails = (itemId) => {
        router.push(`/diendan/events/${itemId}`);
    };

    const handleEdit = (item) => {
        setEditItem(item);
    };

    const handleDelete = async (itemId) => {
        if (!confirm('Bạn có chắc chắn muốn xóa?')) return;

        try {
            const headers = session?.accessToken
                ? { Authorization: `Bearer ${session.accessToken}`, 'Content-Type': 'application/json' }
                : { 'Content-Type': 'application/json' };

            await axios.delete(`${API_BASE_URL}/api/events/${itemId}`, { headers });
            setItems((prev) => prev.filter((item) => item._id !== itemId));
            setTotal((prev) => prev - 1);
        } catch (err) {
            console.error('Error deleting item:', err.message);
            setError(err.response?.data?.message || 'Đã có lỗi khi xóa');
        }
    };

    const isNewItem = (createdAt) => {
        const now = moment();
        const itemTime = moment(createdAt);
        return now.diff(itemTime, 'hours') < 24;
    };

    const getStatusIcon = (item) => {
        if (item.isHot) return <FaBolt className={styles.statusIcon} />;
        if (isNewItem(item.createdAt)) return <FaRocket className={styles.statusIcon} />;
        return null;
    };

    const getStatusClass = (item) => {
        if (item.isHot) return 'hot';
        if (isNewItem(item.createdAt)) return 'new';
        return '';
    };

    const formatDate = (date) => {
        return moment(date).tz('Asia/Ho_Chi_Minh').format('DD/MM/YYYY HH:mm');
    };

    const truncateText = (text, maxLength = 100) => {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    };

    if (error) {
        return (
            <div className={styles.errorContainer}>
                <div className={styles.errorMessage}>
                    <FaExclamationTriangle />
                    <span>{error}</span>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.eventCompact}>
            {/* Compact Header */}
            <div className={styles.compactHeader}>
                <div className={styles.compactTitle}>Tin Hot & Sự Kiện</div>
                <div className={styles.compactSubtitle}>Cập nhật thông tin mới nhất</div>
            </div>

            {/* Compact Content */}
            <div className={`${styles.compactContent} ${styles.compactContent.large}`}>
                {/* Tab Navigation */}
                <div className={styles.tabNavigation}>
                    <button
                        className={`${styles.tabButton} ${tab === 'event' ? styles.active : ''}`}
                        onClick={() => handleTabChange('event')}
                    >
                        <FaCalendar />
                        Sự Kiện
                    </button>
                    <button
                        className={`${styles.tabButton} ${tab === 'news' ? styles.active : ''}`}
                        onClick={() => handleTabChange('news')}
                    >
                        <FaBullhorn />
                        Tin Tức
                    </button>
                </div>

                {/* Event/News List */}
                <div className={styles.eventListCompact}>
                    {items.map((item) => (
                        <div
                            key={item._id}
                            className={`${styles.eventItemCompact} ${getStatusClass(item)}`}
                            onClick={() => handleViewDetails(item._id)}
                        >
                            <div className={styles.eventIconCompact}>
                                {getStatusIcon(item)}
                                {tab === 'event' ? <FaCalendar /> : <FaBullhorn />}
                            </div>

                            <div className={styles.eventInfoCompact}>
                                <div className={styles.eventNameCompact}>
                                    {item.title}
                                    {getStatusIcon(item)}
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
                                        {item.viewCount || 0}
                                    </span>
                                    {item.registrationCount && (
                                        <span>
                                            <FaUserPlus />
                                            {item.registrationCount}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            {session?.user?.role === 'admin' && (
                                <div className={styles.eventActionsCompact}>
                                    <button
                                        className={styles.actionButton}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleEdit(item);
                                        }}
                                    >
                                        Sửa
                                    </button>
                                    <button
                                        className={`${styles.actionButton} ${styles.deleteButton}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(item._id);
                                        }}
                                    >
                                        Xóa
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Pagination */}
                {total > 10 && (
                    <div className={styles.paginationCompact}>
                        <button
                            className={styles.paginationButton}
                            onClick={() => setPage(Math.max(1, page - 1))}
                            disabled={page === 1}
                        >
                            <FaArrowLeft />
                            Trước
                        </button>
                        <span className={styles.pageInfo}>
                            Trang {page} / {Math.ceil(total / 10)}
                        </span>
                        <button
                            className={styles.paginationButton}
                            onClick={() => setPage(page + 1)}
                            disabled={page >= Math.ceil(total / 10)}
                        >
                            Sau
                            <FaArrowRight />
                        </button>
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {editItem && (
                <EditPostModal
                    item={editItem}
                    onClose={() => setEditItem(null)}
                    onSave={fetchItems}
                />
            )}
        </div>
    );
}