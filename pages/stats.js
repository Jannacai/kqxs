// pages/stats.js
import Head from 'next/head';
import NavBar from '../components/NavBar';
import styles from '../styles/LotteryPage.module.css';

export async function getStaticProps() {
    const res = await fetch(`${process.env.BACKEND_URL}/api/stats/frequency`);
    const frequency = await res.json();
    return {
        props: {
            frequency,
        },
        revalidate: 60,
    };
}

export default function Stats({ frequency }) {
    return (
        <div className={styles.container}>
            <Head>
                <title>Thống kê - Xoso.com.vn</title>
                <meta name="description" content="Thống kê kết quả xổ số tại Xoso.com.vn" />
            </Head>
            <NavBar />
            <h1>Thống kê kết quả xổ số</h1>
            <h2>Tần suất xuất hiện của các số (Giải Đặc Biệt)</h2>
            <ul>
                {Object.entries(frequency).map(([number, count]) => (
                    <li key={number}>
                        Số {number}: {count} lần
                    </li>
                ))}
            </ul>
        </div>
    );
}