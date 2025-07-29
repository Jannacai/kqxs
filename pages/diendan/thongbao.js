"use client";

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import moment from 'moment';
import 'moment-timezone';
import axios from 'axios';
import io from 'socket.io-client';
import styles from '../../styles/forumOptimized.module.css';
import { formatDistanceToNow } from 'date-fns';
import vi from 'date-fns/locale/vi';
import Image from 'next/image';
import { FaGift, FaBell, FaCalendar, FaUser, FaEye, FaEnvelope, FaExclamationTriangle } from 'react-icons/fa';
import PrivateChat from './chatrieng';
import UserInfoModal from './modals/UserInfoModal';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL3 || 'http://localhost:5001';

export default function LotteryRegistrationFeed() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [registrations, setRegistrations] = useState([]);
    const [rewardNotifications, setRewardNotifications] = useState([]);
    const [eventNotifications, setEventNotifications] = useState([]);
    const [error, setError] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [selectedUser, setSelectedUser] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [privateChats, setPrivateChats] = useState([]);
    const registrationListRef = useRef(null);
    const socketRef = useRef(null);
    const [isAtBottom, setIsAtBottom] = useState(true);

    const fetchRegistrations = async () => {
        try {
            const params = { page: 1, limit: 50 };
            if (filterType !== 'all') {
                if (filterType === 'eventNews') params.isEvent = true;
                if (filterType === 'reward') params.isReward = true;
                if (filterType === 'userRegistration') {
                    params.isEvent = false;
                    params.isReward = false;
                }
            }
            console.log('Fetching registrations with params:', params);
            const headers = {
                'Content-Type': 'application/json',
                ...(session?.accessToken && { Authorization: `Bearer ${session.accessToken}` }),
            };
            // Sử dụng endpoint công khai cho người dùng chưa đăng nhập
            const endpoint = session?.accessToken
                ? `${API_BASE_URL}/api/lottery/registrations`
                : `${API_BASE_URL}/api/lottery/public-registrations`;
            const res = await axios.get(endpoint, {
                headers,
                params,
            });
            console.log('Registrations data:', res.data.registrations);
            const registrationsData = res.data.registrations.filter(r => !r.isReward && !r.isEvent);
            const rewardData = res.data.registrations.filter(r => r.isReward);
            const eventData = res.data.registrations.filter(r => r.isEvent);
            setRegistrations(registrationsData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
            setRewardNotifications(rewardData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
            setEventNotifications(eventData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
            setError('');
        } catch (err) {
            console.error('Error fetching registrations:', err.response?.data || err.message);
            setError(
                err.response?.status === 401
                    ? 'Không thể tải danh sách thông báo do thiếu quyền. Vui lòng thử lại sau.'
                    : err.response?.data?.message || 'Đã có lỗi khi lấy danh sách đăng ký. Vui lòng thử lại.'
            );
        }
    };

    const fetchEventDetails = async (eventId) => {
        try {
            const headers = {
                'Content-Type': 'application/json',
                ...(session?.accessToken && { Authorization: `Bearer ${session.accessToken}` }),
            };
            const res = await axios.get(`${API_BASE_URL}/api/lottery/events`, {
                headers,
                params: { eventId }
            });
            return res.data.events.find(e => e._id === eventId);
        } catch (err) {
            console.error('Error fetching event details:', err.response?.data || err.message);
            return null;
        }
    };

    useEffect(() => {
        fetchRegistrations();
    }, [filterType]);

    useEffect(() => {
        console.log('Initializing Socket.IO with URL:', API_BASE_URL);
        const socket = io(API_BASE_URL, {
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Socket.IO connected for notifications');
            socket.emit('joinNotificationFeed');
        });

        socket.on('NEW_REGISTRATION', (data) => {
            console.log('Received NEW_REGISTRATION:', data);
            setRegistrations(prev => [data, ...prev]);
        });

        socket.on('NEW_REWARD_NOTIFICATION', (data) => {
            console.log('Received NEW_REWARD_NOTIFICATION:', data);
            setRewardNotifications(prev => [data, ...prev]);
        });

        socket.on('NEW_EVENT_NOTIFICATION', (data) => {
            console.log('Received NEW_EVENT_NOTIFICATION:', data);
            setEventNotifications(prev => [data, ...prev]);
        });

        socket.on('disconnect', () => {
            console.log('Socket.IO disconnected');
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            if (registrationListRef.current) {
                const { scrollTop, scrollHeight, clientHeight } = registrationListRef.current;
                setIsAtBottom(scrollTop + clientHeight >= scrollHeight - 10);
            }
        };

        const listElement = registrationListRef.current;
        if (listElement) {
            listElement.addEventListener('scroll', handleScroll);
            return () => listElement.removeEventListener('scroll', handleScroll);
        }
    }, []);

    const handleShowDetails = (user) => {
        setSelectedUser(user);
        setShowModal(true);
    };

    const handleEventClick = (eventId) => {
        if (eventId) {
            router.push(`/diendan/events/${eventId}`);
        }
    };

    const openPrivateChat = (user) => {
        if (!session?.accessToken) {
            console.log('No access token, cannot open private chat');
            return;
        }

        const existingChat = privateChats.find(chat => chat.receiverId === user._id);
        if (!existingChat) {
            setPrivateChats(prev => [...prev, {
                receiverId: user._id,
                receiverName: user.fullname || 'User',
                isMinimized: false
            }]);
        }
    };

    const closePrivateChat = (receiverId) => {
        setPrivateChats(prev => prev.filter(chat => chat.receiverId !== receiverId));
    };

    const toggleMinimizePrivateChat = (receiverId) => {
        setPrivateChats(prev => prev.map(chat =>
            chat.receiverId === receiverId
                ? { ...chat, isMinimized: !chat.isMinimized }
                : chat
        ));
    };

    const getInitials = (fullname) => {
        if (!fullname) return 'U';
        const nameParts = fullname.trim().split(' ');
        return nameParts[nameParts.length - 1].charAt(0).toUpperCase();
    };

    const formatTime = (timestamp) => {
        return moment(timestamp).tz('Asia/Ho_Chi_Minh').format('DD/MM/YYYY HH:mm');
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'reward':
                return <FaGift />;
            case 'event':
                return <FaCalendar />;
            default:
                return <FaBell />;
        }
    };

    const getNotificationClass = (type) => {
        switch (type) {
            case 'reward':
                return 'reward';
            case 'event':
                return 'event';
            default:
                return '';
        }
    };

    const renderNotification = (item) => {
        const isReward = item.isReward;
        const isEvent = item.isEvent;
        const type = isReward ? 'reward' : isEvent ? 'event' : 'registration';

        return (
            <div
                key={item._id}
                className={`${styles.notificationItemCompact} ${getNotificationClass(type)}`}
            >
                <div className={styles.notificationIconCompact}>
                    {getNotificationIcon(type)}
                </div>

                <div className={styles.notificationInfoCompact}>
                    <div className={styles.notificationTextCompact}>
                        {isReward ? (
                            <span>
                                <strong>{item.user?.fullname || 'Người dùng'}</strong> đã nhận phần thưởng{' '}
                                <strong>{item.rewardName || 'không xác định'}</strong>
                            </span>
                        ) : isEvent ? (
                            <span>
                                <strong>{item.user?.fullname || 'Người dùng'}</strong> đã đăng ký sự kiện{' '}
                                <strong>{item.eventName || 'không xác định'}</strong>
                            </span>
                        ) : (
                            <span>
                                <strong>{item.user?.fullname || 'Người dùng'}</strong> đã đăng ký tham gia
                            </span>
                        )}
                    </div>
                    <div className={styles.notificationTimeCompact}>
                        {formatTime(item.createdAt)}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className={styles.notificationActionsCompact}>
                    {item.user && (
                        <button
                            className={styles.actionButtonCompact}
                            onClick={() => handleShowDetails(item.user)}
                            title="Xem chi tiết"
                        >
                            <FaEye />
                        </button>
                    )}
                    {item.user && item.user.role !== 'admin' && (
                        <button
                            className={styles.actionButtonCompact}
                            onClick={() => openPrivateChat(item.user)}
                            title="Chat riêng"
                        >
                            <FaEnvelope />
                        </button>
                    )}
                </div>
            </div>
        );
    };

    const allNotifications = [
        ...registrations.map(item => ({ ...item, type: 'registration' })),
        ...rewardNotifications.map(item => ({ ...item, type: 'reward' })),
        ...eventNotifications.map(item => ({ ...item, type: 'event' }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const filteredNotifications = filterType === 'all'
        ? allNotifications
        : allNotifications.filter(item => {
            if (filterType === 'reward') return item.isReward;
            if (filterType === 'eventNews') return item.isEvent;
            if (filterType === 'userRegistration') return !item.isReward && !item.isEvent;
            return true;
        });

    return (
        <div className={styles.notificationCompact}>
            {/* Compact Header */}
            <div className={styles.compactHeader}>
                <div className={styles.compactTitle}>Thông Báo Mới</div>
                <div className={styles.compactSubtitle}>Cập nhật hoạt động mới nhất</div>
            </div>

            {/* Compact Content */}
            <div className={`${styles.compactContent} ${styles.compactContent.large}`}>
                {/* Filter Tabs */}
                <div className={styles.tabNavigation}>
                    <button
                        className={`${styles.tabButton} ${filterType === 'all' ? styles.active : ''}`}
                        onClick={() => setFilterType('all')}
                    >
                        <FaBell />
                        Tất cả
                    </button>
                    <button
                        className={`${styles.tabButton} ${filterType === 'userRegistration' ? styles.active : ''}`}
                        onClick={() => setFilterType('userRegistration')}
                    >
                        <FaUser />
                        Đăng ký
                    </button>
                    <button
                        className={`${styles.tabButton} ${filterType === 'reward' ? styles.active : ''}`}
                        onClick={() => setFilterType('reward')}
                    >
                        <FaGift />
                        Phần thưởng
                    </button>
                    <button
                        className={`${styles.tabButton} ${filterType === 'eventNews' ? styles.active : ''}`}
                        onClick={() => setFilterType('eventNews')}
                    >
                        <FaCalendar />
                        Sự kiện
                    </button>
                </div>

                {/* Notifications List */}
                <div className={styles.notificationListCompact} ref={registrationListRef}>
                    {error && (
                        <div className={styles.errorMessage}>
                            <FaExclamationTriangle />
                            <span>{error}</span>
                        </div>
                    )}

                    {filteredNotifications.map(renderNotification)}

                    {filteredNotifications.length === 0 && (
                        <div className={styles.emptyMessage}>
                            {filterType === 'all' ? 'Không có thông báo nào' : 'Không có thông báo phù hợp'}
                        </div>
                    )}
                </div>
            </div>

            {/* Private Chats */}
            {privateChats.map(chat => (
                <PrivateChat
                    key={chat.receiverId}
                    receiverId={chat.receiverId}
                    receiverName={chat.receiverName}
                    isMinimized={chat.isMinimized}
                    onClose={() => closePrivateChat(chat.receiverId)}
                    onMinimize={() => toggleMinimizePrivateChat(chat.receiverId)}
                    session={session}
                />
            ))}

            {/* User Info Modal */}
            {showModal && selectedUser && (
                <UserInfoModal
                    user={selectedUser}
                    onClose={() => setShowModal(false)}
                    onOpenPrivateChat={() => {
                        openPrivateChat(selectedUser);
                        setShowModal(false);
                    }}
                />
            )}
        </div>
    );
}