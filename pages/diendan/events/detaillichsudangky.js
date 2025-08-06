"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import axios from 'axios';
import moment from 'moment';
import 'moment-timezone';
import Image from 'next/image';
import { getSocket, isSocketConnected, addConnectionListener } from '../../../utils/Socket';
import { isValidObjectId } from '../../../utils/validation';
import styles from '../../../styles/detailichsu.module.css';
import UserInfoModal from '../modals/UserInfoModal';
import PrivateChat from '../chatrieng';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL3 || 'http://localhost:5001';
const SOCKET_URL = process.env.NEXT_PUBLIC_BACKEND_URL3 || 'http://localhost:5001';

const getDisplayName = (fullname) => {
    if (!fullname) return 'User';
    return fullname;
};

const getInitials = (fullname) => {
    if (!fullname) return 'U';
    const nameParts = fullname.trim().split(' ');
    return nameParts[nameParts.length - 1].charAt(0).toUpperCase();
};

const getRoleColorClass = (role) => {
    return role?.toLowerCase() === 'admin' ? styles.avatarA : styles.avatarB;
};

export default function EventRegistrationsList({ eventId }) {
    const { data: session, status } = useSession();
    const [registrations, setRegistrations] = useState([]);
    const [usersCache, setUsersCache] = useState({});
    const [registrationCount, setRegistrationCount] = useState(0);
    const [error, setError] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [privateChats, setPrivateChats] = useState([]);
    const [socketConnected, setSocketConnected] = useState(false);
    const socketRef = useRef(null);
    const mountedRef = useRef(true);

    const checkLotteryResult = (registration) => {
        if (registration.result && registration.result.isChecked) {
            const winDetails = [];
            if (registration.numbers.bachThuLo) {
                winDetails.push(`Bạch thủ lô: ${registration.numbers.bachThuLo} (${registration.result.winningNumbers.bachThuLo ? 'Trúng' : 'Trượt'})`);
            }
            if (registration.numbers.songThuLo && registration.numbers.songThuLo.length > 0) {
                if (registration.result.winningNumbers.songThuLo.length > 0) {
                    winDetails.push(`Song thủ lô: ${registration.result.winningNumbers.songThuLo.join(', ')} (Trúng)`);
                } else {
                    winDetails.push(`Song thủ lô: ${registration.numbers.songThuLo.join(', ')} (Trượt)`);
                }
            }
            if (registration.numbers.threeCL) {
                winDetails.push(`3CL: ${registration.numbers.threeCL} (${registration.result.winningNumbers.threeCL ? 'Trúng' : 'Trượt'})`);
            }
            if (registration.numbers.cham) {
                winDetails.push(`Chạm: ${registration.numbers.cham} (${registration.result.winningNumbers.cham ? 'Trúng' : 'Trượt'})`);
            }
            const status = registration.result.isWin ? 'Trúng' : 'Trượt';
            return { status, details: winDetails.join('; ') || '-', matchedPrizes: registration.result.matchedPrizes || [] };
        }
        return { status: 'Chưa đối chiếu', details: '-', matchedPrizes: [] };
    };

    const fetchRegistrations = useCallback(async () => {
        if (!eventId || !isValidObjectId(eventId)) {
            console.error('Invalid eventId:', eventId);
            setError('ID sự kiện không hợp lệ');
            return;
        }
        setError('');
        try {
            const headers = session?.accessToken
                ? { Authorization: `Bearer ${session.accessToken}`, 'Content-Type': 'application/json' }
                : { 'Content-Type': 'application/json' };
            const params = {
                eventId,
                isEvent: false,
                isReward: false
            };

            // console.log('Fetching registrations with params:', params);
            const res = await axios.get(`${API_BASE_URL}/api/lottery/public-registrations`, {
                headers,
                params
            });
            // console.log('API response:', res.data);

            const registrations = res.data.registrations || [];
            setRegistrations(registrations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
            setRegistrationCount(res.data.total || 0);

            const missingUsers = new Set();
            registrations.forEach(reg => {
                const userId = reg.userId?._id;
                if (userId && isValidObjectId(userId) && !usersCache[userId]) {
                    missingUsers.add(userId);
                }
            });

            // console.log('Missing users to fetch:', [...missingUsers]);
            const fetchPromises = [...missingUsers].map(async (userId) => {
                try {
                    const userRes = await axios.get(`${API_BASE_URL}/api/users/${userId}`, { headers });
                    // console.log(`Fetched user ${userId}:`, userRes.data);
                    setUsersCache((prev) => ({ ...prev, [userId]: userRes.data }));
                } catch (err) {
                    console.error(`Error fetching user ${userId}:`, err.message);
                }
            });
            await Promise.all(fetchPromises);
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || 'Đã có lỗi khi lấy danh sách đăng ký';
            console.error('Error fetching registrations:', errorMessage);
            setError(errorMessage);
        }
    }, [session?.accessToken, eventId, usersCache]);

    const handleShowDetails = (user) => {
        // console.log('handleShowDetails called with user:', user);
        if (!user?._id || !isValidObjectId(user._id)) {
            console.error('Invalid user ID:', user?._id);
            setError('ID người dùng không hợp lệ');
            return;
        }
        setSelectedUser(user);
        setShowModal(true);
    };

    const openPrivateChat = (user) => {
        // console.log('openPrivateChat called with user:', user);
        if (!session?.user) {
            setError('Vui lòng đăng nhập để mở chat riêng');
            return;
        }
        const isCurrentUserAdmin = session.user.role?.toLowerCase() === 'admin';
        const isTargetAdmin = user.role?.toLowerCase() === 'admin';
        if (!isCurrentUserAdmin && !isTargetAdmin) {
            setError('Bạn chỉ có thể chat riêng với admin');
            return;
        }
        setPrivateChats((prev) => {
            if (prev.some((chat) => chat.receiver._id === user._id)) {
                return prev.map((chat) =>
                    chat.receiver._id === user._id ? { ...chat, isMinimized: false } : chat
                );
            }
            return [...prev, { receiver: user, isMinimized: false }];
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

    useEffect(() => {
        if (status === 'loading') return;
        fetchRegistrations();
    }, [status, fetchRegistrations]);

    useEffect(() => {
        if (!session?.accessToken || !eventId) {
            console.error('Invalid eventId for Socket.IO:', eventId);
            return;
        }

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
                    // console.log('Socket.IO connected for registrations:', socket.id);
                    socket.emit('joinEvent', eventId);
                    setSocketConnected(true);
                });

                socket.on('connect_error', (err) => {
                    console.error('Socket.IO connection error:', err.message);
                    setSocketConnected(false);
                    setError('Mất kết nối thời gian thực. Vui lòng làm mới trang.');
                });

                socket.on('disconnect', () => {
                    // console.log('Socket.IO disconnected for registrations');
                    setSocketConnected(false);
                });

                socket.on('NEW_REGISTRATION', (newRegistration) => {
                    // console.log('Received NEW_REGISTRATION:', JSON.stringify(newRegistration, null, 2));
                    if (mountedRef.current && newRegistration.eventId === eventId) {
                        setRegistrations((prev) => {
                            if (prev.some((reg) => reg._id === newRegistration._id)) return prev;
                            return [newRegistration, ...prev];
                        });
                        setRegistrationCount((prev) => prev + 1);
                    }
                });

                socket.on('REGISTRATION_UPDATED', (updatedRegistration) => {
                    // console.log('Received REGISTRATION_UPDATED:', JSON.stringify(updatedRegistration, null, 2));
                    if (mountedRef.current && updatedRegistration.eventId === eventId) {
                        setRegistrations((prev) =>
                            prev.map((reg) =>
                                reg._id === updatedRegistration._id ? updatedRegistration : reg
                            )
                        );
                    }
                });

                socket.on('USER_UPDATED', (data) => {
                    // console.log('Received USER_UPDATED:', data);
                    if (mountedRef.current && data?._id && isValidObjectId(data._id)) {
                        setUsersCache((prev) => ({ ...prev, [data._id]: data }));
                    }
                });

                socket.on('PRIVATE_MESSAGE', (newMessage) => {
                    // console.log('Received PRIVATE_MESSAGE:', JSON.stringify(newMessage, null, 2));
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
                        socketRef.current.off('NEW_REGISTRATION');
                        socketRef.current.off('REGISTRATION_UPDATED');
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
    }, [session?.accessToken, eventId]);

    if (status === 'loading') return <div className={styles.loading}>Đang tải...</div>;

    return (
        <div className={styles.eventRegistrations}>
            <div className={styles.fixedHeader}>
                <h2>Danh sách đăng ký - Tổng: {registrationCount}</h2>
            </div>
            <div className={styles.content}>
                {error && <p className={styles.error}>{error}</p>}
                {registrations.length === 0 ? (
                    <p className={styles.noRegistrations}>Hãy là người đầu tiên đăng ký sự kiện này!</p>
                ) : (
                    <div className={styles.registrations}>
                        {registrations.map((reg) => {
                            const user = usersCache[reg.userId?._id] || reg.userId || {
                                username: 'N/A',
                                fullname: 'User',
                                role: null,
                                img: null,
                                titles: [],
                                level: 'N/A',
                                points: 0,
                            };
                            const { status, details, matchedPrizes } = checkLotteryResult(reg);
                            const statusClass = status === 'Trúng' ? styles.success : status === 'Trượt' ? styles.error : styles.status;
                            return (
                                <div key={reg._id} className={styles.commentWrapper}>
                                    <div className={styles.commentHeader}>
                                        <div
                                            className={`${styles.avatar} ${getRoleColorClass(user.role)}`}
                                            onClick={() => handleShowDetails(user)}
                                            role="button"
                                            aria-label={`Xem chi tiết ${getDisplayName(user.fullname)}`}
                                        >
                                            {user.img ? (
                                                <Image
                                                    src={user.img}
                                                    alt={getDisplayName(user.fullname)}
                                                    className={styles.avatarImage}
                                                    width={40}
                                                    height={40}
                                                    loading="lazy"
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                        e.target.nextSibling.style.display = 'flex';
                                                        e.target.nextSibling.textContent = getInitials(user.fullname);
                                                    }}
                                                />
                                            ) : (
                                                <span>{getInitials(user.fullname)}</span>
                                            )}
                                        </div>
                                        <div className={styles.commentInfo}>
                                            <span
                                                className={`${styles.username} ${getRoleColorClass(user.role)}`}
                                                onClick={() => handleShowDetails(user)}
                                                role="button"
                                                aria-label={`Xem chi tiết ${getDisplayName(user.fullname)}`}
                                            >
                                                {user.username}
                                            </span>
                                            <span>{getDisplayName(user.fullname)}</span>
                                            {user.role && (
                                                <span className={`${styles.role} ${getRoleColorClass(user.role)}`}>
                                                    {user.role}
                                                </span>
                                            )}
                                            <span className={styles.roless}>
                                                {user.titles?.length > 0 ? user.titles.join(', ') : 'Chưa có danh hiệu'}
                                            </span>
                                            <span className={styles.level}>
                                                Cấp {user.level}
                                            </span>
                                            <span className={styles.points}>
                                                {user.points} điểm
                                            </span>
                                        </div>
                                    </div>
                                    <div className={styles.comment}>
                                        <p className={styles.commentMeta}>
                                            <i className="fa-solid fa-clock"></i> Đã đăng ký lúc: {moment.tz(reg.createdAt, 'Asia/Ho_Chi_Minh').format('DD/MM/YYYY HH:mm:ss')}
                                        </p>
                                        <div className={styles.commentContent}>
                                            <p><strong>Miền:</strong> {reg.region}</p>
                                            <p><strong>Số đăng ký:</strong></p>
                                            <ul>
                                                {reg.numbers.bachThuLo && (
                                                    <li>Bạch thủ lô: {reg.numbers.bachThuLo}</li>
                                                )}
                                                {reg.numbers.songThuLo?.length > 0 && (
                                                    <li>Song thủ lô: {reg.numbers.songThuLo.join(', ')}</li>
                                                )}
                                                {reg.numbers.threeCL && (
                                                    <li>3CL: {reg.numbers.threeCL}</li>
                                                )}
                                                {reg.numbers.cham && (
                                                    <li>Chạm: {reg.numbers.cham}</li>
                                                )}
                                            </ul>
                                            <p><strong>Kết quả:</strong></p>
                                            {reg.result.isChecked ? (
                                                reg.result.isWin ? (
                                                    <div>
                                                        <p className={styles.success}>Trúng thưởng!</p>
                                                        <p><strong>Số trúng:</strong></p>
                                                        <ul>
                                                            {reg.result.winningNumbers.bachThuLo && (
                                                                <li>Bạch thủ lô: {reg.result.winningNumbers.bachThuLo}</li>
                                                            )}
                                                            {reg.result.winningNumbers.songThuLo?.length > 0 && (
                                                                <li>Song thủ lô: {reg.result.winningNumbers.songThuLo.join(', ')}</li>
                                                            )}
                                                            {reg.result.winningNumbers.threeCL && (
                                                                <li>3CL: {reg.result.winningNumbers.threeCL}</li>
                                                            )}
                                                            {reg.result.winningNumbers.cham && (
                                                                <li>Chạm: {reg.result.winningNumbers.cham}</li>
                                                            )}
                                                        </ul>
                                                        <p><strong>Giải trúng:</strong> {matchedPrizes.join(', ') || 'N/A'}</p>
                                                    </div>
                                                ) : (
                                                    <p className={styles.error}>Không trúng</p>
                                                )
                                            ) : (
                                                <p className={styles.status}>Đăng ký thành công</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                {showModal && selectedUser && (
                    <UserInfoModal
                        selectedUser={selectedUser}
                        setSelectedUser={setSelectedUser}
                        setShowModal={setShowModal}
                        openPrivateChat={openPrivateChat}
                        getAvatarClass={getRoleColorClass}
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
        </div>
    );
}