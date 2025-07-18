// client/src/services/PureMedicalRecordService.ts
import axios from "axios";
import { base_url } from "./BASE_URL";

// 假設您有一個獲取 token 的工具函式
// 如果沒有，可以先用 localStorage.getItem('token') 代替
const getToken = () => localStorage.getItem('token');

const API_URL = `${base_url}/pure-medical-record`;

// 建立一個 axios 實例，預先配置好 baseURL 和認證 header
const axiosInstance = axios.create({
    baseURL: API_URL
});

axiosInstance.interceptors.request.use(config => {
    const token = getToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, error => {
    return Promise.reject(error);
});


export interface PureMedicalRecord {
  ipn_pure_id: number;
  Name?: string; 
  blood_preasure?: string;
  date?: string;
  height?: number;
  weight?: number;
  body_fat_percentage?: number; // 體脂肪
  visceral_fat?: number;
  basal_metabolic_rate?: number;
  body_age?: number;
  bmi?: string;
  pure_item?: string;
  staff_name?: string; 
  note?: string;
  member_id?: number;
}

// 新增或更新時，傳遞給 API 的資料結構
export interface PureMedicalRecordPayload {
  member_id: string;
  staff_id?: string;
  visceral_fat?: string | number;
  body_fat_percentage?: string | number; // 體脂肪
  blood_preasure?: string;
  basal_metabolic_rate?: string | number;
  date?: string;
  body_age?: string | number;
  height?: string | number;
  weight?: string | number;
  bmi?: string | number;
  pure_item?: string;
  note?: string;
}


// 獲取或搜尋紀錄 (合併為一個函式)
export const fetchPureRecords = async (keyword?: string): Promise<PureMedicalRecord[]> => {
 try {
   // GET /api/pure-medical-record?keyword=...
   const response = await axiosInstance.get("", {
     params: { keyword }
   });
   return response.data;
 } catch (error) {
   console.error("獲取淨化健康紀錄失敗", error);
   throw error; // 讓呼叫的 hook 可以捕獲並處理錯誤
 }
};

// 新增淨化健康紀錄
export const addPureRecord = async (data: PureMedicalRecordPayload) => {
  try {
    // POST /api/pure-medical-record
    const response = await axiosInstance.post("", data);
    return response.data;
  } catch (error) {
    console.error("新增淨化健康紀錄失敗", error);
    throw error;
  }
};

// 更新淨化健康紀錄
export const updatePureRecord = async (pureId: number, data: Partial<PureMedicalRecordPayload>) => {
  try {
      // PUT /api/pure-medical-record/{pureId}
      const response = await axiosInstance.put(`/${pureId}`, data);
      return response.data;
  } catch (error)      {
      console.error(`更新紀錄 ${pureId} 失敗`, error);
      throw error;
  }
};

// 刪除淨化健康紀錄
export const deletePureRecord = async (pureId: number) => {
  try {
      // DELETE /api/pure-medical-record/{pureId}
      const response = await axiosInstance.delete(`/${pureId}`);
      return response.data;
  } catch (error) {
      console.error(`刪除紀錄 ${pureId} 失敗`, error);
      throw error;
  }
};

// 導出淨化健康紀錄
export const exportPureRecords = async () => {
  try {
    // GET /api/pure-medical-record/export
    const response = await axiosInstance.get("/export", {
      responseType: "blob"
    });
    return response.data;
  } catch (error) {
    console.error("導出淨化健康紀錄失敗", error);
    throw error;
  }
};
