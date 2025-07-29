import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import styles from '../../styles/LIVEMT.module.css';
import { getFilteredNumber } from "../../library/utils/filterUtils";
import React from 'react';
import { useLottery } from '../../contexts/LotteryContext';

const LiveResult = React.memo(({ station = 'xsmt', getHeadAndTailNumbers, propHandleFilterChange, propFilterTypes, isLiveWindow }) => {
    const { filterTypes: globalFilterTypes, handleFilterChange: globalHandleFilterChange, subscribeToLottery } = useLottery();

    const today = useMemo(() => {
        return new Date().toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        }).replace(/\//g, '-');
    }, []);

    const provincesByDay = useMemo(() => ({
        0: [
            { tinh: 'kon-tum', tentinh: 'Kon Tum' },
            { tinh: 'khanh-hoa', tentinh: 'Khánh Hòa' },
            { tinh: 'hue', tentinh: 'Thừa Thiên Huế' },
        ],
        1: [
            { tinh: 'phu-yen', tentinh: 'Phú Yên' },
            { tinh: 'hue', tentinh: 'Thừa Thiên Huế' },
        ],
        2: [
            { tinh: 'dak-lak', tentinh: 'Đắk Lắk' },
            { tinh: 'quang-nam', tentinh: 'Quảng Nam' },
        ],
        3: [
            { tinh: 'da-nang', tentinh: 'Đà Nẵng' },
            { tinh: 'khanh-hoa', tentinh: 'Khánh Hòa' },
        ],
        4: [
            { tinh: 'binh-dinh', tentinh: 'Bình Định' },
            { tinh: 'quang-tri', tentinh: 'Quảng Trị' },
            { tinh: 'quang-binh', tentinh: 'Quảng Bình' },
        ],
        5: [
            { tinh: 'gia-lai', tentinh: 'Gia Lai' },
            { tinh: 'ninh-thuan', tentinh: 'Ninh Thuận' },
        ],
        6: [
            { tinh: 'da-nang', tentinh: 'Đà Nẵng' },
            { tinh: 'quang-ngai', tentinh: 'Quảng Ngãi' },
            { tinh: 'dak-nong', tentinh: 'Đắk Nông' },
        ]
    }), []);

    const dayOfWeekIndex = useMemo(() => new Date().getDay(), []);
    const provinces = useMemo(() => provincesByDay[dayOfWeekIndex] || provincesByDay[6], [provincesByDay, dayOfWeekIndex]);

    // Use custom hook for lottery data
    const {
        useLotteryData
    } = useLottery();

    const {
        data: liveData,
        processedData,
        isLoading,
        isComplete,
        error,
        connectionStatus,
        subscribersCount
    } = useLotteryData(station, today, provinces);

    console.log(`=== LIVE RESULT DEBUG ===`);
    console.log(`LiveData:`, liveData);
    console.log(`LiveData length:`, liveData ? liveData.length : 0);
    console.log(`IsLoading:`, isLoading);
    console.log(`IsComplete:`, isComplete);
    console.log(`Error:`, error);

    // Auto-subscribe when component mounts
    useEffect(() => {
        console.log(`=== LIVE RESULT MOUNT ===`);
        console.log(`Station: ${station}`);
        console.log(`Today: ${today}`);
        console.log(`Provinces:`, provinces);

        // Subscribe to lottery data
        const unsubscribe = subscribeToLottery(station, today, provinces);

        return () => {
            console.log(`=== LIVE RESULT UNMOUNT ===`);
            unsubscribe.then(unsub => unsub && unsub());
        };
    }, [station, today, provinces, subscribeToLottery]);

    const [animatingPrizes, setAnimatingPrizes] = useState({});
    const prevAnimatingPrizesRef = useRef(animatingPrizes);

    // Đảm bảo dữ liệu có đúng format
    const validLiveData = useMemo(() => {
        if (!liveData || !liveData.length) return [];
        const filtered = liveData.filter(item =>
            item && item.tinh && item.tentinh &&
            typeof item === 'object' && !Array.isArray(item)
        );

        return filtered;
    }, [liveData]);

    // Memoized values
    const tableKey = useMemo(() => today + station, [today, station]);
    const currentFilter = useMemo(() => globalFilterTypes.get(tableKey) || 'all', [globalFilterTypes, tableKey]);

    // Handle animation states
    useEffect(() => {
        if (!validLiveData || !validLiveData.length) {
            if (Object.keys(animatingPrizes).length > 0) {
                setAnimatingPrizes({});
            }
            return;
        }

        const animationQueue = [
            'eightPrizes_0', 'sevenPrizes_0',
            'sixPrizes_0', 'sixPrizes_1', 'sixPrizes_2',
            'fivePrizes_0',
            'fourPrizes_0', 'fourPrizes_1', 'fourPrizes_2', 'fourPrizes_3', 'fourPrizes_4', 'fourPrizes_5', 'fourPrizes_6',
            'threePrizes_0', 'threePrizes_1',
            'secondPrize_0', 'firstPrize_0', 'specialPrize_0'
        ];

        const newAnimatingPrizes = { ...animatingPrizes };

        validLiveData.forEach(stationData => {
            const currentPrize = animatingPrizes[stationData.tinh];
            if (!currentPrize || stationData[currentPrize] !== '...') {
                const nextPrize = animationQueue.find(prize => stationData[prize] === '...') || null;
                newAnimatingPrizes[stationData.tinh] = nextPrize;
            }
        });

        if (JSON.stringify(newAnimatingPrizes) !== JSON.stringify(prevAnimatingPrizesRef.current)) {
            setAnimatingPrizes(newAnimatingPrizes);
            prevAnimatingPrizesRef.current = newAnimatingPrizes;
        }
    }, [validLiveData, animatingPrizes]);

    const renderPrizeValue = useCallback((tinh, prizeType, digits = 5) => {
        const stationData = validLiveData.find(item => item.tinh === tinh);
        const isAnimating = animatingPrizes[tinh] === prizeType && stationData?.[prizeType] === '...';
        const className = `${styles.running_number} ${styles[`running_${digits}`]}`;
        const prizeValue = stationData?.[prizeType] || '...';
        const currentFilter = globalFilterTypes.get(`${today}${station}`) || 'all';
        const filteredValue = getFilteredNumber(prizeValue, currentFilter);
        const displayDigits = currentFilter === 'last2' ? 2 : currentFilter === 'last3' ? 3 : digits;
        const isSpecialOrEighth = prizeType === 'specialPrize_0' || prizeType === 'eightPrizes_0';

        return (
            <span className={`${className} ${isSpecialOrEighth ? styles.highlight : ''}`} data-status={isAnimating ? 'animating' : 'static'}>
                {isAnimating ? (
                    <span className={styles.digit_container}>
                        {Array.from({ length: displayDigits }).map((_, i) => (
                            <span key={i} className={styles.digit} data-status="animating" data-index={i}></span>
                        ))}
                    </span>
                ) : prizeValue === '...' ? (
                    <span className={styles.ellipsis}></span>
                ) : (
                    <span className={styles.digit_container}>
                        {filteredValue
                            .padStart(displayDigits, '0')
                            .split('')
                            .map((digit, i) => (
                                <span key={i} className={`${styles.digit12} ${isSpecialOrEighth ? styles.highlight1 : ''}`} data-status="static" data-index={i}>
                                    {digit}
                                </span>
                            ))}
                    </span>
                )}
            </span>
        );
    }, [animatingPrizes, validLiveData, globalFilterTypes, today, station]);

    // Early returns after all hooks
    if (!liveData || liveData.length === 0) {
        return <div className={styles.error}>Đang tải dữ liệu...</div>;
    }

    if (validLiveData.length === 0) {
        return <div className={styles.error}>Không có dữ liệu hợp lệ</div>;
    }

    return (
        <div className={styles.containerKQs} style={{ contain: 'layout style paint' }}>
            {error && error !== 'Dữ liệu WebSocket không hợp lệ' && <div className={styles.error}>{error}</div>}
            {isLoading && (
                <div className={styles.loading}>Đang chờ kết quả ngày {today}...</div>
            )}
            {connectionStatus && (
                <div className={styles.connectionStatus}>
                    <span className={styles.statusIndicator} data-status={connectionStatus ? 'connected' : 'disconnected'}></span>
                    <span className={styles.statusText}>
                        {connectionStatus ? 'Đã kết nối' : 'Đang kết nối...'}
                        {subscribersCount > 0 && ` (${subscribersCount} người đang xem)`}
                    </span>
                </div>
            )}
            <div className={styles.kqxs} style={{ '--num-columns': validLiveData.length }}>
                <div className={styles.header}>
                    <div className={styles.tructiep}><span className={styles.kqxs__title1}>Tường thuật trực tiếp...</span></div>
                    <h1 className={styles.kqxs__title}>XSMT - Kết quả Xổ số Miền Trung - SXMT {today}</h1>
                    <div className={styles.kqxs__action}>
                        <a className={styles.kqxs__actionLink} href="#!">XSMT</a>
                        <a className={`${styles.kqxs__actionLink} ${styles.dayOfWeek}`} href="#!">{validLiveData[0]?.dayOfWeek}</a>
                        <a className={styles.kqxs__actionLink} href="#!">{today}</a>
                    </div>
                </div>
                <table className={styles.tableXS}>
                    <thead>
                        <tr>
                            <th></th>
                            {validLiveData.map(stationData => (
                                <th key={stationData.tinh} className={styles.stationName}>
                                    {stationData.tentinh}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className={`${styles.tdTitle} ${styles.highlight}`}>G8</td>
                            {validLiveData.map(item => (
                                <td key={item.tinh} className={styles.rowXS}>
                                    <span className={`${styles.span4} ${styles.highlight}`}>
                                        {renderPrizeValue(item.tinh, 'eightPrizes_0', 2)}
                                    </span>
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className={styles.tdTitle}>G7</td>
                            {validLiveData.map(item => (
                                <td key={item.tinh} className={styles.rowXS}>
                                    <span className={styles.span4}>
                                        {renderPrizeValue(item.tinh, 'sevenPrizes_0', 3)}
                                    </span>
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className={styles.tdTitle}>G6</td>
                            {validLiveData.map(item => (
                                <td key={item.tinh} className={styles.rowXS}>
                                    {[0, 1, 2].map(idx => (
                                        <span key={idx} className={styles.span3}>
                                            {renderPrizeValue(item.tinh, `sixPrizes_${idx}`, 4)}
                                        </span>
                                    ))}
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className={`${styles.tdTitle} ${styles.g3}`}>G5</td>
                            {validLiveData.map(item => (
                                <td key={item.tinh} className={styles.rowXS}>
                                    <span className={`${styles.span3} ${styles.g3}`}>
                                        {renderPrizeValue(item.tinh, 'fivePrizes_0', 4)}
                                    </span>
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className={styles.tdTitle}>G4</td>
                            {validLiveData.map(item => (
                                <td key={item.tinh} className={styles.rowXS}>
                                    {[0, 1, 2, 3, 4, 5, 6].map(idx => (
                                        <span key={idx} className={styles.span4}>
                                            {renderPrizeValue(item.tinh, `fourPrizes_${idx}`, 5)}
                                        </span>
                                    ))}
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className={`${styles.tdTitle} ${styles.g3}`}>G3</td>
                            {validLiveData.map(item => (
                                <td key={item.tinh} className={styles.rowXS}>
                                    {[0, 1].map(idx => (
                                        <span key={idx} className={`${styles.span3} ${styles.g3}`}>
                                            {renderPrizeValue(item.tinh, `threePrizes_${idx}`, 5)}
                                        </span>
                                    ))}
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className={styles.tdTitle}>G2</td>
                            {validLiveData.map(item => (
                                <td key={item.tinh} className={styles.rowXS}>
                                    <span className={styles.span1}>
                                        {renderPrizeValue(item.tinh, 'secondPrize_0', 5)}
                                    </span>
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className={styles.tdTitle}>G1</td>
                            {validLiveData.map(item => (
                                <td key={item.tinh} className={styles.rowXS}>
                                    <span className={styles.span1}>
                                        {renderPrizeValue(item.tinh, 'firstPrize_0', 5)}
                                    </span>
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className={`${styles.tdTitle} ${styles.highlight}`}>ĐB</td>
                            {validLiveData.map(item => (
                                <td key={item.tinh} className={styles.rowXS}>
                                    <span className={`${styles.span1} ${styles.highlight} ${styles.gdb}`}>
                                        {renderPrizeValue(item.tinh, 'specialPrize_0', 6)}
                                    </span>
                                </td>
                            ))}
                        </tr>
                    </tbody>
                </table>
                <div className={styles.action}>
                    <div aria-label="Tùy chọn lọc số" className={styles.filter__options} role="radiogroup">
                        <div className={styles.optionInput}>
                            <input
                                id={`filterAll-${tableKey}`}
                                type="radio"
                                name={`filterOption-${tableKey}`}
                                value="all"
                                checked={currentFilter === 'all'}
                                onChange={() => globalHandleFilterChange(tableKey, 'all')}
                            />
                            <label htmlFor={`filterAll-${tableKey}`}>Đầy Đủ</label>
                        </div>
                        <div className={styles.optionInput}>
                            <input
                                id={`filterTwo-${tableKey}`}
                                type="radio"
                                name={`filterOption-${tableKey}`}
                                value="last2"
                                checked={currentFilter === 'last2'}
                                onChange={() => globalHandleFilterChange(tableKey, 'last2')}
                            />
                            <label htmlFor={`filterTwo-${tableKey}`}>2 Số Đuôi</label>
                        </div>
                        <div className={styles.optionInput}>
                            <input
                                id={`filterThree-${tableKey}`}
                                type="radio"
                                name={`filterOption-${tableKey}`}
                                value="last3"
                                checked={currentFilter === 'last3'}
                                onChange={() => globalHandleFilterChange(tableKey, 'last3')}
                            />
                            <label htmlFor={`filterThree-${tableKey}`}>3 Số Đuôi</label>
                        </div>
                    </div>
                </div>
            </div>
            <div className={styles.TKe_container}>
                <div className={styles.TKe_content}>
                    <div className={styles.TKe_contentTitle}>
                        <span className={styles.title}>Bảng Lô Tô - </span>
                        <span className={styles.desc}>Miền Trung</span>
                        <span className={styles.dayOfWeek}>{`${validLiveData[0]?.dayOfWeek} - `}</span>
                        <span className={styles.desc}>{today}</span>
                    </div>
                    <table className={styles.tableKey} style={{ '--num-columns': validLiveData.length }}>
                        <thead>
                            <tr>
                                <th className={styles.t_h}>Đầu</th>
                                {(processedData.stationsData || []).map(station => (
                                    <th key={station.tinh}>{station.tentinh}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {Array.from({ length: 10 }, (_, idx) => (
                                <tr key={idx}>
                                    <td className={styles.t_h}>{idx}</td>
                                    {(processedData.allHeads[idx] || []).map((headNumbers, index) => (
                                        <td key={index}>
                                            {headNumbers && headNumbers.length > 0 ? (
                                                headNumbers.map((item, numIdx) => (
                                                    <span
                                                        key={numIdx}
                                                        className={item.isEighth || item.isSpecial ? styles.highlight1 : ''}
                                                    >
                                                        {item.num}
                                                        {numIdx < headNumbers.length - 1 && ', '}
                                                    </span>
                                                ))
                                            ) : '-'}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className={styles.TKe_content}>
                    <div className={styles.TKe_contentTitle}>
                        <span className={styles.title}>Bảng Lô Tô - </span>
                        <span className={styles.desc}>Miền Trung</span>
                        <span className={styles.dayOfWeek}>{`${validLiveData[0]?.dayOfWeek} - `}</span>
                        <span className={styles.desc}>{today}</span>
                    </div>
                    <table className={styles.tableKey} style={{ '--num-columns': validLiveData.length }}>
                        <thead>
                            <tr>
                                <th className={styles.t_h}>Đuôi</th>
                                {(processedData.stationsData || []).map(station => (
                                    <th key={station.tinh}>{station.tentinh}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {Array.from({ length: 10 }, (_, idx) => (
                                <tr key={idx}>
                                    <td className={styles.t_h}>{idx}</td>
                                    {(processedData.allTails[idx] || []).map((tailNumbers, index) => (
                                        <td key={index}>
                                            {tailNumbers && tailNumbers.length > 0 ? (
                                                tailNumbers.map((item, numIdx) => (
                                                    <span
                                                        key={numIdx}
                                                        className={item.isEighth || item.isSpecial ? styles.highlight1 : ''}
                                                    >
                                                        {item.num}
                                                        {numIdx < tailNumbers.length - 1 && ', '}
                                                    </span>
                                                ))
                                            ) : '-'}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
});

LiveResult.displayName = 'LiveResult';

export default LiveResult;