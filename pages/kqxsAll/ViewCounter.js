import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import styles from '../../styles/LivekqxsMB.module.css';

const ViewCounter = ({ station, today }) => {
    const [viewCount, setViewCount] = useState(0);
    const [error, setError] = useState(null);
    const socketRef = useRef(null);
    const mountedRef = useRef(false);

    const maxRetries = 5;
    const retryInterval = 3000;
    const socketUrl = process.env.SOCKET_URL3 || 'http://localhost:5001';

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            if (socketRef.current) {
                console.log('Đóng kết nối Socket.IO của ViewCounter...');
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (!station || !today || !/^\d{2}-\d{2}-\d{4}$/.test(today)) {
            console.warn('Invalid station or today value:', { station, today });
            if (mountedRef.current) {
                setError('Dữ liệu không hợp lệ');
            }
            return;
        }

        // Gọi API để lấy lượt xem ban đầu
        const fetchInitialViewCount = async (retry = 0) => {
            try {
                const url = `http://localhost:5001/api/views/?station=${station}&date=${today}`;
                console.log('Fetching initial view count from:', url);
                const response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                const data = await response.json();
                console.log('Dữ liệu lượt xem ban đầu:', data);
                if (mountedRef.current && data.viewCount !== undefined) {
                    setViewCount(data.viewCount);
                    setError(null);
                } else if (mountedRef.current) {
                    setError('Dữ liệu lượt xem không hợp lệ');
                }
            } catch (error) {
                console.error(`Lỗi khi lấy dữ liệu lượt xem ban đầu (lần ${retry + 1}):`, error.message);
                if (retry < maxRetries && mountedRef.current) {
                    setTimeout(() => {
                        fetchInitialViewCount(retry + 1);
                    }, retryInterval);
                } else if (mountedRef.current) {
                    setError('Không thể lấy dữ liệu lượt xem ban đầu');
                }
            }
        };

        // Kết nối Socket.IO
        const connectSocket = () => {
            socketRef.current = io(socketUrl, {
                query: { token: localStorage.getItem('token') || '' },
                transports: ['websocket'],
            });

            socketRef.current.on('connect', () => {
                console.log('Socket.IO connected for views');
                if (mountedRef.current) {
                    setError(null);
                    socketRef.current.emit('joinViewCount');
                    console.log('Emitted joinViewCount');
                }
            });

            socketRef.current.on('VIEW_COUNT_UPDATED', (data) => {
                console.log('Nhận dữ liệu lượt xem:', data);
                if (mountedRef.current && data && data.viewCount !== undefined) {
                    setViewCount(data.viewCount);
                    setError(null);
                } else {
                    console.warn('Dữ liệu lượt xem không hợp lệ:', data);
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
    }, [station, today]);

    return (
        <div className={styles.viewCounter}>
            {error && <span className={styles.error}>{error}</span>}
            <span className={styles.viewCount}>
                Lượt xem: {viewCount.toLocaleString('vi-VN')}
            </span>
        </div>
    );
};

export default React.memo(ViewCounter);