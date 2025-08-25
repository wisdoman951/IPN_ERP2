import React, { useEffect, useState } from "react";
import { Button, Col, Container, Form, Row, Spinner } from "react-bootstrap";
import Header from "../../components/Header";
import DynamicContainer from "../../components/DynamicContainer";
import ScrollableTable from "../../components/ScrollableTable";
import {
  getAllInventory,
  searchInventory,
  updateInventoryThreshold,
  exportInventory
} from "../../services/InventoryService";
import { downloadBlob } from "../../utils/downloadBlob";

interface InventoryItem {
  Inventory_ID: number;
  Product_ID: number;
  ProductName: string;
  StockQuantity: number;
  StockThreshold: number;
  SoldQuantity: number;
}

const InventoryAnalysis: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [thresholdMap, setThresholdMap] = useState<Record<number, number>>({});
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);

  const getUserStoreId = (): number | undefined => {
    const id = localStorage.getItem("store_id");
    return id ? Number(id) : undefined;
  };

  const userStoreId = getUserStoreId();
  const isAdmin = (() => {
    const level = localStorage.getItem("store_level");
    const perm = localStorage.getItem("permission");
    return level === "總店" || perm === "admin";
  })();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getAllInventory(isAdmin ? undefined : userStoreId);
      if (Array.isArray(data)) {
        setItems(data);
        const map: Record<number, number> = {};
        data.forEach((i) => {
          map[i.Inventory_ID] = i.StockThreshold ?? 0;
        });
        setThresholdMap(map);
      } else {
        setItems([]);
      }
    } catch (err) {
      console.error("load inventory failed", err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const data = await searchInventory(keyword, isAdmin ? undefined : userStoreId);
      if (Array.isArray(data)) {
        setItems(data);
        const map: Record<number, number> = {};
        data.forEach((i) => {
          map[i.Inventory_ID] = i.StockThreshold ?? 0;
        });
        setThresholdMap(map);
      } else {
        setItems([]);
      }
    } catch (err) {
      console.error("search inventory failed", err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleThresholdChange = (id: number, value: string) => {
    setThresholdMap((prev) => ({ ...prev, [id]: Number(value) }));
  };

  const saveThreshold = async (id: number) => {
    try {
      await updateInventoryThreshold(id, thresholdMap[id]);
      await fetchData();
    } catch (err) {
      console.error("update threshold failed", err);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await exportInventory({
        storeId: isAdmin ? undefined : userStoreId,
      });
      downloadBlob(blob, `庫存報表_${new Date().toISOString().split("T")[0]}.xlsx`);
    } catch (err) {
      console.error("匯出庫存資料失敗", err);
      alert("匯出失敗");
    }
  };

  const content = (
    <Container className="my-4">
      <Row className="align-items-center mb-3">
        <Col xs="auto">
          <Form.Label className="fw-semibold">品項</Form.Label>
        </Col>
        <Col xs={12} md={6}>
          <Form.Control
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="輸入產品名稱或編號搜尋"
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
          />
        </Col>
        <Col xs="auto">
          <Button
            variant="info"
            className="text-white px-4"
            onClick={handleSearch}
            disabled={loading}
          >
            {loading ? <Spinner size="sm" animation="border" /> : "搜尋"}
          </Button>
        </Col>
      </Row>

      <Row className="mb-2">
        <Col className="text-danger fw-semibold text-end">
          資料連動總部出貨、分店銷售
        </Col>
      </Row>

      <ScrollableTable
        autoHeight
        tableHeader={
          <tr>
            <th>產品名稱</th>
            <th className="text-end">庫存量</th>
            <th>預警門檻</th>
            <th>出售量分析</th>
            <th>滯銷品分析</th>
          </tr>
        }
        tableBody={
          loading ? (
            <tr>
              <td colSpan={5} className="text-center py-4">
                <Spinner animation="border" variant="info" />
              </td>
            </tr>
          ) : items.length > 0 ? (
            items.map((item) => (
              <tr
                key={item.Inventory_ID}
                className={
                  item.StockQuantity === 0
                    ? "table-danger"
                    : item.StockQuantity <= (thresholdMap[item.Inventory_ID] ?? 0)
                    ? "table-warning"
                    : ""
                }
              >
                <td>{item.ProductName}</td>
                <td className="text-end">{item.StockQuantity}</td>
                <td>
                  <div className="d-flex align-items-center">
                    <Form.Control
                      type="number"
                      size="sm"
                      style={{ maxWidth: "80px" }}
                      value={thresholdMap[item.Inventory_ID] ?? 0}
                      onChange={(e) => handleThresholdChange(item.Inventory_ID, e.target.value)}
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      className="ms-2"
                      onClick={() => saveThreshold(item.Inventory_ID)}
                    >
                      保存
                    </Button>
                  </div>
                </td>
                <td className="text-end">{item.SoldQuantity ?? 0}</td>
                <td></td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="text-center text-muted py-5">
                尚無資料
              </td>
            </tr>
          )
        }
      />

      <Row className="justify-content-end my-4">
        <Col xs="auto">
          <Button variant="info" className="text-white px-4" onClick={handleExport}>
            報表匯出
          </Button>
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

export default InventoryAnalysis;
