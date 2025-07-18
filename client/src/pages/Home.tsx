import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import DynamicContainer from "../components/DynamicContainer";
import { Card, Row, Col, Button } from "react-bootstrap";

interface StoreInfo {
  store_id: number;
  store_name: string;
  store_level: string;
  message?: string;
}

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [storeName, setStoreName] = useState<string>("未知分店");

  useEffect(() => {
    // 從 localStorage 獲取店鋪資訊
    const storeInfo = localStorage.getItem('store_info');
    if (storeInfo) {
      try {
        const parsedInfo: StoreInfo = JSON.parse(storeInfo);
        console.log("解析到的店鋪資訊:", parsedInfo);
        
        if (parsedInfo.store_name) {
          setStoreName(parsedInfo.store_name);
          console.log("設定店鋪名稱為:", parsedInfo.store_name);
        } else {
          console.warn("店鋪資訊中沒有 store_name 字段");
          setStoreName("店鋪名稱缺失");
        }
      } catch (error) {
        console.error('無法解析店鋪資訊', error);
        setStoreName("解析錯誤");
      }
    } else {
      console.warn("localStorage 中找不到 store_info");
      setStoreName("未找到店鋪信息");
    }
  }, []);

  // 定義主內容
  const content = (
    <Row className="w-100 ">
      <Col md={6} className="mb-4">
        <Card className="h-100 shadow-sm">
          <Card.Body>
            <Card.Title>系統概述</Card.Title>
            <Card.Text>
              全崴國際管理系統提供完整的會員管理、健康追蹤、產品銷售及庫存管理功能。
              請使用左側選單導航至各功能區。
            </Card.Text>
          </Card.Body>
        </Card>
      </Col>
      <Col md={6} className="mb-4">
        <Card className="h-100 shadow-sm">
          <Card.Body>
            <Card.Title>快速導航</Card.Title>
            <div className="d-flex flex-column gap-2 mt-3">
              <Button variant="outline-info" onClick={() => navigate("/member-management")}>
                會員健康管理
              </Button>
              <Button variant="outline-info" onClick={() => navigate("/products")}>
                銷售產品
              </Button>
              <Button variant="outline-info" onClick={() => navigate("/inventory")}>
                庫存管理
              </Button>
            </div>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );

  return (
    <div className="d-flex flex-column min-vh-100 bg-white">
      {/* Header */}
      <Header title={`全崴國際管理系統-${storeName}首頁 1.1`} />
      
      {/* 使用 DynamicContainer */}
      <DynamicContainer content={content} />
    </div>
  )
}

export default Home