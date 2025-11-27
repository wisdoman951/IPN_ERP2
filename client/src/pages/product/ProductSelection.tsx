import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Container, Form, Button, ListGroup, Spinner, Alert, Row, Col, Card, InputGroup, Tabs, Tab } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import DynamicContainer from '../../components/DynamicContainer';
import { getAllProducts, Product } from '../../services/ProductSellService';
import { fetchAllBundles, Bundle } from '../../services/ProductBundleService';
import { getStoreId } from '../../services/AuthUtils';
import { getCategories, Category } from '../../services/CategoryService';
import MemberSummaryCard from '../../components/MemberSummaryCard';
import { getMemberByCode as fetchMemberByCode } from '../../services/MedicalService';
import { MemberData } from '../../types/medicalTypes';
import {
  MEMBER_IDENTITY_OPTIONS,
  MemberIdentity,
  THERAPIST_RESTRICTED_IDENTITIES,
} from '../../types/memberIdentity';
import { getUserRole } from '../../utils/authUtils';
import { normalizeMemberIdentity } from '../../utils/memberIdentity';

interface ItemBase {
  type: 'product' | 'bundle';
  product_id?: number;
  bundle_id?: number;
  name: string;
  code?: string;
  price: number;
  basePrice: number;
  inventory_id?: number;
  stock_quantity?: number;
  content?: string;
  categories?: string[];
  price_tiers?: Partial<Record<MemberIdentity, number>>;
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
  const [activeTab, setActiveTab] = useState<'product' | 'bundle'>('product');
  const [activeProductTab, setActiveProductTab] = useState<string>('all');
  const [categories, setCategories] = useState<Category[]>([]);
  const [bundleCategories, setBundleCategories] = useState<Category[]>([]);
  const [activeBundleTab, setActiveBundleTab] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [memberCode, setMemberCode] = useState<string>('');
  const [memberName, setMemberName] = useState<string>('');
  const [memberSummary, setMemberSummary] = useState<MemberData | null>(null);
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
    () =>
      MEMBER_IDENTITY_OPTIONS.filter(({ value }) => !restrictedIdentities.has(value)),
    [restrictedIdentities],
  );

  const resolvedIdentityForMember = useMemo(
    () =>
      normalizeMemberIdentity(memberSummary?.identity_type) ?? prefillIdentity,
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

  const dedupeBundleContents = useCallback((contents?: string) => {
    if (!contents) return contents;
    const unique: string[] = [];
    contents.split(',').forEach(raw => {
      const item = raw.trim();
      if (item && !unique.includes(item)) {
        unique.push(item);
      }
    });
    return unique.join(', ');
  }, []);

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
    (item: ItemBase, identity: MemberIdentity | 'all') => {
      const identities = deriveIdentitySet(item.price_tiers, item.basePrice);
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
    (item: ItemBase, identity: MemberIdentity) => {
      const price = resolvePriceForIdentity(item.price_tiers, item.basePrice, identity);
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
    const fetchData = async () => {
      setLoading(true); setPageError(null);
      try {
        const [productData, bundleData, categoryData, bundleCatData] = await Promise.all([
          getAllProducts(),
          fetchAllBundles(),
          getCategories('product'),
          getCategories('product_bundle')
        ]);

        const products: ItemBase[] = productData.map((p: Product) => {
          const generalPrice =
            p.price_tiers?.['一般售價'] !== undefined && p.price_tiers?.['一般售價'] !== null
              ? Number(p.price_tiers?.['一般售價'])
              : undefined;

          return {
            type: 'product',
            product_id: p.product_id,
            name: p.product_name,
            code: p.product_code,
            price: generalPrice,
            basePrice: generalPrice,
            inventory_id: p.inventory_id,
            stock_quantity: p.inventory_quantity,
            categories: p.categories || [],
            price_tiers: p.price_tiers,
          };
        });

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
          basePrice: Number(b.selling_price),
          content: dedupeBundleContents(b.bundle_contents),
          categories: b.categories || [],
          price_tiers: b.price_tiers,
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

    const formState = localStorage.getItem('productSellFormState');
    if (formState) {
      try {
        const parsed = JSON.parse(formState);
        if (parsed.memberCode) {
          setMemberCode(parsed.memberCode);
        }
        if (parsed.memberName) {
          setMemberName(parsed.memberName);
        }
        if (parsed.memberIdentity) {
          setPrefillIdentity(normalizeMemberIdentity(parsed.memberIdentity));
        }
      } catch (e) {
        console.error('解析 productSellFormState 失敗', e);
      }
    }

    // Restore selections from localStorage
    const stored = localStorage.getItem('selectedProducts');
    if (stored) {
      try {
        const arr: any[] = JSON.parse(stored);
        const map = new Map<string, SelectedItem>();
        arr.forEach(item => {
          const key = item.type === 'bundle' ? `b-${item.bundle_id}` : `p-${item.product_id}`;
          const basePrice = item.basePrice ?? item.price ?? 0;
          map.set(key, {
            ...item,
            basePrice,
            price: item.price ?? basePrice,
            quantity: String(item.quantity || '1'),
          });
        });
        setSelectedItemsMap(map);
      } catch (e) {
        console.error('解析 selectedProducts 失敗', e);
      }
    }
  }, []);

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
      if (!memberCode) {
        setMemberSummary(null);
        return;
      }
      try {
        const data = await fetchMemberByCode(memberCode);
        if (!cancelled) {
          setMemberSummary(data ? normalizeMember(data) : null);
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
  }, [memberCode]);

  useEffect(() => {
    setSelectedItemsMap(prev => {
      let changed = false;
      const next = new Map<string, SelectedItem>();
      prev.forEach((item, key) => {
        const basePrice = item.basePrice ?? item.price;
        const unitPrice =
          resolvePriceForIdentity(item.price_tiers, basePrice, pricingIdentity) ?? basePrice ?? 0;
        if (unitPrice !== item.price || basePrice !== item.basePrice) {
          changed = true;
          next.set(key, { ...item, price: unitPrice, basePrice });
        } else {
          next.set(key, item);
        }
      });
      return changed ? next : prev;
    });
  }, [pricingIdentity, resolvePriceForIdentity]);

  useEffect(() => {
    if (allItems.length === 0) {
      return;
    }
    setSelectedItemsMap(prev => {
      let changed = false;
      const next = new Map<string, SelectedItem>();
      prev.forEach((item, key) => {
        const source = allItems.find(candidate =>
          candidate.type === item.type &&
          (candidate.type === 'bundle'
            ? candidate.bundle_id === item.bundle_id
            : candidate.product_id === item.product_id),
        );
        if (source) {
          const basePrice = source.basePrice ?? source.price;
          const priceTiers = source.price_tiers || item.price_tiers;
          const recalculatedPrice =
            resolvePriceForIdentity(priceTiers, basePrice, pricingIdentity) ?? basePrice ?? 0;
          const shouldUpdate =
            (priceTiers && priceTiers !== item.price_tiers) ||
            basePrice !== item.basePrice ||
            recalculatedPrice !== item.price;
          if (shouldUpdate) {
            changed = true;
            next.set(key, {
              ...item,
              basePrice,
              price_tiers: priceTiers,
              price: recalculatedPrice,
            });
            return;
          }
        }
        next.set(key, item);
      });
      return changed ? next : prev;
    });
  }, [allItems, pricingIdentity, resolvePriceForIdentity]);

  useEffect(() => { // 前端篩選
    let filtered: ItemBase[] = [];
    if (activeTab === 'bundle') {
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
    filtered = filtered
      .filter(item => matchesIdentityFilter(item, activeIdentity))
      .filter(item =>
        resolvePriceForIdentity(item.price_tiers, item.basePrice, pricingIdentity) !== undefined,
      );
    if (activeIdentity === '一般售價') {
      filtered = filtered.filter(item => {
        if (item.type !== 'bundle') {
          return true;
        }
        const generalPrice = resolvePriceForIdentity(
          item.price_tiers,
          item.basePrice,
          '一般售價',
        );
        return generalPrice !== 0;
      });
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
  }, [
    searchTerm,
    allItems,
    activeTab,
    activeProductTab,
    activeBundleTab,
    activeIdentity,
    pricingIdentity,
    matchesIdentityFilter,
    resolvePriceForIdentity,
  ]);

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
        const basePrice = item.basePrice ?? item.price;
        const priceForIdentity =
          resolvePriceForIdentity(item.price_tiers, basePrice, pricingIdentity) ?? basePrice ?? 0;
        newMap.set(key, { ...item, price: priceForIdentity, basePrice, quantity: '1' });
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

    const final = selectedArray.map(item => {
      const resolveNumeric = (value: unknown): number => {
        if (value === null || value === undefined || value === '') {
          return 0;
        }
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
      };
      const resolvedPrice = resolveNumeric(item.price ?? item.basePrice);

      return {
        type: item.type,
        product_id: item.product_id,
        bundle_id: item.bundle_id,
        code: item.code,
        name: item.name || item.content,
        price: resolvedPrice,
        basePrice: resolvedPrice,
        quantity: Number(item.quantity),
        inventory_id: item.inventory_id,
        stock_quantity: item.stock_quantity,
        content: item.content,
        price_tiers: item.price_tiers,
      };
    });

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
          目前沒有符合條件的{activeTab === 'product' ? '產品' : '產品組合'}。
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
                                <small className="text-muted">產品編號: {item.code}</small>
                              </div>
                              <div>
                                <small className="text-primary">{formatPriceForDisplay(item, pricingIdentity)}</small>
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

  const selectionCard = (
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

          <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab((k as 'product' | 'bundle') || 'product')} className="mb-3">
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

export default ProductSelection;
