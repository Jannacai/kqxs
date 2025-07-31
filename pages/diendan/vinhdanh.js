"use client";

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import Link from 'next/link';
import styles from '../../styles/vinhdanh.module.css';
import { getSocket, isSocketConnected, addConnectionListener } from '../../utils/Socket';
import { isValidObjectId } from '../../utils/validation';
import moment from 'moment';
import 'moment-timezone';
import Image from 'next/image';
import UserInfoModal from './modals/UserInfoModal';
import PrivateChat from './chatrieng';

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
    const [users, setUsers] = useState([]);
    const [error, setError] = useState('');
    const [usersCache, setUsersCache] = useState({});
    const [showModal, setShowModal] = useState(false);
    const [privateChats, setPrivateChats] = useState([]);
    const [socketConnected, setSocketConnected] = useState(false);
    const mountedRef = useRef(true);

    // Lấy danh sách người trúng giải
    const fetchWinners = async () => {
        setIsLoading(true);
        try {
            console.log('Fetching winners from:', `${API_BASE_URL}/api/lottery/awards`);
            const headers = session?.accessToken
                ? {
                    Authorization: `Bearer ${session.accessToken}`,
                    'Content-Type': 'application/json',
                }
                : {
                    'Content-Type': 'application/json',
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
            
            mountedRef.current = true;

            const initializeSocket = async () => {
                try {
                    const socket = await getSocket();
                    if (!mountedRef.current) return;

                    socketRef.current = socket;
                    setSocketConnected(true);

                    // Thêm connection listener
                    const removeListener = addConnectionListener((connected) => {
                        if (mountedRef.current) {
                            setSocketConnected(connected);
                        }
                    });

                    socket.on('connect', () => {
                        console.log('Socket.IO connected successfully:', socket.id);
                        socket.emit('joinLotteryFeed');
                        setFetchError('');
                        setSocketConnected(true);
                    });

                    socket.on('connect_error', (error) => {
                        console.error('Socket.IO connection error:', error.message);
                        setSocketConnected(false);
                        setError('Mất kết nối thời gian thực. Vui lòng làm mới trang.');
                    });

                    socket.on('disconnect', (reason) => {
                        console.log('Socket.IO disconnected:', reason);
                        setSocketConnected(false);
                    });

                    socket.on('USER_UPDATED', (data) => {
                        console.log('Received USER_UPDATED:', data);
                        if (mountedRef.current && data?._id && isValidObjectId(data._id)) {
                            setUsers((prevUsers) =>
                                prevUsers.map((user) =>
                                    user._id === data._id
                                        ? { ...user, img: data.img, titles: data.titles, points: data.points, winCount: data.winCount, role: data.role }
                                        : user
                                )
                            );
                            setUsersCache((prev) => ({ ...prev, [data._id]: data }));
                        }
                    });

                    socket.on('PRIVATE_MESSAGE', (newMessage) => {
                        console.log('Received PRIVATE_MESSAGE:', JSON.stringify(newMessage, null, 2));
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
                        removeListener();
                        if (socketRef.current) {
                            socketRef.current.off('connect');
                            socketRef.current.off('connect_error');
                            socketRef.current.off('disconnect');
                            socketRef.current.off('USER_UPDATED');
                            socketRef.current.off('PRIVATE_MESSAGE');
                        }
                    };
                } catch (error) {
                    console.error('Failed to initialize socket:', error);
                    setSocketConnected(false);
                }
            };

            initializeSocket();

            return () => {
                mountedRef.current = false;
            };
        }
    }, [status, session, router]);

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