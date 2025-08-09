"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import moment from 'moment';
import 'moment-timezone';
import Image from 'next/image';
import { getSocket, isSocketConnected, addConnectionListener, getCurrentSocket, isSocketConnecting, getLastSocketError } from '../../../utils/Socket';
import { isValidObjectId } from '../../../utils/validation';
import styles from '../../../styles/CommentSection.module.css';
import UserInfoModal from '../modals/UserInfoModal';
import PrivateChat from '../chatrieng';

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

const getAvatarClass = (role) => {
    return role?.toLowerCase() === 'admin' ? styles.avatarA : styles.avatarB;
};

const profaneWords = ['kẹt', 'chửi', 'lồn', 'đụ', 'địt', 'cẹt', 'cược', 'má', 'lồnn', 'lonn', 'lồnnn'];
const profaneRegex = new RegExp(profaneWords.join('|'), 'gi');
const vowelRegex = /[ẹáàảãạíìỉĩịóòỏõọúùủũụéèẻẽẹ]/g;

const filterProfanity = (text) => {
    return text.replace(profaneRegex, (match) => {
        return match.replace(vowelRegex, '*');
    });
};

const isProfane = (text) => {
    return profaneRegex.test(text);
};

export default function CommentSection({ comments = [], session, eventId, setItem, error, setError }) {
    const router = useRouter();
    const [comment, setComment] = useState('');
    const [reply, setReply] = useState('');
    const [userInfo, setUserInfo] = useState(null);
    const [fetchError, setFetchError] = useState(null);
    const [usersCache, setUsersCache] = useState({});
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null);
    const [expandedReplies, setExpandedReplies] = useState({});
    const [selectedUser, setSelectedUser] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [privateChats, setPrivateChats] = useState([]);
    const [socketConnected, setSocketConnected] = useState(false);
    const socketRef = useRef(null);
    const commentsContainerRef = useRef(null);
    const repliesContainerRefs = useRef({});
    const mountedRef = useRef(true);

    console.log('CommentSection initialized with eventId:', eventId);

    const fetchUserInfo = async () => {
        if (!session?.accessToken) {
            console.log('❌ [CommentSection] No access token for user info fetch');
            return null;
        }
        try {
            console.log('🔍 [CommentSection] Fetching user info from:', `${API_BASE_URL}/api/auth/me`);
            const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
                headers: {
                    Authorization: `Bearer ${session.accessToken}`,
                    "User-Agent": "CommentSection-Client",
                },
            });
            if (!res.ok) {
                const errorText = await res.json();
                throw new Error(`Không thể lấy thông tin: ${errorText.error}`);
            }
            const data = await res.json();
            console.log('✅ [CommentSection] User info fetched successfully:', {
                userId: data._id,
                fullname: data.fullname,
                role: data.role
            });
            setUserInfo(data);
            setUsersCache((prev) => ({ ...prev, [data._id]: data }));
            return data;
        } catch (error) {
            console.error('❌ [CommentSection] Error fetching user info:', error);
            setFetchError(error.message);
            return null;
        }
    };

    const handleCommentChange = (e) => {
        const value = e.target.value;
        const cleanValue = filterProfanity(value);
        setComment(cleanValue);
        if (isProfane(value)) {
            setError('Bình luận chứa từ ngữ không phù hợp');
        } else if (value.length > 950) {
            setError(`Còn ${1000 - value.length} ký tự`);
        } else {
            setError('');
        }
    };

    const handleReplyChange = (e) => {
        const value = e.target.value;
        const cleanValue = filterProfanity(value);
        setReply(cleanValue);
        if (isProfane(value)) {
            setError('Bình luận chứa từ ngữ không phù hợp');
        } else if (value.length > 950) {
            setError(`Còn ${1000 - value.length} ký tự`);
        } else {
            setError('');
        }
    };

    const handleShowDetails = (user) => {
        setSelectedUser(user);
        setShowModal(true);
    };

    const openPrivateChat = (user) => {
        if (!user || !user._id) {
            console.error('Invalid user for private chat:', user);
            return;
        }
        setPrivateChats((prev) => {
            const existingChat = prev.find((chat) => chat.receiver._id === user._id);
            if (existingChat) {
                return prev.map((chat) =>
                    chat.receiver._id === user._id ? { ...chat, isMinimized: false } : chat
                );
            }
            return [...prev, { receiver: user, isMinimized: false }];
        });
    };

    const closePrivateChat = (receiverId) => {
        setPrivateChats((prev) => prev.filter((chat) => chat.receiver._id !== receiverId));
    };

    const toggleMinimizePrivateChat = (receiverId) => {
        setPrivateChats((prev) =>
            prev.map((chat) =>
                chat.receiver._id === receiverId ? { ...chat, isMinimized: !chat.isMinimized } : chat
            )
        );
    };

    useEffect(() => {
        if (session?.accessToken) {
            console.log('🔍 [CommentSection] Session available, fetching user info');
            fetchUserInfo();
        } else {
            console.log('🔍 [CommentSection] No session available for user info fetch');
        }
    }, [session]);

    useEffect(() => {
        const fetchMissingUserDetails = async () => {
            const missingUsers = new Set();
            sortedComments.forEach((comment) => {
                if (comment.userId?._id && !usersCache[comment.userId._id]) {
                    missingUsers.add(comment.userId._id);
                }
                (comment.replies || []).forEach((reply) => {
                    if (reply.userId?._id && !usersCache[reply.userId._id]) {
                        missingUsers.add(reply.userId._id);
                    }
                });
            });

            if (missingUsers.size > 0) {
                setIsLoadingUsers(true);
                try {
                    const userIds = Array.from(missingUsers);
                    const res = await axios.get(`${API_BASE_URL}/api/users/batch`, {
                        params: { userIds: userIds.join(',') },
                        headers: { Authorization: `Bearer ${session?.accessToken}` },
                    });
                    const newUsers = res.data.users || [];
                    setUsersCache((prev) => {
                        const updated = { ...prev };
                        newUsers.forEach((user) => {
                            updated[user._id] = user;
                        });
                        return updated;
                    });
                } catch (err) {
                    console.error('Error fetching missing user details:', err.message);
                } finally {
                    setIsLoadingUsers(false);
                }
            }
        };

        if (sortedComments.length > 0) {
            fetchMissingUserDetails();
        }
    }, [comments, usersCache, session?.accessToken]);

    useEffect(() => {
        if (!session?.accessToken || !userInfo?._id) {
            console.log('🔍 [CommentSection] Skipping Socket.IO setup: missing session or userInfo', {
                hasSession: !!session,
                hasAccessToken: !!session?.accessToken,
                hasUserInfo: !!userInfo,
                userId: userInfo?._id
            });
            return;
        }

        console.log('🚀 [CommentSection] Starting Socket.IO initialization for event:', eventId, {
            userId: userInfo._id,
            socketConnected: socketConnected,
            eventId: eventId
        });

        mountedRef.current = true;

        const initializeSocket = async () => {
            try {
                // Kiểm tra xem đã có socket instance chưa
                let socket = getCurrentSocket();

                if (!socket) {
                    console.log('🔌 [CommentSection] Creating new Socket.IO connection...');
                    socket = await getSocket();
                } else if (socket.connected) {
                    console.log('🔌 [CommentSection] Using existing Socket.IO connection:', socket.id);
                } else {
                    console.log('🔌 [CommentSection] Socket exists but not connected, waiting for connection...');
                }

                if (!mountedRef.current) {
                    console.log('🔌 [CommentSection] Component unmounted during socket initialization');
                    return;
                }

                socketRef.current = socket;
                setSocketConnected(socket.connected);

                console.log('🔌 [CommentSection] Socket state after initialization:', {
                    socketId: socket.id,
                    connected: socket.connected,
                    eventId: eventId
                });

                // Authenticate với socket server
                if (session?.accessToken) {
                    console.log('🔐 [CommentSection] Authenticating socket with token...');
                    socket.emit('authenticate', session.accessToken);
                }

                // Thêm connection listener
                const removeListener = addConnectionListener((connected) => {
                    console.log('🔌 [CommentSection] Connection state changed:', connected);
                    if (mountedRef.current) {
                        setSocketConnected(connected);
                        if (connected) {
                            console.log('🔌 [CommentSection] Socket.IO reconnected, joining event:', eventId);
                            socket.emit('joinEvent', eventId);

                            // Re-authenticate sau khi reconnect
                            if (session?.accessToken) {
                                console.log('🔐 [CommentSection] Re-authenticating after reconnect...');
                                socket.emit('authenticate', session.accessToken);
                            }
                        }
                    }
                });

                // Nếu đã kết nối, join event ngay lập tức
                if (socket.connected) {
                    console.log('🔌 [CommentSection] Socket.IO already connected, joining event:', eventId);
                    socket.emit('joinEvent', eventId);
                }

                socket.on('connect', () => {
                    console.log('🔌 [CommentSection] Socket.IO connected for comments:', socket.id);
                    socket.emit('joinEvent', eventId);
                    setSocketConnected(true);

                    // Authenticate sau khi connect
                    if (session?.accessToken) {
                        console.log('🔐 [CommentSection] Authenticating after connect...');
                        socket.emit('authenticate', session.accessToken);
                    }
                });

                socket.on('connect_error', (err) => {
                    console.error('❌ [CommentSection] Socket.IO connection error:', err.message);
                    setSocketConnected(false);
                    setFetchError('Mất kết nối thời gian thực. Vui lòng làm mới trang.');
                });

                socket.on('disconnect', () => {
                    console.log('🔌 [CommentSection] Socket.IO disconnected for comments');
                    setSocketConnected(false);
                });

                socket.on('NEW_COMMENT', (newComment) => {
                    console.log('📨 [CommentSection] Received NEW_COMMENT:', {
                        commentId: newComment._id,
                        eventId: newComment.eventId,
                        expectedEventId: eventId,
                        userId: newComment.userId?._id,
                        content: newComment.content?.substring(0, 50) + '...',
                        isOwnComment: userInfo?._id === newComment.userId?._id
                    });

                    if (mountedRef.current && newComment.eventId === eventId) {
                        console.log('✅ [CommentSection] Processing NEW_COMMENT for current event');
                        setItem((prev) => {
                            // Kiểm tra xem comment đã tồn tại chưa
                            if (prev.comments && prev.comments.some((comment) => comment._id === newComment._id)) {
                                console.log('⚠️ [CommentSection] Comment already exists, skipping:', newComment._id);
                                return prev;
                            }

                            // Kiểm tra xem có phải comment của chính mình không (để thay thế comment tạm thời)
                            const isOwnComment = userInfo?._id === newComment.userId?._id;
                            if (isOwnComment) {
                                // Tìm và thay thế comment tạm thời
                                const hasTempComment = prev.comments && prev.comments.some(comment => comment.isTemp && comment.content === newComment.content);
                                if (hasTempComment) {
                                    console.log('🔄 [CommentSection] Replacing temp comment with real comment:', newComment._id);
                                    const filtered = prev.comments.filter(comment => !(comment.isTemp && comment.content === newComment.content));
                                    return { ...prev, comments: [newComment, ...filtered] };
                                }
                            }

                            // Thêm comment mới vào đầu array
                            const updatedComments = prev.comments ? [newComment, ...prev.comments] : [newComment];
                            console.log('✅ [CommentSection] Added new comment for event:', eventId, 'total:', updatedComments.length);
                            return { ...prev, comments: updatedComments };
                        });
                    } else {
                        console.log('❌ [CommentSection] Ignoring NEW_COMMENT:', {
                            mounted: mountedRef.current,
                            eventMatch: newComment.eventId === eventId,
                            commentEventId: newComment.eventId,
                            currentEventId: eventId
                        });
                    }
                });

                socket.on('NEW_REPLY', (newReply) => {
                    console.log('📨 [CommentSection] Received NEW_REPLY:', {
                        replyId: newReply._id,
                        commentId: newReply.commentId,
                        eventId: newReply.eventId,
                        expectedEventId: eventId,
                        userId: newReply.userId?._id,
                        content: newReply.content?.substring(0, 50) + '...',
                        isOwnReply: userInfo?._id === newReply.userId?._id
                    });

                    if (mountedRef.current && newReply.eventId === eventId) {
                        console.log('✅ [CommentSection] Processing NEW_REPLY for current event');
                        setItem((prev) =>
                            prev.comments ? {
                                ...prev,
                                comments: prev.comments.map((comment) =>
                                    comment._id === newReply.commentId
                                        ? {
                                            ...comment,
                                            replies: (() => {
                                                const existingReplies = comment.replies || [];

                                                // Kiểm tra xem reply đã tồn tại chưa
                                                if (existingReplies.some(reply => reply._id === newReply._id)) {
                                                    console.log('⚠️ [CommentSection] Reply already exists, skipping:', newReply._id);
                                                    return existingReplies;
                                                }

                                                // Kiểm tra xem có phải reply của chính mình không (để thay thế reply tạm thời)
                                                const isOwnReply = userInfo?._id === newReply.userId?._id;
                                                if (isOwnReply) {
                                                    // Tìm và thay thế reply tạm thời
                                                    const hasTempReply = existingReplies.some(reply => reply.isTemp && reply.content === newReply.content);
                                                    if (hasTempReply) {
                                                        console.log('🔄 [CommentSection] Replacing temp reply with real reply:', newReply._id);
                                                        const filtered = existingReplies.filter(reply => !(reply.isTemp && reply.content === newReply.content));
                                                        return [...filtered, newReply];
                                                    }
                                                }

                                                // Thêm reply mới vào cuối array
                                                const updatedReplies = [...existingReplies, newReply];
                                                console.log('✅ [CommentSection] Added new reply to comment:', comment._id, 'for event:', eventId, 'total replies:', updatedReplies.length);
                                                return updatedReplies;
                                            })()
                                        }
                                        : comment
                                )
                            } : prev
                        );
                    } else {
                        console.log('❌ [CommentSection] Ignoring NEW_REPLY:', {
                            mounted: mountedRef.current,
                            eventMatch: newReply.eventId === eventId,
                            replyEventId: newReply.eventId,
                            currentEventId: eventId
                        });
                    }
                });

                socket.on('COMMENT_LIKED', (data) => {
                    console.log('👍 [CommentSection] Received COMMENT_LIKED:', {
                        commentId: data.commentId,
                        eventId: data.eventId,
                        expectedEventId: eventId,
                        action: data.action,
                        isLiked: data.isLiked
                    });

                    if (mountedRef.current && data.eventId === eventId) {
                        console.log('✅ [CommentSection] Processing COMMENT_LIKED for current event');
                        setItem((prev) =>
                            prev.comments ? {
                                ...prev,
                                comments: prev.comments.map((comment) =>
                                    comment._id === data.commentId
                                        ? { ...comment, likes: data.likes, isLiked: data.isLiked }
                                        : comment
                                )
                            } : prev
                        );
                    }
                });

                socket.on('REPLY_LIKED', (data) => {
                    console.log('👍 [CommentSection] Received REPLY_LIKED:', {
                        replyId: data.replyId,
                        commentId: data.commentId,
                        eventId: data.eventId,
                        expectedEventId: eventId,
                        action: data.action,
                        isLiked: data.isLiked
                    });

                    if (mountedRef.current && data.eventId === eventId) {
                        console.log('✅ [CommentSection] Processing REPLY_LIKED for current event');
                        setItem((prev) =>
                            prev.comments ? {
                                ...prev,
                                comments: prev.comments.map((comment) =>
                                    comment._id === data.commentId
                                        ? {
                                            ...comment,
                                            replies: comment.replies.map((reply) =>
                                                reply._id === data.replyId
                                                    ? { ...reply, likes: data.likes, isLiked: data.isLiked }
                                                    : reply
                                            ),
                                        }
                                        : comment
                                )
                            } : prev
                        );
                    }
                });

                socket.on('COMMENT_DELETED', (data) => {
                    console.log('🗑️ [CommentSection] Received COMMENT_DELETED:', {
                        commentId: data.commentId,
                        eventId: data.eventId,
                        expectedEventId: eventId
                    });

                    if (mountedRef.current && data.eventId === eventId) {
                        console.log('✅ [CommentSection] Processing COMMENT_DELETED for current event');
                        setItem((prev) =>
                            prev.comments ? {
                                ...prev,
                                comments: prev.comments.filter((comment) => comment._id !== data.commentId)
                            } : prev
                        );
                    }
                });

                socket.on('REPLY_DELETED', (data) => {
                    console.log('🗑️ [CommentSection] Received REPLY_DELETED:', {
                        replyId: data.replyId,
                        commentId: data.commentId,
                        eventId: data.eventId,
                        expectedEventId: eventId
                    });

                    if (mountedRef.current && data.eventId === eventId) {
                        console.log('✅ [CommentSection] Processing REPLY_DELETED for current event');
                        setItem((prev) =>
                            prev.comments ? {
                                ...prev,
                                comments: prev.comments.map((comment) =>
                                    comment._id === data.commentId
                                        ? {
                                            ...comment,
                                            replies: comment.replies.filter((reply) => reply._id !== data.replyId),
                                        }
                                        : comment
                                )
                            } : prev
                        );
                    }
                });

                socket.on('USER_UPDATED', (data) => {
                    console.log('👤 [CommentSection] Received USER_UPDATED:', {
                        userId: data._id,
                        fullname: data.fullname
                    });

                    if (mountedRef.current && data?._id && isValidObjectId(data._id)) {
                        setUsersCache((prev) => ({ ...prev, [data._id]: data }));
                    }
                });

                socket.on('PRIVATE_MESSAGE', (newMessage) => {
                    console.log('💬 [CommentSection] Received PRIVATE_MESSAGE:', {
                        messageId: newMessage._id,
                        senderId: newMessage.senderId,
                        receiverId: newMessage.receiverId,
                        content: newMessage.content?.substring(0, 50) + '...'
                    });

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

                return () => {
                    console.log('🧹 [CommentSection] Cleaning up socket listeners');
                    removeListener();
                    if (socketRef.current) {
                        socketRef.current.off('connect');
                        socketRef.current.off('connect_error');
                        socketRef.current.off('disconnect');
                        socketRef.current.off('NEW_COMMENT');
                        socketRef.current.off('NEW_REPLY');
                        socketRef.current.off('COMMENT_LIKED');
                        socketRef.current.off('REPLY_LIKED');
                        socketRef.current.off('COMMENT_DELETED');
                        socketRef.current.off('REPLY_DELETED');
                        socketRef.current.off('USER_UPDATED');
                        socketRef.current.off('PRIVATE_MESSAGE');
                    }
                };
            } catch (error) {
                console.error('❌ [CommentSection] Failed to initialize socket:', error);
                setSocketConnected(false);
            }
        };

        initializeSocket();

        return () => {
            console.log('🧹 [CommentSection] Component unmounting, setting mountedRef to false');
            mountedRef.current = false;
        };
    }, [session?.accessToken, userInfo?._id, eventId]);

    useEffect(() => {
        const handleScroll = () => {
            if (commentsContainerRef.current) {
                const { scrollTop, scrollHeight, clientHeight } = commentsContainerRef.current;
                const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
                if (isAtBottom) {
                    // Auto-scroll to bottom when new comments arrive
                    commentsContainerRef.current.scrollTop = commentsContainerRef.current.scrollHeight;
                }
            }
        };

        if (commentsContainerRef.current) {
            commentsContainerRef.current.addEventListener('scroll', handleScroll);
            return () => {
                if (commentsContainerRef.current) {
                    commentsContainerRef.current.removeEventListener('scroll', handleScroll);
                }
            };
        }
    }, []);

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        console.log('📝 [CommentSection] Starting comment submission...', {
            hasSession: !!session,
            hasEventId: !!eventId,
            eventId: eventId,
            commentLength: comment.length,
            userInfo: userInfo?._id
        });

        if (!session) {
            console.log('❌ [CommentSection] No session, redirecting to login');
            router.push('/login');
            return;
        }
        if (!eventId || !isValidObjectId(eventId)) {
            console.log('❌ [CommentSection] Invalid eventId:', eventId);
            setError('ID sự kiện không hợp lệ');
            return;
        }
        if (!comment.trim()) {
            console.log('❌ [CommentSection] Empty comment content');
            setError('Vui lòng nhập nội dung bình luận');
            return;
        }
        if (isProfane(comment)) {
            console.log('❌ [CommentSection] Comment contains profanity');
            setError('Bình luận chứa từ ngữ không phù hợp');
            return;
        }

        // Kiểm tra userInfo trước khi tiếp tục
        if (!userInfo || !userInfo._id) {
            console.log('❌ [CommentSection] No userInfo available, fetching user info first');
            try {
                const fetchedUser = await fetchUserInfo();

                if (!fetchedUser || !fetchedUser._id) {
                    console.log('❌ [CommentSection] Still no userInfo after fetch, redirecting to login');
                    setError('Không thể lấy thông tin người dùng. Vui lòng đăng nhập lại.');
                    router.push('/login');
                    return;
                }

                // Sử dụng fetchedUser thay vì userInfo
                console.log('✅ [CommentSection] Using fetched user info:', {
                    userId: fetchedUser._id,
                    fullname: fetchedUser.fullname
                });

                const commentContent = comment.trim();
                const tempId = `temp_${Date.now()}`;
                setComment('');
                setError('');

                console.log('📝 [CommentSection] Creating temp comment with fetched user:', {
                    tempId: tempId,
                    content: commentContent,
                    eventId: eventId,
                    userId: fetchedUser._id
                });

                try {
                    // Tạo comment tạm thời để hiển thị ngay lập tức
                    const tempComment = {
                        _id: tempId,
                        content: commentContent,
                        userId: { _id: fetchedUser._id, fullname: fetchedUser.fullname, role: fetchedUser.role },
                        createdAt: new Date().toISOString(),
                        eventId: eventId,
                        likes: [],
                        replies: [],
                        isTemp: true
                    };

                    // Thêm comment tạm thời vào state
                    setItem(prev => ({
                        ...prev,
                        comments: [tempComment, ...(prev.comments || [])]
                    }));

                    console.log('📝 [CommentSection] Submitting comment to backend:', {
                        url: `${API_BASE_URL}/api/events/${eventId}/comments`,
                        content: commentContent,
                        eventId: eventId,
                        tempId: tempId
                    });

                    const res = await axios.post(
                        `${API_BASE_URL}/api/events/${eventId}/comments`,
                        { content: commentContent },
                        {
                            headers: {
                                Authorization: `Bearer ${session?.accessToken}`,
                                'Content-Type': 'application/json'
                            },
                            timeout: 15000 // 15 giây timeout
                        }
                    );

                    console.log('✅ [CommentSection] Comment submitted successfully:', {
                        responseStatus: res.status,
                        responseData: res.data,
                        tempId: tempId
                    });

                    // Backend trả về { message: '...', event: populatedEvent }
                    // Cần lấy comments từ event
                    if (res.data.event && res.data.event.comments) {
                        console.log('🔄 [CommentSection] Updating comments from backend response:', {
                            commentCount: res.data.event.comments.length,
                            tempId: tempId
                        });
                        setItem(prev => ({
                            ...prev,
                            comments: res.data.event.comments
                        }));
                    } else {
                        console.log('⚠️ [CommentSection] No event data in response, keeping temp comment');
                    }

                } catch (err) {
                    console.error('❌ [CommentSection] Error submitting comment:', {
                        error: err.message,
                        response: err.response?.data,
                        status: err.response?.status,
                        tempId: tempId
                    });

                    // Xử lý các loại lỗi khác nhau
                    let errorMessage = 'Đã có lỗi khi gửi bình luận';

                    if (err.code === 'ECONNABORTED') {
                        errorMessage = 'Kết nối bị timeout. Vui lòng thử lại.';
                    } else if (err.response?.status === 401) {
                        errorMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
                        router.push('/login');
                    } else if (err.response?.status === 403) {
                        errorMessage = 'Bạn không có quyền gửi bình luận.';
                    } else if (err.response?.status === 429) {
                        errorMessage = 'Bạn đã gửi quá nhiều bình luận. Vui lòng chờ một lúc.';
                    } else if (err.response?.data?.message) {
                        errorMessage = err.response.data.message;
                    } else if (err.message.includes('Network Error')) {
                        errorMessage = 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet.';
                    }

                    setError(errorMessage);

                    // Xóa comment tạm thời nếu gửi thất bại
                    console.log('🗑️ [CommentSection] Removing temp comment due to error:', tempId);
                    setItem(prev => ({
                        ...prev,
                        comments: (prev.comments || []).filter(comment => comment._id !== tempId)
                    }));
                }

                return; // Thoát khỏi hàm sau khi xử lý với fetchedUser
            } catch (error) {
                console.error('❌ [CommentSection] Error fetching user info:', error);
                setError('Không thể lấy thông tin người dùng. Vui lòng đăng nhập lại.');
                router.push('/login');
                return;
            }
        }

        const commentContent = comment.trim();
        const tempId = `temp_${Date.now()}`;
        setComment('');
        setError('');

        console.log('📝 [CommentSection] Creating temp comment:', {
            tempId: tempId,
            content: commentContent,
            eventId: eventId,
            userId: userInfo._id
        });

        try {
            // Tạo comment tạm thời để hiển thị ngay lập tức
            const tempComment = {
                _id: tempId,
                content: commentContent,
                userId: { _id: userInfo._id, fullname: userInfo.fullname, role: userInfo.role },
                createdAt: new Date().toISOString(),
                eventId: eventId,
                likes: [],
                replies: [],
                isTemp: true
            };

            // Thêm comment tạm thời vào state
            setItem(prev => ({
                ...prev,
                comments: [tempComment, ...(prev.comments || [])]
            }));

            console.log('📝 [CommentSection] Submitting comment to backend:', {
                url: `${API_BASE_URL}/api/events/${eventId}/comments`,
                content: commentContent,
                eventId: eventId,
                tempId: tempId
            });

            const res = await axios.post(
                `${API_BASE_URL}/api/events/${eventId}/comments`,
                { content: commentContent },
                {
                    headers: {
                        Authorization: `Bearer ${session?.accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 15000 // 15 giây timeout
                }
            );

            console.log('✅ [CommentSection] Comment submitted successfully:', {
                responseStatus: res.status,
                responseData: res.data,
                tempId: tempId
            });

            // Backend trả về { message: '...', event: populatedEvent }
            // Cần lấy comments từ event
            if (res.data.event && res.data.event.comments) {
                console.log('🔄 [CommentSection] Updating comments from backend response:', {
                    commentCount: res.data.event.comments.length,
                    tempId: tempId
                });
                setItem(prev => ({
                    ...prev,
                    comments: res.data.event.comments
                }));
            } else {
                console.log('⚠️ [CommentSection] No event data in response, keeping temp comment');
            }

        } catch (err) {
            console.error('❌ [CommentSection] Error submitting comment:', {
                error: err.message,
                response: err.response?.data,
                status: err.response?.status,
                tempId: tempId
            });

            // Xử lý các loại lỗi khác nhau
            let errorMessage = 'Đã có lỗi khi gửi bình luận';

            if (err.code === 'ECONNABORTED') {
                errorMessage = 'Kết nối bị timeout. Vui lòng thử lại.';
            } else if (err.response?.status === 401) {
                errorMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
                router.push('/login');
            } else if (err.response?.status === 403) {
                errorMessage = 'Bạn không có quyền gửi bình luận.';
            } else if (err.response?.status === 429) {
                errorMessage = 'Bạn đã gửi quá nhiều bình luận. Vui lòng chờ một lúc.';
            } else if (err.response?.data?.message) {
                errorMessage = err.response.data.message;
            } else if (err.message.includes('Network Error')) {
                errorMessage = 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet.';
            }

            setError(errorMessage);

            // Xóa comment tạm thời nếu gửi thất bại
            console.log('🗑️ [CommentSection] Removing temp comment due to error:', tempId);
            setItem(prev => ({
                ...prev,
                comments: (prev.comments || []).filter(comment => comment._id !== tempId)
            }));
        }
    };

    const handleReplySubmit = async (e, commentId) => {
        e.preventDefault();
        console.log('📝 [CommentSection] Starting reply submission...', {
            hasSession: !!session,
            hasEventId: !!eventId,
            commentId: commentId,
            replyLength: reply.length,
            userInfo: userInfo?._id
        });

        if (!session) {
            console.log('❌ [CommentSection] No session, redirecting to login');
            router.push('/login');
            return;
        }
        if (!eventId || !isValidObjectId(eventId) || !isValidObjectId(commentId)) {
            console.log('❌ [CommentSection] Invalid IDs:', { eventId, commentId });
            setError('ID không hợp lệ');
            return;
        }
        if (!reply.trim()) {
            console.log('❌ [CommentSection] Empty reply content');
            setError('Vui lòng nhập nội dung trả lời');
            return;
        }
        if (isProfane(reply)) {
            console.log('❌ [CommentSection] Reply contains profanity');
            setError('Bình luận chứa từ ngữ không phù hợp');
            return;
        }

        // Kiểm tra userInfo trước khi tiếp tục
        if (!userInfo || !userInfo._id) {
            console.log('❌ [CommentSection] No userInfo available for reply, fetching user info first');
            try {
                const fetchedUser = await fetchUserInfo();

                if (!fetchedUser || !fetchedUser._id) {
                    console.log('❌ [CommentSection] Still no userInfo after fetch for reply, redirecting to login');
                    setError('Không thể lấy thông tin người dùng. Vui lòng đăng nhập lại.');
                    router.push('/login');
                    return;
                }

                // Sử dụng fetchedUser thay vì userInfo
                console.log('✅ [CommentSection] Using fetched user info for reply:', {
                    userId: fetchedUser._id,
                    fullname: fetchedUser.fullname
                });

                const replyContent = reply.trim();
                const tempReplyId = `temp_${Date.now()}`;
                setReply('');
                setReplyingTo(null);
                setError('');

                console.log('📝 [CommentSection] Creating temp reply with fetched user:', {
                    tempReplyId: tempReplyId,
                    content: replyContent,
                    commentId: commentId,
                    userId: fetchedUser._id
                });

                try {
                    // Tạo reply tạm thời để hiển thị ngay lập tức
                    const tempReply = {
                        _id: tempReplyId,
                        content: replyContent,
                        userId: { _id: fetchedUser._id, fullname: fetchedUser.fullname, role: fetchedUser.role },
                        createdAt: new Date().toISOString(),
                        commentId: commentId,
                        likes: [],
                        isTemp: true
                    };

                    // Thêm reply tạm thời vào state
                    setItem(prev => ({
                        ...prev,
                        comments: (prev.comments || []).map(comment =>
                            comment._id === commentId
                                ? { ...comment, replies: [...(comment.replies || []), tempReply] }
                                : comment
                        )
                    }));

                    console.log('📝 [CommentSection] Submitting reply to backend:', {
                        url: `${API_BASE_URL}/api/events/${eventId}/comments/${commentId}/reply`,
                        content: replyContent,
                        eventId: eventId,
                        commentId: commentId,
                        tempReplyId: tempReplyId
                    });

                    const res = await axios.post(
                        `${API_BASE_URL}/api/events/${eventId}/comments/${commentId}/reply`,
                        { content: replyContent },
                        {
                            headers: { Authorization: `Bearer ${session?.accessToken}` },
                            timeout: 15000
                        }
                    );

                    console.log('✅ [CommentSection] Reply submitted successfully:', {
                        responseStatus: res.status,
                        responseData: res.data,
                        tempReplyId: tempReplyId
                    });

                    // Backend trả về { message: '...', event: populatedEvent }
                    // Cần lấy comments từ event
                    if (res.data.event && res.data.event.comments) {
                        console.log('🔄 [CommentSection] Updating comments from backend response for reply:', {
                            commentCount: res.data.event.comments.length,
                            tempReplyId: tempReplyId
                        });
                        setItem(prev => ({
                            ...prev,
                            comments: res.data.event.comments
                        }));
                    } else {
                        console.log('⚠️ [CommentSection] No event data in reply response, keeping temp reply');
                    }

                } catch (err) {
                    console.error('❌ [CommentSection] Error submitting reply:', {
                        error: err.message,
                        response: err.response?.data,
                        status: err.response?.status,
                        tempReplyId: tempReplyId
                    });
                    setError(err.response?.data?.message || 'Đã có lỗi khi gửi trả lời');

                    // Xóa reply tạm thời nếu gửi thất bại
                    console.log('🗑️ [CommentSection] Removing temp reply due to error:', tempReplyId);
                    setItem(prev => ({
                        ...prev,
                        comments: (prev.comments || []).map(comment =>
                            comment._id === commentId
                                ? { ...comment, replies: (comment.replies || []).filter(reply => reply._id !== tempReplyId) }
                                : comment
                        )
                    }));
                }

                return; // Thoát khỏi hàm sau khi xử lý với fetchedUser
            } catch (error) {
                console.error('❌ [CommentSection] Error fetching user info for reply:', error);
                setError('Không thể lấy thông tin người dùng. Vui lòng đăng nhập lại.');
                router.push('/login');
                return;
            }
        }

        const replyContent = reply.trim();
        const tempReplyId = `temp_${Date.now()}`;
        setReply('');
        setReplyingTo(null);
        setError('');

        console.log('📝 [CommentSection] Creating temp reply:', {
            tempReplyId: tempReplyId,
            content: replyContent,
            commentId: commentId,
            userId: userInfo._id
        });

        try {
            // Tạo reply tạm thời để hiển thị ngay lập tức
            const tempReply = {
                _id: tempReplyId,
                content: replyContent,
                userId: { _id: userInfo._id, fullname: userInfo.fullname, role: userInfo.role },
                createdAt: new Date().toISOString(),
                commentId: commentId,
                likes: [],
                isTemp: true
            };

            // Thêm reply tạm thời vào state
            setItem(prev => ({
                ...prev,
                comments: (prev.comments || []).map(comment =>
                    comment._id === commentId
                        ? { ...comment, replies: [...(comment.replies || []), tempReply] }
                        : comment
                )
            }));

            console.log('📝 [CommentSection] Submitting reply to backend:', {
                url: `${API_BASE_URL}/api/events/${eventId}/comments/${commentId}/reply`,
                content: replyContent,
                eventId: eventId,
                commentId: commentId,
                tempReplyId: tempReplyId
            });

            const res = await axios.post(
                `${API_BASE_URL}/api/events/${eventId}/comments/${commentId}/reply`,
                { content: replyContent },
                {
                    headers: {
                        Authorization: `Bearer ${session?.accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 15000 // 15 giây timeout
                }
            );

            console.log('✅ [CommentSection] Reply submitted successfully:', {
                responseStatus: res.status,
                responseData: res.data,
                tempReplyId: tempReplyId
            });

            // Backend trả về { message: '...', event: populatedEvent }
            // Cần lấy comments từ event
            if (res.data.event && res.data.event.comments) {
                console.log('🔄 [CommentSection] Updating comments from backend response for reply:', {
                    commentCount: res.data.event.comments.length,
                    tempReplyId: tempReplyId
                });
                setItem(prev => ({
                    ...prev,
                    comments: res.data.event.comments
                }));
            } else {
                console.log('⚠️ [CommentSection] No event data in reply response, keeping temp reply');
            }

        } catch (err) {
            console.error('❌ [CommentSection] Error submitting reply:', {
                error: err.message,
                response: err.response?.data,
                status: err.response?.status,
                tempReplyId: tempReplyId
            });

            // Xử lý các loại lỗi khác nhau
            let errorMessage = 'Đã có lỗi khi gửi trả lời';

            if (err.code === 'ECONNABORTED') {
                errorMessage = 'Kết nối bị timeout. Vui lòng thử lại.';
            } else if (err.response?.status === 401) {
                errorMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
                router.push('/login');
            } else if (err.response?.status === 403) {
                errorMessage = 'Bạn không có quyền gửi bình luận.';
            } else if (err.response?.status === 429) {
                errorMessage = 'Bạn đã gửi quá nhiều bình luận. Vui lòng chờ một lúc.';
            } else if (err.response?.data?.message) {
                errorMessage = err.response.data.message;
            } else if (err.message.includes('Network Error')) {
                errorMessage = 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet.';
            }

            setError(errorMessage);

            // Xóa reply tạm thời nếu gửi thất bại
            console.log('🗑️ [CommentSection] Removing temp reply due to error:', tempReplyId);
            setItem(prev => ({
                ...prev,
                comments: (prev.comments || []).map(comment =>
                    comment._id === commentId
                        ? { ...comment, replies: (comment.replies || []).filter(reply => reply._id !== tempReplyId) }
                        : comment
                )
            }));
        }
    };

    const handleLikeComment = async (commentId) => {
        if (!session) {
            router.push('/login');
            return;
        }
        if (!eventId || !isValidObjectId(eventId) || !isValidObjectId(commentId)) {
            setError('ID không hợp lệ');
            return;
        }
        try {
            console.log('Liking comment:', commentId);
            const res = await axios.post(
                `${API_BASE_URL}/api/events/${eventId}/comments/${commentId}/like`,
                {},
                {
                    headers: { Authorization: `Bearer ${session?.accessToken}` },
                    timeout: 15000
                }
            );
            console.log('Like comment response:', JSON.stringify(res.data, null, 2));
            setError('');

            // Backend trả về { message: '...', event: populatedEvent }
            // Cần lấy comments từ event
            if (res.data.event && res.data.event.comments) {
                setItem(prev => ({
                    ...prev,
                    comments: res.data.event.comments
                }));
            }
        } catch (err) {
            console.error('Error liking comment:', err.message, err.response?.data);
            setError(err.response?.data?.message || 'Đã có lỗi khi thích bình luận');
        }
    };

    const handleLikeReply = async (commentId, replyId) => {
        if (!session) {
            router.push('/login');
            return;
        }
        if (!eventId || !isValidObjectId(eventId) || !isValidObjectId(commentId) || !isValidObjectId(replyId)) {
            setError('ID không hợp lệ');
            return;
        }
        try {
            console.log('Liking reply:', replyId);
            const res = await axios.post(
                `${API_BASE_URL}/api/events/${eventId}/comments/${commentId}/replies/${replyId}/like`,
                {},
                {
                    headers: { Authorization: `Bearer ${session?.accessToken}` },
                    timeout: 15000
                }
            );
            console.log('Like reply response:', JSON.stringify(res.data, null, 2));
            setError('');

            // Backend trả về { message: '...', event: populatedEvent }
            // Cần lấy comments từ event
            if (res.data.event && res.data.event.comments) {
                setItem(prev => ({
                    ...prev,
                    comments: res.data.event.comments
                }));
            }
        } catch (err) {
            console.error('Error liking reply:', err.message, err.response?.data);
            setError(err.response?.data?.message || 'Đã có lỗi khi thích trả lời');
        }
    };

    const handleDeleteReply = async (commentId, replyId) => {
        if (!session) {
            router.push('/login');
            return;
        }
        if (userInfo?.role !== 'admin' && userInfo?.role !== 'ADMIN') {
            setError('Chỉ admin mới có quyền xóa trả lời');
            return;
        }
        if (!eventId || !isValidObjectId(eventId) || !isValidObjectId(commentId) || !isValidObjectId(replyId)) {
            setError('ID không hợp lệ');
            return;
        }
        try {
            console.log('Deleting reply:', replyId);
            const res = await axios.delete(
                `${API_BASE_URL}/api/events/${eventId}/comments/${commentId}/replies/${replyId}`,
                { headers: { Authorization: `Bearer ${session?.accessToken}` } }
            );
            console.log('Delete reply response:', JSON.stringify(res.data, null, 2));
            setError('');

            // Backend trả về { message: '...', event: populatedEvent }
            // Cần lấy comments từ event
            if (res.data.event && res.data.event.comments) {
                setItem(prev => ({
                    ...prev,
                    comments: res.data.event.comments
                }));
            }
        } catch (err) {
            console.error('Error deleting reply:', err.message, err.response?.data);
            setError(err.response?.data?.message || 'Đã có lỗi khi xóa trả lời');
        }
    };

    const handleDeleteComment = async (commentId) => {
        if (!session) {
            router.push('/login');
            return;
        }
        if (userInfo?.role !== 'admin' && userInfo?.role !== 'ADMIN') {
            setError('Chỉ admin mới có quyền xóa bình luận');
            return;
        }
        if (!eventId || !isValidObjectId(eventId) || !isValidObjectId(commentId)) {
            setError('ID không hợp lệ');
            return;
        }
        try {
            console.log('Deleting comment:', commentId);
            const res = await axios.delete(
                `${API_BASE_URL}/api/events/${eventId}/comments/${commentId}`,
                { headers: { Authorization: `Bearer ${session?.accessToken}` } }
            );
            console.log('Delete comment response:', JSON.stringify(res.data, null, 2));
            setError('');

            // Backend trả về { message: '...', event: populatedEvent }
            // Cần lấy comments từ event
            if (res.data.event && res.data.event.comments) {
                setItem(prev => ({
                    ...prev,
                    comments: res.data.event.comments
                }));
            }
        } catch (err) {
            console.error('Error deleting comment:', err.message, err.response?.data);
            setError(err.response?.data?.message || 'Đã có lỗi khi xóa bình luận');
        }
    };

    const handleLoginRedirect = () => {
        router.push('/login');
    };

    const toggleReplies = (commentId) => {
        setExpandedReplies((prev) => ({
            ...prev,
            [commentId]: !prev[commentId],
        }));
    };

    const sortedComments = Array.isArray(comments)
        ? [...comments].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        : [];

    return (
        <div className={styles.commentContainer}>
            {/* Comment Form Section */}
            <div className={styles.commentFormSection}>
                <div className={styles.commentHeader}>
                    <h3 className={styles.commentTitle}>
                        <i className="fa-solid fa-comments"></i> Bình luận ({sortedComments.length})
                    </h3>
                    <div className={styles.connectionStatus}>
                        {socketConnected ? (
                            <span className={styles.connected}>
                                <i className="fa-solid fa-wifi"></i> Kết nối thời gian thực
                            </span>
                        ) : (
                            <span className={styles.disconnected}>
                                <i className="fa-solid fa-wifi-slash"></i> Mất kết nối
                            </span>
                        )}
                    </div>
                </div>
                {session ? (
                    <form onSubmit={handleCommentSubmit} className={styles.commentForm}>
                        <div className={styles.inputWrapper}>
                            <textarea
                                value={comment}
                                onChange={handleCommentChange}
                                placeholder="Nhập bình luận của bạn...(chú ý: bình luận sẽ bị xóa nếu sử dụng từ ngữ thô tục)"
                                className={styles.commentInput}
                                maxLength={1000}
                            />
                            <span className={styles.charCount}>
                                {comment.length}/1000
                            </span>
                        </div>
                        <div className={styles.submitButtonGroup}>
                            <button type="submit" className={styles.submitButton}>
                                <i className="fa-solid fa-paper-plane"></i> Gửi bình luận
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className={styles.loginPrompt}>
                        <p>Vui lòng đăng nhập để bình luận.</p>
                        <button onClick={handleLoginRedirect} className={styles.loginButton}>
                            <i className="fa-solid fa-sign-in-alt"></i> Đăng nhập
                        </button>
                    </div>
                )}
            </div>

            {/* Comments List Section */}
            <div className={styles.commentSection} ref={commentsContainerRef}>
                {error && <p className={styles.error}>{error}</p>}
                {isLoadingUsers && <p className={styles.loading}>Đang tải thông tin người dùng...</p>}
                {sortedComments.length === 0 ? (
                    <div className={styles.noComments}>
                        <i className="fa-solid fa-comment-slash"></i>
                        <p>Chưa có bình luận nào</p>
                    </div>
                ) : (
                    <div className={styles.commentsList}>
                        {sortedComments.map((comment) => {
                            const displayUser = usersCache[comment.userId?._id] || comment.userId || { titles: [], role: null };
                            const isLiked = session && comment.likes?.includes(userInfo?._id);
                            const sortedReplies = (comment.replies || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                            const isExpanded = !!expandedReplies[comment._id];
                            const visibleReplies = isExpanded ? sortedReplies : sortedReplies.slice(0, 1);
                            const remainingReplies = sortedReplies.length - visibleReplies.length;

                            return (
                                <div key={comment._id} className={styles.commentWrapper}>
                                    {/* Comment Header */}
                                    <div className={styles.commentHeader}>
                                        <div
                                            className={`${styles.avatar} ${getAvatarClass(displayUser?.role)}`}
                                            onClick={() => handleShowDetails(displayUser)}
                                            style={{ cursor: 'pointer' }}
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
                                                        e.target.nextSibling.textContent = getInitials(displayUser?.fullname || 'User');
                                                    }}
                                                />
                                            ) : (
                                                <span>{getInitials(displayUser?.fullname || 'User')}</span>
                                            )}
                                        </div>
                                        <div className={styles.commentInfo}>
                                            <div className={styles.userInfo}>
                                                <span
                                                    className={`${styles.username} ${getAvatarClass(displayUser?.role)}`}
                                                    onClick={() => handleShowDetails(displayUser)}
                                                    style={{ cursor: 'pointer' }}
                                                    role="button"
                                                    aria-label={`Xem chi tiết ${getDisplayName(displayUser?.fullname || 'User')}`}
                                                >
                                                    {getDisplayName(displayUser?.fullname || 'User')}
                                                </span>
                                                {displayUser?.role && (
                                                    <span className={`${styles.role} ${getAvatarClass(displayUser.role)}`}>
                                                        {displayUser.role}
                                                    </span>
                                                )}
                                            </div>
                                            <div className={styles.userStats}>
                                                <span className={styles.titles}>
                                                    {displayUser?.titles?.length > 0 ? displayUser.titles.join(', ') : 'Chưa có danh hiệu'}
                                                </span>
                                                <span className={styles.level}>Cấp {displayUser?.level ?? 'N/A'}</span>
                                                <span className={styles.points}>{displayUser?.points ?? 0} điểm</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Comment Content */}
                                    <div className={styles.commentContent}>
                                        <p className={styles.commentMeta}>
                                            <i className="fa-solid fa-clock"></i>
                                            {moment.tz(comment.createdAt, 'Asia/Ho_Chi_Minh').format('DD/MM/YYYY HH:mm:ss')}
                                        </p>
                                        <p className={styles.commentText}>{comment.content}</p>

                                        {/* Comment Actions */}
                                        <div className={styles.commentActions}>
                                            <button
                                                onClick={() => handleLikeComment(comment._id)}
                                                disabled={!session}
                                                className={`${styles.actionButton} ${isLiked ? styles.liked : ''}`}
                                            >
                                                <i className="fa-solid fa-heart"></i>
                                                {comment.likes?.length || 0} Thích
                                            </button>
                                            <button
                                                onClick={() => setReplyingTo(comment._id)}
                                                disabled={!session}
                                                className={styles.actionButton}
                                            >
                                                <i className="fa-solid fa-reply"></i> Trả lời
                                            </button>
                                            {session && userInfo?.role?.toLowerCase() === 'admin' && (
                                                <button
                                                    onClick={() => handleDeleteComment(comment._id)}
                                                    className={`${styles.actionButton} ${styles.deleteButton}`}
                                                >
                                                    <i className="fa-solid fa-trash"></i> Xóa
                                                </button>
                                            )}
                                        </div>

                                        {/* Reply Form */}
                                        {replyingTo === comment._id && session && (
                                            <form onSubmit={(e) => handleReplySubmit(e, comment._id)} className={styles.replyForm}>
                                                <div className={styles.inputWrapper}>
                                                    <textarea
                                                        value={reply}
                                                        onChange={handleReplyChange}
                                                        placeholder="Nhập câu trả lời của bạn...(chú ý: bình luận sẽ bị xóa nếu sử dụng từ ngữ thô tục)"
                                                        className={styles.commentInput}
                                                        maxLength={1000}
                                                    />
                                                    <span className={styles.charCount}>
                                                        {reply.length}/1000
                                                    </span>
                                                </div>
                                                <div className={styles.submitButtonGroup}>
                                                    <button type="submit" className={styles.submitButton}>
                                                        <i className="fa-solid fa-paper-plane"></i> Gửi trả lời
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setReplyingTo(null)}
                                                        className={styles.cancelButton}
                                                    >
                                                        <i className="fa-solid fa-x"></i> Hủy
                                                    </button>
                                                </div>
                                            </form>
                                        )}

                                        {/* Replies Section */}
                                        {sortedReplies.length > 0 && (
                                            <div className={styles.repliesSection}>
                                                {sortedReplies.length > 1 && (
                                                    <div className={styles.replyToggle}>
                                                        {isExpanded ? (
                                                            <button
                                                                onClick={() => toggleReplies(comment._id)}
                                                                className={styles.toggleButton}
                                                            >
                                                                <i className="fa-solid fa-chevron-up"></i> Thu gọn
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => toggleReplies(comment._id)}
                                                                className={styles.toggleButton}
                                                            >
                                                                <i className="fa-solid fa-chevron-down"></i>
                                                                Xem thêm phản hồi ({remainingReplies})
                                                            </button>
                                                        )}
                                                    </div>
                                                )}

                                                <div className={styles.repliesList}>
                                                    {visibleReplies.map((reply) => {
                                                        const replyUserId = typeof reply.userId === 'object' ? reply.userId?._id : reply.userId;
                                                        const replyUser = usersCache[replyUserId] || { fullname: 'User', role: null, img: null, titles: [] };
                                                        const isReplyLiked = session && reply.likes?.includes(userInfo?._id);

                                                        return (
                                                            <div key={reply._id} className={styles.replyWrapper}>
                                                                <div className={styles.replyHeader}>
                                                                    <div
                                                                        className={`${styles.avatar} ${getAvatarClass(replyUser?.role)} ${styles.smallAvatar}`}
                                                                        onClick={() => handleShowDetails(replyUser)}
                                                                        style={{ cursor: 'pointer' }}
                                                                        role="button"
                                                                        aria-label={`Xem chi tiết ${getDisplayName(replyUser?.fullname || 'User')}`}
                                                                    >
                                                                        {replyUser?.img ? (
                                                                            <Image
                                                                                src={replyUser.img}
                                                                                alt={getDisplayName(replyUser?.fullname || 'User')}
                                                                                className={styles.avatarImage}
                                                                                width={24}
                                                                                height={24}
                                                                                onError={(e) => {
                                                                                    e.target.style.display = 'none';
                                                                                    e.target.nextSibling.style.display = 'flex';
                                                                                    e.target.nextSibling.textContent = getInitials(replyUser?.fullname || 'User');
                                                                                }}
                                                                            />
                                                                        ) : (
                                                                            <span>{getInitials(replyUser?.fullname || 'User')}</span>
                                                                        )}
                                                                    </div>
                                                                    <div className={styles.replyInfo}>
                                                                        <span
                                                                            className={`${styles.username} ${getAvatarClass(replyUser?.role)}`}
                                                                            onClick={() => handleShowDetails(replyUser)}
                                                                            style={{ cursor: 'pointer' }}
                                                                            role="button"
                                                                            aria-label={`Xem chi tiết ${getDisplayName(replyUser?.fullname || 'User')}`}
                                                                        >
                                                                            {getDisplayName(replyUser?.fullname || 'User')}
                                                                        </span>
                                                                        {replyUser?.role && (
                                                                            <span className={`${styles.role} ${getAvatarClass(replyUser?.role)}`}>
                                                                                {replyUser.role}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div className={styles.replyContent}>
                                                                    <p className={styles.replyMeta}>
                                                                        <i className="fa-solid fa-clock"></i>
                                                                        {moment.tz(reply.createdAt, 'Asia/Ho_Chi_Minh').format('DD/MM/YYYY HH:mm:ss')}
                                                                    </p>
                                                                    <p className={styles.replyText}>{reply.content}</p>
                                                                    <div className={styles.replyActions}>
                                                                        <button
                                                                            onClick={() => handleLikeReply(comment._id, reply._id)}
                                                                            disabled={!session}
                                                                            className={`${styles.actionButton} ${isReplyLiked ? styles.liked : ''}`}
                                                                        >
                                                                            <i className="fa-solid fa-heart"></i>
                                                                            {reply.likes?.length || 0} Thích
                                                                        </button>
                                                                        {session && userInfo?.role?.toLowerCase() === 'admin' && (
                                                                            <button
                                                                                onClick={() => handleDeleteReply(comment._id, reply._id)}
                                                                                className={`${styles.actionButton} ${styles.deleteButton}`}
                                                                            >
                                                                                <i className="fa-solid fa-trash"></i> Xóa
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                {fetchError && <p className={styles.error}>{fetchError}</p>}
            </div>

            {/* Modals and Private Chats */}
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