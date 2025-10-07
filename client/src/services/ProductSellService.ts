// ./src/services/ProductSellService.ts
import axios, { AxiosRequestConfig } from "axios";
import { base_url } from "./BASE_URL";
import { getAuthHeaders as buildAuthHeaders } from "./AuthUtils";

const API_URL = `${base_url}/product-sell`;

const buildRequestConfig = (overrides: AxiosRequestConfig = {}): AxiosRequestConfig => {
  const overrideHeaders = (overrides.headers ?? {}) as Record<string, string>;
  return {
    ...overrides,
    headers: {
      ...buildAuthHeaders(),
      ...overrideHeaders,
    },
  };
};

// 產品介面 (保持不變)
export interface Product {
  product_id: number;
  product_code?: string;
  product_name: string;
  product_price: number;
  member_price?: number | null;
  member_custom_code?: string | null;
  member_custom_name?: string | null;
  member_price_book_id?: number | null;
  member_price_book_name?: string | null;
  member_price_metadata?: Record<string, unknown> | null;
  effective_price?: number;
  purchase_price?: number | string | null;
  inventory_id: number;
  inventory_quantity: number;
  categories?: string[];
}

export interface ProductSellData {
  product_sell_id?: number;
  product_id?: number;
  bundle_id?: number;
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

export interface ProductFetchOptions {
  status?: string;
  memberId?: number;
  identityType?: string;
  pricingStoreId?: number;
}

// 獲取所有產品及庫存
export const getAllProducts = async (options: ProductFetchOptions = {}): Promise<Product[]> => {
  try {
    const params: Record<string, unknown> = {};
    if (options.status) params.status = options.status;
    if (options.memberId !== undefined) params.member_id = options.memberId;
    if (options.identityType) params.identity_type = options.identityType;
    if (options.pricingStoreId !== undefined) params.pricing_store_id = options.pricingStoreId;

    const response = await axios.get(
      `${API_URL}/products`,
      buildRequestConfig({ params })
    );
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
export const searchProducts = async (keyword: string, options: ProductFetchOptions = {}): Promise<Product[]> => {
  try {
    const params: Record<string, unknown> = { keyword };
    if (options.status) params.status = options.status;
    if (options.memberId !== undefined) params.member_id = options.memberId;
    if (options.identityType) params.identity_type = options.identityType;
    if (options.pricingStoreId !== undefined) params.pricing_store_id = options.pricingStoreId;

    const response = await axios.get(
      `${API_URL}/products/search`,
      buildRequestConfig({ params })
    );
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
    const response = await axios.post(
      `${API_URL}/add`,
      data,
      buildRequestConfig()
    );
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
  product_code?: string;
  staff_name?: string;
}

// 獲取所有產品銷售記錄
export const getAllProductSells = async (): Promise<ProductSell[]> => {
  const response = await axios.get(`${API_URL}/list`, buildRequestConfig());
  return response.data as ProductSell[];
};

// 搜尋產品銷售記錄
export const searchProductSells = async (keyword: string): Promise<ProductSell[]> => {
  const response = await axios.get(
    `${API_URL}/search`,
    buildRequestConfig({ params: { keyword } })
  );
  return response.data;
};

// 根據 ID 獲取產品銷售記錄詳情
export const getProductSellById = async (saleId: number): Promise<ProductSell> => {
  const response = await axios.get(
    `${API_URL}/detail/${saleId}`,
    buildRequestConfig()
  );
  return response.data;
};

// 更新產品銷售記錄
export const updateProductSell = async (saleId: number, data: ProductSellData) => {
  return axios.put(`${API_URL}/update/${saleId}`, data, buildRequestConfig());
};

// 刪除產品銷售記錄
export const deleteProductSell = async (saleId: number) => {
  try {
    return await axios.delete(`${API_URL}/delete/${saleId}`, buildRequestConfig());
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      throw new Error('無操作權限');
    }
    throw error;
  }
};

// 匯出產品銷售記錄
export const exportProductSells = async (): Promise<Blob> => {
  const response = await axios.get(
    `${API_URL}/export`,
    buildRequestConfig({ responseType: "blob" })
  );
  return response.data;
};

// 取得銷售類別（下拉選單）
export const getSaleCategories = async (): Promise<string[]> => {
  const response = await axios.get(`${API_URL}/categories`, buildRequestConfig());
  return response.data;
};
