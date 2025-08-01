"use client";

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import moment from 'moment';
import 'moment-timezone';
import Image from 'next/image';
import { getSocket, isSocketConnected, addConnectionListener } from '../../utils/Socket';
import { isValidObjectId } from '../../utils/validation';
import styles from '../../styles/ListUser.module.css';
import UserInfoModal from './modals/UserInfoModal';
import PrivateChat from './chatrieng';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL3 || 'http://localhost:5001';

const getDisplayName = (fullname) => {
    if (!fullname) return 'User';
    return fullname;
};

const getInitials = (fullname) => {
    if (!fullname) return 'U';
    const nameParts = fullname.trim().split(' ');
    return nameParts[nameParts.length - 1].charAt(0).toUpperCase();
};

const formatOfflineDuration = (lastActive) => {
    if (!lastActive) return 'Không xác định';
    const now = moment.tz('Asia/Ho_Chi_Minh');
    const duration = moment.duration(now.diff(moment.tz(lastActive, 'Asia/Ho_Chi_Minh')));
    const days = Math.floor(duration.asDays());
    const hours = Math.floor(duration.asHours()) % 24;
    const minutes = Math.floor(duration.asMinutes()) % 60;

    if (days > 0) return `${days} ngày trước`;
    if (hours > 0) return `${hours} giờ trước`;
    if (minutes > 0) return `${minutes} phút trước`;
    return 'Vừa mới';
};

const getAvatarClass = (role) => {
    return role?.toLowerCase() === 'admin' ? styles.admin : styles.user;
};

export default function UserList({ session: serverSession }) {
    const { data: clientSession, status } = useSession();
    const session = clientSession || serverSession;

    const [users, setUsers] = useState([]);
    const [usersCache, setUsersCache] = useState({});
    const [selectedUser, setSelectedUser] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [fetchError, setFetchError] = useState(null);
    const [totalUsers, setTotalUsers] = useState(0);
    const [onlineUsers, setOnlineUsers] = useState(0);
    const [guestUsers, setGuestUsers] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [privateChats, setPrivateChats] = useState([]);
    const [userInfo, setUserInfo] = useState(null);
    const [newRegistrations, setNewRegistrations] = useState([]); // Thêm state cho người dùng đăng ký mới
    const [socketConnected, setSocketConnected] = useState(false);
    const socketRef = useRef(null);
    const mountedRef = useRef(true);

    // Lấy thông tin người dùng hiện tại
    useEffect(() => {
        const fetchUserInfo = async () => {
            if (!session?.accessToken) {
                console.log('No accessToken in session');
                return;
            }
            try {
                const res = await axios.get(`${API_BASE_URL}/api/auth/me`, {
                    headers: {
                        Authorization: `Bearer ${session.accessToken}`,
                        'Content-Type': 'application/json',
                    },
                });
                const data = res.data;
                console.log('User info fetched:', data);
                setUserInfo(data);
                setUsersCache((prev) => ({ ...prev, [data._id]: data }));
            } catch (err) {
                console.error('Error fetching user info:', err.message);
                setFetchError(`Không thể lấy thông tin người dùng: ${err.message}`);
            }
        };
        if (session && !session.error) fetchUserInfo();
    }, [session]);

    const fetchUsers = async () => {
        try {
            const headers = session?.accessToken
                ? { Authorization: `Bearer ${session.accessToken}`, 'Content-Type': 'application/json' }
                : { 'Content-Type': 'application/json' };
            const params = searchQuery ? { search: searchQuery } : {};
            const res = await axios.get(`${API_BASE_URL}/api/users/list`, { headers, params });
            const { users: fetchedUsers, total } = res.data;
            console.log('Users fetched:', fetchedUsers);

            const sortedUsers = fetchedUsers.sort((a, b) => {
                if (a.isOnline && !b.isOnline) return -1;
                if (!a.isOnline && b.isOnline) return 1;
                return a.fullname.localeCompare(b.fullname);
            });
            setUsers(sortedUsers);
            setTotalUsers(total);
            setOnlineUsers(sortedUsers.filter(user => user.isOnline).length);
        } catch (err) {
            console.error('Error fetching users:', err.message);
            setFetchError('Không thể tải danh sách người dùng. Vui lòng thử lại.');
        }
    };

    // Thêm function để fetch người dùng đăng ký mới
    const fetchNewRegistrations = async () => {
        try {
            const headers = session?.accessToken
                ? { Authorization: `Bearer ${session.accessToken}`, 'Content-Type': 'application/json' }
                : { 'Content-Type': 'application/json' };
            const res = await axios.get(`${API_BASE_URL}/api/users/new-registrations`, { headers });
            setNewRegistrations(res.data.users || []);
        } catch (err) {
            console.error('Error fetching new registrations:', err.message);
        }
    };

    useEffect(() => {
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
                    console.log('Socket.IO connected for user list:', socket.id);
                    socket.emit('joinUserStatus');
                    if (session?.accessToken && session?.user?.id) {
                        socket.emit('reconnect');
                    }
                    setSocketConnected(true);
                });

                socket.on('connect_error', (err) => {
                    console.error('Socket.IO connection error:', err.message);
                    setSocketConnected(false);
                    setFetchError('Mất kết nối thời gian thực. Vui lòng làm mới trang.');
                });

                socket.on('disconnect', () => {
                    console.log('Socket.IO disconnected for user list');
                    setSocketConnected(false);
                });

                socket.on('USER_STATUS_UPDATED', (updatedUser) => {
                    console.log('Received USER_STATUS_UPDATED:', updatedUser);
                    if (updatedUser?._id && isValidObjectId(updatedUser._id)) {
                        setUsers((prev) => {
                            const updatedUsers = prev.map((user) =>
                                user._id === updatedUser._id
                                    ? { ...user, isOnline: updatedUser.isOnline, lastActive: updatedUser.lastActive }
                                    : user
                            );
                            setOnlineUsers(updatedUsers.filter(user => user.isOnline).length);
                            return updatedUsers.sort((a, b) => {
                                if (a.isOnline && !b.isOnline) return -1;
                                if (!a.isOnline && b.isOnline) return 1;
                                return a.fullname.localeCompare(b.fullname);
                            });
                        });
                        setUsersCache((prev) => ({
                            ...prev,
                            [updatedUser._id]: { ...prev[updatedUser._id], isOnline: updatedUser.isOnline, lastActive: updatedUser.lastActive },
                        }));
                    }
                });

                socket.on('GUEST_COUNT_UPDATED', ({ guestCount }) => {
                    console.log('Received GUEST_COUNT_UPDATED:', guestCount);
                    setGuestUsers(guestCount);
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

                socket.on('NEW_USER_REGISTRATION', (newUser) => {
                    console.log('Received NEW_USER_REGISTRATION:', newUser);
                    setNewRegistrations((prev) => {
                        const updated = [newUser, ...prev];
                        return updated.slice(0, 10); // Giữ tối đa 10 người dùng mới
                    });
                });

                return () => {
                    removeListener();
                    if (socketRef.current) {
                        socketRef.current.off('connect');
                        socketRef.current.off('connect_error');
                        socketRef.current.off('disconnect');
                        socketRef.current.off('USER_STATUS_UPDATED');
                        socketRef.current.off('GUEST_COUNT_UPDATED');
                        socketRef.current.off('PRIVATE_MESSAGE');
                        socketRef.current.off('NEW_USER_REGISTRATION');
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
    }, [session]);

    const openPrivateChat = (user) => {
        console.log('openPrivateChat called with user:', JSON.stringify(user, null, 2));
        if (!userInfo) {
            setFetchError('Vui lòng đăng nhập để mở chat riêng');
            console.log('Blocked: userInfo not loaded');
            return;
        }
        const isCurrentUserAdmin = userInfo?.role?.toLowerCase() === 'admin';
        const isTargetAdmin = user?.role?.toLowerCase() === 'admin';
        if (!isCurrentUserAdmin && !isTargetAdmin) {
            setFetchError('Bạn chỉ có thể chat riêng với admin');
            console.log('Blocked: User cannot open private chat with non-admin');
            return;
        }
        setPrivateChats((prev) => {
            if (prev.some((chat) => chat.receiver._id === user._id)) {
                console.log('Chat already exists, setting to not minimized:', user._id);
                return prev.map((chat) =>
                    chat.receiver._id === user._id ? { ...chat, isMinimized: false } : chat
                );
            }
            console.log('Opening new private chat:', user._id);
            return [...prev, { receiver: user, isMinimized: false, messages: [] }];
        });
    };

    const closePrivateChat = (receiverId) => {
        console.log('Closing private chat with user:', receiverId);
        setPrivateChats((prev) => prev.filter((chat) => chat.receiver._id !== receiverId));
    };

    const toggleMinimizePrivateChat = (receiverId) => {
        console.log('Toggling minimize for chat with user:', receiverId);
        setPrivateChats((prev) =>
            prev.map((chat) =>
                chat.receiver._id === receiverId ? { ...chat, isMinimized: !chat.isMinimized } : chat
            )
        );
    };

    const handleShowDetails = (user) => {
        console.log('handleShowDetails called with user:', user);
        if (!user?._id || !isValidObjectId(user._id)) {
            console.error('Invalid user ID:', user?._id);
            setFetchError('ID người dùng không hợp lệ');
            return;
        }
        setSelectedUser(user);
        setShowModal(true);
    };

    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
    };

    return (
        <div className={styles.container}>
            {/* Header Section */}
            <div className={styles.header}>
                <div className={styles.headerContent}>
                    <h1 className={styles.title}>
                        <span className={styles.titleIcon}>👥</span>
                        Thành Viên Cộng Đồng
                    </h1>
                    <div className={styles.stats}>
                        <span className={styles.statItem}>
                            <span className={styles.statIcon}>📊</span>
                            Tổng: {totalUsers}
                        </span>
                        <span className={styles.statItem}>
                            <span className={styles.statIcon}>🟢</span>
                            Online: {onlineUsers}
                        </span>
                        <span className={styles.statItem}>
                            <span className={styles.statIcon}>👤</span>
                            Khách: {guestUsers}
                        </span>
                    </div>
                </div>
            </div>

            {/* Search Section */}
            <div className={styles.searchSection}>
                <div className={styles.searchContainer}>
                    <input
                        type="text"
                        className={styles.searchInput}
                        placeholder="Tìm kiếm thành viên..."
                        value={searchQuery}
                        onChange={handleSearchChange}
                    />
                    <span className={styles.searchIcon}>🔍</span>
                </div>
            </div>

            {/* New Registrations Section */}
            {newRegistrations.length > 0 && (
                <div className={styles.newRegistrationsSection}>
                    <div className={styles.sectionHeader}>
                        <h3 className={styles.sectionTitle}>
                            <span className={styles.sectionIcon}>🆕</span>
                            Thành Viên Mới
                        </h3>
                        <span className={styles.sectionCount}>{newRegistrations.length}</span>
                    </div>
                    <div className={styles.newRegistrationsList}>
                        {newRegistrations.map((user) => (
                            <div key={user._id} className={styles.newUserItem}>
                                <div
                                    className={`${styles.avatar} ${getAvatarClass(user.role)}`}
                                    onClick={() => handleShowDetails(user)}
                                    role="button"
                                    aria-label={`Xem chi tiết ${getDisplayName(user?.fullname || 'User')}`}
                                >
                                    {user?.img ? (
                                        <Image
                                            src={user.img}
                                            alt={getDisplayName(user?.fullname || 'User')}
                                            className={styles.avatarImage}
                                            width={32}
                                            height={32}
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'flex';
                                            }}
                                        />
                                    ) : (
                                        <span className={styles.avatarInitials}>
                                            {getInitials(user?.fullname)}
                                        </span>
                                    )}
                                </div>
                                <div className={styles.newUserInfo}>
                                    <span className={styles.newUserName}>
                                        {getDisplayName(user?.fullname || 'User')}
                                    </span>
                                    <span className={styles.newUserTime}>
                                        {moment.tz(user.createdAt, 'Asia/Ho_Chi_Minh').fromNow()}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Online Users Section */}
            <div className={styles.onlineUsersSection}>
                <div className={styles.sectionHeader}>
                    <h3 className={styles.sectionTitle}>
                        <span className={styles.sectionIcon}>🟢</span>
                        Thành Viên Online
                    </h3>
                    <span className={styles.sectionCount}>{onlineUsers}</span>
                </div>
                <div className={styles.usersList}>
                    {users.filter(user => user.isOnline).length === 0 ? (
                        <div className={styles.emptyState}>
                            <span className={styles.emptyIcon}>😴</span>
                            <p className={styles.emptyText}>Chưa có ai online</p>
                        </div>
                    ) : (
                        users.filter(user => user.isOnline).map((user) => (
                            <div key={user._id} className={styles.userItem}>
                                <div
                                    className={`${styles.avatar} ${getAvatarClass(user.role)}`}
                                    onClick={() => handleShowDetails(user)}
                                    role="button"
                                    aria-label={`Xem chi tiết ${getDisplayName(user?.fullname || 'User')}`}
                                >
                                    {user?.img ? (
                                        <Image
                                            src={user.img}
                                            alt={getDisplayName(user?.fullname || 'User')}
                                            className={styles.avatarImage}
                                            width={32}
                                            height={32}
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'flex';
                                            }}
                                        />
                                    ) : (
                                        <span className={styles.avatarInitials}>
                                            {getInitials(user?.fullname)}
                                        </span>
                                    )}
                                </div>
                                <div className={styles.userInfo}>
                                    <span className={styles.userName}>
                                        {getDisplayName(user?.fullname || 'User')}
                                    </span>
                                    <span className={styles.userStatus}>
                                        <span className={styles.onlineIndicator}>🟢</span>
                                        Online
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* All Users Section */}
            <div className={styles.allUsersSection}>
                <div className={styles.sectionHeader}>
                    <h3 className={styles.sectionTitle}>
                        <span className={styles.sectionIcon}>👥</span>
                        Tất Cả Thành Viên
                    </h3>
                    <span className={styles.sectionCount}>{users.length}</span>
                </div>
                <div className={styles.usersList}>
                    {users.length === 0 ? (
                        <div className={styles.emptyState}>
                            <span className={styles.emptyIcon}>👥</span>
                            <p className={styles.emptyText}>Chưa có thành viên nào</p>
                        </div>
                    ) : (
                        users.map((user) => (
                            <div key={user._id} className={styles.userItem}>
                                <div
                                    className={`${styles.avatar} ${getAvatarClass(user.role)}`}
                                    onClick={() => handleShowDetails(user)}
                                    role="button"
                                    aria-label={`Xem chi tiết ${getDisplayName(user?.fullname || 'User')}`}
                                >
                                    {user?.img ? (
                                        <Image
                                            src={user.img}
                                            alt={getDisplayName(user?.fullname || 'User')}
                                            className={styles.avatarImage}
                                            width={32}
                                            height={32}
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'flex';
                                            }}
                                        />
                                    ) : (
                                        <span className={styles.avatarInitials}>
                                            {getInitials(user?.fullname)}
                                        </span>
                                    )}
                                </div>
                                <div className={styles.userInfo}>
                                    <span className={styles.userName}>
                                        {getDisplayName(user?.fullname || 'User')}
                                    </span>
                                    <span className={styles.userStatus}>
                                        {user.isOnline
                                            ? <span className={styles.onlineIndicator}>🟢 Online</span>
                                            : <span className={styles.offlineIndicator}>⚫ {formatOfflineDuration(user.lastActive)}</span>}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Error Display */}
            {fetchError && (
                <div className={styles.errorContainer}>
                    <span className={styles.errorIcon}>⚠️</span>
                    <span className={styles.errorText}>{fetchError}</span>
                </div>
            )}

            {/* User Info Modal */}
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

            {/* Private Chats */}
            <div className={styles.privateChatsContainer}>
                {privateChats.map((chat, index) => (
                    <PrivateChat
                        key={chat.receiver._id}
                        receiver={chat.receiver}
                        socket={socketRef.current}
                        onClose={() => closePrivateChat(chat.receiver._id)}
                        isMinimized={chat.isMinimized}
                        onToggleMinimize={() => toggleMinimizePrivateChat(chat.receiver._id)}
                        messages={chat.messages}
                        style={{ right: `${20 + index * 320}px` }}
                    />
                ))}
            </div>
        </div>
    );
}