import React, { useEffect, useState } from "react";
import { Container, Row, Col, Form, Button } from "react-bootstrap";
import { getAllProducts, Product } from "../../services/ProductSellService"; // ✅ 改用正確來源
import { getAllStaffs, Staff } from "../../services/StaffService";
import { addInventoryItem, getInventoryById, updateInventoryItem, exportInventory } from "../../services/InventoryService";
import { useNavigate, useSearchParams } from "react-router-dom";
import Header from "../../components/Header";

const InventoryEntryForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editingId = searchParams.get('id');

  const [products, setProducts] = useState<Product[]>([]);
  const [staffs, setStaffs] = useState<Staff[]>([]);

  const [formData, setFormData] = useState({
    product_id: "",
    quantity: "",
    date: "",
    staff_id: "",
    note: ""
  });

  useEffect(() => {
    getAllProducts().then((res) => setProducts(res));
    getAllStaffs().then((res) => setStaffs(res));

    if (editingId) {
      getInventoryById(Number(editingId)).then((data) => {
        if (data) {
          setFormData({
            product_id: String(data.Product_ID ?? ""),
            quantity: String(data.ItemQuantity ?? ""),
            date: data.StockInTime ? data.StockInTime.split("T")[0] : "",
            staff_id: String(data.Staff_ID ?? ""),
            note: data.note ?? "",
          });
        }
      });
    }
  }, [editingId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    try {
      if (!formData.staff_id) {
        alert("請選擇進貨人");
        return;
      }

      const payload = {
        productId: Number(formData.product_id),
        quantity: Number(formData.quantity),
        stockIn: Number(formData.quantity),
        date: formData.date,
        staffId: Number(formData.staff_id),
        note: formData.note
      };

      if (editingId) {
        await updateInventoryItem(Number(editingId), {
          stockIn: Number(formData.quantity),
          stockInTime: formData.date,
          stockOut: 0,
          stockLoan: 0,
          borrower: "",
          stockQuantity: Number(formData.quantity),
          stockThreshold: 5,
        });
        alert("更新成功");
      } else {
        await addInventoryItem(payload);
        alert("新增成功");
      }

      navigate('/inventory/inventory-search');
    } catch (error) {
      alert("送出失敗，請稍後再試。");
      console.error(error);
    }
  };

  const handleExport = async () => {
    try {
      await exportInventory();
    } catch (err) {
      console.error("匯出庫存資料失敗", err);
      alert("匯出失敗");
    }
  };

  return (
    <>
      <Header />
      <Container
        className="mt-4"
        style={{ marginLeft: "200px", paddingRight: "30px", maxWidth: "calc(100% - 220px)" }}
      >
        <Form>
          <Row className="mb-3">
            <Col xs={12} md={6} className="mb-3 mb-md-0">
              <Form.Group controlId="product_id">
                <Form.Label>品項</Form.Label>
                <Form.Select
                  name="product_id"
                  value={formData.product_id}
                  onChange={handleChange}
                >
                  <option value="">-- 選擇品項 --</option>
                  {products.map((p, index) => {
                    const key = p.product_id;
                    const value = p.product_id;
                    const label = `[${p.product_id}] ${p.product_name}`;
                    return (
                      <option key={key} value={value}>
                        {label}
                      </option>
                    );
                  })}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col xs={12} md={6}>
              <Form.Group controlId="quantity">
                <Form.Label>進貨數量</Form.Label>
                <Form.Control
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                />
              </Form.Group>
            </Col>
          </Row>

          <Row className="mb-3">
            <Col xs={12} md={6} className="mb-3 mb-md-0">
              <Form.Group controlId="date">
                <Form.Label>進貨日期</Form.Label>
                <Form.Control
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                />
              </Form.Group>
            </Col>
            <Col xs={12} md={6}>
              <Form.Group controlId="staff_id">
                <Form.Label>進貨人</Form.Label>
                <Form.Select
                  name="staff_id"
                  value={formData.staff_id}
                  onChange={handleChange}
                >
                  <option value="">-- 選擇進貨人 --</option>
                  {Array.isArray(staffs) && staffs.map((s, index) => {
                    const key = (s as any)?.staff_id ? `staff-${(s as any).staff_id}` : `staff-fallback-${index}`;
                    const value = (s as any)?.staff_id ?? "";
                    const label = (s as any)?.name ?? `員工 ${index + 1}`;
                    return (
                      <option key={key} value={value}>
                        {label}
                      </option>
                    );
                  })}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <Row className="mb-4">
            <Col xs={12}>
              <Form.Group controlId="note">
                <Form.Label>備註</Form.Label>
                <Form.Control
                  as="textarea"
                  name="note"
                  value={formData.note}
                  onChange={handleChange}
                  rows={2}
                />
              </Form.Group>
            </Col>
          </Row>

          <Row className="text-center g-2">
            <Col xs={12} className="mb-2 d-flex align-items-center justify-content-center">
              <Form.Check type="checkbox" id="custom-check" className="me-2" />
              <Form.Label htmlFor="custom-check" className="mb-0">勾選</Form.Label>
            </Col>
            <Col xs={6} md={2}>
              <Button variant="info" className="w-100 text-white" onClick={handleExport}>報表匯出</Button>
            </Col>
            <Col xs={6} md={2}>
              <Button variant="info" className="w-100 text-white">刪除</Button>
            </Col>
            <Col xs={6} md={2}>
              <Button variant="info" className="w-100 text-white">修改</Button>
            </Col>
            <Col xs={12} md={2}>
              <Button variant="info" className="w-100 text-white" onClick={handleSubmit}>確認</Button>
            </Col>
          </Row>
        </Form>
      </Container>
    </>
  );
};

export default InventoryEntryForm;
