import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Alert } from 'react-bootstrap';
import { addTherapy, updateTherapy } from '../../../services/TherapyService';
import { Therapy } from '../../../services/ProductBundleService';
import { getCategories, Category } from '../../../services/CategoryService';
import { Store } from '../../../services/StoreService';
import { VIEWER_ROLE_OPTIONS, ViewerRole } from '../../../types/viewerRole';
import { MEMBER_IDENTITY_OPTIONS, MemberIdentity } from '../../../types/memberIdentity';

interface AddTherapyModalProps {
    show: boolean;
    onHide: () => void;
    editingTherapy?: Therapy | null;
    stores: Store[];
}

const AddTherapyModal: React.FC<AddTherapyModalProps> = ({ show, onHide, editingTherapy, stores }) => {
    const [code, setCode] = useState('');
    const [name, setName] = useState('');
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

    const [priceMap, setPriceMap] = useState<Record<MemberIdentity, { enabled: boolean; value: string }>>(createDefaultPriceMap);
    const [selectedStoreIds, setSelectedStoreIds] = useState<number[]>([]);
    const [selectedViewerRoles, setSelectedViewerRoles] = useState<ViewerRole[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
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
        if (editingTherapy) {
            setCode(editingTherapy.code);
            setName(editingTherapy.name);
            setSelectedStoreIds(editingTherapy.visible_store_ids || []);
            setSelectedViewerRoles(editingTherapy.visible_permissions || []);
            setSelectedCategoryIds(editingTherapy.category_ids || []);
            const baseMap = createDefaultPriceMap();
            const tiers = editingTherapy.price_tiers || {};
            const generalPrice = tiers?.['一般售價'] ?? editingTherapy.price;
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
            setPriceMap(baseMap);
            setTierValidationMessage(computeTierValidation(baseMap));
            setFormError(null);
        } else {
            setCode('');
            setName('');
            setSelectedStoreIds([]);
            setSelectedViewerRoles([]);
            setSelectedCategoryIds([]);
            const defaultMap = createDefaultPriceMap();
            setPriceMap(defaultMap);
            setTierValidationMessage(computeTierValidation(defaultMap));
            setFormError(null);
        }
    }, [editingTherapy]);

    useEffect(() => {
        getCategories('therapy').then(setCategories).catch(() => {});
    }, []);

    const handleStoreCheckChange = (id: number, checked: boolean) => {
        setSelectedStoreIds(prev => checked ? [...prev, id] : prev.filter(sid => sid !== id));
    };

    const handleViewerRoleChange = (role: ViewerRole, checked: boolean) => {
        setSelectedViewerRoles(prev => checked ? [...prev, role] : prev.filter(r => r !== role));
    };

    const handleIdentityToggle = (identity: MemberIdentity, checked: boolean) => {
        if (identity === '一般售價') return;
        setPriceMap(prev => {
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
        setPriceMap(prev => {
            const next = {
                ...prev,
                [identity]: { ...prev[identity], value },
            } as Record<MemberIdentity, { enabled: boolean; value: string }>;
            setTierValidationMessage(computeTierValidation(next));
            setFormError(null);
            return next;
        });
    };

    const handleSelectAllIdentities = () => {
        setPriceMap(prev => {
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
        setPriceMap(prev => {
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
        const generalPrice = priceMap['一般售價']?.value ?? '';
        if (!generalPrice) {
            setTierValidationMessage('請先輸入一般售價後再套用。');
            setFormError('請先輸入一般售價後再套用。');
            return;
        }
        setPriceMap(prev => {
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const generalPriceRaw = priceMap['一般售價']?.value ?? '';
            const generalPrice = Number(generalPriceRaw);
            if (!generalPriceRaw || Number.isNaN(generalPrice) || generalPrice < 0) {
                setFormError('請輸入有效的一般售價');
                return;
            }

            const tierValidation = computeTierValidation(priceMap);
            if (tierValidation) {
                setTierValidationMessage(tierValidation);
                setFormError(tierValidation);
                return;
            }

            const priceTiersPayload: { identity_type: MemberIdentity; price: number }[] = [
                { identity_type: '一般售價', price: generalPrice },
            ];

            for (const { value } of MEMBER_IDENTITY_OPTIONS) {
                if (value === '一般售價') continue;
                const entry = priceMap[value];
                if (!entry?.enabled) continue;
                const parsed = Number(entry.value);
                if (!entry.value || Number.isNaN(parsed) || parsed < 0) {
                    const message = `請輸入有效的「${value}」售價`;
                    setTierValidationMessage(message);
                    setFormError(message);
                    return;
                }
                priceTiersPayload.push({ identity_type: value, price: parsed });
            }

            const payload = {
                code,
                name,
                price: generalPrice,
                visible_store_ids: selectedStoreIds.length > 0 ? selectedStoreIds : null,
                visible_permissions: selectedViewerRoles.length > 0 ? selectedViewerRoles : null,
                category_ids: selectedCategoryIds,
                price_tiers: priceTiersPayload,
            };
            if (editingTherapy) {
                await updateTherapy(editingTherapy.therapy_id, payload);
            } else {
                await addTherapy(payload);
            }
            setFormError(null);
            setTierValidationMessage(null);
            onHide();
        } catch (err) {
            setFormError(editingTherapy ? '更新療程失敗' : '新增療程失敗');
        }
    };

    const handleCategoryChange = (id: number, checked: boolean) => {
        setSelectedCategoryIds(prev => checked ? [...prev, id] : prev.filter(cid => cid !== id));
    };

    return (
        <Modal show={show} onHide={onHide}>
            <Modal.Header closeButton>
                <Modal.Title>{editingTherapy ? '修改療程 1.2.6.3.1.1.1.1' : '新增療程 1.2.6.3.1.1.1.1'}</Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    {formError && <Alert variant="danger">{formError}</Alert>}
                    <Form.Group className="mb-3">
                        <Form.Label>設定編號</Form.Label>
                        <Form.Control value={code} onChange={e => setCode(e.target.value)} />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>設定療程名稱</Form.Label>
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
                                    key={`therapy-viewer-${option.value}`}
                                    type="checkbox"
                                    id={`therapy-viewer-${option.value}`}
                                    label={option.label}
                                    checked={selectedViewerRoles.includes(option.value)}
                                    onChange={e => handleViewerRoleChange(option.value, e.target.checked)}
                                />
                            ))}
                        </div>
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>一般售價</Form.Label>
                        <Form.Control
                            type="number"
                            min={0}
                            value={priceMap['一般售價']?.value ?? ''}
                            onChange={e => handleIdentityPriceChange('一般售價', e.target.value)}
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
                                const entry = priceMap[option.value];
                                return (
                                    <div key={`therapy-identity-${option.value}`} className="d-flex align-items-center mb-2 gap-2">
                                        <Form.Check
                                            type="checkbox"
                                            id={`therapy-identity-${option.value}`}
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

export default AddTherapyModal;
