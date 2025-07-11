"use client";

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FaSearch, FaEdit, FaTrash, FaTrophy, FaTimes } from 'react-icons/fa';
import styles from '../../styles/quanlyUser.module.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL3 || 'http://localhost:5001';

export default function AdminUsers() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [users, setUsers] = useState([]);
    const [stats, setStats] = useState({ byPoints: [], byTitles: [], byLevel: [] });
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState('');
    const [editingUser, setEditingUser] = useState(null);
    const [editForm, setEditForm] = useState({ titles: [], level: 1, points: 0 });
    const [rewardingUser, setRewardingUser] = useState(null);
    const [rewardPoints, setRewardPoints] = useState(0);
    const [filterModal, setFilterModal] = useState(null);
    const [filteredUsers, setFilteredUsers] = useState([]);

    const fetchUsers = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/users`, {
                headers: {
                    Authorization: `Bearer ${session.accessToken}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'AdminUsers-Client',
                },
            });
            if (res.status === 401) {
                signOut({ redirect: false });
                router.push('/login?error=SessionExpired');
                alert("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
                return;
            }
            if (!res.ok) throw new Error('Không thể tải danh sách người dùng');
            const data = await res.json();
            setUsers(data);
        } catch (err) {
            setError(err.message);
            alert(err.message);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/users/stats`, {
                headers: {
                    Authorization: `Bearer ${session.accessToken}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'AdminUsers-Client',
                },
            });
            if (res.status === 401) {
                signOut({ redirect: false });
                router.push('/login?error=SessionExpired');
                alert("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
                return;
            }
            if (!res.ok) throw new Error('Không thể tải thống kê');
            const data = await res.json();
            setStats(data);
        } catch (err) {
            setError(err.message);
            alert(err.message);
        }
    };

    useEffect(() => {
        if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
            router.push('/?error=AccessDenied');
            return;
        }

        if (status === 'authenticated') {
            fetchUsers();
            fetchStats();
        }
    }, [status, session, router]);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) {
            fetchUsers();
            return;
        }
        try {
            const res = await fetch(`${API_BASE_URL}/api/users/search?query=${encodeURIComponent(searchQuery)}`, {
                headers: {
                    Authorization: `Bearer ${session.accessToken}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'AdminUsers-Client',
                },
            });
            if (res.status === 401) {
                signOut({ redirect: false });
                router.push('/login?error=SessionExpired');
                alert("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
                return;
            }
            if (!res.ok) throw new Error('Không thể tìm kiếm');
            const data = await res.json();
            setUsers(data);
        } catch (err) {
            setError(err.message);
            alert(err.message);
        }
    };

    const handleClearSearch = async () => {
        setSearchQuery('');
        try {
            const res = await fetch(`${API_BASE_URL}/api/users`, {
                headers: {
                    Authorization: `Bearer ${session.accessToken}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'AdminUsers-Client',
                },
            });
            if (res.status === 401) {
                signOut({ redirect: false });
                router.push('/login?error=SessionExpired');
                alert("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
                return;
            }
            if (!res.ok) throw new Error('Không thể tải danh sách người dùng');
            const data = await res.json();
            setUsers(data);
        } catch (err) {
            setError(err.message);
            alert(err.message);
        }
    };

    const handleDelete = async (userId) => {
        if (!confirm('Bạn có chắc muốn xóa người dùng này?')) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${session.accessToken}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'AdminUsers-Client',
                },
            });
            if (res.status === 401) {
                signOut({ redirect: false });
                router.push('/login?error=SessionExpired');
                alert("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
                return;
            }
            if (!res.ok) throw new Error('Không thể xóa người dùng');
            setUsers(users.filter(user => user._id !== userId));
            alert("Xóa người dùng thành công!");
            fetchStats();
        } catch (err) {
            setError(err.message);
            alert(err.message);
        }
    };

    const handleEdit = (user) => {
        setEditingUser(user);
        setEditForm({
            titles: user.titles || [],
            level: user.level || 1,
            points: user.points || 0,
        });
    };

    const handleSaveEdit = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/users/${editingUser._id}`, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${session.accessToken}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'AdminUsers-Client',
                },
                body: JSON.stringify(editForm),
            });
            if (res.status === 401) {
                signOut({ redirect: false });
                router.push('/login?error=SessionExpired');
                alert("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
                return;
            }
            if (!res.ok) throw new Error('Không thể cập nhật thông tin');
            const updatedUser = await res.json();
            setUsers(users.map(user => user._id === updatedUser.user._id ? updatedUser.user : user));
            setEditingUser(null);
            alert("Cập nhật thông tin người dùng thành công!");
            fetchStats();
        } catch (err) {
            setError(err.message);
            alert(err.message);
        }
    };

    const handleReward = (user) => {
        setRewardingUser(user);
        setRewardPoints(0);
    };

    const handleSaveReward = async () => {
        if (rewardPoints < 0) {
            alert("Số điểm không thể âm!");
            return;
        }
        try {
            const newPoints = (rewardingUser.points || 0) + parseInt(rewardPoints || 0);
            const res = await fetch(`${API_BASE_URL}/api/users/${rewardingUser._id}`, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${session.accessToken}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'AdminUsers-Client',
                },
                body: JSON.stringify({ points: newPoints }),
            });
            if (res.status === 401) {
                signOut({ redirect: false });
                router.push('/login?error=SessionExpired');
                alert("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
                return;
            }
            if (!res.ok) throw new Error('Không thể cập nhật số điểm');
            const updatedUser = await res.json();
            if (updatedUser.user) {
                setUsers(users.map(user => user._id === updatedUser.user._id ? updatedUser.user : user));
                setRewardingUser(null);
                setRewardPoints(0);
                alert(`Đã trao thưởng ${rewardPoints} điểm cho ${updatedUser.user.username}!`);
                fetchStats();
            } else {
                throw new Error('Dữ liệu người dùng không hợp lệ');
            }
        } catch (err) {
            setError(err.message);
            alert(err.message);
        }
    };

    const handleAddTitle = (title) => {
        if (!editForm.titles.includes(title)) {
            setEditForm({ ...editForm, titles: [...editForm.titles, title] });
        } else {
            setEditForm({ ...editForm, titles: editForm.titles.filter(t => t !== title) });
        }
    };

    const handleFilterUsers = async (type, value) => {
        try {
            let query = '';
            if (type === 'points') {
                const [min, max] = value.split('-');
                query = max === '5001+' ? `pointsMin=${min}` : `pointsMin=${min}&pointsMax=${max}`;
            } else if (type === 'level') {
                query = `level=${value}`;
            } else if (type === 'title') {
                query = `title=${encodeURIComponent(value)}`;
            }

            const res = await fetch(`${API_BASE_URL}/api/users/filter?${query}`, {
                headers: {
                    Authorization: `Bearer ${session.accessToken}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'AdminUsers-Client',
                },
            });
            if (res.status === 401) {
                signOut({ redirect: false });
                router.push('/login?error=SessionExpired');
                alert("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
                return;
            }
            if (!res.ok) throw new Error('Không thể tải danh sách người dùng');
            const data = await res.json();
            setFilteredUsers(data);
            setFilterModal({ type, value });
        } catch (err) {
            setError(err.message);
            alert(err.message);
        }
    };

    if (status === 'loading') return <div className={styles.loading}>Đang tải...</div>;
    if (status === 'unauthenticated') {
        router.push('/login');
        return null;
    }

    const availableTitles = ['Tân thủ', 'Học Giả', 'Chuyên Gia', 'Thần Số Học', 'Thần Chốt Số'];

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Quản lý người dùng</h1>
            {error && <p className={styles.error}>{error}</p>}

            {/* Tìm kiếm */}
            <form onSubmit={handleSearch} className={styles.searchForm} role="search">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm theo họ tên"
                    className={styles.searchInput}
                    aria-label="Tìm kiếm người dùng theo họ tên"
                />
                <button type="submit" className={styles.searchButton} aria-label="Tìm kiếm">
                    <FaSearch style={{ marginRight: '8px' }} /> Tìm kiếm
                </button>
                {searchQuery && (
                    <button
                        type="button"
                        onClick={handleClearSearch}
                        className={styles.clearSearchButton}
                        aria-label="Xóa tìm kiếm"
                    >
                        <FaTimes style={{ marginRight: '8px' }} /> Xóa tìm kiếm
                    </button>
                )}
            </form>

            {/* Thống kê */}
            <div className={styles.statsContainer}>
                <h2 className={styles.statsTitle}>Thống kê</h2>
                <div className={styles.statsGrid}>
                    <div>
                        <h3 className={styles.statsSubtitle}>Theo số điểm</h3>
                        {stats.byPoints.map((bucket, index) => (
                            <p
                                key={index}
                                className={styles.clickableStat}
                                onClick={() => handleFilterUsers('points', bucket._id === '5001+' ? '5000-5001+' : `${bucket._id}-${bucket._id + (bucket._id === 0 ? 500 : bucket._id === 500 ? 1000 : bucket._id === 1500 ? 1500 : 2000)}`)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => e.key === 'Enter' && handleFilterUsers('points', bucket._id === '5001+' ? '5000-5001+' : `${bucket._id}-${bucket._id + (bucket._id === 0 ? 500 : bucket._id === 500 ? 1000 : bucket._id === 1500 ? 1500 : 2000)}`)}
                                aria-label={`Lọc người dùng có ${bucket._id === '5001+' ? '5000+ điểm' : `${bucket._id} - ${bucket._id + (bucket._id === 0 ? 500 : bucket._id === 500 ? 1000 : bucket._id === 1500 ? 1500 : 2000)} điểm`}`}
                            >
                                {bucket._id === '5001+' ? '5000+ điểm' : `${bucket._id} - ${bucket._id + (bucket._id === 0 ? 500 : bucket._id === 500 ? 1000 : bucket._id === 1500 ? 1500 : 2000)} điểm`}: {bucket.count} người dùng
                            </p>
                        ))}
                    </div>
                    <div>
                        <h3 className={styles.statsSubtitle}>Theo danh hiệu</h3>
                        {stats.byTitles.map((title, index) => (
                            <p
                                key={index}
                                className={styles.clickableStat}
                                onClick={() => handleFilterUsers('title', title._id)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => e.key === 'Enter' && handleFilterUsers('title', title._id)}
                                aria-label={`Lọc người dùng có danh hiệu ${title._id}`}
                            >
                                {title._id}: {title.count} người dùng
                            </p>
                        ))}
                    </div>
                    <div>
                        <h3 className={styles.statsSubtitle}>Theo cấp độ</h3>
                        {stats.byLevel.map((level, index) => (
                            <p
                                key={index}
                                className={styles.clickableStat}
                                onClick={() => handleFilterUsers('level', level._id)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => e.key === 'Enter' && handleFilterUsers('level', level._id)}
                                aria-label={`Lọc người dùng cấp ${level._id}`}
                            >
                                Cấp {level._id}: {level.count} người dùng
                            </p>
                        ))}
                    </div>
                </div>
            </div>

            {/* Danh sách người dùng */}
            <table className={styles.table} role="grid">
                <thead>
                    <tr>
                        <th className={styles.th} scope="col">Tên đăng nhập</th>
                        <th className={styles.th} scope="col">Họ tên</th>
                        <th className={styles.th} scope="col">Email</th>
                        <th className={styles.th} scope="col">Số điện thoại</th>
                        <th className={styles.th} scope="col">Ảnh</th>
                        <th className={styles.th} scope="col">Danh hiệu</th>
                        <th className={styles.th} scope="col">Điểm</th>
                        <th className={styles.th} scope="col">Cấp độ</th>
                        <th className={styles.th} scope="col">Vai trò</th>
                        <th className={styles.th} scope="col">Ngày tạo</th>
                        <th className={styles.th} scope="col">Hành động</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map(user => (
                        <tr key={user._id}>
                            <td className={styles.td}>{user.username}</td>
                            <td className={styles.td}>{user.fullname}</td>
                            <td className={styles.td}>{user.email}</td>
                            <td className={styles.td}>{user.phoneNumber || 'N/A'}</td>
                            <td className={styles.td}>
                                {user.img ? <img src={user.img} alt={`Avatar của ${user.username}`} className={styles.avatar} /> : 'N/A'}
                            </td>
                            <td className={styles.td}>{user.titles?.join(', ') || 'N/A'}</td>
                            <td className={styles.td}>{user.points}</td>
                            <td className={styles.td}>{user.level}</td>
                            <td className={styles.td}>{user.role}</td>
                            <td className={styles.td}>{new Date(user.createdAt).toLocaleDateString('vi-VN')}</td>
                            <td className={styles.td}>
                                <button
                                    onClick={() => handleEdit(user)}
                                    className={styles.editButton}
                                    aria-label={`Chỉnh sửa thông tin người dùng ${user.username}`}
                                >
                                    <FaEdit style={{ marginRight: '8px' }} /> Sửa
                                </button>
                                <button
                                    onClick={() => handleDelete(user._id)}
                                    className={styles.deleteButton}
                                    aria-label={`Xóa người dùng ${user.username}`}
                                >
                                    <FaTrash style={{ marginRight: '8px' }} /> Xóa
                                </button>
                                <button
                                    onClick={() => handleReward(user)}
                                    className={styles.rewardButton}
                                    aria-label={`Trao thưởng cho người dùng ${user.username}`}
                                >
                                    <FaTrophy style={{ marginRight: '8px' }} /> Trao thưởng
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Form chỉnh sửa */}
            {editingUser && (
                <div className={styles.modalOverlay} role="dialog" aria-labelledby="editModalTitle">
                    <div className={styles.modal}>
                        <h2 id="editModalTitle" className={styles.modalTitle}>
                            Chỉnh sửa người dùng: {editingUser.username}
                        </h2>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Danh hiệu</label>
                            {availableTitles.map(title => (
                                <label key={title} className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        checked={editForm.titles.includes(title)}
                                        onChange={() => handleAddTitle(title)}
                                        aria-label={`Chọn danh hiệu ${title}`}
                                    />
                                    <span className={styles.checkboxText}>{title}</span>
                                </label>
                            ))}
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel} htmlFor="editLevel">Cấp độ</label>
                            <input
                                id="editLevel"
                                type="number"
                                value={editForm.level}
                                onChange={(e) => setEditForm({ ...editForm, level: parseInt(e.target.value) })}
                                className={styles.input}
                                min="1"
                                aria-label="Cấp độ người dùng"
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel} htmlFor="editPoints">Số điểm</label>
                            <input
                                id="editPoints"
                                type="number"
                                value={editForm.points}
                                onChange={(e) => setEditForm({ ...editForm, points: parseInt(e.target.value) })}
                                className={styles.input}
                                min="0"
                                aria-label="Số điểm người dùng"
                            />
                        </div>
                        <div className={styles.buttonGroup}>
                            <button
                                onClick={() => setEditingUser(null)}
                                className={styles.cancelButton}
                                aria-label="Hủy chỉnh sửa"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                className={styles.saveButton}
                                aria-label="Lưu chỉnh sửa"
                            >
                                Lưu
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Form trao thưởng */}
            {rewardingUser && (
                <div className={styles.modalOverlay} role="dialog" aria-labelledby="rewardModalTitle">
                    <div className={styles.modal}>
                        <h2 id="rewardModalTitle" className={styles.modalTitle}>
                            Trao thưởng cho: {rewardingUser.username}
                        </h2>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>
                                Số điểm hiện tại: {rewardingUser.points}
                            </label>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel} htmlFor="rewardPoints">
                                Số điểm cần cộng thêm
                            </label>
                            <input
                                id="rewardPoints"
                                type="number"
                                value={rewardPoints}
                                onChange={(e) => setRewardPoints(parseInt(e.target.value) || 0)}
                                className={styles.input}
                                min="0"
                                placeholder="Nhập số điểm cần cộng"
                                aria-label="Số điểm cần cộng thêm"
                            />
                        </div>
                        <div className={styles.buttonGroup}>
                            <button
                                onClick={() => {
                                    setRewardingUser(null);
                                    setRewardPoints(0);
                                }}
                                className={styles.cancelButton}
                                aria-label="Hủy trao thưởng"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleSaveReward}
                                className={styles.saveButton}
                                aria-label="Lưu trao thưởng"
                            >
                                Lưu
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal hiển thị danh sách người dùng được lọc */}
            {filterModal && (
                <div className={styles.modalOverlay} role="dialog" aria-labelledby="filterModalTitle">
                    <div className={styles.modal}>
                        <h2 id="filterModalTitle" className={styles.modalTitle}>
                            {filterModal.type === 'points' ? `Người dùng có điểm ${filterModal.value}` :
                                filterModal.type === 'level' ? `Người dùng cấp ${filterModal.value}` :
                                    `Người dùng có danh hiệu ${filterModal.value}`}
                        </h2>
                        <table className={styles.table} role="grid">
                            <thead>
                                <tr>
                                    <th className={styles.th} scope="col">Tên đăng nhập</th>
                                    <th className={styles.th} scope="col">Họ tên</th>
                                    <th className={styles.th} scope="col">Điểm</th>
                                    <th className={styles.th} scope="col">Cấp độ</th>
                                    <th className={styles.th} scope="col">Danh hiệu</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map(user => (
                                    <tr key={user._id}>
                                        <td className={styles.td}>{user.username}</td>
                                        <td className={styles.td}>{user.fullname}</td>
                                        <td className={styles.td}>{user.points}</td>
                                        <td className={styles.td}>{user.level}</td>
                                        <td className={styles.td}>{user.titles?.join(', ') || 'N/A'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className={styles.buttonGroup}>
                            <button
                                onClick={() => setFilterModal(null)}
                                className={styles.cancelButton}
                                aria-label="Đóng danh sách người dùng được lọc"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}