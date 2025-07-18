import axios from "axios";
import { base_url } from "./BASE_URL";

const API_URL = `${base_url}/stores`; // API 路徑指向 /api/stores

const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return {
        Authorization: `Bearer ${token}`,
        "X-Store-ID": "1",
        "X-Store-Level": "admin"
    };
};
// vvvvv 1. 新增 Store 的資料型別定義 vvvvv
export interface Store {
    store_id: number;
    account: string;
    store_name: string;
    store_location: string;
    permission: string;
}

// vvvvv 2. 新增獲取所有分店列表的函式 vvvvv
export const fetchAllStores = async (): Promise<Store[]> => {
    try {
        const response = await axios.get(`${API_URL}/list`, {
            headers: getAuthHeaders()
        });
        return response.data;
    } catch (error: any) {
        console.error("獲取分店列表失敗:", error);
        throw error;
    }
};
/**
 * 新增一間分店
 * @param storeData 包含 store_name, store_location, account, password 的物件
 */
export const addStore = async (storeData: { [key: string]: string }) => {
    try {
        const response = await axios.post(`${API_URL}/add`, storeData, {
            headers: getAuthHeaders()
        });
        return { success: true, data: response.data };
    } catch (error: any) {
        console.error("新增分店失敗:", error);
        return { success: false, message: error.response?.data?.error || "發生未知錯誤" };
    }
};