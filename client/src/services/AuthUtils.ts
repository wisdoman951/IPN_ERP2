import { getStoreId as getStoreIdFromLogin, getStoreLevel as getStoreLevelFromLogin, isAdmin, refreshToken, logout } from './LoginService';
import axios from 'axios';

/**
 * 檢查用戶是否已登入
 * @returns 是否已登入
 */
export const isLoggedIn = (): boolean => {
  return !!localStorage.getItem('token');
};

/**
 * 取得用戶授權等級
 * @returns 用戶授權等級
 */
export const getAuthLevel = (): 'admin' | 'basic' | null => {
  return isAdmin() ? 'admin' : isLoggedIn() ? 'basic' : null;
};

/**
 * 檢查是否為總店
 * @returns 是否為總店
 */
export const isHeadquarters = (): boolean => {
  const storeLevel = getStoreLevelFromLogin();
  return storeLevel === '總店';
};

/**
 * 檢查是否為分店
 * @returns 是否為分店
 */
export const isBranch = (): boolean => {
  const storeLevel = getStoreLevelFromLogin();
  return storeLevel === '分店';
};

/**
 * 檢查用戶是否有特定權限
 * @param requiredLevel 需要的權限等級
 * @returns 是否有權限
 */
export const hasPermission = (requiredLevel: 'admin' | 'basic'): boolean => {
  const currentLevel = getAuthLevel();
  
  if (!currentLevel) return false;
  
  if (requiredLevel === 'admin') {
    return currentLevel === 'admin';
  }
  
  return true; // basic permissions for any authenticated user
};

/**
 * 獲取授權標頭
 * @returns 授權標頭物件
 */
export const getAuthHeaders = (): { Authorization: string } | {} => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * 獲取當前登入店鋪的 ID
 * @returns 店鋪 ID 或 null（如果未登入）
 */
export const getStoreId = (): string | null => {
  return getStoreIdFromLogin();
};

/**
 * 獲取當前登入店鋪的等級（總店/分店）
 * @returns 店鋪等級或 null（如果未登入）
 */
export const getStoreLevel = (): string | null => {
  return getStoreLevelFromLogin();
};

/**
 * 獲取當前登入店鋪的名稱
 * @returns 店鋪名稱或 null（如果未登入）
 */
export const getStoreName = (): string | null => {
  return localStorage.getItem('store_name');
};

/**
 * 設置 axios 請求的認證標頭
 * @param headers 請求頭對象
 * @returns 添加了認證信息的請求頭對象
 */
export const setAuthHeaders = (headers: Record<string, string> = {}): Record<string, string> => {
  const token = localStorage.getItem('token');
  if (token) {
    return {
      ...headers,
      'Authorization': `Bearer ${token}`
    };
  }
  return headers;
};

/**
 * 嘗試刷新令牌的函數
 * 可用於處理令牌過期的情況
 * @returns 是否成功刷新令牌
 */
export const tryRefreshToken = async (): Promise<boolean> => {
  try {
    await refreshToken();
    return true;
  } catch (error) {
    console.error('令牌刷新失敗:', error);
    return false;
  }
};

/**
 * 設置 Axios 攔截器
 * 用於自動添加認證標頭和處理過期令牌
 */
export const setupAxiosInterceptors = (): void => {
  // 請求攔截器 - 添加認證標頭
  axios.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // 響應攔截器 - 處理過期令牌
  axios.interceptors.response.use(
    (response) => {
      return response;
    },
    async (error) => {
      const originalRequest = error.config;
      
      // 如果是 401 錯誤且未嘗試過刷新令牌，嘗試刷新令牌
      if (error.response?.status === 401 && !originalRequest._retry && isLoggedIn()) {
        originalRequest._retry = true;
        try {
          // 嘗試刷新令牌
          await refreshToken();
          
          // 更新請求中的令牌
          const token = localStorage.getItem('token');
          if (token) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          
          // 重新發送原始請求
          return axios(originalRequest);
        } catch (refreshError) {
          // 如果刷新令牌失敗，登出用戶
          console.error('令牌刷新失敗，需要重新登入', refreshError);
          logout();
          
          // 重定向到登入頁面
          window.location.href = '/';
          return Promise.reject(refreshError);
        }
      }
      
      return Promise.reject(error);
    }
  );
}; 