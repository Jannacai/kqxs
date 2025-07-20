"use client";

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import moment from 'moment';
import 'moment-timezone';
import axios from 'axios';
import io from 'socket.io-client';
import styles from '../../styles/lotteryRegistration.module.css';
import { formatDistanceToNow } from 'date-fns';
import vi from 'date-fns/locale/vi';
import Image from 'next/image';
import { FaGift } from 'react-icons/fa';
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
            query: { token: session?.accessToken || '' },
            reconnectionAttempts: 5,
            reconnectionDelay: 5000,
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Socket.IO connected successfully:', socket.id);
            socket.emit('joinLotteryFeed');
            socket.emit('join', 'leaderboard');
            if (session?.user?._id || session?.user?.id) {
                socket.emit('joinPrivateRoom', session.user?._id || session.user?.id);
            }
            setError('');
        });

        socket.on('NEW_LOTTERY_REGISTRATION', async (data) => {
            console.log('Received NEW_LOTTERY_REGISTRATION:', data);
            if (filterType === 'all' || filterType === 'userRegistration') {
                let updatedData = { ...data };
                if (data.eventId && !data.eventId.title) {
                    const event = await fetchEventDetails(data.eventId._id || data.eventId);
                    if (event) {
                        updatedData.eventId = { _id: event._id, title: event.title, viewCount: event.viewCount };
                    }
                }
                setRegistrations((prevRegistrations) => {
                    if (prevRegistrations.some(r => r._id === updatedData._id)) {
                        return prevRegistrations.map(r => (r._id === updatedData._id ? updatedData : r));
                    }
                    const updatedRegistrations = [...prevRegistrations, updatedData].sort(
                        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
                    );
                    return updatedRegistrations.slice(0, 100);
                });
                if (registrationListRef.current && isAtBottom) {
                    registrationListRef.current.scrollTop = 0;
                }
            }
        });

        socket.on('LOTTERY_RESULT_CHECKED', (data) => {
            console.log('Received LOTTERY_RESULT_CHECKED:', data);
            if (filterType === 'all' || filterType === 'userRegistration') {
                setRegistrations((prevRegistrations) => {
                    if (prevRegistrations.some(r => r._id === data._id)) {
                        return prevRegistrations.map(r => (r._id === data._id ? data : r));
                    }
                    return prevRegistrations;
                });
                if (registrationListRef.current && isAtBottom) {
                    registrationListRef.current.scrollTop = 0;
                }
            }
        });

        socket.on('USER_UPDATED', (data) => {
            console.log('Received USER_UPDATED:', data);
            setRegistrations((prevRegistrations) =>
                prevRegistrations.map((r) =>
                    r.userId._id === data._id ? { ...r, userId: { ...r.userId, img: data.img, titles: data.titles, points: data.points, winCount: data.winCount, role: data.role } } : r
                )
            );
            setRewardNotifications((prevNotifications) =>
                prevNotifications.map((n) =>
                    n.userId._id === data._id ? { ...n, userId: { ...n.userId, img: data.img, titles: data.titles, points: data.points, winCount: data.winCount, role: data.role } } : n
                )
            );
            setEventNotifications((prevNotifications) =>
                prevNotifications.map((n) =>
                    n.userId._id === data._id ? { ...n, userId: { ...n.userId, img: data.img, titles: data.titles, points: data.points, winCount: data.winCount, role: data.role } } : n
                )
            );
        });

        socket.on('UPDATE_LOTTERY_REGISTRATION', (data) => {
            console.log('Received UPDATE_LOTTERY_REGISTRATION:', data);
            if (filterType === 'all' || filterType === 'userRegistration') {
                setRegistrations((prevRegistrations) =>
                    prevRegistrations.map((r) => (r._id === data._id ? data : r))
                );
                if (registrationListRef.current && isAtBottom) {
                    registrationListRef.current.scrollTop = 0;
                }
            }
        });

        socket.on('USER_REWARDED', async (data) => {
            console.log('Received USER_REWARDED:', data);
            if (filterType === 'all' || filterType === 'reward') {
                let updatedData = { ...data };
                const rewardNotification = {
                    _id: `reward_${data.userId}_${Date.now()} `,
                    userId: updatedData.userId,
                    region: data.region,
                    numbers: {},
                    result: { isChecked: true, isWin: false },
                    createdAt: new Date(data.awardedAt || Date.now()),
                    isReward: true,
                    pointsAwarded: data.pointsAwarded,
                    eventTitle: data.eventTitle,
                    eventId: data.eventId ? data.eventId : null,
                };
                setRewardNotifications((prevNotifications) => {
                    const updatedNotifications = [...prevNotifications, rewardNotification].sort(
                        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
                    );
                    return updatedNotifications.slice(0, 100);
                });
                if (registrationListRef.current && isAtBottom) {
                    registrationListRef.current.scrollTop = 0;
                }
            }
        });

        socket.on('NEW_EVENT_NOTIFICATION', async (data) => {
            console.log('Received NEW_EVENT_NOTIFICATION:', data);
            if (filterType === 'all' || filterType === 'eventNews') {
                let updatedData = { ...data };
                if (data.eventId && typeof data.eventId !== 'string') {
                    updatedData.eventId = data.eventId._id ? data.eventId._id.toString() : data.eventId;
                }
                if (!data.title && data.eventId) {
                    const event = await fetchEventDetails(data.eventId);
                    if (event) {
                        updatedData.title = event.title;
                        updatedData.eventId = event._id.toString();
                    }
                }
                setEventNotifications((prevNotifications) => {
                    const updatedNotifications = [...prevNotifications, updatedData].sort(
                        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
                    );
                    return updatedNotifications.slice(0, 100);
                });
                if (registrationListRef.current && isAtBottom) {
                    registrationListRef.current.scrollTop = 0;
                }
            }
        });

        socket.on('LOTTERY_RESULT_ERROR', (data) => {
            console.error('Received LOTTERY_RESULT_ERROR:', data);
            setError(data.message || 'Lỗi khi đối chiếu kết quả xổ số');
        });

        socket.on('connect_error', (err) => {
            console.error('Socket.IO connection error:', err.message);
            setError(
                err.message.includes('Authentication error')
                    ? 'Không thể kết nối thời gian thực do thiếu quyền. Một số thông báo có thể không cập nhật.'
                    : 'Mất kết nối thời gian thực. Vui lòng làm mới trang.'
            );
        });

        socket.on('reconnect_attempt', (attempt) => {
            console.log(`Socket.IO reconnect attempt ${attempt} `);
        });

        socket.on('reconnect', () => {
            console.log('Reconnected to Socket.IO');
            socket.emit('joinLotteryFeed');
            socket.emit('join', 'leaderboard');
            if (session?.user?._id || session?.user?.id) {
                socket.emit('joinPrivateRoom', session.user?._id || session.user?.id);
            }
        });

        socket.on('disconnect', (reason) => {
            console.log('Socket.IO disconnected:', reason);
        });

        return () => {
            console.log('Cleaning up Socket.IO connection');
            socket.disconnect();
        };
    }, [filterType, session]);

    useEffect(() => {
        const handleScroll = () => {
            if (registrationListRef.current) {
                const { scrollTop, scrollHeight, clientHeight } = registrationListRef.current;
                setIsAtBottom(scrollHeight - scrollTop - clientHeight < 100);
            }
        };
        const registrationList = registrationListRef.current;
        registrationList?.addEventListener('scroll', handleScroll);
        return () => registrationList?.removeEventListener('scroll', handleScroll);
    }, []);

    const handleShowDetails = (user) => {
        setSelectedUser(user);
        setShowModal(true);
    };

    const handleEventClick = (eventId) => {
        if (!eventId || typeof eventId !== 'string' || eventId === '[object Object]') {
            console.error('Invalid eventId for navigation:', eventId);
            setError('ID sự kiện không hợp lệ. Vui lòng thử lại.');
            return;
        }
        console.log('Navigating to event details with eventId:', eventId);
        router.push(`/diendan/events/${eventId}`);
    };

    const openPrivateChat = (user) => {
        if (!session?.user) {
            setError('Vui lòng đăng nhập để mở chat riêng');
            return;
        }
        const isCurrentUserAdmin = session.user?.role?.toLowerCase() === 'admin';
        const isTargetAdmin = user.role?.toLowerCase() === 'admin';
        if (!isCurrentUserAdmin && !isTargetAdmin) {
            setError('Bạn chỉ có thể chat riêng với admin');
            return;
        }
        setPrivateChats((prev) => {
            if (prev.some((chat) => chat.receiver._id === user._id)) {
                return prev.map((chat) =>
                    chat.receiver._id === user._id ? { ...chat, isMinimized: false } : chat
                );
            }
            return [...prev, { receiver: user, isMinimized: false }];
        });
    };

    const closePrivateChat = (receiverId) => {
        setPrivateChats((prev) => prev.filter((chat) => chat.receiver._id !== receiverId));
    };

    const toggleMinimizePrivateChat = (receiverId) => {
        setPrivateChats((prev) =>
            prev.map((chat) =>
                chat.receiver._id === receiverId ? { ...chat, isMinimized: !chat.isMinimized } : chat
            )
        );
    };

    const getAvatarClass = (fullname) => {
        const firstChar = fullname ? fullname[0]?.toLowerCase() : 'a';
        const avatarColors = {
            a: styles.avatarA, b: styles.avatarB, c: styles.avatarC, d: styles.avatarD,
            e: styles.avatarE, f: styles.avatarF, g: styles.avatarG, h: styles.avatarH,
            i: styles.avatarI, j: styles.avatarJ, k: styles.avatarK, l: styles.avatarL,
            m: styles.avatarM, n: styles.avatarN, o: styles.avatarO, p: styles.avatarP,
            q: styles.avatarQ, r: styles.avatarR, s: styles.avatarS, t: styles.avatarT,
            u: styles.avatarU, v: styles.avatarV, w: styles.avatarW, x: styles.avatarX,
            y: styles.avatarY, z: styles.avatarZ,
        };
        return avatarColors[firstChar] || avatarColors.a;
    };

    const renderRegistration = (item) => {
        const fullname = item.userId?.fullname || 'Người dùng ẩn danh';
        const firstChar = fullname[0]?.toUpperCase() || '?';
        const titles = item.userId?.titles || [];
        const eventId = item.isEvent && item.eventId ? (typeof item.eventId === 'string' ? item.eventId : item.eventId._id?.toString()) : null;

        console.log('Rendering item for user:', {
            userId: item.userId?._id,
            fullname,
            img: item.userId?.img,
            titles,
            isEvent: item.isEvent,
            eventId
        });

        return (
            <div
                key={item._id}
                className={`${styles.commentItem} ${item.isReward ? styles.rewardNotification : item.isEvent ? styles.eventNotification : styles.registrationNotification} `}
                onClick={item.isEvent && eventId ? () => handleEventClick(eventId) : undefined}
                style={item.isEvent && eventId ? { cursor: 'pointer' } : {}}
            >
                <div className={styles.commentHeader}>
                    {item.userId?.img ? (
                        <Image
                            src={item.userId.img}
                            alt={fullname}
                            className={styles.avatarImage}
                            width={40}
                            height={40}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleShowDetails(item.userId);
                            }}
                            style={{ cursor: 'pointer' }}
                            onError={(e) => {
                                console.error('Failed to load avatar:', item.userId.img);
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                            }}
                        />
                    ) : null}
                    <div className={styles.group}>
                        <div
                            className={`${styles.avatar} ${getAvatarClass(fullname)} `}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleShowDetails(item.userId);
                            }}
                            style={{ cursor: 'pointer', display: item.userId?.img ? 'none' : 'flex' }}
                        >
                            {firstChar}
                        </div>
                        <div className={styles.commentInfo}>
                            <span
                                className={styles.commentUsername}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleShowDetails(item.userId);
                                }}
                                style={{ cursor: 'pointer' }}
                            >
                                {fullname}
                            </span>
                            <span className={styles.date}>
                                {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: vi })}
                            </span>
                        </div>
                    </div>
                </div>
                <p className={styles.commentContent}>
                    {item.isReward ? (
                        <span className={styles.rewardPoints}>
                            <FaGift className={styles.giftIcon} />
                            Đã được nhận thưởng <strong className={styles.points}>{item.pointsAwarded} điểm</strong> của sự kiện <strong>{item.eventTitle || 'Không có sự kiện'}</strong>!
                        </span>
                    ) : item.isEvent ? (
                        <span>
                            Tin Mới: {item.type === 'event' ? 'sự kiện' : 'tin hot'}: <strong className={styles.titleStatus}>{item.title || 'Sự kiện không xác định'}</strong>
                        </span>
                    ) : (
                        <>
                            Đã đăng ký tham gia Sự Kiện: <strong>{item.eventId?.title || 'Không có sự kiện'}</strong> Miền: ({item.region})
                            <br />
                            {item.numbers.bachThuLo && `Bạch thủ lô: ${item.numbers.bachThuLo} | `}
                            {item.numbers.songThuLo.length > 0 && `Song thủ lô: ${item.numbers.songThuLo.join(', ')} | `}
                            {item.numbers.threeCL && `3CL: ${item.numbers.threeCL} `}
                            {item.numbers.cham && `Chạm: ${item.numbers.cham} `}
                            {item.result && item.result.isChecked ? (
                                item.result.isWin ? (
                                    <span className={styles.winningResult}>
                                        <strong>Kết quả: Trúng</strong><br />
                                        {item.result.winningNumbers.bachThuLo && `Bạch thủ lô: ${item.numbers.bachThuLo} `}<br />
                                        {item.result.winningNumbers.songThuLo.length > 0 && `Song thủ lô: ${item.result.winningNumbers.songThuLo.join(', ')} `}<br />
                                        {item.result.winningNumbers.threeCL && `3CL: ${item.numbers.threeCL} `}<br />
                                        {item.result.winningNumbers.cham && `Chạm: ${item.numbers.cham} `}<br />
                                        <strong>Giải trúng:</strong> {item.result.matchedPrizes.join(', ')}
                                    </span>
                                ) : (
                                    <span className={styles.losingResult}>
                                        <strong>Kết quả: Trượt</strong>
                                    </span>
                                )
                            ) : (
                                <span>
                                    <br />
                                    <strong className={styles.status}>Đăng ký thành công</strong>
                                </span>
                            )}
                        </>
                    )}
                </p>
            </div>
        );
    };

    const filteredFeed = filterType === 'all'
        ? [...registrations, ...rewardNotifications, ...eventNotifications].sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        ).slice(0, 50)
        : filterType === 'eventNews'
            ? eventNotifications.slice(0, 50)
            : filterType === 'reward'
                ? rewardNotifications.slice(0, 50)
                : registrations.slice(0, 50);

    return (
        <div className={styles.container}>
            {error && <p className={styles.error}>{error}</p>}
            <div className={styles.formGroup}>
                <label className={styles.formLabel}>Lọc theo loại thông báo</label>
                <select
                    value={filterType}
                    onChange={(e) => {
                        setFilterType(e.target.value);
                        setRegistrations([]);
                        setRewardNotifications([]);
                        setEventNotifications([]);
                    }}
                    className={styles.input}
                >
                    <option value="all">Tất cả</option>
                    <option value="eventNews">Tin tức sự kiện</option>
                    <option value="reward">Nhận thưởng</option>
                    <option value="userRegistration">Đăng ký sự kiện</option>
                </select>
            </div>
            <div className={styles.commentList} ref={registrationListRef}>
                {filteredFeed.length === 0 ? (
                    <p className={styles.noComments}>Chưa có đăng ký hoặc thông báo nào.</p>
                ) : (
                    filteredFeed.map((item) => renderRegistration(item))
                )}
            </div>
            {showModal && selectedUser && (
                <UserInfoModal
                    selectedUser={selectedUser}
                    setSelectedUser={setSelectedUser}
                    setShowModal={setShowModal}
                    openPrivateChat={openPrivateChat}
                    getAvatarClass={getAvatarClass}
                    accessToken={session?.accessToken}
                />
            )}
            <div className={styles.privateChatsContainer}>
                {privateChats.map((chat, index) => (
                    <PrivateChat
                        key={chat.receiver._id}
                        receiver={chat.receiver}
                        onClose={() => closePrivateChat(chat.receiver._id)}
                        isMinimized={chat.isMinimized}
                        onToggleMinimize={() => toggleMinimizePrivateChat(chat.receiver._id)}
                        style={{ right: `${20 + index * 320} px` }}
                    />
                ))}
            </div>
        </div>
    );
}