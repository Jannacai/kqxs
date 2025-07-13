const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
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
    getLottery: async (station, date, dayof) => {
        let url = `${API_BASE_URL}/api/kqxs`;

        if (dayof) {
            if (!dayof || dayof.trim() === '') {
                throw new Error('dayOfWeek cannot be empty');
            }
            url = `${API_BASE_URL}/api/kqxs/xsmb/${dayof}`;
        } else if (station && date) {
            if (!station || !date || station.trim() === '' || date.trim() === '') {
                throw new Error('Station and date cannot be empty');
            }
            url = `${API_BASE_URL}/api/kqxs/${station}-${date}`;
        } else {
            url = `${API_BASE_URL}/api/kqxs`;
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

    triggerScraper: async (date, station) => {
        if (!date || !station || date.trim() === '' || station.trim() === '') {
            throw new Error('Date and station cannot be empty');
        }

        const url = `${API_BASE_URL2}/api/scraper/scrape`;

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
                throw new Error(errorData.message || `Lỗi khi gọi API scraper: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Lỗi khi kích hoạt scraper:', error);
            throw new Error('Không thể kích hoạt scraper, vui lòng thử lại sau');
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