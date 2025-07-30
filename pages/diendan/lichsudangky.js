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
        <div className={styles.container}>
            {/* Header Section */}
            <div className={styles.header}>
                <div className={styles.headerContent}>
                    <h2 className={styles.title}>
                        📋 Lịch Sử Đăng Ký Events
                    </h2>
                    <div className={styles.stats}>
                        <span className={styles.statItem}>
                            <span className={styles.statIcon}>📊</span>
                            Tổng: {totalRegistrations}
                        </span>
                    </div>
                </div>
            </div>

            {/* Filters Section */}
            <div className={styles.filters}>
                <div className={styles.filterRow}>
                    <div className={styles.filterGroup}>
                        <label className={styles.filterLabel}>📅 Chọn ngày</label>
                        <select
                            value={selectedDate}
                            onChange={(e) => {
                                setSelectedDate(e.target.value);
                                setSelectedEventId('');
                                setCurrentPage(1);
                            }}
                            className={styles.filterSelect}
                        >
                            <option value="">Tất cả (10 ngày gần nhất)</option>
                            {dateRange.map((date) => (
                                <option key={date} value={date}>{date}</option>
                            ))}
                        </select>
                    </div>
                    <div className={styles.filterGroup}>
                        <label className={styles.filterLabel}>🎯 Chọn sự kiện</label>
                        <select
                            value={selectedEventId}
                            onChange={(e) => {
                                setSelectedEventId(e.target.value);
                                setCurrentPage(1);
                            }}
                            className={styles.filterSelect}
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
                        <p>🔐 Đăng nhập để nhận cập nhật thời gian thực</p>
                        <button
                            className={styles.loginButton}
                            onClick={() => window.location.href = '/login'}
                        >
                            Đăng nhập
                        </button>
                    </div>
                )}
            </div>

            {/* Content Section */}
            <div className={styles.content}>
                {fetchError && (
                    <div className={styles.errorMessage}>
                        <span className={styles.errorIcon}>⚠️</span>
                        {fetchError}
                    </div>
                )}

                {isLoading && (
                    <div className={styles.loadingMessage}>
                        <span className={styles.loadingIcon}>⏳</span>
                        Đang tải dữ liệu...
                    </div>
                )}

                {!isLoading && Object.keys(registrationsByDate).length === 0 && (
                    <div className={styles.emptyState}>
                        <span className={styles.emptyIcon}>📭</span>
                        <p>Chưa có đăng ký nào {selectedDate ? `cho ngày ${selectedDate}` : 'trong 10 ngày gần nhất'}.</p>
                    </div>
                )}

                {dateRange
                    .filter(date => !selectedDate || date === selectedDate)
                    .map((date) => (
                        <div key={date} className={styles.dateSection}>
                            <div className={styles.dateHeader}>
                                <h3 className={styles.dateTitle}>
                                    📅 Danh sách tham gia sự kiện | {date}
                                </h3>
                            </div>

                            {registrationsByDate[date] ? (
                                Object.entries(registrationsByDate[date])
                                    .filter(([eventId]) => !selectedEventId || eventId === selectedEventId)
                                    .map(([eventId, eventData]) => (
                                        <div key={eventId} className={styles.eventSection}>
                                            <div className={styles.eventHeader}>
                                                <h4 className={styles.eventTitle}>
                                                    🎯 {eventData.title}
                                                </h4>
                                                <span className={styles.registrationCount}>
                                                    {eventData.registrations.length} đăng ký
                                                </span>
                                            </div>

                                            {eventData.registrations.length === 0 ? (
                                                <div className={styles.emptyEvent}>
                                                    <span className={styles.emptyEventIcon}>📝</span>
                                                    <p>Chưa có đăng ký cho sự kiện này.</p>
                                                </div>
                                            ) : (
                                                <div className={styles.registrationsList}>
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
                                                            <div key={reg._id} className={styles.registrationCard}>
                                                                <div className={styles.userInfo}>
                                                                    <div
                                                                        className={`${styles.userAvatar} ${getRoleColorClass(user?.role)}`}
                                                                        onClick={() => handleShowDetails(user)}
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
                                                                    <div className={styles.userDetails}>
                                                                        <div className={styles.userName}>
                                                                            {getDisplayName(user?.fullname || 'User')}
                                                                        </div>
                                                                        <div className={styles.userMeta}>
                                                                            {user?.role && (
                                                                                <span className={`${styles.userRole} ${getRoleColorClass(user.role)}`}>
                                                                                    {user.role}
                                                                                </span>
                                                                            )}
                                                                            <span className={styles.userLevel}>
                                                                                Cấp {user?.level ?? 'N/A'}
                                                                            </span>
                                                                            <span className={styles.userPoints}>
                                                                                {user?.points ?? 0} điểm
                                                                            </span>
                                                                        </div>
                                                                        <div className={styles.userTitles}>
                                                                            {user?.titles?.length > 0 ? user.titles.join(', ') : 'Chưa có danh hiệu'}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className={styles.registrationDetails}>
                                                                    <div className={styles.registrationMeta}>
                                                                        <span className={styles.registrationTime}>
                                                                            ⏰ {moment.tz(reg.createdAt, 'Asia/Ho_Chi_Minh').format('DD/MM/YYYY HH:mm:ss')}
                                                                        </span>
                                                                        <span className={styles.registrationRegion}>
                                                                            🌍 {reg.region}
                                                                        </span>
                                                                    </div>

                                                                    <div className={styles.numbersSection}>
                                                                        <h5 className={styles.numbersTitle}>🔢 Số đăng ký:</h5>
                                                                        <div className={styles.numbersList}>
                                                                            {reg.numbers.bachThuLo && (
                                                                                <span className={styles.numberItem}>
                                                                                    <span className={styles.numberLabel}>Bạch thủ lô:</span>
                                                                                    <span className={styles.numberValue}>{reg.numbers.bachThuLo}</span>
                                                                                </span>
                                                                            )}
                                                                            {reg.numbers.songThuLo?.length > 0 && (
                                                                                <span className={styles.numberItem}>
                                                                                    <span className={styles.numberLabel}>Song thủ lô:</span>
                                                                                    <span className={styles.numberValue}>{reg.numbers.songThuLo.join(', ')}</span>
                                                                                </span>
                                                                            )}
                                                                            {reg.numbers.threeCL && (
                                                                                <span className={styles.numberItem}>
                                                                                    <span className={styles.numberLabel}>3CL:</span>
                                                                                    <span className={styles.numberValue}>{reg.numbers.threeCL}</span>
                                                                                </span>
                                                                            )}
                                                                            {reg.numbers.cham && (
                                                                                <span className={styles.numberItem}>
                                                                                    <span className={styles.numberLabel}>Chạm:</span>
                                                                                    <span className={styles.numberValue}>{reg.numbers.cham}</span>
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    <div className={styles.resultSection}>
                                                                        <h5 className={styles.resultTitle}>🎯 Kết quả:</h5>
                                                                        {reg.result.isChecked ? (
                                                                            reg.result.isWin ? (
                                                                                <div className={styles.winResult}>
                                                                                    <span className={styles.winIcon}>🏆</span>
                                                                                    <span className={styles.winText}>Trúng thưởng!</span>
                                                                                    <div className={styles.winningNumbers}>
                                                                                        <h6>🎊 Số trúng:</h6>
                                                                                        <div className={styles.winningNumbersList}>
                                                                                            {reg.result.winningNumbers.bachThuLo && (
                                                                                                <span className={styles.winningNumberItem}>
                                                                                                    <span className={styles.winningNumberLabel}>Bạch thủ lô:</span>
                                                                                                    <span className={styles.winningNumberValue}>{reg.result.winningNumbers.bachThuLo}</span>
                                                                                                </span>
                                                                                            )}
                                                                                            {reg.result.winningNumbers.songThuLo?.length > 0 && (
                                                                                                <span className={styles.winningNumberItem}>
                                                                                                    <span className={styles.winningNumberLabel}>Song thủ lô:</span>
                                                                                                    <span className={styles.winningNumberValue}>{reg.result.winningNumbers.songThuLo.join(', ')}</span>
                                                                                                </span>
                                                                                            )}
                                                                                            {reg.result.winningNumbers.threeCL && (
                                                                                                <span className={styles.winningNumberItem}>
                                                                                                    <span className={styles.winningNumberLabel}>3CL:</span>
                                                                                                    <span className={styles.winningNumberValue}>{reg.result.winningNumbers.threeCL}</span>
                                                                                                </span>
                                                                                            )}
                                                                                            {reg.result.winningNumbers.cham && (
                                                                                                <span className={styles.winningNumberItem}>
                                                                                                    <span className={styles.winningNumberLabel}>Chạm:</span>
                                                                                                    <span className={styles.winningNumberValue}>{reg.result.winningNumbers.cham}</span>
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                        <div className={styles.prizes}>
                                                                                            <span className={styles.prizesLabel}>💰 Giải trúng:</span>
                                                                                            <span className={styles.prizesValue}>{reg.result.matchedPrizes.join(', ') || 'N/A'}</span>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            ) : (
                                                                                <div className={styles.loseResult}>
                                                                                    <span className={styles.loseIcon}>❌</span>
                                                                                    <span className={styles.loseText}>Không trúng</span>
                                                                                </div>
                                                                            )
                                                                        ) : (
                                                                            <div className={styles.pendingResult}>
                                                                                <span className={styles.pendingIcon}>⏳</span>
                                                                                <span className={styles.pendingText}>Đăng ký thành công</span>
                                                                            </div>
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
                                <div className={styles.emptyDate}>
                                    <span className={styles.emptyDateIcon}>📅</span>
                                    <p>Chưa có đăng ký trong ngày này.</p>
                                </div>
                            )}
                        </div>
                    ))}
            </div>

            {/* Modals and Private Chats */}
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
    );
}