import axios from "axios";
import { base_url } from "./BASE_URL";

const API_URL = `${base_url}/stress-test`;

// 搜尋欄位型別（完整支援所有搜尋）
export interface StressTestSearchFilters {
    name?: string;
    member_id?: string;
    phone?: string;
    test_date?: string;
    position?: string;
}

// Stress Test API
export const getAllStressTests = async (filters?: {
  name?: string,
  test_date?: string,
  position?: string,
  member_id?: string,
  phone?: string
}) => {
  // 過濾掉沒值的欄位，否則 url ?phone=&member_id=&position= 會都帶空值，後端會吃空字串不是 None
  const filtered = Object.fromEntries(
    Object.entries(filters || {}).filter(([k, v]) => v !== undefined && v !== null && v !== "")
  );
  const response = await axios.get(`${API_URL}`, { params: filtered });
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
    // 你可以根據需要擴充
}

export const addStressTest = async (data: StressTestData) => {
    console.log("提交壓力測試數據:", data);
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

export const exportStressTests = async (filters?: StressTestSearchFilters) => {
    const filtered = Object.fromEntries(
        Object.entries(filters || {}).filter(([k, v]) => v !== undefined && v !== null && v !== "")
    );
    const response = await axios.get(`${API_URL}/export`, {
        params: filtered,
        responseType: 'blob'
    });
    return response.data;
};

// 取得單筆（含所有答案）
export const getStressTestByIdWithAnswers = async (id: string | number) => {
    // 後端已經改好 /api/stress-test/<id> 會帶 answers
    const res = await axios.get(`${API_URL}/${id}`);
    return res.data.data;  // 會有 member_id, test_date, answers: {...}
};

// 新增：主表+明細一條龍
export const addStressTestWithAnswers = async (member_id: string | number, test_date: string, answers: Record<string, string>) => {
    // 你可以依照後端需要 key，如果是 {memberId, testDate, answers} 就照這個送
    return axios.post(`${API_URL}/add`, {
        memberId: member_id,
        testDate: test_date,
        answers: answers, // 直接帶整份答案
    });
};

// 編輯：主表+明細一條龍
export const updateStressTestWithAnswers = async (id: string | number, member_id: string | number, test_date: string, answers: Record<string, string>) => {
    // 一樣直接傳所有答案與資訊
    return axios.put(`${API_URL}/${id}`, {
        memberId: member_id,
        testDate: test_date,
        answers: answers,
    });
};

