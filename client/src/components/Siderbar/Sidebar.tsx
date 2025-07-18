import React, {useState, useEffect, useRef} from "react";
import { Button} from "react-bootstrap";
import { useNavigate, useLocation } from "react-router-dom";
import { Col } from "react-bootstrap";
import { Icon } from "@iconify/react";
import './Sidebar.css';
import { logout } from "../../services/LoginService";

interface StoreInfo {
  store_id: number;
  store_name: string;
  store_level: string;
  message?: string;
}

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [storeName, setStoreName] = useState<string>("");
  
  // 新增狀態儲存 header 高度
  const [headerHeight, setHeaderHeight] = useState<number>(0); // 默認高度
  const sidebarRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<MutationObserver | null>(null);

  // 從 localStorage 獲取店鋪資訊
  useEffect(() => {
    const storeInfo = localStorage.getItem('store_info');
    if (storeInfo) {
      try {
        const parsedInfo: StoreInfo = JSON.parse(storeInfo);
        if (parsedInfo.store_name) {
          setStoreName(parsedInfo.store_name);
        }
      } catch (error) {
        console.error('無法解析店鋪資訊', error);
      }
    }
  }, []);

  // 測量 header 高度的函數
  const updateSidebarPosition = () => {
    const headerElement = document.querySelector('header') || document.querySelector('.app-header') || document.querySelector('.header');
    if (headerElement && sidebarRef.current) {
      const height = headerElement.getBoundingClientRect().height;
      setHeaderHeight(height);
      
      // 更新 sidebar 樣式
      sidebarRef.current.style.top = `${height}px`;
      sidebarRef.current.style.height = `calc(100vh - ${height}px)`;
    }
  };

  // 使用 MutationObserver 監聽 DOM 變化
  useEffect(() => {
    // 初始調整
    updateSidebarPosition();
    
    // 使用 MutationObserver 監聽 DOM 變化
    const observer = new MutationObserver(updateSidebarPosition);
    observerRef.current = observer;
    
    // 觀察整個 document body
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    });
    
    // 設置多個時間點進行測量，確保能捕捉到 header 加載完成
    const timeouts = [
      setTimeout(updateSidebarPosition, 0),
      setTimeout(updateSidebarPosition, 100),
      setTimeout(updateSidebarPosition, 500),
      setTimeout(updateSidebarPosition, 1000)
    ];
    
    // 監聽 resize 事件以便在視窗大小改變時再次調整
    window.addEventListener('resize', updateSidebarPosition);
    
    // 監聽 load 事件確保頁面加載完全
    window.addEventListener('load', updateSidebarPosition);
    
    // 清理函數
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      timeouts.forEach(clearTimeout);
      window.removeEventListener('resize', updateSidebarPosition);
      window.removeEventListener('load', updateSidebarPosition);
    };
  }, []);
  
  // 監聽路由變化時重新測量
  useEffect(() => {
    // 路由變化後多次測量，確保捕捉到最終高度
    const timeouts = [
      setTimeout(updateSidebarPosition, 0),
      setTimeout(updateSidebarPosition, 100),
      setTimeout(updateSidebarPosition, 300)
    ];
    
    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [location.pathname]);

  // 處理登出
  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="app-sidebar" ref={sidebarRef} style={{ top: `${headerHeight}px`, height: `calc(100vh - ${headerHeight}px)` }}>
      <Col className="h-100 d-flex flex-column align-items-center py-3 col-sidebar">
        {storeName && (
          <div className="store-info mb-3 text-center w-100">
            <h5 className="text-primary mb-0">{storeName}</h5>
            <hr className="my-2" />
          </div>
        )}
        <div className="nav-item-wrapper w-100">
          <Button variant="light" className="nav-button w-100 d-flex align-items-center" onClick={() => navigate("/home")}>
            <img src="/home.svg" alt="" className="sidebar-icon me-2" />
            <span>首頁</span>
          </Button>
        </div>
        <div className="nav-item-wrapper w-100">
          <Button variant="light" className="nav-button w-100 d-flex align-items-center" onClick={() => navigate("/member-management")}>
            <img src="/face.svg" alt="" className="sidebar-icon me-2" />
            <span>會員健康管理</span>
          </Button>
        </div>
        <div className="nav-item-wrapper w-100">
          <Button variant="light" className="nav-button w-100 d-flex align-items-center" onClick={() => navigate("/product-sell")}>
            <img src="/shopping.svg" alt="" className="sidebar-icon me-2" />
            <span>銷售產品</span>
          </Button>
        </div>
        <div className="nav-item-wrapper w-100">
          <Button variant="light" className="nav-button w-100 d-flex align-items-center" onClick={() => navigate("/therapy-sell")}>
            <img src="/assignment.svg" alt="" className="sidebar-icon me-2" />
            <span>銷售療程</span>
          </Button>
        </div>
        <div className="nav-item-wrapper w-100">
          <Button variant="light" className="nav-button w-100 d-flex align-items-center" onClick={() => navigate("/inventory")}>
            <img src="/fact_check.svg" alt="" className="sidebar-icon me-2" />
            <span>庫存管理</span>
          </Button>
        </div>
        <div className="nav-item-wrapper w-100">
          <Button variant="light" className="nav-button w-100 d-flex align-items-center" onClick={() => navigate("/finance")}>
            <img src="/group.svg" alt="" className="sidebar-icon me-2" />
            <span>帳務管理</span>
          </Button>
        </div>
        <div className="nav-item-wrapper w-100">
          <Button variant="light" className="nav-button w-100 d-flex align-items-center" onClick={() => navigate("/backend")}>
            <img src="/group.svg" alt="" className="sidebar-icon me-2" />
            <span>後台管理系統</span>
          </Button>
        </div>
        <div className="nav-item-wrapper w-100 mt-auto">
          <Button variant="danger" className="nav-button w-100 d-flex align-items-center" onClick={handleLogout}>
            <span>登出</span>
          </Button>
        </div>
      </Col>
    </div>
  );
};

export default Sidebar;
