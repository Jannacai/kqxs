// pages/results-filter.js
import Head from 'next/head';
import { useState } from 'react';
import NavBar from '../components/NavBar';
import styles from '../styles/LotteryPage.module.css';

export default function ResultsFilter() {
    const [lotteryType, setLotteryType] = useState('Mega');
    const [dayOfWeek, setDayOfWeek] = useState('');
    const [year, setYear] = useState('');
    const [month, setMonth] = useState('');
    const [results, setResults] = useState([]);

    const handleFilter = async () => {
        const query = new URLSearchParams({
            lotteryType,
            ...(dayOfWeek && { dayOfWeek }),
            ...(year && { year }),
            ...(month && { month }),
        }).toString();
        const res = await fetch(`${process.env.BACKEND_URL}/api/results?${query}`);
        const data = await res.json();
        setResults(data);
    };

    return (
        <div className={styles.container}>
            <Head>
                <title>Lọc kết quả xổ số - Xoso.com.vn</title>
                <meta name="description" content="Lọc kết quả xổ số theo ngày, tháng, năm" />
            </Head>
            <NavBar />
            <h1>Lọc kết quả xổ số</h1>
            <div>
                <label>Loại xổ số:</label>
                <select value={lotteryType} onChange={(e) => setLotteryType(e.target.value)}>
                    <option value="Mega">Mega</option>
                    <option value="Power">Power</option>
                    <option value="Max 3D">Max 3D</option>
                </select>
            </div>
            <div>
                <label>Thứ:</label>
                <select value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value)}>
                    <option value="">Tất cả</option>
                    <option value="Thứ 2">Thứ 2</option>
                    <option value="Thứ 3">Thứ 3</option>
                    <option value="Thứ 4">Thứ 4</option>
                    <option value="Thứ 5">Thứ 5</option>
                    <option value="Thứ 6">Thứ 6</option>
                    <option value="Thứ 7">Thứ 7</option>
                    <option value="Chủ Nhật">Chủ Nhật</option>
                </select>
            </div>
            <div>
                <label>Năm:</label>
                <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="Ví dụ: 2025"
                />
            </div>
            <div>
                <label>Tháng:</label>
                <input
                    type="number"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    placeholder="Ví dụ: 3"
                    min="1"
                    max="12"
                />
            </div>
            <button onClick={handleFilter}>Lọc</button>
            <div className={styles.results}>
                {results.map(result => (
                    <div key={result._id}>
                        <h2>Kết quả xổ số {result.dayOfWeek}</h2>
                        <p>Ngày: {new Date(result.drawDate).toLocaleDateString('vi-VN')}</p>
                        <p>Giải Đặc Biệt: {result.specialPrize.join(', ')}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}