import { io } from "socket.io-client";

let socket = null;
let connectionPromise = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5; // Giảm số lần retry
const RECONNECT_DELAY = 3000; // Tăng delay

// Quản lý connection state
const connectionState = {
    isConnecting: false,
    isConnected: false,
    lastError: null,
    listeners: new Set()
};

// Fallback URL nếu server chính không khả dụng
const SOCKET_URLS = [
    "http://localhost:5001",
    "http://localhost:5001" // Fallback cho development
];

export function getSocket() {
    if (!socket) {
        connectionPromise = createSocketConnection();
    }
    return connectionPromise;
}

async function createSocketConnection() {
    if (connectionState.isConnecting) {
        return connectionPromise;
    }

    connectionState.isConnecting = true;

    // Thử kết nối với các URL khác nhau
    for (let i = 0; i < SOCKET_URLS.length; i++) {
        const url = SOCKET_URLS[i];
        console.log(`Attempting to connect to Socket.IO server: ${url}`);

        try {
            socket = io(url, {
                transports: ["websocket", "polling"], // Thêm polling fallback
                reconnection: false,
                timeout: 8000, // Giảm timeout
                forceNew: false,
                upgrade: true,
                rememberUpgrade: true
            });

            const result = await new Promise((resolve, reject) => {
                const timeoutId = setTimeout(() => {
                    reject(new Error(`Socket connection timeout to ${url}`));
                }, 10000); // 10 giây timeout

                socket.on('connect', () => {
                    console.log(`Socket.IO connected successfully to ${url}:`, socket.id);
                    connectionState.isConnected = true;
                    connectionState.isConnecting = false;
                    connectionState.lastError = null;
                    reconnectAttempts = 0;
                    clearTimeout(timeoutId);
                    resolve(socket);
                });

                socket.on('connect_error', (error) => {
                    console.error(`Socket.IO connection error to ${url}:`, error.message);
                    connectionState.isConnected = false;
                    connectionState.isConnecting = false;
                    connectionState.lastError = error;
                    clearTimeout(timeoutId);
                    reject(error);
                });

                socket.on('disconnect', (reason) => {
                    console.log(`Socket.IO disconnected from ${url}:`, reason);
                    connectionState.isConnected = false;

                    // Chỉ reconnect nếu không phải do client disconnect
                    if (reason !== 'io client disconnect' && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                        setTimeout(() => {
                            reconnectSocket();
                        }, RECONNECT_DELAY);
                    }
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
            if (i === SOCKET_URLS.length - 1) {
                connectionState.isConnecting = false;
                connectionState.lastError = error;
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
    }
}

// Kiểm tra trạng thái connection
export function isSocketConnected() {
    return connectionState.isConnected && socket?.connected;
}

// Thêm listener cho connection events
export function addConnectionListener(callback) {
    connectionState.listeners.add(callback);
    return () => {
        connectionState.listeners.delete(callback);
    };
}