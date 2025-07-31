import React, { useState, useEffect, useMemo } from 'react';
import styles from '../../../styles/taodan2D.module.css';
const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://backendkqxs-1.onrender.com';

// Tách số từ input thành các cặp 2 chữ số và chuẩn hóa định dạng
const parseAndNormalizeInput = (input) => {
    if (!/^[0-9\s,;]*$/.test(input)) {
        return { normalized: '', pairs: [], error: 'Vui lòng chỉ nhập số và các ký tự phân tách (, ; hoặc khoảng trắng)' };
    }
    const normalized = input.replace(/[;\s]+/g, ',').replace(/,+/g, ',').replace(/^,|,$/g, '');
    const nums = normalized.split(',').map(num => num.trim()).filter(n => n);
    const pairs = [];
    nums.forEach(num => {
        const strNum = num.toString();
        if (strNum.length === 2 && !isNaN(parseInt(strNum))) {
            pairs.push(strNum.padStart(2, '0'));
        } else if (strNum.length >= 3 && !isNaN(parseInt(strNum))) {
            for (let i = 0; i < strNum.length - 1; i++) {
                const pair = strNum.slice(i, i + 2);
                pairs.push(pair.padStart(2, '0'));
            }
        }
    });
    return { normalized, pairs };
};

const NumberItem = React.memo(({ num, frequency, onClick, onDecrease }) => (
    <div
        className={`${styles.numberItem} ${frequency > 0 ? styles.selected : ''}`}
        onClick={(e) => onClick(num, e)}
    >
        {frequency > 0 && (
            <button
                onClick={(e) => onDecrease(num, e)}
                className={`${styles.freqButton} ${styles.decreaseButton}`}
            >
                -
            </button>
        )}
        <span className={styles.numberText}>
            {num} ({frequency || 0})
        </span>
    </div>
));

const TaoDan2DLogic = () => {
    const [inputNumbers, setInputNumbers] = useState('');
    const [displayInput, setDisplayInput] = useState('');
    const [numberFrequency, setNumberFrequency] = useState({});
    const [selectedOrder, setSelectedOrder] = useState([]);
    const [levels, setLevels] = useState({});
    const [levels1D, setLevels1D] = useState({});
    const [showCopyModal, setShowCopyModal] = useState(false);
    const [isInputChanged, setIsInputChanged] = useState(false);
    const [xoaDanClicked, setXoaDanClicked] = useState(false);
    const [copyDanClicked, setCopyDanClicked] = useState(false);
    const [taoMuc1DClicked, setTaoMuc1DClicked] = useState(false);
    const [inputError, setInputError] = useState('');
    const [previousState, setPreviousState] = useState(null);
    const [showUndo, setShowUndo] = useState(false);
    const [viewMode, setViewMode] = useState('2D');

    const allNumbers = Array.from({ length: 100 }, (_, i) => i.toString().padStart(2, '0'));

    const totalSelected = Object.values(numberFrequency).reduce((sum, freq) => sum + freq, 0);

    // Tính toán levels với useMemo
    const calculatedLevels = useMemo(() => {
        const newLevels = {};
        allNumbers.forEach(num => {
            const freq = numberFrequency[num] || 0;
            newLevels[freq] = newLevels[freq] || [];
            newLevels[freq].push(num);
        });
        Object.keys(newLevels).forEach(level => {
            newLevels[level].sort((a, b) => parseInt(a) - parseInt(b));
        });
        return newLevels;
    }, [numberFrequency]);

    // Tính toán levels1D
    const calculateLevels1D = () => {
        const allNums = [];
        Object.entries(numberFrequency).forEach(([num, freq]) => {
            for (let i = 0; i < freq; i++) {
                allNums.push(num);
            }
        });

        const digitFrequency = {};
        allNums.forEach(num => {
            const digits = num.split('');
            digits.forEach(digit => {
                digitFrequency[digit] = (digitFrequency[digit] || 0) + 1;
            });
        });

        const levels1D = {};
        for (let digit = 0; digit <= 9; digit++) {
            const freq = digitFrequency[digit.toString()] || 0;
            if (freq === 0) {
                levels1D[0] = levels1D[0] || [];
                levels1D[0].push(digit);
            } else {
                levels1D[freq] = levels1D[freq] || [];
                levels1D[freq].push(digit);
            }
        }

        Object.keys(levels1D).forEach(level => {
            levels1D[level].sort((a, b) => a - b);
        });

        return levels1D;
    };

    // Đồng bộ displayInput từ selectedOrder và numberFrequency
    useEffect(() => {
        if (!isInputChanged) {
            const orderedNumbers = selectedOrder.filter(num => numberFrequency[num] > 0);
            const inputArray = [];
            orderedNumbers.forEach(num => {
                for (let i = 0; i < numberFrequency[num]; i++) {
                    inputArray.push(num);
                }
            });
            const newInput = inputArray.join(',');
            const { normalized } = parseAndNormalizeInput(newInput);
            setInputNumbers(normalized);
            setDisplayInput(normalized);
        }
    }, [numberFrequency, selectedOrder, isInputChanged]);

    // Cập nhật levels từ calculatedLevels
    useEffect(() => {
        setLevels(calculatedLevels);
    }, [calculatedLevels]);

    // Cập nhật levels1D khi numberFrequency thay đổi
    useEffect(() => {
        setLevels1D(calculateLevels1D());
    }, [numberFrequency]);

    // Tăng tần suất số khi click vào số
    const handleNumberClick = (num, e) => {
        e.stopPropagation();
        setNumberFrequency(prev => ({
            ...prev,
            [num]: (prev[num] || 0) + 1,
        }));
        if (!selectedOrder.includes(num)) {
            setSelectedOrder(prev => [...prev, num]);
        }
        setIsInputChanged(false);
    };

    // Giảm tần suất số
    const handleDecreaseFrequency = (num, e) => {
        e.stopPropagation();
        const freq = numberFrequency[num] || 0;
        if (freq <= 0) return;

        setNumberFrequency(prev => {
            const newFreq = { ...prev };
            newFreq[num] = freq - 1;
            if (newFreq[num] === 0) {
                delete newFreq[num];
                setSelectedOrder(prev => prev.filter(n => n !== num));
            }
            return newFreq;
        });
        setIsInputChanged(false);
    };

    // Xử lý khi nhập input
    const handleInputChange = (e) => {
        const value = e.target.value;
        if (value.length > 1000) {
            setInputError('Input quá dài, vui lòng nhập dưới 1000 ký tự.');
            return;
        }
        setInputError('');
        setDisplayInput(value);
        setInputNumbers(value);
        setIsInputChanged(true);

        const { pairs, error } = parseAndNormalizeInput(value);
        if (error) {
            setInputError(error);
            setNumberFrequency({});
            setSelectedOrder([]);
            return;
        }
        const newNumberFreq = {};
        const newSelectedOrder = [];
        pairs.forEach(num => {
            newNumberFreq[num] = (newNumberFreq[num] || 0) + 1;
            if (!newSelectedOrder.includes(num)) {
                newSelectedOrder.push(num);
            }
        });
        setNumberFrequency(newNumberFreq);
        setSelectedOrder(newSelectedOrder);
    };

    // Chuẩn hóa input khi người dùng rời khỏi ô nhập
    const handleInputBlur = () => {
        const { normalized, pairs, error } = parseAndNormalizeInput(displayInput);
        if (error) {
            setInputError(error);
            setInputNumbers('');
            setDisplayInput('');
            setNumberFrequency({});
            setSelectedOrder([]);
            setIsInputChanged(false);
            return;
        }
        setInputNumbers(normalized);
        setDisplayInput(normalized);

        const newNumberFreq = {};
        const newSelectedOrder = [];
        pairs.forEach(num => {
            newNumberFreq[num] = (newNumberFreq[num] || 0) + 1;
            if (!newSelectedOrder.includes(num)) {
                newSelectedOrder.push(num);
            }
        });
        setNumberFrequency(newNumberFreq);
        setSelectedOrder(newSelectedOrder);
        setIsInputChanged(false);
    };

    // Chuẩn hóa khi nhấn Enter
    const handleInputKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const { normalized, pairs, error } = parseAndNormalizeInput(displayInput);
            if (error) {
                setInputError(error);
                setInputNumbers('');
                setDisplayInput('');
                setNumberFrequency({});
                setSelectedOrder([]);
                setIsInputChanged(false);
                return;
            }
            setInputNumbers(normalized);
            setDisplayInput(normalized);

            const newNumberFreq = {};
            const newSelectedOrder = [];
            pairs.forEach(num => {
                newNumberFreq[num] = (newNumberFreq[num] || 0) + 1;
                if (!newSelectedOrder.includes(num)) {
                    newSelectedOrder.push(num);
                }
            });
            setNumberFrequency(newNumberFreq);
            setSelectedOrder(newSelectedOrder);
            setIsInputChanged(false);
        }
    };

    // Xóa tất cả lựa chọn
    const xoaDan = () => {
        setPreviousState({
            inputNumbers,
            displayInput,
            numberFrequency,
            selectedOrder,
            levels
        });
        setInputNumbers('');
        setDisplayInput('');
        setNumberFrequency({});
        setSelectedOrder([]);
        setLevels({});
        setIsInputChanged(false);
        setXoaDanClicked(true);
        setShowCopyModal(true);
        setShowUndo(true);
    };

    // Hoàn tác xóa
    const undoXoaDan = () => {
        if (previousState) {
            setInputNumbers(previousState.inputNumbers);
            setDisplayInput(previousState.displayInput);
            setNumberFrequency(previousState.numberFrequency);
            setSelectedOrder(previousState.selectedOrder);
            setLevels(previousState.levels);
            setIsInputChanged(false);
            setShowUndo(false);
            setPreviousState(null);
        }
    };

    // Sao chép danh sách số theo định dạng yêu cầu
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
            setCopyDanClicked(true);
            setShowCopyModal(true);
            console.error('Copy failed:', err);
        });
    };

    // Tạo mức 1D
    const taoMuc1D = () => {
        const levels1D = calculateLevels1D();
        setLevels1D(levels1D);

        let copyText = '';
        Object.entries(levels1D).forEach(([level, digits]) => {
            copyText += `Mức: ${level} (${digits.length}) số\n${digits.join(',')}\n`;
        });
        navigator.clipboard.writeText(copyText.trim()).then(() => {
            setTaoMuc1DClicked(true);
            setShowCopyModal(true);
        }).catch(err => {
            setTaoMuc1DClicked(true);
            setShowCopyModal(true);
            console.error('Copy failed:', err);
        });
    };

    // Đóng modal
    const closeModal = () => {
        setShowCopyModal(false);
        setXoaDanClicked(false);
        setCopyDanClicked(false);
        setTaoMuc1DClicked(false);
    };

    return (
        <div className={styles.form}>
            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                <h3 className={styles.groupTitle}>Nhập các dàn số vào đây</h3>
                <textarea
                    value={displayInput}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                    onKeyDown={handleInputKeyDown}
                    placeholder="Ví dụ:34,123,4135,56721 (dùng , ; hoặc cách)"
                    className={styles.input}
                />
                {inputError && <p className={styles.error}>{inputError}</p>}
            </div>
            <div className={styles.formGroup}>
                <h3 className={styles.groupTitle}>Hoặc Chọn số (click để tăng số lần, - để giảm)</h3>
                <div className={styles.numberGrid}>
                    {allNumbers.map(num => (
                        <NumberItem
                            key={num}
                            num={num}
                            frequency={numberFrequency[num] || 0}
                            onClick={handleNumberClick}
                            onDecrease={handleDecreaseFrequency}
                        />
                    ))}
                </div>
                <p className={styles.totalSelected}>Tổng số được chọn: {totalSelected}</p>
            </div>
            <div className={styles.formGroup}>
                <div className={styles.buttonGroup}>
                    <button
                        onClick={xoaDan}
                        className={`${styles.filterButton} ${styles.resetButton}`}
                        disabled={totalSelected === 0}
                    >
                        Xóa Tất Cả
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
                        Copy dàn 2D
                    </button>
                    <button
                        onClick={taoMuc1D}
                        className={`${styles.filterButton} ${styles.create1DButton}`}
                        disabled={totalSelected === 0}
                    >
                        Copy dàn 1D
                    </button>
                </div>
            </div>
            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                <h3 className={styles.groupTitle}>Kết quả</h3>
                <div className={styles.tabGroup}>
                    <button
                        className={`${styles.viewTab} ${viewMode === '2D' ? styles.activeTab : ''}`}
                        onClick={() => setViewMode('2D')}
                    >
                        Dàn 2D
                    </button>
                    <button
                        className={`${styles.viewTab} ${viewMode === '1D' ? styles.activeTab : ''}`}
                        onClick={() => setViewMode('1D')}
                    >
                        Dàn 1D
                    </button>
                </div>
                {viewMode === '2D' ? (
                    totalSelected > 0 ? (
                        <div className={styles.result}>
                            {Object.entries(levels).map(([level, nums]) => (
                                nums.length > 0 && (
                                    <div key={level} className={styles.levelBox}>
                                        <h4 className={styles.levelTitle}>Mức {level}: ({nums.length})</h4>
                                        <ul className={styles.list}>
                                            {nums.map((num, index) => (
                                                <li key={index} className={styles.listItem}>{num}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )
                            ))}
                        </div>
                    ) : (
                        <p className={styles.noResult}>Chưa có số nào được chọn.</p>
                    )
                ) : (
                    totalSelected > 0 ? (
                        <div className={styles.result}>
                            {Object.entries(levels1D).map(([level, digits]) => (
                                digits.length > 0 && (
                                    <div key={level} className={styles.levelBox1D}>
                                        <h4 className={styles.levelTitle}>Mức {level}: ({digits.length})</h4>
                                        <ul className={styles.list}>
                                            {digits.map((digit, index) => (
                                                <li key={index} className={styles.listItem1D}>{digit}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )
                            ))}
                        </div>
                    ) : (
                        <p className={styles.noResult}>Chưa có số nào được chọn.</p>
                    )
                )}
            </div>
            <div className={`${styles.modal} ${showCopyModal ? styles.active : ''}`} onClick={closeModal}>
                <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                    <p className={styles.modalMessage}>
                        {xoaDanClicked && 'Đã xóa tất cả lựa chọn'}
                        {copyDanClicked && 'Đã sao chép dàn số 2D'}
                        {taoMuc1DClicked && 'Đã sao chép dàn số 1D'}
                    </p>
                    <button onClick={closeModal} className={styles.closeButton}>Đóng</button>
                </div>
            </div>
        </div>
    );
};

export default TaoDan2DLogic;