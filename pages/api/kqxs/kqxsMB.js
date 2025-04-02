const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export const api = {
    getLottery: async (station, date, dayof) => {
        let url = `${API_BASE_URL}/api/kqxs`;

        // Trường hợp lấy KQXS theo dayOfWeek
        if (dayof) {
            if (!dayof || dayof.trim() === '') {
                throw new Error('dayOfWeek cannot be empty');
            }
            url = `${API_BASE_URL}/api/kqxs/xsmb/${dayof}`; // Gọi /api/kqxs/day/thu-5
        }
        // Trường hợp lấy KQXS theo slug (station-date)
        else if (station && date) {
            if (!station || !date || station.trim() === '' || date.trim() === '') {
                throw new Error('Station and date cannot be empty');
            }
            url = `${API_BASE_URL}/api/kqxs/${station}-${date}`; // Gọi /api/kqxs/xsmb-27-03-2025
        }
        // Trường hợp lấy tất cả KQXS
        else {
            url = `${API_BASE_URL}/api/kqxs`; // Gọi /api/kqxs
        }

        const response = await fetch(url, {
            cache: 'no-store'
        });

        if (!response.ok) {
            throw new Error('KHÔNG GỌI ĐƯỢC API VÌ KHÔNG CÓ DỮ LIỆU HOẶC LỖI....');
        }

        return response.json();
    },
};