// ./src/utils/stressTestUtils.ts
/**
 * 壓力測試相關工具函數
 */

/**
 * 問題編號與分數類型的對應關係
 * question: 問題編號(1-20)
 * 甲: 選擇"甲"選項時對應的分數類型(A/B/C/D)
 * 乙: 選擇"乙"選項時對應的分數類型(A/B/C/D)
 */
export const questionMapping = [
  { question: 1,  甲: 'A', 乙: 'B' },
  { question: 2,  甲: 'C', 乙: 'B' },
  { question: 3,  甲: 'C', 乙: 'D' },
  { question: 4,  甲: 'C', 乙: 'A' },
  { question: 5,  甲: 'B', 乙: 'D' },
  { question: 6,  甲: 'D', 乙: 'C' },
  { question: 7,  甲: 'A', 乙: 'D' },
  { question: 8,  甲: 'C', 乙: 'B' },
  { question: 9,  甲: 'C', 乙: 'D' },
  { question: 10, 甲: 'D', 乙: 'A' },
  { question: 11, 甲: 'B', 乙: 'D' },
  { question: 12, 甲: 'C', 乙: 'A' },
  { question: 13, 甲: 'B', 乙: 'C' },
  { question: 14, 甲: 'B', 乙: 'A' },
  { question: 15, 甲: 'B', 乙: 'D' },
  { question: 16, 甲: 'C', 乙: 'A' },
  { question: 17, 甲: 'B', 乙: 'D' },
  { question: 18, 甲: 'D', 乙: 'A' },
  { question: 19, 甲: 'A', 乙: 'C' },
  { question: 20, 甲: 'B', 乙: 'A' }
];

/**
 * 問題ID與問題編號的對應表
 * a1-a5, b1-b5: 第一頁的問題 (1-10)
 * c1-c5, d1-d5: 第二頁的問題 (11-20)
 */
const questionIdToNumber: Record<string, number> = {
  'a1': 1, 'a2': 2, 'a3': 3, 'a4': 4, 'a5': 5,
  'b1': 6, 'b2': 7, 'b3': 8, 'b4': 9, 'b5': 10,
  'c1': 11, 'c2': 12, 'c3': 13, 'c4': 14, 'c5': 15,
  'd1': 16, 'd2': 17, 'd3': 18, 'd4': 19, 'd5': 20
};

/**
 * 將分數轉換為壓力等級的函數
 * @param score 壓力分數
 * @returns 壓力等級描述
 */
export const getStressLevel = (score: number): string => {
  if (score <= 20) return "低壓力";
  if (score <= 40) return "中低壓力";
  if (score <= 60) return "中度壓力";
  if (score <= 80) return "中高壓力";
  return "高壓力";
};

/**
 * 根據問題映射計算不同類型的分數
 * @param answers 問題答案字典，格式如 {'a1': 'A', 'a2': 'B', ...}
 * @returns 包含 a_score, b_score, c_score, d_score 的字典
 */
export const calculateStressScores = (answers: Record<string, string>) => {
  // 初始化分數
  const scores = {'a_score': 0, 'b_score': 0, 'c_score': 0, 'd_score': 0};
  
  console.log('開始計算分數，答案數量:', Object.keys(answers).length);
  
  // 檢查答案是否為空
  if (Object.keys(answers).length === 0) {
    console.warn('警告: 沒有答案可以計算!');
    return scores;
  }
  
  // 遍歷所有的答案
  for (const [questionId, answer] of Object.entries(answers)) {
    console.log(`處理問題 ${questionId}, 答案: ${answer}`);
    
    // 獲取問題編號
    const questionNumber = questionIdToNumber[questionId];
    if (!questionNumber) {
      console.warn(`無法找到問題編號: ${questionId}`);
      continue;
    }
    
    // 根據問題編號查找對應的映射
    const mapping = questionMapping.find(m => m.question === questionNumber);
    if (!mapping) {
      console.warn(`無法找到問題 ${questionNumber} 的映射`);
      continue;
    }
    
    console.log(`問題 ${questionNumber} 的映射: 甲=${mapping.甲}, 乙=${mapping.乙}`);
    
    // 根據使用者選擇的答案(A=甲/B=乙)確定對應的分數類型(A/B/C/D)
    let scoreType = '';
    if (answer === 'A') {
      // 使用者選擇了"甲"選項
      scoreType = mapping.甲;
    } else if (answer === 'B') {
      // 使用者選擇了"乙"選項
      scoreType = mapping.乙;
    } else {
      console.warn(`無效的答案: ${answer}`);
      continue; // 跳過無效答案
    }
    
    console.log(`問題 ${questionNumber} 選擇了 ${answer}, 應該計分給 ${scoreType}`);
    
    // 根據得到的分數類型(A/B/C/D)，對應的分數加一
    const scoreKey = `${scoreType.toLowerCase()}_score`;
    if (scoreKey in scores) {
      scores[scoreKey as keyof typeof scores] += 1;
      console.log(`增加 ${scoreKey} 的分數，現在是: ${scores[scoreKey as keyof typeof scores]}`);
    } else {
      console.warn(`無效的分數類型: ${scoreType}`);
    }
  }
  
  console.log('計算完成，最終分數:', scores);
  return scores;
};

/**
 * 計算總分數
 * @param scores 包含 a_score, b_score, c_score, d_score 的分數對象
 * @returns 總分數
 */
export const calculateTotalScore = (scores: {
  a_score: number;
  b_score: number;
  c_score: number;
  d_score: number;
}): number => {
  return scores.a_score + scores.b_score + scores.c_score + scores.d_score;
}; 