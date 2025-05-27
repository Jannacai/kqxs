import '../styles/global.css'
import '../styles/reset.css'
import Image from 'next/image';
import NavBar from '../component/navbar';
import logo from './asset/img/LOGOxsmn_win.png';
import { useEffect, useState } from 'react';
import Clock from '../component/clock';
import { SessionProvider, useSession } from "next-auth/react";
import Footer from '../component/footer';
import CalendarMobile from '../component/caledarMobile';

const App = ({ Component, pageProps: { session, ...pageProps } }) => {
    const [theme, setTheme] = useState('unauthenticated');
    return (
        <SessionProvider session={session}>
            <AppWithTheme setTheme={setTheme}>
                <div className={theme}>
                    <div className='header'>
                        <Clock />
                        <div className='header__logo'><a href='/' tabIndex={-1}>
                            <Image className='header__logo--img' src={logo} alt='xổ số bắc trung nam' /></a>
                        </div>
                        <NavBar></NavBar>
                        <CalendarMobile />
                    </div>
                    <div className='container'>
                        <Component {...pageProps} />
                    </div>
                    <Footer></Footer>
                </div>
            </AppWithTheme>
        </SessionProvider>
    )
};
const AppWithTheme = ({ children, setTheme }) => {
    const { status } = useSession();

    useEffect(() => {
        if (status === "authenticated") {
            setTheme('authenticated');
        } else {
            setTheme('unauthenticated');
        }
    }, [status, setTheme]);

    return <>{children}</>;
};

export default App;