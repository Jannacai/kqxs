// utils/cacheStrategyMT.js - Giải pháp cache tối ưu cho XSMT
// Đảm bảo: realtime không bị ảnh hưởng, user luôn thấy data mới nhất, performance tối ưu

const CACHE_KEYS = {
    LIVE_DATA: 'xsmt_live_data',
    COMPLETE_DATA: 'xsmt_complete_data',
    LAST_UPDATE: 'xsmt_last_update'
};

const CACHE_TTL = {
    LIVE: 20 * 1000,    // 20 giây cho live data (tối ưu cho navigation)
    COMPLETE: 24 * 60 * 60 * 1000 // 24 giờ cho complete data
};

export const cacheStrategyMT = {
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
        console.log('📦 Cached live data for XSMT navigation');
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
        console.log('🏁 Cached complete data for XSMT');
    },

    // 3. Load data thông minh với priority
    loadData: () => {
        const now = Date.now();
        const vietnamTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
        const isLiveHour = vietnamTime.getHours() === 16 && vietnamTime.getMinutes() >= 0 && vietnamTime.getMinutes() <= 59;

        // ✅ SỬA: Kiểm tra xem cache có bị clear gần đây không
        if (cacheStrategyMT.isCacheRecentlyCleared()) {
            console.log('🔄 Cache vừa được clear, không sử dụng cache strategy');
            return { data: null, source: 'server', isLive: false };
        }

        // ✅ SỬA: Kiểm tra xem có phải cache cũ không (cache được tạo trước khi clear)
        if (cacheStrategyMT.isCacheOld()) {
            console.log('🔄 Cache cũ (tạo trước khi clear), không sử dụng cache strategy');
            return { data: null, source: 'server', isLive: false };
        }

        // Priority 1: Nếu đang live - load live cache (chỉ cho navigation)
        if (isLiveHour) {
            const liveCache = localStorage.getItem(CACHE_KEYS.LIVE_DATA);
            if (liveCache) {
                const parsed = JSON.parse(liveCache);
                if (now - parsed.timestamp < CACHE_TTL.LIVE) {
                    console.log('📦 Using live cache for XSMT navigation');
                    return { data: parsed.data, source: 'live_cache', isLive: true };
                }
            }
        }

        // Priority 2: Load complete cache (cho data đã hoàn thành)
        const completeCache = localStorage.getItem(CACHE_KEYS.COMPLETE_DATA);
        if (completeCache) {
            const parsed = JSON.parse(completeCache);
            if (now - parsed.timestamp < CACHE_TTL.COMPLETE) {
                console.log('📦 Using complete cache for XSMT');
                return { data: parsed.data, source: 'complete_cache', isLive: false };
            }
        }

        // Priority 3: Không có cache valid
        console.log('🔄 No valid cache for XSMT, need to fetch from server');
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
            console.log(`🧹 Cleared ${clearedCount} expired XSMT cache(s)`);
        }
    },

    // 6. Clear all cache
    clearAllCache: () => {
        localStorage.removeItem(CACHE_KEYS.LIVE_DATA);
        localStorage.removeItem(CACHE_KEYS.COMPLETE_DATA);
        localStorage.removeItem(CACHE_KEYS.LAST_UPDATE);
        console.log('🧹 Cleared all XSMT cache');
    },

    // ✅ BỔ SUNG: Clear cache khi LiveResult ẩn đi
    clearCacheOnLiveResultHide: () => {
        localStorage.removeItem(CACHE_KEYS.LIVE_DATA);
        localStorage.removeItem(CACHE_KEYS.COMPLETE_DATA);
        localStorage.removeItem(CACHE_KEYS.LAST_UPDATE);
        localStorage.setItem('just_cleared_cache', Date.now().toString());
        console.log('🧹 Cleared XSMT cache on LiveResult hide');
    },

    // ✅ BỔ SUNG: Kiểm tra xem cache có bị clear gần đây không
    isCacheRecentlyCleared: () => {
        const justClearedCache = localStorage.getItem('just_cleared_cache');
        if (!justClearedCache) return false;

        const clearTime = parseInt(justClearedCache);
        const timeSinceClear = Date.now() - clearTime;

        // Nếu cache vừa được clear trong 60 giây qua
        return timeSinceClear < 60000;
    },

    // ✅ BỔ SUNG: Kiểm tra xem cache có phải cache cũ không
    isCacheOld: () => {
        const justClearedCache = localStorage.getItem('just_cleared_cache');
        const lastUpdate = localStorage.getItem(CACHE_KEYS.LAST_UPDATE);

        if (!justClearedCache || !lastUpdate) return false;

        const lastUpdateTime = parseInt(lastUpdate);
        const clearTime = parseInt(justClearedCache);

        // Nếu cache được tạo trước khi clear
        return lastUpdateTime < clearTime;
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
    cacheStrategyMT.clearExpiredCache();

    // Cleanup mỗi 5 phút
    setInterval(() => {
        cacheStrategyMT.clearExpiredCache();
    }, 5 * 60 * 1000);
}
