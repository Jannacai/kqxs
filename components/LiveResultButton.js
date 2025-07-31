import { useState } from "react";
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

    const handleToggleModal = () => {
        const newState = !isModalOpen;
        setIsModalOpen(newState);

        // Track button click for analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', newState ? 'open_live_result_modal' : 'close_live_result_modal', {
                event_category: 'user_interaction',
                event_label: 'live_result_button'
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
        const positionClass = isForum ? styles[position] || styles.bottomLeft : '';

        return `${baseClass} ${styleClass} ${sizeClass} ${forumClass} ${positionClass}`;
    };

    return (
        <>
            <button
                className={getButtonClassName()}
                onClick={handleToggleModal}
                aria-label={isModalOpen ? "Đóng xem xổ số trực tiếp" : "Mở xem xổ số trực tiếp"}
                title={isModalOpen ? "Đóng kết quả xổ số Miền Trung trực tiếp" : "Xem kết quả xổ số Miền Trung trực tiếp"}
            >
                <span className={styles.buttonIcon}>{isModalOpen ? '✕' : '🎯'}</span>
                <span className={styles.buttonText}>
                    {isModalOpen ? 'Đóng XSMT Live' : buttonText}
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