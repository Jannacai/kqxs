import { useState, useEffect, useMemo, useCallback } from "react";
import styles from '../../public/css/kqxsMB.module.css';
import { getFilteredNumber } from "../../library/utils/filterUtils";
import { useRouter } from 'next/router';
import { apiMB } from "../api/kqxs/kqxsMB";
import React from 'react';
import LiveResult from './LiveResult';
import { useInView } from 'react-intersection-observer';
import { useLottery } from '../../contexts/LotteryContext';

// 🚀 XSMB AUTOMATION: Scheduler đã được tự động hóa hoàn toàn
// - Backend scheduler chạy tự động lúc 18h14 mỗi ngày
// - Không cần kích hoạt thủ công từ frontend
// - Live window chỉ để hiển thị UI, không trigger scraper

const CACHE_DURATION = 24 * 60 * 60 * 1000; // Cache 24 giờ
const LIVE_CACHE_DURATION = 40 * 60 * 1000; // Cache 40 phút cho live data
const UPDATE_KEY = 'xsmb_update_timestamp';

// BỔ SUNG: Helper function để lấy thời gian Việt Nam - TỐI ƯU
let cachedVietnamTime = null;
let lastCacheTime = 0;
const CACHE_TIME_DURATION = 1000; // Cache 1 giây

const getVietnamTime = () => {
    const now = Date.now();
    if (!cachedVietnamTime || (now - lastCacheTime) > CACHE_TIME_DURATION) {
        cachedVietnamTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
        lastCacheTime = now;
    }
    return cachedVietnamTime;
};

const getVietnamTimeString = () => {
    return new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });
};

// Print Button Component
const PrintButton = ({ data2, heads, tails, currentFilter, getFilteredNumber }) => {
    const [showPrintOptions, setShowPrintOptions] = useState(false);
    const [selectedSize, setSelectedSize] = useState('A4');

    const printSizes = [
        { value: 'A4', label: 'A4 (210×297mm)' },
        { value: 'A5', label: 'A5 (148×210mm)' },
        { value: 'A6', label: 'A6 (105×148mm)' },
        { value: 'A7', label: 'A7 (74×105mm)' }
    ];

    // ✅ Tối ưu: Memoize CSS để tránh tạo lại
    const getPrintCSS = useMemo(() => (size) => `
        @media print {
            @page {
                size: ${size};
                margin: ${size === 'A4' ? '3mm' : size === 'A5' ? '5mm' : size === 'A6' ? '8mm' : '10mm'};
            }
            body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 0;
                width: 100%;
                height: 100%;
            }
            .print-header {
                text-align: center;
                margin-bottom: ${size === 'A4' ? '15px' : size === 'A5' ? '12px' : size === 'A6' ? '10px' : '8px'};
                padding-bottom: ${size === 'A4' ? '10px' : size === 'A5' ? '8px' : size === 'A6' ? '6px' : '5px'};
                border-bottom: 2px solid #000;
            }
            .result-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: ${size === 'A4' ? '15px' : size === 'A5' ? '12px' : size === 'A6' ? '10px' : '8px'};
                table-layout: auto;
            }
            .result-table td {
                border: 1px solid #ccc;
                text-align: center;
                vertical-align: middle;
                font-weight: bold;
            }
            .result-table td:first-child {
                width: 15% !important;
                background-color: #f0f0f0;
            }
            .result-table td:last-child {
                width: 85% !important;
            }
            .result-table tr:first-child {
                border: 2px solid #000;
            }
            .result-table tr:first-child td {
                border: 2px solid #000;
            }
            .result-table tr:nth-child(even) {
                background-color: #cccccc29;
            }
            .result-table tr:first-child {
                background-color: #ffe6e6;
            }
            .result-table tr td:nth-child(1) {
                width: 15% !important;
                min-width: 15% !important;
                max-width: 15% !important;
            }
            .result-table tr td:nth-child(2) {
                width: 85% !important;
                min-width: 85% !important;
                max-width: 85% !important;
            }
            .result-table tr td:nth-child(n+3) {
                display: none !important;
                width: 0 !important;
            }
            .footer {
                margin-top: ${size === 'A4' ? '0px' : size === 'A5' ? '0px' : size === 'A6' ? '10px' : '8px'};
                text-align: center;
                color: #666;
            }
        }
        @media screen {
            body {
                font-family: Arial, sans-serif;
                margin: 20px;
                background: white;
                max-width: ${size === 'A4' ? '210mm' : size === 'A5' ? '148mm' : size === 'A6' ? '105mm' : '74mm'};
                margin: 0 auto;
            }
        }
    `, []);

    // ✅ Tối ưu: Memoize font sizes để tránh tính toán lại
    const fontSizes = useMemo(() => ({
        A4: {
            title: '28px',
            subtitle: '20px',
            prizeLabel: '24px',
            prizeValue: '45px',
            specialPrize: '60px',
            footer: '19px',
            cellPadding: '5px',
            rowHeight: '65px',
            numberSpacing: '5px'
        },
        A5: {
            title: '20px',
            subtitle: '14px',
            prizeLabel: '24px',
            prizeValue: '32px',
            specialPrize: '36px',
            footer: '12px',
            cellPadding: '5px',
            rowHeight: '40px',
            numberSpacing: '3px'
        },
        A6: {
            title: '28px',
            subtitle: '20px',
            prizeLabel: '24px',
            prizeValue: '45px',
            specialPrize: '60px',
            footer: '16px',
            cellPadding: '5px',
            rowHeight: '60px',
            numberSpacing: '5px'
        },
        A7: {
            title: '28px',
            subtitle: '20px',
            prizeLabel: '20px',
            prizeValue: '45px',
            specialPrize: '60px',
            footer: '16px',
            cellPadding: '2px',
            rowHeight: '60px',
            numberSpacing: '5px'
        }
    }), []);

    // ✅ Tối ưu: Tách riêng function tạo HTML để dễ maintain
    const generateTableRow = useCallback((label, data, sizes, isSpecial = false) => {
        const borderStyle = isSpecial ? '2px solid #000' : '1px solid #ccc';
        const bgColor = isSpecial ? '#ffe6e6' : '';
        const fontSize = isSpecial ? sizes.specialPrize : sizes.prizeValue;

        return `
            <tr style="border: ${borderStyle}; background-color: ${bgColor};">
                <td style="border: ${borderStyle}; padding: ${sizes.cellPadding}; text-align: center; font-size: ${sizes.prizeLabel}; font-weight: bold; background-color: #f0f0f0; height: ${sizes.rowHeight}; vertical-align: middle;">
                    ${label}
                </td>
                <td style="border: ${borderStyle}; padding: ${sizes.cellPadding}; text-align: center; font-size: ${fontSize}; font-weight: bold; background-color: ${bgColor}; height: ${sizes.rowHeight}; vertical-align: middle; display: flex; justify-content: center; align-items: center; flex-wrap: wrap; gap: ${sizes.numberSpacing};">
                    ${(data || []).map(kq =>
            kq === '...' ? '...' : getFilteredNumber(kq, currentFilter)
        ).join(`<span style="margin: 0 ${sizes.numberSpacing};">&nbsp;</span>`)}
                </td>
            </tr>
        `;
    }, [currentFilter, getFilteredNumber]);

    // ✅ Tối ưu: Sử dụng useCallback để tránh tạo lại function
    const generatePrintContent = useCallback((data2, heads, tails, currentFilter, getFilteredNumber, size) => {
        const vietnamTime = getVietnamTime();
        const currentDate = vietnamTime.toLocaleDateString('vi-VN');
        const currentTime = vietnamTime.toLocaleTimeString('vi-VN');
        const sizes = fontSizes[size];

        // ✅ Tối ưu: Sử dụng template literals hiệu quả hơn
        const header = `
            <div class="print-header" style="text-align: center; margin-top: 20px; border-bottom: 2px solid #000; padding-bottom: 10px;">
                <div class="print-title" style="font-size: ${sizes.title}; font-weight: bold; margin-bottom: 8px;">
                    KẾT QUẢ XỔ SỐ MIỀN BẮC - XSMB.WIN
                </div>
                <div class="print-subtitle" style="font-size: ${sizes.subtitle}; margin-bottom: 5px;">
                    ${data2.tentinh} - ${data2.dayOfWeek} - ${data2.drawDate}
                </div>
                <div class="print-subtitle" style="font-size: ${sizes.subtitle}; color: #666;">
                    In ngày: ${currentDate} - ${currentTime}
                </div>
            </div>
        `;

        const footer = `
            <div class="footer" style="margin-top: 5px; text-align: center; font-size: ${sizes.footer}; color: #666;">
                <p>Nguồn: xsmb.win - Truy cập ngay để xem kết quả trực tiếp nhanh nhất - chính xác nhất</p>
                <p>Chú ý: Thông tin chỉ mang tính chất tham khảo</p>
                <p>💥CHÚC MỌI NGƯỜI 1 NGÀY THUẬN LỢI VÀ THÀNH CÔNG💥</p>
            </div>
        `;

        // ✅ Tối ưu: Tạo table rows hiệu quả - chỉ hiển thị các giải cần thiết và row trống khi cần
        const tableRows = [
            generateTableRow('ĐB', data2.specialPrize, sizes, true),
            generateTableRow('G1', data2.firstPrize, sizes),
            generateTableRow('G2', data2.secondPrize, sizes),
            generateTableRow('G3', (data2.threePrizes || []).slice(0, 3), sizes),
            ...((data2.threePrizes || []).length > 3 ? [generateTableRow('', (data2.threePrizes || []).slice(3, 6), sizes)] : []),
            generateTableRow('G4', data2.fourPrizes, sizes),
            generateTableRow('G5', (data2.fivePrizes || []).slice(0, 3), sizes),
            ...((data2.fivePrizes || []).length > 3 ? [generateTableRow('', (data2.fivePrizes || []).slice(3, 6), sizes)] : []),
            generateTableRow('G6', (data2.sixPrizes || []).slice(0, 3), sizes),
            ...((data2.sixPrizes || []).length > 3 ? [generateTableRow('', (data2.sixPrizes || []).slice(3, 6), sizes)] : []),
            generateTableRow('G7', (data2.sevenPrizes || []), sizes),
        ].join('');

        return `
            ${header}
            <table class="result-table" style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
            ${footer}
        `;
    }, [fontSizes, generateTableRow]);

    // ✅ Tối ưu: Sử dụng useCallback cho handlePrint
    const handlePrint = useCallback((size) => {
        try {
            // ✅ Tối ưu: Sử dụng try-catch để xử lý lỗi
            const printWindow = window.open('', '_blank', 'width=800,height=600');

            if (!printWindow) {
                alert('Không thể mở cửa sổ in. Vui lòng cho phép popup.');
                return;
            }

            const printContent = generatePrintContent(data2, heads, tails, currentFilter, getFilteredNumber, size);
            const css = getPrintCSS(size);

            // ✅ Tối ưu: Sử dụng document.write hiệu quả hơn
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Kết quả XSMB - ${data2.drawDate}</title>
                    <meta charset="UTF-8">
                    <style>${css}</style>
                </head>
                <body>
                    ${printContent}
                </body>
                </html>
            `);

            printWindow.document.close();

            // ✅ Tối ưu: Sử dụng setTimeout để đảm bảo content load
            setTimeout(() => {
                printWindow.focus();
                printWindow.print();

                // ✅ Tối ưu: Cleanup sau khi print
                setTimeout(() => {
                    printWindow.close();
                }, 1000);
            }, 100);

        } catch (error) {
            console.error('Lỗi khi in:', error);
            alert('Có lỗi xảy ra khi in. Vui lòng thử lại.');
        }

        setShowPrintOptions(false);
    }, [data2, heads, tails, currentFilter, getFilteredNumber, generatePrintContent, getPrintCSS]);

    return (
        <div className={styles.printContainer}>
            <button
                className={styles.printButton}
                onClick={() => setShowPrintOptions(!showPrintOptions)}
                title="In kết quả"
            >
                🖨️ In
            </button>

            {showPrintOptions && (
                <div className={styles.printOptions}>
                    <div className={styles.printOptionsHeader}>
                        <span>Chọn kích thước giấy:</span>
                        <button
                            className={styles.closeButton}
                            onClick={() => setShowPrintOptions(false)}
                        >
                            ✕
                        </button>
                    </div>
                    <div className={styles.printSizeOptions}>
                        {printSizes.map(size => (
                            <button
                                key={size.value}
                                className={`${styles.printSizeButton} ${selectedSize === size.value ? styles.selected : ''}`}
                                onClick={() => {
                                    setSelectedSize(size.value);
                                    handlePrint(size.value);
                                }}
                            >
                                {size.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const SkeletonLoading = () => (
    <div className={styles.skeleton}>
        <div className={styles.skeletonRow}></div>
        <div className={styles.skeletonRow}></div>
        <div className={styles.skeletonRow}></div>
    </div>
);

const KQXS = (props) => {
    const { liveData, isLiveDataComplete } = useLottery();
    const [data, setData] = useState(props.data || []);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterTypes, setFilterTypes] = useState({});
    const [currentPage, setCurrentPage] = useState(1);
    const [isLiveWindow, setIsLiveWindow] = useState(false);
    const [lastLiveUpdate, setLastLiveUpdate] = useState(null);

    const hour = 18;
    const minute1 = 10; // Bắt đầu khung giờ trực tiếp
    // const minute2 = 14; // Kết thúc khung giờ trực tiếp 

    const router = useRouter();
    const dayof = props.data4;
    const station = props.station || "xsmb";
    const date = props.data3;

    const itemsPerPage = 3;

    const today = getVietnamTime().toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });

    const duration = 25 * 60 * 1000; // 22 phút cho khung giờ trực tiếp

    const CACHE_KEY = `xsmb_data_${station}_${date || 'null'}_${dayof || 'null'}`;

    // Hàm kiểm tra ngày hợp lệ
    const isValidDate = (dateStr) => {
        if (!dateStr || !/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) return false;
        const [day, month, year] = dateStr.split('-').map(Number);
        const parsedDate = new Date(year, month - 1, day);
        if (isNaN(parsedDate.getTime())) return false;
        // Không cho phép ngày trong tương lai
        return parsedDate <= new Date();
    };

    // Cache cleanup function
    const cleanOldCache = () => {
        const now = getVietnamTime().getTime();
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.endsWith('_time')) {
                const cacheTime = parseInt(localStorage.getItem(key));
                if (now - cacheTime > CACHE_DURATION) {
                    localStorage.removeItem(key);
                    localStorage.removeItem(key.replace('_time', ''));
                    console.log(`🧹 Đã xóa cache hết hạn: ${key}`);
                }
            }
        }
    };

    useEffect(() => {
        const checkTime = () => {
            // Lấy thời gian theo múi giờ Việt Nam (+07:00)
            const vietnamTime = getVietnamTime();
            const vietnamHours = vietnamTime.getHours();
            const vietnamMinutes = vietnamTime.getMinutes();
            const vietnamSeconds = vietnamTime.getSeconds();

            // Tạo thời gian bắt đầu và kết thúc theo giờ Việt Nam
            const startTime = new Date(vietnamTime);
            startTime.setHours(hour, minute1, 0, 0); // 18:10
            const endTime = new Date(startTime.getTime() + duration); // 18:32

            // Kiểm tra khung giờ trực tiếp (chỉ để hiển thị live window)
            const isLive = vietnamTime >= startTime && vietnamTime <= endTime;
            setIsLiveWindow(prev => prev !== isLive ? isLive : prev);

            // XSMB Scheduler đã được tự động hóa - không cần kích hoạt thủ công
            // Scheduler chạy tự động lúc 18h14 mỗi ngày trên backend
            console.log('🔄 XSMB Scheduler đã được tự động hóa - không cần kích hoạt thủ công');

            // Xóa cache vào lúc 18h35 để lấy kết quả mới - ĐÃ CHUYỂN SANG useEffect RIÊNG
            // Logic này đã được xử lý trong useEffect riêng để tối ưu hiệu suất

            // Reset lúc 00:00 +07:00
            if (vietnamHours === 0 && vietnamMinutes === 0 && vietnamSeconds === 0) {
                localStorage.removeItem(UPDATE_KEY); // Xóa cờ cập nhật ngày cũ
            }
        };

        checkTime();
        const intervalId = setInterval(checkTime, 5000);
        return () => clearInterval(intervalId);
    }, [station, today]);

    const fetchData = useCallback(async (forceRefresh = false) => {
        try {
            const vietnamTime = getVietnamTime();
            const vietnamHours = vietnamTime.getHours();
            const vietnamMinutes = vietnamTime.getMinutes();

            const isUpdateWindow = vietnamHours === 18 && vietnamMinutes >= 10 && vietnamMinutes <= 34;
            const isAfterUpdateWindow = vietnamHours > 18 || (vietnamHours === 18 && vietnamMinutes > 34);
            const isPostLiveWindow = vietnamHours > 18 || (vietnamHours === 18 && vietnamMinutes > 34);

            // Kiểm tra cache
            const cachedData = localStorage.getItem(CACHE_KEY);
            const cachedTime = localStorage.getItem(`${CACHE_KEY}_time`);
            const cacheAge = cachedTime ? vietnamTime.getTime() - parseInt(cachedTime) : Infinity;
            const hasUpdatedToday = localStorage.getItem(UPDATE_KEY);
            const lastLiveUpdateTime = lastLiveUpdate;

            // Cache-first strategy với logging chi tiết
            if (cachedData && cacheAge < CACHE_DURATION && !forceRefresh) {
                console.log(`📦 Cache hit: ${CACHE_KEY}, age: ${Math.round(cacheAge / 1000 / 60)} phút`);
                setData(JSON.parse(cachedData));
                setLoading(false);
                return; // Không gọi API nếu cache còn valid
            } else if (cachedData && cacheAge >= CACHE_DURATION) {
                console.log(`⏰ Cache expired: ${CACHE_KEY}, age: ${Math.round(cacheAge / 1000 / 60)} phút`);
            } else if (!cachedData) {
                console.log(`❌ Cache miss: ${CACHE_KEY}`);
            }

            // Logic cache invalidation thông minh - chỉ gọi API khi thực sự cần
            const shouldFetchFromAPI =
                forceRefresh || // Force refresh từ live data
                (!cachedData || cacheAge >= CACHE_DURATION) || // Cache miss/expired
                (isPostLiveWindow && !hasUpdatedToday) || // Sau live window và chưa update
                (lastLiveUpdateTime && (vietnamTime.getTime() - lastLiveUpdateTime) > LIVE_CACHE_DURATION) || // Live data cũ
                (vietnamHours === 18 && vietnamMinutes >= 35); // Sau 18h35 - force lấy kết quả mới

            // Kiểm tra ngày hợp lệ
            if (date && !isValidDate(date)) {
                setData([]);
                setLoading(false);
                setError('DỮ LIỆU CHƯA CÓ. VUI LÒNG THỬ LẠI SAU.');
                return;
            }

            // Không gọi API nếu là ngày hiện tại và chưa đến khung giờ trực tiếp
            if (date === today && !isUpdateWindow && !isAfterUpdateWindow) {
                if (cachedData) {
                    setData(JSON.parse(cachedData));
                    setLoading(false);
                } else {
                    setData([]);
                    setLoading(false);
                    setError('Chưa có kết quả xổ số cho ngày hiện tại.');
                }
                return;
            }

            // Làm mới cache nếu sau 18h35 hoặc không có cache
            if (shouldFetchFromAPI) {
                console.log('Fetching from API', {
                    forceRefresh,
                    isUpdateWindow,
                    isPostLiveWindow,
                    hasUpdatedToday: !!hasUpdatedToday,
                    cacheAge: Math.round(cacheAge / 1000 / 60) + ' phút',
                    lastLiveUpdate: lastLiveUpdateTime ? Math.round((now.getTime() - lastLiveUpdateTime) / 1000 / 60) + ' phút' : 'null'
                });

                // Thêm retry logic cho API call
                let result;
                let retryCount = 0;
                const maxRetries = 3;

                while (retryCount < maxRetries) {
                    try {
                        result = await apiMB.getLottery(station, date, dayof);
                        break; // Thành công, thoát loop
                    } catch (error) {
                        retryCount++;
                        console.warn(`🔄 API call failed (attempt ${retryCount}/${maxRetries}):`, error.message);

                        if (retryCount >= maxRetries) {
                            console.error('❌ API call failed after all retries');
                            // Fallback to cache nếu có
                            if (cachedData) {
                                console.log('📦 Fallback to cached data');
                                setData(JSON.parse(cachedData));
                                setLoading(false);
                                return;
                            }
                            throw error; // Re-throw nếu không có cache fallback
                        }

                        // Wait before retry
                        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                    }
                }

                const dataArray = Array.isArray(result) ? result : [result];

                const formattedData = dataArray.map(item => ({
                    ...item,
                    drawDate: new Date(item.drawDate).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                    }),
                }));

                // So sánh với dữ liệu cache để kiểm tra bản ghi mới
                const cachedDataParsed = cachedData ? JSON.parse(cachedData) : [];
                const hasNewData = JSON.stringify(formattedData) !== JSON.stringify(cachedDataParsed);

                if (hasNewData) {
                    setData(formattedData);
                    localStorage.setItem(CACHE_KEY, JSON.stringify(formattedData));
                    localStorage.setItem(`${CACHE_KEY}_time`, vietnamTime.getTime().toString());
                } else if (cachedData) {
                    setData(cachedDataParsed);
                }

                setFilterTypes(prevFilters => {
                    const newFilters = formattedData.reduce((acc, item) => {
                        acc[item.drawDate + item.station] = prevFilters[item.drawDate + item.station] || 'all';
                        return acc;
                    }, {});
                    if (JSON.stringify(prevFilters) !== JSON.stringify(newFilters)) {
                        return newFilters;
                    }
                    return prevFilters;
                });

                setLoading(false);
                setError(null);
                return;
            }

            // Kiểm tra props.data
            if (props.data && Array.isArray(props.data) && props.data.length > 0) {
                const dayMap = {
                    'thu-2': 'Thứ Hai',
                    'thu-3': 'Thứ Ba',
                    'thu-4': 'Thứ Tư',
                    'thu-5': 'Thứ Năm',
                    'thu-6': 'Thứ Sáu',
                    'thu-7': 'Thứ Bảy',
                    'chu-nhat': 'Chủ Nhật'
                };
                const isPropsDataValid = props.data.every(item => {
                    const itemDate = new Date(item.drawDate).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                    });
                    const matchesStation = item.station === station;
                    const matchesDate = !date || itemDate === date;
                    const matchesDayOfWeek = !dayof || item.dayOfWeek.toLowerCase() === dayMap[dayof.toLowerCase()]?.toLowerCase();
                    return matchesStation && matchesDate && matchesDayOfWeek;
                });

                if (isPropsDataValid) {
                    const formattedData = props.data.map(item => ({
                        ...item,
                        drawDate: new Date(item.drawDate).toLocaleDateString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                        }),
                    }));
                    setData(formattedData);
                    localStorage.setItem(CACHE_KEY, JSON.stringify(formattedData));
                    localStorage.setItem(`${CACHE_KEY}_time`, vietnamTime.getTime().toString());
                    setLoading(false);
                    return;
                }
            }

            // Sử dụng cache nếu có và không cần làm mới
            if (cachedData && cacheAge < CACHE_DURATION) {
                setData(JSON.parse(cachedData));
                setLoading(false);
                return;
            }

            setLoading(false);
            setError(null);
        } catch (error) {
            console.error('Lỗi khi lấy dữ liệu xổ số:', error);
            setError('Không thể tải dữ liệu, vui lòng thử lại sau.');
            setLoading(false);
        }
    }, [station, date, dayof, props.data, today, lastLiveUpdate]);

    useEffect(() => {
        cleanOldCache();
        fetchData();
    }, [fetchData]);

    // BỔ SUNG: useEffect riêng để xử lý xóa cache vào 18h35 - TỐI ƯU
    useEffect(() => {
        let cacheCleared = false; // Flag để tránh clear cache nhiều lần

        const checkAndClearCache = () => {
            const vietnamTime = getVietnamTime();
            const vietnamHours = vietnamTime.getHours();
            const vietnamMinutes = vietnamTime.getMinutes();

            // Chỉ check vào phút 35 để giảm số lần check
            if (vietnamHours === 18 && vietnamMinutes === 35 && !cacheCleared) {
                console.log('🕐 18h35 - Xóa cache để lấy kết quả mới từ database');

                // Xóa tất cả cache liên quan đến ngày hôm nay
                const todayCacheKey = `xsmb_data_${station}_${today}_null`;
                localStorage.removeItem(todayCacheKey);
                localStorage.removeItem(`${todayCacheKey}_time`);

                // Xóa cờ cập nhật để force refresh
                localStorage.removeItem(UPDATE_KEY);

                // Force refresh data ngay lập tức
                fetchData(true);

                cacheCleared = true; // Đánh dấu đã clear
                console.log('✅ Đã xóa cache và force refresh để lấy kết quả mới');
            }

            // Reset flag khi qua 18h36
            if (vietnamHours === 18 && vietnamMinutes === 36) {
                cacheCleared = false;
            }
        };

        // Kiểm tra ngay khi component mount
        checkAndClearCache();

        // TỐI ƯU: Chỉ check mỗi phút thay vì mỗi giây
        const intervalId = setInterval(checkAndClearCache, 60 * 1000);

        return () => clearInterval(intervalId);
    }, [station, today]);

    const isLiveMode = useMemo(() => {
        if (!props.data3) return true;
        if (props.data3 === today) return true;
        const dayMap = {
            'thu-2': 'Thứ Hai',
            'thu-3': 'Thứ Ba',
            'thu-4': 'Thứ Tư',
            'thu-5': 'Thứ Năm',
            'thu-6': 'Thứ Sáu',
            'thu-7': 'Thứ Bảy',
            'chu-nhat': 'Chủ Nhật'
        };
        const todayDayOfWeek = new Date().toLocaleString('vi-VN', { weekday: 'long' });
        const inputDayOfWeek = dayMap[props.data3?.toLowerCase()];
        return inputDayOfWeek && inputDayOfWeek === todayDayOfWeek;
    }, [props.data3, today]);

    // Cập nhật cache khi liveData đầy đủ
    useEffect(() => {
        if (isLiveDataComplete && liveData && liveData.drawDate === today) {
            console.log('🔄 Live data complete, cập nhật cache và force refresh');

            setData(prevData => {
                // Loại bỏ dữ liệu cũ của ngày hôm nay và thêm liveData
                const filteredData = prevData.filter(item => item.drawDate !== today);
                const formattedLiveData = {
                    ...liveData,
                    drawDate: new Date(liveData.drawDate).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                    }),
                    specialPrize: [liveData.specialPrize_0],
                    firstPrize: [liveData.firstPrize_0],
                    secondPrize: [liveData.secondPrize_0, liveData.secondPrize_1],
                    threePrizes: [
                        liveData.threePrizes_0, liveData.threePrizes_1, liveData.threePrizes_2,
                        liveData.threePrizes_3, liveData.threePrizes_4, liveData.threePrizes_5,
                    ],
                    fourPrizes: [
                        liveData.fourPrizes_0, liveData.fourPrizes_1, liveData.fourPrizes_2, liveData.fourPrizes_3,
                    ],
                    fivePrizes: [
                        liveData.fivePrizes_0, liveData.fivePrizes_1, liveData.fivePrizes_2,
                        liveData.fivePrizes_3, liveData.fivePrizes_4, liveData.fivePrizes_5,
                    ],
                    sixPrizes: [liveData.sixPrizes_0, liveData.sixPrizes_1, liveData.sixPrizes_2],
                    sevenPrizes: [
                        liveData.sevenPrizes_0, liveData.sevenPrizes_1, liveData.sevenPrizes_2, liveData.sevenPrizes_3,
                    ],
                };
                const newData = [formattedLiveData, ...filteredData].sort((a, b) =>
                    new Date(b.drawDate.split('/').reverse().join('-')) - new Date(a.drawDate.split('/').reverse().join('-'))
                );
                localStorage.setItem(CACHE_KEY, JSON.stringify(newData));
                localStorage.setItem(`${CACHE_KEY}_time`, getVietnamTime().getTime().toString());
                localStorage.setItem(UPDATE_KEY, getVietnamTime().getTime().toString());
                setLastLiveUpdate(getVietnamTime().getTime());
                return newData;
            });
            setFilterTypes(prev => ({
                ...prev,
                [`${liveData.drawDate}${liveData.station}`]: prev[`${liveData.drawDate}${liveData.station}`] || 'all',
            }));

            // Force refresh từ API sau 5 phút để đảm bảo data consistency
            setTimeout(() => {
                console.log('🔄 Force refresh từ API sau live window');
                fetchData(true);
            }, 5 * 60 * 1000); // 5 phút

            // BỔ SUNG: Force refresh vào lúc 18h35 để lấy kết quả mới từ database
            const vietnamTime = getVietnamTime();
            const timeUntil1835 = new Date(vietnamTime);
            timeUntil1835.setHours(18, 35, 0, 0);

            if (vietnamTime < timeUntil1835) {
                const delayUntil1835 = timeUntil1835.getTime() - vietnamTime.getTime();
                setTimeout(() => {
                    console.log('🕐 18h35 - Force refresh để lấy kết quả mới từ database');
                    fetchData(true);
                }, delayUntil1835);
            }
        }
    }, [isLiveDataComplete, liveData, today, CACHE_KEY, fetchData]);

    const handleFilterChange = useCallback((pageKey, value) => {
        setFilterTypes(prev => ({ ...prev, [pageKey]: value }));
    }, []);

    const getHeadAndTailNumbers = useMemo(() => (data2) => {
        const specialNumbers = (data2.specialPrize || []).map(num => getFilteredNumber(num, 'last2'));
        const sevenNumbers = (data2.sevenPrizes || []).map(num => getFilteredNumber(num, 'last2'));
        const allNumbers = [
            ...specialNumbers,
            ...sevenNumbers,
            ...(data2.firstPrize || []).map(num => getFilteredNumber(num, 'last2')),
            ...(data2.secondPrize || []).map(num => getFilteredNumber(num, 'last2')),
            ...(data2.threePrizes || []).map(num => getFilteredNumber(num, 'last2')),
            ...(data2.fourPrizes || []).map(num => getFilteredNumber(num, 'last2')),
            ...(data2.fivePrizes || []).map(num => getFilteredNumber(num, 'last2')),
            ...(data2.sixPrizes || []).map(num => getFilteredNumber(num, 'last2')),
        ].filter(num => num && num !== '' && !isNaN(num));

        const heads = Array(10).fill().map(() => []);
        const tails = Array(10).fill().map(() => []);

        allNumbers.forEach(number => {
            const numStr = number.toString().padStart(2, '0');
            const head = parseInt(numStr[0]);
            const tail = parseInt(numStr[1]);

            if (!isNaN(head) && !isNaN(tail)) {
                const isHighlighted = specialNumbers.includes(numStr) || sevenNumbers.includes(numStr);
                heads[head].push({ value: numStr, isHighlighted });
                tails[tail].push({ value: numStr, isHighlighted });
            }
        });

        for (let i = 0; i < 10; i++) {
            heads[i].sort((a, b) => parseInt(a.value) - parseInt(b.value));
            tails[i].sort((a, b) => parseInt(a.value) - parseInt(b.value));
        }

        return { heads, tails };
    }, []);

    const totalPages = useMemo(() => Math.ceil(data.length / itemsPerPage), [data]);
    const startIndex = useMemo(() => (currentPage - 1) * itemsPerPage, [currentPage]);
    const endIndex = useMemo(() => startIndex + itemsPerPage, [startIndex]);
    const currentData = useMemo(() => data.slice(startIndex, endIndex), [data, startIndex, endIndex]);

    const goToPage = useCallback((page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [totalPages]);

    if (loading) {
        return <SkeletonLoading />;
    }

    if (error) {
        return <div className={styles.error}>{error}</div>;
    }

    const LoToTable = React.memo(({ data2, heads, tails }) => {
        const { ref, inView } = useInView({
            triggerOnce: true,
            threshold: 0.1,
        });

        return (
            <div className={styles.TKe_content}>
                <h2 className={styles.TKe_contentTitle}>
                    <span className={styles.title}>Bảng Lô Tô - </span>
                    <span className={styles.desc}>{data2.tentinh} -</span>
                    <span className={styles.dayOfWeek}>{`${data2.dayOfWeek} - `}</span>
                    <span className={styles.desc}>{data2.drawDate}</span>
                </h2>
                <div ref={ref}>
                    {inView ? (
                        <table className={styles.tableKey}>
                            <tbody>
                                <tr>
                                    <td className={styles.t_h}>Đầu</td>
                                    <td>Lô tô</td>
                                    <td className={styles.t_h}>Đuôi</td>
                                    <td>Lô tô</td>
                                </tr>
                                {Array.from({ length: 10 }, (_, index) => (
                                    <tr key={index}>
                                        <td className={styles.t_h}>{index}</td>
                                        <td>
                                            {heads[index].length > 0 ? (
                                                heads[index].map((num, idx) => (
                                                    <span
                                                        key={`${num.value}-${idx}`}
                                                        className={num.isHighlighted ? styles.highlight1 : ''}
                                                    >
                                                        {num.value}{idx < heads[index].length - 1 ? ', ' : ''}
                                                    </span>
                                                ))
                                            ) : (
                                                '-'
                                            )}
                                        </td>
                                        <td className={styles.t_h}>{index}</td>
                                        <td>
                                            {tails[index].length > 0 ? (
                                                tails[index].map((num, idx) => (
                                                    <span
                                                        key={`${num.value}-${idx}`}
                                                        className={num.isHighlighted ? styles.highlight1 : ''}
                                                    >
                                                        {num.value}{idx < tails[index].length - 1 ? ', ' : ''}
                                                    </span>
                                                ))
                                            ) : (
                                                '-'
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className={styles.placeholder}>Đang tải bảng lô tô...</div>
                    )}
                </div>
            </div>
        );
    });

    return (
        <div className={styles.containerKQ}>
            {isLiveMode && isLiveWindow && (
                <LiveResult
                    station={station}
                    today={today}
                    getHeadAndTailNumbers={getHeadAndTailNumbers}
                    handleFilterChange={handleFilterChange}
                    filterTypes={filterTypes}
                    isLiveWindow={isLiveWindow}
                />
            )}
            {currentData.map((data2) => {
                const tableKey = data2.drawDate + data2.tinh;
                const currentFilter = filterTypes[tableKey] || 'all';
                const { heads, tails } = getHeadAndTailNumbers(data2);

                return (
                    <div key={tableKey}>
                        <div className={styles.kqxs}>
                            <div className={styles.header}>
                                <div className={styles.headerTop}>
                                    <h1 className={styles.kqxs__title}>
                                        XSMB - Kết quả Xổ số Miền Bắc - SXMB
                                    </h1>
                                    <PrintButton
                                        data2={data2}
                                        heads={heads}
                                        tails={tails}
                                        currentFilter={currentFilter}
                                        getFilteredNumber={getFilteredNumber}
                                    />
                                </div>
                                <div className={styles.kqxs__action}>
                                    <a className={styles.kqxs__actionLink} href="#!">{data2.station}</a>
                                    <a className={`${styles.kqxs__actionLink} ${styles.dayOfWeek}`} href="#!">{data2.dayOfWeek}</a>
                                    <a className={styles.kqxs__actionLink} href="#!">{data2.drawDate}</a>
                                    <span className={styles.tentinhs}>({data2.tentinh})</span>
                                </div>
                            </div>
                            <table className={styles.tableXS}>
                                <tbody>
                                    <tr>
                                        <td className={`${styles.code} ${styles.rowXS}`}>
                                            <span className={styles.span0}>
                                                {data2.maDB === '...' ? <span className={styles.ellipsis}></span> : data2.maDB}
                                            </span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={`${styles.tdTitle} ${styles.highlight}`}>ĐB</td>
                                        <td className={styles.rowXS}>
                                            {(data2.specialPrize || []).map((kq, index) => (
                                                <span
                                                    key={`${kq}-${index}`}
                                                    className={`${styles.span1} ${styles.highlight} ${styles.gdb}`}
                                                >
                                                    {kq === '...' ? <span className={styles.ellipsis}></span> : getFilteredNumber(kq, currentFilter)}
                                                </span>
                                            ))}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={styles.tdTitle}>G1</td>
                                        <td className={styles.rowXS}>
                                            {(data2.firstPrize || []).map((kq, index) => (
                                                <span key={`${kq}-${index}`} className={styles.span1}>
                                                    {kq === '...' ? <span className={styles.ellipsis}></span> : getFilteredNumber(kq, currentFilter)}
                                                </span>
                                            ))}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={styles.tdTitle}>G2</td>
                                        <td className={styles.rowXS}>
                                            {(data2.secondPrize || []).map((kq, index) => (
                                                <span key={`${kq}-${index}`} className={styles.span2}>
                                                    {kq === '...' ? <span className={styles.ellipsis}></span> : getFilteredNumber(kq, currentFilter)}
                                                </span>
                                            ))}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={`${styles.tdTitle} ${styles.g3}`}>G3</td>
                                        <td className={styles.rowXS}>
                                            {(data2.threePrizes || []).slice(0, 3).map((kq, index) => (
                                                <span
                                                    key={`${kq}-${index}`}
                                                    className={`${styles.span3} ${styles.g3}`}
                                                >
                                                    {kq === '...' ? <span className={styles.ellipsis}></span> : getFilteredNumber(kq, currentFilter)}
                                                </span>
                                            ))}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={styles.tdTitle}></td>
                                        <td className={styles.rowXS}>
                                            {(data2.threePrizes || []).slice(3, 6).map((kq, index) => (
                                                <span key={`${kq}-${index}`} className={styles.span3}>
                                                    {kq === '...' ? <span className={styles.ellipsis}></span> : getFilteredNumber(kq, currentFilter)}
                                                </span>
                                            ))}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={styles.tdTitle}>G4</td>
                                        <td className={styles.rowXS}>
                                            {(data2.fourPrizes || []).map((kq, index) => (
                                                <span key={`${kq}-${index}`} className={styles.span4}>
                                                    {kq === '...' ? <span className={styles.ellipsis}></span> : getFilteredNumber(kq, currentFilter)}
                                                </span>
                                            ))}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={`${styles.tdTitle} ${styles.g3}`}>G5</td>
                                        <td className={styles.rowXS}>
                                            {(data2.fivePrizes || []).slice(0, 3).map((kq, index) => (
                                                <span
                                                    key={`${kq}-${index}`}
                                                    className={`${styles.span3} ${styles.g3}`}
                                                >
                                                    {kq === '...' ? <span className={styles.ellipsis}></span> : getFilteredNumber(kq, currentFilter)}
                                                </span>
                                            ))}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={styles.tdTitle}></td>
                                        <td className={styles.rowXS}>
                                            {(data2.fivePrizes || []).slice(3, 6).map((kq, index) => (
                                                <span key={`${kq}-${index}`} className={styles.span3}>
                                                    {kq === '...' ? <span className={styles.ellipsis}></span> : getFilteredNumber(kq, currentFilter)}
                                                </span>
                                            ))}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={styles.tdTitle}>G6</td>
                                        <td className={styles.rowXS}>
                                            {(data2.sixPrizes || []).map((kq, index) => (
                                                <span key={`${kq}-${index}`} className={styles.span3}>
                                                    {kq === '...' ? <span className={styles.ellipsis}></span> : getFilteredNumber(kq, currentFilter)}
                                                </span>
                                            ))}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={styles.tdTitle}>G7</td>
                                        <td className={styles.rowXS}>
                                            {(data2.sevenPrizes || []).map((kq, index) => (
                                                <span
                                                    key={`${kq}-${index}`}
                                                    className={`${styles.span4} ${styles.highlight}`}
                                                >
                                                    {kq === '...' ? <span className={styles.ellipsis}></span> : getFilteredNumber(kq, currentFilter)}
                                                </span>
                                            ))}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            <div className={styles.action}>
                                <div aria-label="Tùy chọn lọc số" className={styles.filter__options} role="radiogroup">
                                    <div className={styles.optionInput}>
                                        <input
                                            id={`filterAll-${tableKey}`}
                                            type="radio"
                                            name={`filterOption-${tableKey}`}
                                            value="all"
                                            checked={currentFilter === 'all'}
                                            onChange={() => handleFilterChange(tableKey, 'all')}
                                        />
                                        <label htmlFor={`filterAll-${tableKey}`}>Đầy Đủ</label>
                                    </div>
                                    <div className={styles.optionInput}>
                                        <input
                                            id={`filterTwo-${tableKey}`}
                                            type="radio"
                                            name={`filterOption-${tableKey}`}
                                            value="last2"
                                            checked={currentFilter === 'last2'}
                                            onChange={() => handleFilterChange(tableKey, 'last2')}
                                        />
                                        <label htmlFor={`filterTwo-${tableKey}`}>2 Số Đuôi</label>
                                    </div>
                                    <div className={styles.optionInput}>
                                        <input
                                            id={`filterThree-${tableKey}`}
                                            type="radio"
                                            name={`filterOption-${tableKey}`}
                                            value="last3"
                                            checked={currentFilter === 'last3'}
                                            onChange={() => handleFilterChange(tableKey, 'last3')}
                                        />
                                        <label htmlFor={`filterThree-${tableKey}`}>3 Số Đuôi</label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <LoToTable
                            data2={data2}
                            heads={heads}
                            tails={tails}
                        />
                    </div>
                );
            })}
            {data.length > itemsPerPage && (
                <div className={styles.pagination}>
                    <a
                        href={`/ket-qua-xo-so-mien-bac?page=${currentPage - 1}`}
                        onClick={(e) => {
                            e.preventDefault();
                            goToPage(currentPage - 1);
                        }}
                        className={`${styles.paginationButton} ${currentPage === 1 ? styles.disabled : ''}`}
                    >
                        Trước
                    </a>
                    <span>Trang {currentPage} / {totalPages}</span>
                    <a
                        href={`/ket-qua-xo-so-mien-bac?page=${currentPage + 1}`}
                        onClick={(e) => {
                            e.preventDefault();
                            goToPage(currentPage + 1);
                        }}
                        className={`${styles.paginationButton} ${currentPage === totalPages ? styles.disabled : ''}`}
                    >
                        Sau
                    </a>
                </div>
            )}
        </div>
    );
};

export default React.memo(KQXS);