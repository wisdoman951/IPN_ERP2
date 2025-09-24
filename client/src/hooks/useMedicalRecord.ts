import { useState, useEffect } from 'react';
import { downloadBlob } from '../utils/downloadBlob';
import { 
    getAllMedicalRecords, 
    searchMedicalRecords, 
    deleteMedicalRecord, 
    exportMedicalRecords 
} from '../services/MedicalService';

// 定義健康檢查紀錄的常量
export enum HealthRecordIndex {
    ID = 0,
    STORE_NAME = 1,
    MEMBER_CODE = 2,
    NAME = 3,
    HEIGHT = 4,
    WEIGHT = 5,
    BLOOD_PRESSURE = 6,
    MEDICAL_HISTORY = 7,
    MICRO_SURGERY = 8,
    MICRO_SURGERY_NOTES = 9
}

// 更新類型定義，使用陣列形式
export type MedicalRecordType = any[];

/**
 * 健康檢查紀錄管理相關的自定義 Hook
 */
export const useMedicalRecordManagement = () => {
    const [searchValue, setSearchValue] = useState("");
    const [records, setRecords] = useState<MedicalRecordType[]>([]);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    // 頁面載入時取得所有健康檢查紀錄
    useEffect(() => {
        fetchAllRecords();
    }, []);

    // 獲取所有健康檢查紀錄
    const fetchAllRecords = async () => {
        try {
            const data = await getAllMedicalRecords();
            setRecords(data);
            setSelectedIds([]); // 重新載入後清空勾選
        } catch (error) {
            console.error("獲取紀錄失敗:", error);
            alert("無法載入紀錄。");
        }
    };
    useEffect(() => {
        fetchAllRecords();
    }, []);

    // 處理搜尋
    const handleSearch = async () => {
        try {
            const data = await searchMedicalRecords(searchValue);
            setRecords(data);
        } catch (err) {
            console.error("搜尋失敗", err);
        }
    };

    // 處理checkbox的變更
    const handleCheckboxChange = (id: number, checked: boolean) => {
        if (checked) {
            setSelectedIds([...selectedIds, id]);
        } else {
            setSelectedIds(selectedIds.filter((item) => item !== id));
        }
    };

    // 處理刪除
    const handleDelete = async () => {
        if (selectedIds.length === 0) {
            alert("請先勾選要刪除的紀錄。");
            return;
        }

        // 跳出確認視窗，防止誤刪
        const isConfirmed = window.confirm(`您確定要刪除這 ${selectedIds.length} 筆紀錄嗎？`);

        if (isConfirmed) {
            try {
                // 使用 Promise.all 來等待所有刪除請求完成
                await Promise.all(
                    selectedIds.map(id => deleteMedicalRecord(id))
                );
                
                alert("刪除成功！");
                
                // 刪除成功後，重新獲取最新的紀錄列表
                fetchAllRecords();

            } catch (error) {
                console.error("刪除失敗:", error);
                alert("刪除紀錄時發生錯誤。");
            }
        }
    };

    // 處理匯出報表
    const handleExport = async () => {
        try {
            const blob = await exportMedicalRecords();
            downloadBlob(blob, "健康檢查紀錄.xlsx");
        } catch (err) {
            console.error("匯出失敗", err);
            alert("匯出報表失敗！");
        }
    };

    return {
        records,
        searchValue,
        setSearchValue,
        selectedIds,
        handleCheckboxChange,
        handleDelete,
        handleSearch,
        fetchAllRecords,
        handleExport
    };
}; 