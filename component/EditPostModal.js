"use client";

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import moment from 'moment';
import 'moment-timezone';
import styles from '../styles/editPostModal.module.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL3 || 'http://localhost:5001';

export default function EditPostModal({ item, onClose, onSuccess }) {
    const { data: session } = useSession();
    const [formData, setFormData] = useState({
        title: item.title || '',
        content: item.content || '',
        startTime: item.startTime ? moment(item.startTime).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DDTHH:mm') : '',
        endTime: item.endTime ? moment(item.endTime).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DDTHH:mm') : '',
        rules: item.rules || '',
        rewards: item.rewards || '',
        scoringMethod: item.scoringMethod || '',
        notes: item.notes || ''
    });
    const [lotteryFields, setLotteryFields] = useState({
        bachThuLo: item.lotteryFields?.bachThuLo || false,
        songThuLo: item.lotteryFields?.songThuLo || false,
        threeCL: item.lotteryFields?.threeCL || false,
        cham: item.lotteryFields?.cham || false
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const modalRef = useRef(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title.trim() || !formData.content.trim()) {
            setError('Tiêu đề và nội dung là bắt buộc');
            alert('Tiêu đề và nội dung là bắt buộc');
            return;
        }
        if (item.type !== 'discussion' && formData.startTime && formData.endTime && moment(formData.endTime).isBefore(formData.startTime)) {
            setError('Thời gian kết thúc phải sau thời gian bắt đầu');
            alert('Thời gian kết thúc phải sau thời gian bắt đầu');
            return;
        }
        try {
            const payload = {
                title: formData.title,
                content: formData.content,
                type: item.type,
                ...(item.type !== 'discussion' && {
                    lotteryFields,
                    startTime: formData.startTime ? moment(formData.startTime).tz('Asia/Ho_Chi_Minh').toISOString() : undefined,
                    endTime: formData.endTime ? moment(formData.endTime).tz('Asia/Ho_Chi_Minh').toISOString() : undefined,
                    rules: formData.rules.trim() || undefined,
                    rewards: formData.rewards.trim() || undefined,
                    scoringMethod: formData.scoringMethod.trim() || undefined,
                    notes: formData.notes.trim() || undefined
                })
            };
            await axios.put(
                `${API_BASE_URL}/api/events/${item._id}`,
                payload,
                { headers: { Authorization: `Bearer ${session?.accessToken}` } }
            );
            setSuccess(`Cập nhật thành công lúc ${moment().tz('Asia/Ho_Chi_Minh').format('HH:mm:ss DD/MM/YYYY')} !`);
            alert(`Cập nhật thành công lúc ${moment().tz('Asia/Ho_Chi_Minh').format('HH:mm:ss DD/MM/YYYY')} !`);
            setError('');
            setTimeout(() => {
                setSuccess('');
                onSuccess();
                onClose();
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.message || 'Đã có lỗi khi cập nhật');
            alert(err.response?.data?.message || 'Đã có lỗi khi cập nhật');
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

    const handleOverlayClick = (e) => {
        if (modalRef.current && !modalRef.current.contains(e.target)) {
            onClose();
        }
    };

    useEffect(() => {
        document.addEventListener('mousedown', handleOverlayClick);
        return () => {
            document.removeEventListener('mousedown', handleOverlayClick);
        };
    }, []);

    return (
        <div className={styles.modalOverlay} onClick={handleOverlayClick}>
            <div className={styles.modal} ref={modalRef}>
                <h2 className={styles.modalTitle}>Chỉnh sửa {item.type === 'event' ? 'Sự kiện' : item.type === 'hot_news' ? 'Tin hot' : 'Thảo luận'}</h2>
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
                    {item.type !== 'discussion' && (
                        <>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Thời gian bắt đầu</label>
                                <input
                                    type="datetime-local"
                                    name="startTime"
                                    value={formData.startTime}
                                    onChange={handleInputChange}
                                    className={styles.input}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Thời gian kết thúc</label>
                                <input
                                    type="datetime-local"
                                    name="endTime"
                                    value={formData.endTime}
                                    onChange={handleInputChange}
                                    className={styles.input}
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
                                </div>
                            </div>
                        </>
                    )}
                    <div className={styles.modalActions}>
                        <button type="submit" className={styles.submitButton}>
                            <i className="fa-solid fa-save"></i> Lưu
                        </button>
                        <button type="button" className={styles.cancelButton} onClick={onClose}>
                            Hủy
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}