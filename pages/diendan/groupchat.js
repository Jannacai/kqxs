"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import moment from 'moment';
import 'moment-timezone';
import Image from 'next/image';
import io from 'socket.io-client';
import styles from '../../styles/groupchat.module.css';
import PrivateChat from './chatrieng';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

const isValidObjectId = (id) => {
    return /^[0-9a-fA-F]{24}$/.test(id);
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

const profaneWords = ['kẹt', 'chửi', 'lồn', 'đụ', 'địt', 'cẹt', 'cược', 'má', 'lồnn', 'lonn', 'lồnnn'];
const profaneRegex = new RegExp(profaneWords.join('|'), 'gi');
const vowelRegex = /[ẹáàảãạíìỉĩịóòỏõọúùủũụéèẻẽẹ]/g;

const filterProfanity = (text) => {
    return text.replace(profaneRegex, (match) => match.replace(vowelRegex, '*'));
};

const isProfane = (text) => profaneRegex.test(text);

export default function GroupChat({ session: serverSession }) {
    const router = useRouter();
    const { data: clientSession, status } = useSession();
    const session = clientSession || serverSession;

    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState('');
    const [userInfo, setUserInfo] = useState(null);
    const [fetchError, setFetchError] = useState(null);
    const [error, setError] = useState('');
    const [usersCache, setUsersCache] = useState({});
    const [modalUser, setModalUser] = useState(null);
    const [privateChats, setPrivateChats] = useState([]);
    const socketRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const contextMenuRef = useRef(null);

    useEffect(() => {
        console.log('Session status:', status);
        console.log('Server session:', JSON.stringify(serverSession, null, 2));
        console.log('Client session:', JSON.stringify(clientSession, null, 2));
        console.log('Used session:', JSON.stringify(session, null, 2));
        if (session?.error === 'RefreshTokenExpired') {
            console.log('Refresh token expired, redirecting to login');
            router.push('/login');
        }
    }, [session, serverSession, clientSession, status, router]);

    useEffect(() => {
        const fetchMessages = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/api/groupchat`);
                console.log('Messages fetched:', res.data);
                setMessages(res.data.messages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
            } catch (err) {
                console.error('Error fetching messages:', err.message);
                setFetchError('Không thể tải tin nhắn. Vui lòng thử lại.');
            }
        };
        fetchMessages();
    }, []);

    useEffect(() => {
        const scrollToBottom = () => {
            if (messagesContainerRef.current) {
                messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
            }
        };
        if (messages.length > 0) {
            scrollToBottom();
        }
    }, [messages]);

    useEffect(() => {
        const refreshAccessToken = async () => {
            try {
                const res = await axios.post(`${API_BASE_URL}/api/auth/refresh-token`, {
                    refreshToken: session?.refreshToken,
                });
                const { accessToken, newRefreshToken } = res.data;
                console.log('New accessToken:', accessToken);
                return accessToken;
            } catch (err) {
                console.error('Error refreshing token:', err.message);
                router.push('/login');
                return null;
            }
        };

        const fetchUserInfo = async () => {
            if (!session?.accessToken) {
                console.log('No accessToken in session');
                return;
            }
            try {
                console.log('Fetching user info with token:', session.accessToken);
                const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
                    headers: {
                        Authorization: `Bearer ${session.accessToken}`,
                        'User-Agent': 'GroupChat-Client',
                    },
                });
                if (res.status === 401) {
                    const newToken = await refreshAccessToken();
                    if (newToken) {
                        const retryRes = await fetch(`${API_BASE_URL}/api/auth/me`, {
                            headers: {
                                Authorization: `Bearer ${newToken}`,
                                'User-Agent': 'GroupChat-Client',
                            },
                        });
                        if (!retryRes.ok) throw new Error('Retry failed');
                        const data = await retryRes.json();
                        setUserInfo(data);
                        setUsersCache((prev) => ({ ...prev, [data._id]: data }));
                    }
                } else if (!res.ok) {
                    const errorText = await res.json();
                    throw new Error(`Không thể lấy thông tin: ${errorText.error}`);
                } else {
                    const data = await res.json();
                    console.log('User info fetched:', data);
                    setUserInfo(data);
                    setUsersCache((prev) => ({ ...prev, [data._id]: data }));
                }
            } catch (error) {
                console.error('Error fetching user info:', error.message);
                setFetchError(error.message);
            }
        };
        if (session && !session.error) fetchUserInfo();
    }, [session, router]);

    useEffect(() => {
        if (!session?.accessToken || !userInfo?._id) {
            console.log('Skipping Socket.IO setup: missing session or userInfo');
            return;
        }

        const socket = io(API_BASE_URL, {
            query: { token: session.accessToken },
            reconnectionAttempts: 5,
            reconnectionDelay: 5000,
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Socket.IO connected for chat:', socket.id);
            socket.emit('joinChat');
            console.log('Joining private room for user:', userInfo._id);
            socket.emit('joinPrivateRoom', userInfo._id);
        });

        socket.on('connect_error', (err) => {
            console.error('Socket.IO connection error:', err.message);
            setFetchError('Mất kết nối thời gian thực. Vui lòng làm mới trang.');
        });

        socket.on('NEW_MESSAGE', (newMessage) => {
            console.log('Received NEW_MESSAGE:', JSON.stringify(newMessage, null, 2));
            if (
                newMessage &&
                newMessage.userId?._id &&
                isValidObjectId(newMessage.userId._id) &&
                newMessage.content
            ) {
                setUsersCache((prev) => ({
                    ...prev,
                    [newMessage.userId._id]: newMessage.userId,
                }));
                setMessages((prev) => {
                    if (prev.some((msg) => msg._id === newMessage._id)) return prev;
                    return [newMessage, ...prev];
                });
            } else {
                console.warn('Ignoring invalid NEW_MESSAGE:', newMessage);
            }
        });

        socket.on('PRIVATE_MESSAGE', async (newMessage) => {
            console.log('Received PRIVATE_MESSAGE:', JSON.stringify(newMessage, null, 2));
            if (newMessage && newMessage.userId?._id && newMessage.roomId) {
                const [userId1, userId2] = newMessage.roomId.split('-');
                const otherUserId = userId1 === userInfo._id ? userId2 : userId1;
                console.log('Other user ID:', otherUserId);
                try {
                    const res = await axios.get(`${API_BASE_URL}/api/users/${otherUserId}`, {
                        headers: { Authorization: `Bearer ${session.accessToken}` },
                    });
                    const otherUser = res.data;
                    console.log('Fetched other user for private chat:', JSON.stringify(otherUser, null, 2));
                    setPrivateChats((prev) => {
                        if (prev.some((chat) => chat.receiver._id === otherUser._id)) {
                            console.log('Updating existing chat with user:', otherUser._id);
                            return prev.map((chat) =>
                                chat.receiver._id === otherUser._id
                                    ? { ...chat, isMinimized: false }
                                    : chat
                            );
                        }
                        console.log('Opening new private chat with user:', otherUser._id);
                        return [...prev, { receiver: otherUser, isMinimized: false }];
                    });
                } catch (err) {
                    console.error(`Error fetching user ${otherUserId}:`, err.message);
                    setFetchError(`Không thể lấy thông tin người dùng ${otherUserId}`);
                }
            } else {
                console.warn('Ignoring invalid PRIVATE_MESSAGE:', newMessage);
            }
        });

        socket.on('USER_UPDATED', (updatedUser) => {
            console.log('Received USER_UPDATED:', updatedUser);
            if (updatedUser?._id && isValidObjectId(updatedUser._id)) {
                setUsersCache((prev) => ({ ...prev, [updatedUser._id]: updatedUser }));
            }
        });

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                console.log('Socket.IO disconnected for chat');
            }
        };
    }, [session, userInfo]);

    useEffect(() => {
        const fetchMissingUserDetails = async () => {
            const missingUsers = messages
                .filter((msg) => msg.userId?._id && !usersCache[msg.userId._id])
                .map((msg) => msg.userId._id);
            const uniqueMissingUsers = [...new Set(missingUsers)];
            for (const userId of uniqueMissingUsers) {
                await fetchUserDetails(userId);
            }
        };
        if (messages.length > 0) fetchMissingUserDetails();
    }, [messages, usersCache]);

    const fetchUserDetails = async (userId) => {
        if (!userId || usersCache[userId]) return usersCache[userId];
        try {
            const res = await axios.get(`${API_BASE_URL}/api/users/${userId}`, {
                headers: { Authorization: `Bearer ${session?.accessToken}` },
            });
            const userData = res.data;
            setUsersCache((prev) => ({ ...prev, [userId]: userData }));
            return userData;
        } catch (err) {
            console.error(`Error fetching user ${userId}:`, err.message);
            return null;
        }
    };

    const handleMessageChange = (e) => {
        const value = e.target.value;
        const cleanValue = filterProfanity(value);
        setMessage(cleanValue);
        if (isProfane(value)) {
            setError('Tin nhắn chứa từ ngữ không phù hợp');
        } else if (value.length > 950) {
            setError(`Còn ${1000 - value.length} ký tự`);
        } else {
            setError('');
        }
    };

    const handleMessageSubmit = async (e) => {
        e.preventDefault();
        if (!session || session.error) {
            router.push('/login');
            return;
        }
        if (!message.trim()) {
            setError('Nội dung tin nhắn không được để trống');
            return;
        }
        if (isProfane(message)) {
            setError('Tin nhắn chứa từ ngữ không phù hợp');
            return;
        }
        try {
            const res = await axios.post(
                `${API_BASE_URL}/api/groupchat`,
                { content: message },
                { headers: { Authorization: `Bearer ${session.accessToken}` } }
            );
            console.log('Message submission response:', JSON.stringify(res.data, null, 2));
            setMessage('');
            setError('');
            if (messagesContainerRef.current) {
                messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
            }
        } catch (err) {
            console.error('Error submitting message:', err.message, err.response?.data);
            setError(err.response?.data?.message || 'Đã có lỗi khi gửi tin nhắn');
        }
    };

    const handleLoginRedirect = () => {
        router.push('/login');
    };

    const openUserModal = (user) => {
        setModalUser(user);
    };

    const closeUserModal = () => {
        setModalUser(null);
    };

    const openPrivateChat = (user) => {
        console.log('Opening private chat with user:', JSON.stringify(user, null, 2));
        if (!userInfo) {
            setError('Vui lòng đăng nhập để mở chat riêng');
            console.log('Blocked: userInfo not loaded');
            return;
        }
        const isCurrentUserAdmin = userInfo?.role === 'admin' || userInfo?.role === 'ADMIN';
        const isTargetAdmin = user.role === 'admin' || user.role === 'ADMIN';
        if (!isCurrentUserAdmin && !isTargetAdmin) {
            setError('Bạn chỉ có thể chat riêng với admin');
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
            return [...prev, { receiver: user, isMinimized: false }];
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

    const handleClick = (e, user) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Left click menu for user:', JSON.stringify(user, null, 2));
        console.log('Current userInfo:', JSON.stringify(userInfo, null, 2));
        if (!userInfo) {
            console.log('Blocked: userInfo not loaded');
            return;
        }

        // Remove existing context menu if it exists
        if (contextMenuRef.current && document.body.contains(contextMenuRef.current)) {
            document.body.removeChild(contextMenuRef.current);
            contextMenuRef.current = null;
        }

        // Create new context menu
        const menu = document.createElement('div');
        menu.className = styles.contextMenu;
        menu.innerHTML = `
            <div class="${styles.contextMenuItem}" data-action="private-chat">Chat riêng</div>
            <div class="${styles.contextMenuItem}" data-action="user-details">Chi tiết người dùng</div>
        `;
        document.body.appendChild(menu);
        contextMenuRef.current = menu;

        // Position the menu below the avatar
        const avatarElement = e.currentTarget.classList.contains(styles.avatar)
            ? e.currentTarget
            : e.currentTarget.closest(`.${styles.messageWrapper}`).querySelector(`.${styles.avatar}`);
        const rect = avatarElement.getBoundingClientRect();
        const menuRect = menu.getBoundingClientRect();
        const maxX = window.innerWidth - menuRect.width;
        const maxY = window.innerHeight - menuRect.height;
        const menuX = Math.min(rect.left + window.scrollX, maxX);
        const menuY = Math.min(rect.bottom + window.scrollY + 4, maxY); // 4px gap below avatar
        menu.style.left = `${menuX}px`;
        menu.style.top = `${menuY}px`;

        // Handle menu item clicks
        const handleMenuClick = (e) => {
            e.stopPropagation();
            const action = e.target.getAttribute('data-action');
            if (action === 'private-chat') {
                const isCurrentUserAdmin = userInfo?.role === 'admin' || userInfo?.role === 'ADMIN';
                const isTargetAdmin = user.role === 'admin' || user.role === 'ADMIN';
                if (isCurrentUserAdmin || isTargetAdmin) {
                    openPrivateChat(user);
                } else {
                    setError('Bạn chỉ có thể chat riêng với admin');
                    console.log('Blocked: User cannot open private chat with non-admin');
                }
            } else if (action === 'user-details') {
                openUserModal(user);
            }
            if (contextMenuRef.current && document.body.contains(contextMenuRef.current)) {
                document.body.removeChild(contextMenuRef.current);
                contextMenuRef.current = null;
            }
            document.removeEventListener('click', handleClickOutside);
        };

        // Handle click outside to close menu
        const handleClickOutside = (e) => {
            if (contextMenuRef.current && document.body.contains(contextMenuRef.current)) {
                if (!menu.contains(e.target)) {
                    document.body.removeChild(contextMenuRef.current);
                    contextMenuRef.current = null;
                }
            }
            document.removeEventListener('click', handleClickOutside);
        };

        menu.addEventListener('click', handleMenuClick);
        document.addEventListener('click', handleClickOutside, { once: true });
    };

    const handleContextMenu = (e, user) => {
        e.preventDefault();
        console.log('Context menu for user:', JSON.stringify(user, null, 2));
        console.log('Current userInfo:', JSON.stringify(userInfo, null, 2));
        if (!userInfo) {
            console.log('Blocked: userInfo not loaded');
            return;
        }

        // Remove existing context menu if it exists
        if (contextMenuRef.current && document.body.contains(contextMenuRef.current)) {
            document.body.removeChild(contextMenuRef.current);
        }

        // Create new context menu
        const menu = document.createElement('div');
        menu.className = styles.contextMenu;
        menu.innerHTML = `
            <div class="${styles.contextMenuItem}" data-action="private-chat">Chat riêng</div>
            <div class="${styles.contextMenuItem}" data-action="user-details">Chi tiết người dùng</div>
        `;
        document.body.appendChild(menu);
        contextMenuRef.current = menu;

        // Position the menu
        const rect = menu.getBoundingClientRect();
        const maxX = window.innerWidth - rect.width;
        const maxY = window.innerHeight - rect.height;
        menu.style.left = `${Math.min(e.pageX, maxX)}px`;
        menu.style.top = `${Math.min(e.pageY, maxY)}px`;

        // Handle menu item clicks
        const handleMenuClick = (e) => {
            e.stopPropagation();
            const action = e.target.getAttribute('data-action');
            if (action === 'private-chat') {
                const isCurrentUserAdmin = userInfo?.role === 'admin' || userInfo?.role === 'ADMIN';
                const isTargetAdmin = user.role === 'admin' || user.role === 'ADMIN';
                if (isCurrentUserAdmin || isTargetAdmin) {
                    openPrivateChat(user);
                } else {
                    setError('Bạn chỉ có thể chat riêng với admin');
                    console.log('Blocked: User cannot open private chat with non-admin');
                }
            } else if (action === 'user-details') {
                openUserModal(user);
            }
            if (contextMenuRef.current && document.body.contains(contextMenuRef.current)) {
                document.body.removeChild(contextMenuRef.current);
                contextMenuRef.current = null;
            }
            document.removeEventListener('click', handleClickOutside);
        };

        // Handle click outside to close menu
        const handleClickOutside = (e) => {
            if (contextMenuRef.current && document.body.contains(contextMenuRef.current)) {
                if (!menu.contains(e.target)) {
                    document.body.removeChild(contextMenuRef.current);
                    contextMenuRef.current = null;
                }
            }
            document.removeEventListener('click', handleClickOutside);
        };

        menu.addEventListener('click', handleMenuClick);
        document.addEventListener('click', handleClickOutside, { once: true });
    };

    return (
        <div className={styles.chatContainer}>
            <h3 className={styles.chatTitle}>Chat Cộng Đồng</h3>
            <div className={styles.messagesContainer} ref={messagesContainerRef}>
                {messages.length === 0 ? (
                    <p className={styles.noMessages}>Chưa có tin nhắn nào</p>
                ) : (
                    messages.slice().reverse().map((msg) => {
                        const displayUser = usersCache[msg.userId?._id] || msg.userId;
                        const isOwnMessage = userInfo?._id === msg.userId?._id;
                        return (
                            <div
                                key={msg._id}
                                className={`${styles.messageWrapper} ${isOwnMessage ? styles.ownMessage : ''}`}
                            >
                                <div
                                    className={styles.avatar}
                                    onClick={(e) => handleClick(e, displayUser)}
                                    onContextMenu={(e) => handleContextMenu(e, displayUser)}
                                >
                                    {displayUser?.img ? (
                                        <Image
                                            src={displayUser.img}
                                            alt={getDisplayName(displayUser.fullname)}
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
                                            {getInitials(displayUser?.fullname || 'User')}
                                        </span>
                                    )}
                                </div>
                                <div className={styles.messageContent}>
                                    <div className={styles.messageHeader}>
                                        <span
                                            className={`${styles.username} ${(displayUser?.role?.toLowerCase() === 'admin' || displayUser?.role?.toLowerCase() === 'ADMIN')
                                                ? styles.admin
                                                : styles.user
                                                }`}
                                            onClick={(e) => handleClick(e, displayUser)}
                                            onContextMenu={(e) => handleContextMenu(e, displayUser)}
                                        >
                                            {getDisplayName(displayUser?.fullname || 'User')}
                                        </span>
                                        {displayUser?.role && (
                                            <span
                                                className={`${styles.role} ${(displayUser.role.toLowerCase() === 'admin' || displayUser.role.toLowerCase() === 'ADMIN')
                                                    ? styles.admin
                                                    : styles.user
                                                    }`}
                                            >
                                                {displayUser.role}
                                            </span>
                                        )}
                                        <span className={styles.timestamp}>
                                            {moment
                                                .tz(msg.createdAt, 'Asia/Ho_Chi_Minh')
                                                .format('DD/MM/YYYY HH:mm')}
                                        </span>
                                    </div>
                                    <p className={styles.messageText}>{msg.content}</p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
            {session && !session.error ? (
                <form onSubmit={handleMessageSubmit} className={styles.inputForm}>
                    <div className={styles.inputWrapper}>
                        <textarea
                            value={message}
                            onChange={handleMessageChange}
                            placeholder="Nhập tin nhắn..."
                            className={styles.input}
                            maxLength={1000}
                        />
                        <span className={styles.charCount}>{message.length}/1000</span>
                    </div>
                    <button type="submit" className={styles.sendButton}>
                        <i className="fa-solid fa-paper-plane"></i>
                    </button>
                </form>
            ) : (
                <div className={styles.loginPrompt}>
                    <p>Vui lòng đăng nhập để gửi tin nhắn.</p>
                    <button onClick={handleLoginRedirect} className={styles.loginButton}>
                        Đăng nhập
                    </button>
                </div>
            )}
            {error && <p className={styles.error}>{error}</p>}
            {fetchError && <p className={styles.error}>{fetchError}</p>}

            {modalUser && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <button className={styles.closeButton} onClick={closeUserModal}>
                            ×
                        </button>
                        <div className={styles.modalContent}>
                            <div className={styles.modalAvatar}>
                                {modalUser?.img ? (
                                    <Image
                                        src={modalUser.img}
                                        alt={getDisplayName(modalUser.fullname)}
                                        className={styles.modalAvatarImage}
                                        width={80}
                                        height={80}
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.nextSibling.style.display = 'flex';
                                        }}
                                    />
                                ) : (
                                    <span className={styles.modalAvatarInitials}>
                                        {getInitials(modalUser?.fullname || 'User')}
                                    </span>
                                )}
                            </div>
                            <h3 className={styles.modalUsername}>
                                {getDisplayName(modalUser?.fullname || 'User')}
                            </h3>
                            {modalUser?.role && (
                                <span
                                    className={`${styles.modalRole} ${(modalUser.role.toLowerCase() === 'admin' || modalUser.role.toLowerCase() === 'ADMIN')
                                        ? styles.admin
                                        : styles.user
                                        }`}
                                >
                                    {modalUser.role}
                                </span>
                            )}
                            <p className={styles.modalDetail}>
                                Danh hiệu:{' '}
                                {modalUser?.titles?.length > 0
                                    ? modalUser.titles.join(', ')
                                    : 'Chưa có danh hiệu'}
                            </p>
                            <p className={styles.modalDetail}>
                                Cấp độ: {modalUser?.level ?? 'N/A'}
                            </p>
                            <p className={styles.modalDetail}>
                                Điểm: {modalUser?.points ?? 0}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className={styles.privateChatsContainer}>
                {privateChats.map((chat, index) => (
                    <PrivateChat
                        key={chat.receiver._id}
                        receiver={chat.receiver}
                        onClose={() => closePrivateChat(chat.receiver._id)}
                        isMinimized={chat.isMinimized}
                        onToggleMinimize={() => toggleMinimizePrivateChat(chat.receiver._id)}
                        style={{ right: `${20 + index * 320}px` }}
                    />
                ))}
            </div>
        </div>
    );
}