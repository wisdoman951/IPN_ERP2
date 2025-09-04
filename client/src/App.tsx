import React, { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import { setupAxiosInterceptors } from "./services/AuthUtils";
import ProtectedRoute from "./components/ProtectedRoute";

// 匯入分頁
import Home from "./pages/Home";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";

// Member
import MamberManagement from "./pages/member/MemberManagement";
import MemberInfo from "./pages/member/MemberInfo";
import AddMember from "./pages/member/AddMember"
import EditMember from "./pages/member/EditMember";

// Medical Record
import MedicalRecord from "./pages/medical_record/MedicalRecord";
import AddMedicalRecord from "./pages/medical_record/AddMedicalRecord";
import AddFamilyMedicalHistoryForm from "./pages/medical_record/AddFamilyMedicalHistory";
import UsualSymptomsAndFamilyHistory from "./pages/medical_record/UsualSymptomsAndFamilyHistory";

// Health
import HealthDataAnalysis from "./pages/health/HealthDataAnalysis";
import StressTest from "./pages/health/stress_test/StressTest";
import StressTestForm from "./pages/health/stress_test/StressTestForm";
import HealthRecord from "./pages/health/pure_medical_record/PureMedicalRecord";
import AddPureMedicalRecord from "./pages/health/pure_medical_record/AddPureMedicalRecord";
import { StressTestProvider } from './hooks/StressTestContext';
import  SelectMember from "./pages/health/stress_test/SelectMember";

// Therapy
import TherapyRecord from "./pages/therapy/TherapyRecord";
import AddTherapyRecord from "./pages/therapy/AddTherapyRecord";
import TherapySell from "./pages/therapy/TherapySell";
import AddTherapySell from "./pages/therapy/AddTherapySell";
import TherapyPackageSelection from "./pages/therapy/TherapyPackageSelection";

// Product
import ProductSell from "./pages/product/ProductSell";
import AddProductSell from "./pages/product/AddProductSell";
import ProductSelection from "./pages/product/ProductSelection";

// Inventory
import InventoryManagement from "./pages/inventory/InventoryManagement";
import InventorySearch from "./pages/inventory/InventorySearch";
import InventoryAnalysis from "./pages/inventory/InventoryAnalysis";
import InventoryUpdate from "./pages/inventory/InventoryUpdate";
import AddInventory from "./pages/inventory/AddInventory";
import InventoryNotification from "./pages/inventory/InventoryNotification";
import InventoryDetail from "./pages/inventory/InventoryDetail";
import InventoryInsert from "./pages/inventory/InventoryInsert";

// Backend
import BranchBackend from "./pages/backend/BranchBackend";
import Staff from "./pages/backend/Staff";
import AddStaff from "./pages/backend/AddStaff";
import EditStaff from "./pages/backend/EditStaff";
import HeadquartersBackend from './pages/backend/HeadquartersBackend';
import UserAccountManagement from './pages/backend/UserAccountManagement';
import AddEditUserAccount from './pages/backend/AddEditUserAccount';
import ProductBundleManagement from './pages/backend/product_bundle/ProductBundleManagement';
import AddStore from './pages/backend/AddStore';
import StoreManagement from './pages/backend/StoreManagement';
import AddProduct from './pages/backend/add-product';
import AddTherapy from './pages/backend/add-therapy';


// 帳務管理
import FinanceDashboard from './pages/finance/FinanceDashboard'; 
import AddSalesOrder from './pages/finance/AddSalesOrder';     
import ItemSelection from './pages/finance/ItemSelection';
import SalesOrderList from './pages/finance/SalesOrderList';

// 匯入Component
import Sidebar from "./components/Siderbar/Sidebar";

// 添加全局樣式
import "./global.css";

const App: React.FC = () => {
    const location = useLocation();
    const isLoginPage = (location.pathname === "/");
    
    // Set up axios interceptors for authentication
    useEffect(() => {
        setupAxiosInterceptors();
    }, []);
    
    // 登入頁面不顯示側邊欄，直接返回
    if (isLoginPage) {
        return (
            <div className="app-container">
                <Routes>
                    <Route path="/" element={<Login />} />
                </Routes>
            </div>
        );
    }
    
    // 其他頁面使用側邊欄佈局
    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <Routes>
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/home" element={<ProtectedRoute element={<Home />} />} />

                    {/* Member */}
                    <Route path="/member-management" element={<ProtectedRoute element={<MamberManagement />} />} />
                    <Route path="/member-info" element={<ProtectedRoute element={<MemberInfo />} />} />
                    <Route path="/add-member" element={<ProtectedRoute element={<AddMember />} />} />
                    <Route path="/member-info/edit/:memberId" element={<ProtectedRoute element={<EditMember />} />} />

                    {/* Medical Record */}
                    <Route path="/medical-record" element={<ProtectedRoute element={<MedicalRecord />} />} />
                    <Route path="/medical-record/add" element={<ProtectedRoute element={<AddMedicalRecord />} />} />
                    <Route path="/medical-record/add-medical-record" element={<ProtectedRoute element={<AddMedicalRecord />} />} />
                    <Route path="/medical-record/add-family-medical-history" element={<ProtectedRoute element={<AddFamilyMedicalHistoryForm />} />} />
                    <Route path="/medical-record/symptoms-and-history" element={<ProtectedRoute element={<UsualSymptomsAndFamilyHistory />} />} />
                    <Route path="/medical-record/edit/:id" element={<AddMedicalRecord />} />

                    {/* Therapy Record */}
                    <Route path="/therapy-record" element={<ProtectedRoute element={<TherapyRecord />} />} />
                    <Route path="/therapy-record/add-therapy-record" element={<ProtectedRoute element={<AddTherapyRecord />} />} />

                    {/* Therapy Sell */}
                    <Route path="/therapy-sell" element={<ProtectedRoute element={<TherapySell />} />} />
                    <Route path="/therapy-sell/add" element={<ProtectedRoute element={<AddTherapySell />} />} />
                    <Route path="/therapy-package-selection" element={<ProtectedRoute element={<TherapyPackageSelection />} />} />

                    {/* Product */}
                    <Route path="/product-sell" element={<ProtectedRoute element={<ProductSell />} />} />
                    <Route path="/add-product-sell" element={<ProtectedRoute element={<AddProductSell />} />} />
                    <Route path="/add-product-sell/:sellId" element={<ProtectedRoute element={<AddProductSell />} />} />
                    <Route path="/product-selection" element={<ProtectedRoute element={<ProductSelection />} />} />

                    {/* Inventory */}
                    <Route path="/inventory" element={<ProtectedRoute element={<InventoryManagement />} />} />
                    <Route path="/inventory/inventory-search" element={<ProtectedRoute element={<InventorySearch />} />} />
                    <Route path="/inventory/inventory-analysis" element={<ProtectedRoute element={<InventoryAnalysis />} />} />
                    <Route path="/inventory/inventory-update" element={<ProtectedRoute element={<InventoryUpdate />} />} />
                    <Route path="/inventory/inventory-add" element={<ProtectedRoute element={<AddInventory />} />} />
                    <Route path="/inventory/inventory-notification" element={<ProtectedRoute element={<InventoryNotification />} />} />
                    <Route path="/inventory/inventory-detail" element={<ProtectedRoute element={<InventoryDetail />} />} />
                    <Route path="/inventory/inventory-insert" element={<ProtectedRoute element={<InventoryInsert />} />} />
                    <Route path="/InventoryInsert" element={<ProtectedRoute element={<InventoryInsert />} />} />
                    
                    {/* Backend - Admin Only */}
                    <Route 
                        path="/backend" 
                        element={
                            <ProtectedRoute 
                                element={<BackendSwitcher />}
                            />
                        } 
                    />
                    
                    {/* 總部專用的其他後台路徑 */}
                    <Route path="/backend/staff" element={<ProtectedRoute element={<Staff />} />} />
                    <Route path="/backend/add-staff" element={<ProtectedRoute element={<AddStaff />} />} />
                    <Route path="/backend/edit-staff/:staffId" element={<ProtectedRoute element={<EditStaff />} />} />
                    <Route path="/backend/user-accounts" element={<ProtectedRoute element={<UserAccountManagement />} adminOnly={true} />} />
                    <Route path="/backend/user-accounts/add" element={<ProtectedRoute element={<AddEditUserAccount />} adminOnly={true} />} />
                    <Route path="/backend/user-accounts/edit/:staffId" element={<ProtectedRoute element={<AddEditUserAccount />} adminOnly={true} />} />
                    <Route path="/backend/product-bundles" element={<ProtectedRoute element={<ProductBundleManagement />} adminOnly={true} />} />
                    <Route path="/backend/add-store" element={<ProtectedRoute element={<AddStore />} adminOnly={true} />} />
                    <Route path="/backend/stores"  element={<ProtectedRoute element={<StoreManagement />} adminOnly={true} />} />
                    <Route path="/backend/add-product" element={<ProtectedRoute element={<AddProduct />} />} />
                    <Route path="/backend/add-therapy" element={<ProtectedRoute element={<AddTherapy />} />} />
                    

                    {/* Health */}
                    <Route path="/health-data-analysis" element={<ProtectedRoute element={<HealthDataAnalysis />} />} />
                    <Route
                        path="/health-data-analysis/stress-test/*"
                        element={
                            <StressTestProvider>
                            <Routes>
                                {/* 相對路徑，前面不要加斜線！ */}
                                <Route path="" element={<ProtectedRoute element={<StressTest />} />} />
                                <Route path="select-member" element={<ProtectedRoute element={<SelectMember />} />} />
                                <Route path="add" element={<ProtectedRoute element={<StressTestForm />} />} />
                                <Route path="edit/:id" element={<ProtectedRoute element={<StressTestForm />} />} />
                            </Routes>
                            </StressTestProvider>
                        }
                        />

                    <Route path="/health-data-analysis/pure-medical-record" element={<ProtectedRoute element={<HealthRecord />} />} />
                    <Route path="/health-data-analysis/add-pure-medical-record" element={<ProtectedRoute element={<AddPureMedicalRecord />} />} />


                    {/* 帳務管理 */}
                    <Route path="/finance" element={<FinanceDashboard />} />
                    <Route path="/finance/sales/list" element={<SalesOrderList />} />
                    <Route path="/finance/sales/add" element={<AddSalesOrder />} />
                    <Route path="/finance/item-selection" element={<ItemSelection />} />
                    {/* 未來修改銷售單的路由 */}
                    {/* <Route path="/finance/sales/edit/:orderId" element={<EditSalesOrder />} /> */}
                    {/* ... */}

                </Routes>
            </div>
        </div>
    );
};
import { getUserRole } from './utils/authUtils'; // 確保引入

const BackendSwitcher: React.FC = () => {
    const role = getUserRole();
    if (role === 'admin') {
        return <HeadquartersBackend />; // 如果是總部，顯示總部後台
    }
    return <BranchBackend />; // 否則，顯示分店後台
};
export default App;
