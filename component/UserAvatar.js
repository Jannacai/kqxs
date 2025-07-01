"use client";

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import vi from 'date-fns/locale/vi';
import Link from 'next/link';
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
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
    const [notifications, setNotifications] = useState([]);
    const [uploading, setUploading] = useState(false);
    const submenuRef = useRef(null);
    const notificationRef = useRef(null);
    const profileRef = useRef(null);
    const fileInputRef = useRef(null);

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
                    toast.error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.", {
                        position: "top-right",
                        autoClose: 5000,
                    });
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
                    toast.error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.", {
                        position: "top-right",
                        autoClose: 5000,
                    });
                    return;
                }
                if (!res.ok) {
                    throw new Error("Không thể tải thông báo");
                }

                const data = await res.json();
                setNotifications(data);
            } catch (error) {
                console.error('Error fetching notifications:', error);
                toast.error("Lỗi khi tải thông báo.", {
                    position: "top-right",
                    autoClose: 5000,
                });
            }
        };

        if (status === "authenticated") {
            fetchUserInfo();
            fetchNotifications();
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
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setIsProfileOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!session?.accessToken) {
            toast.error("Không có access token. Vui lòng đăng nhập lại.", {
                position: "top-right",
                autoClose: 5000,
            });
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
                toast.error("Không thể xác thực người dùng. Vui lòng đăng nhập lại.", {
                    position: "top-right",
                    autoClose: 5000,
                });
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
            toast.success("Tải ảnh đại diện thành công!", {
                position: "top-right",
                autoClose: 3000,
            });
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
            toast.error(errorMessage, {
                position: "top-right",
                autoClose: 5000,
            });
        } finally {
            setUploading(false);
        }
    };

    const handleLogout = async () => {
        if (!session?.refreshToken) {
            await signOut({ redirect: false });
            router.push('/login');
            toast.error("Không có refresh token. Vui lòng đăng nhập lại.", {
                position: "top-right",
                autoClose: 5000,
            });
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
            toast.success("Đăng xuất thành công!", {
                position: "top-right",
                autoClose: 3000,
            });
        } catch (error) {
            console.error('Logout error:', error.message);
            await signOut({ redirect: false });
            router.push('/login');
            toast.error("Lỗi khi đăng xuất. Vui lòng thử lại.", {
                position: "top-right",
                autoClose: 5000,
            });
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
                toast.error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.", {
                    position: "top-right",
                    autoClose: 5000,
                });
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
            toast.error("Lỗi khi đánh dấu thông báo đã đọc.", {
                position: "top-right",
                autoClose: 5000,
            });
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
                toast.error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.", {
                    position: "top-right",
                    autoClose: 5000,
                });
                return;
            }
            if (!res.ok) {
                throw new Error("Không thể đánh dấu tất cả đã đọc");
            }

            setNotifications(notifications.map(n => ({ ...n, isRead: true })));
            toast.success("Đã đánh dấu tất cả thông báo đã đọc.", {
                position: "top-right",
                autoClose: 3000,
            });
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            toast.error("Lỗi khi đánh dấu tất cả thông báo đã đọc.", {
                position: "top-right",
                autoClose: 5000,
            });
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
                toast.error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.", {
                    position: "top-right",
                    autoClose: 5000,
                });
                return;
            }
            if (!res.ok) {
                throw new Error("Không thể xóa thông báo");
            }

            setNotifications(notifications.filter(n => n._id !== notificationId));
            toast.success("Xóa thông báo thành công.", {
                position: "top-right",
                autoClose: 3000,
            });
        } catch (error) {
            console.error('Error deleting notification:', error);
            toast.error("Lỗi khi xóa thông báo.", {
                position: "top-right",
                autoClose: 5000,
            });
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
            <ToastContainer />
            {fetchError && <p className={styles.error}>{fetchError}</p>}
            {userInfo ? (
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
                        {userInfo.img ? (
                            <img src={userInfo.img} alt="Avatar" className={styles.avatarImage} />
                        ) : (
                            getInitials(userInfo.fullname)
                        )}
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
                            <button
                                className={styles.submenuItem}
                                onClick={() => {
                                    setIsProfileOpen(true);
                                    setIsSubmenuOpen(false);
                                }}
                            >
                                Thông tin cá nhân
                            </button>
                            <label className={styles.uploadButton}>
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
                                <>
                                    <Link href="/admin/quanlyuser" className={styles.submenuItem}>
                                        Quản lý người dùng
                                    </Link>
                                    <Link href="/admin/QLquayso" className={styles.submenuItem}>
                                        Quản lý đăng ký xổ số
                                    </Link>
                                </>
                            )}
                            <button onClick={handleLogout} className={styles.logoutButton}>
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