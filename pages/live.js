// pages/live.js
import Head from 'next/head';
import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import NavBar from '../components/NavBar';
import styles from '../styles/LotteryPage.module.css';

let socket;

export default function Live() {
    const [results, setResults] = useState([]);

    useEffect(() => {
        socket = io(process.env.BACKEND_URL);

        socket.on('liveResult', (result) => {
            setResults(prev => [...prev, result]);
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    return (
        <div className={styles.container}>
            <Head>
                <title>Kết quả trực tiếp - Xoso.com.vn</title>
                <meta name="description" content="Xem kết quả xổ số trực tiếp tại Xoso.com.vn" />
            </Head>
            <NavBar />
            <h1>Kết quả xổ số trực tiếp</h1>
            <div className={styles.results}>
                {results.map((result, index) => (
                    <div key={index}>
                        <p>Thời gian: {new Date(result.drawDate).toLocaleTimeString('vi-VN')}</p>
                        <p>Giải Đặc Biệt: {result.specialPrize.join(', ')}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}