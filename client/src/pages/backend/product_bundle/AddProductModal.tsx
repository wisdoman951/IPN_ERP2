import React, { useState, useEffect } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';
import { addProduct, updateProduct } from '../../../services/ProductService';
import { Product as ProductItem } from '../../../services/ProductBundleService';
import { getCategories, Category } from '../../../services/CategoryService';
import { Store } from '../../../services/StoreService';
import { VIEWER_ROLE_OPTIONS, ViewerRole } from '../../../types/viewerRole';

interface AddProductModalProps {
    show: boolean;
    onHide: () => void;
    editingProduct?: ProductItem | null;
    stores: Store[];
}

const AddProductModal: React.FC<AddProductModalProps> = ({ show, onHide, editingProduct, stores }) => {
    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [purchasePrice, setPurchasePrice] = useState('');
    const [selectedStoreIds, setSelectedStoreIds] = useState<number[]>([]);
    const [selectedViewerRoles, setSelectedViewerRoles] = useState<ViewerRole[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);

    useEffect(() => {
        if (editingProduct) {
            setCode(editingProduct.product_code);
            setName(editingProduct.product_name);
            setPrice(String(editingProduct.product_price));
            setPurchasePrice(editingProduct.purchase_price != null ? String(editingProduct.purchase_price) : '');
            setSelectedStoreIds(editingProduct.visible_store_ids || []);
            setSelectedViewerRoles(editingProduct.visible_permissions || []);
            setSelectedCategoryIds([]);
        } else {
            setCode('');
            setName('');
            setPrice('');
            setPurchasePrice('');
            setSelectedStoreIds([]);
            setSelectedViewerRoles([]);
            setSelectedCategoryIds([]);
        }
    }, [editingProduct]);

    useEffect(() => {
        getCategories('product').then(setCategories).catch(() => {});
    }, []);

    const handleStoreCheckChange = (id: number, checked: boolean) => {
        setSelectedStoreIds(prev => checked ? [...prev, id] : prev.filter(sid => sid !== id));
    };

    const handleViewerRoleChange = (role: ViewerRole, checked: boolean) => {
        setSelectedViewerRoles(prev => checked ? [...prev, role] : prev.filter(r => r !== role));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                code,
                name,
                price: Number(price),
                purchase_price: purchasePrice === '' ? null : Number(purchasePrice),
                visible_store_ids: selectedStoreIds.length > 0 ? selectedStoreIds : null,
                visible_permissions: selectedViewerRoles.length > 0 ? selectedViewerRoles : null,
                category_ids: selectedCategoryIds,
            };
            if (editingProduct) {
                await updateProduct(editingProduct.product_id, payload);
            } else {
                await addProduct(payload);
            }
            onHide();
        } catch (err) {
            alert(editingProduct ? '更新產品失敗' : '新增產品失敗');
        }
    };

    const handleCategoryChange = (id: number, checked: boolean) => {
        setSelectedCategoryIds(prev => checked ? [...prev, id] : prev.filter(cid => cid !== id));
    };

    return (
        <Modal show={show} onHide={onHide}>
            <Modal.Header closeButton>
                <Modal.Title>{editingProduct ? '修改產品 1.2.6.3.1.1.1' : '新增產品 1.2.6.3.1.1.1'}</Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    <Form.Group className="mb-3">
                        <Form.Label>設定編號</Form.Label>
                        <Form.Control value={code} onChange={e => setCode(e.target.value)} />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>設定產品名稱</Form.Label>
                        <Form.Control value={name} onChange={e => setName(e.target.value)} />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>分類 (可複選)</Form.Label>
                        <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #dee2e6', padding: '0.5rem' }}>
                            {categories.map(c => (
                                <Form.Check
                                    key={`cat-${c.category_id}`}
                                    type="checkbox"
                                    id={`cat-check-${c.category_id}`}
                                    label={c.name}
                                    checked={selectedCategoryIds.includes(c.category_id)}
                                    onChange={e => handleCategoryChange(c.category_id, e.target.checked)}
                                />
                            ))}
                        </div>
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>設定進貨價</Form.Label>
                        <Form.Control type="number" min={0} value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} />
                    </Form.Group>
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
                                    key={`viewer-${option.value}`}
                                    type="checkbox"
                                    id={`viewer-check-${option.value}`}
                                    label={option.label}
                                    checked={selectedViewerRoles.includes(option.value)}
                                    onChange={e => handleViewerRoleChange(option.value, e.target.checked)}
                                />
                            ))}
                        </div>
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>設定售價</Form.Label>
                        <Form.Control type="number" min={0} value={price} onChange={e => setPrice(e.target.value)} />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="info" className="text-white" onClick={onHide}>取消</Button>
                    <Button variant="info" className="text-white" type="submit">確認儲存</Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};

export default AddProductModal;
