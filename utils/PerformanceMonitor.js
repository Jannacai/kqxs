import { useRef, useEffect } from 'react';

// Performance monitoring hook
export const usePerformanceMonitor = (componentName) => {
    const renderCount = useRef(0);
    const lastRenderTime = useRef(Date.now());
    const mountTime = useRef(Date.now());
    const memoryUsage = useRef(null);

    useEffect(() => {
        renderCount.current++;
        const now = Date.now();
        const timeSinceLastRender = now - lastRenderTime.current;
        const totalTime = now - mountTime.current;

        // Log performance metrics
        if (timeSinceLastRender < 100) {
            console.warn(`⚠️ ${componentName} re-rendering too frequently: ${timeSinceLastRender}ms`);
        }

        // Memory usage tracking (if available)
        if (performance.memory) {
            memoryUsage.current = {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
            };
        }

        // Performance summary every 10 renders
        if (renderCount.current % 10 === 0) {
            console.log(`📊 ${componentName} Performance Summary:`, {
                renderCount: renderCount.current,
                avgRenderTime: totalTime / renderCount.current,
                memoryUsage: memoryUsage.current,
                timeSinceLastRender
            });
        }

        lastRenderTime.current = now;
    });

    return {
        renderCount: renderCount.current,
        memoryUsage: memoryUsage.current,
        timeSinceMount: Date.now() - mountTime.current
    };
};

// SSE Connection Monitor
export const useSSEMonitor = () => {
    const connectionStats = useRef({
        totalConnections: 0,
        activeConnections: 0,
        failedConnections: 0,
        avgLatency: 0,
        lastUpdate: Date.now()
    });

    const updateStats = (type, latency = 0) => {
        const now = Date.now();
        const stats = connectionStats.current;

        switch (type) {
            case 'connect':
                stats.totalConnections++;
                stats.activeConnections++;
                break;
            case 'disconnect':
                stats.activeConnections = Math.max(0, stats.activeConnections - 1);
                break;
            case 'error':
                stats.failedConnections++;
                stats.activeConnections = Math.max(0, stats.activeConnections - 1);
                break;
            case 'latency':
                stats.avgLatency = (stats.avgLatency + latency) / 2;
                break;
        }

        stats.lastUpdate = now;

        // Log warnings for performance issues
        if (stats.failedConnections > 5) {
            console.warn('⚠️ High SSE connection failure rate detected');
        }

        if (stats.avgLatency > 1000) {
            console.warn('⚠️ High SSE latency detected:', stats.avgLatency + 'ms');
        }
    };

    return {
        stats: connectionStats.current,
        updateStats
    };
};

// Memory Monitor
export const useMemoryMonitor = () => {
    const memoryStats = useRef({
        initialMemory: null,
        peakMemory: 0,
        currentMemory: 0,
        memoryLeaks: 0
    });

    useEffect(() => {
        if (performance.memory) {
            memoryStats.current.initialMemory = performance.memory.usedJSHeapSize;

            const interval = setInterval(() => {
                const currentMemory = performance.memory.usedJSHeapSize;
                const stats = memoryStats.current;

                stats.currentMemory = currentMemory;
                stats.peakMemory = Math.max(stats.peakMemory, currentMemory);

                // Detect potential memory leaks
                const memoryGrowth = currentMemory - stats.initialMemory;
                if (memoryGrowth > 50 * 1024 * 1024) { // 50MB threshold
                    stats.memoryLeaks++;
                    console.warn('⚠️ Potential memory leak detected:', {
                        growth: Math.round(memoryGrowth / 1024 / 1024) + 'MB',
                        current: Math.round(currentMemory / 1024 / 1024) + 'MB'
                    });
                }
            }, 5000); // Check every 5 seconds

            return () => clearInterval(interval);
        }
    }, []);

    return memoryStats.current;
};

// Component Load Time Monitor
export const useLoadTimeMonitor = (componentName) => {
    const loadTime = useRef(null);
    const isLoaded = useRef(false);

    useEffect(() => {
        if (!isLoaded.current) {
            loadTime.current = performance.now();
            isLoaded.current = true;
        }
    }, []);

    useEffect(() => {
        if (isLoaded.current && loadTime.current) {
            const totalLoadTime = performance.now() - loadTime.current;
            console.log(`⏱️ ${componentName} load time:`, Math.round(totalLoadTime) + 'ms');

            if (totalLoadTime > 1000) {
                console.warn(`⚠️ ${componentName} took too long to load:`, Math.round(totalLoadTime) + 'ms');
            }
        }
    });

    return {
        loadTime: loadTime.current ? performance.now() - loadTime.current : 0
    };
};

// Network Performance Monitor
export const useNetworkMonitor = () => {
    const networkStats = useRef({
        requests: 0,
        failedRequests: 0,
        avgResponseTime: 0,
        slowRequests: 0
    });

    const trackRequest = (url, startTime, success = true, responseTime = 0) => {
        const stats = networkStats.current;
        stats.requests++;

        if (!success) {
            stats.failedRequests++;
        }

        if (responseTime > 0) {
            stats.avgResponseTime = (stats.avgResponseTime + responseTime) / 2;

            if (responseTime > 2000) { // 2 seconds threshold
                stats.slowRequests++;
                console.warn('⚠️ Slow network request detected:', {
                    url,
                    responseTime: Math.round(responseTime) + 'ms'
                });
            }
        }
    };

    return {
        stats: networkStats.current,
        trackRequest
    };
};

// Export all monitors
export const PerformanceMonitor = {
    usePerformanceMonitor,
    useSSEMonitor,
    useMemoryMonitor,
    useLoadTimeMonitor,
    useNetworkMonitor
}; 