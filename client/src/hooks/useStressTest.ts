// ./src/hooks/useStressTest.ts
import { useState, useEffect, useCallback } from 'react';
import { getAllStressTests, deleteStressTest, exportStressTests, StressTestData } from '../services/StressTestService';
import { downloadBlob } from '../utils/downloadBlob';
import { sortByStoreAndMemberCode } from '../utils/storeMemberSort';

interface StressTest {
  ipn_stress_id: number;
  member_id: number;
  Name: string;
  member_code?: string;
  a_score: number;
  b_score: number;
  c_score: number;
  d_score: number;
  total_score: number;
  store_name?: string;
}

export interface SearchFilters {
  name: string;
  test_date: string;
  position: string;
  member_code: string;   // 會員編號
}

/**
 * 壓力測試管理Hook
 * 提供壓力測試數據的加載、搜索、刪除功能
 */
export const useStressTest = () => {
  const [tests, setTests] = useState<StressTest[]>([]);
  const [selectedTests, setSelectedTests] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  
  // 獲取壓力測試數據
  const fetchTests = useCallback(async (filters?: SearchFilters) => {
    try {
      setLoading(true);
      const response = await getAllStressTests(filters);
      setTests(
        Array.isArray(response)
          ? sortByStoreAndMemberCode(
              response,
              (test) => test.store_name ?? (test as any).store_id ?? "",
              (test) => test.member_code ?? "",
              (test) => test.ipn_stress_id
            )
          : []
      );
    } catch (error) {
      console.error('Error fetching stress tests:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 首次加載時獲取數據
  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  // 處理搜索
  const handleSearch = useCallback(async (filters: SearchFilters) => {
    await fetchTests(filters);
  }, [fetchTests]);

  // 處理勾選
  const handleCheckboxChange = useCallback((id: number) => {
    setSelectedTests(prev => {
      if (prev.includes(id)) {
        return prev.filter(testId => testId !== id);
      } else {
        return [...prev, id];
      }
    });
  }, []);

  // 處理刪除
  const handleDelete = useCallback(async () => {
    if (selectedTests.length === 0) return;
    
    if (!window.confirm("確定要刪除所選的測試記錄嗎？")) return;
    
    try {
      setLoading(true);
      for (const id of selectedTests) {
        await deleteStressTest(id);
      }
      await fetchTests();
      setSelectedTests([]);
    } catch (error) {
      console.error('Error deleting stress tests:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedTests, fetchTests]);

  const handleExport = useCallback(async () => {
    try {
      setLoading(true);
      const blob = await exportStressTests();
      downloadBlob(blob, "壓力測試.xlsx");
    } catch (error) {
      console.error('Error exporting stress tests:', error);
      alert('匯出報表失敗！');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    tests,
    selectedTests,
    loading,
    fetchTests,
    handleSearch,
    handleCheckboxChange,
    handleDelete,
    handleExport
  };
};

export type { StressTest, SearchFilters }; 