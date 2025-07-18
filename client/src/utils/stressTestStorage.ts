// ./src/utils/stressTestStorage.ts
/**
 * 本地存儲相關工具函數
 * 用於壓力測試過程中的暫存數據處理
 */

const SELECTED_MEMBER_ID_KEY = 'selectedMemberId';
const STRESS_TEST_PAGE1_ANSWERS_KEY = 'stressTestPage1Answers';
const STRESS_TEST_PAGE2_ANSWERS_KEY = 'stressTestPage2Answers';
const STRESS_TEST_USER_INFO_KEY = 'stressTestUserInfo';

interface StressTestUserInfo { // 與 AddStressTestPage1.tsx 中定義的型別一致
  name: string;
  position: string;
  testDate: string;
}
interface StressTestAnswers {
  [key: string]: string;
}

/**
 * 保存選中的會員ID
 */
export const saveSelectedMemberId = (memberId: string | number): void => {
  localStorage.setItem(SELECTED_MEMBER_ID_KEY, String(memberId));
};

/**
 * 獲取選中的會員ID
 */
export const getSelectedMemberId = (): string | null => {
  return localStorage.getItem(SELECTED_MEMBER_ID_KEY);
};

/**
 * 保存第一頁的答案
 */
export const savePage1Answers = (answers: StressTestAnswers): void => {
  localStorage.setItem(STRESS_TEST_PAGE1_ANSWERS_KEY, JSON.stringify(answers));
};

/**
 * 獲取第一頁的答案
 */
export const getPage1Answers = (): StressTestAnswers | null => {
  const answers = localStorage.getItem(STRESS_TEST_PAGE1_ANSWERS_KEY);
  return answers ? JSON.parse(answers) : null;
};

/**
 * 保存第二頁的答案
 */
export const savePage2Answers = (answers: StressTestAnswers): void => {
  localStorage.setItem(STRESS_TEST_PAGE2_ANSWERS_KEY, JSON.stringify(answers));
};

/**
 * 獲取第二頁的答案
 */
export const getPage2Answers = (): StressTestAnswers | null => {
  const answers = localStorage.getItem(STRESS_TEST_PAGE2_ANSWERS_KEY);
  return answers ? JSON.parse(answers) : null;
};

/**
 * 獲取所有答案
 */
export const getAllAnswers = (): StressTestAnswers => {
  const page1 = getPage1Answers() || {};
  const page2 = getPage2Answers() || {};
  return { ...page1, ...page2 };
};
/**
 * 保存壓力測試的使用者基本資訊 (姓名、職位、檢測日期)
 */
export const saveStressTestUserInfo = (userInfo: StressTestUserInfo): void => {
  localStorage.setItem(STRESS_TEST_USER_INFO_KEY, JSON.stringify(userInfo));
};

/**
 * 獲取壓力測試的使用者基本資訊
 */
export const getStressTestUserInfo = (): StressTestUserInfo | null => {
  const info = localStorage.getItem(STRESS_TEST_USER_INFO_KEY);
  return info ? JSON.parse(info) : null;
};
/**
 * 清除所有壓力測試相關的本地存儲
 */
export const clearStressTestStorage = (): void => {
  localStorage.removeItem(SELECTED_MEMBER_ID_KEY);
  localStorage.removeItem(STRESS_TEST_PAGE1_ANSWERS_KEY);
  localStorage.removeItem(STRESS_TEST_PAGE2_ANSWERS_KEY);
  localStorage.removeItem(STRESS_TEST_USER_INFO_KEY);
}; 