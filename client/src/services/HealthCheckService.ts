import axios from "axios";
import { base_url } from "./BASE_URL";

const API_URL = `${base_url}/health-check`;

// Health Check API
export const getAllHealthChecks = async () => {
    try {
        const response = await axios.get(`${API_URL}`);
        
        // Transform the data to match the expected interface
        return response.data.map((record: any) => ({
            HealthCheck_ID: record[0],
            Member_ID: record[1],
            Name: record[2],
            Height: record[3],
            Weight: record[4],
            BloodPressure: record[5],
            MedicalHistory: record[6],
            MicroSurgery: record[7],
            MicroSurgeryNotes: record[8],
            BodyFat: record[9],
            VisceralFat: record[10],
            BasalMetabolism: record[11],
            BodyAge: record[12],
            BMI: record[13],
            Notes: record[14],
            Date: record[15] || new Date().toISOString().split('T')[0]
        }));
    } catch (error) {
        console.error("獲取健康檢查記錄失敗", error);
        return [];
    }
};

export const searchHealthChecks = async (keyword: string) => {
    try {
        const response = await axios.get(`${API_URL}/search`, {
            params: { keyword }
        });
        
        // Transform the data to match the expected interface
        return response.data.map((record: any) => ({
            HealthCheck_ID: record[0],
            Member_ID: record[1],
            Name: record[2],
            Height: record[3],
            Weight: record[4],
            BloodPressure: record[5],
            MedicalHistory: record[6],
            MicroSurgery: record[7],
            MicroSurgeryNotes: record[8],
            BodyFat: record[9],
            VisceralFat: record[10],
            BasalMetabolism: record[11],
            BodyAge: record[12],
            BMI: record[13],
            Notes: record[14],
            Date: record[15] || new Date().toISOString().split('T')[0]
        }));
    } catch (error) {
        console.error("搜尋健康檢查記錄失敗", error);
        return [];
    }
};

export const getMemberHealthCheck = async (memberId: string) => {
    try {
        const response = await axios.get(`${API_URL}/member/${memberId}`);
        
        // Transform the record to match the expected interface
        if (response.data) {
            const record = response.data;
            return {
                HealthCheck_ID: record[0],
                Member_ID: record[1],
                Name: record[2],
                Height: record[3],
                Weight: record[4],
                BloodPressure: record[5],
                MedicalHistory: record[6],
                MicroSurgery: record[7],
                MicroSurgeryNotes: record[8],
                BodyFat: record[9],
                VisceralFat: record[10],
                BasalMetabolism: record[11],
                BodyAge: record[12],
                BMI: record[13],
                Notes: record[14],
                Date: record[15] || new Date().toISOString().split('T')[0]
            };
        }
        return null;
    } catch (error) {
        console.error("獲取會員健康檢查資料失敗", error);
        throw error;
    }
};

export const addHealthCheck = async (data: {
    memberId: string;
    height?: number;
    weight?: number;
    bloodPressure?: string;
    bodyFat?: number | string;
    visceralFat?: number | string;
    basalMetabolism?: number | string;
    bodyAge?: number | string;
    bmi?: number | string;
    notes?: string;
    date?: string;
}) => {
    // Format bodyFat to add % if it's a number
    if (typeof data.bodyFat === 'number') {
        data.bodyFat = `${data.bodyFat}%`;
    }
    
    // Format visceralFat to add kg if it's a number
    if (typeof data.visceralFat === 'number') {
        data.visceralFat = `${data.visceralFat}kg`;
    }
    
    return axios.post(`${API_URL}`, data);
};

export const updateHealthCheck = async (
    healthCheckId: number,
    data: {
        memberId?: string;
        height?: number;
        weight?: number;
        bloodPressure?: string;
        bodyFat?: number | string;
        visceralFat?: number | string;
        basalMetabolism?: number | string;
        bodyAge?: number | string;
        bmi?: number | string;
        notes?: string;
        date?: string;
    }
) => {
    // Format bodyFat to add % if it's a number
    if (typeof data.bodyFat === 'number') {
        data.bodyFat = `${data.bodyFat}%`;
    }
    
    // Format visceralFat to add kg if it's a number
    if (typeof data.visceralFat === 'number') {
        data.visceralFat = `${data.visceralFat}kg`;
    }
    
    return axios.put(`${API_URL}/${healthCheckId}`, data);
};

export const deleteHealthCheck = async (healthCheckId: number) => {
    return axios.delete(`${API_URL}/${healthCheckId}`);
};

export const exportHealthChecks = async () => {
    try {
        const response = await axios.get(`${API_URL}/export`, {
            responseType: "blob"
        });
        return response.data;
    } catch (error) {
        console.error("匯出健康檢查紀錄失敗", error);
        throw error;
    }
}; 