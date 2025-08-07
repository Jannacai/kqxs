import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';

/**
 * Advanced Loading Bar Component với nhiều tùy chọn
 * Hỗ trợ nhiều themes và hiệu ứng khác nhau
 */
const AdvancedLoadingBar = ({
    theme = 'youtube', // youtube, facebook, twitter, custom
    height = 3,
    color = '#ff0000',
    duration = 1000,
    showPercentage = false,
    autoHide = true,
    timeout = 10000
}) => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const [message, setMessage] = useState('');
    const progressRef = useRef(null);
    const loadingTimeoutRef = useRef(null);
    const progressIntervalRef = useRef(null);
    const messageTimeoutRef = useRef(null);

    // Tối ưu: Theme configurations
    const themes = {
        youtube: {
            background: 'linear-gradient(90deg, #ff0000, #ff6b6b, #ff0000)',
            shadow: '0 0 10px rgba(255, 0, 0, 0.5)',
            animation: 'loading-shimmer 1.5s ease-in-out infinite'
        },
        facebook: {
            background: 'linear-gradient(90deg, #1877f2, #42a5f5, #1877f2)',
            shadow: '0 0 10px rgba(24, 119, 242, 0.5)',
            animation: 'loading-shimmer 1.5s ease-in-out infinite'
        },
        twitter: {
            background: 'linear-gradient(90deg, #1da1f2, #64b5f6, #1da1f2)',
            shadow: '0 0 10px rgba(29, 161, 242, 0.5)',
            animation: 'loading-shimmer 1.5s ease-in-out infinite'
        },
        custom: {
            background: `linear-gradient(90deg, ${color}, ${color}dd, ${color})`,
            shadow: `0 0 10px ${color}80`,
            animation: 'loading-shimmer 1.5s ease-in-out infinite'
        }
    };

    const currentTheme = themes[theme] || themes.youtube;

    // Tối ưu: Route change handlers
    const handleStart = useCallback(() => {
        setIsLoading(true);
        setIsVisible(true);
        setProgress(0);
        setMessage('Đang tải...');
        startProgressAnimation();
    }, []);

    const handleComplete = useCallback(() => {
        setProgress(100);
        setMessage('Hoàn thành!');

        setTimeout(() => {
            setIsVisible(false);
            setTimeout(() => {
                setIsLoading(false);
                setProgress(0);
                setMessage('');
            }, 300);
        }, 200);
    }, []);

    const handleError = useCallback(() => {
        setProgress(100);
        setMessage('Có lỗi xảy ra');

        setTimeout(() => {
            setIsVisible(false);
            setTimeout(() => {
                setIsLoading(false);
                setProgress(0);
                setMessage('');
            }, 300);
        }, 200);
    }, []);

    // Tối ưu: Progress animation
    const startProgressAnimation = useCallback(() => {
        let currentProgress = 0;

        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
        }

        progressIntervalRef.current = setInterval(() => {
            currentProgress += Math.random() * 15;

            if (currentProgress > 90) {
                currentProgress += Math.random() * 2;
            }

            if (currentProgress >= 90) {
                currentProgress = 90;
                clearInterval(progressIntervalRef.current);
            }

            setProgress(currentProgress);
        }, 100);
    }, []);

    // Tối ưu: Route change event listeners
    useEffect(() => {
        router.events.on('routeChangeStart', handleStart);
        router.events.on('routeChangeComplete', handleComplete);
        router.events.on('routeChangeError', handleError);

        return () => {
            router.events.off('routeChangeStart', handleStart);
            router.events.off('routeChangeComplete', handleComplete);
            router.events.off('routeChangeError', handleError);

            if (loadingTimeoutRef.current) {
                clearTimeout(loadingTimeoutRef.current);
            }
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
            }
            if (messageTimeoutRef.current) {
                clearTimeout(messageTimeoutRef.current);
            }
        };
    }, [router, handleStart, handleComplete, handleError]);

    // Tối ưu: Auto-hide timeout
    useEffect(() => {
        if (isLoading && autoHide) {
            loadingTimeoutRef.current = setTimeout(() => {
                if (isLoading) {
                    handleComplete();
                }
            }, timeout);
        }

        return () => {
            if (loadingTimeoutRef.current) {
                clearTimeout(loadingTimeoutRef.current);
            }
        };
    }, [isLoading, autoHide, timeout, handleComplete]);

    // Tối ưu: Dynamic messages
    useEffect(() => {
        if (isLoading && progress > 0) {
            const messages = [
                'Đang tải dữ liệu...',
                'Xử lý thông tin...',
                'Chuẩn bị nội dung...',
                'Hoàn tất...'
            ];

            const messageIndex = Math.floor((progress / 100) * messages.length);
            const currentMessage = messages[Math.min(messageIndex, messages.length - 1)];

            messageTimeoutRef.current = setTimeout(() => {
                setMessage(currentMessage);
            }, 500);
        }

        return () => {
            if (messageTimeoutRef.current) {
                clearTimeout(messageTimeoutRef.current);
            }
        };
    }, [isLoading, progress]);

    if (!isVisible) return null;

    return (
        <div className="advanced-loading-bar">
            <div
                ref={progressRef}
                className="advanced-loading-progress"
                style={{
                    width: `${progress}%`,
                    height: `${height}px`,
                    transition: progress === 100 ? 'width 0.2s ease-out' : 'width 0.1s ease-out'
                }}
            />
            {showPercentage && (
                <div className="loading-percentage">
                    {Math.round(progress)}%
                </div>
            )}
            {message && (
                <div className="loading-message">
                    {message}
                </div>
            )}
            <style jsx>{`
                .advanced-loading-bar {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: ${height}px;
                    background: rgba(255, 255, 255, 0.1);
                    z-index: 9999;
                    overflow: hidden;
                }

                .advanced-loading-progress {
                    height: 100%;
                    background: ${currentTheme.background};
                    background-size: 200% 100%;
                    animation: ${currentTheme.animation};
                    box-shadow: ${currentTheme.shadow};
                    border-radius: 0 2px 2px 0;
                }

                .loading-percentage {
                    position: absolute;
                    top: ${height + 5}px;
                    right: 10px;
                    background: rgba(0, 0, 0, 0.8);
                    color: white;
                    padding: 2px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    font-weight: bold;
                }

                .loading-message {
                    position: absolute;
                    top: ${height + 5}px;
                    left: 10px;
                    background: rgba(0, 0, 0, 0.8);
                    color: white;
                    padding: 4px 12px;
                    border-radius: 4px;
                    font-size: 12px;
                    max-width: 200px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                @keyframes loading-shimmer {
                    0% {
                        background-position: -200% 0;
                    }
                    100% {
                        background-position: 200% 0;
                    }
                }

                /* Tối ưu: Reduced motion cho accessibility */
                @media (prefers-reduced-motion: reduce) {
                    .advanced-loading-progress {
                        animation: none;
                        background: ${theme === 'custom' ? color : '#ff0000'};
                    }
                }

                /* Tối ưu: High contrast mode */
                @media (prefers-contrast: high) {
                    .advanced-loading-progress {
                        background: ${theme === 'custom' ? color : '#ff0000'};
                        box-shadow: 0 0 5px ${theme === 'custom' ? color : '#ff0000'}cc;
                    }
                }

                /* Tối ưu: Dark mode support */
                @media (prefers-color-scheme: dark) {
                    .advanced-loading-bar {
                        background: rgba(0, 0, 0, 0.2);
                    }
                }

                /* Tối ưu: Mobile optimization */
                @media (max-width: 768px) {
                    .loading-percentage,
                    .loading-message {
                        font-size: 10px;
                        padding: 2px 6px;
                    }
                }
            `}</style>
        </div>
    );
};

export default AdvancedLoadingBar;
