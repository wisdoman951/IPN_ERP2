import React from "react";
import { Button, Container, Row, Col } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import DynamicContainer from "../../components/DynamicContainer";

const InventoryManagement: React.FC = () => {
    const navigate = useNavigate();

    const content = (
        <Container className="my-4">
                {/* 功能按鈕 */}
                <Row className="justify-content-center g-3">
                    <Col xs={12} sm={6} md={4} className="d-grid">
                        <Button onClick={() => navigate("/inventory/inventory-search")} variant="info" size="lg" className="text-white px-4 py-2">庫存查詢</Button>
                    </Col>

                    <Col xs={12} sm={6} md={4} className="d-grid">
                        <Button onClick={() => navigate("/inventory/inventory-analysis")} variant="info" size="lg" className="text-white px-4 py-2">庫存分析</Button>
                    </Col>
                    <Col xs={12} sm={6} md={4} className="d-grid">
                        <Button onClick={() => navigate("/inventory/inventory-update")} variant="info" size="lg" className="text-white px-4 py-2">更新庫存數據</Button>
                    </Col>
                    <Col xs={12} sm={6} md={4} className="d-grid">
                    <Button onClick={() => navigate("/inventory/inventory-detail")} variant="info" size="lg" className="text-white px-4 py-2">進出明細查詢</Button>
                </Col>
                    <Col xs={12} sm={6} md={4} className="d-grid">
                        <Button variant="info" size="lg" className="text-white px-4 py-2">其他</Button>
                    </Col>
                </Row>
        </Container>
    );

    return (
        <>
            <Header title="庫存管理 1.1.4" />
            <DynamicContainer content={content} />
        </>
    );
};

export default InventoryManagement;
