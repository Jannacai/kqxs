import { io } from 'socket.io-client';

class LotteryConnectionManager {
    constructor() {
        this.connections = new Map();
        this.subscribers = new Map();
        this.connectionPromises = new Map();
        this.keepAliveIntervals = new Map();
        this.lastEventTime = new Map();
        this.eventThrottle = 50; // Reduced from 100ms to 50ms for faster real-time updates

        // Cleanup old timestamps periodically
        if (typeof window !== 'undefined') {
            setInterval(() => {
                const now = Date.now();
                const maxAge = 60000; // 1 minute
                for (const [key, timestamp] of this.lastEventTime.entries()) {
                    if (now - timestamp > maxAge) {
                        this.lastEventTime.delete(key);
                    }
                }
            }, 30000); // Clean every 30 seconds
        }
    }

    async subscribe(station, date, callback) {
        const key = this.getConnectionKey(station, date);

        console.log(`=== SUBSCRIBING TO LOTTERY ===`);
        console.log(`Key: ${key}`);
        console.log(`Station: ${station}`);
        console.log(`Date: ${date}`);

        // Nếu đã có subscribers cho key này, chỉ thêm callback mới
        if (!this.subscribers.has(key)) {
            this.subscribers.set(key, new Set());
        }
        this.subscribers.get(key).add(callback);

        // Nếu chưa có connection, tạo mới
        if (!this.connections.has(key)) {
            await this.createConnection(key, station, date);
        }

        // Return unsubscribe function
        return () => {
            console.log(`Unsubscribing callback for ${key}, remaining subscribers: ${this.subscribers.get(key)?.size - 1}`);
            const subscribers = this.subscribers.get(key);
            if (subscribers) {
                subscribers.delete(callback);
                if (subscribers.size === 0) {
                    this.subscribers.delete(key);
                    this.disconnect(key);
                }
            }
        };
    }

    async createConnection(key, station, date) {
        // Nếu đang tạo connection, đợi
        if (this.connectionPromises.has(key)) {
            return this.connectionPromises.get(key);
        }

        const connectionPromise = (async () => {
            try {
                console.log(`Creating WebSocket connection for ${key}`);

                const socket = io(process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'https://backendkqxs-1.onrender.com', {
                    transports: ['websocket'],
                    timeout: 10000,
                    reconnection: true,
                    reconnectionAttempts: this.maxReconnectAttempts,
                    reconnectionDelay: this.reconnectDelay,
                    forceNew: false
                });

                // Đợi socket connect
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('WebSocket connection timeout'));
                    }, 10000);

                    socket.on('connect', () => {
                        clearTimeout(timeout);
                        console.log(`WebSocket connected for ${key}`);
                        resolve();
                    });

                    socket.on('connect_error', (error) => {
                        clearTimeout(timeout);
                        console.error(`WebSocket connection error for ${key}:`, error);
                        reject(error);
                    });
                });

                // Setup event listeners sau khi socket đã connected
                socket.on('LOTTERY_INITIAL', (data) => {
                    console.log(`Received LOTTERY_INITIAL for ${key}:`, data);
                    this.broadcast(key, data);
                });

                socket.on('LOTTERY_UPDATE', (data) => {
                    console.log(`=== FRONTEND RECEIVED LOTTERY_UPDATE ===`);
                    console.log(`Key: ${key}`);
                    console.log(`Data:`, data);
                    this.broadcast(key, data);
                });

                socket.on('LOTTERY_COMPLETE', (data) => {
                    console.log(`Received LOTTERY_COMPLETE for ${key}:`, data);
                    this.broadcast(key, data);
                });

                socket.on('LOTTERY_ERROR', (data) => {
                    console.error(`Received LOTTERY_ERROR for ${key}:`, data);
                    this.broadcast(key, data);
                });

                // Join room sau khi socket đã connected
                socket.emit('joinLotteryRoom', { station, date });

                // Setup keep-alive
                this.setupKeepAlive(key, socket);

                this.connections.set(key, socket);
                console.log(`Successfully created connection for ${key}`);

                return socket;
            } catch (error) {
                console.error(`Failed to create connection for ${key}:`, error);
                this.connectionPromises.delete(key);
                throw error;
            }
        })();

        this.connectionPromises.set(key, connectionPromise);
        return connectionPromise;
    }

    setupKeepAlive(key, socket) {
        const interval = setInterval(() => {
            if (socket.connected) {
                socket.emit('ping');
            } else {
                console.log(`Socket disconnected for ${key}, stopping keep-alive`);
                clearInterval(interval);
                this.keepAliveIntervals.delete(key);
            }
        }, 30000); // 30 seconds

        this.keepAliveIntervals.set(key, interval);
    }

    broadcast(key, data) {
        const subscribers = this.subscribers.get(key);
        if (subscribers && subscribers.size > 0) {
            // Balanced throttling for real-time performance
            const now = Date.now();
            const lastTime = this.lastEventTime.get(key) || 0;

            if (now - lastTime < this.eventThrottle) {
                return; // Skip without logging for performance
            }

            this.lastEventTime.set(key, now);
            console.log(`Broadcasting to ${key}:`, data);

            subscribers.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in subscriber callback for ${key}:`, error);
                }
            });
        }
    }

    disconnect(key) {
        console.log(`Disconnecting socket for ${key}`);

        // Clear keep-alive
        const interval = this.keepAliveIntervals.get(key);
        if (interval) {
            clearInterval(interval);
            this.keepAliveIntervals.delete(key);
        }

        // Close socket
        const socket = this.connections.get(key);
        if (socket) {
            socket.disconnect();
            this.connections.delete(key);
        }

        // Clear connection promise
        this.connectionPromises.delete(key);
    }

    disconnectAll() {
        console.log('Disconnecting all WebSocket connections');
        for (const key of this.connections.keys()) {
            this.disconnect(key);
        }
        this.subscribers.clear();
    }

    getConnectionKey(station, date) {
        const key = `kqxs:${station}:${date}`;
        return key;
    }

    getSubscribersCount(station, date) {
        const key = this.getConnectionKey(station, date);
        return this.subscribers.get(key)?.size || 0;
    }
}

const lotteryConnectionManager = new LotteryConnectionManager();

if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        lotteryConnectionManager.disconnectAll();
    });
}

export default lotteryConnectionManager;