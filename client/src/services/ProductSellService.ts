// ./src/services/ProductSellService.ts
import axios from "axios";
import { base_url } from "./BASE_URL";

const API_URL = `${base_url}/product-sell`;

// ✅ 加入 getAuthHeaders：自動帶上 Token + 其他自訂 Header
const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Store-ID": "1",
      "X-Store-Level": "admin"
    }
  };
};

// 產品介面 (保持不變)
export interface Product {
  product_id: number;
  product_code?: string;
  product_name: string;
  product_price: number;
  inventory_id: number;
  inventory_quantity: number;
}

export interface ProductSellData {
  product_sell_id?: number;
  product_id: number;
  member_id: number;
  staff_id?: number;
  store_id: number;
  date?: string;
  payment_method?: string;
  transfer_code?: string;
  card_number?: string;
  sale_category?: string;
  quantity: number;
  note?: string;
  unit_price: number;
  discount_amount: number;
  final_price: number;
}

// 獲取所有產品及庫存
export const getAllProducts = async (): Promise<Product[]> => {
  try {
    const response = await axios.get(`${API_URL}/products`, getAuthHeaders());
    if (Array.isArray(response.data)) {
      return response.data as Product[];
    }
    return [];
  } catch (error) {
    console.error("獲取產品列表及庫存失敗：", error);
    throw error;
  }
};

// 搜尋產品及庫存
export const searchProducts = async (keyword: string): Promise<Product[]> => {
  try {
    const response = await axios.get(`${API_URL}/products/search`, {
      params: { keyword },
      ...getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error("搜尋產品失敗：", error);
    throw error;
  }
};

// 新增產品銷售記錄
export const addProductSell = async (data: ProductSellData) => {
  try {
    console.log("提交產品銷售資料:", data);
    const response = await axios.post(`${API_URL}/add`, data, getAuthHeaders());
    console.log("新增產品銷售響應:", response.data);
    return response.data;
  } catch (error) {
    console.error("新增產品銷售失敗：", error);
    throw error;
  }
};

export interface ProductSell extends ProductSellData {
  member_code?: string;
  member_name?: string;
  store_name?: string;
  product_name?: string;
  staff_name?: string;
}

// 獲取所有產品銷售記錄
export const getAllProductSells = async (): Promise<ProductSell[]> => {
  const response = await axios.get(`${API_URL}/list`, getAuthHeaders());
  return response.data as ProductSell[];
};

// 搜尋產品銷售記錄
export const searchProductSells = async (keyword: string): Promise<ProductSell[]> => {
  const response = await axios.get(`${API_URL}/search`, {
    params: { keyword },
    ...getAuthHeaders()
  });
  return response.data;
};

// 根據 ID 獲取產品銷售記錄詳情
export const getProductSellById = async (saleId: number): Promise<ProductSell> => {
  const response = await axios.get(`${API_URL}/detail/${saleId}`, getAuthHeaders());
  return response.data;
};

// 更新產品銷售記錄
export const updateProductSell = async (saleId: number, data: ProductSellData) => {
  return axios.put(`${API_URL}/update/${saleId}`, data, getAuthHeaders());
};

// 刪除產品銷售記錄
export const deleteProductSell = async (saleId: number) => {
  return axios.delete(`${API_URL}/delete/${saleId}`, getAuthHeaders());
};

// 匯出產品銷售記錄
export const exportProductSells = async (): Promise<Blob> => {
  const response = await axios.get(`${API_URL}/export`, {
    responseType: "blob",
    ...getAuthHeaders()
  });
  return response.data;
};

// 取得銷售類別（下拉選單）
export const getSaleCategories = async (): Promise<string[]> => {
  const response = await axios.get(`${API_URL}/categories`, getAuthHeaders());
  return response.data;
};
