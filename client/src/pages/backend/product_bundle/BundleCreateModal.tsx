import React, { useState, useEffect, useMemo, FormEvent } from 'react';
import { Modal, Button, Form, Alert, Row, Col, Spinner } from 'react-bootstrap';
import { 
    createBundle, updateBundle, getBundleDetails,
    fetchProductsForDropdown, fetchTherapiesForDropdown,
    Product, Therapy, Bundle
} from '../../../services/ProductBundleService';

interface BundleCreateModalProps {
    show: boolean;
    onHide: () => void;
    onSaveSuccess: () => void;
    editingBundle: Bundle | null;
}

const BundleCreateModal: React.FC<BundleCreateModalProps> = ({ show, onHide, onSaveSuccess, editingBundle }) => {
    const [formData, setFormData] = useState({
        bundle_code: '',
        name: '',
        selling_price: '' as number | ''
    });
    const [products, setProducts] = useState<Product[]>([]);
    const [therapies, setTherapies] = useState<Therapy[]>([]);
    const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
    const [selectedTherapyIds, setSelectedTherapyIds] = useState<number[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // 新增數量 state
    const [productQuantities, setProductQuantities] = useState<{ [id: number]: number }>({});
    const [therapyQuantities, setTherapyQuantities] = useState<{ [id: number]: number }>({});

    useEffect(() => {
        // 當 Modal 顯示時，執行以下邏輯
        if (show) {
            // 重置所有狀態，確保每次打開都是乾淨的
            resetStates();

            // 載入下拉選單資料
            fetchProductsForDropdown().then(setProducts).catch(() => setError("無法載入產品列表"));
            fetchTherapiesForDropdown().then(setTherapies).catch(() => setError("無法載入療程列表"));

            // 如果是編輯模式，則獲取該組合的詳細資料並填充表單
            if (editingBundle) {
                setLoading(true);
                getBundleDetails(editingBundle.bundle_id)
                    .then(data => {
                        setFormData({
                            bundle_code: data.bundle_code,
                            name: data.name,
                            selling_price: data.selling_price
                        });
                        const prodIds = data.items.filter(i => i.item_type === 'Product').map(i => i.item_id);
                        const thrpIds = data.items.filter(i => i.item_type === 'Therapy').map(i => i.item_id);
                        setSelectedProductIds(prodIds);
                        setSelectedTherapyIds(thrpIds);
                        // 填充數量
                        prodIds.forEach(id => setProductQuantities(q => ({ ...q, [id]: (data.items.find(i => i.item_id === id && i.item_type === 'Product') as any)?.quantity || 1 })));
                        thrpIds.forEach(id => setTherapyQuantities(q => ({ ...q, [id]: (data.items.find(i => i.item_id === id && i.item_type === 'Therapy') as any)?.quantity || 1 })));
                    })
                    .catch(() => setError("無法載入組合詳情"))
                    .finally(() => setLoading(false));
            }
        }
    }, [show, editingBundle]);

    const resetStates = () => {
        setFormData({ bundle_code: '', name: '', selling_price: '' });
        setSelectedProductIds([]);
        setSelectedTherapyIds([]);
        setError(null);
        setLoading(false);
        setProductQuantities({});
        setTherapyQuantities({});
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setFormData(prev => ({ ...prev, selling_price: value === '' ? '' : Number(value) }));
    };
    
    const calculatedPrice = useMemo(() => {
        const selectedProducts = products.filter(p => selectedProductIds.includes(p.product_id));
        const selectedTherapies = therapies.filter(t => selectedTherapyIds.includes(t.therapy_id));
        const productTotal = selectedProducts.reduce((sum, p) => sum + Number(p.product_price || 0) * (productQuantities[p.product_id] || 1), 0);
        const therapyTotal = selectedTherapies.reduce((sum, t) => sum + Number(t.price || 0) * (therapyQuantities[t.therapy_id] || 1), 0);
        return productTotal + therapyTotal;
    }, [selectedProductIds, selectedTherapyIds, products, therapies, productQuantities, therapyQuantities]);

    const handleProductCheckChange = (id: number, checked: boolean) => {
        setSelectedProductIds(prev => checked ? [...prev, id] : prev.filter(pid => pid !== id));
        if (checked && !productQuantities[id]) {
            setProductQuantities(q => ({ ...q, [id]: 1 }));
        } else if (!checked) {
            setProductQuantities(q => { const nq = { ...q }; delete nq[id]; return nq; });
        }
    };

    const handleTherapyCheckChange = (id: number, checked: boolean) => {
        setSelectedTherapyIds(prev => checked ? [...prev, id] : prev.filter(tid => tid !== id));
        if (checked && !therapyQuantities[id]) {
            setTherapyQuantities(q => ({ ...q, [id]: 1 }));
        } else if (!checked) {
            setTherapyQuantities(q => { const nq = { ...q }; delete nq[id]; return nq; });
        }
    };

    const handleProductQuantityChange = (id: number, value: number) => {
        setProductQuantities(q => ({ ...q, [id]: value < 1 ? 1 : value }));
    };
    const handleTherapyQuantityChange = (id: number, value: number) => {
        setTherapyQuantities(q => ({ ...q, [id]: value < 1 ? 1 : value }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        
        const payload = {
            ...formData,
            calculated_price: calculatedPrice,
            items: [
                ...selectedProductIds.map(id => ({ item_id: id, item_type: 'Product', quantity: productQuantities[id] || 1 })),
                ...selectedTherapyIds.map(id => ({ item_id: id, item_type: 'Therapy', quantity: therapyQuantities[id] || 1 }))
            ]
        };

        try {
            if (editingBundle) {
                await updateBundle(editingBundle.bundle_id, payload);
            } else {
                await createBundle(payload);
            }
            onSaveSuccess();
            onHide();
        } catch (err: any) {
            setError(err.response?.data?.error || "儲存失敗，請檢查欄位或聯繫管理員。");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal show={show} onHide={onHide} size="lg" onExited={resetStates}>
            <Modal.Header closeButton>
                <Modal.Title>產品療程管理</Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    {loading && <div className="text-center"><Spinner animation="border" /></div>}
                    {error && <Alert variant="danger">{error}</Alert>}
                    
                    <Form.Group className="mb-3">
                        <Form.Label>編號</Form.Label>
                        <Form.Control type="text" name="bundle_code" value={formData.bundle_code} onChange={handleInputChange} required />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>項目 (組合名稱)</Form.Label>
                        <Form.Control type="text" name="name" value={formData.name} onChange={handleInputChange} required />
                    </Form.Group>
                    
                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>選擇產品 (可複選)</Form.Label>
                                <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #dee2e6', padding: '0.5rem' }}>
                                    {products.map(p => (
                                        <div key={`prod-row-${p.product_id}`} className="d-flex align-items-center mb-2">
                                            <Form.Check 
                                                type="checkbox"
                                                id={`prod-check-${p.product_id}`}
                                                checked={selectedProductIds.includes(p.product_id)}
                                                onChange={e => handleProductCheckChange(p.product_id, e.target.checked)}
                                                label={`${p.product_name} - $${p.product_price}`}
                                            />
                                            {selectedProductIds.includes(p.product_id) && (
                                                <Form.Control
                                                    type="number"
                                                    min={1}
                                                    value={productQuantities[p.product_id] || 1}
                                                    onChange={e => handleProductQuantityChange(p.product_id, Number(e.target.value))}
                                                    style={{ width: 70, marginLeft: 8 }}
                                                    size="sm"
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                           <Form.Group className="mb-3">
                                <Form.Label>選擇療程 (可複選)</Form.Label>
                                <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #dee2e6', padding: '0.5rem' }}>
                                    {therapies.map(t => (
                                        <div key={`thrp-row-${t.therapy_id}`} className="d-flex align-items-center mb-2">
                                            <Form.Check 
                                                type="checkbox"
                                                id={`thrp-check-${t.therapy_id}`}
                                                checked={selectedTherapyIds.includes(t.therapy_id)}
                                                onChange={e => handleTherapyCheckChange(t.therapy_id, e.target.checked)}
                                                label={`${t.name} - $${t.price}`}
                                            />
                                            {selectedTherapyIds.includes(t.therapy_id) && (
                                                <Form.Control
                                                    type="number"
                                                    min={1}
                                                    value={therapyQuantities[t.therapy_id] || 1}
                                                    onChange={e => handleTherapyQuantityChange(t.therapy_id, Number(e.target.value))}
                                                    style={{ width: 70, marginLeft: 8 }}
                                                    size="sm"
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </Form.Group>
                        </Col>
                    </Row>
                    
                    <Form.Group className="mb-3">
                        <Form.Label>試算金額 (唯讀)</Form.Label>
                        <Form.Control type="text" readOnly value={`$ ${calculatedPrice.toLocaleString()}`} />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>最終售價</Form.Label>
                        <Form.Control type="number" name="selling_price" value={formData.selling_price} onChange={handlePriceChange} required min={0} />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={onHide}>取消</Button>
                    <Button variant="primary" type="submit" disabled={loading}>
                        {loading ? '處理中...' : '確認儲存'}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};

export default BundleCreateModal;
