"use client";

import { useEffect, useState } from 'react';
import styles from '../../styles/facebookMobile.module.css';
import {
    FaHome,
    FaUsers,
    FaTrophy,
    FaBell,
    FaUser,
    FaSearch,
    FaEllipsisH,
    FaThumbsUp,
    FaComment,
    FaShare
} from 'react-icons/fa';

export default function FacebookMobileLayout({ children }) {
    const [isMobile, setIsMobile] = useState(false);
    const [activeTab, setActiveTab] = useState('home');

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => {
            window.removeEventListener('resize', checkMobile);
        };
    }, []);

    // Facebook-style mobile layout
    if (isMobile) {
        return (
            <div className={styles.fbMobileContainer}>
                {/* Facebook-style Header */}
                <header className={styles.fbMobileHeader}>
                    <div className={styles.fbMobileHeaderTitle}>
                        Diễn Đàn Xổ Số
                    </div>
                    <div className={styles.fbMobileHeaderActions}>
                        <button className={styles.fbMobileHeaderButton}>
                            <FaSearch />
                        </button>
                        <button className={styles.fbMobileHeaderButton}>
                            <FaEllipsisH />
                        </button>
                    </div>
                </header>

                {/* Facebook-style Content */}
                <main className={styles.fbMobileContent}>
                    {children}
                </main>

                {/* Facebook-style Bottom Navigation */}
                <nav className={styles.fbMobileBottomNav}>
                    <div
                        className={`${styles.fbMobileNavItem} ${activeTab === 'home' ? styles.active : ''}`}
                        onClick={() => setActiveTab('home')}
                    >
                        <FaHome className={styles.fbMobileNavIcon} />
                        <span className={styles.fbMobileNavLabel}>Trang chủ</span>
                    </div>
                    <div
                        className={`${styles.fbMobileNavItem} ${activeTab === 'users' ? styles.active : ''}`}
                        onClick={() => setActiveTab('users')}
                    >
                        <FaUsers className={styles.fbMobileNavIcon} />
                        <span className={styles.fbMobileNavLabel}>Thành viên</span>
                    </div>
                    <div
                        className={`${styles.fbMobileNavItem} ${activeTab === 'trophy' ? styles.active : ''}`}
                        onClick={() => setActiveTab('trophy')}
                    >
                        <FaTrophy className={styles.fbMobileNavIcon} />
                        <span className={styles.fbMobileNavLabel}>Xếp hạng</span>
                    </div>
                    <div
                        className={`${styles.fbMobileNavItem} ${activeTab === 'notifications' ? styles.active : ''}`}
                        onClick={() => setActiveTab('notifications')}
                    >
                        <FaBell className={styles.fbMobileNavIcon} />
                        <span className={styles.fbMobileNavLabel}>Thông báo</span>
                    </div>
                    <div
                        className={`${styles.fbMobileNavItem} ${activeTab === 'profile' ? styles.active : ''}`}
                        onClick={() => setActiveTab('profile')}
                    >
                        <FaUser className={styles.fbMobileNavIcon} />
                        <span className={styles.fbMobileNavLabel}>Cá nhân</span>
                    </div>
                </nav>
            </div>
        );
    }

    // Desktop layout - return original content
    return <>{children}</>;
}
