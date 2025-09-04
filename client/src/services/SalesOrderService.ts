// client/src/services/SalesOrderService.ts (新檔案)
import axios from 'axios';
import { base_url } from './BASE_URL';

const API_URL = `${base_url}/sales-orders`;

// 單個銷售項目的型別
export interface SalesOrderItemData {
    product_id?: number | null;
    therapy_id?: number | null;
    item_description: string;
    item_type: 'Product' | 'Therapy' | 'ProductBundle' | 'TherapyBundle';
    item_code?: string;
    unit: string;
    unit_price: number;
    quantity: number;
    subtotal: number;
    category?: string;
    note?: string;
}

// 提交到後端的銷售單主體型別
export interface SalesOrderPayload {
    order_number?: string;
    order_date: string;
    member_id?: number | null;
    staff_id?: number | null;
    store_id: number;
    subtotal: number;
    total_discount: number;
    grand_total: number;
    sale_category?: string;
    note?: string;
    items: SalesOrderItemData[];
}

interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export const addSalesOrder = async (orderData: SalesOrderPayload): Promise<ApiResponse<any>> => {
    try {
        const response = await axios.post(API_URL, orderData);
        return response.data;
    } catch (error: any) {
        console.error("新增銷售單失敗:", error.response?.data || error.message);
        throw error.response?.data || new Error("新增銷售單時發生未知錯誤");
    }
};

export const updateSalesOrder = async (orderId: number, orderData: SalesOrderPayload): Promise<ApiResponse<any>> => {
    try {
        const response = await axios.put(`${API_URL}/${orderId}`, orderData);
        return response.data;
    } catch (error: any) {
        console.error("更新銷售單失敗:", error.response?.data || error.message);
        throw error.response?.data || new Error("更新銷售單時發生未知錯誤");
    }
};

// ***** 新增：銷售單列表行的型別 *****
export interface SalesOrderListRow {
    order_id: number;
    order_number: string;
    order_date: string;
    member_name: string;
    staff_name: string;
    grand_total: number;
    note?: string;
}

// ***** 新增：獲取銷售單列表的服務函數 *****
export const getSalesOrders = async (keyword?: string): Promise<SalesOrderListRow[]> => {
    try {
        const response = await axios.get(API_URL, {
            params: { keyword: keyword || undefined }
        });
        // 假設 API 成功時直接返回陣列
        return Array.isArray(response.data) ? response.data : [];
    } catch (error: any) {
        console.error("獲取銷售單列表失敗:", error.response?.data || error.message);
        throw new Error(error.response?.data?.error || "無法獲取銷售單列表");
    }
};

// ***** 新增：刪除銷售單的服務函數 *****
export const deleteSalesOrders = async (ids: number[]): Promise<{success: boolean, message?: string, error?: string}> => {
    try {
        const response = await axios.post(`${API_URL}/delete`, { ids });
        return response.data;
    } catch (error: any) {
        console.error("刪除銷售單失敗:", error.response?.data || error.message);
        throw new Error(error.response?.data?.error || "刪除銷售單時發生錯誤");
    }
};

export const exportSalesOrders = async (): Promise<Blob> => {
    const response = await axios.get(`${API_URL}/export`, { responseType: 'blob' });
    return response.data;
};

export const exportSelectedSalesOrders = async (ids: number[]): Promise<Blob> => {
    const response = await axios.post(`${API_URL}/export-selected`, { ids }, { responseType: 'blob' });
    return response.data;
};
export interface SalesOrderDetail {
    order_id: number;
    order_number: string;
    order_date: string;
    member_id: number | null;
    staff_id: number | null;
    store_id: number;
    subtotal: number;
    total_discount: number;
    grand_total: number;
    sale_category?: string;
    note?: string;
    items: SalesOrderItemData[];
}

export const getSalesOrderById = async (orderId: number): Promise<SalesOrderDetail> => {
    try {
        const response = await axios.get(`${API_URL}/${orderId}`);
        return response.data;
    } catch (error: any) {
        console.error(`獲取銷售單 ${orderId} 失敗:`, error.response?.data || error.message);
        throw new Error(error.response?.data?.error || '無法獲取銷售單');
    }
};
