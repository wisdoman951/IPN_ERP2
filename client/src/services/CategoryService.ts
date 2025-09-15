import axios from "axios";
import { base_url } from "./BASE_URL";
import { getAuthHeaders } from "./AuthUtils";

export interface Category {
  category_id: number;
  name: string;
  target_type: string;
}

const API_URL = `${base_url}/categories`;

export const getCategories = async (targetType?: string): Promise<Category[]> => {
  const response = await axios.get(`${API_URL}/`, {
    params: { target_type: targetType },
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const addCategory = async (data: { name: string; target_type: string }) => {
  const response = await axios.post(`${API_URL}/`, data, {
    headers: getAuthHeaders(),
  });
  return response.data;
};
