import React, { useState, useEffect, useRef } from 'react';
import styles from '../styles/LiveResultModal.module.css';
import LiveResult from '../pages/xsmt/LiveResult';
import LiveResultMN from '../pages/xsmn/LiveResult';
import LiveResultMB from '../pages/kqxsAll/LiveResult';

const LiveResultModal = ({ isOpen, onClose, isForum = false, ...props }) => {
    const [isAnimating, setIsAnimating] = useState(false);
    const modalRef = useRef(null);

    // Kiểm tra xem có phải giờ live không
    const isLiveHour = () => {
        const now = new Date();
        const vietnamTime = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Ho_Chi_Minh',
            hour: 'numeric',
            hour12: false
        }).format(now);
        const currentHour = parseInt(vietnamTime);

        // XSMN: 16h, XSMT: 17h, XSMB: 12h
        if (props.station === 'xsmn') return currentHour === 16;
        if (props.station === 'xsmt') return currentHour === 17;
        if (props.station === 'xsmb') return currentHour === 18;

        return false;
    };

    // Lấy title dựa trên station và giờ live
    const getModalTitle = () => {
        const isLive = isLiveHour();
        const liveText = isLive ? ' Trực tiếp' : '';

        if (props.station === 'xsmn') {
            return `Xổ số Miền Nam${liveText}`;
        } else if (props.station === 'xsmt') {
            return `Xổ số Miền Trung${liveText}`;
        } else {
            return `Xổ số Miền Bắc${liveText}`;
        }
    };

    useEffect(() => {
        if (isOpen) {
            setIsAnimating(true);
        } else {
            setIsAnimating(false);
        }
    }, [isOpen]);

    useEffect(() => {
        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            if (!isForum) {
                document.body.style.overflow = 'hidden';
            }
        }
        return () => {
            document.removeEventListener('keydown', handleEscape);
            if (!isForum) {
                document.body.style.overflow = 'unset';
            }
        };
    }, [isOpen, onClose, isForum]);

    const handleBackdropClick = (event) => {
        if (event.target === event.currentTarget) {
            onClose();
        }
    };

    if (!isOpen) return null;

    // Kiểm tra có phải giờ live không để bật/tắt hiệu ứng
    const isLive = isLiveHour();

    return (
        <div
            className={`${styles.modalOverlay} ${isAnimating ? styles.active : ''} ${isForum ? styles.forumModal : ''} ${isLive ? styles.liveMode : ''}`}
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <div
                ref={modalRef}
                className={`${styles.modalContent} ${isAnimating ? styles.active : ''} ${isForum ? styles.forumContent : ''} ${props.station === 'xsmb' ? styles.xsmb : ''} ${isLive ? styles.liveMode : ''}`}
                tabIndex={-1}
            >
                <div className={`${styles.modalHeader} ${isForum ? styles.forumHeader : ''} ${isLive ? styles.liveMode : ''}`}>
                    <h2 id="modal-title" className={`${styles.modalTitle} ${isForum ? styles.forumTitle : ''} ${isLive ? styles.liveMode : ''}`}>
                        {getModalTitle()}
                    </h2>
                    <button
                        className={`${styles.closeButton} ${isForum ? styles.forumCloseButton : ''}`}
                        onClick={onClose}
                        aria-label="Đóng modal"
                    >
                        ×
                    </button>
                </div>
                <div className={`${styles.modalBody} ${isForum ? styles.forumBody : ''} ${props.station === 'xsmb' ? styles.xsmb : ''} ${isLive ? styles.liveMode : ''}`}>
                    {props.station === 'xsmn' ? (
                        <LiveResultMN
                            isModal={true}
                            isForum={isForum}
                            station={props.station}
                            isLiveWindow={props.isLiveWindow}
                        />
                    ) : props.station === 'xsmt' ? (
                        <LiveResult
                            isModal={true}
                            isForum={isForum}
                            station={props.station}
                            isLiveWindow={props.isLiveWindow}
                        />
                    ) : (
                        <LiveResultMB
                            isModal={true}
                            isForum={isForum}
                            station={props.station}
                            isLiveWindow={props.isLiveWindow}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default LiveResultModal; 