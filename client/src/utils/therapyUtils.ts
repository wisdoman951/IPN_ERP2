/**
 * 療程紀錄相關工具函數
 */

/**
 * 將日期格式化為人類可讀格式
 * @param dateStr ISO格式的日期字符串
 * @returns 格式化後的日期
 */
export const formatDate = (dateStr: string | undefined): string => {
  if (!dateStr) return "-";

  try {
    const date = new Date(dateStr);
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
  } catch (e) {
    console.error("日期格式化錯誤:", e);
    return dateStr || "-";
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
 * 驗證療程記錄數據
 * @param record 療程記錄數據
 * @returns 錯誤消息，如果沒有錯誤則返回null
 */
export const validateTherapyRecord = (record: {
  member_id?: string | number;
  date?: string;
  staff_id?: string | number;
}): string | null => {
  if (!record.member_id) {
    return "會員ID不能為空";
  }
  
  if (!record.date) {
    return "療程日期不能為空";
  }
  
  if (!record.staff_id) {
    return "服務人員ID不能為空";
  }
  
  return null;
};

/**
 * 截斷文本並添加省略號
 * @param text 要截斷的文本
 * @param maxLength 最大長度
 * @returns 截斷後的文本
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
};

/**
 * 格式化數字，去除小數點
 * @param value 要格式化的數字
 * @returns 格式化後的數字文本
 */
export const formatNumber = (value: number | string | undefined): string => {
  if (value === undefined || value === null) return "-";
  
  try {
    // 如果是字符串，先轉換為數字
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    // 檢查是否是有效數字
    if (isNaN(numValue)) return String(value);
    // 四捨五入到整數
    return Math.round(numValue).toString();
  } catch (e) {
    console.error("數字格式化錯誤:", e);
    return String(value);
  }
};

/**
 * 格式化貨幣 (移除小數點)
 * @param value 要格式化的金額
 * @returns 格式化後的金額文本
 */
export const formatCurrency = (value: number | string | undefined): string => {
  if (value === undefined || value === null) return "-";
  
  try {
    // 如果是字符串，先轉換為數字
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    // 檢查是否是有效數字
    if (isNaN(numValue)) return String(value);
    // 四捨五入到整數並加上$符號
    return `$${Math.round(numValue)}`;
  } catch (e) {
    console.error("貨幣格式化錯誤:", e);
    return String(value);
  }
}; 