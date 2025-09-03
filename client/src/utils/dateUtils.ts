// IPN_ERP/client/src/utils/dateUtils.ts (新檔案)

/**
 * 將日期字串或 Date 物件格式化為 "YYYY/MM/DD" 格式。
 * @param dateInput - 任何可以被 new Date() 解析的日期格式
 * @returns 格式化後的日期字串，如果輸入無效則返回 '-'
 */
export const formatDateToYYYYMMDD = (dateInput: string | Date | null | undefined): string => {
  // 如果輸入是空值或無效，直接返回橫線
  if (!dateInput) {
    return '-';
  }

  try {
    const date = new Date(dateInput);
    
    // 檢查日期是否有效
    if (isNaN(date.getTime())) {
      return '-';
    }

    const year = date.getFullYear();
    // getMonth() 返回 0-11，所以需要加 1
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    // getDate() 返回 1-31
    const day = date.getDate().toString().padStart(2, '0');

    return `${year}/${month}/${day}`;
  } catch (error) {
    console.error("日期格式化失敗:", error);
    return '-';
  }
};

/**
 * 將日期字串或 Date 物件格式化為 HTML `<input type="date">` 可使用的 `YYYY-MM-DD` 格式。
 * @param dateInput - 可以被 `new Date()` 解析的日期
 * @returns `YYYY-MM-DD` 格式字串，若輸入無效則回傳空字串
 */
export const formatDateForInput = (dateInput: string | Date | null | undefined): string => {
  if (!dateInput) return '';
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.error('日期格式化失敗:', error);
    return '';
  }
};
