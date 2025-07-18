// .\src\utils\pureMedicalUtils.ts
/**
 * 用於淨化健康紀錄相關的工具函數
 */

/**
 * 格式化日期顯示
 * @param dateStr 日期字串
 * @returns 格式化的日期字串，如果無效則返回"-"
 */
export const formatDate = (dateStr?: string): string => {
  if (!dateStr) return "-";
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    // 格式化為 YYYY-MM-DD
    return date.toISOString().split('T')[0];
  } catch (e) {
    return dateStr;
  }
};

/**
 * BMI 數值狀態類型
 */
export interface BMIStatus {
  status: string;
  variant: string;
}

/**
 * 根據 BMI 數值獲取狀態信息
 * @param bmiValue BMI 數值或字串
 * @returns BMI 狀態對象，包含狀態描述和對應的樣式
 */
export const getBMIStatus = (bmiValue: number | string): BMIStatus | null => {
  if (typeof bmiValue === 'string') {
    if (bmiValue === '-') return null;
    bmiValue = parseFloat(bmiValue);
    if (isNaN(bmiValue)) return null;
  }
  
  if (bmiValue < 18.5) return { status: "偏輕", variant: "info" };
  if (bmiValue < 24) return { status: "正常", variant: "success" };
  if (bmiValue < 27) return { status: "過重", variant: "warning" };
  if (bmiValue < 30) return { status: "輕度肥胖", variant: "warning" };
  if (bmiValue < 35) return { status: "中度肥胖", variant: "danger" };
  return { status: "重度肥胖", variant: "danger" };
};

/**
 * 計算 BMI 數值
 * @param height 身高 (cm)
 * @param weight 體重 (kg)
 * @returns 計算的 BMI 數值，保留一位小數
 */
export const calculateBMI = (height: number, weight: number): string => {
  if (!height || !weight) return "-";
  const heightInMeters = height / 100;
  const bmi = weight / (heightInMeters * heightInMeters);
  return bmi.toFixed(1);
};

/**
 * 獲取當前日期的 ISO 字串 (YYYY-MM-DD)
 * @returns 當前日期的 ISO 字串
 */
export const getTodayDateString = (): string => {
  return new Date().toISOString().split('T')[0];
}; 