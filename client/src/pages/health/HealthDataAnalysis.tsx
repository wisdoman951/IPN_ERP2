import React from "react";
import { Button, Row, Col } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import DynamicContainer from "../../components/DynamicContainer";

const HealthAnalysis: React.FC = () => {
  const navigate = useNavigate();

  // 定義主要內容
  const content = (
    <Row className="g-4 justify-content-center">
      <Col xs="auto">
        <Button 
          onClick={() => navigate("/health-data-analysis/stress-test")} 
          variant="info" 
          className="px-4 py-3 text-white fs-5"
        >
          iPN壓力源測試
        </Button>
      </Col>
      <Col xs="auto">
        <Button 
          onClick={() => navigate("/health-data-analysis/pure-medical-record")} 
          variant="info" 
          className="px-4 py-3 text-white fs-5"
        >
          iPN淨化健康紀錄表
        </Button>
      </Col>
    </Row>
  );

  return (
    <div className="d-flex flex-column min-vh-100 bg-white">
      {/* 使用統一的 Header 組件 */}
      <Header title="健康數據分析 1.1.1.4" />
      
      {/* 使用 DynamicContainer 包裝內容 */}
      <DynamicContainer 
        content={content} 
        className="d-flex justify-content-center align-items-center"
      />
    </div>
  );
};

export default HealthAnalysis;
