import React, { useState } from 'react';
import styles from '../../styles/taodandacbiet.module.css';
import { taoDanCham } from '../../library/utils/lotteryUtils';

const Cham = () => {
    const [chamInput, setChamInput] = useState('');
    const [tongChamInput, setTongChamInput] = useState('');
    const [themChamInput, setThemChamInput] = useState('');
    const [boChamInput, setBoChamInput] = useState('');
    const [chamResult, setChamResult] = useState([]);
    const [showChamModal, setShowChamModal] = useState(false);

    const handleTaoDan = () => {
        const result = taoDanCham(chamInput, tongChamInput, themChamInput, boChamInput);
        setChamResult(result);
    };

    const lamLaiCham = () => {
        setChamInput('');
        setTongChamInput('');
        setThemChamInput('');
        setBoChamInput('');
        setChamResult([]);
    };

    const copyChamResult = () => {
        const textToCopy = chamResult.join(',');
        navigator.clipboard.writeText(textToCopy).then(() => {
            setShowChamModal(true);
            setTimeout(() => setShowChamModal(false), 2000);
        });
    };

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Tạo Dàn Đặc Biệt - Chạm</h1>
            <div className={styles.form}>
                <div className={styles.formGroup}>
                    <h3 className={styles.groupTitle}>Chạm</h3>
                    <input
                        type="text"
                        value={chamInput}
                        onChange={(e) => setChamInput(e.target.value)}
                        placeholder="Ví dụ: 8"
                        className={styles.input}
                    />
                </div>
                <div className={styles.formGroup}>
                    <h3 className={styles.groupTitle}>Tổng</h3>
                    <input
                        type="text"
                        value={tongChamInput}
                        onChange={(e) => setTongChamInput(e.target.value)}
                        placeholder="Ví dụ: 5 hoặc 15 hoặc 194"
                        className={styles.input}
                    />
                </div>
                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                    <h3 className={styles.groupTitle}>Thêm</h3>
                    <input
                        type="text"
                        value={themChamInput}
                        onChange={(e) => setThemChamInput(e.target.value)}
                        placeholder="Ví dụ: 11"
                        className={styles.input}
                    />
                </div>
                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                    <h3 className={styles.groupTitle}>Bỏ</h3>
                    <input
                        type="text"
                        value={boChamInput}
                        onChange={(e) => setBoChamInput(e.target.value)}
                        placeholder="Ví dụ: 99"
                        className={styles.input}
                    />
                </div>
                <div className={styles.formGroup}>
                    <h3 className={styles.groupTitle}>Tạo dàn</h3>
                    <div className={styles.buttonGroup}>
                        <button onClick={handleTaoDan} className={styles.filterButton}>Tạo dàn</button>
                        <button onClick={lamLaiCham} className={`${styles.filterButton} ${styles.resetButton}`}>Làm lại</button>
                    </div>
                </div>
                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                    <h3 className={styles.groupTitle}>Kết quả</h3>
                    {chamResult.length > 0 ? (
                        <div className={styles.result}>
                            <div className={styles.resultHeader}>
                                <h2 className={styles.resultTitle}>Kết quả dàn đặc biệt ({chamResult.length} số):</h2>
                                <button onClick={copyChamResult} className={styles.copyButton}>Sao chép</button>
                            </div>
                            <ul className={styles.list}>
                                {chamResult.map((num, index) => (
                                    <li key={index} className={styles.listItem}>{num}</li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <p className={styles.noResult}>Nhập tiêu chí để tạo dàn.</p>
                    )}
                </div>
            </div>
            {showChamModal && (
                <div className={styles.modal}>
                    <p>Đã sao chép dàn số!</p>
                </div>
            )}
        </div>
    );
};

export default Cham;