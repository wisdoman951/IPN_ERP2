import React, { useState, useEffect } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';
import { addTherapy, updateTherapy } from '../../../services/TherapyService';
import { Therapy } from '../../../services/ProductBundleService';

interface AddTherapyModalProps {
    show: boolean;
    onHide: () => void;
    editingTherapy?: Therapy | null;
}

const AddTherapyModal: React.FC<AddTherapyModalProps> = ({ show, onHide, editingTherapy }) => {
    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');

    useEffect(() => {
        if (editingTherapy) {
            setCode(editingTherapy.code);
            setName(editingTherapy.name);
            setPrice(String(editingTherapy.price));
        } else {
            setCode('');
            setName('');
            setPrice('');
        }
    }, [editingTherapy]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingTherapy) {
                await updateTherapy(editingTherapy.therapy_id, { code, name, price: Number(price) });
            } else {
                await addTherapy({ code, name, price: Number(price) });
            }
            onHide();
        } catch (err) {
            alert(editingTherapy ? '更新療程失敗' : '新增療程失敗');
        }
    };

    return (
        <Modal show={show} onHide={onHide}>
            <Modal.Header closeButton>
                <Modal.Title>{editingTherapy ? '修改療程 1.2.6.3.1.1' : '建立療程 1.2.6.3.1.1'}</Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    <Form.Group className="mb-3">
                        <Form.Label>設定編號</Form.Label>
                        <Form.Control value={code} onChange={e => setCode(e.target.value)} />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>設定療程名稱</Form.Label>
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

export default AddTherapyModal;
