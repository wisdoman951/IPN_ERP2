// src/pages/therapy/TherapyPackageSelection.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Container, Form, Button, ListGroup, Spinner, Alert, Row, Col, Card, InputGroup, Tabs, Tab } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import DynamicContainer from '../../components/DynamicContainer';
import {
    getAllTherapyPackages as fetchAllTherapyPackagesService,
    TherapyPackage as TherapyPackageBaseType,
    fetchRemainingSessionsBulk
} from '../../services/TherapySellService';
import { fetchAllTherapyBundles, TherapyBundle } from '../../services/TherapyBundleService';
import { getCategories, Category } from '../../services/CategoryService';
import MemberSummaryCard from '../../components/MemberSummaryCard';
import { getMemberByCode as fetchMemberByCode, getMemberById as fetchMemberById } from '../../services/MedicalService';
import { MemberData } from '../../types/medicalTypes';
import {
    MEMBER_IDENTITY_OPTIONS,
    MemberIdentity,
    THERAPIST_RESTRICTED_IDENTITIES,
} from '../../types/memberIdentity';
import { getUserRole } from '../../utils/authUtils';
import { normalizeMemberIdentity } from '../../utils/memberIdentity';

// 與 AddTherapySell.tsx 中 SelectedTherapyPackageUIData 結構對應，但此頁面只關心基礎資訊和 userSessions
export interface PackageInSelection extends TherapyPackageBaseType {
  userSessions: string; // 堂數或組合數量
  basePrice?: number;
  price_tiers?: Partial<Record<MemberIdentity, number>>;
}

const TherapyPackageSelection: React.FC = () => {
    const navigate = useNavigate();
    const [allPackages, setAllPackages] = useState<TherapyPackageBaseType[]>([]);
    const [displayedPackages, setDisplayedPackages] = useState<TherapyPackageBaseType[]>([]);
    const [selectedPackagesMap, setSelectedPackagesMap] = useState<Map<string, PackageInSelection>>(new Map());
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [pageError, setPageError] = useState<string | null>(null); // 用於此頁面特定的錯誤，如堂數無效
    const [memberId, setMemberId] = useState<string>('');
    const [memberCode, setMemberCode] = useState<string>('');
    const [memberName, setMemberName] = useState<string>('');
    const [memberSummary, setMemberSummary] = useState<MemberData | null>(null);
    const [remainingMap, setRemainingMap] = useState<Map<string, number>>(new Map());
    const [activeTab, setActiveTab] = useState<'therapy' | 'bundle'>('therapy');
    const [activeTherapyTab, setActiveTherapyTab] = useState<string>('all');
    const [categories, setCategories] = useState<Category[]>([]);
    const [bundleCategories, setBundleCategories] = useState<Category[]>([]);
    const [activeBundleTab, setActiveBundleTab] = useState<string>('all');
    const [activeIdentity, setActiveIdentity] = useState<MemberIdentity | 'all'>('all');
    const [identityLocked, setIdentityLocked] = useState(false);
    const [prefillIdentity, setPrefillIdentity] = useState<MemberIdentity | null>(null);

    const userRole = getUserRole();
    const restrictedIdentities = useMemo(
        () =>
            new Set<MemberIdentity>(
                userRole === 'therapist' ? THERAPIST_RESTRICTED_IDENTITIES : [],
            ),
        [userRole],
    );
    const availableIdentityOptions = useMemo(
        () => MEMBER_IDENTITY_OPTIONS.filter(({ value }) => !restrictedIdentities.has(value)),
        [restrictedIdentities],
    );

    const resolvedIdentityForMember = useMemo(
        () => normalizeMemberIdentity(memberSummary?.identity_type) ?? prefillIdentity,
        [memberSummary?.identity_type, prefillIdentity],
    );
    const pricingIdentity = useMemo<MemberIdentity>(
        () => {
            const candidate = activeIdentity === 'all' ? resolvedIdentityForMember : activeIdentity;
            if (!candidate || restrictedIdentities.has(candidate)) {
                return '一般售價';
            }
            return candidate;
        },
        [activeIdentity, resolvedIdentityForMember, restrictedIdentities],
    );

    const deriveIdentitySet = useCallback(
        (
            tiers: Partial<Record<MemberIdentity, number>> | undefined,
            fallbackPrice: number | string | undefined,
        ): Set<MemberIdentity> => {
            const set = new Set<MemberIdentity>();
            if (tiers) {
                Object.entries(tiers).forEach(([key, value]) => {
                    if (value !== undefined && value !== null && value !== '') {
                        set.add(key as MemberIdentity);
                    }
                });
            }
            const hasFallback = fallbackPrice !== undefined && fallbackPrice !== null && fallbackPrice !== '';
            if (!set.has('一般售價') && hasFallback) {
                set.add('一般售價');
            }
            if (set.size === 0) {
                set.add('一般售價');
            }
            return set;
        },
        [],
    );

    const resolvePriceForIdentity = useCallback(
        (
            tiers: Partial<Record<MemberIdentity, number>> | undefined,
            fallbackPrice: number | string | undefined,
            identity: MemberIdentity,
        ): number | undefined => {
            const toNumber = (value: number | string | undefined | null) => {
                if (value === undefined || value === null || value === '') {
                    return undefined;
                }
                const parsed = Number(value);
                return Number.isNaN(parsed) ? undefined : parsed;
            };

            if (identity === '一般售價') {
                const general = toNumber(tiers?.['一般售價']);
                if (general !== undefined) {
                    return general;
                }
                return toNumber(fallbackPrice);
            }

            const specific = toNumber(tiers?.[identity]);
            if (specific !== undefined) {
                return specific;
            }

            const general = toNumber(tiers?.['一般售價']);
            if (general !== undefined) {
                return general;
            }
            return toNumber(fallbackPrice);
        },
        [],
    );

    const matchesIdentityFilter = useCallback(
        (pkg: TherapyPackageBaseType, identity: MemberIdentity | 'all') => {
            const fallback = (pkg as PackageInSelection).basePrice ?? pkg.TherapyPrice ?? 0;
            const identities = deriveIdentitySet(pkg.price_tiers, fallback);
            const hasVisible = Array.from(identities).some(id => !restrictedIdentities.has(id));
            if (!hasVisible) {
                return false;
            }
            if (identity === 'all') {
                return true;
            }
            return identities.has(identity);
        },
        [deriveIdentitySet, restrictedIdentities],
    );

    const formatPriceForDisplay = useCallback(
        (pkg: TherapyPackageBaseType, identity: MemberIdentity) => {
            const fallback = (pkg as PackageInSelection).basePrice ?? pkg.TherapyPrice ?? 0;
            const price = resolvePriceForIdentity(pkg.price_tiers, fallback, identity);
            if (price === undefined) {
                return `${identity}：未設定售價`;
            }
            return `${identity}：NT$ ${Number(price).toLocaleString()}`;
        },
        [resolvePriceForIdentity],
    );

    useEffect(() => {
        if (identityLocked) {
            return;
        }
        if (!resolvedIdentityForMember) {
            return;
        }
        if (restrictedIdentities.has(resolvedIdentityForMember)) {
            setActiveIdentity('all');
            return;
        }
        setActiveIdentity(resolvedIdentityForMember);
    }, [identityLocked, resolvedIdentityForMember, restrictedIdentities]);


    useEffect(() => {
        const formStateData = localStorage.getItem('addTherapySellFormState');
        if (formStateData) {
            try {
                const formState = JSON.parse(formStateData);
                if (formState.memberId) {
                    setMemberId(formState.memberId);
                }
                if (formState.memberCode) {
                    setMemberCode(formState.memberCode);
                }
                if (formState.memberName) {
                    setMemberName(formState.memberName);
                }
                if (formState.memberIdentity) {
                    setPrefillIdentity(normalizeMemberIdentity(formState.memberIdentity));
                }
            } catch (e) {
                console.error('解析 addTherapySellFormState 失敗', e);
            }
        }

        const storedPkgs = localStorage.getItem('selectedTherapyPackagesWithSessions');
        if (storedPkgs) {
            try {
                const pkgs: PackageInSelection[] = JSON.parse(storedPkgs);
                const map = new Map<string, PackageInSelection>();
                pkgs.forEach(p => {
                    const key = p.type === 'bundle' ? `b-${p.bundle_id}` : `t-${p.therapy_id}`;
                    const basePrice = p.basePrice ?? p.TherapyPrice ?? 0;
                    map.set(key, {
                        ...p,
                        basePrice,
                        TherapyPrice: p.TherapyPrice ?? basePrice,
                    });
                });
                setSelectedPackagesMap(map);
            } catch (e) {
                console.error('解析 selectedTherapyPackagesWithSessions 失敗', e);
            }
        } else if (formStateData) {
            try {
                const formState = JSON.parse(formStateData);
                if (Array.isArray(formState.selectedTherapyPackages)) {
                    const initialMap = new Map<string, PackageInSelection>();
                    formState.selectedTherapyPackages.forEach((pkgFromState: PackageInSelection) => {
                        const key = pkgFromState.type === 'bundle'
                            ? `b-${pkgFromState.bundle_id}`
                            : `t-${pkgFromState.therapy_id}`;
                        const basePrice = pkgFromState.basePrice ?? pkgFromState.TherapyPrice ?? 0;
                        initialMap.set(key, {
                            ...pkgFromState,
                            basePrice,
                            TherapyPrice: pkgFromState.TherapyPrice ?? basePrice,
                            userSessions: String(pkgFromState.userSessions || '1')
                        });
                    });
                    setSelectedPackagesMap(initialMap);
                }
            } catch (e) {
                console.error('解析 addTherapySellFormState (for packages in selection page) 失敗', e);
            }
        }
    }, []); // 僅在 mount 時執行一次

    useEffect(() => {
        let cancelled = false;

        const normalizeMember = (raw: any): MemberData => ({
            member_id: Number(raw?.member_id) || 0,
            member_code: raw?.member_code || undefined,
            name: raw?.name || '',
            identity_type: raw?.identity_type || '',
            address: raw?.address || '',
            birthday: raw?.birthday || '',
            blood_type: raw?.blood_type || '',
            gender: raw?.gender || '',
            inferrer_id: Number(raw?.inferrer_id) || 0,
            line_id: raw?.line_id || '',
            note: raw?.note || '',
            occupation: raw?.occupation || '',
            phone: raw?.phone || '',
        });

        const fetchMember = async () => {
            try {
                if (memberCode) {
                    const data = await fetchMemberByCode(memberCode);
                    if (!cancelled) {
                        setMemberSummary(data ? normalizeMember(data) : null);
                    }
                    return;
                }
                if (memberId) {
                    const data = await fetchMemberById(memberId);
                    if (!cancelled) {
                        setMemberSummary(data ? normalizeMember(data) : null);
                    }
                    return;
                }
                if (!cancelled) {
                    setMemberSummary(null);
                }
            } catch (err) {
                console.error('載入會員資料失敗', err);
                if (!cancelled) {
                    setMemberSummary(null);
                }
            }
        };

        fetchMember();

        return () => {
            cancelled = true;
        };
    }, [memberCode, memberId]);

    useEffect(() => {
        setSelectedPackagesMap(prev => {
            let changed = false;
            const next = new Map<string, PackageInSelection>();
            prev.forEach((pkg, key) => {
                const basePrice = pkg.basePrice ?? pkg.TherapyPrice ?? 0;
                const unitPrice =
                    resolvePriceForIdentity(pkg.price_tiers, basePrice, pricingIdentity) ?? basePrice ?? 0;
                if (unitPrice !== (pkg.TherapyPrice ?? basePrice) || basePrice !== pkg.basePrice) {
                    changed = true;
                    next.set(key, { ...pkg, basePrice, TherapyPrice: unitPrice });
                } else {
                    next.set(key, pkg);
                }
            });
            return changed ? next : prev;
        });
    }, [pricingIdentity, resolvePriceForIdentity]);

    const fetchPackages = async () => {
        setLoading(true); setPageError(null);
        try {
            const [therapyRes, bundleData, categoryData, bundleCatData] = await Promise.all([
                fetchAllTherapyPackagesService(),
                fetchAllTherapyBundles(),
                getCategories('therapy'),
                getCategories('therapy_bundle')
            ]);

            let packages: TherapyPackageBaseType[] = [];
            if (therapyRes.success && therapyRes.data) {
                packages = therapyRes.data.map(p => ({
                    ...p,
                    type: 'therapy',
                    therapy_id: Number(p.therapy_id),
                    categories: p.categories || [],
                    basePrice: Number(p.TherapyPrice ?? p.price ?? 0),
                    TherapyPrice: Number(p.TherapyPrice ?? p.price ?? 0),
                    price_tiers: p.price_tiers || {},
                }));
            }

            const bundlePackages: TherapyPackageBaseType[] = bundleData.map((b: TherapyBundle) => ({
                bundle_id: b.bundle_id,
                type: 'bundle',
                TherapyCode: b.bundle_code,
                TherapyName: b.name,
                TherapyContent: b.bundle_contents,
                TherapyPrice: Number(b.selling_price),
                categories: b.categories || [],
                basePrice: Number(b.selling_price),
                price_tiers: b.price_tiers || {},
            }));

            const combined = [...packages, ...bundlePackages];
            setAllPackages(combined);
            setCategories(categoryData);
            setBundleCategories(bundleCatData);
            setDisplayedPackages(combined.filter(pkg => pkg.type === 'therapy'));
        } catch (err: unknown) {
            setPageError((err as Error).message || "載入療程套餐時發生嚴重錯誤");
            setAllPackages([]); setDisplayedPackages([]);
        } finally { setLoading(false); }
    };
    useEffect(() => { fetchPackages(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (allPackages.length === 0) {
            return;
        }
        setSelectedPackagesMap(prev => {
            let changed = false;
            const next = new Map<string, PackageInSelection>();
            prev.forEach((pkg, key) => {
                const source = allPackages.find(candidate =>
                    candidate.type === pkg.type &&
                    (candidate.type === 'bundle'
                        ? candidate.bundle_id === pkg.bundle_id
                        : candidate.therapy_id === pkg.therapy_id),
                );
                if (source) {
                    const basePrice =
                        source.basePrice ?? source.TherapyPrice ?? source.price ?? pkg.basePrice ?? pkg.TherapyPrice ?? 0;
                    const priceTiers = source.price_tiers || pkg.price_tiers;
                    const recalculated =
                        resolvePriceForIdentity(priceTiers, basePrice, pricingIdentity) ?? basePrice ?? 0;
                    if (
                        priceTiers !== pkg.price_tiers ||
                        basePrice !== (pkg.basePrice ?? pkg.TherapyPrice ?? 0) ||
                        recalculated !== (pkg.TherapyPrice ?? basePrice)
                    ) {
                        changed = true;
                        next.set(key, {
                            ...pkg,
                            basePrice,
                            price_tiers: priceTiers,
                            TherapyPrice: recalculated,
                        });
                        return;
                    }
                }
                next.set(key, pkg);
            });
            return changed ? next : prev;
        });
    }, [allPackages, pricingIdentity, resolvePriceForIdentity]);

    useEffect(() => {
        const fetchRemaining = async () => {
            if (!memberId || allPackages.length === 0) {
                setRemainingMap(new Map());
                return;
            }
            try {
                const res = await fetchRemainingSessionsBulk(memberId);
                const dataMap = ((res && res.data ? res.data : res) || {}) as Record<string, unknown>;
                const map = new Map<string, number>();
                Object.entries(dataMap).forEach(([id, remaining]) => {
                    const numericId = Number(id);
                    if (!isNaN(numericId) && typeof remaining === 'number') {
                        map.set(`t-${numericId}`, remaining);
                    }
                });
                setRemainingMap(map);
            } catch (e) {
                console.error('獲取剩餘堂數失敗', e);
            }
        };
        fetchRemaining();
    }, [memberId, allPackages]);

    useEffect(() => {
        let filtered: TherapyPackageBaseType[] = [];
        if (activeTab === 'bundle') {
            filtered = allPackages.filter(pkg => pkg.type === 'bundle');
            if (activeBundleTab !== 'all') {
                filtered = filtered.filter(pkg => pkg.categories?.includes(activeBundleTab));
            }
        } else {
            filtered = allPackages.filter(pkg => pkg.type === 'therapy');
            if (activeTherapyTab !== 'all') {
                filtered = filtered.filter(pkg => pkg.categories?.includes(activeTherapyTab));
            }
        }
        filtered = filtered.filter(pkg => matchesIdentityFilter(pkg, activeIdentity));
        if (searchTerm.trim() !== "") {
            const lowerSearchTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(pkg =>
                (pkg.TherapyName?.toLowerCase() || '').includes(lowerSearchTerm) ||
                (pkg.TherapyContent?.toLowerCase() || '').includes(lowerSearchTerm) ||
                (pkg.TherapyCode?.toLowerCase() || '').includes(lowerSearchTerm)
            );
        }
        setDisplayedPackages(filtered);
    }, [searchTerm, allPackages, activeTab, activeTherapyTab, activeBundleTab, activeIdentity, matchesIdentityFilter]);

    const getPkgKey = (pkg: TherapyPackageBaseType) =>
        pkg.type === 'bundle' ? `b-${pkg.bundle_id}` : `t-${pkg.therapy_id}`;

    const handleTogglePackage = (pkg: TherapyPackageBaseType) => {
        setPageError(null);
        const key = getPkgKey(pkg);
        setSelectedPackagesMap(prevMap => {
            const newMap = new Map(prevMap);
            if (newMap.has(key)) {
                newMap.delete(key);
            } else {
                const basePrice = (pkg as PackageInSelection).basePrice ?? pkg.TherapyPrice ?? 0;
                const priceForIdentity =
                    resolvePriceForIdentity(pkg.price_tiers, basePrice, pricingIdentity) ?? basePrice ?? 0;
                newMap.set(key, {
                    ...pkg,
                    basePrice,
                    TherapyPrice: priceForIdentity,
                    userSessions: "1",
                });
            }
            return newMap;
        });
    };

    const handleSessionChange = (pkgKey: string, sessions: string) => {
        setPageError(null);
        setSelectedPackagesMap(prevMap => {
            const newMap = new Map(prevMap);
            const existingPkg = newMap.get(pkgKey);
            if (existingPkg) {
                const validSessions = sessions.trim() === "" ? "" : Math.max(1, parseInt(sessions) || 1).toString();
                newMap.set(pkgKey, { ...existingPkg, userSessions: validSessions });
            }
            return newMap;
        });
    };

    const handleConfirmSelection = () => {
        setPageError(null);
        const selectedArray: PackageInSelection[] = Array.from(selectedPackagesMap.values());
        const invalidPackage = selectedArray.find(pkg => !pkg.userSessions || Number(pkg.userSessions) <= 0);

        if (invalidPackage) {
            setPageError(`所選套餐「${invalidPackage.TherapyContent || invalidPackage.TherapyName}」的堂數（${invalidPackage.userSessions}）無效，請至少輸入1。`);
            return;
        }
        // 儲存的是 PackageInSelection[]，它已經包含了 userSessions
        localStorage.setItem('selectedTherapyPackagesWithSessions', JSON.stringify(selectedArray));
        // 與產品選單一致，直接返回上一頁
        navigate(-1);
    };

    const calculatePageTotal = () => {
        let total = 0;
        selectedPackagesMap.forEach(pkg => {
            total += (pkg.TherapyPrice || 0) * (Number(pkg.userSessions) || 0);
        });
        return total;
    };

    const selectionCard = (
        <Card>
            <Card.Header as="h5">選擇療程並設定堂數</Card.Header>
            <Card.Body>
                    <Row className="mb-3 gx-2">
                        <Col>
                            <Form.Control
                                type="text"
                                placeholder="輸入療程名稱、產品編號或內容進行篩選..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </Col>
                    </Row>

                    <Tabs
                        activeKey={activeIdentity}
                        onSelect={(key) => {
                            const next = (key as MemberIdentity | 'all') || 'all';
                            setIdentityLocked(true);
                            setActiveIdentity(next);
                        }}
                        className="mb-3"
                    >
                        <Tab eventKey="all" title="全部身份" />
                        {availableIdentityOptions.map(option => (
                            <Tab key={option.value} eventKey={option.value} title={option.label} />
                        ))}
                    </Tabs>

                    <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab((k as 'therapy' | 'bundle') || 'therapy')} className="mb-3">
                        <Tab eventKey="therapy" title="療程">
                            <Tabs activeKey={activeTherapyTab} onSelect={(k) => setActiveTherapyTab(k || 'all')} className="mt-3 mb-3">
                                <Tab eventKey="all" title="全部" />
                                {categories.map(cat => (
                                    <Tab key={cat.category_id} eventKey={cat.name} title={cat.name} />
                                ))}
                            </Tabs>
                        </Tab>
                        <Tab eventKey="bundle" title="療程組合">
                            <Tabs activeKey={activeBundleTab} onSelect={(k) => setActiveBundleTab(k || 'all')} className="mt-3 mb-3">
                                <Tab eventKey="all" title="全部" />
                                {bundleCategories.map(cat => (
                                    <Tab key={cat.category_id} eventKey={cat.name} title={cat.name} />
                                ))}
                            </Tabs>
                        </Tab>
                    </Tabs>

                    {loading && (
                        <div className="text-center p-5"><Spinner animation="border" variant="info" /> <p className="mt-2">載入中...</p></div>
                    )}
                    {!loading && displayedPackages.length === 0 && (
                        <Alert variant="secondary">
                              目前沒有符合條件的{activeTab === 'therapy' ? '療程' : '療程組合'}。
                        </Alert>
                    )}
                    {!loading && displayedPackages.length > 0 && (
                        <ListGroup variant="flush" style={{maxHeight: 'calc(100vh - 380px)', overflowY: 'auto'}}>
                            {displayedPackages.map(pkg => {
                                const pkgKey = getPkgKey(pkg);
                                const currentSelection = selectedPackagesMap.get(pkgKey);
                                const isSelected = !!currentSelection;
                                return (
                                    <ListGroup.Item key={pkgKey} className="py-2 px-2">
                                        <Row className="align-items-center gx-2">
                                            <Col xs={12} sm={5} md={5}>
                                                <Form.Check
                                                    type="checkbox"
                                                    className="mb-2 mb-sm-0"
                                                    id={`pkg-select-${pkgKey}`}
                                                    label={
                                                        <div style={{ fontSize: '0.9rem' }}>
                                                            <strong>{pkg.TherapyName || pkg.TherapyContent}</strong>
                                                            <div>
                                                                <small className="text-muted">
                                                                    產品編號: {pkg.TherapyCode}
                                                                </small>
                                                            </div>
                                                            <div>
                                                                <small className="text-primary">
                                                                    {formatPriceForDisplay(pkg, pricingIdentity)}
                                                                </small>
                                                            </div>
                                                            {pkg.TherapyContent && pkg.TherapyContent !== pkg.TherapyName && (
                                                                <div><small className="text-muted">{pkg.TherapyContent}</small></div>
                                                            )}
                                                            {memberId && remainingMap.has(pkgKey) && (
                                                                <div><small className="text-success">剩餘 {remainingMap.get(pkgKey)} 堂</small></div>
                                                            )}
                                                        </div>
                                                    }
                                                    checked={isSelected}
                                                    onChange={() => handleTogglePackage(pkg)}
                                                />
                                            </Col>
                                            {isSelected && currentSelection && (
                                                <Col xs={12} sm={7} md={7} className="mt-1 mt-sm-0">
                                                    <InputGroup size="sm">
                                                        <InputGroup.Text>堂數:</InputGroup.Text>
                                                        <Form.Control
                                                            type="number"
                                                            min="1"
                                                            value={currentSelection.userSessions}
                                                            onChange={(e) => handleSessionChange(pkgKey, e.target.value)}
                                                            style={{ maxWidth: '70px', textAlign:'center' }}
                                                            onClick={(e) => e.stopPropagation()} // 避免點擊輸入框觸發 ListGroup.Item 的 onClick
                                                        />
                                                        <InputGroup.Text>
                                                            小計: NT$ {( (pkg.TherapyPrice || 0) * Number(currentSelection.userSessions || 0)).toLocaleString()}
                                                        </InputGroup.Text>
                                                    </InputGroup>
                                                </Col>
                                            )}
                                        </Row>
                                    </ListGroup.Item>
                                );
                            })}
                        </ListGroup>
                    )}
            </Card.Body>
            { !loading && (
                <Card.Footer>
                     <div className="d-flex justify-content-between align-items-center">
                        <div>總計金額: <strong className="h5 mb-0" style={{color: '#00b1c8'}}>NT$ {calculatePageTotal().toLocaleString()}</strong></div>
                        <div>
                            <Button variant="outline-secondary" type="button" onClick={() => navigate(-1)} className="me-2">
                                取消
                            </Button>
                            <Button variant="info" className="text-white" type="button" onClick={handleConfirmSelection} disabled={selectedPackagesMap.size === 0}>
                                確認選取 ({selectedPackagesMap.size} 項)
                            </Button>
                        </div>
                    </div>
                </Card.Footer>
            )}
        </Card>
    );

    const content = (
        <Container className="my-4">
            {pageError && <Alert variant="danger" dismissible onClose={() => setPageError(null)}>{pageError}</Alert>}
            <Row className="g-3">
                <Col xs={12} lg={8}>
                    {selectionCard}
                </Col>
                <Col xs={12} lg={4}>
                    <MemberSummaryCard
                        member={memberSummary}
                        memberCode={memberCode}
                        fallbackName={memberName}
                        className="h-100"
                    />
                </Col>
            </Row>
        </Container>
    );

    return (
        <>
            <Header />
            <DynamicContainer content={content} className="p-0" />
        </>
    );
};

export default TherapyPackageSelection;
