"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import axios from 'axios';
import moment from 'moment';
import 'moment-timezone';
import Image from 'next/image';
import io from 'socket.io-client';
import styles from '../../styles/lichsudangky.module.css';
import PrivateChat from './chatrieng';
import UserInfoModal from './modals/UserInfoModal';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL3 || 'http://localhost:5001';

const isValidObjectId = (id) => {
    return /^[0-9a-fA-F]{24}$/.test(id);
};

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

export default function LotteryRegistrationHistory() {
    const { data: session, status } = useSession();
    const [registrationsByDate, setRegistrationsByDate] = useState({});
    const [usersCache, setUsersCache] = useState({});
    const [fetchError, setFetchError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalRegistrations, setTotalRegistrations] = useState(0);
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedEventId, setSelectedEventId] = useState('');
    const [events, setEvents] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [privateChats, setPrivateChats] = useState([]);
    const itemsPerPage = 50;
    const socketRef = useRef(null);

    const fetchEvents = useCallback(async (date) => {
        try {
            const startOfDay = moment.tz(date, 'DD-MM-YYYY', 'Asia/Ho_Chi_Minh').startOf('day').toDate();
            const endOfDay = moment.tz(date, 'DD-MM-YYYY', 'Asia/Ho_Chi_Minh').endOf('day').toDate();
            const headers = session?.accessToken
                ? { Authorization: `Bearer ${session.accessToken}`, 'Content-Type': 'application/json' }
                : { 'Content-Type': 'application/json' };
            const res = await axios.get(`${API_BASE_URL}/api/lottery/events`, {
                params: {
                    type: 'event',
                    startDate: startOfDay.toISOString(),
                    endDate: endOfDay.toISOString(),
                    limit: 100,
                },
                headers,
            });
            setEvents(res.data.events || []);
        } catch (err) {
            console.error('Error fetching events:', err.message);
            setFetchError('Không thể tải danh sách sự kiện');
        }
    }, [session?.accessToken]);

    const fetchRegistrations = useCallback(async () => {
        setIsLoading(true);
        setFetchError('');
        try {
            const headers = session?.accessToken
                ? { Authorization: `Bearer ${session.accessToken}`, 'Content-Type': 'application/json' }
                : { 'Content-Type': 'application/json' };

            const params = {
                page: currentPage,
                limit: itemsPerPage,
            };

            if (selectedDate) {
                const startOfDay = moment.tz(selectedDate, 'DD-MM-YYYY', 'Asia/Ho_Chi_Minh').startOf('day').toDate();
                const endOfDay = moment.tz(selectedDate, 'DD-MM-YYYY', 'Asia/Ho_Chi_Minh').endOf('day').toDate();
                params.startDate = startOfDay.toISOString();
                params.endDate = endOfDay.toISOString();
            } else {
                params.startDate = moment().tz('Asia/Ho_Chi_Minh').subtract(9, 'days').startOf('day').toDate().toISOString();
                params.endDate = moment().tz('Asia/Ho_Chi_Minh').endOf('day').toDate().toISOString();
            }

            if (selectedEventId) {
                params.eventId = selectedEventId;
            }

            const res = await axios.get(`${API_BASE_URL}/api/lottery/public-registrations`, {
                params,
                headers,
            });

            const registrations = res.data.registrations || [];
            const total = res.data.total || 0;
            setTotalRegistrations(total);
            console.log('Fetched public registrations:', registrations.length, 'Total:', total);

            const groupedByDate = registrations.reduce((acc, reg) => {
                const date = moment(reg.createdAt).tz('Asia/Ho_Chi_Minh').format('DD-MM-YYYY');
                const eventId = reg.eventId?._id || 'no-event';
                const eventTitle = reg.eventId?.title || 'Không có sự kiện';

                if (!acc[date]) {
                    acc[date] = {};
                }
                if (!acc[date][eventId]) {
                    acc[date][eventId] = {
                        title: eventTitle,
                        registrations: [],
                    };
                }
                acc[date][eventId].registrations.push(reg);
                return acc;
            }, {});

            Object.keys(groupedByDate).forEach(date => {
                Object.keys(groupedByDate[date]).forEach(eventId => {
                    groupedByDate[date][eventId].registrations.sort((a, b) =>
                        new Date(b.createdAt) - new Date(a.createdAt)
                    );
                });
            });

            setRegistrationsByDate(groupedByDate);

            const missingUsers = new Set();
            registrations.forEach(reg => {
                const userId = reg.userId?._id;
                if (userId && isValidObjectId(userId) && !usersCache[userId]) {
                    missingUsers.add(userId);
                }
            });

            const fetchPromises = [...missingUsers].map(async (userId) => {
                try {
                    const userRes = await axios.get(`${API_BASE_URL}/api/users/${userId}`, { headers });
                    const userData = userRes.data;
                    setUsersCache((prev) => ({ ...prev, [userId]: userData }));
                } catch (err) {
                    console.error(`Error fetching user ${userId}:`, err.message);
                }
            });
            await Promise.all(fetchPromises);
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Không thể tải danh sách đăng ký';
            console.error('Error fetching public registrations:', err.message);
            setFetchError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [session?.accessToken, currentPage, selectedDate, selectedEventId]);

    const handleShowDetails = (user) => {
        console.log('handleShowDetails called with user:', user);
        if (!user?._id || !isValidObjectId(user._id)) {
            console.error('Invalid user ID:', user?._id);
            setFetchError('ID người dùng không hợp lệ');
            return;
        }
        setSelectedUser(user);
        setShowModal(true);
    };

    const openPrivateChat = (user) => {
        console.log('openPrivateChat called with user:', user);
        if (!session?.user) {
            setFetchError('Vui lòng đăng nhập để mở chat riêng');
            return;
        }
        const isCurrentUserAdmin = session.user.role?.toLowerCase() === 'admin';
        const isTargetAdmin = user.role?.toLowerCase() === 'admin';
        if (!isCurrentUserAdmin && !isTargetAdmin) {
            setFetchError('Bạn chỉ có thể chat riêng với admin');
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
        if (!session?.accessToken) {
            return;
        }

        const socket = io(API_BASE_URL, {
            query: { token: session.accessToken },
            reconnectionAttempts: 5,
            reconnectionDelay: 5000,
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Socket.IO connected for lottery:', socket.id);
            socket.emit('joinRoom', 'lotteryFeed');
            socket.emit('joinPrivateRoom', session.user?._id || session.user?.id);
        });

        socket.on('connect_error', (err) => {
            console.error('Socket.IO connection error:', err.message);
            if (err.message.includes('Authentication error')) {
                setFetchError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
                signOut({ redirect: false });
                window.location.href = '/login?error=SessionExpired';
            } else {
                setFetchError('Mất kết nối thời gian thực. Vui lòng làm mới trang.');
            }
        });

        socket.on('NEW_LOTTERY_REGISTRATION', (newRegistration) => {
            console.log('Received NEW_LOTTERY_REGISTRATION:', newRegistration);
            if (newRegistration?.userId?._id && newRegistration?.eventId && isValidObjectId(newRegistration.userId._id)) {
                setUsersCache((prev) => ({
                    ...prev,
                    [newRegistration.userId._id]: newRegistration.userId,
                }));

                const date = moment(newRegistration.createdAt).tz('Asia/Ho_Chi_Minh').format('DD-MM-YYYY');
                const eventId = newRegistration.eventId?._id || 'no-event';
                const eventTitle = newRegistration.eventId?.title || 'Không có sự kiện';

                if (!selectedDate || selectedDate === date) {
                    if (!selectedEventId || selectedEventId === eventId) {
                        setRegistrationsByDate((prev) => {
                            const updated = { ...prev };
                            if (!updated[date]) {
                                updated[date] = {};
                            }
                            if (!updated[date][eventId]) {
                                updated[date][eventId] = {
                                    title: eventTitle,
                                    registrations: [],
                                };
                            }
                            updated[date][eventId].registrations = [
                                newRegistration,
                                ...(updated[date][eventId].registrations || []),
                            ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                            return updated;
                        });
                        setTotalRegistrations((prev) => prev + 1);
                    }
                }
            }
        });

        socket.on('UPDATE_LOTTERY_REGISTRATION', (updatedRegistration) => {
            console.log('Received UPDATE_LOTTERY_REGISTRATION:', updatedRegistration);
            if (updatedRegistration?.userId?._id && updatedRegistration?.eventId && isValidObjectId(updatedRegistration.userId._id)) {
                setUsersCache((prev) => ({
                    ...prev,
                    [updatedRegistration.userId._id]: updatedRegistration.userId,
                }));

                const date = moment(updatedRegistration.createdAt).tz('Asia/Ho_Chi_Minh').format('DD-MM-YYYY');
                const eventId = updatedRegistration.eventId?._id || 'no-event';

                if (!selectedDate || selectedDate === date) {
                    if (!selectedEventId || selectedEventId === eventId) {
                        setRegistrationsByDate((prev) => {
                            const updated = { ...prev };
                            if (updated[date]?.[eventId]) {
                                updated[date][eventId].registrations = updated[date][eventId].registrations
                                    .map(reg => reg._id === updatedRegistration._id ? updatedRegistration : reg)
                                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                            }
                            return updated;
                        });
                    }
                }
            }
        });

        socket.on('LOTTERY_RESULT_CHECKED', (checkedRegistration) => {
            console.log('Received LOTTERY_RESULT_CHECKED:', checkedRegistration);
            if (checkedRegistration?.userId?._id && checkedRegistration?.eventId && isValidObjectId(checkedRegistration.userId._id)) {
                setUsersCache((prev) => ({
                    ...prev,
                    [checkedRegistration.userId._id]: checkedRegistration.userId,
                }));

                const date = moment(checkedRegistration.createdAt).tz('Asia/Ho_Chi_Minh').format('DD-MM-YYYY');
                const eventId = checkedRegistration.eventId?._id || 'no-event';

                if (!selectedDate || selectedDate === date) {
                    if (!selectedEventId || selectedEventId === eventId) {
                        setRegistrationsByDate((prev) => {
                            const updated = { ...prev };
                            if (updated[date]?.[eventId]) {
                                updated[date][eventId].registrations = updated[date][eventId].registrations
                                    .map(reg => reg._id === checkedRegistration._id ? checkedRegistration : reg)
                                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                            }
                            return updated;
                        });
                    }
                }
            }
        });

        socket.on('USER_UPDATED', (updatedUser) => {
            console.log('Received USER_UPDATED:', updatedUser);
            if (updatedUser?._id && isValidObjectId(updatedUser._id)) {
                setUsersCache((prev) => ({ ...prev, [updatedUser._id]: updatedUser }));
            }
        });

        return () => {
            socketRef.current?.disconnect();
            console.log('Socket.IO disconnected for lottery');
        };
    }, [session?.accessToken, selectedDate, selectedEventId]);

    useEffect(() => {
        if (selectedDate) {
            fetchEvents(selectedDate);
        } else {
            setEvents([]);
            setSelectedEventId('');
        }
    }, [selectedDate, fetchEvents]);

    useEffect(() => {
        fetchRegistrations();
    }, [currentPage, selectedDate, selectedEventId, fetchRegistrations]);

    const dateRange = Array.from({ length: 9 }, (_, i) =>
        moment().tz('Asia/Ho_Chi_Minh').subtract(i, 'days').format('DD-MM-YYYY')
    );

    const handlePageChange = (newPage) => {
        if (newPage > 0 && newPage <= Math.ceil(totalRegistrations / itemsPerPage)) {
            setCurrentPage(newPage);
        }
    };

    const getAvatarClass = (role) => {
        return role?.toLowerCase() === 'admin' ? styles.avatarA : styles.avatarB;
    };

    return (
        <div className={styles.lotteryHistory}>
            <div className={styles.fixedHeader}>
                <h2>Danh sách đăng ký Events - Tổng đã đăng ký: {totalRegistrations}</h2>
                <div className={styles.filterGroup}>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Chọn ngày</label>
                        <select
                            value={selectedDate}
                            onChange={(e) => {
                                setSelectedDate(e.target.value);
                                setSelectedEventId('');
                                setCurrentPage(1);
                            }}
                            className={styles.input}
                        >
                            <option value="">Tất cả (10 ngày gần nhất)</option>
                            {dateRange.map((date) => (
                                <option key={date} value={date}>{date}</option>
                            ))}
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Chọn sự kiện</label>
                        <select
                            value={selectedEventId}
                            onChange={(e) => {
                                setSelectedEventId(e.target.value);
                                setCurrentPage(1);
                            }}
                            className={styles.input}
                            disabled={!selectedDate || events.length === 0}
                        >
                            <option value="">Tất cả sự kiện</option>
                            {events.map((event) => (
                                <option key={event._id} value={event._id}>{event.title}</option>
                            ))}
                        </select>
                    </div>
                </div>
                {!session && (
                    <div className={styles.loginPrompt}>
                        <p>Đăng nhập để nhận cập nhật thời gian thực.</p>
                        <button
                            className={styles.loginButton}
                            onClick={() => window.location.href = '/login'}
                            aria-label="Đăng nhập"
                        >
                            Đăng nhập
                        </button>
                    </div>
                )}
            </div>
            <div className={styles.content}>
                {fetchError && <p className={styles.error}>{fetchError}</p>}
                {isLoading && <p className={styles.loading}>Đang tải dữ liệu...</p>}
                {!isLoading && Object.keys(registrationsByDate).length === 0 && (
                    <p>Chưa có đăng ký nào {selectedDate ? `cho ngày ${selectedDate}` : 'trong 10 ngày gần nhất'}.</p>
                )}
                {dateRange
                    .filter(date => !selectedDate || date === selectedDate)
                    .map((date) => (
                        <div key={date} className={styles.dateSection}>
                            <h3>Danh sách tham gia sự kiện | ngày: {date}</h3>
                            {registrationsByDate[date] ? (
                                Object.entries(registrationsByDate[date])
                                    .filter(([eventId]) => !selectedEventId || eventId === selectedEventId)
                                    .map(([eventId, eventData]) => (
                                        <div key={eventId} className={styles.eventSection}>
                                            <h4>Sự Kiện: {eventData.title}</h4>
                                            {eventData.registrations.length === 0 ? (
                                                <p>Chưa có đăng ký cho sự kiện này.</p>
                                            ) : (
                                                <div className={styles.registrations}>
                                                    {eventData.registrations.map((reg) => {
                                                        const user = usersCache[reg.userId?._id] || reg.userId || {
                                                            fullname: 'User',
                                                            role: null,
                                                            img: null,
                                                            titles: [],
                                                            level: 'N/A',
                                                            points: 0,
                                                        };

                                                        return (
                                                            <div key={reg._id} className={styles.commentWrapper}>
                                                                <div className={styles.commentHeader}>
                                                                    <div
                                                                        className={`${styles.avatar} ${getRoleColorClass(user?.role)}`}
                                                                        onClick={() => handleShowDetails(user)}
                                                                        style={{ cursor: 'pointer' }}
                                                                        role="button"
                                                                        aria-label={`Xem chi tiết ${getDisplayName(user.fullname)}`}
                                                                    >
                                                                        {user?.img ? (
                                                                            <Image
                                                                                src={user.img}
                                                                                alt={getDisplayName(user.fullname)}
                                                                                className={styles.avatarImage}
                                                                                width={40}
                                                                                height={40}
                                                                                onError={(e) => {
                                                                                    e.target.style.display = 'none';
                                                                                    e.target.nextSibling.style.display = 'flex';
                                                                                    e.target.nextSibling.textContent = getInitials(user?.fullname || 'User');
                                                                                }}
                                                                            />
                                                                        ) : (
                                                                            <span>{getInitials(user?.fullname || 'User')}</span>
                                                                        )}
                                                                    </div>
                                                                    <div className={styles.commentInfo}>
                                                                        <span
                                                                            className={`${styles.username} ${getRoleColorClass(user?.role)}`}
                                                                            onClick={() => handleShowDetails(user)}
                                                                            style={{ cursor: 'pointer' }}
                                                                            role="button"
                                                                            aria-label={`Xem chi tiết ${getDisplayName(user.fullname)}`}
                                                                        >
                                                                            {getDisplayName(user?.fullname || 'User')}
                                                                        </span>
                                                                        {user?.role && (
                                                                            <span
                                                                                className={`${styles.role} ${getRoleColorClass(user.role)}`}
                                                                            >
                                                                                {user.role}
                                                                            </span>
                                                                        )}
                                                                        <span className={styles.roless}>
                                                                            {user?.titles?.length > 0 ? user.titles.join(', ') : 'Chưa có danh hiệu'}
                                                                        </span>
                                                                        <span className={styles.level}>
                                                                            Cấp {user?.level ?? 'N/A'}
                                                                        </span>
                                                                        <span className={styles.points}>
                                                                            {user?.points ?? 0} điểm
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
                                                                                    <p><strong>Giải trúng:</strong> {reg.result.matchedPrizes.join(', ') || 'N/A'}</p>
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
                                        </div>
                                    ))
                            ) : (
                                <p>Chưa có đăng ký trong ngày này.</p>
                            )}
                        </div>
                    ))}
                {showModal && selectedUser && (
                    <UserInfoModal
                        selectedUser={selectedUser}
                        setSelectedUser={setSelectedUser}
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
        </div>
    );
}