"use client";

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';
import moment from 'moment';
import 'moment-timezone';
import axios from 'axios';
import io from 'socket.io-client';
import styles from '../../styles/lotteryRegistration.module.css';
import { formatDistanceToNow } from 'date-fns';
import vi from 'date-fns/locale/vi';
import Link from 'next/link';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export default function LotteryRegistrationFeed() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [registrations, setRegistrations] = useState([]);
    const [error, setError] = useState('');
    const [region, setRegion] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const modalRef = useRef(null);
    const registrationListRef = useRef(null);
    const socketRef = useRef(null);
    const [isAtBottom, setIsAtBottom] = useState(true);

    // Lấy danh sách đăng ký ban đầu
    const fetchRegistrations = async () => {
        try {
            const params = { region, page: 1, limit: 20 };
            console.log('Fetching registrations with params:', params);
            const headers = {
                'Content-Type': 'application/json',
                'User-Agent': 'LotteryRegistrationFeed-Client'
            };
            if (session?.accessToken) {
                headers.Authorization = `Bearer ${session.accessToken}`;
            }

            const res = await axios.get(`${API_BASE_URL}/api/lottery/registrations`, {
                headers,
                params
            });

            if (res.status === 401 && session) {
                setError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
                signOut({ redirect: false });
                router.push('/login?error=SessionExpired');
                return;
            }

            if (res.status !== 200) {
                throw new Error(res.data.message || 'Không thể lấy danh sách đăng ký');
            }

            console.log('Received registrations:', res.data.registrations);
            setRegistrations(res.data.registrations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
            setError('');
        } catch (err) {
            console.error('Error fetching registrations:', err.message);
            setError(err.response?.data?.message || err.message || 'Đã có lỗi xảy ra');
        }
    };

    // Thiết lập Socket.IO
    useEffect(() => {
        console.log('Initializing Socket.IO with URL:', API_BASE_URL);
        const socket = io(API_BASE_URL, {
            query: session?.accessToken ? { token: session.accessToken } : undefined,
            reconnectionAttempts: 5,
            reconnectionDelay: 5000,
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Socket.IO connected successfully:', socket.id);
            socket.emit('joinLotteryFeed');
            setError('');
        });

        socket.on('NEW_LOTTERY_REGISTRATION', (data) => {
            console.log('Received NEW_LOTTERY_REGISTRATION:', data);
            setRegistrations((prevRegistrations) => {
                if (region && data.region !== region) return prevRegistrations;
                if (prevRegistrations.some(r => r._id === data._id)) {
                    return prevRegistrations.map(r => (r._id === data._id ? data : r));
                }
                const updatedRegistrations = [data, ...prevRegistrations].sort(
                    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
                );
                return updatedRegistrations.slice(0, 50);
            });
            if (isAtBottom && registrationListRef.current) {
                registrationListRef.current.scrollTop = registrationListRef.current.scrollHeight;
            }
        });

        socket.on('connect_error', (error) => {
            console.error('Socket.IO connection error:', error.message);
            setError('Mất kết nối thời gian thực. Vui lòng làm mới trang.');
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
    }, [region, isAtBottom, session]);

    // Lấy danh sách đăng ký khi component mount hoặc region thay đổi
    useEffect(() => {
        fetchRegistrations();
        const intervalId = setInterval(fetchRegistrations, 30000);
        return () => clearInterval(intervalId);
    }, [region, status]);

    // Xử lý cuộn
    useEffect(() => {
        const handleScroll = () => {
            if (registrationListRef.current) {
                const { scrollTop, scrollHeight, clientHeight } = registrationListRef.current;
                setIsAtBottom(scrollHeight - scrollTop - clientHeight < 50);
            }
        };
        const registrationList = registrationListRef.current;
        registrationList?.addEventListener('scroll', handleScroll);
        return () => registrationList?.removeEventListener('scroll', handleScroll);
    }, []);

    // Xử lý click ngoài modal
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                setShowModal(false);
                setSelectedUser(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Xử lý click vào avatar
    const handleShowDetails = (user) => {
        setSelectedUser(user);
        setShowModal(true);
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
            y: styles.avatarY, z: styles.avatarZ,
        };
        return avatarColors[firstChar] || styles.avatarA;
    };

    // Render mỗi đăng ký
    const renderRegistration = (registration) => {
        const fullname = registration.userId?.fullname || 'Người dùng ẩn danh';
        const firstChar = fullname[0]?.toUpperCase() || '?';
        const titles = registration.userId?.titles?.join(', ') || 'Không có danh hiệu';

        return (
            <div key={registration._id} className={styles.commentItem}>
                <div className={styles.commentHeader}>
                    <div
                        className={`${styles.avatar} ${getAvatarClass(fullname)}`}
                        onClick={() => handleShowDetails(registration.userId)}
                        style={{ cursor: 'pointer' }}
                    >
                        {firstChar}
                    </div>
                    <div className={styles.commentInfo}>
                        <span className={styles.commentUsername}>{fullname}</span>
                        <span className={styles.date}>
                            {formatDistanceToNow(new Date(registration.createdAt), { addSuffix: true, locale: vi })}
                        </span>
                    </div>
                </div>
                <p className={styles.commentContent}>
                    Đã đăng ký quay số miền <strong>{registration.region}</strong><br />
                    Cấp độ: {registration.userId?.level || 0}<br />
                    Danh hiệu: <span className={styles.titles}>{titles}</span>
                </p>
            </div>
        );
    };

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Thông báo đăng ký quay số</h1>
            {status === 'unauthenticated' && (
                <p className={styles.warning}>
                    Bạn cần <Link href="/login">đăng nhập</Link> để đăng ký quay số.
                </p>
            )}
            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.formGroup}>
                <label className={styles.formLabel}>Lọc theo miền</label>
                <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className={styles.input}
                >
                    <option value="">Tất cả</option>
                    <option value="Nam">Miền Nam</option>
                    <option value="Trung">Miền Trung</option>
                    <option value="Bac">Miền Bắc</option>
                </select>
            </div>

            <div className={styles.commentList} ref={registrationListRef}>
                {registrations.length === 0 ? (
                    <p className={styles.noComments}>Chưa có đăng ký nào.</p>
                ) : (
                    registrations.map((registration) => renderRegistration(registration))
                )}
            </div>

            {showModal && selectedUser && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal} ref={modalRef}>
                        <h2 className={styles.modalTitle}>Chi tiết người dùng</h2>
                        <p><strong>Tên:</strong> {selectedUser.fullname || 'Người dùng ẩn danh'}</p>
                        <p><strong>Cấp độ:</strong> {selectedUser.level || 0}</p>
                        <p><strong>Số điểm:</strong> {selectedUser.points || 0}</p>
                        <p><strong>Danh hiệu:</strong> <span className={styles.titles}>{selectedUser.titles?.join(', ') || 'Không có danh hiệu'}</span></p>
                        <button
                            className={styles.cancelButton}
                            onClick={() => {
                                setShowModal(false);
                                setSelectedUser(null);
                            }}
                        >
                            Đóng
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}