import React, { useState } from 'react';
import { Container, Form, Button, Alert, Card, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
// vvvvv 引入我們新建的 StoreService vvvvv
import { addStore } from '../../services/StoreService';

const AddStore: React.FC = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        store_name: '',
        store_location: '',
        account: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        if (!formData.password || formData.password.length < 6) {
            setError("密碼長度至少需要 6 個字元");
            setLoading(false);
            return;
        }

        const result = await addStore(formData);

        if (result.success) {
            setSuccess(`分店 "${formData.store_name}" 新增成功！`);
            setTimeout(() => {
                navigate('/backend');
            }, 2000);
        } else {
            setError(result.message || "新增失敗，請稍後再試");
        }
        setLoading(false);
    };

    return (
        <>
            <Header title="建立新的分店帳號 1.2.6.4.1" />
            <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: 'calc(100vh - 56px)' }}>
                <Card style={{ width: '100%', maxWidth: '600px' }}>
                    <Card.Body className="p-4">
                        <h2 className="text-center mb-4">建立新的分店帳號</h2>
                        
                        {error && <Alert variant="danger">{error}</Alert>}
                        {success && <Alert variant="success">{success}</Alert>}

                        <Form onSubmit={handleSubmit}>
                            <Form.Group as={Row} className="mb-3" controlId="storeName">
                                <Form.Label column sm={3}>分店名稱</Form.Label>
                                <Col sm={9}>
                                    <Form.Control
                                        type="text"
                                        name="store_name"
                                        value={formData.store_name}
                                        onChange={handleChange}
                                        required
                                    />
                                </Col>
                            </Form.Group>

                            <Form.Group as={Row} className="mb-3" controlId="storeLocation">
                                <Form.Label column sm={3}>分店地址</Form.Label>
                                <Col sm={9}>
                                    <Form.Control
                                        type="text"
                                        name="store_location"
                                        value={formData.store_location}
                                        onChange={handleChange}
                                    />
                                </Col>
                            </Form.Group>

                            <hr className="my-4" />

                            <Form.Group as={Row} className="mb-3" controlId="account">
                                <Form.Label column sm={3}>登入帳號</Form.Label>
                                <Col sm={9}>
                                    <Form.Control
                                        type="text"
                                        name="account"
                                        value={formData.account}
                                        onChange={handleChange}
                                        required
                                    />
                                </Col>
                            </Form.Group>

                            <Form.Group as={Row} className="mb-3" controlId="password">
                                <Form.Label column sm={3}>登入密碼</Form.Label>
                                <Col sm={9}>
                                    <Form.Control
                                        type="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        required
                                        minLength={6}
                                    />
                                </Col>
                            </Form.Group>

                            <div className="d-grid gap-2 d-md-flex justify-content-md-end mt-4">
                                <Button variant="info" className="text-white" onClick={() => navigate('/backend')}>
                                    取消
                                </Button>
                                <Button variant="info" className="text-white" type="submit" disabled={loading}>
                                    {loading ? '儲存中...' : '確認'}
                                </Button>
                            </div>
                        </Form>
                    </Card.Body>
                </Card>
            </Container>
        </>
    );
};

export default AddStore;