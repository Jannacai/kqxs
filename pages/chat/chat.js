import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
    const [socketConnected, setSocketConnected] = useState(false);
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

    const debounce = (func, wait) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    };

    useEffect(() => {
        socketRef.current = io(API_BASE_URL, {
            withCredentials: true,
            transports: ['websocket', 'polling'],
            query: { userId: session?.user?.id },
            extraHeaders: {
                Authorization: session?.accessToken ? `Bearer ${session.accessToken}` : '',
            },
        });

        socketRef.current.on('connect', () => {
            setSocketConnected(true);
        });

        socketRef.current.on('connect_error', (err) => {
            setSocketConnected(false);
            setError('Không thể kết nối thời gian thực.');
        });

        socketRef.current.on('disconnect', () => {
            setSocketConnected(false);
        });

        socketRef.current.on('newComment', (newComment) => {
            setComments((prev) => {
                const existsInParent = prev.some(c => c._id === newComment._id);
                const existsInChild = prev.some(c =>
                    c.childComments?.some(child => child._id === newComment._id)
                );
                if (existsInParent || existsInChild) {
                    return prev;
                }

                if (newComment.parentComment) {
                    const updateComments = (comments) => {
                        return comments.map((c) => {
                            if (c._id === newComment.parentComment) {
                                return {
                                    ...c,
                                    childComments: [
                                        ...(c.childComments || []),
                                        newComment,
                                    ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
                                };
                            }
                            return {
                                ...c,
                                childComments: updateComments(c.childComments || []),
                            };
                        });
                    };
                    return sortComments(updateComments(prev));
                } else {
                    return sortComments([...prev, newComment]);
                }
            });
            setIsAtBottom(true);
        });

        socketRef.current.on('updateComment', (updatedComment) => {
            setComments((prev) => {
                const updateCommentTree = (comments) => {
                    return comments.map((c) =>
                        c._id === updatedComment._id
                            ? { ...c, ...updatedComment }
                            : { ...c, childComments: updateCommentTree(c.childComments || []) }
                    );
                };
                return sortComments(updateCommentTree(prev));
            });
        });

        socketRef.current.on('deleteComment', ({ commentId: deletedId }) => {
            setComments((prev) => {
                const removeComment = (comments) => {
                    return comments
                        .filter((c) => c._id !== deletedId)
                        .map((c) => ({
                            ...c,
                            childComments: removeComment(c.childComments || []),
                        }));
                };
                return sortComments(removeComment(prev));
            });
            if (commentId === deletedId) {
                router.replace('/chat/chat', undefined, { shallow: true });
            }
        });

        return () => {
            socketRef.current.disconnect();
        };
    }, [session?.accessToken, commentId, router]);

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
            if (!res.ok) {
                throw new Error("Không thể tải bình luận");
            }
            const data = await res.json();
            setComments(sortComments(data));
        } catch (err) {
            setError(err.message);
        }
    }, [session, router]);

    useEffect(() => {
        fetchComments();
    }, [fetchComments]);

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

    useEffect(() => {
        if (comments.length > 0 && commentListRef.current && isAtBottom) {
            commentListRef.current.scrollTop = commentListRef.current.scrollHeight;
        }
    }, [comments, isAtBottom]);

    useEffect(() => {
        if (!commentId || typeof commentId !== 'string' || comments.length === 0) return;

        let retryCount = 0;
        const maxRetries = 5;

        const scrollToComment = (id) => {
            const ref = commentRefs.current[id];
            if (ref) {
                ref.scrollIntoView({ behavior: "smooth", block: "center" });
                ref.classList.add(styles.highlighted);
                setTimeout(() => {
                    ref.classList.remove(styles.highlighted);
                    router.replace('/chat/chat', undefined, { shallow: true });
                }, 3000);
            } else if (retryCount < maxRetries) {
                retryCount++;
                setTimeout(() => scrollToComment(id), 1000);
            } else {
                setError('Bình luận không tồn tại hoặc đã bị xóa.');
            }
        };

        const findComment = (comments, id) => {
            for (const c of comments) {
                if (c._id === id) {
                    return { comment: c, parentIds: [] };
                }
                if (c.childComments) {
                    const found = findComment(c.childComments, id);
                    if (found) {
                        return { comment: found.comment, parentIds: [c._id, ...found.parentIds] };
                    }
                }
            }
            return null;
        };

        const targetComment = findComment(comments, commentId);
        if (targetComment) {
            setExpandedComments(prev => ({
                ...prev,
                ...targetComment.parentIds.reduce((acc, id) => ({ ...acc, [id]: true }), {}),
            }));
            setTimeout(() => scrollToComment(commentId), 1000);
        } else {
            setError('Bình luận không tồn tại hoặc đã bị xóa.');
            fetchComments();
        }
    }, [commentId, comments, router, fetchComments]);

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

    useEffect(() => {
        if (replyTo && replyInputRefs.current[replyTo]) {
            replyInputRefs.current[replyTo].focus();
        }
    }, [replyTo]);

    const sortComments = useCallback((comments) => {
        return comments
            .map((comment) => ({
                ...comment,
                childComments: comment.childComments ? sortComments(comment.childComments) : [],
            }))
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    }, []);

    const debouncedFetchTagSuggestions = useCallback(
        debounce((query) => {
            if (!session?.accessToken) return;
            fetch(`${API_BASE_URL}/api/users/search?query=${encodeURIComponent(query)}`, {
                headers: {
                    Authorization: `Bearer ${session.accessToken}`,
                    "Content-Type": "application/json",
                },
            })
                .then((res) => {
                    if (res.status === 401) {
                        signOut({ redirect: false });
                        router.push('/login?error=SessionExpired');
                        return null;
                    }
                    if (!res.ok) {
                        throw new Error("Không thể tải gợi ý");
                    }
                    return res.json();
                })
                .then((data) => {
                    if (data) {
                        setTagSuggestions(data);
                        setShowSuggestions(data.length > 0);
                    }
                })
                .catch((error) => { });
        }, 300),
        [session, router]
    );

    const handleInputChange = useCallback((e, isReply = false) => {
        if (status !== "authenticated") {
            setShowLoginModal(true);
            return;
        }
        const value = e.target.value;
        if (isReply) {
            setReplyContent(value);
        } else {
            setComment(value);
        }

        const cursorPosition = e.target.selectionStart;
        const textBeforeCursor = value.slice(0, cursorPosition);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');
        if (lastAtIndex !== -1) {
            const query = textBeforeCursor.slice(lastAtIndex + 1);
            if (query && !query.includes(' ')) {
                debouncedFetchTagSuggestions(query);
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
    }, [debouncedFetchTagSuggestions, status]);

    const handleNewLine = useCallback(() => {
        if (status !== "authenticated") {
            setShowLoginModal(true);
            return;
        }
        setComment((prev) => prev + '\n');
        commentInputRef.current?.focus();
    }, [status]);

    const handleSelectSuggestion = useCallback((user, isReply = false) => {
        const tagText = `@${user.fullname} `;
        if (isReply) {
            const lastAtIndex = replyContent.lastIndexOf('@');
            setReplyContent((prev) => prev.slice(0, lastAtIndex) + tagText);
            setTaggedUsers((prev) => [...new Set([...prev, user._id])]);
            replyInputRefs.current[replyTo]?.focus();
        } else {
            const lastAtIndex = comment.lastIndexOf('@');
            setComment((prev) => prev.slice(0, lastAtIndex) + tagText);
            setTaggedUsers((prev) => [...new Set([...prev, user._id])]);
            commentInputRef.current?.focus();
        }
        setShowSuggestions(false);
    }, [comment, replyContent, replyTo]);

    const handleSubmit = useCallback(async (e) => {
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
                    Authorization: `Bearer ${session?.accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ content: comment, taggedUsers }),
            });

            if (res.status === 401) {
                setError("Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.");
                signOut({ redirect: false });
                router.push('/login?error=SessionExpired');
                return;
            }
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Không thể gửi bình luận");
            }

            setComment("");
            setTaggedUsers([]);
            setShowEmojiPicker({});
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [comment, session, router, taggedUsers]);

    const handleReplySubmit = useCallback(async (e, parentId) => {
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
                    Authorization: `Bearer ${session.accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ content: replyContent, parentComment: parentId, taggedUsers }),
            });

            if (res.status === 401) {
                setError("Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.");
                signOut({ redirect: false });
                router.push('/login?error=SessionExpired');
                return;
            }
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Không thể gửi bình luận trả lời");
            }

            setReplyContent("");
            setReplyTo(null);
            setTaggedUsers([]);
            setShowEmojiPicker({});
            setExpandedComments((prev) => ({ ...prev, [parentId]: true }));
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [replyContent, replyTo, session, router, taggedUsers]);

    const handleLike = useCallback(async (commentId) => {
        if (status !== "authenticated") {
            setShowLoginModal(true);
            return;
        }
        try {
            const res = await fetch(`${API_BASE_URL}/api/comments/${commentId}/like`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${session.accessToken}`,
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
                const errorData = await res.json();
                throw new Error(errorData.error || "Không thể thích bình luận");
            }
        } catch (err) {
            setError(err.message);
        }
    }, [session, router, status]);

    const handleDelete = useCallback(async (commentId) => {
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
                    Authorization: `Bearer ${session.accessToken}`,
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
                const errorData = await res.json();
                throw new Error(errorData.error || "Không thể xóa bình luận");
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [session, router, status]);

    const handleTagUser = useCallback((user) => {
        if (status !== "authenticated") {
            setShowLoginModal(true);
            return;
        }
        const tagText = `@${user.fullname} `;
        if (replyTo) {
            if (!replyContent.includes(tagText)) {
                setReplyContent((prev) => prev + tagText);
                setTaggedUsers((prev) => [...new Set([...prev, user._id])]);
            }
            replyInputRefs.current[replyTo]?.focus();
        } else {
            if (!comment.includes(tagText)) {
                setComment((prev) => prev + tagText);
                setTaggedUsers((prev) => [...new Set([...prev, user._id])]);
            }
            commentInputRef.current?.focus();
        }
    }, [comment, replyContent, replyTo, status]);

    const handleKeyDown = useCallback((e, isReply = false) => {
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
    }, [handleSubmit, handleReplySubmit, replyTo, status]);

    const handleEmojiClick = useCallback((emojiObject, commentId = null) => {
        if (status !== "authenticated") {
            setShowLoginModal(true);
            return;
        }
        if (commentId) {
            setReplyContent((prev) => prev + emojiObject.emoji);
            replyInputRefs.current[commentId]?.focus();
        } else {
            setComment((prev) => prev + emojiObject.emoji);
            commentInputRef.current?.focus();
        }
    }, [status]);

    const toggleEmojiPicker = useCallback((id) => {
        if (status !== "authenticated") {
            setShowLoginModal(true);
            return;
        }
        setShowEmojiPicker((prev) => ({ ...prev, [id]: !prev[id] }));
    }, [status]);

    const countAllChildComments = useCallback((comment) => {
        if (!comment.childComments) return 0;
        let count = comment.childComments.length;
        for (const child of comment.childComments) {
            count += countAllChildComments(child);
        }
        return count;
    }, []);

    const toggleExpandComments = useCallback((commentId) => {
        setExpandedComments(prev => ({
            ...prev,
            [commentId]: !prev[commentId],
        }));
    }, []);

    const renderCommentContent = useCallback((content, taggedUsers) => {
        let renderedContent = content;
        taggedUsers?.forEach((user) => {
            const tagRegex = new RegExp(`@${user.fullname}\\b`, 'g');
            renderedContent = renderedContent.replace(
                tagRegex,
                `<span class="${styles.taggedUser}">@${user.fullname}</span>`
            );
        });
        return <span dangerouslySetInnerHTML={{ __html: renderedContent }} />;
    }, []);

    const getAvatarClass = useCallback((fullname) => {
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
    }, []);

    const renderComment = useCallback(
        (c, depth = 0) => {
            if (!c || !c._id) return null;
            return (
                <div
                    key={c._id}
                    ref={(el) => (commentRefs.current[c._id] = el)}
                    className={`${styles.commentItem} ${styles[`depth-${depth}`]}`}
                >
                    <div className={styles.commentHeader}>
                        <div className={`${styles.avatar} ${getAvatarClass(c.createdBy.fullname)}`}>
                            {c.createdBy.fullname[0].toUpperCase()}
                        </div>
                        <div className={styles.commentInfo}>
                            <span
                                className={`${styles.commentUsername} ${c.createdBy.role === 'ADMIN' ? styles.adminUsername : ''}`}
                                onClick={() => handleTagUser(c.createdBy)}
                            >
                                {c.createdBy.fullname} {c.createdBy.role === "ADMIN" && "(Admin)"}
                            </span>
                            <span className={styles.date}>
                                {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true, locale: vi })}
                            </span>
                        </div>
                    </div>
                    <p className={styles.commentContent}>
                        {renderCommentContent(c.content, c.taggedUsers)}
                    </p>
                    <div className={styles.commentActions}>
                        <button
                            className={`${styles.actionLike} ${c.likedBy.includes(session?.user?.id) ? styles.liked : ''}`}
                            onClick={() => handleLike(c._id)}
                        >
                            Thích ({c.likedBy.length})
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
                                    ref={(el) => (replyInputRefs.current[c._id] = el)}
                                />
                                <button
                                    type="button"
                                    className={styles.emojiButton}
                                    onClick={() => toggleEmojiPicker(c._id)}
                                >
                                    😊
                                </button>
                                {showEmojiPicker[c._id] && (
                                    <div className={styles.emojiPicker} ref={(el) => (emojiPickerRefs.current[c._id] = el)}>
                                        <EmojiPicker onEmojiClick={(emoji) => handleEmojiClick(emoji, c._id)} />
                                    </div>
                                )}
                                {showSuggestions && (
                                    <div
                                        className={styles.suggestionList}
                                        style={{ top: suggestionPosition.top, left: suggestionPosition.left }}
                                        ref={suggestionRef}
                                    >
                                        {tagSuggestions.map((user) => (
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
                            <button
                                className={styles.actionToggleComments}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExpandComments(c._id);
                                }}
                            >
                                {expandedComments[c._id]
                                    ? "Thu gọn"
                                    : `Xem ${countAllChildComments(c)} phản hồi`}
                            </button>
                            {expandedComments[c._id] && (
                                <div className={styles.childCommentsList}>
                                    {c.childComments.map((child) => renderComment(child, depth + 1))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            );
        },
        [
            session,
            status,
            isLoading,
            replyTo,
            replyContent,
            handleLike,
            handleDelete,
            handleReplySubmit,
            handleTagUser,
            handleInputChange,
            handleKeyDown,
            handleEmojiClick,
            toggleEmojiPicker,
            toggleExpandComments,
            countAllChildComments,
            renderCommentContent,
            getAvatarClass,
            tagSuggestions,
            showSuggestions,
            suggestionPosition,
            expandedComments,
        ]
    );

    const memoizedComments = useMemo(() => comments.map((c) => renderComment(c, 0)), [comments, renderComment]);

    if (status === "loading") {
        return <p className={styles.loading}>Đang tải...</p>;
    }

    return (
        <div className={styles.chatContainer}>
            <h1 className={styles.title}>Cuộc trò chuyện</h1>
            {!socketConnected && <p className={styles.warning}>Mất kết nối thời gian thực. Dữ liệu có thể không cập nhật.</p>}
            <div className={styles.commentList} ref={commentListRef}>
                {comments.length === 0 ? (
                    <p className={styles.noComments}>Chưa có bình luận nào.</p>
                ) : (
                    memoizedComments
                )}
            </div>
            <form className={styles.formContainer} onSubmit={handleSubmit}>
                <div className={styles.inputWrapper}>
                    <textarea
                        className={styles.inputComment}
                        value={comment}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Nhập bình luận của bạn..."
                        required
                        autoComplete="off"
                        ref={commentInputRef}
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
                                <div className={styles.emojiPicker} ref={(el) => (emojiPickerRefs.current.main = el)}>
                                    <EmojiPicker onEmojiClick={(emoji) => handleEmojiClick(emoji)} />
                                </div>
                            )}
                            {showSuggestions && (
                                <div
                                    className={styles.suggestionList}
                                    style={{ top: suggestionPosition.top, left: suggestionPosition.left }}
                                    ref={suggestionRef}
                                >
                                    {tagSuggestions.map((user) => (
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