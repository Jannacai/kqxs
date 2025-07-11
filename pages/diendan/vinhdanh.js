"use client";

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import Link from 'next/link';
import styles from '../../styles/vinhdanh.module.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL3 || 'http://localhost:5001';

const AwardLeaderboard = () => {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [winners, setWinners] = useState([]);
    const [fetchError, setFetchError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const modalRef = useRef(null);
    const socketRef = useRef(null);

    // Lấy danh sách người trúng giải
    const fetchWinners = async () => {
        setIsLoading(true);
        try {
            console.log('Fetching winners from:', `${API_BASE_URL}/api/lottery/awards`);
            const headers = session?.accessToken
                ? {
                    Authorization: `Bearer ${session.accessToken}`,
                    'Content-Type': 'application/json',
                    // 'User-Agent': 'AwardLeaderboard-Client',
                }
                : {
                    'Content-Type': 'application/json',
                    // 'User-Agent': 'AwardLeaderboard-Client',
                };
            const res = await axios.get(`${API_BASE_URL}/api/lottery/awards`, { headers });

            if (res.status === 401 && session?.accessToken) {
                setFetchError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
                signOut({ redirect: false });
                router.push('/login?error=SessionExpired');
                return;
            }

            setWinners(res.data.sort((a, b) => b.points - a.points));
            setFetchError('');
        } catch (err) {
            console.error('Error fetching winners:', err.message);
            if (err.response?.status === 401 && session?.accessToken) {
                setFetchError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
                signOut({ redirect: false });
                router.push('/login?error=SessionExpired');
            } else if (err.response?.status === 404) {
                setFetchError('Không tìm thấy danh sách người trúng giải');
            } else {
                setFetchError(err.response?.data?.message || 'Không thể tải danh sách người trúng giải');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Gọi API và thiết lập Socket.IO
    useEffect(() => {
        if (status === 'loading') return;

        fetchWinners();

        // Thiết lập Socket.IO (chỉ cho người dùng đã đăng nhập)
        if (session?.accessToken) {
            console.log('Initializing Socket.IO with URL:', API_BASE_URL);
            console.log('Access Token for Socket.IO:', session.accessToken);
            const socket = io(API_BASE_URL, {
                query: { token: session.accessToken },
                reconnectionAttempts: 5,
                reconnectionDelay: 5000,
            });
            socketRef.current = socket;

            socket.on('connect', () => {
                console.log('Socket.IO connected successfully:', socket.id);
                socket.emit('joinLotteryFeed');
                setFetchError('');
            });

            socket.on('LOTTERY_RESULT_CHECKED', (data) => {
                console.log('Received LOTTERY_RESULT_CHECKED:', data);
                fetchWinners();
            });

            socket.on('USER_UPDATED', (data) => {
                console.log('Received USER_UPDATED:', data);
                fetchWinners();
            });

            socket.on('LOTTERY_RESULT_ERROR', (data) => {
                console.error('Received LOTTERY_RESULT_ERROR:', data);
                setFetchError(data.message || 'Lỗi khi đối chiếu kết quả xổ số');
            });

            socket.on('connect_error', (error) => {
                console.error('Socket.IO connection error:', error.message);
                setFetchError('Mất kết nối thời gian thực. Vui lòng làm mới trang.');
            });

            socket.on('reconnect_attempt', () => {
                console.log('Attempting to reconnect to Socket.IO');
            });

            socket.on('reconnect', () => {
                console.log('Reconnected to Socket.IO');
                socket.emit('joinLotteryFeed');
            });

            socket.on('disconnect', (reason) => {
                console.log('Socket.IO disconnected:', reason);
            });

            return () => {
                console.log('Cleaning up Socket.IO connection');
                socket.disconnect();
            };
        }
    }, [status, session]);

    // Đóng modal khi nhấp ra ngoài
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                setIsModalOpen(false);
                setSelectedUser(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Mở modal khi nhấp vào người dùng
    const handleUserClick = (user) => {
        setSelectedUser(user);
        setIsModalOpen(true);
    };

    // Hàm lấy chữ cái đầu của tên
    const getInitials = (fullname) => {
        if (!fullname) return 'U';
        const nameParts = fullname.trim().split(' ');
        return nameParts[nameParts.length - 1].charAt(0).toUpperCase();
    };

    return (
        <div className={styles.leaderboard}>
            <h2 className={styles.title}>Bảng Vinh Danh Trúng Giải</h2>
            {fetchError && <p className={styles.error}>{fetchError}</p>}
            {isLoading && <p className={styles.loading}>Đang tải...</p>}
            {winners.length === 0 && !isLoading ? (
                <p className={styles.noWinners}>Chưa có người trúng giải.</p>
            ) : (
                <div className={styles.winnerList}>
                    {winners.map((winner, index) => (
                        <div key={winner._id} className={styles.winnerItem}>
                            <span className={styles.rank}>{index + 1}</span>
                            <div
                                className={styles.avatar}
                                onClick={() => handleUserClick(winner)}
                            >
                                {winner.img ? (
                                    <img
                                        src={winner.img}
                                        alt="Avatar"
                                        className={styles.avatarImage}
                                    />
                                ) : (
                                    getInitials(winner.fullname)
                                )}
                            </div>
                            <span
                                className={styles.fullname}
                                onClick={() => handleUserClick(winner)}
                            >
                                {winner.fullname}
                            </span>
                            <span className={styles.highestTitle}>
                                {winner.highestTitle || 'Chưa có danh hiệu'}
                            </span>
                            <span className={styles.level}>Cấp {winner.level}</span>
                        </div>
                    ))}
                </div>
            )}
            {isModalOpen && selectedUser && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal} ref={modalRef}>
                        <div className={styles.modalHeader}>
                            <h3>Thông Tin Người Trúng Giải</h3>
                            <button
                                className={styles.closeButton}
                                onClick={() => setIsModalOpen(false)}
                            >
                                ✕
                            </button>
                        </div>
                        <div className={styles.modalContent}>
                            <p><strong>Họ tên:</strong> {selectedUser.fullname}</p>
                            <p>
                                <strong>Danh hiệu:</strong>{' '}
                                {selectedUser.titles?.join(', ') || 'Chưa có danh hiệu'}
                            </p>
                            <p><strong>Điểm số:</strong> {selectedUser.points}</p>
                            <p><strong>Cấp độ:</strong> {selectedUser.level}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AwardLeaderboard;