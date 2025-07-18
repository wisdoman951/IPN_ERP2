// ./src/hooks/useStressTestForm.ts
import { useState, useEffect } from 'react';
import { searchMemberById, getMemberById, Member } from '../services/MemberService';
import { 
  saveSelectedMemberId, 
  savePage1Answers, 
  savePage2Answers,
  getSelectedMemberId,
  getPage1Answers,
  getAllAnswers,
  clearStressTestStorage
} from '../utils/stressTestStorage';
import { calculateStressScores, calculateTotalScore } from '../utils/stressTestUtils';
import { addStressTest } from '../services/StressTestService';
import { useNavigate } from 'react-router-dom';

export interface Question {
  id: string;
  textA: string;
  textB: string;
}

export interface Answers {
  [key: string]: "A" | "B" | "";
}

interface UseStressTestFormOptions {
  isPage2?: boolean;
}

/**
 * 壓力測試表單Hook
 * 處理會員搜索和問卷回答的邏輯
 */
export const useStressTestForm = (options: UseStressTestFormOptions = {}) => {
  const { isPage2 = false } = options;
  const navigate = useNavigate();
  const [memberId, setMemberId] = useState("");
  const [member, setMember] = useState<Member | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 初始化時從本地存儲讀取已保存的答案（如果有）
  const [answers, setAnswers] = useState<Answers>(() => {
    const storageKey = isPage2 ? "stressTestPage2Answers" : "stressTestPage1Answers";
    const savedAnswers = localStorage.getItem(storageKey);
    return savedAnswers ? JSON.parse(savedAnswers) : {};
  });

  // 當答案變更時保存到本地存儲
  useEffect(() => {
    if (isPage2) {
      savePage2Answers(answers);
    } else {
      savePage1Answers(answers);
    }
  }, [answers, isPage2]);

  // 若是第二頁，載入會員ID和資訊
  useEffect(() => {
    if (isPage2) {
      const id = getSelectedMemberId();
      if (!id) {
        setError("請先選擇會員並填寫第一頁問卷");
        return;
      }
      setMemberId(id);
      
      // 檢查第一頁答案是否存在
      const page1 = getPage1Answers();
      if (!page1 || Object.keys(page1).length === 0) {
        setError("請先完成第一頁問卷");
      }
      
      // 獲取會員資訊
      const fetchMember = async () => {
        try {
          const memberData = await getMemberById(id);
          if (memberData) {
            setMember(memberData);
          }
        } catch (err) {
          console.error("獲取會員資訊失敗:", err);
        }
      };
      
      fetchMember();
    }
  }, [isPage2]);

  // 搜索會員（僅通過會員編號）
  const handleSearchMember = async () => {
    if (!memberId.trim()) {
      setError("請輸入會員編號");
      return;
    }
    
    try {
      setSearching(true);
      setError("");
      setMember(null);
      
      const results = await searchMemberById(memberId);
      if (results && results.length > 0) {
        const foundMember = results[0];
        setMember(foundMember);
        saveSelectedMemberId(foundMember.Member_ID);
      } else {
        setError("未找到此會員編號");
      }
    } catch (err) {
      console.error("搜索會員失敗:", err);
      setError("搜索會員時發生錯誤");
    } finally {
      setSearching(false);
    }
  };

  // 處理選擇答案
  const handleSelect = (id: string, value: "A" | "B") => {
    setAnswers(prev => ({ ...prev, [id]: value }));
  };

  // 檢查所有問題是否已回答
  const checkUnansweredQuestions = (questions: Question[]): string[] => {
    return questions.filter(q => !answers[q.id]).map(q => q.id);
  };

  // 獲取未回答的問題數量
  const getUnansweredCount = (questions: Question[]): number => {
    return checkUnansweredQuestions(questions).length;
  };

  // 設置表單已提交狀態
  const submitForm = () => {
    setFormSubmitted(true);
  };

  // 處理提交壓力測試（第二頁）
  const handleSubmit = async (questions: Question[]) => {
    // 檢查所有問題是否已回答
    if (Object.keys(answers).length < questions.length) {
      setError("請回答所有問題");
      return;
    }

    // 檢查會員是否已選擇
    if (!memberId) {
      setError("未選擇會員");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      // 獲取所有答案
      const allAnswers = getAllAnswers();
      console.log("所有答案:", allAnswers); // 添加日誌
      
      // 計算各項分數
      const scores = calculateStressScores(allAnswers);
      console.log("計算後的分數:", scores); // 添加日誌
      
      // 計算總分
      const totalScore = calculateTotalScore(scores);
      console.log("總分:", totalScore); // 添加日誌
      
      // 讓使用者看到計算的分數（調試用）
      alert(`計算的分數：A=${scores.a_score}, B=${scores.b_score}, C=${scores.c_score}, D=${scores.d_score}, 總分=${totalScore}`);
      
      // 提交數據（包含總分和原始答案）
      await addStressTest({
        member_id: memberId,
        scores: {
          ...scores,
          total_score: totalScore
        },
        answers: allAnswers // 添加原始答案以便後端可以驗證
      });

      // 清除 localStorage
      clearStressTestStorage();
      
      // 導航回列表頁
      navigate("/health-data-analysis/stress-test");
      
    } catch (error) {
      console.error("提交測試失敗:", error);
      setError("提交測試時發生錯誤");
    } finally {
      setSubmitting(false);
    }
  };

  return {
    memberId,
    setMemberId,
    member,
    searching,
    error,
    setError,
    formSubmitted,
    submitting,
    answers,
    handleSearchMember,
    handleSelect,
    checkUnansweredQuestions,
    getUnansweredCount,
    submitForm,
    handleSubmit
  };
};

export default useStressTestForm; 