import { useState, useEffect } from 'react';
import React from 'react';

const VietnamTimeDisplay = () => {
    const [vietnamTime, setVietnamTime] = useState(null);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);

        const updateTime = () => {
            const now = new Date();
            const vietnamTimeString = now.toLocaleString('vi-VN', {
                timeZone: 'Asia/Ho_Chi_Minh',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
            setVietnamTime(vietnamTimeString);
        };

        updateTime();
        const interval = setInterval(updateTime, 1000);

        return () => clearInterval(interval);
    }, []);

    if (!isClient) {
        return null;
    }

    return (
        <div style={{
            position: 'fixed',
            bottom: '0px',
            left: '10px',
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            zIndex: 9998,
            fontFamily: 'monospace'
        }}>
            <div>🇻🇳 VN: {vietnamTime || 'Loading...'}</div>
        </div>
    );
};

export default VietnamTimeDisplay; 