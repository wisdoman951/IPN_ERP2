import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Container, Row, Col, Form, Button, Modal, ListGroup } from "react-bootstrap";
import { getAllProducts, Product } from "../../services/ProductSellService"; // ✅ 改用正確來源
import { getAllStaffs, Staff } from "../../services/StaffService";
import { getCategories, Category } from "../../services/CategoryService";
import { addInventoryItem, getInventoryById, updateInventoryItem, exportInventory } from "../../services/InventoryService";
import { downloadBlob } from "../../utils/downloadBlob";
import { useNavigate, useSearchParams } from "react-router-dom";
import Header from "../../components/Header";
import { getStoreName } from "../../services/AuthUtils";
import { MemberIdentity } from "../../types/memberIdentity";

const InventoryEntryForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editingId = searchParams.get('id');

  const [products, setProducts] = useState<Product[]>([]);
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);

  const [formData, setFormData] = useState({
    product_id: "",
    quantity: "",
    date: "",
    staff_id: "",
    sale_staff_id: "",
    supplier: "",
    buyer: "",
    voucher: "",
    store_name: getStoreName() || "",
    note: ""
  });

  useEffect(() => {
    Promise.all([getAllProducts(), getCategories('product'), getAllStaffs()]).then(([res, cats, staffsRes]) => {
      const sorted = [...res].sort((a, b) => {
        const codeA = a.product_code ? parseInt(a.product_code, 10) : 0;
        const codeB = b.product_code ? parseInt(b.product_code, 10) : 0;
        return codeB - codeA;
      });
      setProducts(sorted);
      setCategories(cats);
      setStaffs(staffsRes);
    });

    if (editingId) {
      getInventoryById(Number(editingId)).then((data) => {
        if (data) {
          setFormData({
            product_id: String(data.Product_ID ?? ""),
            quantity: String(data.ItemQuantity ?? ""),
            date: data.StockInTime ? data.StockInTime.split("T")[0] : "",
            staff_id: String(data.Staff_ID ?? ""),
            sale_staff_id: "",
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
        alert("請選擇進貨人");
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

  const filteredProducts = useMemo(() => {
    const lower = productSearch.trim().toLowerCase();
    return products.filter(p =>
      !lower ||
      p.product_name.toLowerCase().includes(lower) ||
      (p.product_code || '').toLowerCase().includes(lower)
    );
  }, [products, productSearch]);

  const grouped = useMemo(() =>
    categories.map(cat => ({
      name: cat.name,
      items: filteredProducts.filter(p => p.categories?.includes(cat.name))
    })), [categories, filteredProducts]);

  const ungrouped = useMemo(() =>
    filteredProducts.filter(
      p => !p.categories || !p.categories.some(c => categories.some(cat => cat.name === c))
    ), [filteredProducts, categories]);

  const selectedProduct = useMemo(
    () => products.find(p => String(p.product_id) === formData.product_id),
    [products, formData.product_id]
  );

  const determinePricingIdentity = useCallback((storeName: string | null | undefined): MemberIdentity | null => {
    if (!storeName) {
      return null;
    }
    const normalized = storeName.trim();
    if (!normalized) {
      return null;
    }

    const matchesKeyword = (keywords: string[]) =>
      keywords.some(keyword => normalized.includes(keyword));

    if (matchesKeyword(["桃園", "桃園店", "桃園門市"])) {
      return "加盟店";
    }

    if (matchesKeyword([
      "台北", "台北店", "台北門市",
      "台中", "台中店", "台中門市",
      "澎湖", "澎湖店", "澎湖門市",
      "總部", "總店"
    ])) {
      return "直營店";
    }

    return null;
  }, []);

  const pricingIdentity = useMemo(
    () => determinePricingIdentity(formData.store_name),
    [determinePricingIdentity, formData.store_name]
  );

  const resolvePriceForIdentity = useCallback((
    tiers: Product["price_tiers"],
    fallback: number | string | undefined | null,
    identity: MemberIdentity
  ): number | undefined => {
    const toNumber = (value: number | string | null | undefined) => {
      if (value === undefined || value === null || value === "") {
        return undefined;
      }
      const parsed = Number(value);
      return Number.isNaN(parsed) ? undefined : parsed;
    };

    if (identity === "一般售價") {
      const general = toNumber(tiers?.["一般售價"]);
      if (general !== undefined) {
        return general;
      }
      return toNumber(fallback);
    }

    const specific = toNumber(tiers?.[identity]);
    if (specific !== undefined) {
      return specific;
    }

    const general = toNumber(tiers?.["一般售價"]);
    if (general !== undefined) {
      return general;
    }

    return toNumber(fallback);
  }, []);

  const purchasePriceDisplay = useMemo(() => {
    if (!selectedProduct) {
      return "";
    }

    const toNumber = (value: number | string | null | undefined) => {
      if (value === undefined || value === null || value === "") {
        return undefined;
      }
      const parsed = Number(value);
      return Number.isNaN(parsed) ? undefined : parsed;
    };

    const identityPrice = pricingIdentity
      ? resolvePriceForIdentity(selectedProduct.price_tiers, selectedProduct.product_price, pricingIdentity)
      : undefined;

    if (identityPrice !== undefined) {
      return Number(identityPrice).toLocaleString();
    }

    const purchase = toNumber(selectedProduct.purchase_price as number | string | null | undefined);
    if (purchase !== undefined) {
      return Number(purchase).toLocaleString();
    }

    const fallback = toNumber(selectedProduct.product_price as number | string | null | undefined);
    if (fallback !== undefined) {
      return Number(fallback).toLocaleString();
    }

    return "";
  }, [pricingIdentity, resolvePriceForIdentity, selectedProduct]);

  const handleProductSelect = useCallback((product: Product) => {
    setFormData(prev => ({ ...prev, product_id: String(product.product_id) }));
    setShowProductModal(false);
    setProductSearch('');
  }, []);

  const handleCloseProductModal = useCallback(() => {
    setShowProductModal(false);
    setProductSearch('');
  }, []);

  return (
    <>
      <Header />
      <Container
        className="mt-4"
        style={{ marginLeft: "200px", paddingRight: "30px", maxWidth: "calc(100% - 220px)" }}
      >
        <Form>
          <Row className="mb-3">
            <Col xs={12}>
              <Form.Group controlId="product_id">
                <Form.Label>品項</Form.Label>
                <div className="d-flex gap-2">
                  <Form.Control
                    type="text"
                    readOnly
                    placeholder="請選擇品項"
                    value={selectedProduct ? `[${selectedProduct.product_code ?? ""}] ${selectedProduct.product_name}` : ""}
                  />
                  <Button
                    variant="info"
                    className="text-white"
                    onClick={() => setShowProductModal(true)}
                  >
                    選擇品項
                  </Button>
                </div>
              </Form.Group>
            </Col>
          </Row>

          {/* 數量與進貨價 */}
          <Row className="mb-3">
            <Col xs={12} md={6} className="mb-3 mb-md-0">
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
            <Col xs={12} md={6}>
              <Form.Group controlId="purchase_price">
                <Form.Label>進貨價錢</Form.Label>
                <Form.Control
                  type="text"
                  value={purchasePriceDisplay}
                  readOnly
                  placeholder="尚未提供"
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

          <Row className="mb-3">
            <Col xs={12} md={4} className="mb-3 mb-md-0">
              <Form.Group controlId="sale_staff_id">
                <Form.Label>銷售人</Form.Label>
                <Form.Select
                  name="sale_staff_id"
                  value={formData.sale_staff_id}
                  onChange={handleChange}
                >
                  <option value="">-- 選擇銷售人 --</option>
                  {Array.isArray(staffs) && staffs.map((s, index) => {
                    const key = (s as any)?.staff_id ? `sale-staff-${(s as any).staff_id}` : `sale-staff-fallback-${index}`;
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
            <Col xs={12} md={4} className="mb-3 mb-md-0">
              <Form.Group controlId="voucher">
                <Form.Label>憑證單號</Form.Label>
                <Form.Control
                  type="text"
                  name="voucher"
                  value={formData.voucher}
                  onChange={handleChange}
                  placeholder="輸入購買人"
                />
              </Form.Group>
            </Col>
            <Col xs={12} md={4}>
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
          </Row>

          <Row className="mb-4">
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

      <Modal
        show={showProductModal}
        onHide={handleCloseProductModal}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>選擇品項</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group controlId="product_search_modal" className="mb-3">
            <Form.Control
              type="text"
              value={productSearch}
              onChange={e => setProductSearch(e.target.value)}
              placeholder="輸入名稱或編號搜尋"
            />
          </Form.Group>
          <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
            {grouped.filter(g => g.items.length > 0).map(g => (
              <div key={g.name} className="mb-3">
                <h6 className="mb-2">{g.name}</h6>
                <ListGroup>
                  {g.items.map(item => (
                    <ListGroup.Item
                      action
                      key={item.product_id}
                      onClick={() => handleProductSelect(item)}
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <span>[{item.product_code ?? ""}] {item.product_name}</span>
                        <small className="text-muted">庫存 {item.inventory_quantity}</small>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </div>
            ))}

            {ungrouped.length > 0 && (
              <div>
                <h6 className="mb-2">未分類</h6>
                <ListGroup>
                  {ungrouped.map(item => (
                    <ListGroup.Item
                      action
                      key={item.product_id}
                      onClick={() => handleProductSelect(item)}
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <span>[{item.product_code ?? ""}] {item.product_name}</span>
                        <small className="text-muted">庫存 {item.inventory_quantity}</small>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </div>
            )}

            {filteredProducts.length === 0 && (
              <div className="text-center text-muted">沒有符合條件的品項</div>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseProductModal}>
            關閉
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default InventoryEntryForm;
