import React, { useState, useEffect } from "react";
import { Button, Container, Row, Col, Form, Table } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import DynamicContainer from "../../components/DynamicContainer";
import { getAllProducts, Product } from "../../services/ProductSellService";
import { fetchAllBundles, Bundle } from "../../services/ProductBundleService";

interface SelectedProduct {
  type?: 'product' | 'bundle';
  product_id?: number;
  bundle_id?: number;
  code?: string;
  name: string;
  price: number;
  quantity: number;
  inventory_id?: number;
  stock_quantity?: number;
  content?: string;
}

const ProductSelection: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setError(null);
      try {
        const [productData, bundleData] = await Promise.all([
          getAllProducts(),
          fetchAllBundles()
        ]);
        const sortedProducts = [...productData].sort(
          (a, b) => b.product_id - a.product_id
        );
        const sortedBundles = [...bundleData].sort(
          (a, b) => b.bundle_id - a.bundle_id
        );
        setProducts(sortedProducts);
        setBundles(sortedBundles);
      } catch (err) {
        console.error("載入產品資料失敗：", err);
        setError("載入產品資料失敗，請稍後再試。");
      }
    };

    fetchData();

    // --- 關鍵修正：進頁時還原 localStorage ---
    const selectedProductsData = localStorage.getItem('selectedProducts');
    const emptyItem: SelectedProduct = {
      type: undefined,
      product_id: undefined,
      bundle_id: undefined,
      code: undefined,
      name: "",
      price: 0,
      quantity: 1,
      inventory_id: undefined,
      stock_quantity: undefined,
      content: undefined
    };

    if (selectedProductsData) {
      try {
        const prods: SelectedProduct[] = JSON.parse(selectedProductsData);
        if (Array.isArray(prods) && prods.length > 0) {
          setSelectedProducts(prods.map((p) => ({ ...emptyItem, ...p })));
        } else {
          setSelectedProducts([emptyItem]);
        }
      } catch {
        setSelectedProducts([emptyItem]);
      }
    } else {
      setSelectedProducts([emptyItem]);
    }
  }, []);

  // ...其餘邏輯不用動...

  const calculateTotal = () => {
    return selectedProducts.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const addNewItem = () => {
    setSelectedProducts([...selectedProducts, {
      type: undefined,
      product_id: undefined,
      bundle_id: undefined,
      code: undefined,
      name: "",
      price: 0,
      quantity: 1,
      inventory_id: undefined,
      stock_quantity: undefined,
      content: undefined
    }]);
  };

  const removeItem = (index: number) => {
    const newSelectedProducts = [...selectedProducts];
    newSelectedProducts.splice(index, 1);
    setSelectedProducts(newSelectedProducts);
  };

  const updateSelectedProduct = (index: number, value: string) => {
    const newSelectedProducts = [...selectedProducts];

    const emptyItem: SelectedProduct = {
      type: undefined,
      product_id: undefined,
      bundle_id: undefined,
      name: "",
      price: 0,
      quantity: 1,
      inventory_id: undefined,
      stock_quantity: undefined,
      content: undefined
    };

    if (!value) {
      newSelectedProducts[index] = emptyItem;
    } else {
      const [type, idStr] = value.split('-');
      if (type === 'bundle') {
        const bundle = bundles.find(b => b.bundle_id === Number(idStr));
        if (bundle) {
          newSelectedProducts[index] = {
            ...newSelectedProducts[index],
            type: 'bundle',
            bundle_id: bundle.bundle_id,
            product_id: undefined,
            code: bundle.bundle_code,
            name: bundle.name,
            price: Number(bundle.selling_price),
            quantity: 1,
            inventory_id: undefined,
            stock_quantity: undefined,
            content: bundle.bundle_contents
          };
        }
      } else {
        const product = products.find(p => p.product_id === Number(idStr));
        if (product) {
          newSelectedProducts[index] = {
            ...newSelectedProducts[index],
            type: 'product',
            product_id: product.product_id,
            bundle_id: undefined,
            code: product.product_code,
            name: product.product_name,
            price: Number(product.product_price),
            quantity: 1,
            inventory_id: product.inventory_id,
            stock_quantity: product.inventory_quantity,
            content: undefined
          };
        }
      }
    }

    setSelectedProducts(newSelectedProducts);
  };

  const updateQuantity = (index: number, quantity: number) => {
    if (quantity < 1) return;
    const newSelectedProducts = [...selectedProducts];
    const product = newSelectedProducts[index];
    newSelectedProducts[index] = { ...product, quantity };
    setSelectedProducts(newSelectedProducts);
  };

  const confirmSelection = () => {
    const validProducts = selectedProducts.filter(item =>
      (item.type === 'product' && item.product_id) ||
      (item.type === 'bundle' && item.bundle_id)
    );
    if (validProducts.length === 0) {
      setError("請選擇至少一項產品並設定數量。");
      return;
    }
    localStorage.setItem('selectedProducts', JSON.stringify(validProducts));
    localStorage.setItem('productTotalAmount', calculateTotal().toString());
    navigate(-1); // 回到前一頁
  };

  const openInventorySearch = () => {
    window.open('/inventory/inventory-search', '_blank', 'noopener,noreferrer,width=1200,height=800');
  };
  const content = (
    <Container className="my-4">
      {error && <div className="alert alert-danger">{error}</div>}
      
      <Row className="mb-4">
        <Col>
          <h5>選擇產品</h5>
          <p className="text-muted">請從下方選擇要購買的產品，系統會自動帶入單價與剩餘庫存。</p>
        </Col>
      </Row>

      {/* The search input is for client-side filtering of the dropdowns */}
      <Row className="mb-3">
        <Col md={6}>
          <Form.Group>
            <Form.Label>產品搜尋</Form.Label>
            <Form.Control 
              type="text" 
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="輸入產品名稱以篩選列表"
            />
          </Form.Group>
        </Col>
      </Row>

      <Table bordered hover responsive className="mt-4">
        <thead className="table-light">
          <tr>
            <th style={{width: "25%"}}>產品名稱</th>
            <th style={{width: "20%"}}>產品內容</th>
            <th style={{width: "15%"}} className="text-end">剩餘數量</th>
            <th style={{width: "10%"}} className="text-end">單價</th>
            <th style={{width: "10%"}}>購買數量</th>
            <th style={{width: "15%"}} className="text-end">小計</th>
            <th style={{width: "5%"}} className="text-center">操作</th>
          </tr>
        </thead>
        <tbody>
          {selectedProducts.map((item, index) => (
            <tr key={index}>
              <td>
                <Form.Select
                  value={
                    item.type === 'bundle'
                      ? `bundle-${item.bundle_id}`
                      : item.type === 'product' && item.product_id
                        ? `product-${item.product_id}`
                        : ""
                  }
                  onChange={(e) => updateSelectedProduct(index, e.target.value)}
                >
                  <option value="">請選擇產品</option>
                  {bundles.filter(b => searchKeyword ? b.name.toLowerCase().includes(searchKeyword.toLowerCase()) : true).length > 0 && (
                    <optgroup label="產品組合">
                      {bundles
                        .filter(b => searchKeyword ? b.name.toLowerCase().includes(searchKeyword.toLowerCase()) : true)
                        .map(bundle => (
                          <option key={`bundle-${bundle.bundle_id}`} value={`bundle-${bundle.bundle_id}`}>
                            {bundle.name}
                          </option>
                        ))}
                    </optgroup>
                  )}
                  {products.filter(p => searchKeyword ? p.product_name.toLowerCase().includes(searchKeyword.toLowerCase()) : true).length > 0 && (
                    <optgroup label="單品">
                      {products
                        .filter(p => searchKeyword ? p.product_name.toLowerCase().includes(searchKeyword.toLowerCase()) : true)
                        .map(product => (
                          <option key={`product-${product.product_id}`} value={`product-${product.product_id}`}>
                            {product.product_name}
                          </option>
                        ))}
                    </optgroup>
                  )}
                </Form.Select>
                <Button
                  variant="info"
                  size="sm"
                  className="text-white"
                  onClick={openInventorySearch}
                >
                  庫存查詢
                </Button>
              </td>
              <td className="align-middle">
                {item.type === 'bundle' && item.content
                  ? item.content.split(',').map((contentItem, idx) => (
                      <div key={idx}>{contentItem}</div>
                    ))
                  : '-'}
              </td>
              <td className="align-middle text-end fw-bold">
                {item.type === 'product' && item.stock_quantity !== undefined ? item.stock_quantity : '-'}
              </td>
              <td className="align-middle text-end">
                {item.price > 0 ? `NT$ ${item.price.toLocaleString()}` : '-'}
              </td>
              <td>
                <Form.Control
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateQuantity(index, parseInt(e.target.value) || 1)}
                  disabled={!item.type}
                />
              </td>
              <td className="align-middle text-end">
                {item.price > 0 ? `NT$ ${(item.price * item.quantity).toLocaleString()}` : '-'}
              </td>
              <td className="text-center align-middle">
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => removeItem(index)}
                  disabled={selectedProducts.length <= 1}
                >
                  <i className="bi bi-trash"></i>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={7}>
              <Button
                variant="outline-primary"
                className="w-100"
                onClick={addNewItem}
              >
                <i className="bi bi-plus-circle me-2"></i>
                新增產品項目
              </Button>
            </td>
          </tr>
          <tr>
            <th colSpan={5} className="text-end fs-5">總計金額：</th>
            <th colSpan={2} className="text-end fs-5 text-danger">NT$ {calculateTotal().toLocaleString()}</th>
          </tr>
        </tfoot>
      </Table>

      <Row className="mt-4">
        <Col className="d-flex justify-content-end gap-3">
          <Button 
            variant="info"
            className="text-white" 
            onClick={() => navigate(-1)}
          >
            取消
          </Button>
          <Button 
            variant="info"
            className="text-white"
            onClick={confirmSelection}
          >
            確認選擇
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

export default ProductSelection;
