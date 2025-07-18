import React, { useEffect, useState } from "react";
import { Button, Col, Container, Form, Row, Table } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import IconButton from "../../components/IconButton";

interface StockRecord {
  id: number;
  item: string;
  incoming: number;
  outgoing: number;
  borrower: string;
}

const StockUpdate: React.FC = () => {
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState("");
  const [records, setRecords] = useState<StockRecord[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    // 初始化可以 fetch 資料
    fetchAllRecords();
  }, []);

  const fetchAllRecords = async () => {
    // TODO: Replace with API
    setRecords([]);
  };

  const handleSearch = async () => {
    // TODO: Replace with API
    console.log("Searching for:", searchValue);
  };

  const handleCheck = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="d-flex flex-column min-vh-100 bg-white">
      <header className="d-flex justify-content-between align-items-center app-header bg-info px-4 py-3">
        <h1 className="text-white fw-bold fs-4 m-0">更新庫存數據 1.1.4.3</h1>
        <div className="d-flex gap-3">
          <IconButton.HomeButton onClick={() => navigate("/")} />
          <IconButton.CloseButton onClick={() => navigate(-1)} />
        </div>
      </header>

      <Container className="my-4">
        <Col md={9} className="ms-auto">
        <Row className="align-items-center mb-3">
          <Col md={3}>
            <Form.Control
              placeholder="品項"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </Col>
          <Col md="auto">
            <Button variant="info" onClick={handleSearch}>搜尋</Button>
          </Col>
          <Col md="auto">
            <Button variant="info">新增</Button>
          </Col>
          <Col md={12}>
            <p className="text-danger mt-2">分店手動輸入入庫、連動分店銷售</p>
          </Col>
        </Row>

        <Table bordered hover responsive>
          <thead>
            <tr>
              <th>勾選</th>
              <th>進貨</th>
              <th>出貨</th>
              <th>借貨/借貨人姓名</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center">無資料</td>
              </tr>
            ) : (
              records.map((record) => (
                <tr key={record.id}>
                  <td>
                    <Form.Check
                      type="checkbox"
                      checked={selectedIds.includes(record.id)}
                      onChange={() => handleCheck(record.id)}
                    />
                  </td>
                  <td>{record.incoming}</td>
                  <td>{record.outgoing}</td>
                  <td>{record.borrower}</td>
                </tr>
              ))
            )}
          </tbody>
        </Table>

        <div className="d-flex justify-content-end gap-3 mt-4">
          <Button variant="info">報表匯出</Button>
          <Button variant="info">刪除</Button>
          <Button variant="info">修改</Button>
          <Button variant="info">確認</Button>
        </div>
        </Col>
      </Container>
    </div>
  );
};

export default StockUpdate;