import { useState, useEffect } from 'react';
import React from 'react';

const TimeDebug = () => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [showXSMN, setShowXSMN] = useState(false);
    const [showXSMT, setShowXSMT] = useState(false);

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            setCurrentTime(now);
            
            const currentHour = now.getHours();
            setShowXSMN(currentHour === 16);
            setShowXSMT(currentHour === 17);
        };

        updateTime();
        const interval = setInterval(updateTime, 1000); // Cập nhật mỗi giây

        return () => clearInterval(interval);
    }, []);

    if (process.env.NODE_ENV !== 'development') {
        return null;
    }

    return (
        <div style={{
            position: 'fixed',
            top: '10px',
            right: '10px',
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '10px',
            borderRadius: '5px',
            fontSize: '12px',
            zIndex: 9999,
            fontFamily: 'monospace'
        }}>
            <div>🕐 {currentTime.toLocaleTimeString()}</div>
            <div>📅 {currentTime.toLocaleDateString()}</div>
            <div>⏰ Hour: {currentTime.getHours()}</div>
            <div style={{ color: showXSMN ? '#4CAF50' : '#f44336' }}>
                🎲 XSMN (16h): {showXSMN ? 'SHOW' : 'HIDE'}
            </div>
            <div style={{ color: showXSMT ? '#4CAF50' : '#f44336' }}>
                🎯 XSMT (17h): {showXSMT ? 'SHOW' : 'HIDE'}
            </div>
        </div>
    );
};

export default TimeDebug; 