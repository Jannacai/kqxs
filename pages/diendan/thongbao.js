"use client";

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
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

    const fetchRegistrations = async () => {
        try {
            const params = { region, page: 1, limit: 20 };
            console.log('Fetching registrations with params:', params);
            const headers = session?.accessToken
                ? { 'Content-Type': 'application/json', Authorization: `Bearer ${session.accessToken}` }
                : { 'Content-Type': 'application/json' };
            const res = await axios.get(`${API_BASE_URL}/api/lottery/registrations`, {
                headers,
                params
            });
            setRegistrations(res.data.registrations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
            setError('');
        } catch (err) {
            console.error('Error fetching registrations:', err.response?.data || err.message);
            if (err.response?.status === 401) {
                setError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
                signOut({ redirect: false });
                router.push('/login?error=SessionExpired');
            } else {
                setError(err.response?.data?.message || 'Đã có lỗi khi lấy danh sách đăng ký');
            }
        }
    };

    useEffect(() => {
        if (status === 'loading') return;
        fetchRegistrations();
        const intervalId = setInterval(fetchRegistrations, 30000);
        return () => clearInterval(intervalId);
    }, [status, region]);

    useEffect(() => {
        console.log('Initializing Socket.IO with URL:', API_BASE_URL);
        const socket = io(API_BASE_URL, {
            query: session?.accessToken ? { token: session.accessToken } : {},
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

        socket.on('LOTTERY_RESULT_CHECKED', (data) => {
            console.log('Received LOTTERY_RESULT_CHECKED:', data);
            setRegistrations((prevRegistrations) => {
                if (region && data.region !== region) return prevRegistrations;
                if (prevRegistrations.some(r => r._id === data._id)) {
                    return prevRegistrations.map(r => (r._id === data._id ? data : r));
                }
                return prevRegistrations;
            });
            if (isAtBottom && registrationListRef.current) {
                registrationListRef.current.scrollTop = registrationListRef.current.scrollHeight;
            }
        });

        socket.on('LOTTERY_RESULT_ERROR', (data) => {
            console.error('Received LOTTERY_RESULT_ERROR:', data);
            setError(data.message || 'Lỗi khi đối chiếu kết quả xổ số');
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
    }, [region]);

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

    const handleShowDetails = (user) => {
        setSelectedUser(user);
        setShowModal(true);
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
                    Số điểm: {registration.userId?.points || 0}<br />
                    Số lần trúng: {registration.userId?.winCount || 0}<br />
                    Danh hiệu: <span className={styles.titles}>{titles}</span><br />
                    <strong>Số đăng ký:</strong><br />
                    {registration.numbers.bachThuLo && `Bạch thủ lô: ${registration.numbers.bachThuLo}<br />`}
                    {registration.numbers.songThuLo.length > 0 && `Song thủ lô: ${registration.numbers.songThuLo.join(', ')}<br />`}
                    {registration.numbers.threeCL && `3CL: ${registration.numbers.threeCL}<br />`}
                    {registration.numbers.cham && `Chạm: ${registration.numbers.cham}<br />`}
                    {registration.result && registration.result.isChecked ? (
                        registration.result.isWin ? (
                            <span className={styles.winningResult}>
                                <strong>Kết quả: Trúng</strong><br />
                                {registration.result.winningNumbers.bachThuLo && `Bạch thủ lô: ${registration.numbers.bachThuLo}<br />`}
                                {registration.result.winningNumbers.songThuLo.length > 0 && `Song thủ lô: ${registration.result.winningNumbers.songThuLo.join(', ')}<br />`}
                                {registration.result.winningNumbers.threeCL && `3CL: ${registration.numbers.threeCL}<br />`}
                                {registration.result.winningNumbers.cham && `Chạm: ${registration.numbers.cham}<br />`}
                                <strong>Giải trúng:</strong> {registration.result.matchedPrizes.join(', ')}
                            </span>
                        ) : (
                            <span className={styles.losingResult}>
                                <strong>Kết quả: Trượt</strong>
                            </span>
                        )
                    ) : (
                        <span className={styles.pendingResult}>
                            <strong>Kết quả: Chưa đối chiếu</strong>
                        </span>
                    )}
                </p>
            </div>
        );
    };

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Thông báo đăng ký quay số</h1>
            {error && <p className={styles.error}>{error}</p>}
            {status === 'loading' && <p className={styles.loading}>Đang tải...</p>}
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
                        <p><strong>Số lần trúng:</strong> {selectedUser.winCount || 0}</p>
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