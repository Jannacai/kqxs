"use client";

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import moment from 'moment';
import 'moment-timezone';
import Image from 'next/image';
import { getSocket, isSocketConnected, addConnectionListener } from '../../utils/Socket';
import styles from '../../styles/chatrieng.module.css';

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

export default function PrivateChat({ receiver, socket, onClose, isMinimized: initialMinimized = false, onToggleMinimize, onNewChat, style }) {
    const { data: session, status } = useSession();
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState('');
    const [userInfo, setUserInfo] = useState(null);
    const [error, setError] = useState('');
    const [socketConnected, setSocketConnected] = useState(false);
    const socketRef = useRef(socket);
    const messagesContainerRef = useRef(null);
    const mountedRef = useRef(true);

    useEffect(() => {
        const fetchUserInfo = async () => {
            if (!session?.accessToken) {
                console.log('No accessToken in session');
                return;
            }
            try {
                console.log('Fetching user info with token:', session.accessToken);
                const res = await axios.get(`${API_BASE_URL}/api/auth/me`, {
                    headers: { Authorization: `Bearer ${session.accessToken}`, 'Content-Type': 'application/json' },
                });
                console.log('User info fetched:', JSON.stringify(res.data, null, 2));
                setUserInfo(res.data);
            } catch (err) {
                console.error('Error fetching user info:', err.message);
                setError('Không thể tải thông tin người dùng');
            }
        };
        if (session && status === 'authenticated') fetchUserInfo();
    }, [session, status]);

    useEffect(() => {
        if (!userInfo || !receiver?._id) {
            console.log('Skipping private chat setup: missing userInfo or receiver', { userInfo, receiver });
            return;
        }

        mountedRef.current = true;

        const initializeSocket = async () => {
            try {
                let socketInstance = socketRef.current;

                if (!socketInstance) {
                    console.log('No socket provided, initializing new connection');
                    socketInstance = await getSocket();
                    socketRef.current = socketInstance;
                }

                if (!mountedRef.current) return;

                setSocketConnected(true);

                // Thêm connection listener
                const removeListener = addConnectionListener((connected) => {
                    if (mountedRef.current) {
                        setSocketConnected(connected);
                    }
                });

                const roomId = [userInfo._id, receiver._id].sort().join('-');
                socketInstance.emit('joinPrivateRoom', roomId);
                console.log('Joining private room:', roomId);

                socketInstance.on('connect', () => {
                    console.log('Socket.IO connected for private chat:', socketInstance.id);
                    setSocketConnected(true);
                });

                socketInstance.on('connect_error', (err) => {
                    console.error('Socket.IO connection error:', err.message);
                    setSocketConnected(false);
                    setError('Mất kết nối thời gian thực. Vui lòng làm mới trang.');
                });

                socketInstance.on('disconnect', () => {
                    console.log('Socket.IO disconnected for private chat');
                    setSocketConnected(false);
                });

                socketInstance.on('PRIVATE_MESSAGE', (newMessage) => {
                    console.log('Received PRIVATE_MESSAGE:', JSON.stringify(newMessage, null, 2));
                    if (mountedRef.current) {
                        setMessages((prev) => {
                            if (prev.some((msg) => msg._id === newMessage._id)) return prev;
                            return [newMessage, ...prev];
                        });
                    }
                });

                return () => {
                    removeListener();
                    if (socketInstance) {
                        socketInstance.off('connect');
                        socketInstance.off('connect_error');
                        socketInstance.off('disconnect');
                        socketInstance.off('PRIVATE_MESSAGE');
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
    }, [userInfo, receiver, session]);

    useEffect(() => {
        if (messagesContainerRef.current && !initialMinimized) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    }, [messages, initialMinimized]);

    useEffect(() => {
        if (initialMinimized && messages.length > 0) {
            const interval = setInterval(() => {
                const header = document.querySelector(`.${styles.chatHeader}`);
                if (header) {
                    header.classList.toggle(styles.blink);
                }
            }, 500);
            return () => clearInterval(interval);
        }
    }, [messages, initialMinimized]);

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
        if (!userInfo || !receiver?._id || !message.trim()) {
            setError('Không thể gửi tin nhắn');
            return;
        }
        if (isProfane(message)) {
            setError('Tin nhắn chứa từ ngữ không phù hợp');
            return;
        }
        try {
            const res = await axios.post(
                `${API_BASE_URL}/api/groupchat`,
                { content: message, receiverId: receiver._id },
                { headers: { Authorization: `Bearer ${session.accessToken}` } }
            );
            console.log('Private message sent:', res.data);
            const newMessage = {
                _id: res.data.chat._id,
                content: message,
                userId: { _id: userInfo._id, fullname: userInfo.fullname },
                createdAt: new Date().toISOString(),
                roomId: [userInfo._id, receiver._id].sort().join('-'),
            };
            setMessages((prev) => {
                if (prev.some((msg) => msg._id === newMessage._id)) return prev;
                return [newMessage, ...prev];
            });
            socketRef.current.emit('PRIVATE_MESSAGE', newMessage);
            setMessage('');
            setError('');
        } catch (err) {
            console.error('Error sending private message:', err.response?.data?.message || err.message);
            setError(err.response?.data?.message || 'Đã có lỗi khi gửi tin nhắn');
        }
    };

    const canSendMessage = () => {
        if (!userInfo || !receiver) return false;
        console.log('Checking canSendMessage:', {
            userInfoRole: userInfo?.role,
            receiverRole: receiver?.role,
        });
        const isCurrentUserAdmin = userInfo?.role?.toLowerCase() === 'admin';
        const isReceiverAdmin = receiver?.role?.toLowerCase() === 'admin';
        return isCurrentUserAdmin || isReceiverAdmin;
    };

    const toggleMinimize = () => {
        if (onToggleMinimize) {
            console.log('Toggling minimize for receiver:', receiver._id);
            onToggleMinimize();
        }
    };

    if (!receiver) return null;

    return (
        <div className={`${styles.chatContainer} ${initialMinimized ? styles.minimized : ''}`} style={style}>
            <div className={styles.chatHeader}>
                <h3 className={styles.chatTitle}>
                    {receiver.img ? (
                        <Image
                            src={receiver.img}
                            alt={getDisplayName(receiver.fullname)}
                            className={styles.headerAvatar}
                            width={24}
                            height={24}
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                            }}
                        />
                    ) : (
                        <span className={`${styles.headerAvatarInitials} ${receiver.role?.toLowerCase() === 'admin' ? styles.admin : styles.user}`}>
                            {getInitials(receiver?.fullname || 'User')}
                        </span>
                    )}
                    <span>{getDisplayName(receiver.fullname)}</span>
                    {receiver.role && (
                        <span className={`${styles.role} ${receiver.role.toLowerCase() === 'admin' ? styles.admin : styles.user}`}>
                            {receiver.role}
                        </span>
                    )}
                </h3>
                <div className={styles.headerButtons}>
                    <button className={styles.minimizeButton} onClick={toggleMinimize}>
                        {initialMinimized ? '▲' : '▼'}
                    </button>
                    <button className={styles.closeButton} onClick={onClose}>
                        ×
                    </button>
                </div>
            </div>
            {!initialMinimized && (
                <>
                    <div className={styles.messagesContainer} ref={messagesContainerRef}>
                        {messages.length === 0 ? (
                            <p className={styles.noMessages}>Chưa có tin nhắn nào</p>
                        ) : (
                            messages.slice().reverse().map((msg) => {
                                const isOwnMessage = userInfo?._id === msg.userId._id;
                                return (
                                    <div
                                        key={msg._id || msg.createdAt}
                                        className={`${styles.messageWrapper} ${isOwnMessage ? styles.ownMessage : ''}`}
                                    >
                                        <div className={styles.avatar}>
                                            {isOwnMessage ? (
                                                userInfo?.img ? (
                                                    <Image
                                                        src={userInfo.img}
                                                        alt={getDisplayName(userInfo.fullname)}
                                                        className={styles.avatarImage}
                                                        width={36}
                                                        height={36}
                                                        onError={(e) => {
                                                            e.target.style.display = 'none';
                                                            e.target.nextSibling.style.display = 'flex';
                                                        }}
                                                    />
                                                ) : (
                                                    <span className={`${styles.avatarInitials} ${userInfo?.role?.toLowerCase() === 'admin' ? styles.admin : styles.user}`}>
                                                        {getInitials(userInfo?.fullname || 'User')}
                                                    </span>
                                                )
                                            ) : receiver?.img ? (
                                                <Image
                                                    src={receiver.img}
                                                    alt={getDisplayName(receiver.fullname)}
                                                    className={styles.avatarImage}
                                                    width={36}
                                                    height={36}
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                        e.target.nextSibling.style.display = 'flex';
                                                    }}
                                                />
                                            ) : (
                                                <span className={`${styles.avatarInitials} ${receiver?.role?.toLowerCase() === 'admin' ? styles.admin : styles.user}`}>
                                                    {getInitials(receiver?.fullname || 'User')}
                                                </span>
                                            )}
                                        </div>
                                        <div className={styles.messageContent}>
                                            <div className={styles.messageHeader}>
                                                <span
                                                    className={`${styles.username} ${isOwnMessage
                                                        ? userInfo?.role?.toLowerCase() === 'admin'
                                                            ? styles.admin
                                                            : styles.user
                                                        : receiver?.role?.toLowerCase() === 'admin'
                                                            ? styles.admin
                                                            : styles.user
                                                        }`}
                                                >
                                                    {getDisplayName(
                                                        isOwnMessage ? userInfo?.fullname : receiver?.fullname || 'User'
                                                    )}
                                                </span>
                                                {(isOwnMessage ? userInfo?.role : receiver?.role) && (
                                                    <span
                                                        className={`${styles.role} ${isOwnMessage
                                                            ? userInfo?.role?.toLowerCase() === 'admin'
                                                                ? styles.admin
                                                                : styles.user
                                                            : receiver?.role?.toLowerCase() === 'admin'
                                                                ? styles.admin
                                                                : styles.user
                                                            }`}
                                                    >
                                                        {isOwnMessage ? userInfo?.role : receiver?.role}
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
                    {canSendMessage() ? (
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
                            <p>Bạn chỉ có thể gửi tin nhắn riêng tới admin.</p>
                        </div>
                    )}
                    {error && <p className={styles.error}>{error}</p>}
                </>
            )}
        </div>
    );
}