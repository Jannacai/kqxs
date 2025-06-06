import { createContext, useContext, useState } from 'react';

const LotteryContext = createContext();

export const LotteryProvider = ({ children }) => {
    const [liveData, setLiveData] = useState(null);
    const [isLiveDataComplete, setIsLiveDataComplete] = useState(false);

    return (
        <LotteryContext.Provider value={{ liveData, setLiveData, isLiveDataComplete, setIsLiveDataComplete }}>
            {children}
        </LotteryContext.Provider>
    );
};

export const useLottery = () => useContext(LotteryContext);