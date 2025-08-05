import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import styles from '../../styles/LivekqxsMB.module.css';
import { getFilteredNumber } from "../../library/utils/filterUtils";
import React from 'react';
import { useLottery } from '../../contexts/LotteryContext';

// ✅ CẢI TIẾN: Smart Global Resource Manager
const GlobalResourceManager = {
    connections: new Map(),
    timeouts: new Set(),
    intervals: new Set(),
    eventListeners: new Map(),
    maxConnections: 5, // Giảm từ 10 xuống 5
    maxConnectionsPerProvince: 1, // Giảm từ 2 xuống 1
    memoryThreshold: 800, // ✅ TĂNG: 500MB → 800MB để tránh cleanup quá sớm
    navigationCount: 0,
    lastNavigationTime: 0,
    maxNavigationsPerMinute: 30, // Giới hạn navigation
    lastCleanupTime: 0, // ✅ THÊM: Cleanup cooldown
    cleanupCooldown: 30000, // ✅ THÊM: 30s cooldown

    // ✅ THÊM: Smart memory monitoring với cache
    getMemoryUsage() {
        if (performance && performance.memory) {
            return Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
        }
        return 0;
    },

    // ✅ THÊM: Memory leak detection
    detectMemoryLeak() {
        const memoryUsage = this.getMemoryUsage();
        const now = Date.now();

        if (!this.memoryHistory) {
            this.memoryHistory = [];
        }

        this.memoryHistory.push({ usage: memoryUsage, timestamp: now });

        // Giữ lịch sử 10 phút
        this.memoryHistory = this.memoryHistory.filter(item =>
            now - item.timestamp < 600000
        );

        // Phát hiện memory leak nếu tăng liên tục
        if (this.memoryHistory.length > 5) {
            const recent = this.memoryHistory.slice(-5);
            const isIncreasing = recent.every((item, index) =>
                index === 0 || item.usage >= recent[index - 1].usage
            );

            if (isIncreasing && memoryUsage > 1000) {
                console.warn('⚠️ Memory leak detected:', memoryUsage, 'MB');
                return true;
            }
        }

        return false;
    },

    // ✅ THÊM: Smart aggressive cleanup - không đóng SSE nếu đang live
    aggressiveCleanup() {
        console.log('🧹 Smart aggressive cleanup triggered');
        console.log(`🔍 Cleanup Debug - Current hour: ${new Date().getHours()}, Memory: ${this.getMemoryUsage()}MB, Connections: ${this.connections.size}, Threshold: ${this.memoryThreshold}MB`);

        // ✅ SỬA: Kiểm tra cooldown trước khi cleanup
        const now = Date.now();
        if (now - this.lastCleanupTime < this.cleanupCooldown) {
            console.log(`🔄 Cleanup cooldown active (${Math.round((this.cleanupCooldown - (now - this.lastCleanupTime)) / 1000)}s remaining), bỏ qua`);
            return;
        }

        // ✅ SỬA: Kiểm tra live window và memory trước khi cleanup
        const currentTime = new Date();
        const currentHour = currentTime.getHours();
        const isLiveHour = currentHour === 18;
        const memoryUsage = this.getMemoryUsage();

        if (isLiveHour) {
            console.log('🔄 Đang trong live window, bỏ qua SSE cleanup');
            return; // Không cleanup nếu đang live
        }

        // ✅ THÊM: Chỉ cleanup khi memory thực sự cao
        if (memoryUsage < 800) {
            console.log(`🔄 Memory thấp (${memoryUsage}MB), bỏ qua cleanup`);
            return;
        }

        // ✅ THÊM: Update cleanup time
        this.lastCleanupTime = now;

        // Cleanup connections chỉ khi không phải live window
        this.connections.forEach((connection, key) => {
            if (connection && connection.readyState !== EventSource.CLOSED) {
                try {
                    connection.close();
                } catch (error) {
                    console.warn('Force cleanup connection:', error);
                }
            }
        });

        this.connections.clear();

        // Cleanup timeouts
        this.timeouts.forEach(timeoutId => {
            clearTimeout(timeoutId);
        });
        this.timeouts.clear();

        // Cleanup intervals
        this.intervals.forEach(intervalId => {
            clearInterval(intervalId);
        });
        this.intervals.clear();

        // Cleanup event listeners
        this.eventListeners.forEach((listener, element) => {
            try {
                element.removeEventListener(listener.type, listener.handler);
            } catch (error) {
                console.warn('Force cleanup event listener:', error);
            }
        });
        this.eventListeners.clear();

        // Force garbage collection nếu memory cao
        if (this.getMemoryUsage() > this.memoryThreshold) {
            if (window.gc) window.gc();
        }
    },

    // ✅ THÊM: Safe timeout creation
    safeSetTimeout(callback, delay) {
        const timeoutId = setTimeout(() => {
            this.timeouts.delete(timeoutId);
            callback();
        }, delay);
        this.timeouts.add(timeoutId);
        return timeoutId;
    },

    // ✅ THÊM: Safe interval creation
    safeSetInterval(callback, delay) {
        const intervalId = setInterval(callback, delay);
        this.intervals.add(intervalId);
        return intervalId;
    },

    // ✅ THÊM: Safe connection creation
    safeCreateConnection(url, province) {
        // ✅ SỬA: Kiểm tra live window trước khi cleanup
        const now = new Date();
        const currentHour = now.getHours();
        const isLiveHour = currentHour === 18;

        // Check memory usage first
        if (this.getMemoryUsage() > this.memoryThreshold) {
            console.warn('Memory usage cao, triggering cleanup');
            // ✅ SỬA: Chỉ cleanup nếu không phải live window
            if (!isLiveHour) {
                this.aggressiveCleanup();
            } else {
                console.log('🔄 Đang trong live window, bỏ qua memory cleanup');
            }
        }

        // Check connection limits
        if (this.connections.size >= this.maxConnections) {
            console.warn(`Quá nhiều connections (${this.connections.size}/${this.maxConnections}), bỏ qua tạo connection mới`);
            return null; // ✅ SỬA: Bỏ qua thay vì cleanup
        }

        const connectionsForProvince = this.getConnectionsForProvince(province);
        if (connectionsForProvince >= this.maxConnectionsPerProvince) {
            console.warn(`Quá nhiều connections cho ${province}, bỏ qua`);
            return null;
        }

        const connection = new EventSource(url);
        const globalConnectionId = Date.now() + Math.random();

        this.connections.set(globalConnectionId, connection);
        return { connection, connectionId: globalConnectionId };
    },

    // ✅ THÊM: Navigation guard
    canNavigate() {
        const now = Date.now();

        if (now - this.lastNavigationTime > 60000) {
            this.navigationCount = 0;
        }

        if (this.navigationCount >= this.maxNavigationsPerMinute) {
            console.warn('Navigation limit reached');
            return false;
        }

        this.lastNavigationTime = now;
        this.navigationCount++;
        return true;
    },

    getConnectionsForProvince(province) {
        let count = 0;
        this.connections.forEach((connection, key) => {
            if (key.includes(province)) {
                count++;
            }
        });
        return count;
    },

    cleanup() {
        // ✅ SỬA: Chỉ cleanup nếu không phải live window
        const now = new Date();
        const currentHour = now.getHours();
        const isLiveHour = currentHour === 18;

        if (!isLiveHour) {
            this.aggressiveCleanup();
        } else {
            console.log('🔄 Đang trong live window, bỏ qua cleanup');
        }
    },

    cleanupOldConnections() {
        const now = Date.now();
        const connectionsToRemove = [];

        this.connections.forEach((connection, key) => {
            if (connection.lastActivity && (now - connection.lastActivity) > 300000) {
                connectionsToRemove.push(key);
            }
        });

        connectionsToRemove.forEach(key => {
            const connection = this.connections.get(key);
            if (connection && connection.readyState !== EventSource.CLOSED) {
                try {
                    connection.close();
                } catch (error) {
                    console.warn('Cleanup old connection:', error);
                }
            }
            this.connections.delete(key);
        });
    }
};

// ✅ THÊM: Initialize global manager
if (typeof window !== 'undefined') {
    // Cleanup khi page unload
    window.addEventListener('beforeunload', () => {
        GlobalResourceManager.cleanup();
    });

    // ✅ THÊM: Cleanup khi page visibility change
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // Chỉ cleanup khi memory cao
            const memoryUsage = GlobalResourceManager.getMemoryUsage();
            if (memoryUsage > 1000) {
                GlobalResourceManager.cleanup();
            }
        }
    });

    // Memory monitoring mỗi 300 giây - Tăng interval để giảm frequency
    GlobalResourceManager.safeSetInterval(() => {
        const memoryUsage = GlobalResourceManager.getMemoryUsage();
        if (memoryUsage > GlobalResourceManager.memoryThreshold) {
            console.warn(`Memory usage cao: ${memoryUsage}MB, triggering cleanup`);
            // ✅ SỬA: Chỉ cleanup khi thực sự cần thiết và không phải live window
            const now = new Date();
            const currentHour = now.getHours();
            const isLiveHour = currentHour === 18;

            if (memoryUsage > 2000 && !isLiveHour) { // ✅ TĂNG: 1000MB → 2000MB
                console.log('🧹 Triggering cleanup due to high memory usage');
                GlobalResourceManager.aggressiveCleanup();
            } else if (isLiveHour) {
                console.log('🔄 Đang trong live window, bỏ qua memory cleanup');
            }
        }
    }, 300000); // ✅ TĂNG: 120s → 300s

    // Cleanup định kỳ mỗi 30 giây
    GlobalResourceManager.safeSetInterval(() => {
        GlobalResourceManager.cleanupOldConnections();
    }, 30000);

    // Page visibility handling với debounce
    let visibilityTimeout = null;
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // ✅ SỬA: Debounce để tránh trigger quá nhiều
            if (visibilityTimeout) {
                clearTimeout(visibilityTimeout);
            }

            visibilityTimeout = setTimeout(() => {
                const memoryUsage = GlobalResourceManager.getMemoryUsage();
                const now = new Date();
                const currentHour = now.getHours();
                const isLiveHour = currentHour === 18;

                if (memoryUsage > 1000 && !isLiveHour) { // ✅ THÊM: Memory check
                    console.log(`🧹 Page hidden, triggering cleanup (Memory: ${memoryUsage}MB)`);
                    GlobalResourceManager.aggressiveCleanup();
                } else if (isLiveHour) {
                    console.log('🔄 Page hidden trong live window, bỏ qua cleanup');
                } else {
                    console.log(`🔄 Page hidden, memory thấp (${memoryUsage}MB), bỏ qua cleanup`);
                }
            }, 2000); // ✅ THÊM: Delay 2s để tránh spam
        } else {
            // Page visible - clear timeout
            if (visibilityTimeout) {
                clearTimeout(visibilityTimeout);
                visibilityTimeout = null;
            }
        }
    });
}

// ✅ CẢI TIẾN: Performance monitoring
const performanceMonitor = {
    startTime: Date.now(),
    metrics: {
        sseConnections: 0,
        batchUpdates: 0,
        localStorageOps: 0,
        animations: 0,
        memoryUsage: 0,
        errors: 0
    },
    log: (metric, value = 1) => {
        if (process.env.NODE_ENV === 'development') {
            performanceMonitor.metrics[metric] += value;
            if (performanceMonitor.metrics[metric] % 10 === 0) {
                console.log(`📊 Performance XSMB - ${metric}: ${performanceMonitor.metrics[metric]}`);
            }
        }
    }
};

// ✅ THÊM: Error Boundary cho production
const handleError = (error, errorInfo) => {
    console.error('❌ LiveResult Error:', error, errorInfo);
    performanceMonitor.log('errors');

    // Gửi error report trong production
    if (process.env.NODE_ENV === 'production') {
        console.error('Production Error:', {
            message: error.message,
            stack: error.stack,
            componentStack: errorInfo?.componentStack,
            timestamp: new Date().toISOString()
        });
    }
};

// ✅ CẢI TIẾN: Debug log với performance optimization
const debugLog = (message, data = null) => {
    if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 XSMB Debug: ${message}`, data);
    } else if (process.env.NODE_ENV === 'production') {
        // Production logging - chỉ log errors và critical events
        if (message.includes('Error') || message.includes('Failed') || message.includes('Critical') || message.includes('Memory leak')) {
            console.error(`🚨 Production XSMB: ${message}`, data);
        }
    }
};

// ✅ THÊM: Performance optimized logging
const performanceLog = (message, data = null) => {
    if (process.env.NODE_ENV === 'development') {
        console.log(`⚡ Performance: ${message}`, data);
    }
};

// BỔ SUNG: Tối ưu animation performance - di chuyển vào trong component
const LiveResult = React.memo(({ station, getHeadAndTailNumbers = null, handleFilterChange = null, filterTypes = null, isLiveWindow, isModal = false, isForum = false }) => {
    // ✅ THÊM: Enhanced error boundary cho Fast Refresh
    useEffect(() => {
        const handleError = (error) => {
            console.error('❌ LiveResult Error:', error);
            // Reset state khi có lỗi
            if (sseRef.current) {
                try {
                    sseRef.current.close();
                } catch (e) {
                    console.warn('Error closing SSE:', e);
                }
                sseRef.current = null;
            }
            sseSetupRef.current = false;

            // ✅ THÊM: Memory leak detection
            if (GlobalResourceManager.detectMemoryLeak()) {
                console.warn('⚠️ Memory leak detected, triggering cleanup');
                GlobalResourceManager.aggressiveCleanup();
            }
        };

        const handleUnhandledRejection = (event) => {
            console.error('❌ Unhandled Promise Rejection:', event.reason);
            handleError(event.reason);
        };

        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleUnhandledRejection);

        return () => {
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        };
    }, []);
    const [modalFilter, setModalFilter] = useState('all');
    const { xsmbLiveData, setXsmbLiveData, setIsXsmbLiveDataComplete } = useLottery() || { xsmbLiveData: null, setXsmbLiveData: null, setIsXsmbLiveDataComplete: null };
    const [isTodayLoading, setIsTodayLoading] = useState(true);
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const [animatingPrize, setAnimatingPrize] = useState(null);
    const [sseStatus, setSseStatus] = useState('connecting');
    const mountedRef = useRef(false);
    const sseRef = useRef(null);
    const sseSetupRef = useRef(false);
    const updateTimeoutRef = useRef(null);

    // Cache cho initial data để tránh fetch lại mỗi lần mount
    const initialDataCache = useRef(new Map());
    const cacheTimeout = 1 * 60 * 1000;
    const prizeCache = useRef(new Map());
    const prizeCacheTimeout = 20 * 1000;
    const sseConnectionPool = useRef(new Map());
    const sseReconnectDelay = 1000;
    const animationQueueRef = useRef(new Map());
    const animationThrottleRef = useRef(new Map()); // ✅ THÊM: Throttle ref cho animation
    const batchUpdateRef = useRef(new Map());
    const batchTimeoutRef = useRef(null); // ✅ THÊM LẠI: batchTimeoutRef cho XSMB
    const animationTimeoutsRef = useRef(new Map());
    const localStorageRef = useRef(new Map());
    const localStorageTimeoutRef = useRef(null);
    const LIVE_DATA_TTL = 40 * 60 * 1000; // 40 phút như XSMT
    const cleanupIntervalRef = useRef(null);

    // ✅ CẢI TIẾN: Smart connection tracking
    const connectionId = useRef(`${Date.now()}-${Math.random()}`);
    const activeTimeoutsRef = useRef(new Set());
    const cleanupRef = useRef(new Set()); // ✅ THÊM: Centralized cleanup registry

    // ✅ THÊM: Performance monitoring
    const performanceMetrics = useRef({
        animationCount: 0,
        batchUpdateCount: 0,
        memoryUsage: 0,
        lastUpdate: Date.now()
    });

    const currentStation = station || 'xsmb';

    // BỔ SUNG: Helper function để lấy thời gian Việt Nam - TỐI ƯU
    let cachedVietnamTime = null;
    let lastCacheTime = 0;
    const CACHE_TIME_DURATION = 1000; // Cache 1 giây

    const getVietnamTime = () => {
        const now = Date.now();
        if (!cachedVietnamTime || (now - lastCacheTime) > CACHE_TIME_DURATION) {
            cachedVietnamTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
            lastCacheTime = now;
        }
        return cachedVietnamTime;
    };

    const today = getVietnamTime().toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).replace(/\//g, '-');
    const maxRetries = 50;
    const retryInterval = 2000;
    const fetchMaxRetries = 3;
    const fetchRetryInterval = 5000;
    const pollingIntervalMs = 7000;
    const regularPollingIntervalMs = 10000;

    // BỔ SUNG: Pre-calculated prize digits mapping như XSMT
    const prizeDigits = {
        maDB: 2,
        specialPrize_0: 5,
        firstPrize_0: 5,
        secondPrize_0: 5,
        secondPrize_1: 5,
        threePrizes_0: 5,
        threePrizes_1: 5,
        threePrizes_2: 5,
        threePrizes_3: 5,
        threePrizes_4: 5,
        threePrizes_5: 5,
        fourPrizes_0: 4,
        fourPrizes_1: 4,
        fourPrizes_2: 4,
        fourPrizes_3: 4,
        fivePrizes_0: 4,
        fivePrizes_1: 4,
        fivePrizes_2: 4,
        fivePrizes_3: 4,
        fivePrizes_4: 4,
        fivePrizes_5: 4,
        sixPrizes_0: 3,
        sixPrizes_1: 3,
        sixPrizes_2: 3,
        sevenPrizes_0: 2,
        sevenPrizes_1: 2,
        sevenPrizes_2: 2,
        sevenPrizes_3: 2,
    };

    const emptyResult = useMemo(() => ({
        drawDate: today,
        station: currentStation,
        dayOfWeek: getVietnamTime().toLocaleString('vi-VN', { weekday: 'long' }),
        tentinh: "Miền Bắc",
        tinh: "MB",
        year: getVietnamTime().getFullYear(),
        month: getVietnamTime().getMonth() + 1,
        maDB: "...",
        specialPrize_0: "...",
        firstPrize_0: "...",
        secondPrize_0: "...",
        secondPrize_1: "...",
        threePrizes_0: "...",
        threePrizes_1: "...",
        threePrizes_2: "...",
        threePrizes_3: "...",
        threePrizes_4: "...",
        threePrizes_5: "...",
        fourPrizes_0: "...",
        fourPrizes_1: "...",
        fourPrizes_2: "...",
        fourPrizes_3: "...",
        fivePrizes_0: "...",
        fivePrizes_1: "...",
        fivePrizes_2: "...",
        fivePrizes_3: "...",
        fivePrizes_4: "...",
        fivePrizes_5: "...",
        sixPrizes_0: "...",
        sixPrizes_1: "...",
        sixPrizes_2: "...",
        sevenPrizes_0: "...",
        sevenPrizes_1: "...",
        sevenPrizes_2: "...",
        sevenPrizes_3: "...",
        lastUpdated: 0,
    }), [today, currentStation]);

    // BỔ SUNG: Khai báo currentFilter trước khi sử dụng trong useCallback
    const tableKey = today + currentStation;
    const currentFilter = isModal ? modalFilter : (filterTypes && filterTypes[tableKey]) || 'all';

    // BỔ SUNG: Tối ưu expensive calculations với useMemo - FINAL OPTIMIZATION
    const processedLiveData = useMemo(() => {
        if (!xsmbLiveData) return null;

        // Pre-calculate tất cả filtered values một lần
        const filteredPrizes = {};
        const prizeKeys = Object.keys(xsmbLiveData).filter(key =>
            key.includes('Prize') && xsmbLiveData[key] !== '...' && xsmbLiveData[key] !== '***'
        );

        // Batch process tất cả prize values
        prizeKeys.forEach(key => {
            filteredPrizes[key] = getFilteredNumber(xsmbLiveData[key], currentFilter);
        });

        return {
            ...xsmbLiveData,
            filteredPrizes,
            // Pre-calculate completion status
            isComplete: Object.values(xsmbLiveData).every(
                val => typeof val === 'string' && val !== '...' && val !== '***'
            )
        };
    }, [xsmbLiveData, currentFilter]);

    // BỔ SUNG: Debounced localStorage update tối ưu cho 200+ client
    const debouncedLocalStorageUpdate = useCallback((key, value) => {
        localStorageRef.current.set(key, value);

        if (localStorageTimeoutRef.current) {
            clearTimeout(localStorageTimeoutRef.current);
        }

        // Sử dụng requestIdleCallback để tránh blocking main thread
        const scheduleLocalStorageUpdate = () => {
            localStorageRef.current.forEach((value, key) => {
                try {
                    // Thêm timestamp cho liveData
                    const dataWithTimestamp = {
                        data: value,
                        timestamp: Date.now(),
                        ttl: LIVE_DATA_TTL
                    };

                    // Sử dụng try-catch để tránh crash
                    if (typeof localStorage !== 'undefined') {
                        localStorage.setItem(key, JSON.stringify(dataWithTimestamp));
                    }
                } catch (error) {
                    console.error('❌ Lỗi lưu localStorage:', error);
                    // Fallback - clear localStorage nếu đầy
                    if (error.name === 'QuotaExceededError') {
                        try {
                            localStorage.clear();
                        } catch (clearError) {
                            console.error('❌ Không thể clear localStorage:', clearError);
                        }
                    }
                }
            });
            localStorageRef.current.clear();
        };

        // Sử dụng requestIdleCallback nếu có, fallback to setTimeout
        if (typeof requestIdleCallback !== 'undefined') {
            localStorageTimeoutRef.current = requestIdleCallback(scheduleLocalStorageUpdate, { timeout: 100 }); // Giảm timeout
        } else {
            localStorageTimeoutRef.current = setTimeout(scheduleLocalStorageUpdate, 100);
        }
    }, []);

    // BỔ SUNG: Cleanup old localStorage data như XSMT
    const cleanupOldLiveData = useCallback(() => {
        try {
            const now = Date.now();
            const keysToRemove = [];

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('liveData:')) {
                    try {
                        const storedData = localStorage.getItem(key);
                        if (storedData) {
                            const parsed = JSON.parse(storedData);
                            if (parsed.timestamp && (now - parsed.timestamp > LIVE_DATA_TTL)) {
                                keysToRemove.push(key);
                            }
                        }
                    } catch (error) {
                        keysToRemove.push(key);
                    }
                }
            }

            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
                console.log(`🧹 Đã xóa liveData cũ: ${key}`);
            });

            if (keysToRemove.length > 0) {
                console.log(`🧹 Đã cleanup ${keysToRemove.length} liveData entries`);
            }
        } catch (error) {
            console.error('❌ Lỗi cleanup liveData:', error);
        }
    }, []);

    // ✅ TỐI ƯU: Animation với performance monitoring
    const setAnimationWithTimeout = useCallback((prizeType) => {
        if (animationTimeoutsRef.current.has(prizeType)) {
            clearTimeout(animationTimeoutsRef.current.get(prizeType));
        }

        // ✅ TỐI ƯU: Performance logging chỉ trong development
        if (process.env.NODE_ENV === 'development') {
            console.log(`🎬 SSE XSMB - Animation started:`, {
                prizeType: prizeType,
                timestamp: new Date().toLocaleTimeString('vi-VN')
            });
        }

        // ✅ TỐI ƯU: Sử dụng requestIdleCallback thay vì requestAnimationFrame
        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
                if (mountedRef.current) {
                    setAnimatingPrize(prizeType);
                }
            }, { timeout: 1000 });
        } else {
            // Fallback cho browsers không hỗ trợ requestIdleCallback
            requestAnimationFrame(() => {
                if (mountedRef.current) {
                    setAnimatingPrize(prizeType);
                }
            });
        }

        // ✅ TỐI ƯU: Giảm animation duration để tăng performance
        const timeoutId = setTimeout(() => {
            if ('requestIdleCallback' in window) {
                requestIdleCallback(() => {
                    if (mountedRef.current) {
                        setAnimatingPrize(null);
                        if (process.env.NODE_ENV === 'development') {
                            console.log(`🎬 SSE XSMB - Animation ended:`, {
                                prizeType: prizeType,
                                timestamp: new Date().toLocaleTimeString('vi-VN')
                            });
                        }
                    }
                }, { timeout: 1000 });
            } else {
                requestAnimationFrame(() => {
                    if (mountedRef.current) {
                        setAnimatingPrize(null);
                        if (process.env.NODE_ENV === 'development') {
                            console.log(`🎬 SSE XSMB - Animation ended:`, {
                                prizeType: prizeType,
                                timestamp: new Date().toLocaleTimeString('vi-VN')
                            });
                        }
                    }
                });
            }
            animationTimeoutsRef.current.delete(prizeType);
        }, 800); // ✅ TỐI ƯU: Giảm từ 1200ms xuống 800ms

        animationTimeoutsRef.current.set(prizeType, timeoutId);
    }, []);

    // BỔ SUNG: Batch update live data tối ưu cho 200+ client
    const batchUpdateLiveData = useCallback((prizeType, value) => {
        const key = `MB-${prizeType}`;
        batchUpdateRef.current.set(key, { prizeType, value });

        // LOG: Batch update được trigger
        console.log(`📦 SSE XSMB - Batch update triggered:`, {
            prizeType: prizeType,
            value: value,
            timestamp: new Date().toLocaleTimeString('vi-VN'),
            batchSize: batchUpdateRef.current.size
        });

        // Cache prize type riêng lẻ ngay lập tức
        if (value && value !== '...' && value !== '***') {
            const prizeCacheKey = `${currentStation}:MB:${prizeType}`;
            prizeCache.current.set(prizeCacheKey, {
                value: value,
                timestamp: Date.now()
            });
            console.log(`📦 Cached prize ${prizeType} = ${value} cho XSMB`);

            // ✅ TỐI ƯU: Thêm throttle cho animation để tránh quá tải
            const animationKey = `MB-${prizeType}`;
            if (mountedRef.current && value && value !== '...' && value !== '***') {
                // Kiểm tra nếu animation này đã được trigger gần đây
                const lastAnimationTime = animationThrottleRef.current.get(animationKey) || 0;
                const now = Date.now();

                if (now - lastAnimationTime > 1000) { // Throttle 1 giây
                    animationThrottleRef.current.set(animationKey, now);
                    animationQueueRef.current.set(animationKey, { tinh: 'MB', prizeType });
                    console.log(`🎬 Queued animation cho XSMB: ${prizeType} = ${value}`);
                }
            }
        }

        // Clear existing batch timeout để tránh tích lũy
        if (batchTimeoutRef.current) {
            clearTimeout(batchTimeoutRef.current);
            batchTimeoutRef.current = null;
        }

        // ✅ CẢI TIẾN: Safe batch update với React state protection
        const scheduleBatchUpdate = () => {
            if (batchUpdateRef.current.size > 0 && setXsmbLiveData && mountedRef.current) {
                // LOG: Thực hiện batch update
                console.log(`⚡ SSE XSMB - Executing batch update:`, {
                    batchSize: batchUpdateRef.current.size,
                    timestamp: new Date().toLocaleTimeString('vi-VN'),
                    updates: Array.from(batchUpdateRef.current.values()).map(({ prizeType, value }) => ({ prizeType, value }))
                });

                // ✅ SỬA: Optimized batch update để tránh performance issues
                setTimeout(() => {
                    if (!mountedRef.current) return;

                    try {
                        // ✅ TỐI ƯU: Batch state updates để tránh re-render nhiều lần
                        const updates = Array.from(batchUpdateRef.current.values());
                        const updatedData = {};
                        let hasChanges = false;

                        updates.forEach(({ prizeType, value }) => {
                            updatedData[prizeType] = value;
                            hasChanges = true;
                        });

                        if (hasChanges) {
                            setXsmbLiveData(prev => {
                                const newData = { ...prev, ...updatedData, lastUpdated: Date.now() };

                                // Sử dụng debounced localStorage
                                debouncedLocalStorageUpdate(`liveData:${currentStation}:${today}`, newData);

                                // Sử dụng pre-calculated completion status nếu có
                                const isComplete = processedLiveData?.isComplete || Object.values(newData).every(
                                    val => typeof val === 'string' && val !== '...' && val !== '***'
                                );
                                setIsXsmbLiveDataComplete(isComplete);
                                setIsTodayLoading(false);
                                setRetryCount(0);
                                setError(null);

                                return newData;
                            });

                            // ✅ TỐI ƯU: Trigger animations với delay để tránh blocking
                            updates.forEach(({ prizeType, value }, index) => {
                                if (mountedRef.current && value && value !== '...' && value !== '***') {
                                    setTimeout(() => {
                                        if (mountedRef.current) {
                                            setAnimationWithTimeout(prizeType);
                                        }
                                    }, index * 50); // Delay 50ms giữa các animation
                                }
                            });
                        }

                    } catch (error) {
                        console.error('❌ Lỗi batch update:', error);
                    }

                    // Clear batch
                    batchUpdateRef.current.clear();
                }, 100); // ✅ TĂNG: 0ms → 100ms để tránh blocking
            }
        };

        // ✅ SỬA: Sử dụng setTimeout thay vì requestIdleCallback
        batchTimeoutRef.current = setTimeout(scheduleBatchUpdate, 50); // Tăng timeout để tránh conflict
    }, [setXsmbLiveData, debouncedLocalStorageUpdate, currentStation, today, setAnimationWithTimeout, processedLiveData]);

    // BỔ SUNG: Debounced set live data - FINAL OPTIMIZATION
    const debouncedSetLiveData = useCallback((newData) => {
        if (updateTimeoutRef.current) {
            clearTimeout(updateTimeoutRef.current);
        }
        updateTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current && setXsmbLiveData) {
                try {
                    setXsmbLiveData(newData);
                } catch (error) {
                    console.warn('Lỗi set live data:', error);
                }
            }
        }, 25); // Giảm timeout tối đa cho realtime
    }, [setXsmbLiveData]);

    // ✅ CẢI TIẾN: Smart memory monitoring với GlobalResourceManager
    useEffect(() => {
        // Memory monitoring đã được handle bởi GlobalResourceManager
        // Chỉ thêm component-specific monitoring nếu cần

        const componentMemoryCheck = GlobalResourceManager.safeSetInterval(() => {
            const memoryUsage = GlobalResourceManager.getMemoryUsage();
            // ✅ SỬA: Chỉ check khi memory thực sự cao
            if (memoryUsage > 1500) { // ✅ TĂNG: 800MB → 1500MB để tránh cleanup quá sớm
                console.warn(`⚠️ Component memory usage cao: ${memoryUsage}MB`);
                // ✅ SỬA: Chỉ trigger cleanup khi thực sự cần thiết
                if (memoryUsage > 2000) { // ✅ TĂNG: 1000MB → 2000MB
                    console.log('🧹 Triggering aggressive cleanup due to high memory usage');
                    GlobalResourceManager.aggressiveCleanup();
                }
            }
        }, 300000); // ✅ TĂNG: 120s → 300s để giảm frequency

        // Add to cleanup registry
        cleanupRef.current.add(() => {
            clearInterval(componentMemoryCheck);
        });

        return () => {
            clearInterval(componentMemoryCheck);
        };
    }, []);

    // BỔ SUNG: Tối ưu cleanup function để tránh vòng lặp vô hạn
    useEffect(() => {
        mountedRef.current = true;

        cleanupIntervalRef.current = setInterval(cleanupOldLiveData, 10 * 60 * 1000);

        return () => {
            mountedRef.current = false;

            // ✅ CẢI TIẾN: Execute all cleanup functions from registry
            cleanupRef.current.forEach(cleanupFn => {
                try {
                    cleanupFn();
                } catch (error) {
                    console.warn('Cleanup error:', error);
                }
            });
            cleanupRef.current.clear();

            // ✅ CẢI TIẾN: Smart SSE cleanup với reconnection logic
            if (sseRef.current) {
                const currentConnectionId = connectionId.current;
                GlobalResourceManager.connections.delete(currentConnectionId);

                if (sseRef.current.readyState !== EventSource.CLOSED) {
                    try {
                        sseRef.current.close();
                    } catch (error) {
                        console.warn('SSE connection cleanup error:', error);
                    }
                }
                sseRef.current = null;
            }

            // ✅ THÊM: Auto-reconnection logic
            if (isLiveWindow && mountedRef.current) {
                console.log('🔄 Auto-reconnecting SSE after cleanup...');
                setTimeout(() => {
                    if (mountedRef.current && !sseRef.current) {
                        connectSSE();
                    }
                }, 2000); // Reconnect sau 2 giây
            }

            // ✅ CẢI TIẾN: Use GlobalResourceManager for timeout cleanup
            if (updateTimeoutRef.current) {
                clearTimeout(updateTimeoutRef.current);
                updateTimeoutRef.current = null;
            }

            if (localStorageTimeoutRef.current) {
                clearTimeout(localStorageTimeoutRef.current);
                localStorageTimeoutRef.current = null;
            }

            if (batchTimeoutRef.current) {
                clearTimeout(batchTimeoutRef.current);
                batchTimeoutRef.current = null;
            }

            // ✅ CẢI TIẾN: Aggressive animation cleanup
            animationTimeoutsRef.current.forEach((timeoutId) => {
                clearTimeout(timeoutId);
            });
            animationTimeoutsRef.current.clear();

            // ✅ CẢI TIẾN: Clear all refs immediately
            batchUpdateRef.current.clear();
            sseConnectionPool.current.clear();
            animationQueueRef.current.clear();
            animationThrottleRef.current.clear();
            localStorageRef.current.clear();

            // ✅ CẢI TIẾN: Smart cache cleanup
            const now = Date.now();
            for (const [key, value] of prizeCache.current.entries()) {
                if (now - value.timestamp > prizeCacheTimeout) {
                    prizeCache.current.delete(key);
                }
            }

            for (const [key, value] of initialDataCache.current.entries()) {
                if (now - value.timestamp > cacheTimeout) {
                    initialDataCache.current.delete(key);
                }
            }

            if (cleanupIntervalRef.current) {
                clearInterval(cleanupIntervalRef.current);
                cleanupIntervalRef.current = null;
            }

            // Reset setup flag
            sseSetupRef.current = false;
        };
    }, [isLiveWindow, currentStation, today]);

    useEffect(() => {
        if (!setXsmbLiveData || !setIsXsmbLiveDataComplete) return;

        let pollingInterval;

        const fetchInitialData = async (retry = 0) => {
            try {
                const cacheKey = `${currentStation}:${today}`;
                const cachedData = initialDataCache.current.get(cacheKey);

                // Kiểm tra nếu đang trong giờ live (18h-18h59)
                const vietnamTime = getVietnamTime();
                const currentHour = vietnamTime.getHours();
                const isLiveHour = currentHour === 18;

                // Clear cache nếu đã qua giờ live (19h trở đi)
                if (currentHour >= 19) {
                    console.log('🕐 Đã qua giờ live, clear cache để lấy dữ liệu mới');
                    initialDataCache.current.clear();
                    localStorage.removeItem(`liveData:${currentStation}:${today}`);
                }

                if (cachedData && Date.now() - cachedData.timestamp < cacheTimeout) {
                    if (mountedRef.current) {
                        setXsmbLiveData(cachedData.data);
                        setIsXsmbLiveDataComplete(false);
                        setIsTodayLoading(false);
                        setError(null);
                    }
                    return;
                }

                // Nếu không phải giờ live và đang ở modal, gọi API cache
                if (!isLiveHour && currentStation === 'xsmb' && isModal) {
                    console.log('🕐 Không phải giờ live XSMB và đang ở modal, gọi API cache...');
                    // Không gửi ngày hiện tại, chỉ lấy bản mới nhất
                    const response = await fetch(`https://backendkqxs-1.onrender.com/api/kqxs/xsmb/latest`);
                    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                    const serverData = await response.json();

                    if (mountedRef.current) {
                        // Sử dụng ngày từ dữ liệu thực tế thay vì ngày hiện tại
                        const formatDate = (dateString) => {
                            if (!dateString) return today;
                            try {
                                const date = new Date(dateString);
                                return date.toLocaleDateString('vi-VN');
                            } catch (error) {
                                console.error('Lỗi format ngày:', error);
                                return today;
                            }
                        };

                        const dataWithCorrectDate = {
                            ...serverData,
                            // Đảm bảo hiển thị đúng ngày từ dữ liệu MongoDB
                            drawDate: formatDate(serverData.drawDate),
                            dayOfWeek: serverData.dayOfWeek || 'Chủ nhật'
                        };

                        setXsmbLiveData(dataWithCorrectDate);
                        setIsXsmbLiveDataComplete(true);
                        setIsTodayLoading(false);
                        setRetryCount(0);
                        setError(null);

                        // Cache dữ liệu
                        initialDataCache.current.set(cacheKey, {
                            data: dataWithCorrectDate,
                            timestamp: Date.now()
                        });
                    }
                    return;
                }

                // Trang chính luôn sử dụng SSE, không gọi API cache
                if (!isModal) {
                    console.log('🔄 Trang chính XSMB, sử dụng SSE...');
                }

                // Modal trong giờ live cũng sử dụng SSE như trang chính
                if (isModal && isLiveHour) {
                    console.log('🔄 Modal XSMB trong giờ live, sử dụng SSE...');
                    // Clear cache để đảm bảo lấy dữ liệu mới nhất
                    initialDataCache.current.clear();
                    localStorage.removeItem(`liveData:${currentStation}:${today}`);

                    // Sử dụng SSE trực tiếp như XSMT
                    console.log('🔄 Modal XSMB trong giờ live, kết nối SSE trực tiếp...');
                }

                // Tiếp tục với SSE cho cả trang chính và modal trong giờ live
                console.log('🔄 Tiếp tục với SSE cho XSMB...');

                const response = await fetch(`https://backendkqxs-1.onrender.com/api/kqxs/xsmb/sse/initial?station=${currentStation}&date=${today}`);
                if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                const serverData = await response.json();

                const cachedLiveData = localStorage.getItem(`liveData:${currentStation}:${today}`);
                let initialData = cachedLiveData ? JSON.parse(cachedLiveData) : { ...emptyResult };

                if (mountedRef.current) {
                    const updatedData = { ...initialData };
                    let shouldUpdate = !initialData.lastUpdated || serverData.lastUpdated > initialData.lastUpdated;
                    for (const key in serverData) {
                        if (serverData[key] !== '...' || !updatedData[key] || updatedData[key] === '...' || updatedData[key] === '***') {
                            updatedData[key] = serverData[key];
                            shouldUpdate = true;
                        }
                    }
                    if (shouldUpdate) {
                        updatedData.lastUpdated = serverData.lastUpdated || Date.now();
                        setXsmbLiveData(updatedData);
                        debouncedLocalStorageUpdate(`liveData:${currentStation}:${today}`, updatedData);

                        initialDataCache.current.set(cacheKey, {
                            data: updatedData,
                            timestamp: Date.now()
                        });

                        const isComplete = Object.values(updatedData).every(
                            val => typeof val === 'string' && val !== '...' && val !== '***'
                        );
                        setIsXsmbLiveDataComplete(isComplete);
                        setIsTodayLoading(false);
                        setRetryCount(0);
                        setError(null);
                    } else {
                        setXsmbLiveData(initialData);
                        setIsXsmbLiveDataComplete(false);
                        setIsTodayLoading(false);
                    }
                }
            } catch (error) {
                console.error(`Lỗi khi lấy dữ liệu khởi tạo XSMB (lần ${retry + 1}):`, error.message);
                if (retry < fetchMaxRetries) {
                    setTimeout(() => {
                        if (mountedRef.current) {
                            fetchInitialData(retry + 1);
                        }
                    }, fetchRetryInterval);
                } else {
                    if (mountedRef.current) {
                        setError(`Không thể kết nối đến server. Vui lòng thử lại sau.`);
                        setIsTodayLoading(false);
                    }
                }
            }
        };

        const connectSSE = () => {
            // Kiểm tra nếu component đã unmount
            if (!mountedRef.current) {
                return;
            }

            if (!currentStation || !today || !/^\d{2}-\d{2}-\d{4}$/.test(today)) {
                if (mountedRef.current) {
                    setError('Dữ liệu đang tải...');
                    setIsTodayLoading(false);
                }
                return;
            }

            // Kiểm tra nếu đã thiết lập SSE rồi - TRÁNH VÒNG LẶP VÔ HẠN
            if (sseSetupRef.current) {
                console.log('⚠️ SSE đã được thiết lập, bỏ qua');
                return;
            }

            // ✅ THÊM: Protection để tránh setup quá nhiều
            if (sseRef.current && sseRef.current.readyState !== EventSource.CLOSED) {
                console.log('⚠️ SSE connection đang hoạt động, bỏ qua setup');
                return;
            }

            // ✅ CẢI TIẾN: Simplified SSE connection management
            const sseUrl = `https://backendkqxs-1.onrender.com/api/kqxs/xsmb/sse?station=${currentStation}&date=${today}`;
            console.log(`🔌 SSE XSMB - Attempting connection to: ${sseUrl}`);
            console.log(`🔍 Connection Debug - Setup: ${sseSetupRef.current}, Mounted: ${mountedRef.current}, Pool Size: ${sseConnectionPool.current.size}`);
            console.log(`🔌 Tạo SSE connection cho XSMB:`, sseUrl);

            // Kiểm tra nếu đang trong Fast Refresh
            if (typeof window !== 'undefined' && window.__NEXT_DATA__?.buildId !== window.__NEXT_DATA__?.buildId) {
                console.log('🔄 Fast Refresh detected, bỏ qua SSE setup');
                return;
            }

            // ✅ THÊM: Protection cho Fast Refresh
            if (typeof window !== 'undefined' && window.location.href.includes('?fast-refresh')) {
                console.log('🔄 Fast Refresh URL detected, bỏ qua SSE setup');
                return;
            }

            // Kiểm tra nếu không phải giờ live cho XSMB (chỉ áp dụng cho modal)
            const vietnamTime = getVietnamTime();
            const currentHour = vietnamTime.getHours();
            const isLiveHour = currentHour === 18;

            // Chỉ kiểm tra giờ live cho modal, trang chính luôn kết nối SSE
            if (!isLiveHour && currentStation === 'xsmb' && isModal) {
                console.log('🕐 Không phải giờ live XSMB và đang ở modal, bỏ qua SSE setup');
                return;
            }

            // Modal trong giờ live cũng kết nối SSE
            if (isModal && isLiveHour) {
                console.log('🔄 Modal XSMB trong giờ live, kết nối SSE...');
            }

            console.log('✅ Bắt đầu thiết lập SSE cho XSMB');
            sseSetupRef.current = true;

            // Reset animation state khi bắt đầu SSE setup
            setAnimatingPrize(null);
            console.log('🔄 Reset animation state cho SSE setup');

            const connectionKey = `${currentStation}:${today}:${connectionId.current}`;

            // ✅ THÊM: Kiểm tra connection pool sau khi khai báo connectionKey
            if (sseConnectionPool.current.has(connectionKey)) {
                const existingConnection = sseConnectionPool.current.get(connectionKey);
                if (existingConnection && existingConnection.readyState !== EventSource.CLOSED) {
                    console.log('⚠️ SSE connection trong pool đang hoạt động, bỏ qua setup');
                    return;
                }
            }

            // Cleanup connection cũ trước khi tạo mới
            if (sseRef.current) {
                try {
                    sseRef.current.close();
                } catch (error) {
                    console.warn('Lỗi đóng SSE connection cũ:', error);
                }
                sseRef.current = null;
            }

            // Cleanup từ global manager và pool
            const currentConnectionId = connectionId.current;
            if (GlobalResourceManager.connections.has(currentConnectionId)) {
                const existingConnection = GlobalResourceManager.connections.get(currentConnectionId);
                if (existingConnection) {
                    try {
                        existingConnection.close();
                    } catch (error) {
                        console.warn('Lỗi đóng global connection:', error);
                    }
                    GlobalResourceManager.connections.delete(currentConnectionId);
                }
            }

            if (sseConnectionPool.current.has(connectionKey)) {
                const existingConnection = sseConnectionPool.current.get(connectionKey);
                if (existingConnection) {
                    try {
                        existingConnection.close();
                    } catch (error) {
                        console.warn('Lỗi đóng pool connection:', error);
                    }
                    sseConnectionPool.current.delete(connectionKey);
                }
            }

            try {
                const newConnection = new EventSource(sseUrl);
                sseRef.current = newConnection;

                // Thêm vào global manager với timestamp
                newConnection.lastActivity = Date.now();
                GlobalResourceManager.connections.set(currentConnectionId, newConnection);
                sseConnectionPool.current.set(connectionKey, newConnection);

                setSseStatus('connecting');

                newConnection.onopen = () => {
                    newConnection.lastActivity = Date.now();
                    setSseStatus('connected');
                    // LOG: SSE connection đã mở
                    console.log(`🔌 SSE XSMB - Connection opened:`, {
                        timestamp: new Date().toLocaleTimeString('vi-VN'),
                        connectionKey: connectionKey,
                        readyState: newConnection.readyState
                    });
                    if (mountedRef.current) {
                        setError(null);
                        setRetryCount(0);
                    }
                };

                newConnection.onclose = () => {
                    console.log(`🔌 SSE XSMB - Connection closed:`, {
                        timestamp: new Date().toLocaleTimeString('vi-VN'),
                        connectionKey: connectionKey,
                        readyState: newConnection.readyState
                    });
                };

                // ✅ THÊM: Connection health check với logic thông minh hơn
                const healthCheck = setInterval(() => {
                    // ✅ SỬA: Kiểm tra connection state chi tiết hơn
                    if (newConnection.readyState === EventSource.CLOSED) {
                        console.warn('⚠️ SSE connection đã đóng, thử reconnect...');
                        console.log(`🔍 Connection Debug - State: ${newConnection.readyState}, URL: ${sseUrl}, Mounted: ${mountedRef.current}`);

                        clearInterval(healthCheck);

                        // ✅ SỬA: Chỉ reconnect nếu component vẫn mounted và có thể tạo connection mới
                        if (mountedRef.current && !sseSetupRef.current) {
                            const now = new Date();
                            const currentHour = now.getHours();
                            const isLiveHour = currentHour === 18;

                            if (isLiveHour) {
                                console.log('🔄 Đang trong live window, thử reconnect SSE...');
                                setTimeout(() => {
                                    if (mountedRef.current && !sseSetupRef.current) {
                                        sseSetupRef.current = false; // Reset setup flag
                                        connectSSE();
                                    }
                                }, 2000); // Delay 2s trước khi reconnect
                            } else {
                                console.log('🔄 Không phải live window, bỏ qua reconnect');
                            }
                        } else {
                            console.log('🔄 Component unmounted hoặc đang setup, bỏ qua reconnect');
                        }
                    } else if (newConnection.readyState === EventSource.OPEN) {
                        newConnection.lastActivity = Date.now();
                        // ✅ GIẢM: Chỉ log khi có vấn đề để tránh spam
                    } else {
                        // CONNECTING state
                        console.log(`🔍 SSE Health Check - Connecting state: ${newConnection.readyState}`);
                    }
                }, 60000); // ✅ TĂNG: 30s → 60s để giảm frequency

                // Add health check to cleanup
                cleanupRef.current.add(() => {
                    clearInterval(healthCheck);
                });

                newConnection.onerror = (error) => {
                    setSseStatus('error');
                    // LOG: SSE connection error
                    console.log(`❌ SSE XSMB - Connection error:`, {
                        timestamp: new Date().toLocaleTimeString('vi-VN'),
                        retryCount: retryCount,
                        maxRetries: maxRetries,
                        error: error,
                        connectionState: newConnection.readyState,
                        url: sseUrl
                    });

                    if (mountedRef.current) {
                        setError('Đang kết nối lại SSE...');
                    }

                    // Cleanup connection với timeout để tránh treo
                    setTimeout(() => {
                        if (sseRef.current) {
                            try {
                                sseRef.current.close();
                            } catch (error) {
                                console.warn('Lỗi đóng SSE connection:', error);
                            }
                            sseRef.current = null;
                        }

                        GlobalResourceManager.connections.delete(currentConnectionId);
                        sseConnectionPool.current.delete(connectionKey);
                    }, 100);

                    // ✅ THÊM: Smart retry logic với exponential backoff
                    if (retryCount < maxRetries && mountedRef.current) {
                        const retryDelay = Math.min(sseReconnectDelay * Math.pow(2, retryCount), 10000); // Max 10s
                        const retryTimeoutId = setTimeout(() => {
                            if (mountedRef.current) {
                                setRetryCount(prev => prev + 1);
                                console.log(`🔄 SSE XSMB - Retry connection (${retryCount + 1}/${maxRetries}) với delay ${retryDelay}ms`);
                                connectSSE();
                            }
                        }, retryDelay);

                        activeTimeoutsRef.current.add(retryTimeoutId);
                    } else if (mountedRef.current) {
                        console.log(`💀 SSE XSMB - Max retries reached, giving up`);
                        setError('Mất kết nối SSE, vui lòng refresh trang...');
                    }
                };

                const prizeTypes = [
                    'maDB', 'specialPrize_0', 'firstPrize_0', 'secondPrize_0', 'secondPrize_1',
                    'threePrizes_0', 'threePrizes_1', 'threePrizes_2', 'threePrizes_3', 'threePrizes_4', 'threePrizes_5',
                    'fourPrizes_0', 'fourPrizes_1', 'fourPrizes_2', 'fourPrizes_3',
                    'fivePrizes_0', 'fivePrizes_1', 'fivePrizes_2', 'fivePrizes_3', 'fivePrizes_4', 'fivePrizes_5',
                    'sixPrizes_0', 'sixPrizes_1', 'sixPrizes_2',
                    'sevenPrizes_0', 'sevenPrizes_1', 'sevenPrizes_2', 'sevenPrizes_3',
                ];

                prizeTypes.forEach(prizeType => {
                    newConnection.addEventListener(prizeType, (event) => {
                        try {
                            const data = JSON.parse(event.data);
                            if (data && data[prizeType] && mountedRef.current) {
                                // LOG: Nhận kết quả riêng lẻ realtime
                                console.log(`🎯 SSE XSMB - Nhận ${prizeType}:`, {
                                    value: data[prizeType],
                                    timestamp: new Date().toLocaleTimeString('vi-VN'),
                                    isLive: data[prizeType] !== '...' && data[prizeType] !== '***',
                                    connectionState: newConnection.readyState
                                });

                                batchUpdateLiveData(prizeType, data[prizeType]);

                                if (data[prizeType] !== '...' && data[prizeType] !== '***') {
                                    console.log(`🎬 SSE XSMB - Bắt đầu animation cho ${prizeType}:`, data[prizeType]);
                                    setAnimationWithTimeout(prizeType);
                                }
                            }
                        } catch (error) {
                            console.error(`❌ Lỗi xử lý sự kiện ${prizeType}:`, error);
                        }
                    });
                });

                newConnection.addEventListener('full', (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (data && mountedRef.current) {
                            // LOG: Nhận kết quả đầy đủ
                            console.log(`📊 SSE XSMB - Nhận kết quả đầy đủ:`, {
                                timestamp: new Date().toLocaleTimeString('vi-VN'),
                                dataKeys: Object.keys(data).filter(key => key.includes('Prize')),
                                totalPrizes: Object.keys(data).filter(key => key.includes('Prize')).length
                            });

                            batchUpdateLiveData('full', data);
                            setIsTodayLoading(false);
                            setRetryCount(0);
                            setError(null);
                        }
                    } catch (error) {
                        console.error(`❌ Lỗi xử lý sự kiện full:`, error);
                    }
                });

                newConnection.addEventListener('canary', (event) => {
                    // LOG: Canary message để kiểm tra kết nối
                    console.log(`🔄 SSE XSMB - Canary message:`, {
                        timestamp: new Date().toLocaleTimeString('vi-VN'),
                        connectionStatus: 'active'
                    });
                });
            } catch (error) {
                console.error(`❌ Lỗi tạo SSE cho XSMB:`, error);
                setSseStatus('error');
            }
        };

        // Loại bỏ polling - chỉ sử dụng SSE
        console.log('🚫 Đã loại bỏ polling, chỉ sử dụng SSE');

        // Thêm delay để tránh vòng lặp
        setTimeout(() => {
            if (mountedRef.current) {
                fetchInitialData();
                connectSSE();
            }
        }, 100);

        return () => {
            // Clear timeout nếu có
            if (updateTimeoutRef.current) {
                clearTimeout(updateTimeoutRef.current);
                updateTimeoutRef.current = null;
            }

            // Clear localStorage timeout
            if (localStorageTimeoutRef.current) {
                clearTimeout(localStorageTimeoutRef.current);
                localStorageTimeoutRef.current = null;
            }

            // Clear batch update timeout
            if (batchTimeoutRef.current) {
                clearTimeout(batchTimeoutRef.current);
                batchTimeoutRef.current = null;
            }

            // ✅ TỐI ƯU: Enhanced animation timeouts cleanup
            animationTimeoutsRef.current.forEach((timeoutId) => {
                try {
                    clearTimeout(timeoutId);
                } catch (error) {
                    console.warn('Error clearing animation timeout:', error);
                }
            });
            animationTimeoutsRef.current.clear();

            // ✅ THÊM: Clear animation queue và throttle
            animationQueueRef.current.clear();
            animationThrottleRef.current.clear();

            // Clear batch update ref
            batchUpdateRef.current.clear();

            // Clear prize cache cũ (giữ cache mới để tái sử dụng)
            const now = Date.now();
            for (const [key, value] of prizeCache.current.entries()) {
                if (now - value.timestamp > prizeCacheTimeout) {
                    prizeCache.current.delete(key);
                }
            }

            // Clear initial data cache cũ (giữ cache mới để tái sử dụng)
            for (const [key, value] of initialDataCache.current.entries()) {
                if (now - value.timestamp > cacheTimeout) {
                    initialDataCache.current.delete(key);
                }
            }

            // Đóng tất cả SSE connections - TRÁNH VÒNG LẶP
            if (sseRef.current) {
                try {
                    sseRef.current.close();
                } catch (error) {
                    console.warn('Lỗi đóng SSE connection trong cleanup:', error);
                }
                sseRef.current = null;
            }

            // Clear connection pool
            sseConnectionPool.current.clear();

            // Reset setup flag để tránh vòng lặp
            sseSetupRef.current = false;
        };
    }, [isLiveWindow, currentStation, today, setXsmbLiveData, setIsXsmbLiveDataComplete, debouncedLocalStorageUpdate, isModal]);

    useEffect(() => {
        if (!xsmbLiveData) {
            setAnimatingPrize(null);
            return;
        }

        const animationQueue = [
            'firstPrize_0',
            'secondPrize_0', 'secondPrize_1',
            'threePrizes_0', 'threePrizes_1', 'threePrizes_2', 'threePrizes_3', 'threePrizes_4', 'threePrizes_5',
            'fourPrizes_0', 'fourPrizes_1', 'fourPrizes_2', 'fourPrizes_3',
            'fivePrizes_0', 'fivePrizes_1', 'fivePrizes_2', 'fivePrizes_3', 'fivePrizes_4', 'fivePrizes_5',
            'sixPrizes_0', 'sixPrizes_1', 'sixPrizes_2',
            'sevenPrizes_0', 'sevenPrizes_1', 'sevenPrizes_2', 'sevenPrizes_3',
            'specialPrize_0',
        ];

        const findNextAnimatingPrize = () => {
            for (const prize of animationQueue) {
                if (xsmbLiveData[prize] === '...') {
                    return prize;
                }
            }
            return null;
        };

        if (!animatingPrize || xsmbLiveData[animatingPrize] !== '...') {
            const nextPrize = findNextAnimatingPrize();
            setAnimatingPrize(nextPrize);
        }

        // Process animation queue với requestAnimationFrame để tối ưu performance
        if (animationQueueRef.current.size > 0) {
            // ✅ TỐI ƯU: Giới hạn số lượng animation đồng thời để tránh overflow
            const maxAnimationsPerFrame = 5; // Giới hạn 5 animation mỗi frame
            const animationArray = Array.from(animationQueueRef.current.entries());

            // Chỉ xử lý tối đa maxAnimationsPerFrame animation mỗi frame
            const animationsToProcess = animationArray.slice(0, maxAnimationsPerFrame);

            requestAnimationFrame(() => {
                animationsToProcess.forEach(([key, { tinh, prizeType }]) => {
                    if (mountedRef.current) {
                        setAnimatingPrize({ tinh, prizeType });
                        animationQueueRef.current.delete(key);

                        // Reset animation sau 2 giây
                        setTimeout(() => {
                            if (mountedRef.current) {
                                setAnimatingPrize(null);
                            }
                        }, 2000);
                    }
                });
            });
        }
    }, [xsmbLiveData, animatingPrize]);

    if (!xsmbLiveData) {
        return <div className={styles.error}>Đang tải dữ liệu...</div>;
    }

    const getPrizeNumbers = () => {
        const lastTwoNumbers = [];
        const addNumber = (num) => {
            if (num && num !== '...' && num !== '***' && /^\d+$/.test(num)) {
                const last2 = num.slice(-2).padStart(2, '0');
                lastTwoNumbers.push(last2);
            }
        };

        addNumber(xsmbLiveData.maDB);
        addNumber(xsmbLiveData.specialPrize_0);
        addNumber(xsmbLiveData.firstPrize_0);
        for (let i = 0; i < 2; i++) addNumber(xsmbLiveData[`secondPrize_${i}`]);
        for (let i = 0; i < 6; i++) addNumber(xsmbLiveData[`threePrizes_${i}`]);
        for (let i = 0; i < 4; i++) addNumber(xsmbLiveData[`fourPrizes_${i}`]);
        for (let i = 0; i < 6; i++) addNumber(xsmbLiveData[`fivePrizes_${i}`]);
        for (let i = 0; i < 3; i++) addNumber(xsmbLiveData[`sixPrizes_${i}`]);
        for (let i = 0; i < 4; i++) addNumber(xsmbLiveData[`sevenPrizes_${i}`]);

        const heads = Array(10).fill().map(() => []);
        const tails = Array(10).fill().map(() => []);

        lastTwoNumbers.forEach((last2) => {
            if (last2.length === 2) {
                const head = parseInt(last2[0], 10);
                const tail = parseInt(last2[1], 10);
                if (!isNaN(head) && !isNaN(tail)) {
                    heads[head].push(last2);
                    tails[tail].push(last2);
                }
            }
        });

        return { heads, tails };
    };

    // BỔ SUNG: Tối ưu modal layout với useMemo
    const modalLayout = useMemo(() => {
        if (!isModal) return null;

        return {
            shouldShowModal: isModal,
            modalFilter,
            setModalFilter,
            tableKey,
            currentFilter: modalFilter
        };
    }, [isModal, modalFilter, tableKey]);

    // BỔ SUNG: Tối ưu prize rendering với useMemo
    const prizeRenderingData = useMemo(() => {
        if (!xsmbLiveData) return null;

        return {
            heads: getPrizeNumbers().heads,
            tails: getPrizeNumbers().tails,
            sevenPrizes: [
                getFilteredNumber(xsmbLiveData.sevenPrizes_0 || '...', 'last2'),
                getFilteredNumber(xsmbLiveData.sevenPrizes_1 || '...', 'last2'),
                getFilteredNumber(xsmbLiveData.sevenPrizes_2 || '...', 'last2'),
                getFilteredNumber(xsmbLiveData.sevenPrizes_3 || '...', 'last2'),
            ].filter(num => num && num !== '...' && num !== '***'),
            specialPrize: getFilteredNumber(xsmbLiveData.specialPrize_0 || '...', 'last2')
        };
    }, [xsmbLiveData]);

    // Sử dụng dữ liệu đã được memoize
    const { heads, tails } = prizeRenderingData ? prizeRenderingData : { heads: [], tails: [] };
    const sevenPrizes = prizeRenderingData ? prizeRenderingData.sevenPrizes : [];
    const specialPrize = prizeRenderingData ? prizeRenderingData.specialPrize : '';

    // BỔ SUNG: renderPrizeValue tối ưu - FINAL VERSION
    const renderPrizeValue = useCallback((prizeType, digits = 5) => {
        const isAnimating = animatingPrize === prizeType && xsmbLiveData[prizeType] === '...';
        const className = `${styles.running_number} ${styles[`running_${digits}`]}`;

        // Sử dụng pre-calculated filtered value nếu có
        const filteredValue = processedLiveData?.filteredPrizes?.[prizeType] || getFilteredNumber(xsmbLiveData[prizeType], currentFilter);

        let displayDigits = digits;
        if (currentFilter === 'last2') {
            displayDigits = 2;
        } else if (currentFilter === 'last3') {
            displayDigits = Math.min(digits, 3);
        }

        const isSpecialOrEighth = prizeType === 'specialPrize_0' || prizeType === 'maDB';

        // Tối ưu rendering với memoization
        const digitElements = useMemo(() => {
            if (isAnimating) {
                return Array.from({ length: displayDigits }).map((_, i) => (
                    <span key={i} className={styles.digit} data-status="animating" data-index={i}></span>
                ));
            } else if (xsmbLiveData[prizeType] === '...') {
                return <span className={styles.ellipsis}></span>;
            } else {
                return filteredValue
                    .padStart(displayDigits, '0')
                    .split('')
                    .map((digit, i) => (
                        <span key={i} className={`${styles.digit12} ${isSpecialOrEighth ? styles.highlight1 : ''}`} data-status="static" data-index={i}>
                            {digit}
                        </span>
                    ));
            }
        }, [isAnimating, displayDigits, xsmbLiveData, prizeType, filteredValue, isSpecialOrEighth]);

        return (
            <span className={`${className} ${isSpecialOrEighth ? styles.highlight : ''}`} data-status={isAnimating ? 'animating' : 'static'}>
                {isAnimating ? (
                    <span className={styles.digit_container}>
                        {digitElements}
                    </span>
                ) : xsmbLiveData[prizeType] === '...' ? (
                    digitElements
                ) : (
                    <span className={styles.digit_container}>
                        {digitElements}
                    </span>
                )}
            </span>
        );
    }, [animatingPrize, xsmbLiveData, processedLiveData, currentFilter]);

    return (
        <div className={styles.live}>
            {error && <div className={styles.error}>{error}</div>}
            {isTodayLoading && (
                <div className={styles.loading}>Đang chờ kết quả ngày {today}...</div>
            )}
            {sseStatus === 'error' && (
                <div className={styles.warning}>⚠️ Kết nối không ổn định, đang sử dụng polling...</div>
            )}

            {/* Layout mới cho modal XSMB */}
            {isModal ? (
                <div className={styles.modalLayout}>
                    {/* Bảng kết quả XSMB - thiết kế mới */}
                    <div className={styles.kqxsModal}>
                        <div className={styles.modalHeader}>
                            <div className={styles.modalTructiep}>
                                {/* Luôn hiển thị trạng thái static, không có hiệu ứng live */}
                                <span className={styles.modalKqxsTitle1Static}>
                                    Kết quả Xổ số Miền Bắc
                                </span>
                            </div>
                            <h1 className={styles.modalKqxsTitle}>
                                XSMB - Kết quả Xổ số Miền Bắc - SXMB
                            </h1>
                            <div className={styles.modalKqxsAction}>
                                <a className={styles.modalKqxsActionLink} href="#!">{xsmbLiveData.station}</a>
                                <a className={`${styles.modalKqxsActionLink} ${styles.dayOfWeek}`} href="#!">{xsmbLiveData.dayOfWeek}</a>
                                <a className={styles.modalKqxsActionLink} href="#!">{xsmbLiveData.drawDate}</a>
                                <a className={styles.modalKqxsActionLink} href="#!"> ({xsmbLiveData.tentinh})</a>
                            </div>
                        </div>

                        {/* Bảng kết quả với thiết kế mới */}
                        <div className={styles.compactTable}>
                            <table className={styles.modalTable}>
                                <tbody>
                                    <tr>
                                        <td className={styles.modalPrizeLabel}>Mã DB</td>
                                        <td>
                                            <div className={styles.modalPrizeContainer}>
                                                <span className={styles.modalPrizeNumber}>
                                                    {xsmbLiveData.maDB === '...' ? <span className={styles.ellipsis}></span> : xsmbLiveData.maDB}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={styles.modalPrizeLabel}>ĐB</td>
                                        <td>
                                            <div className={styles.modalPrizeContainer}>
                                                <span className={`${styles.modalPrizeNumber} ${styles.special}`}>
                                                    {renderPrizeValue('specialPrize_0', 5)}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={styles.modalPrizeLabel}>G1</td>
                                        <td>
                                            <div className={styles.modalPrizeContainer}>
                                                <span className={styles.modalPrizeNumber}>
                                                    {renderPrizeValue('firstPrize_0', 5)}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={styles.modalPrizeLabel}>G2</td>
                                        <td>
                                            <div className={styles.modalPrizeContainer}>
                                                {[0, 1].map(i => (
                                                    <span key={i} className={styles.modalPrizeNumber} style={{ marginRight: '8px' }}>
                                                        {renderPrizeValue(`secondPrize_${i}`, 5)}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={styles.modalPrizeLabel}>G3</td>
                                        <td>
                                            <div className={styles.modalPrizeContainer}>
                                                {[0, 1, 2, 3, 4, 5].map(i => (
                                                    <span key={i} className={styles.modalPrizeNumber} style={{ marginRight: '8px' }}>
                                                        {renderPrizeValue(`threePrizes_${i}`, 5)}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={styles.modalPrizeLabel}>G4</td>
                                        <td>
                                            <div className={styles.modalPrizeContainer}>
                                                {[0, 1, 2, 3].map(i => (
                                                    <span key={i} className={styles.modalPrizeNumber} style={{ marginRight: '8px' }}>
                                                        {renderPrizeValue(`fourPrizes_${i}`, 4)}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={styles.modalPrizeLabel}>G5</td>
                                        <td>
                                            <div className={styles.modalPrizeContainer}>
                                                {[0, 1, 2, 3, 4, 5].map(i => (
                                                    <span key={i} className={styles.modalPrizeNumber} style={{ marginRight: '8px' }}>
                                                        {renderPrizeValue(`fivePrizes_${i}`, 4)}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={styles.modalPrizeLabel}>G6</td>
                                        <td>
                                            <div className={styles.modalPrizeContainer}>
                                                {[0, 1, 2].map(i => (
                                                    <span key={i} className={styles.modalPrizeNumber} style={{ marginRight: '8px' }}>
                                                        {renderPrizeValue(`sixPrizes_${i}`, 3)}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={styles.modalPrizeLabel}>G7</td>
                                        <td>
                                            <div className={styles.modalPrizeContainer}>
                                                {[0, 1, 2, 3].map(i => (
                                                    <span key={i} className={`${styles.modalPrizeNumber} ${styles.special}`} style={{ marginRight: '8px' }}>
                                                        {renderPrizeValue(`sevenPrizes_${i}`, 2)}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Nút lọc số với thiết kế mới */}
                        <div className={styles.modalAction}>
                            <div aria-label="Tùy chọn lọc số" className={styles.modalFilterOptions} role="radiogroup">
                                <div className={styles.modalOptionInput}>
                                    <input
                                        id={`modalFilterAll-${tableKey}`}
                                        type="radio"
                                        name={`modalFilterOption-${tableKey}`}
                                        value="all"
                                        checked={modalFilter === 'all'}
                                        onChange={() => setModalFilter('all')}
                                    />
                                    <label htmlFor={`modalFilterAll-${tableKey}`}>Đầy Đủ</label>
                                </div>
                                <div className={styles.modalOptionInput}>
                                    <input
                                        id={`modalFilterTwo-${tableKey}`}
                                        type="radio"
                                        name={`modalFilterOption-${tableKey}`}
                                        value="last2"
                                        checked={modalFilter === 'last2'}
                                        onChange={() => setModalFilter('last2')}
                                    />
                                    <label htmlFor={`modalFilterTwo-${tableKey}`}>2 Số Đuôi</label>
                                </div>
                                <div className={styles.modalOptionInput}>
                                    <input
                                        id={`modalFilterThree-${tableKey}`}
                                        type="radio"
                                        name={`modalFilterOption-${tableKey}`}
                                        value="last3"
                                        checked={modalFilter === 'last3'}
                                        onChange={() => setModalFilter('last3')}
                                    />
                                    <label htmlFor={`modalFilterThree-${tableKey}`}>3 Số Đuôi</label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bảng thống kê đầu đuôi với thiết kế mới */}
                    <div className={styles.modalSidebar}>
                        <div className={styles.modalStatsTablesContainer}>
                            {/* Bảng đầu */}
                            <div className={styles.modalStatsTableWrapper}>
                                <div className={styles.modalStatsTableHeader}>Đầu</div>
                                <div className={styles.modalStatsTableContent}>
                                    {Array.from({ length: 10 }, (_, i) => (
                                        <div key={`head-${i}`} className={styles.modalStatsTableRow}>
                                            <div className={styles.modalStatsNumber}>{i}</div>
                                            <div className={styles.modalStatsNumbers}>
                                                {heads && heads[i] && heads[i].length > 0 ? (
                                                    heads[i].map((num, idx) => (
                                                        <span
                                                            key={idx}
                                                            className={`${styles.modalStatsPrize} ${sevenPrizes.includes(num) || num === specialPrize ? styles.special : ''
                                                                }`}
                                                        >
                                                            {num}
                                                            {idx < heads[i].length - 1 && ', '}
                                                        </span>
                                                    ))
                                                ) : '-'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Bảng đuôi */}
                            <div className={styles.modalStatsTableWrapper}>
                                <div className={styles.modalStatsTableHeader}>Đuôi</div>
                                <div className={styles.modalStatsTableContent}>
                                    {Array.from({ length: 10 }, (_, i) => (
                                        <div key={`tail-${i}`} className={styles.modalStatsTableRow}>
                                            <div className={styles.modalStatsNumber}>{i}</div>
                                            <div className={styles.modalStatsNumbers}>
                                                {tails && tails[i] && tails[i].length > 0 ? (
                                                    tails[i].map((num, idx) => (
                                                        <span
                                                            key={idx}
                                                            className={`${styles.modalStatsPrize} ${sevenPrizes.includes(num) || num === specialPrize ? styles.special : ''
                                                                }`}
                                                        >
                                                            {num}
                                                            {idx < tails[i].length - 1 && ', '}
                                                        </span>
                                                    ))
                                                ) : '-'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* Layout cũ cho trang chính */
                <div className={styles.kqxs}>
                    <div className={styles.header}>
                        <div className={styles.tructiep}><span className={styles.kqxs__title1}>Tường thuật trực tiếp...</span></div>
                        <h1 className={styles.kqxs__title}>
                            XSMB - Kết quả Xổ số Miền Bắc - SXMB
                        </h1>
                        <div className={styles.kqxs__action}>
                            <a className={styles.kqxs__actionLink} href="#!">{xsmbLiveData.station}</a>
                            <a className={`${styles.kqxs__actionLink} ${styles.dayOfWeek}`} href="#!">{xsmbLiveData.dayOfWeek}</a>
                            <a className={styles.kqxs__actionLink} href="#!">{xsmbLiveData.drawDate}</a>
                            <a className={styles.kqxs__actionLink} href="#!"> ({xsmbLiveData.tentinh})</a>
                        </div>
                    </div>
                    <table className={styles.tableXS}>
                        <tbody>
                            <tr>
                                <td className={`${styles.code} ${styles.rowXS}`}>
                                    <span className={styles.span0}>
                                        {xsmbLiveData.maDB === '...' ? <span className={styles.ellipsis}></span> : xsmbLiveData.maDB}
                                    </span>
                                </td>
                            </tr>
                            <tr>
                                <td className={`${styles.tdTitle} ${styles.highlight}`}>ĐB</td>
                                <td className={styles.rowXS}>
                                    <span className={`${styles.span1} ${styles.highlight} ${styles.gdb}`}>
                                        {renderPrizeValue('specialPrize_0', 5)}
                                    </span>
                                </td>
                            </tr>
                            <tr>
                                <td className={styles.tdTitle}>G1</td>
                                <td className={styles.rowXS}>
                                    <span className={styles.span1}>
                                        {renderPrizeValue('firstPrize_0', 5)}
                                    </span>
                                </td>
                            </tr>
                            <tr>
                                <td className={styles.tdTitle}>G2</td>
                                <td className={styles.rowXS}>
                                    {[0, 1].map(i => (
                                        <span key={i} className={styles.span2}>
                                            {renderPrizeValue(`secondPrize_${i}`, 5)}
                                        </span>
                                    ))}
                                </td>
                            </tr>
                            <tr>
                                <td className={`${styles.tdTitle} ${styles.g3}`}>G3</td>
                                <td className={styles.rowXS}>
                                    {[0, 1, 2].map(i => (
                                        <span key={i} className={`${styles.span3} ${styles.g3}`}>
                                            {renderPrizeValue(`threePrizes_${i}`, 5)}
                                        </span>
                                    ))}
                                </td>
                            </tr>
                            <tr>
                                <td className={styles.tdTitle}></td>
                                <td className={styles.rowXS}>
                                    {[3, 4, 5].map(i => (
                                        <span key={i} className={styles.span3}>
                                            {renderPrizeValue(`threePrizes_${i}`, 5)}
                                        </span>
                                    ))}
                                </td>
                            </tr>
                            <tr>
                                <td className={styles.tdTitle}>G4</td>
                                <td className={styles.rowXS}>
                                    {[0, 1, 2, 3].map(i => (
                                        <span key={i} className={styles.span4}>
                                            {renderPrizeValue(`fourPrizes_${i}`, 4)}
                                        </span>
                                    ))}
                                </td>
                            </tr>
                            <tr>
                                <td className={`${styles.tdTitle} ${styles.g3}`}>G5</td>
                                <td className={styles.rowXS}>
                                    {[0, 1, 2].map(i => (
                                        <span key={i} className={`${styles.span3} ${styles.g3}`}>
                                            {renderPrizeValue(`fivePrizes_${i}`, 4)}
                                        </span>
                                    ))}
                                </td>
                            </tr>
                            <tr>
                                <td className={styles.tdTitle}></td>
                                <td className={styles.rowXS}>
                                    {[3, 4, 5].map(i => (
                                        <span key={i} className={styles.span3}>
                                            {renderPrizeValue(`fivePrizes_${i}`, 4)}
                                        </span>
                                    ))}
                                </td>
                            </tr>
                            <tr>
                                <td className={styles.tdTitle}>G6</td>
                                <td className={styles.rowXS}>
                                    {[0, 1, 2].map(i => (
                                        <span key={i} className={styles.span3}>
                                            {renderPrizeValue(`sixPrizes_${i}`, 3)}
                                        </span>
                                    ))}
                                </td>
                            </tr>
                            <tr>
                                <td className={styles.tdTitle}>G7</td>
                                <td className={styles.rowXS}>
                                    {[0, 1, 2, 3].map(i => (
                                        <span key={i} className={`${styles.span4} ${styles.highlight}`}>
                                            {renderPrizeValue(`sevenPrizes_${i}`, 2)}
                                        </span>
                                    ))}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <div className={styles.action}>
                        <div aria-label="Tùy chọn lọc số" className={styles.filter__options} role="radiogroup">
                            <div className={styles.optionInput}>
                                <input
                                    id={`filterAll-${tableKey}`}
                                    type="radio"
                                    name={`filterOption-${tableKey}`}
                                    value="all"
                                    checked={currentFilter === 'all'}
                                    onChange={() => handleFilterChange(tableKey, 'all')}
                                />
                                <label htmlFor={`filterAll-${tableKey}`}>Đầy Đủ</label>
                            </div>
                            <div className={styles.optionInput}>
                                <input
                                    id={`filterTwo-${tableKey}`}
                                    type="radio"
                                    name={`filterOption-${tableKey}`}
                                    value="last2"
                                    checked={currentFilter === 'last2'}
                                    onChange={() => handleFilterChange(tableKey, 'last2')}
                                />
                                <label htmlFor={`filterTwo-${tableKey}`}>2 Số Đuôi</label>
                            </div>
                            <div className={styles.optionInput}>
                                <input
                                    id={`filterThree-${tableKey}`}
                                    type="radio"
                                    name={`filterOption-${tableKey}`}
                                    value="last3"
                                    checked={currentFilter === 'last3'}
                                    onChange={() => handleFilterChange(tableKey, 'last3')}
                                />
                                <label htmlFor={`filterThree-${tableKey}`}>3 Số Đuôi</label>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bảng thống kê cho trang chính */}
            {!isModal && (
                <div className={styles.TKe_content}>
                    <div className={styles.TKe_contentTitle}>
                        <span className={styles.title}>Bảng Lô Tô - </span>
                        <span className={styles.desc}>{xsmbLiveData.tentinh}</span>
                        <span className={styles.dayOfWeek}>{`${xsmbLiveData.dayOfWeek} - `}</span>
                        <span className={styles.desc}>{xsmbLiveData.drawDate}</span>
                    </div>
                    <table className={styles.tableKey}>
                        <tbody>
                            <tr>
                                <td className={styles.t_h}>Đầu</td>
                                <td>Lô tô</td>
                                <td className={styles.t_h}>Đuôi</td>
                                <td>Lô tô</td>
                            </tr>
                            {Array.from({ length: 10 }, (_, index) => (
                                <tr key={index}>
                                    <td className={styles.t_h}>{index}</td>
                                    <td>
                                        {heads && heads[index] && heads[index].length > 0 ? (
                                            heads[index].map((num, idx) => (
                                                <span
                                                    key={idx}
                                                    className={
                                                        sevenPrizes.includes(num) || num === specialPrize
                                                            ? styles.highlight1
                                                            : ''
                                                    }
                                                >
                                                    {num}
                                                </span>
                                            )).reduce((prev, curr, i) => [prev, i ? ', ' : '', curr], [])
                                        ) : '-'}
                                    </td>
                                    <td className={styles.t_h}>{index}</td>
                                    <td>
                                        {tails && tails[index] && tails[index].length > 0 ? (
                                            tails[index].map((num, idx) => (
                                                <span
                                                    key={idx}
                                                    className={
                                                        sevenPrizes.includes(num) || num === specialPrize
                                                            ? styles.highlight1
                                                            : ''
                                                    }
                                                >
                                                    {num}
                                                </span>
                                            )).reduce((prev, curr, i) => [prev, i ? ', ' : '', curr], [])
                                        ) : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
});

export async function getServerSideProps(context) {
    const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).replace(/\//g, '-');
    return {
        props: {
            station: 'xsmb',
            today,
            isLiveWindow: isWithinLiveWindow(),
            filterTypes: {},
            getHeadAndTailNumbers: null,
            handleFilterChange: null,
        },
    };
}

function isWithinLiveWindow() {
    const vietTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    const hours = vietTime.getHours();
    const minutes = vietTime.getMinutes();
    return (hours === 18 && minutes >= 10 && minutes <= 33);
}

export default React.memo(LiveResult);