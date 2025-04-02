export default async function handler(req, res) {
    const { station, date } = req.query;

    try {
        // Gọi API backend với định dạng xsmb-DD-MM-YYYY
        const response = await fetch(`http://localhost:5000/api/kqxs/${station}-${date}`);

        if (!response.ok) {
            throw new Error('Failed to fetch data');
        }

        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        console.error('Error fetching KQXS:', error);
        res.status(500).json({ error: 'Failed to fetch kết quả xổ số' });
    }
} 