import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import styles from '../../styles/Views.module.css';

const ViewCounter = () => {
    const [viewCount, setViewCount] = useState(0);
    const [error, setError] = useState(null);
    const socketRef = useRef(null);
    const mountedRef = useRef(false);

    const maxRetries = 5;
    const retryInterval = 3000;
    const socketUrl = process.env.SOCKET_URL3 || 'http://localhost:5001';

    useEffect(() => {
        // console.log('ViewCounter initialized');
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            if (socketRef.current) {
                // console.log('Closing Socket.IO connection for ViewCounter');
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        const fetchInitialViewCount = async (retry = 0) => {
            try {
                const url = `https://back-end-diendan.onrender.com/api/views`;
                // console.log('Fetching initial view count from:', url);
                const response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                const data = await response.json();
                // console.log('Initial view count data:', data);
                if (mountedRef.current && data.viewCount !== undefined) {
                    setViewCount(data.viewCount);
                    setError(null);
                } else if (mountedRef.current) {
                    setError('Dữ liệu lượt xem không hợp lệ');
                }
            } catch (error) {
                console.error(`Error fetching initial view count (retry ${retry + 1}):`, error.message);
                if (retry < maxRetries && mountedRef.current) {
                    setTimeout(() => fetchInitialViewCount(retry + 1), retryInterval);
                } else if (mountedRef.current) {
                    setError('Không thể lấy dữ liệu lượt xem ban đầu');
                }
            }
        };

        const connectSocket = () => {
            socketRef.current = io(socketUrl, {
                query: { token: localStorage.getItem('token') || '' },
                transports: ['websocket'],
            });

            socketRef.current.on('connect', () => {
                // console.log('Socket.IO connected, socket ID:', socketRef.current.id);
                if (mountedRef.current) {
                    setError(null);
                    socketRef.current.emit('joinViewCount');
                    // console.log('Emitted joinViewCount');
                }
            });

            socketRef.current.on('VIEW_COUNT_UPDATED', (data) => {
                // console.log('Received VIEW_COUNT_UPDATED:', data);
                if (mountedRef.current && data && data.viewCount !== undefined) {
                    setViewCount(data.viewCount);
                    setError(null);
                } else {
                    console.warn('Invalid view count data:', data);
                    if (mountedRef.current) {
                        setError('Dữ liệu lượt xem không hợp lệ');
                    }
                }
            });

            socketRef.current.on('connect_error', (err) => {
                console.error('Socket.IO connect error:', err.message);
                if (mountedRef.current) {
                    setError('Đang kết nối lại lượt xem...');
                    socketRef.current.disconnect();
                    socketRef.current = null;
                    setTimeout(connectSocket, retryInterval);
                }
            });
        };

        fetchInitialViewCount();
        connectSocket();

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, []);

    return (
        <div className={styles.viewCounter}>
            {error && <span className={styles.error}>{error}</span>}
            <span className={styles.viewCount}>
                Đang xem: {viewCount.toLocaleString('vi-VN')}
            </span>
        </div>
    );
};

export default React.memo(ViewCounter);