
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

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL3 || 'http://localhost:5001';

const UserAvatar = () => {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [userInfo, setUserInfo] = useState(null);
    const [fetchError, setFetchError] = useState(null);
    const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
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
                        Authorization: `Bearer ${session.accessToken} `,
                        "User-Agent": "UserAvatar-Client",
                    },
                });

                if (!res.ok) {
                    const errorText = await res.json();
                    throw new Error(`Không thể lấy thông tin: ${errorText.error} `);
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
            const params = { type: ['USER_REWARDED', 'NEW_EVENT'], page: 1, limit: 20 };
            const headers = {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.accessToken} `,
            };
            const res = await axios.get(`${API_BASE_URL}/api/notifications`, {
                headers,
                params,
            });

            const notifications = res.data.notifications.map(notification => ({
                ...notification,
                eventId: notification.eventId ? notification.eventId.toString() : null
            }));
            console.log('Fetched notifications:', JSON.stringify(notifications, null, 2));
            setNotifications(notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
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

        console.log('Initializing Socket.IO with URL:', API_BASE_URL);
        console.log('Session user:', JSON.stringify(session?.user, null, 2));
        const userId = session?.user?.userId || session?.user?.id; // Hỗ trợ cả userId và id
        if (!userId) {
            console.error('No userId found in session');
            setNotificationError('Không tìm thấy ID người dùng. Vui lòng đăng nhập lại.');
            return;
        }

        const socket = io(API_BASE_URL, {
            query: { token: session.accessToken },
            reconnectionAttempts: 5,
            reconnectionDelay: 5000,
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Socket.IO connected successfully:', socket.id);
            socket.emit('joinRewardFeed');
            socket.emit('joinEventFeed');
            socket.emit('joinRoom', `user:${userId} `);
            console.log(`Client joined room: user:${userId} `);
            setNotificationError('');
        });

        socket.on('USER_REWARDED', (data) => {
            console.log('Received USER_REWARDED:', JSON.stringify(data, null, 2));
            if (data.userId !== userId) {
                console.log('Ignoring USER_REWARDED for another user:', data.userId);
                return;
            }
            const notification = {
                _id: data.notificationId,
                userId: {
                    _id: data.userId,
                    fullname: data.fullname,
                    img: data.img,
                    titles: data.titles || [],
                    points: data.points,
                    winCount: data.winCount || 0
                },
                type: 'USER_REWARDED',
                content: `Bạn đã được phát thưởng ${data.pointsAwarded} điểm cho sự kiện ${data.eventTitle} !`,
                isRead: false,
                createdAt: new Date(data.awardedAt),
                eventId: data.eventId ? data.eventId.toString() : null
            };
            setNotifications((prev) => {
                if (prev.some(n => n._id === notification._id)) {
                    console.log('Duplicate USER_REWARDED ignored:', notification._id);
                    return prev;
                }
                console.log('Adding USER_REWARDED:', notification);
                const updated = [notification, ...prev].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 50);
                if (isAtBottom && notificationListRef.current) {
                    notificationListRef.current.scrollTop = notificationListRef.current.scrollHeight;
                }
                return updated;
            });
        });

        socket.on('NEW_EVENT', (data) => {
            console.log('Received NEW_EVENT:', JSON.stringify(data, null, 2));
            const notification = {
                _id: `temp_${Date.now()} `, // ID tạm thời
                userId: data.createdBy || { fullname: 'Hệ thống', img: null },
                type: 'NEW_EVENT',
                content: `HOT!! ${data.type === 'event' ? 'sự kiện' : 'tin hot'}: ${data.title} `,
                isRead: false,
                createdAt: new Date(data.createdAt),
                eventId: data._id ? data._id.toString() : null
            };
            setNotifications((prev) => {
                if (prev.some(n => n.eventId === notification.eventId && n.type === 'NEW_EVENT')) {
                    console.log('Duplicate NEW_EVENT ignored:', notification.eventId);
                    return prev;
                }
                console.log('Adding NEW_EVENT:', notification);
                const updated = [notification, ...prev].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 50);
                if (isAtBottom && notificationListRef.current) {
                    notificationListRef.current.scrollTop = notificationListRef.current.scrollHeight;
                }
                return updated;
            });
            fetchNotifications(); // Lấy lại danh sách để có notification._id thực
        });

        socket.on('connect_error', (error) => {
            console.error('Socket.IO connection error:', error.message);
            if (error.message.includes('Authentication error')) {
                setNotificationError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
                signOut({ redirect: false });
                router.push('/login?error=SessionExpired');
            } else {
                setNotificationError('Mất kết nối thời gian thực. Vui lòng làm mới trang.');
            }
        });

        socket.on('reconnect', () => {
            console.log('Reconnected to Socket.IO');
            socket.emit('joinRewardFeed');
            socket.emit('joinEventFeed');
            socket.emit('joinRoom', `user:${userId} `);
        });

        socket.on('disconnect', (reason) => {
            console.log('Socket.IO disconnected:', reason);
        });

        if (status === "authenticated") {
            fetchNotifications();
        }

        return () => {
            console.log('Cleaning up Socket.IO connection');
            socket.disconnect();
        };
    }, [status, session, router]);

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
                    Authorization: `Bearer ${session.accessToken} `,
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
        if (!notification._id || notification._id.startsWith('temp_')) {
            console.error('Invalid or temporary notification ID:', notification._id);
            setNotificationError('Thông báo chưa được đồng bộ. Vui lòng chờ hoặc làm mới trang.');
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/api/notifications/${notification._id}/read`, {
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

            setNotifications(prev => prev.map(n => n._id === notification._id ? { ...n, isRead: true } : n));
        } catch (error) {
            console.error('Error marking notification as read:', error);
            alert(error.message || "Lỗi khi đánh dấu thông báo đã đọc.");
            return;
        }

        if (notification.eventId) {
            const eventId = notification.eventId.toString ? notification.eventId.toString() : notification.eventId;
            if (!eventId || typeof eventId !== 'string' || eventId === '[object Object]') {
                console.error('Invalid eventId for navigation:', notification.eventId);
                setNotificationError('ID sự kiện không hợp lệ. Vui lòng kiểm tra lại.');
                return;
            }
            console.log('Navigating to event details with eventId:', eventId);
            router.push(`/diendan/events/${eventId}`);
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

            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            alert("Đã đánh dấu tất cả thông báo đã đọc.");
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            alert(error.message || "Lỗi khi đánh dấu tất cả thông báo đã đọc.");
        }
    };

    // Xóa thông báo
    const handleDeleteNotification = async (notification) => {
        if (!notification._id || notification._id.startsWith('temp_')) {
            console.error('Invalid or temporary notification ID:', notification._id);
            setNotifications(prev => prev.filter(n => n._id !== notification._id));
            alert("Thông báo tạm thời đã được xóa.");
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/api/notifications/${notification._id}`, {
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

            setNotifications(prev => prev.filter(n => n._id !== notification._id));
            alert("Xóa thông báo thành công.");
        } catch (error) {
            console.error('Error deleting notification:', error);
            alert(error.message || "Lỗi khi xóa thông báo.");
        }
    };

    // Hiển thị thông báo
    const renderNotification = (notification) => {
        const fullname = notification.userId?.fullname || 'Hệ thống';
        const firstChar = fullname[0]?.toUpperCase() || '?';

        return (
            <div
                key={notification._id}
                className={`${styles.notificationItem} ${notification.isRead ? styles.read : styles.unread}`}
                onClick={() => handleNotificationClick(notification)}
                style={notification.eventId ? { cursor: 'pointer' } : {}}
            >
                <div className={styles.notificationHeader}>
                    {notification.userId?.img ? (
                        <Image
                            src={notification.userId.img}
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
                        style={{ display: notification.userId?.img ? 'none' : 'flex' }}
                    >
                        {firstChar}
                    </div>
                    <div className={styles.notificationInfo}>
                        <span className={styles.notificationUsername}>{fullname}</span>
                        <span className={styles.notificationTime}>
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: vi })}
                        </span>
                    </div>
                </div>
                <div className={styles.notificationContent}>
                    <span className={styles.rewardPoints}>
                        {notification.type === 'USER_REWARDED' ? (
                            <>
                                <FaGift className={styles.giftIcon} />
                                Đã được phát thưởng <strong>{notification.content.match(/(\d+) điểm/)[1]} điểm</strong> cho sự kiện <strong>{notification.content.match(/sự kiện (.+)!/)[1]}</strong>!
                            </>
                        ) : (
                            <>
                                <span className={styles.eventIcon}>📢</span>
                                {notification.content}
                            </>
                        )}
                    </span>
                </div>
                {!notification.isRead && (
                    <button
                        className={styles.markReadButton}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleNotificationClick(notification);
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
                        handleDeleteNotification(notification);
                    }}
                    aria-label="Xóa thông báo này"
                >
                    Xóa
                </button>
            </div>
        );
    };

    // Tính số thông báo chưa đọc
    const unreadCount = notifications.filter(n => !n.isRead).length;

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
                                    {notifications.length === 0 ? (
                                        <div className={styles.notificationItem}>
                                            Không có thông báo
                                        </div>
                                    ) : (
                                        notifications.map(notification => renderNotification(notification))
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
