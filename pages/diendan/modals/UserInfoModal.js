import { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import axios from 'axios';
import styles from '../../../styles/modalUser.module.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL3 || 'http://localhost:5001';

export default function UserInfoModal({ selectedUser, setSelectedUser, setShowModal, openPrivateChat, getAvatarClass, accessToken }) {
    const modalRef = useRef(null);
    const [userDetails, setUserDetails] = useState(selectedUser);
    const [error, setError] = useState('');

    // Hàm lấy thông tin chi tiết người dùng
    const fetchUserDetails = async (userId) => {
        try {
            const headers = {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
            };
            const res = await axios.get(`${API_BASE_URL}/api/users/${userId}`, {
                headers,
            });
            return res.data;
        } catch (err) {
            console.error(`Error fetching user ${userId}: `, err.response?.data || err.message);
            setError(err.response?.data?.message || 'Đã có lỗi khi lấy thông tin người dùng');
            return null;
        }
    };

    // Gọi API để lấy thông tin chi tiết người dùng khi component mount
    useEffect(() => {
        if (selectedUser?._id) {
            fetchUserDetails(selectedUser._id).then((data) => {
                if (data) {
                    setUserDetails(data);
                }
            });
        }
    }, [selectedUser?._id]);

    // Xử lý click ngoài modal để đóng
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                setShowModal(false);
                setSelectedUser(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [setShowModal, setSelectedUser]);

    // Đảm bảo userDetails tồn tại trước khi render
    if (!userDetails) return null;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modal} ref={modalRef}>
                <button
                    className={styles.cancelButton}
                    onClick={() => {
                        setShowModal(false);
                        setSelectedUser(null);
                    }}
                >
                    X
                </button>
                <h2 className={styles.modalTitle}>Thông tin người dùng</h2>
                {error && <p className={styles.error}>{error}</p>}
                {userDetails.img ? (
                    <Image
                        src={userDetails.img}
                        alt={userDetails.fullname || 'Người dùng ẩn danh'}
                        className={styles.modalAvatar}
                        width={96}
                        height={96}
                        onError={(e) => {
                            console.error('Failed to load modal avatar:', userDetails.img);
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                        }}
                    />
                ) : (
                    <div
                        className={`${styles.avatar} ${getAvatarClass(userDetails.fullname || 'Người dùng ẩn danh')} `}
                        style={{ display: userDetails.img ? 'none' : 'flex' }}
                    >
                        {(userDetails.fullname?.[0]?.toUpperCase()) || '?'}
                    </div>
                )}
                <table className={styles.table}>
                    <tbody>
                        <tr>
                            <td><strong>Tên:</strong></td>
                            <td>{userDetails.fullname || 'Người dùng ẩn danh'}</td>
                        </tr>
                        <tr>
                            <td><strong>Vai trò:</strong></td>
                            <td>{userDetails.role || 'USER'}</td>
                        </tr>
                        <tr>
                            <td><strong>Danh hiệu:</strong></td>
                            <td>{userDetails.titles?.length > 0 ? userDetails.titles.join(', ') : 'Chưa có danh hiệu'}</td>
                        </tr>
                        <tr>
                            <td><strong>Cấp độ:</strong></td>
                            <td>{userDetails.level || 1}</td>
                        </tr>
                        <tr>
                            <td><strong>Số điểm:</strong></td>
                            <td>{userDetails.points || 0}</td>
                        </tr>
                        <tr>
                            <td><strong>Số lần trúng:</strong></td>
                            <td>{userDetails.winCount || 0}</td>
                        </tr>
                    </tbody>
                </table>
                <div className={styles.modalButtons}>
                    <button
                        className={styles.chatButton}
                        onClick={() => openPrivateChat(userDetails)}
                    >
                        Chat riêng
                    </button>
                    {/* <button
                        className={styles.chatButton}
                        onClick={() => openPrivateChat(userDetails)}
                    >
                        Chat riêng
                    </button> */}
                </div>
            </div>
        </div>
    );
}