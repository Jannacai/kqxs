# 🎨 Thiết Kế Lại Bảng In XSMT

## 📋 **Tổng Quan:**

### **Mục Đích:**
- Thiết kế lại bảng in với layout mới
- Mỗi tỉnh nằm trên 1 cột riêng biệt
- Mỗi giải nằm trên 1 row riêng biệt
- Layout dễ đọc và so sánh giữa các tỉnh

## 🛠️ **Thiết Kế Mới:**

### **1. Layout Structure:**
```
┌─────────────────────────────────────────────────────────────┐
│                    KẾT QUẢ XỔ SỐ MIỀN TRUNG              │
│                     Ngày: 17/12/2024                      │
├─────────────────────────────────────────────────────────────┤
│ 17/12/2024 - Thứ Ba                                      │
├─────────┬─────────┬─────────┬─────────┬─────────┬─────────┤
│  Giải   │  Huế    │ Phú Yên │ Đà Nẵng │ Khánh Hòa│ ...    │
├─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│   G8    │  12345  │  67890  │  11111  │  22222  │  33333  │
├─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│   G7    │  12345  │  67890  │  11111  │  22222  │  33333  │
├─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│   G6    │ 123 456 │ 789 012 │ 345 678 │ 901 234 │ 567 890 │
├─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│   G5    │ 123 456 │ 789 012 │ 345 678 │ 901 234 │ 567 890 │
├─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│   G4    │ 123 456 │ 789 012 │ 345 678 │ 901 234 │ 567 890 │
├─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│   G3    │  12345  │  67890  │  11111  │  22222  │  33333  │
├─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│   G2    │  12345  │  67890  │  11111  │  22222  │  33333  │
├─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│   G1    │  12345  │  67890  │  11111  │  22222  │  33333  │
├─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│   ĐB    │  12345  │  67890  │  11111  │  22222  │  33333  │
└─────────┴─────────┴─────────┴─────────┴─────────┴─────────┘
```

### **2. Table Structure:**
```html
<table class="result-table">
    <thead>
        <tr class="date-header">
            <td colspan="N+1">Ngày - Thứ</td>
        </tr>
        <tr>
            <th>Giải</th>
            <th>Tỉnh 1</th>
            <th>Tỉnh 2</th>
            <th>Tỉnh 3</th>
            <!-- ... -->
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>G8</td>
            <td>Số tỉnh 1</td>
            <td>Số tỉnh 2</td>
            <td>Số tỉnh 3</td>
            <!-- ... -->
        </tr>
        <tr>
            <td>G7</td>
            <td>Số tỉnh 1</td>
            <td>Số tỉnh 2</td>
            <td>Số tỉnh 3</td>
            <!-- ... -->
        </tr>
        <!-- ... các giải khác -->
    </tbody>
</table>
```

## 🔧 **Implementation:**

### **1. Generate Table Row Function:**
```javascript
const generateTableRow = (prizeLabel, allStationsData, isSpecial = false) => {
    if (!allStationsData || allStationsData.length === 0) return '';
    
    let rowHTML = `
        <tr>
            <td style="padding: ${sizes.cellPadding}; font-weight: bold; width: 15%; border: 2px solid #000; text-align: center; font-size: ${sizes.prizeLabel}; background-color: #f8f9fa;">
                ${prizeLabel}
            </td>
    `;
    
    // Tạo cột cho từng tỉnh
    allStationsData.forEach((stationData, index) => {
        let prizeData = [];
        
        // Lấy dữ liệu theo tên giải
        switch (prizeLabel) {
            case 'G8':
                prizeData = stationData.eightPrizes || [];
                break;
            case 'G7':
                prizeData = stationData.sevenPrizes || [];
                break;
            case 'G6':
                prizeData = stationData.sixPrizes || [];
                break;
            case 'G5':
                prizeData = stationData.fivePrizes || [];
                break;
            case 'G4':
                prizeData = stationData.fourPrizes || [];
                break;
            case 'G3':
                prizeData = stationData.threePrizes || [];
                break;
            case 'G2':
                prizeData = stationData.secondPrize || [];
                break;
            case 'G1':
                prizeData = stationData.firstPrize || [];
                break;
            case 'ĐB':
                prizeData = stationData.specialPrize || [];
                break;
            default:
                prizeData = [];
        }
        
        const numbers = prizeData.map(num =>
            num ? getFilteredNumber(num, 'all') : '-'
        ).join(`<span style="margin: 0 ${sizes.numberSpacing};">&nbsp;</span>`);
        
        rowHTML += `
            <td style="padding: ${sizes.cellPadding}; border: 2px solid #000; text-align: center; font-size: ${isSpecial ? sizes.specialPrize : sizes.prizeValue}; display: flex; justify-content: center; align-items: center; flex-wrap: wrap; gap: ${sizes.numberSpacing}; min-width: 120px;">
                ${numbers}
            </td>
        `;
    });
    
    rowHTML += '</tr>';
    return rowHTML;
};
```

### **2. Table Header Generation:**
```javascript
// Header cho từng tỉnh
stations.forEach(station => {
    printHTML += `
        <th style="font-size: ${sizes.prizeLabel};">
            ${station.tentinh || `Tỉnh ${stations.indexOf(station) + 1}`}
        </th>
    `;
});
```

### **3. Table Structure:**
```javascript
printHTML += `
    <table class="result-table" style="margin-bottom: 30px;">
        <thead>
            <tr class="date-header">
                <td colspan="${stations.length + 1}" style="text-align: center; padding: ${sizes.cellPadding}; font-weight: bold; font-size: ${sizes.header}; border: 2px solid #000; background-color: #f0f0f0;">
                    ${dayData.drawDate} - ${dayData.dayOfWeek}
                </td>
            </tr>
            <tr>
                <th style="width: 15%;">Giải</th>
`;

// Header cho từng tỉnh
stations.forEach(station => {
    printHTML += `
        <th style="font-size: ${sizes.prizeLabel};">
            ${station.tentinh || `Tỉnh ${stations.indexOf(station) + 1}`}
        </th>
    `;
});

printHTML += `
            </tr>
        </thead>
        <tbody>
`;
```

## 🎨 **CSS Styling:**

### **1. Table Layout:**
```css
.result-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
}

.result-table th,
.result-table td {
    border: 2px solid #000;
    padding: ${sizes.cellPadding};
    text-align: center;
    vertical-align: middle;
}

.result-table th {
    background-color: #e9ecef;
    font-weight: bold;
    font-size: ${sizes.header};
}

.date-header {
    background-color: #f0f0f0;
    font-weight: bold;
    font-size: ${sizes.header};
}
```

### **2. Cell Styling:**
```css
/* Giải column */
td:first-child {
    background-color: #f8f9fa;
    font-weight: bold;
    width: 15%;
}

/* Tỉnh columns */
td:not(:first-child) {
    min-width: 120px;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-wrap: wrap;
    gap: ${sizes.numberSpacing};
}
```

## 📊 **Tính Năng:**

### **1. Layout Mới:**
- ✅ **Multi-column**: Mỗi tỉnh 1 cột riêng
- ✅ **Multi-row**: Mỗi giải 1 row riêng
- ✅ **Easy comparison**: Dễ so sánh giữa các tỉnh
- ✅ **Clear structure**: Cấu trúc rõ ràng

### **2. Responsive Design:**
- ✅ **Fixed layout**: Table layout fixed
- ✅ **Min width**: Minimum width cho cells
- ✅ **Flex wrap**: Numbers wrap trong cells
- ✅ **Proper spacing**: Khoảng cách phù hợp

### **3. Print Optimization:**
- ✅ **Page margins**: 8mm margins
- ✅ **Font sizes**: Font size động theo khổ giấy
- ✅ **Border styling**: Viền đậm, dễ đọc
- ✅ **Background colors**: Màu nền phân biệt

## 🎯 **Kết Quả:**

### **1. User Experience:**
- ✅ **Easy reading**: Dễ đọc và so sánh
- ✅ **Clear structure**: Cấu trúc rõ ràng
- ✅ **Professional look**: Giao diện chuyên nghiệp
- ✅ **Compact layout**: Layout gọn gàng

### **2. Print Quality:**
- ✅ **Clear borders**: Viền rõ ràng
- ✅ **Proper spacing**: Khoảng cách phù hợp
- ✅ **Readable fonts**: Font dễ đọc
- ✅ **Good contrast**: Độ tương phản tốt

### **3. Data Organization:**
- ✅ **Logical grouping**: Nhóm logic theo tỉnh
- ✅ **Easy comparison**: Dễ so sánh giữa tỉnh
- ✅ **Complete data**: Dữ liệu đầy đủ
- ✅ **Structured format**: Format có cấu trúc

## 📈 **Performance:**

### **1. Generation:**
- ✅ **Efficient loops**: Vòng lặp hiệu quả
- ✅ **Minimal DOM**: DOM tối thiểu
- ✅ **Optimized strings**: String concatenation tối ưu
- ✅ **Memory efficient**: Sử dụng memory hiệu quả

### **2. Print:**
- ✅ **Fast rendering**: Render nhanh
- ✅ **Clean output**: Output sạch sẽ
- ✅ **Browser compatible**: Tương thích browser
- ✅ **Print friendly**: Thân thiện với in

**🎉 Bảng in XSMT đã được thiết kế lại với layout mới, mỗi tỉnh 1 cột và mỗi giải 1 row!** 