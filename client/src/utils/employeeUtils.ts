/**
 * 員工紀錄相關工具函數
 */

/**
 * 格式化日期為本地化字符串
 * @param dateString 日期字符串
 * @returns 格式化後的日期字符串
 */
export const formatDate = (dateString: string): string => {
  try {
    return new Date(dateString).toLocaleDateString();
  } catch (error) {
    console.error("日期格式化錯誤:", error);
    return dateString || "-";
  }
};

/**
 * 獲取當天日期字符串，格式為 YYYY-MM-DD
 * @returns 當天日期字符串
 */
export const getTodayDateString = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * 驗證員工記錄數據
 * @param record 員工記錄數據
 * @returns 錯誤消息，如果沒有錯誤則返回null
 */
export const validateEmployeeRecord = (record: {
  name?: string;
  department_id?: number;
  position?: string;
  hire_date?: string;
  status?: string;
}): string | null => {
  if (!record.name || record.name.trim() === "") {
    return "員工姓名不能為空";
  }
  
  if (!record.department_id) {
    return "部門不能為空";
  }
  
  if (!record.position || record.position.trim() === "") {
    return "職位不能為空";
  }
  
  if (!record.hire_date) {
    return "入職日期不能為空";
  }
  
  if (!record.status) {
    return "狀態不能為空";
  }
  
  return null;
};

/**
 * 截斷長文本並添加省略號
 * @param text 原始文本
 * @param maxLength 最大長度
 * @returns 截斷後的文本
 */
export const truncateText = (text: string, maxLength: number = 50): string => {
  if (!text) return "";
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

/**
 * 格式化員工狀態
 * @param status 員工狀態
 * @returns 格式化後的狀態文本
 */
export const formatEmployeeStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    active: "在職",
    inactive: "離職",
    terminated: "終止合約",
    on_leave: "休假中"
  };
  
  return statusMap[status] || status;
};

/**
 * 獲取員工狀態的標籤顏色
 * @param status 員工狀態
 * @returns 狀態對應的 Bootstrap 顏色類
 */
export const getStatusBadgeClass = (status: string): string => {
  const classMap: Record<string, string> = {
    active: "success",
    inactive: "secondary",
    terminated: "danger",
    on_leave: "warning"
  };
  
  return classMap[status] || "info";
}; 