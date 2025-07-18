import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isLoggedIn, hasPermission } from '../services/AuthUtils';
import { Spinner, Container } from 'react-bootstrap';

interface ProtectedRouteProps {
  element?: React.ReactElement;
  children?: React.ReactNode;
  requiredPermission?: 'admin' | 'basic';
  adminOnly?: boolean;
}

/**
 * 受保護的路由組件
 * 如果使用者未登入或沒有所需權限，將被重定向到登入頁面
 * 
 * @param element 要渲染的React元素
 * @param children 子組件
 * @param requiredPermission 所需權限 ('admin' 或 'basic')
 * @param adminOnly 是否僅管理員可訪問
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  element,
  children, 
  requiredPermission = 'basic',
  adminOnly = false
}) => {
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasRequiredPermission, setHasRequiredPermission] = useState(false);

useEffect(() => {
  const checkAuth = async () => {
    // 測試用：直接設為已登入且有權限
    setIsAuthenticated(true);
    setHasRequiredPermission(true);
    setIsChecking(false);
  };

  checkAuth();
}, []);
  // 為了測試 先開通所有權限
  /*
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // 檢查是否已登入
        const loggedIn = isLoggedIn();
        setIsAuthenticated(loggedIn);

        // 如果已登入，檢查權限
        if (loggedIn) {
          // 如果是僅管理員可訪問的頁面，檢查是否有管理員權限
          const permissionToCheck = adminOnly ? 'admin' : requiredPermission;
          const hasPermissionValue = hasPermission(permissionToCheck);
          setHasRequiredPermission(hasPermissionValue);
        }
      } catch (error) {
        console.error('認證檢查失敗:', error);
        setIsAuthenticated(false);
        setHasRequiredPermission(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [requiredPermission, adminOnly]);
  */

  // 檢查認證過程中顯示加載狀態
  if (isChecking) {
    return (
      <Container 
        className="d-flex justify-content-center align-items-center" 
        style={{ minHeight: '100vh' }}
      >
        <Spinner animation="border" role="status" variant="info">
          <span className="visually-hidden">認證中...</span>
        </Spinner>
      </Container>
    );
  }

  // 如果未登入，重定向到登入頁面
  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // 如果沒有所需權限，重定向到無權限頁面
  if (!hasRequiredPermission) {
    return <Navigate to="/unauthorized" state={{ from: location }} replace />;
  }

  // 如果已登入且有權限，渲染內容
  return element ? element : <>{children}</>;
};

export default ProtectedRoute; 