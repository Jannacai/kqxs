"use client";

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import styles from '../../styles/adminPostEvent.module.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export default function AdminPostEvent() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [type, setType] = useState('event');
    const [formData, setFormData] = useState({
        title: '',
        content: ''
    });
    const [lotteryFields, setLotteryFields] = useState({
        bachThuLo: false,
        songThuLo: false,
        threeCL: false,
        cham: false
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

    if (status === 'authenticated' && session.user.role !== 'ADMIN') {
        return <div className={styles.error}>Chỉ admin mới có quyền truy cập</div>;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title.trim() || !formData.content.trim()) {
            setError('Tiêu đề và nội dung là bắt buộc');
            return;
        }
        try {
            const res = await axios.post(
                `${API_BASE_URL}/api/events`,
                { ...formData, type, lotteryFields },
                { headers: { Authorization: `Bearer ${session?.accessToken}` } }
            );
            setSuccess('Đăng thành công!');
            setFormData({ title: '', content: '' });
            setLotteryFields({ bachThuLo: false, songThuLo: false, threeCL: false, cham: false });
            setError('');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Đã có lỗi khi đăng');
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

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Đăng sự kiện / Tin hot</h1>
            {success && <p className={styles.success}>{success}</p>}
            {error && <p className={styles.error}>{error}</p>}
            <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Loại</label>
                    <select
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        className={styles.input}
                    >
                        <option value="event">Sự kiện</option>
                        <option value="hot_news">Tin hot</option>
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
                    </div>
                </div>
                <button type="submit" className={styles.submitButton}>
                    Đăng
                </button>
            </form>
        </div>
    );
}