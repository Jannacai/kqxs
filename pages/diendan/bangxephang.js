"use client";

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import styles from '../../styles/Leaderboard.module.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

// Mảng ánh xạ danh hiệu từ users.models.js
const TITLE_THRESHOLDS = [
    { title: 'Tân thủ', minPoints: 0, maxPoints: 100 },
    { title: 'Học Giả', minPoints: 101, maxPoints: 500 },
    { title: 'Chuyên Gia', minPoints: 501, maxPoints: 1000 },
    { title: 'Thần Số Học', minPoints: 1001, maxPoints: 2000 },
    { title: 'Thần Chốt Số', minPoints: 2001, maxPoints: 5000 },
];

const Leaderboard = () => {
    const { data: session } = useSession();
    const [players, setPlayers] = useState([]);
    const [error, setError] = useState('');
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [expandedTitles, setExpandedTitles] = useState({});
    const modalRef = useRef(null);
    const titleRefs = useRef({}); // Lưu ref cho mỗi expandedTitles

    // Lấy danh sách người chơi
    const fetchLeaderboard = async () => {
        try {
            const headers = {
                'Content-Type': 'application/json',
                // 'User-Agent': 'Leaderboard-Client'
            };
            if (session?.accessToken) {
                headers.Authorization = `Bearer ${session.accessToken}`;
            }

            const res = await axios.get(`${API_BASE_URL}/api/users/leaderboard`, {
                headers,
                params: { limit: 50 }
            });

            if (res.status !== 200) {
                throw new Error(res.data.message || 'Không thể lấy bảng xếp hạng');
            }

            setPlayers(res.data.users);
            setError('');
        } catch (err) {
            console.error('Error fetching leaderboard:', err.message);
            setError(err.response?.data?.message || 'Đã có lỗi xảy ra');
        }
    };

    // Gọi API khi component mount
    useEffect(() => {
        fetchLeaderboard();
    }, [session]);

    // Xử lý click ngoài modal và expandedTitles
    useEffect(() => {
        const handleClickOutside = (event) => {
            // Đóng modal
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                setShowModal(false);
                setSelectedPlayer(null);
            }
            // Đóng tất cả expandedTitles
            if (!Object.values(titleRefs.current).some(ref => ref && ref.contains(event.target))) {
                setExpandedTitles({});
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Xử lý click vào avatar hoặc fullname
    const handleShowDetails = (player) => {
        setShowModal(true);
        setSelectedPlayer(player);
        setExpandedTitles({}); // Đóng tất cả danh hiệu khi mở modal
    };

    // Xử lý toggle danh hiệu
    const handleToggleTitles = (playerId) => {
        setExpandedTitles((prev) => ({
            ...prev,
            [playerId]: !prev[playerId]
        }));
    };

    // Tìm danh hiệu cao nhất dựa trên points
    const getHighestTitle = (points, titles) => {
        const validTitle = TITLE_THRESHOLDS.slice().reverse().find(
            threshold => points >= threshold.minPoints && points <= threshold.maxPoints
        );
        return validTitle?.title && titles.includes(validTitle.title) ? validTitle.title : titles[0] || 'Tân thủ';
    };

    // Render avatar
    const getAvatarClass = (fullname) => {
        const firstChar = fullname[0]?.toLowerCase() || 'a';
        const avatarColors = {
            a: styles.avatarA, b: styles.avatarB, c: styles.avatarC, d: styles.avatarD,
            e: styles.avatarE, f: styles.avatarF, g: styles.avatarG, h: styles.avatarH,
            i: styles.avatarI, j: styles.avatarJ, k: styles.avatarK, l: styles.avatarL,
            m: styles.avatarM, n: styles.avatarN, o: styles.avatarO, p: styles.avatarP,
            q: styles.avatarQ, r: styles.avatarR, s: styles.avatarS, t: styles.avatarT,
            u: styles.avatarU, v: styles.avatarV, w: styles.avatarW, x: styles.avatarX,
            y: styles.avatarY, z: styles.avatarZ
        };
        return avatarColors[firstChar] || styles.avatarA;
    };

    // Render mỗi người chơi
    const renderPlayer = (player, index) => {
        const fullname = player.fullname || 'Người chơi ẩn danh';
        const firstChar = fullname[0]?.toUpperCase() || '?';
        const highestTitle = getHighestTitle(player.points || 0, player.titles || []);
        const titleClass = highestTitle.toLowerCase().includes('học giả') ? 'hocgia' :
            highestTitle.toLowerCase().includes('chuyên gia') ? 'chuyengia' :
                highestTitle.toLowerCase().includes('thần số học') ? 'thansohoc' :
                    highestTitle.toLowerCase().includes('thần chốt số') ? 'thanchotso' : 'tanthu';

        return (
            <div key={player._id} className={styles.playerItem}>
                <div className={styles.playerHeader}>
                    <span className={styles.rank}>{index + 1}</span>
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
                    <span className={styles.points}>{player.points || 0}</span>
                </div>
                {expandedTitles[player._id] && player.titles?.length > 1 && (
                    <div
                        className={styles.expandedTitles}
                        ref={(el) => (titleRefs.current[player._id] = el)}
                    >
                        {player.titles.map((title, index) => {
                            const titleClass = title.toLowerCase().includes('học giả') ? 'hocgia' :
                                title.toLowerCase().includes('chuyên gia') ? 'chuyengia' :
                                    title.toLowerCase().includes('thần số học') ? 'thansohoc' :
                                        title.toLowerCase().includes('thần chốt số') ? 'thanchotso' : 'tanthu';
                            return (
                                <span key={index} className={`${styles.titles} ${styles[titleClass]}`}>
                                    {title}
                                </span>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Bảng Xếp Hạng 50</h1>
            {error && <p className={styles.error}>{error}</p>}

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
                        <p><strong>Danh hiệu:</strong> <span className={styles.titles}>
                            {selectedPlayer.titles?.map((title, index) => {
                                const titleClass = title.toLowerCase().includes('học giả') ? 'hocgia' :
                                    title.toLowerCase().includes('chuyên gia') ? 'chuyengia' :
                                        title.toLowerCase().includes('thần số học') ? 'thansohoc' :
                                            title.toLowerCase().includes('thần chốt số') ? 'thanchotso' : 'tanthu';
                                return (
                                    <span
                                        key={index}
                                        className={`${styles.titles} ${styles[titleClass]} ${title === getHighestTitle(selectedPlayer.points || 0, selectedPlayer.titles || []) ? styles.highestTitle : ''
                                            }`}
                                    >
                                        {title}
                                    </span>
                                );
                            }) || 'Tân thủ'}
                        </span></p>
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