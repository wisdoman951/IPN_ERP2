// ./src/pages/health/stress-test/StressTest.tsx
import React, { useState } from "react";
import { Button, Col, Form, Row } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import Header from "../../../components/Header";
import DynamicContainer from "../../../components/DynamicContainer";
import ScrollableTable from "../../../components/ScrollableTable";
import { formatDateToYYYYMMDD } from "../../../utils/dateUtils"; // <-- 新增這一行
import { useStressTest, type SearchFilters as OriginalSearchFilters } from "../../../hooks/useStressTest";
import { getStressLevel } from "../../../utils/stressTestUtils";
import { clearStressTestStorage } from "../../../utils/stressTestStorage";
import "./stressTest.css";

// 為了符合新的搜尋條件，我們在這裡重新定義 SearchFilters
// 理想情況下，這個型別應該在 useStressTest.ts 中定義並匯出
export interface SearchFilters {
  name: string;
  test_date: string; // 新增：檢測日期
  position: string;  // 新增：職位
  // member_id: string; // 移除：會員ID
}

const StressTest: React.FC = () => {
  const navigate = useNavigate();
  // 使用新的 SearchFilters 初始化 filters
  const [filters, setFilters] = useState<SearchFilters>({
    name: "",
    test_date: "",
    position: ""
  });

  const {
    tests,
    selectedTests,
    loading,
    handleSearch, // 注意：handleSearch 函數在 useStressTest.ts 中需要能接收新的 filters 結構
    handleCheckboxChange,
    handleDelete
  } = useStressTest();

  const handleAdd = () => {
    clearStressTestStorage(); // <-- 清除舊的暫存
    navigate('/health-data-analysis/stress-test/add/page1'); // <-- 跳轉到第一頁
  };

  const tableHeader = (
    <tr>
      <th className="text-center" style={{ width: '60px' }}>勾選</th>
      <th className="text-center" style={{ width: '120px' }}>姓名</th>
      <th className="text-center" style={{ width: '150px' }}>檢測日期</th> {/* 新增 */}
      <th className="text-center" style={{ width: '120px' }}>職位</th>   {/* 新增 */}
      {/* <th className="text-center" style={{ width: '100px' }}>會員ID</th> */}{/* 移除 */}
      <th className="text-center" style={{ width: '80px' }}>A項分數</th>
      <th className="text-center" style={{ width: '80px' }}>B項分數</th>
      <th className="text-center" style={{ width: '80px' }}>C項分數</th>
      <th className="text-center" style={{ width: '80px' }}>D項分數</th>
      <th className="text-center" style={{ width: '180px' }}>總分數</th> {/* 確認標題為總分數 */}
    </tr>
  );

  const tableBody = tests.length > 0 ? (
    tests.map((test) => ( // 假設 test 物件現在會包含 test_date 和 position
      <tr key={test.ipn_stress_id}>
        <td className="text-center">
          <Form.Check
            type="checkbox"
            checked={selectedTests.includes(test.ipn_stress_id)}
            onChange={() => handleCheckboxChange(test.ipn_stress_id)}
          />
        </td>
        <td>{test.Name || '-'}</td>
        <td>{formatDateToYYYYMMDD(test.test_date)}</td> {/* 使用格式化函式 */}
        <td>{test.position || '-'}</td>  {/* 新增：顯示職位 */}
        {/* <td>{test.member_id || '-'}</td> */}{/* 移除 */}
        <td className="text-center">{test.a_score}</td>
        <td className="text-center">{test.b_score}</td>
        <td className="text-center">{test.c_score}</td>
        <td className="text-center">{test.d_score}</td>
        <td>
          <div>
            <span className="fw-bold">{test.total_score}分</span>
            {' - '}
            <span className="text-muted">{getStressLevel(test.total_score)}</span>
          </div>
        </td>
      </tr>
    ))
  ) : (
    <tr>
      {/* 更新 colSpan 以匹配新的欄位數量 (8欄) */}
      <td colSpan={9} className="text-center">無數據</td>
    </tr>
  );

  const content = (
    <div className="w-100 px-4">
      <div className="search-area">
        <Row className="align-items-center">
          <Col xs={12} md={3} className="mb-3 mb-md-0"> {/* 調整 Col 寬度 */}
            <Form.Control
              type="text"
              placeholder="姓名"
              value={filters.name}
              onChange={(e) => setFilters(prev => ({ ...prev, name: e.target.value }))}
            />
          </Col>
          <Col xs={12} md={3} className="mb-3 mb-md-0"> {/* 新增：檢測日期搜尋欄位 */}
            <Form.Control
              type="date" // 可以使用 date 型別的輸入框，或保持 text 由後端處理日期格式
              placeholder="檢測日期"
              value={filters.test_date}
              onChange={(e) => setFilters(prev => ({ ...prev, test_date: e.target.value }))}
            />
          </Col>
          <Col xs={12} md={3} className="mb-3 mb-md-0"> {/* 新增：職位搜尋欄位 */}
            <Form.Control
              type="text"
              placeholder="職位"
              value={filters.position}
              onChange={(e) => setFilters(prev => ({ ...prev, position: e.target.value }))}
            />
          </Col>
          {/* 移除會員ID搜尋欄位 */}
          {/* <Col xs={12} md={4} className="mb-3 mb-md-0">
            <Form.Control 
              type="text" 
              placeholder="會員ID"
              value={filters.member_id} // 此行會報錯，因為 member_id 已從 filters 移除
              onChange={(e) => setFilters(prev => ({ ...prev, member_id: e.target.value }))}
            />
          </Col> 
          */}
          <Col xs={12} md="auto" className="mt-3 mt-md-0">
            <Button
              variant="info"
              className="text-white w-100"
              onClick={() => handleSearch(filters)} // filters 現在是新的結構
              disabled={loading}
            >
              搜尋
            </Button>
          </Col>
          <Col xs={12} md="auto" className="mt-3 mt-md-0">
            <Button
              variant="info"
              className="text-white w-100"
              onClick={handleAdd}
              disabled={loading}
            >
              新增
            </Button>
          </Col>
        </Row>
      </div>

      <div className="table-area mt-4">
        <ScrollableTable
          tableHeader={tableHeader}
          tableBody={tableBody}
          height="calc(100vh - 340px)" // 您可能需要根據搜尋區域高度變化調整此值
          tableProps={{
            striped: true,
            bordered: true,
            hover: true
          }}
          className="mb-4"
        />
      </div>

      <div className="button-area">
        {/* 按鈕區域保持不變 */}
        <Row className="justify-content-end g-3">
          <Col xs="auto">
            <Button variant="info" className="text-white px-4" disabled={loading || selectedTests.length === 0}>
              報表匯出
            </Button>
          </Col>
          <Col xs="auto">
            <Button variant="info" className="text-white px-4" onClick={handleDelete} disabled={loading || selectedTests.length === 0}>
              刪除
            </Button>
          </Col>
          <Col xs="auto">
            <Button variant="info" className="text-white px-4" disabled={loading}>
              確認
            </Button>
          </Col>
        </Row>
      </div>
    </div>
  );

  return (
    <div className="d-flex flex-column min-vh-100 bg-white">
      <Header title="iPN壓力源測試 1.1.1.4.1" />
      <DynamicContainer
        content={content}
        className="p-0 align-items-start"
      />
    </div>
  );
};

export default StressTest;