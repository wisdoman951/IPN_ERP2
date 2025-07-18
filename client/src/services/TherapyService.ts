import axios from "axios";
import { base_url } from "./BASE_URL";
import { TherapySearchParams } from "../hooks/useTherapyRecord";

const API_URL = `${base_url}/therapy`;

// 療程紀錄 API 介面
export interface TherapyRecord {
    therapy_record_id: number;
    member_id: number;
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
}

// 療程紀錄 API
export const getAllTherapyRecords = async (): Promise<TherapyRecord[]> => {
    const response = await axios.get(`${API_URL}/record`);
    return response.data;
};

export const getTherapyRecordById = async (recordId: number): Promise<TherapyRecord> => {
    const response = await axios.get(`${API_URL}/record/${recordId}`);
    return response.data;
};

export const searchTherapyRecords = async (params: TherapySearchParams): Promise<TherapyRecord[]> => {
    const response = await axios.get(`${API_URL}/record/search`, {
        params: params
    });
    return response.data;
};

export const addTherapyRecord = async (data: {
    member_id: number;
    store_id?: number; // 可選，系統會自動填入當前用戶所屬商店
    staff_id?: number; // 可選，系統會自動填入當前用戶ID
    date: string;
    note?: string;
    package_id?: number;
    therapy_content?: string;
}) => {
    return axios.post(`${API_URL}/record`, data);
};

export const updateTherapyRecord = async (
    recordId: number,
    data: {
        member_id?: number;
        store_id?: number;
        staff_id?: number;
        date?: string;
        note?: string;
        package_id?: number;
        therapy_content?: string;
    }
) => {
    return axios.put(`${API_URL}/record/${recordId}`, data);
};

export const deleteTherapyRecord = async (recordId: number) => {
    return axios.delete(`${API_URL}/record/${recordId}`);
};

export const exportTherapyRecords = async () => {
    const response = await axios.get(`${API_URL}/record/export`, {
        responseType: "blob"
    });
    return response.data;
};

// 療程銷售 API
export const getAlltherapySells = async () => {
    const response = await axios.get(`${API_URL}/sale`);
    return response.data;
};

export const searchtherapySells = async (keyword: string) => {
    const response = await axios.get(`${API_URL}/sale/search`, {
        params: { keyword }
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
    return axios.post(`${API_URL}/add-sale`, data);
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
    return axios.put(`${API_URL}/sale/${saleId}`, data);
};

export const deletetherapySell = async (saleId: number) => {
    return axios.delete(`${API_URL}/sale/${saleId}`);
};

export const exporttherapySells = async () => {
    const response = await axios.get(`${API_URL}/sale/export`, {
        responseType: "blob"
    });
    return response.data;
}; 

export const getAllTherapiesForDropdown = async () => {
    const response = await axios.get(`${API_URL}/for-dropdown`);
    return response.data;
};