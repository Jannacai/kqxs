"use client";

import { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import io from 'socket.io-client';
import axios from 'axios';

import Link from 'next/link';
import styles from '../../styles/Leaderboard.module.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

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
    const modalRef = useRef(null);
    const titleRefs = useRef({});
    const socketRef = useRef(null);

    const fetchLeaderboard = async () => {
        setIsLoading(true);
        try {
            console.log('Fetching leaderboard from:', `${API_BASE_URL}/api/users/leaderboard`);
            const headers = session?.accessToken
                ? {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.accessToken}`,
                }
                : {
                    'Content-Type': 'application/json',
                };
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
        });

        socket.on('connect_error', (err) => {
            console.error('Socket.IO connection error:', err.message);
            setError('Mất kết nối thời gian thực. Vui lòng làm mới trang.');
        });

        socket.on('USER_UPDATED', (updatedUser) => {
            console.log('Received USER_UPDATED:', updatedUser);
            setPlayers((prev) =>
                prev
                    .map((player) =>
                        player._id === updatedUser._id
                            ? {
                                ...player,
                                points: updatedUser.points,
                                titles: updatedUser.titles,
                                winCount: updatedUser.winCount,
                            }
                            : player
                    )
                    .sort((a, b) => (sortBy === 'winCount' ? b.winCount - a.winCount : b.points - a.points))
            );
        });

        return () => {
            socket.disconnect();
            console.log('Socket.IO disconnected for leaderboard');
        };
    }, [session, sortBy]);

    const handleClickOutside = (event) => {
        if (modalRef.current && !modalRef.current.contains(event.target)) {
            setShowModal(false);
            setSelectedPlayer(null);
        }
        if (!Object.values(titleRefs.current).some((ref) => ref && ref.contains(event.target))) {
            setExpandedTitles({});
        }
    };

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleShowDetails = (player) => {
        setShowModal(true);
        setSelectedPlayer(player);
        setExpandedTitles({});
    };

    const handleToggleTitles = (playerId) => {
        setExpandedTitles((prev) => ({
            ...prev,
            [playerId]: !prev[playerId],
        }));
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
                <span className={styles.rankCircle}>{index + 1}</span>
    
                <div className={styles.playerHeader}>
                    {player.img ? (
                        <img
                            src={player.img}
                            alt={fullname}
                            className={styles.avatarImage}
                            onClick={() => handleShowDetails(player)}
                        />
                    ) : (
                        <div
                            className={`${styles.avatar} ${getAvatarClass(fullname)}`}
                            onClick={() => handleShowDetails(player)}
                        >
                            {firstChar}
                        </div>
                    )}
                    <div className={styles.playerInfo}>
                        <span
                            className={styles.playerName}
                            onClick={() => handleShowDetails(player)}
                        >
                            {fullname}
                        </span>
                        <div className={styles.titleWrapper}>
                            <span className={`${styles.titles} ${styles[titleClass]}`}>
                                {highestTitle}
                            </span>
                            {player.titles?.length > 1 && (
                                <button
                                    className={styles.toggleButton}
                                    onClick={() => handleToggleTitles(player._id)}
                                >
                                    {expandedTitles[player._id] ? '▲' : '▼'}
                                </button>
                            )}
                        </div>
                    </div>
                    <span className={styles.points}>
                        {sortBy === 'winCount' ? `Số lần trúng: ${player.winCount || 0}` : `Điểm: ${player.points || 0}`}
                    </span>
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
                                    <span key={index} className={`${styles.titles} ${styles[titleClass]}`}>
                                        {title}
                                    </span>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Top 50 Thánh Bảng</h1>
            {isLoading && <p className={styles.loading}>Đang tải...</p>}
            {error && <p className={styles.error}>{error}</p>}
            <div className={styles.sortOptions}>
                <label>Sắp xếp theo: </label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                    <option value="points">Điểm</option>
                    <option value="winCount">Số lần trúng</option>
                </select>
            </div>
            <div className={styles.playerList}>
                {players.length === 0 ? (
                    <p className={styles.noPlayers}>Chưa có người chơi nào.</p>
                ) : (
                    players.map((player, index) => renderPlayer(player, index))
                )}
            </div>
            {showModal && selectedPlayer && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal} ref={modalRef}>
                        <h2 className={styles.modalTitle}>Chi Tiết Người Chơi</h2>
                        {selectedPlayer.img ? (
                            <img
                                src={selectedPlayer.img}
                                alt={selectedPlayer.fullname}
                                className={styles.modalAvatar}
                            />
                        ) : (
                            <div
                                className={`${styles.avatar} ${getAvatarClass(selectedPlayer.fullname)}`}
                            >
                                {(selectedPlayer.fullname?.[0]?.toUpperCase()) || '?'}
                            </div>
                        )}
                        <p><strong>Tên:</strong> {selectedPlayer.fullname || 'Người chơi ẩn danh'}</p>
                        <p><strong>Cấp độ:</strong> {selectedPlayer.level || 1}</p>
                        <p><strong>Số điểm:</strong> {selectedPlayer.points || 0}</p>
                        <p><strong>Số lần trúng:</strong> {selectedPlayer.winCount || 0}</p>
                        <p>
                            <strong>Danh hiệu:</strong>{' '}
                            <span className={styles.titles}>
                                {selectedPlayer.titles?.map((title, index) => {
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
                                        <span
                                            key={index}
                                            className={`${styles.titles} ${styles[titleClass]} ${title === getHighestTitle(selectedPlayer.points || 0, selectedPlayer.titles || [])
                                                ? styles.highestTitle
                                                : ''
                                                }`}
                                        >
                                            {title}
                                        </span>
                                    );
                                }) || 'Tân thủ'}
                            </span>
                        </p>
                        <button
                            className={styles.cancelButton}
                            onClick={() => {
                                setShowModal(false);
                                setSelectedPlayer(null);
                            }}
                        >
                            Đóng
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Leaderboard;