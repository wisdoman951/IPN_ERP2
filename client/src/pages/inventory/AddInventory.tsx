import { useState } from "react";
import { Button, Form, Row, Col } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import IconButton from "../../components/IconButton";

const AddInventory = () => {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        item: "",
        stockIn: "",
        stockOut: "",
        borrowed: "",
        borrowerName: "",
        remark: "",
    });

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setForm({ ...form, [name]: value });
    };

    return (
        <div className="d-flex flex-column min-vh-100 bg-white">
            {/* Header */}
            <header className="d-flex justify-content-between align-items-center bg-info px-4 py-3 app-header">
                <h1 className="text-white fw-bold fs-3 m-0">新增庫存數據</h1>
                <div className="d-flex gap-3">
                    <IconButton.HomeButton onClick={() => navigate("/")} />
                    <IconButton.CloseButton onClick={() => navigate(-1)} />
                </div>
            </header>

            {/* Form */}
            <Col xs={12} md={9} className="p-5 ms-auto">
                <Form>
                    <Row>
                        {/* 左欄 */}
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>品項</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="item"
                                    value={form.item}
                                    onChange={handleChange}
                                />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>進貨</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="stockIn"
                                    value={form.stockIn}
                                    onChange={handleChange}
                                />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>出貨</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="stockOut"
                                    value={form.stockOut}
                                    onChange={handleChange}
                                />
                            </Form.Group>
                        </Col>

                        {/* 右欄 */}
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>借貨</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="borrowed"
                                    value={form.borrowed}
                                    onChange={handleChange}
                                />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>借貨人姓名</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="borrowerName"
                                    value={form.borrowerName}
                                    onChange={handleChange}
                                />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>備註</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="remark"
                                    value={form.remark}
                                    onChange={handleChange}
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    {/* 下方按鈕 */}
                    <div className="d-flex justify-content-end gap-3 mt-4">
                        <Button variant="info" className="text-white px-4">確認</Button>
                        <Button variant="info" className="text-white px-4" onClick={() => navigate(-1)}>取消</Button>
                        <Button variant="info" className="text-white px-4">列印</Button>
                    </div>
                </Form>
            </Col>
        </div>
    );
};

export default AddInventory;
