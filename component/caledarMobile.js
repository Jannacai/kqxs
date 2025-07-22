'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import styles from '../public/css/calenda.module.css';
import { FaCalendarDay, FaChevronCircleLeft, FaChevronCircleRight } from 'react-icons/fa';

const formatNumber = (num) => {
    return num < 10 ? `0${num}` : num;
};

const CalendarMobile = ({ onDateChange }) => {
    const router = useRouter();
    const pathname = usePathname();
    const months = [
        'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
        'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
    ];
    const daysOfWeek = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const minYear = 2020;
    const maxYear = new Date().getFullYear();

    const today = new Date();
    const [currentYear, setCurrentYear] = useState(today.getFullYear());
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [selectedDate, setSelectedDate] = useState(new Date(today));
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const calendarRef = useRef(null);

    // Đồng bộ selectedDate với slug từ URL
    useEffect(() => {
        if (!router.isReady) return;

        const slug = pathname.split('/xsmb/')[1];
        if (slug && typeof slug === 'string' && slug.includes('-')) {
            const [day, month, year] = slug.split('-').map(Number);
            const dateFromSlug = new Date(year, month - 1, day);
            if (!isNaN(dateFromSlug.getTime()) && dateFromSlug <= today) {
                setSelectedDate(dateFromSlug);
                setCurrentMonth(dateFromSlug.getMonth());
                setCurrentYear(dateFromSlug.getFullYear());
            } else {
                console.warn('Invalid or future date from slug:', slug);
                const dayFormatted = formatNumber(today.getDate());
                const monthFormatted = formatNumber(today.getMonth() + 1);
                const defaultSlug = `${dayFormatted}-${monthFormatted}-${today.getFullYear()}`;
                router.replace(`/xsmb/${defaultSlug}`);
            }
        } else {
            console.warn('No valid slug found, using default date (today)');
            const dayFormatted = formatNumber(today.getDate());
            const monthFormatted = formatNumber(today.getMonth() + 1);
            const defaultSlug = `${dayFormatted}-${monthFormatted}-${today.getFullYear()}`;
            router.replace(`/xsmb/${defaultSlug}`);
        }
    }, [router.isReady, pathname, router, today]);

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

    // Xử lý click ngoài modal để đóng
    const handleClickOutside = useCallback((event) => {
        if (calendarRef.current && !calendarRef.current.contains(event.target)) {
            setIsMenuOpen(false);
        }
    }, []);

    useEffect(() => {
        if (isMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isMenuOpen, handleClickOutside]);

    const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);

    const handlePrevMonth = useCallback(() => {
        let newMonth = currentMonth - 1;
        let newYear = currentYear;
        if (newMonth < 0) {
            newMonth = 11;
            newYear--;
        }
        if (newYear < minYear) return;
        setCurrentMonth(newMonth);
        setCurrentYear(newYear);
    }, [currentMonth, currentYear, minYear]);

    const handleNextMonth = useCallback(() => {
        let newMonth = currentMonth + 1;
        let newYear = currentYear;
        if (newMonth > 11) {
            newMonth = 0;
            newYear++;
        }
        if (newYear > maxYear || (newYear === maxYear && newMonth > today.getMonth())) return;
        setCurrentMonth(newMonth);
        setCurrentYear(newYear);
    }, [currentMonth, currentYear, maxYear, today]);

    const handleDateClick = useCallback(
        (day) => {
            const newDate = new Date(currentYear, currentMonth, day);
            if (newDate > today) return;
            setSelectedDate(newDate);
            const dayFormatted = formatNumber(day);
            const monthFormatted = formatNumber(currentMonth + 1);
            const slug = `${dayFormatted}-${monthFormatted}-${currentYear}`;
            router.push(`/xsmb/${slug}`);
            setIsMenuOpen(false);
        },
        [currentYear, currentMonth, today, router]
    );

    const toggleMenu = useCallback(() => {
        setIsMenuOpen((prev) => !prev);
    }, []);

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
            const isFuture = currentDate > today;

            days.push(
                <div
                    key={day}
                    className={`${styles.day} ${isToday ? styles.today : ''} ${isSelected ? styles.selected : ''} ${isFuture ? styles.disabled : ''}`}
                    onClick={() => !isFuture && handleDateClick(day)}
                >
                    {day}
                </div>
            );
        }

        return days;
    };

    return (
        <div>
            <span className={styles.iconMenu} onClick={toggleMenu}>
                <FaCalendarDay />
            </span>
            {isMenuOpen && <div className={styles.overlay}></div>}
            <div ref={calendarRef} className={`${styles.calendarContainerMobile} ${isMenuOpen ? styles.CalendarToggle : ''}`}>
                <div className={styles.calendarHeader}>
                    <button
                        onClick={handlePrevMonth}
                        disabled={currentYear === minYear && currentMonth === 0}
                        className={styles.navButton}
                    >
                        <FaChevronCircleLeft className="iconLeft" />
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
                        disabled={currentYear === maxYear && currentMonth === today.getMonth()}
                        className={styles.navButton}
                    >
                        <FaChevronCircleRight className="iconRight" />
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
        </div>
    );
};

export default CalendarMobile;