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
import { VIEWER_ROLE_OPTIONS, ViewerRole } from '../../../types/viewerRole';
import { MEMBER_IDENTITY_OPTIONS, MemberIdentity } from '../../../types/memberIdentity';

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
    const [therapies, setTherapies] = useState<Therapy[]>([]);
    const [stores, setStores] = useState<Store[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedTherapyIds, setSelectedTherapyIds] = useState<number[]>([]);
    const [therapyQuantities, setTherapyQuantities] = useState<{ [id: number]: number }>({});
    const [selectedStoreIds, setSelectedStoreIds] = useState<number[]>([]);
    const [selectedViewerRoles, setSelectedViewerRoles] = useState<ViewerRole[]>([]);
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
    const [bundlePriceMap, setBundlePriceMap] = useState<Record<MemberIdentity, { enabled: boolean; value: string }>>(createDefaultPriceMap);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [tierValidationMessage, setTierValidationMessage] = useState<string | null>(null);

    const computeTierValidation = (
        map: Record<MemberIdentity, { enabled: boolean; value: string }>,
    ): string | null => {
        for (const { value } of MEMBER_IDENTITY_OPTIONS) {
            if (value === '一般售價') continue;
            const entry = map[value];
            if (entry?.enabled && !entry.value) {
                return `已勾選「${value}」，請輸入售價。`;
            }
        }
        return null;
    };

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
                        setSelectedViewerRoles(data.visible_permissions || []);
                        setSelectedCategoryIds(data.category_ids || []);
                        const tiers = data.price_tiers || {};
                        const baseMap = createDefaultPriceMap();
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
                        setTierValidationMessage(computeTierValidation(baseMap));
                        setFormError(null);
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
            setSelectedViewerRoles([]);
            setSelectedCategoryIds([]);
            setError(null);
            setLoading(false);
            const defaultMap = createDefaultPriceMap();
            setBundlePriceMap(defaultMap);
            setTierValidationMessage(computeTierValidation(defaultMap));
            setFormError(null);
        };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
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

    const handleViewerRoleChange = (role: ViewerRole, checked: boolean) => {
        setSelectedViewerRoles(prev => (checked ? [...prev, role] : prev.filter(r => r !== role)));
    };

    const handleIdentityToggle = (identity: MemberIdentity, checked: boolean) => {
        if (identity === '一般售價') return;
        setBundlePriceMap(prev => {
            const next = {
                ...prev,
                [identity]: { ...prev[identity], enabled: checked },
            } as Record<MemberIdentity, { enabled: boolean; value: string }>;
            setTierValidationMessage(computeTierValidation(next));
            setFormError(null);
            return next;
        });
    };

    const handleIdentityPriceChange = (identity: MemberIdentity, value: string) => {
        setBundlePriceMap(prev => {
            const next = {
                ...prev,
                [identity]: { ...prev[identity], value },
            } as Record<MemberIdentity, { enabled: boolean; value: string }>;
            setTierValidationMessage(computeTierValidation(next));
            setFormError(null);
            return next;
        });
        if (identity === '一般售價') {
            setFormData(prev => ({ ...prev, selling_price: value === '' ? '' : Number(value) }));
        }
    };

    const handleSelectAllIdentities = () => {
        setBundlePriceMap(prev => {
            const next = { ...prev } as Record<MemberIdentity, { enabled: boolean; value: string }>;
            MEMBER_IDENTITY_OPTIONS.forEach(({ value }) => {
                if (value !== '一般售價') {
                    next[value] = { ...next[value], enabled: true };
                }
            });
            setTierValidationMessage(computeTierValidation(next));
            setFormError(null);
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
            setTierValidationMessage(computeTierValidation(next));
            setFormError(null);
            return next;
        });
    };

    const handleApplyGeneralPrice = () => {
        const generalPrice = bundlePriceMap['一般售價']?.value ?? '';
        if (!generalPrice) {
            setTierValidationMessage('請先輸入一般售價後再套用。');
            setFormError('請先輸入一般售價後再套用。');
            return;
        }
        setBundlePriceMap(prev => {
            const next = { ...prev } as Record<MemberIdentity, { enabled: boolean; value: string }>;
            MEMBER_IDENTITY_OPTIONS.forEach(({ value }) => {
                if (value === '一般售價') return;
                if (next[value]?.enabled) {
                    next[value] = { ...next[value], value: generalPrice };
                }
            });
            setTierValidationMessage(computeTierValidation(next));
            setFormError(null);
            return next;
        });
    };

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleIdentityPriceChange('一般售價', e.target.value);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setFormError(null);

        const generalPriceRaw = bundlePriceMap['一般售價']?.value ?? '';
        const generalPrice = Number(generalPriceRaw);
        if (!generalPriceRaw || Number.isNaN(generalPrice) || generalPrice < 0) {
            setFormError('請輸入有效的一般售價');
            return;
        }

        const tierValidation = computeTierValidation(bundlePriceMap);
        if (tierValidation) {
            setTierValidationMessage(tierValidation);
            setFormError(tierValidation);
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
                const message = `請輸入有效的「${value}」售價`;
                setTierValidationMessage(message);
                setFormError(message);
                return;
            }
            priceTiers.push({ identity_type: value, price: parsed });
        }

        const payload = {
            ...formData,
            selling_price: generalPrice,
            calculated_price: calculatedPrice,
            visible_store_ids: selectedStoreIds.length > 0 ? selectedStoreIds : null,
            visible_permissions: selectedViewerRoles.length > 0 ? selectedViewerRoles : null,
            items: selectedTherapyIds.map(id => ({ item_id: id, quantity: therapyQuantities[id] || 1 })),
            category_ids: selectedCategoryIds,
            price_tiers: priceTiers,
        };

        setLoading(true);

        try {
            if (editingBundle) {
                await updateTherapyBundle(editingBundle.bundle_id, payload);
            } else {
                await createTherapyBundle(payload);
            }
            setFormError(null);
            setTierValidationMessage(null);
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
                    {formError && <Alert variant="danger">{formError}</Alert>}

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
                            <Form.Group className="mb-3">
                                <Form.Label>限定可見身份 (可複選)</Form.Label>
                                <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #dee2e6', padding: '0.5rem' }}>
                                    {VIEWER_ROLE_OPTIONS.map(option => (
                                        <Form.Check
                                            key={`therapy-bundle-viewer-${option.value}`}
                                            type="checkbox"
                                            id={`therapy-bundle-viewer-${option.value}`}
                                            label={option.label}
                                            checked={selectedViewerRoles.includes(option.value)}
                                            onChange={e => handleViewerRoleChange(option.value, e.target.checked)}
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
                        <Form.Control
                            type="number"
                            name="selling_price"
                            min={0}
                            value={bundlePriceMap['一般售價']?.value ?? ''}
                            onChange={handlePriceChange}
                            required
                        />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>會員別售價 (可複選)</Form.Label>
                        <div className="d-flex justify-content-end gap-2 mb-2 flex-wrap">
                            <Button size="sm" variant="outline-info" onClick={handleSelectAllIdentities}>全部加入</Button>
                            <Button size="sm" variant="outline-secondary" onClick={handleClearIdentities}>全部取消</Button>
                            <Button size="sm" variant="outline-primary" onClick={handleApplyGeneralPrice}>套用一般售價</Button>
                        </div>
                        <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #dee2e6', padding: '0.5rem' }}>
                            {MEMBER_IDENTITY_OPTIONS.filter(option => option.value !== '一般售價').map(option => {
                                const entry = bundlePriceMap[option.value];
                                return (
                                    <div key={`therapy-bundle-identity-${option.value}`} className="d-flex align-items-center mb-2 gap-2">
                                        <Form.Check
                                            type="checkbox"
                                            id={`therapy-bundle-identity-${option.value}`}
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
                        {tierValidationMessage && <Form.Text className="text-danger">{tierValidationMessage}</Form.Text>}
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
