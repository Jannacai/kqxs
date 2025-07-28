"use client";

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import moment from 'moment';
import 'moment-timezone';
import Image from 'next/image';
import io from 'socket.io-client';
import styles from '../../styles/ListUser.module.css';
import UserInfoModal from './modals/UserInfoModal';
import PrivateChat from './chatrieng'; // Thêm import PrivateChat

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
    const [privateChats, setPrivateChats] = useState([]); // Thêm trạng thái privateChats
    const [userInfo, setUserInfo] = useState(null); // Thêm trạng thái userInfo
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

    useEffect(() => {
        fetchUsers();
    }, [searchQuery]);

    useEffect(() => {
        const socket = io(API_BASE_URL, {
            query: session?.accessToken && session?.user?.id
                ? { token: session.accessToken, userId: session.user.id }
                : {},
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Socket.IO connected for user list:', socket.id);
            socket.emit('joinUserStatus');
            if (session?.accessToken && session?.user?.id) {
                socket.emit('reconnect');
            }
        });

        socket.on('connect_error', (err) => {
            console.error('Socket.IO connection error:', err.message);
            setFetchError('Mất kết nối thời gian thực. Vui lòng làm mới trang.');
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

        // Xử lý tin nhắn riêng
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

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log('Tab is visible, checking connection');
                if (socket.connected) {
                    if (session?.accessToken && session?.user?.id) {
                        socket.emit('reconnect');
                    }
                } else {
                    socket.connect();
                }
                fetchUsers();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (socketRef.current) {
                socketRef.current.disconnect();
                console.log('Socket.IO disconnected for user list');
            }
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
        <div className={styles.chatContainer}>
            <h3 className={styles.chatTitle}>Danh Sách Thành Viên</h3>
            <div className={styles.searchContainer}>
                <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="Tìm kiếm theo tên..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                />
            </div>
            <div className={styles.messagesContainer}>
                {users.length === 0 ? (
                    <p className={styles.noMessages}>Chưa có thành viên nào</p>
                ) : (
                    users.map((user) => (
                        <div key={user._id} className={styles.messageWrapper}>
                            <div
                                className={`${styles.avatar} ${user.role?.toLowerCase() === 'admin' ? styles.admin : styles.user}`}
                                onClick={() => handleShowDetails(user)}
                                role="button"
                                aria-label={`Xem chi tiết ${getDisplayName(user.fullname)}`}
                            >
                                {user?.img ? (
                                    <Image
                                        src={user.img}
                                        alt={getDisplayName(user.fullname)}
                                        className={styles.avatarImage}
                                        width={36}
                                        height={36}
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
                            <div className={styles.messageContent}>
                                <div className={styles.messageHeader}>
                                    <span
                                        className={`${styles.username} ${user.role?.toLowerCase() === 'admin' ? styles.admin : styles.user}`}
                                        onClick={() => handleShowDetails(user)}
                                        role="button"
                                        aria-label={`Xem chi tiết ${getDisplayName(user.fullname)}`}
                                    >
                                        {getDisplayName(user.fullname)}
                                    </span>
                                    <span className={styles.timestamp}>
                                        {user.isOnline
                                            ? <span className={styles.online}>Online</span>
                                            : `Offline ${formatOfflineDuration(user.lastActive)}`}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
            <div className={styles.tong}>
                <p className={styles.totalUsers}>Tổng số thành viên: 431</p>
                <p className={styles.totalUsers}>Tổng số người online: {onlineUsers}</p>
                <p className={styles.totalUsers}>Tổng số khách online: {guestUsers}</p>
            </div>
            {fetchError && <p className={styles.error}>{fetchError}</p>}
            {showModal && selectedUser && (
                <UserInfoModal
                    selectedUser={selectedUser}
                    setSelectedUser={setSelectedUser}
                    setShowModal={setShowModal}
                    openPrivateChat={openPrivateChat} // Truyền openPrivateChat
                    getAvatarClass={getAvatarClass}
                    accessToken={session?.accessToken}
                />
            )}
            <div className={styles.privateChatsContainer}>
                {privateChats.map((chat, index) => (
                    <PrivateChat
                        key={chat.receiver._id}
                        receiver={chat.receiver}
                        socket={socketRef.current}
                        onClose={() => closePrivateChat(chat.receiver._id)}
                        isMinimized={chat.isMinimized}
                        onToggleMinimize={() => toggleMinimizePrivateChat(chat.receiver._id)}
                        messages={chat.messages} // Truyền messages
                        style={{ right: `${20 + index * 320}px` }}
                    />
                ))}
            </div>
        </div>
    );
}