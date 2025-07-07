"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import moment from 'moment';
import 'moment-timezone';
import Image from 'next/image';
import io from 'socket.io-client';
import styles from '../../../styles/detaiEventHot.module.css';
import userAvatarStyles from '../../../styles/comment.module.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

// Hàm kiểm tra ObjectId hợp lệ (24 ký tự hex)
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

const getRoleColorClass = (role) => {
    return role?.toLowerCase() === 'admin' ? userAvatarStyles.admin : userAvatarStyles.user;
};

// Bộ lọc từ tục tĩu sử dụng regex
const profaneWords = ['kẹt', 'chửi', 'lồn', 'đụ', 'địt', 'cẹt', 'cược', 'má', 'lồnn', 'lonn', 'lồnnn',]; // Danh sách từ tục tĩu
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

export default function CommentSection({ comments, session, eventId, setItem, error, setError }) {
    const router = useRouter();
    const [comment, setComment] = useState('');
    const [userInfo, setUserInfo] = useState(null);
    const [fetchError, setFetchError] = useState(null);
    const [usersCache, setUsersCache] = useState({});
    const socketRef = useRef(null);

    // Debug eventId
    console.log('CommentSection eventId:', eventId);

    // Xử lý thay đổi nội dung bình luận
    const handleCommentChange = (e) => {
        const value = e.target.value;
        const cleanValue = filterProfanity(value); // Lọc từ tục tĩu
        setComment(cleanValue);
        if (isProfane(value)) {
            setError('Bình luận chứa từ ngữ không phù hợp');
        } else if (value.length > 950) {
            setError(`Còn ${1000 - value.length} ký tự`);
        } else {
            setError('');
        }
    };

    // Lấy thông tin người dùng hiện tại (nếu có session)
    useEffect(() => {
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

        if (session) {
            fetchUserInfo();
        }
    }, [session]);

    // Lấy thông tin người dùng khác qua /api/users/:id
    const fetchUserDetails = async (userId) => {
        if (!userId || usersCache[userId]) return usersCache[userId];

        try {
            const res = await axios.get(`${API_BASE_URL}/api/users/${userId}`);
            const userData = res.data;
            setUsersCache((prev) => ({ ...prev, [userId]: userData }));
            return userData;
        } catch (err) {
            console.error(`Error fetching user ${userId}:`, err.message);
            return null;
        }
    };

    // Tích hợp Socket.IO
    useEffect(() => {
        const socket = io(API_BASE_URL, {
            query: { token: session?.accessToken || '' },
            reconnectionAttempts: 5,
            reconnectionDelay: 5000,
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Socket.IO connected for comments:', socket.id);
            if (eventId && typeof eventId === 'string' && isValidObjectId(eventId)) {
                socket.emit('joinEvent', eventId);
                console.log(`Client ${socket.id} joined room event:${eventId}`);
            } else {
                console.warn('Invalid eventId for joinEvent:', eventId);
            }
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

        socket.on('USER_UPDATED', (updatedUser) => {
            console.log('Received USER_UPDATED:', updatedUser);
            if (updatedUser?._id && isValidObjectId(updatedUser._id)) {
                setUsersCache((prev) => ({ ...prev, [updatedUser._id]: updatedUser }));
            }
        });

        return () => {
            socket.disconnect();
            console.log('Socket.IO disconnected for comments');
        };
    }, [eventId, setItem]);

    // Lấy thông tin người dùng cho các bình luận ban đầu
    useEffect(() => {
        const fetchMissingUserDetails = async () => {
            const missingUsers = comments
                .filter((comment) => comment.userId?._id && !usersCache[comment.userId._id])
                .map((comment) => comment.userId._id);
            const uniqueMissingUsers = [...new Set(missingUsers)];

            for (const userId of uniqueMissingUsers) {
                await fetchUserDetails(userId);
            }
        };

        if (comments.length > 0) {
            fetchMissingUserDetails();
        }
    }, [comments]);

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
        if (!eventId || typeof eventId !== 'string' || !isValidObjectId(eventId)) {
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
        } catch (err) {
            console.error('Error submitting comment:', err.message, err.response?.data);
            setError(err.response?.data?.message || 'Đã có lỗi khi gửi bình luận');
        }
    };

    const handleLoginRedirect = () => {
        router.push('/login');
    };

    // Sắp xếp bình luận từ mới nhất đến cũ
    const sortedComments = [...comments].sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
    );

    return (
        <div className={styles.commentSection}>
            <h3>Bình luận</h3>
            {session ? (
                <form onSubmit={handleCommentSubmit} className={styles.commentForm}>
                    <div className={styles.inputWrapper}>
                        <textarea
                            value={comment}
                            onChange={handleCommentChange}
                            placeholder="Nhập bình luận của bạn..."
                            className={styles.commentInput}
                            maxLength={1000}
                        />
                        <span className={styles.charCount}>
                            {comment.length}/1000
                        </span>
                    </div>
                    <button type="submit" className={styles.submitButton}>
                        <i className="fa-solid fa-paper-plane"></i> Gửi
                    </button>
                </form>
            ) : (
                <div className={styles.loginPrompt}>
                    <p>Vui lòng đăng nhập để bình luận.</p>
                    <button onClick={handleLoginRedirect} className={styles.loginButton}>
                        Đăng nhập
                    </button>
                </div>
            )}
            {error && <p className={styles.error}>{error}</p>}
            {sortedComments.length === 0 ? (
                <p>Chưa có bình luận nào</p>
            ) : (
                sortedComments.map((comment) => {
                    const displayUser = usersCache[comment.userId?._id] || comment.userId;
                    return (
                        <div key={comment._id} className={styles.commentWrapper}>
                            <div className={styles.commentHeader}>
                                <div
                                    className={`${userAvatarStyles.avatar} ${getRoleColorClass(displayUser?.role)}`}
                                >
                                    {displayUser?.img ? (
                                        <Image
                                            src={displayUser.img}
                                            alt={getDisplayName(displayUser.fullname)}
                                            className={userAvatarStyles.avatarImage}
                                            width={40}
                                            height={40}
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'flex';
                                            }}
                                        />
                                    ) : (
                                        getInitials(displayUser?.fullname || 'User')
                                    )}
                                </div>
                                <div className={styles.commentInfo}>
                                    <span
                                        className={`${userAvatarStyles.username} ${getRoleColorClass(displayUser?.role)}`}
                                    >
                                        {getDisplayName(displayUser?.fullname || 'User')}
                                    </span>
                                    {displayUser?.role && (
                                        <span
                                            className={`${userAvatarStyles.role} ${getRoleColorClass(displayUser.role)}`}
                                        >
                                            {displayUser.role}
                                        </span>
                                    )}
                                    <span className={userAvatarStyles.roless}>
                                        {displayUser?.titles?.length > 0 ? displayUser.titles.join(', ') : 'Chưa có danh hiệu'}
                                    </span>
                                    <span className={userAvatarStyles.level}>
                                        Cấp {displayUser?.level ?? 'N/A'}
                                    </span>
                                    <span className={userAvatarStyles.points}>
                                        {displayUser?.points ?? 0} điểm
                                    </span>
                                </div>
                            </div>
                            <div className={styles.comment}>
                                <p className={styles.commentMeta}>
                                    <i class="fa-solid fa-clock"></i> Gửi lúc: {moment.tz(comment.createdAt, 'Asia/Ho_Chi_Minh').format('DD/MM/YYYY HH:mm:ss')}
                                </p>
                                <p className={styles.commentContent}>{comment.content}</p>
                            </div>
                        </div>
                    );
                })
            )}
            {fetchError && <p className={styles.error}>{fetchError}</p>}
        </div>
    );
}