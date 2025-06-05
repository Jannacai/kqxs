
import styles from '../styles/footer.module.css';
import Image from 'next/image';
import logo from '../pages/asset/img/LOGOxsmn_win.png';

const Footer = () => {

    return (
        <div className={styles.footer}>
            <div className={styles.header}>
                <div>
                    <a>  <Image className={styles.img} src={logo} alt='XSMB.WIN' /></a>
                    <p className={styles.desc}>Chào mừng các bạn đến với XSMB.WIN - trang web hàng đầu về xổ số XSMB.WIN tại Việt Nam. Chúng tôi cung cấp kết quả xổ số trực tiếp, phân tích và thống kê nhanh chóng và chính xác nhất.</p>
                </div>
                <ul className={styles.group}>
                    <li>
                        <h3 className={styles.h3}>Kết Quả Xổ Số</h3>
                        <ul className={styles.list}>
                            <li className={styles.item}><a className={styles.action} title='Kết Quả Xổ Số Miền Bắc' href='/ket-qua-xo-so-mien-bac'>Xổ số Miền Bắc</a></li>
                            <li className={styles.item}><a className={styles.action} title='Kết Quả Xổ Số Miền Trung' href='/ket-qua-xo-so-mien-trung'>Xổ số Miền Trung</a></li>
                            <li className={styles.item}><a className={styles.action} title='Kết Quả Xổ Số Miền Nam' href='/ket-qua-xo-so-mien-nam'>Xổ số Miền Nam</a></li>
                            <li className={styles.item}><a className={styles.action} title='Kết Quả Xổ Số VietLot' href='#'>Xổ số VietLot</a></li>
                        </ul>
                    </li>
                    <li>
                        <h3 className={styles.h3}>Thống Kê Hot</h3>
                        <ul className={styles.list}>
                            <li className={styles.item}><a className={styles.action} title='Thống Kê Logan' href='/thongke/lo-gan'>Thống Kê Logan</a></li>
                            <li className={styles.item}><a className={styles.action} title='Thống Kê Đầu Đuôi' href='/thongke/dau-duoi'>Thống Kê Đầu Đuôi</a></li>
                            <li className={styles.item}><a className={styles.action} title='Thống Kê Đặc Biệt' href='/thongke/giai-dac-biet'>Thống Kê Đặc Biệt</a></li>
                        </ul>
                    </li>
                    <li>
                        <h3 className={styles.h3}>Thống Kê Cầu</h3>
                        <ul className={styles.list}>
                            <li className={styles.item}><a className={styles.action} title='Cầu Bạch Thủ' href='#'>Cầu Bạch Thủ</a></li>
                            <li className={styles.item}><a className={styles.action} title='Cầu Miền Trung' href='#'>Cầu Miền Trung</a></li>
                            <li className={styles.item}><a className={styles.action} title='Cầu Miền Nam' href='/xsmn/'>Cầu Miền Nam</a></li>
                            <li className={styles.item}><a className={styles.action} title='Cầu giải Đặc Biệt' href='#'>Cầu giải Đặc Biệt</a></li>
                            <li className={styles.item}><a className={styles.action} title='Cầu 3 càng' href='#'>Cầu 3 càng</a></li>

                        </ul>
                    </li>
                    <li>
                        <h3 className={styles.h3}>Tiện ích mở rộng</h3>
                        <ul className={styles.list}>
                            <li className={styles.item}><a className={styles.action} title='Xổ Kết Quả' href='#'>Xổ Kết Quả</a></li>
                            <li className={styles.item}><a className={styles.action} title='Tạo Phôi' href='#'>Tạo Phôi</a></li>
                            <li className={styles.item}><a className={styles.action} title='Tạo Dàn Số' href='/tao-dan-dac-biet/'>Tạo Dàn Số</a></li>
                            <li className={styles.item}><a className={styles.action} title='Loại Dàn Đặc Biệt' href='#'>Loại Dàn Đặc Biệt</a></li>
                        </ul>
                    </li>


                </ul>
            </div>
            <div className={styles.endFooter}>
                <div className={styles.contact1}>
                    <h3>Công Ty TNHH Xổ Số XSMB.WIN</h3>
                    <a className={styles.email}>Email: xsmb.win.contact@gmail.com</a>
                </div>
                <div className={styles.contact}>
                    <div className={styles.groupIcon}>
                        <span className={styles.icon}><i class="fa-brands fa-facebook"></i></span>
                        <span className={styles.icon}><i class="fa-brands fa-telegram"></i></span>
                        <span className={styles.icon}><i class="fa-brands fa-youtube"></i></span>
                        <span className={styles.icon}><i class="fa-brands fa-linkedin"></i></span>
                    </div>
                    <strong>Copyright © 2023 XSMB.WIN.Com</strong>
                </div>
            </div>
        </div >
    )
}
export default Footer;