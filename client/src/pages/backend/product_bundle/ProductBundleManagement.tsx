import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Table, Button, Container, Alert, Spinner, Row, Col, Tabs, Tab, Form } from 'react-bootstrap';
import Header from '../../../components/Header';
import DynamicContainer from '../../../components/DynamicContainer';
import BundleCreateModal from './BundleCreateModal';
import AddTherapyModal from './AddTherapyModal';
import AddProductModal from './AddProductModal';
import AddCategoryModal from './AddCategoryModal';
import DeleteCategoryModal from './DeleteCategoryModal';
import TherapyBundleModal from './TherapyBundleModal';
import { fetchAllBundles, deleteBundle, fetchProductsForDropdown, fetchTherapiesForDropdown, publishBundle, unpublishBundle, Bundle, Product as ProductItem, Therapy as TherapyItem } from '../../../services/ProductBundleService';
import { fetchAllTherapyBundles, deleteTherapyBundle, publishTherapyBundle, unpublishTherapyBundle, TherapyBundle } from '../../../services/TherapyBundleService';
import { fetchAllStores, Store } from '../../../services/StoreService';
import { deleteProduct, publishProduct, unpublishProduct } from '../../../services/ProductService';
import { deleteTherapy, publishTherapy, unpublishTherapy } from '../../../services/TherapyService';
import { getCategories, Category } from '../../../services/CategoryService';
import { VIEWER_ROLE_LABELS, ViewerRole } from '../../../types/viewerRole';
import {
    MEMBER_IDENTITY_OPTIONS,
    MemberIdentity,
    THERAPIST_RESTRICTED_IDENTITIES,
} from '../../../types/memberIdentity';
import { getUserRole } from '../../../utils/authUtils';

const ProductBundleManagement: React.FC = () => {
    const [bundles, setBundles] = useState<Bundle[]>([]);
    const [therapyBundles, setTherapyBundles] = useState<TherapyBundle[]>([]);
    const [products, setProducts] = useState<ProductItem[]>([]);
    const [therapies, setTherapies] = useState<TherapyItem[]>([]);
    const [bundleLoading, setBundleLoading] = useState(true);
    const [therapyBundleLoading, setTherapyBundleLoading] = useState(true);
    const [productLoading, setProductLoading] = useState(true);
    const [therapyLoading, setTherapyLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [editingBundle, setEditingBundle] = useState<Bundle | null>(null);
    const [showTherapyModal, setShowTherapyModal] = useState(false);
    const [showProductModal, setShowProductModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
    const [editingTherapy, setEditingTherapy] = useState<TherapyItem | null>(null);
    const [showTherapyBundleModal, setShowTherapyBundleModal] = useState(false);
    const [editingTherapyBundle, setEditingTherapyBundle] = useState<TherapyBundle | null>(null);
    const [stores, setStores] = useState<Store[]>([]);
    const [activeTab, setActiveTab] = useState<'bundle' | 'therapy_bundle' | 'product' | 'therapy'>('bundle');
    const [bundleSearch, setBundleSearch] = useState('');
    const [therapyBundleSearch, setTherapyBundleSearch] = useState('');
    const [productSearch, setProductSearch] = useState('');
    const [therapySearch, setTherapySearch] = useState('');
    const [bundleStatus, setBundleStatus] = useState<'PUBLISHED' | 'UNPUBLISHED'>('PUBLISHED');
    const [therapyBundleStatus, setTherapyBundleStatus] = useState<'PUBLISHED' | 'UNPUBLISHED'>('PUBLISHED');
    const [productStatus, setProductStatus] = useState<'PUBLISHED' | 'UNPUBLISHED'>('PUBLISHED');
    const [therapyStatus, setTherapyStatus] = useState<'PUBLISHED' | 'UNPUBLISHED'>('PUBLISHED');
    const [bundleStoreFilter, setBundleStoreFilter] = useState('');
    const [therapyBundleStoreFilter, setTherapyBundleStoreFilter] = useState('');
    const [productStoreFilter, setProductStoreFilter] = useState('');
    const [therapyStoreFilter, setTherapyStoreFilter] = useState('');
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [productCategories, setProductCategories] = useState<Category[]>([]);
    const [therapyCategories, setTherapyCategories] = useState<Category[]>([]);
    const [bundleCategories, setBundleCategories] = useState<Category[]>([]);
    const [therapyBundleCategories, setTherapyBundleCategories] = useState<Category[]>([]);
    const [activeProductCategory, setActiveProductCategory] = useState<string>('all');
    const [activeTherapyCategory, setActiveTherapyCategory] = useState<string>('all');
    const [activeBundleCategory, setActiveBundleCategory] = useState<string>('all');
    const [activeTherapyBundleCategory, setActiveTherapyBundleCategory] = useState<string>('all');
    const [showDeleteCategoryModal, setShowDeleteCategoryModal] = useState(false);
    const [activeBundleIdentity, setActiveBundleIdentity] = useState<MemberIdentity | 'all'>('all');
    const [activeTherapyBundleIdentity, setActiveTherapyBundleIdentity] = useState<MemberIdentity | 'all'>('all');
    const [activeProductIdentity, setActiveProductIdentity] = useState<MemberIdentity | 'all'>('all');
    const [activeTherapyIdentity, setActiveTherapyIdentity] = useState<MemberIdentity | 'all'>('all');

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

    const toNumber = (value: number | string | undefined | null) => {
        if (value === undefined || value === null || value === '') {
            return undefined;
        }
        const parsed = Number(value);
        return Number.isNaN(parsed) ? undefined : parsed;
    };

    const resolveGeneralPrice = (tiers?: Partial<Record<MemberIdentity, number>>) =>
        toNumber(tiers?.['一般售價']);

    const deriveIdentitySet = (
        tiers: Partial<Record<MemberIdentity, number>> | undefined,
        fallbackPrice: number | string | undefined,
    ): Set<MemberIdentity> => {
        const set = new Set<MemberIdentity>();
        if (tiers) {
            Object.keys(tiers).forEach(key => set.add(key as MemberIdentity));
        }
        const hasGeneral = set.has('一般售價');
        const hasFallback = fallbackPrice !== undefined && fallbackPrice !== null && fallbackPrice !== '';
        if (!hasGeneral && hasFallback) {
            set.add('一般售價');
        }
        if (set.size === 0) {
            set.add('一般售價');
        }
        return set;
    };

    const matchesIdentityFilter = (
        tiers: Partial<Record<MemberIdentity, number>> | undefined,
        fallbackPrice: number | string | undefined,
        activeIdentity: MemberIdentity | 'all',
    ) => {
        const identities = deriveIdentitySet(tiers, fallbackPrice);
        let hasAllowed = false;
        identities.forEach(identity => {
            if (!restrictedIdentities.has(identity)) {
                hasAllowed = true;
            }
        });
        if (!hasAllowed) {
            return false;
        }
        if (activeIdentity === 'all') {
            return true;
        }
        return identities.has(activeIdentity);
    };

    const mapActiveIdentity = (identity: MemberIdentity | 'all'): MemberIdentity =>
        identity === 'all' ? '一般售價' : identity;

    const resolvePriceForIdentity = (
        tiers: Partial<Record<MemberIdentity, number>> | undefined,
        fallbackPrice: number | string | undefined,
        identity: MemberIdentity,
    ): number | undefined => {
        if (identity === '一般售價') {
            const general = tiers?.['一般售價'];
            if (general != null) {
                const parsed = Number(general);
                return Number.isNaN(parsed) ? undefined : parsed;
            }
            return toNumber(fallbackPrice);
        }

        const specific = tiers?.[identity];
        if (specific != null) {
            const parsed = Number(specific);
            if (!Number.isNaN(parsed)) {
                return parsed;
            }
        }

        const general = tiers?.['一般售價'];
        if (general != null) {
            const parsed = Number(general);
            if (!Number.isNaN(parsed)) {
                return parsed;
            }
        }
        return toNumber(fallbackPrice);
    };

    const formatPriceDisplay = (
        tiers: Partial<Record<MemberIdentity, number>> | undefined,
        fallbackPrice: number | string | undefined,
        activeIdentity: MemberIdentity | 'all',
    ) => {
        const identity = mapActiveIdentity(activeIdentity);
        const price = resolvePriceForIdentity(tiers, fallbackPrice, identity);
        if (price === undefined) {
            return '---';
        }
        return `${identity}：$${Number(price).toLocaleString()}`;
    };

    const formatViewerRoles = (roles?: ViewerRole[]) => {
        if (!roles || roles.length === 0) {
            return '---';
        }
        return roles.map(role => VIEWER_ROLE_LABELS[role] ?? role).join(', ');
    };

    const fetchBundles = useCallback(async () => {
        setBundleLoading(true);
        setError(null);
        try {
            const data = await fetchAllBundles(bundleStatus);
            setBundles(data);
        } catch (err: unknown) {
            const error = err as { response?: { data?: { error?: string } } };
            setError(error.response?.data?.error || '無法獲取組合列表');
        } finally {
            setBundleLoading(false);
        }
    }, [bundleStatus]);

    const fetchTherapyBundlesData = useCallback(async () => {
        setTherapyBundleLoading(true);
        setError(null);
        try {
            const data = await fetchAllTherapyBundles(therapyBundleStatus);
            setTherapyBundles(data);
        } catch (err: unknown) {
            const error = err as { response?: { data?: { error?: string } } };
            setError(error.response?.data?.error || '無法獲取療程組合列表');
        } finally {
            setTherapyBundleLoading(false);
        }
    }, [therapyBundleStatus]);

    const fetchProducts = useCallback(async () => {
        setProductLoading(true);
        try {
            const data = await fetchProductsForDropdown(productStatus);
            setProducts(data);
        } catch (err: unknown) {
            const error = err as { response?: { data?: { error?: string } } };
            setError(error.response?.data?.error || '無法獲取產品列表');
        } finally {
            setProductLoading(false);
        }
    }, [productStatus]);

    const fetchTherapies = useCallback(async () => {
        setTherapyLoading(true);
        try {
            const data = await fetchTherapiesForDropdown(therapyStatus);
            setTherapies(data);
        } catch (err: unknown) {
            const error = err as { response?: { data?: { error?: string } } };
            setError(error.response?.data?.error || '無法獲取療程列表');
        } finally {
            setTherapyLoading(false);
        }
    }, [therapyStatus]);

    useEffect(() => {
        fetchBundles();
        fetchTherapyBundlesData();
        fetchProducts();
        fetchTherapies();
    }, [fetchBundles, fetchTherapyBundlesData, fetchProducts, fetchTherapies]);

    useEffect(() => {
        fetchAllStores().then(setStores).catch(() => {});
    }, []);

    const refreshCategories = useCallback(() => {
        getCategories('product').then(setProductCategories).catch(() => {});
        getCategories('therapy').then(setTherapyCategories).catch(() => {});
        getCategories('product_bundle').then(setBundleCategories).catch(() => {});
        getCategories('therapy_bundle').then(setTherapyBundleCategories).catch(() => {});
    }, []);

    useEffect(() => { refreshCategories(); }, [refreshCategories]);

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingBundle(null);
    };

    const handleShowAddModal = () => {
        setEditingBundle(null);
        setShowModal(true);
    };

    const handleShowEditModal = (bundle: Bundle) => {
        setEditingBundle(bundle);
        setShowModal(true);
    };

    const handleShowTherapyModal = () => {
        setEditingTherapy(null);
        setShowTherapyModal(true);
    };

    const handleShowTherapyBundleModal = () => {
        setEditingTherapyBundle(null);
        setShowTherapyBundleModal(true);
    };

    const handleShowProductModal = () => {
        setEditingProduct(null);
        setShowProductModal(true);
    };

    const handleShowCategoryModal = () => {
        setShowCategoryModal(true);
    };

    const handleShowEditProductModal = (product: ProductItem) => {
        setEditingProduct(product);
        setShowProductModal(true);
    };

    const handleShowEditTherapyModal = (therapy: TherapyItem) => {
        setEditingTherapy(therapy);
        setShowTherapyModal(true);
    };

    const handleShowEditTherapyBundleModal = (bundle: TherapyBundle) => {
        setEditingTherapyBundle(bundle);
        setShowTherapyBundleModal(true);
    };

    const handleCloseTherapyModal = () => {
        setShowTherapyModal(false);
        setEditingTherapy(null);
        fetchTherapies();
    };

    const handleCloseTherapyBundleModal = () => {
        setShowTherapyBundleModal(false);
        setEditingTherapyBundle(null);
        fetchTherapyBundlesData();
    };

    const handleCloseProductModal = () => {
        setShowProductModal(false);
        setEditingProduct(null);
        fetchProducts();
    };

    const handleCloseCategoryModal = () => {
        setShowCategoryModal(false);
        refreshCategories();
    };

    const handleShowDeleteCategoryModal = () => {
        setShowDeleteCategoryModal(true);
    };

    const handleCloseDeleteCategoryModal = () => {
        setShowDeleteCategoryModal(false);
        refreshCategories();
        fetchBundles();
        fetchTherapyBundlesData();
        fetchProducts();
        fetchTherapies();
    };

    const confirmDeletion = (): string | null => {
        if (!window.confirm('是否確認要刪除產品資料，將一併刪除銷售資料！')) {
            return null;
        }
        const account = localStorage.getItem('account');
        const input = window.prompt('請輸入登入帳號以確認刪除');
        if (!account || input !== account) {
            alert('帳號驗證失敗，刪除已取消');
            return null;
        }
        return account;
    };

    const handleDelete = async (bundleId: number) => {
        const account = confirmDeletion();
        if (!account) return;
        setSuccessMessage(null); // 清除舊的成功訊息
        try {
            await deleteBundle(bundleId, account);
            setSuccessMessage('刪除成功！');
            fetchBundles(); // 重新載入列表
        } catch {
            setError('刪除失敗，請稍後再試。');
        }
        // 讓成功訊息顯示幾秒後自動消失
        setTimeout(() => setSuccessMessage(null), 3000);
    };

    const handleDeleteProduct = async (productId: number) => {
        const account = confirmDeletion();
        if (!account) return;
        setSuccessMessage(null);
        try {
            await deleteProduct(productId, account);
            setSuccessMessage('刪除成功！');
            fetchProducts();
        } catch {
            setError('刪除失敗，請稍後再試。');
        }
        setTimeout(() => setSuccessMessage(null), 3000);
    };

    const handleDeleteTherapy = async (therapyId: number) => {
        const account = confirmDeletion();
        if (!account) return;
        setSuccessMessage(null);
        try {
            await deleteTherapy(therapyId, account);
            setSuccessMessage('刪除成功！');
            fetchTherapies();
        } catch {
            setError('刪除失敗，請稍後再試。');
        }
        setTimeout(() => setSuccessMessage(null), 3000);
    };

    const handleDeleteTherapyBundle = async (bundleId: number) => {
        const account = confirmDeletion();
        if (!account) return;
        setSuccessMessage(null);
        try {
            await deleteTherapyBundle(bundleId, account);
            setSuccessMessage('刪除成功！');
            fetchTherapyBundlesData();
        } catch {
            setError('刪除失敗，請稍後再試。');
        }
        setTimeout(() => setSuccessMessage(null), 3000);
    };

    const handlePublishBundle = async (bundleId: number) => {
        setSuccessMessage(null);
        try {
            await publishBundle(bundleId);
            setSuccessMessage('上架成功！');
            fetchBundles();
        } catch {
            setError('上架失敗，請稍後再試。');
        }
        setTimeout(() => setSuccessMessage(null), 3000);
    };

    const handleUnpublishBundle = async (bundleId: number) => {
        setSuccessMessage(null);
        try {
            await unpublishBundle(bundleId);
            setSuccessMessage('下架成功！');
            fetchBundles();
        } catch {
            setError('下架失敗，請稍後再試。');
        }
        setTimeout(() => setSuccessMessage(null), 3000);
    };

    const handlePublishTherapyBundle = async (bundleId: number) => {
        setSuccessMessage(null);
        try {
            await publishTherapyBundle(bundleId);
            setSuccessMessage('上架成功！');
            fetchTherapyBundlesData();
        } catch {
            setError('上架失敗，請稍後再試。');
        }
        setTimeout(() => setSuccessMessage(null), 3000);
    };

    const handleUnpublishTherapyBundle = async (bundleId: number) => {
        setSuccessMessage(null);
        try {
            await unpublishTherapyBundle(bundleId);
            setSuccessMessage('下架成功！');
            fetchTherapyBundlesData();
        } catch {
            setError('下架失敗，請稍後再試。');
        }
        setTimeout(() => setSuccessMessage(null), 3000);
    };

    const handlePublishProduct = async (productId: number) => {
        setSuccessMessage(null);
        try {
            await publishProduct(productId);
            setSuccessMessage('上架成功！');
            fetchProducts();
        } catch {
            setError('上架失敗，請稍後再試。');
        }
        setTimeout(() => setSuccessMessage(null), 3000);
    };

    const handleUnpublishProduct = async (productId: number) => {
        setSuccessMessage(null);
        try {
            await unpublishProduct(productId);
            setSuccessMessage('下架成功！');
            fetchProducts();
        } catch {
            setError('下架失敗，請稍後再試。');
        }
        setTimeout(() => setSuccessMessage(null), 3000);
    };

    const handlePublishTherapy = async (therapyId: number) => {
        setSuccessMessage(null);
        try {
            await publishTherapy(therapyId);
            setSuccessMessage('上架成功！');
            fetchTherapies();
        } catch {
            setError('上架失敗，請稍後再試。');
        }
        setTimeout(() => setSuccessMessage(null), 3000);
    };

    const handleUnpublishTherapy = async (therapyId: number) => {
        setSuccessMessage(null);
        try {
            await unpublishTherapy(therapyId);
            setSuccessMessage('下架成功！');
            fetchTherapies();
        } catch {
            setError('下架失敗，請稍後再試。');
        }
        setTimeout(() => setSuccessMessage(null), 3000);
    };

    const filteredBundles = bundles
        .filter(bundle =>
            bundle.bundle_code.toLowerCase().includes(bundleSearch.toLowerCase()) ||
            bundle.name.toLowerCase().includes(bundleSearch.toLowerCase())
        )
        .filter(bundle =>
            bundleStoreFilter === '' ||
            (bundle.visible_store_ids && bundle.visible_store_ids.includes(Number(bundleStoreFilter)))
        )
        .filter(bundle =>
            activeBundleCategory === 'all' || (bundle.categories && bundle.categories.includes(activeBundleCategory))
        )
        .filter(bundle =>
            matchesIdentityFilter(bundle.price_tiers, bundle.selling_price, activeBundleIdentity)
        );

    const filteredTherapyBundles = therapyBundles
        .filter(bundle =>
            bundle.bundle_code.toLowerCase().includes(therapyBundleSearch.toLowerCase()) ||
            bundle.name.toLowerCase().includes(therapyBundleSearch.toLowerCase())
        )
        .filter(bundle =>
            therapyBundleStoreFilter === '' ||
            (bundle.visible_store_ids && bundle.visible_store_ids.includes(Number(therapyBundleStoreFilter)))
        )
        .filter(bundle =>
            activeTherapyBundleCategory === 'all' || (bundle.categories && bundle.categories.includes(activeTherapyBundleCategory))
        )
        .filter(bundle =>
            matchesIdentityFilter(bundle.price_tiers, bundle.selling_price, activeTherapyBundleIdentity)
        );

    const filteredProducts = products
        .filter(product =>
            product.product_code.toLowerCase().includes(productSearch.toLowerCase()) ||
            product.product_name.toLowerCase().includes(productSearch.toLowerCase())
        )
        .filter(product =>
            productStoreFilter === '' ||
            (product.visible_store_ids && product.visible_store_ids.includes(Number(productStoreFilter)))
        )
        .filter(product =>
            activeProductCategory === 'all' || (product.categories && product.categories.includes(activeProductCategory))
        )
        .filter(product =>
            matchesIdentityFilter(product.price_tiers, resolveGeneralPrice(product.price_tiers), activeProductIdentity)
        );

    const filteredTherapies = therapies
        .filter(therapy =>
            therapy.code.toLowerCase().includes(therapySearch.toLowerCase()) ||
            therapy.name.toLowerCase().includes(therapySearch.toLowerCase())
        )
        .filter(therapy =>
            therapyStoreFilter === '' ||
            (therapy.visible_store_ids && therapy.visible_store_ids.includes(Number(therapyStoreFilter)))
        )
        .filter(therapy =>
            activeTherapyCategory === 'all' || (therapy.categories && therapy.categories.includes(activeTherapyCategory))
        )
        .filter(therapy =>
            matchesIdentityFilter(therapy.price_tiers, therapy.price, activeTherapyIdentity)
        );

    const content = (
        <>
            <Container className="my-4">
                <Row className="align-items-center">
                    <Col>
                        <h2 className="m-0">產品療程管理</h2>
                    </Col>
                    <Col className="d-flex justify-content-end gap-2">
                        <Button
                            variant="info"
                            className="text-white px-4"
                            onClick={handleShowAddModal}
                        >
                            新增產品組合
                        </Button>
                        <Button
                            variant="info"
                            className="text-white px-4"
                            onClick={handleShowTherapyBundleModal}
                        >
                            新增療程組合
                        </Button>
                        <Button
                            variant="info"
                            className="text-white px-4"
                            onClick={handleShowProductModal}
                        >
                            新增產品
                        </Button>
                        <Button
                            variant="info"
                            className="text-white px-4"
                            onClick={handleShowTherapyModal}
                        >
                            新增療程
                        </Button>
                        <Button
                            variant="info"
                            className="text-white px-4"
                            onClick={handleShowCategoryModal}
                        >
                            新增分類
                        </Button>
                        <Button
                            variant="info"
                            className="text-white px-4"
                            onClick={handleShowDeleteCategoryModal}
                        >
                            刪除分類
                        </Button>
                    </Col>
                </Row>
            </Container>

            {error && <Container><Alert variant="danger">{error}</Alert></Container>}
            {successMessage && <Container><Alert variant="success">{successMessage}</Alert></Container>}

            <Container>
                <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab((k as 'bundle' | 'therapy_bundle' | 'product' | 'therapy') || 'bundle')} className="mb-3">
                    <Tab eventKey="bundle" title="產品組合" />
                    <Tab eventKey="therapy_bundle" title="療程組合" />
                    <Tab eventKey="product" title="產品" />
                    <Tab eventKey="therapy" title="療程" />
                </Tabs>

                {activeTab === 'bundle' && (
                    <>
                        <Tabs activeKey={activeBundleIdentity} onSelect={(k) => setActiveBundleIdentity((k as MemberIdentity | 'all') || 'all')} className="mb-3">
                            <Tab eventKey="all" title="全部" />
                            {availableIdentityOptions.map(option => (
                                <Tab key={`bundle-identity-${option.value}`} eventKey={option.value} title={option.label} />
                            ))}
                        </Tabs>
                        <Tabs activeKey={activeBundleCategory} onSelect={(k) => setActiveBundleCategory(k || 'all')} className="mb-3">
                            <Tab eventKey="all" title="全部" />
                            {bundleCategories.map(cat => (
                                <Tab key={cat.category_id} eventKey={cat.name} title={cat.name} />
                            ))}
                        </Tabs>
                        <Row className="mb-3">
                            <Col xs={12} md={4}>
                                <Form.Control
                                    type="text"
                                    placeholder="輸入編號或組合名稱搜尋"
                                    value={bundleSearch}
                                    onChange={(e) => setBundleSearch(e.target.value)}
                                />
                            </Col>
                            <Col xs={12} md={3} className="mt-2 mt-md-0">
                                <Form.Select value={bundleStoreFilter} onChange={(e) => setBundleStoreFilter(e.target.value)}>
                                    <option value="">所有分店</option>
                                    {stores.map(store => (
                                        <option key={store.store_id} value={store.store_id}>{store.store_name}</option>
                                    ))}
                                </Form.Select>
                            </Col>
                            <Col xs={12} md={2} className="mt-2 mt-md-0">
                                <Form.Select value={bundleStatus} onChange={(e) => setBundleStatus(e.target.value as 'PUBLISHED' | 'UNPUBLISHED')}>
                                    <option value="PUBLISHED">上架中</option>
                                    <option value="UNPUBLISHED">下架中</option>
                                </Form.Select>
                            </Col>
                        </Row>
                        <Table striped bordered hover responsive>
                            <thead>
                                <tr>
                                    <th>編號</th>
                                    <th>項目 (組合名稱)</th>
                                    <th>組合內容</th>
                                    <th>限定分店</th>
                                    <th>限定身份</th>
                                    <th>售價</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bundleLoading ? (
                                    <tr><td colSpan={7} className="text-center py-5"><Spinner animation="border" variant="info"/></td></tr>
                                ) : filteredBundles.length > 0 ? (
                                    filteredBundles.map(bundle => (
                                        <tr key={bundle.bundle_id}>
                                            <td className="align-middle">{bundle.bundle_code}</td>
                                            <td className="align-middle">{bundle.name}</td>
                                            <td className="align-middle">{bundle.bundle_contents || '---'}</td>
                                            <td className="align-middle">
                                                {bundle.visible_store_ids && bundle.visible_store_ids.length > 0
                                                    ? bundle.visible_store_ids
                                                        .map(id => stores.find(s => s.store_id === id)?.store_name || id)
                                                        .join(', ')
                                                    : '---'}
                                            </td>
                                            <td className="align-middle">{formatViewerRoles(bundle.visible_permissions)}</td>
                                            <td className="align-middle">{formatPriceDisplay(bundle.price_tiers, bundle.selling_price, activeBundleIdentity)}</td>
                                            <td className="align-middle">
                                                <Button variant="link" onClick={() => handleShowEditModal(bundle)}>修改</Button>
                                                {bundleStatus === 'PUBLISHED' ? (
                                                    <Button
                                                        variant="link"
                                                        className="text-orange"
                                                        onClick={() => {
                                                            if (window.confirm(`確定要下架「${bundle.name}」嗎？`)) {
                                                                handleUnpublishBundle(bundle.bundle_id);
                                                            }
                                                        }}
                                                    >
                                                        下架
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        variant="link"
                                                        className="text-success"
                                                        onClick={() => {
                                                            if (window.confirm(`確定要上架「${bundle.name}」嗎？`)) {
                                                                handlePublishBundle(bundle.bundle_id);
                                                            }
                                                        }}
                                                    >
                                                        上架
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="link"
                                                    className="text-danger"
                                                    onClick={() => {
                                                        if (window.confirm(`確定要刪除「${bundle.name}」嗎？`)) {
                                                            handleDelete(bundle.bundle_id);
                                                        }
                                                    }}
                                                >
                                                    刪除
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan={7} className="text-center text-muted py-5">尚無資料</td></tr>
                                )}
                            </tbody>
                        </Table>
                    </>
                )}

                {activeTab === 'therapy_bundle' && (
                    <>
                        <Tabs activeKey={activeTherapyBundleIdentity} onSelect={(k) => setActiveTherapyBundleIdentity((k as MemberIdentity | 'all') || 'all')} className="mb-3">
                            <Tab eventKey="all" title="全部" />
                            {availableIdentityOptions.map(option => (
                                <Tab key={`therapy-bundle-identity-${option.value}`} eventKey={option.value} title={option.label} />
                            ))}
                        </Tabs>
                        <Tabs activeKey={activeTherapyBundleCategory} onSelect={(k) => setActiveTherapyBundleCategory(k || 'all')} className="mb-3">
                            <Tab eventKey="all" title="全部" />
                            {therapyBundleCategories.map(cat => (
                                <Tab key={cat.category_id} eventKey={cat.name} title={cat.name} />
                            ))}
                        </Tabs>
                        <Row className="mb-3">
                            <Col xs={12} md={4}>
                                <Form.Control
                                    type="text"
                                    placeholder="輸入編號或組合名稱搜尋"
                                    value={therapyBundleSearch}
                                    onChange={(e) => setTherapyBundleSearch(e.target.value)}
                                />
                            </Col>
                            <Col xs={12} md={3} className="mt-2 mt-md-0">
                                <Form.Select value={therapyBundleStoreFilter} onChange={(e) => setTherapyBundleStoreFilter(e.target.value)}>
                                    <option value="">所有分店</option>
                                    {stores.map(store => (
                                        <option key={store.store_id} value={store.store_id}>{store.store_name}</option>
                                    ))}
                                </Form.Select>
                            </Col>
                            <Col xs={12} md={2} className="mt-2 mt-md-0">
                                <Form.Select value={therapyBundleStatus} onChange={(e) => setTherapyBundleStatus(e.target.value as 'PUBLISHED' | 'UNPUBLISHED')}>
                                    <option value="PUBLISHED">上架中</option>
                                    <option value="UNPUBLISHED">下架中</option>
                                </Form.Select>
                            </Col>
                        </Row>
                        <Table striped bordered hover responsive>
                            <thead>
                                <tr>
                                    <th>編號</th>
                                    <th>項目 (組合名稱)</th>
                                    <th>組合內容</th>
                                    <th>限定分店</th>
                                    <th>限定身份</th>
                                    <th>售價</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {therapyBundleLoading ? (
                                    <tr><td colSpan={7} className="text-center py-5"><Spinner animation="border" variant="info"/></td></tr>
                                ) : filteredTherapyBundles.length > 0 ? (
                                    filteredTherapyBundles.map(bundle => (
                                        <tr key={bundle.bundle_id}>
                                            <td className="align-middle">{bundle.bundle_code}</td>
                                            <td className="align-middle">{bundle.name}</td>
                                            <td className="align-middle">{bundle.bundle_contents || '---'}</td>
                                            <td className="align-middle">
                                                {bundle.visible_store_ids && bundle.visible_store_ids.length > 0
                                                    ? bundle.visible_store_ids
                                                        .map(id => stores.find(s => s.store_id === id)?.store_name || id)
                                                        .join(', ')
                                                    : '---'}
                                            </td>
                                            <td className="align-middle">{formatViewerRoles(bundle.visible_permissions)}</td>
                                            <td className="align-middle">{formatPriceDisplay(bundle.price_tiers, bundle.selling_price, activeTherapyBundleIdentity)}</td>
                                            <td className="align-middle">
                                                <Button variant="link" onClick={() => handleShowEditTherapyBundleModal(bundle)}>修改</Button>
                                                {therapyBundleStatus === 'PUBLISHED' ? (
                                                    <Button
                                                        variant="link"
                                                        className="text-orange"
                                                        onClick={() => {
                                                            if (window.confirm(`確定要下架「${bundle.name}」嗎？`)) {
                                                                handleUnpublishTherapyBundle(bundle.bundle_id);
                                                            }
                                                        }}
                                                    >
                                                        下架
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        variant="link"
                                                        className="text-success"
                                                        onClick={() => {
                                                            if (window.confirm(`確定要上架「${bundle.name}」嗎？`)) {
                                                                handlePublishTherapyBundle(bundle.bundle_id);
                                                            }
                                                        }}
                                                    >
                                                        上架
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="link"
                                                    className="text-danger"
                                                    onClick={() => {
                                                        if (window.confirm(`確定要刪除「${bundle.name}」嗎？`)) {
                                                            handleDeleteTherapyBundle(bundle.bundle_id);
                                                        }
                                                    }}
                                                >
                                                    刪除
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan={7} className="text-center text-muted py-5">尚無資料</td></tr>
                                )}
                            </tbody>
                        </Table>
                    </>
                )}

                {activeTab === 'product' && (
                    <>
                        <Tabs activeKey={activeProductIdentity} onSelect={(k) => setActiveProductIdentity((k as MemberIdentity | 'all') || 'all')} className="mb-3">
                            <Tab eventKey="all" title="全部" />
                            {availableIdentityOptions.map(option => (
                                <Tab key={`product-identity-${option.value}`} eventKey={option.value} title={option.label} />
                            ))}
                        </Tabs>
                        <Tabs activeKey={activeProductCategory} onSelect={(k) => setActiveProductCategory(k || 'all')} className="mb-3">
                            <Tab eventKey="all" title="全部" />
                            {productCategories.map(cat => (
                                <Tab key={cat.category_id} eventKey={cat.name} title={cat.name} />
                            ))}
                        </Tabs>
                        <Row className="mb-3">
                            <Col xs={12} md={4}>
                                <Form.Control
                                    type="text"
                                    placeholder="輸入產品編號或名稱搜尋"
                                    value={productSearch}
                                    onChange={(e) => setProductSearch(e.target.value)}
                                />
                            </Col>
                            <Col xs={12} md={3} className="mt-2 mt-md-0">
                                <Form.Select value={productStoreFilter} onChange={(e) => setProductStoreFilter(e.target.value)}>
                                    <option value="">所有分店</option>
                                    {stores.map(store => (
                                        <option key={store.store_id} value={store.store_id}>{store.store_name}</option>
                                    ))}
                                </Form.Select>
                            </Col>
                            <Col xs={12} md={2} className="mt-2 mt-md-0">
                                <Form.Select value={productStatus} onChange={(e) => setProductStatus(e.target.value as 'PUBLISHED' | 'UNPUBLISHED')}>
                                    <option value="PUBLISHED">上架中</option>
                                    <option value="UNPUBLISHED">下架中</option>
                                </Form.Select>
                            </Col>
                        </Row>
                        <Table striped bordered hover responsive>
                            <thead>
                                <tr>
                                    <th>產品編號</th>
                                    <th>項目名稱</th>
                                    <th>限定分店</th>
                                    <th>限定身份</th>
                                    <th>售價</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {productLoading ? (
                                    <tr><td colSpan={6} className="text-center py-5"><Spinner animation="border" variant="info"/></td></tr>
                                ) : filteredProducts.length > 0 ? (
                                    filteredProducts.map(product => (
                                        <tr key={product.product_id}>
                                            <td className="align-middle">{product.product_code}</td>
                                            <td className="align-middle">{product.product_name}</td>
                                            <td className="align-middle">
                                                {product.visible_store_ids && product.visible_store_ids.length > 0
                                                    ? product.visible_store_ids
                                                        .map(id => stores.find(s => s.store_id === id)?.store_name || id)
                                                        .join(', ')
                                                    : '---'}
                                            </td>
                                            <td className="align-middle">{formatViewerRoles(product.visible_permissions)}</td>
                                            <td className="align-middle">{formatPriceDisplay(product.price_tiers, resolveGeneralPrice(product.price_tiers), activeProductIdentity)}</td>
                                            <td className="align-middle">
                                                <Button variant="link" onClick={() => handleShowEditProductModal(product)}>修改</Button>
                                                {productStatus === 'PUBLISHED' ? (
                                                    <Button
                                                        variant="link"
                                                        className="text-orange"
                                                        onClick={() => {
                                                            if (window.confirm(`確定要下架「${product.product_name}」嗎？`)) {
                                                                handleUnpublishProduct(product.product_id);
                                                            }
                                                        }}
                                                    >
                                                        下架
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        variant="link"
                                                        className="text-success"
                                                        onClick={() => {
                                                            if (window.confirm(`確定要上架「${product.product_name}」嗎？`)) {
                                                                handlePublishProduct(product.product_id);
                                                            }
                                                        }}
                                                    >
                                                        上架
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="link"
                                                    className="text-danger"
                                                    onClick={() => {
                                                        if (window.confirm(`確定要刪除「${product.product_name}」嗎？`)) {
                                                            handleDeleteProduct(product.product_id);
                                                        }
                                                    }}
                                                >
                                                    刪除
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan={6} className="text-center text-muted py-5">尚無資料</td></tr>
                                )}
                            </tbody>
                        </Table>
                    </>
                )}

                {activeTab === 'therapy' && (
                    <>
                        <Tabs activeKey={activeTherapyIdentity} onSelect={(k) => setActiveTherapyIdentity((k as MemberIdentity | 'all') || 'all')} className="mb-3">
                            <Tab eventKey="all" title="全部" />
                            {availableIdentityOptions.map(option => (
                                <Tab key={`therapy-identity-${option.value}`} eventKey={option.value} title={option.label} />
                            ))}
                        </Tabs>
                        <Tabs activeKey={activeTherapyCategory} onSelect={(k) => setActiveTherapyCategory(k || 'all')} className="mb-3">
                            <Tab eventKey="all" title="全部" />
                            {therapyCategories.map(cat => (
                                <Tab key={cat.category_id} eventKey={cat.name} title={cat.name} />
                            ))}
                        </Tabs>
                        <Row className="mb-3">
                            <Col xs={12} md={4}>
                                <Form.Control
                                    type="text"
                                    placeholder="輸入療程編號或名稱搜尋"
                                    value={therapySearch}
                                    onChange={(e) => setTherapySearch(e.target.value)}
                                />
                            </Col>
                            <Col xs={12} md={3} className="mt-2 mt-md-0">
                                <Form.Select value={therapyStoreFilter} onChange={(e) => setTherapyStoreFilter(e.target.value)}>
                                    <option value="">所有分店</option>
                                    {stores.map(store => (
                                        <option key={store.store_id} value={store.store_id}>{store.store_name}</option>
                                    ))}
                                </Form.Select>
                            </Col>
                            <Col xs={12} md={2} className="mt-2 mt-md-0">
                                <Form.Select value={therapyStatus} onChange={(e) => setTherapyStatus(e.target.value as 'PUBLISHED' | 'UNPUBLISHED')}>
                                    <option value="PUBLISHED">上架中</option>
                                    <option value="UNPUBLISHED">下架中</option>
                                </Form.Select>
                            </Col>
                        </Row>
                        <Table striped bordered hover responsive>
                            <thead>
                                <tr>
                                    <th>療程編號</th>
                                    <th>項目名稱</th>
                                    <th>限定分店</th>
                                    <th>限定身份</th>
                                    <th>售價</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {therapyLoading ? (
                                    <tr><td colSpan={6} className="text-center py-5"><Spinner animation="border" variant="info"/></td></tr>
                                ) : filteredTherapies.length > 0 ? (
                                    filteredTherapies.map(therapy => (
                                        <tr key={therapy.therapy_id}>
                                            <td className="align-middle">{therapy.code}</td>
                                            <td className="align-middle">{therapy.name}</td>
                                            <td className="align-middle">
                                                {therapy.visible_store_ids && therapy.visible_store_ids.length > 0
                                                    ? therapy.visible_store_ids
                                                        .map(id => stores.find(s => s.store_id === id)?.store_name || id)
                                                        .join(', ')
                                                    : '---'}
                                            </td>
                                            <td className="align-middle">{formatViewerRoles(therapy.visible_permissions)}</td>
                                            <td className="align-middle">{formatPriceDisplay(therapy.price_tiers, therapy.price, activeTherapyIdentity)}</td>
                                            <td className="align-middle">
                                                <Button variant="link" onClick={() => handleShowEditTherapyModal(therapy)}>修改</Button>
                                                {therapyStatus === 'PUBLISHED' ? (
                                                    <Button
                                                        variant="link"
                                                        className="text-orange"
                                                        onClick={() => {
                                                            if (window.confirm(`確定要下架「${therapy.name}」嗎？`)) {
                                                                handleUnpublishTherapy(therapy.therapy_id);
                                                            }
                                                        }}
                                                    >
                                                        下架
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        variant="link"
                                                        className="text-success"
                                                        onClick={() => {
                                                            if (window.confirm(`確定要上架「${therapy.name}」嗎？`)) {
                                                                handlePublishTherapy(therapy.therapy_id);
                                                            }
                                                        }}
                                                    >
                                                        上架
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="link"
                                                    className="text-danger"
                                                    onClick={() => {
                                                        if (window.confirm(`確定要刪除「${therapy.name}」嗎？`)) {
                                                            handleDeleteTherapy(therapy.therapy_id);
                                                        }
                                                    }}
                                                >
                                                    刪除
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan={6} className="text-center text-muted py-5">尚無資料</td></tr>
                                )}
                            </tbody>
                        </Table>
                    </>
                )}
            </Container>
        </>
    );

    return (
        <>
            <Header />
            <DynamicContainer content={content} />
            <BundleCreateModal
                show={showModal}
                onHide={handleCloseModal}
                onSaveSuccess={fetchBundles}
                editingBundle={editingBundle}
            />
            <TherapyBundleModal
                show={showTherapyBundleModal}
                onHide={handleCloseTherapyBundleModal}
                onSaveSuccess={fetchTherapyBundlesData}
                editingBundle={editingTherapyBundle}
            />
            <AddTherapyModal
                show={showTherapyModal}
                onHide={handleCloseTherapyModal}
                editingTherapy={editingTherapy}
                stores={stores}
            />
            <AddProductModal
                show={showProductModal}
                onHide={handleCloseProductModal}
                editingProduct={editingProduct}
                stores={stores}
            />
            <AddCategoryModal
                show={showCategoryModal}
                onHide={handleCloseCategoryModal}
            />
            <DeleteCategoryModal
                show={showDeleteCategoryModal}
                onHide={handleCloseDeleteCategoryModal}
            />
        </>
    );
};

export default ProductBundleManagement;
