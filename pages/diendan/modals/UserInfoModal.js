import { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import axios from 'axios';
import styles from '../../../styles/forumOptimized.module.css';
import { FaTimes, FaUser, FaCrown, FaCalendar, FaEnvelope, FaPhone } from 'react-icons/fa';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL3 || 'http://localhost:5001';

export default function UserInfoModal({ user, onClose, onOpenPrivateChat }) {
    const modalRef = useRef(null);
    const [userDetails, setUserDetails] = useState(user);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Hàm lấy thông tin chi tiết người dùng
    const fetchUserDetails = async (userId) => {
        try {
            setIsLoading(true);
            const res = await axios.get(`${API_BASE_URL}/api/users/${userId}`);
            if (res.data.user) {
                setUserDetails(res.data.user);
            }
        } catch (err) {
            console.error(`Error fetching user ${userId}: `, err.response?.data || err.message);
            setError(err.response?.data?.message || 'Đã có lỗi khi lấy thông tin người dùng');
        } finally {
            setIsLoading(false);
        }
    };

    // Gọi API để lấy thông tin chi tiết người dùng khi component mount
    useEffect(() => {
        if (user?._id) {
            fetchUserDetails(user._id);
        }
    }, [user?._id]);

    // Xử lý click ngoài modal để đóng
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const getInitials = (fullname) => {
        if (!fullname) return 'U';
        const nameParts = fullname.trim().split(' ');
        return nameParts[nameParts.length - 1].charAt(0).toUpperCase();
    };

    const formatDate = (date) => {
        if (!date) return 'Chưa cập nhật';
        return new Date(date).toLocaleDateString('vi-VN');
    };

    if (!user) return null;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalCompact} ref={modalRef}>
                {/* Modal Header */}
                <div className={styles.modalHeaderCompact}>
                    <h3 className={styles.modalTitleCompact}>Thông Tin Người Dùng</h3>
                    <button
                        className={styles.closeButtonCompact}
                        onClick={onClose}
                    >
                        <FaTimes />
                    </button>
                </div>

                {/* Modal Content */}
                <div className={styles.modalContentCompact}>
                    {isLoading && (
                        <div className={styles.loadingMessage}>
                            Đang tải thông tin...
                        </div>
                    )}

                    {error && (
                        <div className={styles.errorMessage}>
                            <FaTimes />
                            <span>{error}</span>
                        </div>
                    )}

                    {!isLoading && !error && userDetails && (
                        <>
                            {/* User Avatar */}
                            <div className={styles.modalAvatarCompact}>
                                {userDetails.avatar ? (
                                    <Image
                                        src={userDetails.avatar}
                                        alt={userDetails.fullname || 'Người dùng'}
                                        width={80}
                                        height={80}
                                        className={styles.modalAvatarCompactImage}
                                    />
                                ) : (
                                    <div className={styles.modalAvatarCompactInitials}>
                                        {getInitials(userDetails.fullname)}
                                    </div>
                                )}
                            </div>

                            {/* User Info */}
                            <div className={styles.userInfoCompact}>
                                <div className={styles.userNameCompact}>
                                    {userDetails.fullname || 'Người dùng ẩn danh'}
                                    {userDetails.role === 'admin' && (
                                        <span className={styles.adminBadge}>
                                            <FaCrown />
                                            Admin
                                        </span>
                                    )}
                                </div>

                                <div className={styles.userDetailsCompact}>
                                    <div className={styles.userDetailItem}>
                                        <FaUser />
                                        <span>Vai trò: {userDetails.role || 'USER'}</span>
                                    </div>

                                    {userDetails.email && (
                                        <div className={styles.userDetailItem}>
                                            <FaEnvelope />
                                            <span>Email: {userDetails.email}</span>
                                        </div>
                                    )}

                                    {userDetails.phone && (
                                        <div className={styles.userDetailItem}>
                                            <FaPhone />
                                            <span>Điện thoại: {userDetails.phone}</span>
                                        </div>
                                    )}

                                    <div className={styles.userDetailItem}>
                                        <FaCalendar />
                                        <span>Tham gia: {formatDate(userDetails.createdAt)}</span>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className={styles.modalActionsCompact}>
                                    <button
                                        className={styles.primaryButtonCompact}
                                        onClick={() => {
                                            onOpenPrivateChat();
                                            onClose();
                                        }}
                                    >
                                        <FaEnvelope />
                                        Chat riêng
                                    </button>

                                    <button
                                        className={styles.secondaryButtonCompact}
                                        onClick={onClose}
                                    >
                                        Đóng
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}