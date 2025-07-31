import React, { useState, useEffect, useCallback, useRef } from 'react';
import styles from '../../../styles/taodan3D4D.module.css';

const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
};

const Dan4D = () => {
    const [inputNumbers, setInputNumbers] = useState('');
    const [displayInput, setDisplayInput] = useState('');
    const [levels, setLevels] = useState({});
    const [totalSelected, setTotalSelected] = useState(0);
    const [showCopyModal, setShowCopyModal] = useState(false);
    const [isInputChanged, setIsInputChanged] = useState(false);
    const [xoaDanClicked, setXoaDanClicked] = useState(false);
    const [copyDanClicked, setCopyDanClicked] = useState(false);
    const [inputError, setInputError] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [previousState, setPreviousState] = useState(null);
    const [showUndo, setShowUndo] = useState(false);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://backendkqxs-1.onrender.com';

    const debouncedFetchLevels = useCallback(
        debounce(async (value) => {
            setLoading(true);
            try {
                const response = await fetch(`${API_BASE_URL}/api/taodan/taodan4D`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ input: value }),
                });
                if (!response.ok) throw new Error('Lỗi khi gọi API');
                const data = await response.json();
                setLevels(data.levels || {});
                setTotalSelected(data.totalSelected || 0);
                setInputNumbers(value);
                setIsInputChanged(false);
            } catch (error) {
                console.error('Error fetching levels:', error);
                setLevels({});
                setTotalSelected(0);
                setErrorMessage('Lỗi khi gọi API. Vui lòng thử lại.');
                setShowCopyModal(true);
            } finally {
                setLoading(false);
            }
        }, 300),
        []
    );

    const handleInputChange = (e) => {
        const value = e.target.value;
        if (value.length > 1000) {
            setInputError('Input quá dài, vui lòng nhập dưới 1000 ký tự.');
            return;
        }
        setInputError('');
        setDisplayInput(value);
        setIsInputChanged(true);
        if (value.trim() === '') {
            setLevels({});
            setTotalSelected(0);
            setInputNumbers('');
            setIsInputChanged(false);
            setErrorMessage('');
        }
    };

    const handleInputBlur = () => {
        if (isInputChanged) {
            if (!/^[0-9\s,;]*$/.test(displayInput)) {
                setInputError('Vui lòng chỉ nhập số và các ký tự phân tách (, ; hoặc khoảng trắng)');
                setDisplayInput('');
                setInputNumbers('');
                setLevels({});
                setTotalSelected(0);
                setIsInputChanged(false);
                return;
            }

            const nums = displayInput.split(/[,;\s]+/).map(num => num.trim()).filter(num => num);
            const validNums = [];
            const errors = [];

            nums.forEach(num => {
                if (!/^\d+$/.test(num)) {
                    errors.push(`"${num}" không phải là số hợp lệ.`);
                } else if (num.length < 4) {
                    errors.push(`"${num}" quá ngắn (cần ít nhất 4 chữ số).`);
                } else {
                    validNums.push(num);
                }
            });

            const normalizedValue = validNums.join(',');
            setDisplayInput(normalizedValue);
            debouncedFetchLevels(normalizedValue);
            setInputNumbers(normalizedValue);
            setIsInputChanged(false);

            if (errors.length > 0) {
                setInputError(errors.join(' '));
                setErrorMessage(errors.join(' '));
                setShowCopyModal(true);
            }
        }
    };

    const handleInputFocus = () => {
        if (inputRef.current) inputRef.current.focus();
    };

    const xoaDan = () => {
        if (inputNumbers || totalSelected > 0) {
            setPreviousState({
                inputNumbers,
                displayInput,
                levels,
                totalSelected
            });
            setShowUndo(true);
        }
        setInputNumbers('');
        setDisplayInput('');
        setLevels({});
        setTotalSelected(0);
        setIsInputChanged(false);
        setInputError('');
        setErrorMessage('');
        setXoaDanClicked(true);
        setShowCopyModal(true);
    };

    const undoXoaDan = () => {
        if (previousState) {
            setInputNumbers(previousState.inputNumbers);
            setDisplayInput(previousState.displayInput);
            setLevels(previousState.levels);
            setTotalSelected(previousState.totalSelected);
            setIsInputChanged(false);
            setShowUndo(false);
            setPreviousState(null);
        }
    };

    const copyDan = () => {
        let copyText = '';
        Object.keys(levels).forEach(level => {
            const nums = levels[level];
            copyText += `Mức: ${level} (${nums.length}) số\n${nums.join(',')}\n`;
        });
        navigator.clipboard.writeText(copyText.trim()).then(() => {
            setCopyDanClicked(true);
            setShowCopyModal(true);
        }).catch(err => {
            setErrorMessage('Lỗi khi sao chép. Vui lòng thử lại.');
            setShowCopyModal(true);
            console.error('Copy failed:', err);
        });
    };

    const closeModal = () => {
        setShowCopyModal(false);
        setXoaDanClicked(false);
        setCopyDanClicked(false);
        setErrorMessage('');
    };

    useEffect(() => {
        if (inputRef.current && !inputRef.current === document.activeElement) {
            inputRef.current.focus();
        }
    }, []);

    return (
        <div>
            <div className={styles.form}>
                <h1 className={styles.title}>Tạo Dàn 4D</h1>
                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                    <h3 className={styles.groupTitle}>Nhập các dàn số vào đây</h3>
                    <textarea
                        ref={inputRef}
                        value={displayInput}
                        onChange={handleInputChange}
                        onBlur={handleInputBlur}
                        onFocus={handleInputFocus}
                        placeholder="Ví dụ: 1234,5678,51278,910263 (dùng , ; hoặc cách)"
                        className={styles.input}
                        disabled={loading}
                    />
                    {inputError && <p className={styles.error}>{inputError}</p>}
                </div>
                <div className={styles.formGroup}>
                    <p className={styles.totalSelected}>Tổng số được chọn: {totalSelected} {loading && '(Đang xử lý...)'}</p>
                </div>
                <div className={styles.formGroup}>
                    <h3 className={styles.groupTitle}>Tạo mức số</h3>
                    <div className={styles.buttonGroup}>
                        <button className={`${styles.filterButton}`}>Tạo Dàn 4D</button>
                        <button
                            onClick={xoaDan}
                            className={`${styles.filterButton} ${styles.resetButton}`}
                            disabled={totalSelected === 0}
                        >
                            Xóa
                        </button>
                        {showUndo && (
                            <button
                                onClick={undoXoaDan}
                                className={`${styles.filterButton} ${styles.undoButton}`}
                            >
                                Hoàn tác
                            </button>
                        )}
                        <button
                            onClick={copyDan}
                            className={`${styles.filterButton} ${styles.copyButton}`}
                            disabled={totalSelected === 0}
                        >
                            Copy Dàn 4D
                        </button>
                    </div>
                </div>
                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                    <h3 className={styles.groupTitle}>Kết quả</h3>
                    <div className={styles.result}>
                        {Object.keys(levels).length > 0 || totalSelected > 0 ? (
                            Object.entries(levels).map(([level, nums]) => (
                                nums.length > 0 && (
                                    <div key={level} className={styles.levelBox}>
                                        <h4 className={styles.levelTitle}>Mức {level}: ({nums.length} số)</h4>
                                        <ul className={styles.list}>
                                            {nums.map((num, index) => (
                                                <li key={index} className={styles.listItem}>{num}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )
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
                        {copyDanClicked && 'Đã sao chép dàn số 4D'}
                        {errorMessage && errorMessage}
                    </p>
                    <button onClick={closeModal} className={styles.closeButton}>Đóng</button>
                </div>
            </div>
        </div>
    );
};

export default Dan4D;