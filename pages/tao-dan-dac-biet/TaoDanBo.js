import React, { useState } from 'react';
import styles from '../../styles/taodandacbiet.module.css';
import { taoDanBo } from '../../library/utils/lotteryUtils';
import { kepBangList, kepLechList, kepAmList, satKepList } from '../../library/Constants/lotteryLists';

const Bo = () => {
    const [boInput, setBoInput] = useState('');
    const [tongBoInput, setTongBoInput] = useState('');
    const [themBoInput, setThemBoInput] = useState('');
    const [boBoInput, setBoBoInput] = useState('');
    const [boResult, setBoResult] = useState([]);
    const [showBoModal, setShowBoModal] = useState(false);

    const handleTaoDan = () => {
        const result = taoDanBo(boInput, tongBoInput, themBoInput, boBoInput, { kepBangList, kepLechList, kepAmList, satKepList });
        setBoResult(result);
    };

    const lamLaiBo = () => {
        setBoInput('');
        setTongBoInput('');
        setThemBoInput('');
        setBoBoInput('');
        setBoResult([]);
    };

    const copyBoResult = () => {
        const textToCopy = boResult.join(',');
        navigator.clipboard.writeText(textToCopy).then(() => {
            setShowBoModal(true);
            setTimeout(() => setShowBoModal(false), 2000);
        });
    };

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Tạo Dàn Đặc Biệt - Bộ</h1>
            <div className={styles.form}>
                <div className={styles.formGroup}>
                    <h3 className={styles.groupTitle}>Bộ</h3>
                    <select
                        value={boInput}
                        onChange={(e) => setBoInput(e.target.value)}
                        className={styles.input}
                    >
                        <option value="">Chọn bộ</option>
                        <option value="Kép bằng">Kép bằng</option>
                        <option value="Kép lệch">Kép lệch</option>
                        <option value="Kép âm">Kép âm</option>
                        <option value="Sát kép">Sát kép</option>
                    </select>
                </div>
                <div className={styles.formGroup}>
                    <h3 className={styles.groupTitle}>Tổng</h3>
                    <input
                        type="text"
                        value={tongBoInput}
                        onChange={(e) => setTongBoInput(e.target.value)}
                        placeholder="Ví dụ: 5,7,9"
                        className={styles.input}
                    />
                </div>
                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                    <h3 className={styles.groupTitle}>Thêm</h3>
                    <input
                        type="text"
                        value={themBoInput}
                        onChange={(e) => setThemBoInput(e.target.value)}
                        placeholder="Ví dụ: 12,34,56"
                        className={styles.input}
                    />
                </div>
                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                    <h3 className={styles.groupTitle}>Bỏ</h3>
                    <input
                        type="text"
                        value={boBoInput}
                        onChange={(e) => setBoBoInput(e.target.value)}
                        placeholder="Ví dụ: 1"
                        className={styles.input}
                    />
                </div>
                <div className={styles.formGroup}>
                    <h3 className={styles.groupTitle}>Tạo dàn</h3>
                    <div className={styles.buttonGroup}>
                        <button onClick={handleTaoDan} className={styles.filterButton}>Tạo dàn</button>
                        <button onClick={lamLaiBo} className={`${styles.filterButton} ${styles.resetButton}`}>Làm lại</button>
                    </div>
                </div>
                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                    <h3 className={styles.groupTitle}>Kết quả</h3>
                    {boResult.length > 0 ? (
                        <div className={styles.result}>
                            <div className={styles.resultHeader}>
                                <h2 className={styles.resultTitle}>Kết quả dàn đặc biệt ({boResult.length} số):</h2>
                                <button onClick={copyBoResult} className={styles.copyButton}>Sao chép</button>
                            </div>
                            <ul className={styles.list}>
                                {boResult.map((num, index) => (
                                    <li key={index} className={styles.listItem}>{num}</li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <p className={styles.noResult}>Chọn bộ để tạo dàn.</p>
                    )}
                </div>
            </div>
            {showBoModal && (
                <div className={styles.modal}>
                    <p>Đã sao chép dàn số!</p>
                </div>
            )}
        </div>
    );
};

export default Bo;