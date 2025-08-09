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

export default function FacebookMobileWrapper({ children, componentType = 'default' }) {
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
                    {renderFacebookContent(children, componentType)}
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

// Helper function to render Facebook-style content
function renderFacebookContent(children, componentType) {
    switch (componentType) {
        case 'event':
            return (
                <div className={styles.fbMobileCard}>
                    <div className={styles.fbMobileCardHeader}>
                        <div className={styles.fbMobileCardAvatar}>📢</div>
                        <div className={styles.fbMobileCardInfo}>
                            <div className={styles.fbMobileCardTitle}>Tin Hot & Sự Kiện</div>
                            <div className={styles.fbMobileCardSubtitle}>Cập nhật thông tin mới nhất</div>
                        </div>
                    </div>
                    <div className={styles.fbMobileCardContent}>
                        {children}
                    </div>
                    <div className={styles.fbMobileCardActions}>
                        <button className={styles.fbMobileActionButton}>
                            <FaThumbsUp /> Thích
                        </button>
                        <button className={styles.fbMobileActionButton}>
                            <FaComment /> Bình luận
                        </button>
                        <button className={styles.fbMobileActionButton}>
                            <FaShare /> Chia sẻ
                        </button>
                    </div>
                </div>
            );

        case 'thongbao':
            return (
                <div className={styles.fbMobileCard}>
                    <div className={styles.fbMobileCardHeader}>
                        <div className={styles.fbMobileCardAvatar}>🔔</div>
                        <div className={styles.fbMobileCardInfo}>
                            <div className={styles.fbMobileCardTitle}>Thông Báo Mới</div>
                            <div className={styles.fbMobileCardSubtitle}>Thông báo từ ban quản trị</div>
                        </div>
                    </div>
                    <div className={styles.fbMobileCardContent}>
                        {children}
                    </div>
                    <div className={styles.fbMobileCardActions}>
                        <button className={styles.fbMobileActionButton}>
                            <FaThumbsUp /> Thích
                        </button>
                        <button className={styles.fbMobileActionButton}>
                            <FaComment /> Bình luận
                        </button>
                        <button className={styles.fbMobileActionButton}>
                            <FaShare /> Chia sẻ
                        </button>
                    </div>
                </div>
            );

        case 'userlist':
            return (
                <div className={styles.fbMobileUserList}>
                    <div className={styles.fbMobileCardHeader}>
                        <div className={styles.fbMobileCardAvatar}>👥</div>
                        <div className={styles.fbMobileCardInfo}>
                            <div className={styles.fbMobileCardTitle}>Thành Viên Nhóm</div>
                            <div className={styles.fbMobileCardSubtitle}>Danh sách thành viên tích cực</div>
                        </div>
                    </div>
                    {children}
                </div>
            );

        case 'vinhdanh':
            return (
                <div className={styles.fbMobileStory}>
                    <div className={styles.fbMobileStoryHeader}>
                        <div className={styles.fbMobileStoryTitle}>🏆 Bảng Vinh Danh</div>
                        <div className={styles.fbMobileStorySubtitle}>Những thành viên xuất sắc nhất</div>
                    </div>
                    <div className={styles.fbMobileStoryContent}>
                        {children}
                    </div>
                </div>
            );

        case 'leaderboard':
            return (
                <div className={styles.fbMobileLeaderboard}>
                    <div className={styles.fbMobileLeaderboardHeader}>
                        <div className={styles.fbMobileLeaderboardTitle}>👑 Bảng Xếp Hạng</div>
                        <div className={styles.fbMobileLeaderboardSubtitle}>Top 50 thành viên hàng đầu</div>
                    </div>
                    {children}
                </div>
            );

        case 'lichsudangky':
            return (
                <div className={styles.fbMobileCard}>
                    <div className={styles.fbMobileCardHeader}>
                        <div className={styles.fbMobileCardAvatar}>📜</div>
                        <div className={styles.fbMobileCardInfo}>
                            <div className={styles.fbMobileCardTitle}>Đăng Ký Events</div>
                            <div className={styles.fbMobileCardSubtitle}>Theo dõi sự kiện</div>
                        </div>
                    </div>
                    <div className={styles.fbMobileCardContent}>
                        {children}
                    </div>
                    <div className={styles.fbMobileCardActions}>
                        <button className={styles.fbMobileActionButton}>
                            <FaThumbsUp /> Thích
                        </button>
                        <button className={styles.fbMobileActionButton}>
                            <FaComment /> Bình luận
                        </button>
                        <button className={styles.fbMobileActionButton}>
                            <FaShare /> Chia sẻ
                        </button>
                    </div>
                </div>
            );

        case 'quydinh':
            return (
                <div className={styles.fbMobileCard}>
                    <div className={styles.fbMobileCardHeader}>
                        <div className={styles.fbMobileCardAvatar}>⚖️</div>
                        <div className={styles.fbMobileCardInfo}>
                            <div className={styles.fbMobileCardTitle}>Quy Định Diễn Đàn</div>
                            <div className={styles.fbMobileCardSubtitle}>Hướng dẫn và quy định cộng đồng</div>
                        </div>
                    </div>
                    <div className={styles.fbMobileCardContent}>
                        {children}
                    </div>
                    <div className={styles.fbMobileCardActions}>
                        <button className={styles.fbMobileActionButton}>
                            <FaThumbsUp /> Thích
                        </button>
                        <button className={styles.fbMobileActionButton}>
                            <FaComment /> Bình luận
                        </button>
                        <button className={styles.fbMobileActionButton}>
                            <FaShare /> Chia sẻ
                        </button>
                    </div>
                </div>
            );

        case 'latestEvent':
            return (
                <div className={styles.fbMobileStory}>
                    <div className={styles.fbMobileStoryHeader}>
                        <div className={styles.fbMobileStoryTitle}>📌 Sự Kiện Mới Nhất</div>
                        <div className={styles.fbMobileStorySubtitle}>Sự kiện quan trọng nhất hôm nay</div>
                    </div>
                    <div className={styles.fbMobileStoryContent}>
                        {children}
                    </div>
                </div>
            );

        default:
            return (
                <div className={styles.fbMobileCard}>
                    <div className={styles.fbMobileCardContent}>
                        {children}
                    </div>
                </div>
            );
    }
}
