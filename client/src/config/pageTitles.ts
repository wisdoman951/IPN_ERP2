//src/config/pageTitles.ts
type PageTitleMap = {
  [path: string]: {
    basic: string; // 對應 'basic' 權限 (分店)
    admin: string; // 對應 'admin' 權限 (總部)
  };
};

export const pageTitles: PageTitleMap = {
  // General
  '/home': { basic: '全崴國際管理系統-分店首頁 1.1', admin: '全崴國際管理系統-總部首頁 1.2' },
  '/unauthorized': { basic: '無權限', admin: '無權限' },

  // Member
  '/member-management': { basic: '會員健康管理 1.1.1', admin: '會員健康管理 1.2.1' },
  '/member-info': { basic: '會員基本資料 1.1.1.1', admin: '會員基本資料 1.2.1.1' },
  '/add-member': { basic: '新增會員資料 1.1.1.1.1', admin: '新增會員資料 1.2.1.1.1' },
  '/member-info/edit/:memberId': { basic: '編輯會員資料 1.1.1.1.1', admin: '編輯會員資料 1.2.1.1.1' },

  // Medical Record
  '/medical-record': { basic: '健康檢查紀錄 1.1.1.2', admin: '健康檢查紀錄 1.2.1.2' },
  '/medical-record/add': { basic: '新增健康檢查紀錄 1.1.1.2.1', admin: '新增健康檢查紀錄 1.2.1.2.1' },
  '/medical-record/add-medical-record': { basic: '新增健康檢查紀錄 1.1.1.2.1', admin: '新增健康檢查紀錄 1.2.1.2.1' },
  '/medical-record/add-family-medical-history': { basic: '平時症狀 家族病史 1.1.1.2.1.1', admin: '平時症狀 家族病史 1.2.1.2.1.1' },
  '/medical-record/symptoms-and-history': { basic: '症狀與病史選擇 1.1.1.2.1.1', admin: '症狀與病史選擇 1.2.1.2.1.1' },
  '/medical-record/edit/:id': { basic: '編輯健康檢查紀錄 1.1.1.2.1', admin: '編輯健康檢查紀錄 1.1.1.2.1' },

   // Therapy 
  '/therapy-record': { basic: '療程紀錄 1.1.1.3', admin: '療程紀錄 1.2.1.3' },
  '/therapy-record/add-therapy-record': { basic: '新增療程紀錄 1.1.1.3.1', admin: '新增療程紀錄 1.2.1.3.1' },

  // Health
  '/health-data-analysis': { basic: '健康數據分析 1.1.1.4', admin: '健康數據分析 1.2.1.4' },
  '/health-data-analysis/stress-test/': { basic: 'iPN壓力源測試 1.1.1.4.1', admin: 'iPN壓力源測試 1.2.1.4.1' },
  '/health-data-analysis/stress-test/add/page1': { basic: '新增iPN壓力源測試 1.1.1.4.1.1', admin: '新增iPN壓力源測試 1.2.1.4.1.1' },
  '/health-data-analysis/stress-test/add/page2': { basic: '新增iPN壓力源測試 1.1.1.4.1.1.1', admin: '新增iPN壓力源測試 1.1.1.4.1.1.1' },
  '/health-data-analysis/pure-medical-record': { basic: 'iPN淨化健康紀錄表 1.1.1.4.2', admin: 'iPN淨化健康紀錄表 1.2.1.4.2' },
  '/health-data-analysis/add-pure-medical-record': { basic: '新增iPN淨化健康紀錄表 1.1.1.4.2.1', admin: '新增iPN淨化健康紀錄表 1.2.1.4.2.1' },
  
  // Sales
  '/product-sell': { basic: '銷售產品 1.1.2', admin: '銷售產品 1.2.2' },
  '/add-product-sell': { basic: '新增銷售產品 1.1.2.1', admin: '新增銷售產品 1.2.2.1' },
  '/product-selection': { basic: '購買品項 1.1.2.1.1', admin: '購買品項 1.2.2.1.1' },
  '/therapy-sell': { basic: '銷售療程 1.1.3', admin: '銷售療程 1.2.3' },
  '/therapy-sell/add': { basic: '新增銷售療程 1.1.3.1', admin: '新增銷售療程 1.2.3.1' },
  '/therapy-package-selection': { basic: '購買療程堂數 1.1.3.1.1', admin: '購買療程堂數 1.2.3.1.1' },

  // Inventory
  '/inventory': { basic: '庫存管理 1.1.4', admin: '庫存管理 1.2.4' },
  '/inventory/inventory-search': { basic: '庫存查詢(銷售) 1.1.4.1', admin: '庫存查詢(銷售) 1.2.4.1' },
  '/inventory/inventory-analysis': { basic: '庫存分析 1.1.4.2', admin: '庫存分析 1.2.4.2' },
  '/inventory/inventory-update': { basic: '更新庫存數據(進貨) 1.1.4.3', admin: '更新庫存數據(進貨) 1.2.4.3' },
  '/inventory/inventory-add': { basic: '新增庫存數據 1.1.4.3.1', admin: '新增庫存數據 1.2.4.3.1' },
  '/inventory/inventory-detail': { basic: '進出明細查詢 1.1.4.4', admin: '進出明細查詢 1.2.4.4' },
  
  // Finance
  '/finance': { basic: '帳務管理 1.1.5', admin: '帳務管理 1.2.5' },
  '/finance/sales/add': { basic: '新增銷售單 1.1.5.1.1', admin: '新增銷售單 1.2.5.1.1' },
  '/finance/sales/list': { basic: '銷售單列表 1.1.5.1', admin: '銷售單列表 1.2.5.1' },
  '/finance/item-selection': { basic: '選擇銷售品項 1.1.5.1.1.1', admin: '選擇銷售品項 1.2.5.1.1.1' },

  // Backend
  '/backend': { basic: '分店後台管理 1.1.6', admin: '總店後台管理 1.2.6' },
  '/backend/staff': { basic: '分店後台管理-員工資料 1.1.6.1', admin: '總店後台管理-員工資料 1.2.6.1' },
  '/backend/add-staff': { basic: '分店後台管理-新增入職簡歷 1.1.6.1.1', admin: '總店後台管理-新增入職簡歷 1.2.6.1.1' },
  '/backend/user-accounts': { basic: '無權限', admin: '使用者帳號管理 1.2.6.2' },
  '/backend/user-accounts/add': { basic: '無權限', admin: '新增/修改使用者帳號 1.2.6.2.1' },
  '/backend/product-bundles': { basic: '無權限', admin: '使用者帳號管理 1.2.6.2' },

};
