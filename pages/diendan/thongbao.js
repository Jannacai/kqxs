"use client";

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import moment from 'moment';
import 'moment-timezone';
import axios from 'axios';
import styles from '../../styles/lotteryRegistration.module.css';
import { formatDistanceToNow } from 'date-fns';
import vi from 'date-fns/locale/vi';
import Image from 'next/image';
import { FaGift } from 'react-icons/fa';
import PrivateChat from './chatrieng';
import UserInfoModal from './modals/UserInfoModal';
import { getSocket, isSocketConnected, addConnectionListener } from '../../utils/Socket';

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
    const [socketConnected, setSocketConnected] = useState(false);
    const mountedRef = useRef(true);

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

            // Kiểm tra và xử lý dữ liệu an toàn
            const allRegistrations = res.data.registrations || [];
            const registrationsData = allRegistrations.filter(r => !r.isReward && !r.isEvent);
            const rewardData = allRegistrations.filter(r => r.isReward);
            const eventData = allRegistrations.filter(r => r.isEvent);

            console.log('Filtered data:', {
                registrations: registrationsData.length,
                rewards: rewardData.length,
                events: eventData.length
            });

            setRegistrations(registrationsData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
            setRewardNotifications(rewardData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
            setEventNotifications(eventData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));

            // Nếu không có dữ liệu, thêm dữ liệu mẫu để test
            if (registrationsData.length === 0 && rewardData.length === 0 && eventData.length === 0) {
                console.log('No data received, adding sample data for testing');
                const sampleData = [
                    {
                        _id: 'sample1',
                        userId: {
                            _id: 'user1',
                            fullname: 'Nguyễn Văn A',
                            img: null
                        },
                        eventId: {
                            title: 'Sự kiện mẫu'
                        },
                        region: 'Miền Bắc',
                        numbers: {
                            bachThuLo: '12',
                            songThuLo: ['34', '56'],
                            threeCL: '789',
                            cham: '0'
                        },
                        result: {
                            isChecked: true,
                            isWin: true,
                            winningNumbers: {
                                bachThuLo: '12',
                                songThuLo: ['34'],
                                threeCL: '789'
                            },
                            matchedPrizes: ['Giải nhất', 'Giải nhì']
                        },
                        createdAt: new Date().toISOString(),
                        isReward: false,
                        isEvent: false
                    },
                    {
                        _id: 'sample2',
                        userId: {
                            _id: 'user2',
                            fullname: 'Trần Thị B',
                            img: null
                        },
                        eventId: {
                            title: 'Sự kiện thưởng'
                        },
                        pointsAwarded: 100,
                        eventTitle: 'Sự kiện thưởng',
                        createdAt: new Date().toISOString(),
                        isReward: true,
                        isEvent: false
                    },
                    {
                        _id: 'sample3',
                        userId: {
                            _id: 'user3',
                            fullname: 'Lê Văn C',
                            img: null
                        },
                        title: 'Tin tức mới',
                        type: 'event',
                        createdAt: new Date().toISOString(),
                        isReward: false,
                        isEvent: true
                    }
                ];

                const sampleRegistrations = sampleData.filter(item => !item.isReward && !item.isEvent);
                const sampleRewards = sampleData.filter(item => item.isReward);
                const sampleEvents = sampleData.filter(item => item.isEvent);

                setRegistrations(sampleRegistrations);
                setRewardNotifications(sampleRewards);
                setEventNotifications(sampleEvents);
            }

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
        console.log('Component mounted, fetching registrations...');
        fetchRegistrations();
    }, [filterType]);

    useEffect(() => {
        console.log('Initializing Socket.IO with URL:', API_BASE_URL);
        mountedRef.current = true;

        const initializeSocket = async () => {
            try {
                const socket = await getSocket();
                if (!mountedRef.current) return;

                socketRef.current = socket;
                setSocketConnected(true);

                // Thêm connection listener
                const removeListener = addConnectionListener((connected) => {
                    if (mountedRef.current) {
                        setSocketConnected(connected);
                    }
                });

                socket.on('connect', () => {
                    console.log('Socket.IO connected successfully:', socket.id);
                    socket.emit('joinLotteryFeed');
                    socket.emit('join', 'leaderboard');
                    if (session?.user?._id || session?.user?.id) {
                        socket.emit('joinPrivateRoom', session.user?._id || session.user?.id);
                    }
                    setError('');
                    setSocketConnected(true);
                });

                socket.on('connect_error', (err) => {
                    console.error('Socket.IO connection error:', err.message);
                    setSocketConnected(false);
                    setError('Mất kết nối thời gian thực. Vui lòng làm mới trang.');
                });

                socket.on('disconnect', () => {
                    console.log('Socket.IO disconnected');
                    setSocketConnected(false);
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

                socket.on('PRIVATE_MESSAGE', (newMessage) => {
                    console.log('Received PRIVATE_MESSAGE:', JSON.stringify(newMessage, null, 2));
                    setPrivateChats((prev) =>
                        prev.map((chat) =>
                            chat.receiver._id === newMessage.senderId || chat.receiver._id === newMessage.receiverId
                                ? { ...chat, messages: [...(chat.messages || []), newMessage] }
                                : chat
                        )
                    );
                });

                return () => {
                    removeListener();
                    if (socketRef.current) {
                        socketRef.current.off('connect');
                        socketRef.current.off('connect_error');
                        socketRef.current.off('disconnect');
                        socketRef.current.off('NEW_LOTTERY_REGISTRATION');
                        socketRef.current.off('LOTTERY_RESULT_CHECKED');
                        socketRef.current.off('USER_UPDATED');
                        socketRef.current.off('UPDATE_LOTTERY_REGISTRATION');
                        socketRef.current.off('USER_REWARDED');
                        socketRef.current.off('NEW_EVENT_NOTIFICATION');
                        socketRef.current.off('LOTTERY_RESULT_ERROR');
                        socketRef.current.off('PRIVATE_MESSAGE');
                    }
                };
            } catch (error) {
                console.error('Failed to initialize socket:', error);
                setSocketConnected(false);
            }
        };

        initializeSocket();

        return () => {
            mountedRef.current = false;
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
                className={`${styles.feedItem} ${item.isReward ? styles.rewardItem : item.isEvent ? styles.eventItem : styles.registrationItem}`}
                onClick={item.isEvent && eventId ? () => handleEventClick(eventId) : undefined}
                style={item.isEvent && eventId ? { cursor: 'pointer' } : {}}
            >
                {/* Item Header */}
                <div className={styles.itemHeader}>
                    <div className={styles.userSection}>
                        {item.userId?.img ? (
                            <Image
                                src={item.userId.img}
                                alt={fullname}
                                className={styles.userAvatar}
                                width={48}
                                height={48}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleShowDetails(item.userId);
                                }}
                                onError={(e) => {
                                    console.error('Failed to load avatar:', item.userId.img);
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                }}
                            />
                        ) : null}
                        <div
                            className={`${styles.avatar} ${getAvatarClass(fullname)}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleShowDetails(item.userId);
                            }}
                            style={{ display: item.userId?.img ? 'none' : 'flex' }}
                        >
                            {firstChar}
                        </div>
                        <div className={styles.userInfo}>
                            <span
                                className={styles.userName}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleShowDetails(item.userId);
                                }}
                            >
                                {fullname}
                            </span>
                            <span className={styles.itemTime}>
                                {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: vi })}
                            </span>
                        </div>
                    </div>

                    {/* Item Type Badge */}
                    <div className={styles.itemBadge}>
                        {item.isReward ? (
                            <span className={styles.rewardBadge}>
                                <FaGift className={styles.badgeIcon} />
                                Thưởng
                            </span>
                        ) : item.isEvent ? (
                            <span className={styles.eventBadge}>
                                📢 Tin mới
                            </span>
                        ) : (
                            <span className={styles.registrationBadge}>
                                🎯 Đăng ký
                            </span>
                        )}
                    </div>
                </div>

                {/* Item Content */}
                <div className={styles.itemContent}>
                    {item.isReward ? (
                        <div className={styles.rewardContent}>
                            <div className={styles.rewardMessage}>
                                <FaGift className={styles.giftIcon} />
                                <span>
                                    Đã được nhận thưởng <strong className={styles.points}>{item.pointsAwarded} điểm</strong>
                                    của sự kiện <strong>{item.eventTitle || 'Không có sự kiện'}</strong>!
                                </span>
                            </div>
                        </div>
                    ) : item.isEvent ? (
                        <div className={styles.eventContent}>
                            <div className={styles.eventMessage}>
                                <span>
                                    Tin Mới: {item.type === 'event' ? 'sự kiện' : 'tin hot'}:
                                    <strong className={styles.eventTitle}>{item.title || 'Sự kiện không xác định'}</strong>
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className={styles.registrationContent}>
                            <div className={styles.registrationDetails}>
                                <div className={styles.eventInfo}>
                                    <strong>Sự kiện:</strong> {item.eventId?.title || 'Không có sự kiện'}
                                </div>
                                <div className={styles.regionInfo}>
                                    <strong>Miền:</strong> ({item.region})
                                </div>

                                {/* Numbers Section */}
                                <div className={styles.numbersSection}>
                                    {item.numbers.bachThuLo && (
                                        <div className={styles.numberItem}>
                                            <span className={styles.numberLabel}>Bạch thủ lô:</span>
                                            <span className={styles.numberValue}>{item.numbers.bachThuLo}</span>
                                        </div>
                                    )}
                                    {item.numbers.songThuLo.length > 0 && (
                                        <div className={styles.numberItem}>
                                            <span className={styles.numberLabel}>Song thủ lô:</span>
                                            <span className={styles.numberValue}>{item.numbers.songThuLo.join(', ')}</span>
                                        </div>
                                    )}
                                    {item.numbers.threeCL && (
                                        <div className={styles.numberItem}>
                                            <span className={styles.numberLabel}>3CL:</span>
                                            <span className={styles.numberValue}>{item.numbers.threeCL}</span>
                                        </div>
                                    )}
                                    {item.numbers.cham && (
                                        <div className={styles.numberItem}>
                                            <span className={styles.numberLabel}>Chạm:</span>
                                            <span className={styles.numberValue}>{item.numbers.cham}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Result Section */}
                                {item.result && item.result.isChecked ? (
                                    item.result.isWin ? (
                                        <div className={styles.winningResult}>
                                            <div className={styles.resultHeader}>
                                                <span className={styles.resultIcon}>🎉</span>
                                                <strong>Kết quả: Trúng</strong>
                                            </div>
                                            <div className={styles.winningNumbers}>
                                                {item.result.winningNumbers.bachThuLo && (
                                                    <div className={styles.winningNumber}>
                                                        <span>Bạch thủ lô: {item.numbers.bachThuLo}</span>
                                                    </div>
                                                )}
                                                {item.result.winningNumbers.songThuLo.length > 0 && (
                                                    <div className={styles.winningNumber}>
                                                        <span>Song thủ lô: {item.result.winningNumbers.songThuLo.join(', ')}</span>
                                                    </div>
                                                )}
                                                {item.result.winningNumbers.threeCL && (
                                                    <div className={styles.winningNumber}>
                                                        <span>3CL: {item.numbers.threeCL}</span>
                                                    </div>
                                                )}
                                                {item.result.winningNumbers.cham && (
                                                    <div className={styles.winningNumber}>
                                                        <span>Chạm: {item.numbers.cham}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className={styles.prizes}>
                                                <strong>Giải trúng:</strong> {item.result.matchedPrizes.join(', ')}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className={styles.losingResult}>
                                            <div className={styles.resultHeader}>
                                                <span className={styles.resultIcon}>❌</span>
                                                <strong>Kết quả: Trượt</strong>
                                            </div>
                                        </div>
                                    )
                                ) : (
                                    <div className={styles.pendingResult}>
                                        <div className={styles.resultHeader}>
                                            <span className={styles.resultIcon}>⏳</span>
                                            <strong>Đăng ký thành công</strong>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
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

    // Debug logging
    console.log('Current state:', {
        filterType,
        registrationsCount: registrations.length,
        rewardNotificationsCount: rewardNotifications.length,
        eventNotificationsCount: eventNotifications.length,
        filteredFeedCount: filteredFeed.length,
        error
    });

    console.log('Rendering component with:', { filteredFeed, error, filterType });

    return (
        <div className={styles.container}>
            {/* Header Section */}
            <div className={styles.header}>
                <div className={styles.headerContent}>
                    <h1 className={styles.title}>
                        <span className={styles.titleIcon}>📢</span>
                        Thông Báo & Hoạt Động
                    </h1>
                    <div className={styles.stats}>
                        <span className={styles.statItem}>
                            <span className={styles.statIcon}>📊</span>
                            Tổng: {filteredFeed.length}
                        </span>
                    </div>
                </div>
            </div>

            {/* Filter Section */}
            <div className={styles.filterSection}>
                <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>Lọc theo loại thông báo:</label>
                    <select
                        value={filterType}
                        onChange={(e) => {
                            setFilterType(e.target.value);
                            setRegistrations([]);
                            setRewardNotifications([]);
                            setEventNotifications([]);
                        }}
                        className={styles.filterSelect}
                    >
                        <option value="all">Tất cả</option>
                        <option value="eventNews">Tin tức sự kiện</option>
                        <option value="reward">Nhận thưởng</option>
                        <option value="userRegistration">Đăng ký sự kiện</option>
                    </select>
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className={styles.errorContainer}>
                    <span className={styles.errorIcon}>⚠️</span>
                    <span className={styles.errorText}>{error}</span>
                </div>
            )}

            {/* Feed Content */}
            <div className={styles.feedContainer}>
                <div className={styles.feedList} ref={registrationListRef}>
                    {filteredFeed.length === 0 ? (
                        <div className={styles.emptyState}>
                            <span className={styles.emptyIcon}>📝</span>
                            <p className={styles.emptyText}>Chưa có đăng ký hoặc thông báo nào.</p>
                            <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
                                Debug: registrations={registrations.length}, rewards={rewardNotifications.length}, events={eventNotifications.length}
                            </div>
                        </div>
                    ) : (
                        <>
                            <div style={{ marginBottom: '10px', fontSize: '12px', color: '#666' }}>
                                Debug: Hiển thị {filteredFeed.length} items
                            </div>
                            {filteredFeed.map((item, index) => (
                                <div key={item._id || index}>
                                    {renderRegistration(item)}
                                </div>
                            ))}
                        </>
                    )}
                </div>
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