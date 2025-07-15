import { createContext, useContext, useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

const SocketContext = createContext(null);

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL3 || 'http://localhost:5001';

// Biến khóa toàn cục để ngăn tạo nhiều socket
let socketLock = false;

export const SocketProvider = ({ children, session }) => {
    const socketRef = useRef(null);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!session?.accessToken) {
            console.log('No accessToken, skipping socket connection');
            return;
        }

        // Kiểm tra khóa socket
        if (socketLock) {
            console.log('Socket creation locked, reusing existing socket');
            return;
        }

        // Kiểm tra nếu socket đã tồn tại và đang kết nối
        if (socketRef.current && socketRef.current.connected) {
            console.log('Socket already connected, reusing:', socketRef.current.id);
            setIsConnected(true);
            return;
        }

        // Đặt khóa để ngăn tạo socket mới
        socketLock = true;

        // Khởi tạo Socket.IO
        const socket = io(API_BASE_URL, {
            query: { token: session.accessToken },
            reconnectionAttempts: 5,
            reconnectionDelay: 5000,
            forceNew: false,
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Socket.IO connected:', socket.id);
            setIsConnected(true);
            setError(null);
            // Lưu socket ID vào sessionStorage
            sessionStorage.setItem('socketId', socket.id);
        });

        socket.on('connect_error', (err) => {
            console.error('Socket.IO connection error:', err.message);
            setIsConnected(false);
            setError(err.message);
            if (err.message.includes('Authentication error')) {
                sessionStorage.removeItem('socketId');
                socketLock = false; // Mở khóa nếu lỗi xác thực
            }
        });

        socket.on('error', (err) => {
            console.error('Socket.IO error:', err.message);
            if (err.message.includes('Another session is active')) {
                setError('Phiên khác đang hoạt động. Vui lòng đóng các tab khác.');
                socket.disconnect();
                sessionStorage.removeItem('socketId');
                socketLock = false;
            }
        });

        socket.on('disconnect', (reason) => {
            console.log('Socket.IO disconnected:', reason);
            setIsConnected(false);
            sessionStorage.removeItem('socketId');
            socketLock = false; // Mở khóa khi ngắt kết nối
        });

        // Đồng bộ socket trong cùng một tab
        const handleStorageChange = (event) => {
            if (event.key === 'socketId' && event.newValue && socketRef.current && socketRef.current.id !== event.newValue) {
                console.log('Another socket created in this tab, disconnecting:', socketRef.current.id);
                socketRef.current.disconnect();
                socketLock = false;
            }
        };
        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            if (socketRef.current && !socketRef.current.connected) {
                socketRef.current.disconnect();
                console.log('Socket.IO disconnected on cleanup');
                socketLock = false;
            }
        };
    }, [session?.accessToken]);

    return (
        <SocketContext.Provider value={{ socket: socketRef.current, isConnected, error }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};