import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState, useRef } from 'react';
import styles from '../styles/userAvatar.module.css';

const UserAvatar = () => {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [userInfo, setUserInfo] = useState(null);
    const [fetchError, setFetchError] = useState(null);
    const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);
    const submenuRef = useRef(null);

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

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (submenuRef.current && !submenuRef.current.contains(event.target)) {
                setIsSubmenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
            await signOut({ redirect: false });
            router.push('/login');
        }
        setIsSubmenuOpen(false);
    };

    const getDisplayName = (fullname) => {
        if (!fullname) return 'User';
        const nameParts = fullname.trim().split(' ');
        return nameParts[nameParts.length - 1];
    };

    const getInitials = (fullname) => {
        if (!fullname) return 'U';
        const nameParts = fullname.trim().split(' ');
        return nameParts[nameParts.length - 1].charAt(0).toUpperCase();
    };

    const getRoleColorClass = (role) => {
        return role?.toLowerCase() === 'admin' ? styles.admin : styles.user;
    };

    if (status === "unauthenticated") {
        return null;
    }

    return (
        <div className={styles.userInfo} ref={submenuRef}>
            {fetchError ? (
                <p className={styles.error}>Không thể lấy thông tin: {fetchError}</p>
            ) : userInfo ? (
                <>
                    <div
                        className={`${styles.avatar} ${getRoleColorClass(userInfo.role)}`}
                        onClick={() => setIsSubmenuOpen(!isSubmenuOpen)}
                    >
                        {getInitials(userInfo.fullname)}
                    </div>
                    <div className={styles.info}>
                        <span
                            className={styles.username}
                            onClick={() => setIsSubmenuOpen(!isSubmenuOpen)}
                        >
                            {getDisplayName(userInfo.fullname)}
                        </span>
                        <span className={`${styles.role} ${getRoleColorClass(userInfo.role)}`}>
                            {userInfo.role}
                        </span>
                    </div>
                    {isSubmenuOpen && (
                        <div className={styles.submenu}>
                            <span className={styles.fullname}>{userInfo.fullname}</span>
                            <button onClick={handleLogout} className={styles.logoutButton}>
                                Đăng xuất
                            </button>
                        </div>
                    )}
                </>
            ) : (
                " "
            )}
        </div>
    );
};

export default UserAvatar;