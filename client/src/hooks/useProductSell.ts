// client\src\hooks\useProductSell.ts
import axios from 'axios';
import { useState, useEffect, useCallback } from 'react';
import { 
  getAllProductSells, 
  searchProductSells, 
  deleteProductSell, 
  exportProductSells, 
  ProductSell 
} from '../services/ProductSellService';
import { downloadBlob } from '../utils/downloadBlob';
import { sortByStoreAndMemberCode } from '../utils/storeMemberSort';

interface UseProductSellReturn {
  sales: ProductSell[];
  selectedSales: number[];
  loading: boolean;
  error: string | null;
  keyword: string;
  setKeyword: (keyword: string) => void;
  fetchSales: () => Promise<void>;
  handleSearch: () => Promise<void>;
  handleDelete: () => Promise<void>;
  handleExport: () => Promise<void>;
  handleCheckboxChange: (saleId: number, checked: boolean) => void;
  selectAll: (checked: boolean) => void;
}

/**
 * 產品銷售記錄管理的自定義 Hook
 * @returns 產品銷售記錄相關的狀態和操作方法
 */
export const useProductSell = (): UseProductSellReturn => {
  const [sales, setSales] = useState<ProductSell[]>([]);
  const [selectedSales, setSelectedSales] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");

  const sortSales = (list: ProductSell[]) =>
    sortByStoreAndMemberCode(
      list,
      (sale) => sale.store_name ?? sale.store_id ?? "",
      (sale) => sale.member_code ?? "",
      (sale) => sale.product_sell_id
    );

  // 獲取所有產品銷售記錄
  const fetchSales = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllProductSells();
      setSales(Array.isArray(data) ? sortSales(data) : []);
    } catch (error) {
      console.error("獲取產品銷售記錄失敗：", error);
      setError("獲取產品銷售記錄失敗");
    } finally {
      setLoading(false);
    }
  }, []);

  // 搜尋產品銷售記錄
  const handleSearch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await searchProductSells(keyword);
      setSales(Array.isArray(data) ? sortSales(data) : []);
    } catch (error) {
      console.error("搜尋產品銷售記錄失敗：", error);
      setError("搜尋產品銷售記錄失敗");
    } finally {
      setLoading(false);
    }
  }, [keyword]);

  // 刪除產品銷售記錄
  const handleDelete = useCallback(async () => {
    if (selectedSales.length === 0) {
      alert("請先選擇要刪除的記錄！");
      return;
    }

    const permission = localStorage.getItem('permission');
    if (permission === 'therapist') {
      setError('無操作權限');
      alert('無操作權限');
      return;
    }

    if (window.confirm("確定要刪除選中的記錄嗎？")) {
      try {
        setLoading(true);
        setError(null);
        for (const id of selectedSales) {
          await deleteProductSell(id);
        }
        alert("刪除成功！");
        setSelectedSales([]);
        fetchSales();
      } catch (error) {
        console.error("刪除產品銷售記錄失敗：", error);
        if (error instanceof Error && error.message === '無操作權限') {
          setError('無操作權限');
          alert('無操作權限');
        } else if (axios.isAxiosError(error) && error.response?.status === 403) {
          setError('無操作權限');
          alert('無操作權限');
        } else {
          setError("刪除產品銷售記錄失敗");
          alert("刪除失敗，請稍後再試！");
        }
      } finally {
        setLoading(false);
      }
    }
  }, [selectedSales, fetchSales]);

  // 匯出產品銷售記錄
  const handleExport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const blob = await exportProductSells();
      downloadBlob(blob, "產品銷售紀錄.xlsx");
    } catch (error) {
      console.error("匯出銷售記錄失敗：", error);
      setError("匯出銷售記錄失敗");
    } finally {
      setLoading(false);
    }
  }, []);

  // 處理選擇框勾選狀態變化
  const handleCheckboxChange = useCallback((saleId: number, checked: boolean) => {
    if (checked) {
      setSelectedSales(prev => [...prev, saleId]);
    } else {
      setSelectedSales(prev => prev.filter(id => id !== saleId));
    }
  }, []);

  // 全選/取消全選
  const selectAll = useCallback((checked: boolean) => {
    if (checked) {
      const allIds = sales.map(sale => sale.product_sell_id);
      setSelectedSales(allIds);
    } else {
      setSelectedSales([]);
    }
  }, [sales]);

  // 初始載入資料
  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  return {
    sales,
    selectedSales,
    loading,
    error,
    keyword,
    setKeyword,
    fetchSales,
    handleSearch,
    handleDelete,
    handleExport,
    handleCheckboxChange,
    selectAll
  };
}; 