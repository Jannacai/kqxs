const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://backendkqxs-1.onrender.com';
const API_BASE_URL2 = process.env.NEXT_PUBLIC_BACKEND_URL2 || 'https://scraper-1-fewd.onrender.com';

// Hàm tạo userId ngẫu nhiên nếu không có hệ thống đăng nhập
const getUserId = () => {
    if (typeof window !== 'undefined') {
        let userId = localStorage.getItem('userId');
        if (!userId) {
            userId = Math.random().toString(36).substring(2);
            localStorage.setItem('userId', userId);
        }
        return userId;
    }
    return 'default-user';
};

export const apiMB = {
    getLottery: async (station, urlDate, dayof, pagination = {}) => {
        let url = `${API_BASE_URL}/api/kqxs`;

        // ✅ CẢI THIỆN: Logic API call đúng với backend
        if (dayof) {
            // Logic theo thứ trong tuần
            if (!dayof || dayof.trim() === '') {
                throw new Error('dayOfWeek cannot be empty');
            }
            url = `${API_BASE_URL}/api/kqxs/xsmb/${dayof}`;
        } else if (station && urlDate) {
            // Logic theo ngày cụ thể - sử dụng endpoint chính với date parameter
            if (!station || !urlDate || station.trim() === '' || urlDate.trim() === '') {
                throw new Error('Station and date cannot be empty');
            }
            url = `${API_BASE_URL}/api/kqxs/xsmb-${urlDate}`;
        } else {
            // Logic lấy tất cả
            url = `${API_BASE_URL}/api/kqxs/xsmb`;
        }

        // ✅ CẢI THIỆN: Thêm pagination parameters nếu có
        const urlParams = new URLSearchParams();
        if (pagination.page && pagination.limit) {
            urlParams.append('page', pagination.page);
            urlParams.append('limit', pagination.limit);
        }

        // ✅ SỬA: Không thêm urlDate parameter nữa vì đã có trong URL
        // URL đã có format: /api/kqxs/xsmb-01-08-2025

        if (urlParams.toString()) {
            url += `?${urlParams.toString()}`;
        }

        // ✅ THÊM: Debug log để kiểm tra API call
        console.log('🔍 Debug kqxsMB.js API call:', {
            station,
            urlDate,
            dayof,
            url,
            urlParams: urlParams.toString()
        });

        try {
            const response = await fetch(url, {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache',
                    'x-user-id': getUserId(),
                },
            });

            if (!response.ok) {
                throw new Error(`Lỗi khi gọi API: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();
            return data || [];
        } catch (error) {
            console.error('Lỗi khi lấy dữ liệu xổ số:', error);
            throw new Error('Không thể tải dữ liệu xổ số, vui lòng thử lại sau');
        }
    },
    getLotteryTinh: async (station, tinh) => {
        let url = `${API_BASE_URL}/api/kqxs`;

        if (tinh) {
            if (!station || !tinh || station.trim() === '' || tinh.trim() === '') {
                throw new Error('Station and tinh cannot be empty');
            }
            url = `${API_BASE_URL}/api/kqxs/${station}/tinh/${tinh}`;
        }
        try {
            const response = await fetch(url, {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache',
                    'x-user-id': getUserId(),
                },
            });

            if (!response.ok) {
                throw new Error(`Lỗi khi gọi API: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();
            return data || [];
        } catch (error) {
            console.error('Lỗi khi lấy dữ liệu xổ số:', error);
            throw new Error('Không thể tải dữ liệu xổ số, vui lòng thử lại sau');
        }
    },
    getLoGanStats: async (days) => {
        if (!days || !['6', '7', '14', '30', '60'].includes(days.toString())) {
            throw new Error('Invalid days parameter. Valid options are: 6, 7, 14, 30, 60.');
        }

        const url = `${API_BASE_URL}/api/kqxs/xsmb/statistics/gan?days=${days}`;

        try {
            const response = await fetch(url, {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache',
                    'x-user-id': getUserId(),
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Lỗi khi gọi API: ${response.status} - ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Lỗi khi lấy thống kê lô gan:', error);
            throw new Error('Không thể tải thống kê lô gan, vui lòng thử lại sau');
        }
    },

    getSpecialStats: async (days) => {
        if (!days || !['10', '20', '30', '60', '90', '365'].includes(days.toString())) {
            throw new Error('Invalid days parameter. Valid options are: 10, 20, 30, 60, 90, 365.');
        }

        const url = `${API_BASE_URL}/api/kqxs/xsmb/statistics/special?days=${days}`;

        try {
            const response = await fetch(url, {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache',
                    'x-user-id': getUserId(),
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Lỗi khi gọi API: ${response.status} - ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Lỗi khi lấy thống kê giải đặc biệt:', error);
            throw new Error('Không thể tải thống kê giải đặc biệt, vui lòng thử lại sau');
        }
    },

    getDauDuoiStats: async (days) => {
        if (!days || !['30', '60', '90', '120', '180', '365'].includes(days.toString())) {
            throw new Error('Invalid days parameter. Valid options are: 30, 60, 90, 120, 180, 365.');
        }

        const url = `${API_BASE_URL}/api/kqxs/xsmb/statistics/dau-duoi?days=${days}`;

        try {
            const response = await fetch(url, {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache',
                    'x-user-id': getUserId(),
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Lỗi khi gọi API: ${response.status} - ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Lỗi khi lấy thống kê đầu đuôi:', error);
            throw new Error('Không thể tải thống kê đầu đuôi, vui lòng thử lại sau');
        }
    },

    getDauDuoiStatsByDate: async (days) => {
        if (!days || !['30', '60', '90', '120', '180', '365'].includes(days.toString())) {
            throw new Error('Invalid days parameter. Valid options are: 30, 60, 90, 120, 180, 365.');
        }

        const url = `${API_BASE_URL}/api/kqxs/xsmb/statistics/dau-duoi-by-date?days=${days}`;

        try {
            const response = await fetch(url, {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache',
                    'x-user-id': getUserId(),
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Lỗi khi gọi API: ${response.status} - ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Lỗi khi lấy thống kê đầu đuôi theo ngày:', error);
            throw new Error('Không thể tải thống kê đầu đuôi theo ngày, vui lòng thử lại sau');
        }
    },

    getSpecialStatsByWeek: async (month, year) => {
        const url = `${API_BASE_URL}/api/kqxs/xsmb/statistics/special-by-week?month=${month}&year=${year}`;

        try {
            const response = await fetch(url, {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache',
                    'x-user-id': getUserId(),
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Lỗi khi gọi API: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Dữ liệu từ API getSpecialStatsByWeek:', data); // Log để kiểm tra dữ liệu
            return data;
        } catch (error) {
            console.error('Lỗi khi lấy thống kê giải đặc biệt theo tuần:', error);
            throw new Error('Không thể tải thống kê giải đặc biệt theo tuần, vui lòng thử lại sau');
        }
    },

    getTanSuatLotoStats: async (days) => {
        if (!days || !['30', '60', '90', '120', '180', '365'].includes(days.toString())) {
            throw new Error('Invalid days parameter. Valid options are: 30, 60, 90, 120, 180, 365.');
        }

        const url = `${API_BASE_URL}/api/kqxs/xsmb/statistics/tan-suat-loto?days=${days}`;

        try {
            const response = await fetch(url, {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache',
                    'x-user-id': getUserId(),
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Lỗi khi gọi API: ${response.status} - ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Lỗi khi lấy thống kê tần suất loto:', error);
            throw new Error('Không thể tải thống kê tần suất loto, vui lòng thử lại sau');
        }
    },

    getTanSuatLoCapStats: async (days) => {
        if (!days || !['30', '60', '90', '120', '180', '365'].includes(days.toString())) {
            throw new Error('Invalid days parameter. Valid options are: 30, 60, 90, 120, 180, 365.');
        }

        const url = `${API_BASE_URL}/api/kqxs/xsmb/statistics/tan-suat-lo-cap?days=${days}`;
        console.log('Calling API:', url);
        const response = await fetch(url, {
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache',
                'x-user-id': getUserId(),
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'KHÔNG GỌI ĐƯỢC API THỐNG KÊ TẦN SUẤT LÔ CẶP....');
        }

        return response.json();
    },

    // ✅ CẬP NHẬT: Sử dụng endpoint scheduler mới thay vì trigger thủ công
    triggerScraper: async (date, station) => {
        if (!date || !station || date.trim() === '' || station.trim() === '') {
            throw new Error('Date and station cannot be empty');
        }

        const url = `${API_BASE_URL2}/api/scraper/scheduler/trigger`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': getUserId(),
                },
                body: JSON.stringify({ date, station }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Lỗi khi gọi API scheduler: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Lỗi khi kích hoạt scraper qua scheduler:', error);
            throw new Error('Không thể kích hoạt scraper, vui lòng thử lại sau');
        }
    },

    // ✅ MỚI: Kiểm tra trạng thái scheduler
    getSchedulerStatus: async () => {
        const url = `${API_BASE_URL2}/api/scraper/scheduler/status`;

        try {
            const response = await fetch(url, {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache',
                    'x-user-id': getUserId(),
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Lỗi khi gọi API scheduler status: ${response.status} - ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Lỗi khi lấy trạng thái scheduler:', error);
            throw new Error('Không thể lấy trạng thái scheduler, vui lòng thử lại sau');
        }
    },

    // ✅ MỚI: Điều khiển scheduler
    controlScheduler: async (action) => {
        if (!action || !['start', 'stop'].includes(action)) {
            throw new Error('Action không hợp lệ. Chỉ chấp nhận: start, stop');
        }

        const url = `${API_BASE_URL2}/api/scraper/scheduler/control`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': getUserId(),
                },
                body: JSON.stringify({ action }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Lỗi khi điều khiển scheduler: ${response.status} - ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Lỗi khi điều khiển scheduler:', error);
            throw new Error('Không thể điều khiển scheduler, vui lòng thử lại sau');
        }
    },

    getBachThuMB: async (date, days) => {
        if (!date || !/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
            throw new Error('Invalid date parameter. Format must be DD/MM/YYYY.');
        }
        const validDays = [3, 5, 7, 10, 14];
        if (days && !validDays.includes(parseInt(days))) {
            throw new Error('Invalid days parameter. Must be one of: 3, 5, 7, 10, 14.');
        }

        const url = `${API_BASE_URL}/api/kqxs/xsmb/soicau/soi-cau-bach-thu?date=${date}${days ? `&days=${days}` : ''}`;

        try {
            const response = await fetch(url, {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache',
                    'x-user-id': getUserId(),
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Lỗi khi gọi API: ${response.status} - ${response.statusText}`, { suggestedDate: errorData.suggestedDate });
            }

            return await response.json();
        } catch (error) {
            console.error('Lỗi khi lấy soi cầu bạch thủ:', error);
            throw new Error(error.message || 'Không thể tải soi cầu bạch thủ, vui lòng thử lại sau', { suggestedDate: error.suggestedDate });
        }
    },
};