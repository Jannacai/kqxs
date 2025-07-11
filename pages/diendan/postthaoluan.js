
"use client";

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import moment from 'moment';
import 'moment-timezone';
import styles from '../../styles/postEvent.module.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL3 || 'http://localhost:5001';

export default function PostDiscussion() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [formData, setFormData] = useState({
        title: '',
        content: ''
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
        try {
            const payload = {
                title: formData.title,
                content: formData.content,
                type: 'discussion'
            };
            const res = await axios.post(
                `${API_BASE_URL}/api/events`,
                payload,
                { headers: { Authorization: `Bearer ${session?.accessToken} ` } }
            );
            setSuccess(`Đăng thành công lúc ${moment().tz('Asia/Ho_Chi_Minh').format('HH:mm:ss DD/MM/YYYY')} !`);
            alert(`Đăng thành công lúc ${moment().tz('Asia/Ho_Chi_Minh').format('HH:mm:ss DD/MM/YYYY')} !`);
            setFormData({ title: '', content: '' });
            setError('');
            setTimeout(() => {
                setSuccess('');
                router.push('/diendan');
            }, 2000);
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

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Đăng bài thảo luận</h1>
            {success && <p className={styles.success}>{success}</p>}
            {error && <p className={styles.error}>{error}</p>}
            <form onSubmit={handleSubmit} className={styles.form}>
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
                <button type="submit" className={styles.submitButton}>
                    <i className="fa-solid fa-paper-plane"></i> Đăng
                </button>
            </form>
        </div>
    );
}
