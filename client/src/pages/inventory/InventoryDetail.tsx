import React from "react";
import { Container, Row, Col, Form, Button, Table, Alert } from "react-bootstrap";
import Header from "../../components/Header";
import DynamicContainer from "../../components/DynamicContainer";

const InventoryDetail: React.FC = () => {
  const content = (
    <Container fluid className="p-4">
      <h5 className="text-danger mb-3">資料連動總部出貨、分店銷售</h5>

      {/* 搜尋列 */}
      <Row className="align-items-center mb-3">
        <Col xs="auto">
          <Form.Label className="fw-bold">產品名稱</Form.Label>
        </Col>
        <Col xs="auto">
          <Form.Control size="sm" type="text" placeholder="輸入產品名稱" />
        </Col>
        <Col xs="auto">
          <Button variant="info" className="text-white px-4 py-1">搜尋</Button>
        </Col>
      </Row>

      {/* 表格 */}
      <Table bordered responsive hover size="sm" className="text-center">
        <thead className="table-light">
          <tr>
            <th>勾選</th>
            <th>編號</th>
            <th>名稱</th>
            <th>單位</th>
            <th>單價</th>
            <th>數量</th>
            <th>金額</th>
            <th>商品分類</th>
            <th>出入類別</th>
            <th>進出日期</th>
            <th>供貨人</th>
            <th>出貨單位</th>
            <th>銷售人</th>
            <th>憑證單號</th>
          </tr>
        </thead>
        <tbody>
          {/* 資料列可動態渲染 */}
          <tr>
            <td><Form.Check type="checkbox" /></td>
            <td colSpan={13}><em>尚無資料</em></td>
          </tr>
        </tbody>
      </Table>

      {/* 下方按鈕列 */}
      <Row className="mt-4 justify-content-center g-2">
        <Col xs="auto">
          <Button variant="info" className="text-white px-4">報表匯出</Button>
        </Col>
        <Col xs="auto">
          <Button variant="info" className="text-white px-4">刪除</Button>
        </Col>
        <Col xs="auto">
          <Button variant="info" className="text-white px-4">修改</Button>
        </Col>
        <Col xs="auto">
          <Button variant="info" className="text-white px-4">確認</Button>
        </Col>
      </Row>
    </Container>
  );

  return (
    <>
      <Header title="進出明細查詢 1.1.4.4" />
      <DynamicContainer content={content} />
    </>
  );
};

export default InventoryDetail;
