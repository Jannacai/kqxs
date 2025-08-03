# Debug Logic XSMB Component

## Vấn đề hiện tại:
- Logic lấy dữ liệu theo thứ hoạt động tốt
- Logic lấy dữ liệu theo ngày không chuyển page giữa các ngày được

## Các thay đổi đã thực hiện:

### 1. Sửa useEffect để luôn fetch khi props thay đổi:
```javascript
// ✅ THÊM MỚI: useEffect để phản ứng với thay đổi props
useEffect(() => {
    console.log('🔍 useEffect props change triggered:', { date, dayof, station, isInitialMount });
    
    // Reset states khi props thay đổi
    setLoading(true);
    setError(null);
    setCurrentPage(1);

    console.log('🔄 Props thay đổi, fetch data mới:', { date, dayof, station });

    // Fetch data mới với props mới - luôn fetch khi props thay đổi
    fetchData(true);
}, [date, dayof, station]); // Loại bỏ isInitialMount khỏi dependency để luôn chạy khi props thay đổi
```

### 2. Sửa logic cache để force refresh:
```javascript
// ✅ TỐI ƯU: Logic cache thông minh - đảm bảo cache mới được sử dụng sau 18h35+
if (cachedData && cacheAge < CACHE_DURATION && !forceRefresh) {
    // Sử dụng cache chỉ khi không force refresh
    setData(JSON.parse(cachedData));
    setLoading(false);
    return;
}
```

### 3. Thêm debug logs chi tiết:
```javascript
// Log cache key details
console.log('🔍 Cache key details:', {
    station,
    date,
    dayof,
    dateString: date || 'null',
    dayofString: dayof || 'null',
    finalKey: currentCacheKey
});

// Log localStorage check
console.log('💾 LocalStorage check:', {
    cacheKey: currentCacheKey,
    hasCachedData: !!cachedData,
    cachedTime,
    allKeys: Object.keys(localStorage).filter(key => key.startsWith('xsmb_data_'))
});

// Log props comparison
console.log('🔍 Props comparison:', {
    dateType: typeof date,
    dayofType: typeof dayof,
    stationType: typeof station,
    dateValue: date,
    dayofValue: dayof,
    stationValue: station
});
```

## Test Cases để debug:

### Test Case 1: Chuyển giữa các ngày
1. Truy cập `/xsmb/03-08-2025`
2. Chuyển sang `/xsmb/01-08-2025`
3. **Expected logs:**
   - `🎯 KQXS Component Props: { data3: "03-08-2025", data4: null, station: "xsmb" }`
   - `🔄 Props changed: { date: "01-08-2025", dayof: null, station: "xsmb" }`
   - `🔑 Cache key: xsmb_data_xsmb_01-08-2025_null`
   - `🚀 Fetching from API` (thay vì sử dụng cache)

### Test Case 2: Chuyển từ ngày sang thứ
1. Truy cập `/xsmb/03-08-2025`
2. Chuyển sang `/xsmb/thu-2`
3. **Expected logs:**
   - `🎯 KQXS Component Props: { data3: null, data4: "thu-2", station: "xsmb" }`
   - `🔄 Props changed: { date: null, dayof: "thu-2", station: "xsmb" }`
   - `🔑 Cache key: xsmb_data_xsmb_null_thu-2`
   - `🚀 Fetching from API`

## Các vấn đề có thể xảy ra:

### 1. Cache key không thay đổi:
- **Symptom**: Cache key giống nhau cho các ngày khác nhau
- **Check**: Logs `🔍 Cache key details`

### 2. forceRefresh không hoạt động:
- **Symptom**: Vẫn sử dụng cache thay vì fetch API
- **Check**: Logs `🔍 Should fetch from API`

### 3. Props không thay đổi:
- **Symptom**: Không thấy logs `🔄 Props changed`
- **Check**: Logs `🔍 Props comparison`

### 4. Component không re-render:
- **Symptom**: Không thấy logs `🎯 KQXS Component Props`
- **Check**: Key prop trong parent component

## Debug Steps:
1. Mở browser console
2. Truy cập `/xsmb/03-08-2025`
3. Chuyển sang `/xsmb/01-08-2025`
4. Kiểm tra logs theo thứ tự:
   - `🎯 KQXS Component Props`
   - `🔄 Props changed`
   - `🔑 Cache key`
   - `💾 LocalStorage check`
   - `🚀 Fetching from API`
5. Xác định điểm nào bị lỗi 