import React, { useState, useEffect } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';
import { addProduct, updateProduct } from '../../../services/ProductService';
import { Product as ProductItem } from '../../../services/ProductBundleService';

interface AddProductModalProps {
    show: boolean;
    onHide: () => void;
    editingProduct?: ProductItem | null;
}

const AddProductModal: React.FC<AddProductModalProps> = ({ show, onHide, editingProduct }) => {
    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');

    useEffect(() => {
        if (editingProduct) {
            setCode(editingProduct.code);
            setName(editingProduct.product_name);
            setPrice(String(editingProduct.product_price));
        } else {
            setCode('');
            setName('');
            setPrice('');
        }
    }, [editingProduct]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingProduct) {
                await updateProduct(editingProduct.product_id, { code, name, price: Number(price) });
            } else {
                await addProduct({ code, name, price: Number(price) });
            }
            onHide();
        } catch (err) {
            alert(editingProduct ? '更新產品失敗' : '新增產品失敗');
        }
    };

    return (
        <Modal show={show} onHide={onHide}>
            <Modal.Header closeButton>
                <Modal.Title>{editingProduct ? '修改產品 1.2.6.3.1.1.1' : '建立產品 1.2.6.3.1.1.1'}</Modal.Title>
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
