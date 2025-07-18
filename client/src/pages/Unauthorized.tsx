import React from 'react';
import { Container, Button, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { getStoreName, getStoreLevel } from '../services/AuthUtils';

/**
 * 無權限頁面
 * 當用戶嘗試訪問沒有權限的頁面時顯示
 */
const Unauthorized: React.FC = () => {
  const navigate = useNavigate();
  const storeName = getStoreName();
  const storeLevel = getStoreLevel();

  return (
    <Container 
      fluid
      className="d-flex flex-column justify-content-center align-items-center min-vh-100 bg-white"
    >
      <Alert variant="danger" className="text-center p-4 mb-4" style={{ maxWidth: '500px' }}>
        <Alert.Heading className="mb-3">無訪問權限</Alert.Heading>
        <p>您沒有權限訪問此頁面。</p>
        {storeName && storeLevel && (
          <p className="mt-2">
            您當前以 <strong>{storeName}</strong> ({storeLevel}) 身份登入。
          </p>
        )}
        <p className="mt-3">
          如需訪問此頁面，請聯絡系統管理員或使用具有適當權限的帳號登入。
        </p>
      </Alert>
      
      <div className="d-flex gap-3">
        <Button 
          variant="secondary" 
          onClick={() => navigate(-1)}
        >
          返回上一頁
        </Button>
        <Button 
          variant="info" 
          className="text-white"
          onClick={() => navigate('/home')}
        >
          回到首頁
        </Button>
      </div>
    </Container>
  );
};

export default Unauthorized; 