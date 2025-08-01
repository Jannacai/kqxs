import { useState } from 'react';
import React from 'react';
import LiveResultButton from './LiveResultButton';

const TimeTest = () => {
    const [testHour, setTestHour] = useState(new Date().getHours());
    const [useTestTime, setUseTestTime] = useState(false);

    const testTimes = [
        { hour: 15, label: '15h - Trước XSMN' },
        { hour: 16, label: '16h - XSMN Live' },
        { hour: 17, label: '17h - XSMT Live' },
        { hour: 18, label: '18h - Sau XSMT' }
    ];

    return (
        <div style={{
            position: 'fixed',
            top: '10px',
            left: '10px',
            background: 'rgba(0,0,0,0.9)',
            color: 'white',
            padding: '15px',
            borderRadius: '8px',
            fontSize: '14px',
            zIndex: 9999,
            fontFamily: 'monospace',
            maxWidth: '300px'
        }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#4CAF50' }}>🧪 Time Test</h3>
            
            <div style={{ marginBottom: '10px' }}>
                <label>
                    <input 
                        type="checkbox" 
                        checked={useTestTime}
                        onChange={(e) => setUseTestTime(e.target.checked)}
                    />
                    Use Test Time
                </label>
            </div>

            {useTestTime && (
                <div style={{ marginBottom: '15px' }}>
                    <div style={{ marginBottom: '8px' }}>Test Hour: {testHour}h</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                        {testTimes.map(({ hour, label }) => (
                            <button
                                key={hour}
                                onClick={() => setTestHour(hour)}
                                style={{
                                    padding: '5px 8px',
                                    fontSize: '11px',
                                    background: testHour === hour ? '#4CAF50' : '#666',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '3px',
                                    cursor: 'pointer'
                                }}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div style={{ marginBottom: '10px' }}>
                <div>🎲 XSMN (16h): {testHour === 16 ? '✅ SHOW' : '❌ HIDE'}</div>
                <div>🎯 XSMT (17h): {testHour === 17 ? '✅ SHOW' : '❌ HIDE'}</div>
            </div>

            <div style={{ 
                border: '1px solid #444', 
                padding: '10px', 
                borderRadius: '5px',
                background: 'rgba(255,255,255,0.1)'
            }}>
                <div style={{ fontSize: '12px', marginBottom: '5px' }}>Test Buttons:</div>
                
                {/* Test XSMN Button */}
                <div style={{ marginBottom: '5px' }}>
                    <LiveResultButton
                        station="xsmn"
                        isLiveWindow={true}
                        buttonText="Test XSMN"
                        buttonStyle="secondary"
                        size="small"
                        isForum={false}
                        position="static"
                        testHour={useTestTime ? testHour : null}
                    />
                </div>

                {/* Test XSMT Button */}
                <div>
                    <LiveResultButton
                        station="xsmt"
                        isLiveWindow={true}
                        buttonText="Test XSMT"
                        buttonStyle="primary"
                        size="small"
                        isForum={false}
                        position="static"
                        testHour={useTestTime ? testHour : null}
                    />
                </div>
            </div>
        </div>
    );
};

export default TimeTest; 