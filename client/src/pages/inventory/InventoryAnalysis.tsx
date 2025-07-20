import React, { useEffect, useState } from "react";
import { Button, Container, Row, Col, Form, Table, Spinner } from "react-bootstrap";
import Header from "../../components/Header";
import { getAllInventory, updateInventoryItem } from "../../services/InventoryService";
import { getAllStores } from "../../services/LoginService";

interface InventoryItem {
  Inventory_ID: number;
  Product_ID: number;
  ProductName: string;
  StockQuantity: number;
  StockThreshold: number;
  Store_ID: number;
  StoreName: string;
}

interface Store {
  store_id: number;
  store_name: string;
}

const InventoryAnalysis: React.FC = () => {
  const level = localStorage.getItem('store_level');
  const perm = localStorage.getItem('permission');
  const userStoreId = Number(localStorage.getItem('store_id'));
  const isAdmin = level === '總店' || perm === 'admin';

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<number>(userStoreId);
  const [thresholds, setThresholds] = useState<Record<number, number>>({});

  useEffect(() => {
    fetchData();
  }, [selectedStore]);

  useEffect(() => {
    if (isAdmin) {
      getAllStores().then(setStores).catch(() => {});
    }
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getAllInventory(isAdmin ? selectedStore : userStoreId);
      const arr = Array.isArray(data) ? data : [];
      setItems(arr);
      const map: Record<number, number> = {};
      arr.forEach(it => { map[it.Inventory_ID] = it.StockThreshold; });
      setThresholds(map);
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (id: number) => {
    try {
      await updateInventoryItem(id, { stockThreshold: thresholds[id] });
      alert('更新成功');
      fetchData();
    } catch (e) {
      console.error(e);
      alert('更新失敗');
    }
  };

  return (
    <div className="d-flex flex-column min-vh-100 bg-white">
      <Header />
      <Container className="my-4">
        {isAdmin && (
          <Row className="mb-3">
            <Col xs={12} md={4} className="ms-auto">
              <Form.Select value={selectedStore} onChange={e => setSelectedStore(Number(e.target.value))}>
                <option value={0}>全部分店</option>
                {stores.map(s => (
                  <option key={s.store_id} value={s.store_id}>{s.store_name}</option>
                ))}
              </Form.Select>
            </Col>
          </Row>
        )}
        <Row>
          <Col className="text-danger fw-semibold text-end">資料連動總部出貨、分店銷售</Col>
        </Row>
        <Row className="mt-3">
          <Col>
            <Table bordered hover responsive>
              <thead className="text-center">
                <tr>
                  <th>產品名稱</th>
                  <th>庫存量</th>
                  <th>預警門檻</th>
                  <th>出售量分析</th>
                  <th>滯銷品分析</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center"><Spinner animation="border" /></td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={6} className="text-center text-muted py-5">尚無資料</td></tr>
                ) : (
                  items.map(it => {
                    const rowClass = it.StockQuantity === 0 ? 'table-danger' : (it.StockQuantity <= thresholds[it.Inventory_ID] ? 'table-warning' : '');
                    return (
                      <tr key={it.Inventory_ID} className={rowClass}>
                        <td>{it.ProductName}</td>
                        <td className="text-end">{it.StockQuantity}</td>
                        <td style={{ width: '120px' }}>
                          <Form.Control type="number" value={thresholds[it.Inventory_ID] ?? ''} onChange={e => setThresholds({ ...thresholds, [it.Inventory_ID]: Number(e.target.value) })} />
                        </td>
                        <td className="text-center">--</td>
                        <td className="text-center">--</td>
                        <td className="text-center"><Button size="sm" variant="info" className="text-white" onClick={() => handleSave(it.Inventory_ID)}>保存</Button></td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default InventoryAnalysis;
