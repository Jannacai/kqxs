"use client";

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import vi from 'date-fns/locale/vi';
import Link from 'next/link';
import axios from 'axios';
import io from 'socket.io-client';
import { FaGift } from 'react-icons/fa';
import Image from 'next/image';
import styles from '../styles/userAvatar.module.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

const UserAvatar = () => {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [userInfo, setUserInfo] = useState(null);
    const [fetchError, setFetchError] = useState(null);
    const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
    const [registrations, setRegistrations] = useState([]);
    const [rewardNotifications, setRewardNotifications] = useState([]);
    const [eventNotifications, setEventNotifications] = useState([]);
    const [notificationError, setNotificationError] = useState('');
    const [uploading, setUploading] = useState(false);
    const submenuRef = useRef(null);
    const notificationRef = useRef(null);
    const profileRef = useRef(null);
    const adminMenuRef = useRef(null);
    const fileInputRef = useRef(null);
    const notificationListRef = useRef(null);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const socketRef = useRef(null);

    // Lấy thông tin người dùng
    useEffect(() => {
        const fetchUserInfo = async () => {
            if (!session?.accessToken) {
                setFetchError('Không có access token');
                return;
            }

            try {
                const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
                    headers: {
                        Authorization: `Bearer ${session.accessToken}`,
                        "User-Agent": "UserAvatar-Client",
                    },
                });

                if (!res.ok) {
                    const errorText = await res.json();
                    throw new Error(`Không thể lấy thông tin: ${errorText.error}`);
                }

                const data = await res.json();
                setUserInfo(data);
            } catch (error) {
                console.error('Error fetching user info:', error);
                setFetchError(error.message);
                if (error.message.includes("Invalid token") || session?.error === "RefreshTokenError") {
                    signOut({ redirect: false });
                    router.push('/login?error=SessionExpired');
                    alert("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
                }
            }
        };

        if (status === "authenticated") {
            fetchUserInfo();
        }
    }, [status, session, router]);

    // Lấy danh sách thông báo
    const fetchNotifications = async () => {
        if (!session?.accessToken) {
            setNotificationError('Vui lòng đăng nhập để xem thông báo.');
            return;
        }

        try {
            const params = { page: 1, limit: 20 };
            const headers = {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.accessToken}`,
            };
            const res = await axios.get(`${API_BASE_URL}/api/lottery/registrations`, {
                headers,
                params,
            });

            const registrationsData = res.data.registrations.filter(r => !r.isReward && !r.isEvent);
            const rewardData = res.data.registrations.filter(r => r.isReward);
            const eventData = res.data.registrations.filter(r => r.isEvent);
            setRegistrations(registrationsData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
            setRewardNotifications(rewardData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
            setEventNotifications(eventData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
            setNotificationError('');
        } catch (err) {
            console.error('Error fetching notifications:', err.response?.data || err.message);
            if (err.response?.status === 401) {
                setNotificationError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
                signOut({ redirect: false });
                router.push('/login?error=SessionExpired');
            } else {
                setNotificationError(err.response?.data?.message || 'Đã có lỗi khi lấy danh sách thông báo');
            }
        }
    };

    // Khởi tạo Socket.IO
    useEffect(() => {
        if (status !== "authenticated" || !session?.accessToken) return;

        const socket = io(API_BASE_URL, {
            query: { token: session.accessToken },
            reconnectionAttempts: 5,
            reconnectionDelay: 5000,
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Socket.IO connected successfully:', socket.id);
            socket.emit('joinLotteryFeed');
            setNotificationError('');
        });

        socket.on('NEW_LOTTERY_REGISTRATION', (data) => {
            setRegistrations((prev) => {
                if (prev.some(r => r._id === data._id)) {
                    return prev.map(r => (r._id === data._id ? data : r));
                }
                const updated = [data, ...prev].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 50);
                if (isAtBottom && notificationListRef.current) {
                    notificationListRef.current.scrollTop = notificationListRef.current.scrollHeight;
                }
                return updated;
            });
        });

        socket.on('LOTTERY_RESULT_CHECKED', (data) => {
            setRegistrations((prev) => {
                if (prev.some(r => r._id === data._id)) {
                    return prev.map(r => (r._id === data._id ? data : r));
                }
                return prev;
            });
            if (isAtBottom && notificationListRef.current) {
                notificationListRef.current.scrollTop = notificationListRef.current.scrollHeight;
            }
        });

        socket.on('USER_UPDATED', (data) => {
            setRegistrations((prev) =>
                prev.map((r) =>
                    r.userId._id === data._id ? { ...r, userId: { ...r.userId, img: data.img, titles: data.titles, points: data.points, winCount: data.winCount } } : r
                )
            );
            setRewardNotifications((prev) =>
                prev.map((n) =>
                    n.userId._id === data._id ? { ...n, userId: { ...n.userId, img: data.img, titles: data.titles, points: data.points, winCount: data.winCount } } : n
                )
            );
            setEventNotifications((prev) =>
                prev.map((n) =>
                    n.userId._id === data._id ? { ...n, userId: { ...n.userId, img: data.img, titles: data.titles, points: data.points, winCount: data.winCount } } : n
                )
            );
        });

        socket.on('UPDATE_LOTTERY_REGISTRATION', (data) => {
            setRegistrations((prev) =>
                prev.map((r) => (r._id === data._id ? data : r))
            );
        });

        socket.on('USER_REWARDED', (data) => {
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
                eventTitle: data.eventTitle,
                notificationId: data.notificationId // Lưu notificationId từ WebSocket
            };
            setRewardNotifications((prev) => {
                const updated = [rewardNotification, ...prev].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 50);
                if (isAtBottom && notificationListRef.current) {
                    notificationListRef.current.scrollTop = notificationListRef.current.scrollHeight;
                }
                return updated;
            });
        });

        socket.on('NEW_EVENT_NOTIFICATION', (data) => {
            setEventNotifications((prev) => {
                const updated = [{ ...data, notificationId: data.notificationId }, ...prev].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 50);
                if (isAtBottom && notificationListRef.current) {
                    notificationListRef.current.scrollTop = notificationListRef.current.scrollHeight;
                }
                return updated;
            });
        });

        socket.on('LOTTERY_RESULT_ERROR', (data) => {
            setNotificationError(data.message || 'Lỗi khi đối chiếu kết quả xổ số');
        });

        socket.on('connect_error', (error) => {
            if (error.message.includes('Authentication error')) {
                setNotificationError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
                signOut({ redirect: false });
                router.push('/login?error=SessionExpired');
            } else {
                setNotificationError('Mất kết nối thời gian thực. Vui lòng làm mới trang.');
            }
        });

        socket.on('reconnect', () => {
            socket.emit('joinLotteryFeed');
        });

        if (status === "authenticated") {
            fetchNotifications();
        }

        return () => {
            socket.disconnect();
        };
    }, [status, session]);

    // Xử lý cuộn và click ngoài
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (submenuRef.current && !submenuRef.current.contains(event.target)) {
                setIsSubmenuOpen(false);
            }
            if (notificationRef.current && !notificationRef.current.contains(event.target)) {
                setIsNotificationOpen(false);
            }
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setIsProfileOpen(false);
            }
            if (adminMenuRef.current && !adminMenuRef.current.contains(event.target)) {
                setIsAdminMenuOpen(false);
            }
        };

        const handleScroll = () => {
            if (notificationListRef.current) {
                const { scrollTop, scrollHeight, clientHeight } = notificationListRef.current;
                setIsAtBottom(scrollHeight - scrollTop - clientHeight < 50);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        notificationListRef.current?.addEventListener('scroll', handleScroll);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            notificationListRef.current?.removeEventListener('scroll', handleScroll);
        };
    }, []);

    // Tải ảnh đại diện
    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!session?.accessToken) {
            alert("Không có access token. Vui lòng đăng nhập lại.");
            signOut({ redirect: false });
            router.push('/login?error=SessionExpired');
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('avatar', file);

        try {
            const res = await fetch(`${API_BASE_URL}/api/users/upload-avatar`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${session.accessToken}`,
                    "User-Agent": "UserAvatar-Client",
                    'Cache-Control': 'no-cache',
                },
                body: formData,
            });

            if (res.status === 401) {
                alert("Không thể xác thực người dùng. Vui lòng đăng nhập lại.");
                signOut({ redirect: false });
                router.push('/login?error=SessionExpired');
                return;
            }

            if (!res.ok) {
                const errorText = await res.json();
                throw new Error(errorText.error || 'Không thể tải ảnh lên');
            }

            const data = await res.json();
            setUserInfo(data.user);
            fileInputRef.current.value = null;
            alert("Tải ảnh đại diện thành công!");
        } catch (error) {
            console.error('Error uploading avatar:', error);
            let errorMessage = error.message;
            if (error.message.includes("Người dùng không tồn tại")) {
                errorMessage = "Không tìm thấy người dùng. Vui lòng đăng nhập lại.";
                signOut({ redirect: false });
                router.push('/login?error=UserNotFound');
            } else if (error.message.includes("Must supply api_key")) {
                errorMessage = "Lỗi cấu hình server. Vui lòng liên hệ quản trị viên.";
            } else if (error.message.includes("Không thể xác định người dùng")) {
                errorMessage = "Lỗi xác thực. Vui lòng đăng nhập lại.";
                signOut({ redirect: false });
                router.push('/login?error=AuthError');
            }
            alert(errorMessage);
        } finally {
            setUploading(false);
        }
    };

    // Đăng xuất
    const handleLogout = async () => {
        if (!session?.refreshToken) {
            await signOut({ redirect: false });
            router.push('/login');
            alert("Không có refresh token. Vui lòng đăng nhập lại.");
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/logout`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "User-Agent": "UserAvatar-Client",
                },
                body: JSON.stringify({ refreshToken: session.refreshToken }),
            });

            if (!res.ok) {
                throw new Error('Không thể đăng xuất');
            }

            await signOut({ redirect: false });
            router.push('/login');
            setUserInfo(null);
            setFetchError(null);
            alert("Đăng xuất thành công!");
        } catch (error) {
            console.error('Logout error:', error.message);
            await signOut({ redirect: false });
            router.push('/login');
            alert("Lỗi khi đăng xuất. Vui lòng thử lại.");
        }
        setIsSubmenuOpen(false);
    };

    // Xử lý nhấp vào thông báo
    const handleNotificationClick = async (notification) => {
        if (!notification.notificationId) {
            console.error('Invalid notification ID:', notification);
            alert('Thông báo không hợp lệ.');
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/api/notifications/${notification.notificationId}/read`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${session.accessToken}`,
                    "Content-Type": "application/json",
                },
            });

            if (res.status === 401) {
                signOut({ redirect: false });
                router.push('/login?error=SessionExpired');
                alert("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
                return;
            }
            if (!res.ok) {
                const errorText = await res.json();
                throw new Error(errorText.error || "Không thể đánh dấu đã đọc");
            }

            if (notification.isEvent && notification.eventId?._id) {
                setEventNotifications(prev => prev.map(n => n._id === notification._id ? { ...n, isRead: true } : n));
                router.push(`/diendan/events/${notification.eventId._id}`);
            } else if (notification.isReward && notification.eventTitle) {
                setRewardNotifications(prev => prev.map(n => n._id === notification._id ? { ...n, isRead: true } : n));
                router.push(`/lottery?eventId=${notification.eventTitle}`);
            } else {
                setRegistrations(prev => prev.map(n => n._id === notification._id ? { ...n, isRead: true } : n));
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
            alert(error.message || "Lỗi khi đánh dấu thông báo đã đọc.");
        }
        setIsNotificationOpen(false);
    };

    // Đánh dấu tất cả đã đọc
    const handleMarkAllRead = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/notifications/read-all`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${session.accessToken}`,
                    "Content-Type": "application/json",
                },
            });

            if (res.status === 401) {
                signOut({ redirect: false });
                router.push('/login?error=SessionExpired');
                alert("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
                return;
            }
            if (!res.ok) {
                const errorText = await res.json();
                throw new Error(errorText.error || "Không thể đánh dấu tất cả đã đọc");
            }

            setRegistrations(prev => prev.map(n => ({ ...n, isRead: true })));
            setRewardNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setEventNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            alert("Đã đánh dấu tất cả thông báo đã đọc.");
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            alert(error.message || "Lỗi khi đánh dấu tất cả thông báo đã đọc.");
        }
    };

    // Xóa thông báo
    const handleDeleteNotification = async (notification) => {
        if (!notification.notificationId) {
            console.error('Invalid notification ID:', notification);
            alert('ID thông báo không hợp lệ.');
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/api/notifications/${notification.notificationId}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${session.accessToken}`,
                    "Content-Type": "application/json",
                },
            });

            if (res.status === 401) {
                signOut({ redirect: false });
                router.push('/login?error=SessionExpired');
                alert("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
                return;
            }
            if (!res.ok) {
                const errorText = await res.json();
                throw new Error(errorText.error || "Không thể xóa thông báo");
            }

            setRegistrations(prev => prev.filter(n => n._id !== notification._id));
            setRewardNotifications(prev => prev.filter(n => n._id !== notification._id));
            setEventNotifications(prev => prev.filter(n => n._id !== notification._id));
            alert("Xóa thông báo thành công.");
        } catch (error) {
            console.error('Error deleting notification:', error);
            alert(error.message || "Lỗi khi xóa thông báo.");
        }
    };

    // Hàm hiển thị thông báo
    const renderNotification = (item) => {
        const fullname = item.userId?.fullname || 'Người dùng ẩn danh';
        const firstChar = fullname[0]?.toUpperCase() || '?';
        const titles = item.userId?.titles || [];

        return (
            <div
                key={item._id}
                className={`${styles.notificationItem} ${item.isRead ? styles.read : styles.unread} ${item.isReward ? styles.rewardNotification : item.isEvent ? styles.eventNotification : styles.registrationNotification}`}
                onClick={() => handleNotificationClick(item)}
                style={item.isEvent && item.eventId?._id ? { cursor: 'pointer' } : {}}
            >
                <div className={styles.notificationHeader}>
                    {item.userId?.img ? (
                        <Image
                            src={item.userId.img}
                            alt={fullname}
                            className={styles.avatarImage}
                            width={40}
                            height={40}
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                            }}
                        />
                    ) : null}
                    <div
                        className={`${styles.avatar} ${styles.avatarA}`}
                        style={{ display: item.userId?.img ? 'none' : 'flex' }}
                    >
                        {firstChar}
                    </div>
                    <div className={styles.notificationInfo}>
                        <span className={styles.notificationUsername}>{fullname}</span>
                        <span className={styles.notificationTime}>
                            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: vi })}
                        </span>
                    </div>
                </div>
                <div className={styles.notificationContent}>
                    {item.isReward ? (
                        <span className={styles.rewardPoints}>
                            <FaGift className={styles.giftIcon} />
                            Đã được phát thưởng <strong className={styles.points}>{item.pointsAwarded} điểm</strong> cho sự kiện <strong>{item.eventTitle}</strong>!
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
                                <span></span>
                            )}
                        </>
                    )}
                </div>
                {!item.isRead && (
                    <button
                        className={styles.markReadButton}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleNotificationClick(item);
                        }}
                        aria-label="Đánh dấu thông báo này đã đọc"
                    >
                        Đánh dấu đã đọc
                    </button>
                )}
                <button
                    className={styles.deleteNotificationButton}
                    onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNotification(item);
                    }}
                    aria-label="Xóa thông báo này"
                >
                    Xóa
                </button>
            </div>
        );
    };

    // Kết hợp danh sách thông báo
    const combinedFeed = [...registrations, ...rewardNotifications, ...eventNotifications].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    ).slice(0, 50);

    // Tính số thông báo chưa đọc
    const unreadCount = combinedFeed.filter(n => !n.isRead).length;

    // Hàm lấy tên hiển thị và màu vai trò
    const getDisplayName = (fullname) => {
        if (!fullname) return 'User';
        const nameParts = fullname.trim().split(' ');
        return nameParts[nameParts.length - 1];
    };

    const getInitials = (fullname) => {
        if (!fullname) return 'U';
        const nameParts = fullname.trim().split(' ');
        return nameParts[nameParts.length - 1].charAt(0).toUpperCase();
    };

    const getRoleColorClass = (role) => {
        return role?.toLowerCase() === 'admin' ? styles.admin : styles.user;
    };

    if (status === "unauthenticated") {
        return null;
    }

    return (
        <div className={styles.userInfo} ref={submenuRef}>
            {fetchError && <p className={styles.error}>{fetchError}</p>}
            {userInfo ? (
                <>
                    <div className={styles.notificationWrapper}>
                        <div
                            className={styles.notificationIcon}
                            onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                            aria-label="Mở danh sách thông báo"
                        >
                            🔔
                            {unreadCount > 0 && (
                                <span className={styles.notificationBadge}>{unreadCount}</span>
                            )}
                        </div>
                        {isNotificationOpen && (
                            <div className={styles.notificationMenu} ref={notificationRef}>
                                <div className={styles.notificationHeader}>
                                    <span>Thông báo</span>
                                    {unreadCount > 0 && (
                                        <button
                                            className={styles.markAllReadButton}
                                            onClick={handleMarkAllRead}
                                            aria-label="Đánh dấu tất cả thông báo đã đọc"
                                        >
                                            Đánh dấu tất cả đã đọc
                                        </button>
                                    )}
                                </div>
                                <div className={styles.notificationList} ref={notificationListRef}>
                                    {notificationError && <p className={styles.error}>{notificationError}</p>}
                                    {combinedFeed.length === 0 ? (
                                        <div className={styles.notificationItem}>
                                            Không có thông báo
                                        </div>
                                    ) : (
                                        combinedFeed.map(notification => renderNotification(notification))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    <div
                        className={`${styles.avatar} ${getRoleColorClass(userInfo.role)}`}
                        onClick={() => setIsSubmenuOpen(!isSubmenuOpen)}
                        aria-expanded={isSubmenuOpen}
                        aria-label="Mở menu người dùng"
                    >
                        {userInfo.img ? (
                            <img src={userInfo.img} alt="Avatar người dùng" className={styles.avatarImage} />
                        ) : (
                            getInitials(userInfo.fullname)
                        )}
                    </div>
                    <div className={styles.info}>
                        <span
                            className={styles.username}
                            onClick={() => setIsSubmenuOpen(!isSubmenuOpen)}
                            aria-expanded={isSubmenuOpen}
                            aria-label="Mở menu người dùng"
                        >
                            {getDisplayName(userInfo.fullname)}
                        </span>
                        <span className={`${styles.role} ${getRoleColorClass(userInfo.role)}`}>
                            {userInfo.role}
                        </span>
                    </div>
                    {isSubmenuOpen && (
                        <div className={`${styles.submenu} ${isSubmenuOpen ? styles.active : ''}`} ref={submenuRef}>
                            <span className={styles.fullname}>{userInfo.fullname}</span>
                            <button
                                className={styles.submenuItem}
                                onClick={() => {
                                    setIsProfileOpen(true);
                                    setIsSubmenuOpen(false);
                                }}
                                aria-label="Xem thông tin cá nhân"
                            >
                                Thông tin cá nhân
                            </button>
                            <label className={styles.uploadButton} aria-label="Tải ảnh đại diện">
                                {uploading ? 'Đang tải...' : 'Tải ảnh đại diện'}
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png"
                                    onChange={handleAvatarChange}
                                    ref={fileInputRef}
                                    style={{ display: 'none' }}
                                    disabled={uploading}
                                />
                            </label>
                            {userInfo.role === 'ADMIN' && (
                                <div className={styles.adminMenuWrapper}>
                                    <button
                                        className={styles.submenuItem}
                                        onClick={() => setIsAdminMenuOpen(!isAdminMenuOpen)}
                                        aria-expanded={isAdminMenuOpen}
                                        aria-label="Mở menu quản lý"
                                    >
                                        Quản lý chung
                                    </button>
                                    {isAdminMenuOpen && (
                                        <div className={styles.adminSubmenu} ref={adminMenuRef}>
                                            <Link href="/admin/quanlyuser" className={styles.submenuItem}>
                                                Quản lý người dùng
                                            </Link>
                                            <Link href="/admin/QLquayso" className={styles.submenuItem}>
                                                Quản lý đăng ký xổ số
                                            </Link>
                                            <Link href="/diendan/AdminPostEvent" className={styles.submenuItem}>
                                                Đăng bài post
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            )}
                            <button
                                onClick={handleLogout}
                                className={styles.logoutButton}
                                aria-label="Đăng xuất"
                            >
                                Đăng xuất
                            </button>
                        </div>
                    )}
                    {isProfileOpen && (
                        <div className={styles.profileMenu} ref={profileRef}>
                            <div className={styles.profileHeader}>
                                <span>Thông tin cá nhân</span>
                                <button
                                    className={styles.closeButton}
                                    onClick={() => setIsProfileOpen(false)}
                                    aria-label="Đóng thông tin cá nhân"
                                >
                                    ✕
                                </button>
                            </div>
                            <div className={styles.profileContent}>
                                <p><strong>Họ tên:</strong> {userInfo.fullname}</p>
                                <p><strong>Email:</strong> {userInfo.email}</p>
                                <p><strong>Số điện thoại:</strong> {userInfo.phoneNumber || 'N/A'}</p>
                                <p><strong>Danh hiệu:</strong> {userInfo.titles?.join(', ') || 'Chưa có'}</p>
                                <p><strong>Cấp độ:</strong> {userInfo.level}</p>
                                <p><strong>Số điểm:</strong> {userInfo.points}</p>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <span className={styles.loading}>Đang tải thông tin...</span>
            )}
        </div>
    );
};

export default UserAvatar;