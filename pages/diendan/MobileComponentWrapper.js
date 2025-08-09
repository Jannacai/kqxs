"use client";

import { useEffect, useState } from 'react';
import styles from '../../styles/mobileComponents.module.css';
import { FaBell, FaUsers, FaTrophy, FaCrown, FaExclamationTriangle, FaSpinner } from 'react-icons/fa';

export default function MobileComponentWrapper({ children, componentType = 'default', title, subtitle, stats }) {
    const [isMobile, setIsMobile] = useState(false);

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

    // Desktop layout - return original content
    if (!isMobile) {
        return <>{children}</>;
    }

    // Mobile layout
    const renderMobileHeader = () => {
        switch (componentType) {
            case 'thongbao':
                return (
                    <div className={styles.mobileNotificationHeader}>
                        <div className={styles.mobileNotificationTitle}>
                            <FaBell style={{ marginRight: '8px' }} />
                            {title || 'Thông Báo Mới'}
                        </div>
                        {stats && (
                            <div className={styles.mobileNotificationStats}>
                                {stats}
                            </div>
                        )}
                    </div>
                );
            case 'userlist':
                return (
                    <div className={styles.mobileUserListHeader}>
                        <div className={styles.mobileUserListTitle}>
                            <FaUsers style={{ marginRight: '8px' }} />
                            {title || 'Thành Viên Nhóm'}
                        </div>
                        {stats && (
                            <div className={styles.mobileUserListStats}>
                                {stats}
                            </div>
                        )}
                    </div>
                );
            case 'vinhdanh':
                return (
                    <div className={styles.mobileVinhDanhHeader}>
                        <div className={styles.mobileVinhDanhTitle}>
                            <FaTrophy style={{ marginRight: '8px' }} />
                            {title || 'Bảng Vinh Danh'}
                        </div>
                        <div className={styles.mobileVinhDanhSubtitle}>
                            {subtitle || 'Những thành viên xuất sắc nhất'}
                        </div>
                    </div>
                );
            case 'leaderboard':
                return (
                    <div className={styles.mobileLeaderboardHeader}>
                        <div className={styles.mobileLeaderboardTitle}>
                            <FaCrown style={{ marginRight: '8px' }} />
                            {title || 'Bảng Xếp Hạng'}
                        </div>
                        <div className={styles.mobileLeaderboardSubtitle}>
                            {subtitle || 'Top 50 thành viên hàng đầu'}
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    const renderMobileContainer = () => {
        switch (componentType) {
            case 'thongbao':
                return (
                    <div className={styles.mobileNotificationContainer}>
                        {renderMobileHeader()}
                        <div className={styles.mobileNotificationContent}>
                            {children}
                        </div>
                    </div>
                );
            case 'userlist':
                return (
                    <div className={styles.mobileUserListContainer}>
                        {renderMobileHeader()}
                        <div className={styles.mobileUserListContent}>
                            {children}
                        </div>
                    </div>
                );
            case 'vinhdanh':
                return (
                    <div className={styles.mobileVinhDanhContainer}>
                        {renderMobileHeader()}
                        <div className={styles.mobileVinhDanhContent}>
                            {children}
                        </div>
                    </div>
                );
            case 'leaderboard':
                return (
                    <div className={styles.mobileLeaderboardContainer}>
                        {renderMobileHeader()}
                        <div className={styles.mobileLeaderboardContent}>
                            {children}
                        </div>
                    </div>
                );
            default:
                return <>{children}</>;
        }
    };

    return renderMobileContainer();
}

// Helper components for mobile states
export function MobileEmptyState({ icon, title, text }) {
    return (
        <div className={styles.mobileEmptyState}>
            <div className={styles.mobileEmptyIcon}>{icon}</div>
            <div className={styles.mobileEmptyTitle}>{title}</div>
            <div className={styles.mobileEmptyText}>{text}</div>
        </div>
    );
}

export function MobileLoadingState({ text = 'Đang tải...' }) {
    return (
        <div className={styles.mobileLoadingState}>
            <div className={styles.mobileSpinner}></div>
            <span>{text}</span>
        </div>
    );
}

export function MobileErrorState({ text }) {
    return (
        <div className={styles.mobileErrorState}>
            <FaExclamationTriangle className={styles.mobileErrorIcon} />
            <div className={styles.mobileErrorText}>{text}</div>
        </div>
    );
}

// Mobile-specific item components
export function MobileNotificationItem({ user, time, message, badge, onClick }) {
    const getInitials = (fullname) => {
        if (!fullname) return 'U';
        const nameParts = fullname.trim().split(' ');
        return nameParts[nameParts.length - 1].charAt(0).toUpperCase();
    };

    return (
        <div className={styles.mobileNotificationItem} onClick={onClick}>
            <div className={styles.mobileNotificationAvatar}>
                {getInitials(user?.fullname)}
            </div>
            <div className={styles.mobileNotificationInfo}>
                <div className={styles.mobileNotificationUserName}>
                    {user?.fullname || 'Người dùng'}
                </div>
                <div className={styles.mobileNotificationTime}>{time}</div>
                <div className={styles.mobileNotificationMessage}>{message}</div>
                {badge && (
                    <span className={`${styles.mobileNotificationBadge} ${styles[badge]}`}>
                        {badge}
                    </span>
                )}
            </div>
        </div>
    );
}

export function MobileUserItem({ user, status, role, onChat, onView }) {
    const getInitials = (fullname) => {
        if (!fullname) return 'U';
        const nameParts = fullname.trim().split(' ');
        return nameParts[nameParts.length - 1].charAt(0).toUpperCase();
    };

    return (
        <div className={styles.mobileUserItem}>
            <div className={`${styles.mobileUserAvatar} ${user?.role === 'admin' ? styles.admin : ''}`}>
                {getInitials(user?.fullname)}
            </div>
            <div className={styles.mobileUserInfo}>
                <div className={styles.mobileUserName}>
                    {user?.fullname || 'Người dùng'}
                </div>
                <div className={styles.mobileUserStatus}>{status}</div>
                {role && (
                    <span className={`${styles.mobileUserRole} ${styles[role.toLowerCase()]}`}>
                        {role}
                    </span>
                )}
            </div>
            <div className={styles.mobileUserActions}>
                {onChat && (
                    <button
                        className={`${styles.mobileUserButton} ${styles.primary}`}
                        onClick={() => onChat(user)}
                    >
                        Chat
                    </button>
                )}
                {onView && (
                    <button
                        className={`${styles.mobileUserButton} ${styles.secondary}`}
                        onClick={() => onView(user)}
                    >
                        Xem
                    </button>
                )}
            </div>
        </div>
    );
}

export function MobileWinnerItem({ winner, rank, onClick }) {
    const getInitials = (fullname) => {
        if (!fullname) return 'U';
        const nameParts = fullname.trim().split(' ');
        return nameParts[nameParts.length - 1].charAt(0).toUpperCase();
    };

    const getRankClass = (rank) => {
        if (rank === 1) return 'top1';
        if (rank === 2) return 'top2';
        if (rank === 3) return 'top3';
        return 'other';
    };

    return (
        <div className={styles.mobileWinnerItem} onClick={() => onClick?.(winner)}>
            <div className={`${styles.mobileWinnerRank} ${styles[getRankClass(rank)]}`}>
                {rank}
            </div>
            <div className={styles.mobileWinnerInfo}>
                <div className={styles.mobileWinnerName}>
                    {winner?.fullname || 'Người dùng'}
                </div>
                <div className={styles.mobileWinnerPoints}>
                    {winner?.points || 0} điểm
                </div>
                {winner?.prize && (
                    <div className={styles.mobileWinnerPrize}>
                        {winner.prize}
                    </div>
                )}
            </div>
        </div>
    );
}

export function MobilePlayerItem({ player, rank, onClick }) {
    const getInitials = (fullname) => {
        if (!fullname) return 'U';
        const nameParts = fullname.trim().split(' ');
        return nameParts[nameParts.length - 1].charAt(0).toUpperCase();
    };

    const getRankClass = (rank) => {
        if (rank === 1) return 'top1';
        if (rank === 2) return 'top2';
        if (rank === 3) return 'top3';
        return 'other';
    };

    return (
        <div className={styles.mobilePlayerItem} onClick={() => onClick?.(player)}>
            <div className={`${styles.mobilePlayerRank} ${styles[getRankClass(rank)]}`}>
                {rank}
            </div>
            <div className={styles.mobilePlayerInfo}>
                <div className={styles.mobilePlayerName}>
                    {player?.fullname || 'Người dùng'}
                </div>
                <div className={styles.mobilePlayerPoints}>
                    {player?.points || 0} điểm
                </div>
                {player?.title && (
                    <div className={styles.mobilePlayerTitle}>
                        {player.title}
                    </div>
                )}
            </div>
        </div>
    );
}
