import axios from "axios";
import { base_url } from "./BASE_URL";

const API_URL = `${base_url}/therapy-bundles`;
const API_URL_THERAPIES = `${base_url}/therapy`;

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

export interface TherapyBundle {
    bundle_id: number;
    bundle_code: string;
    name: string;
    selling_price: number;
    bundle_contents: string;
    created_at: string;
    visible_store_ids?: number[];
}

export interface TherapyBundleDetails extends TherapyBundle {
    items: {
        item_id: number;
        quantity: number;
    }[];
}

export interface Therapy {
    therapy_id: number;
    name: string;
    price: number;
    code: string;
    content?: string;
}

export const fetchAllTherapyBundles = async (status: string = 'PUBLISHED'): Promise<TherapyBundle[]> => {
    try {
        const response = await axios.get(`${API_URL}/`, {
            ...getAuthHeaders(),
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
        const response = await axios.post(`${API_URL}/`, payload, getAuthHeaders());
        return response.data;
    } catch (error) {
        console.error("新增療程組合失敗:", error);
        throw error;
    }
};

export const getTherapyBundleDetails = async (bundleId: number): Promise<TherapyBundleDetails> => {
    try {
        const response = await axios.get(`${API_URL}/${bundleId}`, getAuthHeaders());
        return response.data;
    } catch (error) {
        console.error("獲取療程組合詳情失敗:", error);
        throw error;
    }
};

export const updateTherapyBundle = async (bundleId: number, payload: unknown) => {
    try {
        const response = await axios.put(`${API_URL}/${bundleId}`, payload, getAuthHeaders());
        return response.data;
    } catch (error) {
        console.error("更新療程組合失敗:", error);
        throw error;
    }
};

export const deleteTherapyBundle = async (bundleId: number) => {
    try {
        const response = await axios.delete(`${API_URL}/${bundleId}`, getAuthHeaders());
        return response.data;
    } catch (error) {
        console.error("刪除療程組合失敗:", error);
        throw error;
    }
};

export const fetchTherapiesForDropdown = async (status: string = 'PUBLISHED'): Promise<Therapy[]> => {
    try {
        const response = await axios.get(`${API_URL_THERAPIES}/for-dropdown`, {
            ...getAuthHeaders(),
            params: { status }
        });
        return response.data;
    } catch (error) {
        console.error("Service: 獲取療程下拉選單失敗:", error);
        throw error;
    }
};
