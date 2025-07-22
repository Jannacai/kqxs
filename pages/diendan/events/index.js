'use client';

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
        } catch (err) {
            setError(err.response?.data?.message || 'Đã có lỗi khi xóa bài viết');
            alert(err.response?.data?.message || 'Đã có lỗi khi xóa bài viết');
        }
    }, [session]);

    const handleCloseModal = useCallback(() => {
        setEditItem(null);
    }, []);

    if (status === 'loading') {
        return (
            <div className={styles.loading}>
                <FaSpinner className={styles.loadingIcon} />
                Đang tải...
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>
                <FaBullhorn className={styles.titleIcon} />
                Tin Tức & Sự Kiện
            </h1>
            <div className={styles.tabContainer}>
                <button
                    className={`${styles.tab} ${tab === 'event' ? styles.active : ''}`}
                    data-tab="event"
                    onClick={() => { setTab('event'); setPage(1); }}
                >
                    <FaCalendar className={styles.tabIcon} />
                    Sự kiện
                </button>
                <button
                    className={`${styles.tab} ${tab === 'hot_news' ? styles.active : ''}`}
                    data-tab="hot_news"
                    onClick={() => { setTab('hot_news'); setPage(1); }}
                >
                    <FaBolt className={styles.tabIcon} />
                    Tin hot
                </button>
                <button
                    className={`${styles.tab} ${tab === 'discussion' ? styles.active : ''}`}
                    data-tab="discussion"
                    onClick={() => { setTab('discussion'); setPage(1); }}
                >
                    <span className={styles.tabIcon}>♻️</span>
                    Thảo luận
                </button>
                {status === 'authenticated' && tab === 'discussion' && (
                    <button
                        className={styles.postButton}
                        onClick={handlePostDiscussion}
                    >
                        Đăng bài thảo luận
                    </button>
                )}
            </div>
            <div className={styles.listContainer}>
                {error && (
                    <p className={styles.error}>
                        <FaExclamationTriangle className={styles.errorIcon} />
                        {error}
                    </p>
                )}
                {items.length === 0 ? (
                    <p>Không có bài viết nào</p>
                ) : (
                    items.map((item) => (
                        <div
                            key={item._id}
                            className={styles.item}
                        >
                            <div
                                className={styles.itemContent}
                                onClick={() => handleItemClick(item._id)}
                            >
                                <h3>
                                    <span
                                        className={styles.itemLabel}
                                        data-type={item.type}
                                    >
                                        {item.type === 'hot_news' && <span className={styles.itemLabelIcon}>                    <FaBolt className={styles.tabIcon} />
                                        </span>}
                                        {item.type === 'event' && <span className={styles.itemLabelIcon}>⚜️</span>}
                                        {item.type === 'discussion' && <span className={styles.itemLabelIcon}>♻️</span>}
                                        {item.type === 'hot_news' ? 'Tin hot' : item.type === 'event' ? 'Sự kiện' : 'Thảo luận'}
                                    </span>
                                    <span className={styles.itemTitle}>{item.title}</span>
                                </h3>
                                <p className={styles.viewCount}>
                                    <FaEye className={styles.viewCountIcon} />
                                    Số người xem: {item.viewCount || 0}
                                </p>
                                {item.type === 'event' && (
                                    <p className={styles.registrationCount}>
                                        <FaUserPlus className={styles.registrationCountIcon} />
                                        Số người tham gia: {item.registrationCount || 0}
                                    </p>
                                )}
                                <p className={styles.commentCount}>
                                    <FaRocket className={styles.commentCountIcon} />
                                    Số bình luận: {item.commentCount || 0}
                                </p>
                                <p className={styles.itemMeta}>
                                    <FaClock className={styles.itemMetaIcon} />
                                    Đăng bởi: {item.createdBy?.fullname || 'Ẩn danh'} |{' '}
                                    {moment.tz(item.createdAt, 'Asia/Ho_Chi_Minh').format('DD/MM/YYYY HH:mm:ss')}
                                </p>
                            </div>
                            {session?.user?.role === 'ADMIN' && (
                                <div className={styles.itemActions}>
                                    <button
                                        className={styles.editButton}
                                        onClick={() => handleEdit(item)}
                                    >
                                        Sửa
                                    </button>
                                    <button
                                        className={styles.deleteButton}
                                        onClick={() => handleDelete(item._id)}
                                    >
                                        Xóa
                                    </button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
            <div className={styles.pagination}>
                <button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                >
                    <FaArrowLeft className={styles.paginationIcon} />
                    Trang trước
                </button>
                <span>Trang {page}</span>
                <button
                    disabled={page * 20 >= total}
                    onClick={() => setPage(page + 1)}
                >
                    <FaArrowRight className={styles.paginationIcon} />
                    Trang sau
                </button>
            </div>
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