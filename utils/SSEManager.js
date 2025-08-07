// SSEManager.js - Frontend-Only Solution
// Quản lý SSE connections cho tất cả regions với time-based logic

class FrontendSSEManager {
    constructor() {
        this.connections = new Map(); // { region: connection }
        this.subscribers = new Map(); // { region: Set<callback> }
        this.connectionStatus = new Map(); // { region: 'connected'|'error'|'connecting' }
        this.reconnectAttempts = new Map(); // { region: count }

        // Cấu hình giờ live và endpoints
        this.liveSchedule = {
            'xsmn': {
                start: '16:10',
                end: '16:45',
                url: 'https://backendkqxs-1.onrender.com/api/ketqua/xsmn/sse',
                name: 'Miền Nam'
            },
            'xsmt': {
                start: '17:10',
                end: '17:35',
                url: 'https://backendkqxs-1.onrender.com/api/ketquaxs/xsmt/sse',
                name: 'Miền Trung'
            },
            'xsmb': {
                start: '18:10',
                end: '18:34',
                url: 'https://backendkqxs-1.onrender.com/api/kqxs/xsmb/sse',
                name: 'Miền Bắc'
            }
        };

        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000;

        // Auto cleanup khi hết giờ live
        this.setupAutoCleanup();
    }

    // Kiểm tra xem region có đang trong giờ live không
    isRegionLive(region) {
        const schedule = this.liveSchedule[region];
        if (!schedule) return false;

        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 5); // "HH:MM"

        const isLive = currentTime >= schedule.start && currentTime <= schedule.end;

        console.log(`🕐 Time check for ${region}: ${currentTime} (${schedule.start}-${schedule.end}) = ${isLive ? 'LIVE' : 'NOT LIVE'}`);

        return isLive;
    }

    // Đăng ký nhận data cho một region
    subscribe(region, callback) {
        if (!this.subscribers.has(region)) {
            this.subscribers.set(region, new Set());
        }
        this.subscribers.get(region).add(callback);

        console.log(`📡 Subscribed to ${region} (${this.liveSchedule[region]?.name}) - Total subscribers: ${this.subscribers.get(region).size}`);

        // Tạo connection nếu đang trong giờ live và chưa có connection
        // TẠM THỜI: Luôn tạo connection để test, bỏ qua time-based logic
        if (!this.connections.has(region)) {
            this.createConnection(region);
        } else {
            console.log(`♻️ Reusing existing connection for ${region}`);
        }

        // Return unsubscribe function
        return () => {
            const regionSubscribers = this.subscribers.get(region);
            if (regionSubscribers) {
                regionSubscribers.delete(callback);
                console.log(`📡 Unsubscribed from ${region} - Remaining subscribers: ${regionSubscribers.size}`);

                // Chỉ đóng connection nếu không còn subscriber nào VÀ không trong giờ live
                if (regionSubscribers.size === 0) {
                    this.subscribers.delete(region);

                    // Chỉ đóng connection nếu không trong giờ live
                    if (!this.isRegionLive(region)) {
                        this.closeConnection(region);
                    } else {
                        console.log(`⏰ Giữ connection ${region} vì đang trong giờ live`);
                    }
                }
            }
        };
    }

    // Tạo SSE connection cho region
    createConnection(region) {
        const schedule = this.liveSchedule[region];
        if (!schedule) {
            console.error(`❌ Không tìm thấy schedule cho region: ${region}`);
            return;
        }

        if (this.connections.has(region)) {
            console.log(`⚠️ Connection cho ${region} đã tồn tại`);
            return;
        }

        console.log(`🔌 Tạo SSE connection cho ${region} (${schedule.name})`);
        this.connectionStatus.set(region, 'connecting');

        try {
            const connection = new EventSource(schedule.url);

            connection.onopen = () => {
                console.log(`✅ SSE connected: ${region} (${schedule.name})`);
                console.log(`🔗 SSE URL: ${schedule.url}`);
                this.connectionStatus.set(region, 'connected');
                this.reconnectAttempts.set(region, 0);
            };

            // Lắng nghe từng event type riêng biệt như XSMB
            const prizeTypes = [
                'maDB', 'specialPrize_0', 'firstPrize_0', 'secondPrize_0', 'secondPrize_1',
                'threePrizes_0', 'threePrizes_1', 'threePrizes_2', 'threePrizes_3', 'threePrizes_4', 'threePrizes_5',
                'fourPrizes_0', 'fourPrizes_1', 'fourPrizes_2', 'fourPrizes_3',
                'fivePrizes_0', 'fivePrizes_1', 'fivePrizes_2', 'fivePrizes_3', 'fivePrizes_4', 'fivePrizes_5',
                'sixPrizes_0', 'sixPrizes_1', 'sixPrizes_2',
                'sevenPrizes_0', 'sevenPrizes_1', 'sevenPrizes_2', 'sevenPrizes_3',
            ];

            // Lắng nghe từng prize type event
            prizeTypes.forEach(prizeType => {
                connection.addEventListener(prizeType, (event) => {
                    try {
                        console.log(`📨 Raw SSE data received for ${region} (${prizeType}):`, event.data);

                        const data = JSON.parse(event.data);
                        console.log(`📊 Parsed SSE data for ${region} (${prizeType}):`, data);

                        const regionSubscribers = this.subscribers.get(region);

                        if (regionSubscribers) {
                            console.log(`📡 Broadcasting to ${regionSubscribers.size} subscribers for ${region} (${prizeType})`);
                            regionSubscribers.forEach(callback => {
                                try {
                                    console.log(`🎯 Calling callback for ${region} with data:`, data);
                                    callback(data);
                                } catch (error) {
                                    console.error(`❌ Lỗi callback cho ${region}:`, error);
                                }
                            });
                        } else {
                            console.warn(`⚠️ No subscribers found for ${region}`);
                        }
                    } catch (error) {
                        console.error(`❌ Lỗi parse SSE data cho ${region} (${prizeType}):`, error);
                        console.error(`❌ Raw data:`, event.data);
                    }
                });
            });

            // Lắng nghe full event
            connection.addEventListener('full', (event) => {
                try {
                    console.log(`📨 Raw SSE full data received for ${region}:`, event.data);

                    const data = JSON.parse(event.data);
                    console.log(`📊 Parsed SSE full data for ${region}:`, data);

                    const regionSubscribers = this.subscribers.get(region);

                    if (regionSubscribers) {
                        console.log(`📡 Broadcasting full data to ${regionSubscribers.size} subscribers for ${region}`);
                        regionSubscribers.forEach(callback => {
                            try {
                                console.log(`🎯 Calling callback for ${region} with full data:`, data);
                                callback(data);
                            } catch (error) {
                                console.error(`❌ Lỗi callback cho ${region}:`, error);
                            }
                        });
                    } else {
                        console.warn(`⚠️ No subscribers found for ${region}`);
                    }
                } catch (error) {
                    console.error(`❌ Lỗi parse SSE full data cho ${region}:`, error);
                    console.error(`❌ Raw data:`, event.data);
                }
            });

            // Lắng nghe canary event
            connection.addEventListener('canary', (event) => {
                console.log(`📡 Received canary message for ${region}:`, event.data);
            });

            // Lắng nghe message event chung (fallback)
            connection.onmessage = (event) => {
                console.log(`📨 Generic message received for ${region}:`, event.data);
            };

            connection.onerror = (error) => {
                console.warn(`⚠️ SSE error cho ${region}:`, error);
                this.connectionStatus.set(region, 'error');
                this.handleReconnect(region);
            };

            this.connections.set(region, connection);

        } catch (error) {
            console.error(`❌ Lỗi tạo SSE connection cho ${region}:`, error);
            this.connectionStatus.set(region, 'error');
        }
    }

    // Xử lý reconnect khi có lỗi
    handleReconnect(region) {
        const attempts = this.reconnectAttempts.get(region) || 0;

        if (attempts < this.maxReconnectAttempts && this.subscribers.has(region)) {
            const delay = this.reconnectDelay * Math.pow(2, attempts); // Exponential backoff

            console.log(`🔄 Reconnect ${region} sau ${delay}ms (lần ${attempts + 1}/${this.maxReconnectAttempts})`);

            setTimeout(() => {
                if (this.subscribers.has(region)) {
                    this.reconnectAttempts.set(region, attempts + 1);
                    this.closeConnection(region);
                    this.createConnection(region);
                }
            }, delay);
        } else {
            console.error(`💀 Max reconnect attempts reached cho ${region}`);
        }
    }

    // Đóng connection cho region
    closeConnection(region) {
        const connection = this.connections.get(region);
        if (connection) {
            try {
                connection.close();
                console.log(`🔌 Đóng SSE connection: ${region}`);
            } catch (error) {
                console.warn(`⚠️ Lỗi đóng connection ${region}:`, error);
            }
            this.connections.delete(region);
            this.connectionStatus.delete(region);
        }
    }

    // Setup auto cleanup khi hết giờ live
    setupAutoCleanup() {
        setInterval(() => {
            Object.keys(this.liveSchedule).forEach(region => {
                if (!this.isRegionLive(region) && this.connections.has(region)) {
                    console.log(`🕐 Auto cleanup: ${region} hết giờ live`);
                    this.closeConnection(region);
                }
            });
        }, 30000); // Check mỗi 30 giây
    }

    // Lấy trạng thái connection
    getConnectionStatus(region) {
        return this.connectionStatus.get(region) || 'disconnected';
    }

    // Lấy số lượng subscribers
    getSubscriberCount(region) {
        const subscribers = this.subscribers.get(region);
        return subscribers ? subscribers.size : 0;
    }

    // Lấy thông tin tổng quan
    getStats() {
        const stats = {};
        Object.keys(this.liveSchedule).forEach(region => {
            stats[region] = {
                isLive: this.isRegionLive(region),
                status: this.getConnectionStatus(region),
                subscribers: this.getSubscriberCount(region),
                hasConnection: this.connections.has(region)
            };
        });

        console.log('📊 SSEManager Stats:', stats);
        return stats;
    }

    // Cleanup tất cả connections (cho cleanup khi page unload)
    cleanup() {
        console.log('🧹 Cleaning up all SSE connections');
        Object.keys(this.liveSchedule).forEach(region => {
            this.closeConnection(region);
        });
        this.subscribers.clear();
        this.connectionStatus.clear();
        this.reconnectAttempts.clear();
    }
}

// Singleton instance
const sseManager = new FrontendSSEManager();

// Auto cleanup khi page unload
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        sseManager.cleanup();
    });
}

export default sseManager; 