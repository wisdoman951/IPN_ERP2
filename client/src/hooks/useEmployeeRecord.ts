// client/src/hooks/useEmployeeRecord.ts
import { useState, useEffect } from "react";
import {
  getAllEmployeeRecords,
  searchEmployeeRecords,
  deleteEmployeeRecord,
  exportEmployeeRecords,
  EmployeeRecord
} from "../services/EmployeeService";

/**
 * 員工紀錄管理的自定義 Hook
 * 提供員工紀錄列表的狀態管理和操作功能
 */
export const useEmployeeRecord = () => {
  const [records, setRecords] = useState<EmployeeRecord[]>([]);
  const [keyword, setKeyword] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 頁面載入時獲取所有員工紀錄
  useEffect(() => {
    fetchAllRecords();
  }, []);

  // 處理checkbox變化
  const handleCheckboxChange = (recordId: number, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, recordId]);
    } else {
      setSelectedIds(selectedIds.filter(id => id !== recordId));
    }
  };

  // 獲取所有員工紀錄
  const fetchAllRecords = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllEmployeeRecords();
      setRecords(data);
    } catch (err) {
      console.error("載入員工紀錄失敗：", err);
      setError("載入員工紀錄失敗");
    } finally {
      setLoading(false);
    }
  };

  // 處理搜尋
  const handleSearch = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await searchEmployeeRecords(keyword);
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
    if (selectedIds.length === 0) {
      alert("請先選擇要刪除的紀錄！");
      return;
    }

    if (!window.confirm("確定要刪除選中的紀錄嗎？")) return;

    try {
      setLoading(true);
      setError(null);
      for (const id of selectedIds) {
        await deleteEmployeeRecord(id);
      }
      alert("刪除成功！");
      setSelectedIds([]);
      fetchAllRecords(); // refresh
    } catch (err) {
      console.error("刪除失敗：", err);
      setError("刪除員工紀錄時發生錯誤");
      alert("刪除員工紀錄時發生錯誤！");
    } finally {
      setLoading(false);
    }
  };

  // 處理匯出
  const handleExport = async () => {
    try {
      setLoading(true);
      setError(null);
      const blob = await exportEmployeeRecords();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "員工紀錄.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("匯出失敗：", err);
      setError("匯出報表失敗");
      alert("匯出報表失敗！");
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
    fetchAllRecords
  };
}; 