import React from 'react';
import { Container, Button, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import DynamicContainer from '../components/DynamicContainer';
import { getStoreName, getStoreLevel } from '../services/AuthUtils';
import { formatStoreName } from '../utils/authUtils';

/**
 * 無權限頁面
 * 當用戶嘗試訪問沒有權限的頁面時顯示
 */
const Unauthorized: React.FC = () => {
  const navigate = useNavigate();
  const rawName = getStoreName();
  const storeLevel = getStoreLevel();
  const storeName = rawName ? formatStoreName(rawName, storeLevel || undefined) : null;

  const content = (
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

  return (
    <div className="d-flex flex-column min-vh-100 bg-white">
      <Header />
      <DynamicContainer content={content} />
    </div>
  );
};

export default Unauthorized; 
