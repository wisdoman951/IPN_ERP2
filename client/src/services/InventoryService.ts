import axios from "axios";
import { base_url } from "./BASE_URL";

const API_URL = `${base_url}/inventory`;

// 取得後端回傳的陣列資料
const extractArray = (data: any) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    return [];
};

export interface MasterProductInboundItem {
    master_product_id: number;
    master_product_code: string;
    name: string;
    status: string;
    quantity_on_hand: number;
    cost_price?: number | null;
}

export interface MasterProductCostRow {
    master_product_id: number;
    master_product_code: string;
    name: string;
    direct_cost_price?: number | null;
    franchise_cost_price?: number | null;
}

export interface MasterStockSummaryItem {
    master_product_id: number;
    master_product_code: string;
    name: string;
    status: string;
    quantity_on_hand: number;
    updated_at?: string;
    store_id?: number;
    store_name?: string;
}

export interface MasterVariantItem {
    variant_id: number;
    variant_code: string;
    display_name: string;
    sale_price?: number | null;
    status?: string;
}

export interface MasterStockInboundPayload {
    master_product_id: number;
    quantity: number;
    store_id?: number;
    staff_id?: number;
    reference_no?: string;
    note?: string;
}

// 獲取所有庫存記錄
export const getAllInventory = async (storeId?: number) => {
    const params: any = {};
    if (storeId !== undefined) {
        params.store_id = storeId;
    }

    const response = await axios.get(`${API_URL}/list`, { params });
    return extractArray(response.data);
};

// 搜尋庫存記錄
export const searchInventory = async (keyword: string, storeId?: number) => {
    const params: any = { keyword };
    if (storeId !== undefined) {
        params.store_id = storeId;
    }

    const response = await axios.get(`${API_URL}/search`, { params });
    return extractArray(response.data);
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
    sale_staff?: string;
    buyer?: string;
    productId?: number;
    masterProductId?: number;
}) => {
    const query: any = {};
    if (params?.start_date) query.start_date = params.start_date;
    if (params?.end_date) query.end_date = params.end_date;
    if (params?.sale_staff) query.sale_staff = params.sale_staff;
    if (params?.buyer) query.buyer = params.buyer;
    if (params?.productId) query.product_id = params.productId;
    if (params?.masterProductId) query.master_product_id = params.masterProductId;
    if (params?.storeId !== undefined) {
        query.store_id = params.storeId;
    }

    const response = await axios.get(`${API_URL}/records`, { params: query });
    return extractArray(response.data);
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
    supplier?: string;
    buyer?: string;
    voucher?: string;
    note?: string;
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
    const params: any = {};
    if (storeId !== undefined) {
        params.store_id = storeId;
    }

    const response = await axios.get(`${API_URL}/low-stock`, { params });
    return extractArray(response.data);
};

// 獲取所有產品(用於新增庫存)
export const getAllProducts = async () => {
    const response = await axios.get(`${API_URL}/products`);
    return extractArray(response.data);
};

// 主商品（進貨用）
export const getMasterProductsForInbound = async (keyword?: string) => {
    const params = keyword ? { q: keyword } : undefined;
    const response = await axios.get(`${API_URL}/master/products`, { params });
    return extractArray(response.data) as MasterProductInboundItem[];
};

export const createMasterStockInbound = async (payload: MasterStockInboundPayload) => {
    return axios.post(`${API_URL}/master/inbound`, payload);
};

export const getMasterProductCosts = async (params?: { keyword?: string; master_product_id?: number }) => {
    const query: any = {};
    if (params?.keyword) query.q = params.keyword;
    if (params?.master_product_id) query.master_product_id = params.master_product_id;
    const response = await axios.get(`${API_URL}/master/prices`, { params: query });
    return extractArray(response.data) as MasterProductCostRow[];
};

export const updateMasterProductCost = async (payload: {
    master_product_id: number;
    cost_price: number;
    store_type?: "DIRECT" | "FRANCHISE";
}) => {
    return axios.post(`${API_URL}/master/prices`, payload);
};

export const getMasterStockSummary = async (params?: { keyword?: string; storeId?: number }) => {
    const query: any = {};
    if (params?.keyword) query.q = params.keyword;
    if (params?.storeId) query.store_id = params.storeId;
    const response = await axios.get(`${API_URL}/master/summary`, { params: query });
    return extractArray(response.data) as MasterStockSummaryItem[];
};

export const getMasterVariants = async (masterProductId: number) => {
    const response = await axios.get(`${API_URL}/master/${masterProductId}/variants`);
    return extractArray(response.data) as MasterVariantItem[];
};

// 匯出庫存數據
export const exportInventory = async (params?: {
    storeId?: number;
    start_date?: string;
    end_date?: string;
    sale_staff?: string;
    buyer?: string;
    detail?: boolean;
    productId?: number;
    masterProductId?: number;
}): Promise<Blob> => {
    const query: any = {};
    if (params?.start_date) query.start_date = params.start_date;
    if (params?.end_date) query.end_date = params.end_date;
    if (params?.sale_staff) query.sale_staff = params.sale_staff;
    if (params?.buyer) query.buyer = params.buyer;
    if (params?.detail) query.detail = params.detail;
    if (params?.productId) query.product_id = params.productId;
    if (params?.masterProductId) query.master_product_id = params.masterProductId;
    if (params?.storeId !== undefined) {
        query.store_id = params.storeId;
    }

    const response = await axios.get(`${API_URL}/export`, {
        params: query,
        responseType: "blob"
    });

    return response.data;
};
