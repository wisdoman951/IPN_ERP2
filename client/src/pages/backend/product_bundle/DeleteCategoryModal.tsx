import React, { useState, useEffect } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';
import { getCategories, deleteCategory, Category } from '../../../services/CategoryService';

interface Props {
  show: boolean;
  onHide: () => void;
}

const DeleteCategoryModal: React.FC<Props> = ({ show, onHide }) => {
  const [targetType, setTargetType] = useState<'product' | 'therapy' | 'product_bundle' | 'therapy_bundle'>('product');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<number | ''>('');

  useEffect(() => {
    if (show) {
      getCategories(targetType)
        .then(data => {
          setCategories(data);
          setSelected('');
        })
        .catch(() => setCategories([]));
    }
  }, [show, targetType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    try {
      await deleteCategory(Number(selected));
      onHide();
    } catch {
      alert('刪除分類失敗');
    }
  };

  return (
    <Modal show={show} onHide={onHide}>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>刪除分類</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>分類類型</Form.Label>
            <Form.Select value={targetType} onChange={e => setTargetType(e.target.value as any)}>
              <option value="product">商品</option>
              <option value="therapy">療程</option>
              <option value="product_bundle">產品組合</option>
              <option value="therapy_bundle">療程組合</option>
            </Form.Select>
          </Form.Group>
          <Form.Group>
            <Form.Label>選擇分類</Form.Label>
            <Form.Select value={selected} onChange={e => setSelected(e.target.value ? Number(e.target.value) : '')}>
              <option value="">請選擇</option>
              {categories.filter(c => c.name !== '未歸類').map(c => (
                <option key={c.category_id} value={c.category_id}>{c.name}</option>
              ))}
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="info" className="text-white" onClick={onHide}>取消</Button>
          <Button variant="danger" type="submit" disabled={!selected}>刪除</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default DeleteCategoryModal;
