import '../styles/global.css'
import '../styles/reset.css'
import Image from 'next/image';
import NavBar from '../component/navbar';
import logo from './asset/img/logo5.png';
import ThongKe from "../component/thongKe"

const App = ({ Component, pageProps }) => {
    return (
        <div>
            <div className='header'>
                <div className='header__logo'><a href='/'><Image className='header__logo--img' src={logo} alt='xổ số bắc trung nam' /></a></div>
                <NavBar></NavBar>
            </div>
            <div className='container'>
                <Component {...pageProps} />
                <ThongKe></ThongKe>
            </div>
        </div>
    )
}

export default App;