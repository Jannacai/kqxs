"use client";

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import moment from 'moment';
import 'moment-timezone';
import Image from 'next/image';
import io from 'socket.io-client';
import styles from '../../styles/forumOptimized.module.css';
import UserInfoModal from './modals/UserInfoModal';
import PrivateChat from './chatrieng';
import { FaSearch, FaUser, FaCrown, FaCircle, FaEnvelope, FaEye } from 'react-icons/fa';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL3 || 'http://localhost:5001';

const isValidObjectId = (id) => {
    return /^[0-9a-fA-F]{24}$/.test(id);
};

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
    const socketRef = useRef(null);

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
            setUsers(fetchedUsers);
            setTotalUsers(total);
            setFetchError('');
        } catch (err) {
            console.error('Error fetching users:', err.message);
            setFetchError(err.response?.data?.message || 'Đã có lỗi khi tải danh sách người dùng');
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [session?.accessToken, searchQuery]);

    useEffect(() => {
        if (status === 'authenticated' && session?.accessToken) {
            const newSocket = io(API_BASE_URL, {
                query: { token: session.accessToken },
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000
            });

            socketRef.current = newSocket;

            newSocket.on('connect', () => {
                console.log('Connected to WebSocket for user list');
                newSocket.emit('joinUserList');
            });

            newSocket.on('USER_STATUS_CHANGED', (data) => {
                console.log('User status changed:', data);
                setUsers(prev => prev.map(user =>
                    user._id === data.userId
                        ? { ...user, isOnline: data.isOnline, lastActive: data.lastActive }
                        : user
                ));
            });

            newSocket.on('USER_UPDATED', (data) => {
                console.log('User updated:', data);
                setUsers(prev => prev.map(user =>
                    user._id === data._id ? { ...user, ...data } : user
                ));
                setUsersCache(prev => ({ ...prev, [data._id]: data }));
            });

            newSocket.on('disconnect', () => {
                console.log('Disconnected from WebSocket');
            });

            return () => {
                newSocket.disconnect();
            };
        }
    }, [session, status]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchUsers();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [session?.accessToken]);

    const openPrivateChat = (user) => {
        if (!session?.accessToken) {
            console.log('No access token, cannot open private chat');
            return;
        }

        const existingChat = privateChats.find(chat => chat.receiverId === user._id);
        if (!existingChat) {
            setPrivateChats(prev => [...prev, {
                receiverId: user._id,
                receiverName: getDisplayName(user.fullname),
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

    const handleShowDetails = (user) => {
        setSelectedUser(user);
        setShowModal(true);
    };

    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
    };

    const filteredUsers = users.filter(user => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            getDisplayName(user.fullname).toLowerCase().includes(query) ||
            (user.email && user.email.toLowerCase().includes(query)) ||
            (user.role && user.role.toLowerCase().includes(query))
        );
    });

    const onlineCount = filteredUsers.filter(user => user.isOnline).length;
    const adminCount = filteredUsers.filter(user => user.role === 'admin').length;

    return (
        <div className={styles.userListCompact}>
            {/* Compact Header */}
            <div className={styles.compactHeader}>
                <div className={styles.compactTitle}>Thành Viên Nhóm</div>
                <div className={styles.compactSubtitle}>
                    {totalUsers} thành viên • {onlineCount} online • {adminCount} admin
                </div>
            </div>

            {/* Compact Content */}
            <div className={`${styles.compactContent} ${styles.compactContent.large}`}>
                {/* Search Bar */}
                <div className={styles.searchBarCompact}>
                    <FaSearch />
                    <input
                        type="text"
                        placeholder="Tìm kiếm thành viên..."
                        value={searchQuery}
                        onChange={handleSearchChange}
                        className={styles.searchInputCompact}
                    />
                </div>

                {/* User List */}
                <div className={styles.userListContentCompact}>
                    {fetchError && (
                        <div className={styles.errorMessage}>
                            <FaEye />
                            <span>{fetchError}</span>
                        </div>
                    )}

                    {filteredUsers.map((user) => (
                        <div
                            key={user._id}
                            className={styles.userItemCompact}
                        >
                            <div className={styles.userAvatarCompact}>
                                {user.avatar ? (
                                    <Image
                                        src={user.avatar}
                                        alt={getDisplayName(user.fullname)}
                                        width={32}
                                        height={32}
                                        className={styles.userAvatarCompactImage}
                                    />
                                ) : (
                                    <div className={styles.userAvatarCompactInitials}>
                                        {getInitials(user.fullname)}
                                    </div>
                                )}
                                <div className={`${styles.statusDot} ${user.isOnline ? styles.online : styles.offline}`}>
                                    <FaCircle />
                                </div>
                            </div>

                            <div className={styles.userInfoCompact}>
                                <div className={styles.userNameCompact}>
                                    {getDisplayName(user.fullname)}
                                    {user.role === 'admin' && (
                                        <span className={styles.adminBadge}>
                                            <FaCrown />
                                            Admin
                                        </span>
                                    )}
                                </div>
                                <div className={styles.userRoleCompact}>
                                    {user.role || 'USER'}
                                    {!user.isOnline && (
                                        <span className={styles.lastSeen}>
                                            • {formatOfflineDuration(user.lastActive)}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className={styles.userActionsCompact}>
                                <button
                                    className={styles.actionButtonCompact}
                                    onClick={() => handleShowDetails(user)}
                                    title="Xem chi tiết"
                                >
                                    <FaEye />
                                </button>
                                {user.role !== 'admin' && (
                                    <button
                                        className={styles.actionButtonCompact}
                                        onClick={() => openPrivateChat(user)}
                                        title="Chat riêng"
                                    >
                                        <FaEnvelope />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    {filteredUsers.length === 0 && (
                        <div className={styles.emptyMessage}>
                            {searchQuery ? 'Không tìm thấy thành viên nào' : 'Không có thành viên nào'}
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