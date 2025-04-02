'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import styles from '../public/css/calenda.module.css';

const formatNumber = (num) => {
    return num < 10 ? `0${num}` : num;
};

const Calendar = ({ onDateChange }) => {
    const router = useRouter();
    const pathname = usePathname();
    const months = [
        'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
        'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
    ];
    const daysOfWeek = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const minYear = 2020;
    const maxYear = 2030;

    const today = new Date();
    const [currentYear, setCurrentYear] = useState(today.getFullYear());
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [selectedDate, setSelectedDate] = useState(new Date(today));

    // Đồng bộ selectedDate với slug từ URL khi component mount hoặc URL thay đổi
    useEffect(() => {
        const slug = pathname.split('/xsmb/')[1];
        if (slug) {
            const [day, month, year] = slug.split('-').map(Number);
            const dateFromSlug = new Date(year, month - 1, day);
            if (!isNaN(dateFromSlug.getTime())) {
                setSelectedDate(dateFromSlug);
                setCurrentMonth(dateFromSlug.getMonth());
                setCurrentYear(dateFromSlug.getFullYear());
            }
        }
    }, [pathname]);

    // Gọi onDateChange khi selectedDate thay đổi
    useEffect(() => {
        if (selectedDate) {
            const day = formatNumber(selectedDate.getDate());
            const month = formatNumber(selectedDate.getMonth() + 1);
            const year = selectedDate.getFullYear();
            const slug = `${day}-${month}-${year}`;
            onDateChange?.(slug);
        }
    }, [selectedDate, onDateChange]);

    const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);

    const handlePrevMonth = () => {
        let newMonth = currentMonth - 1;
        let newYear = currentYear;
        if (newMonth < 0) {
            newMonth = 11;
            newYear--;
        }
        if (newYear < minYear) return;
        setCurrentMonth(newMonth);
        setCurrentYear(newYear);
    };

    const handleNextMonth = () => {
        let newMonth = currentMonth + 1;
        let newYear = currentYear;
        if (newMonth > 11) {
            newMonth = 0;
            newYear++;
        }
        if (newYear > maxYear) return;
        setCurrentMonth(newMonth);
        setCurrentYear(newYear);
    };

    const handleDateClick = (day) => {
        const newDate = new Date(currentYear, currentMonth, day);
        setSelectedDate(newDate);
        const dayFormatted = formatNumber(day);
        const monthFormatted = formatNumber(currentMonth + 1);
        const slug = `${dayFormatted}-${monthFormatted}-${currentYear}`;
        router.push(`/xsmb/${slug}`);
    };

    const renderCalendar = () => {
        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const days = [];

        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className={styles.emptyDay} />);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(currentYear, currentMonth, day);
            const isToday = currentDate.toDateString() === today.toDateString();
            const isSelected = selectedDate && currentDate.toDateString() === selectedDate.toDateString();

            days.push(
                <div
                    key={day}
                    className={`${styles.day} ${isToday ? styles.today : ''} ${isSelected ? styles.selected : ''}`}
                    onClick={() => handleDateClick(day)}
                >
                    {day}
                </div>
            );
        }

        return days;
    };

    return (
        <div className={styles.calendarContainer}>
            <div className={styles.calendarHeader}>
                <button
                    onClick={handlePrevMonth}
                    disabled={currentYear === minYear && currentMonth === 0}
                    className={styles.navButton}
                >
                    <i className="iconLeft fa-solid fa-circle-chevron-left"></i>
                </button>
                <div className={styles.selectContainer}>
                    <select
                        value={currentMonth}
                        onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
                        className={styles.select}
                    >
                        {months.map((month, index) => (
                            <option className={styles.optionMoth} key={index} value={index}>
                                {month}
                            </option>
                        ))}
                    </select>
                    <select
                        value={currentYear}
                        onChange={(e) => setCurrentYear(parseInt(e.target.value))}
                        className={styles.select}
                    >
                        {years.map((year) => (
                            <option key={year} value={year}>
                                {year}
                            </option>
                        ))}
                    </select>
                </div>
                <button
                    onClick={handleNextMonth}
                    disabled={currentYear === maxYear && currentMonth === 11}
                    className={styles.navButton}
                >
                    <i className="iconRight fa-solid fa-circle-chevron-right"></i>

                </button>
            </div>
            <div className={styles.calendarDays}>
                {daysOfWeek.map((day) => (
                    <div key={day} className={styles.dayHeader}>
                        {day}
                    </div>
                ))}
                {renderCalendar()}
            </div>
            {selectedDate && (
                <div className={styles.slugOutput}>
                    Kết Quả Xổ Số Ngày :{' '}
                    <Link
                        href={`/xsmb/${formatNumber(selectedDate.getDate())}-${formatNumber(selectedDate.getMonth() + 1)}-${selectedDate.getFullYear()}`}
                        className={styles.slugLink}
                    >
                        {`${formatNumber(selectedDate.getDate())}-${formatNumber(selectedDate.getMonth() + 1)}-${selectedDate.getFullYear()}`}
                    </Link>
                </div>
            )}
        </div>
    );
};

export default Calendar;