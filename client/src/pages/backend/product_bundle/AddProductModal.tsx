import React, { useState } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';
import { addProduct } from '../../../services/ProductService';

interface AddProductModalProps {
    show: boolean;
    onHide: () => void;
}

const AddProductModal: React.FC<AddProductModalProps> = ({ show, onHide }) => {
    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addProduct({ code, name, price: Number(price) });
            onHide();
        } catch (err) {
            alert('新增產品失敗');
        }
    };

    return (
        <Modal show={show} onHide={onHide}>
            <Modal.Header closeButton>
                <Modal.Title>建立產品 1.2.6.3.1.1.1</Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    <Form.Group className="mb-3">
                        <Form.Label>設定編號</Form.Label>
                        <Form.Control value={code} onChange={e => setCode(e.target.value)} />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>設定產品名稱</Form.Label>
                        <Form.Control value={name} onChange={e => setName(e.target.value)} />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>設定售價</Form.Label>
                        <Form.Control type="number" min={0} value={price} onChange={e => setPrice(e.target.value)} />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="info" className="text-white" onClick={onHide}>取消</Button>
                    <Button variant="info" className="text-white" type="submit">確認儲存</Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};

export default AddProductModal;
