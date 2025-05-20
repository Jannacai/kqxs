'use client';
import { useEffect, useState } from 'react';
import Link from "next/link";
import styles from '../../public/css/kqxs.module.css'

export default function KQXS({ station, date }) {
    const [kqxsData, setKqxsData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                // Gọi API endpoint của Next.js
                const response = await fetch(`/api/kqxs/${station}/${date}`);

                if (!response.ok) {
                    throw new Error('Failed to fetch data');
                }

                const data = await response.json();
                setKqxsData(data);
                setError(null);
            } catch (err) {
                setError('Không thể tải kết quả xổ số');
                console.error('Error fetching KQXS:', err);
            } finally {
                setLoading(false);
            }
        };

        // Chỉ gọi API khi có đủ station và date
        if (station && date) {
            fetchData();
        }
    }, [station, date]); // Re-fetch khi station hoặc date thay đổi

    if (loading) {
        return <div>Đang tải kết quả xổ số...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    if (!kqxsData) {
        return <div>Không có dữ liệu</div>;
    }

    return (
        <div className="kqxs-container">
            <h2>Kết Quả Xổ Số {station.toUpperCase()}</h2>
            <p>Ngày: {date}</p>
            {/* Hiển thị dữ liệu KQXS */}
            <div className="kqxs-content">
                {kqxsData.prizes?.map((prize, index) => (
                    <div key={index} className="prize-row">
                        <span className="prize-name">{prize.name}</span>
                        <span className="prize-numbers">
                            {prize.numbers.join(' - ')}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}