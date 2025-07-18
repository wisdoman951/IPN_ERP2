import React from "react";
import { Button, Container, Row, Col, Form, Table } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import IconButton from "../../components/IconButton";

const InventoryAnalysis: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="d-flex flex-column min-vh-100 bg-white">
            {/* Header */}
            <header className="d-flex justify-content-between align-items-center bg-info px-4 py-3 app-header">
                <h1 className="text-white fw-bold fs-3 m-0">庫存分析 1.1.4.2</h1>
                <div className="d-flex gap-3">
                    <IconButton.HomeButton onClick={() => navigate('/')} />
                    <IconButton.CloseButton onClick={() => navigate(-1)} />
                </div>
            </header>

            <Container className="my-4">
                <Col xs={9} className="ms-auto">
                
                {/* 搜尋欄位 */}
                <Row className="align-items-center mb-3">
                    <Col xs="auto">
                        <Form.Label className="fw-semibold">品項</Form.Label>
                    </Col>
                    <Col xs={12} md={4}>
                        <Form.Control type="text" placeholder="" />
                    </Col>
                    <Col xs="auto">
                        <Button variant="info" className="text-white px-4">
                            搜尋
                        </Button>
                    </Col>
                </Row>

                {/* 提示文字 */}
                <Row className="mb-3">
                    <Col className="text-danger fw-semibold text-end">
                        資料連動總部出貨、分店銷售
                    </Col>
                </Row>

                {/* 表格 */}
                <Row>
                    <Col>
                        <Table bordered hover responsive>
                            <thead className="text-center">
                                <tr>
                                    <th>勾選</th>
                                    <th>預警門檻</th>
                                    <th>出售量分析</th>
                                    <th>滯銷品分析</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td colSpan={5} className="text-center text-muted py-5">
                                        尚無資料
                                    </td>
                                </tr>
                            </tbody>
                        </Table>
                    </Col>
                </Row>

                {/* 下方按鈕 */}
                <Row className="justify-content-center my-4 g-3">
                    <Col xs="auto" className="ms-auto">
                        <Button variant="info" className="text-white px-4">報表匯出</Button>
                    </Col>
                    <Col xs="auto">
                        <Button variant="info" className="text-white px-4">刪除</Button>
                    </Col>
                    <Col xs="auto">
                        <Button variant="info" className="text-white px-4">修改</Button>
                    </Col>
                    <Col xs="auto">
                        <Button variant="info" className="text-white px-4">確認</Button>
                    </Col>
                </Row>
                </Col>
            </Container>
        </div>
    );
};

export default InventoryAnalysis;
