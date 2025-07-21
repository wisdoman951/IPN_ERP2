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
export const addInventoryItem = async (data: any) => {
    return axios.post(`${API_URL}/add`, data);
};

export const getInventoryRecords = async (params?: {
    storeId?: number;
    start_date?: string;
    end_date?: string;
}) => {
    const level = localStorage.getItem('store_level');
    const perm = localStorage.getItem('permission');
    const isAdmin = level === '總店' || perm === 'admin';

    const query: any = {};
    if (params?.start_date) query.start_date = params.start_date;
    if (params?.end_date) query.end_date = params.end_date;
    if (!isAdmin && params?.storeId !== undefined) {
        query.store_id = params.storeId;
    } else if (isAdmin && params?.storeId !== undefined) {
        query.store_id = params.storeId;
    }

    const response = await axios.get(`${API_URL}/records`, { params: query });
    return response.data;
};

// 更新庫存記錄
export interface UpdateInventoryPayload {
    quantity?: number;
    stock_in?: number;
    stock_out?: number;
    stock_loan?: number;
    stock_threshold?: number;
    store_id?: number;
    staff_id?: number;
    date?: string;
}

export const updateInventoryItem = async (
    id: number,
    data: UpdateInventoryPayload
) => {
    return axios.put(`${API_URL}/update/${id}`, data);
};

// 更新單一庫存記錄的預警門檻
export const updateInventoryThreshold = async (id: number, threshold: number) => {
    return axios.put(`${API_URL}/update/${id}`, { stock_threshold: threshold });
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
export const exportInventory = async (storeId?: number): Promise<Blob> => {
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

    return response.data;
};