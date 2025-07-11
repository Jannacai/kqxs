"use client";

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import moment from 'moment';
import 'moment-timezone';
import axios from 'axios';
import styles from '../../styles/dangkyquayso.module.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL3 || 'http://localhost:5001';

export default function LotteryRegistration({ lotteryFields, onRegistrationSuccess, eventId }) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [region, setRegion] = useState('Nam');
    const [formData, setFormData] = useState({
        bachThuLo: '',
        songThuLo: '',
        threeCL: '',
        cham: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [currentTime, setCurrentTime] = useState(moment().tz('Asia/Ho_Chi_Minh').format('HH:mm:ss'));
    const [isRegistrationOpen, setIsRegistrationOpen] = useState({
        Nam: false,
        Trung: false,
        Bac: false
    });
    const [hasRegisteredToday, setHasRegisteredToday] = useState({
        Nam: false,
        Trung: false,
        Bac: false
    });

    const checkRegistrationTime = () => {
        const now = moment().tz('Asia/Ho_Chi_Minh');
        setCurrentTime(now.format('HH:mm:ss'));
        const currentTimeInMinutes = now.hours() * 60 + now.minutes();

        const timeLimits = {
            Nam: 16 * 60 + 10,
            Trung: 17 * 60 + 10,
            Bac: 18 * 60 + 10,
            reset: 18 * 60 + 40
        };

        setIsRegistrationOpen({
            Nam: currentTimeInMinutes > timeLimits.reset || currentTimeInMinutes < timeLimits.Nam,
            Trung: currentTimeInMinutes > timeLimits.reset || currentTimeInMinutes < timeLimits.Trung,
            Bac: currentTimeInMinutes > timeLimits.reset || currentTimeInMinutes < timeLimits.Bac
        });
    };

    const checkRegistrationLimit = async () => {
        if (!session?.user?.id || !eventId) return;

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
                    eventId
                }
            });
            const registrations = res.data.registrations;
            setHasRegisteredToday({
                Nam: registrations.some(r => r.region === 'Nam'),
                Trung: registrations.some(r => r.region === 'Trung'),
                Bac: registrations.some(r => r.region === 'Bac')
            });
        } catch (err) {
            console.error('Error checking registration limit:', err.message);
        }
    };

    useEffect(() => {
        if (status === 'authenticated') {
            checkRegistrationLimit();
        }

        checkRegistrationTime();
        const interval = setInterval(checkRegistrationTime, 1000);
        return () => clearInterval(interval);
    }, [status, session, eventId]);

    const validateForm = () => {
        const { bachThuLo, songThuLo, threeCL, cham } = formData;

        if (lotteryFields?.bachThuLo && bachThuLo && !/^\d{2}$/.test(bachThuLo)) {
            return 'Bạch thủ lô phải là số 2 chữ số (00-99)';
        }

        if (lotteryFields?.songThuLo && songThuLo && !/^\d{2},\d{2}$/.test(songThuLo)) {
            return 'Song thủ lô phải có định dạng XX,YY (ví dụ: 23,45)';
        }

        if (lotteryFields?.threeCL && threeCL && !/^\d{3}$/.test(threeCL)) {
            return '3CL phải là số 3 chữ số (000-999)';
        }

        if (lotteryFields?.cham && cham && !/^\d{1}$/.test(cham)) {
            return 'Chạm phải là số 1 chữ số (0-9)';
        }

        if (
            (lotteryFields?.bachThuLo && !bachThuLo) &&
            (lotteryFields?.songThuLo && !songThuLo) &&
            (lotteryFields?.threeCL && !threeCL) &&
            (lotteryFields?.cham && !cham)
        ) {
            return 'Vui lòng nhập ít nhất một số để đăng ký';
        }

        return '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!session) {
            router.push('/login');
            alert('Vui lòng đăng nhập để đăng ký quay số.');
            return;
        }

        if (!isRegistrationOpen[region]) {
            setError(`Đăng ký miền ${region} đã đóng. Vui lòng thử lại sau 18:40.`);
            alert(`Đăng ký miền ${region} đã đóng. Vui lòng thử lại sau 18:40.`);
            return;
        }

        if (hasRegisteredToday[region]) {
            setError(`Bạn đã đăng ký cho miền ${region} hôm nay. Vui lòng thử lại vào ngày mai.`);
            alert(`Bạn đã đăng ký cho miền ${region} hôm nay. Vui lòng thử lại vào ngày mai.`);
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
                eventId,
                region,
                numbers: {
                    bachThuLo: lotteryFields?.bachThuLo ? formData.bachThuLo || null : null,
                    songThuLo: lotteryFields?.songThuLo ? (formData.songThuLo ? formData.songThuLo.split(',') : []) : [],
                    threeCL: lotteryFields?.threeCL ? formData.threeCL || null : null,
                    cham: lotteryFields?.cham ? formData.cham || null : null
                }
            };

            const res = await axios.post(`${API_BASE_URL}/api/lottery/register`, payload, {
                headers: {
                    Authorization: `Bearer ${session?.accessToken}`,
                    'Content-Type': 'application/json',
                }
            });

            setSuccess(`Đăng ký thành công cho miền ${region} lúc ${moment().tz('Asia/Ho_Chi_Minh').format('HH:mm:ss DD/MM/YYYY')} !`);
            alert(`Đăng ký thành công cho miền ${region} lúc ${moment().tz('Asia/Ho_Chi_Minh').format('HH:mm:ss DD/MM/YYYY')} ! Bạn được cộng 10 điểm.`);
            setFormData({ bachThuLo: '', songThuLo: '', threeCL: '', cham: '' });
            setError('');
            setHasRegisteredToday({ ...hasRegisteredToday, [region]: true });
            setTimeout(() => setSuccess(''), 3000);
            if (onRegistrationSuccess) {
                onRegistrationSuccess();
            }
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Đã có lỗi khi đăng ký quay số';
            setError(errorMessage);
            alert(errorMessage);
        }
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

    if (status === 'loading') return null;

    return (
        <div className={styles.container}>
            <h3 className={styles.title}>Đăng ký quay số</h3>
            <p className={styles.time}><i class="fa-solid fa-clock"></i> Thời gian hiện tại: {currentTime}</p>
            {success && <p className={styles.success}>{success}</p>}
            {error && <p className={styles.error}>{error}</p>}
            {hasRegisteredToday[region] && (
                <p className={styles.warning}>Bạn đã đăng ký cho miền {region} hôm nay. Vui lòng thử lại vào ngày mai.</p>
            )}
            {session ? (
                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Miền</label>
                        <select
                            value={region}
                            onChange={(e) => setRegion(e.target.value)}
                            className={styles.select} // Thay đổi từ styles.input thành styles.select
                        >
                            <option value="Nam">Miền Nam</option>
                            <option value="Trung">Miền Trung</option>
                            <option value="Bac">Miền Bắc</option>
                        </select>
                        {!isRegistrationOpen[region] && (
                            <p className={styles.warning}>
                                Đăng ký miền {region} đóng lúc {region === 'Nam' ? '16:10' : region === 'Trung' ? '17:10' : '18:10'}.
                                Mở lại sau 18:40.
                            </p>
                        )}
                    </div>
                    {lotteryFields?.bachThuLo && (
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
                                disabled={!isRegistrationOpen[region] || hasRegisteredToday[region]}
                            />
                        </div>
                    )}
                    {lotteryFields?.songThuLo && (
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
                                disabled={!isRegistrationOpen[region] || hasRegisteredToday[region]}
                            />
                        </div>
                    )}
                    {lotteryFields?.threeCL && (
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
                                disabled={!isRegistrationOpen[region] || hasRegisteredToday[region]}
                            />
                        </div>
                    )}
                    {lotteryFields?.cham && (
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
                                disabled={!isRegistrationOpen[region] || hasRegisteredToday[region]}
                            />
                        </div>
                    )}
                    <button
                        type="submit"
                        className={styles.submitButton}
                        disabled={!isRegistrationOpen[region] || hasRegisteredToday[region]}
                    >
                        Đăng ký
                    </button>
                </form>
            ) : (
                <div className={styles.loginPrompt}>
                    <p>Vui lòng đăng nhập để đăng ký quay số.</p>
                    <button onClick={() => router.push('/login')} className={styles.loginButton}>
                        Đăng nhập
                    </button>
                </div>
            )}
        </div>
    );
}