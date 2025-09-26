import axios from "axios";
import { base_url } from "./BASE_URL";
import { getAuthHeaders as getTokenHeaders } from "./AuthUtils";
import { ViewerRole } from "../types/viewerRole";

const API_URL = `${base_url}/therapy-bundles`;
const API_URL_THERAPIES = `${base_url}/therapy`;

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

export interface TherapyBundle {
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

export interface TherapyBundleDetails extends TherapyBundle {
    items: {
        item_id: number;
        quantity: number;
    }[];
    category_ids?: number[];
}

export interface Therapy {
    therapy_id: number;
    name: string;
    price: number;
    code: string;
    content?: string;
    visible_permissions?: ViewerRole[];
}

export const fetchAllTherapyBundles = async (status: string = 'PUBLISHED'): Promise<TherapyBundle[]> => {
    try {
        const response = await axios.get(`${API_URL}/`, {
            ...getAdminHeaders(),
            params: { status }
        });
        return response.data;
    } catch (error) {
        console.error("獲取療程組合列表失敗:", error);
        throw error;
    }
};

export const createTherapyBundle = async (payload: unknown) => {
    try {
        const response = await axios.post(`${API_URL}/`, payload, getAdminHeaders());
        return response.data;
    } catch (error) {
        console.error("新增療程組合失敗:", error);
        throw error;
    }
};

export const getTherapyBundleDetails = async (bundleId: number): Promise<TherapyBundleDetails> => {
    try {
        const response = await axios.get(`${API_URL}/${bundleId}`, getAdminHeaders());
        return response.data;
    } catch (error) {
        console.error("獲取療程組合詳情失敗:", error);
        throw error;
    }
};

export const updateTherapyBundle = async (bundleId: number, payload: unknown) => {
    try {
        const response = await axios.put(`${API_URL}/${bundleId}`, payload, getAdminHeaders());
        return response.data;
    } catch (error) {
        console.error("更新療程組合失敗:", error);
        throw error;
    }
};

export const deleteTherapyBundle = async (bundleId: number, account: string) => {
    try {
        const response = await axios.delete(`${API_URL}/${bundleId}`, {
            ...getAdminHeaders(),
            params: { deleted_by: account }
        });
        return response.data;
    } catch (error) {
        console.error("刪除療程組合失敗:", error);
        throw error;
    }
};

export const fetchTherapiesForDropdown = async (status: string = 'PUBLISHED'): Promise<Therapy[]> => {
    try {
        const response = await axios.get(`${API_URL_THERAPIES}/for-dropdown`, {
            ...getAdminHeaders(),
            params: { status }
        });
        return response.data;
    } catch (error) {
        console.error("Service: 獲取療程下拉選單失敗:", error);
        throw error;
    }
};

/**
 * 上架指定療程組合
 */
export const publishTherapyBundle = async (bundleId: number) => {
    try {
        const response = await axios.patch(
            `${base_url}/items/therapy_bundle/${bundleId}/publish`,
            {},
            getAdminHeaders()
        );
        return response.data;
    } catch (error) {
        console.error("上架療程組合失敗:", error);
        throw error;
    }
};

/**
 * 下架指定療程組合
 */
export const unpublishTherapyBundle = async (bundleId: number) => {
    try {
        const response = await axios.patch(
            `${base_url}/items/therapy_bundle/${bundleId}/unpublish`,
            {},
            getAdminHeaders()
        );
        return response.data;
    } catch (error) {
        console.error("下架療程組合失敗:", error);
        throw error;
    }
};

export const fetchTherapyBundlesForSale = async (): Promise<TherapyBundle[]> => {
    try {
        const response = await axios.get(`${API_URL}/available`, {
            headers: getTokenHeaders(),
        });
        return response.data;
    } catch (error) {
        console.error("取得可用療程組合失敗:", error);
        return [];
    }
};
