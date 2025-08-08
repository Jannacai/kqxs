// utils/cacheStrategy.js - Giải pháp cache tối ưu
// Đảm bảo: realtime không bị ảnh hưởng, user luôn thấy data mới nhất, performance tối ưu

const CACHE_KEYS = {
    LIVE_DATA: 'xsmb_live_data',
    COMPLETE_DATA: 'xsmb_complete_data',
    LAST_UPDATE: 'xsmb_last_update'
};

const CACHE_TTL = {
    LIVE: 10 * 1000,    // 10 giây cho live data (tối ưu cho navigation)
    COMPLETE: 24 * 60 * 60 * 1000 // 24 giờ cho complete data
};

export const cacheStrategy = {
    // 1. Cache live data khi có update (chỉ dùng cho navigation)
    cacheLiveData: (liveData) => {
        const cacheData = {
            data: liveData,
            timestamp: Date.now(),
            isLive: true,
            isComplete: false
        };
        localStorage.setItem(CACHE_KEYS.LIVE_DATA, JSON.stringify(cacheData));
        localStorage.setItem(CACHE_KEYS.LAST_UPDATE, Date.now().toString());
        console.log('📦 Cached live data for navigation');
    },

    // 2. Cache complete data khi kết quả đầy đủ
    cacheCompleteData: (completeData) => {
        const cacheData = {
            data: completeData,
            timestamp: Date.now(),
            isLive: false,
            isComplete: true
        };
        localStorage.setItem(CACHE_KEYS.COMPLETE_DATA, JSON.stringify(cacheData));
        localStorage.setItem(CACHE_KEYS.LAST_UPDATE, Date.now().toString());
        console.log('🏁 Cached complete data');
    },

    // 3. Load data thông minh với priority
    loadData: () => {
        const now = Date.now();
        const vietnamTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
        const isLiveHour = vietnamTime.getHours() === 18 && vietnamTime.getMinutes() >= 10 && vietnamTime.getMinutes() <= 33;

        // Priority 1: Nếu đang live - load live cache (chỉ cho navigation)
        if (isLiveHour) {
            const liveCache = localStorage.getItem(CACHE_KEYS.LIVE_DATA);
            if (liveCache) {
                const parsed = JSON.parse(liveCache);
                if (now - parsed.timestamp < CACHE_TTL.LIVE) {
                    console.log('📦 Using live cache for navigation');
                    return { data: parsed.data, source: 'live_cache', isLive: true };
                }
            }
        }

        // Priority 2: Load complete cache (cho data đã hoàn thành)
        const completeCache = localStorage.getItem(CACHE_KEYS.COMPLETE_DATA);
        if (completeCache) {
            const parsed = JSON.parse(completeCache);
            if (now - parsed.timestamp < CACHE_TTL.COMPLETE) {
                console.log('📦 Using complete cache');
                return { data: parsed.data, source: 'complete_cache', isLive: false };
            }
        }

        // Priority 3: Không có cache valid
        console.log('🔄 No valid cache, need to fetch from server');
        return { data: null, source: 'server', isLive: false };
    },

    // 4. Check if data is fresh (của hôm nay)
    isDataFresh: (data) => {
        if (!data) return false;
        const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }))
            .toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
            .replace(/\//g, '-');
        return data.drawDate === today;
    },

    // 5. Clear expired cache
    clearExpiredCache: () => {
        const now = Date.now();
        let clearedCount = 0;

        // Clear live cache
        const liveCache = localStorage.getItem(CACHE_KEYS.LIVE_DATA);
        if (liveCache) {
            const parsed = JSON.parse(liveCache);
            if (now - parsed.timestamp >= CACHE_TTL.LIVE) {
                localStorage.removeItem(CACHE_KEYS.LIVE_DATA);
                clearedCount++;
            }
        }

        // Clear complete cache
        const completeCache = localStorage.getItem(CACHE_KEYS.COMPLETE_DATA);
        if (completeCache) {
            const parsed = JSON.parse(completeCache);
            if (now - parsed.timestamp >= CACHE_TTL.COMPLETE) {
                localStorage.removeItem(CACHE_KEYS.COMPLETE_DATA);
                clearedCount++;
            }
        }

        if (clearedCount > 0) {
            console.log(`🧹 Cleared ${clearedCount} expired cache(s)`);
        }
    },

    // 6. Clear all cache
    clearAllCache: () => {
        localStorage.removeItem(CACHE_KEYS.LIVE_DATA);
        localStorage.removeItem(CACHE_KEYS.COMPLETE_DATA);
        localStorage.removeItem(CACHE_KEYS.LAST_UPDATE);
        console.log('🧹 Cleared all cache');
    },

    // 7. Get cache stats
    getCacheStats: () => {
        const liveCache = localStorage.getItem(CACHE_KEYS.LIVE_DATA);
        const completeCache = localStorage.getItem(CACHE_KEYS.COMPLETE_DATA);
        const lastUpdate = localStorage.getItem(CACHE_KEYS.LAST_UPDATE);

        return {
            hasLiveCache: !!liveCache,
            hasCompleteCache: !!completeCache,
            lastUpdate: lastUpdate ? new Date(parseInt(lastUpdate)).toLocaleString('vi-VN') : null,
            liveCacheAge: liveCache ? Math.round((Date.now() - JSON.parse(liveCache).timestamp) / 1000 / 60) : null,
            completeCacheAge: completeCache ? Math.round((Date.now() - JSON.parse(completeCache).timestamp) / 1000 / 60) : null
        };
    }
};

// Auto cleanup expired cache
if (typeof window !== 'undefined') {
    // Cleanup khi page load
    cacheStrategy.clearExpiredCache();

    // Cleanup mỗi 5 phút
    setInterval(() => {
        cacheStrategy.clearExpiredCache();
    }, 5 * 60 * 1000);
} 