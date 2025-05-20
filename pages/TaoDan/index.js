import React from 'react';
import Head from 'next/head';
import LayNhanhDanDacBiet from './LayNhanhDanDacBiet';
import DauDuoi from './TaoDanDauDuoi';
import Cham from './TaoDanCham';
import Bo from './TaoDanBo';
import ThongKe from '../../component/thongKe';
// import styles from '../../styles/taodandacbiet.module.css';

const TaoDanDacBiet = () => {
    return (
        <div className='container'>
            <div>
                <Head>
                    <title>Tạo Dàn Đặc Biệt - Công Cụ Tối Ưu Xổ Số</title>
                    <meta name="description" content="Tạo dàn số đặc biệt từ 00-99 với các bộ lọc Đầu, Đuôi, Tổng, Đầu-Đuôi, Bé/Lớn, và Kép. Công cụ hỗ trợ người chơi xổ số hiệu quả." />
                    <meta name="keywords" content="tạo dàn đặc biệt, xổ số, bộ lọc số, đầu chẵn, đầu lẻ, tổng chẵn, kép, bé lớn" />
                    <meta name="robots" content="index, follow" />
                    <link rel="canonical" href="https://yourdomain.com/tao-dan-dac-biet" />
                </Head>
                <LayNhanhDanDacBiet />
                <DauDuoi />
                <Cham />
                <Bo />
            </div>
            <ThongKe />
        </div>
    );
};

export default TaoDanDacBiet;