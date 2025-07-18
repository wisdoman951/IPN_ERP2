// File: src/components/Header.tsx

import React from 'react';
import { useNavigate, useLocation, matchPath } from 'react-router-dom';
import { getUserRole, getStoreName  } from '../utils/authUtils'; // Correct import
import { pageTitles } from '../config/pageTitles';   // Correct import
import IconButton from './IconButton';        // Assuming this is your icon button component file

interface HeaderProps {
    title?: string;
}
const Header: React.FC<HeaderProps> = ({ title }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const getDynamicTitle = (): string => {
        const userRole = getUserRole();
        const currentPath = location.pathname;
        if (currentPath === '/home') {
            const storeName = getStoreName(); // 取得店家名稱，例如 "台北總店"
            if (storeName) {
                // 如果是總部，使用 1.2 編碼
                if (userRole === 'admin') {
                    return `全崴國際管理系統-${storeName}首頁 1.2`;
                }
                // 否則 (是分店)，使用 1.1 編碼
                return `全崴國際管理系統-${storeName}首頁 1.1`;
            }
        }
        // Find the matching path from our config file. This handles dynamic paths like /:memberId
        const matchedPath = Object.keys(pageTitles).find(path =>
            matchPath({ path, end: true }, currentPath)
        );

        if (matchedPath && userRole) {
            const titleMapping = pageTitles[matchedPath];
            return titleMapping[userRole]; // Return 'branch' or 'main_office' title
        }

        return '全崴國際管理系統'; // Fallback title
    };

    return (
        // Your original, correct header structure
        <header className="d-flex justify-content-between align-items-center bg-info px-4 py-3 app-header">
            <h1 className="text-white fw-bold fs-2 m-0">{title || getDynamicTitle()}</h1>
            <div className="d-flex gap-3">
                <IconButton.HomeButton onClick={() => navigate("/home")} />
                <IconButton.CloseButton onClick={() => navigate(-1)} />
            </div>
        </header>
    );
};

export default Header;