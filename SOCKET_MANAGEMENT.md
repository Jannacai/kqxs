# Quản lý Socket.IO Connection

## Vấn đề đã được giải quyết

### 1. **Xung đột kết nối Socket.IO**
- **Trước**: Mỗi component tạo socket connection riêng biệt
- **Sau**: Sử dụng shared socket connection thông qua `utils/Socket.js`

### 2. **Timeout khi LiveResult.js XSMT hoạt động**
- **Nguyên nhân**: Nhiều EventSource connections từ LiveResult.js + nhiều Socket.IO connections từ diễn đàn
- **Giải pháp**: Tập trung quản lý connection và tối ưu reconnection logic

## Cách sử dụng

### 1. Import shared socket utilities
```javascript
import { getSocket, isSocketConnected, addConnectionListener } from '../../utils/Socket';
```

### 2. Khởi tạo socket connection
```javascript
useEffect(() => {
    const initializeSocket = async () => {
        try {
            const socket = await getSocket();
            // Thêm event listeners
            socket.on('connect', () => {
                console.log('Connected:', socket.id);
            });
            
            socket.on('YOUR_EVENT', (data) => {
                // Xử lý event
            });
        } catch (error) {
            console.error('Socket initialization failed:', error);
        }
    };

    initializeSocket();
}, []);
```

### 3. Theo dõi trạng thái connection
```javascript
const [socketConnected, setSocketConnected] = useState(false);

useEffect(() => {
    const removeListener = addConnectionListener((connected) => {
        setSocketConnected(connected);
    });

    return () => removeListener();
}, []);
```

## Các tính năng

### 1. **Connection Pooling**
- Chỉ tạo một socket connection cho toàn bộ ứng dụng
- Tự động quản lý reconnection
- Tránh xung đột với EventSource connections

### 2. **Smart Reconnection**
- Exponential backoff cho retry attempts
- Tự động reconnect khi mất kết nối
- Cleanup connections khi component unmount

### 3. **Error Handling**
- Timeout handling (15 giây)
- Authentication error handling
- Graceful degradation khi connection thất bại

### 4. **Performance Optimization**
- Debounced reconnection attempts
- Connection state tracking
- Memory leak prevention

## Các component đã được cập nhật

1. **UserList.js** - Sử dụng shared socket connection
2. **groupchat.js** - Cập nhật để tránh xung đột
3. **thongbao.js** - Tối ưu connection management
4. **vinhdanh.js** - Sử dụng shared connection
5. **UserAvatar.js** - Cập nhật socket initialization

## Monitoring

### Socket Status Component
```javascript
import SocketStatus from '../components/SocketStatus';

// Thêm vào layout chính
<SocketStatus />
```

### Debug Logs
- Connection events được log với prefix `[Socket.IO]`
- Error handling với detailed logging
- Performance metrics tracking

## Best Practices

1. **Luôn cleanup event listeners** khi component unmount
2. **Sử dụng mountedRef** để tránh memory leaks
3. **Handle connection errors** gracefully
4. **Test reconnection logic** trong production

## Troubleshooting

### Lỗi "Socket.IO connection error: timeout"
- Kiểm tra network connectivity
- Verify server endpoint availability
- Check firewall settings

### Memory Leaks
- Đảm bảo cleanup event listeners
- Sử dụng mountedRef pattern
- Monitor connection pool size

### Performance Issues
- Limit số lượng concurrent connections
- Implement connection pooling
- Use debounced reconnection 