// client/src/pages/finance/ItemSelection.tsx (新檔案)

import React, { useState, useEffect } from 'react';
import { Container, Form, Button, ListGroup, Spinner, Alert, Row, Col, Card, InputGroup, Tabs, Tab } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import DynamicContainer from '../../components/DynamicContainer';
import { SalesOrderItemData } from '../../services/SalesOrderService';
import { Product, getAllProducts } from '../../services/ProductSellService'; // 假設從 ProductSellService 獲取
import { TherapyPackage, getAllTherapyPackages } from '../../services/TherapySellService'; // 假設從 TherapySellService 獲取
export const formatCurrency = (amount: number | undefined): string => {
  if (amount === undefined || isNaN(amount)) return 'N/A';
  return amount.toLocaleString('zh-TW', { style: 'currency', currency: 'TWD' });
};
const ItemSelection: React.FC = () => {
    const navigate = useNavigate();

    const [products, setProducts] = useState<Product[]>([]);
    const [therapies, setTherapies] = useState<TherapyPackage[]>([]);
    const [selectedItems, setSelectedItems] = useState<SalesOrderItemData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 載入所有可選品項 (產品和療程)
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [productRes, therapyRes] = await Promise.all([
                    getAllProducts(),
                    getAllTherapyPackages() // 假設返回 ApiResponse
                ]);
                console.log("從 API 獲取的產品資料 (productRes):", productRes);

                if (Array.isArray(productRes)) {
                    setProducts(productRes);
                }

                if (therapyRes.success && Array.isArray(therapyRes.data)) {
                    setTherapies(therapyRes.data);
                }
            } catch (err) {
                setError("載入品項資料時發生錯誤。");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);
    
    // 處理選擇品項 (產品或療程)
    const handleSelectItem = (item: Product | TherapyPackage, type: 'Product' | 'Therapy') => {
        let newItem: SalesOrderItemData;

        if (type === 'Product') {
            const product = item as Product;
            newItem = {
                product_id: product.product_id,
                therapy_id: null,
                // ***** 關鍵修改：使用 product_name 和 product_price *****
                item_description: product.product_name, // <-- 使用 product_name
                item_type: 'Product',
                unit: "個",
                quantity: 1,
                unit_price: product.product_price,      // <-- 使用 product_price
                subtotal: product.product_price,
                // ***** 結束修改 *****
            };
        } else { // type === 'Therapy'
            const therapy = item as TherapyPackage;
            newItem = {
                product_id: null,
                therapy_id: therapy.therapy_id,
                item_description: therapy.TherapyContent || therapy.TherapyName || "未知療程",
                item_type: 'Therapy',
                unit: "堂",
                quantity: 1,
                unit_price: therapy.TherapyPrice,
                subtotal: therapy.TherapyPrice,
            };
        }

        // 避免重複加入
        if (!selectedItems.some(i => (i.product_id !== null && i.product_id === newItem.product_id) || (i.therapy_id !== null && i.therapy_id === newItem.therapy_id))) {
            setSelectedItems(prev => [...prev, newItem]);
        } else {
            alert("此品項已被選取。"); // 或其他提示
        }
    };

    // 確認選擇
    const handleConfirm = () => {
        localStorage.setItem('selectedSalesOrderItems', JSON.stringify(selectedItems));
        navigate('/finance/sales/add');
    };

    const content = (
        <Container className="my-4">
            {error && <Alert variant="danger">{error}</Alert>}
            <Row>
                {/* 左側：可選品項列表 */}
                <Col md={7}>
                    <Tabs defaultActiveKey="products" id="item-selection-tabs">
                        <Tab eventKey="products" title="產品">
                            <ListGroup className="mt-2" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                                {loading ? <Spinner animation="border" /> : products.map(p => (
                                    <ListGroup.Item key={`prod-${p.product_id}`} action onClick={() => handleSelectItem(p, 'Product')}>
                                        {p.product_name} - {formatCurrency(p.product_price)}
                                    </ListGroup.Item>
                                ))}
                            </ListGroup>
                        </Tab>
                        <Tab eventKey="therapies" title="療程">
                             <ListGroup className="mt-2" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                                {loading ? <Spinner animation="border" /> : therapies.map(t => (
                                    <ListGroup.Item key={`thr-${t.therapy_id}`} action onClick={() => handleSelectItem(t, 'Therapy')}>
                                        {t.TherapyContent || t.TherapyName} - NT$ {t.TherapyPrice}
                                    </ListGroup.Item>
                                ))}
                            </ListGroup>
                        </Tab>
                    </Tabs>
                </Col>

                {/* 右側：已選品項 */}
                <Col md={5}>
                    <h5>已選品項</h5>
                    <Card style={{ maxHeight: '65vh', overflowY: 'auto' }}>
                        <ListGroup variant="flush">
                            {selectedItems.length > 0 ? selectedItems.map((item, index) => (
                                <ListGroup.Item key={index}>
                                    {item.item_description} (x{item.quantity})
                                </ListGroup.Item>
                            )) : <div className="p-3 text-muted">尚未選擇任何品項</div>}
                        </ListGroup>
                    </Card>
                </Col>
            </Row>
            <div className="d-flex justify-content-end mt-3 gap-2">
                <Button variant="secondary" onClick={() => navigate('/finance/sales/add')}>取消</Button>
                <Button variant="primary" onClick={handleConfirm} disabled={selectedItems.length === 0}>確認選取</Button>
            </div>
        </Container>
    );

    return (
        <>
            <Header title="選擇銷售品項" />
            <DynamicContainer content={content} />
        </>
    );
};
export default ItemSelection;