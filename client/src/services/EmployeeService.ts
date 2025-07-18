import axios from "axios";
import { base_url } from "./BASE_URL";

const API_URL = `${base_url}/employee`;

// 員工紀錄 API 介面
export interface EmployeeRecord {
    employee_id: number;
    name: string;
    department_id: number;
    department_name: string;
    position: string;
    hire_date: string;
    status: 'active' | 'inactive' | 'terminated' | 'on_leave';
    contact_phone: string;
    email: string;
    note: string;
}

// 員工紀錄 API
export const getAllEmployeeRecords = async (): Promise<EmployeeRecord[]> => {
    const response = await axios.get(`${API_URL}/record`);
    return response.data;
};

export const getEmployeeRecordById = async (recordId: number): Promise<EmployeeRecord> => {
    const response = await axios.get(`${API_URL}/record/${recordId}`);
    return response.data;
};

export const searchEmployeeRecords = async (keyword: string): Promise<EmployeeRecord[]> => {
    const response = await axios.get(`${API_URL}/record/search`, {
        params: { keyword }
    });
    return response.data;
};

export const addEmployeeRecord = async (data: {
    name: string;
    department_id: number;
    position: string;
    hire_date: string;
    status: 'active' | 'inactive' | 'terminated' | 'on_leave';
    contact_phone?: string;
    email?: string;
    note?: string;
}) => {
    return axios.post(`${API_URL}/record`, data);
};

export const updateEmployeeRecord = async (
    recordId: number,
    data: {
        name?: string;
        department_id?: number;
        position?: string;
        hire_date?: string;
        status?: 'active' | 'inactive' | 'terminated' | 'on_leave';
        contact_phone?: string;
        email?: string;
        note?: string;
    }
) => {
    return axios.put(`${API_URL}/record/${recordId}`, data);
};

export const deleteEmployeeRecord = async (recordId: number) => {
    return axios.delete(`${API_URL}/record/${recordId}`);
};

export const exportEmployeeRecords = async () => {
    const response = await axios.get(`${API_URL}/record/export`, {
        responseType: "blob"
    });
    return response.data;
};

// 部門資料 API
export interface Department {
    department_id: number;
    name: string;
    manager_id?: number;
    manager_name?: string;
}

export const getAllDepartments = async (): Promise<Department[]> => {
    const response = await axios.get(`${API_URL}/departments`);
    return response.data;
}; 