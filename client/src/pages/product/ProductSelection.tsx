import React, { useState, useEffect } from "react";
import { Button, Container, Row, Col, Form, Table } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import DynamicContainer from "../../components/DynamicContainer";
import { getAllProducts, Product } from "../../services/ProductSellService";

interface SelectedProduct {
  product_id: number;
  name: string;
  price: number;
  quantity: number;
  inventory_id: number;
  stock_quantity?: number;
}

const ProductSelection: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getAllProducts();
        setProducts(data);
      } catch (err) {
        console.error("載入產品資料失敗：", err);
        setError("載入產品資料失敗，請稍後再試。");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();

    // --- 關鍵修正：進頁時還原 localStorage ---
    const selectedProductsData = localStorage.getItem('selectedProducts');
    if (selectedProductsData) {
      try {
        const prods = JSON.parse(selectedProductsData);
        if (Array.isArray(prods) && prods.length > 0) {
          setSelectedProducts(prods);
        } else {
          setSelectedProducts([{
            product_id: 0, name: "", price: 0, quantity: 1, inventory_id: 0, stock_quantity: undefined
          }]);
        }
      } catch {
        setSelectedProducts([{
          product_id: 0, name: "", price: 0, quantity: 1, inventory_id: 0, stock_quantity: undefined
        }]);
      }
    } else {
      setSelectedProducts([{
        product_id: 0, name: "", price: 0, quantity: 1, inventory_id: 0, stock_quantity: undefined
      }]);
    }
  }, []);

  // ...其餘邏輯不用動...

  const calculateTotal = () => {
    return selectedProducts.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const addNewItem = () => {
    setSelectedProducts([...selectedProducts, { product_id: 0, name: "", price: 0, quantity: 1, inventory_id: 0, stock_quantity: undefined }]);
  };

  const removeItem = (index: number) => {
    const newSelectedProducts = [...selectedProducts];
    newSelectedProducts.splice(index, 1);
    setSelectedProducts(newSelectedProducts);
  };

  const updateSelectedProduct = (index: number, productId: number) => {
    const product = products.find(p => p.product_id === productId);
    const newSelectedProducts = [...selectedProducts];

    if (!product) {
      newSelectedProducts[index] = {
        product_id: 0, name: "", price: 0, quantity: 1, inventory_id: 0, stock_quantity: undefined
      };
    } else {
      newSelectedProducts[index] = {
        ...newSelectedProducts[index],
        product_id: product.product_id,
        name: product.product_name,
        price: Number(product.product_price),
        inventory_id: product.inventory_id,
        stock_quantity: product.inventory_quantity
      };
    }
    setSelectedProducts(newSelectedProducts);
  };

  const updateQuantity = (index: number, quantity: number) => {
    if (quantity < 1) return;
    const newSelectedProducts = [...selectedProducts];
    const product = newSelectedProducts[index];
    if (product.stock_quantity !== undefined && quantity > product.stock_quantity) {
      quantity = product.stock_quantity;
    }
    newSelectedProducts[index] = { ...product, quantity };
    setSelectedProducts(newSelectedProducts);
  };

  const confirmSelection = () => {
    const validProducts = selectedProducts.filter(item => item.product_id !== 0 && item.quantity > 0);
    if (validProducts.length === 0) {
      setError("請選擇至少一項產品並設定數量。");
      return;
    }
    const invalidStockItems = validProducts.filter(item => item.stock_quantity !== undefined && item.quantity > item.stock_quantity);
    if (invalidStockItems.length > 0) {
      setError(`產品 "${invalidStockItems[0].name}" 的庫存不足 (剩餘: ${invalidStockItems[0].stock_quantity})。`);
      return;
    }
    localStorage.setItem('selectedProducts', JSON.stringify(validProducts));
    localStorage.setItem('productTotalAmount', calculateTotal().toString());
    navigate(-1); // 回到前一頁
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
            <th style={{width: "35%"}}>產品名稱</th>
            <th style={{width: "15%"}} className="text-end">剩餘數量</th>
            <th style={{width: "15%"}} className="text-end">單價</th>
            <th style={{width: "15%"}}>購買數量</th>
            <th style={{width: "15%"}} className="text-end">小計</th>
            <th style={{width: "5%"}} className="text-center">操作</th>
          </tr>
        </thead>
        <tbody>
          {selectedProducts.map((item, index) => (
            <tr key={index}>
              <td>
                <Form.Select 
                  value={item.product_id || ""}
                  onChange={(e) => updateSelectedProduct(index, Number(e.target.value))}
                >
                  <option value="">請選擇產品</option>
                  {products
                    .filter(p => searchKeyword ? p.product_name.toLowerCase().includes(searchKeyword.toLowerCase()) : true)
                    .map(product => (
                      <option key={product.product_id} value={product.product_id}>
                        {product.product_name}
                      </option>
                  ))}
                </Form.Select>
              </td>
              <td className="align-middle text-end fw-bold">
                {/* Display the fetched stock quantity */}
                {item.stock_quantity !== undefined ? item.stock_quantity : "-"}
              </td>
              <td className="align-middle text-end">
                {item.price > 0 ? `NT$ ${item.price.toLocaleString()}` : "-"}
              </td>
              <td>
                <Form.Control
                  type="number"
                  min="1"
                  max={item.stock_quantity} // Optional: browser-level validation for max quantity
                  value={item.quantity}
                  onChange={(e) => updateQuantity(index, parseInt(e.target.value) || 1)}
                  disabled={!item.product_id} // Disable if no product is selected
                />
              </td>
              <td className="align-middle text-end">
                {item.price > 0 ? `NT$ ${(item.price * item.quantity).toLocaleString()}` : "-"}
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
            <td colSpan={6}>
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
            <th colSpan={4} className="text-end fs-5">總計金額：</th>
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
