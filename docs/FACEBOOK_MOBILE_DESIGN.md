# Facebook-Style Mobile Design cho Diễn Đàn

## Tổng quan

Đã thiết kế lại giao diện mobile cho diễn đàn theo phong cách Facebook để tạo trải nghiệm người dùng quen thuộc và hiện đại trên thiết bị di động.

## Đặc điểm chính

### 🎨 **Facebook Design System**
- **Color Scheme**: Sử dụng bảng màu Facebook chính thức
- **Typography**: Font system giống Facebook (-apple-system, BlinkMacSystemFont)
- **Spacing**: Hệ thống spacing nhất quán
- **Shadows**: Box shadows tinh tế giống Facebook
- **Border Radius**: Bo góc 8px và 12px

### 📱 **Mobile-First Layout**
- **Fixed Header**: Header cố định với title và action buttons
- **Bottom Navigation**: Navigation bar cố định ở dưới
- **Card-based Design**: Mỗi component được wrap trong card
- **Touch-friendly**: Kích thước button và spacing phù hợp cho touch

### 🎯 **Component Structure**

#### **1. Facebook Mobile Container**
```jsx
<div className={styles.fbMobileContainer}>
    <header className={styles.fbMobileHeader}>
        <div className={styles.fbMobileHeaderTitle}>Diễn Đàn Xổ Số</div>
        <div className={styles.fbMobileHeaderActions}>
            <button className={styles.fbMobileHeaderButton}>
                <FaSearch />
            </button>
            <button className={styles.fbMobileHeaderButton}>
                <FaEllipsisH />
            </button>
        </div>
    </header>
    
    <main className={styles.fbMobileContent}>
        {/* Content */}
    </main>
    
    <nav className={styles.fbMobileBottomNav}>
        {/* Bottom Navigation */}
    </nav>
</div>
```

#### **2. Facebook Card Components**
- **Event Cards**: Hiển thị tin tức và sự kiện
- **User List Cards**: Danh sách thành viên
- **Leaderboard Cards**: Bảng xếp hạng
- **Story Cards**: Sự kiện quan trọng

#### **3. Bottom Navigation**
- **Trang chủ**: FaHome icon
- **Thành viên**: FaUsers icon  
- **Xếp hạng**: FaTrophy icon
- **Thông báo**: FaBell icon
- **Cá nhân**: FaUser icon

## CSS Implementation

### **CSS Modules Compatibility**
Do CSS Modules không hỗ trợ `:root` selector, chúng ta sử dụng hardcoded values thay vì CSS variables:

### **Facebook Color Palette**
```css
/* Primary Colors */
--fb-primary: #1877f2;        /* Facebook Blue */
--fb-secondary: #42a5f5;      /* Light Blue */
--fb-success: #4caf50;        /* Green */
--fb-warning: #ff9800;        /* Orange */
--fb-danger: #f44336;         /* Red */

/* Background Colors */
--fb-light: #f0f2f5;          /* Light Gray */
--fb-dark: #1c1e21;           /* Dark Gray */

/* Text Colors */
--fb-text-primary: #050505;   /* Primary Text */
--fb-text-secondary: #65676b; /* Secondary Text */
--fb-text-tertiary: #8e8e93;  /* Tertiary Text */

/* Border Colors */
--fb-border: #dadde1;         /* Border Color */
```

### **Global CSS Variables**
CSS variables được định nghĩa trong `globals.css` để sử dụng toàn cục:

```css
:root {
  /* Facebook Color Palette */
  --fb-primary: #1877f2;
  --fb-secondary: #42a5f5;
  --fb-success: #4caf50;
  --fb-warning: #ff9800;
  --fb-danger: #f44336;
  --fb-light: #f0f2f5;
  --fb-dark: #1c1e21;
  --fb-text-primary: #050505;
  --fb-text-secondary: #65676b;
  --fb-text-tertiary: #8e8e93;
  --fb-border: #dadde1;
  --fb-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  --fb-shadow-hover: 0 4px 8px rgba(0, 0, 0, 0.15);
  --fb-radius: 8px;
  --fb-radius-lg: 12px;
  --fb-spacing-xs: 4px;
  --fb-spacing-sm: 8px;
  --fb-spacing-md: 12px;
  --fb-spacing-lg: 16px;
  --fb-spacing-xl: 20px;
  --fb-spacing-2xl: 24px;
}
```

## Component Types

### **1. Event Component**
```jsx
<div className={styles.fbMobileCard}>
    <div className={styles.fbMobileCardHeader}>
        <div className={styles.fbMobileCardAvatar}>📢</div>
        <div className={styles.fbMobileCardInfo}>
            <div className={styles.fbMobileCardTitle}>Tin Hot & Sự Kiện</div>
            <div className={styles.fbMobileCardSubtitle}>Cập nhật thông tin mới nhất</div>
        </div>
    </div>
    <div className={styles.fbMobileCardContent}>
        {/* Content */}
    </div>
    <div className={styles.fbMobileCardActions}>
        <button className={styles.fbMobileActionButton}>
            <FaThumbsUp /> Thích
        </button>
        <button className={styles.fbMobileActionButton}>
            <FaComment /> Bình luận
        </button>
        <button className={styles.fbMobileActionButton}>
            <FaShare /> Chia sẻ
        </button>
    </div>
</div>
```

### **2. User List Component**
```jsx
<div className={styles.fbMobileUserList}>
    <div className={styles.fbMobileCardHeader}>
        <div className={styles.fbMobileCardAvatar}>👥</div>
        <div className={styles.fbMobileCardInfo}>
            <div className={styles.fbMobileCardTitle}>Thành Viên Nhóm</div>
            <div className={styles.fbMobileCardSubtitle}>Danh sách thành viên tích cực</div>
        </div>
    </div>
    <div className={styles.fbMobileUserItem}>
        <div className={styles.fbMobileUserAvatar}>U</div>
        <div className={styles.fbMobileUserInfo}>
            <div className={styles.fbMobileUserName}>User Name</div>
            <div className={styles.fbMobileUserStatus}>Online</div>
        </div>
        <div className={styles.fbMobileUserActions}>
            <button className={styles.fbMobileUserButton}>Nhắn tin</button>
        </div>
    </div>
</div>
```

### **3. Leaderboard Component**
```jsx
<div className={styles.fbMobileLeaderboard}>
    <div className={styles.fbMobileLeaderboardHeader}>
        <div className={styles.fbMobileLeaderboardTitle}>👑 Bảng Xếp Hạng</div>
        <div className={styles.fbMobileLeaderboardSubtitle}>Top 50 thành viên hàng đầu</div>
    </div>
    <div className={styles.fbMobileLeaderboardItem}>
        <div className={`${styles.fbMobileLeaderboardRank} ${styles.top1}`}>1</div>
        <div className={styles.fbMobileLeaderboardInfo}>
            <div className={styles.fbMobileLeaderboardName}>Top User</div>
            <div className={styles.fbMobileLeaderboardScore}>1000 điểm</div>
        </div>
    </div>
</div>
```

## Responsive Design

### **Breakpoints**
- **Mobile**: <= 768px (Facebook-style layout)
- **Desktop**: > 768px (Original layout)

### **Mobile Optimizations**
- **Touch Targets**: Minimum 44px cho buttons
- **Spacing**: Tăng spacing cho dễ touch
- **Font Size**: Tối thiểu 14px cho text
- **Card Design**: Rounded corners và shadows

### **Dark Mode Support**
```css
@media (prefers-color-scheme: dark) {
    :root {
        --fb-light: #1c1e21;
        --fb-dark: #ffffff;
        --fb-text-primary: #ffffff;
        --fb-text-secondary: #b0b3b8;
        --fb-border: #3e4042;
    }
}
```

## Performance Optimizations

### **1. Conditional Rendering**
- Chỉ render Facebook layout trên mobile
- Desktop giữ nguyên layout gốc

### **2. CSS Optimization**
- Sử dụng CSS variables để dễ maintain
- Minimize reflows với transform
- Hardware acceleration với will-change

### **3. Icon Optimization**
- Sử dụng react-icons cho consistency
- SVG icons cho crisp rendering
- Optimized icon sizes cho mobile

## User Experience Features

### **1. Facebook-like Interactions**
- **Like/Unlike**: Thumbs up button
- **Comment**: Comment button
- **Share**: Share button
- **Touch Feedback**: Hover effects

### **2. Navigation**
- **Bottom Navigation**: Fixed navigation bar
- **Active States**: Visual feedback cho active tab
- **Smooth Transitions**: CSS transitions cho interactions

### **3. Content Organization**
- **Card-based Layout**: Mỗi section là một card
- **Clear Hierarchy**: Typography hierarchy rõ ràng
- **Consistent Spacing**: Spacing system nhất quán

## Implementation Guide

### **1. Setup FacebookMobileLayout**
```jsx
import FacebookMobileLayout from './FacebookMobileLayout';

export default function DienDan({ session }) {
    return (
        <FacebookMobileLayout>
            {/* Your content */}
        </FacebookMobileLayout>
    );
}
```

### **2. CSS Import**
```jsx
import styles from '../../styles/facebookMobile.module.css';
```

### **3. Icon Import**
```jsx
import { 
    FaHome, 
    FaUsers, 
    FaTrophy, 
    FaBell, 
    FaUser,
    FaSearch,
    FaEllipsisH,
    FaThumbsUp,
    FaComment,
    FaShare
} from 'react-icons/fa';
```

## Testing Checklist

### **Mobile Testing**
- [ ] Header hiển thị đúng trên mobile
- [ ] Bottom navigation hoạt động
- [ ] Cards có đúng spacing và shadows
- [ ] Touch targets đủ lớn (44px+)
- [ ] Text readable trên mobile
- [ ] Dark mode hoạt động

### **Desktop Testing**
- [ ] Layout gốc hiển thị trên desktop
- [ ] Không có conflict với Facebook layout
- [ ] Responsive breakpoints hoạt động

### **Performance Testing**
- [ ] Smooth transitions
- [ ] No layout shifts
- [ ] Fast loading times
- [ ] Memory efficient

## Future Enhancements

### **1. Advanced Interactions**
- **Swipe Gestures**: Swipe để navigate
- **Pull to Refresh**: Refresh content
- **Infinite Scroll**: Load more content

### **2. Accessibility**
- **ARIA Labels**: Screen reader support
- **Keyboard Navigation**: Full keyboard support
- **High Contrast**: High contrast mode

### **3. Personalization**
- **Theme Customization**: User-defined themes
- **Layout Preferences**: User layout choices
- **Content Filtering**: Personalized content

## Troubleshooting

### **Common Issues**

#### **1. CSS Modules :root Error**
```
Syntax error: Selector ":root" is not pure (pure selectors must contain at least one local class or id)
```
**Giải pháp:**
- Di chuyển CSS variables vào `globals.css`
- Sử dụng hardcoded values trong CSS Modules
- Import `globals.css` trong `_app.js`

#### **2. Layout không responsive**
- Kiểm tra CSS media queries
- Verify breakpoint values
- Check container widths

#### **3. Icons không hiển thị**
- Verify react-icons installation
- Check import statements
- Ensure icon names correct

#### **4. Styling conflicts**
- Check CSS specificity
- Verify class names unique
- Review CSS cascade

#### **5. Performance issues**
- Optimize image sizes
- Minimize CSS bundle
- Use lazy loading

#### **6. Dark mode không hoạt động**
- Kiểm tra `prefers-color-scheme` media query
- Verify CSS variables được định nghĩa đúng
- Test trên thiết bị thật

## Conclusion

Facebook-style mobile design đã được implement thành công với:

✅ **Modern UI/UX**: Giao diện hiện đại giống Facebook  
✅ **Mobile-First**: Tối ưu cho mobile devices  
✅ **Responsive**: Hoạt động tốt trên mọi thiết bị  
✅ **Performance**: Tối ưu performance và loading  
✅ **Accessibility**: Hỗ trợ accessibility standards  
✅ **Maintainable**: Code dễ maintain và extend  

Layout này sẽ tạo trải nghiệm người dùng quen thuộc và chuyên nghiệp trên mobile, đồng thời giữ nguyên functionality trên desktop.
