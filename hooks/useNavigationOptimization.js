import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';

/**
 * Hook tối ưu navigation performance
 * Cung cấp prefetch, loading states, và navigation tracking
 */
export const useNavigationOptimization = () => {
    const router = useRouter();
    const { status } = useSession();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isMenuOpenList, setIsMenuOpenList] = useState('');
    const [isNavigating, setIsNavigating] = useState(false);
    const scrollPositionRef = useRef(0);
    const prefetchTimeoutRef = useRef(null);
    const navigationHistoryRef = useRef([]);
    const lastNavigationTimeRef = useRef(0);

    // Tối ưu: Cache authentication status
    const isAuthenticated = useMemo(() => status === 'authenticated', [status]);
    const currentPath = useMemo(() => router.pathname, [router.pathname]);

    // Tối ưu: Debounced prefetch function
    const debouncedPrefetch = useCallback((href) => {
        if (prefetchTimeoutRef.current) {
            clearTimeout(prefetchTimeoutRef.current);
        }
        prefetchTimeoutRef.current = setTimeout(() => {
            router.prefetch(href);
        }, 100);
    }, [router]);

    // Tối ưu: Smart prefetch based on user behavior
    const smartPrefetch = useCallback((href) => {
        const now = Date.now();
        const timeSinceLastNav = now - lastNavigationTimeRef.current;

        // Chỉ prefetch nếu user đã hover trong 200ms
        if (timeSinceLastNav > 200) {
            debouncedPrefetch(href);
        }
    }, [debouncedPrefetch]);

    // Tối ưu: Navigation với loading state và tracking
    const navigateWithLoading = useCallback(async (href) => {
        if (isNavigating) return; // Prevent multiple navigation

        const now = Date.now();
        lastNavigationTimeRef.current = now;

        setIsNavigating(true);

        try {
            // Track navigation history
            navigationHistoryRef.current.push({
                from: currentPath,
                to: href,
                timestamp: now
            });

            // Keep only last 10 navigations
            if (navigationHistoryRef.current.length > 10) {
                navigationHistoryRef.current.shift();
            }

            await router.push(href);
        } catch (error) {
            console.error('Navigation error:', error);
        } finally {
            setIsNavigating(false);
        }
    }, [router, isNavigating, currentPath]);

    // Tối ưu: Prefetch critical pages
    useEffect(() => {
        const criticalPages = [
            '/ket-qua-xo-so-mien-bac',
            '/ket-qua-xo-so-mien-nam',
            '/ket-qua-xo-so-mien-trung',
            '/thongke/lo-gan',
            '/tao-dan-de-dac-biet/',
            '/tin-tuc',
            '/soicau/soi-cau-mien-bac'
        ];

        // Prefetch với delay để không block initial render
        const prefetchCriticalPages = () => {
            criticalPages.forEach(page => {
                router.prefetch(page);
            });
        };

        const timeoutId = setTimeout(prefetchCriticalPages, 1000);

        return () => {
            clearTimeout(timeoutId);
            if (prefetchTimeoutRef.current) {
                clearTimeout(prefetchTimeoutRef.current);
            }
        };
    }, [router]);

    // Tối ưu: Menu state management
    const toggleMenu = useCallback(() => {
        setIsMenuOpen((prev) => {
            if (prev) {
                setIsMenuOpenList('');
            }
            return !prev;
        });
    }, []);

    const toggleMenuList = useCallback((menuId) => {
        setIsMenuOpenList((prev) => (prev === menuId ? '' : menuId));
    }, []);

    // Tối ưu: Scroll position management
    useEffect(() => {
        if (isMenuOpen) {
            scrollPositionRef.current = window.scrollY;
            document.body.classList.add('navbar-open');
        } else {
            document.body.classList.remove('navbar-open');
            window.scrollTo(0, scrollPositionRef.current);
        }

        const handlePopstate = () => {
            if (isMenuOpen) {
                setTimeout(() => {
                    setIsMenuOpen(false);
                    setIsMenuOpenList('');
                }, 400);
            }
        };

        window.addEventListener('popstate', handlePopstate);
        return () => {
            window.removeEventListener('popstate', handlePopstate);
            document.body.classList.remove('navbar-open');
        };
    }, [isMenuOpen]);

    // Tối ưu: Performance monitoring
    const getNavigationStats = useCallback(() => {
        const history = navigationHistoryRef.current;
        const totalNavigations = history.length;
        const avgNavigationTime = history.length > 0
            ? history.reduce((sum, nav) => sum + (nav.timestamp - (history[history.indexOf(nav) - 1]?.timestamp || nav.timestamp)), 0) / totalNavigations
            : 0;

        return {
            totalNavigations,
            avgNavigationTime,
            lastNavigation: history[history.length - 1] || null
        };
    }, []);

    // Tối ưu: Predictive prefetch based on navigation patterns
    const predictAndPrefetch = useCallback(() => {
        const history = navigationHistoryRef.current;
        if (history.length < 2) return;

        const recentNavs = history.slice(-3);
        const commonPatterns = recentNavs.map(nav => nav.to);

        // Prefetch pages that user frequently visits together
        const relatedPages = {
            '/ket-qua-xo-so-mien-bac': ['/xsmb/xo-so-mien-bac/thu-2', '/xsmb/xo-so-mien-bac/thu-3'],
            '/thongke/lo-gan': ['/thongke/giai-dac-biet', '/thongke/dau-duoi'],
            '/soicau/soi-cau-mien-bac': ['/soicau/soi-cau-mien-trung']
        };

        const currentPage = currentPath;
        const relatedToCurrent = relatedPages[currentPage];

        if (relatedToCurrent) {
            relatedToCurrent.forEach(page => {
                debouncedPrefetch(page);
            });
        }
    }, [currentPath, debouncedPrefetch]);

    // Tối ưu: Auto-predictive prefetch
    useEffect(() => {
        const timeoutId = setTimeout(predictAndPrefetch, 2000);
        return () => clearTimeout(timeoutId);
    }, [predictAndPrefetch]);

    return {
        // State
        isMenuOpen,
        isMenuOpenList,
        isNavigating,
        isAuthenticated,
        currentPath,

        // Actions
        toggleMenu,
        toggleMenuList,
        navigateWithLoading,
        debouncedPrefetch,
        smartPrefetch,

        // Utilities
        getNavigationStats,
        predictAndPrefetch,

        // Router
        router
    };
};

/**
 * Hook tối ưu cho việc theo dõi scroll position
 */
export const useScrollOptimization = () => {
    const [scrollY, setScrollY] = useState(0);
    const [isScrolling, setIsScrolling] = useState(false);
    const scrollTimeoutRef = useRef(null);

    useEffect(() => {
        const handleScroll = () => {
            setScrollY(window.scrollY);
            setIsScrolling(true);

            // Tối ưu: Clear timeout cũ
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }

            // Tối ưu: Set timeout mới để debounce scroll events
            scrollTimeoutRef.current = setTimeout(() => {
                setIsScrolling(false);
            }, 150);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            window.removeEventListener('scroll', handleScroll);
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, []);

    return { scrollY, isScrolling };
};

/**
 * Hook tối ưu cho việc theo dõi viewport size
 */
export const useViewportOptimization = () => {
    const [viewport, setViewport] = useState({
        width: typeof window !== 'undefined' ? window.innerWidth : 0,
        height: typeof window !== 'undefined' ? window.innerHeight : 0
    });

    useEffect(() => {
        const handleResize = () => {
            setViewport({
                width: window.innerWidth,
                height: window.innerHeight
            });
        };

        window.addEventListener('resize', handleResize, { passive: true });

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    // Tối ưu: Tính toán breakpoint với useMemo
    const breakpoint = useMemo(() => {
        if (viewport.width < 768) return 'mobile';
        if (viewport.width < 1024) return 'tablet';
        return 'desktop';
    }, [viewport.width]);

    return { viewport, breakpoint };
};

/**
 * Hook tối ưu cho việc quản lý performance
 */
export const usePerformanceOptimization = () => {
    const [isLowPerformance, setIsLowPerformance] = useState(false);

    useEffect(() => {
        // Tối ưu: Kiểm tra performance của device
        const checkPerformance = () => {
            // Tối ưu: Kiểm tra connection speed
            if ('connection' in navigator) {
                const connection = navigator.connection;
                if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
                    setIsLowPerformance(true);
                    return;
                }
            }

            // Tối ưu: Kiểm tra device memory
            if ('deviceMemory' in navigator) {
                if (navigator.deviceMemory < 4) {
                    setIsLowPerformance(true);
                    return;
                }
            }

            // Tối ưu: Kiểm tra hardware concurrency
            if ('hardwareConcurrency' in navigator) {
                if (navigator.hardwareConcurrency < 4) {
                    setIsLowPerformance(true);
                    return;
                }
            }

            setIsLowPerformance(false);
        };

        checkPerformance();
    }, []);

    return { isLowPerformance };
};
