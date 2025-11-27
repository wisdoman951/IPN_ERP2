// client/src/pages/finance/ItemSelection.tsx (新檔案)

import React, { useState, useEffect } from 'react';
import { Container, Form, Button, ListGroup, Spinner, Alert, Row, Col, Card, InputGroup, Tabs, Tab } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import DynamicContainer from '../../components/DynamicContainer';
import { SalesOrderItemData } from '../../services/SalesOrderService';
import { Product, getAllProducts } from '../../services/ProductSellService'; // 假設從 ProductSellService 獲取
import { TherapyPackage, getAllTherapyPackages } from '../../services/TherapySellService'; // 假設從 TherapySellService 獲取
import { Bundle as ProductBundle, fetchProductBundlesForSale } from '../../services/ProductBundleService';
import { TherapyBundle, fetchTherapyBundlesForSale } from '../../services/TherapyBundleService';
import { getCategories, Category } from '../../services/CategoryService';
export const formatCurrency = (amount: number | undefined): string => {
    if (amount === undefined || isNaN(amount)) return 'N/A';
    return amount.toLocaleString('zh-TW', { style: 'currency', currency: 'TWD' });
};
const ItemSelection: React.FC = () => {
    const navigate = useNavigate();

    const [products, setProducts] = useState<Product[]>([]);
    const [therapies, setTherapies] = useState<TherapyPackage[]>([]);
    const [productBundles, setProductBundles] = useState<ProductBundle[]>([]);
    const [therapyBundles, setTherapyBundles] = useState<TherapyBundle[]>([]);
    const [selectedItems, setSelectedItems] = useState<SalesOrderItemData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [productCategories, setProductCategories] = useState<Category[]>([]);
    const [activeProductCat, setActiveProductCat] = useState('all');
    const [therapyCategories, setTherapyCategories] = useState<Category[]>([]);
    const [activeTherapyCat, setActiveTherapyCat] = useState('all');
    const [productBundleCategories, setProductBundleCategories] = useState<Category[]>([]);
    const [activeProductBundleCat, setActiveProductBundleCat] = useState('all');
    const [therapyBundleCategories, setTherapyBundleCategories] = useState<Category[]>([]);
    const [activeTherapyBundleCat, setActiveTherapyBundleCat] = useState('all');

    // 載入所有可選品項 (產品、療程及其組合)
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [productRes, therapyRes, prodBundleRes, thrBundleRes, prodCats, thrCats, prodBundleCats, thrBundleCats] = await Promise.all([
                    getAllProducts(),
                    getAllTherapyPackages(),
                    fetchProductBundlesForSale(),
                    fetchTherapyBundlesForSale(),
                    getCategories('product'),
                    getCategories('therapy'),
                    getCategories('product_bundle'),
                    getCategories('therapy_bundle')
                ]);
                console.log("從 API 獲取的產品資料 (productRes):", productRes);

                if (Array.isArray(productRes)) {
                    const sortedProducts = [...productRes].sort((a, b) => {
                        const codeA = a.product_code ? parseInt(a.product_code, 10) : 0;
                        const codeB = b.product_code ? parseInt(b.product_code, 10) : 0;
                        return codeB - codeA;
                    });
                    setProducts(sortedProducts);
                }

                if (therapyRes.success && Array.isArray(therapyRes.data)) {
                    const sortedTherapies = [...therapyRes.data].sort((a, b) => {
                        const codeA = a.TherapyCode ? parseInt(a.TherapyCode, 10) : 0;
                        const codeB = b.TherapyCode ? parseInt(b.TherapyCode, 10) : 0;
                        return codeB - codeA;
                    });
                    setTherapies(sortedTherapies);
                }

                if (Array.isArray(prodBundleRes)) {
                    const sortedProdBundles = [...prodBundleRes].sort((a, b) => {
                        const codeA = a.bundle_code ? parseInt(a.bundle_code, 10) : 0;
                        const codeB = b.bundle_code ? parseInt(b.bundle_code, 10) : 0;
                        return codeB - codeA;
                    });
                    setProductBundles(sortedProdBundles);
                }

                if (Array.isArray(thrBundleRes)) {
                    const sortedThrBundles = [...thrBundleRes].sort((a, b) => {
                        const codeA = a.bundle_code ? parseInt(a.bundle_code, 10) : 0;
                        const codeB = b.bundle_code ? parseInt(b.bundle_code, 10) : 0;
                        return codeB - codeA;
                    });
                    setTherapyBundles(sortedThrBundles);
                }
                setProductCategories(prodCats);
                if (Array.isArray(thrCats)) setTherapyCategories(thrCats);
                setProductBundleCategories(prodBundleCats);
                setTherapyBundleCategories(thrBundleCats);
            } catch (err) {
                setError("載入品項資料時發生錯誤。");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // 處理選擇品項 (產品、療程或組合)
    const handleSelectItem = (
        item: Product | TherapyPackage | ProductBundle | TherapyBundle,
        type: 'Product' | 'Therapy' | 'ProductBundle' | 'TherapyBundle'
    ) => {
        let newItem: SalesOrderItemData;

        if (type === 'Product') {
            const product = item as Product;
            const generalPrice = product.price_tiers?.['一般售價'];
            const parsedPrice = generalPrice === undefined || generalPrice === null ? 0 : Number(generalPrice);

            newItem = {
                product_id: product.product_id,
                therapy_id: null,
                item_description: product.product_name,
                item_type: 'Product',
                item_code: product.product_code,
                unit: "個",
                quantity: 1,
                unit_price: parsedPrice,
                subtotal: parsedPrice,
            };
        } else if (type === 'Therapy') {
            const therapy = item as TherapyPackage;
            newItem = {
                product_id: null,
                therapy_id: therapy.therapy_id,
                item_description: therapy.TherapyContent || therapy.TherapyName || "未知療程",
                item_type: 'Therapy',
                item_code: therapy.TherapyCode,
                unit: "堂",
                quantity: 1,
                unit_price: Number(therapy.TherapyPrice),
                subtotal: Number(therapy.TherapyPrice),
            };
        } else if (type === 'ProductBundle') {
            const bundle = item as ProductBundle;
            newItem = {
                product_id: bundle.bundle_id,
                therapy_id: null,
                item_description: bundle.name,
                item_type: 'ProductBundle',
                item_code: bundle.bundle_code,
                unit: "組",
                quantity: 1,
                unit_price: Number(bundle.selling_price),
                subtotal: Number(bundle.selling_price)
            };
        } else {
            const bundle = item as TherapyBundle;
            newItem = {
                product_id: null,
                therapy_id: bundle.bundle_id,
                item_description: bundle.name,
                item_type: 'TherapyBundle',
                item_code: bundle.bundle_code,
                unit: "組",
                quantity: 1,
                unit_price: Number(bundle.selling_price),
                subtotal: Number(bundle.selling_price)
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
        let merged = [...selectedItems];
        const prev = localStorage.getItem('currentSalesOrderItems');
        if (prev) {
            try {
                const parsed = JSON.parse(prev);
                merged = [...parsed, ...selectedItems];
            } catch (e) {
                console.error('解析暫存品項失敗', e);
            }
            localStorage.removeItem('currentSalesOrderItems');
        }
        localStorage.setItem('selectedSalesOrderItems', JSON.stringify(merged));
        navigate('/finance/sales/add');
    };

    const filterItems = <T extends { product_name?: string; product_code?: string; TherapyName?: string; TherapyContent?: string; TherapyCode?: string; name?: string; bundle_code?: string; }>(items: T[], activeCat: string) => {
        let filtered = [...items];
        if (activeCat !== 'all') {
            filtered = filtered.filter((item: any) => item.categories?.includes(activeCat));
        }
        if (searchTerm.trim() !== '') {
            const lower = searchTerm.toLowerCase();
            filtered = filtered.filter((item: any) =>
                (item.product_name || item.TherapyName || item.name || '').toLowerCase().includes(lower) ||
                (item.product_code || item.TherapyCode || item.bundle_code || '').toLowerCase().includes(lower) ||
                (item.TherapyContent || '').toLowerCase().includes(lower)
            );
        }
        return filtered;
    };

    const content = (
        <Container className="my-4">
            {error && <Alert variant="danger">{error}</Alert>}
            <Row>
                {/* 左側：可選品項列表 */}
                <Col md={7}>
                    <Row className="mb-3">
                        <Col>
                            <Form.Control
                                type="text"
                                placeholder="搜尋品項..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </Col>
                    </Row>
                    <Tabs defaultActiveKey="products" id="item-selection-tabs">
                        <Tab eventKey="products" title="產品">
                            <Tabs activeKey={activeProductCat} onSelect={k => setActiveProductCat(k || 'all')} className="mt-3 mb-3">
                                <Tab eventKey="all" title="全部" />
                                {productCategories.map(cat => (
                                    <Tab key={cat.category_id} eventKey={cat.name} title={cat.name} />
                                ))}
                            </Tabs>
                            <ListGroup style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                                {loading ? <Spinner animation="border" /> :
                                    filterItems(products as any, activeProductCat).map(p => (
                                        <ListGroup.Item key={`prod-${(p as any).product_id}`} action onClick={() => handleSelectItem(p as any, 'Product')}>
                                            [{(p as any).product_code ?? ''}] {(p as any).product_name} - {formatCurrency((p as any).price_tiers?.['一般售價'])}
                                        </ListGroup.Item>
                                    ))}
                            </ListGroup>
                        </Tab>
                        <Tab eventKey="therapies" title="療程">
                            <Tabs activeKey={activeTherapyCat} onSelect={k => setActiveTherapyCat(k || 'all')} className="mt-3 mb-3">
                                <Tab eventKey="all" title="全部" />
                                {therapyCategories.map(cat => (
                                    <Tab key={cat.category_id} eventKey={cat.name} title={cat.name} />
                                ))}
                            </Tabs>
                            <ListGroup style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                                {loading ? <Spinner animation="border" /> :
                                    filterItems(therapies as any, activeTherapyCat).map(t => (
                                        <ListGroup.Item key={`thr-${(t as any).therapy_id}`} action onClick={() => handleSelectItem(t as any, 'Therapy')}>
                                            [{(t as any).TherapyCode}] {(t as any).TherapyContent || (t as any).TherapyName} - NT$ {(t as any).TherapyPrice}
                                        </ListGroup.Item>
                                    ))}
                            </ListGroup>
                        </Tab>
                        <Tab eventKey="productBundles" title="產品組合">
                            <Tabs activeKey={activeProductBundleCat} onSelect={k => setActiveProductBundleCat(k || 'all')} className="mt-3 mb-3">
                                <Tab eventKey="all" title="全部" />
                                {productBundleCategories.map(cat => (
                                    <Tab key={cat.category_id} eventKey={cat.name} title={cat.name} />
                                ))}
                            </Tabs>
                            <ListGroup style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                                {loading ? <Spinner animation="border" /> :
                                    filterItems(productBundles as any, activeProductBundleCat).map(b => (
                                        <ListGroup.Item key={`pb-${(b as any).bundle_id}`} action onClick={() => handleSelectItem(b as any, 'ProductBundle')}>
                                            [{(b as any).bundle_code}] {(b as any).name} - {formatCurrency((b as any).selling_price)}
                                        </ListGroup.Item>
                                    ))}
                            </ListGroup>
                        </Tab>
                        <Tab eventKey="therapyBundles" title="療程組合">
                            <Tabs activeKey={activeTherapyBundleCat} onSelect={k => setActiveTherapyBundleCat(k || 'all')} className="mt-3 mb-3">
                                <Tab eventKey="all" title="全部" />
                                {therapyBundleCategories.map(cat => (
                                    <Tab key={cat.category_id} eventKey={cat.name} title={cat.name} />
                                ))}
                            </Tabs>
                            <ListGroup style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                                {loading ? <Spinner animation="border" /> :
                                    filterItems(therapyBundles as any, activeTherapyBundleCat).map(b => (
                                        <ListGroup.Item key={`tb-${(b as any).bundle_id}`} action onClick={() => handleSelectItem(b as any, 'TherapyBundle')}>
                                            [{(b as any).bundle_code}] {(b as any).name} - {formatCurrency((b as any).selling_price)}
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
                <Button variant="info" className="text-white" onClick={() => navigate('/finance/sales/add')}>取消</Button>
                <Button variant="info" className="text-white" onClick={handleConfirm} disabled={selectedItems.length === 0}>確認選取</Button>
            </div>
        </Container>
    );

    return (
        <>
            <Header />
            <DynamicContainer content={content} />
        </>
    );
};
export default ItemSelection;
