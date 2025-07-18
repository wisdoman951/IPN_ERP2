// client\src\hooks\useSymptomAndHistory.ts
import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    SymptomData,
    FamilyHistoryData,
    SelectedHealthStatusData,
    AllSelectionsData,
    symptomOptions, // 從 symptomUtils 匯入
    healthStatusOptions // 從 symptomUtils 匯入
} from '../utils/symptomUtils'; // 假設 symptomOptions 和 healthStatusOptions 都從這裡匯出
import { MedicalFormType } from '../types/medicalTypes';
const initialSymptomData: SymptomData = {
    HPA: [],
    meridian: [],
    neckAndShoulder: [],
    anus: [],
    symptomOthers: "" // 如果平時症狀有獨立的 "其他"
};
// 擴展SymptomData與FamilyHistoryData統一管理
interface SelectedSymptoms extends SymptomData {
    familyHistory: string[];
}
const initialFamilyHistoryData: FamilyHistoryData = {
    familyHistory: [],
    familyHistoryOthers: "" // 如果家族病史有獨立的 "其他"
};
const initialHealthStatusData: SelectedHealthStatusData = {
    selectedStates: [],
    otherText: "" // 健康狀態的 "其他"
};
export const useSymptomAndHistory = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const [selectedSymptoms, setSelectedSymptoms] = useState<SymptomData>(initialSymptomData);
    const [selectedFamilyHistory, setSelectedFamilyHistory] = useState<FamilyHistoryData>(initialFamilyHistoryData);
    const [selectedHealth, setSelectedHealth] = useState<SelectedHealthStatusData>(initialHealthStatusData);
    const [generalOthers, setGeneralOthers] = useState<string>(""); // 針對截圖最下方的 "其他症狀或說明"

    // 初始化選擇的症狀 - 使用陣列存儲多選值
    const [selected, setSelected] = useState<SelectedSymptoms>({
        HPA: [],
        meridian: [],
        neckAndShoulder: [],
        anus: [],
        familyHistory: [],
        symptomOthers: "" // 如果平時症狀有獨立的 "其他"
    });
    
    // 從localStorage取得現有的症狀資料
    useEffect(() => {
        const medicalRecordDataStr = localStorage.getItem('medicalRecordData');
        if (medicalRecordDataStr) {
            try {
                const medicalRecord: MedicalFormType = JSON.parse(medicalRecordDataStr);

                if (medicalRecord.symptom && typeof medicalRecord.symptom === "string") {
                    setSelectedSymptoms(JSON.parse(medicalRecord.symptom));
                } else if (typeof medicalRecord.symptom === "object") {
                    // already parsed or wrongly saved as object, just use it
                    setSelectedSymptoms(medicalRecord.symptom);
                } else {
                    setSelectedSymptoms(initialSymptomData);
                }

                if (medicalRecord.familyHistory && typeof medicalRecord.familyHistory === "string") {
                    setSelectedFamilyHistory(JSON.parse(medicalRecord.familyHistory));
                } else if (typeof medicalRecord.familyHistory === "object") {
                    setSelectedFamilyHistory(medicalRecord.familyHistory);
                } else {
                    setSelectedFamilyHistory(initialFamilyHistoryData);
                }
                
                if (medicalRecord.healthStatus && typeof medicalRecord.healthStatus === "string") {
                    setSelectedHealth(JSON.parse(medicalRecord.healthStatus));
                } else if (typeof medicalRecord.healthStatus === "object") {
                    setSelectedHealth(medicalRecord.healthStatus);
                } else {
                    setSelectedHealth(initialHealthStatusData);
                }
                // 假設 generalOthers 也可能儲存在 medicalRecord.remark 或特定欄位
                // 這裡暫時不從 medicalRecordData 載入 generalOthers，讓使用者每次都重新輸入
                // 或者您可以定義一個欄位來儲存它
                const tempAllSelections = localStorage.getItem('tempAllSelections');
                if(tempAllSelections){
                    const parsedSelections: AllSelectionsData = JSON.parse(tempAllSelections);
                    if(parsedSelections.generalOthers) setGeneralOthers(parsedSelections.generalOthers);
                }


            } catch (e) {
                console.error("Error parsing initial data in useSymptomAndHistory:", e);
                setSelectedSymptoms(initialSymptomData);
                setSelectedFamilyHistory(initialFamilyHistoryData);
                setSelectedHealth(initialHealthStatusData);
            }
        }
    }, []); // 只在初次載入時執行

    
    // 處理症狀複選
    const handleCheckboxChange = (category: keyof Omit<SelectedSymptoms, 'others'>, option: string, checked: boolean) => {
        setSelected(prev => {
            if (checked) {
                // 新增選項
                return {
                    ...prev,
                    [category]: [...prev[category], option]
                };
            } else {
                // 移除選項
                return {
                    ...prev,
                    [category]: prev[category].filter(item => item !== option)
                };
            }
        });
    };
        // 處理平時症狀 checkbox 變更
    const handleSymptomCheckboxChange = (
        category: keyof Omit<SymptomData, 'symptomOthers'>,
        option: string,
        checked: boolean
    ) => {
        setSelectedSymptoms(prev => ({
            ...prev,
            [category]: checked
                ? [...prev[category], option]
                : prev[category].filter(item => item !== option)
        }));
    };
        // 處理家族病史 checkbox 變更
    const handleFamilyHistoryCheckboxChange = (option: string, checked: boolean) => {
        setSelectedFamilyHistory(prev => ({
            ...prev,
            familyHistory: checked
                ? [...prev.familyHistory, option]
                : prev.familyHistory.filter(item => item !== option)
        }));
    };

    // 處理健康狀態 checkbox 變更
    const handleHealthStatusCheckboxChange = (optionName: string, checked: boolean) => {
        setSelectedHealth(prev => ({
            ...prev,
            selectedStates: checked
                ? [...prev.selectedStates, optionName]
                : prev.selectedStates.filter(item => item !== optionName)
        }));
    };
        // 處理健康狀態的 "其他" 輸入
    const handleHealthOtherTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedHealth(prev => ({ ...prev, otherText: event.target.value }));
    };

    // 處理通用的 "其他症狀或說明"
    const handleGeneralOthersChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setGeneralOthers(event.target.value);
    };
    // 處理其他說明變更
    const handleOthersChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setSelected(prev => ({
            ...prev,
            others: e.target.value
        }));
    };
    
    // 儲存選擇的症狀和家族病史並返回上一頁
    const handleSave = () => {
        // 產生摘要 (您可以根據需要調整摘要邏輯)
        const symptomSummary = Object.values(selectedSymptoms)
            .flat() // 將所有症狀陣列合併為一個
            .filter(s => typeof s === 'string' && s.trim() !== "") // 過濾掉空字串和非字串
            .join("、 ") || "無";
        
        const familySummary = selectedFamilyHistory.familyHistory.join("、 ") || "無";

        const healthStatusSummaryArray = [...selectedHealth.selectedStates];
        if (selectedHealth.otherText.trim()) {
            healthStatusSummaryArray.push(`其他: ${selectedHealth.otherText.trim()}`);
        }
        const healthSummary = healthStatusSummaryArray.join("、 ") || "良好"; // 如果沒有選擇，預設為 "良好" 或 "無"

        const allSelections: AllSelectionsData = {
            symptoms: selectedSymptoms,
            familyHistory: selectedFamilyHistory,
            health: selectedHealth,
            generalOthers: generalOthers
        };

        // 更新 localStorage 中的 medicalRecordData
        const medicalRecordDataStr = localStorage.getItem('medicalRecordData');
        let medicalRecord: MedicalFormType = {} as MedicalFormType;
        if (medicalRecordDataStr) {
            medicalRecord = JSON.parse(medicalRecordDataStr);
        }

        medicalRecord.symptom = JSON.stringify(selectedSymptoms);
        medicalRecord.familyHistory = JSON.stringify(selectedFamilyHistory);
        medicalRecord.healthStatus = JSON.stringify(selectedHealth);
        
        medicalRecord.symptomSummary = symptomSummary;
        medicalRecord.familySummary = familySummary;
        medicalRecord.healthStatusSummary = healthSummary;

        // 如果 generalOthers 需要儲存到 medicalRecord 的特定欄位 (例如 remark)
        // medicalRecord.remark = generalOthers; // 或者您可以在 MedicalFormType 新增欄位

        try {
            localStorage.setItem('medicalRecordData', JSON.stringify(medicalRecord));
            // 也可以考慮用一個臨時的 key，然後讓 useMedicalRecordForm 來讀取和合併
            // localStorage.setItem('tempAllSelections', JSON.stringify(allSelections));

            navigate("/medical-record/add", { state: { fromSymptomsPage: true, fromHealthStatusPage: true } }); // 標記返回
            return true;
        } catch (err) {
            console.error("Failed to save all selections data:", err);
            alert("儲存失敗，localStorage 可能已滿或發生其他錯誤。");
            return false;
        }
    };
    
    return {
        selectedSymptoms,
        selectedFamilyHistory,
        selectedHealth,
        generalOthers,
        handleSymptomCheckboxChange,
        handleFamilyHistoryCheckboxChange,
        handleHealthStatusCheckboxChange,
        handleHealthOtherTextChange,
        handleGeneralOthersChange,
        handleSave,
    };
};