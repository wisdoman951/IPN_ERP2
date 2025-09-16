import React, { useState, useEffect, useMemo, FormEvent } from 'react';
import { Modal, Button, Form, Alert, Row, Col, Spinner } from 'react-bootstrap';
import { AxiosError } from 'axios';
import {
    createTherapyBundle,
    updateTherapyBundle,
    getTherapyBundleDetails,
    fetchTherapiesForDropdown,
    Therapy,
    TherapyBundle
} from '../../../services/TherapyBundleService';
import { fetchAllStores, Store } from '../../../services/StoreService';
import { getCategories, Category } from '../../../services/CategoryService';

interface TherapyBundleModalProps {
    show: boolean;
    onHide: () => void;
    onSaveSuccess: () => void;
    editingBundle: TherapyBundle | null;
}

const TherapyBundleModal: React.FC<TherapyBundleModalProps> = ({ show, onHide, onSaveSuccess, editingBundle }) => {
    const [formData, setFormData] = useState({
        bundle_code: '',
        name: '',
        selling_price: '' as number | ''
    });
    const [therapies, setTherapies] = useState<Therapy[]>([]);
    const [stores, setStores] = useState<Store[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedTherapyIds, setSelectedTherapyIds] = useState<number[]>([]);
    const [therapyQuantities, setTherapyQuantities] = useState<{ [id: number]: number }>({});
    const [selectedStoreIds, setSelectedStoreIds] = useState<number[]>([]);
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (show) {
            resetStates();
            fetchTherapiesForDropdown().then(setTherapies).catch(() => setError('無法載入療程列表'));
            fetchAllStores()
                .then(data => setStores(data.filter(s => s.store_name !== '總店')))
                .catch(() => setError('無法載入分店列表'));
            getCategories('therapy_bundle').then(setCategories).catch(() => setCategories([]));

            if (editingBundle) {
                setLoading(true);
                getTherapyBundleDetails(editingBundle.bundle_id)
                    .then(data => {
                        setFormData({
                            bundle_code: data.bundle_code,
                            name: data.name,
                            selling_price: data.selling_price
                        });
                        const ids = data.items.map(i => i.item_id);
                        setSelectedTherapyIds(ids);
                        setSelectedStoreIds(data.visible_store_ids || []);
                        setSelectedCategoryIds(data.category_ids || []);
                        const quantities: { [id: number]: number } = {};
                        data.items.forEach(item => {
                            quantities[item.item_id] = item.quantity;
                        });
                        setTherapyQuantities(quantities);
                    })
                    .catch(() => setError('無法載入療程組合詳情'))
                    .finally(() => setLoading(false));
            }
        }
    }, [show, editingBundle]);

    const resetStates = () => {
        setFormData({ bundle_code: '', name: '', selling_price: '' });
        setSelectedTherapyIds([]);
        setTherapyQuantities({});
        setSelectedStoreIds([]);
        setSelectedCategoryIds([]);
        setError(null);
        setLoading(false);
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
        const selected = therapies.filter(t => selectedTherapyIds.includes(t.therapy_id));
        return selected.reduce((sum, t) => sum + Number(t.price || 0) * (therapyQuantities[t.therapy_id] || 1), 0);
    }, [selectedTherapyIds, therapies, therapyQuantities]);

    const handleTherapyCheckChange = (id: number, checked: boolean) => {
        setSelectedTherapyIds(prev => (checked ? [...prev, id] : prev.filter(tid => tid !== id)));
        if (checked && !therapyQuantities[id]) {
            setTherapyQuantities(q => ({ ...q, [id]: 1 }));
        } else if (!checked) {
            setTherapyQuantities(q => {
                const nq = { ...q };
                delete nq[id];
                return nq;
            });
        }
    };

    const handleTherapyQuantityChange = (id: number, value: number) => {
        setTherapyQuantities(q => ({ ...q, [id]: value < 1 ? 1 : value }));
    };

    const handleStoreCheckChange = (id: number, checked: boolean) => {
        setSelectedStoreIds(prev => (checked ? [...prev, id] : prev.filter(sid => sid !== id)));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const payload = {
            ...formData,
            calculated_price: calculatedPrice,
            visible_store_ids: selectedStoreIds.length > 0 ? selectedStoreIds : null,
            items: selectedTherapyIds.map(id => ({ item_id: id, quantity: therapyQuantities[id] || 1 })),
            category_ids: selectedCategoryIds
        };

        try {
            if (editingBundle) {
                await updateTherapyBundle(editingBundle.bundle_id, payload);
            } else {
                await createTherapyBundle(payload);
            }
            onSaveSuccess();
            onHide();
        } catch (err) {
            const axiosErr = err as AxiosError<{ error?: string }>;
            setError(axiosErr.response?.data?.error || '儲存失敗，請檢查欄位或聯繫管理員。');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal show={show} onHide={onHide} size="lg" onExited={resetStates}>
            <Modal.Header closeButton>
                <Modal.Title>新增療程組合 1.2.6.3.1.1</Modal.Title>
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
                        <Form.Label>設定療程組合名稱</Form.Label>
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
                                                    className="ms-2"
                                                    style={{ width: '70px' }}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>限定分店 (可複選)</Form.Label>
                                <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #dee2e6', padding: '0.5rem' }}>
                                    {stores.map(s => (
                                        <Form.Check
                                            key={`store-${s.store_id}`}
                                            type="checkbox"
                                            id={`store-check-${s.store_id}`}
                                            checked={selectedStoreIds.includes(s.store_id)}
                                            onChange={e => handleStoreCheckChange(s.store_id, e.target.checked)}
                                            label={s.store_name}
                                        />
                                    ))}
                                </div>
                            </Form.Group>
                        </Col>
                    </Row>

                    <Form.Group className="mb-3">
                        <Form.Label>試算金額</Form.Label>
                        <Form.Control type="number" value={calculatedPrice} readOnly />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>最終售價</Form.Label>
                        <Form.Control type="number" name="selling_price" min={0} value={formData.selling_price} onChange={handlePriceChange} required />
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

export default TherapyBundleModal;
