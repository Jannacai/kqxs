import React, { useState, useCallback } from 'react';
import styles from '../../../styles/NgauNhien9x.module.css';
const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
import ThongKe from '../../../component/thongKe';
import CongCuHot from '../../../component/CongCuHot';

const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
};

const Ngaunhien9x0x = () => {
    const [quantity, setQuantity] = useState(1);
    const [levelsList, setLevelsList] = useState([]);
    const [totalSelected, setTotalSelected] = useState(0);
    const [showCopyModal, setShowCopyModal] = useState(false);
    const [xoaDanClicked, setXoaDanClicked] = useState(false);
    const [copyDanClicked, setCopyDanClicked] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const shuffleArray = (array) => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    };

    // Hàm tạo số ngẫu nhiên từ một kho số
    const generateRandomNumbers = (count, sourcePool) => {
        const shuffled = shuffleArray(sourcePool);
        return shuffled.slice(0, Math.min(count, sourcePool.length)).sort((a, b) => parseInt(a) - parseInt(b));
    };

    // Chức năng gọi API
    const debouncedFetchDan = useCallback(
        debounce(async (value) => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/taodan/ngaunhien9x0x`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ input: value }),
                });
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Lỗi khi gọi API: ${response.status} - ${errorText}`);
                }
                // Có thể lấy dữ liệu từ API nếu cần
                const data = await response.json();
                // Nếu muốn sử dụng dữ liệu từ API, cập nhật states tại đây
                // setLevelsList(data.levelsList);
                // setTotalSelected(data.totalSelected);
            } catch (error) {
                console.error('Error fetching dan:', error);
                setError(error.message);
            } finally {
                setLoading(false);
            }
        }, 300),
        []
    );

    const handleQuantityChange = (e) => {
        const value = e.target.value;
        if (value === '') {
            setQuantity('');
            return;
        }
        const num = parseInt(value, 10);
        if (!isNaN(num) && num >= 1 && num <= 50) {
            setQuantity(num);
        } else {
            setError('Vui lòng nhập số từ 1 đến 50');
        }
    };

    const handleGenerateDan = () => {
        setLoading(true);
        setError(null);

        const levelCounts = [95, 88, 78, 68, 58, 48, 38, 28, 18, 8];
        const newLevelsList = [];
        let total = 0;

        for (let i = 0; i < quantity; i++) {
            const levels = {};
            let currentDanTotal = 0;
            // Khởi tạo kho số ban đầu (00-99)
            let currentPool = Array.from({ length: 100 }, (_, i) => i.toString().padStart(2, '0'));

            // Tạo số cho mỗi cấp độ, lấy từ kho của cấp độ trước
            levelCounts.forEach(count => {
                const numbers = generateRandomNumbers(count, currentPool);
                levels[count] = numbers;
                currentDanTotal += numbers.length;
                // Cập nhật kho số cho cấp độ tiếp theo
                currentPool = numbers;
            });

            newLevelsList.push(levels);
            total += currentDanTotal;
        }

        // Cập nhật trạng thái hiển thị
        setLevelsList(newLevelsList);
        setTotalSelected(total);
        setLoading(false);

        // Chuẩn bị input và gửi đến API
        const inputValue = newLevelsList
            .map(levels => Object.values(levels).flat().join(','))
            .join(',');

        debouncedFetchDan(inputValue);
    };

    const xoaDan = () => {
        setLevelsList([]);
        setTotalSelected(0);
        setXoaDanClicked(true);
        setShowCopyModal(true);
        setError(null);
    };

    const copyDan = () => {
        if (levelsList.length === 0) {
            setError('Chưa có dàn số để sao chép');
            setShowCopyModal(true);
            return;
        }
        const copyText = levelsList
            .map((levels, index) => {
                const danText = Object.keys(levels)
                    .sort((a, b) => parseInt(b) - parseInt(a))
                    .map(level => `${level}s\n${levels[level].join(',')}`)
                    .join('\n');
                return `Dàn ${index + 1}\n${danText}`;
            })
            .join('\n=================================\n');
        navigator.clipboard.writeText(copyText.trim()).then(() => {
            setCopyDanClicked(true);
            setShowCopyModal(true);
        });
    };

    const closeModal = () => {
        setShowCopyModal(false);
        setXoaDanClicked(false);
        setCopyDanClicked(false);
        setError(null);
    };

    return (
        <div className='container'>
            <div className={styles.container3d4d}>
                <h1 className={styles.title}>Tạo Dàn 9x-0x Ngẫu nhiên</h1>
                <div className={styles.form}>
                    <div className={`${styles.formGroup1} ${styles.fullWidth}`}>
                        <h3 className={styles.groupTitle}>Nhập số lượng dàn</h3>
                        <input
                            type="number"
                            value={quantity}
                            onChange={handleQuantityChange}
                            placeholder="Số lượng dàn (1-50)"
                            min="1"
                            max="50"
                            className={styles.input}
                            disabled={loading}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <div className={styles.buttonGroup}>
                            <button
                                onClick={handleGenerateDan}
                                className={`${styles.filterButton} ${styles.create2DButton}`}
                                disabled={loading}
                            >
                                Tạo dàn ngẫu nhiên
                            </button>
                            <button
                                onClick={xoaDan}
                                className={`${styles.filterButton} ${styles.resetButton}`}
                                disabled={loading}
                            >
                                Xóa
                            </button>
                            <button
                                onClick={copyDan}
                                className={`${styles.filterButton} ${styles.copyButton}`}
                                disabled={loading || levelsList.length === 0}
                            >
                                Copy
                            </button>
                            <div className={styles.button}>
                                <button
                                    onClick={xoaDan}
                                    className={`${styles.filterButton} ${styles.resetButtonMobile}`}
                                    disabled={loading}
                                >
                                    Xóa
                                </button>
                                <button
                                    onClick={copyDan}
                                    className={`${styles.filterButton} ${styles.copyButtonMobile}`}
                                    disabled={loading || levelsList.length === 0}
                                >
                                    Copy
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                        <h3 className={styles.groupTitle}>Kết quả</h3>
                        <div className={styles.result}>
                            {levelsList.length > 0 ? (
                                levelsList.map((levels, index) => (
                                    <div key={index} className={styles.levelBox}>
                                        <h4 className={styles.levelTitle}>Dàn {index + 1}</h4>
                                        {Object.keys(levels)
                                            .sort((a, b) => parseInt(b) - parseInt(a))
                                            .map(level => (
                                                levels[level].length > 0 && (
                                                    <div key={level} className={styles.levelBox}>
                                                        <h4 className={styles.levelTitle}>
                                                            {level}s ({levels[level].length} số)
                                                        </h4>
                                                        <ul className={styles.list}>
                                                            {levels[level].map((num, idx) => (
                                                                <li key={idx} className={styles.listItem}>{num}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )
                                            ))}
                                    </div>
                                ))
                            ) : (
                                <p className={styles.noResult}>Chưa có số nào được chọn.</p>
                            )}
                        </div>
                    </div>
                </div>
                <div className={`${styles.modal} ${showCopyModal ? styles.active : ''}`} onClick={closeModal}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <p className={styles.modalMessage}>
                            {xoaDanClicked && 'Đã xóa tất cả lựa chọn'}
                            {copyDanClicked && 'Đã sao chép dàn số 2D'}
                            {error && error}
                        </p>
                        <button onClick={closeModal} className={styles.closeButton}>Đóng</button>
                    </div>
                </div>
            </div>
            <div>
                <ThongKe />
                <CongCuHot />
            </div>
        </div>
    );
};

export default Ngaunhien9x0x;