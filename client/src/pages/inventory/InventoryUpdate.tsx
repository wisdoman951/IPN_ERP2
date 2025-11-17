import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Container, Row, Col, Form, Button, Modal, ListGroup, Spinner } from "react-bootstrap";
import { getAllStaffs, Staff } from "../../services/StaffService";
import {
  getMasterProductsForInbound,
  createMasterStockInbound,
  MasterProductInboundItem,
  getInventoryById,
  updateInventoryItem,
  exportInventory,
  updateMasterProductCost
} from "../../services/InventoryService";
import { downloadBlob } from "../../utils/downloadBlob";
import { useNavigate, useSearchParams } from "react-router-dom";
import Header from "../../components/Header";
import { getStoreName, getStoreId } from "../../services/AuthUtils";

const InventoryEntryForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editingId = searchParams.get('id');

  const [masterProducts, setMasterProducts] = useState<MasterProductInboundItem[]>([]);
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [showCostModal, setShowCostModal] = useState(false);
  const [costInput, setCostInput] = useState('');
  const [savingCost, setSavingCost] = useState(false);
  const [canEditCost, setCanEditCost] = useState(false);
  const [isAdminStore, setIsAdminStore] = useState(false);
  const storedStoreType = (localStorage.getItem('store_type') || 'DIRECT').toUpperCase() as 'DIRECT' | 'FRANCHISE';
  const [costStoreType, setCostStoreType] = useState<'DIRECT' | 'FRANCHISE'>(storedStoreType);

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

  const refreshMasterProducts = useCallback(() => {
    setLoadingProducts(true);
    return getMasterProductsForInbound()
      .then(setMasterProducts)
      .catch((error) => {
        console.error("載入主商品資料失敗", error);
      })
      .finally(() => setLoadingProducts(false));
  }, []);

  useEffect(() => {
    refreshMasterProducts();
    getAllStaffs()
      .then(setStaffs)
      .catch((error) => {
        console.error("載入人員資料失敗", error);
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
  }, [editingId, refreshMasterProducts]);

  useEffect(() => {
    const permission = localStorage.getItem('permission');
    const storeLevel = localStorage.getItem('store_level');
    setCanEditCost(permission !== 'therapist');
    setIsAdminStore(storeLevel === '總店' || permission === 'admin');
  }, []);

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
        navigate('/inventory/inventory-search');
        return;
      }

      if (!formData.product_id) {
        alert("請先選擇品項");
        return;
      }

      if (!formData.quantity || Number(formData.quantity) <= 0) {
        alert("請輸入正確的數量");
        return;
      }

      const storeId = getStoreId();
      await createMasterStockInbound({
        master_product_id: Number(formData.product_id),
        quantity: Number(formData.quantity),
        staff_id: Number(formData.staff_id),
        store_id: storeId ? Number(storeId) : undefined,
        reference_no: formData.voucher || undefined,
        note: formData.note || undefined,
      });
      alert("新增成功");

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
    return masterProducts.filter(p =>
      !lower ||
      p.name.toLowerCase().includes(lower) ||
      (p.master_product_code || '').toLowerCase().includes(lower)
    );
  }, [masterProducts, productSearch]);

  const selectedProduct = useMemo(
    () => masterProducts.find(p => String(p.master_product_id) === formData.product_id),
    [masterProducts, formData.product_id]
  );

  const purchasePriceDisplay = useMemo(() => {
    if (!selectedProduct || selectedProduct.cost_price === undefined || selectedProduct.cost_price === null) {
      return "";
    }
    return Number(selectedProduct.cost_price).toLocaleString();
  }, [selectedProduct]);

  const handleOpenCostModal = useCallback(() => {
    if (!selectedProduct) {
      alert('請先選擇品項');
      return;
    }
    if (!canEditCost) {
      alert('您沒有權限設定進貨價');
      return;
    }
    setCostInput(selectedProduct.cost_price ? String(selectedProduct.cost_price) : '');
    setCostStoreType(isAdminStore ? costStoreType : storedStoreType);
    setShowCostModal(true);
  }, [selectedProduct, canEditCost, isAdminStore, costStoreType, storedStoreType]);

  const handleSaveCost = useCallback(async () => {
    if (!selectedProduct) return;
    const numericValue = Number(costInput);
    if (!Number.isFinite(numericValue) || numericValue < 0) {
      alert('請輸入有效的進貨價');
      return;
    }
    setSavingCost(true);
    try {
      const payload: { master_product_id: number; cost_price: number; store_type?: 'DIRECT' | 'FRANCHISE' } = {
        master_product_id: selectedProduct.master_product_id,
        cost_price: numericValue,
      };
      if (isAdminStore) {
        payload.store_type = costStoreType;
      }
      await updateMasterProductCost(payload);
      await refreshMasterProducts();
      alert('進貨價已更新');
      setShowCostModal(false);
    } catch (error) {
      console.error('進貨價更新失敗', error);
      alert('進貨價更新失敗，請稍後再試');
    } finally {
      setSavingCost(false);
    }
  }, [selectedProduct, costInput, costStoreType, isAdminStore, refreshMasterProducts]);

  const handleProductSelect = useCallback((product: MasterProductInboundItem) => {
    setFormData(prev => ({ ...prev, product_id: String(product.master_product_id) }));
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
                    value={selectedProduct ? selectedProduct.name : ""}
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
                <div className="d-flex gap-2">
                  <Form.Control
                    type="text"
                    value={purchasePriceDisplay}
                    readOnly
                    placeholder="尚未提供"
                  />
                  <Button
                    variant="outline-secondary"
                    onClick={handleOpenCostModal}
                    disabled={!canEditCost}
                  >
                    設定進貨價
                  </Button>
                </div>
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
            {loadingProducts && (
              <div className="text-center text-muted">載入商品中…</div>
            )}

            {!loadingProducts && filteredProducts.length > 0 && (
              <ListGroup>
                {filteredProducts.map(item => (
                  <ListGroup.Item
                    action
                    key={item.master_product_id}
                    onClick={() => handleProductSelect(item)}
                  >
                    <div className="d-flex justify-content-between align-items-center">
                      <div>{item.name}</div>
                      <div className="text-muted small">
                        庫存 {item.quantity_on_hand ?? 0}
                        {item.cost_price !== undefined && item.cost_price !== null && (
                          <>
                            <span className="mx-1">·</span>
                            進貨價 {Number(item.cost_price).toLocaleString()}
                          </>
                        )}
                      </div>
                    </div>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            )}

            {!loadingProducts && filteredProducts.length === 0 && (
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

      <Modal
        show={showCostModal}
        onHide={() => setShowCostModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>設定進貨價</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedProduct ? (
            <>
              <p className="mb-2">{selectedProduct.name}</p>
              {isAdminStore && (
                <Form.Group className="mb-3">
                  <Form.Label>套用店型</Form.Label>
                  <Form.Select
                    value={costStoreType}
                    onChange={(e) => setCostStoreType(e.target.value as 'DIRECT' | 'FRANCHISE')}
                  >
                    <option value="DIRECT">直營店</option>
                    <option value="FRANCHISE">加盟店</option>
                  </Form.Select>
                </Form.Group>
              )}
              <Form.Group>
                <Form.Label>進貨價</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  value={costInput}
                  onChange={(e) => setCostInput(e.target.value)}
                />
                <Form.Text className="text-muted">
                  將更新{isAdminStore ? '所選店型' : (storedStoreType === 'FRANCHISE' ? '加盟店' : '直營店')}的進貨成本。
                </Form.Text>
              </Form.Group>
            </>
          ) : (
            <p className="mb-0">請先選擇品項</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCostModal(false)}>
            取消
          </Button>
          <Button
            variant="primary"
            onClick={handleSaveCost}
            disabled={savingCost || !selectedProduct}
          >
            {savingCost && <Spinner animation="border" size="sm" className="me-2" />}儲存
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default InventoryEntryForm;
