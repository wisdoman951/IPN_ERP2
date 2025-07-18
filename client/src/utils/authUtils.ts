// File: src/services/authUtils.ts (最終正確版本 - 使用 permission)

import { jwtDecode } from 'jwt-decode';
import axios from 'axios';

export const setupAxiosInterceptors = () => {
    axios.interceptors.request.use(config => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    });
};

// **修改後的 setUserRole**
export const setUserRole = (token: string): void => {
    try {
        // 解碼 Token，並告知 TypeScript permission 的類型是 string
        const decoded: { permission: string } = jwtDecode(token);
        
        // **核心改動**：直接使用 permission 的值 ('admin' 或 'basic') 作為角色
        const role = decoded.permission; 
        
        if (role) {
            localStorage.setItem('userRole', role);
            console.log(`User role set based on permission: ${role}`); // 新增日誌
        } else {
            console.error('permission not found in token!');
        }
    } catch (error) {
        console.error('Failed to set user role from permission:', error);
    }
};

// **修改後的 getUserRole**
export const getUserRole = (): 'admin' | 'basic' | null => {
    // 返回 'admin', 'basic', 或 null
    return localStorage.getItem('userRole') as 'admin' | 'basic' | null;
};

// 登出函式
export const logout = (): void => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
};

/**
 * 新增：從 localStorage 取得商店名稱
 * @returns 商店名稱字串，或 null
 */
export const getStoreName = (): string | null => {
    return localStorage.getItem('store_name');
};