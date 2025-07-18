import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Alert, Card } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import { resetPassword } from '../services/LoginService';

const ResetPassword: React.FC = () => {
  const [account, setAccount] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // 從 URL 參數中獲取 token 和 account
    const queryParams = new URLSearchParams(location.search);
    const tokenParam = queryParams.get('token');
    const accountParam = queryParams.get('account');
    
    if (tokenParam) setToken(tokenParam);
    if (accountParam) setAccount(accountParam);
  }, [location]);

  const validateForm = (): boolean => {
    if (!token || !account || !newPassword || !confirmPassword) {
      setMessage('所有欄位都是必填的');
      return false;
    }
    
    if (newPassword.length < 8) {
      setMessage('密碼長度必須至少為8個字符');
      return false;
    }
    
    if (newPassword !== confirmPassword) {
      setMessage('密碼和確認密碼不匹配');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      await resetPassword(token, account, newPassword);
      setIsSuccess(true);
      setMessage('密碼已成功重置');
      // 重置後清空表單
      setNewPassword('');
      setConfirmPassword('');
      
      // 3秒後導航到登入頁面
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (error: any) {
      setIsSuccess(false);
      setMessage(error.response?.data?.message || '密碼重置失敗，請稍後再試');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
      <Card style={{ width: '450px' }}>
        <Card.Body>
          <Card.Title className="text-center mb-4">重置密碼</Card.Title>
          
          {message && (
            <Alert variant={isSuccess ? 'success' : 'danger'}>
              {message}
              {isSuccess && (
                <div className="mt-2">
                  將在3秒內自動跳轉到登入頁面...
                </div>
              )}
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3" controlId="formAccount">
              <Form.Label>帳號</Form.Label>
              <Form.Control
                type="text"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                disabled={!!account || isLoading || isSuccess}
                placeholder="請輸入您的帳號"
              />
            </Form.Group>
            
            <Form.Group className="mb-3" controlId="formToken">
              <Form.Label>重置令牌</Form.Label>
              <Form.Control
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                disabled={!!token || isLoading || isSuccess}
                placeholder="請輸入重置令牌"
              />
              <Form.Text className="text-muted">
                令牌應該包含在重置連結的URL中
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3" controlId="formNewPassword">
              <Form.Label>新密碼</Form.Label>
              <Form.Control
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isLoading || isSuccess}
                placeholder="請輸入新密碼"
              />
              <Form.Text className="text-muted">
                密碼長度至少8個字符
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3" controlId="formConfirmPassword">
              <Form.Label>確認新密碼</Form.Label>
              <Form.Control
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading || isSuccess}
                placeholder="請再次輸入新密碼"
              />
            </Form.Group>

            <div className="d-grid gap-2">
              <Button 
                variant="primary" 
                type="submit" 
                disabled={isLoading || isSuccess}
              >
                {isLoading ? '處理中...' : '重置密碼'}
              </Button>
              
              <Button 
                variant="outline-secondary" 
                onClick={() => navigate('/')}
                disabled={isLoading}
              >
                返回登入頁面
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ResetPassword; 