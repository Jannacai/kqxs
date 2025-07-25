import '../styles/global.css';
import '../styles/reset.css';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import { useEffect, useState, useMemo } from 'react';
import { SessionProvider, useSession } from "next-auth/react";
import { LotteryProvider } from '../contexts/LotteryContext';
import logo from './asset/img/LOGOxsmn_win.png';

// Dynamic imports
const NavBar = dynamic(() => import('../component/navbar'), { ssr: false });
const Clock = dynamic(() => import('../component/clock'), { ssr: false });
const CalendarMobile = dynamic(() => import('../component/caledarMobile'), { ssr: false });
const Footer = dynamic(() => import('../component/footer'), { ssr: false });
const PostList = dynamic(() => import('./tin-tuc/list'), { ssr: false });

const App = ({ Component, pageProps: { session, ...pageProps } }) => {
    const [theme, setTheme] = useState('unauthenticated');

    // Memoize className to avoid unnecessary re-renders
    const rootClassName = useMemo(() => theme, [theme]);

    return (
        <SessionProvider session={session}>
            <LotteryProvider>
                <AppWithTheme setTheme={setTheme}>
                    <Head>
                        <link rel="preconnect" href="https://backendkqxs-1.onrender.com" />
                    </Head>
                    <div className={rootClassName}>
                        <div className='header'>
                            <Clock />
                            <div className='header__logo'>
                                <a href='/' tabIndex={-1}>
                                    <Image className='header__logo--img' src={logo} alt='xổ số bắc trung nam' priority />
                                </a>
                            </div>
                            <NavBar />
                            <CalendarMobile />
                        </div>
                        <div className='container'>
                            <Component {...pageProps} />
                        </div>
                        <PostList />
                        <Footer />
                    </div>
                </AppWithTheme>
            </LotteryProvider>
        </SessionProvider>
    );
};

const AppWithTheme = ({ children, setTheme }) => {
    const { status } = useSession();

    useEffect(() => {
        setTheme(status === "authenticated" ? 'authenticated' : 'unauthenticated');
    }, [status, setTheme]);

    return <>{children}</>;
};

export default App;