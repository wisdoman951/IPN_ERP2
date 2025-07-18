import { useState, useEffect } from "react";
import {
  getAllTherapyRecords,
  searchTherapyRecords,
  deleteTherapyRecord,
  exportTherapyRecords,
  TherapyRecord
} from "../services/TherapyService";

// 擴展搜尋參數類型
export interface TherapySearchParams {
  keyword?: string;
  startDate?: string;
  endDate?: string;
  therapist?: string;
  packageName?: string;
  salesperson?: string;
}

/**
 * 療程紀錄管理的自定義 Hook
 * 提供療程紀錄列表的狀態管理和操作功能
 */
export const useTherapyRecord = () => {
  const [records, setRecords] = useState<TherapyRecord[]>([]);
  const [keyword, setKeyword] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 頁面載入時獲取所有療程紀錄
  useEffect(() => {
    // 使用空字符串搜尋，這會返回當前用戶門市的所有記錄
    // 而不是調用 fetchAllRecords() 獲取所有門市記錄
    handleSearch();
  }, []);

  // 處理checkbox變化
  const handleCheckboxChange = (recordId: number, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, recordId]);
    } else {
      setSelectedIds(selectedIds.filter(id => id !== recordId));
    }
  };

  // 獲取所有療程紀錄
  const fetchAllRecords = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllTherapyRecords();
      setRecords(data);
    } catch (err) {
      console.error("載入療程紀錄失敗：", err);
      setError("載入療程紀錄失敗");
    } finally {
      setLoading(false);
    }
  };

  // 處理搜尋
  const handleSearch = async (params?: TherapySearchParams) => {
    try {
      setLoading(true);
      setError(null);
      
      // 如果沒有提供參數，使用關鍵字
      const searchParams: TherapySearchParams = params || { keyword };
      
      const data = await searchTherapyRecords(searchParams);
      setRecords(data);
    } catch (err) {
      console.error("搜尋失敗：", err);
      setError("搜尋失敗");
    } finally {
      setLoading(false);
    }
  };

  // 處理刪除
  const handleDelete = async () => {
    if (selectedIds.length === 0) return;
    
    if (!window.confirm(`確定要刪除選定的 ${selectedIds.length} 筆紀錄嗎？`)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // 逐個刪除選中的記錄
      for (const id of selectedIds) {
        await deleteTherapyRecord(id);
      }
      
      // 刪除後重新搜尋
      await handleSearch();
      
      // 清空選中
      setSelectedIds([]);
      alert("刪除成功");
    } catch (err) {
      console.error("刪除失敗：", err);
      setError("刪除失敗");
    } finally {
      setLoading(false);
    }
  };

  // 處理匯出
  const handleExport = async () => {
    try {
      setLoading(true);
      const blob = await exportTherapyRecords();
      
      // 建立下載連結
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = "療程紀錄.xlsx";
      
      // 觸發下載
      document.body.appendChild(a);
      a.click();
      
      // 清理
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("匯出失敗：", err);
      setError("匯出報表失敗");
    } finally {
      setLoading(false);
    }
  };

  return {
    records,
    loading,
    error,
    keyword,
    setKeyword,
    selectedIds,
    handleCheckboxChange,
    handleSearch,
    handleDelete,
    handleExport,
    fetchAllRecords,
  };
}; 