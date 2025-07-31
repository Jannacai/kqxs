"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useSession, signOut } from 'next-auth/react';
import axios from 'axios';
import moment from 'moment';
import 'moment-timezone';
import Image from 'next/image';
import { getSocket, isSocketConnected, addConnectionListener } from '../../utils/Socket';
import { isValidObjectId } from '../../utils/validation';
import styles from '../../styles/groupchat.module.css';
import PrivateChat from './chatrieng';
import UserInfoModal from './modals/UserInfoModal';

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
    const [selectedUser, setSelectedUser] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [privateChats, setPrivateChats] = useState([]);
    const [onlineCount, setOnlineCount] = useState(0);
    const [totalMessages, setTotalMessages] = useState(0);
    const [isRulesCollapsed, setIsRulesCollapsed] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [socketConnected, setSocketConnected] = useState(false);
    const socketRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const mountedRef = useRef(true);

    useEffect(() => {
        console.log('Session status:', status);
        console.log('Server session:', JSON.stringify(serverSession, null, 2));
        console.log('Client session:', JSON.stringify(clientSession, null, 2));
        console.log('Used session:', JSON.stringify(session, null, 2));
        if (session?.error === 'RefreshTokenExpired') {
            console.log('Refresh token expired, redirecting to login');
            setError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
            signOut({ redirect: false });
            router.push('/login?error=SessionExpired');
        }
    }, [session, serverSession, clientSession, status, router]);

    useEffect(() => {
        const fetchMessages = async () => {
            try {
                setIsLoading(true);
                const headers = session?.accessToken
                    ? { Authorization: `Bearer ${session.accessToken}`, 'Content-Type': 'application/json' }
                    : { 'Content-Type': 'application/json' };
                const res = await axios.get(`${API_BASE_URL}/api/groupchat`, { headers });
                console.log('Messages fetched:', res.data);
                const sortedMessages = res.data.messages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                setMessages(sortedMessages);
                setTotalMessages(sortedMessages.length);
            } catch (err) {
                console.error('Error fetching messages:', err.message);
                setFetchError('Không thể tải tin nhắn. Vui lòng thử lại.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchMessages();
    }, [session?.accessToken]);

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
        const fetchUserInfo = async () => {
            if (!session?.accessToken) {
                console.log('No accessToken in session');
                return;
            }
            try {
                console.log('Fetching user info with token:', session.accessToken);
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
                if (err.response?.status === 401) {
                    setError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
                    signOut({ redirect: false });
                    router.push('/login?error=SessionExpired');
                } else {
                    setFetchError(`Không thể lấy thông tin người dùng: ${err.message}`);
                }
            }
        };
        if (session && !session.error) fetchUserInfo();
    }, [session, router]);

    useEffect(() => {
        if (!session?.accessToken || !userInfo?._id) {
            console.log('Skipping Socket.IO setup: missing session or userInfo');
            return;
        }

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
                    console.log('Socket.IO connected for chat:', socket.id);
                    socket.emit('joinChat');
                    console.log('Joining private room for user:', userInfo._id);
                    socket.emit('joinPrivateRoom', userInfo._id);
                    setSocketConnected(true);
                });

                socket.on('connect_error', (err) => {
                    console.error('Socket.IO connection error:', err.message);
                    setSocketConnected(false);
                    if (err.message.includes('Authentication error')) {
                        setError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
                        signOut({ redirect: false });
                        router.push('/login?error=SessionExpired');
                    } else {
                        setFetchError('Mất kết nối thời gian thực. Vui lòng làm mới trang.');
                    }
                });

                socket.on('disconnect', () => {
                    console.log('Socket.IO disconnected for chat');
                    setSocketConnected(false);
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
                            const updatedMessages = [newMessage, ...prev];
                            setTotalMessages(updatedMessages.length);
                            return updatedMessages;
                        });
                    } else {
                        console.warn('Ignoring invalid NEW_MESSAGE:', newMessage);
                    }
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

                socket.on('USER_STATUS_UPDATED', (updatedUser) => {
                    console.log('Received USER_STATUS_UPDATED:', updatedUser);
                    if (updatedUser?._id && isValidObjectId(updatedUser._id)) {
                        setUsersCache((prev) => ({
                            ...prev,
                            [updatedUser._id]: { ...prev[updatedUser._id], isOnline: updatedUser.isOnline, lastActive: updatedUser.lastActive },
                        }));
                    }
                });

                return () => {
                    removeListener();
                    if (socketRef.current) {
                        socketRef.current.off('connect');
                        socketRef.current.off('connect_error');
                        socketRef.current.off('disconnect');
                        socketRef.current.off('NEW_MESSAGE');
                        socketRef.current.off('PRIVATE_MESSAGE');
                        socketRef.current.off('USER_STATUS_UPDATED');
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
    }, [session?.accessToken, userInfo?._id, router]);

    useEffect(() => {
        const fetchMissingUserDetails = async () => {
            const missingUsers = messages
                .filter((msg) => msg.userId?._id && !usersCache[msg.userId._id])
                .map((msg) => msg.userId._id);
            const uniqueMissingUsers = [...new Set(missingUsers)];
            for (const userId of uniqueMissingUsers) {
                try {
                    const headers = session?.accessToken
                        ? { Authorization: `Bearer ${session.accessToken}`, 'Content-Type': 'application/json' }
                        : { 'Content-Type': 'application/json' };
                    const res = await axios.get(`${API_BASE_URL}/api/users/${userId}`, { headers });
                    const userData = res.data;
                    setUsersCache((prev) => ({ ...prev, [userId]: userData }));
                } catch (err) {
                    console.error(`Error fetching user ${userId}:`, err.message);
                    setFetchError(`Không thể lấy thông tin người dùng ${userId}`);
                }
            }
        };
        if (messages.length > 0) fetchMissingUserDetails();
    }, [messages, usersCache, session?.accessToken]);

    const handleShowDetails = (user) => {
        console.log('handleShowDetails called with user:', user);
        if (!user?._id || !isValidObjectId(user._id)) {
            console.error('Invalid user ID:', user?._id);
            setError('ID người dùng không hợp lệ');
            return;
        }
        setSelectedUser(user);
        setShowModal(true);
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
            setError('Vui lòng đăng nhập để gửi tin nhắn');
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
            const headers = session?.accessToken
                ? { Authorization: `Bearer ${session.accessToken}`, 'Content-Type': 'application/json' }
                : { 'Content-Type': 'application/json' };
            const res = await axios.post(
                `${API_BASE_URL}/api/groupchat`,
                { content: message },
                { headers }
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

    const toggleRules = () => {
        setIsRulesCollapsed(!isRulesCollapsed);
    };

    const openPrivateChat = (user) => {
        console.log('openPrivateChat called with user:', JSON.stringify(user, null, 2));
        if (!userInfo) {
            setError('Vui lòng đăng nhập để mở chat riêng');
            console.log('Blocked: userInfo not loaded');
            return;
        }
        const isCurrentUserAdmin = userInfo?.role?.toLowerCase() === 'admin';
        const isTargetAdmin = user?.role?.toLowerCase() === 'admin';
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
            console.log('privateChats updated:', [...prev, { receiver: user, isMinimized: false, messages: [] }]);
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

    const getAvatarClass = (role) => {
        return role?.toLowerCase() === 'admin' ? styles.avatarA : styles.avatarB;
    };

    return (
        <div className={styles.container}>
            {/* Header Section */}
            <div className={styles.header}>
                <div className={styles.headerContent}>
                    <h1 className={styles.title}>
                        <span className={styles.titleIcon}>💬</span>
                        Giao Lưu Chốt Số
                    </h1>
                    <div className={styles.subtitle}>
                        Thảo luận và chia sẻ kinh nghiệm
                    </div>
                    <div className={styles.stats}>
                        <span className={styles.statItem}>
                            <span className={styles.statIcon}>👥</span>
                            Online: {onlineCount}
                        </span>
                        <span className={styles.statItem}>
                            <span className={styles.statIcon}>💬</span>
                            Tin nhắn: {totalMessages}
                        </span>
                    </div>
                </div>
            </div>

            {/* Rules Section - Có thể thu gọn */}
            <div className={`${styles.rulesSection} ${isRulesCollapsed ? styles.rulesCollapsed : ''}`}>
                <div className={styles.rulesHeader} onClick={toggleRules}>
                    <h3 className={styles.rulesTitle}>
                        <span className={styles.rulesIcon}>📋</span>
                        Quy Định Chat
                    </h3>
                    <button className={styles.rulesToggle}>
                        Ẩn/Hiện<span className={`${styles.toggleIcon} ${isRulesCollapsed ? styles.toggleIconCollapsed : ''}`}>
                            ▼
                        </span>
                    </button>
                </div>
                <div className={`${styles.rulesContent} ${isRulesCollapsed ? styles.rulesContentCollapsed : ''}`}>
                    <ul className={styles.rulesList}>
                        <li>Diễn đàn dành để thảo luận, phân tích, dự đoán kết quả xổ số Việt Nam</li>
                        <li>Nội dung chỉ mang tính chất tham khảo, không phải hướng dẫn</li>
                        <li>Không được khẳng định "100% chắc chắn" hoặc cam kết hoàn tiền</li>
                        <li>Không thảo luận các vấn đề không liên quan: chính trị, văn hóa, an ninh, tôn giáo, dân tộc, chính sách nhà nước</li>
                    </ul>
                </div>
            </div>

            {/* Messages Section */}
            <div className={styles.messagesSection}>
                <div className={styles.messagesContainer} ref={messagesContainerRef}>
                    {isLoading ? (
                        <div className={styles.loading}>
                            <span>Đang tải tin nhắn...</span>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className={styles.emptyState}>
                            <span className={styles.emptyIcon}>💬</span>
                            <p className={styles.emptyText}>Chưa có tin nhắn nào</p>
                            <p className={styles.emptySubtext}>Hãy là người đầu tiên gửi tin nhắn!</p>
                        </div>
                    ) : (
                        messages.slice().reverse().map((msg) => {
                            const displayUser = usersCache[msg.userId?._id] || msg.userId;
                            const isOwnMessage = userInfo?._id === msg.userId?._id;
                            return (
                                <div
                                    key={msg._id}
                                    className={`${styles.messageItem} ${isOwnMessage ? styles.ownMessage : ''}`}
                                >
                                    <div
                                        className={`${styles.avatar} ${getAvatarClass(displayUser?.role)}`}
                                        onClick={() => handleShowDetails(displayUser)}
                                        role="button"
                                        aria-label={`Xem chi tiết ${getDisplayName(displayUser.fullname)}`}
                                    >
                                        {displayUser?.img ? (
                                            <Image
                                                src={displayUser.img}
                                                alt={getDisplayName(displayUser.fullname)}
                                                className={styles.avatarImage}
                                                width={40}
                                                height={40}
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
                                                className={`${styles.username} ${getAvatarClass(displayUser?.role)}`}
                                                onClick={() => handleShowDetails(displayUser)}
                                                role="button"
                                                aria-label={`Xem chi tiết ${getDisplayName(displayUser.fullname)}`}
                                            >
                                                {getDisplayName(displayUser?.fullname || 'User')}
                                            </span>
                                            {displayUser?.role && (
                                                <span className={`${styles.role} ${getAvatarClass(displayUser?.role)}`}>
                                                    {displayUser.role}
                                                </span>
                                            )}
                                            <span className={styles.timestamp}>
                                                {moment.tz(msg.createdAt, 'Asia/Ho_Chi_Minh').format('DD/MM/YYYY HH:mm')}
                                            </span>
                                        </div>
                                        <p className={styles.messageText}>{msg.content}</p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Input Section */}
            <div className={styles.inputSection}>
                {session && !session.error ? (
                    <form onSubmit={handleMessageSubmit} className={styles.inputForm}>
                        <span className={styles.charCount}>{message.length}/1000</span>

                        <div className={styles.inputWrapper}>
                            <textarea
                                value={message}
                                onChange={handleMessageChange}
                                placeholder="Nhập tin nhắn..."
                                className={styles.input}
                                maxLength={1000}
                                rows={2}
                            />
                            <div className={styles.inputFooter}>
                                <button type="submit" className={styles.sendButton}>
                                    <span className={styles.sendIcon}>📤</span>
                                </button>
                            </div>
                        </div>
                    </form>
                ) : (
                    <div className={styles.loginPrompt}>
                        <div className={styles.loginContent}>
                            <p className={styles.loginText}>Vui lòng đăng nhập để gửi tin nhắn.</p>
                            <button onClick={handleLoginRedirect} className={styles.loginButton}>
                                Đăng nhập
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Error Display */}
            {error && (
                <div className={styles.errorContainer}>
                    <span className={styles.errorIcon}>⚠️</span>
                    <span className={styles.errorText}>{error}</span>
                </div>
            )}

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
                        style={{ right: `${20 + index * 320}px` }}
                    />
                ))}
            </div>
        </div>
    );
}