import axios from "axios";
import { base_url } from "./BASE_URL";

const API_URL = `${base_url}/stress-test`;

// Stress Test API
export const getAllStressTests = async (filters?: {
    name?: string,
    member_id?: string
}) => {
    const response = await axios.get(`${API_URL}`, { params: filters });
    return response.data.data;
};

export const getStressTestsByMemberId = async (memberId: number) => {
    const response = await axios.get(`${API_URL}/member/${memberId}`);
    return response.data.data;
};

export const getStressTestById = async (stressId: number) => {
    const response = await axios.get(`${API_URL}/${stressId}`);
    return response.data.data;
};

export interface StressScores {
    a_score: number;
    b_score: number;
    c_score: number;
    d_score: number;
    total_score?: number; // 總分數
}

export interface StressTestData {
    member_id: string | number;
    scores?: StressScores;
    answers?: Record<string, string>; // 答案格式如 {'a1': 'A', 'a2': 'B', ...}
}

export const addStressTest = async (data: StressTestData) => {
    console.log("提交壓力測試數據:", data);
    
    // 確保分數值為正確的數字
    if (data.scores) {
        data.scores.a_score = Number(data.scores.a_score) || 0;
        data.scores.b_score = Number(data.scores.b_score) || 0;
        data.scores.c_score = Number(data.scores.c_score) || 0;
        data.scores.d_score = Number(data.scores.d_score) || 0;
        if (data.scores.total_score) {
            data.scores.total_score = Number(data.scores.total_score) || 0;
        }
    }
    
    return axios.post(`${API_URL}/add`, data);
};

export const updateStressTest = async (stressId: number, data: StressTestData) => {
    return axios.put(`${API_URL}/${stressId}`, data);
};

export const deleteStressTest = async (stressId: number) => {
    return axios.delete(`${API_URL}/${stressId}`);
}; 