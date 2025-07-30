"use client";

import { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import io from 'socket.io-client';
import axios from 'axios';
import Image from 'next/image';
import star1 from '../asset/img/start 1.png';
import PrivateChat from './chatrieng';
import UserInfoModal from './modals/UserInfoModal';
import styles from '../../styles/Leaderboard.module.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL3 || 'http://localhost:5001';

const TITLE_THRESHOLDS = [
    { title: 'Tân thủ', minPoints: 0, maxPoints: 100 },
    { title: 'Học Giả', minPoints: 101, maxPoints: 500 },
    { title: 'Chuyên Gia', minPoints: 501, maxPoints: 1000 },
    { title: 'Thần Số Học', minPoints: 1001, maxPoints: 2000 },
    { title: 'Thần Chốt Số', minPoints: 2001, maxPoints: 5000 },
];

const Leaderboard = () => {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [players, setPlayers] = useState([]);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [expandedTitles, setExpandedTitles] = useState({});
    const [sortBy, setSortBy] = useState('points');
    const [privateChats, setPrivateChats] = useState([]);
    const titleRefs = useRef({});
    const socketRef = useRef(null);

    const fetchLeaderboard = async () => {
        setIsLoading(true);
        try {
            console.log('Fetching leaderboard from:', `${API_BASE_URL}/api/users/leaderboard`);
            const headers = session?.accessToken
                ? { Authorization: `Bearer ${session.accessToken}`, 'Content-Type': 'application/json' }
                : { 'Content-Type': 'application/json' };
            const res = await axios.get(`${API_BASE_URL}/api/users/leaderboard`, {
                headers,
                params: { limit: 50, sortBy },
            });
            console.log('Leaderboard data:', res.data.users);
            setPlayers(res.data.users || []);
            setError('');
        } catch (err) {
            console.error('Error fetching leaderboard:', err.message);
            if (err.response?.status === 401 && session?.accessToken) {
                setError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
                signOut({ redirect: false });
                router.push('/login?error=SessionExpired');
            } else {
                setError(err.response?.data?.message || 'Đã có lỗi xảy ra khi lấy bảng xếp hạng');
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (status === 'loading') return;
        fetchLeaderboard();
    }, [status, sortBy]);

    useEffect(() => {
        if (!session?.accessToken) {
            console.log('Socket.IO not initialized: No token');
            return;
        }

        const socket = io(API_BASE_URL, {
            query: { token: session.accessToken },
            reconnectionAttempts: 5,
            reconnectionDelay: 5000,
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Socket.IO connected for leaderboard:', socket.id);
            socket.emit('joinLeaderboard');
            socket.emit('joinPrivateRoom', session.user?._id || session.user?.id);
        });

        socket.on('connect_error', (err) => {
            console.error('Socket.IO connection error:', err.message);
            if (err.message.includes('Authentication error')) {
                setError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
                signOut({ redirect: false });
                router.push('/login?error=SessionExpired');
            } else {
                setError('Mất kết nối thời gian thực. Vui lòng làm mới trang.');
            }
        });

        socket.on('USER_UPDATED', (updatedUser) => {
            console.log('Received USER_UPDATED:', updatedUser);
            setPlayers((prev) =>
                prev
                    .map((player) =>
                        player._id === updatedUser._id
                            ? { ...player, points: updatedUser.points, titles: updatedUser.titles, winCount: updatedUser.winCount }
                            : player
                    )
                    .sort((a, b) => (sortBy === 'winCount' ? b.winCount - a.winCount : b.points - a.points))
            );
        });

        socket.on('PRIVATE_MESSAGE', (message) => {
            console.log('Received PRIVATE_MESSAGE:', message);
            setPrivateChats((prev) =>
                prev.map((chat) =>
                    chat.receiver._id === message.senderId || chat.receiver._id === message.receiverId
                        ? { ...chat, messages: [...(chat.messages || []), message] }
                        : chat
                )
            );
        });

        return () => {
            socketRef.current?.disconnect();
            console.log('Socket.IO disconnected for leaderboard');
        };
    }, [session, sortBy]);

    const handleShowDetails = (player) => {
        console.log('handleShowDetails called with player:', player);
        if (!player?._id) {
            console.error('Invalid player ID:', player?._id);
            setError('ID người chơi không hợp lệ');
            return;
        }
        setSelectedPlayer(player);
        setShowModal(true);
        setExpandedTitles({});
    };

    const handleToggleTitles = (playerId) => {
        console.log('handleToggleTitles called for playerId:', playerId);
        setExpandedTitles((prev) => ({
            ...prev,
            [playerId]: !prev[playerId],
        }));
    };

    const openPrivateChat = (player) => {
        console.log('openPrivateChat called with player:', player);
        console.log('Current user:', session?.user);
        if (!session?.user) {
            setError('Vui lòng đăng nhập để mở chat riêng');
            return;
        }
        const isCurrentUserAdmin = session.user.role?.toLowerCase() === 'admin';
        const isTargetAdmin = player.role?.toLowerCase() === 'admin';
        if (!isCurrentUserAdmin && !isTargetAdmin) {
            setError('Bạn chỉ có thể chat riêng với admin');
            return;
        }
        setPrivateChats((prev) => {
            if (prev.some((chat) => chat.receiver._id === player._id)) {
                console.log('Chat already open, unminimizing');
                return prev.map((chat) =>
                    chat.receiver._id === player._id ? { ...chat, isMinimized: false } : chat
                );
            }
            console.log('Opening new chat with:', player);
            console.log('privateChats updated:', [...prev, { receiver: player, isMinimized: false, messages: [] }]);
            return [...prev, { receiver: player, isMinimized: false, messages: [] }];
        });
    };

    const closePrivateChat = (receiverId) => {
        console.log('Closing private chat with ID:', receiverId);
        setPrivateChats((prev) => prev.filter((chat) => chat.receiver._id !== receiverId));
    };

    const toggleMinimizePrivateChat = (receiverId) => {
        console.log('Toggling minimize for chat with ID:', receiverId);
        setPrivateChats((prev) =>
            prev.map((chat) =>
                chat.receiver._id === receiverId ? { ...chat, isMinimized: !chat.isMinimized } : chat
            )
        );
    };

    const getHighestTitle = (points, titles) => {
        const validTitle = TITLE_THRESHOLDS.slice()
            .reverse()
            .find((threshold) => points >= threshold.minPoints && points <= threshold.maxPoints);
        return validTitle?.title && titles.includes(validTitle.title) ? validTitle.title : titles[0] || 'Tân thủ';
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

    const renderPlayer = (player, index) => {
        const fullname = player.fullname || 'Người chơi ẩn danh';
        const firstChar = fullname[0]?.toUpperCase() || '?';
        const highestTitle = getHighestTitle(player.points || 0, player.titles || []);
        const titleClass = highestTitle.toLowerCase().includes('học giả')
            ? 'hocgia'
            : highestTitle.toLowerCase().includes('chuyên gia')
                ? 'chuyengia'
                : highestTitle.toLowerCase().includes('thần số học')
                    ? 'thansohoc'
                    : highestTitle.toLowerCase().includes('thần chốt số')
                        ? 'thanchotso'
                        : 'tanthu';

        return (
            <div key={player._id} className={styles.playerItem}>
                {/* Rank Badge */}
                <div className={styles.rankBadge}>
                    <span className={styles.rankNumber}>{index + 1}</span>
                    {index < 3 && <div className={`${styles.rankCrown} ${styles[`rank${index + 1}`]}`}>👑</div>}
                </div>

                {/* Player Content */}
                <div className={styles.playerContent}>
                    {/* Avatar Section */}
                    <div className={styles.avatarSection}>
                        {player.img ? (
                            <Image
                                src={player.img}
                                alt={fullname}
                                className={styles.avatarImage}
                                width={48}
                                height={48}
                                onClick={() => handleShowDetails(player)}
                                role="button"
                                aria-label={`Xem chi tiết ${fullname}`}
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                }}
                            />
                        ) : (
                            <div
                                className={`${styles.avatar} ${getAvatarClass(fullname)}`}
                                onClick={() => handleShowDetails(player)}
                                role="button"
                                aria-label={`Xem chi tiết ${fullname}`}
                            >
                                {firstChar}
                            </div>
                        )}
                    </div>

                    {/* Player Info */}
                    <div className={styles.playerInfo}>
                        <div className={styles.playerHeader}>
                            <span
                                className={styles.playerName}
                                onClick={() => handleShowDetails(player)}
                                role="button"
                                aria-label={`Xem chi tiết ${fullname}`}
                            >
                                {fullname}
                            </span>
                            <div className={styles.titleSection}>
                                <span className={`${styles.titleBadge} ${styles[titleClass]}`}>
                                    {highestTitle}
                                </span>
                                {player.titles?.length > 1 && (
                                    <button
                                        className={styles.toggleButton}
                                        onClick={() => handleToggleTitles(player._id)}
                                        aria-label="Xem tất cả danh hiệu"
                                    >
                                        {expandedTitles[player._id] ? '▲' : '▼'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Expanded Titles */}
                        {expandedTitles[player._id] && player.titles?.length > 1 && (
                            <div
                                className={styles.expandedTitles}
                                ref={(el) => (titleRefs.current[player._id] = el)}
                            >
                                {player.titles.map((title, index) => {
                                    const titleClass = title.toLowerCase().includes('học giả')
                                        ? 'hocgia'
                                        : title.toLowerCase().includes('chuyên gia')
                                            ? 'chuyengia'
                                            : title.toLowerCase().includes('thần số học')
                                                ? 'thansohoc'
                                                : title.toLowerCase().includes('thần chốt số')
                                                    ? 'thanchotso'
                                                    : 'tanthu';
                                    return (
                                        <span key={index} className={`${styles.titleBadge} ${styles[titleClass]}`}>
                                            {title}
                                        </span>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Stats Section */}
                    <div className={styles.statsSection}>
                        <div className={styles.statItem}>
                            <span className={styles.statLabel}>
                                {sortBy === 'winCount' ? 'Trúng' : 'Điểm'}
                            </span>
                            <span className={styles.statValue}>
                                {sortBy === 'winCount' ? player.winCount || 0 : player.points || 0}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className={styles.container}>
            {/* Header Section */}
            <div className={styles.header}>
                <div className={styles.headerContent}>
                    <h1 className={styles.title}>
                        <span className={styles.titleIcon}>🏆</span>
                        Top 50 Thánh Bảng
                    </h1>
                    <div className={styles.stats}>
                        <span className={styles.statItem}>
                            <span className={styles.statIcon}>👥</span>
                            Tổng: {players.length}
                        </span>
                    </div>
                </div>
            </div>

            {/* Filter Section */}
            <div className={styles.filterSection}>
                <div className={styles.sortOptions}>
                    <label className={styles.sortLabel}>Sắp xếp theo:</label>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className={styles.sortSelect}
                    >
                        <option value="points">Điểm số</option>
                        <option value="winCount">Số lần trúng</option>
                    </select>
                </div>
            </div>

            {/* Loading & Error States */}
            {isLoading && (
                <div className={styles.loadingContainer}>
                    <div className={styles.loadingSpinner}></div>
                    <span className={styles.loadingText}>Đang tải bảng xếp hạng...</span>
                </div>
            )}

            {error && (
                <div className={styles.errorContainer}>
                    <span className={styles.errorIcon}>⚠️</span>
                    <span className={styles.errorText}>{error}</span>
                </div>
            )}

            {/* Player List */}
            <div className={styles.playerList}>
                {players.length === 0 && !isLoading ? (
                    <div className={styles.emptyState}>
                        <span className={styles.emptyIcon}>📊</span>
                        <p className={styles.emptyText}>Chưa có người chơi nào.</p>
                    </div>
                ) : (
                    players.map((player, index) => {
                        console.log('Rendering player:', player);
                        return renderPlayer(player, index);
                    })
                )}
            </div>
            {showModal && selectedPlayer && (
                <UserInfoModal
                    selectedUser={selectedPlayer}
                    setSelectedUser={setSelectedPlayer}
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
};

export default Leaderboard;