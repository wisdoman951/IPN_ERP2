import React, { useEffect, useState } from "react";
import { Container, Row, Col, Form, Button } from "react-bootstrap";
import { getAllProducts, Product } from "../../services/ProductSellService"; // ✅ 改用正確來源
import { getAllStaffs, Staff } from "../../services/StaffService";
import { addInventoryItem, getInventoryById, updateInventoryItem, exportInventory } from "../../services/InventoryService";
import { downloadBlob } from "../../utils/downloadBlob";
import { useNavigate, useSearchParams } from "react-router-dom";
import Header from "../../components/Header";
import { getStoreName } from "../../services/AuthUtils";

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
    supplier: "",
    buyer: "",
    voucher: "",
    store_name: getStoreName() || "",
    note: ""
  });

  useEffect(() => {
    getAllProducts().then((res) => {
      const sorted = [...res].sort((a, b) => {
        const codeA = a.product_code ? parseInt(a.product_code, 10) : 0;
        const codeB = b.product_code ? parseInt(b.product_code, 10) : 0;
        return codeB - codeA;
      });
      setProducts(sorted);
    });
    getAllStaffs().then((res) => setStaffs(res));

    if (editingId) {
      getInventoryById(Number(editingId)).then((data) => {
        if (data) {
          setFormData({
            product_id: String(data.Product_ID ?? ""),
            quantity: String(data.ItemQuantity ?? ""),
            date: data.StockInTime ? data.StockInTime.split("T")[0] : "",
            staff_id: String(data.Staff_ID ?? ""),
            supplier: data.Supplier || "",
            buyer: data.Buyer || "",
            voucher: data.Voucher || "",
            store_name: data.StoreName || getStoreName() || "",
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
        alert("請選擇銷售人");
        return;
      }

      const payload = {
        productId: Number(formData.product_id),
        quantity: Number(formData.quantity),
        stockIn: Number(formData.quantity),
        date: formData.date,
        staffId: Number(formData.staff_id),
        supplier: formData.supplier || undefined,
        buyer: formData.buyer || undefined,
        voucher: formData.voucher || undefined,
        note: formData.note
      } as any;

      if (editingId) {
        await updateInventoryItem(Number(editingId), {
          quantity: Number(formData.quantity),
          stock_in: Number(formData.quantity),
          stock_out: 0,
          stock_loan: 0,
          stock_threshold: 5,
          staff_id: Number(formData.staff_id),
          date: formData.date,
          supplier: formData.supplier || undefined,
          buyer: formData.buyer || undefined,
          voucher: formData.voucher || undefined,
        } as any);
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
      const blob = await exportInventory();
      downloadBlob(blob, `庫存報表_${new Date().toISOString().split('T')[0]}.xlsx`);
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
                  {products.map((p) => {
                    const key = p.product_id;
                    const value = p.product_id;
                    const label = `[${p.product_code ?? ""}] ${p.product_name}`;
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
                <Form.Label>數量</Form.Label>
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
                <Form.Label>進出日期</Form.Label>
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
                <Form.Label>銷售人</Form.Label>
                <Form.Select
                  name="staff_id"
                  value={formData.staff_id}
                  onChange={handleChange}
                >
                  <option value="">-- 選擇銷售人 --</option>
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

          <Row className="mb-3">
            <Col xs={12} md={6} className="mb-3 mb-md-0">
              <Form.Group controlId="supplier">
                <Form.Label>供貨人</Form.Label>
                <Form.Control
                  type="text"
                  name="supplier"
                  value={formData.supplier}
                  onChange={handleChange}
                />
              </Form.Group>
            </Col>
            <Col xs={12} md={6}>
              <Form.Group controlId="store_name">
                <Form.Label>出貨單位</Form.Label>
                <Form.Control
                  type="text"
                  name="store_name"
                  value={formData.store_name}
                  readOnly
                />
              </Form.Group>
            </Col>
          </Row>

          <Row className="mb-3">
            <Col xs={12} md={6} className="mb-3 mb-md-0">
              <Form.Group controlId="buyer">
                <Form.Label>購買人</Form.Label>
                <Form.Control
                  type="text"
                  name="buyer"
                  value={formData.buyer}
                  onChange={handleChange}
                  placeholder="輸入購買人"
                />
              </Form.Group>
            </Col>
            <Col xs={12} md={6}>
              <Form.Group controlId="voucher">
                <Form.Label>憑證單號</Form.Label>
                <Form.Control
                  type="text"
                  name="voucher"
                  value={formData.voucher}
                  onChange={handleChange}
                />
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

          <Row className="justify-content-end text-center g-2 mt-3">
            <Col xs={12} className="mb-2 d-flex align-items-center justify-content-center">
            </Col>
          
            {/* <Col xs={6} md={2}>
              <Button
                variant="info"
                className="w-100 text-white"
                onClick={() => navigate('/inventory/inventory-insert')}
              >
                新增
              </Button>
            </Col>
          
            <Col xs={6} md={2}>
              <Button variant="info" className="w-100 text-white" onClick={handleExport}>報表匯出</Button>
            </Col>
          
            <Col xs={6} md={2}>
              <Button variant="info" className="w-100 text-white">刪除</Button>
            </Col>
          
            <Col xs={6} md={2}>
              <Button variant="info" className="w-100 text-white">修改</Button>
            </Col> */}
          
            <Col xs={6} md={2}>
              <Button variant="info" className="w-100 text-white" onClick={handleSubmit}>確認</Button>
            </Col>
          
            <Col xs={6} md={2}>
              <Button
                variant="info"
                className="w-100 text-white"
                onClick={() => navigate(-1)}
              >
                返回
              </Button>
            </Col>
          </Row>

        </Form>
      </Container>
    </>
  );
};

export default InventoryEntryForm;
