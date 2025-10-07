import React, { useState, useEffect, useMemo, FormEvent } from 'react';
import { Modal, Button, Form, Alert, Row, Col, Spinner } from 'react-bootstrap';
import { AxiosError } from 'axios';
import {
    createBundle, updateBundle, getBundleDetails,
    fetchProductsForDropdown, fetchTherapiesForDropdown,
    Product, Therapy, Bundle
} from '../../../services/ProductBundleService';
import { fetchAllStores, Store } from '../../../services/StoreService';
import { getCategories, Category } from '../../../services/CategoryService';
import { VIEWER_ROLE_OPTIONS, ViewerRole } from '../../../types/viewerRole';
import { MEMBER_IDENTITY_OPTIONS, MemberIdentity } from '../../../types/memberIdentity';

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
    const [stores, setStores] = useState<Store[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
    const [selectedTherapyIds, setSelectedTherapyIds] = useState<number[]>([]);
    const [selectedStoreIds, setSelectedStoreIds] = useState<number[]>([]);
    const [selectedViewerRoles, setSelectedViewerRoles] = useState<ViewerRole[]>([]);
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // 新增數量 state
    const [productQuantities, setProductQuantities] = useState<{ [id: number]: number }>({});
    const [therapyQuantities, setTherapyQuantities] = useState<{ [id: number]: number }>({});

    const createDefaultPriceMap = () => {
        const map = {} as Record<MemberIdentity, { enabled: boolean; value: string }>;
        MEMBER_IDENTITY_OPTIONS.forEach(({ value }) => {
            map[value] = {
                enabled: value === '一般售價',
                value: '',
            };
        });
        return map;
    };

    const [bundlePriceMap, setBundlePriceMap] = useState<Record<MemberIdentity, { enabled: boolean; value: string }>>(createDefaultPriceMap);

    useEffect(() => {
        // 當 Modal 顯示時，執行以下邏輯
        if (show) {
            // 重置所有狀態，確保每次打開都是乾淨的
            resetStates();

            // 載入下拉選單資料
            fetchProductsForDropdown().then(setProducts).catch(() => setError("無法載入產品列表"));
            fetchTherapiesForDropdown().then(setTherapies).catch(() => setError("無法載入療程列表"));
            fetchAllStores()
                .then(data => setStores(data.filter(s => s.store_name !== '總店')))
                .catch(() => setError("無法載入分店列表"));
            getCategories('product_bundle').then(setCategories).catch(() => setCategories([]));

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
                        setSelectedStoreIds(data.visible_store_ids || []);
                        setSelectedViewerRoles(data.visible_permissions || []);
                        setSelectedCategoryIds(data.category_ids || []);
                        const baseMap = createDefaultPriceMap();
                        const tiers = data.price_tiers || {};
                        const generalPrice = tiers?.['一般售價'] ?? data.selling_price;
                        baseMap['一般售價'] = {
                            enabled: true,
                            value: generalPrice != null ? String(generalPrice) : '',
                        };
                        MEMBER_IDENTITY_OPTIONS.forEach(({ value }) => {
                            if (value === '一般售價') return;
                            const tierValue = tiers?.[value];
                            if (tierValue != null) {
                                baseMap[value] = {
                                    enabled: true,
                                    value: String(tierValue),
                                };
                            }
                        });
                        setBundlePriceMap(baseMap);
                        // 填充數量
                        prodIds.forEach(id => {
                            const item = data.items.find(i => i.item_id === id && i.item_type === 'Product');
                            setProductQuantities(q => ({ ...q, [id]: item?.quantity || 1 }));
                        });
                        thrpIds.forEach(id => {
                            const item = data.items.find(i => i.item_id === id && i.item_type === 'Therapy');
                            setTherapyQuantities(q => ({ ...q, [id]: item?.quantity || 1 }));
                        });
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
        setSelectedStoreIds([]);
        setSelectedViewerRoles([]);
        setSelectedCategoryIds([]);
        setError(null);
        setLoading(false);
        setProductQuantities({});
        setTherapyQuantities({});
        setBundlePriceMap(createDefaultPriceMap());
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setFormData(prev => ({ ...prev, selling_price: value === '' ? '' : Number(value) }));
        setBundlePriceMap(prev => ({
            ...prev,
            ['一般售價' as MemberIdentity]: {
                enabled: true,
                value,
            },
        }));
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

    const handleStoreCheckChange = (id: number, checked: boolean) => {
        setSelectedStoreIds(prev => checked ? [...prev, id] : prev.filter(sid => sid !== id));
    };

    const handleViewerRoleChange = (role: ViewerRole, checked: boolean) => {
        setSelectedViewerRoles(prev => checked ? [...prev, role] : prev.filter(r => r !== role));
    };

    const handleIdentityToggle = (identity: MemberIdentity, checked: boolean) => {
        if (identity === '一般售價') return;
        setBundlePriceMap(prev => ({
            ...prev,
            [identity]: { ...prev[identity], enabled: checked },
        }));
    };

    const handleIdentityPriceChange = (identity: MemberIdentity, value: string) => {
        setBundlePriceMap(prev => ({
            ...prev,
            [identity]: { ...prev[identity], value },
        }));
    };

    const handleSelectAllIdentities = () => {
        setBundlePriceMap(prev => {
            const next = { ...prev } as Record<MemberIdentity, { enabled: boolean; value: string }>;
            MEMBER_IDENTITY_OPTIONS.forEach(({ value }) => {
                if (value !== '一般售價') {
                    next[value] = { ...next[value], enabled: true };
                }
            });
            return next;
        });
    };

    const handleClearIdentities = () => {
        setBundlePriceMap(prev => {
            const next = { ...prev } as Record<MemberIdentity, { enabled: boolean; value: string }>;
            MEMBER_IDENTITY_OPTIONS.forEach(({ value }) => {
                if (value !== '一般售價') {
                    next[value] = { ...next[value], enabled: false };
                }
            });
            return next;
        });
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const generalPriceValue = bundlePriceMap['一般售價']?.value ?? '';
        const generalPrice = generalPriceValue === '' ? null : Number(generalPriceValue);
        if (generalPriceValue === '' || generalPrice === null || Number.isNaN(generalPrice) || generalPrice < 0) {
            setError('請輸入有效的一般售價');
            setLoading(false);
            return;
        }

        const priceTiers: { identity_type: MemberIdentity; price: number }[] = [
            { identity_type: '一般售價', price: generalPrice },
        ];

        for (const { value } of MEMBER_IDENTITY_OPTIONS) {
            if (value === '一般售價') continue;
            const entry = bundlePriceMap[value];
            if (!entry?.enabled) continue;
            const parsed = Number(entry.value);
            if (!entry.value || Number.isNaN(parsed) || parsed < 0) {
                setError(`請輸入有效的「${value}」售價`);
                setLoading(false);
                return;
            }
            priceTiers.push({ identity_type: value, price: parsed });
        }

        const payload = {
            ...formData,
            calculated_price: calculatedPrice,
            visible_store_ids: selectedStoreIds.length > 0 ? selectedStoreIds : null,
            visible_permissions: selectedViewerRoles.length > 0 ? selectedViewerRoles : null,
            items: [
                ...selectedProductIds.map(id => ({ item_id: id, item_type: 'Product', quantity: productQuantities[id] || 1 })),
                ...selectedTherapyIds.map(id => ({ item_id: id, item_type: 'Therapy', quantity: therapyQuantities[id] || 1 }))
            ],
            category_ids: selectedCategoryIds,
            price_tiers: priceTiers,
            selling_price: generalPrice,
        };

        try {
            if (editingBundle) {
                await updateBundle(editingBundle.bundle_id, payload);
            } else {
                await createBundle(payload);
            }
            onSaveSuccess();
            onHide();
        } catch (err) {
            const axiosErr = err as AxiosError<{ error?: string }>;
            setError(axiosErr.response?.data?.error || "儲存失敗，請檢查欄位或聯繫管理員。");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal show={show} onHide={onHide} size="lg" onExited={resetStates}>
            <Modal.Header closeButton>
                <Modal.Title>新增產品組合 1.2.6.3.1</Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    {loading && <div className="text-center"><Spinner animation="border" /></div>}
                    {error && <Alert variant="danger">{error}</Alert>}
                    
                    <Form.Group className="mb-3">
                        <Form.Label>設定編號</Form.Label>
                        <Form.Control type="text" name="bundle_code" value={formData.bundle_code} onChange={handleInputChange} required />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>設定產品組合名稱</Form.Label>
                        <Form.Control type="text" name="name" value={formData.name} onChange={handleInputChange} required />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>分類 (可複選)</Form.Label>
                        <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #dee2e6', padding: '0.5rem' }}>
                            {categories.map(cat => (
                                <Form.Check
                                    key={cat.category_id}
                                    type="checkbox"
                                    label={cat.name}
                                    checked={selectedCategoryIds.includes(cat.category_id)}
                                    onChange={e => {
                                        const checked = e.target.checked;
                                        setSelectedCategoryIds(prev =>
                                            checked ? [...prev, cat.category_id] : prev.filter(id => id !== cat.category_id)
                                        );
                                    }}
                                />
                            ))}
                        </div>
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
                        <Form.Label>限定分店 (可複選)</Form.Label>
                        <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #dee2e6', padding: '0.5rem' }}>
                            {stores.map(s => (
                                <Form.Check
                                    key={`store-${s.store_id}`}
                                    type="checkbox"
                                    id={`store-check-${s.store_id}`}
                                    label={s.store_name}
                                    checked={selectedStoreIds.includes(s.store_id)}
                                    onChange={e => handleStoreCheckChange(s.store_id, e.target.checked)}
                                />
                            ))}
                        </div>
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>限定可見身份 (可複選)</Form.Label>
                        <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #dee2e6', padding: '0.5rem' }}>
                            {VIEWER_ROLE_OPTIONS.map(option => (
                                <Form.Check
                                    key={`bundle-viewer-${option.value}`}
                                    type="checkbox"
                                    id={`bundle-viewer-${option.value}`}
                                    label={option.label}
                                    checked={selectedViewerRoles.includes(option.value)}
                                    onChange={e => handleViewerRoleChange(option.value, e.target.checked)}
                                />
                            ))}
                        </div>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>試算金額 (唯讀)</Form.Label>
                        <Form.Control type="text" readOnly value={`$ ${calculatedPrice.toLocaleString()}`} />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>最終售價</Form.Label>
                        <Form.Control type="number" name="selling_price" value={formData.selling_price} onChange={handlePriceChange} required min={0} />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>會員別售價 (可複選)</Form.Label>
                        <div className="d-flex justify-content-end gap-2 mb-2">
                            <Button size="sm" variant="outline-info" onClick={handleSelectAllIdentities}>全部加入</Button>
                            <Button size="sm" variant="outline-secondary" onClick={handleClearIdentities}>全部取消</Button>
                        </div>
                        <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #dee2e6', padding: '0.5rem' }}>
                            {MEMBER_IDENTITY_OPTIONS.filter(option => option.value !== '一般售價').map(option => {
                                const entry = bundlePriceMap[option.value];
                                return (
                                    <div key={`bundle-identity-${option.value}`} className="d-flex align-items-center mb-2 gap-2">
                                        <Form.Check
                                            type="checkbox"
                                            id={`bundle-identity-${option.value}`}
                                            label={option.label}
                                            checked={entry?.enabled || false}
                                            onChange={e => handleIdentityToggle(option.value, e.target.checked)}
                                        />
                                        <Form.Control
                                            type="number"
                                            min={0}
                                            value={entry?.value ?? ''}
                                            disabled={!entry?.enabled}
                                            onChange={e => handleIdentityPriceChange(option.value, e.target.value)}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="info" className="text-white" onClick={onHide}>取消</Button>
                    <Button variant="info" className="text-white" type="submit" disabled={loading}>
                        {loading ? '處理中...' : '確認儲存'}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};

export default BundleCreateModal;
