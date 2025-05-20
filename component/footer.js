


import styles from '../styles/footer.module.css';
import Image from 'next/image';
import logo from '../pages/asset/img/logo5.png';

const Footer = () => {

    return (
        <div className={styles.footer}>
            <div className={styles.header}>
                <div>
                    <a>  <Image className={styles.img} src={logo} alt='xổ số bắc trung nam' /></a>
                    <p className={styles.desc}>Chào mừng các bạn đến với Xoso3mien.com - trang web hàng đầu về xổ số 3 miền tại Việt Nam. Chúng tôi cung cấp kết quả xổ số trực tiếp, phân tích và thống kê nhanh chóng và chính xác nhất.</p>
                </div>
                <ul className={styles.group}>
                    <li>
                        <h3 className={styles.h3}>Kết Quả Xổ Số</h3>
                        <ul className={styles.list}>
                            <li className={styles.item}><a className={styles.action} title='Kết Quả Xổ Số Miền Bắc' href='/xsmb/'>Xổ số Miền Bắc</a></li>
                            <li className={styles.item}><a className={styles.action} title='Kết Quả Xổ Số Miền Trung' href='/xsmt/'>Xổ số Miền Trung</a></li>
                            <li className={styles.item}><a className={styles.action} title='Kết Quả Xổ Số Miền Nam' href='/xsmn/'>Xổ số Miền Nam</a></li>
                            <li className={styles.item}><a className={styles.action} title='Kết Quả Xổ Số VietLot' href='/xsvietlot/'>Xổ số VietLot</a></li>
                        </ul>
                    </li>
                    <li>
                        <h3 className={styles.h3}>Thống Kê Hot</h3>
                        <ul className={styles.list}>
                            <li className={styles.item}><a className={styles.action} title='Kết Quả Xổ Số Miền Bắc' href='/thongke/logan'>Thống Kê Logan</a></li>
                            <li className={styles.item}><a className={styles.action} title='Kết Quả Xổ Số Miền Trung' href='/thongke/dauduoi'>Thống Kê Đầu Đuôi</a></li>
                            <li className={styles.item}><a className={styles.action} title='Kết Quả Xổ Số Miền Nam' href='/thongke/giaidacbiet'>Thống Kê Đặc Biệt</a></li>
                        </ul>
                    </li>
                    <li>
                        <h3 className={styles.h3}>Thống Kê Cầu</h3>
                        <ul className={styles.list}>
                            <li className={styles.item}><a className={styles.action} title='Kết Quả Xổ Số Miền Bắc' href='/xsmb/'>Cầu Bạch Thủ</a></li>
                            <li className={styles.item}><a className={styles.action} title='Kết Quả Xổ Số Miền Trung' href='/xsmt/'>Cầu Miền Trung</a></li>
                            <li className={styles.item}><a className={styles.action} title='Kết Quả Xổ Số Miền Nam' href='/xsmn/'>Cầu Miền Nam</a></li>
                            <li className={styles.item}><a className={styles.action} title='Kết Quả Xổ Số VietLot' href='/xsvietlot/'>Cầu giải Đặc Biệt</a></li>
                            <li className={styles.item}><a className={styles.action} title='Kết Quả Xổ Số VietLot' href='/xsvietlot/'>Cầu 3 càng</a></li>

                        </ul>
                    </li>
                    <li>
                        <h3 className={styles.h3}>Tiện ích mở rộng</h3>
                        <ul className={styles.list}>
                            <li className={styles.item}><a className={styles.action} title='Kết Quả Xổ Số Miền Bắc' href='/xsmb/'>Xổ Kết Quả</a></li>
                            <li className={styles.item}><a className={styles.action} title='Kết Quả Xổ Số Miền Trung' href='/xsmt/'>Tạo Phôi</a></li>
                            <li className={styles.item}><a className={styles.action} title='Kết Quả Xổ Số Miền Nam' href='/xsmn/'>Tạo Dàn Số</a></li>
                            <li className={styles.item}><a className={styles.action} title='Kết Quả Xổ Số VietLot' href='/xsvietlot/'>Loại Dàn Đặc Biệt</a></li>
                        </ul>
                    </li>


                </ul>
            </div>
            <div className={styles.endFooter}>
                <div className={styles.contact1}>
                    <h3>Công Ty TNHH Xổ Số 3 Miền</h3>
                    <a className={styles.email}>Email: xoso3mien@gmail.com</a>
                </div>
                <div className={styles.contact}>
                    <div className={styles.groupIcon}>
                        <span className={styles.icon}><i class="fa-brands fa-facebook"></i></span>
                        <span className={styles.icon}><i class="fa-brands fa-telegram"></i></span>
                        <span className={styles.icon}><i class="fa-brands fa-youtube"></i></span>
                        <span className={styles.icon}><i class="fa-brands fa-linkedin"></i></span>
                    </div>
                    <strong>Copyright © 2023 Xoso3Mien.Com</strong>
                </div>
            </div>
        </div >
    )
}
export default Footer;