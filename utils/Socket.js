import { io } from "socket.io-client";

let socket = null;
let connectionPromise = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3; // Giảm số lần retry
const RECONNECT_DELAY = 2000; // Giảm delay

// Quản lý connection state
const connectionState = {
    isConnecting: false,
    isConnected: false,
    lastError: null,
    listeners: new Set()
};

// Lấy URL từ environment variables với fallback
const getSocketUrl = () => {
    // Thử lấy từ environment variables
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL3 || process.env.NEXT_PUBLIC_BACKEND_URL;

    if (backendUrl) {
        // Chuyển đổi http://localhost:5001 thành ws://localhost:5001
        return backendUrl.replace(/^http/, 'ws');
    }

    // Fallback URLs
    return [
        "ws://back-end-diendan.onrender.com",
        "https://back-end-diendan.onrender.com"
    ];
};

export function getSocket() {
    console.log('🔌 [Socket] getSocket() called, current socket state:', {
        hasSocket: !!socket,
        isConnecting: connectionState.isConnecting,
        isConnected: connectionState.isConnected,
        hasConnectionPromise: !!connectionPromise
    });

    if (!socket) {
        console.log('🔌 [Socket] No socket exists, creating new connection...');
        connectionPromise = createSocketConnection();
    } else {
        console.log('🔌 [Socket] Socket exists, returning existing promise');
    }
    return connectionPromise;
}

async function createSocketConnection() {
    if (connectionState.isConnecting) {
        return connectionPromise;
    }

    connectionState.isConnecting = true;

    const socketUrls = getSocketUrl();
    const urls = Array.isArray(socketUrls) ? socketUrls : [socketUrls];

    // Thử kết nối với các URL khác nhau
    for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        console.log(`Attempting to connect to Socket.IO server: ${url}`);

        try {
            socket = io(url, {
                transports: ["websocket", "polling"],
                reconnection: true, // Bật reconnection tự động
                reconnectionAttempts: 3,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                timeout: 15000, // Tăng timeout
                forceNew: false,
                upgrade: true,
                rememberUpgrade: true,
                autoConnect: true
            });

            const result = await new Promise((resolve, reject) => {
                const timeoutId = setTimeout(() => {
                    console.error(`Socket connection timeout to ${url}`);
                    reject(new Error(`Socket connection timeout to ${url}`));
                }, 20000); // 20 giây timeout

                socket.on('connect', () => {
                    console.log(`Socket.IO connected successfully to ${url}:`, socket.id);
                    connectionState.isConnected = true;
                    connectionState.isConnecting = false;
                    connectionState.lastError = null;
                    reconnectAttempts = 0;
                    clearTimeout(timeoutId);

                    // Thông báo cho tất cả listeners
                    connectionState.listeners.forEach(callback => {
                        try {
                            callback(true);
                        } catch (err) {
                            console.error('Error in connection listener:', err);
                        }
                    });

                    resolve(socket);
                });

                socket.on('connect_error', (error) => {
                    console.error(`Socket.IO connection error to ${url}:`, error.message);
                    connectionState.isConnected = false;
                    connectionState.isConnecting = false;
                    connectionState.lastError = error;
                    clearTimeout(timeoutId);

                    // Thông báo cho tất cả listeners
                    connectionState.listeners.forEach(callback => {
                        try {
                            callback(false);
                        } catch (err) {
                            console.error('Error in connection listener:', err);
                        }
                    });

                    reject(error);
                });

                socket.on('disconnect', (reason) => {
                    console.log(`Socket.IO disconnected from ${url}:`, reason);
                    connectionState.isConnected = false;

                    // Thông báo cho tất cả listeners
                    connectionState.listeners.forEach(callback => {
                        try {
                            callback(false);
                        } catch (err) {
                            console.error('Error in connection listener:', err);
                        }
                    });

                    // Chỉ reconnect thủ công nếu cần thiết
                    if (reason !== 'io client disconnect' && reason !== 'io server disconnect') {
                        console.log('Attempting manual reconnection...');
                        setTimeout(() => {
                            if (!connectionState.isConnected) {
                                reconnectSocket();
                            }
                        }, RECONNECT_DELAY);
                    }
                });

                socket.on('reconnect', (attemptNumber) => {
                    console.log(`Socket.IO reconnected after ${attemptNumber} attempts`);
                    connectionState.isConnected = true;
                    reconnectAttempts = 0;

                    // Thông báo cho tất cả listeners
                    connectionState.listeners.forEach(callback => {
                        try {
                            callback(true);
                        } catch (err) {
                            console.error('Error in connection listener:', err);
                        }
                    });
                });

                socket.on('reconnect_error', (error) => {
                    console.error('Socket.IO reconnection error:', error);
                    connectionState.isConnected = false;

                    // Thông báo cho tất cả listeners
                    connectionState.listeners.forEach(callback => {
                        try {
                            callback(false);
                        } catch (err) {
                            console.error('Error in connection listener:', err);
                        }
                    });
                });

                socket.on('reconnect_failed', () => {
                    console.error('Socket.IO reconnection failed');
                    connectionState.isConnected = false;

                    // Thông báo cho tất cả listeners
                    connectionState.listeners.forEach(callback => {
                        try {
                            callback(false);
                        } catch (err) {
                            console.error('Error in connection listener:', err);
                        }
                    });
                });
            });

            return result;
        } catch (error) {
            console.error(`Failed to connect to ${url}:`, error.message);
            if (socket) {
                socket.close();
                socket = null;
            }

            // Nếu đây là URL cuối cùng, throw error
            if (i === urls.length - 1) {
                connectionState.isConnecting = false;
                connectionState.lastError = error;

                // Thông báo cho tất cả listeners
                connectionState.listeners.forEach(callback => {
                    try {
                        callback(false);
                    } catch (err) {
                        console.error('Error in connection listener:', err);
                    }
                });

                throw new Error(`Failed to connect to any Socket.IO server. Last error: ${error.message}`);
            }

            // Tiếp tục thử URL tiếp theo
            continue;
        }
    }
}

async function reconnectSocket() {
    if (connectionState.isConnecting || connectionState.isConnected) {
        return;
    }

    reconnectAttempts++;
    console.log(`Attempting to reconnect Socket.IO (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);

    try {
        if (socket) {
            socket.close();
        }
        socket = null;
        connectionPromise = null;

        // Tạo connection mới
        await createSocketConnection();
    } catch (error) {
        console.error('Reconnection failed:', error.message);
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            setTimeout(() => {
                reconnectSocket();
            }, RECONNECT_DELAY * reconnectAttempts); // Exponential backoff
        } else {
            console.error('Max reconnection attempts reached. Socket.IO connection failed.');
            // Thông báo cho tất cả listeners
            connectionState.listeners.forEach(callback => {
                try {
                    callback(false);
                } catch (err) {
                    console.error('Error in connection listener:', err);
                }
            });
        }
    }
}

// Cleanup function để đóng connection khi cần
export function disconnectSocket() {
    if (socket) {
        console.log('Disconnecting Socket.IO...');
        socket.disconnect();
        socket = null;
        connectionPromise = null;
        connectionState.isConnected = false;
        connectionState.isConnecting = false;
        reconnectAttempts = 0;

        // Thông báo cho tất cả listeners
        connectionState.listeners.forEach(callback => {
            try {
                callback(false);
            } catch (err) {
                console.error('Error in connection listener:', err);
            }
        });
    }
}

// Kiểm tra trạng thái connection
export function isSocketConnected() {
    return connectionState.isConnected && socket?.connected;
}

// Lấy socket instance hiện tại (không async)
export function getCurrentSocket() {
    return socket;
}

// Thêm listener cho connection events
export function addConnectionListener(callback) {
    connectionState.listeners.add(callback);

    // Gọi ngay lập tức với trạng thái hiện tại
    try {
        callback(connectionState.isConnected);
    } catch (err) {
        console.error('Error in initial connection listener call:', err);
    }

    return () => {
        connectionState.listeners.delete(callback);
    };
}

// Kiểm tra xem có đang kết nối không
export function isSocketConnecting() {
    return connectionState.isConnecting;
}

// Lấy thông tin lỗi cuối cùng
export function getLastSocketError() {
    return connectionState.lastError;
}