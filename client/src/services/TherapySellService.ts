// client\src\services\TherapySellService.ts
import axios from "axios";
import { base_url } from "./BASE_URL";
import { getAuthHeaders } from "./AuthUtils";
import type { MemberIdentity } from "../types/memberIdentity";

// API 端點基礎路徑
const API_URL = `${base_url}/therapy-sell`; // 所有此服務的 API 都基於此路徑
const COMMON_DATA_API_URL = `${base_url}`; 

// ------ Start: 定義通用型別 ------
export interface StaffMember {
  staff_id: number;
  name: string;
  // 以下是為了兼容後端可能返回的不同寫法，map 時會統一
  Staff_ID?: number;
  Staff_Name?: string;
  Name?: string;
}

export interface TherapyPackage { // 這是基礎的 TherapyPackage 型別
  therapy_id?: number; // 個別療程 ID
  bundle_id?: number;  // 若為組合則使用 bundle_id
  type?: 'therapy' | 'bundle';
  TherapyCode: string;
  TherapyName?: string;
  TherapyContent: string;
  TherapyPrice: number;
  code?: string;
  name?: string;
  content?: string;
  price?: number;
  categories?: string[];
  price_tiers?: Partial<Record<MemberIdentity, number>>;
  basePrice?: number;
}

export interface Store {
    store_id: number;
    name: string; // 或 store_name，根據 API 返回調整
}

export interface Member { // 用於 getAllMembers
    member_id: number; // API 返回的是 number
    name: string;
}

// 用於「新增/修改療程銷售」時，前端發送給後端的資料結構
export interface AddTherapySellPayload {
  memberId: number;
  storeId?: number;
  staffId: number;
  purchaseDate: string;
  therapy_id?: number | null; // 單一療程的 ID
  bundle_id?: number | null;  // 若為組合則帶入 bundle_id
  amount: number;           // 對應堂數或組合數量
  paymentMethod: string;    // 英文 ENUM 值
  saleCategory?: string;   // 英文 ENUM 值
  transferCode?: string;
  cardNumber?: string;
  discount?: number;       // 折扣百分比 (針對此療程項目，或整筆訂單的，需與後端協調)
  finalPrice?: number;     // 最終價格
  note?: string;
}

// 用於「獲取療程銷售列表」時，後端返回的單筆資料結構
export interface TherapySellRow {
    Order_ID: number;       // therapy_sell_id
    Member_ID: number;
    MemberCode?: string;
    MemberName: string;
    PurchaseDate: string;   // 後端應返回 YYYY-MM-DD 格式字串
    PackageName: string;    // therapy.name
    Sessions: number;       // therapy_sell.amount
    Price?: number;         // 療程的總價 (可能需要後端計算或前端根據單價和數量計算)
    PaymentMethod: string;  // 英文 ENUM 值
    StaffName: string;
    SaleCategory: string;   // 英文 ENUM 值
    Note?: string;
    // 以下是後端 get_all_therapy_sells 返回的其他欄位，按需加入
    TherapyCode?: string;
    Staff_ID?: number;
    UnitPrice?: number;
    store_name?: string;
    store_id?: number;
    therapy_id?: number;
}

// 新增並導出 SelectedTherapyPackageUIData
export interface SelectedTherapyPackageUIData extends TherapyPackage { // 直接繼承 TherapyPackage
  userSessions: string; // 單堂數量或組合數量
  itemOriginalTotal?: number;
  calculatedItemDiscount?: number;
  calculatedItemFinalPrice?: number;
}
// API 回應的通用結構
interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string; // 有時後端成功時也會有 message
}
// ------ End: 定義通用型別 ------


// 獲取所有療程套餐 API
export const getAllTherapyPackages = async (): Promise<ApiResponse<TherapyPackage[]>> => {
    try {
        const response = await axios.get(`${API_URL}/packages`, { headers: getAuthHeaders() }); // 使用 API_URL
        
        if (response.data && Array.isArray(response.data)) {
            const formattedData = response.data.map((item: any) => ({
                therapy_id: item.therapy_id,
                TherapyCode: item.TherapyCode || item.code, // 兼容後端欄位名
                TherapyPrice: item.TherapyPrice || item.price,
                TherapyName: item.TherapyName || item.name,
                TherapyContent: item.TherapyContent || item.content || item.TherapyName || item.name || '',
                categories: item.categories || [],
                price_tiers: item.price_tiers || {},
            }));
            return { success: true, data: formattedData };
        } else if (response.data && typeof response.data === 'object' && response.data.hasOwnProperty('data') && Array.isArray(response.data.data)) {
            // 如果 API 返回 { success: true, data: [...] }
             const formattedData = response.data.data.map((item: any) => ({
                therapy_id: item.therapy_id,
                TherapyCode: item.TherapyCode || item.code,
                TherapyPrice: item.TherapyPrice || item.price,
                TherapyName: item.TherapyName || item.name,
                TherapyContent: item.TherapyContent || item.content || item.TherapyName || item.name || '',
                categories: item.categories || [],
                price_tiers: item.price_tiers || {},
            }));
            return { success: response.data.success, data: formattedData, message: response.data.message };
        }
        console.error("getAllTherapyPackages: API 回應格式不符期望:", response.data);
        return { success: false, data: [], error: "療程套餐數據格式錯誤" };
    } catch (error: any) {
        console.error("獲取療程套餐失敗:", error);
        return { success: false, data: [], error: error.response?.data?.error || error.message || "獲取療程套餐失敗" };
    }
};

// 員工相關 API - 根據分店取得員工資料
export const getStaffMembers = async (storeId?: number): Promise<ApiResponse<StaffMember[]>> => {
    try {
        const perm = localStorage.getItem('permission');
        let params;
        if (perm === 'admin') {
            params = undefined;
        } else {
            const resolvedStoreId = storeId ?? Number(localStorage.getItem('store_id'));
            params = resolvedStoreId ? { store_id: resolvedStoreId } : undefined;
        }
        const response = await axios.get(`${API_URL}/staff`, { params, headers: getAuthHeaders() });

        if (response.data && Array.isArray(response.data)) {
            const staffData = response.data.map((staff: any) => ({
                staff_id: staff.staff_id || staff.Staff_ID,
                name: staff.name || staff.Staff_Name || "未知員工",
            }));
            return { success: true, data: staffData };
        } else if (
            response.data &&
            typeof response.data === 'object' &&
            response.data.hasOwnProperty('data') &&
            Array.isArray(response.data.data)
        ) {
            const staffData = response.data.data.map((staff: any) => ({
                staff_id: staff.staff_id || staff.Staff_ID,
                name: staff.name || staff.Staff_Name || "未知員工",
            }));
            return { success: response.data.success, data: staffData, message: response.data.message };
        }
        console.error("getStaffMembers: API 回應格式不符期望:", response.data);
        return { success: false, data: [], error: "員工數據格式錯誤" };
    } catch (error: any) {
        console.error("獲取員工資料失敗:", error);
        return { success: false, data: [], error: error.response?.data?.error || error.message || "獲取員工資料失敗" };
    }
};

// 店鋪相關 API
export const getAllStores = async (): Promise<ApiResponse<Store[]>> => {
    try {
        const response = await axios.get(`${API_URL}/stores`, { headers: getAuthHeaders() }); // 使用 API_URL
         if (response.data && Array.isArray(response.data)) {
            const formattedData = response.data.map((store: any) => ({
                store_id: store.store_id, 
                name: store.name || store.store_name || "未知店家",
            }));
            return { success: true, data: formattedData };
        } else if (response.data && typeof response.data === 'object' && response.data.hasOwnProperty('data') && Array.isArray(response.data.data)) {
             const formattedData = response.data.data.map((store: any) => ({
                store_id: store.store_id,
                name: store.name || store.store_name || "未知店家",
            }));
            return { success: response.data.success, data: formattedData, message: response.data.message };
        }
        console.error("getAllStores: API 回應格式不符期望:", response.data);
        return { success: false, data: [], error: "店家數據格式錯誤" };
    } catch (error: any) {
        console.error("獲取店鋪列表失敗:", error);
        return { success: false, data: [], error: error.response?.data?.error || error.message || "獲取店鋪列表失敗" };
    }
};


// --- 療程銷售記錄 API ---
export const getAllTherapySells = async (storeId?: number, forceAll?: boolean): Promise<ApiResponse<TherapySellRow[]>> => {
    try {
        const level = localStorage.getItem('store_level');
        const perm = localStorage.getItem('permission');
        const isAdmin = level === '總店' || perm === 'admin';

        let url = `${API_URL}/sales`;
        if (!forceAll && !isAdmin && storeId !== undefined) {
            url += `?store_id=${storeId}`;
        }
        const response = await axios.get(url, { headers: getAuthHeaders() });
        if (response.data && response.data.success && Array.isArray(response.data.data)) { // 假設後端返回 {success, data}
            return response.data as ApiResponse<TherapySellRow[]>;
        } else if (Array.isArray(response.data)) { // 如果直接返回陣列
             return { success: true, data: response.data as TherapySellRow[] };
        }
        console.error("API getAllTherapySells 返回的數據格式不符期望:", response.data);
        return { success: false, data: [], error: "療程銷售列表數據格式錯誤" };
    } catch (error: any) {
        console.error("獲取療程銷售記錄失敗:", error);
        return { success: false, data: [], error: error.response?.data?.error || error.message || "獲取療程銷售記錄失敗" };
    }
};

export const searchTherapySells = async (keyword: string, storeId?: number): Promise<ApiResponse<TherapySellRow[]>> => {
     try {
        const params: any = { keyword };
        if (storeId !== undefined) {
            params.store_id = storeId;
        }
        const response = await axios.get(`${API_URL}/sales/search`, { params, headers: getAuthHeaders() });
        if (response.data && response.data.success && Array.isArray(response.data.data)) {
            return response.data as ApiResponse<TherapySellRow[]>;
        } else if (Array.isArray(response.data)) {
            return { success: true, data: response.data as TherapySellRow[] };
        }
        console.error("API searchTherapySells 返回的數據格式不符期望:", response.data);
        return { success: false, data: [], error: "療程銷售搜尋結果數據格式錯誤" };
    } catch (error: any) {
        console.error("搜索療程銷售失敗:", error);
        return { success: false, data: [], error: error.response?.data?.error || error.message || "搜索療程銷售失敗" };
    }
};

export const addTherapySell = async (salesDataList: AddTherapySellPayload[]): Promise<ApiResponse<any>> => {
    try {
        const response = await axios.post(`${API_URL}/sales`, salesDataList, { headers: getAuthHeaders() });

        // 優先檢查 response.data 是否存在以及是否為物件
        if (response.data && typeof response.data === 'object') {
            // 如果後端明確返回了包含 success 標誌的結構
            if (response.data.success !== undefined) {
                return response.data as ApiResponse<any>; // 假設 response.data 符合 ApiResponse 結構
            } else {
                // 如果後端直接返回了數據 (例如新增後的記錄或ID列表) 且 HTTP 狀態碼是成功的 (axios 預設處理)
                // 這裡可以認為操作是成功的，但後端的回應格式不標準
                console.warn("新增療程銷售 API 回應未包含明確的 'success' 標誌，但請求成功:", response.data);
                return { success: true, data: response.data, message: "操作已提交，但回應格式需確認" };
            }
        }
        // 如果 response.data 不是物件或為空，但請求成功 (例如 HTTP 204 No Content)
        // 這種情況下，可以認為是成功，但沒有具體數據返回
        if (response.status >= 200 && response.status < 300 && !response.data) {
             return { success: true, message: "操作成功，無返回內容"};
        }

        // 其他未預期情況
        console.error("新增療程銷售 API 回應格式非預期:", response.data);
        return { success: false, error: "後端回應格式非預期" };

    } catch (error: any) {
        console.error("新增療程銷售請求失敗:", error.response?.data || error.message || error);
        return { 
            success: false, 
            // 優先使用後端在 error response body 中提供的 error message
            error: error.response?.data?.error || error.response?.data?.message || error.message || "新增療程銷售時發生網路或伺服器錯誤" 
        };
    }
};
export const updateTherapySell = async (saleId: number, data: Partial<AddTherapySellPayload>): Promise<ApiResponse<any>> => { /* ... (保持不變) ... */ 
    try {
        const response = await axios.put(`${API_URL}/sales/${saleId}`, data, { headers: getAuthHeaders() });
        if (response.data && typeof response.data === 'object') {
            return { success: response.data.success !== undefined ? response.data.success : true, data: response.data.data, message: response.data.message, error: response.data.error };
        }
        return { success: true, data: response.data };
    } catch (error: any) {
        console.error("更新療程銷售失敗:", error.response?.data || error.message);
        return { success: false, error: error.response?.data?.error || error.message || "更新療程銷售失敗" };
    }
};

export const deleteTherapySell = async (saleId: number): Promise<ApiResponse<any>> => { /* ... (保持不變) ... */
    try {
        const response = await axios.delete(`${API_URL}/sales/${saleId}`, { headers: getAuthHeaders() });
        if (response.data && typeof response.data === 'object') {
            return { success: response.data.success !== undefined ? response.data.success : true, data: response.data.data, message: response.data.message, error: response.data.error };
        }
        return { success: true, data: response.data };
    } catch (error: any) {
        console.error("刪除療程銷售失敗:", error.response?.data || error.message);
        if (axios.isAxiosError(error) && error.response?.status === 403) {
            return { success: false, error: '無操作權限' };
        }
        return { success: false, error: error.response?.data?.error || error.message || "刪除療程銷售失敗" };
    }
};

export const searchTherapyPackages = async (keyword: string) => {
    try {
        const response = await axios.get(`${API_URL}/packages/search`, {
            params: { keyword },
            headers: getAuthHeaders()
        });
        
        // 處理可能的欄位變更
        if (response.data && Array.isArray(response.data)) {
            // 確保數據格式一致
            const formattedData = response.data.map(item => ({
                TherapyCode: item.TherapyCode,
                TherapyPrice: item.TherapyPrice,
                TherapyContent: item.TherapyContent || item.TherapyName || '',
                // 保存其他可能的欄位
                ...item
            }));
            
            return {
                success: true,
                data: formattedData
            };
        }
        
        return {
            success: true,
            data: response.data
        };
    } catch (error) {
        console.error("搜尋療程套餐失敗:", error);
        return {
            success: false,
            data: []
        };
    }
};

export const exportTherapySells = async (storeId?: number) => {
    try {
        let url = `${API_URL}/sales/export`;
        if (storeId) {
            url += `?store_id=${storeId}`;
        }
        
        const response = await axios.get(url, {
            responseType: "blob",
            headers: getAuthHeaders()
        });
        return response.data;
    } catch (error) {
        console.error("匯出療程銷售失敗:", error);
        throw error;
    }
};

// 會員相關 API
export const getAllMembers = async () => {
    try {
        const response = await axios.get(`${API_URL}/members`);
        return {
            success: true,
            data: response.data
        };
    } catch (error) {
        console.error("獲取會員列表失敗:", error);
        return {
            success: false,
            data: []
        };
    }
};

// 員工相關 API
export const getAllStaff = async () => {
    try {
        const response = await axios.get(`${API_URL}/staff`);
        
        // 處理返回數據，確保與預期格式一致
        if (response.data && Array.isArray(response.data)) {
            // 統一字段名稱，以便前端使用
            const staffData = response.data.map((staff: any) => ({
                staff_id: staff.staff_id,
                name: staff.name || "",
                // 同時保持兼容性
                Staff_ID: staff.staff_id,
                Staff_Name: staff.name || "",
                Name: staff.name || "",
            }));
            
            return {
                success: true,
                data: staffData
            };
        }
        
        return {
            success: true,
            data: response.data
        };
    } catch (error) {
        console.error("獲取員工資料失敗:", error);
        return {
            success: false,
            data: []
        };
    }
};

const MEMBER_API_URL = `${base_url}/member`;
export const getMemberById = async (memberId: string): Promise<Member | null> => {
    try {
        const response = await axios.get(`${MEMBER_API_URL}/${memberId}`);
        return response.data || null;
    } catch (error) { console.error(`獲取會員 ${memberId} 資料失敗:`, error); return null; }
};
export const searchMemberById = async (memberId: string): Promise<Member[]> => {
     try {
        const res = await axios.get(`${MEMBER_API_URL}/search`, { params: { id: memberId } });
        return Array.isArray(res.data) ? res.data : [];
    } catch (error) { console.error("搜尋會員資料失敗", error); return []; }
};
// vvvv 新增這個函式 vvvv
export const fetchRemainingSessions = async (memberId: string, therapyId: string) => {
    const response = await axios.get(`${API_URL}/remaining-sessions`, {
        params: { member_id: memberId, therapy_id: therapyId },
        headers: getAuthHeaders()
    });
    return response.data;
};

export const fetchRemainingSessionsBulk = async (memberId: string) => {
    const response = await axios.post(
        `${API_URL}/remaining-sessions/bulk`,
        { member_id: memberId },
        { headers: getAuthHeaders() }
    );
    return response.data;
};