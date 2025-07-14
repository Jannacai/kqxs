import { useState, useEffect } from 'react';
import styles from '../styles/tableDateKQXS.module.css';
import Link from 'next/link';

const TableDate = () => {
    const [currentDate, setCurrentDate] = useState('');
    const [dayOfWeek, setDayOfWeek] = useState('');
    const [hasBroadcasted, setHasBroadcasted] = useState({ north: false, central: false, south: false });
    const [isApproaching, setIsApproaching] = useState({ north: false, central: false, south: false });
    const [currentStations, setCurrentStations] = useState({ north: [], central: [], south: [] });

    // Lịch đài xổ số theo ngày (dựa trên thực tế)
    const stationsSchedule = {
        north: {
            allDays: [{ name: "Truyền Thống", time: "18:15" }],
        },
        central: {
            "Thứ 2": [
                { name: "Huế", time: "17:15" },
                { name: "Phú Yên", time: "17:15" },
            ],
            "Thứ 3": [
                { name: "Đắk Lắk", time: "17:15" },
                { name: "Quảng Nam", time: "17:15" },
            ],
            "Thứ 4": [
                { name: "Đà Nẵng", time: "17:15" },
                { name: "Khánh Hòa", time: "17:15" },
            ],
            "Thứ 5": [
                { name: "Bình Định", time: "17:15" },
                { name: "Quảng Trị", time: "17:15" },
                { name: "Quảng Bình", time: "17:15" },
            ],
            "Thứ 6": [
                { name: "Gia Lai", time: "17:15" },
                { name: "Ninh Thuận", time: "17:15" },
            ],
            "Thứ 7": [
                { name: "Đà Nẵng", time: "17:15" },
                { name: "Quảng Ngãi", time: "17:15" },
                { name: "Đắk Nông", time: "17:15" },
            ],
            "Chủ nhật": [
                { name: "Kon Tum", time: "17:15" },
                { name: "Khánh Hòa", time: "17:15" },
                { name: "Thừa Thiên Huế", time: "17:15" },
            ],
        },
        south: {
            "Thứ 2": [
                { name: "TP.HCM", time: "16:15" },
                { name: "Đồng Tháp", time: "16:15" },
                { name: "Cà Mau", time: "16:15" },
            ],
            "Thứ 3": [
                { name: "Bến Tre", time: "16:15" },
                { name: "Vũng Tàu", time: "16:15" },
                { name: "Bạc Liêu", time: "16:15" },
            ],
            "Thứ 4": [
                { name: "Đồng Nai", time: "16:15" },
                { name: "Cần Thơ", time: "16:15" },
                { name: "Sóc Trăng", time: "16:15" },
            ],
            "Thứ 5": [
                { name: "Tây Ninh", time: "16:15" },
                { name: "An Giang", time: "16:15" },
                { name: "Bình Thuận", time: "16:15" },
            ],
            "Thứ 6": [
                { name: "Vĩnh Long", time: "16:15" },
                { name: "Bình Dương", time: "16:15" },
                { name: "Trà Vinh", time: "16:15" },
            ],
            "Thứ 7": [
                { name: "TP.HCM", time: "16:15" },
                { name: "Long An", time: "16:15" },
                { name: "Bình Phước", time: "16:15" },
                { name: "Hậu Giang", time: "16:15" },
            ],
            "Chủ nhật": [
                { name: "Tiền Giang", time: "16:15" },
                { name: "Kiên Giang", time: "16:15" },
                { name: "Đà Lạt", time: "16:15" },
            ],
        },
    };

    useEffect(() => {
        const updateDateAndStations = () => {
            const now = new Date();

            // Định dạng ngày: 20/04/2025
            const formattedDate = now.toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
            });
            setCurrentDate(formattedDate);

            // Xác định thứ trong tuần
            const daysOfWeek = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
            const dayOfWeek = daysOfWeek[now.getDay()];
            setDayOfWeek(dayOfWeek);

            // Lấy danh sách đài theo ngày
            const northStations = stationsSchedule.north.allDays;
            const centralStations = stationsSchedule.central[dayOfWeek] || [];
            const southStations = stationsSchedule.south[dayOfWeek] || [];
            setCurrentStations({
                north: northStations,
                central: centralStations,
                south: southStations,
            });

            // Kiểm tra trạng thái
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            const currentTime = currentHour * 60 + currentMinute;

            const northStart = 18 * 60 + 15; // 18:15
            const northEnd = 18 * 60 + 45; // 18:45
            const northPrep = northStart - 30; // 17:45 (30 phút trước)

            const centralStart = 17 * 60 + 15; // 17:15
            const centralEnd = 17 * 60 + 45; // 17:45
            const centralPrep = centralStart - 30; // 16:45

            const southStart = 16 * 60 + 15; // 16:15
            const southEnd = 16 * 60 + 45; // 16:45
            const southPrep = southStart - 30; // 15:45

            // Kiểm tra xem đã xổ hay chưa (hiển thị dấu tích nếu đã qua giờ bắt đầu)
            setHasBroadcasted({
                north: currentTime >= northStart,
                central: currentTime >= centralStart,
                south: currentTime >= southStart,
            });

            // Kiểm tra xem có sắp đến giờ xổ hay không (hiển thị thẻ từ 30 phút trước đến khi kết thúc)
            setIsApproaching({
                north: currentTime >= northPrep && currentTime <= northEnd,
                central: currentTime >= centralPrep && currentTime <= centralEnd,
                south: currentTime >= southPrep && currentTime <= southEnd,
            });
        };

        updateDateAndStations();
        const interval = setInterval(updateDateAndStations, 60000); // Cập nhật mỗi phút
        return () => clearInterval(interval);
    }, []);

    // Xác định miền sắp xổ để hiển thị thẻ tường thuật
    const approachingRegion = isApproaching.south ? "Miền Nam" :
        isApproaching.central ? "Miền Trung" :
            isApproaching.north ? "Miền Bắc" : null;
    const approachingTime = isApproaching.south ? "16h15" :
        isApproaching.central ? "17h15" :
            isApproaching.north ? "18h15" : "";

    // Tìm số hàng tối đa để căn chỉnh bảng
    const maxRows = Math.max(
        currentStations.north.length,
        currentStations.central.length,
        currentStations.south.length
    );

    return (
        <div className={styles.container}>
            <div className={styles.containerTB}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Bảng kết quả xổ số XSMB.WIN - KQXS Hôm nay</h1>
                </div>
                {approachingRegion && (
                    <div className={styles.group}>
                        <p className={styles.desc}>
                            Tường thuật trực tiếp KQXS {approachingRegion} lúc {approachingTime}
                        </p>
                        <Link href={`/${approachingRegion === "Miền Nam" ? "ket-qua-xo-so-mien-nam" : approachingRegion === "Miền Trung" ? "ket-qua-xo-so-mien-trung" : "ket-qua-xo-so-mien-bac"}`} className={styles.action}>
                            Xem Ngay
                        </Link>
                    </div>
                )}
                <table className={styles.table}>
                    <tbody>
                        <tr>
                            <td className={styles.titleTable}>Miền Bắc</td>
                            <td className={styles.titleTable}>Miền Trung</td>
                            <td className={styles.titleTable}>Miền Nam</td>
                        </tr>
                        {Array.from({ length: maxRows }).map((_, rowIndex) => (
                            <tr key={rowIndex}>
                                {/* Miền Bắc */}
                                <td>
                                    {currentStations.north[rowIndex] ? (
                                        <div className={styles.stationRow}>
                                            <span className={styles.stationName}>{currentStations.north[rowIndex].name}</span>
                                            <div className={styles.timeCheckRow}>
                                                <span className={styles.time}>{currentStations.north[rowIndex].time}</span>
                                                {hasBroadcasted.north && <span className={styles.check}>✅</span>}
                                            </div>
                                        </div>
                                    ) : null}
                                </td>
                                {/* Miền Trung */}
                                <td>
                                    {currentStations.central[rowIndex] ? (
                                        <div className={styles.stationRow}>
                                            <span className={styles.stationName}>{currentStations.central[rowIndex].name}</span>
                                            <div className={styles.timeCheckRow}>
                                                <span className={styles.time}>{currentStations.central[rowIndex].time}</span>
                                                {hasBroadcasted.central && <span className={styles.check}>✅</span>}
                                            </div>
                                        </div>
                                    ) : null}
                                </td>
                                {/* Miền Nam */}
                                <td>
                                    {currentStations.south[rowIndex] ? (
                                        <div className={styles.stationRow}>
                                            <span className={styles.stationName}>{currentStations.south[rowIndex].name}</span>
                                            <div className={styles.timeCheckRow}>
                                                <span className={styles.time}>{currentStations.south[rowIndex].time}</span>
                                                {hasBroadcasted.south && <span className={styles.check}>✅</span>}
                                            </div>
                                        </div>
                                    ) : null}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TableDate;