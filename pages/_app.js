import '../styles/global.css';
import '../styles/reset.css';
import Image from 'next/image';
import { useEffect, useState, memo, useMemo, useCallback } from 'react';
import { SessionProvider, useSession } from "next-auth/react";
import { LotteryProvider } from '../contexts/LotteryContext';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';

// Lazy load components để tối ưu hiệu suất
const LazyNavBar = dynamic(() => import('../component/navbar'), {
    loading: () => <div style={{ height: '60px', background: '#f5f5f5' }}>Đang tải...</div>,
    ssr: true
});

const LazyClock = dynamic(() => import('../component/clock'), {
    loading: () => <div style={{ height: '30px', background: '#f5f5f5' }}>Đang tải...</div>,
    ssr: false
});

const LazyCalendarMobile = dynamic(() => import('../component/caledarMobile'), {
    loading: () => <div style={{ height: '40px', background: '#f5f5f5' }}>Đang tải...</div>,
    ssr: false
});

const LazyFooter = dynamic(() => import('../component/footer'), {
    loading: () => <div style={{ height: '100px', background: '#f5f5f5' }}>Đang tải...</div>,
    ssr: true
});

const LazyPostList = dynamic(() => import('./tin-tuc/list'), {
    loading: () => <div style={{ height: '200px', background: '#f5f5f5' }}>Đang tải...</div>,
    ssr: false
});

// Tối ưu Logo component với memo
const Logo = memo(() => {
    const logo = useMemo(() => require('./asset/img/LOGOxsmn_win.png'), []);

    return (
        <div className='header__logo'>
            <a href='/' tabIndex={-1}>
                <Image
                    className='header__logo--img'
                    src={logo}
                    alt='xổ số bắc trung nam'
                    priority
                    width={200}
                    height={60}
                    placeholder="blur"
                    blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                />
            </a>
        </div>
    );
});

Logo.displayName = 'Logo';

// Tối ưu Header component với memo
const Header = memo(({ theme }) => {
    return (
        <div className='header'>
            <LazyClock />
            <Logo />
            <LazyNavBar />
            <LazyCalendarMobile />
        </div>
    );
});

Header.displayName = 'Header';

// Tối ưu AppWithTheme component với memo
const AppWithTheme = memo(({ children, setTheme }) => {
    const { status } = useSession();

    const handleThemeChange = useCallback(() => {
        if (status === "authenticated") {
            setTheme('authenticated');
        } else {
            setTheme('unauthenticated');
        }
    }, [status, setTheme]);

    useEffect(() => {
        handleThemeChange();
    }, [handleThemeChange]);

    return <>{children}</>;
});

AppWithTheme.displayName = 'AppWithTheme';

// Tối ưu App component với memo
const App = memo(({ Component, pageProps: { session, ...pageProps } }) => {
    const [theme, setTheme] = useState('unauthenticated');

    // Tối ưu pageProps với useMemo
    const optimizedPageProps = useMemo(() => pageProps, [pageProps]);

    return (
        <SessionProvider session={session}>
            <LotteryProvider>
                <NavigationGuard />
                <AppWithTheme setTheme={setTheme}>
                    <div className={theme}>
                        <Header theme={theme} />
                        <div className='container'>
                            <Component {...optimizedPageProps} />
                        </div>
                        <LazyPostList />
                        <LazyFooter />
                    </div>
                </AppWithTheme>
            </LotteryProvider>
        </SessionProvider>
    );
});

App.displayName = 'App';

// ✅ THÊM: Navigation Guard để prevent rapid navigation
const NavigationGuard = () => {
    const router = useRouter();

    useEffect(() => {
        let navigationCount = 0;
        let lastNavigationTime = 0;
        const maxNavigationsPerMinute = 30;
        const navigationWindow = 60000; // 1 phút

        const originalPush = router.push;
        const originalReplace = router.replace;

        router.push = function (...args) {
            const now = Date.now();

            if (now - lastNavigationTime > navigationWindow) {
                navigationCount = 0;
            }

            if (navigationCount >= maxNavigationsPerMinute) {
                console.warn('Navigation limit reached, preventing rapid navigation');
                return Promise.resolve();
            }

            navigationCount++;
            lastNavigationTime = now;
            return originalPush.apply(this, args);
        };

        router.replace = function (...args) {
            const now = Date.now();

            if (now - lastNavigationTime > navigationWindow) {
                navigationCount = 0;
            }

            if (navigationCount >= maxNavigationsPerMinute) {
                console.warn('Navigation limit reached, preventing rapid navigation');
                return Promise.resolve();
            }

            navigationCount++;
            lastNavigationTime = now;
            return originalReplace.apply(this, args);
        };

        return () => {
            router.push = originalPush;
            router.replace = originalReplace;
        };
    }, [router]);

    return null;
};

export default App;