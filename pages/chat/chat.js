import { useState, useEffect, useRef, useCallback } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { formatDistanceToNow } from "date-fns";
import vi from "date-fns/locale/vi";
import EmojiPicker from "emoji-picker-react";
import { useRouter } from "next/router";
import io from "socket.io-client";
import styles from "../../styles/chat.module.css";
import Link from "next/link";

export default function Chat() {
    const [comment, setComment] = useState("");
    const [comments, setComments] = useState([]);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [replyTo, setReplyTo] = useState(null);
    const [replyContent, setReplyContent] = useState("");
    const [taggedUsers, setTaggedUsers] = useState([]);
    const [showEmojiPicker, setShowEmojiPicker] = useState({});
    const [tagSuggestions, setTagSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestionPosition, setSuggestionPosition] = useState({ top: 0, left: 0 });
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [expandedComments, setExpandedComments] = useState({});
    const [showLoginModal, setShowLoginModal] = useState(false);
    const { data: session, status } = useSession();
    const router = useRouter();
    const { commentId } = router.query;
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
    const commentInputRef = useRef(null);
    const replyInputRefs = useRef({});
    const emojiPickerRefs = useRef({});
    const replyFormRef = useRef(null);
    const commentRefs = useRef({});
    const suggestionRef = useRef(null);
    const commentListRef = useRef(null);
    const socketRef = useRef(null);

    // Hàm sắp xếp bình luận tối ưu
    const sortComments = useCallback((comments) => {
        return comments
            .map(comment => ({
                ...comment,
                childComments: comment.childComments ? sortComments(comment.childComments) : [],
            }))
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    }, []);

    // Lấy danh sách bình luận ban đầu
    const fetchComments = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/comments`, {
                headers: {
                    "Content-Type": "application/json",
                    ...(session?.accessToken && { "Authorization": `Bearer ${session.accessToken}` }),
                },
            });
            if (res.status === 401 && session) {
                setError("Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.");
                signOut({ redirect: false });
                router.push('/login?error=SessionExpired');
                return;
            }
            if (!res.ok) throw new Error("Không thể tải bình luận");
            const data = await res.json();
            setComments(sortComments(data));
        } catch (err) {
            console.error("Fetch comments error:", err.message);
            setError(err.message);
        }
    }, [session, router, sortComments]);

    // Thiết lập Socket.IO
    useEffect(() => {
        if (status !== "authenticated" || !session?.accessToken) {
            console.log("Socket.IO not initialized: User not authenticated or no token");
            return;
        }

        const socket = io(API_BASE_URL, {
            query: { token: session.accessToken },
            reconnectionAttempts: 5,
            reconnectionDelay: 5000,
        });
        socketRef.current = socket;

        socket.on("connect", () => {
            console.log("Socket.IO connected successfully");
            socket.emit("joinChat");
            setError("");
        });

        socket.on("NEW_COMMENT", (data) => {
            console.log("Received NEW_COMMENT:", data);
            setComments((prevComments) => {
                let updatedComments = [...prevComments];
                if (updatedComments.some(c => c._id === data._id)) {
                    console.log("Comment already exists, updating:", data._id);
                    return updatedComments.map(c =>
                        c._id === data._id ? { ...c, ...data } : c
                    );
                }
                console.log("Adding new comment:", data._id);
                if (!data.parentComment) {
                    updatedComments.push(data);
                } else {
                    const updateChildComments = (comments) => {
                        return comments.map((comment) => {
                            if (comment._id === data.parentComment) {
                                return {
                                    ...comment,
                                    childComments: [...(comment.childComments || []), data],
                                };
                            }
                            if (comment.childComments) {
                                return {
                                    ...comment,
                                    childComments: updateChildComments(comment.childComments),
                                };
                            }
                            return comment;
                        });
                    };
                    updatedComments = updateChildComments(updatedComments);
                }
                return sortComments(updatedComments);
            });
            if (isAtBottom && commentListRef.current) {
                console.log("Auto-scrolling to bottom");
                commentListRef.current.scrollTop = commentListRef.current.scrollHeight;
            }
        });

        socket.on("LIKE_UPDATE", (data) => {
            console.log("Received LIKE_UPDATE:", data);
            setComments((prevComments) => {
                const updatedComments = prevComments.map(c =>
                    c._id === data._id ? { ...c, ...data } : c
                );
                return sortComments(updatedComments);
            });
        });

        socket.on("DELETE_COMMENT", (data) => {
            console.log("Received DELETE_COMMENT:", data);
            setComments((prevComments) => {
                const updatedComments = prevComments.filter(c => c._id !== data._id);
                const removeChildComments = (comments) => {
                    return comments
                        .filter(c => c._id !== data._id)
                        .map(c => ({
                            ...c,
                            childComments: c.childComments ? removeChildComments(c.childComments) : [],
                        }));
                };
                return sortComments(removeChildComments(updatedComments));
            });
        });

        socket.on("connect_error", (error) => {
            console.error("Socket.IO connection error:", error.message);
            setError("Mất kết nối thời gian thực. Vui lòng làm mới trang.");
        });

        socket.on("disconnect", (reason) => {
            console.log("Socket.IO disconnected:", reason);
        });

        return () => {
            console.log("Cleaning up Socket.IO connection");
            socket.disconnect();
        };
    }, [status, session?.accessToken, isAtBottom, sortComments]);

    // Polling làm fallback
    useEffect(() => {
        fetchComments();
        const intervalId = setInterval(fetchComments, 30000);
        return () => clearInterval(intervalId);
    }, [fetchComments]);

    // Xử lý cuộn
    useEffect(() => {
        const handleScroll = () => {
            if (commentListRef.current) {
                const { scrollTop, scrollHeight, clientHeight } = commentListRef.current;
                setIsAtBottom(scrollHeight - scrollTop - clientHeight < 50);
            }
        };
        const commentList = commentListRef.current;
        commentList?.addEventListener("scroll", handleScroll);
        return () => commentList?.removeEventListener("scroll", handleScroll);
    }, []);

    // Xử lý click ngoài
    useEffect(() => {
        const handleClickOutside = (event) => {
            let isEmojiPickerClicked = false;
            for (const key in emojiPickerRefs.current) {
                if (emojiPickerRefs.current[key]?.contains(event.target)) {
                    isEmojiPickerClicked = true;
                    break;
                }
            }
            if (!isEmojiPickerClicked) {
                setShowEmojiPicker({});
            }
            if (replyFormRef.current && !replyFormRef.current.contains(event.target) && replyTo) {
                setReplyTo(null);
                setReplyContent("");
                setTaggedUsers([]);
            }
            if (suggestionRef.current && !suggestionRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [replyTo]);

    // Highlight bình luận theo query
    useEffect(() => {
        if (commentId && comments.length > 0) {
            const scrollToComment = (id) => {
                if (commentRefs.current[id]) {
                    commentRefs.current[id].scrollIntoView({ behavior: "smooth", block: "center" });
                    commentRefs.current[id].classList.add(styles.highlighted);
                    setTimeout(() => {
                        commentRefs.current[id]?.classList.remove(styles.highlighted);
                        router.replace('/chat/chat', undefined, { shallow: true });
                    }, 3000);
                }
            };

            const findComment = (comments, id) => {
                for (const c of comments) {
                    if (c._id === id) return c;
                    if (c.childComments) {
                        const found = findComment(c.childComments, id);
                        if (found) {
                            setExpandedComments(prev => ({ ...prev, [c._id]: true }));
                            return found;
                        }
                    }
                }
                return null;
            };

            const targetComment = findComment(comments, commentId);
            if (targetComment) {
                scrollToComment(commentId);
            } else {
                console.error('Comment not found:', commentId);
            }
        } else if (comments.length > 0 && isAtBottom && commentListRef.current) {
            commentListRef.current.scrollTop = commentListRef.current.scrollHeight;
        }
    }, [commentId, comments, router, isAtBottom]);

    const fetchTagSuggestions = async (query) => {
        if (!session?.accessToken) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/users/search?query=${encodeURIComponent(query)}`, {
                headers: {
                    Authorization: `Bearer ${session.accessToken}`,
                    "Content-Type": "application/json",
                },
            });
            if (res.status === 401) {
                signOut({ redirect: false });
                router.push('/login?error=SessionExpired');
                return;
            }
            if (!res.ok) throw new Error("Không thể tải gợi ý");
            const data = await res.json();
            setTagSuggestions(data.filter(user => user.fullname && user.username));
            setShowSuggestions(data.length > 0);
        } catch (error) {
            console.error("Error fetching tag suggestions:", error);
        }
    };

    const handleInputChange = (e, isReply = false) => {
        if (status !== "authenticated") {
            setShowLoginModal(true);
            return;
        }
        const value = e.target.value;
        if (isReply) setReplyContent(value);
        else setComment(value);

        const cursorPosition = e.target.selectionStart;
        const textBeforeCursor = value.slice(0, cursorPosition);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');
        if (lastAtIndex !== -1) {
            const query = textBeforeCursor.slice(lastAtIndex + 1);
            if (query && !query.includes(' ')) {
                fetchTagSuggestions(query);
                const inputRect = e.target.getBoundingClientRect();
                setSuggestionPosition({
                    top: inputRect.bottom + window.scrollY,
                    left: inputRect.left + window.scrollX,
                });
            } else {
                setShowSuggestions(false);
            }
        } else {
            setShowSuggestions(false);
        }
    };

    const handleNewLine = () => {
        if (status !== "authenticated") {
            setShowLoginModal(true);
            return;
        }
        setComment(prev => prev + '\n');
        commentInputRef.current?.focus();
    };

    const handleSelectSuggestion = (user, isReply = false) => {
        const tagText = `@${user.fullname} `;
        if (isReply) {
            const lastAtIndex = replyContent.lastIndexOf('@');
            setReplyContent(prev => prev.slice(0, lastAtIndex) + tagText + prev.slice(replyContent.length));
            setTaggedUsers(prev => [...new Set([...prev, user._id])]);
        } else {
            const lastAtIndex = comment.lastIndexOf('@');
            setComment(prev => prev.slice(0, lastAtIndex) + tagText + prev.slice(comment.length));
            setTaggedUsers(prev => [...new Set([...prev, user._id])]);
        }
        setShowSuggestions(false);
        if (isReply) replyInputRefs.current[replyTo]?.focus();
        else commentInputRef.current?.focus();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (status !== "authenticated") {
            setShowLoginModal(true);
            return;
        }
        if (!comment.trim()) {
            setError("Bình luận không được để trống");
            return;
        }
        setIsLoading(true);
        setError("");

        try {
            const res = await fetch(`${API_BASE_URL}/api/comments`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${session.accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ content: comment, taggedUsers, postId: null }),
            });

            if (res.status === 401) {
                setError("Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.");
                signOut({ redirect: false });
                router.push('/login?error=SessionExpired');
                return;
            }
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Không thể gửi bình luận");
            }

            setComment("");
            setTaggedUsers([]);
            setShowEmojiPicker({});
            setIsAtBottom(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleReplySubmit = async (e, parentId) => {
        e.preventDefault();
        if (status !== "authenticated") {
            setShowLoginModal(true);
            return;
        }
        if (!replyContent.trim()) {
            setError("Bình luận trả lời không được để trống");
            return;
        }
        setIsLoading(true);
        setError("");

        try {
            const res = await fetch(`${API_BASE_URL}/api/comments`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${session.accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ content: replyContent, parentComment: parentId, taggedUsers, postId: null }),
            });

            if (res.status === 401) {
                setError("Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.");
                signOut({ redirect: false });
                router.push('/login?error=SessionExpired');
                return;
            }
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Không thể gửi bình luận trả lời");
            }

            setReplyContent("");
            setReplyTo(null);
            setTaggedUsers([]);
            setShowEmojiPicker({});
            setExpandedComments(prev => ({ ...prev, [parentId]: true }));
            setIsAtBottom(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLike = async (commentId) => {
        if (status !== "authenticated") {
            setShowLoginModal(true);
            return;
        }
        try {
            const res = await fetch(`${API_BASE_URL}/api/comments/${commentId}/like`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${session.accessToken}`,
                    "Content-Type": "application/json",
                },
            });

            if (res.status === 401) {
                setError("Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.");
                signOut({ redirect: false });
                router.push('/login?error=SessionExpired');
                return;
            }
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Không thể thích bình luận");
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDelete = async (commentId) => {
        if (status !== "authenticated") {
            setShowLoginModal(true);
            return;
        }
        if (!confirm("Bạn có chắc muốn xóa bình luận này và các bình luận con?")) return;

        setIsLoading(true);
        setError("");

        try {
            const res = await fetch(`${API_BASE_URL}/api/comments/${commentId}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${session.accessToken}`,
                    "Content-Type": "application/json",
                },
            });

            if (res.status === 401) {
                setError("Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.");
                signOut({ redirect: false });
                router.push('/login?error=SessionExpired');
                return;
            }
            if (res.status === 403) {
                setError("Bạn không có quyền xóa bình luận này. Chỉ ADMIN mới có quyền.");
                return;
            }
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Không thể xóa bình luận");
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleTagUser = (user) => {
        if (status !== "authenticated") {
            setShowLoginModal(true);
            return;
        }
        const tagText = `@${user.fullname} `;
        if (replyTo) {
            if (!replyContent.includes(tagText)) {
                setReplyContent(prev => prev + tagText);
                setTaggedUsers(prev => [...new Set([...prev, user._id])]);
            }
            replyInputRefs.current[replyTo]?.focus();
        } else {
            if (!comment.includes(tagText)) {
                setComment(prev => prev + tagText);
                setTaggedUsers(prev => [...new Set([...prev, user._id])]);
            }
            commentInputRef.current?.focus();
        }
    };

    const handleKeyDown = (e, isReply = false) => {
        if (status !== "authenticated") {
            setShowLoginModal(true);
            return;
        }
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (isReply) {
                handleReplySubmit(e, replyTo);
            } else {
                handleSubmit(e);
            }
        }
    };

    const handleEmojiClick = (emojiObject, commentId = null) => {
        if (status !== "authenticated") {
            setShowLoginModal(true);
            return;
        }
        if (commentId) {
            setReplyContent(prev => prev + emojiObject.emoji);
            replyInputRefs.current[commentId]?.focus();
        } else {
            setComment(prev => prev + emojiObject.emoji);
            commentInputRef.current?.focus();
        }
    };

    const toggleEmojiPicker = (id) => {
        if (status !== "authenticated") {
            setShowLoginModal(true);
            return;
        }
        setShowEmojiPicker(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const toggleExpandComments = (commentId) => {
        setExpandedComments(prev => ({
            ...prev,
            [commentId]: !prev[commentId],
        }));
    };

    const countAllChildComments = (comment) => {
        let count = comment.childComments?.length || 0;
        if (comment.childComments) {
            for (const child of comment.childComments) {
                count += countAllChildComments(child);
            }
        }
        return count;
    };

    const renderCommentContent = (content, taggedUsers) => {
        let renderedContent = content;
        taggedUsers?.forEach(user => {
            if (user?.fullname) {
                const tagRegex = new RegExp(`@${user.fullname}\\b`, 'g');
                renderedContent = renderedContent.replace(
                    tagRegex,
                    `<span class="${styles.taggedUser}">@${user.fullname}</span>`
                );
            }
        });
        return <span dangerouslySetInnerHTML={{ __html: renderedContent }} />;
    };

    const getAvatarClass = (fullname) => {
        const firstChar = fullname[0]?.toLowerCase() || 'a';
        const avatarColors = {
            a: styles.avatarA, b: styles.avatarB, c: styles.avatarC, d: styles.avatarD,
            e: styles.avatarE, f: styles.avatarF, g: styles.avatarG, h: styles.avatarH,
            i: styles.avatarI, j: styles.avatarJ, k: styles.avatarK, l: styles.avatarL,
            m: styles.avatarM, n: styles.avatarN, o: styles.avatarO, p: styles.avatarP,
            q: styles.avatarQ, r: styles.avatarR, s: styles.avatarS, t: styles.avatarT,
            u: styles.avatarU, v: styles.avatarV, w: styles.avatarW, x: styles.avatarX,
            y: styles.avatarY, z: styles.avatarZ,
        };
        return avatarColors[firstChar] || styles.avatarA;
    };

    const renderComment = (c, depth = 0) => {
        const fullname = c.createdBy?.fullname || "Người dùng ẩn danh";
        const firstChar = fullname[0]?.toUpperCase() || "?";
        const role = c.createdBy?.role || "USER";

        return (
            <div
                key={c._id}
                ref={el => (commentRefs.current[c._id] = el)}
                className={`${styles.commentItem} ${styles[`depth-${depth}`]}`}
            >
                <div className={styles.commentHeader}>
                    <div className={`${styles.avatar} ${getAvatarClass(fullname)}`}>
                        {firstChar}
                    </div>
                    <div className={styles.commentInfo}>
                        <span
                            className={`${styles.commentUsername} ${role === 'ADMIN' ? styles.adminUsername : ''}`}
                            onClick={() => c.createdBy && handleTagUser(c.createdBy)}
                        >
                            {fullname} {role === "ADMIN" && "(Admin)"}
                        </span>
                        <span className={styles.date}>
                            {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true, locale: vi })}
                        </span>
                    </div>
                </div>
                <p className={styles.commentContent}>
                    {renderCommentContent(c.content, c.taggedUsers || [])}
                </p>
                <div className={styles.commentActions}>
                    <button
                        className={`${styles.actionLike} ${c.likedBy?.includes(session?.user?.id) ? styles.liked : ''}`}
                        onClick={() => handleLike(c._id)}
                    >
                        Thích ({c.likedBy?.length || 0})
                    </button>
                    {depth < 10 && (
                        <button
                            className={styles.actionReply}
                            onClick={() => {
                                if (status !== "authenticated") {
                                    setShowLoginModal(true);
                                    return;
                                }
                                setReplyTo(c._id);
                            }}
                        >
                            Trả lời
                        </button>
                    )}
                    {session?.user?.role === "ADMIN" && (
                        <button
                            className={styles.actionDelete}
                            onClick={() => handleDelete(c._id)}
                            disabled={isLoading}
                        >
                            Xóa
                        </button>
                    )}
                </div>
                {replyTo === c._id && status === "authenticated" && (
                    <form
                        ref={replyFormRef}
                        className={styles.replyForm}
                        onSubmit={(e) => handleReplySubmit(e, c._id)}
                    >
                        <div className={styles.inputWrapper}>
                            <textarea
                                className={styles.inputReply}
                                value={replyContent}
                                onChange={(e) => handleInputChange(e, true)}
                                onKeyDown={(e) => handleKeyDown(e, true)}
                                placeholder="Nhập trả lời của bạn..."
                                required
                                autoComplete="off"
                                ref={el => (replyInputRefs.current[c._id] = el)}
                            />
                            <button
                                type="button"
                                className={styles.emojiButton}
                                onClick={() => toggleEmojiPicker(c._id)}
                            >
                                😊
                            </button>
                            {showEmojiPicker[c._id] && (
                                <div className={styles.emojiPicker} ref={el => (emojiPickerRefs.current[c._id] = el)}>
                                    <EmojiPicker onEmojiClick={(emoji) => handleEmojiClick(emoji, c._id)} />
                                </div>
                            )}
                            {showSuggestions && (
                                <div
                                    className={styles.suggestionList}
                                    style={{ top: suggestionPosition.top, left: suggestionPosition.left }}
                                    ref={suggestionRef}
                                >
                                    {tagSuggestions.map(user => (
                                        <div
                                            key={user._id}
                                            className={styles.suggestionItem}
                                            onClick={() => handleSelectSuggestion(user, true)}
                                        >
                                            {user.fullname} ({user.username})
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className={styles.buttonActions}>
                            <button
                                className={styles.actionSubmit}
                                type="submit"
                                disabled={isLoading}
                            >
                                Gửi
                            </button>
                            <button
                                className={styles.actionCancel}
                                type="button"
                                onClick={() => {
                                    setReplyTo(null);
                                    setReplyContent("");
                                    setTaggedUsers([]);
                                    setShowEmojiPicker({});
                                    setShowSuggestions(false);
                                }}
                            >
                                Hủy
                            </button>
                        </div>
                    </form>
                )}
                {c.childComments && c.childComments.length > 0 && (
                    <div className={styles.childComments}>
                        {countAllChildComments(c) >= 2 && (
                            <button
                                className={styles.actionToggleComments}
                                onClick={() => toggleExpandComments(c._id)}
                            >
                                {expandedComments[c._id]
                                    ? "Thu gọn"
                                    : `Xem thêm ${countAllChildComments(c)} phản hồi`}
                            </button>
                        )}
                        {(expandedComments[c._id] || countAllChildComments(c) < 2) && (
                            <div className={styles.childCommentsList}>
                                {c.childComments.map((child) => renderComment(child, depth + 1))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    if (status === "loading") {
        return <p className={styles.loading}>Đang tải...</p>;
    }

    if (error) {
        return (
            <div className={styles.chatContainer}>
                <h1 className={styles.title}>Cuộc trò chuyện</h1>
                <p className={styles.error}>Lỗi: {error}</p>
            </div>
        );
    }

    return (
        <div className={styles.chatContainer}>
            <h1 className={styles.title}>Cuộc trò chuyện</h1>
            <div className={styles.commentList} ref={commentListRef}>
                {comments.length === 0 ? (
                    <p className={styles.noComments}>Chưa có bình luận nào.</p>
                ) : (
                    comments.map((c) => renderComment(c, 0))
                )}
            </div>
            <form className={styles.formContainer} onSubmit={handleSubmit}>
                <div className={styles.inputWrapper}>
                    <textarea
                        className={styles.inputComment}
                        value={comment}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        onClick={() => {
                            if (status !== "authenticated") {
                                setShowLoginModal(true);
                            }
                        }}
                        placeholder="Nhập bình luận của bạn..."
                        required
                        autoComplete="off"
                        ref={commentInputRef}
                        readOnly={status !== "authenticated"}
                    />
                    {status === "authenticated" && (
                        <>
                            <button
                                type="button"
                                className={styles.emojiButton}
                                onClick={() => toggleEmojiPicker('main')}
                            >
                                😊
                            </button>
                            <button
                                type="button"
                                className={styles.newLineButton}
                                onClick={handleNewLine}
                            >
                                ⏎
                            </button>
                            {showEmojiPicker.main && (
                                <div className={styles.emojiPicker} ref={el => (emojiPickerRefs.current.main = el)}>
                                    <EmojiPicker onEmojiClick={(emoji) => handleEmojiClick(emoji)} />
                                </div>
                            )}
                            {showSuggestions && (
                                <div
                                    className={styles.suggestionList}
                                    style={{ top: suggestionPosition.top, left: suggestionPosition.left }}
                                    ref={suggestionRef}
                                >
                                    {tagSuggestions.map(user => (
                                        <div
                                            key={user._id}
                                            className={styles.suggestionItem}
                                            onClick={() => handleSelectSuggestion(user)}
                                        >
                                            {user.fullname} ({user.username})
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
                {error && <p className={styles.error}>{error}</p>}
                {status === "authenticated" && (
                    <button
                        className={styles.actionSubmit}
                        type="submit"
                        disabled={isLoading}
                    >
                        {isLoading ? "Đang gửi..." : "Gửi"}
                    </button>
                )}
            </form>
            {showLoginModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.loginModal}>
                        <p>Vui lòng đăng nhập để bình luận.</p>
                        <Link href="/login" className={styles.loginButton}>
                            Đăng nhập
                        </Link>
                        <button
                            className={styles.cancelButton}
                            onClick={() => setShowLoginModal(false)}
                        >
                            Hủy
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}