import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import styles from '../../styles/LivekqxsMB.module.css';
import { getFilteredNumber } from "../../library/utils/filterUtils";
import React from 'react';
import { useLottery } from '../../contexts/LotteryContext';

// BỔ SUNG: Global SSE connection manager để tránh memory leak và treo trình duyệt
const globalSSEManager = {
    connections: new Map(),
    maxConnections: 10, // ✅ GIẢM từ 15 xuống 10 để tránh quá tải
    maxConnectionsPerProvince: 2, // ✅ THÊM giới hạn cho mỗi tỉnh
    cleanup: () => {
        globalSSEManager.connections.forEach((connection, key) => {
            if (connection && connection.readyState !== EventSource.CLOSED) {
                try {
                    connection.close();
                } catch (error) {
                    console.warn('Lỗi đóng global SSE connection:', error);
                }
            }
        });
        globalSSEManager.connections.clear();
    },
    // Thêm method để kiểm tra và cleanup connection cũ
    cleanupOldConnections: () => {
        const now = Date.now();
        const connectionsToRemove = [];

        globalSSEManager.connections.forEach((connection, key) => {
            if (connection.lastActivity && (now - connection.lastActivity) > 300000) { // 5 phút
                connectionsToRemove.push(key);
            }
        });

        connectionsToRemove.forEach(key => {
            const connection = globalSSEManager.connections.get(key);
            if (connection && connection.readyState !== EventSource.CLOSED) {
                try {
                    connection.close();
                } catch (error) {
                    console.warn('Lỗi đóng old SSE connection:', error);
                }
            }
            globalSSEManager.connections.delete(key);
        });
    },
    // ✅ THÊM: Method để đếm connections cho một tỉnh cụ thể
    getConnectionsForProvince: (province) => {
        let count = 0;
        globalSSEManager.connections.forEach((connection, key) => {
            if (key.includes(province)) {
                count++;
            }
        });
        return count;
    }
};

// Cleanup global connections khi page unload
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        globalSSEManager.cleanup();
    });

    // Cleanup định kỳ để tránh memory leak
    setInterval(() => {
        globalSSEManager.cleanupOldConnections();
    }, 60000); // Mỗi phút
}

// BỔ SUNG: Performance monitoring để theo dõi hiệu suất
const performanceMonitor = {
    startTime: Date.now(),
    metrics: {
        sseConnections: 0,
        batchUpdates: 0,
        localStorageOps: 0,
        animations: 0,
        memoryUsage: 0
    },
    log: (metric, value = 1) => {
        if (process.env.NODE_ENV === 'development') {
            performanceMonitor.metrics[metric] += value;
            if (performanceMonitor.metrics[metric] % 10 === 0) {
                debugLog(`📊 Performance XSMB - ${metric}: ${performanceMonitor.metrics[metric]}`);
            }
        }
    }
};

// BỔ SUNG: Tối ưu console.log - chỉ log quan trọng
const debugLog = (message, data = null) => {
    if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 XSMB Debug: ${message}`, data);
    }
};

// BỔ SUNG: Debug logger cho từng vấn đề cụ thể
const debugLogger = {
    // Vấn đề 1: Context State Corruption
    contextState: (action, data) => {
        console.log(`🔍 [CONTEXT_STATE] ${action}:`, {
            timestamp: new Date().toLocaleTimeString('vi-VN'),
            data: data,
            dataType: typeof data,
            isArray: Array.isArray(data),
            length: Array.isArray(data) ? data.length : null
        });
    },

    // Vấn đề 2: Batch Update Queue
    batchQueue: (action, data) => {
        console.log(`🔍 [BATCH_QUEUE] ${action}:`, {
            timestamp: new Date().toLocaleTimeString('vi-VN'),
            queueSize: data?.queueSize || 0,
            updates: data?.updates || [],
            memoryUsage: data?.memoryUsage || 'N/A'
        });
    },

    // Vấn đề 3: SSE Connection Pool
    sseConnection: (action, data) => {
        console.log(`🔍 [SSE_CONNECTION] ${action}:`, {
            timestamp: new Date().toLocaleTimeString('vi-VN'),
            totalConnections: data?.totalConnections || 0,
            maxConnections: data?.maxConnections || 10,
            provinceConnections: data?.provinceConnections || 0,
            connectionKey: data?.connectionKey || 'N/A'
        });
    },

    // Vấn đề 4: Memory Pressure
    memoryPressure: (action, data) => {
        console.log(`🔍 [MEMORY_PRESSURE] ${action}:`, {
            timestamp: new Date().toLocaleTimeString('vi-VN'),
            usedMB: data?.usedMB || 0,
            totalMB: data?.totalMB || 0,
            percentage: data?.percentage || 0
        });
    },

    // Vấn đề 5: Race Condition
    raceCondition: (action, data) => {
        console.log(`🔍 [RACE_CONDITION] ${action}:`, {
            timestamp: new Date().toLocaleTimeString('vi-VN'),
            componentMounted: data?.mounted || false,
            prevState: data?.prevState || 'N/A',
            newState: data?.newState || 'N/A',
            updateSource: data?.source || 'N/A'
        });
    },

    // Vấn đề 6: Component Lifecycle
    lifecycle: (action, data) => {
        console.log(`🔍 [LIFECYCLE] ${action}:`, {
            timestamp: new Date().toLocaleTimeString('vi-VN'),
            componentId: data?.componentId || 'N/A',
            phase: data?.phase || 'N/A',
            duration: data?.duration || 0
        });
    },

    // BỔ SUNG: Vấn đề 7: Reload Pattern Detection
    reloadPattern: (action, data) => {
        console.log(`🔍 [RELOAD_PATTERN] ${action}:`, {
            timestamp: new Date().toLocaleTimeString('vi-VN'),
            reloadCount: data?.reloadCount || 0,
            timeSinceLastReload: data?.timeSinceLastReload || 0,
            componentId: data?.componentId || 'N/A',
            isRapidReload: data?.isRapidReload || false
        });
    },

    // BỔ SUNG: Vấn đề 8: State Update Timing
    stateTiming: (action, data) => {
        console.log(`🔍 [STATE_TIMING] ${action}:`, {
            timestamp: new Date().toLocaleTimeString('vi-VN'),
            updateDuration: data?.updateDuration || 0,
            isBlocking: data?.isBlocking || false,
            queueLength: data?.queueLength || 0,
            source: data?.source || 'N/A'
        });
    },

    // BỔ SUNG: Vấn đề 9: Error Boundary
    errorBoundary: (action, data) => {
        console.log(`🔍 [ERROR_BOUNDARY] ${action}:`, {
            timestamp: new Date().toLocaleTimeString('vi-VN'),
            error: data?.error || 'N/A',
            errorStack: data?.errorStack || 'N/A',
            componentStack: data?.componentStack || 'N/A',
            isRecoverable: data?.isRecoverable || false
        });
    },

    // BỔ SUNG: Vấn đề 10: Performance Metrics
    performance: (action, data) => {
        console.log(`🔍 [PERFORMANCE] ${action}:`, {
            timestamp: new Date().toLocaleTimeString('vi-VN'),
            renderTime: data?.renderTime || 0,
            updateTime: data?.updateTime || 0,
            memoryDelta: data?.memoryDelta || 0,
            fps: data?.fps || 0
        });
    }
};

// BỔ SUNG: Tối ưu animation performance - di chuyển vào trong component
const LiveResult = React.memo(({ station, getHeadAndTailNumbers = null, handleFilterChange = null, filterTypes = null, isLiveWindow, isModal = false, isForum = false }) => {
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

    // BỔ SUNG: Connection tracking để tránh memory leak
    const connectionId = useRef(`${Date.now()}-${Math.random()}`);
    const activeTimeoutsRef = useRef(new Set());

    // BỔ SUNG: Reload pattern detection
    const reloadTrackerRef = useRef({
        lastReloadTime: Date.now(),
        reloadCount: 0,
        isRapidReload: false
    });

    // BỔ SUNG: State update timing
    const stateUpdateTrackerRef = useRef({
        lastUpdateTime: Date.now(),
        updateCount: 0,
        averageUpdateTime: 0
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

    // BỔ SUNG: Animation với requestAnimationFrame như XSMT
    // BỔ SUNG: Tối ưu animation performance cho 200+ client
    const setAnimationWithTimeout = useCallback((prizeType) => {
        if (animationTimeoutsRef.current.has(prizeType)) {
            clearTimeout(animationTimeoutsRef.current.get(prizeType));
        }

        // LOG: Bắt đầu animation
        console.log(`🎬 SSE XSMB - Animation started:`, {
            prizeType: prizeType,
            timestamp: new Date().toLocaleTimeString('vi-VN')
        });

        // Sử dụng requestAnimationFrame để đảm bảo smooth cho nhiều client
        requestAnimationFrame(() => {
            if (mountedRef.current) {
                setAnimatingPrize(prizeType);
            }
        });

        // Giảm timeout để tối ưu performance
        const timeoutId = setTimeout(() => {
            requestAnimationFrame(() => {
                if (mountedRef.current) {
                    setAnimatingPrize(null);
                    // LOG: Kết thúc animation
                    console.log(`🎬 SSE XSMB - Animation ended:`, {
                        prizeType: prizeType,
                        timestamp: new Date().toLocaleTimeString('vi-VN')
                    });
                }
            });
            animationTimeoutsRef.current.delete(prizeType);
        }, 1200); // Giảm từ 2000ms xuống 1200ms

        animationTimeoutsRef.current.set(prizeType, timeoutId);
    }, []);

    // BỔ SUNG: Batch update live data tối ưu cho 200+ client
    const batchUpdateLiveData = useCallback((prizeType, value) => {
        const key = `MB-${prizeType}`;
        batchUpdateRef.current.set(key, { prizeType, value });

        // BỔ SUNG: Debug Batch Queue
        debugLogger.batchQueue('UPDATE_ADDED', {
            queueSize: batchUpdateRef.current.size,
            updates: Array.from(batchUpdateRef.current.values()),
            memoryUsage: typeof performance !== 'undefined' && performance.memory ?
                Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) : 'N/A'
        });

        // Cache prize type riêng lẻ ngay lập tức
        if (value && value !== '...' && value !== '***') {
            const prizeCacheKey = `${currentStation}:MB:${prizeType}`;
            prizeCache.current.set(prizeCacheKey, {
                value: value,
                timestamp: Date.now()
            });

            // ✅ TỐI ƯU: Thêm throttle cho animation để tránh quá tải
            const animationKey = `MB-${prizeType}`;
            if (mountedRef.current && value && value !== '...' && value !== '***') {
                // Kiểm tra nếu animation này đã được trigger gần đây
                const lastAnimationTime = animationThrottleRef.current.get(animationKey) || 0;
                const now = Date.now();

                if (now - lastAnimationTime > 1000) { // Throttle 1 giây
                    animationThrottleRef.current.set(animationKey, now);
                    animationQueueRef.current.set(animationKey, { tinh: 'MB', prizeType });
                }
            }
        }

        // Clear existing batch timeout để tránh tích lũy
        if (batchTimeoutRef.current) {
            clearTimeout(batchTimeoutRef.current);
            batchTimeoutRef.current = null;
        }

        // Sử dụng requestIdleCallback để tránh blocking main thread
        const scheduleBatchUpdate = () => {
            if (batchUpdateRef.current.size > 0 && setXsmbLiveData && mountedRef.current) {
                const updateStartTime = Date.now();

                // BỔ SUNG: Debug State Update Timing
                debugLogger.stateTiming('BATCH_UPDATE_START', {
                    updateDuration: 0,
                    isBlocking: false,
                    queueLength: batchUpdateRef.current.size,
                    source: 'batchUpdate'
                });

                // BỔ SUNG: Debug Batch Queue Execution
                debugLogger.batchQueue('EXECUTING_BATCH', {
                    queueSize: batchUpdateRef.current.size,
                    updates: Array.from(batchUpdateRef.current.values()),
                    memoryUsage: typeof performance !== 'undefined' && performance.memory ?
                        Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) : 'N/A'
                });

                // Sử dụng requestAnimationFrame để đảm bảo smooth UI
                requestAnimationFrame(() => {
                    if (!mountedRef.current) return;

                    setXsmbLiveData(prev => {
                        const updateEndTime = Date.now();
                        const updateDuration = updateEndTime - updateStartTime;

                        // BỔ SUNG: Debug State Update Timing
                        debugLogger.stateTiming('STATE_UPDATE_COMPLETE', {
                            updateDuration: updateDuration,
                            isBlocking: updateDuration > 16, // > 16ms = blocking
                            queueLength: batchUpdateRef.current.size,
                            source: 'batchUpdate'
                        });

                        // BỔ SUNG: Debug Race Condition
                        debugLogger.raceCondition('STATE_UPDATE', {
                            mounted: mountedRef.current,
                            prevState: prev,
                            newState: { ...prev, [prizeType]: value },
                            source: 'batchUpdate'
                        });

                        const updatedData = { ...prev };
                        let hasChanges = false;

                        batchUpdateRef.current.forEach(({ prizeType: updatePrizeType, value: updateValue }) => {
                            updatedData[updatePrizeType] = updateValue;
                            hasChanges = true;

                            // Trigger animation cho dữ liệu mới nếu component đang mounted
                            if (mountedRef.current && updateValue && updateValue !== '...' && updateValue !== '***') {
                                setAnimationWithTimeout(updatePrizeType);
                            }
                        });

                        if (hasChanges) {
                            updatedData.lastUpdated = Date.now();
                            // Sử dụng debounced localStorage
                            debouncedLocalStorageUpdate(`liveData:${currentStation}:${today}`, updatedData);
                        }

                        // Sử dụng pre-calculated completion status nếu có
                        const isComplete = processedLiveData?.isComplete || Object.values(updatedData).every(
                            val => typeof val === 'string' && val !== '...' && val !== '***'
                        );
                        setIsXsmbLiveDataComplete(isComplete);
                        setIsTodayLoading(false);
                        setRetryCount(0);
                        setError(null);

                        return updatedData;
                    });

                    // Clear batch
                    batchUpdateRef.current.clear();

                    // BỔ SUNG: Debug Batch Queue Cleared
                    debugLogger.batchQueue('QUEUE_CLEARED', {
                        queueSize: 0,
                        updates: [],
                        memoryUsage: typeof performance !== 'undefined' && performance.memory ?
                            Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) : 'N/A'
                    });
                });
            }
        };

        // Sử dụng requestIdleCallback nếu có, fallback to setTimeout
        if (typeof requestIdleCallback !== 'undefined') {
            requestIdleCallback(scheduleBatchUpdate, { timeout: 30 }); // Giảm timeout tối đa
        } else {
            batchTimeoutRef.current = setTimeout(scheduleBatchUpdate, 30);
        }
    }, [setXsmbLiveData, debouncedLocalStorageUpdate, currentStation, today, setAnimationWithTimeout, processedLiveData]);

    // BỔ SUNG: Debounced set live data - FINAL OPTIMIZATION
    const debouncedSetLiveData = useCallback((newData) => {
        if (updateTimeoutRef.current) {
            clearTimeout(updateTimeoutRef.current);
        }
        updateTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current && setXsmbLiveData) {
                try {
                    // BỔ SUNG: Debug Context State Update
                    debugLogger.contextState('DEBOUNCED_UPDATE', {
                        newData: newData,
                        dataType: typeof newData,
                        isArray: Array.isArray(newData),
                        length: Array.isArray(newData) ? newData.length : null
                    });

                    setXsmbLiveData(newData);
                } catch (error) {
                    console.warn('Lỗi set live data:', error);

                    // BỔ SUNG: Debug Context State Error
                    debugLogger.contextState('UPDATE_ERROR', {
                        error: error.message,
                        newData: newData
                    });
                }
            }
        }, 25); // Giảm timeout tối đa cho realtime
    }, [setXsmbLiveData]);

    // BỔ SUNG: Memory monitoring và cleanup để tránh treo trình duyệt
    useEffect(() => {
        const memoryCheckInterval = setInterval(() => {
            if (typeof performance !== 'undefined' && performance.memory) {
                const memoryInfo = performance.memory;
                const usedMB = Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024);
                const totalMB = Math.round(memoryInfo.totalJSHeapSize / 1024 / 1024);
                const percentage = Math.round((usedMB / totalMB) * 100);

                // BỔ SUNG: Debug Memory Pressure
                debugLogger.memoryPressure('CHECK', {
                    usedMB: usedMB,
                    totalMB: totalMB,
                    percentage: percentage
                });

                if (usedMB > 200) { // Tăng ngưỡng cảnh báo
                    debugLogger.memoryPressure('HIGH_USAGE', {
                        usedMB: usedMB,
                        totalMB: totalMB,
                        percentage: percentage
                    });
                    // Force cleanup khi memory quá cao
                    globalSSEManager.cleanupOldConnections();
                }

                // Cleanup định kỳ để tránh memory leak
                if (usedMB > 100) {
                    debugLogger.memoryPressure('CLEANUP_TRIGGERED', {
                        usedMB: usedMB,
                        totalMB: totalMB,
                        percentage: percentage
                    });
                    globalSSEManager.cleanupOldConnections();
                }
            }
        }, 30000); // Check memory mỗi 30 giây

        return () => clearInterval(memoryCheckInterval);
    }, []);

    // BỔ SUNG: Tối ưu cleanup function để tránh vòng lặp vô hạn
    useEffect(() => {
        const startTime = Date.now();
        mountedRef.current = true;

        // BỔ SUNG: Debug Component Lifecycle
        debugLogger.lifecycle('COMPONENT_MOUNT', {
            componentId: connectionId.current,
            phase: 'mount',
            duration: 0
        });

        cleanupIntervalRef.current = setInterval(cleanupOldLiveData, 10 * 60 * 1000);

        return () => {
            const duration = Date.now() - startTime;
            mountedRef.current = false;

            // BỔ SUNG: Debug Component Lifecycle
            debugLogger.lifecycle('COMPONENT_UNMOUNT', {
                componentId: connectionId.current,
                phase: 'unmount',
                duration: duration
            });

            // Cleanup tất cả timeouts để tránh memory leak
            activeTimeoutsRef.current.forEach(timeoutId => {
                clearTimeout(timeoutId);
            });
            activeTimeoutsRef.current.clear();

            // Cleanup SSE connection với timeout để tránh treo
            if (sseRef.current) {
                const connectionKey = `${currentStation}:${today}:${connectionId.current}`;
                globalSSEManager.connections.delete(connectionKey);

                debugLogger.sseConnection('COMPONENT_UNMOUNT_CLEANUP', {
                    totalConnections: globalSSEManager.connections.size,
                    maxConnections: globalSSEManager.maxConnections,
                    provinceConnections: globalSSEManager.getConnectionsForProvince('MB'),
                    connectionKey: connectionKey
                });

                if (sseRef.current.readyState !== EventSource.CLOSED) {
                    // Thêm timeout để tránh treo khi đóng connection
                    const closeTimeout = setTimeout(() => {
                        if (sseRef.current && sseRef.current.readyState !== EventSource.CLOSED) {
                            try {
                                sseRef.current.close();
                            } catch (error) {
                                console.warn('Lỗi đóng SSE connection timeout:', error);
                            }
                        }
                    }, 1000);

                    try {
                        sseRef.current.close();
                    } catch (error) {
                        console.warn('Lỗi đóng SSE connection:', error);
                    }

                    clearTimeout(closeTimeout);
                }
                sseRef.current = null;
            }

            // Cleanup tất cả timeouts với timeout
            const cleanupTimeouts = () => {
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

                animationTimeoutsRef.current.forEach((timeoutId) => {
                    clearTimeout(timeoutId);
                });
                animationTimeoutsRef.current.clear();
            };

            // Thực hiện cleanup với timeout để tránh treo
            setTimeout(cleanupTimeouts, 0);

            // Clear tất cả refs
            batchUpdateRef.current.clear();
            sseConnectionPool.current.clear();

            // Cleanup cache cũ với timeout
            setTimeout(() => {
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
            }, 0);

            if (cleanupIntervalRef.current) {
                clearInterval(cleanupIntervalRef.current);
                cleanupIntervalRef.current = null;
            }

            // Reset setup flag để tránh vòng lặp
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

                // BỔ SUNG: Debug Context State - Fetch Start
                debugLogger.contextState('FETCH_START', {
                    retry: retry,
                    cacheKey: cacheKey,
                    hasCachedData: !!cachedData
                });

                // Kiểm tra nếu đang trong giờ live (18h-18h59)
                const vietnamTime = getVietnamTime();
                const currentHour = vietnamTime.getHours();
                const isLiveHour = currentHour === 20;

                // Clear cache nếu đã qua giờ live (19h trở đi)
                if (currentHour >= 19) {
                    debugLogger.contextState('CACHE_CLEAR', {
                        currentHour: currentHour,
                        reason: 'past_live_hour'
                    });
                    initialDataCache.current.clear();
                    localStorage.removeItem(`liveData:${currentStation}:${today}`);
                }

                if (cachedData && Date.now() - cachedData.timestamp < cacheTimeout) {
                    if (mountedRef.current) {
                        debugLogger.contextState('USING_CACHED_DATA', {
                            cachedData: cachedData.data,
                            timestamp: cachedData.timestamp
                        });
                        setXsmbLiveData(cachedData.data);
                        setIsXsmbLiveDataComplete(false);
                        setIsTodayLoading(false);
                        setError(null);
                    }
                    return;
                }

                // Nếu không phải giờ live và đang ở modal, gọi API cache
                if (!isLiveHour && currentStation === 'xsmb' && isModal) {
                    debugLogger.contextState('MODAL_CACHE_API', {
                        currentHour: currentHour,
                        isModal: isModal
                    });

                    try {
                        // BỔ SUNG: Timeout cho API call
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

                        const response = await fetch(`https://backendkqxs-1.onrender.com/api/kqxs/xsmb/latest`, {
                            signal: controller.signal
                        });

                        clearTimeout(timeoutId);

                        if (!response.ok) {
                            throw new Error(`HTTP error! Status: ${response.status}`);
                        }

                        const serverData = await response.json();

                        // BỔ SUNG: Validate server data
                        if (!serverData || typeof serverData !== 'object') {
                            throw new Error('Invalid server data format');
                        }

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

                            debugLogger.contextState('MODAL_DATA_SET', {
                                serverData: dataWithCorrectDate,
                                formattedDate: dataWithCorrectDate.drawDate
                            });

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
                    } catch (error) {
                        console.error('❌ Lỗi modal cache API:', error);

                        // BỔ SUNG: Debug API Error
                        debugLogger.contextState('MODAL_API_ERROR', {
                            error: error.message,
                            currentHour: currentHour,
                            isModal: isModal
                        });

                        if (mountedRef.current) {
                            // BỔ SUNG: Fallback to empty state thay vì loading forever
                            setXsmbLiveData({
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
                                lastUpdated: Date.now(),
                            });
                            setIsXsmbLiveDataComplete(false);
                            setIsTodayLoading(false);
                            setError('Không thể tải dữ liệu từ server');
                        }
                    }
                    return;
                }

                // Trang chính luôn sử dụng SSE, không gọi API cache
                if (!isModal) {
                    debugLogger.contextState('MAIN_PAGE_SSE', {
                        isModal: isModal
                    });
                }

                // Modal trong giờ live cũng sử dụng SSE như trang chính
                if (isModal && isLiveHour) {
                    debugLogger.contextState('MODAL_LIVE_SSE', {
                        isModal: isModal,
                        isLiveHour: isLiveHour
                    });
                    // Clear cache để đảm bảo lấy dữ liệu mới nhất
                    initialDataCache.current.clear();
                    localStorage.removeItem(`liveData:${currentStation}:${today}`);

                    // Sử dụng SSE trực tiếp như XSMT
                    debugLogger.contextState('MODAL_LIVE_SSE_DIRECT', {
                        isModal: isModal,
                        isLiveHour: isLiveHour
                    });
                }

                // Tiếp tục với SSE cho cả trang chính và modal trong giờ live
                debugLogger.contextState('SSE_CONTINUE', {
                    isModal: isModal,
                    isLiveHour: isLiveHour
                });

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

                        debugLogger.contextState('INITIAL_DATA_SET', {
                            updatedData: updatedData,
                            shouldUpdate: shouldUpdate,
                            serverDataLastUpdated: serverData.lastUpdated
                        });

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
                        debugLogger.contextState('NO_UPDATE_NEEDED', {
                            initialData: initialData,
                            shouldUpdate: shouldUpdate
                        });
                        setXsmbLiveData(initialData);
                        setIsXsmbLiveDataComplete(false);
                        setIsTodayLoading(false);
                    }
                }
            } catch (error) {
                console.error(`Lỗi khi lấy dữ liệu khởi tạo XSMB (lần ${retry + 1}):`, error.message);

                // BỔ SUNG: Debug Context State Error
                debugLogger.contextState('FETCH_ERROR', {
                    error: error.message,
                    retry: retry,
                    maxRetries: fetchMaxRetries
                });

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
                debugLogger.sseConnection('ALREADY_SETUP', {
                    totalConnections: globalSSEManager.connections.size,
                    maxConnections: globalSSEManager.maxConnections,
                    provinceConnections: globalSSEManager.getConnectionsForProvince('MB')
                });
                return;
            }

            // Kiểm tra số lượng connection để tránh treo trình duyệt
            if (globalSSEManager.connections.size >= globalSSEManager.maxConnections) {
                debugLogger.sseConnection('POOL_FULL', {
                    totalConnections: globalSSEManager.connections.size,
                    maxConnections: globalSSEManager.maxConnections,
                    provinceConnections: globalSSEManager.getConnectionsForProvince('MB')
                });
                globalSSEManager.cleanupOldConnections();
            }

            // ✅ TỐI ƯU: Sử dụng method mới để kiểm tra connections cho tỉnh
            const connectionsForProvince = globalSSEManager.getConnectionsForProvince('MB');

            if (connectionsForProvince >= globalSSEManager.maxConnectionsPerProvince) { // Giới hạn 2 connections cho XSMB
                debugLogger.sseConnection('PROVINCE_LIMIT_REACHED', {
                    totalConnections: globalSSEManager.connections.size,
                    maxConnections: globalSSEManager.maxConnections,
                    provinceConnections: connectionsForProvince
                });
                return;
            }

            // Kiểm tra nếu đang trong Fast Refresh
            if (typeof window !== 'undefined' && window.__NEXT_DATA__?.buildId !== window.__NEXT_DATA__?.buildId) {
                return;
            }

            // Kiểm tra nếu không phải giờ live cho XSMB (chỉ áp dụng cho modal)
            const vietnamTime = getVietnamTime();
            const currentHour = vietnamTime.getHours();
            const isLiveHour = currentHour === 20;

            // Chỉ kiểm tra giờ live cho modal, trang chính luôn kết nối SSE
            if (!isLiveHour && currentStation === 'xsmb' && isModal) {
                debugLogger.sseConnection('NOT_LIVE_HOUR', {
                    totalConnections: globalSSEManager.connections.size,
                    maxConnections: globalSSEManager.maxConnections,
                    provinceConnections: connectionsForProvince,
                    currentHour: currentHour
                });
                return;
            }

            // Modal trong giờ live cũng kết nối SSE
            if (isModal && isLiveHour) {
                debugLogger.sseConnection('MODAL_LIVE_HOUR', {
                    totalConnections: globalSSEManager.connections.size,
                    maxConnections: globalSSEManager.maxConnections,
                    provinceConnections: connectionsForProvince
                });
            }

            debugLogger.sseConnection('SETUP_START', {
                totalConnections: globalSSEManager.connections.size,
                maxConnections: globalSSEManager.maxConnections,
                provinceConnections: connectionsForProvince
            });
            sseSetupRef.current = true;

            // Reset animation state khi bắt đầu SSE setup
            setAnimatingPrize(null);

            const connectionKey = `${currentStation}:${today}:${connectionId.current}`;

            // Cleanup connection cũ trước khi tạo mới - TRÁNH VÒNG LẶP
            if (sseRef.current) {
                try {
                    sseRef.current.close();
                } catch (error) {
                    console.warn('Lỗi đóng SSE connection cũ:', error);
                }
                sseRef.current = null;
            }

            // Cleanup từ global manager và pool
            if (globalSSEManager.connections.has(connectionKey)) {
                const existingConnection = globalSSEManager.connections.get(connectionKey);
                if (existingConnection) {
                    try {
                        existingConnection.close();
                    } catch (error) {
                        console.warn('Lỗi đóng global connection:', error);
                    }
                    globalSSEManager.connections.delete(connectionKey);
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

            const sseUrl = `https://backendkqxs-1.onrender.com/api/kqxs/xsmb/sse?station=${currentStation}&date=${today}`;

            try {
                const newConnection = new EventSource(sseUrl);
                sseRef.current = newConnection;

                // Thêm vào global manager với timestamp
                newConnection.lastActivity = Date.now();
                globalSSEManager.connections.set(connectionKey, newConnection);
                sseConnectionPool.current.set(connectionKey, newConnection);

                debugLogger.sseConnection('CONNECTION_CREATED', {
                    totalConnections: globalSSEManager.connections.size,
                    maxConnections: globalSSEManager.maxConnections,
                    provinceConnections: globalSSEManager.getConnectionsForProvince('MB'),
                    connectionKey: connectionKey
                });

                setSseStatus('connecting');

                newConnection.onopen = () => {
                    newConnection.lastActivity = Date.now();
                    setSseStatus('connected');
                    debugLogger.sseConnection('CONNECTION_OPENED', {
                        totalConnections: globalSSEManager.connections.size,
                        maxConnections: globalSSEManager.maxConnections,
                        provinceConnections: globalSSEManager.getConnectionsForProvince('MB'),
                        connectionKey: connectionKey
                    });
                    if (mountedRef.current) {
                        setError(null);
                        setRetryCount(0);
                    }
                };

                newConnection.onerror = () => {
                    setSseStatus('error');
                    debugLogger.sseConnection('CONNECTION_ERROR', {
                        totalConnections: globalSSEManager.connections.size,
                        maxConnections: globalSSEManager.maxConnections,
                        provinceConnections: globalSSEManager.getConnectionsForProvince('MB'),
                        connectionKey: connectionKey,
                        retryCount: retryCount
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

                        globalSSEManager.connections.delete(connectionKey);
                        sseConnectionPool.current.delete(connectionKey);
                    }, 100);

                    if (retryCount < maxRetries && mountedRef.current) {
                        const retryTimeoutId = setTimeout(() => {
                            if (mountedRef.current) {
                                setRetryCount(prev => prev + 1);
                                connectSSE();
                            }
                        }, sseReconnectDelay);

                        activeTimeoutsRef.current.add(retryTimeoutId);
                    } else if (mountedRef.current) {
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
                                    isLive: data[prizeType] !== '...' && data[prizeType] !== '***'
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

            // Clear tất cả animation timeouts
            animationTimeoutsRef.current.forEach((timeoutId) => {
                clearTimeout(timeoutId);
            });
            animationTimeoutsRef.current.clear();

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

    // BỔ SUNG: Debug Context State
    useEffect(() => {
        const now = Date.now();
        const timeSinceLastReload = now - reloadTrackerRef.current.lastReloadTime;

        // BỔ SUNG: Detect rapid reload pattern
        if (timeSinceLastReload < 5000) { // Reload trong vòng 5 giây
            reloadTrackerRef.current.reloadCount++;
            reloadTrackerRef.current.isRapidReload = true;

            debugLogger.reloadPattern('RAPID_RELOAD_DETECTED', {
                reloadCount: reloadTrackerRef.current.reloadCount,
                timeSinceLastReload: timeSinceLastReload,
                componentId: connectionId.current,
                isRapidReload: true
            });
        } else {
            reloadTrackerRef.current.reloadCount = 0;
            reloadTrackerRef.current.isRapidReload = false;
        }

        reloadTrackerRef.current.lastReloadTime = now;

        debugLogger.contextState('COMPONENT_MOUNT', {
            xsmbLiveData: xsmbLiveData,
            setXsmbLiveData: !!setXsmbLiveData,
            setIsXsmbLiveDataComplete: !!setIsXsmbLiveDataComplete
        });
    }, []);

    // BỔ SUNG: Monitor Context State changes
    useEffect(() => {
        debugLogger.contextState('STATE_CHANGE', {
            xsmbLiveData: xsmbLiveData,
            isTodayLoading: isTodayLoading,
            error: error,
            retryCount: retryCount
        });
    }, [xsmbLiveData, isTodayLoading, error, retryCount]);

    // BỔ SUNG: Error boundary cho component
    useEffect(() => {
        const handleError = (error, errorInfo) => {
            debugLogger.errorBoundary('COMPONENT_ERROR', {
                error: error.message,
                errorStack: error.stack,
                componentStack: errorInfo.componentStack,
                isRecoverable: true
            });
        };

        // BỔ SUNG: Performance monitoring
        const performanceObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.entryType === 'measure') {
                    debugLogger.performance('RENDER_MEASURE', {
                        renderTime: entry.duration,
                        updateTime: entry.duration,
                        memoryDelta: 0,
                        fps: 60
                    });
                }
            }
        });

        try {
            performanceObserver.observe({ entryTypes: ['measure'] });
        } catch (error) {
            // PerformanceObserver không được support
        }

        return () => {
            performanceObserver.disconnect();
        };
    }, []);

    // BỔ SUNG: Monitor Context State changes
    useEffect(() => {
        const renderStartTime = performance.now();

        debugLogger.contextState('STATE_CHANGE', {
            xsmbLiveData: xsmbLiveData,
            isTodayLoading: isTodayLoading,
            error: error,
            retryCount: retryCount
        });

        // BỔ SUNG: Performance measurement
        requestAnimationFrame(() => {
            const renderEndTime = performance.now();
            const renderDuration = renderEndTime - renderStartTime;

            debugLogger.performance('RENDER_COMPLETE', {
                renderTime: renderDuration,
                updateTime: renderDuration,
                memoryDelta: 0,
                fps: 1000 / renderDuration
            });
        });
    }, [xsmbLiveData, isTodayLoading, error, retryCount]);

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
    return (hours === 20 && minutes >= 50 && minutes <= 59);
}

export default React.memo(LiveResult);