import { createContext, useContext, useEffect, useRef } from 'react';

const SSEContext = createContext();

export const SSEProvider = ({ children }) => {
    const eventSourceRef = useRef(null);
    const listeners = useRef({});

    const connectSSE = (station, today, onInitial, onPrize, onError) => {
        if (!station || !today || !/^\d{2}-\d{2}-\d{4}$/.test(today)) {
            console.warn('Invalid station or today value:', { station, today });
            onError('Dữ liệu không hợp lệ, vui lòng kiểm tra lại.');
            return;
        }

        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }
        eventSourceRef.current = new EventSource(`https://backendkqxs.onrender.com/api/kqxs/xsmb/sse?station=${station}&date=${today}`);
        listeners.current = { onInitial, onPrize, onError };

        eventSourceRef.current.addEventListener('initial', (event) => listeners.current.onInitial(event));
        const prizeTypes = [
            'maDB', 'specialPrize_0', 'firstPrize_0', 'secondPrize_0', 'secondPrize_1',
            'threePrizes_0', 'threePrizes_1', 'threePrizes_2', 'threePrizes_3', 'threePrizes_4', 'threePrizes_5',
            'fourPrizes_0', 'fourPrizes_1', 'fourPrizes_2', 'fourPrizes_3',
            'fivePrizes_0', 'fivePrizes_1', 'fivePrizes_2', 'fivePrizes_3', 'fivePrizes_4', 'fivePrizes_5',
            'sixPrizes_0', 'sixPrizes_1', 'sixPrizes_2',
            'sevenPrizes_0', 'sevenPrizes_1', 'sevenPrizes_2', 'sevenPrizes_3',
        ];
        prizeTypes.forEach(prizeType => {
            eventSourceRef.current.addEventListener(prizeType, (event) => listeners.current.onPrize(prizeType, event));
        });
        eventSourceRef.current.onerror = () => listeners.current.onError();
    };

    const disconnectSSE = () => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
    };

    useEffect(() => {
        return () => disconnectSSE(); // Cleanup khi ứng dụng unmount
    }, []);

    return (
        <SSEContext.Provider value={{ connectSSE, disconnectSSE }}>
            {children}
        </SSEContext.Provider>
    );
};

export const useSSE = () => useContext(SSEContext);