import React, { useEffect, useState } from "react";
import { Container, Row, Col, Form, Button } from "react-bootstrap";
import { getAllProducts } from "../../services/ProductSellService";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import { addInventoryItem } from "../../services/InventoryService";

interface Product {
  product_id: number;
  product_name: string;
  product_price: number;
  inventory_id: number;
  quantity: number;
  sale_category?: string;
}

const InventoryInsert = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [formData, setFormData] = useState({
    product_id: "",
    category: "",
    date: "",
    note: ""
  });

  useEffect(() => {
    getAllProducts().then((res) => {
      console.log("產品資料:", res);
      setProducts(res);
    });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        productId: Number(formData.product_id),
        quantity: 0,
        stockIn: 0,
        date: formData.date,
        note: formData.note,
        category: formData.category
      };
      await addInventoryItem(payload);
      alert("新增成功");
    } catch (error) {
      console.error(error);
      alert("送出失敗，請稍後再試。");
    }
  };

  return (
    <>
      <Header title="新增庫存資料 1.2.4.3.1" />
      <Container
        className="mt-4"
        style={{ marginLeft: "200px", paddingRight: "30px", maxWidth: "calc(100% - 220px)" }}
      >
        <Row>
          <Col md={{ span: 8, offset: 2 }}>
            <div className="shadow-sm">
              <div className="p-4 bg-white rounded-bottom">
                <Form>
                  <Row className="mb-3">
                    <Col xs={12} md={6}>
                      <Form.Group controlId="product_id">
                        <Form.Label>品項</Form.Label>
                        <Form.Select
                          name="product_id"
                          value={formData.product_id}
                          onChange={handleChange}
                        >
                          <option value="">-- 選擇品項 --</option>
                          {products.map((p) => (
                            <option key={p.product_id} value={p.product_id}>
                              [{p.product_id}] {p.product_name}
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>

                    <Col xs={12} md={6}>
                      <Form.Group controlId="category">
                        <Form.Label>類別</Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="可輸入或留空"
                          name="category"
                          value={formData.category}
                          onChange={handleChange}
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Row className="mb-3">
                    <Col xs={12} md={6}>
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
                      <Form.Group controlId="note">
                        <Form.Label>備註</Form.Label>
                        <Form.Control
                          type="text"
                          name="note"
                          value={formData.note}
                          onChange={handleChange}
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Row className="text-center g-2">
                    <Col xs={12} md={2} className="ms-auto">
                      <div className="d-flex gap-2">
                        <Button variant="info" className="w-100 text-white" onClick={handleSubmit}>
                          確認
                        </Button>
                        <Button variant="info" className="w-100 text-white" onClick={() => navigate(-1)}>
                          取消
                        </Button>
                      </div>
                    </Col>
                  </Row>
                </Form>
              </div>
            </div>
          </Col>
        </Row>
      </Container>
    </>
  );
};

export default InventoryInsert;
