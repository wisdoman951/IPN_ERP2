import axios from "axios";
import { base_url } from "./BASE_URL";

const API_URL = `${base_url}/therapy-sell`;

// 套餐介面
export interface TherapyPackage {
    therapy_id: number;
    TherapyCode: string;
    TherapyContent: string;
    TherapyName?: string;
    TherapyPrice: number;
}

// 員工介面
export interface StaffMember {
    staff_id: number;
    name: string;
    Staff_ID?: number;
    Staff_Name?: string;
}

// 獲取療程套餐 (選項資料)
export const getTherapyPackages = async (): Promise<TherapyPackage[]> => {
    try {
        const response = await axios.get(`${API_URL}/packages`);
        
        // 處理可能的欄位變更
        if (response.data && Array.isArray(response.data)) {
            // 確保數據格式一致
            return response.data.map(item => ({
                therapy_id: item.therapy_id,
                TherapyCode: item.TherapyCode || item.code,
                TherapyContent: item.TherapyContent || item.content || '',
                TherapyName: item.TherapyName || item.name || '',
                TherapyPrice: item.TherapyPrice || item.price || 0
            }));
        }
        
        return [];
    } catch (error) {
        console.error("獲取療程套餐失敗:", error);
        return [];
    }
};

// 獲取員工 (選項資料)
export const getStaffMembers = async (storeId?: number): Promise<StaffMember[]> => {
    try {
        const perm = localStorage.getItem('permission');
        let params;
        if (perm === 'admin') {
            params = undefined;
        } else {
            const resolvedStoreId = storeId ?? Number(localStorage.getItem('store_id'));
            params = resolvedStoreId ? { store_id: resolvedStoreId } : undefined;
        }
        const response = await axios.get(`${API_URL}/staff`, { params });

        // 處理返回數據，確保與預期格式一致
        if (response.data && Array.isArray(response.data)) {
            // 統一字段名稱
            return response.data.map(staff => ({
                staff_id: staff.staff_id,
                name: staff.name || "",
                Staff_ID: staff.Staff_ID || staff.staff_id,
                Staff_Name: staff.Staff_Name || staff.name || ""
            }));
        }

        return [];
    } catch (error) {
        console.error("獲取員工資料失敗:", error);
        return [];
    }
};