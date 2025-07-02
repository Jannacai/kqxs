"use client";

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import moment from 'moment';
import 'moment-timezone';
import Thongbao from './thongbao';
import Leaderboard from './bangxephang';
import LotteryRegistration from './dangkyquayso';
import Vinhdanh from './vinhdanh';

import styles from '../../styles/DienDan.module.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

const DienDan = () => {
    const { data: session, status } = useSession();
    const [showModal, setShowModal] = useState(false);
    const [showRegistrationsModal, setShowRegistrationsModal] = useState(false);
    const [registrations, setRegistrations] = useState([]);
    const [editingRegistration, setEditingRegistration] = useState(null);
    const [formData, setFormData] = useState({
        bachThuLo: '',
        songThuLo: '',
        threeCL: '',
        cham: ''
    });
    const [error, setError] = useState('');
    const modalRef = useRef(null);

    const checkRegistrationTime = (region) => {
        const now = moment().tz('Asia/Ho_Chi_Minh');
        const currentTimeInMinutes = now.hours() * 60 + now.minutes();
        const timeLimits = {
            Nam: 16 * 60 + 10,
            Trung: 17 * 60 + 10,
            Bac: 18 * 60 + 10,
            reset: 18 * 60 + 40
        };
        return currentTimeInMinutes > timeLimits.reset || currentTimeInMinutes < timeLimits[region];
    };

    const fetchRegistrations = async () => {
        if (!session?.user?.id) {
            console.log('No session or user ID');
            return;
        }
        try {
            const todayStart = moment().tz('Asia/Ho_Chi_Minh').startOf('day').toDate();
            const todayEnd = moment().tz('Asia/Ho_Chi_Minh').endOf('day').toDate();
            console.log('Fetching registrations with:', {
                userId: session.user.id,
                startDate: todayStart.toISOString(),
                endDate: todayEnd.toISOString()
            });
            const res = await axios.get(`${API_BASE_URL}/api/lottery/check-results`, {
                headers: {
                    Authorization: `Bearer ${session.accessToken}`,
                    'Content-Type': 'application/json',
                },
                params: {
                    userId: session.user.id,
                    startDate: todayStart.toISOString(),
                    endDate: todayEnd.toISOString()
                }
            });
            console.log('API response:', res.data);
            setRegistrations(res.data.registrations || []);
        } catch (err) {
            console.error('Error fetching registrations:', err.response?.data || err.message);
            setError(err.response?.data?.message || 'Đã có lỗi khi lấy danh sách đăng ký');
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                setShowRegistrationsModal(false);
                setEditingRegistration(null);
                setFormData({ bachThuLo: '', songThuLo: '', threeCL: '', cham: '' });
                setError('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (showRegistrationsModal && session) {
            fetchRegistrations();
        }
    }, [showRegistrationsModal, session]);

    const handleEdit = (registration) => {
        setEditingRegistration(registration);
        setFormData({
            bachThuLo: registration.numbers.bachThuLo || '',
            songThuLo: registration.numbers.songThuLo.join(',') || '',
            threeCL: registration.numbers.threeCL || '',
            cham: registration.numbers.cham || ''
        });
    };

    const handleUpdateSubmit = async (e) => {
        e.preventDefault();
        if (!session) {
            alert('Vui lòng đăng nhập để chỉnh sửa.');
            return;
        }

        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            alert(validationError);
            return;
        }

        try {
            const payload = {
                numbers: {
                    bachThuLo: formData.bachThuLo || null,
                    songThuLo: formData.songThuLo ? formData.songThuLo.split(',') : [],
                    threeCL: formData.threeCL || null,
                    cham: formData.cham || null
                }
            };

            const res = await axios.put(`${API_BASE_URL}/api/lottery/update/${editingRegistration._id}`, payload, {
                headers: {
                    Authorization: `Bearer ${session.accessToken}`,
                    'Content-Type': 'application/json',
                }
            });

            alert(`Chỉnh sửa đăng ký thành công cho miền ${editingRegistration.region}!`);
            setFormData({ bachThuLo: '', songThuLo: '', threeCL: '', cham: '' });
            setEditingRegistration(null);
            setError('');
            fetchRegistrations();
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Đã có lỗi khi chỉnh sửa';
            console.error('Update error:', errorMessage);
            setError(errorMessage);
            alert(errorMessage);
        }
    };

    const validateForm = () => {
        const { bachThuLo, songThuLo, threeCL, cham } = formData;

        if (bachThuLo && !/^\d{2}$/.test(bachThuLo)) {
            return 'Bạch thủ lô phải là số 2 chữ số (00-99)';
        }

        if (songThuLo && !/^\d{2},\d{2}$/.test(songThuLo)) {
            return 'Song thủ lô phải có định dạng XX,YY (ví dụ: 23,45)';
        }

        if (threeCL && !/^\d{3}$/.test(threeCL)) {
            return '3CL phải là số 3 chữ số (000-999)';
        }

        if (cham && !/^\d{1}$/.test(cham)) {
            return 'Chạm phải là số 1 chữ số (0-9)';
        }

        if (!bachThuLo && !songThuLo && !threeCL && !cham) {
            return 'Vui lòng nhập ít nhất một số để chỉnh sửa';
        }

        return '';
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === 'songThuLo') {
            if (/^[\d,]*$/.test(value)) {
                setFormData({ ...formData, [name]: value });
            }
        } else if (/^\d*$/.test(value)) {
            setFormData({ ...formData, [name]: value });
        }
        setError('');
    };

    return (
        <div className='container'>
            <div className={styles.container}>
                <h1 className={styles.title}>Diễn Đàn Quay Số</h1>
                <Vinhdanh />
                <div className={styles.buttonWrapper}>
                    <button
                        onClick={() => setShowModal(true)}
                        className={styles.registerButton}
                    >
                        Đăng Ký Tham Gia Quay Số
                    </button>
                    <button
                        onClick={() => setShowRegistrationsModal(true)}
                        className={styles.viewRegistrationsButton}
                        disabled={status !== 'authenticated'}
                    >
                        Xem và Chỉnh sửa Đăng ký
                    </button>
                </div>

                <div className={styles.notificationSection}>
                    <h2 className={styles.sectionTitle}>Thông Báo</h2>
                    <Thongbao />
                </div>

                {showModal && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modal}>
                            <h2 className={styles.modalTitle}>Đăng ký quay số</h2>
                            <LotteryRegistration onRegistrationSuccess={fetchRegistrations} />
                            <button
                                className={styles.cancelButton}
                                onClick={() => setShowModal(false)}
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                )}

                {showRegistrationsModal && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modal} ref={modalRef}>
                            <h2 className={styles.modalTitle}>Danh sách Đăng ký Quay số</h2>
                            {error && <p className={styles.error}>{error}</p>}
                            {registrations.length === 0 ? (
                                <p className={styles.noRegistrations}>Bạn chưa có đăng ký nào hôm nay.</p>
                            ) : (
                                <div className={styles.registrationsList}>
                                    {registrations.map((reg) => (
                                        <div key={reg._id} className={styles.registrationItem}>
                                            <p><strong>Miền:</strong> {reg.region}</p>
                                            <p><strong>Thời gian đăng ký:</strong> {moment(reg.createdAt).tz('Asia/Ho_Chi_Minh').format('HH:mm:ss DD/MM/YYYY')}</p>
                                            <p><strong>Bạch thủ lô:</strong> {reg.numbers.bachThuLo || 'Không có'}</p>
                                            <p><strong>Song thủ lô:</strong> {reg.numbers.songThuLo.length > 0 ? reg.numbers.songThuLo.join(', ') : 'Không có'}</p>
                                            <p><strong>3CL:</strong> {reg.numbers.threeCL || 'Không có'}</p>
                                            <p><strong>Chạm:</strong> {reg.numbers.cham || 'Không có'}</p>
                                            <p><strong>Lần chỉnh sửa:</strong> {reg.updatedCount || 0}</p>
                                            {reg.result.isChecked ? (
                                                <p><strong>Kết quả:</strong> {reg.result.isWin ? 'Trúng' : 'Trượt'}</p>
                                            ) : (
                                                <p><strong>Kết quả:</strong> Chưa đối chiếu</p>
                                            )}
                                            {reg.result.isWin && (
                                                <div>
                                                    <p><strong>Số trúng:</strong></p>
                                                    {reg.result.winningNumbers.bachThuLo && <p>- Bạch thủ lô: {reg.numbers.bachThuLo}</p>}
                                                    {reg.result.winningNumbers.songThuLo.length > 0 && <p>- Song thủ lô: {reg.result.winningNumbers.songThuLo.join(', ')}</p>}
                                                    {reg.result.winningNumbers.threeCL && <p>- 3CL: {reg.numbers.threeCL}</p>}
                                                    {reg.result.winningNumbers.cham && <p>- Chạm: Humphrey: {reg.numbers.cham}</p>}
                                                    <p><strong>Giải trúng:</strong> {reg.result.matchedPrizes.join(', ')}</p>
                                                </div>
                                            )}
                                            {checkRegistrationTime(reg.region) && (reg.updatedCount || 0) < 1 ? (
                                                <button
                                                    className={styles.editButton}
                                                    onClick={() => handleEdit(reg)}
                                                >
                                                    Chỉnh sửa
                                                </button>
                                            ) : (
                                                <p className={styles.warning}>
                                                    {reg.updatedCount >= 1
                                                        ? 'Bạn đã chỉnh sửa đăng ký này.'
                                                        : `Thời gian chỉnh sửa cho miền ${reg.region} đã đóng.`}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {editingRegistration && (
                                <form onSubmit={handleUpdateSubmit} className={styles.editForm}>
                                    <h3 className={styles.formTitle}>Chỉnh sửa Đăng ký - Miền {editingRegistration.region}</h3>
                                    <div className={styles.formGroup}>
                                        <label className={styles.formLabel}>Bạch thủ lô (2 chữ số, ví dụ: 23)</label>
                                        <input
                                            type="text"
                                            name="bachThuLo"
                                            value={formData.bachThuLo}
                                            onChange={handleInputChange}
                                            placeholder="Nhập số 2 chữ số"
                                            className={styles.input}
                                            maxLength={2}
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label className={styles.formLabel}>Song thủ lô (2 số, ví dụ: 23,45)</label>
                                        <input
                                            type="text"
                                            name="songThuLo"
                                            value={formData.songThuLo}
                                            onChange={handleInputChange}
                                            placeholder="Nhập 2 số, cách nhau bởi dấu phẩy"
                                            className={styles.input}
                                            maxLength={5}
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label className={styles.formLabel}>3CL (3 chữ số, ví dụ: 123)</label>
                                        <input
                                            type="text"
                                            name="threeCL"
                                            value={formData.threeCL}
                                            onChange={handleInputChange}
                                            placeholder="Nhập số 3 chữ số"
                                            className={styles.input}
                                            maxLength={3}
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label className={styles.formLabel}>Chạm (1 chữ số, ví dụ: 5)</label>
                                        <input
                                            type="text"
                                            name="cham"
                                            value={formData.cham}
                                            onChange={handleInputChange}
                                            placeholder="Nhập số 1 chữ số"
                                            className={styles.input}
                                            maxLength={1}
                                        />
                                    </div>
                                    <div className={styles.buttonGroup}>
                                        <button type="submit" className={styles.submitButton}>
                                            Lưu chỉnh sửa
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.cancelButton}
                                            onClick={() => {
                                                setEditingRegistration(null);
                                                setFormData({ bachThuLo: '', songThuLo: '', threeCL: '', cham: '' });
                                                setError('');
                                            }}
                                        >
                                            Hủy
                                        </button>
                                    </div>
                                </form>
                            )}

                            <button
                                className={styles.cancelButton}
                                onClick={() => {
                                    setShowRegistrationsModal(false);
                                    setEditingRegistration(null);
                                    setFormData({ bachThuLo: '', songThuLo: '', threeCL: '', cham: '' });
                                    setError('');
                                }}
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                )}
            </div>
            <div className={styles.leaderboardSection}>
                {/* <h2 className={styles.sectionTitle}>Bảng Xếp Hạng</h2> */}
                <Leaderboard />
            </div>
        </div>
    );
};

export default DienDan;