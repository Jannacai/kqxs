import { createContext, useContext, useState } from 'react';

const LotteryContext = createContext();

export const LotteryProvider = ({ children }) => {
    const [liveData, setLiveData] = useState([]);
    const [isLiveDataComplete, setIsLiveDataComplete] = useState(false);
    const [filterTypes, setFilterTypes] = useState({
        '25-07-2025xsmt': 'all', // Giá trị mặc định cho ngày 25-07-2025, trạm xsmt
    });

    const handleFilterChange = (key, value) => {
        setFilterTypes(prev => ({ ...prev, [key]: value }));
    };

    return (
        <LotteryContext.Provider
            value={{
                liveData,
                setLiveData,
                isLiveDataComplete,
                setIsLiveDataComplete,
                filterTypes,
                handleFilterChange,
            }}
        >
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