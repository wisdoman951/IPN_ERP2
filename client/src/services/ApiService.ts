import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { base_url } from './BASE_URL';
import { getAuthHeaders, isLoggedIn } from './AuthUtils';

// 統一的 API 服務基礎 URL
const API_BASE_URL = base_url;

// 標準請求頭
const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Origin': 'http://localhost:5173'
};

/**
 * 建立一個帶有認證信息的請求配置
 * @param config 原始請求配置
 * @returns 帶有認證信息的請求配置
 */
const createAuthConfig = (config: AxiosRequestConfig = {}): AxiosRequestConfig => {
  // 合併標準頭和認證頭
  const headers = {
    ...DEFAULT_HEADERS,
    ...(config.headers || {}),
    ...getAuthHeaders()
  };

  return {
    ...config,
    headers
  };
};

/**
 * 發送 GET 請求
 * @param endpoint API 端點
 * @param config 請求配置
 * @returns Promise 返回請求結果
 */
export const get = async <T>(endpoint: string, config: AxiosRequestConfig = {}): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint}`;
  const authConfig = createAuthConfig(config);
  
  try {
    const response: AxiosResponse<T> = await axios.get(url, authConfig);
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

/**
 * 發送 POST 請求
 * @param endpoint API 端點
 * @param data 請求數據
 * @param config 請求配置
 * @returns Promise 返回請求結果
 */
export const post = async <T>(endpoint: string, data: any, config: AxiosRequestConfig = {}): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint}`;
  const authConfig = createAuthConfig(config);
  
  try {
    const response: AxiosResponse<T> = await axios.post(url, data, authConfig);
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

/**
 * 發送 PUT 請求
 * @param endpoint API 端點
 * @param data 請求數據
 * @param config 請求配置
 * @returns Promise 返回請求結果
 */
export const put = async <T>(endpoint: string, data: any, config: AxiosRequestConfig = {}): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint}`;
  const authConfig = createAuthConfig(config);
  
  try {
    const response: AxiosResponse<T> = await axios.put(url, data, authConfig);
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

/**
 * 發送 DELETE 請求
 * @param endpoint API 端點
 * @param config 請求配置
 * @returns Promise 返回請求結果
 */
export const del = async <T>(endpoint: string, config: AxiosRequestConfig = {}): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint}`;
  const authConfig = createAuthConfig(config);
  
  try {
    const response: AxiosResponse<T> = await axios.delete(url, authConfig);
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

/**
 * 處理 API 錯誤
 * @param error 錯誤對象
 */
const handleApiError = (error: any): void => {
  if (axios.isAxiosError(error)) {
    // 處理未授權錯誤（可能是令牌過期）
    if (error.response?.status === 401 && isLoggedIn()) {
      // 令牌過期或無效，需要重新登入
      // 可以在這裡添加重定向到登入頁面的邏輯
      window.location.href = '/login';
    }
    
    // 在控制台輸出錯誤詳情（開發環境）
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.error('API 錯誤:', {
        url: error.config?.url,
        status: error.response?.status,
        data: error.response?.data
      });
    }
  }
}; 