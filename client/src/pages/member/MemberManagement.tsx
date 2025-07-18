import React from "react";
import { Row, Col, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import DynamicContainer from "../../components/DynamicContainer";

const MemberManagement: React.FC = () => {
  const navigate = useNavigate();

  // 定義按鈕網格的內容
  const content = (
    <Row className="g-4 justify-content-center w-100">
      <Col xs={12} sm={6} md={4} className="d-grid">
        <Button onClick={()=>navigate("/member-info")} variant="info" size="lg" className="text-white fs-5 py-4">
          會員基本資料
        </Button>
      </Col>
      <Col xs={12} sm={6} md={4} className="d-grid">
        <Button onClick={()=>navigate("/medical-record")} variant="info" size="lg" className="text-white fs-5 py-4">
          健康檢查紀錄
        </Button>
      </Col>
      <Col xs={12} sm={6} md={4} className="d-grid">
        <Button onClick={()=>navigate("/health-data-analysis")} variant="info" size="lg" className="text-white fs-5 py-4">
          健康數據分析
        </Button>
      </Col>
      <Col xs={12} sm={6} md={4} className="d-grid">
        <Button onClick={()=>navigate("/therapy-record")} variant="info" size="lg" className="text-white fs-5 py-4">
          療程紀錄
        </Button>
      </Col>
      <Col xs={12} sm={6} md={4} className="d-grid">
        <Button variant="info" size="lg" className="text-white fs-5 py-4">
          其他功能
        </Button>
      </Col>
    </Row>
  );

  return (
    <div className="d-flex flex-column min-vh-100 bg-white">
      {/* Header */}
      <Header title="會員健康管理 1.1.1" />

      {/* 使用 DynamicContainer 並傳入內容 */}
      <DynamicContainer content={content} />
    </div>
  );
};

export default MemberManagement;
