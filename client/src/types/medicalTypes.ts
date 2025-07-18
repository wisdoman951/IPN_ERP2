// 定義會員資料類型
export interface MemberData {
    member_id: number;
    name: string;
    address: string;
    birthday: string;
    blood_type: string;
    gender: string;
    inferrer_id: number;
    line_id: string;
    note: string;
    occupation: string;
    phone: string;
}
// 新增：定義健康狀態選項資料類型
export interface HealthStatusOption {
    name: string; // 選項名稱，例如 "良好", "孕婦"
    details?: string; // 額外說明，例如 "(腦瘀血、腸胃出血)"
}

// 新增：定義已選擇的健康狀態資料結構
export interface SelectedHealthStatusData {
    selectedStates: string[]; // 儲存勾選的健康狀態名稱
    otherText: string;        // 儲存 "其他" 的文字輸入
}
// 擴展表單類型定義
export interface MedicalFormType {
    memberId: string;
    name: string;
    height: string;
    weight: string;
    bloodPressure: string;
    remark: string;
    cosmeticSurgery: string;
    cosmeticDesc: string;
    symptom?: string;          // JSON 字符串格式 - 平時症狀 (通常是 SymptomData 的 JSON)
    familyHistory?: string;    // JSON 字符串格式 - 家族病史 (通常是 FamilyHistoryData 的 JSON)
    healthStatus?: string;     // JSON 字符串格式 - 健康狀態 (SelectedHealthStatusData 的 JSON)
    symptomSummary?: string;
    familySummary?: string;
    healthStatusSummary?: string;
}

// 定義要提交到API的資料結構
export interface MedicalRecordSubmitData {
    memberId: string;
    height: string;
    weight: string;
    bloodPressure: string;
    remark: string;
    symptom: number;  // 0 或 1 (No/Yes)
    familyHistory: string;
    healthStatus?: string; // 新增：考慮如何將健康狀態傳給API
}

// 症狀和家族病史選項定義
export interface SymptomData {
    HPA: string[];
    meridian: string[];
    neckAndShoulder: string[];
    anus: string[];
    symptomOthers: string; // 平時症狀的 "其他說明"
}

export interface FamilyHistoryData {
    familyHistory: string[];
    familyHistoryOthers: string;
} 

// 新增：用於整合頁面 (UsualSymptomsAndFamilyHistory.tsx) 的完整選擇狀態
export interface AllSelectionsData {
    symptoms: SymptomData;
    familyHistory: FamilyHistoryData;
    health: SelectedHealthStatusData;
    generalOthers: string; // 統一的 "其他症狀或說明" (根據您的截圖)
}