// src/hooks/useMedicalRecordForm.ts (最終完整版)

import { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import {
    MedicalFormType,
    MemberData,
    SelectedHealthStatusData,
    SymptomData,
    FamilyHistoryData
} from "../types/medicalTypes";
import {
    checkMemberExists,
    createMedicalRecord,
    getMedicalRecordById,
    updateMedicalRecord
} from "../services/ＭedicalService";
import { contraindicatedKeywords } from "../utils/symptomUtils";

// --- 這就是您需要的 generateSummary 輔助函式 ---
/**
 * 將 JSON 格式的健康資料轉換為人類可讀的摘要字串
 * @param jsonString - 包含健康資料的 JSON 字串
 * @param type - 資料類型 ('health', 'symptom', 'family')
 * @returns 一個用逗號分隔的摘要字串
 */
const generateSummary = (jsonInput: string | object | undefined, type: 'health' | 'symptom' | 'family'): string => {
    if (!jsonInput) return "尚未填寫";

    let data: any;

    try {
        // 如果已經是物件就直接用，否則嘗試 parse
        if (typeof jsonInput === 'string') {
            data = JSON.parse(jsonInput);
        } else {
            data = jsonInput;
        }

        const summaryParts: string[] = [];

        switch (type) {
            case 'health':
                if (data.selectedStates && Array.isArray(data.selectedStates)) {
                    summaryParts.push(...data.selectedStates);
                }
                if (data.otherText) {
                    summaryParts.push(data.otherText);
                }
                break;
            case 'symptom':
                if (data.HPA && Array.isArray(data.HPA)) summaryParts.push(...data.HPA);
                if (data.meridian && Array.isArray(data.meridian)) summaryParts.push(...data.meridian);
                if (data.neckAndShoulder && Array.isArray(data.neckAndShoulder)) summaryParts.push(...data.neckAndShoulder);
                if (data.anus && Array.isArray(data.anus)) summaryParts.push(...data.anus);
                if (data.symptomOthers) summaryParts.push(data.symptomOthers);
                break;
            case 'family':
                if (data.familyHistory && Array.isArray(data.familyHistory)) {
                    summaryParts.push(...data.familyHistory);
                }
                if (data.familyHistoryOthers) {
                    summaryParts.push(data.familyHistoryOthers);
                }
                break;
        }

        const filteredParts = summaryParts.filter(part => part && part.trim() !== "");
        return filteredParts.length > 0 ? filteredParts.join(', ') : "無";

    } catch (error) {
        console.error(`解析 ${type} JSON 失敗:`, error);
        return "資料格式錯誤";
    }
};


// --- 主要的 Hook ---
export const useMedicalRecordForm = (id?: string) => {
    const navigate = useNavigate();
    const location = useLocation();
    const isEditMode = !!id;

    const [error, setError] = useState("");
    const [validated, setValidated] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [memberData, setMemberData] = useState<MemberData | null>(null);
    const [isContraindicated, setIsContraindicated] = useState(false);

    const initialFormState: MedicalFormType = {
        memberId: "",
        name: "",
        height: "",
        weight: "",
        bloodPressure: "",
        remark: "",
        cosmeticSurgery: "",
        cosmeticDesc: "",
        symptom: undefined,
        familyHistory: undefined,
        healthStatus: undefined,
        symptomSummary: "",
        familySummary: "",
        healthStatusSummary: ""
    };

    const [form, setForm] = useState<MedicalFormType>(initialFormState);

    useEffect(() => {
        if (!isEditMode || !id) return;

        console.log("params id:", id, "isEditMode:", isEditMode);

        const loadData = async () => {
            if (isEditMode && id) {
                try {
                    const recordData = await getMedicalRecordById(parseInt(id, 10));
                    if (recordData) {
                        const healthStatusParsed = typeof recordData.healthStatus === 'string' 
                            ? JSON.parse(recordData.healthStatus) 
                            : recordData.healthStatus;

                        const symptomParsed = typeof recordData.symptom === 'string'
                            ? JSON.parse(recordData.symptom)
                            : recordData.symptom;

                        const familyHistoryParsed = typeof recordData.familyHistory === 'string'
                            ? JSON.parse(recordData.familyHistory)
                            : recordData.familyHistory;

                        const healthSummary = generateSummary(healthStatusParsed, 'health');
                        const symptomSummary = generateSummary(symptomParsed, 'symptom');
                        const familySummary = generateSummary(familyHistoryParsed, 'family');

                        setForm({
                            ...initialFormState,
                            ...recordData,
                            healthStatus: healthStatusParsed,
                            symptom: symptomParsed,
                            familyHistory: familyHistoryParsed,
                            healthStatusSummary: healthSummary,
                            symptomSummary: symptomSummary,
                            familySummary: familySummary,
                        });
                    }
                } catch (err) {
                    console.error("獲取紀錄失敗", err);
                    setError("無法載入該筆紀錄，請返回列表頁重試。");
                }
            } else {
                const savedData = localStorage.getItem('medicalRecordData');
                if (savedData) {
                    try {
                        const parsedData = JSON.parse(savedData);
                        setForm(prevForm => ({ ...prevForm, ...parsedData }));
                    } catch (e) {
                        console.error("解析 medicalRecordData 失敗", e);
                    }
                }
            }
        };

        loadData();

        if (location.state?.fromSymptomsPage || location.state?.fromHealthStatusPage) {
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [id, isEditMode, location.state, navigate]);


    useEffect(() => {
        let found = false;
        const lowerCaseKeywords = contraindicatedKeywords.map(k => k.toLowerCase());

        const checkText = (text: string | undefined): boolean => {
            if (!text) return false;
            const lowerText = text.toLowerCase();
            return lowerCaseKeywords.some(keyword => lowerText.includes(keyword));
        };

        const checkArray = (arr: string[] | undefined): boolean => {
            if (!arr || arr.length === 0) return false;
            return arr.some(item => checkText(item));
        };

        if (form.healthStatus) {
            try {
                const healthData: SelectedHealthStatusData =
                    typeof form.healthStatus === "string"
                        ? JSON.parse(form.healthStatus)
                        : form.healthStatus;
                if (checkArray(healthData.selectedStates) || checkText(healthData.otherText)) {
                    found = true;
                }
            } catch (e) { console.error("Error parsing healthStatus for contraindication: ", e); }
        }

        if (!found && form.symptom) {
            try {
                const symptomData: SymptomData =
                    typeof form.symptom === "string"
                        ? JSON.parse(form.symptom)
                        : form.symptom;
                const allSymptomTexts: string[] = [];
                if (symptomData.HPA) allSymptomTexts.push(...symptomData.HPA);
                if (symptomData.meridian) allSymptomTexts.push(...symptomData.meridian);
                if (symptomData.neckAndShoulder) allSymptomTexts.push(...symptomData.neckAndShoulder);
                if (symptomData.anus) allSymptomTexts.push(...symptomData.anus);
                
                if (checkArray(allSymptomTexts) || checkText(symptomData.symptomOthers)) {
                    found = true;
                }
            } catch (e) { console.error("Error parsing symptom for contraindication: ", e); }
        }
        
        setIsContraindicated(found);
    }, [form.healthStatus, form.symptom, form.familyHistory]);


    const handleMemberChange = (memberId: string, name: string, memberDataResult: MemberData | null) => {
        setForm(prev => ({ ...prev, memberId, name }));
        setMemberData(memberDataResult);
    };
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setForm(prevForm => ({ ...prevForm, [name]: value }));
    };
    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm(prevForm => ({ ...prevForm, [name]: value }));
    };
    const preNavigationCheck = async () => {
        if (!form.memberId || !form.name || !form.height || !form.weight || !form.cosmeticSurgery) {
            setValidated(true); 
            setError("請先填寫完整的必要基本資料（會員、身高、體重、微整型）。");
            return false;
        }
        if (form.cosmeticSurgery === "Yes" && !form.cosmeticDesc) {
            setValidated(true);
            setError("請填寫微整型說明。");
            return false;
        }
        try {
            const memberExists = await checkMemberExists(form.memberId);
            if (!memberExists) {
                setError(`會員編號 ${form.memberId} 不存在，請先建立會員資料或確認編號是否正確。`);
                return false;
            }
            setError(""); 
            return true;
        } catch (err) {
            console.error("檢查會員存在失敗", err);
            setError("檢查會員資料時發生錯誤，請稍後再試。");
            return false;
        }
    };
    const handleOpenSelectionsPage = async () => {
        if (!await preNavigationCheck()) return;
        try {
            localStorage.setItem('medicalRecordData', JSON.stringify(form));
            navigate("/medical-record/symptoms-and-history");
        } catch (e) {
            console.error("儲存 medicalRecordData 到 localStorage 失敗:", e);
            setError("系統暫存資料時發生錯誤，請稍後再試。");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const formElement = e.currentTarget as HTMLFormElement;
        
        // 編輯模式下，摘要欄位可能不是必須的，可以稍作調整
        const isSummaryRequired = !isEditMode;
        if (formElement.checkValidity() === false || 
           (isSummaryRequired && (!form.symptomSummary || !form.familySummary || !form.healthStatusSummary))) {
            e.stopPropagation();
            setValidated(true);
            if (isSummaryRequired && !form.healthStatusSummary) setError("請選擇健康狀態。");
            else if (isSummaryRequired && !form.symptomSummary) setError("請選擇平時症狀。");
            else if (isSummaryRequired && !form.familySummary) setError("請選擇家族病史。");
            return;
        }

        if (isContraindicated) {
            if (!window.confirm("注意：此對象已被標記為不適用對象，您確定要提交嗎？")) {
                return;
            }
        }

        setSubmitLoading(true);
        setError("");
        
        const dataToSubmit = {
            id: parseInt(id ?? "0"),
            memberId: form.memberId,
            height: form.height,
            weight: form.weight,
            bloodPressure: form.bloodPressure,
            remark: form.remark,
            cosmeticSurgery: form.cosmeticSurgery,
            cosmeticDesc: form.cosmeticDesc || "",
            symptom: form.symptom || "{}",
            familyHistory: form.familyHistory || "{}",
            healthStatus: form.healthStatus || "{}"
        };
        console.log("即將送出", isEditMode ? "更新" : "新增", {
            id,
            dataToSubmit,
        });
        try {
            if (isEditMode) {
                await updateMedicalRecord(parseInt(id, 10), dataToSubmit);
                alert("健康檢查紀錄更新成功");
            } else {
                await createMedicalRecord(dataToSubmit);
                alert("健康檢查紀錄新增成功");
            }

            localStorage.removeItem('medicalRecordData');
            navigate("/medical-record");

        } catch (err: any) {
            console.error("提交紀錄失敗", err);
            setError(err.response?.data?.error || "提交紀錄時發生錯誤。");
        } finally {
            setSubmitLoading(false);
        }
        
    };

    return {
        form,
        error,
        validated,
        submitLoading,
        memberData,
        isContraindicated,
        isEditMode,
        setError,
        setForm,
        handleMemberChange,
        handleChange,
        handleSelectChange,
        handleOpenSelectionsPage,
        handleSubmit
    };
};