// ./src/pages/health-stress-test/StressTest.tsx
import React, { useState } from "react";
import { Button, Col, Form, Row } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import Header from "../../../components/Header";
import DynamicContainer from "../../../components/DynamicContainer";
import ScrollableTable from "../../../components/ScrollableTable";
import { formatDateToYYYYMMDD } from "../../../utils/dateUtils";
import { useStressTest } from "../../../hooks/useStressTest";
import { getStressLevel } from "../../../utils/stressTestUtils";
import { clearStressTestStorage } from "../../../utils/stressTestStorage";
import "./stressTest.css";

// 只要有這型別就行，實作只用一個 smartSearch 欄位
export interface SearchFilters {
  name: string;
  test_date: string;
  position: string;
  member_id: string;
  phone: string;
}

const StressTest: React.FC = () => {
  const navigate = useNavigate();

  // 只留一個搜尋欄位
  const [searchKeyword, setSearchKeyword] = useState("");

  const {
    tests,
    selectedTests,
    loading,
    handleSearch,
    handleCheckboxChange,
    handleDelete
  } = useStressTest();

  // 智慧搜尋邏輯
  const handleSmartSearch = () => {
    let filters: SearchFilters = {
      name: "",
      test_date: "",
      position: "",
      member_id: "",
      phone: ""
    };
    const kw = searchKeyword.trim();

    if (!kw) {
      handleSearch(filters);
      return;
    }

    // 電話
    if (/^09\d{8}$/.test(kw)) {
      filters.phone = kw;
    }
    // 會員編號
    else if (/^\d+$/.test(kw) && !/^09\d{8}$/.test(kw)) {
      filters.member_id = kw;
    }
    // 日期 yyyy-mm-dd
    else if (/^\d{4}-\d{2}-\d{2}$/.test(kw)) {
      filters.test_date = kw;
    }
    // 職位
    else if (/^職位[:：]/.test(kw)) {
      filters.position = kw.replace(/^職位[:：]/, "");
    }
    // 其它都用 name + position 模糊
    else {
      filters.name = kw;
      filters.position = kw;
    }

    // 加這行
    console.log("🚩傳送給後端的 filters：", filters);

    handleSearch(filters);
  };

  const handleAdd = () => {
    clearStressTestStorage();
    navigate('/health-data-analysis/stress-test/add');
  };

  const tableHeader = (
    <tr>
      <th className="text-center" style={{ width: '60px' }}>勾選</th>
      <th className="text-center" style={{ width: '120px' }}>姓名</th>
      <th className="text-center" style={{ width: '150px' }}>檢測日期</th>
      <th className="text-center" style={{ width: '120px' }}>職位</th>
      <th className="text-center" style={{ width: '80px' }}>A項分數</th>
      <th className="text-center" style={{ width: '80px' }}>B項分數</th>
      <th className="text-center" style={{ width: '80px' }}>C項分數</th>
      <th className="text-center" style={{ width: '80px' }}>D項分數</th>
      <th className="text-center" style={{ width: '180px' }}>總分數</th>
    </tr>
  );

  const tableBody = tests.length > 0 ? (
    tests.map((test) => (
      <tr key={test.ipn_stress_id}>
        <td className="text-center">
          <Form.Check
            type="checkbox"
            checked={selectedTests.includes(test.ipn_stress_id)}
            onChange={() => handleCheckboxChange(test.ipn_stress_id)}
          />
        </td>
        <td>{test.Name || '-'}</td>
        <td>{formatDateToYYYYMMDD(test.test_date)}</td>
        <td>{test.position || '-'}</td>
        <td className="text-center">{test.a_score}</td>
        <td className="text-center">{test.b_score}</td>
        <td className="text-center">{test.c_score}</td>
        <td className="text-center">{test.d_score}</td>
        <td>
          <div>
            <span className="fw-bold">{test.total_score}分</span>
            {' - '}
            <span className="text-muted">{getStressLevel(test.total_score)}</span>
            <Button
              size="sm"
              variant="outline-info"
              className="ms-2"
              onClick={() => navigate(`/health-data-analysis/stress-test/edit/${test.ipn_stress_id}`)}
            >修改</Button>
          </div>
        </td>
      </tr>
    ))
  ) : (
    <tr>
      <td colSpan={9} className="text-center">無數據</td>
    </tr>
  );

  const content = (
    <div className="w-100 px-4">
      <div className="search-area">
        <Row className="align-items-center">
          <Col xs={12} md={5} className="mb-3 mb-md-0">
            <Form.Control
              type="text"
              placeholder="搜尋姓名／電話／會員編號／日期／職位 (例: 職位:設計師)"
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleSmartSearch(); }}
            />
          </Col>
          <Col xs={12} md="auto" className="mt-3 mt-md-0">
            <Button
              variant="info"
              className="text-white w-100"
              onClick={handleSmartSearch}
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
          height="calc(100vh - 340px)"
          tableProps={{
            striped: true,
            bordered: true,
            hover: true
          }}
          className="mb-4"
        />
      </div>
      <div className="button-area">
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
