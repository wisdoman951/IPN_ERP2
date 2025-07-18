// ./src/hooks/useStressTest.ts
import { useState, useEffect, useCallback } from 'react';
import { getAllStressTests, deleteStressTest, StressTestData } from '../services/StressTestService';

interface StressTest {
  ipn_stress_id: number;
  member_id: number;
  Name: string;
  a_score: number;
  b_score: number;
  c_score: number;
  d_score: number;
  total_score: number;
}

export interface SearchFilters {
  name: string;
  test_date: string; // 新增
  position: string;  // 新增
  // member_id?: string; // 移除或設為可選
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
      setTests(response);
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

  return {
    tests,
    selectedTests,
    loading,
    fetchTests,
    handleSearch,
    handleCheckboxChange,
    handleDelete
  };
};

export type { StressTest, SearchFilters }; 