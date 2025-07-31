"use client";

import { useState, useEffect } from 'react';
import { getSocket, isSocketConnected, addConnectionListener } from '../utils/Socket';
import styles from '../styles/SocketStatus.module.css';

export default function SocketStatus() {
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);

    useEffect(() => {
        const removeListener = addConnectionListener((connected) => {
            setIsConnected(connected);
            if (connected) {
                setError(null);
                setIsConnecting(false);
            }
        });

        // Kiểm tra trạng thái ban đầu
        setIsConnected(isSocketConnected());

        return () => removeListener();
    }, []);

    const handleRetry = async () => {
        setIsConnecting(true);
        setError(null);
        setRetryCount(prev => prev + 1);

        try {
            await getSocket();
            setIsConnecting(false);
        } catch (err) {
            setError(err.message);
            setIsConnecting(false);
        }
    };

    if (isConnected) {
        return (
            <div className={styles.container}>
                <div className={styles.status}>
                    <div className={`${styles.indicator} ${styles.connected}`}></div>
                    <span className={styles.text}>Kết nối thời gian thực</span>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.status}>
                <div className={`${styles.indicator} ${styles.disconnected}`}></div>
                <span className={styles.text}>
                    {isConnecting ? 'Đang kết nối...' : 'Mất kết nối thời gian thực'}
                </span>
                {error && (
                    <div className={styles.error}>
                        <small>{error}</small>
                    </div>
                )}
                {!isConnecting && (
                    <button
                        onClick={handleRetry}
                        className={styles.retryButton}
                        disabled={isConnecting}
                    >
                        {retryCount > 0 ? `Thử lại (${retryCount})` : 'Thử lại'}
                    </button>
                )}
            </div>
        </div>
    );
} 