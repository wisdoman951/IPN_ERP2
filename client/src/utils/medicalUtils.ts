/**
 * 醫療記錄相關的通用工具函數
 */

/**
 * 將 JSON 格式的病史轉換為易讀的格式
 * @param jsonString 病史的 JSON 字符串
 * @returns 格式化後的病史字符串
 */
export const formatMedicalHistory = (jsonString: string): string => {
    if (!jsonString) return "-";

    const trimmed = jsonString.trim();

    // 如果字串不是 JSON 物件或陣列，直接回傳原始內容
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
        return trimmed;
    }

    try {
        const historyObj = JSON.parse(trimmed);
        const formattedItems: string[] = [];

        // 遍歷每個鍵值對
        for (const [key, values] of Object.entries(historyObj)) {
            if (Array.isArray(values) && values.length > 0) {
                // 將陣列值用中文頓號連接
                const valuesStr = (values as string[]).filter(v => v).join("、");
                if (valuesStr) {
                    formattedItems.push(`${key}: ${valuesStr}`);
                }
            }
        }

        // 如果沒有有效內容，返回短橫線
        return formattedItems.length > 0 ? formattedItems.join("; ") : "-";

    } catch {
        // 如果解析失敗，返回原始字串，避免在 console 中大量錯誤訊息
        return trimmed;
    }
};

/**
 * 格式化微整型狀態
 * @param value 微整型狀態值 (0 或 1)
 * @returns 格式化後的文字 ("是" 或 "否")
 */
export const formatMicroSurgery = (value: string | undefined): string => {
    // 為了更可靠，我們先將傳入的值轉成小寫再做比較
    // 這樣不管後端傳來 "Yes", "yes", 或 "YES"，都能正確處理
    if (value && value.toLowerCase() === 'yes') {
        return '是';
    }
    return '否';
};