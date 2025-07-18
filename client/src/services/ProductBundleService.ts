import axios from "axios";
import { base_url } from "./BASE_URL";

const API_URL = `${base_url}/product-bundles`;
const API_URL_PRODUCTS = `${base_url}/product-sell`;
const API_URL_THERAPIES = `${base_url}/therapy`;

// 標準的 getAuthHeaders 函式
const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return {
        headers: {
            Authorization: `Bearer ${token}`,
            "X-Store-ID": "1",
            "X-Store-Level": "admin"
        }
    };
};

// -------------------- 型別定義 --------------------
export interface Bundle {
    bundle_id: number;
    bundle_code: string;
    name: string;
    selling_price: number;
    bundle_contents: string;
    created_at: string;
}

export interface BundleDetails extends Bundle {
    items: {
        item_id: number;
        item_type: 'Product' | 'Therapy';
    }[];
}

export interface Product {
    product_id: number;
    product_name: string;
    product_price: number;
}

export interface Therapy {
    therapy_id: number;
    name: string;
    price: number;
}


// -------------------- API 呼叫函式 --------------------

/**
 * 獲取所有產品組合列表
 */
export const fetchAllBundles = async (): Promise<Bundle[]> => {
    try {
        const response = await axios.get(`${API_URL}/`, getAuthHeaders());
        return response.data;
    } catch (error) {
        console.error("獲取產品組合列表失敗:", error);
        throw error;
    }
};

/**
 * 新增一個產品組合
 */
export const createBundle = async (payload: any) => {
    try {
        const response = await axios.post(`${API_URL}/`, payload, getAuthHeaders());
        return response.data;
    } catch (error) {
        console.error("新增組合失敗:", error);
        throw error;
    }
};

/**
 * 獲取單一組合的詳細資料，用於編輯
 */
export const getBundleDetails = async (bundleId: number): Promise<BundleDetails> => {
    try {
        const response = await axios.get(`${API_URL}/${bundleId}`, getAuthHeaders());
        return response.data;
    } catch (error) {
        console.error("獲取組合詳情失敗:", error);
        throw error;
    }
};

/**
 * 更新一個現有的產品組合
 */
export const updateBundle = async (bundleId: number, payload: any) => {
    try {
        const response = await axios.put(`${API_URL}/${bundleId}`, payload, getAuthHeaders());
        return response.data;
    } catch (error) {
        console.error("更新組合失敗:", error);
        throw error;
    }
};

/**
 * 刪除一個產品組合
 */
export const deleteBundle = async (bundleId: number) => {
    try {
        const response = await axios.delete(`${API_URL}/${bundleId}`, getAuthHeaders());
        return response.data;
    } catch (error) {
        console.error("刪除組合失敗:", error);
        throw error;
    }
};

/**
 * 獲取所有產品，用於下拉選單
 */
export const fetchProductsForDropdown = async (): Promise<Product[]> => {
    try {
        const response = await axios.get(`${API_URL_PRODUCTS}/products`, getAuthHeaders());
        return response.data;
    } catch(error) {
        console.error("Service: 獲取產品下拉選單失敗:", error);
        throw error;
    }
};

/**
 * 獲取所有療程，用於下拉選單
 */
export const fetchTherapiesForDropdown = async (): Promise<Therapy[]> => {
    try {
        const response = await axios.get(`${API_URL_THERAPIES}/for-dropdown`, getAuthHeaders());
        return response.data;
    } catch(error) {
        console.error("Service: 獲取療程下拉選單失敗:", error);
        throw error;
    }
};
