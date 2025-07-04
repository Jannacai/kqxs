"use client";

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import moment from 'moment';
import 'moment-timezone';
import styles from '../../styles/userLotteryManagement.module.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export default function UserLotteryManagement() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [region, setRegion] = useState('');
    const [eventId, setEventId] = useState('');
    const [events, setEvents] = useState([]);
    const [registrations, setRegistrations] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [userDetails, setUserDetails] = useState(null);
    const [userRegistrations, setUserRegistrations] = useState([]);
    const [pointsInput, setPointsInput] = useState('');
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [rewardingUser, setRewardingUser] = useState(null);
    const [rewardPoints, setRewardPoints] = useState(0);
    const [registrationCount, setRegistrationCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const fetchEvents = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/events`, {
                params: { type: 'event' },
                headers: { Authorization: `Bearer ${session?.accessToken}` }
            });
            setEvents(res.data.events || []);
        } catch (err) {
            console.error('Error fetching events:', err.message);
            setError('Đã có lỗi khi lấy danh sách sự kiện');
        }
    }, [session?.accessToken]);

    const fetchRegistrations = useCallback(async () => {
        if (status !== 'authenticated') {
            setError('Vui lòng đăng nhập để xem thông tin');
            return;
        }
        try {
            const params = {
                eventId: eventId || undefined,
                page: currentPage,
                limit: itemsPerPage,
                isReward: false, // Chỉ lấy đăng ký xổ số
                isEvent: false
            };
            if (region) params.region = region;
            const res = await axios.get(`${API_BASE_URL}/api/lottery/registrations`, {
                headers: {
                    Authorization: `Bearer ${session?.accessToken}`,
                    'Content-Type': 'application/json',
                },
                params
            });
            setRegistrations(res.data.registrations || []);
            setRegistrationCount(res.data.total || 0);
            setError('');
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || 'Đã có lỗi khi lấy danh sách đăng ký';
            if (err.response?.status === 401) {
                setError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
                signOut({ redirect: false });
                router.push('/login?error=SessionExpired');
            } else {
                setError(errorMessage);
                alert(errorMessage);
            }
        }
    }, [session?.accessToken, region, eventId, status, router, currentPage]);

    const fetchUserDetails = useCallback(async (userId) => {
        if (status !== 'authenticated') {
            setError('Vui lòng đăng nhập để xem thông tin');
            return;
        }
        try {
            const params = {
                userId,
                eventId: eventId || undefined,
                isReward: false, // Chỉ lấy đăng ký xổ số
                isEvent: false
            };
            if (region) params.region = region;
            const [userRes, regRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/api/users/${userId}`, {
                    headers: {
                        Authorization: `Bearer ${session?.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }).catch(err => {
                    if (err.response?.status === 404) {
                        throw new Error('Không tìm thấy người dùng');
                    }
                    throw err;
                }),
                axios.get(`${API_BASE_URL}/api/lottery/registrations`, {
                    headers: {
                        Authorization: `Bearer ${session?.accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    params
                }).catch(err => {
                    if (err.response?.status === 404) {
                        return { data: { registrations: [] } };
                    }
                    throw err;
                })
            ]);
            setUserDetails(userRes.data);
            setUserRegistrations(regRes.data.registrations || []);
            setPointsInput(userRes.data.points.toString());
            setError('');
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || 'Đã có lỗi khi lấy thông tin người dùng';
            if (err.response?.status === 401) {
                setError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
                signOut({ redirect: false });
                router.push('/login?error=SessionExpired');
            } else {
                setError(errorMessage);
                alert(errorMessage);
                setUserDetails(null);
                setUserRegistrations([]);
                setPointsInput('');
            }
        }
    }, [session?.accessToken, region, eventId, status, router]);

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
            return { status, details: winDetails.join('; ') || '-' };
        }
        return { status: 'Chưa đối chiếu', details: '-' };
    };

    const handleViewDetails = (userId) => {
        setSelectedUser(userId);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedUser(null);
        setUserDetails(null);
        setUserRegistrations([]);
        setPointsInput('');
        setRewardingUser(null);
        setRewardPoints(0);
    };

    const handleOverlayClick = (e) => {
        if (e.target.classList.contains(styles.modal)) {
            handleCloseModal();
        }
    };

    const handleAddPoints = async () => {
        if (!selectedUser) return;
        try {
            const currentPoints = userDetails?.points || 0;
            const res = await axios.put(`${API_BASE_URL}/api/users/${selectedUser}`, {
                points: currentPoints + 10
            }, {
                headers: {
                    Authorization: `Bearer ${session?.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            setUserDetails(res.data.user);
            setPointsInput(res.data.user.points.toString());
            alert('Cộng 10 điểm thành công!');
            setError('');
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || 'Đã có lỗi khi cộng điểm';
            if (err.response?.status === 401) {
                setError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
                signOut({ redirect: false });
                router.push('/login?error=SessionExpired');
            } else {
                setError(errorMessage);
                alert(errorMessage);
            }
        }
    };

    const handleUpdatePoints = async (e) => {
        e.preventDefault();
        if (!selectedUser || !pointsInput || isNaN(pointsInput) || parseInt(pointsInput) < 0) {
            setError('Vui lòng nhập số điểm hợp lệ');
            alert('Vui lòng nhập số điểm hợp lệ');
            return;
        }
        try {
            const res = await axios.put(`${API_BASE_URL}/api/users/${selectedUser}`, {
                points: parseInt(pointsInput)
            }, {
                headers: {
                    Authorization: `Bearer ${session?.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            setUserDetails(res.data.user);
            alert('Cập nhật điểm thành công!');
            setError('');
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || 'Đã có lỗi khi cập nhật điểm';
            if (err.response?.status === 401) {
                setError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
                signOut({ redirect: false });
                router.push('/login?error=SessionExpired');
            } else {
                setError(errorMessage);
                alert(errorMessage);
            }
        }
    };

    const handleReward = (user) => {
        setRewardingUser(user);
        setRewardPoints(0);
    };

    const handleSaveReward = async () => {
        if (rewardPoints < 0) {
            alert('Số điểm không thể âm!');
            return;
        }
        try {
            const newPoints = (rewardingUser.points || 0) + parseInt(rewardPoints || 0);
            const res = await axios.put(`${API_BASE_URL}/api/users/${rewardingUser._id}`, {
                points: newPoints
            }, {
                headers: {
                    Authorization: `Bearer ${session?.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            setRegistrations((prev) =>
                prev.map((reg) =>
                    reg.userId._id === res.data.user._id ? { ...reg, userId: { ...reg.userId, points: res.data.user.points } } : reg
                )
            );
            setRewardingUser(null);
            setRewardPoints(0);
            alert(`Đã phát thưởng ${rewardPoints} điểm cho ${res.data.user.username}!`);
            setError('');
            fetchRegistrations();
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || 'Đã có lỗi khi phát thưởng';
            if (err.response?.status === 401) {
                setError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
                signOut({ redirect: false });
                router.push('/login?error=SessionExpired');
            } else {
                setError(errorMessage);
                alert(errorMessage);
            }
        }
    };

    const handlePageChange = (newPage) => {
        if (newPage > 0 && newPage <= Math.ceil(registrationCount / itemsPerPage)) {
            setCurrentPage(newPage);
        }
    };

    useEffect(() => {
        if (status === 'loading') return;
        if (status === 'unauthenticated') {
            router.push('/login');
            return;
        }
        if (status === 'authenticated' && session.user.role !== 'ADMIN') {
            router.push('/?error=AccessDenied');
            alert('Chỉ admin mới được truy cập trang này.');
            return;
        }
        fetchEvents();
        fetchRegistrations();
    }, [status, session, region, eventId, currentPage, fetchEvents, fetchRegistrations]);

    useEffect(() => {
        if (selectedUser) {
            fetchUserDetails(selectedUser);
        } else {
            setUserDetails(null);
            setUserRegistrations([]);
            setPointsInput('');
        }
    }, [selectedUser, fetchUserDetails]);

    if (status === 'loading') return <div className={styles.loading}>Đang tải...</div>;

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Quản lý người dùng đăng ký xổ số</h1>
            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.formGroup}>
                <label className={styles.formLabel}>Chọn miền</label>
                <select
                    value={region}
                    onChange={(e) => {
                        setRegion(e.target.value);
                        setSelectedUser(null);
                        setIsModalOpen(false);
                        setCurrentPage(1);
                    }}
                    className={styles.input}
                >
                    <option value="">Tất cả</option>
                    <option value="Nam">Miền Nam</option>
                    <option value="Trung">Miền Trung</option>
                    <option value="Bac">Miền Bắc</option>
                </select>
            </div>

            <div className={styles.formGroup}>
                <label className={styles.formLabel}>Chọn sự kiện</label>
                <select
                    value={eventId}
                    onChange={(e) => {
                        setEventId(e.target.value);
                        setSelectedUser(null);
                        setIsModalOpen(false);
                        setCurrentPage(1);
                    }}
                    className={styles.input}
                >
                    <option value="">Tất cả sự kiện</option>
                    {events.map((event) => (
                        <option key={event._id} value={event._id}>
                            {event.title}
                        </option>
                    ))}
                </select>
            </div>

            <h2 className={styles.subtitle}>Danh sách đăng ký ({region || 'Tất cả'}) - Tổng: {registrationCount}</h2>
            {registrations.length === 0 ? (
                <p>Chưa có đăng ký nào cho miền {region || 'Tất cả'}</p>
            ) : (
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>STT</th>
                            <th>Username</th>
                            <th>Họ tên</th>
                            <th>Tên sự kiện</th>
                            <th>Miền</th>
                            <th>Bạch thủ lô</th>
                            <th>Song thủ lô</th>
                            <th>3CL</th>
                            <th>Chạm</th>
                            <th>Thời gian đăng ký</th>
                            <th>Kết quả</th>
                            <th>Trạng thái</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {registrations.map((reg, index) => {
                            const { status, details } = checkLotteryResult(reg);
                            return (
                                <tr key={reg._id}>
                                    <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                    <td>{reg.userId?.username || 'N/A'}</td>
                                    <td>{reg.userId?.fullname || 'N/A'}</td>
                                    <td>{reg.eventId?.title || 'Không có sự kiện'}</td>
                                    <td>{reg.region}</td>
                                    <td>{reg.numbers.bachThuLo || '-'}</td>
                                    <td>{reg.numbers.songThuLo.join(', ') || '-'}</td>
                                    <td>{reg.numbers.threeCL || '-'}</td>
                                    <td>{reg.numbers.cham || '-'}</td>
                                    <td>{new Date(reg.createdAt).toLocaleString('vi-VN')}</td>
                                    <td>{details}</td>
                                    <td>{status}</td>
                                    <td>
                                        <button
                                            className={styles.actionButton}
                                            onClick={() => handleViewDetails(reg.userId._id)}
                                            aria-label={`Xem chi tiết người dùng ${reg.userId?.username || 'N/A'}`}
                                        >
                                            Xem chi tiết
                                        </button>
                                        <button
                                            className={styles.actionButton}
                                            onClick={() => handleReward(reg.userId)}
                                            aria-label={`Phát thưởng cho người dùng ${reg.userId?.username || 'N/A'}`}
                                        >
                                            Phát thưởng
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}

            <div className={styles.pagination}>
                <button
                    className={styles.paginationButton}
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    aria-label="Trang trước"
                >
                    Trang trước
                </button>
                <span>Trang {currentPage} / {Math.ceil(registrationCount / itemsPerPage)}</span>
                <button
                    className={styles.paginationButton}
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === Math.ceil(registrationCount / itemsPerPage)}
                    aria-label="Trang sau"
                >
                    Trang sau
                </button>
            </div>

            {isModalOpen && userDetails && (
                <div className={styles.modal} onClick={handleOverlayClick}>
                    <div className={styles.modalContent}>
                        <h2 className={styles.modalTitle}>Chi tiết người dùng</h2>
                        <button
                            className={styles.closeButton}
                            onClick={handleCloseModal}
                            aria-label="Đóng modal chi tiết"
                        >
                            ×
                        </button>
                        <div className={styles.detailItem}>
                            <strong>Username:</strong> {userDetails.username}
                        </div>
                        <div className={styles.detailItem}>
                            <strong>Họ tên:</strong> {userDetails.fullname}
                        </div>
                        <div className={styles.detailItem}>
                            <strong>Email:</strong> {userDetails.email}
                        </div>
                        <div className={styles.detailItem}>
                            <strong>Số điện thoại:</strong> {userDetails.phoneNumber || 'Chưa cung cấp'}
                        </div>
                        <div className={styles.detailItem}>
                            <strong>Ảnh đại diện:</strong>
                            {userDetails.img ? (
                                <img src={userDetails.img} alt="Avatar" className={styles.avatar} />
                            ) : (
                                'Chưa có'
                            )}
                        </div>
                        <div className={styles.detailItem}>
                            <strong>Điểm:</strong> {userDetails.points}
                        </div>
                        <div className={styles.detailItem}>
                            <strong>Danh hiệu:</strong> {userDetails.titles.join(', ')}
                        </div>
                        <div className={styles.detailItem}>
                            <strong>Cấp độ:</strong> {userDetails.level}
                        </div>

                        <h3 className={styles.subtitle}>Số đã đăng ký ({region || 'Tất cả'})</h3>
                        {userRegistrations.length > 0 ? (
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>STT</th>
                                        <th>Tên sự kiện</th>
                                        <th>Bạch thủ lô</th>
                                        <th>Song thủ lô</th>
                                        <th>3CL</th>
                                        <th>Chạm</th>
                                        <th>Thời gian</th>
                                        <th>Kết quả</th>
                                        <th>Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {userRegistrations.map((reg, index) => {
                                        const { status, details } = checkLotteryResult(reg);
                                        return (
                                            <tr key={reg._id}>
                                                <td>{index + 1}</td>
                                                <td>{reg.eventId?.title || 'Không có sự kiện'}</td>
                                                <td>{reg.numbers.bachThuLo || '-'}</td>
                                                <td>{reg.numbers.songThuLo.join(', ') || '-'}</td>
                                                <td>{reg.numbers.threeCL || '-'}</td>
                                                <td>{reg.numbers.cham || '-'}</td>
                                                <td>{new Date(reg.createdAt).toLocaleString('vi-VN')}</td>
                                                <td>{details}</td>
                                                <td>{status}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        ) : (
                            <p>Chưa có đăng ký nào cho miền {region || 'Tất cả'}</p>
                        )}

                        <h3 className={styles.subtitle}>Quản lý điểm</h3>
                        <div className={styles.formGroup}>
                            <button
                                className={styles.submitButton}
                                onClick={handleAddPoints}
                                aria-label="Cộng 10 điểm"
                            >
                                Cộng 10 điểm
                            </button>
                        </div>
                        <form onSubmit={handleUpdatePoints} className={styles.form}>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Sửa điểm</label>
                                <input
                                    type="number"
                                    value={pointsInput}
                                    onChange={(e) => setPointsInput(e.target.value)}
                                    placeholder="Nhập số điểm mới"
                                    className={styles.input}
                                    min="0"
                                    aria-label="Nhập số điểm mới"
                                />
                            </div>
                            <div className={styles.buttonGroup}>
                                <button type="submit" className={styles.submitButton} aria-label="Cập nhật điểm">
                                    Cập nhật điểm
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {rewardingUser && (
                <div className={styles.modal} role="dialog" aria-labelledby="rewardModalTitle">
                    <div className={styles.modalContent}>
                        <h2 id="rewardModalTitle" className={styles.modalTitle}>
                            Phát thưởng cho: {rewardingUser.username}
                        </h2>
                        <button
                            className={styles.closeButton}
                            onClick={() => {
                                setRewardingUser(null);
                                setRewardPoints(0);
                            }}
                            aria-label="Đóng modal phát thưởng"
                        >
                            ×
                        </button>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>
                                Số điểm hiện tại: {rewardingUser.points}
                            </label>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel} htmlFor="rewardPoints">
                                Số điểm cần cộng thêm
                            </label>
                            <input
                                id="rewardPoints"
                                type="number"
                                value={rewardPoints}
                                onChange={(e) => setRewardPoints(parseInt(e.target.value) || 0)}
                                className={styles.input}
                                min="0"
                                placeholder="Nhập số điểm cần cộng"
                                aria-label="Số điểm cần cộng thêm"
                            />
                        </div>
                        <div className={styles.buttonGroup}>
                            <button
                                onClick={() => {
                                    setRewardingUser(null);
                                    setRewardPoints(0);
                                }}
                                className={styles.cancelButton}
                                aria-label="Hủy phát thưởng"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleSaveReward}
                                className={styles.submitButton}
                                aria-label="Lưu phát thưởng"
                            >
                                Lưu
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}