import React, { useState, useEffect,useCallback } from "react";
import type { AxiosError } from "axios";
import { Button, Container, Row, Col, Form, Alert, Spinner, Card } from "react-bootstrap";
import { useNavigate, useLocation } from "react-router-dom";
import Header from "../../components/Header";
import DynamicContainer from "../../components/DynamicContainer";
import ScrollableTable from "../../components/ScrollableTable";
import {
    getAllInventory,
    searchInventory,
    deleteInventoryItem,
    exportInventory,
    getMasterStockSummary,
    getMasterVariants,
    MasterStockSummaryItem,
    MasterVariantItem
} from "../../services/InventoryService";
import { downloadBlob } from "../../utils/downloadBlob";
import usePermissionGuard from "../../hooks/usePermissionGuard";

// 庫存項目接口
interface InventoryItem {
    Inventory_ID: number;
    Product_ID: number;
    ProductName: string;
    ProductCode: string;
    StockIn: number;
    StockInTime: string;
    StockOut: number;
    StockLoan: number;
    Borrower: string;
    StockQuantity: number;
    StockThreshold: number;
    Store_ID: number;
    StoreName: string;
    selected?: boolean;
}

const InventorySearch: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [keyword, setKeyword] = useState("");
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [selectedItems, setSelectedItems] = useState<number[]>([]);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [masterSummary, setMasterSummary] = useState<MasterStockSummaryItem[]>([]);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryErrorMessage, setSummaryErrorMessage] = useState<string | null>(null);
    const [expandedMasters, setExpandedMasters] = useState<Record<number, boolean>>({});
    const [variantDetails, setVariantDetails] = useState<Record<number, MasterVariantItem[]>>({});
    const [variantLoading, setVariantLoading] = useState<Record<number, boolean>>({});
    const { checkPermission, modal: permissionModal } = usePermissionGuard();

    // 從 localStorage 中獲取用戶所屬店鋪ID
    const getUserStoreId = (): number | undefined => {
        try {
            const storeId = localStorage.getItem('store_id');
            if (storeId) {
                return Number(storeId);
            }
            return undefined;
        } catch (error) {
            console.error("獲取用戶店鋪 ID 失敗:", error);
            return undefined;
        }
    };
    
    const userStoreId = getUserStoreId();
    const isAdmin = (() => {
        const level = localStorage.getItem('store_level');
        const perm = localStorage.getItem('permission');
        return level === '總店' || perm === 'admin';
    })();

    const fetchMasterSummaryData = useCallback(async (keywordParam?: string) => {
        setSummaryLoading(true);
        try {
            const params: { keyword?: string; storeId?: number } = {};
            if (keywordParam) params.keyword = keywordParam;
            if (userStoreId) params.storeId = userStoreId;
            const data = await getMasterStockSummary(params);
            setMasterSummary(Array.isArray(data) ? data : []);
            setSummaryErrorMessage(null);
        } catch (err) {
            console.error("獲取主庫存失敗:", err);
            setSummaryErrorMessage("獲取主庫存失敗，請稍後再試");
            setMasterSummary([]);
        } finally {
            setSummaryLoading(false);
        }
    }, [userStoreId]);

    // 載入庫存資料
    useEffect(() => {
        fetchMasterSummaryData();
        fetchInventoryData();
    }, [location.key, fetchMasterSummaryData]);

    // 獲取所有庫存資料
    const fetchInventoryData = async () => {
        setLoading(true);
        try {
            const data = await getAllInventory(isAdmin ? undefined : userStoreId);
            setInventoryItems(Array.isArray(data) ? data : []);
            setError(null);
        } catch (err) {
            console.error("獲取庫存資料失敗:", err);
            setError("獲取庫存資料失敗，請稍後再試");
            setInventoryItems([]);
        } finally {
            setLoading(false);
        }
    };

    // 搜尋庫存資料
    const handleSearch = async () => {
        setLoading(true);
        fetchMasterSummaryData(keyword);
        try {
            const data = await searchInventory(keyword, isAdmin ? undefined : userStoreId);
            setInventoryItems(Array.isArray(data) ? data : []);
            setError(null);
        } catch (err) {
            console.error("搜尋庫存資料失敗:", err);
            setError("搜尋庫存資料失敗，請稍後再試");
            setInventoryItems([]);
        } finally {
            setLoading(false);
        }
    };

    const toggleMasterVariants = async (masterProductId: number) => {
        const nextExpanded = !expandedMasters[masterProductId];
        setExpandedMasters(prev => ({ ...prev, [masterProductId]: nextExpanded }));
        if (nextExpanded && !variantDetails[masterProductId]) {
            setVariantLoading(prev => ({ ...prev, [masterProductId]: true }));
            try {
                const data = await getMasterVariants(masterProductId);
                setVariantDetails(prev => ({ ...prev, [masterProductId]: data }));
            } catch (err) {
                console.error("載入尾碼明細失敗:", err);
                alert("載入尾碼明細失敗，請稍後再試");
            } finally {
                setVariantLoading(prev => ({ ...prev, [masterProductId]: false }));
            }
        }
    };

    // 格式化日期
    const formatDate = (dateStr: string) => {
        if (!dateStr) return "";

        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('zh-TW', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
        } catch (e) {
            console.error("日期格式化錯誤:", e);
            return dateStr;
        }
    };

    const formatDateTime = (dateStr?: string) => {
        if (!dateStr) return "";
        try {
            const date = new Date(dateStr);
            return date.toLocaleString('zh-TW', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            console.error("時間格式化錯誤:", error);
            return dateStr;
        }
    };

    // 選中/取消選中項目
    const toggleSelectItem = (inventoryId: number) => {
        if (selectedItems.includes(inventoryId)) {
            setSelectedItems(selectedItems.filter(id => id !== inventoryId));
        } else {
            setSelectedItems([...selectedItems, inventoryId]);
        }
    };

    // 刪除選中的項目
    const handleDelete = async () => {
        if (selectedItems.length === 0) {
            setError("請先選擇要刪除的項目");
            return;
        }

        if (!checkPermission()) {
            return;
        }

        if (!window.confirm(`確定要刪除選中的 ${selectedItems.length} 個項目嗎？`)) {
            return;
        }

        setLoading(true);
        try {
            let failedCount = 0;
            
            for (const id of selectedItems) {
                try {
                    await deleteInventoryItem(id);
                } catch (err) {
                    if (isNoPermissionError(err)) {
                        notifyNoPermission();
                        return;
                    }
                    console.error(`刪除庫存項目 ID=${id} 失敗:`, err);
                    failedCount++;
                }
            }

            // 重新獲取庫存數據
            await fetchInventoryData();
            await fetchMasterSummaryData();
            
            // 清空選中項目
            setSelectedItems([]);
            
            if (failedCount === 0) {
                setSuccessMessage("所有選中項目均已成功刪除");
            } else if (failedCount < selectedItems.length) {
                setSuccessMessage(`部分項目刪除成功，${failedCount} 個項目刪除失敗`);
            } else {
                setError("刪除操作失敗，請稍後再試");
            }
        } catch (err) {
            if (isNoPermissionError(err)) {
                notifyNoPermission();
                return;
            }
            console.error("批量刪除庫存項目失敗:", err);
            setError("刪除操作失敗，請稍後再試");
        } finally {
            setLoading(false);
        }
    };

    // 跳轉到更新頁面
    const handleEdit = () => {
        if (!checkPermission()) {
            return;
        }
        if (selectedItems.length !== 1) {
            setError("請選擇一個項目進行修改");
            return;
        }

        navigate(`/inventory/inventory-update?id=${selectedItems[0]}`);
    };
    
    // 處理匯出功能
    const handleExport = async () => {
        setLoading(true);
        try {
            const blob = await exportInventory({
                storeId: isAdmin ? undefined : userStoreId,
            });
            downloadBlob(blob, `庫存報表_${new Date().toISOString().split('T')[0]}.xlsx`);
            setSuccessMessage("庫存數據匯出成功");
        } catch (err) {
            console.error("匯出庫存數據失敗:", err);
            setError("匯出庫存數據失敗，請稍後再試");
        } finally {
            setLoading(false);
        }
    };

    // 清除訊息
    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => {
                setSuccessMessage(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    const content = (
        <Container className="my-4">
                {/* 錯誤和成功訊息 */}
                {error && (
                    <Alert variant="danger" onClose={() => setError(null)} dismissible>
                        {error}
                    </Alert>
                )}
                
                {successMessage && (
                    <Alert variant="success" onClose={() => setSuccessMessage(null)} dismissible>
                        {successMessage}
                    </Alert>
                )}
                
                {!userStoreId && (
                    <Alert variant="warning">
                        您尚未選擇店鋪，請先設定店鋪或登入具有店鋪權限的帳號。目前顯示所有庫存數據。
                    </Alert>
                )}
                
                <Container className="my-4">
                    <Row className="align-items-center">
                        {/* 搜尋欄位 */}
                        <Col xs="auto">
                            <Form.Label className="fw-semibold">品項</Form.Label>
                        </Col>
                        <Col xs={12} md={6}>
                            <Form.Control 
                                type="text" 
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                                placeholder="輸入產品名稱或編號搜尋"
                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            />
                        </Col>
                        <Col xs="auto">
                            <Button 
                                variant="info" 
                                className="text-white px-4"
                                onClick={handleSearch}
                                disabled={loading}
                            >
                                {loading ? <Spinner size="sm" animation="border" /> : "搜尋"}
                            </Button>
                        </Col>
                    </Row>
                </Container>
                <Card className="mb-4">
                    <Card.Header className="d-flex justify-content-between align-items-center">
                        <span>主商品庫存總覽</span>
                        <small className="text-muted">庫存依據您登入的店別彙總</small>
                    </Card.Header>
                    <Card.Body>
                        {summaryErrorMessage && (
                            <Alert variant="danger" onClose={() => setSummaryErrorMessage(null)} dismissible>
                                {summaryErrorMessage}
                            </Alert>
                        )}
                        <Table responsive hover size="sm" className="mb-0">
                            <thead>
                                <tr>
                                    <th style={{ width: "120px" }}>動作</th>
                                    <th>產品編號</th>
                                    <th>品項</th>
                                    <th className="text-end">庫存數量</th>
                                    <th className="text-end">更新時間</th>
                                </tr>
                            </thead>
                            <tbody>
                                {summaryLoading ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-4">
                                            <Spinner animation="border" variant="info" />
                                        </td>
                                    </tr>
                                ) : masterSummary.length > 0 ? (
                                    masterSummary.map(item => (
                                        <React.Fragment key={item.master_product_id}>
                                            <tr>
                                                <td>
                                                    <Button
                                                        variant="link"
                                                        className="p-0"
                                                        onClick={() => toggleMasterVariants(item.master_product_id)}
                                                        disabled={!!variantLoading[item.master_product_id]}
                                                    >
                                                        {expandedMasters[item.master_product_id] ? "收合明細" : "展開明細"}
                                                    </Button>
                                                </td>
                                                <td>{item.master_product_code}</td>
                                                <td>{item.name}</td>
                                                <td className="text-end">{item.quantity_on_hand ?? 0}</td>
                                                <td className="text-end">{formatDateTime(item.updated_at)}</td>
                                            </tr>
                                            {expandedMasters[item.master_product_id] && (
                                                <tr className="bg-light">
                                                    <td colSpan={5}>
                                                        {variantLoading[item.master_product_id] ? (
                                                            <div className="text-center py-3">
                                                                <Spinner animation="border" variant="info" size="sm" />
                                                            </div>
                                                        ) : variantDetails[item.master_product_id] && variantDetails[item.master_product_id].length > 0 ? (
                                                            <Table responsive size="sm" className="mb-0">
                                                                <thead>
                                                                    <tr>
                                                                        <th>尾碼編號</th>
                                                                        <th>品項名稱</th>
                                                                        <th className="text-end">建議售價</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {variantDetails[item.master_product_id].map(variant => (
                                                                        <tr key={variant.variant_id}>
                                                                            <td>{variant.variant_code}</td>
                                                                            <td>{variant.display_name}</td>
                                                                            <td className="text-end">
                                                                                {variant.sale_price !== undefined && variant.sale_price !== null
                                                                                    ? Number(variant.sale_price).toLocaleString()
                                                                                    : "-"}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </Table>
                                                        ) : (
                                                            <div className="text-muted">尚無尾碼明細</div>
                                                        )}
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="text-center text-muted py-4">
                                            尚無主商品庫存資料
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    </Card.Body>
                </Card>

                <Container>
                    {/* 表格 */}
                    <ScrollableTable 
                        tableHeader={
                            <tr>
                                <th className="text-center">勾選</th>
                                <th>產品名稱</th>
                                <th>產品編號</th>
                                <th className="text-end">入庫量</th>
                                <th className="text-end">出庫量</th>
                                <th className="text-end">借出量</th>
                                <th className="text-end">庫存量</th>
                                <th className="text-end">庫存預警值</th>
                                <th>入庫時間</th>
                                <th>詳細</th>
                            </tr>
                        }
                        tableBody={
                            loading ? (
                                <tr>
                                    <td colSpan={10} className="text-center py-4">
                                        <Spinner animation="border" variant="info" />
                                        <p>載入中...</p>
                                    </td>
                                </tr>
                            ) : inventoryItems.length > 0 ? (
                                inventoryItems.map(item => (
                                    <tr key={item.Inventory_ID} className={item.StockQuantity <= item.StockThreshold ? "table-danger" : ""}>
                                        <td className="text-center">
                                            <Form.Check
                                                type="checkbox"
                                                checked={selectedItems.includes(item.Inventory_ID)}
                                                onChange={() => toggleSelectItem(item.Inventory_ID)}
                                            />
                                        </td>
                                        <td>{item.ProductName}</td>
                                        <td>{item.ProductCode}</td>
                                        <td className="text-end">{item.StockIn}</td>
                                        <td className="text-end">{item.StockOut}</td>
                                        <td className="text-end">{item.StockLoan}</td>
                                        <td className="text-end">{item.StockQuantity}</td>
                                        <td className="text-end">{item.StockThreshold}</td>
                                        <td>{formatDate(item.StockInTime)}</td>
                                        <td>
                                            <Button
                                                variant="link"
                                                className="p-0"
                                                onClick={() => navigate(`/inventory/inventory-detail?productId=${item.Product_ID}&productName=${encodeURIComponent(item.ProductName)}`)}
                                            >
                                                查看詳細入庫資訊
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={10} className="text-center text-muted py-5">
                                        尚無資料
                                    </td>
                                </tr>
                            )
                        }
                        height="calc(100vh - 350px)"
                    />
                </Container>
                {/* 下方按鈕 */}
                <Row className="justify-content-end my-4 g-3">
                    <Col xs="auto">
                        <Button 
                            variant="info" 
                            className="text-white px-4 me-2"
                            onClick={handleExport}
                            disabled={loading}
                        >
                            報表匯出
                        </Button>
                        <Button 
                            variant="info" 
                            className="text-white px-4 me-2"
                            onClick={handleDelete}
                            disabled={loading || selectedItems.length === 0}
                        >
                            刪除
                        </Button>
                        <Button 
                            variant="info" 
                            className="text-white px-4 me-2 btn btn-info"
                            onClick={handleEdit}
                            disabled={loading || selectedItems.length !== 1}
                        >
                            修改
                        </Button>
                    </Col>
                </Row>
        </Container>
    );

    return (
        <>
            <Header />
            <DynamicContainer content={content} />
            {permissionModal}
        </>
    );
};

export default InventorySearch;
