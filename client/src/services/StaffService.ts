// client/src/services/StaffService.ts
import axios from "axios";
import { base_url } from "./BASE_URL";
import { getAuthHeaders } from "./AuthUtils";

const API_URL = `${base_url}/staff`;

// 判斷是否具有總店/管理員權限
const isAdmin = (): boolean => {
  const level = localStorage.getItem("store_level");
  const perm = localStorage.getItem("permission");
  return level === "總店" || perm === "admin";
};

// 定義員工接口
export interface Staff {
  Staff_ID: number;
  Staff_Name: string;
  Staff_ID_Number: string;
  Staff_Phone?: string;
  Staff_Status?: string;
  Staff_Email?: string;
  Staff_Sex?: string;
  Staff_Store?: string;
  Staff_PermissionLevel?: string;
  Staff_IdNumber?: string;
}

// 獲取所有員工
export const getAllStaff = async (storeId?: number) => {
  try {
    const params: any = {};
    if (!isAdmin() && storeId !== undefined) {
      params.store_id = storeId;
    } else if (isAdmin() && storeId !== undefined) {
      params.store_id = storeId;
    }

    const response = await axios.get(`${API_URL}/list`, { params, headers: getAuthHeaders() });
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

// 搜尋員工
export const searchStaff = async (keyword: string, storeId?: number) => {
  try {
    const params: any = { keyword };
    if (!isAdmin() && storeId !== undefined) {
      params.store_id = storeId;
    } else if (isAdmin() && storeId !== undefined) {
      params.store_id = storeId;
    }

    const response = await axios.get(`${API_URL}/search`, {
      params,
      headers: getAuthHeaders()
    });
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error("搜尋員工失敗:", error);
    return {
      success: false,
      data: []
    };
  }
};

// 單筆員工資料
export const getStaffById = async (staffId: number) => {
  try {
    const response = await axios.get(`${API_URL}/${staffId}`, {
      headers: getAuthHeaders()
    });
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error(`獲取員工 ID ${staffId} 資料失敗:`, error);
    return {
      success: false,
      data: null
    };
  }
};

// 員工詳細資料
export const getStaffDetails = async (staffId: number) => {
  try {
    const response = await axios.get(`${API_URL}/details/${staffId}`, {
      headers: getAuthHeaders()
    });
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error(`獲取員工 ID ${staffId} 詳細資料失敗:`, error);
    return {
      success: false,
      data: null
    };
  }
};

// 新增員工
export const addStaff = async (staffData: any) => {
  try {
    const response = await axios.post(`${API_URL}/add`, staffData, {
      headers: getAuthHeaders()
    });
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error("新增員工失敗:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "新增員工時發生錯誤"
    };
  }
};

// 更新員工
export const updateStaff = async (staffId: number, staffData: any) => {
  try {
    const response = await axios.put(`${API_URL}/update/${staffId}`, staffData, {
      headers: getAuthHeaders()
    });
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error(`更新員工 ID ${staffId} 失敗:`, error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "更新資料時發生錯誤"
    };
  }
};

// 刪除員工
export const deleteStaff = async (staffId: number) => {
  try {
    const response = await axios.delete(`${API_URL}/delete/${staffId}`, {
      headers: getAuthHeaders()
    });
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error(`刪除員工 ID ${staffId} 失敗:`, error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "刪除失敗"
    };
  }
};

// 批量刪除
export const deleteMultipleStaff = async (staffIds: number[]) => {
  try {
    const results = await Promise.all(staffIds.map(id => deleteStaff(id)));
    const allSuccessful = results.every(r => r.success);
    return {
      success: allSuccessful,
      message: allSuccessful ? "全部成功刪除" : "有部分刪除失敗"
    };
  } catch (error) {
    console.error("批量刪除失敗:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "發生錯誤"
    };
  }
};

// 分店清單
export const getAllStores = async () => {
  try {
    const response = await axios.get(`${API_URL}/stores`, {
      headers: getAuthHeaders()
    });
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error("獲取分店失敗:", error);
    return {
      success: false,
      data: []
    };
  }
};

// 權限列表
export const getAllPermissions = async () => {
  try {
    const response = await axios.get(`${API_URL}/permissions`, {
      headers: getAuthHeaders()
    });
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error("獲取權限失敗:", error);
    return {
      success: false,
      data: []
    };
  }
};

// 匯出員工 Excel
export const exportStaffToExcel = async (filters = {}) => {
  try {
    const response = await axios.get(`${API_URL}/export`, {
      params: filters,
      responseType: "blob",
      headers: getAuthHeaders()
    });
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error("匯出失敗:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "發生錯誤"
    };
  }
};

// Select 用簡版
export const getAllStaffs = async (): Promise<Staff[]> => {
  const result = await getAllStaff();
  return result.success ? (result.data as Staff[]) : [];
};
export const getAllStaffForDropdown = getAllStaffs;

// ====================================================================
// --- 總部「使用者帳號管理」功能新增的函式 ---
// ====================================================================

// 1. 新增：員工帳號資料的介面 (保持不變)
export interface StaffAccount {
    staff_id: number;
    name: string;
    phone: string;
    account: string;
    password?: string;
    store_id?: number;
    store_name?: string;
}

// 2. 新增：分店列表的介面 (保持不變)
export interface Store {
    store_id: number;
    store_name: string;
}

// 3. **修正**：獲取所有員工帳號列表
export const getStaffAccounts = async (keyword?: string): Promise<StaffAccount[]> => {
    try {
        // **這裡是關鍵修正**：確保 getAuthHeaders() 的回傳值被正確地放在 headers 物件中
        const response = await axios.get(`${API_URL}/accounts`, {
            headers: getAuthHeaders(), // <-- 修正點
            params: { keyword: keyword || undefined }
        });
        return response.data;
    } catch (error) {
        console.error("獲取員工帳號列表失敗:", error);
        throw error;
    }
};

// 4. **修正**：更新員工帳號資訊
export const updateStaffAccount = async (staffId: number, data: Partial<StaffAccount>) => {
    try {
        // **這裡是關鍵修正**：確保 getAuthHeaders() 的回傳值被正確地放在 headers 物件中
        const response = await axios.put(`${API_URL}/account/${staffId}`, data, {
            headers: getAuthHeaders() // <-- 修正點
        });
        return response.data;
    } catch (error) {
        console.error(`更新員工帳號 ${staffId} 失敗:`, error);
        throw error;
    }
};

// 5. **修正**：新增員工帳號
export const createStaffAccount = async (data: Partial<StaffAccount>) => {
    try {
        // **這裡是關鍵修正**：確保 getAuthHeaders() 的回傳值被正確地放在 headers 物件中
        const response = await axios.post(`${API_URL}/add`, data, {
            headers: getAuthHeaders() // <-- 修正點
        });
        return response.data;
    } catch (error) {
        console.error("新增員工帳號失敗:", error);
        throw error;
    }
};

// 6. 沿用您原有的 getAllStores 函式
// 為了讓 AddEditUserAccount.tsx 能直接使用，我們做一個簡單的包裝
export const fetchStoresForDropdown = async (): Promise<Store[]> => {
    try {
        // 呼叫我們剛剛建立的、最乾淨的 API
        const response = await axios.get(`${API_URL}/stores-for-dropdown`, {
            headers: getAuthHeaders()
        });
        // 後端直接回傳陣列，所以我們也直接回傳
        return response.data; 
    } catch (error) {
        console.error("獲取下拉選單分店列表失敗:", error);
        return []; // 出錯時返回空陣列
    }
};

// --- [新功能專用] 根據分店ID獲取員工列表 ---
export const getStaffByStore = async (storeId: number): Promise<{ staff_id: number; name: string; }[]> => {
    if (!storeId) return []; // 如果沒有選擇分店，返回空陣列
    try {
        const response = await axios.get(`${API_URL}/by-store/${storeId}`, {
            headers: getAuthHeaders()
        });
        return response.data; 
    } catch (error) {
        console.error(`獲取分店 ${storeId} 的員工列表失敗:`, error);
        return [];
    }
};