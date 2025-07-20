import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Container, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Header from '../../../components/Header';
import DynamicContainer from '../../../components/DynamicContainer';
import BundleCreateModal from './BundleCreateModal';
import AddTherapyModal from './AddTherapyModal';
import AddProductModal from './AddProductModal';
import { fetchAllBundles, deleteBundle, Bundle } from '../../../services/ProductBundleService';

const ProductBundleManagement: React.FC = () => {
    const [bundles, setBundles] = useState<Bundle[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [editingBundle, setEditingBundle] = useState<Bundle | null>(null);
    const [showTherapyModal, setShowTherapyModal] = useState(false);
    const [showProductModal, setShowProductModal] = useState(false);
    const navigate = useNavigate();

    const fetchBundles = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchAllBundles();
            setBundles(data);
        } catch (err: any) {
            setError(err.response?.data?.error || '無法獲取組合列表');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBundles();
    }, [fetchBundles]);

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

    const handleDelete = async (bundleId: number) => {
        setSuccessMessage(null); // 清除舊的成功訊息
        try {
            await deleteBundle(bundleId);
            setSuccessMessage('刪除成功！');
            fetchBundles(); // 重新載入列表
        } catch (err) {
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
                <Table striped bordered hover responsive>
                    <thead>
                        <tr>
                            <th>編號</th>
                            <th>項目 (組合名稱)</th>
                            <th>組合內容</th>
                            <th>售價</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5} className="text-center py-5"><Spinner animation="border" variant="info"/></td></tr>
                        ) : bundles.length > 0 ? (
                            bundles.map(bundle => (
                                <tr key={bundle.bundle_id}>
                                    <td className="align-middle">{bundle.bundle_code}</td>
                                    <td className="align-middle">{bundle.name}</td>
                                    <td className="align-middle">{bundle.bundle_contents || '---'}</td>
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
                            <tr><td colSpan={5} className="text-center text-muted py-5">尚無資料</td></tr>
                        )}
                    </tbody>
                </Table>
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
                onHide={() => setShowTherapyModal(false)}
            />
            <AddProductModal
                show={showProductModal}
                onHide={() => setShowProductModal(false)}
            />
        </>
    );
};

export default ProductBundleManagement;
