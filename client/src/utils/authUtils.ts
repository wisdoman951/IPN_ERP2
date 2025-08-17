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

// **設定使用者角色**
export const setUserRole = (token: string): void => {
    try {
        // Token 中會包含使用者的 permission 欄位
        const decoded: { permission: string } = jwtDecode(token);
        const role = decoded.permission; // 可能是 'admin'、'basic' 或 'therapist'

        if (role) {
            localStorage.setItem('userRole', role);
            console.log(`User role set based on permission: ${role}`);
        } else {
            console.error('permission not found in token!');
        }
    } catch (error) {
        console.error('Failed to set user role from permission:', error);
    }
};

// **取得使用者角色**
export const getUserRole = (): 'admin' | 'basic' | 'therapist' | null => {
    // 可能的角色：'admin'、'basic'、'therapist'
    return localStorage.getItem('userRole') as 'admin' | 'basic' | 'therapist' | null;
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

/**
 * 依據商店等級格式化商店名稱
 * 若為總店則顯示為「總部」
 * @param name 原始商店名稱
 * @param level 商店等級
 * @returns 格式化後的商店名稱
 */
export const formatStoreName = (name: string, level?: string | null): string => {
    if (level === '總店') {
        return '總部';
    }
    return name;
};

/**
 * 從 localStorage 取得並格式化商店名稱
 * @returns 格式化後的商店名稱或 null
 */
export const getDisplayStoreName = (): string | null => {
    const name = localStorage.getItem('store_name');
    if (!name) return null;
    const level = localStorage.getItem('store_level');
    return formatStoreName(name, level);
};