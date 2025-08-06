"use client";

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import Link from 'next/link';
import styles from '../../styles/vinhdanh.module.css';
import { isValidObjectId } from '../../utils/validation';
import moment from 'moment';
import 'moment-timezone';
import Image from 'next/image';
import UserInfoModal from './modals/UserInfoModal';
import PrivateChat from './chatrieng';
import { FaSync } from 'react-icons/fa';

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
    const [users, setUsers] = useState([]);
    const [error, setError] = useState('');
    const [usersCache, setUsersCache] = useState({});
    const [showModal, setShowModal] = useState(false);
    const [privateChats, setPrivateChats] = useState([]);

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

    // Gọi API và thiết lập
    useEffect(() => {
        if (status === 'loading') return;

        fetchWinners();
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

    // Hàm reset để reload dữ liệu
    const handleReset = () => {
        console.log('Resetting winners data...');
        fetchWinners();
    };

    return (
        <div className={styles.leaderboard}>
            <div className={styles.header}>
                <h2 className={styles.title}>Bảng Vinh Danh Trúng Giải</h2>
                <button
                    onClick={handleReset}
                    disabled={isLoading}
                    className={styles.resetButton}
                    title="Làm mới dữ liệu"
                >
                    <FaSync className={`${styles.resetIcon} ${isLoading ? styles.spinning : ''}`} />
                    {isLoading ? 'Đang tải...' : 'Làm mới'}
                </button>
            </div>
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