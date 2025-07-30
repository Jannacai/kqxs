"use client";
import { useState } from 'react';
import styles from '../../styles/DienDan.module.css';
import UserAvatar from '../../component/UserAvatar'

export default function SimpleForum() {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    return (
        <div className={styles.forumLayoutWrapper}>
            {/* Back to main site button */}
            <div className={styles.backToMain}>
                <a href="/" className={styles.backButton}>
                    ← Quay lại trang chủ
                </a>
            </div>

            {/* Mobile Menu Toggle */}
            <button className={styles.mobileMenuToggle} onClick={toggleSidebar}>
                <span></span>
                <span></span>
                <span></span>
            </button>

            {/* Overlay for mobile */}
            {sidebarOpen && (
                <div className={styles.overlay} onClick={toggleSidebar}></div>
            )}

            <div className={styles.forumLayout}>
                {/* Header */}
                <header className={styles.forumHeader}>
                    <div className={styles.headerContent}>
                        <div className={styles.logoSection}>
                            <h1 className={styles.forumTitle}>Diễn Đàn Xổ Số</h1>
                            <p className={styles.forumSubtitle}>Cộng đồng chia sẻ kinh nghiệm</p>
                        </div>
                        <div className={styles.headerActions}>
                            <UserAvatar />
                        </div>
                    </div>
                </header>

                {/* Main Layout */}
                <div className={styles.mainLayout}>
                    {/* Sidebar */}
                    <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
                        <div className={styles.sidebarHeader}>
                            <h3>Danh Mục</h3>
                            <button className={styles.closeSidebar} onClick={toggleSidebar}>
                                ×
                            </button>
                        </div>

                        <nav className={styles.sidebarNav}>
                            <div className={styles.navSection}>
                                <h4>📢 Thông Tin</h4>
                                <ul>
                                    <li>
                                        <button className={styles.navButton}>
                                            🌟 Tin Hot & Sự Kiện
                                        </button>
                                    </li>
                                    <li>
                                        <button className={styles.navButton}>
                                            📌 Sự Kiện Mới Nhất
                                        </button>
                                    </li>
                                    <li>
                                        <button className={styles.navButton}>
                                            🔔 Thông Báo Mới
                                        </button>
                                    </li>
                                </ul>
                            </div>

                            <div className={styles.navSection}>
                                <h4>👥 Cộng Đồng</h4>
                                <ul>
                                    <li>
                                        <button className={styles.navButton}>
                                            🎯 Giao Lưu Chốt Số
                                        </button>
                                    </li>
                                    <li>
                                        <button className={styles.navButton}>
                                            👥 Thành Viên Nhóm
                                        </button>
                                    </li>
                                </ul>
                            </div>
                        </nav>
                    </aside>

                    {/* Main Content */}
                    <main className={styles.mainContent}>
                        {/* Test Section */}
                        <section className={styles.contentSection}>
                            <div className={styles.sectionHeader}>
                                <h2>🌟 Tin Hot & Sự Kiện</h2>
                                <p>Cập nhật những thông tin mới nhất và sự kiện nổi bật</p>
                            </div>
                            <div className={styles.sectionContent}>
                                <div style={{ padding: '20px', background: '#f8f9fa', borderRadius: '8px', textAlign: 'center' }}>
                                    <h3>Test Content</h3>
                                    <p>Đây là nội dung test để kiểm tra layout diễn đàn</p>
                                    <p>Nếu bạn thấy nội dung này, layout đã hoạt động!</p>
                                </div>
                            </div>
                        </section>

                        {/* Another Test Section */}
                        <section className={styles.contentSection}>
                            <div className={styles.sectionHeader}>
                                <h2>📌 Sự Kiện Mới Nhất</h2>
                                <p>Cập nhật sự kiện mới nhất hôm nay</p>
                            </div>
                            <div className={styles.sectionContent}>
                                <div style={{ padding: '20px', background: '#f8f9fa', borderRadius: '8px', textAlign: 'center' }}>
                                    <h3>Test Content 2</h3>
                                    <p>Đây là section thứ hai để test layout</p>
                                    <p>Sidebar và header đã hoạt động chưa?</p>
                                </div>
                            </div>
                        </section>
                    </main>
                </div>
            </div>
        </div>
    );
} 