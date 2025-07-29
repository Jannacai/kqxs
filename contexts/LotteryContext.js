import React, { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import lotteryConnectionManager from '../utils/lotteryConnectionManager';

// Simple debounce function
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

const LotteryContext = createContext();

export const useLottery = () => {
    const context = useContext(LotteryContext);
    if (!context) {
        throw new Error('useLottery must be used within a LotteryProvider');
    }
    return context;
};

export const LotteryProvider = ({ children }) => {
    const [liveData, setLiveData] = useState([]);
    const [isLiveDataComplete, setIsLiveDataComplete] = useState(false);
    const [error, setError] = useState(null);
    const [filterTypes, setFilterTypes] = useState(new Map());
    const unsubscribeRefs = useRef(new Map());
    const updateQueue = useRef(new Map());
    const batchTimeoutRef = useRef(null);
    const lastUpdateRef = useRef(new Map()); // Track last update timestamp

    // Memoized filter change handler
    const handleFilterChange = useCallback((key, value) => {
        setFilterTypes(prev => {
            const newMap = new Map(prev);
            newMap.set(key, value);
            return newMap;
        });
    }, []);

    // Optimized batch update with minimal debouncing for real-time performance
    const batchUpdate = useCallback(() => {
        if (updateQueue.current.size === 0) return;

        const currentTimestamp = Date.now();
        const newData = Array.from(updateQueue.current.values());
        updateQueue.current.clear();

        // Enhanced throttling with duplicate detection - optimized for real-time
        const throttleKey = `batchUpdate`;
        const lastUpdate = lastUpdateRef.current.get(throttleKey) || 0;
        const throttleDelay = 30; // Reduced to 30ms for faster real-time updates

        if (currentTimestamp - lastUpdate < throttleDelay) {
            // Re-queue the data for later processing
            newData.forEach(item => {
                if (item && item.tinh) {
                    updateQueue.current.set(item.tinh, item);
                }
            });
            return;
        }

        lastUpdateRef.current.set(throttleKey, currentTimestamp);

        setLiveData(prevData => {
            // Merge new data with existing data
            const mergedData = [...prevData];

            newData.forEach(newItem => {
                if (newItem && newItem.tinh) {
                    const existingIndex = mergedData.findIndex(item => item.tinh === newItem.tinh);
                    if (existingIndex >= 0) {
                        // Update existing province data
                        mergedData[existingIndex] = { ...mergedData[existingIndex], ...newItem };
                    } else {
                        // Add new province data
                        mergedData.push(newItem);
                    }
                }
            });

            return mergedData;
        });

        setError(null);
    }, []);

    const debouncedUpdate = useCallback(
        debounce(() => {
            batchUpdate();
        }, 20), // Reduced to 20ms for faster real-time updates
        [batchUpdate]
    );

    // Auto-subscribe when component mounts
    useEffect(() => {
        console.log(`=== LOTTERY CONTEXT MOUNT ===`);
        console.log(`Initial liveData:`, liveData);
        console.log(`Initial error:`, error);

        // Cleanup old timestamps periodically
        const cleanupInterval = setInterval(() => {
            const now = Date.now();
            const maxAge = 60000; // 1 minute
            for (const [key, timestamp] of lastUpdateRef.current.entries()) {
                if (now - timestamp > maxAge) {
                    lastUpdateRef.current.delete(key);
                }
            }
        }, 30000); // Clean every 30 seconds

        // Cleanup on unmount
        return () => {
            clearInterval(cleanupInterval);
            if (batchTimeoutRef.current) {
                clearTimeout(batchTimeoutRef.current);
            }
            // Cleanup all subscriptions
            unsubscribeRefs.current.forEach(unsubscribe => {
                if (unsubscribe && typeof unsubscribe === 'function') {
                    unsubscribe();
                }
            });
            unsubscribeRefs.current.clear();
        };
    }, []);

    const subscribeToLottery = useCallback(async (station, date, provinces) => {
        const key = `kqxs:${station}:${date}:`;

        console.log(`=== SUBSCRIBING TO LOTTERY ===`);
        console.log(`Key: ${key}`);
        console.log(`Station: ${station}`);
        console.log(`Date: ${date}`);
        console.log(`Provinces:`, provinces);

        // Nếu đã có subscription cho key này, return unsubscribe function hiện tại
        if (unsubscribeRefs.current.has(key)) {
            console.log(`Already subscribed to ${key}, returning existing unsubscribe`);
            return unsubscribeRefs.current.get(key);
        }

        const unsubscribe = await lotteryConnectionManager.subscribe(station, date, (data) => {
            const { type, payload } = data;
            console.log(`LotteryContext received ${type} for ${key}:`, payload);

            // Xử lý payload từ lotteryConnectionManager
            const dataToStore = Array.isArray(payload) ? payload : (payload.payload && Array.isArray(payload.payload) ? payload.payload : []);

            if (dataToStore.length > 0) {
                console.log(`Processing ${dataToStore.length} items for ${key}`);

                // Queue updates for batch processing with balanced throttling
                dataToStore.forEach(item => {
                    if (item && item.tinh) {
                        const itemKey = `${item.tinh}`;
                        const lastUpdate = lastUpdateRef.current.get(itemKey);
                        const currentTimestamp = Date.now();

                        // Skip if update is too recent (within 15ms) - optimized for real-time
                        if (lastUpdate && (currentTimestamp - lastUpdate) < 15) {
                            return;
                        }

                        updateQueue.current.set(itemKey, item);
                    }
                });

                debouncedUpdate();
                setError(null); // Clear any previous errors
            }
        });

        unsubscribeRefs.current.set(key, unsubscribe);
        console.log(`Successfully subscribed to ${key}`);
        return unsubscribe;
    }, [debouncedUpdate]);

    const useLotteryData = useCallback((station, date, provinces) => {
        // Tính toán allHeads và allTails từ liveData với memoization - optimized
        const calculateHeadsAndTails = useMemo(() => {
            if (!liveData || liveData.length === 0) {
                return { allHeads: [], allTails: [] };
            }

            const allHeads = Array(10).fill().map(() => Array.from({ length: liveData.length }, () => []));
            const allTails = Array(10).fill().map(() => Array.from({ length: liveData.length }, () => []));

            liveData.forEach((provinceData, provinceIndex) => {
                // Optimized: Chỉ xử lý các giải có dữ liệu thực
                const prizeTypes = [
                    'eightPrizes_0', 'specialPrize_0', 'firstPrize_0', 'secondPrize_0',
                    'threePrizes_0', 'threePrizes_1', 'fourPrizes_0', 'fourPrizes_1',
                    'fourPrizes_2', 'fourPrizes_3', 'fourPrizes_4', 'fourPrizes_5',
                    'fourPrizes_6', 'fivePrizes_0', 'sixPrizes_0', 'sixPrizes_1',
                    'sixPrizes_2', 'sevenPrizes_0'
                ];

                const allNumbers = prizeTypes
                    .map(type => {
                        const value = provinceData[type];
                        if (!value || value === '...' || value === '') return null;

                        return {
                            num: value.toString(),
                            isEighth: type === 'eightPrizes_0',
                            isSpecial: type === 'specialPrize_0'
                        };
                    })
                    .filter(item => item !== null)
                    .map(item => ({
                        num: item.num.toString().padStart(2, '0').slice(-2),
                        isEighth: item.isEighth,
                        isSpecial: item.isSpecial
                    }))
                    .filter(item => item.num && item.num !== '' && !isNaN(item.num));

                // Optimized: Sử dụng Set để kiểm tra duplicate nhanh hơn
                const headSets = Array(10).fill().map(() => new Set());
                const tailSets = Array(10).fill().map(() => new Set());

                allNumbers.forEach((item) => {
                    const numStr = item.num.toString().padStart(2, '0');
                    const head = parseInt(numStr[0]);
                    const tail = parseInt(numStr[numStr.length - 1]);

                    if (!isNaN(head) && head >= 0 && head <= 9 && !isNaN(tail) && tail >= 0 && tail <= 9) {
                        // Kiểm tra duplicate bằng Set
                        if (!headSets[head].has(numStr)) {
                            headSets[head].add(numStr);
                            allHeads[head][provinceIndex].push({
                                num: numStr,
                                isEighth: item.isEighth,
                                isSpecial: item.isSpecial
                            });
                        }

                        if (!tailSets[tail].has(numStr)) {
                            tailSets[tail].add(numStr);
                            allTails[tail][provinceIndex].push({
                                num: numStr,
                                isEighth: item.isEighth,
                                isSpecial: item.isSpecial
                            });
                        }
                    }
                });

                // Sắp xếp theo thứ tự tăng dần
                for (let i = 0; i < 10; i++) {
                    allHeads[i][provinceIndex].sort((a, b) => parseInt(a.num) - parseInt(b.num));
                    allTails[i][provinceIndex].sort((a, b) => parseInt(a.num) - parseInt(b.num));
                }
            });

            return { allHeads, allTails };
        }, [liveData]);

        return {
            data: liveData || [],
            processedData: {
                stationsData: liveData || [],
                allHeads: calculateHeadsAndTails.allHeads,
                allTails: calculateHeadsAndTails.allTails
            },
            isLoading: !liveData || liveData.length === 0,
            isComplete: liveData && liveData.length > 0,
            error,
            connectionStatus: true,
            subscribersCount: 1
        };
    }, [liveData, error]);

    const contextValue = useMemo(() => ({
        subscribeToLottery,
        useLotteryData,
        handleFilterChange,
        filterTypes,
        error,
        setError,
        liveData,
        setLiveData,
        isLiveDataComplete,
        setIsLiveDataComplete
    }), [subscribeToLottery, useLotteryData, handleFilterChange, filterTypes, error, setError, liveData, setLiveData, isLiveDataComplete, setIsLiveDataComplete]);

    return (
        <LotteryContext.Provider value={contextValue}>
            {children}
        </LotteryContext.Provider>
    );
};