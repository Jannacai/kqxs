import React, { useState, useEffect, useRef } from 'react';
import styles from '../styles/LiveResultModal.module.css';
import LiveResult from '../pages/xsmt/LiveResult';
import LiveResultMN from '../pages/xsmn/LiveResult';

const LiveResultModal = ({ isOpen, onClose, isForum = false, ...props }) => {
    const [isAnimating, setIsAnimating] = useState(false);
    const modalRef = useRef(null);

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

    return (
        <div
            className={`${styles.modalOverlay} ${isAnimating ? styles.active : ''} ${isForum ? styles.forumModal : ''}`}
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <div
                ref={modalRef}
                className={`${styles.modalContent} ${isAnimating ? styles.active : ''} ${isForum ? styles.forumContent : ''}`}
                tabIndex={-1}
            >
                <div className={`${styles.modalHeader} ${isForum ? styles.forumHeader : ''}`}>
                    <h2 id="modal-title" className={`${styles.modalTitle} ${isForum ? styles.forumTitle : ''}`}>
                        {props.station === 'xsmn' ? 'Xổ số Miền Nam Trực tiếp' : 'Xổ số Miền Trung Trực tiếp'}
                    </h2>
                    <button
                        className={`${styles.closeButton} ${isForum ? styles.forumCloseButton : ''}`}
                        onClick={onClose}
                        aria-label="Đóng modal"
                    >
                        ×
                    </button>
                </div>
                <div className={`${styles.modalBody} ${isForum ? styles.forumBody : ''}`}>
                    {props.station === 'xsmn' ? (
                        <LiveResultMN
                            isModal={true}
                            isForum={isForum}
                            station={props.station}
                            isLiveWindow={props.isLiveWindow}
                        />
                    ) : (
                        <LiveResult
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