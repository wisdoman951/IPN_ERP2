import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Container, Alert, Spinner, Row, Col, Tabs, Tab } from 'react-bootstrap';
import Header from '../../../components/Header';
import DynamicContainer from '../../../components/DynamicContainer';
import BundleCreateModal from './BundleCreateModal';
import AddTherapyModal from './AddTherapyModal';
import AddProductModal from './AddProductModal';
import { fetchAllBundles, deleteBundle, fetchProductsForDropdown, fetchTherapiesForDropdown, Bundle, Product as ProductItem, Therapy as TherapyItem } from '../../../services/ProductBundleService';
import { fetchAllStores, Store } from '../../../services/StoreService';

const ProductBundleManagement: React.FC = () => {
    const [bundles, setBundles] = useState<Bundle[]>([]);
    const [products, setProducts] = useState<ProductItem[]>([]);
    const [therapies, setTherapies] = useState<TherapyItem[]>([]);
    const [bundleLoading, setBundleLoading] = useState(true);
    const [productLoading, setProductLoading] = useState(true);
    const [therapyLoading, setTherapyLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [editingBundle, setEditingBundle] = useState<Bundle | null>(null);
    const [showTherapyModal, setShowTherapyModal] = useState(false);
    const [showProductModal, setShowProductModal] = useState(false);
    const [stores, setStores] = useState<Store[]>([]);
    const [activeTab, setActiveTab] = useState<'bundle' | 'product' | 'therapy'>('bundle');

    const fetchBundles = useCallback(async () => {
        setBundleLoading(true);
        setError(null);
        try {
            const data = await fetchAllBundles();
            setBundles(data);
        } catch (err: unknown) {
            const error = err as { response?: { data?: { error?: string } } };
            setError(error.response?.data?.error || '無法獲取組合列表');
        } finally {
            setBundleLoading(false);
        }
    }, []);

    const fetchProducts = useCallback(async () => {
        setProductLoading(true);
        try {
            const data = await fetchProductsForDropdown();
            setProducts(data);
        } catch (err: unknown) {
            const error = err as { response?: { data?: { error?: string } } };
            setError(error.response?.data?.error || '無法獲取產品列表');
        } finally {
            setProductLoading(false);
        }
    }, []);

    const fetchTherapies = useCallback(async () => {
        setTherapyLoading(true);
        try {
            const data = await fetchTherapiesForDropdown();
            setTherapies(data);
        } catch (err: unknown) {
            const error = err as { response?: { data?: { error?: string } } };
            setError(error.response?.data?.error || '無法獲取療程列表');
        } finally {
            setTherapyLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBundles();
        fetchProducts();
        fetchTherapies();
    }, [fetchBundles, fetchProducts, fetchTherapies]);

    useEffect(() => {
        fetchAllStores().then(setStores).catch(() => {});
    }, []);

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
        setShowTherapyModal(true);
    };

    const handleShowProductModal = () => {
        setShowProductModal(true);
    };

    const handleCloseTherapyModal = () => {
        setShowTherapyModal(false);
        fetchTherapies();
    };

    const handleCloseProductModal = () => {
        setShowProductModal(false);
        fetchProducts();
    };

    const handleDelete = async (bundleId: number) => {
        setSuccessMessage(null); // 清除舊的成功訊息
        try {
            await deleteBundle(bundleId);
            setSuccessMessage('刪除成功！');
            fetchBundles(); // 重新載入列表
        } catch {
            setError('刪除失敗，請稍後再試。');
        }
        // 讓成功訊息顯示幾秒後自動消失
        setTimeout(() => setSuccessMessage(null), 3000);
    };

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
                            新增組合
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
                            onClick={handleShowProductModal}
                        >
                            新增產品
                        </Button>
                    </Col>
                </Row>
            </Container>

            {error && <Container><Alert variant="danger">{error}</Alert></Container>}
            {successMessage && <Container><Alert variant="success">{successMessage}</Alert></Container>}

            <Container>
                <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab((k as 'bundle' | 'product' | 'therapy') || 'bundle')} className="mb-3">
                    <Tab eventKey="bundle" title="組合" />
                    <Tab eventKey="product" title="產品" />
                    <Tab eventKey="therapy" title="療程" />
                </Tabs>

                {activeTab === 'bundle' && (
                    <Table striped bordered hover responsive>
                        <thead>
                            <tr>
                                <th>編號</th>
                                <th>項目 (組合名稱)</th>
                                <th>組合內容</th>
                                <th>限定分店</th>
                                <th>售價</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bundleLoading ? (
                                <tr><td colSpan={6} className="text-center py-5"><Spinner animation="border" variant="info"/></td></tr>
                            ) : bundles.length > 0 ? (
                                bundles.map(bundle => (
                                    <tr key={bundle.bundle_id}>
                                        <td className="align-middle">{bundle.bundle_code}</td>
                                        <td className="align-middle">{bundle.name}</td>
                                        <td className="align-middle">{bundle.bundle_contents || '---'}</td>
                                        <td className="align-middle">{
                                            bundle.visible_store_ids && bundle.visible_store_ids.length > 0
                                                ? bundle.visible_store_ids
                                                    .map(id => stores.find(s => s.store_id === id)?.store_name || id)
                                                    .join(', ')
                                                : '---'
                                        }</td>
                                        <td className="align-middle">{`$${Number(bundle.selling_price).toLocaleString()}`}</td>
                                        <td className="align-middle">
                                            <Button variant="link" onClick={() => handleShowEditModal(bundle)}>修改</Button>
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
                                <tr><td colSpan={6} className="text-center text-muted py-5">尚無資料</td></tr>
                            )}
                        </tbody>
                    </Table>
                )}

                {activeTab === 'product' && (
                    <Table striped bordered hover responsive>
                        <thead>
                            <tr>
                                <th>編號</th>
                                <th>項目名稱</th>
                                <th>售價</th>
                            </tr>
                        </thead>
                        <tbody>
                            {productLoading ? (
                                <tr><td colSpan={3} className="text-center py-5"><Spinner animation="border" variant="info"/></td></tr>
                            ) : products.length > 0 ? (
                                products.map(product => (
                                    <tr key={product.product_id}>
                                        <td className="align-middle">{product.product_id}</td>
                                        <td className="align-middle">{product.product_name}</td>
                                        <td className="align-middle">{`$${Number(product.product_price).toLocaleString()}`}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={3} className="text-center text-muted py-5">尚無資料</td></tr>
                            )}
                        </tbody>
                    </Table>
                )}

                {activeTab === 'therapy' && (
                    <Table striped bordered hover responsive>
                        <thead>
                            <tr>
                                <th>編號</th>
                                <th>項目名稱</th>
                                <th>售價</th>
                            </tr>
                        </thead>
                        <tbody>
                            {therapyLoading ? (
                                <tr><td colSpan={3} className="text-center py-5"><Spinner animation="border" variant="info"/></td></tr>
                            ) : therapies.length > 0 ? (
                                therapies.map(therapy => (
                                    <tr key={therapy.therapy_id}>
                                        <td className="align-middle">{therapy.therapy_id}</td>
                                        <td className="align-middle">{therapy.name}</td>
                                        <td className="align-middle">{`$${Number(therapy.price).toLocaleString()}`}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={3} className="text-center text-muted py-5">尚無資料</td></tr>
                            )}
                        </tbody>
                    </Table>
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
            <AddTherapyModal
                show={showTherapyModal}
                onHide={handleCloseTherapyModal}
            />
            <AddProductModal
                show={showProductModal}
                onHide={handleCloseProductModal}
            />
        </>
    );
};

export default ProductBundleManagement;
