import React, { useState } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';
import { addCategory } from '../../../services/CategoryService';

interface Props {
  show: boolean;
  onHide: () => void;
}

const AddCategoryModal: React.FC<Props> = ({ show, onHide }) => {
  const [name, setName] = useState('');
  const [targetType, setTargetType] = useState<'product' | 'therapy' | 'product_bundle' | 'therapy_bundle'>('product');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addCategory({ name, target_type: targetType });
      setName('');
      onHide();
    } catch (err) {
      alert('新增分類失敗');
    }
  };

  return (
    <Modal show={show} onHide={onHide}>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>新增分類</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>分類名稱</Form.Label>
            <Form.Control value={name} onChange={e => setName(e.target.value)} />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>分類類型</Form.Label>
            <Form.Select value={targetType} onChange={e => setTargetType(e.target.value as any)}>
              <option value="product">商品</option>
              <option value="therapy">療程</option>
              <option value="product_bundle">產品組合</option>
              <option value="therapy_bundle">療程組合</option>
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="info" className="text-white" onClick={onHide}>取消</Button>
          <Button variant="info" className="text-white" type="submit">新增</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default AddCategoryModal;
