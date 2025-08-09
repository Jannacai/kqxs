"use client";

import { useEffect, useState } from 'react';
import mobileStyles from '../../styles/mobileOptimized.module.css';
import desktopStyles from '../../styles/desktopOptimized.module.css';

export default function MobileOptimizedWrapper({ children, componentType = 'default' }) {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => {
            window.removeEventListener('resize', checkMobile);
        };
    }, []);

    // Áp dụng mobile optimization dựa trên component type
    const getMobileClass = () => {
        switch (componentType) {
            case 'event':
                return mobileStyles.mobileEventContainer;
            case 'thongbao':
                return mobileStyles.mobileThongbaoContainer;
            case 'userlist':
                return mobileStyles.mobileUserListContainer;
            case 'vinhdanh':
                return mobileStyles.mobileVinhdanhContainer;
            case 'leaderboard':
                return mobileStyles.mobileLeaderboardContainer;
            case 'lichsudangky':
                return mobileStyles.mobileLichsudangkyContainer;
            case 'quydinh':
                return mobileStyles.mobileQuydinhContainer;
            case 'latestEvent':
                return mobileStyles.mobileLatestEventContainer;
            default:
                return mobileStyles.mobileContainer;
        }
    };

    // Áp dụng desktop optimization dựa trên component type
    const getDesktopClass = () => {
        switch (componentType) {
            case 'event':
                return desktopStyles.desktopEventContainer;
            case 'thongbao':
                return desktopStyles.desktopThongbaoContainer;
            case 'userlist':
                return desktopStyles.desktopUserListContainer;
            case 'vinhdanh':
                return desktopStyles.desktopVinhdanhContainer;
            case 'leaderboard':
                return desktopStyles.desktopLeaderboardContainer;
            case 'lichsudangky':
                return desktopStyles.desktopLichsudangkyContainer;
            case 'quydinh':
                return desktopStyles.desktopQuydinhContainer;
            case 'latestEvent':
                return desktopStyles.desktopLatestEventContainer;
            default:
                return desktopStyles.desktopContainer;
        }
    };

    if (isMobile) {
        return (
            <div className={`${mobileStyles.mobileContainer} ${getMobileClass()}`}>
                {children}
            </div>
        );
    }

    return (
        <div className={`${desktopStyles.desktopContainer} ${getDesktopClass()}`}>
            {children}
        </div>
    );
}
