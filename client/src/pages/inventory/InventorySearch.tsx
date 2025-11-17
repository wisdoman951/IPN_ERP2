import React, { useState, useEffect } from "react";
import { Button, Container, Row, Col, Form, Alert, Spinner, Modal } from "react-bootstrap";
import { useLocation } from "react-router-dom";
import Header from "../../components/Header";
import DynamicContainer from "../../components/DynamicContainer";
import ScrollableTable from "../../components/ScrollableTable";
import { getAllInventory, searchInventory, exportInventory } from "../../services/InventoryService";
import { downloadBlob } from "../../utils/downloadBlob";

// 庫存項目接口
interface InventoryItem {
    Inventory_ID: number;
    Product_ID: number;
    ProductName: string;
    PrimaryCode?: string;
    AllCodes?: string;
    StockIn: number;
    StockInTime?: string | null;
    StockOut: number;
    StockLoan: number;
    Borrower?: string;
    StockQuantity: number;
    StockThreshold: number;
    Store_ID: number;
    StoreName: string;
    selected?: boolean;
}

const InventorySearch: React.FC = () => {
    const location = useLocation();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [keyword, setKeyword] = useState("");
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [detailItem, setDetailItem] = useState<InventoryItem | null>(null);

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

    // 載入庫存資料
    useEffect(() => {
        fetchInventoryData();
    }, [location.key]);

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

    // 格式化日期
    const formatDate = (dateStr?: string | null) => {
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

    // 處理匯出功能
    const handleExport = async () => {
        setLoading(true);
        try {
            const blob = await exportInventory({
                storeId: isAdmin ? undefined : userStoreId,
            });
            downloadBlob(blob, `庫存報表_${new Date().toISOString().split('T')[0]}.xlsx`);
            setError(null);
        } catch (err) {
            console.error("匯出庫存數據失敗:", err);
            setError("匯出庫存數據失敗，請稍後再試");
        } finally {
            setLoading(false);
        }
    };

    const representativeSku = (item: InventoryItem) => {
        return item.PrimaryCode || item.AllCodes || "-";
    };

    const content = (
        <Container className="my-4">
                {/* 錯誤和成功訊息 */}
                {error && (
                    <Alert variant="danger" onClose={() => setError(null)} dismissible>
                        {error}
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
                <Container>
                    {/* 表格 */}
                    <ScrollableTable
                        tableHeader={
                            <tr>
                                <th>產品名稱</th>
                                <th>代表 SKU</th>
                                <th className="text-end">總庫存</th>
                                <th>詳細</th>
                            </tr>
                        }
                        tableBody={
                            loading ? (
                                <tr>
                                    <td colSpan={4} className="text-center py-4">
                                        <Spinner animation="border" variant="info" />
                                        <p>載入中...</p>
                                    </td>
                                </tr>
                            ) : inventoryItems.length > 0 ? (
                                inventoryItems.map(item => (
                                    <tr key={item.Inventory_ID} className={item.StockQuantity <= item.StockThreshold ? "table-danger" : ""}>
                                        <td>{item.ProductName}</td>
                                        <td>{representativeSku(item)}</td>
                                        <td className="text-end">{item.StockQuantity}</td>
                                        <td>
                                            <Button
                                                variant="link"
                                                className="p-0"
                                                onClick={() => setDetailItem(item)}
                                            >
                                                查看詳細資訊
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="text-center text-muted py-5">
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
                            className="text-white px-4"
                            onClick={handleExport}
                            disabled={loading}
                        >
                            報表匯出
                        </Button>
                    </Col>
                </Row>
                <Modal show={!!detailItem} onHide={() => setDetailItem(null)} centered>
                    <Modal.Header closeButton>
                        <Modal.Title>{detailItem?.ProductName}</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {detailItem && (
                            <div className="d-flex flex-column gap-2">
                                <div>代表 SKU：{representativeSku(detailItem)}</div>
                                {detailItem.AllCodes && (
                                    <div className="text-muted small">包含 SKU：{detailItem.AllCodes}</div>
                                )}
                                <div>所屬店鋪：{detailItem.StoreName}</div>
                                <div>庫存總量：{detailItem.StockQuantity}</div>
                                <div>入庫量：{detailItem.StockIn}</div>
                                <div>出庫量：{detailItem.StockOut}</div>
                                <div>借出量：{detailItem.StockLoan}</div>
                                <div>預警門檻：{detailItem.StockThreshold}</div>
                                <div>最後入庫時間：{formatDate(detailItem.StockInTime)}</div>
                            </div>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setDetailItem(null)}>
                            關閉
                        </Button>
                    </Modal.Footer>
                </Modal>
        </Container>
    );

    return (
        <>
            <Header />
            <DynamicContainer content={content} />
        </>
    );
};

export default InventorySearch;
