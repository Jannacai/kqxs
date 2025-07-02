"use client";

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import moment from 'moment';
import 'moment-timezone';
import styles from '../../styles/userLotteryManagement.module.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export default function UserLotteryManagement() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [region, setRegion] = useState('Nam');
    const [registrations, setRegistrations] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [userDetails, setUserDetails] = useState(null);
    const [userRegistrations, setUserRegistrations] = useState([]);
    const [pointsInput, setPointsInput] = useState('');
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchRegistrations = useCallback(async () => {
        if (status !== 'authenticated') {
            setError('Vui lòng đăng nhập để xem thông tin');
            return;
        }
        try {
            const res = await axios.get(`${API_BASE_URL}/api/lottery/registrations`, {
                headers: {
                    Authorization: `Bearer ${session?.accessToken}`,
                    'Content-Type': 'application/json',
                },
                params: { region }
            });
            setRegistrations(res.data.registrations);
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
    }, [session?.accessToken, region, status, router]);

    const fetchUserDetails = useCallback(async (userId) => {
        if (status !== 'authenticated') {
            setError('Vui lòng đăng nhập để xem thông tin');
            return;
        }
        try {
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
                    params: { userId, region }
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
    }, [session?.accessToken, region, status, router]);

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
        fetchRegistrations();
    }, [status, session, region, fetchRegistrations]);

    useEffect(() => {
        if (selectedUser) {
            fetchUserDetails(selectedUser);
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
                    }}
                    className={styles.input}
                >
                    <option value="Nam">Miền Nam</option>
                    <option value="Trung">Miền Trung</option>
                    <option value="Bac">Miền Bắc</option>
                </select>
            </div>

            <h2 className={styles.subtitle}>Danh sách đăng ký ({region})</h2>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>Username</th>
                        <th>Họ tên</th>
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
                    {registrations.map((reg) => {
                        const { status, details } = checkLotteryResult(reg);
                        return (
                            <tr key={reg._id}>
                                <td>{reg.userId?.username || 'N/A'}</td>
                                <td>{reg.userId?.fullname || 'N/A'}</td>
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
                                    >
                                        Xem chi tiết
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {isModalOpen && userDetails && (
                <div className={styles.modal}>
                    <div className={styles.modalContent}>
                        <h2 className={styles.modalTitle}>Chi tiết người dùng</h2>
                        <button
                            className={styles.closeButton}
                            onClick={handleCloseModal}
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

                        <h3 className={styles.subtitle}>Số đã đăng ký ({region})</h3>
                        {userRegistrations.length > 0 ? (
                            <table className={styles.table}>
                                <thead>
                                    <tr>
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
                                    {userRegistrations.map((reg) => {
                                        const { status, details } = checkLotteryResult(reg);
                                        return (
                                            <tr key={reg._id}>
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
                            <p>Chưa có đăng ký cho miền {region}</p>
                        )}

                        <h3 className={styles.subtitle}>Quản lý điểm</h3>
                        <div className={styles.formGroup}>
                            <button
                                className={styles.submitButton}
                                onClick={handleAddPoints}
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
                                />
                            </div>
                            <div className={styles.buttonGroup}>
                                <button type="submit" className={styles.submitButton}>
                                    Cập nhật điểm
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}