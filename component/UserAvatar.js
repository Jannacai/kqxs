// components/UserAvatar.js
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import styles from '../styles/UserAvatar.module.css';

const UserAvatar = () => {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [userInfo, setUserInfo] = useState(null);
    const [fetchError, setFetchError] = useState(null);

    useEffect(() => {
        const fetchUserInfo = async () => {
            if (!session?.accessToken) {
                setFetchError('No access token available');
                return;
            }

            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/me`, {
                    headers: {
                        Authorization: `Bearer ${session.accessToken}`,
                    },
                });

                if (!res.ok) {
                    const errorText = await res.text();
                    throw new Error(`Failed to fetch user info: ${res.status} - ${errorText}`);
                }

                const data = await res.json();
                setUserInfo(data);
            } catch (error) {
                console.error('Error fetching user info:', error);
                setFetchError(error.message);
            }
        };

        if (status === "authenticated") {
            fetchUserInfo();
        }
    }, [status, session]);

    const handleLogout = async () => {
        if (!session?.refreshToken) {
            await signOut({ redirect: false });
            router.push('/login');
            return;
        }

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/logout`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ refreshToken: session.refreshToken }),
            });

            if (!res.ok) {
                throw new Error('Failed to logout on server');
            }

            await signOut({ redirect: false });
            router.push('/login');
            setUserInfo(null);
            setFetchError(null);
        } catch (error) {
            console.error('Logout error:', error.message);
            await signOut({ redirect: false }); // Vẫn đăng xuất client nếu server lỗi
            router.push('/login');
        }
    };

    const getInitials = (username) => {
        return username ? username.charAt(0).toUpperCase() : 'U';
    };

    if (status === "unauthenticated") {
        return null; // Không hiển thị avatar nếu chưa đăng nhập
    }

    return (
        <div className={styles.userInfo}>
            {fetchError ? (
                <p className={styles.error}>Không thể lấy thông tin: {fetchError}</p>
            ) : userInfo ? (
                <>
                    <div className={styles.avatar}>
                        {getInitials(userInfo.fullname)}
                    </div>
                    <div className={styles.info}>
                        <span className={styles.username}>{userInfo.fullname}</span>
                        <span className={styles.username}>{userInfo.role}</span>
                    </div>
                    <button onClick={handleLogout} className={styles.logoutButton}>
                        Đăng xuất
                    </button>
                </>
            ) : (
                <p>Đang tải...</p>
            )}
        </div>
    );
};

export default UserAvatar;