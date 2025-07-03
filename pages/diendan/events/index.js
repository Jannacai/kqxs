"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import io from 'socket.io-client';
import moment from 'moment';
import 'moment-timezone';
import styles from '../../../styles/eventHotNews.module.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
const SOCKET_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export default function EventHotNews() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [tab, setTab] = useState('hot_news'); // Mặc định là Tin hot
    const [items, setItems] = useState([]);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        if (status === 'authenticated') {
            const newSocket = io(SOCKET_URL, {
                query: { token: session.accessToken }
            });
            setSocket(newSocket);

            newSocket.on('connect', () => {
                newSocket.emit('joinEventFeed');
                newSocket.emit('join', { room: 'lotteryFeed' }); // Tham gia kênh lotteryFeed
            });

            newSocket.on('NEW_EVENT', (data) => {
                if (data.type === tab) {
                    setItems((prev) => [data, ...prev].slice(0, 5));
                }
            });

            newSocket.on('NEW_LOTTERY_REGISTRATION', (data) => {
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

            return () => {
                newSocket.disconnect();
            };
        }
    }, [status, session, tab]);

    useEffect(() => {
        fetchItems();
    }, [tab, page]);

    const fetchItems = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/events`, {
                params: { type: tab, page, limit: 5 },
                headers: { Authorization: `Bearer ${session?.accessToken}` }
            });
            setItems(res.data.events);
            setTotal(res.data.total);
            setError('');
        } catch (err) {
            setError(err.response?.data?.message || 'Đã có lỗi khi lấy danh sách');
        }
    };

    const handleItemClick = (id) => {
        router.push(`/diendan/events/${id}`);
    };

    if (status === 'loading') return <div className={styles.loading}>Đang tải...</div>;

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Tin hot & Sự kiện</h1>
            <div className={styles.tabContainer}>
                <button
                    className={`${styles.tab} ${tab === 'hot_news' ? styles.active : ''}`}
                    onClick={() => { setTab('hot_news'); setPage(1); }}
                >
                    Tin hot
                </button>
                <button
                    className={`${styles.tab} ${tab === 'event' ? styles.active : ''}`}
                    onClick={() => { setTab('event'); setPage(1); }}
                >
                    Sự kiện
                </button>
            </div>
            <div className={styles.listContainer}>
                {error && <p className={styles.error}>{error}</p>}
                {items.length === 0 ? (
                    <p>Không có bài viết nào</p>
                ) : (
                    items.map((item) => (
                        <div
                            key={item._id}
                            className={styles.item}
                            onClick={() => handleItemClick(item._id)}
                        >
                            <h3>
                                <span className={styles.itemLabel} data-type={item.type}>
                                    {item.type === 'hot_news' ? 'Tin hot' : 'Sự kiện'}
                                </span>
                                <span className={styles.itemTitle}>{item.title}</span>
                            </h3>
                            <p className={styles.viewCount}>
                                Số người xem: {item.viewCount || 0}
                            </p>
                            {item.type === 'event' && (
                                <p className={styles.registrationCount}>
                                    Số người tham gia: {item.registrationCount || 0}
                                </p>
                            )}
                            <p className={styles.itemMeta}>
                                Đăng bởi: {item.createdBy?.fullname || 'Ẩn danh'} |{' '}
                                {moment.tz(item.createdAt, 'Asia/Ho_Chi_Minh').format('DD/MM/YYYY HH:mm:ss')}
                            </p>
                        </div>
                    ))
                )}
                <div className={styles.pagination}>
                    <button
                        disabled={page === 1}
                        onClick={() => setPage(page - 1)}
                    >
                        Trang trước
                    </button>
                    <span>Trang {page}</span>
                    <button
                        disabled={page * 5 >= total}
                        onClick={() => setPage(page + 1)}
                    >
                        Trang sau
                    </button>
                </div>
            </div>
        </div>
    );
}