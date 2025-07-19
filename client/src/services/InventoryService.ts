import axios from "axios";
import { base_url } from "./BASE_URL";

const API_URL = `${base_url}/inventory`;

// 獲取所有庫存記錄
export const getAllInventory = async (storeId?: number) => {
    const level = localStorage.getItem('store_level');
    const perm = localStorage.getItem('permission');
    const isAdmin = level === '總店' || perm === 'admin';

    const params: any = {};
    if (!isAdmin && storeId !== undefined) {
        params.store_id = storeId;
    } else if (isAdmin && storeId !== undefined) {
        params.store_id = storeId; // allow admin specify store
    }

    const response = await axios.get(`${API_URL}/list`, { params });
    return response.data;
};

// 搜尋庫存記錄
export const searchInventory = async (keyword: string, storeId?: number) => {
    const level = localStorage.getItem('store_level');
    const perm = localStorage.getItem('permission');
    const isAdmin = level === '總店' || perm === 'admin';

    const params: any = { keyword };
    if (!isAdmin && storeId !== undefined) {
        params.store_id = storeId;
    } else if (isAdmin && storeId !== undefined) {
        params.store_id = storeId;
    }

    const response = await axios.get(`${API_URL}/search`, { params });
    return response.data;
};

// 獲取庫存記錄詳情
export const getInventoryById = async (id: number) => {
    const response = await axios.get(`${API_URL}/${id}`);
    return response.data;
};

// 新增庫存記錄
export const addInventoryItem = async (data: {
    productId: number;
    stockIn: number;
    stockInTime: string;
    stockQuantity: number;
    stockThreshold: number;
    stockOut?: number;
    stockLoan?: number;
    borrower?: string;
}) => {
    return axios.post(`${API_URL}/add`, data);
};

// 更新庫存記錄
export const updateInventoryItem = async (
    id: number,
    data: {
        stockIn: number;
        stockInTime: string;
        stockOut: number;
        stockLoan: number;
        borrower: string;
        stockQuantity: number;
        stockThreshold: number;
    }
) => {
    return axios.put(`${API_URL}/update/${id}`, data);
};

// 刪除庫存記錄
export const deleteInventoryItem = async (id: number) => {
    return axios.delete(`${API_URL}/delete/${id}`);
};

// 獲取低庫存產品
export const getLowStockItems = async (storeId?: number) => {
    const level = localStorage.getItem('store_level');
    const perm = localStorage.getItem('permission');
    const isAdmin = level === '總店' || perm === 'admin';

    const params: any = {};
    if (!isAdmin && storeId !== undefined) {
        params.store_id = storeId;
    } else if (isAdmin && storeId !== undefined) {
        params.store_id = storeId;
    }

    const response = await axios.get(`${API_URL}/low-stock`, { params });
    return response.data;
};

// 獲取所有產品(用於新增庫存)
export const getAllProducts = async () => {
    const response = await axios.get(`${API_URL}/products`);
    return response.data;
};

// 匯出庫存數據
export const exportInventory = async (storeId?: number) => {
    const level = localStorage.getItem('store_level');
    const perm = localStorage.getItem('permission');
    const isAdmin = level === '總店' || perm === 'admin';

    const params: any = {};
    if (!isAdmin && storeId !== undefined) {
        params.store_id = storeId;
    } else if (isAdmin && storeId !== undefined) {
        params.store_id = storeId;
    }

    const response = await axios.get(`${API_URL}/export`, {
        params,
        responseType: "blob"
    });
    
    // 處理下載
    const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute("download", `庫存報表_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}; 