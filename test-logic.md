# Test Logic Lấy Dữ Liệu XSMB

## Test Cases

### 1. Logic Lấy Theo Thứ (Dayofweek) - ✅ Đã Hoạt Động

**URL:** `/xsmb/thu-2`
**Props:**
```javascript
<KQXS
    data3={null}           // Không có ngày cụ thể
    data4="thu-2"          // Thứ 2
    station="xsmb"
/>
```

**Expected API Call:**
```
GET /api/kqxs/xsmb/thu-2
```

**Cache Key:**
```
xsmb_data_xsmb_null_thu-2
```

**Console Log:**
```
📡 API Request Type: DAYOFWEEK
🔄 Fetching from API {
    station: "xsmb",
    date: "null (theo thứ)",
    dayof: "thu-2",
    ...
}
```

### 2. Logic Lấy Theo Ngày (Date) - ✅ Đã Sửa

**URL:** `/xsmb/25-12-2024` (không cần /date/)
**Props:**
```javascript
<KQXS
    data3="25-12-2024"    // Ngày cụ thể
    data4={null}           // Không có thứ
    station="xsmb"
/>
```

**Expected API Call:**
```
GET /api/kqxs/xsmb?date=25-12-2024
```

**Cache Key:**
```
xsmb_data_xsmb_25-12-2024_null
```

**Console Log:**
```
🔍 Slug validation result: { isValid: true, type: 'date', value: '25-12-2024' }
📡 API Request Type: DATE
🔄 Fetching from API {
    station: "xsmb",
    date: "25-12-2024",
    dayof: "null (theo ngày)",
    ...
}
```

### 3. Logic Lấy Tất Cả (Default)

**URL:** `/xsmb`
**Props:**
```javascript
<KQXS
    data3={null}           // Không có ngày
    data4={null}           // Không có thứ
    station="xsmb"
/>
```

**Expected API Call:**
```
GET /api/kqxs
```

**Cache Key:**
```
xsmb_data_xsmb_null_null
```

## Test Steps

### Step 1: Test Logic Theo Thứ
1. Truy cập `/xsmb/thu-2`
2. Kiểm tra console log có hiển thị `DAYOFWEEK`
3. Kiểm tra API call đúng endpoint
4. Kiểm tra cache key đúng format

### Step 2: Test Logic Theo Ngày
1. Truy cập `/xsmb/25-12-2024`
2. Kiểm tra console log có hiển thị `🔍 Slug validation result: { isValid: true, type: 'date', value: '25-12-2024' }`
3. Kiểm tra console log có hiển thị `📡 API Request Type: DATE`
4. Kiểm tra API call đúng endpoint `/api/kqxs/xsmb?date=25-12-2024`
5. Kiểm tra cache key đúng format `xsmb_data_xsmb_25-12-2024_null`

### Step 3: Test Validation
1. Test ngày không hợp lệ: `/xsmb/32-13-2024`
2. Test ngày trong tương lai: `/xsmb/25-12-2025`
3. Test format sai: `/xsmb/25/12/2024`
4. Test thứ không hợp lệ: `/xsmb/thu-10`
5. Test thông tin không hợp lệ: `/xsmb/abc123`

## Expected Results

### ✅ Success Cases
- Logic theo thứ: Hiển thị dữ liệu thứ 2
- Logic theo ngày: Hiển thị dữ liệu ngày 25-12-2024
- Cache hoạt động đúng cho cả hai loại

### ❌ Error Cases
- Ngày không hợp lệ: Hiển thị error message
- Ngày trong tương lai: Hiển thị error message
- Format sai: Hiển thị error message

## Debug Commands

```javascript
// Kiểm tra cache
localStorage.getItem('xsmb_data_xsmb_null_thu-2')
localStorage.getItem('xsmb_data_xsmb_25-12-2024_null')

// Clear cache để test
localStorage.removeItem('xsmb_data_xsmb_null_thu-2')
localStorage.removeItem('xsmb_data_xsmb_25-12-2024_null')
```

## Backend API Requirements

### Required Endpoints
```
GET /api/kqxs/xsmb/thu-2          ✅ Đã có
GET /api/kqxs/xsmb-25-12-2024     ❓ Cần kiểm tra
GET /api/kqxs                      ✅ Đã có
```

### Response Format
```javascript
{
    drawDate: "2024-12-25",
    dayOfWeek: "Thứ Hai",
    station: "xsmb",
    tentinh: "Hà Nội",
    specialPrize: ["12345"],
    firstPrize: ["67890"],
    // ... các giải khác
}
``` 