import React from 'react';
import styles from '../styles/LIVEMT.module.css';
import { getFilteredNumber } from "../library/utils/filterUtils";
import { useLottery } from '../contexts/LotteryContext';

// Tái sử dụng hoàn toàn logic từ LiveResult.js
const LiveResultOptimized = ({ station, getHeadAndTailNumbers, handleFilterChange, filterTypes, isLiveWindow, isModal = false, isForum = false }) => {
    const { liveData, setLiveData, setIsLiveDataComplete } = useLottery() || { liveData: null, setLiveData: null, setIsLiveDataComplete: null };

    // Tái sử dụng logic getHeadAndTailNumbers từ LiveResult.js
    const getHeadAndTailNumbers = (stationData) => {
        const allNumbers = [
            ...(stationData.eightPrizes || []).map(num => ({ num, isEighth: true })),
            ...(stationData.specialPrize || []).map(num => ({ num, isSpecial: true })),
            ...(stationData.firstPrize || []).map(num => ({ num })),
            ...(stationData.secondPrize || []).map(num => ({ num })),
            ...(stationData.threePrizes || []).map(num => ({ num })),
            ...(stationData.fourPrizes || []).map(num => ({ num })),
            ...(stationData.fivePrizes || []).map(num => ({ num })),
            ...(stationData.sixPrizes || []).map(num => ({ num })),
            ...(stationData.sevenPrizes || []).map(num => ({ num })),
        ]
            .filter(item => item.num != null && item.num !== '')
            .map((item) => ({
                num: getFilteredNumber(item.num, 'last2'),
                isEighth: item.isEighth || false,
                isSpecial: item.isSpecial || false,
            }))
            .filter(item => item.num != null && item.num !== '' && !isNaN(item.num));

        const heads = Array(10).fill().map(() => []);
        const tails = Array(10).fill().map(() => []);

        allNumbers.forEach((item) => {
            if (item.num != null && item.num !== '') {
                const numStr = item.num.toString().padStart(2, '0');
                const head = parseInt(numStr[0]);
                const tail = parseInt(numStr[numStr.length - 1]);

                if (!isNaN(head) && head >= 0 && head <= 9 && !isNaN(tail) && tail >= 0 && tail <= 9) {
                    heads[head].push({ num: numStr, isEighth: item.isEighth, isSpecial: item.isSpecial });
                    tails[tail].push({ num: numStr, isEighth: item.isEighth, isSpecial: item.isSpecial });
                }
            }
        });

        for (let i = 0; i < 10; i++) {
            heads[i].sort((a, b) => parseInt(a.num) - parseInt(b.num));
            tails[i].sort((a, b) => parseInt(b.num) - parseInt(a.num));
        }

        return { heads, tails };
    };

    const getPrizeNumbers = (stationData) => {
        const numbers = [];

        const addNumber = (num, isSpecial = false, isEighth = false) => {
            if (num != null && num !== '') {
                numbers.push({
                    num: getFilteredNumber(num, 'last2'),
                    isSpecial,
                    isEighth
                });
            }
        };

        // Thêm các giải theo thứ tự
        (stationData.eightPrizes || []).forEach(num => addNumber(num, false, true));
        (stationData.specialPrize || []).forEach(num => addNumber(num, true, false));
        (stationData.firstPrize || []).forEach(num => addNumber(num));
        (stationData.secondPrize || []).forEach(num => addNumber(num));
        (stationData.threePrizes || []).forEach(num => addNumber(num));
        (stationData.fourPrizes || []).forEach(num => addNumber(num));
        (stationData.fivePrizes || []).forEach(num => addNumber(num));
        (stationData.sixPrizes || []).forEach(num => addNumber(num));
        (stationData.sevenPrizes || []).forEach(num => addNumber(num));

        return numbers.filter(item => item.num != null && item.num !== '' && !isNaN(item.num));
    };

    const renderPrizeValue = (value, isAnimating = false) => {
        if (!value || value === '...') {
            return <span className={styles.prizeNumber}>...</span>;
        }

        const filteredValue = getFilteredNumber(value, 'last2');
        const isSpecial = value === liveData?.find(item => item.specialPrize_0 === value)?.specialPrize_0;
        const isEighth = value === liveData?.find(item => item.eightPrizes_0 === value)?.eightPrizes_0;

        return (
            <span className={`${styles.prizeNumber} ${isAnimating ? styles.animating : ''} ${isSpecial ? styles.specialPrize : ''} ${isEighth ? styles.eighthPrize : ''}`}>
                {filteredValue}
            </span>
        );
    };

    if (!liveData || !Array.isArray(liveData) || liveData.length === 0) {
        return (
            <div className={`${styles.containerKQs} ${isModal ? styles.modalContainer : ''} ${isForum ? styles.forumContainer : ''}`}>
                <div className={styles.loadingContainer}>
                    <div className={styles.loadingSpinner}></div>
                    <p>Đang tải kết quả xổ số trực tiếp...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`${styles.containerKQs} ${isModal ? styles.modalContainer : ''} ${isForum ? styles.forumContainer : ''}`}>
            {liveData.map((stationData, index) => {
                const { heads, tails } = getHeadAndTailNumbers(stationData);
                const prizeNumbers = getPrizeNumbers(stationData);

                return (
                    <div key={`${stationData.tinh}-${index}`} className={styles.optimizedKqxs}>
                        <div className={styles.optimizedHeader}>
                            <h2 className={styles.optimizedTitle}>
                                Xổ số {stationData.tentinh}
                            </h2>
                            <div className={styles.optimizedSubtitle}>
                                {stationData.dayOfWeek} - {stationData.drawDate}
                            </div>
                        </div>

                        <div className={styles.optimizedTableContainer}>
                            <table className={styles.optimizedTable}>
                                <thead>
                                    <tr>
                                        <th className={styles.optimizedTableHeader}>Giải</th>
                                        <th className={styles.optimizedTableHeader}>Kết quả</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className={styles.optimizedTableRow}>
                                        <td className={styles.optimizedPrizeLabel}>Giải tám</td>
                                        <td className={styles.optimizedPrizeCell}>
                                            <div className={styles.optimizedPrizeContainer}>
                                                {renderPrizeValue(stationData.eightPrizes_0)}
                                            </div>
                                        </td>
                                    </tr>
                                    <tr className={styles.optimizedTableRow}>
                                        <td className={styles.optimizedPrizeLabel}>Giải đặc biệt</td>
                                        <td className={styles.optimizedPrizeCell}>
                                            <div className={styles.optimizedPrizeContainer}>
                                                {renderPrizeValue(stationData.specialPrize_0)}
                                            </div>
                                        </td>
                                    </tr>
                                    <tr className={styles.optimizedTableRow}>
                                        <td className={styles.optimizedPrizeLabel}>Giải nhất</td>
                                        <td className={styles.optimizedPrizeCell}>
                                            <div className={styles.optimizedPrizeContainer}>
                                                {renderPrizeValue(stationData.firstPrize_0)}
                                            </div>
                                        </td>
                                    </tr>
                                    <tr className={styles.optimizedTableRow}>
                                        <td className={styles.optimizedPrizeLabel}>Giải nhì</td>
                                        <td className={styles.optimizedPrizeCell}>
                                            <div className={styles.optimizedPrizeContainer}>
                                                {renderPrizeValue(stationData.secondPrize_0)}
                                            </div>
                                        </td>
                                    </tr>
                                    <tr className={styles.optimizedTableRow}>
                                        <td className={styles.optimizedPrizeLabel}>Giải ba</td>
                                        <td className={styles.optimizedPrizeCell}>
                                            <div className={styles.optimizedPrizeContainer}>
                                                {renderPrizeValue(stationData.threePrizes_0)} - {renderPrizeValue(stationData.threePrizes_1)}
                                            </div>
                                        </td>
                                    </tr>
                                    <tr className={styles.optimizedTableRow}>
                                        <td className={styles.optimizedPrizeLabel}>Giải tư</td>
                                        <td className={styles.optimizedPrizeCell}>
                                            <div className={styles.optimizedPrizeContainer}>
                                                {renderPrizeValue(stationData.fourPrizes_0)} - {renderPrizeValue(stationData.fourPrizes_1)} - {renderPrizeValue(stationData.fourPrizes_2)} - {renderPrizeValue(stationData.fourPrizes_3)} - {renderPrizeValue(stationData.fourPrizes_4)} - {renderPrizeValue(stationData.fourPrizes_5)} - {renderPrizeValue(stationData.fourPrizes_6)}
                                            </div>
                                        </td>
                                    </tr>
                                    <tr className={styles.optimizedTableRow}>
                                        <td className={styles.optimizedPrizeLabel}>Giải năm</td>
                                        <td className={styles.optimizedPrizeCell}>
                                            <div className={styles.optimizedPrizeContainer}>
                                                {renderPrizeValue(stationData.fivePrizes_0)}
                                            </div>
                                        </td>
                                    </tr>
                                    <tr className={styles.optimizedTableRow}>
                                        <td className={styles.optimizedPrizeLabel}>Giải sáu</td>
                                        <td className={styles.optimizedPrizeCell}>
                                            <div className={styles.optimizedPrizeContainer}>
                                                {renderPrizeValue(stationData.sixPrizes_0)}
                                            </div>
                                        </td>
                                    </tr>
                                    <tr className={styles.optimizedTableRow}>
                                        <td className={styles.optimizedPrizeLabel}>Giải bảy</td>
                                        <td className={styles.optimizedPrizeCell}>
                                            <div className={styles.optimizedPrizeContainer}>
                                                {renderPrizeValue(stationData.sevenPrizes_0)}
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Chỉ hiển thị bảng thống kê đầu đuôi khi không phải forum */}
                        {!isForum && (
                            <div className={styles.optimizedStatsContainer}>
                                <div className={styles.optimizedStatsHeader}>
                                    {/* <h3>Bảng thống kê đầu đuôi</h3> */}
                                </div>
                                <div className={styles.optimizedStatsContent}>
                                    {/* Bảng đầu */}
                                    <div className={styles.optimizedStatsTable}>
                                        <div className={styles.optimizedStatsTableHeader}>
                                            <div className={styles.optimizedStatsTableCell}>Đầu</div>
                                            <div className={styles.optimizedStatsTableCell}>Số</div>
                                        </div>
                                        {Array.from({ length: 10 }, (_, i) => (
                                            <div key={`head-${i}`} className={styles.optimizedStatsTableRow}>
                                                <div className={styles.optimizedStatsTableCell}>
                                                    <span className={styles.optimizedStatsNumber}>{i}</span>
                                                </div>
                                                <div className={styles.optimizedStatsTableCell}>
                                                    <div className={styles.optimizedStatsNumbers}>
                                                        {heads[i].map((item, index) => (
                                                            <span
                                                                key={index}
                                                                className={`${styles.optimizedStatsPrizeNumber} ${item.isEighth ? styles.optimizedStatsEighthPrize : ''} ${item.isSpecial ? styles.optimizedStatsSpecialPrize : ''}`}
                                                            >
                                                                {item.num}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Bảng đuôi */}
                                    <div className={styles.optimizedStatsTable}>
                                        <div className={styles.optimizedStatsTableHeader}>
                                            <div className={styles.optimizedStatsTableCell}>Đuôi</div>
                                            <div className={styles.optimizedStatsTableCell}>Số</div>
                                        </div>
                                        {Array.from({ length: 10 }, (_, i) => (
                                            <div key={`tail-${i}`} className={styles.optimizedStatsTableRow}>
                                                <div className={styles.optimizedStatsTableCell}>
                                                    <span className={styles.optimizedStatsNumber}>{i}</span>
                                                </div>
                                                <div className={styles.optimizedStatsTableCell}>
                                                    <div className={styles.optimizedStatsNumbers}>
                                                        {tails[i].map((item, index) => (
                                                            <span
                                                                key={index}
                                                                className={`${styles.optimizedStatsPrizeNumber} ${item.isEighth ? styles.optimizedStatsEighthPrize : ''} ${item.isSpecial ? styles.optimizedStatsSpecialPrize : ''}`}
                                                            >
                                                                {item.num}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default LiveResultOptimized; 