// Debug Cache Script
// Copy và paste vào browser console để debug

console.log('🔍 Debug Cache Script');

// 1. Kiểm tra tất cả cache keys
const cacheKeys = Object.keys(localStorage).filter(key => key.startsWith('xsmb_data_'));
console.log('📦 All cache keys:', cacheKeys);

// 2. Kiểm tra cache data cho từng key
cacheKeys.forEach(key => {
    try {
        const data = localStorage.getItem(key);
        const parsed = JSON.parse(data);
        console.log(`📦 Cache ${key}:`, {
            isArray: Array.isArray(parsed),
            length: Array.isArray(parsed) ? parsed.length : 'not array',
            hasData: parsed && parsed.length > 0,
            firstItem: Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : null
        });
    } catch (error) {
        console.error(`❌ Error parsing ${key}:`, error);
    }
});

// 3. Clear tất cả cache
function clearAllCache() {
    const cacheKeys = Object.keys(localStorage).filter(key => key.startsWith('xsmb_data_'));
    cacheKeys.forEach(key => {
        localStorage.removeItem(key);
        localStorage.removeItem(key + '_time');
        console.log(`🗑️ Cleared: ${key}`);
    });
    console.log('✅ All cache cleared');
}

// 4. Clear cache cho specific key
function clearCacheForKey(key) {
    localStorage.removeItem(key);
    localStorage.removeItem(key + '_time');
    console.log(`🗑️ Cleared: ${key}`);
}

// 5. Test specific cache
function testCache(key) {
    const data = localStorage.getItem(key);
    if (data) {
        try {
            const parsed = JSON.parse(data);
            console.log(`📦 Testing ${key}:`, {
                isArray: Array.isArray(parsed),
                length: Array.isArray(parsed) ? parsed.length : 'not array',
                hasData: parsed && parsed.length > 0,
                firstItem: Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : null
            });
        } catch (error) {
            console.error(`❌ Error parsing ${key}:`, error);
        }
    } else {
        console.log(`❌ Cache not found: ${key}`);
    }
}

// Usage:
// clearAllCache() - Clear tất cả cache
// clearCacheForKey('xsmb_data_xsmb_null_thu-2') - Clear cache cho thứ 2
// testCache('xsmb_data_xsmb_null_thu-2') - Test cache cho thứ 2

console.log('📝 Available functions:');
console.log('- clearAllCache()');
console.log('- clearCacheForKey(key)');
console.log('- testCache(key)'); 