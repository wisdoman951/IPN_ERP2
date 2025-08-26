import React, { useEffect, useState } from "react";
import { Container, Row, Col, Form, Button, Table } from "react-bootstrap";
import Header from "../../components/Header";
import DynamicContainer from "../../components/DynamicContainer";
import { getInventoryRecords, exportInventory } from "../../services/InventoryService";
import { downloadBlob } from "../../utils/downloadBlob";
import { useNavigate, useSearchParams } from "react-router-dom";

const formatDate = (d: string) => {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const da = String(dt.getDate()).padStart(2, "0");
  return `${y}/${m}/${da}`;
};

interface RecordRow {
  Inventory_ID: number;
  Name: string;
  quantity: number;
  Date: string;
  StaffName: string;
  StoreName: string;
  SaleStaff?: string;
  Buyer?: string;
  Voucher?: string;
  Price?: number;
}

const InventoryDetail: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const productId = searchParams.get("productId");
  const productName = searchParams.get("productName");
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saleStaff, setSaleStaff] = useState("");
  const [buyer, setBuyer] = useState("");

  const handleSearch = () => {
    getInventoryRecords({
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      sale_staff: saleStaff || undefined,
      buyer: buyer || undefined,
      productId: productId ? Number(productId) : undefined,
    }).then((res) => setRecords(res));
  };

  const handleExport = async () => {
    try {
      const blob = await exportInventory({
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        sale_staff: saleStaff || undefined,
        buyer: buyer || undefined,
        detail: true,
        productId: productId ? Number(productId) : undefined,
      });
      downloadBlob(blob, `庫存報表_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      console.error("匯出庫存資料失敗", err);
      alert("匯出失敗");
    }
  };

  useEffect(() => {
    handleSearch();
  }, [productId]);

  const content = (
    <Container fluid className="p-4">
      <h5 className="text-danger mb-3">{productName ? `${productName} 詳細入庫資訊` : "資料連動總部出貨、分店銷售"}</h5>

      {/* 搜尋列 */}
      <Row className="align-items-center mb-3 g-2">
        <Col xs="auto">
          <Form.Label className="fw-bold">起始日期</Form.Label>
        </Col>
        <Col xs="auto">
          <Form.Control size="sm" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </Col>
        <Col xs="auto">
          <Form.Label className="fw-bold">結束日期</Form.Label>
        </Col>
        <Col xs="auto">
          <Form.Control size="sm" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </Col>
        <Col xs="auto">
          <Form.Label className="fw-bold">銷售人</Form.Label>
        </Col>
        <Col xs="auto">
          <Form.Control size="sm" type="text" placeholder="輸入銷售人" value={saleStaff} onChange={(e) => setSaleStaff(e.target.value)} />
        </Col>
        <Col xs="auto">
          <Form.Label className="fw-bold">購買人</Form.Label>
        </Col>
        <Col xs="auto">
          <Form.Control size="sm" type="text" placeholder="輸入購買人" value={buyer} onChange={(e) => setBuyer(e.target.value)} />
        </Col>
        <Col xs="auto">
          <Button variant="info" className="text-white px-4 py-1" onClick={handleSearch}>搜尋</Button>
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
            <th>購買人</th>
            <th>憑證單號</th>
          </tr>
        </thead>
        <tbody>
          {records.length === 0 ? (
            <tr>
              <td colSpan={15} className="text-center">
                <em>尚無資料</em>
              </td>
            </tr>
          ) : (
            records.map((r) => (
              <tr key={r.Inventory_ID}>
                <td>
                  <Form.Check
                    type="checkbox"
                    checked={selectedId === r.Inventory_ID}
                    onChange={() =>
                      setSelectedId(
                        selectedId === r.Inventory_ID ? null : r.Inventory_ID
                      )
                    }
                  />
                </td>
                <td>{r.Inventory_ID}</td>
                <td>{r.Name}</td>
                <td></td>
                <td>{r.Price ?? ''}</td>
                <td>{r.quantity}</td>
                <td>{r.Price ? Math.abs(r.Price * r.quantity) : ''}</td>
                <td></td>
                <td></td>
                <td>{formatDate(r.Date)}</td>
                <td></td>
                <td>{r.StoreName}</td>
                <td>{r.SaleStaff || r.StaffName}</td>
                <td>{r.Buyer ?? ''}</td>
                <td>{r.Voucher ?? ''}</td>
              </tr>
            ))
          )}
        </tbody>
      </Table>

      {/* 下方按鈕列 */}
      <Row className="mt-4 justify-content-center g-2">
        <Col xs="auto">
          <Button variant="info" className="text-white px-4" onClick={handleExport}>報表匯出</Button>
        </Col>
        <Col xs="auto">
          <Button variant="info" className="text-white px-4">刪除</Button>
        </Col>
        <Col xs="auto">
          <Button
            variant="info"
            className="text-white px-4"
            onClick={() => {
              if (selectedId) {
                navigate(`/inventory/inventory-update?id=${selectedId}`);
              } else {
                alert('請先勾選要修改的資料');
              }
            }}
          >
            修改
          </Button>
        </Col>
        <Col xs="auto">
          <Button variant="info" className="text-white px-4">確認</Button>
        </Col>
      </Row>
    </Container>
  );

  return (
    <>
      <Header />
      <DynamicContainer content={content} />
    </>
  );
};

export default InventoryDetail;
