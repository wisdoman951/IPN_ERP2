import axios from "axios";
import { base_url } from "./BASE_URL";
import { getAuthHeaders as getTokenHeaders } from "./AuthUtils";
import { ViewerRole } from "../types/viewerRole";

const API_URL = `${base_url}/product-bundles`;
const API_URL_PRODUCTS = `${base_url}/product-sell`;
const API_URL_THERAPIES = `${base_url}/therapy`;

// 管理端使用的授權標頭
const getAdminHeaders = () => {
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
    visible_store_ids?: number[];
    categories?: string[];
    visible_permissions?: ViewerRole[];
}

export interface BundleDetails extends Bundle {
    items: {
        item_id: number;
        item_type: 'Product' | 'Therapy';
        quantity: number;
    }[];
    category_ids?: number[];
}

export interface Product {
    product_id: number;
    product_name: string;
    product_price: number;
    product_code: string;
    purchase_price?: number | string | null;
    visible_store_ids?: number[];
    categories?: string[];
    visible_permissions?: ViewerRole[];
}

export interface Therapy {
    therapy_id: number;
    name: string;
    price: number;
    code: string;
    content?: string;
    visible_store_ids?: number[];
    categories?: string[];
    visible_permissions?: ViewerRole[];
}


// -------------------- API 呼叫函式 --------------------

/**
 * 獲取所有產品組合列表
 */
export const fetchAllBundles = async (status: string = 'PUBLISHED'): Promise<Bundle[]> => {
    try {
        const response = await axios.get(`${API_URL}/`, {
            ...getAdminHeaders(),
            params: { status }
        });
        return response.data;
    } catch (error) {
        console.error("獲取產品組合列表失敗:", error);
        throw error;
    }
};

/**
 * 新增一個產品組合
 */
export const createBundle = async (payload: unknown) => {
    try {
        const response = await axios.post(`${API_URL}/`, payload, getAdminHeaders());
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
        const response = await axios.get(`${API_URL}/${bundleId}`, getAdminHeaders());
        return response.data;
    } catch (error) {
        console.error("獲取組合詳情失敗:", error);
        throw error;
    }
};

/**
 * 更新一個現有的產品組合
 */
export const updateBundle = async (bundleId: number, payload: unknown) => {
    try {
        const response = await axios.put(`${API_URL}/${bundleId}`, payload, getAdminHeaders());
        return response.data;
    } catch (error) {
        console.error("更新組合失敗:", error);
        throw error;
    }
};

/**
 * 刪除一個產品組合
 */
export const deleteBundle = async (bundleId: number, account: string) => {
    try {
        const response = await axios.delete(`${API_URL}/${bundleId}`, {
            ...getAdminHeaders(),
            params: { deleted_by: account }
        });
        return response.data;
    } catch (error) {
        console.error("刪除組合失敗:", error);
        throw error;
    }
};

/**
 * 獲取所有產品，用於下拉選單
 */
export const fetchProductsForDropdown = async (status: string = 'PUBLISHED'): Promise<Product[]> => {
    try {
        const response = await axios.get(`${API_URL_PRODUCTS}/products`, {
            ...getAdminHeaders(),
            params: { status }
        });
        return response.data;
    } catch(error) {
        console.error("Service: 獲取產品下拉選單失敗:", error);
        throw error;
    }
};

/**
 * 獲取所有療程，用於下拉選單
 */
export const fetchTherapiesForDropdown = async (status: string = 'PUBLISHED'): Promise<Therapy[]> => {
    try {
        const response = await axios.get(`${API_URL_THERAPIES}/for-dropdown`, {
            ...getAdminHeaders(),
            params: { status }
        });
        return response.data;
    } catch(error) {
        console.error("Service: 獲取療程下拉選單失敗:", error);
        throw error;
    }
};

/**
 * 上架指定產品組合
 */
export const publishBundle = async (bundleId: number) => {
    try {
        const response = await axios.patch(
            `${base_url}/items/product_bundle/${bundleId}/publish`,
            {},
            getAdminHeaders()
        );
        return response.data;
    } catch (error) {
        console.error("上架產品組合失敗:", error);
        throw error;
    }
};

/**
 * 下架指定產品組合
 */
export const unpublishBundle = async (bundleId: number) => {
    try {
        const response = await axios.patch(
            `${base_url}/items/product_bundle/${bundleId}/unpublish`,
            {},
            getAdminHeaders()
        );
        return response.data;
    } catch (error) {
        console.error("下架產品組合失敗:", error);
        throw error;
    }
};

/**
 * 取得可供銷售單選擇的產品組合（依分店權限過濾）
 */
export const fetchProductBundlesForSale = async (): Promise<Bundle[]> => {
    try {
        const response = await axios.get(`${API_URL}/available`, {
            headers: getTokenHeaders()
        });
        return response.data;
    } catch (error) {
        console.error("取得可用產品組合失敗:", error);
        return [];
    }
};
