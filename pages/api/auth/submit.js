// pages/api/submit.js (Ví dụ API route back-end trong Next.js)
export default function handler(req, res) {
    if (req.method === 'POST') {
        const { name, email } = req.body;
        // Xử lý dữ liệu nhận được từ front-end
        console.log('Received data:', { name, email });

        // Trả về phản hồi cho front-end
        res.status(200).json({ message: 'Data received successfully!' });
    } else {
        res.status(405).end(); // Phương thức không được hỗ trợ
    }
}