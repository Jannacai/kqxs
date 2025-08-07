import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';

/**
 * YouTube Style Loading Bar Component
 * Hiển thị loading bar trên đầu trang khi chuyển route
 */
const YouTubeStyleLoadingBar = () => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const progressRef = useRef(null);
    const loadingTimeoutRef = useRef(null);
    const progressIntervalRef = useRef(null);

    // Tối ưu: Xử lý route change events
    useEffect(() => {
        const handleStart = () => {
            setIsLoading(true);
            setIsVisible(true);
            setProgress(0);

            // Tối ưu: Bắt đầu progress animation
            startProgressAnimation();
        };

        const handleComplete = () => {
            // Tối ưu: Hoàn thành loading với animation mượt
            setProgress(100);

            setTimeout(() => {
                setIsVisible(false);
                setTimeout(() => {
                    setIsLoading(false);
                    setProgress(0);
                }, 300);
            }, 200);
        };

        const handleError = () => {
            // Tối ưu: Xử lý lỗi navigation
            setProgress(100);
            setTimeout(() => {
                setIsVisible(false);
                setTimeout(() => {
                    setIsLoading(false);
                    setProgress(0);
                }, 300);
            }, 200);
        };

        // Tối ưu: Subscribe to router events
        router.events.on('routeChangeStart', handleStart);
        router.events.on('routeChangeComplete', handleComplete);
        router.events.on('routeChangeError', handleError);

        return () => {
            // Tối ưu: Cleanup event listeners
            router.events.off('routeChangeStart', handleStart);
            router.events.off('routeChangeComplete', handleComplete);
            router.events.off('routeChangeError', handleError);

            // Tối ưu: Clear timeouts
            if (loadingTimeoutRef.current) {
                clearTimeout(loadingTimeoutRef.current);
            }
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
            }
        };
    }, [router]);

    // Tối ưu: Progress animation function
    const startProgressAnimation = () => {
        let currentProgress = 0;

        // Tối ưu: Clear previous interval
        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
        }

        progressIntervalRef.current = setInterval(() => {
            currentProgress += Math.random() * 15;

            // Tối ưu: Slow down progress as it approaches 90%
            if (currentProgress > 90) {
                currentProgress += Math.random() * 2;
            }

            if (currentProgress >= 90) {
                currentProgress = 90;
                clearInterval(progressIntervalRef.current);
            }

            setProgress(currentProgress);
        }, 100);
    };

    // Tối ưu: Auto-hide loading bar if stuck
    useEffect(() => {
        if (isLoading) {
            loadingTimeoutRef.current = setTimeout(() => {
                if (isLoading) {
                    handleComplete();
                }
            }, 10000); // 10 seconds timeout
        }

        return () => {
            if (loadingTimeoutRef.current) {
                clearTimeout(loadingTimeoutRef.current);
            }
        };
    }, [isLoading]);

    // Tối ưu: Handle complete manually
    const handleComplete = () => {
        setProgress(100);
        setTimeout(() => {
            setIsVisible(false);
            setTimeout(() => {
                setIsLoading(false);
                setProgress(0);
            }, 300);
        }, 200);
    };

    if (!isVisible) return null;

    return (
        <div className="youtube-loading-bar">
            <div
                ref={progressRef}
                className="youtube-loading-progress"
                style={{
                    width: `${progress}%`,
                    transition: progress === 100 ? 'width 0.2s ease-out' : 'width 0.1s ease-out'
                }}
            />
            <style jsx>{`
                .youtube-loading-bar {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 3px;
                    background: rgba(255, 255, 255, 0.1);
                    z-index: 9999;
                    overflow: hidden;
                }

                .youtube-loading-progress {
                    height: 100%;
                    background: linear-gradient(90deg, #ff0000, #ff6b6b, #ff0000);
                    background-size: 200% 100%;
                    animation: loading-shimmer 1.5s ease-in-out infinite;
                    box-shadow: 0 0 10px rgba(255, 0, 0, 0.5);
                    border-radius: 0 2px 2px 0;
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
                    .youtube-loading-progress {
                        animation: none;
                        background: #ff0000;
                    }
                }

                /* Tối ưu: High contrast mode */
                @media (prefers-contrast: high) {
                    .youtube-loading-progress {
                        background: #ff0000;
                        box-shadow: 0 0 5px rgba(255, 0, 0, 0.8);
                    }
                }

                /* Tối ưu: Dark mode support */
                @media (prefers-color-scheme: dark) {
                    .youtube-loading-bar {
                        background: rgba(0, 0, 0, 0.2);
                    }
                }
            `}</style>
        </div>
    );
};

export default YouTubeStyleLoadingBar;
