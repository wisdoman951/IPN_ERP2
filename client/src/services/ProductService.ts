import axios from "axios";
import { base_url } from "./BASE_URL";

const API_URL = `${base_url}/product`;

// 產品介面
export interface Product {
  product_id: number;
  name: string;
  code?: string;
  content?: string;
  price: number;
  inventory_count?: number;
}

// 獲取所有產品
export const getProducts = async (): Promise<Product[]> => {
  try {
    // Try alternative endpoint structure that might work
    const response = await axios.get(`${base_url}/products`);
    return response.data;
  } catch (error) {
    console.error("獲取產品失敗：", error);
    throw error;
  }
};

// 搜尋產品
export const searchProducts = async (keyword: string): Promise<Product[]> => {
  try {
    const response = await axios.get(`${API_URL}/search`, { 
      params: { keyword } 
    });
    return response.data;
  } catch (error) {
    console.error("搜尋產品失敗：", error);
    throw error;
  }
};

// 根據ID獲取產品詳情
export const getProductById = async (productId: number): Promise<Product> => {
  try {
    const response = await axios.get(`${API_URL}/${productId}`);
    return response.data;
  } catch (error) {
    console.error("獲取產品詳情失敗：", error);
    throw error;
  }
};

export const createProduct = async (data: {
  code: string;
  name: string;
  price: number;
  unit?: string;
  category?: string;
}) => {
  return axios.post(`${API_URL}/`, data);
};