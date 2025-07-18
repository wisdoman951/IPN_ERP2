import React, { useEffect, useState } from "react";
import { Container, Row, Col, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

const AccountingPage = () => {
  const navigate = useNavigate();

  const handleCreateOrder = () => {
    alert("模擬新增銷售單！");
  };

  return (
    <div className="d-flex flex-column min-vh-100 bg-white">
      {/* Header */}
      <header className="d-flex justify-content-between align-items-center bg-info px-4 py-3 app-header">
        <h1 className="text-white fw-bold fs-3 m-0">帳務管理 1.1.5</h1>
      </header>

      <Container className="d-flex flex-column justify-content-center" style={{ minHeight: "calc(100vh - 100px)" }}>
        <Col xs={12} md={8} className="ms-auto">
          <Row className="justify-content-center g-3">
            <Col xs={12} sm={6} md={4} className="d-grid">
              <Button
                variant="info"
                className="text-white px-4 py-2"
                onClick={handleCreateOrder}
              >
                新增銷售單
              </Button>
            </Col>
          </Row>
        </Col>
      </Container>
    </div>
  );
};

export default AccountingPage;
