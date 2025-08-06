"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
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

// Debug environment variables
console.log('🔧 Environment Debug:');
console.log('NEXT_PUBLIC_BACKEND_URL3:', process.env.NEXT_PUBLIC_BACKEND_URL3);
console.log('API_BASE_URL:', API_BASE_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);

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
    const [isSubmitting, setIsSubmitting] = useState(false);

    const socketRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const mountedRef = useRef(true);
    const reconnectTimeoutRef = useRef(null);

    // Session management
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

    // Fetch messages with optimization
    const fetchMessages = useCallback(async () => {
        try {
            setIsLoading(true);
            const headers = session?.accessToken
                ? { Authorization: `Bearer ${session.accessToken}`, 'Content-Type': 'application/json' }
                : { 'Content-Type': 'application/json' };

            const res = await axios.get(`${API_BASE_URL}/api/groupchat`, {
                headers,
                timeout: 10000 // 10 second timeout
            });

            console.log('Messages fetched:', res.data);
            // Backend provides messages in descending order (newest first), frontend uses .reverse() to show newest at bottom
            setMessages(res.data.messages);
            setTotalMessages(res.data.messages.length);
            console.log('Messages set, total:', res.data.messages.length);
            console.log('📅 Message order check:', res.data.messages.slice(0, 3).map(m => ({
                id: m._id,
                content: m.content.substring(0, 20),
                createdAt: m.createdAt
            })));
        } catch (err) {
            console.error('Error fetching messages:', err.message);
            setFetchError('Không thể tải tin nhắn. Vui lòng thử lại.');
        } finally {
            setIsLoading(false);
        }
    }, [session?.accessToken]);

    useEffect(() => {
        fetchMessages();
    }, [fetchMessages]);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (messages.length > 0 && messagesContainerRef.current) {
            const scrollToBottom = () => {
                messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
            };

            // Scroll immediately
            scrollToBottom();

            // Also scroll after a short delay to ensure rendering is complete
            setTimeout(scrollToBottom, 100);
        }
    }, [messages.length]);

    // Scroll to bottom when component mounts
    useEffect(() => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    }, []);

    // Debug messages state
    useEffect(() => {
        console.log('📊 Messages state updated:', {
            count: messages.length,
            lastMessage: messages[messages.length - 1]?.content?.substring(0, 50),
            hasTempMessages: messages.some(msg => msg.isTemp)
        });
    }, [messages]);

    // Fetch user info with optimization
    const fetchUserInfo = useCallback(async () => {
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
                timeout: 5000
            });

            const data = res.data;
            console.log('✅ User info fetched:', data);
            console.log('✅ User ID:', data._id);
            setUserInfo(data);
            setUsersCache((prev) => ({ ...prev, [data._id]: data }));
        } catch (err) {
            console.error('❌ Error fetching user info:', err.message);
            if (err.response?.status === 401) {
                setError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
                signOut({ redirect: false });
                router.push('/login?error=SessionExpired');
            } else {
                setFetchError(`Không thể lấy thông tin người dùng: ${err.message}`);
            }
        }
    }, [session, router]);

    useEffect(() => {
        if (session && !session.error) {
            console.log('🔄 Starting user info fetch...');
            fetchUserInfo();
        }
    }, [session, fetchUserInfo]);

    // Optimized Socket.IO initialization
    useEffect(() => {
        // Use session user data as fallback if userInfo is not available
        const currentUserInfo = userInfo || (session?.user ? {
            _id: session.user.id,
            fullname: session.user.username,
            role: session.user.role
        } : null);

        if (!session?.accessToken || !currentUserInfo?._id) {
            console.log('⚠️ Skipping Socket.IO setup: missing session or userInfo');
            console.log('Session accessToken:', !!session?.accessToken);
            console.log('UserInfo _id:', currentUserInfo?._id);
            console.log('Session user:', session?.user);
            return;
        }

        mountedRef.current = true;

        const initializeSocket = async () => {
            try {
                console.log('🔄 Initializing Socket.IO for groupchat...');
                console.log('User ID:', currentUserInfo._id);
                console.log('Session token:', session.accessToken ? 'Present' : 'Missing');
                console.log('API Base URL:', API_BASE_URL);

                const socket = await getSocket();

                if (!mountedRef.current) {
                    console.log('⚠️ Component unmounted during socket initialization');
                    return;
                }

                socketRef.current = socket;
                setSocketConnected(true);
                console.log('✅ Socket reference set:', socket.id);
                console.log('🔗 Socket connected status:', socket.connected);
                console.log('🔗 Socket transport:', socket.io.engine.transport.name);

                // Authenticate socket with user token
                if (session?.accessToken) {
                    console.log('🔐 Authenticating socket with token...');
                    socket.emit('authenticate', session.accessToken);
                }

                // Connection listener with optimization
                const removeListener = addConnectionListener((connected) => {
                    console.log('🔗 Connection status changed:', connected);
                    if (mountedRef.current) {
                        setSocketConnected(connected);
                        if (!connected) {
                            console.log('⚠️ Socket connection lost, attempting reconnection...');
                        }
                    }
                });

                console.log('🎯 Setting up Socket.IO event listeners...');

                socket.on('connect', () => {
                    console.log('🎉 === SOCKET.IO CONNECTED ===');
                    console.log('✅ Socket.IO connected for chat:', socket.id);
                    console.log('🔗 Socket transport after connect:', socket.io.engine.transport.name);

                    console.log('🔐 Attempting to join chat room...');
                    console.log('🔐 Socket state before joinChat:', socket.connected);
                    socket.emit('joinChat');
                    console.log('✅ joinChat event emitted');

                    console.log('🔐 Attempting to join private room for user:', currentUserInfo._id);
                    socket.emit('joinPrivateRoom', currentUserInfo._id);
                    console.log('✅ joinPrivateRoom event emitted');

                    setSocketConnected(true);
                    setError(''); // Clear any connection errors
                    console.log('✅ Socket setup completed successfully');

                    // Verify room joining
                    setTimeout(() => {
                        console.log('🔍 Verifying room membership...');
                        socket.emit('getRooms');
                    }, 1000);

                    // Manual join chat room after a short delay to ensure connection is stable
                    setTimeout(() => {
                        console.log('🔐 Manual joinChat attempt...');
                        console.log('🔐 Socket state before manual joinChat:', socket.connected);
                        socket.emit('joinChat');
                        console.log('✅ Manual joinChat event emitted');
                    }, 500);

                    // Additional joinChat attempt after longer delay
                    setTimeout(() => {
                        console.log('🔐 Final joinChat attempt...');
                        console.log('🔐 Socket state before final joinChat:', socket.connected);
                        socket.emit('joinChat');
                        console.log('✅ Final joinChat event emitted');
                    }, 2000);
                });

                // Add room verification listener
                socket.on('rooms', (rooms) => {
                    console.log('📋 Current rooms:', rooms);
                    console.log('🔍 Checking if "chat" room is in list:', rooms.includes('chat'));
                });

                // Add connection status listener
                socket.on('connected', (data) => {
                    console.log('🔗 Connection confirmed:', data);
                });

                // Add room join confirmation listeners
                socket.on('joinedChat', (data) => {
                    console.log('✅ Successfully joined chat room:', data);
                });

                socket.on('joinedPrivateRoom', (data) => {
                    console.log('✅ Successfully joined private room:', data);
                });

                socket.on('joinError', (error) => {
                    console.error('❌ Room join error:', error);
                });

                // Direct joinChat call after connection
                if (socket.connected) {
                    console.log('🔐 Direct joinChat call (socket already connected)...');
                    socket.emit('joinChat');
                    console.log('✅ Direct joinChat event emitted');
                }

                // Manual join function for testing
                const manualJoinChat = () => {
                    if (socket && socket.connected) {
                        console.log('🔐 Manual joinChat button clicked...');
                        socket.emit('joinChat');
                        console.log('✅ Manual joinChat event emitted');
                    } else {
                        console.log('❌ Socket not connected for manual join');
                    }
                };

                // Expose manual join function globally for testing
                window.manualJoinChat = manualJoinChat;

                socket.on('connect_error', (err) => {
                    console.error('❌ Socket.IO connection error:', err.message);
                    setSocketConnected(false);

                    if (err.message.includes('Authentication error')) {
                        setError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
                        signOut({ redirect: false });
                        router.push('/login?error=SessionExpired');
                    } else {
                        setFetchError('Mất kết nối thời gian thực. Vui lòng làm mới trang.');
                    }
                });

                socket.on('disconnect', (reason) => {
                    console.log('🔌 Socket.IO disconnected for chat:', reason);
                    setSocketConnected(false);

                    // Auto-reconnect logic
                    if (reason !== 'io client disconnect' && mountedRef.current) {
                        console.log('🔄 Scheduling auto-reconnect...');
                        if (reconnectTimeoutRef.current) {
                            clearTimeout(reconnectTimeoutRef.current);
                        }
                        reconnectTimeoutRef.current = setTimeout(() => {
                            if (mountedRef.current) {
                                console.log('🔄 Attempting auto-reconnect...');
                                initializeSocket();
                            }
                        }, 3000);
                    }
                });

                // Optimized message handling
                socket.on('NEW_MESSAGE', (newMessage) => {
                    console.log('📨 Received NEW_MESSAGE:', JSON.stringify(newMessage, null, 2));

                    if (!mountedRef.current) {
                        console.log('⚠️ Component unmounted, ignoring message');
                        return;
                    }

                    if (
                        newMessage &&
                        newMessage.userId?._id &&
                        isValidObjectId(newMessage.userId._id) &&
                        newMessage.content
                    ) {
                        console.log('✅ Valid message received, processing...');
                        setUsersCache((prev) => ({
                            ...prev,
                            [newMessage.userId._id]: newMessage.userId,
                        }));

                        setMessages((prev) => {
                            // Check for duplicate messages
                            if (prev.some((msg) => msg._id === newMessage._id)) {
                                console.log('⚠️ Message already exists, skipping:', newMessage._id);
                                return prev;
                            }

                            console.log('✅ Adding new message to chat:', newMessage._id);
                            // Add new message at the beginning since backend provides descending order (newest first)
                            const updatedMessages = [newMessage, ...prev];
                            setTotalMessages(updatedMessages.length);

                            // Auto-scroll to bottom for new messages
                            setTimeout(() => {
                                if (messagesContainerRef.current) {
                                    messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
                                }
                            }, 100);

                            return updatedMessages;
                        });
                    } else {
                        console.warn('⚠️ Ignoring invalid NEW_MESSAGE:', newMessage);
                    }
                });

                socket.on('PRIVATE_MESSAGE', (newMessage) => {
                    console.log('📨 Received PRIVATE_MESSAGE:', JSON.stringify(newMessage, null, 2));
                    if (mountedRef.current) {
                        setPrivateChats((prev) =>
                            prev.map((chat) =>
                                chat.receiver._id === newMessage.senderId || chat.receiver._id === newMessage.receiverId
                                    ? { ...chat, messages: [...(chat.messages || []), newMessage] }
                                    : chat
                            )
                        );
                    }
                });

                socket.on('USER_STATUS_UPDATED', (updatedUser) => {
                    console.log('👤 Received USER_STATUS_UPDATED:', updatedUser);
                    if (mountedRef.current && updatedUser?._id && isValidObjectId(updatedUser._id)) {
                        setUsersCache((prev) => ({
                            ...prev,
                            [updatedUser._id]: {
                                ...prev[updatedUser._id],
                                isOnline: updatedUser.isOnline,
                                lastActive: updatedUser.lastActive
                            },
                        }));
                    }
                });

                return () => {
                    console.log('🧹 Cleaning up socket listeners...');
                    removeListener();
                    if (socketRef.current) {
                        socketRef.current.off('connect');
                        socketRef.current.off('connect_error');
                        socketRef.current.off('disconnect');
                        socketRef.current.off('NEW_MESSAGE');
                        socketRef.current.off('PRIVATE_MESSAGE');
                        socketRef.current.off('USER_STATUS_UPDATED');
                        socketRef.current.off('rooms');
                        socketRef.current.off('connected');
                        socketRef.current.off('joinedChat');
                        socketRef.current.off('joinedPrivateRoom');
                        socketRef.current.off('joinError');
                    }
                };
            } catch (error) {
                console.error('❌ Failed to initialize socket:', error);
                setSocketConnected(false);
            }
        };

        initializeSocket();

        return () => {
            console.log('🧹 Component cleanup - unmounting');
            mountedRef.current = false;
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, [session?.accessToken, userInfo?._id, session?.user, router]);

    // Optimized user details fetching
    useEffect(() => {
        const fetchMissingUserDetails = async () => {
            const missingUsers = messages
                .filter((msg) => msg.userId?._id && !usersCache[msg.userId._id])
                .map((msg) => msg.userId._id);

            const uniqueMissingUsers = [...new Set(missingUsers)];

            if (uniqueMissingUsers.length === 0) return;

            console.log('🔍 Fetching missing user details:', uniqueMissingUsers.length);

            const fetchPromises = uniqueMissingUsers.map(async (userId) => {
                try {
                    const headers = session?.accessToken
                        ? { Authorization: `Bearer ${session.accessToken}`, 'Content-Type': 'application/json' }
                        : { 'Content-Type': 'application/json' };

                    const res = await axios.get(`${API_BASE_URL}/api/users/${userId}`, {
                        headers,
                        timeout: 5000
                    });

                    const userData = res.data;
                    setUsersCache((prev) => ({ ...prev, [userId]: userData }));
                } catch (err) {
                    console.error(`Error fetching user ${userId}:`, err.message);
                }
            });

            await Promise.allSettled(fetchPromises);
        };

        if (messages.length > 0) {
            fetchMissingUserDetails();
        }
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

        const messageContent = message.trim();
        setMessage('');
        setError('');
        setIsSubmitting(true);

        // Use session user data as fallback if userInfo is not available
        const currentUserInfo = userInfo || (session?.user ? {
            _id: session.user.id,
            fullname: session.user.username,
            role: session.user.role
        } : null);

        if (!currentUserInfo?._id) {
            setError('Không thể xác định thông tin người dùng');
            setIsSubmitting(false);
            return;
        }

        console.log('🚀 === MESSAGE SUBMISSION START ===');
        console.log('📤 Submitting message:', messageContent);
        console.log('🔗 Socket connected:', socketConnected);
        console.log('🔗 Socket ref:', !!socketRef.current);
        console.log('👤 Current user info:', currentUserInfo);
        console.log('🌐 API URL:', `${API_BASE_URL}/api/groupchat`);

        try {
            const headers = session?.accessToken
                ? { Authorization: `Bearer ${session.accessToken}`, 'Content-Type': 'application/json' }
                : { 'Content-Type': 'application/json' };

            const res = await axios.post(
                `${API_BASE_URL}/api/groupchat`,
                { content: messageContent },
                { headers }
            );

            console.log('Message submission response:', JSON.stringify(res.data, null, 2));

            // Auto-scroll to bottom after sending
            setTimeout(() => {
                if (messagesContainerRef.current) {
                    messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
                }
            }, 100);

        } catch (err) {
            console.error('Error submitting message:', err.message, err.response?.data);
            setError(err.response?.data?.message || 'Đã có lỗi khi gửi tin nhắn');
        } finally {
            setIsSubmitting(false);
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
                        <span className={`${styles.statItem} ${socketConnected ? styles.connected : styles.disconnected}`}>
                            <span className={styles.statIcon}>
                                {socketConnected ? '🟢' : '🔴'}
                            </span>
                            {socketConnected ? 'Kết nối' : 'Mất kết nối'}
                        </span>
                        <span className={styles.statItem}>
                            <span className={styles.statIcon}>🔗</span>
                            Socket: {socketRef.current?.id ? socketRef.current.id.substring(0, 8) + '...' : 'N/A'}
                        </span>
                        <button
                            onClick={fetchMessages}
                            className={styles.refreshButton}
                            disabled={isLoading}
                        >
                            <span className={styles.refreshIcon}>🔄</span>
                            Làm mới
                        </button>
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
                        // Use .reverse() to show newest messages at the bottom
                        messages.slice().reverse().map((msg) => {
                            const displayUser = usersCache[msg.userId?._id] || msg.userId;
                            const isOwnMessage = userInfo?._id === msg.userId?._id;
                            const messageKey = msg._id;

                            console.log('🎨 Rendering message:', {
                                key: messageKey,
                                content: msg.content,
                                isOwn: isOwnMessage,
                                userId: msg.userId?._id
                            });

                            return (
                                <div
                                    key={messageKey}
                                    className={`${styles.messageItem} ${isOwnMessage ? styles.ownMessage : ''}`}
                                >
                                    <div
                                        className={`${styles.avatar} ${getAvatarClass(displayUser?.role)}`}
                                        onClick={() => handleShowDetails(displayUser)}
                                        role="button"
                                        aria-label={`Xem chi tiết ${getDisplayName(displayUser?.fullname || 'User')}`}
                                    >
                                        {displayUser?.img ? (
                                            <Image
                                                src={displayUser.img}
                                                alt={getDisplayName(displayUser?.fullname || 'User')}
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
                                                aria-label={`Xem chi tiết ${getDisplayName(displayUser?.fullname || 'User')}`}
                                            >
                                                {getDisplayName(displayUser?.fullname || 'User')}
                                                {msg.isTemp && ' (Tạm thời)'}
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
                                disabled={isSubmitting}
                            />
                            <div className={styles.inputFooter}>
                                <button
                                    type="submit"
                                    className={styles.sendButton}
                                    disabled={isSubmitting || !message.trim()}
                                >
                                    <span className={styles.sendIcon}>
                                        {isSubmitting ? '⏳' : '📤'}
                                    </span>
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