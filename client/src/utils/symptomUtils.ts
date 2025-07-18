// src/utils/symptomUtils.ts
import { SymptomData, FamilyHistoryData, HealthStatusOption } from "../types/medicalTypes"; // 確保 HealthStatusOption 也從 medicalTypes 匯入

// 症狀和家族病史選項的型別 (您已有的)
export interface SymptomOptionsType { // 稍微改名以避免與變數名衝突，並加上 Type 後綴
    HPA: string[];
    meridian: string[];
    neckAndShoulder: string[];
    anus: string[];
    familyHistory: string[];
}

// 定義症狀選項 (您已有的)
export const symptomOptions: SymptomOptionsType = {
    HPA: ["頭暈", "偏頭痛", "睡眠不足或不佳", "注意力不集中", "壓力大"],
    meridian: ["下半身易水腫", "膝蓋疼痛", "腿部痠痛無力", "靜脈曲張", "無"],
    neckAndShoulder: ["背緊肩周痛", "肩頸痠痛", "時常昏沉", "脖子僵硬", "易緊張"],
    anus: ["消化不良", "排便不順", "腰部酸痛", "新陳代謝差", "易脹氣"],
    familyHistory: ["糖尿病", "高血壓", "腸胃疾病", "自體免疫疾病", "癌症"]
};

// ***** 新增並導出 healthStatusOptions *****
export const healthStatusOptions: HealthStatusOption[] = [
    { name: "良好" },
    { name: "孕婦", isCritical: true },
    { name: "出血期", details: "(腦瘀血、腸胃出血)", isCritical: true },
    { name: "急性病", isCritical: true },
    { name: "心臟搭橋", isCritical: true },
    { name: "支架手術", isCritical: true },
    { name: "裝起搏器", isCritical: true },
    { name: "器官移植及打干擾素", isCritical: true },
    { name: "粉碎性骨折", isCritical: true },
    { name: "三個月內做過手術", isCritical: true },
];
// *****結束新增 healthStatusOptions *****

// 產生症狀摘要文字（處理陣列形式的症狀）(您已有的)
export const generateSymptomSummary = (symptomData: SymptomData): string => {
    return [
        symptomData.HPA.length > 0 && `頭部: ${symptomData.HPA.join(', ')}`,
        symptomData.meridian.length > 0 && `經絡: ${symptomData.meridian.join(', ')}`,
        symptomData.neckAndShoulder.length > 0 && `肩頸: ${symptomData.neckAndShoulder.join(', ')}`,
        symptomData.anus.length > 0 && `腸胃: ${symptomData.anus.join(', ')}`
    ].filter(Boolean).join("; ");
};

// 產生家族病史摘要文字 (您已有的)
export const generateFamilyHistorySummary = (familyData: FamilyHistoryData): string => {
    return familyData.familyHistory.length > 0 ? familyData.familyHistory.join(", ") : "無";
};

// 不適用對象關鍵字 (您已有的)
export const contraindicatedKeywords: string[] = [
    "孕婦", // 注意："良好" 通常不應列為不適用關鍵字，除非有特殊情境
    "出血期",
    "腦瘀血",
    "腸胃出血",
    "急性病",
    "心臟搭橋",
    "支架手術",
    "裝起搏器",
    "器官移植",
    "干擾素",
    "粉碎性骨折",
    "三個月內做過手術",
];