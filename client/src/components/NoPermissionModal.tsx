import React from 'react';
import { Modal, Button } from 'react-bootstrap';

interface NoPermissionModalProps {
  show: boolean;
  onHide: () => void;
  message?: string;
}

const NoPermissionModal: React.FC<NoPermissionModalProps> = ({ show, onHide, message = '無操作權限' }) => {
  return (
    <Modal show={show} onHide={onHide} centered backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>提示</Modal.Title>
      </Modal.Header>
      <Modal.Body className="text-center fs-5">
        {message}
      </Modal.Body>
      <Modal.Footer className="justify-content-center">
        <Button variant="info" className="text-white px-4" onClick={onHide}>
          確認
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default NoPermissionModal;
