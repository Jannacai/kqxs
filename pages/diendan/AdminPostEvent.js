"use client";

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import moment from 'moment';
import 'moment-timezone';
import styles from '../../styles/postEvent.module.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL3 || 'http://localhost:5001';

export default function PostEvent() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [type, setType] = useState('event');
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        startTime: '',
        endTime: '',
        rules: '',
        rewards: '',
        scoringMethod: '',
        notes: ''
    });
    const [lotteryFields, setLotteryFields] = useState({
        bachThuLo: false,
        songThuLo: false,
        threeCL: false,
        cham: false,
        danDe: false,
        danDeType: '1x' // Giá trị mặc định cho select box
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    if (status === 'loading') {
        return <div className={styles.loading}>Đang tải...</div>;
    }

    if (status === 'unauthenticated') {
        return (
            <div className={styles.container}>
                <p className={styles.error}>Vui lòng đăng nhập để tiếp tục.</p>
                <button className={styles.loginButton} onClick={() => router.push('/login')}>
                    Đăng nhập
                </button>
            </div>
        );
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title.trim() || !formData.content.trim()) {
            setError('Tiêu đề và nội dung là bắt buộc');
            alert('Tiêu đề và nội dung là bắt buộc');
            return;
        }
        if (type !== 'discussion' && !formData.endTime) {
            setError('Thời gian kết thúc là bắt buộc cho sự kiện hoặc tin hot');
            alert('Thời gian kết thúc là bắt buộc cho sự kiện hoặc tin hot');
            return;
        }
        if (type !== 'discussion' && formData.startTime && formData.endTime && moment(formData.endTime).isBefore(formData.startTime)) {
            setError('Thời gian kết thúc phải sau thời gian bắt đầu');
            alert('Thời gian kết thúc phải sau thời gian bắt đầu');
            return;
        }
        try {
            const payload = {
                title: formData.title,
                content: formData.content,
                type,
                ...(type !== 'discussion' && {
                    lotteryFields: {
                        bachThuLo: lotteryFields.bachThuLo,
                        songThuLo: lotteryFields.songThuLo,
                        threeCL: lotteryFields.threeCL,
                        cham: lotteryFields.cham,
                        danDe: lotteryFields.danDe,
                        ...(lotteryFields.danDe && { danDeType: lotteryFields.danDeType })
                    },
                    startTime: formData.startTime ? moment(formData.startTime).tz('Asia/Ho_Chi_Minh').toISOString() : moment().tz('Asia/Ho_Chi_Minh').toISOString(),
                    endTime: formData.endTime ? moment(formData.endTime).tz('Asia/Ho_Chi_Minh').toISOString() : undefined,
                    rules: formData.rules.trim() || undefined,
                    rewards: formData.rewards.trim() || undefined,
                    scoringMethod: formData.scoringMethod.trim() || undefined,
                    notes: formData.notes.trim() || undefined
                })
            };
            const res = await axios.post(
                `${API_BASE_URL}/api/events`,
                payload,
                { headers: { Authorization: `Bearer ${session?.accessToken}` } }
            );
            setSuccess(`Đăng thành công lúc ${moment().tz('Asia/Ho_Chi_Minh').format('HH:mm:ss DD/MM/YYYY')} !`);
            alert(`Đăng thành công lúc ${moment().tz('Asia/Ho_Chi_Minh').format('HH:mm:ss DD/MM/YYYY')} !`);
            setFormData({
                title: '',
                content: '',
                startTime: '',
                endTime: '',
                rules: '',
                rewards: '',
                scoringMethod: '',
                notes: ''
            });
            setLotteryFields({
                bachThuLo: false,
                songThuLo: false,
                threeCL: false,
                cham: false,
                danDe: false,
                danDeType: '1x'
            });
            setError('');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Đã có lỗi khi đăng');
            alert(err.response?.data?.message || 'Đã có lỗi khi đăng');
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        setError('');
    };

    const handleCheckboxChange = (e) => {
        const { name, checked } = e.target;
        setLotteryFields({ ...lotteryFields, [name]: checked });
    };

    const handleDanDeTypeChange = (e) => {
        setLotteryFields({ ...lotteryFields, danDeType: e.target.value });
    };

    // Danh sách tùy chọn loại bài đăng
    const typeOptions = [
        { value: 'event', label: 'Sự kiện', adminOnly: true },
        { value: 'hot_news', label: 'Tin hot', adminOnly: true },
        { value: 'discussion', label: 'Thảo luận', adminOnly: false }
    ].filter(option => !option.adminOnly || session?.user?.role === 'ADMIN');

    // Danh sách tùy chọn cho dàn đề
    const danDeOptions = ['1x', '2x', '3x', '4x', '5x', '6x'];

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Đăng bài</h1>
            {success && <p className={styles.success}>{success}</p>}
            {error && <p className={styles.error}>{error}</p>}
            <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Loại</label>
                    <select
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        className={styles.select}
                    >
                        {typeOptions.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Tiêu đề</label>
                    <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        placeholder="Nhập tiêu đề"
                        className={styles.input}
                        maxLength={100}
                    />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Nội dung</label>
                    <textarea
                        name="content"
                        value={formData.content}
                        onChange={handleInputChange}
                        placeholder="Nhập nội dung"
                        className={styles.textarea}
                    />
                </div>
                {type !== 'discussion' && (
                    <>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Thời gian bắt đầu (tùy chọn)</label>
                            <input
                                type="datetime-local"
                                name="startTime"
                                value={formData.startTime}
                                onChange={handleInputChange}
                                className={styles.input}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Thời gian kết thúc (bắt buộc)</label>
                            <input
                                type="datetime-local"
                                name="endTime"
                                value={formData.endTime}
                                onChange={handleInputChange}
                                className={styles.input}
                                required
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Quy định</label>
                            <textarea
                                name="rules"
                                value={formData.rules}
                                onChange={handleInputChange}
                                placeholder="Nhập quy định của sự kiện"
                                className={styles.textarea}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Phần thưởng</label>
                            <textarea
                                name="rewards"
                                value={formData.rewards}
                                onChange={handleInputChange}
                                placeholder="Nhập thông tin phần thưởng"
                                className={styles.textarea}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Cách tính điểm</label>
                            <textarea
                                name="scoringMethod"
                                value={formData.scoringMethod}
                                onChange={handleInputChange}
                                placeholder="Nhập cách tính điểm"
                                className={styles.textarea}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Lưu ý</label>
                            <textarea
                                name="notes"
                                value={formData.notes}
                                onChange={handleInputChange}
                                placeholder="Nhập các lưu ý"
                                className={styles.textarea}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Cho phép đăng ký quay số</label>
                            <div className={styles.checkboxGroup}>
                                <label>
                                    <input
                                        type="checkbox"
                                        name="bachThuLo"
                                        checked={lotteryFields.bachThuLo}
                                        onChange={handleCheckboxChange}
                                    />
                                    Bạch thủ lô
                                </label>
                                <label>
                                    <input
                                        type="checkbox"
                                        name="songThuLo"
                                        checked={lotteryFields.songThuLo}
                                        onChange={handleCheckboxChange}
                                    />
                                    Song thủ lô
                                </label>
                                <label>
                                    <input
                                        type="checkbox"
                                        name="threeCL"
                                        checked={lotteryFields.threeCL}
                                        onChange={handleCheckboxChange}
                                    />
                                    3CL
                                </label>
                                <label>
                                    <input
                                        type="checkbox"
                                        name="cham"
                                        checked={lotteryFields.cham}
                                        onChange={handleCheckboxChange}
                                    />
                                    Chạm
                                </label>
                                <label>
                                    <input
                                        type="checkbox"
                                        name="danDe"
                                        checked={lotteryFields.danDe}
                                        onChange={handleCheckboxChange}
                                    />
                                    Dàn đề
                                </label>
                                {lotteryFields.danDe && (
                                    <select
                                        name="danDeType"
                                        value={lotteryFields.danDeType}
                                        onChange={handleDanDeTypeChange}
                                        className={styles.select}
                                    >
                                        {danDeOptions.map(option => (
                                            <option key={option} value={option}>
                                                {option}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        </div>
                    </>
                )}
                <button type="submit" className={styles.submitButton}>
                    <i className="fa-solid fa-paper-plane"></i> Đăng
                </button>
            </form>
        </div>
    );
}