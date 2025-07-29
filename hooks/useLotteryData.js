import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLottery } from '../contexts/LotteryContext';
import isEqual from 'lodash/isEqual';

export const useLotteryData = (station, date, provinces) => {
    const {
        liveData,
        subscribeToLottery,
        getConnectionStatus,
        getSubscribersCount,
        error,
        setError
    } = useLottery();

    const [isLoading, setIsLoading] = useState(true);
    const [localData, setLocalData] = useState([]);
    const [isComplete, setIsComplete] = useState(false);
    const mountedRef = useRef(false);
    const subscriptionRef = useRef(null);
    const dataCache = useRef(new Map());

    // Sửa key format để khớp với LotteryContext
    const key = useMemo(() => `kqxs:${station}:${date}:`, [station, date]);

    // Định nghĩa getPrizeNumbers trước khi sử dụng trong useMemo
    const getPrizeNumbers = useCallback((stationData) => {
        const lastTwoNumbers = [];
        const addNumber = (num, isSpecial = false, isEighth = false) => {
            if (num && num !== '...' && num !== '***' && /^\d+$/.test(num)) {
                const last2 = num.slice(-2).padStart(2, '0');
                lastTwoNumbers.push({ num: last2, isSpecial, isEighth });
            }
        };

        addNumber(stationData.specialPrize_0, true);
        addNumber(stationData.firstPrize_0);
        addNumber(stationData.secondPrize_0);
        for (let i = 0; i < 2; i++) addNumber(stationData[`threePrizes_${i}`]);
        for (let i = 0; i < 7; i++) addNumber(stationData[`fourPrizes_${i}`]);
        addNumber(stationData.fivePrizes_0);
        for (let i = 0; i < 3; i++) addNumber(stationData[`sixPrizes_${i}`]);
        addNumber(stationData.sevenPrizes_0);
        addNumber(stationData.eightPrizes_0, false, true);

        const heads = Array(10).fill().map(() => []);
        const tails = Array(10).fill().map(() => []);

        lastTwoNumbers.forEach(item => {
            const last2 = item.num;
            if (last2.length === 2) {
                const head = parseInt(last2[0], 10);
                const tail = parseInt(last2[1], 10);
                if (!isNaN(head) && !isNaN(tail)) {
                    heads[head].push(item);
                    tails[tail].push(item);
                }
            }
        });

        return { heads, tails };
    }, []);

    // Memoized empty result
    const emptyResult = useMemo(() => {
        if (!provinces || !Array.isArray(provinces)) return [];

        return provinces.map(province => ({
            drawDate: date,
            station: station,
            dayOfWeek: new Date().toLocaleString('vi-VN', { weekday: 'long' }),
            tentinh: province.tentinh,
            tinh: province.tinh,
            year: new Date().getFullYear(),
            month: new Date().getMonth() + 1,
            specialPrize_0: '...',
            firstPrize_0: '...',
            secondPrize_0: '...',
            threePrizes_0: '...',
            threePrizes_1: '...',
            fourPrizes_0: '...',
            fourPrizes_1: '...',
            fourPrizes_2: '...',
            fourPrizes_3: '...',
            fourPrizes_4: '...',
            fourPrizes_5: '...',
            fourPrizes_6: '...',
            fivePrizes_0: '...',
            sixPrizes_0: '...',
            sixPrizes_1: '...',
            sixPrizes_2: '...',
            sevenPrizes_0: '...',
            eightPrizes_0: '...',
            lastUpdated: 0,
        }));
    }, [date, station, provinces]);

    // Initialize component
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            if (subscriptionRef.current) {
                subscriptionRef.current();
                subscriptionRef.current = null;
            }
        };
    }, []);

    // Subscribe to lottery updates
    useEffect(() => {
        if (!station || !date || !provinces || !Array.isArray(provinces)) {
            setLocalData(emptyResult);
            setIsLoading(true);
            setError(null);
            return;
        }

        const initializeData = async () => {
            try {
                // Set initial data
                setLocalData(emptyResult);
                setIsLoading(true);
                setError(null);

                // Subscribe to updates
                subscriptionRef.current = await subscribeToLottery(station, date, provinces);

                // Check if we have cached data
                const cachedData = dataCache.current.get(key);
                if (cachedData && mountedRef.current) {
                    setLocalData(cachedData);
                    setIsLoading(false);
                }
            } catch (error) {
                console.error('Error initializing lottery data:', error);
                if (mountedRef.current) {
                    setError('Không thể kết nối đến server. Vui lòng thử lại.');
                    setIsLoading(false);
                }
            }
        };

        initializeData();

        return () => {
            if (subscriptionRef.current) {
                subscriptionRef.current();
                subscriptionRef.current = null;
            }
        };
    }, [station, date, provinces, subscribeToLottery, key]);

    // Update local data when liveData changes
    useEffect(() => {
        if (!liveData) return;

        const newData = liveData;
        const validData = Array.isArray(newData) ? newData.filter(item =>
            item && item.tinh && item.tentinh && typeof item === 'object' && !Array.isArray(item)
        ) : [];

        if (validData.length > 0) {
            setLocalData(validData);
            setIsLoading(false);
        }
    }, [liveData]);

    // Memoized processed data
    const processedData = useMemo(() => {
        if (!localData || !localData.length) {
            return { allHeads: [], allTails: [], stationsData: [] };
        }

        const allHeads = Array(10).fill().map(() => []);
        const allTails = Array(10).fill().map(() => []);
        const stationsData = [];

        localData.forEach(stationData => {
            const { heads, tails } = getPrizeNumbers(stationData);
            for (let i = 0; i < 10; i++) {
                allHeads[i].push(heads[i]);
                allTails[i].push(tails[i]);
            }
            stationsData.push({
                tentinh: stationData.tentinh,
                station: stationData.station,
                tinh: stationData.tinh
            });
        });

        return { allHeads, allTails, stationsData };
    }, [localData]);

    const connectionStatus = getConnectionStatus(station, date);
    const subscribersCount = getSubscribersCount(station, date);

    return {
        data: localData,
        processedData,
        isLoading,
        isComplete,
        error,
        connectionStatus,
        subscribersCount,
        getPrizeNumbers
    };
};