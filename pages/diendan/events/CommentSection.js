"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import moment from 'moment';
import 'moment-timezone';
import Image from 'next/image';
import io from 'socket.io-client';
import styles from '../../../styles/comment.module.css';
import UserInfoModal from '../modals/UserInfoModal';
import PrivateChat from '../chatrieng';

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
    const socketRef = useRef(null);
    const commentsContainerRef = useRef(null);
    const repliesContainerRefs = useRef({});

    console.log('CommentSection initialized with eventId:', eventId);

    const fetchUserInfo = async () => {
        if (!session?.accessToken) {
            return;
        }
        try {
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
            setUserInfo(data);
            setUsersCache((prev) => ({ ...prev, [data._id]: data }));
        } catch (error) {
            console.error('Error fetching user info:', error);
            setFetchError(error.message);
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
            setError('Trả lời chứa từ ngữ không phù hợp');
        } else if (value.length > 950) {
            setError(`Còn ${1000 - value.length} ký tự`);
        } else {
            setError('');
        }
    };

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

    useEffect(() => {
        if (session) {
            fetchUserInfo();
        }
    }, [session]);

    useEffect(() => {
        const fetchMissingUserDetails = async () => {
            if (!Array.isArray(comments)) {
                console.warn('Comments is not an array:', comments);
                return;
            }
            setIsLoadingUsers(true);
            const missingUsers = new Set();
            comments.forEach(comment => {
                const commentUserId = typeof comment.userId === 'object' ? comment.userId?._id : comment.userId;
                if (commentUserId && isValidObjectId(commentUserId) && !usersCache[commentUserId]) {
                    missingUsers.add(commentUserId);
                }
                (comment.replies || []).forEach(reply => {
                    const replyUserId = typeof reply.userId === 'object' ? reply.userId?._id : reply.userId;
                    if (replyUserId && isValidObjectId(replyUserId) && !usersCache[replyUserId]) {
                        missingUsers.add(replyUserId);
                    }
                });
            });
            const uniqueMissingUsers = [...missingUsers];
            console.log('Fetching missing users:', uniqueMissingUsers);
            try {
                const fetchPromises = uniqueMissingUsers.map(async (userId) => {
                    try {
                        const res = await axios.get(`${API_BASE_URL}/api/users/${userId}`);
                        const userData = res.data;
                        console.log(`Fetched user ${userId}:`, userData);
                        setUsersCache((prev) => ({ ...prev, [userId]: userData }));
                    } catch (err) {
                        console.error(`Error fetching user ${userId}:`, err.message);
                    }
                });
                await Promise.all(fetchPromises);
            } catch (err) {
                console.error('Error fetching missing users:', err.message);
                setFetchError('Không thể tải thông tin người dùng');
            } finally {
                setIsLoadingUsers(false);
            }
        };

        if (comments?.length > 0) {
            fetchMissingUserDetails();
        }
    }, [comments]);

    useEffect(() => {
        if (!eventId || !isValidObjectId(eventId)) {
            setFetchError('ID sự kiện không hợp lệ');
            return;
        }
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
            console.log('Socket.IO connected for comments:', socket.id);
            socket.emit('joinEvent', eventId);
            console.log(`Client ${socket.id} joined room event:${eventId}`);
            console.log('Joining private room for user:', userInfo._id);
            socket.emit('joinPrivateRoom', userInfo._id);
        });

        socket.on('connect_error', (err) => {
            console.error('Socket.IO connection error:', err.message);
            setFetchError('Mất kết nối thời gian thực. Vui lòng làm mới trang.');
        });

        socket.on('NEW_COMMENT', (newComment) => {
            console.log('Received NEW_COMMENT:', JSON.stringify(newComment, null, 2));
            if (
                newComment &&
                newComment.userId?._id &&
                isValidObjectId(newComment.userId._id) &&
                newComment.eventId === eventId &&
                newComment.content
            ) {
                setUsersCache((prev) => ({
                    ...prev,
                    [newComment.userId._id]: newComment.userId,
                }));
                if (newComment.userId._id === userInfo?._id) {
                    setUserInfo(newComment.userId);
                }
                setItem((prev) => {
                    const updatedComments = [newComment, ...(prev.comments || [])];
                    console.log('Updated comments:', updatedComments);
                    return {
                        ...prev,
                        comments: updatedComments,
                    };
                });
            } else {
                console.warn('Ignoring invalid or irrelevant NEW_COMMENT:', newComment);
            }
        });

        socket.on('NEW_REPLY', (newReply) => {
            console.log('Received NEW_REPLY:', JSON.stringify(newReply, null, 2));
            if (
                newReply &&
                newReply.userId?._id &&
                isValidObjectId(newReply.userId._id) &&
                newReply.eventId === eventId &&
                newReply.commentId &&
                newReply.content
            ) {
                setUsersCache((prev) => ({
                    ...prev,
                    [newReply.userId._id]: newReply.userId,
                }));
                if (newReply.userId._id === userInfo?._id) {
                    setUserInfo(newReply.userId);
                }
                setItem((prev) => {
                    const updatedComments = prev.comments.map(c =>
                        c._id === newReply.commentId
                            ? { ...c, replies: [...(c.replies || []), newReply] }
                            : c
                    );
                    return {
                        ...prev,
                        comments: updatedComments,
                    };
                });
                setExpandedReplies((prev) => ({ ...prev, [newReply.commentId]: true }));
            } else {
                console.warn('Ignoring invalid or irrelevant NEW_REPLY:', newReply);
            }
        });

        socket.on('COMMENT_LIKED', (data) => {
            console.log('Received COMMENT_LIKED:', data);
            if (data.eventId === eventId && data.commentId) {
                setItem((prev) => ({
                    ...prev,
                    comments: prev.comments.map(c =>
                        c._id === data.commentId
                            ? { ...c, likes: data.likes }
                            : c
                    ),
                }));
            }
        });

        socket.on('REPLY_LIKED', (data) => {
            console.log('Received REPLY_LIKED:', data);
            if (data.eventId === eventId && data.commentId && data.replyId) {
                setItem((prev) => ({
                    ...prev,
                    comments: prev.comments.map(c =>
                        c._id === data.commentId
                            ? {
                                ...c,
                                replies: c.replies.map(r =>
                                    r._id === data.replyId ? { ...r, likes: data.likes } : r
                                ),
                            }
                            : c
                    ),
                }));
            }
        });

        socket.on('REPLY_DELETED', (data) => {
            console.log('Received REPLY_DELETED:', data);
            if (data.eventId === eventId && data.commentId && data.replyId) {
                setItem((prev) => ({
                    ...prev,
                    comments: prev.comments.map(c =>
                        c._id === data.commentId
                            ? { ...c, replies: c.replies.filter(r => r._id !== data.replyId) }
                            : c
                    ),
                }));
            }
        });

        socket.on('COMMENT_DELETED', (data) => {
            console.log('Received COMMENT_DELETED:', data);
            if (data.eventId === eventId && data.commentId) {
                setItem((prev) => ({
                    ...prev,
                    comments: prev.comments.filter(c => c._id !== data.commentId),
                }));
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

        socket.on('USER_UPDATED', (updatedUser) => {
            console.log('Received USER_UPDATED:', updatedUser);
            if (updatedUser?._id && isValidObjectId(updatedUser._id)) {
                setUsersCache((prev) => ({ ...prev, [updatedUser._id]: updatedUser }));
                if (updatedUser._id === userInfo?._id) {
                    setUserInfo(updatedUser);
                }
            }
        });

        return () => {
            socketRef.current?.disconnect();
            console.log('Socket.IO disconnected for comments');
        };
    }, [eventId, setItem, userInfo, session?.accessToken]);

    useEffect(() => {
        if (commentsContainerRef.current) {
            commentsContainerRef.current.scrollTop = 0;
        }
    }, [comments]);

    useEffect(() => {
        Object.keys(expandedReplies).forEach(commentId => {
            if (expandedReplies[commentId] && repliesContainerRefs.current[commentId]) {
                repliesContainerRefs.current[commentId].scrollTop = 0;
            }
        });
    }, [expandedReplies, comments]);

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!session) {
            router.push('/login');
            return;
        }
        if (!comment.trim()) {
            setError('Nội dung bình luận không được để trống');
            return;
        }
        if (!eventId || !isValidObjectId(eventId)) {
            setError('ID bài viết không hợp lệ');
            return;
        }
        if (isProfane(comment)) {
            setError('Bình luận chứa từ ngữ không phù hợp');
            return;
        }
        try {
            console.log('Submitting comment for event:', eventId);
            const res = await axios.post(
                `${API_BASE_URL}/api/events/${eventId}/comments`,
                { content: comment },
                { headers: { Authorization: `Bearer ${session?.accessToken}` } }
            );
            console.log('Comment submission response:', JSON.stringify(res.data, null, 2));
            setComment('');
            setError('');
            setItem(res.data.event);
            if (userInfo) {
                await fetchUserInfo();
            }
        } catch (err) {
            console.error('Error submitting comment:', err.message, err.response?.data);
            setError(err.response?.data?.message || 'Đã có lỗi khi gửi bình luận');
        }
    };

    const handleReplySubmit = async (e, commentId) => {
        e.preventDefault();
        if (!session) {
            router.push('/login');
            return;
        }
        if (!reply.trim()) {
            setError('Nội dung trả lời không được để trống');
            return;
        }
        if (!eventId || !isValidObjectId(eventId) || !isValidObjectId(commentId)) {
            setError('ID không hợp lệ');
            return;
        }
        if (isProfane(reply)) {
            setError('Trả lời chứa từ ngữ không phù hợp');
            return;
        }
        try {
            console.log('Submitting reply for comment:', commentId);
            const res = await axios.post(
                `${API_BASE_URL}/api/events/${eventId}/comments/${commentId}/reply`,
                { content: reply },
                { headers: { Authorization: `Bearer ${session?.accessToken}` } }
            );
            console.log('Reply submission response:', JSON.stringify(res.data, null, 2));
            setReply('');
            setReplyingTo(null);
            setError('');
            setItem(res.data.event);
            if (userInfo) {
                await fetchUserInfo();
            }
        } catch (err) {
            console.error('Error submitting reply:', err.message, err.response?.data);
            setError(err.response?.data?.message || 'Đã có lỗi khi gửi trả lời');
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
                { headers: { Authorization: `Bearer ${session?.accessToken}` } }
            );
            console.log('Like comment response:', JSON.stringify(res.data, null, 2));
            setItem(res.data.event);
        } catch (err) {
            console.error('Error liking comment:', err.message, err.response?.data);
            setError(err.response?.data?.message || 'Đã có lỗi khi thích/bỏ thích bình luận');
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
                { headers: { Authorization: `Bearer ${session?.accessToken}` } }
            );
            console.log('Like reply response:', JSON.stringify(res.data, null, 2));
            setItem(res.data.event);
        } catch (err) {
            console.error('Error liking reply:', err.message, err.response?.data);
            setError(err.response?.data?.message || 'Đã có lỗi khi thích/bỏ thích trả lời');
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
            setItem(res.data.event);
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
            setItem(res.data.event);
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
        <div>
            <div className={styles.commentForm}>
                <h3>Bình luận</h3>
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
                        <div className={styles.GroupsubmitButton}>
                            <button type="submit" className={styles.submitButton}>
                                <i className="fa-solid fa-paper-plane"></i> Gửi
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className={styles.loginPrompt}>
                        <p>Vui lòng đăng nhập để bình luận.</p>
                        <button onClick={handleLoginRedirect} className={styles.loginButton}>
                            Đăng nhập
                        </button>
                    </div>
                )}
            </div>
            <div className={styles.commentSection} ref={commentsContainerRef}>
                {error && <p className={styles.error}>{error}</p>}
                {isLoadingUsers && <p>Đang tải thông tin người dùng...</p>}
                {sortedComments.length === 0 ? (
                    <p>Chưa có bình luận nào</p>
                ) : (
                    sortedComments.map((comment) => {
                        const displayUser = usersCache[comment.userId?._id] || comment.userId || { titles: [], role: null };
                        const isLiked = session && comment.likes?.includes(userInfo?._id);
                        const sortedReplies = (comment.replies || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                        const isExpanded = !!expandedReplies[comment._id];
                        const visibleReplies = isExpanded ? sortedReplies : sortedReplies.slice(0, 1);
                        const remainingReplies = sortedReplies.length - visibleReplies.length;

                        return (
                            <div key={comment._id} className={styles.commentWrapper}>
                                <div className={styles.commentHeader}>
                                    <div
                                        className={`${styles.avatar} ${getAvatarClass(displayUser?.role)}`}
                                        onClick={() => handleShowDetails(displayUser)}
                                        style={{ cursor: 'pointer' }}
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
                                                    e.target.nextSibling.textContent = getInitials(displayUser?.fullname || 'User');
                                                }}
                                            />
                                        ) : (
                                            <span>{getInitials(displayUser?.fullname || 'User')}</span>
                                        )}
                                    </div>
                                    <div className={styles.commentInfo}>
                                        <span
                                            className={`${styles.username} ${getAvatarClass(displayUser?.role)}`}
                                            onClick={() => handleShowDetails(displayUser)}
                                            style={{ cursor: 'pointer' }}
                                            role="button"
                                            aria-label={`Xem chi tiết ${getDisplayName(displayUser.fullname)}`}
                                        >
                                            {getDisplayName(displayUser?.fullname || 'User')}
                                        </span>
                                        {displayUser?.role && (
                                            <span
                                                className={`${styles.role} ${getAvatarClass(displayUser.role)}`}
                                            >
                                                {displayUser.role}
                                            </span>
                                        )}
                                        <span className={styles.roless}>
                                            {displayUser?.titles?.length > 0 ? displayUser.titles.join(', ') : 'Chưa có danh hiệu'}
                                        </span>
                                        <span className={styles.level}>
                                            Cấp {displayUser?.level ?? 'N/A'}
                                        </span>
                                        <span className={styles.points}>
                                            {displayUser?.points ?? 0} điểm
                                        </span>
                                    </div>
                                </div>
                                <div className={styles.comment}>
                                    <p className={styles.commentMeta}>
                                        <i className="fa-solid fa-clock"></i> Gửi lúc: {moment.tz(comment.createdAt, 'Asia/Ho_Chi_Minh').format('DD/MM/YYYY HH:mm:ss')}
                                    </p>
                                    <p className={styles.commentContent}>{comment.content}</p>
                                    <div className={styles.commentActions}>
                                        <button
                                            onClick={() => handleLikeComment(comment._id)}
                                            disabled={!session}
                                            className={isLiked ? styles.liked : ''}
                                        >
                                            <i className="fa-solid fa-heart"></i> {comment.likes?.length || 0} Thích
                                        </button>
                                        <button
                                            onClick={() => setReplyingTo(comment._id)}
                                            disabled={!session}
                                        >
                                            <i className="fa-solid fa-reply"></i> Trả lời
                                        </button>
                                        {session && userInfo?.role?.toLowerCase() === 'admin' && (
                                            <button
                                                onClick={() => handleDeleteComment(comment._id)}
                                            >
                                                <i className="fa-solid fa-trash"></i> Xóa
                                            </button>
                                        )}
                                    </div>
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
                                            <div className={styles.GroupsubmitButton}>
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
                                    {sortedReplies.length > 0 && (
                                        <div
                                            className={styles.replies}
                                            ref={(el) => (repliesContainerRefs.current[comment._id] = el)}
                                        >
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
                                                            <i className="fa-solid fa-chevron-down"></i> Xem thêm phản hồi ({remainingReplies})
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                            {visibleReplies.map((reply) => {
                                                const replyUserId = typeof reply.userId === 'object' ? reply.userId?._id : reply.userId;
                                                const replyUser = usersCache[replyUserId] || { fullname: 'User', role: null, img: null, titles: [] };
                                                const isReplyLiked = session && reply.likes?.includes(userInfo?._id);
                                                console.log('Rendering reply:', reply._id, 'replyUser:', replyUser);
                                                return (
                                                    <div key={reply._id} className={styles.replyWrapper}>
                                                        <p className={styles.commentMeta}>
                                                            <i className="fa-solid fa-clock"></i> Gửi lúc: {moment.tz(reply.createdAt, 'Asia/Ho_Chi_Minh').format('DD/MM/YYYY HH:mm:ss')}
                                                        </p>
                                                        <div className={styles.commentHeaders}>
                                                            <div
                                                                className={`${styles.avatar} ${getAvatarClass(replyUser?.role)}`}
                                                                onClick={() => handleShowDetails(replyUser)}
                                                                style={{ cursor: 'pointer' }}
                                                                role="button"
                                                                aria-label={`Xem chi tiết ${getDisplayName(replyUser.fullname)}`}
                                                            >
                                                                {replyUser?.img ? (
                                                                    <Image
                                                                        src={replyUser.img}
                                                                        alt={getDisplayName(replyUser.fullname)}
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
                                                            <div className={styles.commentInfos}>
                                                                <span
                                                                    className={`${styles.username} ${getAvatarClass(replyUser?.role)}`}
                                                                    onClick={() => handleShowDetails(replyUser)}
                                                                    style={{ cursor: 'pointer' }}
                                                                    role="button"
                                                                    aria-label={`Xem chi tiết ${getDisplayName(replyUser.fullname)}`}
                                                                >
                                                                    {getDisplayName(replyUser?.fullname || 'User')}
                                                                </span>
                                                            </div>
                                                            {replyUser?.role && (
                                                                <span
                                                                    className={`${styles.role} ${getAvatarClass(replyUser?.role)}`}
                                                                >
                                                                    {replyUser.role}
                                                                </span>
                                                            )}
                                                            <span className={styles.roless}>
                                                                {replyUser?.titles?.length > 0 ? replyUser.titles.join(', ') : 'Chưa có danh hiệu'}
                                                            </span>
                                                        </div>
                                                        <p className={styles.commentContent}>{reply.content}</p>
                                                        <div className={styles.replyActions}>
                                                            <button
                                                                onClick={() => handleLikeReply(comment._id, reply._id)}
                                                                disabled={!session}
                                                                className={isReplyLiked ? styles.liked : ''}
                                                            >
                                                                <i className="fa-solid fa-heart"></i> {reply.likes?.length || 0} Thích
                                                            </button>
                                                            {session && userInfo?.role?.toLowerCase() === 'admin' && (
                                                                <button
                                                                    onClick={() => handleDeleteReply(comment._id, reply._id)}
                                                                >
                                                                    <i className="fa-solid fa-trash"></i> Xóa
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
                {fetchError && <p className={styles.error}>{fetchError}</p>}
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
        </div>
    );
}