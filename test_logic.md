# Test Logic XSMB Component

## Vấn đề ban đầu:
- Component chỉ fetch data 1 lần duy nhất khi mount
- Không phản ứng với thay đổi props (date, dayof)
- Không thể chuyển luân phiên giữa các ngày và các thứ

## Giải pháp đã áp dụng:

### 1. Thêm useEffect mới để phản ứng với thay đổi props:
```javascript
useEffect(() => {
    // Chỉ chạy khi không phải mount lần đầu
    if (!isInitialMount) {
        setLoading(true);
        setError(null);
        setCurrentPage(1);
        
        console.log('🔄 Props thay đổi, fetch data mới:', { date, dayof, station });
        
        // Fetch data mới với props mới
        fetchData(true);
    }
}, [date, dayof, station, fetchData, isInitialMount]);
```

### 2. Cập nhật cache key để thay đổi động:
```javascript
// Thay vì sử dụng CACHE_KEY cố định
const currentCacheKey = `xsmb_data_${station}_${date || 'null'}_${dayof || 'null'}`;
```

### 3. Thêm flag isInitialMount để tránh fetch trùng lặp:
```javascript
const [isInitialMount, setIsInitialMount] = useState(true);

useEffect(() => {
    if (isInitialMount) {
        fetchData();
        setIsInitialMount(false);
    }
}, [isInitialMount, fetchData]);
```

## Test Cases:

### Test Case 1: Chuyển từ ngày sang thứ
1. Truy cập `/xsmb/25-12-2024` (theo ngày)
2. Chuyển sang `/xsmb/thu-2` (theo thứ)
3. **Expected**: Component fetch data mới cho thứ 2

### Test Case 2: Chuyển từ thứ sang ngày
1. Truy cập `/xsmb/thu-3` (theo thứ)
2. Chuyển sang `/xsmb/26-12-2024` (theo ngày)
3. **Expected**: Component fetch data mới cho ngày 26-12-2024

### Test Case 3: Chuyển giữa các thứ khác nhau
1. Truy cập `/xsmb/thu-2`
2. Chuyển sang `/xsmb/thu-3`
3. **Expected**: Component fetch data mới cho thứ 3

### Test Case 4: Chuyển giữa các ngày khác nhau
1. Truy cập `/xsmb/25-12-2024`
2. Chuyển sang `/xsmb/24-12-2024`
3. **Expected**: Component fetch data mới cho ngày 24-12-2024

## Logs cần kiểm tra:
- `🔄 Props thay đổi, fetch data mới: { date, dayof, station }`
- `📦 Cache hit/miss/expired`
- `✅ Đã tạo cache mới`

## Các thay đổi chính:
1. ✅ Thêm useEffect để phản ứng với thay đổi props
2. ✅ Cập nhật cache key động
3. ✅ Thêm flag isInitialMount
4. ✅ Cập nhật tất cả references đến CACHE_KEY
5. ✅ Cập nhật dependency arrays 