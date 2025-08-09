"use client";

import { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Image from 'next/image';
import star1 from '../asset/img/start 1.png';
import PrivateChat from './chatrieng';
import UserInfoModal from './modals/UserInfoModal';
import styles from '../../styles/Leaderboard.module.css';
import { FaSync, FaCrown, FaMedal, FaTrophy, FaUser, FaFire } from 'react-icons/fa';

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

    const fetchLeaderboard = async () => {
        setIsLoading(true);
        try {
            const headers = session?.accessToken
                ? { Authorization: `Bearer ${session.accessToken}`, 'Content-Type': 'application/json' }
                : { 'Content-Type': 'application/json' };
            const res = await axios.get(`${API_BASE_URL}/api/users/leaderboard`, {
                headers,
                params: { limit: 50, sortBy },
            });
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

    const handleShowDetails = (player) => {
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
        setExpandedTitles((prev) => ({
            ...prev,
            [playerId]: !prev[playerId],
        }));
    };

    const openPrivateChat = (player) => {
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
                return prev.map((chat) =>
                    chat.receiver._id === player._id ? { ...chat, isMinimized: false } : chat
                );
            }
            return [...prev, { receiver: player, isMinimized: false, messages: [] }];
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

    const handleReset = () => {
        fetchLeaderboard();
    };

    const getRankIcon = (index) => {
        if (index === 0) return <FaCrown className={styles.rankIcon} />;
        if (index === 1) return <FaMedal className={styles.rankIcon} />;
        if (index === 2) return <FaTrophy className={styles.rankIcon} />;
        return null;
    };

    const getRankClass = (index) => {
        if (index === 0) return styles.rankGold;
        if (index === 1) return styles.rankSilver;
        if (index === 2) return styles.rankBronze;
        return styles.rankNormal;
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
            <div key={player._id} className={`${styles.playerCard} ${getRankClass(index)}`}>
                {/* Rank Section */}
                <div className={styles.rankSection}>
                    <div className={styles.rankBadge}>
                        {getRankIcon(index)}
                        <span className={styles.rankNumber}>{index + 1}</span>
                    </div>
                </div>

                {/* Player Content */}
                <div className={styles.playerContent}>
                    {/* Avatar */}
                    <div className={styles.avatarContainer}>
                        {player.img ? (
                            <Image
                                src={player.img}
                                alt={fullname}
                                className={styles.avatarImage}
                                width={56}
                                height={56}
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
                            <h3 className={styles.playerName}>{fullname}</h3>
                            <div className={styles.titleContainer}>
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
                            <div className={styles.expandedTitles}>
                                {player.titles.map((title, titleIndex) => {
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
                                        <span key={titleIndex} className={`${styles.titleBadge} ${styles[titleClass]}`}>
                                            {title}
                                        </span>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Stats */}
                    <div className={styles.statsContainer}>
                        <div className={styles.statItem}>
                            <FaFire className={styles.statIcon} />
                            <span className={styles.statValue}>
                                {sortBy === 'winCount' ? player.winCount || 0 : player.points || 0}
                            </span>
                            <span className={styles.statLabel}>
                                {sortBy === 'winCount' ? 'Trúng' : 'Điểm'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerContent}>
                    <div className={styles.titleSection}>
                        <FaTrophy className={styles.headerIcon} />
                        <h1 className={styles.title}>Top 50 Thánh Bảng</h1>
                    </div>
                    <div className={styles.headerStats}>
                        <div className={styles.statBadge}>
                            <FaUser className={styles.statIcon} />
                            <span>{players.length}</span>
                        </div>
                        <button
                            onClick={handleReset}
                            disabled={isLoading}
                            className={styles.refreshButton}
                            title="Làm mới dữ liệu"
                        >
                            <FaSync className={`${styles.refreshIcon} ${isLoading ? styles.spinning : ''}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Filter */}
            <div className={styles.filterSection}>
                <div className={styles.filterContent}>
                    <label className={styles.filterLabel}>Sắp xếp:</label>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className={styles.filterSelect}
                    >
                        <option value="points">Điểm số</option>
                        <option value="winCount">Số lần trúng</option>
                    </select>
                </div>
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className={styles.loadingState}>
                    <div className={styles.loadingSpinner}></div>
                    <p className={styles.loadingText}>Đang tải bảng xếp hạng...</p>
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className={styles.errorState}>
                    <span className={styles.errorIcon}>⚠️</span>
                    <p className={styles.errorText}>{error}</p>
                </div>
            )}

            {/* Player List */}
            <div className={styles.playerList}>
                {players.length === 0 && !isLoading ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>📊</div>
                        <h3 className={styles.emptyTitle}>Chưa có người chơi</h3>
                        <p className={styles.emptyText}>Chưa có người chơi nào trong hệ thống.</p>
                    </div>
                ) : (
                    players.map((player, index) => renderPlayer(player, index))
                )}
            </div>

            {/* User Info Modal */}
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

            {/* Private Chats */}
            <div className={styles.privateChatsContainer}>
                {privateChats.map((chat, index) => (
                    <PrivateChat
                        key={chat.receiver._id}
                        receiver={chat.receiver}
                        socket={null}
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