import axios from "axios";
import { base_url } from "./BASE_URL";
import { TherapySearchParams } from "../hooks/useTherapyRecord";
import { getAuthHeaders } from "./AuthUtils";

const API_URL = `${base_url}/therapy`;

// 療程紀錄 API 介面
export interface TherapyRecord {
    therapy_record_id: number;
    member_id: number;
    member_code: string;
    member_name: string;
    store_id: number;
    store_name: string;
    staff_id: number;
    staff_name: string;
    date: string;
    note: string;
    therapy_id: number;
    package_name: string;
    therapy_content: string;
    remaining_sessions: number;
    deduct_sessions?: number;
}

// 療程紀錄 API
export const getAllTherapyRecords = async (): Promise<TherapyRecord[]> => {
    const response = await axios.get(`${API_URL}/record`, {
        headers: getAuthHeaders()
    });
    return response.data;
};

export const getTherapyRecordById = async (recordId: number): Promise<TherapyRecord> => {
    const response = await axios.get(`${API_URL}/record/${recordId}`, {
        headers: getAuthHeaders()
    });
    return response.data;
};

export const searchTherapyRecords = async (params: TherapySearchParams): Promise<TherapyRecord[]> => {
    const response = await axios.get(`${API_URL}/record/search`, {
        params: params,
        headers: getAuthHeaders()
    });
    return response.data;
};

export const addTherapyRecord = async (data: {
    member_id: number;
    store_id?: number; // 可選，系統會自動填入當前用戶所屬商店
    staff_id?: number; // 可選，系統會自動填入當前用戶ID
    therapy_id: number;
    deduct_sessions?: number;
    date: string;
    note?: string;
}) => {
    return axios.post(`${API_URL}/record`, data, {
        headers: getAuthHeaders()
    });
};

export const updateTherapyRecord = async (
    recordId: number,
    data: {
        member_id?: number;
        store_id?: number;
        staff_id?: number;
        therapy_id?: number;
        deduct_sessions?: number;
        date?: string;
        note?: string;
    }
) => {
    return axios.put(`${API_URL}/record/${recordId}`, data, {
        headers: getAuthHeaders()
    });
};

export const deleteTherapyRecord = async (recordId: number) => {
    return axios.delete(`${API_URL}/record/${recordId}`, {
        headers: getAuthHeaders()
    });
};

export const exportTherapyRecords = async () => {
    const response = await axios.get(`${API_URL}/record/export`, {
        responseType: "blob",
        headers: getAuthHeaders()
    });
    return response.data;
};

// 療程銷售 API
export const getAlltherapySells = async () => {
    const response = await axios.get(`${API_URL}/sale`, {
        headers: getAuthHeaders()
    });
    return response.data;
};

export const searchtherapySells = async (keyword: string) => {
    const response = await axios.get(`${API_URL}/sale/search`, {
        params: { keyword },
        headers: getAuthHeaders()
    });
    return response.data;
};

export const addtherapySell = async (data: {
    memberId: string;
    purchaseDate: string;
    therapyPackageId: string;
    sessions: string;
    paymentMethod: string;
    transferCode?: string;
    cardNumber?: string;
    staffId: string;
    saleCategory: string;
}) => {
    return axios.post(`${API_URL}/add-sale`, data, {
        headers: getAuthHeaders()
    });
};

export const updatetherapySell = async (
    saleId: number,
    data: {
        memberId: string;
        purchaseDate: string;
        therapyPackageId: string;
        sessions: string;
        paymentMethod: string;
        transferCode?: string;
        cardNumber?: string;
        staffId: string;
        saleCategory: string;
    }
) => {
    return axios.put(`${API_URL}/sale/${saleId}`, data, {
        headers: getAuthHeaders()
    });
};

export const deletetherapySell = async (saleId: number) => {
    return axios.delete(`${API_URL}/sale/${saleId}`, {
        headers: getAuthHeaders()
    });
};

export const exporttherapySells = async () => {
    const response = await axios.get(`${API_URL}/sale/export`, {
        responseType: "blob",
        headers: getAuthHeaders()
    });
    return response.data;
};

export const getAllTherapiesForDropdown = async () => {
    const response = await axios.get(`${API_URL}/for-dropdown`, {
        headers: getAuthHeaders()
    });
    return response.data;
};

export const addTherapy = async (data: { code: string; name: string; price: number; visible_store_ids?: number[] | null; category_ids?: number[] }) => {
    try {
        const token = localStorage.getItem("token");
        const response = await axios.post(`${API_URL}/package`, data, {
            headers: {
                Authorization: `Bearer ${token}`,
                "X-Store-ID": "1",
                "X-Store-Level": "admin",
            },
        });
        return response.data;
    } catch (error) {
        console.error("新增療程失敗：", error);
        throw error;
    }
};

export const updateTherapy = async (
    therapyId: number,
    data: { code: string; name: string; price: number; content?: string; visible_store_ids?: number[] | null; category_ids?: number[] }
) => {
    try {
        const token = localStorage.getItem("token");
        const response = await axios.put(`${API_URL}/package/${therapyId}`, data, {
            headers: {
                Authorization: `Bearer ${token}`,
                "X-Store-ID": "1",
                "X-Store-Level": "admin",
            },
        });
        return response.data;
    } catch (error) {
        console.error("更新療程失敗：", error);
        throw error;
    }
};

export const deleteTherapy = async (therapyId: number, account: string) => {
    try {
        const token = localStorage.getItem("token");
        const response = await axios.delete(`${API_URL}/package/${therapyId}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                "X-Store-ID": "1",
                "X-Store-Level": "admin",
            },
            params: { deleted_by: account },
        });
    return response.data;
    } catch (error) {
        console.error("刪除療程失敗：", error);
        throw error;
    }
};

export const publishTherapy = async (therapyId: number) => {
    try {
        const token = localStorage.getItem("token");
        const response = await axios.patch(
            `${base_url}/items/therapy/${therapyId}/publish`,
            {},
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "X-Store-ID": "1",
                    "X-Store-Level": "admin",
                },
            }
        );
        return response.data;
    } catch (error) {
        console.error("上架療程失敗：", error);
        throw error;
    }
};

export const unpublishTherapy = async (therapyId: number) => {
    try {
        const token = localStorage.getItem("token");
        const response = await axios.patch(
            `${base_url}/items/therapy/${therapyId}/unpublish`,
            {},
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "X-Store-ID": "1",
                    "X-Store-Level": "admin",
                },
            }
        );
        return response.data;
    } catch (error) {
        console.error("下架療程失敗：", error);
        throw error;
    }
};
