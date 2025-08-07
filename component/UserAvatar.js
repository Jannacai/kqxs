"use client";

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { jwtDecode } from 'jwt-decode';
import vi from 'date-fns/locale/vi';
import Link from 'next/link';
import axios from 'axios';
import { FaGift, FaBell, FaUser, FaSignOutAlt, FaCog, FaImage, FaPenSquare } from 'react-icons/fa';
import Image from 'next/image';
import { toast } from 'react-toastify';
import styles from '../styles/userAvatar.module.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL3 || 'http://localhost:5001';

const UserAvatar = () => {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [userInfo, setUserInfo] = useState(null);
    const [fetchError, setFetchError] = useState(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [notificationError, setNotificationError] = useState('');
    const [uploading, setUploading] = useState(false);
    const dropdownRef = useRef(null);
    const notificationRef = useRef(null);
    const fileInputRef = useRef(null);
    const notificationListRef = useRef(null);
    const [isAtBottom, setIsAtBottom] = useState(true);

    // Lấy thông tin người dùng
    useEffect(() => {
        const fetchUserInfo = async () => {
            if (!session?.accessToken || session?.error) {
                setFetchError('Không có access token hoặc lỗi phiên');
                return;
            }

            // Kiểm tra thời gian hết hạn của token
            try {
                const decoded = jwtDecode(session.accessToken);
                const now = Date.now() / 1000;
                if (decoded.exp < now) {
                    setFetchError('Token đã hết hạn');
                    await signOut({ redirect: false });
                    router.push('/login?error=SessionExpired');
                    toast.error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.', {
                        position: 'top-center',
                        autoClose: 5000,
                    });
                    return;
                }
            } catch (error) {
                setFetchError('Token không hợp lệ');
                await signOut({ redirect: false });
                router.push('/login?error=SessionExpired');
                toast.error('Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.', {
                    position: 'top-center',
                    autoClose: 5000,
                });
                return;
            }

            // Trì hoãn 1 giây để đảm bảo session được cập nhật
            await new Promise(resolve => setTimeout(resolve, 1000));

            try {
                const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
                    headers: {
                        Authorization: `Bearer ${session.accessToken}`,
                        'User-Agent': 'UserAvatar-Client',
                    },
                });

                if (!res.ok) {
                    const errorText = await res.json();
                    if (errorText.error === 'Tài khoản bị khóa') {
                        setFetchError('Tài khoản của bạn đã bị khóa. Vui lòng thử lại sau.');
                    } else if (errorText.error.includes('Quá nhiều yêu cầu')) {
                        setFetchError('Quá nhiều yêu cầu. Vui lòng thử lại sau 15 phút.');
                    } else {
                        setFetchError(`Không thể lấy thông tin: ${errorText.error}`);
                    }
                    if (res.status === 401 || errorText.error.includes('Invalid token')) {
                        await signOut({ redirect: false });
                        router.push('/login?error=SessionExpired');
                        toast.error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.', {
                            position: 'top-center',
                            autoClose: 5000,
                        });
                    }
                    return;
                }

                const data = await res.json();
                setUserInfo(data);
                setFetchError(null);
            } catch (error) {
                console.error('Error fetching user info:', error);
                setFetchError(error.message);
                if (error.message.includes('Invalid token') || session?.error === 'RefreshTokenError') {
                    await signOut({ redirect: false });
                    router.push('/login?error=SessionExpired');
                    toast.error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.', {
                        position: 'top-center',
                        autoClose: 5000,
                    });
                }
            }
        };

        if (status === 'authenticated') {
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
                Authorization: `Bearer ${session.accessToken}`,
            };
            const res = await axios.get(`${API_BASE_URL}/api/notifications`, {
                headers,
                params,
            });

            const notifications = res.data.notifications.map(notification => ({
                ...notification,
                eventId: notification.eventId ? notification.eventId.toString() : null
            }));
            // console.log('Fetched notifications:', JSON.stringify(notifications, null, 2));
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

    // Load notifications when authenticated
    useEffect(() => {
        if (status === "authenticated") {
            fetchNotifications();
        }
    }, [status, session]);

    // Xử lý cuộn và click ngoài
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
            if (notificationRef.current && !notificationRef.current.contains(event.target)) {
                setIsNotificationOpen(false);
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
            toast.error('Không có access token. Vui lòng đăng nhập lại.', {
                position: 'top-center',
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
                    'User-Agent': 'UserAvatar-Client',
                    'Cache-Control': 'no-cache',
                },
                body: formData,
            });

            if (res.status === 401) {
                toast.error('Không thể xác thực người dùng. Vui lòng đăng nhập lại.', {
                    position: 'top-center',
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
            toast.success('Tải ảnh đại diện thành công!', {
                position: 'top-center',
                autoClose: 5000,
            });
        } catch (error) {
            console.error('Error uploading avatar:', error);
            let errorMessage = error.message;
            if (error.message.includes('Người dùng không tồn tại')) {
                errorMessage = 'Không tìm thấy người dùng. Vui lòng đăng nhập lại.';
                signOut({ redirect: false });
                router.push('/login?error=UserNotFound');
            } else if (error.message.includes('Must supply api_key')) {
                errorMessage = 'Lỗi cấu hình server. Vui lòng liên hệ quản trị viên.';
            } else if (error.message.includes('Không thể xác định người dùng')) {
                errorMessage = 'Lỗi xác thực. Vui lòng đăng nhập lại.';
                signOut({ redirect: false });
                router.push('/login?error=AuthError');
            }
            toast.error(errorMessage, {
                position: 'top-center',
                autoClose: 5000,
            });
        } finally {
            setUploading(false);
        }
    };

    // Đăng xuất
    const handleLogout = async () => {
        if (!session?.refreshToken) {
            await signOut({ redirect: false });
            router.push('/login');
            toast.error('Không có refresh token. Vui lòng đăng nhập lại.', {
                position: 'top-center',
                autoClose: 5000,
            });
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/logout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'UserAvatar-Client',
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
            toast.success('Đăng xuất thành công!', {
                position: 'top-center',
                autoClose: 5000,
            });
        } catch (error) {
            console.error('Logout error:', error.message);
            await signOut({ redirect: false });
            router.push('/login');
            toast.error('Lỗi khi đăng xuất. Vui lòng thử lại.', {
                position: 'top-center',
                autoClose: 5000,
            });
        }
        setIsDropdownOpen(false);
    };

    // Xử lý nhấp vào thông báo
    const handleNotificationClick = async (notification) => {
        if (!notification._id || notification._id.startsWith('temp_')) {
            console.error('Invalid or temporary notification ID:', notification._id);
            setNotificationError('Thông báo chưa được đồng bộ. Vui lòng chờ hoặc làm mới trang.');
            toast.error('Thông báo chưa được đồng bộ. Vui lòng chờ hoặc làm mới trang.', {
                position: 'top-center',
                autoClose: 5000,
            });
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/api/notifications/${notification._id}/read`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${session.accessToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (res.status === 401) {
                signOut({ redirect: false });
                router.push('/login?error=SessionExpired');
                toast.error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.', {
                    position: 'top-center',
                    autoClose: 5000,
                });
                return;
            }
            if (!res.ok) {
                const errorText = await res.json();
                throw new Error(errorText.error || 'Không thể đánh dấu đã đọc');
            }

            setNotifications(prev => prev.map(n => n._id === notification._id ? { ...n, isRead: true } : n));
        } catch (error) {
            console.error('Error marking notification as read:', error);
            toast.error(error.message || 'Lỗi khi đánh dấu thông báo đã đọc.', {
                position: 'top-center',
                autoClose: 5000,
            });
            return;
        }

        if (notification.eventId) {
            const eventId = notification.eventId.toString ? notification.eventId.toString() : notification.eventId;
            if (!eventId || typeof eventId !== 'string' || eventId === '[object Object]') {
                console.error('Invalid eventId for navigation:', notification.eventId);
                setNotificationError('ID sự kiện không hợp lệ. Vui lòng kiểm tra lại.');
                toast.error('ID sự kiện không hợp lệ. Vui lòng kiểm tra lại.', {
                    position: 'top-center',
                    autoClose: 5000,
                });
                return;
            }
            // console.log('Navigating to event details with eventId:', eventId);
            router.push(`/diendan/events/${eventId}`);
        }
        setIsNotificationOpen(false);
    };

    // Đánh dấu tất cả đã đọc
    const handleMarkAllRead = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/notifications/read-all`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${session.accessToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (res.status === 401) {
                signOut({ redirect: false });
                router.push('/login?error=SessionExpired');
                toast.error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.', {
                    position: 'top-center',
                    autoClose: 5000,
                });
                return;
            }
            if (!res.ok) {
                const errorText = await res.json();
                throw new Error(errorText.error || 'Không thể đánh dấu tất cả đã đọc');
            }

            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            toast.success('Đã đánh dấu tất cả thông báo đã đọc.', {
                position: 'top-center',
                autoClose: 5000,
            });
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            toast.error(error.message || 'Lỗi khi đánh dấu tất cả thông báo đã đọc.', {
                position: 'top-center',
                autoClose: 5000,
            });
        }
    };

    // Xóa thông báo
    const handleDeleteNotification = async (notification) => {
        if (!notification._id || notification._id.startsWith('temp_')) {
            console.error('Invalid or temporary notification ID:', notification._id);
            setNotifications(prev => prev.filter(n => n._id !== notification._id));
            toast.success('Thông báo tạm thời đã được xóa.', {
                position: 'top-center',
                autoClose: 5000,
            });
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/api/notifications/${notification._id}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${session.accessToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (res.status === 401) {
                signOut({ redirect: false });
                router.push('/login?error=SessionExpired');
                toast.error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.', {
                    position: 'top-center',
                    autoClose: 5000,
                });
                return;
            }
            if (!res.ok) {
                const errorText = await res.json();
                throw new Error(errorText.error || 'Không thể xóa thông báo');
            }

            setNotifications(prev => prev.filter(n => n._id !== notification._id));
            toast.success('Xóa thông báo thành công.', {
                position: 'top-center',
                autoClose: 5000,
            });
        } catch (error) {
            console.error('Error deleting notification:', error);
            toast.error(error.message || 'Lỗi khi xóa thông báo.', {
                position: 'top-center',
                autoClose: 5000,
            });
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
                            width={32}
                            height={32}
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

    // Nếu chưa đăng nhập, hiển thị nút đăng nhập
    if (status === "unauthenticated") {
        return (
            <div className={styles.authSection}>
                <Link href="/login" className={styles.loginButton}>
                    <FaUser className={styles.loginIcon} />
                    Đăng nhập
                </Link>
            </div>
        );
    }

    // Nếu đang loading
    if (status === "loading") {
        return (
            <div className={styles.loadingSection}>
                <div className={styles.loadingSpinner}></div>
            </div>
        );
    }

    return (
        <div className={styles.userAvatarContainer}>
            {fetchError && <p className={styles.error}>{fetchError}</p>}
            {userInfo ? (
                <>
                    {/* Notification Bell */}
                    <div className={styles.notificationWrapper}>
                        <button
                            className={styles.notificationButton}
                            onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                            aria-label="Mở danh sách thông báo"
                        >
                            <FaBell className={styles.notificationIcon} />
                            {unreadCount > 0 && (
                                <span className={styles.notificationBadge}>{unreadCount}</span>
                            )}
                        </button>
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

                    {/* User Avatar & Dropdown */}
                    <div className={styles.userSection} ref={dropdownRef}>
                        <button
                            className={styles.avatarButton}
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            aria-expanded={isDropdownOpen}
                            aria-label="Mở menu người dùng"
                        >
                            <div className={`${styles.avatar} ${getRoleColorClass(userInfo.role)}`}>
                                {userInfo.img ? (
                                    <Image
                                        src={userInfo.img}
                                        alt="Avatar người dùng"
                                        className={styles.avatarImage}
                                        width={32}
                                        height={32}
                                    />
                                ) : (
                                    getInitials(userInfo.fullname)
                                )}
                            </div>
                            <span className={styles.username}>{getDisplayName(userInfo.fullname)}</span>
                        </button>

                        {isDropdownOpen && (
                            <div className={styles.dropdownMenu}>
                                <div className={styles.userInfo}>
                                    <div className={`${styles.avatar} ${getRoleColorClass(userInfo.role)}`}>
                                        {userInfo.img ? (
                                            <Image
                                                src={userInfo.img}
                                                alt="Avatar người dùng"
                                                className={styles.avatarImage}
                                                width={48}
                                                height={48}
                                            />
                                        ) : (
                                            getInitials(userInfo.fullname)
                                        )}
                                    </div>
                                    <div className={styles.userDetails}>
                                        <span className={styles.fullname}>{userInfo.fullname}</span>
                                        <span className={`${styles.role} ${getRoleColorClass(userInfo.role)}`}>
                                            {userInfo.role}
                                        </span>
                                        <span className={styles.points}>Điểm: {userInfo.points}</span>
                                    </div>
                                </div>

                                <div className={styles.menuItems}>
                                    <Link href="/dang-bai-viet" className={styles.menuItem}>
                                        <FaPenSquare className={styles.menuIcon} />
                                        Đăng bài viết mới
                                    </Link>

                                    <button className={styles.menuItem}>
                                        <FaUser className={styles.menuIcon} />
                                        Thông tin cá nhân
                                    </button>

                                    <label className={styles.menuItem} aria-label="Tải ảnh đại diện">
                                        <FaImage className={styles.menuIcon} />
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
                                        <div className={styles.adminSection}>
                                            <span className={styles.adminLabel}>Quản lý</span>
                                            <Link href="/admin/quanlyuser" className={styles.menuItem}>
                                                <FaCog className={styles.menuIcon} />
                                                Quản lý người dùng
                                            </Link>
                                            <Link href="/admin/QLquayso" className={styles.menuItem}>
                                                <FaCog className={styles.menuIcon} />
                                                Quản lý đăng ký xổ số
                                            </Link>
                                            <Link href="/diendan/AdminPostEvent" className={styles.menuItem}>
                                                <FaCog className={styles.menuIcon} />
                                                Đăng bài post
                                            </Link>
                                        </div>
                                    )}

                                    <button
                                        onClick={handleLogout}
                                        className={`${styles.menuItem} ${styles.logoutButton}`}
                                        aria-label="Đăng xuất"
                                    >
                                        <FaSignOutAlt className={styles.menuIcon} />
                                        Đăng xuất
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div className={styles.loadingSection}>
                    <div className={styles.loadingSpinner}></div>
                    <span>Đang tải thông tin...</span>
                </div>
            )}
        </div>
    );
};

export default UserAvatar;