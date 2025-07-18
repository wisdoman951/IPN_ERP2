// IPN_ERP/client/src/hooks/StressTestContext.tsx (流程B 修正版)

// IPN_ERP/client/src/hooks/StressTestContext.tsx (最終版)

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearStressTestStorage } from '../utils/stressTestStorage';
import { addStressTest } from '../services/StressTestService';

interface StressTestContextType {
    memberId: string | null;
    setMemberId: (id: string | null) => void;
    testDate: string;
    setTestDate: (date: string) => void;
    formA: { [key: string]: string };
    formB: { [key: string]: string };
    error: string;
    handleInputChange: (form: 'A' | 'B', question: string, value: string) => void;
    handleNextPage: () => void;
    handleSubmit: (event: React.FormEvent) => Promise<void>;
}


// 定義使用者手動輸入的資訊
interface UserInfo {
    name: string;
    position: string;
    testDate: string;
}

// 定義問卷答案的格式
interface StressTestAnswers {
    [key: string]: string;
}

interface StressTestContextType {
    memberId: string | null;
    setMemberId: (id: string | null) => void;
    testDate: string;
    setTestDate: (date: string) => void;
    formA: { [key: string]: string };
    formB: { [key: string]: string };
    error: string;
    handleInputChange: (form: 'A' | 'B', question: string, value: string) => void;
    handleNextPage: () => void;
    handleSubmit: (event: React.FormEvent) => Promise<void>;
}

const StressTestContext = createContext<StressTestContextType | undefined>(undefined);

export const StressTestProvider = ({ children }: { children: ReactNode }) => {
    const [memberId, setMemberId] = useState<string | null>(null);
    const [testDate, setTestDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [formA, setFormA] = useState<{ [key: string]: string }>({});
    const [formB, setFormB] = useState<{ [key: string]: string }>({});
    const [error, setError] = useState<string>('');
    const navigate = useNavigate();

    const handleInputChange = (form: 'A' | 'B', question: string, value: string) => {
        const setter = { A: setFormA, B: setFormB }[form];
        setter(prev => ({ ...prev, [question]: value }));
    };

    const handleNextPage = () => {
        if (!memberId || !testDate) {
            alert('請選擇會員並指定檢測日期');
            return;
        }
        if (Object.keys(formA).length < 10) {
            alert('請完成本頁所有問題');
            return;
        }
        navigate('/health-data-analysis/stress-test/add/page2');
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');

        if (!memberId || !testDate) {
            alert('缺少會員或檢測日期，無法提交');
            return;
        }

        try {
            await addStressTest({ memberId, testDate, formA, formB });
            alert('壓力測試結果新增成功！');
            clearStressTestStorage(); // 清除暫存 (如果有的話)
            navigate('/health-data-analysis/stress-test');
        } catch (err: any) {
            console.error('提交失敗:', err);
            const errorMsg = err.response?.data?.error || '提交時發生未知錯誤';
            setError(errorMsg);
            alert(`提交失敗: ${errorMsg}`);
        }
    };

    const value = {
        memberId, setMemberId,
        testDate, setTestDate,
        formA, formB,
        error,
        handleInputChange,
        handleNextPage,
        handleSubmit,
    };

    return <StressTestContext.Provider value={value}>{children}</StressTestContext.Provider>;
};

export const useStressTest = () => {
    const context = useContext(StressTestContext);
    if (context === undefined) {
        throw new Error('useStressTest 必須在 StressTestProvider 中使用');
    }
    return context;
};