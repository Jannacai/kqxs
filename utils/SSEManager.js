let globalSSE = null;
let currentConfig = null;

const createSSE = (station, date, sessionId) => {
    const url = `http://localhost:5000/api/ketquaxs/xsmt/sse?station=${station}&date=${date.replace(/\//g, '-')}&clientId=${sessionId}`;
    return new EventSource(url);
};

const getSharedSSE = (station, date, sessionId) => {
    if (!globalSSE || currentConfig?.station !== station || currentConfig?.date !== date || currentConfig?.sessionId !== sessionId) {
        if (globalSSE) {
            console.log(`Closing existing SSE for session ${currentConfig?.sessionId}`);
            globalSSE.close();
        }
        globalSSE = createSSE(station, date, sessionId);
        currentConfig = { station, date, sessionId };
        console.log(`New SSE created for session ${sessionId}, station ${station}, date ${date}`);
    }
    return globalSSE;
};

const closeSSE = () => {
    if (globalSSE) {
        console.log(`Closing SSE for session ${currentConfig?.sessionId}`);
        globalSSE.close();
        globalSSE = null;
        currentConfig = null;
    }
};

export { getSharedSSE, closeSSE };