import React, { useState, useEffect, useCallback } from 'react';
import styles from '../../styles/taodandacbiet.module.css';
import { soDanhSach, dauChanList, dauLeList, dauBeList, dauLonList, duoiChanList, duoiLeList, duoiBeList, duoiLonList, tongChanList, tongLeList, tongBeList, tongLonList, chanChanList, chanLeList, leChanList, leLeList, beBeList, beLonList, lonBeList, lonLonList, kepBangList, kepLechList, kepAmList, satKepList } from '../../pages/Constants/lotteryLists';
import { checkCondition } from '../../pages/utils/lotteryUtils';

const LayNhanhDanDacBiet = () => {
    const [filter, setFilter] = useState({ category: null, value: null });
    const [result, setResult] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);

    const checkConditionCallback = useCallback((number) => {
        return checkCondition(number, filter, {
            dauChanList, dauLeList, dauBeList, dauLonList,
            duoiChanList, duoiLeList, duoiBeList, duoiLonList,
            tongChanList, tongLeList, tongBeList, tongLonList,
            chanChanList, chanLeList, leChanList, leLeList,
            beBeList, beLonList, lonBeList, lonLonList,
            kepBangList, kepLechList, kepAmList, satKepList
        });
    }, [filter]);

    useEffect(() => {
        setLoading(true);
        const filteredNumbers = soDanhSach.filter(num => checkConditionCallback(num));
        setResult(filteredNumbers);
        setLoading(false);
    }, [filter, checkConditionCallback]);

    const copyToClipboard = () => {
        const textToCopy = result.join(',');
        navigator.clipboard.writeText(textToCopy).then(() => {
            setShowModal(true);
            setTimeout(() => setShowModal(false), 2000);
        });
    };

    const handleFilterChange = (category, value) => {
        setFilter({ category, value });
    };

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Lấy Nhanh Dàn Đặc Biệt</h1>
            <div className={styles.form}>
                <div className={styles.formGroup}>
                    <h3 className={styles.groupTitle}>Đầu</h3>
                    <div className={styles.buttonGroup}>
                        <button type="button" onClick={() => handleFilterChange('dau', 'Đầu chẵn')} className={`${styles.filterButton} ${filter.category === 'dau' && filter.value === 'Đầu chẵn' ? styles.active : ''}`}>Đầu chẵn</button>
                        <button type="button" onClick={() => handleFilterChange('dau', 'Đầu lẻ')} className={`${styles.filterButton} ${filter.category === 'dau' && filter.value === 'Đầu lẻ' ? styles.active : ''}`}>Đầu lẻ</button>
                        <button type="button" onClick={() => handleFilterChange('dau', 'Đầu bé')} className={`${styles.filterButton} ${filter.category === 'dau' && filter.value === 'Đầu bé' ? styles.active : ''}`}>Đầu bé</button>
                        <button type="button" onClick={() => handleFilterChange('dau', 'Đầu lớn')} className={`${styles.filterButton} ${filter.category === 'dau' && filter.value === 'Đầu lớn' ? styles.active : ''}`}>Đầu lớn</button>
                    </div>
                </div>
                <div className={styles.formGroup}>
                    <h3 className={styles.groupTitle}>Đuôi</h3>
                    <div className={styles.buttonGroup}>
                        <button type="button" onClick={() => handleFilterChange('duoi', 'Đuôi chẵn')} className={`${styles.filterButton} ${filter.category === 'duoi' && filter.value === 'Đuôi chẵn' ? styles.active : ''}`}>Đuôi chẵn</button>
                        <button type="button" onClick={() => handleFilterChange('duoi', 'Đuôi lẻ')} className={`${styles.filterButton} ${filter.category === 'duoi' && filter.value === 'Đuôi lẻ' ? styles.active : ''}`}>Đuôi lẻ</button>
                        <button type="button" onClick={() => handleFilterChange('duoi', 'Đuôi bé')} className={`${styles.filterButton} ${filter.category === 'duoi' && filter.value === 'Đuôi bé' ? styles.active : ''}`}>Đuôi bé</button>
                        <button type="button" onClick={() => handleFilterChange('duoi', 'Đuôi lớn')} className={`${styles.filterButton} ${filter.category === 'duoi' && filter.value === 'Đuôi lớn' ? styles.active : ''}`}>Đuôi lớn</button>
                    </div>
                </div>
                <div className={styles.formGroup}>
                    <h3 className={styles.groupTitle}>Tổng</h3>
                    <div className={styles.buttonGroup}>
                        <button type="button" onClick={() => handleFilterChange('tong', 'Tổng chẵn')} className={`${styles.filterButton} ${filter.category === 'tong' && filter.value === 'Tổng chẵn' ? styles.active : ''}`}>Tổng chẵn</button>
                        <button type="button" onClick={() => handleFilterChange('tong', 'Tổng lẻ')} className={`${styles.filterButton} ${filter.category === 'tong' && filter.value === 'Tổng lẻ' ? styles.active : ''}`}>Tổng lẻ</button>
                        <button type="button" onClick={() => handleFilterChange('tong', 'Tổng bé')} className={`${styles.filterButton} ${filter.category === 'tong' && filter.value === 'Tổng bé' ? styles.active : ''}`}>Tổng bé</button>
                        <button type="button" onClick={() => handleFilterChange('tong', 'Tổng lớn')} className={`${styles.filterButton} ${filter.category === 'tong' && filter.value === 'Tổng lớn' ? styles.active : ''}`}>Tổng lớn</button>
                    </div>
                </div>
                <div className={styles.formGroup}>
                    <h3 className={styles.groupTitle}>Đầu-Đuôi</h3>
                    <div className={styles.buttonGroup}>
                        <button type="button" onClick={() => handleFilterChange('dauDuoi', 'Chẵn/Chẵn')} className={`${styles.filterButton} ${filter.category === 'dauDuoi' && filter.value === 'Chẵn/Chẵn' ? styles.active : ''}`}>Chẵn/Chẵn</button>
                        <button type="button" onClick={() => handleFilterChange('dauDuoi', 'Chẵn/Lẻ')} className={`${styles.filterButton} ${filter.category === 'dauDuoi' && filter.value === 'Chẵn/Lẻ' ? styles.active : ''}`}>Chẵn/Lẻ</button>
                        <button type="button" onClick={() => handleFilterChange('dauDuoi', 'Lẻ/Chẵn')} className={`${styles.filterButton} ${filter.category === 'dauDuoi' && filter.value === 'Lẻ/Chẵn' ? styles.active : ''}`}>Lẻ/Chẵn</button>
                        <button type="button" onClick={() => handleFilterChange('dauDuoi', 'Lẻ/Lẻ')} className={`${styles.filterButton} ${filter.category === 'dauDuoi' && filter.value === 'Lẻ/Lẻ' ? styles.active : ''}`}>Lẻ/Lẻ</button>
                    </div>
                </div>
                <div className={styles.formGroup}>
                    <h3 className={styles.groupTitle}>Bé/Lớn</h3>
                    <div className={styles.buttonGroup}>
                        <button type="button" onClick={() => handleFilterChange('beLon', 'Bé/Bé')} className={`${styles.filterButton} ${filter.category === 'beLon' && filter.value === 'Bé/Bé' ? styles.active : ''}`}>Bé/Bé</button>
                        <button type="button" onClick={() => handleFilterChange('beLon', 'Bé/Lớn')} className={`${styles.filterButton} ${filter.category === 'beLon' && filter.value === 'Bé/Lớn' ? styles.active : ''}`}>Bé/Lớn</button>
                        <button type="button" onClick={() => handleFilterChange('beLon', 'Lớn/Bé')} className={`${styles.filterButton} ${filter.category === 'beLon' && filter.value === 'Lớn/Bé' ? styles.active : ''}`}>Lớn/Bé</button>
                        <button type="button" onClick={() => handleFilterChange('beLon', 'Lớn/Lớn')} className={`${styles.filterButton} ${filter.category === 'beLon' && filter.value === 'Lớn/Lớn' ? styles.active : ''}`}>Lớn/Lớn</button>
                    </div>
                </div>
                <div className={styles.formGroup}>
                    <h3 className={styles.groupTitle}>Kép</h3>
                    <div className={styles.buttonGroup}>
                        <button type="button" onClick={() => handleFilterChange('kep', 'Kép bằng')} className={`${styles.filterButton} ${filter.category === 'kep' && filter.value === 'Kép bằng' ? styles.active : ''}`}>Kép bằng</button>
                        <button type="button" onClick={() => handleFilterChange('kep', 'Kép lệch')} className={`${styles.filterButton} ${filter.category === 'kep' && filter.value === 'Kép lệch' ? styles.active : ''}`}>Kép lệch</button>
                        <button type="button" onClick={() => handleFilterChange('kep', 'Kép âm')} className={`${styles.filterButton} ${filter.category === 'kep' && filter.value === 'Kép âm' ? styles.active : ''}`}>Kép âm</button>
                        <button type="button" onClick={() => handleFilterChange('kep', 'Sát kép')} className={`${styles.filterButton} ${filter.category === 'kep' && filter.value === 'Sát kép' ? styles.active : ''}`}>Sát kép</button>
                    </div>
                </div>
            </div>
            {loading && <p className={styles.loading}>Đang xử lý...</p>}
            {result.length > 0 ? (
                <div className={styles.result}>
                    <div className={styles.resultHeader}>
                        <h2 className={styles.resultTitle}>Kết quả dàn đặc biệt ({result.length} số):</h2>
                        <button onClick={copyToClipboard} className={styles.copyButton}>Sao chép</button>
                    </div>
                    <ul className={styles.list}>
                        {result.map((num, index) => <li key={index} className={styles.listItem}>{num}</li>)}
                    </ul>
                </div>
            ) : (
                !loading && <p className={styles.noResult}>Lựa Chọn Để Lấy Dàn Nhanh.</p>
            )}
            {showModal && (
                <div className={styles.modal}>
                    <p>Đã sao chép dàn số!</p>
                </div>
            )}
        </div>
    );
};

export default LayNhanhDanDacBiet;