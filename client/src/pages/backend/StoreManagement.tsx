import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Container, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import DynamicContainer from '../../components/DynamicContainer';
import { fetchAllStores, Store } from '../../services/StoreService';

const StoreManagement: React.FC = () => {
    const navigate = useNavigate();
    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadStores = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchAllStores();
            setStores(data);
        } catch (err: any) {
            setError(err.response?.data?.error || '無法獲取分店列表');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadStores();
    }, [loadStores]);

    const content = (
        <>
            <Container className="my-4">
                <Row className="align-items-center">
                    <Col>
                        <h2 className="m-0">分店管理</h2>
                    </Col>
                    <Col className="d-flex justify-content-end">
                        <Button
                            variant="info"
                            className="text-white px-4"
                            onClick={() => navigate('/backend/add-store')}
                        >
                            新增分店
                        </Button>
                    </Col>
                </Row>
            </Container>

            {error && (
                <Container>
                    <Alert variant="danger">{error}</Alert>
                </Container>
            )}

            <Container>
                <Table striped bordered hover responsive>
                    <thead>
                        <tr>
                            <th>分店編號</th>
                            <th>分店名稱</th>
                            <th>分店地址</th>
                            <th>店型</th>
                            <th>登入帳號</th>
                            <th>權限</th>
                            <th>密碼</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={7} className="text-center py-5"><Spinner animation="border" variant="info"/></td></tr>
                        ) : stores.length > 0 ? (
                            stores.map(store => (
                                <tr key={store.store_id}>
                                    <td className="align-middle">{store.store_id}</td>
                                    <td className="align-middle">{store.store_name}</td>
                                    <td className="align-middle">{store.store_location || '---'}</td>
                                    <td className="align-middle">{store.store_type === 'FRANCHISE' ? '加盟' : '直營'}</td>
                                    <td className="align-middle">{store.account}</td>
                                    <td className="align-middle">{store.permission}</td>
                                    <td className="align-middle">********</td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan={7} className="text-center text-muted py-5">尚無分店資料</td></tr>
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
        </>
    );
};

export default StoreManagement;
