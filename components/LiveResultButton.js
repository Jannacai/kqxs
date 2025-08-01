import { useState, useEffect } from "react";
import React from 'react';
import LiveResultModal from './LiveResultModal';
import styles from '../styles/LiveResultButton.module.css';

const LiveResultButton = ({
    station = 'xsmt',
    isLiveWindow = true,
    buttonText = "Xem Xổ số Trực tiếp",
    buttonStyle = "primary",
    size = "medium",
    isForum = false,
    position = "bottom-left"
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [shouldShow, setShouldShow] = useState(false);

    // Kiểm tra thời gian hiển thị nút
    useEffect(() => {
        const checkTimeAndShow = () => {
            const now = new Date();
            const currentHour = now.getHours();
            
            // XSMN hiển thị từ 16h-16h59
            if (station === 'xsmn') {
                setShouldShow(currentHour === 16);
            }
            // XSMT hiển thị từ 17h-17h59
            else if (station === 'xsmt') {
                setShouldShow(currentHour === 17);
            }
            // Các trường hợp khác không hiển thị
            else {
                setShouldShow(false);
            }
        };

        // Kiểm tra ngay lập tức
        checkTimeAndShow();

        // Cập nhật mỗi phút để đảm bảo chính xác
        const interval = setInterval(checkTimeAndShow, 60000);

        return () => clearInterval(interval);
    }, [station]);

    // Debug: Log thời gian hiện tại và trạng thái hiển thị (chỉ trong development)
    useEffect(() => {
        if (process.env.NODE_ENV === 'development') {
            const now = new Date();
            console.log(`[LiveResultButton ${station}] Current time: ${now.toLocaleTimeString()}, Hour: ${now.getHours()}, Should show: ${shouldShow}`);
        }
    }, [shouldShow, station]);

    const handleToggleModal = () => {
        const newState = !isModalOpen;
        setIsModalOpen(newState);

        // Track button click for analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', newState ? 'open_live_result_modal' : 'close_live_result_modal', {
                event_category: 'user_interaction',
                event_label: `live_result_button_${station}`
            });
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const getButtonClassName = () => {
        const baseClass = styles.liveResultButton;
        const styleClass = styles[buttonStyle] || styles.primary;
        const sizeClass = styles[size] || styles.medium;
        const forumClass = isForum ? styles.forumButton : '';
        const forumStyleClass = isForum ? styles[buttonStyle] || styles.primary : '';
        const positionClass = isForum ? styles[position] || styles.bottomLeft : '';

        return `${baseClass} ${styleClass} ${sizeClass} ${forumClass} ${forumStyleClass} ${positionClass}`;
    };

    // Nếu không nên hiển thị, return null
    if (!shouldShow) {
        return null;
    }

    return (
        <>
            <button
                className={getButtonClassName()}
                onClick={handleToggleModal}
                aria-label={isModalOpen ? `Đóng xem xổ số ${station === 'xsmn' ? 'Miền Nam' : 'Miền Trung'} trực tiếp` : `Mở xem xổ số ${station === 'xsmn' ? 'Miền Nam' : 'Miền Trung'} trực tiếp`}
                title={isModalOpen ? `Đóng kết quả xổ số ${station === 'xsmn' ? 'Miền Nam' : 'Miền Trung'} trực tiếp` : `Xem kết quả xổ số ${station === 'xsmn' ? 'Miền Nam' : 'Miền Trung'} trực tiếp`}
            >
                <span className={styles.buttonIcon}>{isModalOpen ? '✕' : (station === 'xsmn' ? '🎲' : '🎯')}</span>
                <span className={styles.buttonText}>
                    {isModalOpen ? `Đóng ${station.toUpperCase()} Live` : buttonText}
                </span>
                {!isModalOpen && (
                    <span className={styles.liveIndicator}>
                        <span className={styles.pulse}></span>
                        LIVE
                    </span>
                )}
            </button>

            <LiveResultModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                station={station}
                isLiveWindow={isLiveWindow}
                isForum={isForum}
            />
        </>
    );
};

export default React.memo(LiveResultButton); 