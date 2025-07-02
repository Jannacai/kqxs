"use client";

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import moment from 'moment';
import 'moment-timezone';
import axios from 'axios';
import styles from '../../styles/lotteryRegistration.module.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export default function LotteryRegistration() {
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

    // Kiểm tra thời gian đăng ký
    const checkRegistrationTime = () => {
        const now = moment().tz('Asia/Ho_Chi_Minh');
        setCurrentTime(now.format('HH:mm:ss'));
        const currentTimeInMinutes = now.hours() * 60 + now.minutes();

        const timeLimits = {
            Nam: 16 * 60 + 10, // 16:10
            Trung: 17 * 60 + 10, // 17:10
            Bac: 18 * 60 + 10, // 18:10
            reset: 18 * 60 + 40 // 18:40
        };

        setIsRegistrationOpen({
            Nam: currentTimeInMinutes > timeLimits.reset || currentTimeInMinutes < timeLimits.Nam,
            Trung: currentTimeInMinutes > timeLimits.reset || currentTimeInMinutes < timeLimits.Trung,
            Bac: currentTimeInMinutes > timeLimits.reset || currentTimeInMinutes < timeLimits.Bac
        });
    };

    // Kiểm tra số lần đăng ký hôm nay
    const checkRegistrationLimit = async () => {
        if (!session?.user?.id) return;

        try {
            const todayStart = moment().tz('Asia/Ho_Chi_Minh').startOf('day').toDate();
            const todayEnd = moment().tz('Asia/Ho_Chi_Minh').endOf('day').toDate();

            const res = await axios.get(`${API_BASE_URL}/api/lottery/check-limit`, {
                headers: {
                    Authorization: `Bearer ${session.accessToken}`,
                    'Content-Type': 'application/json',
                    // 'User-Agent': 'LotteryRegistration-Client'
                },
                params: {
                    userId: session.user.id,
                    startDate: todayStart.toISOString(),
                    endDate: todayEnd.toISOString()
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
    }, [status, session]);

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
            alert(`Đăng ký miền ${region} đã đóng. Vui lòng thử lại sau 18:40.`);
            return;
        }

        if (hasRegisteredToday[region]) {
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
                region,
                numbers: {
                    bachThuLo: formData.bachThuLo || null,
                    songThuLo: formData.songThuLo ? formData.songThuLo.split(',') : [],
                    threeCL: formData.threeCL || null,
                    cham: formData.cham || null
                }
            };

            console.log('Submitting registration:', payload);
            const res = await axios.post(`${API_BASE_URL}/api/lottery/register`, payload, {
                headers: {
                    Authorization: `Bearer ${session?.accessToken}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'LotteryRegistration-Client'
                }
            });

            if (res.status === 401) {
                signOut({ redirect: false });
                router.push('/login?error=SessionExpired');
                alert('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
                return;
            }

            if (res.status !== 200) {
                throw new Error(res.data.message || 'Không thể đăng ký');
            }

            alert(`Đăng ký thành công cho miền ${region} lúc ${moment().tz('Asia/Ho_Chi_Minh').format('HH:mm:ss DD/MM/YYYY')}! Bạn được cộng 10 điểm.`);
            setFormData({ bachThuLo: '', songThuLo: '', threeCL: '', cham: '' });
            setError('');
            setHasRegisteredToday({ ...hasRegisteredToday, [region]: true });
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || 'Đã có lỗi xảy ra';
            console.error('Registration error:', errorMessage);
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

    if (status === 'loading') return <div className={styles.loading}>Đang tải...</div>;

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Đăng ký quay số 3 miền</h1>
            <p className={styles.time}>Thời gian hiện tại: {currentTime}</p>
            {error && <p className={styles.error}>{error}</p>}
            {hasRegisteredToday[region] && (
                <p className={styles.warning}>Bạn đã đăng ký cho miền {region} hôm nay. Vui lòng thử lại vào ngày mai.</p>
            )}

            <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Miền</label>
                    <select
                        value={region}
                        onChange={(e) => setRegion(e.target.value)}
                        className={styles.input}
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

                <div className={styles.buttonGroup}>
                    <button
                        type="submit"
                        className={styles.submitButton}
                        disabled={!isRegistrationOpen[region] || hasRegisteredToday[region]}
                    >
                        Đăng ký
                    </button>
                </div>
            </form>
        </div>
    );
}