// client/src/pages/finance/FinanceDashboard.tsx

import React from 'react';
import { Container, Button, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import DynamicContainer from '../../components/DynamicContainer';

const FinanceDashboard: React.FC = () => {
    const navigate = useNavigate();

    const handleAddSalesOrder = () => {
        navigate('/finance/sales/list'); 
    };

    const content = (
        <Container className="d-flex flex-column align-items-center justify-content-center" style={{ height: '50vh' }}>
            <Row>
                <Col>
                    <Button 
                        variant="info" 
                        size="lg" 
                        className="text-white"
                        onClick={handleAddSalesOrder}
                    >
                        新增銷售單
                    </Button>
                </Col>
                {/* 如果未來有其他按鈕，可以加在 Col 旁邊 */}
            </Row>
        </Container>
    );

    return (
        <>
            <Header title="帳務管理 1.1.5" />
            <DynamicContainer content={content} />
        </>
    );
};

export default FinanceDashboard;