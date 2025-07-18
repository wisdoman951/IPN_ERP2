// ./src/utils/memberUtils.ts
/**
 * 會員相關的通用工具函數
 */

/**
 * 將生日格式轉換為民國年格式 (民國YYY年MM月DD日)
 */
export const formatBirthday = (dateString: string | undefined | null): string => {
    if (!dateString) return '';
    
    try {
        const date = new Date(dateString);
        // 檢查日期是否有效
        if (isNaN(date.getTime())) return dateString; // 如果無效，返回原字串
        
        const westernYear = date.getFullYear();
        const rocYear = westernYear - 1911; // 西元年 - 1911 = 民國年
        const month = date.getMonth() + 1;
        const day = date.getDate();
        
        // 確保月份和日期是兩位數
        const monthStr = month.toString().padStart(2, '0');
        const dayStr = day.toString().padStart(2, '0');
        
        return `${rocYear}年${monthStr}月${dayStr}日`;
    } catch (error) {
        console.error("formatBirthday (to Minguo) - 日期格式轉換錯誤:", error);
        return dateString; // 發生錯誤時返回原字串
    }
};
/**
 * (新增函數)
 * 將日期字串 (應為西元格式，例如 "YYYY-MM-DD") 轉換為指定的西元年月日格式。
 * 這個函數將在 MemberInfo.tsx 中用於顯示生日。
 * @param dateString 日期字串 (例如 "YYYY-MM-DD")
 * @param outputFormat 'YYYY/MM/DD' 或 'YYYYMMDD'
 * @returns 格式化後的日期字串，或 "N/A" (如果無法解析或輸入無效)
 */
export const formatGregorianBirthday = (
    dateString: string | undefined | null,
    outputFormat: 'YYYY/MM/DD' | 'YYYYMMDD' = 'YYYY/MM/DD'
): string => {
    if (!dateString) return "N/A";

    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            // console.warn(`formatGregorianBirthday: 無效的日期字串 "${dateString}"`);
            return "N/A"; 
        }

        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');

        if (outputFormat === 'YYYYMMDD') {
            return `${year}${month}${day}`;
        }
        return `${year}/${month}/${day}`; // 預設 'YYYY/MM/DD'
    } catch (error) {
        console.error(`formatGregorianBirthday - 日期處理錯誤 for "${dateString}":`, error);
        return "N/A";
    }
};

/**
 * 將性別英文轉換為中文
 * @param gender 性別字串 (例如 'Male', 'female')
 * @returns 中文性別，或原始字串 (如果無法匹配)
 */
export const formatGender = (gender: string | undefined | null): string => {
    if (!gender) return ''; // 處理空字串或 undefined/null 的情況
    switch (gender.toLowerCase()) { // 使用 toLowerCase() 增加匹配彈性
        case 'male':
            return '男';
        case 'female':
            return '女';
        case 'other':
            return '其他';
        default:
            return gender; // 如果不是預期值，返回原值
    }
};

/**
 * 將日期轉換為民國年格式 (民國YYY年MM月DD日)
 * @param dateStr 日期字符串 (應為西元格式，例如 "YYYY-MM-DD")
 * @returns 民國年格式日期
 */
export const formatDateToChinese = (dateStr: string | undefined | null): string => {
    if (!dateStr) return '未設定';
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return '日期格式錯誤';

        const year = date.getFullYear() - 1911; // 西元年轉民國年
        const month = date.getMonth() + 1;
        const day = date.getDate();
        
        // 確保月份和日期是兩位數
        const monthStr = month.toString().padStart(2, '0');
        const dayStr = day.toString().padStart(2, '0');

        return `民國${year}年${monthStr}月${dayStr}日`;
    } catch (e) {
        console.error(`formatDateToChinese - 日期處理錯誤 for "${dateStr}":`, e);
        return '日期格式錯誤';
    }
};

/**
 * 性別轉換為中文 (處理 undefined 情況)
 * @param gender 性別字符串
 * @returns 中文性別
 */
export const formatGenderToChinese = (gender: string | undefined | null): string => {
    if (!gender) return '未設定';
    switch (gender.toLowerCase()) {
        case 'male':
            return '男';
        case 'female':
            return '女';
        case 'other':
            return '其他';
        default:
            return gender;
    }
}; 

/**
 * (修改現有函數)
 * 計算年齡（依據出生日期）
 * 如果今年還沒過生日，會減一歲
 * @param birthday 日期字串 (應為西元格式，例如 "YYYY-MM-DD")
 * @returns 計算出的年齡 (數字)，如果日期無效或生日在未來則返回 "N/A"
 */
export const calculateAge = (birthday: string | undefined | null): number | string => {
    if (!birthday) return "N/A";
    
    try {
        const birthDate = new Date(birthday);
        if (isNaN(birthDate.getTime())) {
            // console.warn(`calculateAge: 無效的生日字串 "${birthday}"`);
            return "N/A";
        }
        
        const today = new Date();
        
        let age = today.getFullYear() - birthDate.getFullYear();
        
        const birthMonth = birthDate.getMonth();
        const currentMonth = today.getMonth();
        const birthDayOfMonth = birthDate.getDate();
        const currentDayOfMonth = today.getDate();

        // 如果當前月份小於生日月份，或者月份相同但日期小於生日日期，則年齡減一
        if (currentMonth < birthMonth || (currentMonth === birthMonth && currentDayOfMonth < birthDayOfMonth)) {
            age--;
        }
        
        // 如果計算出的年齡小於0 (例如生日在未來)，返回 "N/A"
        return age < 0 ? "N/A" : age;
    } catch (error) {
        console.error(`calculateAge - 年齡計算錯誤 for "${birthday}":`, error);
        return "N/A";
    }
};