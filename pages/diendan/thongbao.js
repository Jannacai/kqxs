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

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export default function LotteryRegistrationFeed() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [registrations, setRegistrations] = useState([]);
    const [rewardNotifications, setRewardNotifications] = useState([]);
    const [eventNotifications, setEventNotifications] = useState([]);
    const [error, setError] = useState('');
    const [region, setRegion] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const modalRef = useRef(null);
    const registrationListRef = useRef(null);
    const socketRef = useRef(null);
    const [isAtBottom, setIsAtBottom] = useState(true);

    const fetchRegistrations = async () => {
        if (status !== 'authenticated' || !session?.accessToken) {
            setError('Vui lòng đăng nhập để xem thông báo.');
            router.push('/login?error=SessionRequired');
            return;
        }

        try {
            const params = { region, page: 1, limit: 20 };
            console.log('Fetching registrations with params:', params);
            const headers = {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.accessToken}`,
            };
            const res = await axios.get(`${API_BASE_URL}/api/lottery/registrations`, {
                headers,
                params,
            });
            console.log('Registrations data:', res.data.registrations);
            // Phân loại dữ liệu
            const registrationsData = res.data.registrations.filter(r => !r.isReward && !r.isEvent);
            const rewardData = res.data.registrations.filter(r => r.isReward);
            const eventData = res.data.registrations.filter(r => r.isEvent);
            setRegistrations(registrationsData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
            setRewardNotifications(rewardData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
            setEventNotifications(eventData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
            setError('');
        } catch (err) {
            console.error('Error fetching registrations:', err.response?.data || err.message);
            if (err.response?.status === 401) {
                setError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
                signOut({ redirect: false });
                router.push('/login?error=SessionExpired');
            } else {
                setError(err.response?.data?.message || 'Đã có lỗi khi lấy danh sách đăng ký');
            }
        }
    };

    useEffect(() => {
        if (status === 'loading') return;
        if (status === 'unauthenticated') {
            setError('Vui lòng đăng nhập để xem thông báo.');
            router.push('/login?error=SessionRequired');
            return;
        }
        fetchRegistrations();
    }, [status, region]);

    useEffect(() => {
        if (status !== 'authenticated' || !session?.accessToken) return;

        console.log('Initializing Socket.IO with URL:', API_BASE_URL);
        const socket = io(API_BASE_URL, {
            query: { token: session.accessToken },
            reconnectionAttempts: 5,
            reconnectionDelay: 5000,
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Socket.IO connected successfully:', socket.id);
            socket.emit('joinLotteryFeed');
            socket.emit('join', 'leaderboard');
            setError('');
        });

        socket.on('NEW_LOTTERY_REGISTRATION', (data) => {
            console.log('Received NEW_LOTTERY_REGISTRATION:', data);
            setRegistrations((prevRegistrations) => {
                if (region && data.region !== region) return prevRegistrations;
                if (prevRegistrations.some(r => r._id === data._id)) {
                    return prevRegistrations.map(r => (r._id === data._id ? data : r));
                }
                const updatedRegistrations = [data, ...prevRegistrations].sort(
                    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
                );
                return updatedRegistrations.slice(0, 50);
            });
            if (isAtBottom && registrationListRef.current) {
                registrationListRef.current.scrollTop = registrationListRef.current.scrollHeight;
            }
        });

        socket.on('LOTTERY_RESULT_CHECKED', (data) => {
            console.log('Received LOTTERY_RESULT_CHECKED:', data);
            setRegistrations((prevRegistrations) => {
                if (region && data.region !== region) return prevRegistrations;
                if (prevRegistrations.some(r => r._id === data._id)) {
                    return prevRegistrations.map(r => (r._id === data._id ? data : r));
                }
                return prevRegistrations;
            });
            if (isAtBottom && registrationListRef.current) {
                registrationListRef.current.scrollTop = registrationListRef.current.scrollHeight;
            }
        });

        socket.on('USER_UPDATED', (data) => {
            console.log('Received USER_UPDATED:', data);
            setRegistrations((prevRegistrations) =>
                prevRegistrations.map((r) =>
                    r.userId._id === data._id ? { ...r, userId: { ...r.userId, img: data.img, titles: data.titles, points: data.points, winCount: data.winCount } } : r
                )
            );
            setRewardNotifications((prevNotifications) =>
                prevNotifications.map((n) =>
                    n.userId._id === data._id ? { ...n, userId: { ...n.userId, img: data.img, titles: data.titles, points: data.points, winCount: data.winCount } } : n
                )
            );
            setEventNotifications((prevNotifications) =>
                prevNotifications.map((n) =>
                    n.userId._id === data._id ? { ...n, userId: { ...n.userId, img: data.img, titles: data.titles, points: data.points, winCount: data.winCount } } : n
                )
            );
        });

        socket.on('UPDATE_LOTTERY_REGISTRATION', (data) => {
            console.log('Received UPDATE_LOTTERY_REGISTRATION:', data);
            setRegistrations((prevRegistrations) =>
                prevRegistrations.map((r) => (r._id === data._id ? data : r))
            );
        });

        socket.on('USER_REWARDED', (data) => {
            console.log('Received USER_REWARDED:', data);
            setRewardNotifications((prevNotifications) => {
                const rewardNotification = {
                    _id: `reward_${data.userId}_${Date.now()}`,
                    userId: {
                        _id: data.userId,
                        fullname: data.fullname,
                        img: data.img,
                        titles: data.titles || [],
                        points: data.points,
                        winCount: data.winCount || 0
                    },
                    region: data.region,
                    numbers: {},
                    result: { isChecked: true, isWin: false },
                    createdAt: new Date(),
                    isReward: true,
                    pointsAwarded: data.pointsAwarded,
                    eventTitle: data.eventTitle
                };
                const updatedNotifications = [rewardNotification, ...prevNotifications].sort(
                    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
                );
                return updatedNotifications.slice(0, 50);
            });
            if (isAtBottom && registrationListRef.current) {
                registrationListRef.current.scrollTop = registrationListRef.current.scrollHeight;
            }
        });

        socket.on('NEW_EVENT_NOTIFICATION', (data) => {
            console.log('Received NEW_EVENT_NOTIFICATION:', data);
            setEventNotifications((prevNotifications) => {
                const updatedNotifications = [data, ...prevNotifications].sort(
                    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
                );
                return updatedNotifications.slice(0, 50);
            });
            if (isAtBottom && registrationListRef.current) {
                registrationListRef.current.scrollTop = registrationListRef.current.scrollHeight;
            }
        });

        socket.on('LOTTERY_RESULT_ERROR', (data) => {
            console.error('Received LOTTERY_RESULT_ERROR:', data);
            setError(data.message || 'Lỗi khi đối chiếu kết quả xổ số');
        });

        socket.on('connect_error', (error) => {
            console.error('Socket.IO connection error:', error.message);
            if (error.message.includes('Authentication error')) {
                setError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
                signOut({ redirect: false });
                router.push('/login?error=SessionExpired');
            } else {
                setError('Mất kết nối thời gian thực. Vui lòng làm mới trang.');
            }
        });

        socket.on('reconnect_attempt', (attempt) => {
            console.log(`Socket.IO reconnect attempt ${attempt}`);
        });

        socket.on('reconnect', () => {
            console.log('Reconnected to Socket.IO');
            socket.emit('joinLotteryFeed');
            socket.emit('join', 'leaderboard');
        });

        socket.on('disconnect', (reason) => {
            console.log('Socket.IO disconnected:', reason);
        });

        return () => {
            console.log('Cleaning up Socket.IO connection');
            socket.disconnect();
        };
    }, [status, session]);

    useEffect(() => {
        const handleScroll = () => {
            if (registrationListRef.current) {
                const { scrollTop, scrollHeight, clientHeight } = registrationListRef.current;
                setIsAtBottom(scrollHeight - scrollTop - clientHeight < 50);
            }
        };
        const registrationList = registrationListRef.current;
        registrationList?.addEventListener('scroll', handleScroll);
        return () => registrationList?.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                setShowModal(false);
                setSelectedUser(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleShowDetails = (user) => {
        setSelectedUser(user);
        setShowModal(true);
    };

    const handleEventClick = (eventId) => {
        if (status !== 'authenticated') {
            router.push('/login?error=SessionRequired');
            return;
        }
        if (!eventId || typeof eventId !== 'string' || eventId === '[object Object]') {
            console.error('Invalid eventId for navigation:', eventId);
            setError('ID sự kiện không hợp lệ. Vui lòng thử lại.');
            return;
        }
        console.log('Navigating to event details with eventId:', eventId);
        router.push(`/diendan/events/${eventId}`);
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
        return avatarColors[firstChar] || styles.avatarA;
    };

    const renderRegistration = (item) => {
        const fullname = item.userId?.fullname || 'Người dùng ẩn danh';
        const firstChar = fullname[0]?.toUpperCase() || '?';
        const titles = item.userId?.titles || [];
        const eventId = item.isEvent && item.eventId?._id ? item.eventId._id.toString() : null;

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
                className={`${styles.commentItem} ${item.isReward ? styles.rewardNotification : item.isEvent ? styles.eventNotification : styles.registrationNotification}`}
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
                            className={`${styles.avatar} ${getAvatarClass(fullname)}`}
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
                            Đã được phát thưởng <strong className={styles.poins}>{item.pointsAwarded} điểm</strong> cho sự kiện <strong>{item.eventTitle}</strong>!
                        </span>
                    ) : item.isEvent ? (
                        <span>
                            Đã đăng {item.type === 'event' ? 'sự kiện' : 'tin hot'}: <strong>{item.title}</strong>
                        </span>
                    ) : (
                        <>
                            Đã đăng ký quay số miền <strong>{item.region}</strong>
                            <br />
                            <strong>Số đăng ký:</strong><br />
                            {item.numbers.bachThuLo && `Bạch thủ lô: ${item.numbers.bachThuLo} | `}
                            {item.numbers.songThuLo.length > 0 && `Song thủ lô: ${item.numbers.songThuLo.join(', ')} | `}
                            {item.numbers.threeCL && `3CL: ${item.numbers.threeCL}`}
                            {item.numbers.cham && `Chạm: ${item.numbers.cham}`}
                            {item.result && item.result.isChecked ? (
                                item.result.isWin ? (
                                    <span className={styles.winningResult}>
                                        <strong>Kết quả: Trúng</strong><br />
                                        {item.result.winningNumbers.bachThuLo && `Bạch thủ lô: ${item.numbers.bachThuLo}`}<br />
                                        {item.result.winningNumbers.songThuLo.length > 0 && `Song thủ lô: ${item.result.winningNumbers.songThuLo.join(', ')}`}<br />
                                        {item.result.winningNumbers.threeCL && `3CL: ${item.numbers.threeCL}`}<br />
                                        {item.result.winningNumbers.cham && `Chạm: ${item.numbers.cham}`}<br />
                                        <strong>Giải trúng:</strong> {item.result.matchedPrizes.join(', ')}
                                    </span>
                                ) : (
                                    <span className={styles.losingResult}>
                                        <strong>Kết quả: Trượt</strong>
                                    </span>
                                )
                            ) : (
                                <span>
                                    {/* <strong>Chưa đối chiếu</strong> */}
                                </span>
                            )}
                        </>
                    )}
                </p>
            </div>
        );
    };

    const combinedFeed = [...registrations, ...rewardNotifications, ...eventNotifications].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    ).slice(0, 50);

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Thông báo</h1>
            {error && <p className={styles.error}>{error}</p>}
            {status === 'loading' && <p className={styles.loading}>Đang tải...</p>}
            <div className={styles.formGroup}>
                <label className={styles.formLabel}>Lọc theo miền</label>
                <select
                    value={region}
                    onChange={(e) => {
                        setRegion(e.target.value);
                        setRewardNotifications([]);
                        setEventNotifications([]);
                    }}
                    className={styles.input}
                >
                    <option value="">Tất cả</option>
                    <option value="Nam">Miền Nam</option>
                    <option value="Trung">Miền Trung</option>
                    <option value="Bac">Miền Bắc</option>
                </select>
            </div>
            <div className={styles.commentList} ref={registrationListRef}>
                {combinedFeed.length === 0 ? (
                    <p className={styles.noComments}>Chưa có đăng ký hoặc thông báo nào.</p>
                ) : (
                    combinedFeed.map((item) => renderRegistration(item))
                )}
            </div>
            {showModal && selectedUser && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal} ref={modalRef}>
                        <h2 className={styles.modalTitle}>Chi tiết người dùng</h2>
                        {selectedUser.img ? (
                            <Image
                                src={selectedUser.img}
                                alt={selectedUser.fullname || 'Người dùng ẩn danh'}
                                className={styles.modalAvatar}
                                width={96}
                                height={96}
                                onError={(e) => {
                                    console.error('Failed to load modal avatar:', selectedUser.img);
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                }}
                            />
                        ) : (
                            <div
                                className={`${styles.avatar} ${getAvatarClass(selectedUser.fullname || 'Người dùng ẩn danh')}`}
                                style={{ display: selectedUser.img ? 'none' : 'flex' }}
                            >
                                {(selectedUser.fullname?.[0]?.toUpperCase()) || '?'}
                            </div>
                        )}
                        <p><strong>Tên:</strong> {selectedUser.fullname || 'Người dùng ẩn danh'}</p>
                        <p><strong>Cấp độ:</strong> {selectedUser.level || 1}</p>
                        <p><strong>Số điểm:</strong> {selectedUser.points || 0}</p>
                        <p><strong>Số lần trúng:</strong> {selectedUser.winCount || 0}</p>
                        <p>
                            <strong>Danh hiệu:</strong>{' '}
                            <span className={styles.titles}>
                                {selectedUser.titles?.map((title, index) => {
                                    const titleClass = title.toLowerCase().includes('học giả')
                                        ? 'hocgia'
                                        : title.toLowerCase().includes('chuyên gia')
                                            ? 'chuyengia'
                                            : title.toLowerCase().includes('thần số học')
                                                ? 'thansohoc'
                                                : title.toLowerCase().includes('thần chốt số')
                                                    ? 'thanchotso'
                                                    : 'tanthu';
                                    return (
                                        <span
                                            key={index}
                                            className={`${styles.titleBadge} ${styles[titleClass]}`}
                                        >
                                            {title}
                                        </span>
                                    );
                                }) || 'Tân thủ'}
                            </span>
                        </p>
                        <button
                            className={styles.cancelButton}
                            onClick={() => {
                                setShowModal(false);
                                setSelectedUser(null);
                            }}
                        >
                            Đóng
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}