//client/src/services/LoginService.ts
import axios from 'axios';
import { base_url } from './BASE_URL';
import { setUserRole } from '../utils/authUtils';

// API URL for login endpoints - 確保沒有尾部斜杠
const API_URL = `${base_url}/login`;

// 設置 axios 默認請求頭
axios.defaults.headers.common['Content-Type'] = 'application/json';
axios.defaults.withCredentials = false;  // 不發送 cookies

// 定義通用請求頭
const HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

// 添加請求攔截器，用於調試與確保標頭正確
axios.interceptors.request.use(
  (config) => {
    // 確保每個請求都有正確的 Content-Type
    if (!config.headers['Content-Type'] && config.method !== 'options') {
      config.headers['Content-Type'] = 'application/json';
    }
    
    if (window.location.hostname === 'localhost') {
      console.log(`發送請求到: ${config.url}`, config);
    }
    return config;
  }, 
  (error) => {
    return Promise.reject(error);
  }
);

// 添加響應攔截器，用於調試
axios.interceptors.response.use(
  (response) => {
    if (window.location.hostname === 'localhost') {
      console.log(`收到響應:`, response);
    }
    return response;
  },
  (error) => {
    if (window.location.hostname === 'localhost') {
      console.error(`請求錯誤:`, error);
    }
    return Promise.reject(error);
  }
);

export interface Store {
  store_id: string | number;
  store_name: string;
  store_level: "總店" | "分店";
  store_location?: string;
  permission?: string;
}

export interface LoginResponse {
  token: string;
  store_id: string | number;
  store_level: "總店" | "分店";
  store_name: string;
  permission: string;
  message?: string;
}


export interface AuthStatus {
  authenticated: boolean;
  store_id?: string | number;
  store_level?: "總店" | "分店";
  store_name?: string;
  permission?: string;
  error?: string;
}

/**
 * 用戶登入
 * @param account - 帳號
 * @param password - 密碼
 * @returns 登入結果，包含商店資訊與令牌
 */
export const login = async (account: string, password: string): Promise<LoginResponse> => {
  const url = `${API_URL}`;
  
  console.log(`嘗試登入: ${url}`);
  
  try {
    const response = await axios.post(
      url,
      JSON.stringify({ account, password }),
      { 
        headers: {
          'Content-Type': 'application/json' 
        }
      }
    );
    
    const data = response.data;
  if (data.token) {
    // --- 核心修改區域 ---
    // 2. 在您原本儲存 token 的邏輯後面，加上這一行
      localStorage.setItem('token', data.token);
      setUserRole(data.token); // <--- 就是這一行！它會讀取 token 並設定 'userRole'

      // 儲存當前登入帳號以便撤銷時確認
      localStorage.setItem('account', account);

      // 您原本的儲存邏輯，完全保留
      localStorage.setItem('store_id', data.store_id.toString());
      localStorage.setItem('store_level', data.store_level);
      localStorage.setItem('store_name', data.store_name);
     localStorage.setItem('permission', data.permission);

     const storeInfo = {
       store_id: data.store_id,
       store_name: data.store_name,
       store_level: data.store_level,
       permission: data.permission
     };
     localStorage.setItem('store_info', JSON.stringify(storeInfo));

    // 清除與銷售單相關的暫存資料，避免跨店賬號間的残留
    localStorage.removeItem('productSellFormState');
    localStorage.removeItem('selectedProducts');
    localStorage.removeItem('addTherapySellFormState');
    localStorage.removeItem('selectedTherapyPackages');
    localStorage.removeItem('selectedTherapyPackagesWithSessions');
    localStorage.removeItem('selectedSalesOrderItems');
    localStorage.removeItem('preSaleData');
      // --- 修改結束 ---
   }
    
    return data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('登入錯誤詳情:', error.response?.status, error.response?.data);
      // 處理特定錯誤狀態碼
      if (error.response?.status === 401) {
        throw new Error('密碼錯誤');
      } else if (error.response?.status === 404) {
        throw new Error('查無此帳號');
      } else if (error.response?.status === 415) {
        throw new Error('媒體類型錯誤，請確認請求格式');
      } else if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
    }
    throw error;
  }
};

/**
 * 登出
 */
export const logout = (): void => {
  localStorage.removeItem('token');
  localStorage.removeItem('store_id');
  localStorage.removeItem('store_level');
  localStorage.removeItem('store_name');
  localStorage.removeItem('permission');
  localStorage.removeItem('store_info');
  localStorage.removeItem('userRole');
  localStorage.removeItem('account');

  // 清除可能存在的其他相關項目
  console.log('已登出系統');
};

/**
 * 發送忘記密碼請求
 * @param account 使用者帳號
 * @returns Promise
 */
export const forgotPassword = async (account: string): Promise<{ message: string }> => {
  try {
    const response = await axios.post(`${API_URL}/forgot-password`, { account }, { headers: HEADERS });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data?.error || '忘記密碼請求失敗');
    }
    throw error;
  }
};

/**
 * 刷新 JWT 令牌
 * @returns 新的令牌與用戶資訊
 */
export const refreshToken = async (): Promise<LoginResponse> => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No token found');
  }
  
  try {
    const authHeaders = { ...HEADERS, 'Authorization': `Bearer ${token}` };
    
    const response = await axios.post(`${API_URL}/refresh-token`, {}, {
      headers: authHeaders
    });
    
    // 更新 localStorage 中的令牌
    const data = response.data;
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('store_id', data.store_id.toString());
      localStorage.setItem('store_level', data.store_level);
      localStorage.setItem('store_name', data.store_name);
      localStorage.setItem('permission', data.permission);
      
      // 更新店鋪信息
      const storeInfo = {
        store_id: data.store_id,
        store_name: data.store_name,
        store_level: data.store_level,
        permission: data.permission
      };
      localStorage.setItem('store_info', JSON.stringify(storeInfo));
    }
    
    return data;
  } catch (error) {
    // 如果刷新令牌失敗，清除本地存儲的認證信息
    logout();
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data?.error || '令牌刷新失敗');
    }
    throw error;
  }
};

/**
 * 獲取所有商店
 * @returns 所有商店列表
 */
export const getAllStores = async (): Promise<Store[]> => {
  try {
    const response = await axios.get(`${API_URL}/stores`, { headers: HEADERS });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data?.error || '獲取商店列表失敗');
    }
    throw error;
  }
};

/**
 * 檢查用戶身份認證狀態
 * @returns 認證狀態與商店信息
 */
export const checkAuthStatus = async (): Promise<AuthStatus> => {
  const token = localStorage.getItem('token');
  if (!token) {
    return { authenticated: false };
  }

  try {
    const response = await axios.get(`${API_URL}/check`, {
      headers: {
        ...HEADERS,
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    // 如果令牌無效，清除本地存儲的認證信息
    logout();
    return { 
      authenticated: false,
      error: axios.isAxiosError(error) && error.response?.data?.error 
        ? error.response.data.error 
        : '認證失敗'
    };
  }
};

/**
 * 檢查用戶是否已登入
 * @returns 是否已登入
 */
export const isLoggedIn = (): boolean => {
  return !!localStorage.getItem('token');
};

/**
 * 取得目前商店級別
 * @returns 商店級別 (總店或分店)
 */
export const getStoreLevel = (): "總店" | "分店" | null => {
  const level = localStorage.getItem('store_level');
  return (level === "總店" || level === "分店") ? level : null;
};

/**
 * 取得目前商店ID
 * @returns 商店ID
 */
export const getStoreId = (): string | null => {
  return localStorage.getItem('store_id');
};

/**
 * 取得目前商店名稱
 * @returns 商店名稱
 */
export const getStoreName = (): string | null => {
  return localStorage.getItem('store_name');
};

/**
 * 檢查是否擁有管理員權限
 * @returns 是否為管理員
 */
export const isAdmin = (): boolean => {
  return localStorage.getItem('store_level') === "總店";
};

/**
 * 取得權限級別
 * @returns 權限字串
 */
export const getPermission = (): string | null => {
  return localStorage.getItem('permission');
}; 