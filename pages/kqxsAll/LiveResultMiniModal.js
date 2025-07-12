import React, { useState } from 'react';
import Modal from 'react-modal';
import useLiveResult from './SSEContext';
import { useLottery } from '../../contexts/LotteryContext';
import styles from '../../styles/LivekqxsMB.module.css';

const LiveResultMiniModal = ({ station, date, isOpen, onClose }) => {
    const { liveData, setLiveData, setIsLiveDataComplete } = useLottery() || {};
    const { isTodayLoading, error, animatingPrize } = useLiveResult(station, date, isOpen, setLiveData, setIsLiveDataComplete);
    const [selectedProvince, setSelectedProvince] = useState(station);

    const provinces = ['xsmb', 'hue', 'kon-tum', 'khanh-hoa']; // Hỗ trợ XSMT

    const renderPrizeValue = (prizeType, digits = 5) => {
        const isAnimating = animatingPrize === prizeType && liveData[prizeType] === '...';
        const className = `${styles.running_number} ${styles[`running_${digits}`]}`;

        return (
            <span className={className} data-status={isAnimating ? 'animating' : 'static'}>
                {isAnimating ? (
                    <span className={styles.digit_container}>
                        {Array.from({ length: digits }).map((_, i) => (
                            <span key={i} className={styles.digit} data-status="animating" data-index={i}></span>
                        ))}
                    </span>
                ) : liveData[prizeType] === '...' ? (
                    <span className={styles.ellipsis}></span>
                ) : (
                    <span className={styles.digit_container}>
                        {liveData[prizeType]
                            .padStart(digits, '0')
                            .split('')
                            .map((digit, i) => (
                                <span key={i} className={styles.digit} data-status="static" data-index={i}>
                                    {digit}
                                </span>
                            ))}
                    </span>
                )}
            </span>
        );
    };

    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={onClose}
            className={styles.miniModal}
            style={{
                content: {
                    top: '20px',
                    left: '20px',
                    width: '300px',
                    height: '400px',
                    overflowY: 'auto',
                    background: 'white',
                    border: '1px solid #ccc',
                    borderRadius: '8px',
                    padding: '10px',
                },
            }}
        >
            <div className={styles.header}>
                <h3>KQXS {liveData.tentinh} - {date}</h3>
                <select
                    value={selectedProvince}
                    onChange={(e) => setSelectedProvince(e.target.value)}
                >
                    {provinces.map((prov) => (
                        <option key={prov} value={prov}>
                            {prov === 'xsmb' ? 'Miền Bắc' : prov === 'hue' ? 'Huế' : prov === 'kon-tum' ? 'Kon Tum' : 'Khánh Hòa'}
                        </option>
                    ))}
                </select>
            </div>
            {error && <div className={styles.error}>{error}</div>}
            {isTodayLoading && <div className={styles.loading}>Đang chờ kết quả...</div>}
            <div className={styles.results}>
                <div className={styles.prizeRow}>
                    <span>ĐB</span>
                    {renderPrizeValue('specialPrize_0', 5)}
                </div>
                <div className={styles.prizeRow}>
                    <span>G1</span>
                    {renderPrizeValue('firstPrize_0', 5)}
                </div>
                <div className={styles.prizeRow}>
                    <span>G2</span>
                    {[0, 1].map(i => (
                        <span key={i}>{renderPrizeValue(`secondPrize_${i}`, 5)}</span>
                    ))}
                </div>
                <div className={styles.prizeRow}>
                    <span>G3</span>
                    {[0, 1, 2, 3, 4, 5].map(i => (
                        <span key={i}>{renderPrizeValue(`threePrizes_${i}`, 5)}</span>
                    ))}
                </div>
                <div className={styles.prizeRow}>
                    <span>G4</span>
                    {[0, 1, 2, 3].map(i => (
                        <span key={i}>{renderPrizeValue(`fourPrizes_${i}`, 4)}</span>
                    ))}
                </div>
                <div className={styles.prizeRow}>
                    <span>G5</span>
                    {[0, 1, 2, 3, 4, 5].map(i => (
                        <span key={i}>{renderPrizeValue(`fivePrizes_${i}`, 4)}</span>
                    ))}
                </div>
                <div className={styles.prizeRow}>
                    <span>G6</span>
                    {[0, 1, 2].map(i => (
                        <span key={i}>{renderPrizeValue(`sixPrizes_${i}`, 3)}</span>
                    ))}
                </div>
                <div className={styles.prizeRow}>
                    <span>G7</span>
                    {[0, 1, 2, 3].map(i => (
                        <span key={i}>{renderPrizeValue(`sevenPrizes_${i}`, 2)}</span>
                    ))}
                </div>
            </div>
            <button onClick={onClose}>Đóng</button>
        </Modal>
    );
};

export default LiveResultMiniModal;