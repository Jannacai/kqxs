"use client";

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router'; // Thay bằng 'next/navigation' nếu dùng App Router
import axios from 'axios';
import io from 'socket.io-client';
import moment from 'moment';
import 'moment-timezone';
import LotteryRegistration from '../dangkyquayso';
import styles from '../../../styles/detaiEventHot.module.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
const SOCKET_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export default function EventHotNewsDetail() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { id } = router.query || {}; // Xử lý trường hợp router.query không tồn tại
    const [item, setItem] = useState(null);
    const [comment, setComment] = useState('');
    const [showLotteryModal, setShowLotteryModal] = useState(false);
    const [showRegistrationsModal, setShowRegistrationsModal] = useState(false);
    const [registrations, setRegistrations] = useState([]);
    const [editingRegistration, setEditingRegistration] = useState(null);
    const [editFormData, setEditFormData] = useState({
        bachThuLo: '',
        songThuLo: '',
        threeCL: '',
        cham: ''
    });
    const [error, setError] = useState('');
    const [hasRegistered, setHasRegistered] = useState(false);
    const [socket, setSocket] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const modalRef = useRef(null);

    useEffect(() => {
        if (!router.isReady || !id) {
            setError('Không tìm thấy ID bài viết');
            setIsLoading(false);
            return;
        }

        // Kiểm tra tính hợp lệ của id
        if (typeof id !== 'string' || id === '[object Object]') {
            console.error('Invalid event ID:', id);
            setError('ID bài viết không hợp lệ');
            setIsLoading(false);
            return;
        }

        const fetchItemDetails = async () => {
            try {
                console.log('Fetching event details for ID:', id);
                const res = await axios.get(`${API_BASE_URL}/api/events/${id}`, {
                    headers: { Authorization: `Bearer ${session?.accessToken}` } // Loại bỏ dấu cách
                });
                console.log('Event details response:', res.data);
                setItem(res.data);
                setError('');
            } catch (err) {
                console.error('Error fetching event details:', err.message, err.response?.data);
                setError(err.response?.data?.message || 'Đã có lỗi khi lấy chi tiết bài viết');
            } finally {
                setIsLoading(false);
            }
        };

        fetchItemDetails();
    }, [id, router.isReady, session]);

    useEffect(() => {
        if (!router.isReady || !id || status !== 'authenticated' || !session?.user?.id) {
            console.log('Skipping checkRegistrationStatus:', { status, id, userId: session?.user?.id });
            return;
        }

        const newSocket = io(SOCKET_URL, {
            query: { token: session.accessToken }
        });
        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('Socket connected, joining event:', id);
            newSocket.emit('joinEvent', id);
        });

        newSocket.on('NEW_COMMENT', (data) => {
            if (data._id === id) {
                console.log('Received new comment:', data);
                setItem(data);
            }
        });

        newSocket.on('connect_error', (err) => {
            console.error('Socket connection error:', err.message);
            setError('Mất kết nối thời gian thực. Vui lòng làm mới trang.');
        });

        newSocket.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);
        });

        const checkRegistrationStatus = async () => {
            try {
                console.log('Checking registration status:', {
                    userId: session.user.id,
                    eventId: id,
                    token: session.accessToken ? 'Present' : 'Missing'
                });
                const todayStart = moment().tz('Asia/Ho_Chi_Minh').startOf('day').toDate();
                const todayEnd = moment().tz('Asia/Ho_Chi_Minh').endOf('day').toDate();
                const res = await axios.get(`${API_BASE_URL}/api/lottery/check-limit`, {
                    headers: {
                        Authorization: `Bearer ${session.accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    params: {
                        userId: session.user.id,
                        startDate: todayStart.toISOString(),
                        endDate: todayEnd.toISOString(),
                        eventId: id
                    }
                });
                console.log('Registration status response:', res.data);
                setHasRegistered(res.data.registrations?.length > 0);
                setError('');
            } catch (err) {
                console.error('Error checking registration status:', err.message, err.response?.data);
                const errorMessage = err.response?.data?.message || 'Đã có lỗi khi kiểm tra trạng thái đăng ký';
                setError(errorMessage);
                console.log('Set error:', errorMessage);
            }
        };

        checkRegistrationStatus();

        return () => {
            newSocket.disconnect();
        };
    }, [status, session, id, router.isReady]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                setShowLotteryModal(false);
                setShowRegistrationsModal(false);
                setEditingRegistration(null);
                setEditFormData({ bachThuLo: '', songThuLo: '', threeCL: '', cham: '' });
                setError('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!router.isReady || !id || !showRegistrationsModal || !session) {
            return;
        }

        const fetchRegistrations = async () => {
            try {
                console.log('Fetching registrations for user:', session.user.id, 'event:', id);
                const todayStart = moment().tz('Asia/Ho_Chi_Minh').startOf('day').toDate();
                const todayEnd = moment().tz('Asia/Ho_Chi_Minh').endOf('day').toDate();
                const res = await axios.get(`${API_BASE_URL}/api/lottery/check-results`, {
                    headers: {
                        Authorization: `Bearer ${session.accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    params: {
                        userId: session.user.id,
                        date: moment().tz('Asia/Ho_Chi_Minh').format('DD-MM-YYYY'),
                        eventId: id
                    }
                });
                console.log('Registrations response:', res.data);
                setRegistrations(res.data.registrations || []);
                setError('');
            } catch (err) {
                console.error('Error fetching registrations:', err.message, err.response?.data);
                setError(err.response?.data?.message || 'Đã có lỗi khi lấy danh sách đăng ký');
            }
        };
        fetchRegistrations();
    }, [showRegistrationsModal, session, id, router.isReady]);

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!session) {
            router.push('/login');
            return;
        }
        if (!comment.trim()) {
            setError('Nội dung bình luận không được để trống');
            return;
        }
        try {
            console.log('Submitting comment for event:', id);
            const res = await axios.post(
                `${API_BASE_URL}/api/events/${id}/comments`,
                { content: comment },
                { headers: { Authorization: `Bearer ${session?.accessToken}` } }
            );
            console.log('Comment submission response:', res.data);
            setComment('');
            setError('');
            setItem(res.data.event);
        } catch (err) {
            console.error('Error submitting comment:', err.message, err.response?.data);
            setError(err.response?.data?.message || 'Đã có lỗi khi gửi bình luận');
        }
    };

    const handleLoginRedirect = () => {
        router.push('/login');
    };

    const handleEdit = (registration) => {
        setEditingRegistration(registration);
        setEditFormData({
            bachThuLo: registration.numbers.bachThuLo || '',
            songThuLo: registration.numbers.songThuLo.join(',') || '',
            threeCL: registration.numbers.threeCL || '',
            cham: registration.numbers.cham || ''
        });
    };

    const validateEditForm = () => {
        const { bachThuLo, songThuLo, threeCL, cham } = editFormData;

        if (item?.lotteryFields?.bachThuLo && bachThuLo && !/^\d{2}$/.test(bachThuLo)) {
            return 'Bạch thủ lô phải là số 2 chữ số (00-99)';
        }

        if (item?.lotteryFields?.songThuLo && songThuLo && !/^\d{2},\d{2}$/.test(songThuLo)) {
            return 'Song thủ lô phải có định dạng XX,YY (ví dụ: 23,45)';
        }

        if (item?.lotteryFields?.threeCL && threeCL && !/^\d{3}$/.test(threeCL)) {
            return '3CL phải là số 3 chữ số (000-999)';
        }

        if (item?.lotteryFields?.cham && cham && !/^\d{1}$/.test(cham)) {
            return 'Chạm phải là số 1 chữ số (0-9)';
        }

        if (
            (item?.lotteryFields?.bachThuLo && !bachThuLo) &&
            (item?.lotteryFields?.songThuLo && !songThuLo) &&
            (item?.lotteryFields?.threeCL && !threeCL) &&
            (item?.lotteryFields?.cham && !cham)
        ) {
            return 'Vui lòng nhập ít nhất một số để chỉnh sửa';
        }

        return '';
    };

    const handleUpdateSubmit = async (e) => {
        e.preventDefault();
        if (!session) {
            router.push('/login');
            alert('Vui lòng đăng nhập để chỉnh sửa.');
            return;
        }

        const validationError = validateEditForm();
        if (validationError) {
            setError(validationError);
            alert(validationError);
            return;
        }

        try {
            console.log('Updating registration:', editingRegistration._id);
            const payload = {
                numbers: {
                    bachThuLo: item?.lotteryFields?.bachThuLo ? editFormData.bachThuLo || null : null,
                    songThuLo: item?.lotteryFields?.songThuLo ? (editFormData.songThuLo ? editFormData.songThuLo.split(',') : []) : [],
                    threeCL: item?.lotteryFields?.threeCL ? editFormData.threeCL || null : null,
                    cham: item?.lotteryFields?.cham ? editFormData.cham || null : null
                }
            };
            const res = await axios.put(`${API_BASE_URL}/api/lottery/update/${editingRegistration._id}`, payload, {
                headers: {
                    Authorization: `Bearer ${session.accessToken}`,
                    'Content-Type': 'application/json',
                }
            });
            console.log('Update registration response:', res.data);
            alert(`Chỉnh sửa đăng ký thành công cho miền ${editingRegistration.region}!`);
            setEditFormData({ bachThuLo: '', songThuLo: '', threeCL: '', cham: '' });
            setEditingRegistration(null);
            setError('');
            const fetchRegistrations = async () => {
                try {
                    const todayStart = moment().tz('Asia/Ho_Chi_Minh').startOf('day').toDate();
                    const todayEnd = moment().tz('Asia/Ho_Chi_Minh').endOf('day').toDate();
                    const res = await axios.get(`${API_BASE_URL}/api/lottery/check-results`, {
                        headers: {
                            Authorization: `Bearer ${session.accessToken}`,
                            'Content-Type': 'application/json',
                        },
                        params: {
                            userId: session.user.id,
                            date: moment().tz('Asia/Ho_Chi_Minh').format('DD-MM-YYYY'),
                            eventId: id
                        }
                    });
                    setRegistrations(res.data.registrations || []);
                } catch (err) {
                    console.error('Error fetching registrations after update:', err.message, err.response?.data);
                    setError(err.response?.data?.message || 'Đã có lỗi khi lấy danh sách đăng ký');
                }
            };
            fetchRegistrations();
        } catch (err) {
            console.error('Error updating registration:', err.message, err.response?.data);
            const errorMessage = err.response?.data?.message || 'Đã có lỗi khi chỉnh sửa';
            setError(errorMessage);
            alert(errorMessage);
        }
    };

    const handleEditInputChange = (e) => {
        const { name, value } = e.target;
        if (name === 'songThuLo') {
            if (/^[\d,]*$/.test(value)) {
                setEditFormData({ ...editFormData, [name]: value });
            }
        } else if (/^\d*$/.test(value)) {
            setEditFormData({ ...editFormData, [name]: value });
        }
        setError('');
    };

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

    if (isLoading) {
        return <div className={styles.loading}>Đang tải...</div>;
    }

    if (error && !item) {
        return (
            <div className={styles.container}>
                <button className={styles.backButton} onClick={() => router.push('/diendan')}>
                    Quay lại
                </button>
                <p className={styles.error}>{error}</p>
            </div>
        );
    }

    if (!item) {
        return (
            <div className={styles.container}>
                <button className={styles.backButton} onClick={() => router.push('/diendan')}>
                    Quay lại
                </button>
                <p className={styles.error}>Không tìm thấy bài viết</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <button className={styles.backButton} onClick={() => router.push('/diendan')}>
                Quay lại
            </button>
            <h2 className={styles.itemTitle}>{item.title}</h2>
            <p className={styles.itemContent}>{item.content}</p>
            <p className={styles.itemMeta}>
                Đăng bởi: {item.createdBy.fullname} |{' '}
                {moment.tz(item.createdAt, 'Asia/Ho_Chi_Minh').format('DD/MM/YYYY HH:mm:ss')}
            </p>
            {item.lotteryFields && (item.lotteryFields.bachThuLo || item.lotteryFields.songThuLo || item.lotteryFields.threeCL || item.lotteryFields.cham) && (
                <div className={styles.lotterySection}>
                    <button
                        className={styles.registerButton}
                        onClick={() => setShowLotteryModal(true)}
                    >
                        Đăng Ký Tham Gia Quay Số
                    </button>
                    {hasRegistered && (
                        <button
                            className={styles.viewRegistrationsButton}
                            onClick={() => setShowRegistrationsModal(true)}
                            disabled={status !== 'authenticated'}
                        >
                            Xem và Chỉnh sửa Đăng ký
                        </button>
                    )}
                </div>
            )}
            {showLotteryModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal} ref={modalRef}>
                        <LotteryRegistration
                            lotteryFields={item.lotteryFields}
                            eventId={id}
                            onRegistrationSuccess={() => {
                                const fetchRegistrations = async () => {
                                    try {
                                        const todayStart = moment().tz('Asia/Ho_Chi_Minh').startOf('day').toDate();
                                        const todayEnd = moment().tz('Asia/Ho_Chi_Minh').endOf('day').toDate();
                                        const res = await axios.get(`${API_BASE_URL}/api/lottery/check-results`, {
                                            headers: {
                                                Authorization: `Bearer ${session.accessToken}`,
                                                'Content-Type': 'application/json',
                                            },
                                            params: {
                                                userId: session.user.id,
                                                date: moment().tz('Asia/Ho_Chi_Minh').format('DD-MM-YYYY'),
                                                eventId: id
                                            }
                                        });
                                        setRegistrations(res.data.registrations || []);
                                    } catch (err) {
                                        console.error('Error fetching registrations after registration:', err.message, err.response?.data);
                                        setError(err.response?.data?.message || 'Đã có lỗi khi lấy danh sách đăng ký');
                                    }
                                };
                                fetchRegistrations();
                                const checkRegistrationStatus = async () => {
                                    try {
                                        const todayStart = moment().tz('Asia/Ho_Chi_Minh').startOf('day').toDate();
                                        const todayEnd = moment().tz('Asia/Ho_Chi_Minh').endOf('day').toDate();
                                        const res = await axios.get(`${API_BASE_URL}/api/lottery/check-limit`, {
                                            headers: {
                                                Authorization: `Bearer ${session.accessToken}`,
                                                'Content-Type': 'application/json',
                                            },
                                            params: {
                                                userId: session.user.id,
                                                startDate: todayStart.toISOString(),
                                                endDate: todayEnd.toISOString(),
                                                eventId: id
                                            }
                                        });
                                        console.log('Registration status after success:', res.data);
                                        setHasRegistered(res.data.registrations?.length > 0);
                                    } catch (err) {
                                        console.error('Error checking registration status after registration:', err.message, err.response?.data);
                                        setError(err.response?.data?.message || 'Đã có lỗi khi kiểm tra trạng thái đăng ký');
                                    }
                                };
                                checkRegistrationStatus();
                            }}
                        />
                        <button
                            className={styles.cancelButton}
                            onClick={() => setShowLotteryModal(false)}
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
                            <p className={styles.noRegistrations}>Bạn chưa có đăng ký nào cho bài viết này.</p>
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
                                                {reg.result.winningNumbers.cham && <p>- Chạm: {reg.numbers.cham}</p>}
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
                                {item.lotteryFields.bachThuLo && (
                                    <div className={styles.formGroup}>
                                        <label className={styles.formLabel}>Bạch thủ lô (2 chữ số, ví dụ: 23)</label>
                                        <input
                                            type="text"
                                            name="bachThuLo"
                                            value={editFormData.bachThuLo}
                                            onChange={handleEditInputChange}
                                            placeholder="Nhập số 2 chữ số"
                                            className={styles.input}
                                            maxLength={2}
                                        />
                                    </div>
                                )}
                                {item.lotteryFields.songThuLo && (
                                    <div className={styles.formGroup}>
                                        <label className={styles.formLabel}>Song thủ lô (2 số, ví dụ: 23,45)</label>
                                        <input
                                            type="text"
                                            name="songThuLo"
                                            value={editFormData.songThuLo}
                                            onChange={handleEditInputChange}
                                            placeholder="Nhập 2 số, cách nhau bởi dấu phẩy"
                                            className={styles.input}
                                            maxLength={5}
                                        />
                                    </div>
                                )}
                                {item.lotteryFields.threeCL && (
                                    <div className={styles.formGroup}>
                                        <label className={styles.formLabel}>3CL (3 chữ số, ví dụ: 123)</label>
                                        <input
                                            type="text"
                                            name="threeCL"
                                            value={editFormData.threeCL}
                                            onChange={handleEditInputChange}
                                            placeholder="Nhập số 3 chữ số"
                                            className={styles.input}
                                            maxLength={3}
                                        />
                                    </div>
                                )}
                                {item.lotteryFields.cham && (
                                    <div className={styles.formGroup}>
                                        <label className={styles.formLabel}>Chạm (1 chữ số, ví dụ: 5)</label>
                                        <input
                                            type="text"
                                            name="cham"
                                            value={editFormData.cham}
                                            onChange={handleEditInputChange}
                                            placeholder="Nhập số 1 chữ số"
                                            className={styles.input}
                                            maxLength={1}
                                        />
                                    </div>
                                )}
                                <div className={styles.buttonGroup}>
                                    <button type="submit" className={styles.submitButton}>
                                        Lưu chỉnh sửa
                                    </button>
                                    <button
                                        type="button"
                                        className={styles.cancelButton}
                                        onClick={() => {
                                            setEditingRegistration(null);
                                            setEditFormData({ bachThuLo: '', songThuLo: '', threeCL: '', cham: '' });
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
                                setEditFormData({ bachThuLo: '', songThuLo: '', threeCL: '', cham: '' });
                                setError('');
                            }}
                        >
                            Đóng
                        </button>
                    </div>
                </div>
            )}
            <div className={styles.commentSection}>
                <h3>Bình luận</h3>
                {item.comments.length === 0 ? (
                    <p>Chưa có bình luận nào</p>
                ) : (
                    item.comments.map((comment) => (
                        <div key={comment._id} className={styles.comment}>
                            <p>
                                <strong>{comment.userId.fullname}</strong>: {comment.content}
                            </p>
                            <p className={styles.commentMeta}>
                                {moment.tz(comment.createdAt, 'Asia/Ho_Chi_Minh').format('DD/MM/YYYY HH:mm:ss')}
                            </p>
                        </div>
                    ))
                )}
                {session ? (
                    <form onSubmit={handleCommentSubmit} className={styles.commentForm}>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Nhập bình luận của bạn..."
                            className={styles.commentInput}
                            maxLength={500}
                        />
                        <button type="submit" className={styles.submitButton}>
                            Gửi
                        </button>
                    </form>
                ) : (
                    <div className={styles.loginPrompt}>
                        <p>Vui lòng đăng nhập để bình luận.</p>
                        <button onClick={handleLoginRedirect} className={styles.loginButton}>
                            Đăng nhập
                        </button>
                    </div>
                )}
                {error && <p className={styles.error}>{error}</p>}
            </div>
        </div>
    );
}