import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import vi from 'date-fns/locale/vi';
import styles from '../styles/userAvatar.module.css';

const UserAvatar = () => {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [userInfo, setUserInfo] = useState(null);
    const [fetchError, setFetchError] = useState(null);
    const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const submenuRef = useRef(null);
    const notificationRef = useRef(null);
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

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
                }
            }
        };

        const fetchNotifications = async () => {
            if (!session?.accessToken) return;

            try {
                const res = await fetch(`${API_BASE_URL}/api/notifications`, {
                    headers: {
                        Authorization: `Bearer ${session.accessToken}`,
                        "Content-Type": "application/json",
                    },
                });

                if (res.status === 401) {
                    signOut({ redirect: false });
                    router.push('/login?error=SessionExpired');
                    return;
                }
                if (!res.ok) {
                    throw new Error("Không thể tải thông báo");
                }

                const data = await res.json();
                setNotifications(data);
            } catch (error) {
                console.error('Error fetching notifications:', error);
            }
        };

        if (status === "authenticated") {
            fetchUserInfo();
            fetchNotifications();
            // Poll notifications every 10 seconds
            const interval = setInterval(fetchNotifications, 10000);
            return () => clearInterval(interval);
        }
    }, [status, session, router]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (submenuRef.current && !submenuRef.current.contains(event.target)) {
                setIsSubmenuOpen(false);
            }
            if (notificationRef.current && !notificationRef.current.contains(event.target)) {
                setIsNotificationOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        if (!session?.refreshToken) {
            await signOut({ redirect: false });
            router.push('/login');
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
        } catch (error) {
            console.error('Logout error:', error.message);
            await signOut({ redirect: false });
            router.push('/login');
        }
        setIsSubmenuOpen(false);
    };

    const handleNotificationClick = async (notification) => {
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
                return;
            }
            if (!res.ok) {
                throw new Error("Không thể đánh dấu đã đọc");
            }

            setNotifications(notifications.map(n =>
                n._id === notification._id ? { ...n, isRead: true } : n
            ));

            const commentId = notification.commentId?._id || notification.commentId;
            if (!commentId) {
                console.error('Invalid commentId in notification:', notification);
                return;
            }

            router.push(`/chat/chat?commentId=${commentId}`);
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
        setIsNotificationOpen(false);
    };

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
                return;
            }
            if (!res.ok) {
                throw new Error("Không thể đánh dấu tất cả đã đọc");
            }

            setNotifications(notifications.map(n => ({ ...n, isRead: true })));
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    };

    const handleDeleteNotification = async (notificationId) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/notifications/${notificationId}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${session.accessToken}`,
                    "Content-Type": "application/json",
                },
            });

            if (res.status === 401) {
                signOut({ redirect: false });
                router.push('/login?error=SessionExpired');
                return;
            }
            if (!res.ok) {
                throw new Error("Không thể xóa thông báo");
            }

            setNotifications(notifications.filter(n => n._id !== notificationId));
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    };

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

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <div className={styles.userInfo} ref={submenuRef}>
            {fetchError ? (
                <p className={styles.error}>{fetchError}</p>
            ) : userInfo ? (
                <>
                    <div className={styles.notificationWrapper}>
                        <div
                            className={styles.notificationIcon}
                            onClick={() => setIsNotificationOpen(!isNotificationOpen)}
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
                                        >
                                            Đánh dấu tất cả đã đọc
                                        </button>
                                    )}
                                </div>
                                {notifications.length === 0 ? (
                                    <div className={styles.notificationItem}>
                                        Không có thông báo
                                    </div>
                                ) : (
                                    notifications.map(notification => (
                                        <div
                                            key={notification._id}
                                            className={`${styles.notificationItem} ${notification.isRead ? styles.read : styles.unread}`}
                                            onClick={() => handleNotificationClick(notification)}
                                        >
                                            <div className={styles.notificationContent}>
                                                <span>
                                                    {notification.content.replace(
                                                        /^undefined/,
                                                        notification.taggedBy?.fullname || notification.taggedBy?.username || 'Người dùng'
                                                    )}
                                                </span>
                                                <span className={styles.notificationTime}>
                                                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: vi })}
                                                </span>
                                            </div>
                                            {!notification.isRead && (
                                                <button
                                                    className={styles.markReadButton}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleNotificationClick(notification);
                                                    }}
                                                >
                                                    Đánh dấu đã đọc
                                                </button>
                                            )}
                                            <button
                                                className={styles.deleteNotificationButton}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteNotification(notification._id);
                                                }}
                                            >
                                                Xóa
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                    <div
                        className={`${styles.avatar} ${getRoleColorClass(userInfo.role)}`}
                        onClick={() => setIsSubmenuOpen(!isSubmenuOpen)}
                    >
                        {getInitials(userInfo.fullname)}
                    </div>
                    <div className={styles.info}>
                        <span
                            className={styles.username}
                            onClick={() => setIsSubmenuOpen(!isSubmenuOpen)}
                        >
                            {getDisplayName(userInfo.fullname)}
                        </span>
                        <span className={`${styles.role} ${getRoleColorClass(userInfo.role)}`}>
                            {userInfo.role}
                        </span>
                    </div>
                    {isSubmenuOpen && (
                        <div className={styles.submenu}>
                            <span className={styles.fullname}>{userInfo.fullname}</span>
                            <button onClick={handleLogout} className={styles.logoutButton}>
                                Đăng xuất
                            </button>
                        </div>
                    )}
                </>
            ) : (
                "Đang tải thông tin..."
            )}
        </div>
    );
};

export default UserAvatar;