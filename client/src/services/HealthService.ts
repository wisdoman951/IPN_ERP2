import axios from "axios";
import { base_url } from "./BASE_URL";

const API_URL = `${base_url}/health`;

export interface HealthRecord {
  Record_ID?: string;
  Member_ID: string;
  RecordDate: string;
  Height?: number;
  Weight?: number;
  BMI?: number;
  BloodPressure?: string;
  BloodSugar?: number;
  PulseRate?: number;
  SpO2?: number;
  BodyFat?: number;
  VisceralFat?: number;
  BodyWater?: number;
  BodyMuscle?: number;
  BoneMass?: number;
  Note?: string;
}

/**
 * Get all health records
 */
export const getAllHealthRecords = async (): Promise<HealthRecord[]> => {
  try {
    const response = await axios.get(`${API_URL}`);
    return response.data;
  } catch (error) {
    console.error("Failed to fetch health records:", error);
    throw error;
  }
};

/**
 * Get health records for a specific member
 */
export const getMemberHealthRecords = async (memberId: string): Promise<HealthRecord[]> => {
  try {
    const response = await axios.get(`${API_URL}/member/${memberId}`);
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch health records for member ${memberId}:`, error);
    throw error;
  }
};

/**
 * Add a new health record
 */
export const addHealthRecord = async (healthData: HealthRecord) => {
  try {
    const response = await axios.post(`${API_URL}`, healthData);
    return response.data;
  } catch (error) {
    console.error("Failed to add health record:", error);
    throw error;
  }
};

/**
 * Update an existing health record
 */
export const updateHealthRecord = async (recordId: string, healthData: Partial<HealthRecord>) => {
  try {
    const response = await axios.put(`${API_URL}/${recordId}`, healthData);
    return response.data;
  } catch (error) {
    console.error("Failed to update health record:", error);
    throw error;
  }
};

/**
 * Delete a health record
 */
export const deleteHealthRecord = async (recordId: string) => {
  try {
    const response = await axios.delete(`${API_URL}/${recordId}`);
    return response.data;
  } catch (error) {
    console.error("Failed to delete health record:", error);
    throw error;
  }
};

/**
 * Search health records by criteria (date range, member ID, etc.)
 */
export const searchHealthRecords = async (params: {
  startDate?: string;
  endDate?: string;
  memberId?: string;
}): Promise<HealthRecord[]> => {
  try {
    const response = await axios.get(`${API_URL}/search`, { params });
    return response.data;
  } catch (error) {
    console.error("Failed to search health records:", error);
    throw error;
  }
};

/**
 * Export health records to Excel
 */
export const exportHealthRecords = async (params?: {
  startDate?: string;
  endDate?: string;
  memberId?: string;
}) => {
  try {
    const response = await axios.get(`${API_URL}/export`, {
      params,
      responseType: "blob"
    });
    return response.data;
  } catch (error) {
    console.error("Failed to export health records:", error);
    throw error;
  }
}; 