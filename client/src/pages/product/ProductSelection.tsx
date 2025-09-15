import React, { useState, useEffect } from 'react';
import { Container, Form, Button, ListGroup, Spinner, Alert, Row, Col, Card, InputGroup, Tabs, Tab } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import DynamicContainer from '../../components/DynamicContainer';
import { getAllProducts, Product } from '../../services/ProductSellService';
import { fetchAllBundles, Bundle } from '../../services/ProductBundleService';
import { getStoreId } from '../../services/AuthUtils';
import { getCategories, Category } from '../../services/CategoryService';

interface ItemBase {
  type: 'product' | 'bundle';
  product_id?: number;
  bundle_id?: number;
  name: string;
  code?: string;
  price: number;
  inventory_id?: number;
  stock_quantity?: number;
  content?: string;
  categories?: string[];
}

interface SelectedItem extends ItemBase {
  quantity: string; // keep as string for easy input handling
}

const ProductSelection: React.FC = () => {
  const navigate = useNavigate();
  const [allItems, setAllItems] = useState<ItemBase[]>([]);
  const [displayedItems, setDisplayedItems] = useState<ItemBase[]>([]);
  const [selectedItemsMap, setSelectedItemsMap] = useState<Map<string, SelectedItem>>(new Map());
  const [searchTerm, setSearchTerm] = useState('');
  const [topTab, setTopTab] = useState<'product' | 'bundle'>('product');
  const [activeProductTab, setActiveProductTab] = useState<string>('all');
  const [categories, setCategories] = useState<Category[]>([]);
  const [bundleCategories, setBundleCategories] = useState<Category[]>([]);
  const [activeBundleTab, setActiveBundleTab] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true); setPageError(null);
      try {
        const [productData, bundleData, categoryData, bundleCatData] = await Promise.all([
          getAllProducts(),
          fetchAllBundles(),
          getCategories('product'),
          getCategories('product_bundle')
        ]);

        const products: ItemBase[] = productData.map((p: Product) => ({
          type: 'product',
          product_id: p.product_id,
          name: p.product_name,
          code: p.product_code,
          price: Number(p.product_price),
          inventory_id: p.inventory_id,
          stock_quantity: p.inventory_quantity,
          categories: p.categories || []
        }));

        const storeId = Number(getStoreId());
        const filteredBundles = storeId
          ? bundleData.filter(b =>
              !b.visible_store_ids ||
              b.visible_store_ids.length === 0 ||
              b.visible_store_ids.includes(storeId)
            )
          : bundleData;
        const bundles: ItemBase[] = filteredBundles.map((b: Bundle) => ({
          type: 'bundle',
          bundle_id: b.bundle_id,
          name: b.name || b.bundle_contents,
          code: b.bundle_code,
          price: Number(b.selling_price),
          content: b.bundle_contents,
          categories: b.categories || []
        }));

        const combined = [...products, ...bundles];
        setAllItems(combined);
        setCategories(categoryData);
        setBundleCategories(bundleCatData);
        setDisplayedItems(combined.filter(item => item.type === 'product'));
      } catch (err) {
        console.error('載入產品資料失敗：', err);
        setPageError('載入產品資料失敗，請稍後再試。');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Restore selections from localStorage
    const stored = localStorage.getItem('selectedProducts');
    if (stored) {
      try {
        const arr: any[] = JSON.parse(stored);
        const map = new Map<string, SelectedItem>();
        arr.forEach(item => {
          const key = item.type === 'bundle' ? `b-${item.bundle_id}` : `p-${item.product_id}`;
          map.set(key, { ...item, quantity: String(item.quantity || '1') });
        });
        setSelectedItemsMap(map);
      } catch (e) {
        console.error('解析 selectedProducts 失敗', e);
      }
    }
  }, []);

  useEffect(() => { // 前端篩選
    let filtered: ItemBase[] = [];
    if (topTab === 'bundle') {
      filtered = allItems.filter(item => item.type === 'bundle');
      if (activeBundleTab !== 'all') {
        filtered = filtered.filter(item => item.categories?.includes(activeBundleTab));
      }
    } else {
      filtered = allItems.filter(item => item.type === 'product');
      if (activeProductTab !== 'all') {
        filtered = filtered.filter(item => item.categories?.includes(activeProductTab));
      }
    }
    if (searchTerm.trim() !== '') {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(lower) ||
        (item.code?.toLowerCase() || '').includes(lower) ||
        (item.content?.toLowerCase() || '').includes(lower)
      );
    }
    setDisplayedItems(filtered);
  }, [searchTerm, allItems, topTab, activeProductTab, activeBundleTab]);

  const getItemKey = (item: ItemBase) =>
    item.type === 'bundle' ? `b-${item.bundle_id}` : `p-${item.product_id}`;

  const handleToggleItem = (item: ItemBase) => {
    setPageError(null);
    const key = getItemKey(item);
    setSelectedItemsMap(prev => {
      const newMap = new Map(prev);
      if (newMap.has(key)) {
        newMap.delete(key);
      } else {
        newMap.set(key, { ...item, quantity: '1' });
      }
      return newMap;
    });
  };

  const handleQuantityChange = (key: string, qty: string) => {
    setPageError(null);
    setSelectedItemsMap(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(key);
      if (existing) {
        const validQty = qty.trim() === '' ? '' : Math.max(1, parseInt(qty) || 1).toString();
        newMap.set(key, { ...existing, quantity: validQty });
      }
      return newMap;
    });
  };

  const calculatePageTotal = () => {
    let total = 0;
    selectedItemsMap.forEach(item => {
      total += (item.price || 0) * (Number(item.quantity) || 0);
    });
    return total;
  };

  const handleConfirmSelection = () => {
    setPageError(null);
    const selectedArray: SelectedItem[] = Array.from(selectedItemsMap.values());
    const invalid = selectedArray.find(item => !item.quantity || Number(item.quantity) <= 0);
    if (invalid) {
      setPageError(`所選商品「${invalid.name}」的數量（${invalid.quantity}）無效，請至少輸入1。`);
      return;
    }

    const final = selectedArray.map(item => ({
      type: item.type,
      product_id: item.product_id,
      bundle_id: item.bundle_id,
      code: item.code,
      name: item.name || item.content,
      price: item.price,
      quantity: Number(item.quantity),
      inventory_id: item.inventory_id,
      stock_quantity: item.stock_quantity,
      content: item.content
    }));

    localStorage.setItem('selectedProducts', JSON.stringify(final));
    const total = final.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 0), 0);
    localStorage.setItem('productTotalAmount', total.toString());
    navigate(-1);
  };

  const openInventorySearch = () => {
    window.open('/inventory/inventory-search', '_blank', 'noopener,noreferrer,width=1200,height=800');
  };

  const renderItemList = () => {
    if (loading) {
      return (
        <div className="text-center p-5">
          <Spinner animation="border" variant="info" />
          <p className="mt-2">載入中...</p>
        </div>
      );
    }
    if (displayedItems.length === 0 && !pageError) {
      return (
        <Alert variant="secondary">
          目前沒有符合條件的{topTab === 'product' ? '產品' : '產品組合'}。
        </Alert>
      );
    }
    if (displayedItems.length > 0) {
      return (
        <ListGroup variant="flush" style={{ maxHeight: 'calc(100vh - 380px)', overflowY: 'auto' }}>
          {displayedItems.map(item => {
            const key = getItemKey(item);
            const current = selectedItemsMap.get(key);
            const isSelected = !!current;
            return (
              <ListGroup.Item key={key} className="py-2 px-2">
                <Row className="align-items-center gx-2">
                  <Col xs={12} sm={5} md={5}>
                    <Form.Check
                      type="checkbox"
                      className="mb-2 mb-sm-0"
                      id={`prod-select-${key}`}
                      label={
                        <div style={{ fontSize: '0.9rem' }}>
                          <strong>{item.name || item.content}</strong>
                          <div>
                            <small className="text-muted">產品編號: {item.code} / 單價: NT$ {item.price.toLocaleString()}</small>
                          </div>
                          {item.stock_quantity !== undefined && (
                            <div>
                              <small className="text-success">剩餘 {item.stock_quantity}</small>
                            </div>
                          )}
                          {item.type === 'bundle' && item.content && (
                            <div>
                              <small className="text-muted">{item.content}</small>
                            </div>
                          )}
                        </div>
                      }
                      checked={isSelected}
                      onChange={() => handleToggleItem(item)}
                    />
                  </Col>
                  {isSelected && current && (
                    <Col xs={12} sm={7} md={7} className="mt-1 mt-sm-0">
                      <InputGroup size="sm">
                        <InputGroup.Text>數量:</InputGroup.Text>
                        <Form.Control
                          type="number"
                          min="1"
                          value={current.quantity}
                          onChange={(e) => handleQuantityChange(key, e.target.value)}
                          style={{ maxWidth: '70px', textAlign: 'center' }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <InputGroup.Text>
                          小計: NT$ {((item.price || 0) * Number(current.quantity || 0)).toLocaleString()}
                        </InputGroup.Text>
                      </InputGroup>
                    </Col>
                  )}
                </Row>
              </ListGroup.Item>
            );
          })}
        </ListGroup>
      );
    }
    return null;
  };

  const content = (
    <Container className="my-4">
      {pageError && <Alert variant="danger" dismissible onClose={() => setPageError(null)}>{pageError}</Alert>}
      <Card>
        <Card.Header as="h5">選擇產品並設定數量</Card.Header>
        <Card.Body>
          <Row className="mb-3 gx-2">
            <Col>
              <Form.Control
                type="text"
                placeholder="輸入產品名稱、產品編號或內容進行篩選..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </Col>
          </Row>
          <Row className="mb-3">
            <Col>
              <Button variant="info" size="sm" className="text-white" onClick={openInventorySearch}>
                庫存查詢
              </Button>
            </Col>
          </Row>

          <Tabs activeKey={topTab} onSelect={(k) => setTopTab((k as 'product' | 'bundle') || 'product')} className="mb-3">
            <Tab eventKey="product" title="產品">
              <Tabs activeKey={activeProductTab} onSelect={(k) => setActiveProductTab(k || 'all')} className="mt-3 mb-3">
                <Tab eventKey="all" title="全部" />
                {categories.map(cat => (
                  <Tab key={cat.category_id} eventKey={cat.name} title={cat.name} />
                ))}
              </Tabs>
            </Tab>
            <Tab eventKey="bundle" title="產品組合">
              <Tabs activeKey={activeBundleTab} onSelect={(k) => setActiveBundleTab(k || 'all')} className="mt-3 mb-3">
                <Tab eventKey="all" title="全部" />
                {bundleCategories.map(cat => (
                  <Tab key={cat.category_id} eventKey={cat.name} title={cat.name} />
                ))}
              </Tabs>
            </Tab>
          </Tabs>

          {activeTab === 'bundle' && (
            <Tabs activeKey={activeBundleTab} onSelect={(k) => setActiveBundleTab(k || 'all')} className="mb-3">
              <Tab eventKey="all" title="全部" />
              {bundleCategories.map(cat => (
                <Tab key={cat.category_id} eventKey={cat.name} title={cat.name} />
              ))}
            </Tabs>
          )}

          {renderItemList()}
        </Card.Body>
        {!loading && (
          <Card.Footer>
            <div className="d-flex justify-content-between align-items-center">
              <div>總計金額: <strong className="h5 mb-0" style={{ color: '#00b1c8' }}>NT$ {calculatePageTotal().toLocaleString()}</strong></div>
              <div>
                <Button variant="outline-secondary" type="button" onClick={() => navigate(-1)} className="me-2">
                  取消
                </Button>
                <Button variant="info" className="text-white" type="button" onClick={handleConfirmSelection} disabled={selectedItemsMap.size === 0}>
                  確認選取 ({selectedItemsMap.size} 項)
                </Button>
              </div>
            </div>
          </Card.Footer>
        )}
      </Card>
    </Container>
  );

  return (
    <>
      <Header />
      <DynamicContainer content={content} className="p-0" />
    </>
  );
};

export default ProductSelection;
