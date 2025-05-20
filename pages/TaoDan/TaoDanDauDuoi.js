import React, { useState } from 'react';
import styles from '../../styles/taodandacbiet.module.css';
import { taoDanDauDuoi } from '../../pages/utils/lotteryUtils';

const DauDuoi = () => {
    const [dauInput, setDauInput] = useState('');
    const [duoiInput, setDuoiInput] = useState('');
    const [tongInput, setTongInput] = useState('');
    const [themInput, setThemInput] = useState('');
    const [boDauDuoiInput, setBoDauDuoiInput] = useState('');
    const [dauDuoiResult, setDauDuoiResult] = useState([]);
    const [showDauDuoiModal, setShowDauDuoiModal] = useState(false);

    const handleTaoDan = () => {
        const result = taoDanDauDuoi(dauInput, duoiInput, tongInput, themInput, boDauDuoiInput);
        setDauDuoiResult(result);
    };

    const lamLaiDauDuoi = () => {
        setDauInput('');
        setDuoiInput('');
        setTongInput('');
        setThemInput('');
        setBoDauDuoiInput('');
        setDauDuoiResult([]);
    };

    const copyDauDuoiResult = () => {
        const textToCopy = dauDuoiResult.join(',');
        navigator.clipboard.writeText(textToCopy).then(() => {
            setShowDauDuoiModal(true);
            setTimeout(() => setShowDauDuoiModal(false), 2000);
        });
    };

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Tạo Dàn Đặc Biệt - Đầu-Đuôi</h1>
            <div className={styles.form}>
                <div className={styles.formGroup}>
                    <h3 className={styles.groupTitle}>Đầu</h3>
                    <input
                        type="text"
                        value={dauInput}
                        onChange={(e) => setDauInput(e.target.value)}
                        placeholder="Ví dụ: 1,3,5 hoặc 135"
                        className={styles.input}
                    />
                </div>
                <div className={styles.formGroup}>
                    <h3 className={styles.groupTitle}>Đuôi</h3>
                    <input
                        type="text"
                        value={duoiInput}
                        onChange={(e) => setDuoiInput(e.target.value)}
                        placeholder="Ví dụ: 2,4,6 hoặc 246"
                        className={styles.input}
                    />
                </div>
                <div className={styles.formGroup}>
                    <h3 className={styles.groupTitle}>Tổng</h3>
                    <input
                        type="text"
                        value={tongInput}
                        onChange={(e) => setTongInput(e.target.value)}
                        placeholder="Ví dụ: 8 hoặc 24 hoặc 246"
                        className={styles.input}
                    />
                </div>
                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                    <h3 className={styles.groupTitle}>Thêm</h3>
                    <input
                        type="text"
                        value={themInput}
                        onChange={(e) => setThemInput(e.target.value)}
                        placeholder="Ví dụ: 12,34,56"
                        className={styles.input}
                    />
                </div>
                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                    <h3 className={styles.groupTitle}>Bỏ</h3>
                    <input
                        type="text"
                        value={boDauDuoiInput}
                        onChange={(e) => setBoDauDuoiInput(e.target.value)}
                        placeholder="Ví dụ: 1"
                        className={styles.input}
                    />
                </div>
                <div className={styles.formGroup}>
                    <h3 className={styles.groupTitle}>Tạo dàn</h3>
                    <div className={styles.buttonGroup}>
                        <button onClick={handleTaoDan} className={styles.filterButton}>Tạo dàn</button>
                        <button onClick={lamLaiDauDuoi} className={`${styles.filterButton} ${styles.resetButton}`}>Làm lại</button>
                    </div>
                </div>
                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                    <h3 className={styles.groupTitle}>Kết quả</h3>
                    {dauDuoiResult.length > 0 ? (
                        <div className={styles.result}>
                            <div className={styles.resultHeader}>
                                <h2 className={styles.resultTitle}>Kết quả dàn đặc biệt ({dauDuoiResult.length} số):</h2>
                                <button onClick={copyDauDuoiResult} className={styles.copyButton}>Sao chép</button>
                            </div>
                            <ul className={styles.list}>
                                {dauDuoiResult.map((num, index) => (
                                    <li key={index} className={styles.listItem}>{num}</li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <p className={styles.noResult}>Nhập tiêu chí để tạo dàn.</p>
                    )}
                </div>
            </div>
            {showDauDuoiModal && (
                <div className={styles.modal}>
                    <p>Đã sao chép dàn số!</p>
                </div>
            )}
        </div>
    );
};

export default DauDuoi;