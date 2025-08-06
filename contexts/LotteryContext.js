import { createContext, useContext, useState, useCallback, useMemo, useRef } from 'react';

const LotteryContext = createContext();

export const LotteryProvider = ({ children }) => {
    const [liveData, setLiveData] = useState([]);
    const [isLiveDataComplete, setIsLiveDataComplete] = useState(false);

    // Context riêng cho XSMB
    const [xsmbLiveData, setXsmbLiveData] = useState([]);
    const [isXsmbLiveDataComplete, setIsXsmbLiveDataComplete] = useState(false);

    const [filterTypes, setFilterTypes] = useState({
        '25-07-2025xsmt': 'all', // Giá trị mặc định cho ngày 25-07-2025, trạm xsmt
    });

    // ✅ NEW: Debounced state updates để tránh blocking
    const updateTimeoutRef = useRef(null);
    const pendingUpdatesRef = useRef(new Map());

    // ✅ IMPROVED: Optimized filter change handler
    const handleFilterChange = useCallback((key, value) => {
        setFilterTypes(prev => ({ ...prev, [key]: value }));
    }, []);

    // ✅ NEW: Debounced setters để tránh cascade re-renders
    const debouncedSetXsmbLiveData = useCallback((newData) => {
        if (updateTimeoutRef.current) {
            clearTimeout(updateTimeoutRef.current);
        }

        pendingUpdatesRef.current.set('xsmbLiveData', newData);

        updateTimeoutRef.current = setTimeout(() => {
            const pendingData = pendingUpdatesRef.current.get('xsmbLiveData');
            if (pendingData) {
                setXsmbLiveData(pendingData);
                pendingUpdatesRef.current.delete('xsmbLiveData');
            }
        }, 16); // 1 frame delay để batch updates
    }, []);

    // ✅ NEW: Fallback setters cho compatibility
    const directSetXsmbLiveData = useCallback((newData) => {
        setXsmbLiveData(newData);
    }, []);

    const debouncedSetIsXsmbLiveDataComplete = useCallback((isComplete) => {
        if (updateTimeoutRef.current) {
            clearTimeout(updateTimeoutRef.current);
        }

        pendingUpdatesRef.current.set('isXsmbLiveDataComplete', isComplete);

        updateTimeoutRef.current = setTimeout(() => {
            const pendingComplete = pendingUpdatesRef.current.get('isXsmbLiveDataComplete');
            if (pendingComplete !== undefined) {
                setIsXsmbLiveDataComplete(pendingComplete);
                pendingUpdatesRef.current.delete('isXsmbLiveDataComplete');
            }
        }, 16);
    }, []);

    // ✅ IMPROVED: Memoized context value để tránh unnecessary re-renders
    const contextValue = useMemo(() => ({
        liveData,
        setLiveData,
        isLiveDataComplete,
        setIsLiveDataComplete,
        // XSMB context với multiple setter options
        xsmbLiveData,
        setXsmbLiveData: directSetXsmbLiveData, // Direct setter cho realtime updates
        debouncedSetXsmbLiveData, // Debounced setter cho batch updates
        isXsmbLiveDataComplete,
        setIsXsmbLiveDataComplete,
        debouncedSetIsXsmbLiveDataComplete,
        filterTypes,
        handleFilterChange,
    }), [
        liveData,
        isLiveDataComplete,
        xsmbLiveData,
        directSetXsmbLiveData,
        debouncedSetXsmbLiveData,
        isXsmbLiveDataComplete,
        debouncedSetIsXsmbLiveDataComplete,
        filterTypes,
        handleFilterChange
    ]);

    return (
        <LotteryContext.Provider value={contextValue}>
            {children}
        </LotteryContext.Provider>
    );
};

export const useLottery = () => {
    const context = useContext(LotteryContext);
    if (!context) {
        throw new Error('useLottery must be used within a LotteryProvider');
    }
    return context;
};