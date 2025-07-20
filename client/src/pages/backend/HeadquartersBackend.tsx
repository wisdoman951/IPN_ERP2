import React from 'react';
import { Container, Row, Col, Button, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import DynamicContainer from '../../components/DynamicContainer';
import { getUserRole } from '../../utils/authUtils';

const HeadquartersBackend: React.FC = () => {
    const navigate = useNavigate();
    const userRole = getUserRole();

    // 將主要內容打包到 content 變數中
    const content = (
        <Container className="mt-5">
            <Card className="text-center shadow-sm">
                <Card.Header as="h4">後台功能選單</Card.Header>
                <Card.Body className="p-5">
                    <Row className="g-4">
                        <Col md={6}>
                            <Button variant="info" size="lg" className="w-100 py-4 text-white" onClick={() => navigate('/backend/staff')}>員工資料管理</Button>
                        </Col>
                        {userRole === 'admin' && (
                            <>
                                <Col md={6}>
                                    <Button variant="info" size="lg" className="w-100 py-4 text-white" onClick={() => navigate('/backend/user-accounts')}>使用者帳號管理</Button>
                                </Col>
                                <Col md={6}>
                                    <Button variant="info" size="lg" className="w-100 py-4 text-white" onClick={() => navigate('/backend/product-bundles')} >產品療程管理</Button>
                                </Col>
                                <Col md={6}>
                                    <Button variant="info" size="lg" className="w-100 py-4 text-white" onClick={() => navigate("/backend/stores")}>分店管理</Button>
                                </Col>
                            </>
                        )}
                        {/* ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ */}
                    </Row>
                </Card.Body>
            </Card>
        </Container>
    );

    // 使用標準的 Header + DynamicContainer 結構來渲染頁面
    return (
        <>
            <Header />
            <DynamicContainer content={content} />
        </>
    );
};

export default HeadquartersBackend;
