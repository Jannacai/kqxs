const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
const API_BASE_URL2 = process.env.NEXT_PUBLIC_BACKEND_URL2 || 'http://localhost:4000';

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

export const apiMT = {
    getLottery: async (station, date, tinh, dayof) => {
        let url = `${API_BASE_URL}/api/ketquaxs/xsmt`;

        if (dayof) {
            if (!dayof || dayof.trim() === '') {
                throw new Error('dayOfWeek cannot be empty');
            }
            url = `${API_BASE_URL}/api/ketquaxs/xsmt/${dayof}`;
        } else if (station && date) {
            if (!station || !date || station.trim() === '' || date.trim() === '') {
                throw new Error('Station and date cannot be empty');
            }
            url = `${API_BASE_URL}/api/ketquaxs/${station}-${date}`;
        } else if (station && tinh) {
            if (!station || !tinh || station.trim() === '' || tinh.trim() === '') {
                throw new Error('Station and date cannot be empty');
            }
            url = `${API_BASE_URL}/api/ketquaxs/${station}/tinh/${tinh}`;
        } else {
            url = `${API_BASE_URL}/api/ketquaxs/xsmt`;
        }

        const response = await fetch(url, {
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache',
                'x-user-id': getUserId(),
            },
        });

        if (!response.ok) {
            throw new Error('KHÔNG GỌI ĐƯỢC API VÌ KHÔNG CÓ DỮ LIỆU HOẶC LỖI....');
        }

        return response.json();
    },

    getLoGanStats: async (days, tinh) => {
        if (!days || !['6', '7', '14', '30', '60'].includes(days.toString())) {
            throw new Error('Invalid days parameter. Valid options are: 6, 7, 14, 30, 60.');
        }

        if (!tinh || tinh.trim() === '') {
            throw new Error('Tinh cannot be empty for Miền Trung');
        }

        const url = `${API_BASE_URL}/api/ketquaxs/xsmt/statistics/gan?days=${days}&tinh=${tinh}`;
        const response = await fetch(url, {
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache',
                'x-user-id': getUserId(),
            },
        });
        if (!response.ok) {
            throw new Error('KHÔNG GỌI ĐƯỢC API THỐNG KÊ LÔ GAN....');
        }
        return response.json();
    },

    getSpecialStats: async (days, tinh) => {
        if (!tinh || tinh.trim() === '') {
            throw new Error('Tinh cannot be empty for Miền Trung');
        }
        if (!days || !['10', '20', '30', '60', '90', '365'].includes(days.toString())) {
            throw new Error('Invalid days parameter. Valid options are: 6, 7, 10, 15, 20, 30.');
        }

        const url = `${API_BASE_URL}/api/ketquaxs/xsmt/statistics/special?days=${days}&tinh=${tinh}`;

        const response = await fetch(url, {
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache',
                'x-user-id': getUserId(),
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'KHÔNG GỌI ĐƯỢC API VÌ KHÔNG CÓ DỮ LIỆU HOẶC LỖI....');
        }

        return response.json();
    },

    getDauDuoiStats: async (days, tinh) => {
        if (!tinh || tinh.trim() === '') {
            throw new Error('Tinh cannot be empty for Miền Trung');
        }
        if (!days || !['30', '60', '120', '180', '365'].includes(days.toString())) {
            throw new Error('Invalid days parameter. Valid options are: 30, 60.');
        }

        const url = `${API_BASE_URL}/api/ketquaxs/xsmt/statistics/dau-duoi?days=${days}&tinh=${tinh}`;

        const response = await fetch(url, {
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache',
                'x-user-id': getUserId(),
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'KHÔNG GỌI ĐƯỢC API VÌ KHÔNG CÓ DỮ LIỆU HOẶC LỖI....');
        }

        return response.json();
    },

    getDauDuoiStatsByDate: async (days, tinh) => {
        if (!days || !['30', '60', '90', '120', '180', '365'].includes(days.toString())) {
            throw new Error('Invalid days parameter. Valid options are: 30, 60.');
        }

        const url = `${API_BASE_URL}/api/ketquaxs/xsmt/statistics/dau-duoi-by-date?days=${days}&tinh=${tinh}`;

        const response = await fetch(url, {
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache',
                'x-user-id': getUserId(),
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'KHÔNG GỌI ĐƯỢC API VÌ KHÔNG CÓ DỮ LIỆU HOẶC LỖI....');
        }

        return response.json();
    },

    getSpecialStatsByWeek: async (month, year, tinh) => {
        if (!tinh || tinh.trim() === '') {
            throw new Error('Tinh cannot be empty for Miền Trung');
        }
        const url = `${API_BASE_URL}/api/ketquaxs/xsmt/statistics/special-by-week?month=${month}&year=${year}&tinh=${tinh}`;

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
            console.log('Dữ liệu từ API getSpecialStatsByWeek (Miền Trung):', data);
            return data;
        } catch (error) {
            console.error('Lỗi khi lấy thống kê giải đặc biệt theo tuần (Miền Trung):', error);
            throw new Error('Không thể tải thống kê giải đặc biệt theo tuần, vui lòng thử lại sau');
        }
    },

    getTanSuatLotoStats: async (days, tinh) => {
        if (!days || !['30', '60', '90', '120', '180', '365'].includes(days.toString())) {
            throw new Error('Invalid days parameter. Valid options are: 30, 60, 90, 120, 180, 365.');
        }

        if (!tinh || tinh.trim() === '') {
            throw new Error('Tinh cannot be empty for Miền Trung');
        }

        const url = `${API_BASE_URL}/api/ketquaxs/xsmt/statistics/tan-suat-loto?days=${days}&tinh=${tinh}`;
        const response = await fetch(url, {
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache',
                'x-user-id': getUserId(),
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'KHÔNG GỌI ĐƯỢC API THỐNG KÊ TẦN SUẤT LOTO....');
        }

        return response.json();
    },

    getTanSuatLoCapStats: async (days, tinh) => {
        if (!days || !['30', '60', '90', '120', '180', '365'].includes(days.toString())) {
            throw new Error('Invalid days parameter. Valid options are: 30, 60, 90, 120, 180, 365.');
        }

        if (!tinh || tinh.trim() === '') {
            throw new Error('Tinh cannot be empty for Miền Trung');
        }

        const url = `${API_BASE_URL}/api/ketquaxs/xsmt/statistics/tan-suat-lo-cap?days=${days}&tinh=${tinh}`;
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

        const url = `${API_BASE_URL2}/api/scraperMT/scrapeMT`;

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

    getProvinces: async (date) => {
        if (!date || date.trim() === '') {
            throw new Error('Date cannot be empty');
        }

        const currentTime = new Date();
        const thresholdTime = new Date(currentTime);
        thresholdTime.setHours(18, 30, 0, 0); // Đồng bộ với 17h35
        const isAfterResultTime = currentTime > thresholdTime;
        const targetDate = isAfterResultTime ? moment(date, 'DD/MM/YYYY').add(1, 'days').format('DD/MM/YYYY') : date;

        const url = `${API_BASE_URL}/api/ketquaxs/xsmt/provinces?date=${targetDate}`;
        const response = await fetch(url, {
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache',
                'x-user-id': getUserId(),
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `KHÔNG GỌI ĐƯỢC API DANH SÁCH TỈNH. Gợi ý ngày: ${moment().format('DD/MM/YYYY')}`);
        }

        const provinces = await response.json();
        if (!provinces || provinces.length === 0) {
            throw new Error(`Không tìm thấy tỉnh cho ngày ${targetDate}. Vui lòng thử lại với ngày khác hoặc gợi ý: ${moment().format('DD/MM/YYYY')}`);
        }

        return provinces;
    },

    getBachThuMT: async (date, days, tinh) => {
        if (!date || date.trim() === '') {
            throw new Error('Date cannot be empty');
        }
        if (!days || !['3', '5', '7', '10', '14'].includes(days.toString())) {
            throw new Error('Invalid days parameter. Valid options are: 3, 5, 7, 10, 14.');
        }
        if (!tinh || tinh.trim() === '') {
            throw new Error('Tinh cannot be empty for Miền Trung');
        }

        const currentTime = new Date();
        const thresholdTime = new Date(currentTime);
        thresholdTime.setHours(18, 30, 0, 0); // Đồng bộ với 17h35
        const isAfterResultTime = currentTime > thresholdTime;
        const targetDate = isAfterResultTime ? moment(date, 'DD/MM/YYYY').add(1, 'days').format('DD/MM/YYYY') : date;

        const url = `${API_BASE_URL}/api/ketquaxs/xsmt/soicau/soi-cau-bach-thu?date=${targetDate}&days=${days}&tinh=${tinh}`;

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
                throw new Error(errorData.error || `Lỗi khi gọi API soi cầu bạch thủ: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Dữ liệu từ API soi cầu bạch thủ XSMT:', data);
            return data;
        } catch (error) {
            console.error('Lỗi khi lấy dữ liệu soi cầu bạch thủ XSMT:', error);
            throw new Error('Không thể tải dữ liệu soi cầu, vui lòng thử lại sau');
        }
    },
};