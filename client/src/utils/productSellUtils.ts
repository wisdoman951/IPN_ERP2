// .\src\utils\productSellUtils.ts
/**
 * 將金額格式化為台幣顯示 (整數格式)
 * @param amount 金額數字
 * @returns 格式化後的金額字串，例如 "NT$1,360"
 */
export const formatCurrency = (amount: number | undefined): string => {
  if (amount === undefined || isNaN(amount)) return 'N/A';
  
  // 使用 Math.round() 確保是整數，並在 toLocaleString 選項中設定不顯示小數位
  return Math.round(amount).toLocaleString('zh-TW', { 
    style: 'currency', 
    currency: 'TWD',
    maximumFractionDigits: 0 
  });
};

/**
 * 將折扣數值格式化為顯示文字
 * @param discount 折扣數值 (0-100)
 * @returns 格式化後的折扣字串
 */
export const formatDiscount = (discount: number | undefined): string => {
  if (discount === undefined || isNaN(discount)) return '無折扣';
  if (discount === 0) return '無折扣';
  return `${discount}%`;
};

/**
 * 計算折扣後的價格
 * @param price 原價
 * @param discount 折扣百分比 (0-100)
 * @returns 折扣後的價格
 */
export const calculateDiscountedPrice = (price: number, discount: number): number => {
  if (!price || !discount) return price || 0;
  return price * (1 - discount / 100);
};

/**
 * 計算總價
 * @param price 單價
 * @param quantity 數量
 * @param discount 折扣百分比 (0-100)，默認為0
 * @returns 計算後的總價
 */
export const calculateTotalPrice = (price: number, quantity: number, discount: number = 0): number => {
  if (!price || !quantity) return 0;
  
  const discountedPrice = discount ? calculateDiscountedPrice(price, discount) : price;
  return discountedPrice * quantity;
};

/**
 * 產生下載 Blob 的連結並自動點擊
 * @param blob Blob 資料
 * @param filename 檔案名稱
 */
export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = window.URL.createObjectURL(new Blob([blob]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
}; 