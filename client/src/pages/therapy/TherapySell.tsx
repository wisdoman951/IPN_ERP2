// ./src/pages/therapy/TherapySell.tsx
import React, { useState, useEffect, useMemo } from "react";
import { Button, Container, Row, Col, Form, Spinner } from "react-bootstrap"; // 確保 Spinner 已匯入
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import DynamicContainer from "../../components/DynamicContainer";
import ScrollableTable from "../../components/ScrollableTable";
import {
    getAllTherapySells,
    searchTherapySells,
    deleteTherapySell,
    // exportTherapySells // Figma 中沒有匯出按鈕，暫時移除或按需保留
} from "../../services/TherapySellService"; // 假設路徑正確
import { formatDateToYYYYMMDD } from "../../utils/dateUtils";
import { formatCurrency } from "../../utils/productSellUtils"; // 借用金額格式化
import { fetchAllTherapyBundles, TherapyBundle } from "../../services/TherapyBundleService";
import { sortByStoreAndMemberCode } from "../../utils/storeMemberSort";
import usePermissionGuard from "../../hooks/usePermissionGuard";

// 更新 interface 以符合 Figma 需求
export interface TherapySellRow { // 更改 interface 名稱以避免與組件名衝突
    Order_ID: number;       // 內部使用 ID
    Member_ID: number;      // 會員ID
    MemberCode?: string;    // 會員編號
    MemberName: string;     // 購買人
    PurchaseDate: string;   // 購買日期
    PackageName: string;    // 購買品項 (療程名稱)
    Sessions: number;       // 數量 (堂數)
    Price?: number;         // 價錢 (總金額) - API 需返回此欄位
    PaymentMethod: string;  // 付款方式
    StaffName: string;      // 銷售人員
    SaleCategory?: string;  // 銷售類別 (有些 API 可能返回 sale_category)
    Note?: string;          // 備註 - API 需返回此欄位
    UnitPrice?: number;     // 單價
    therapy_id?: number;    // 對應的療程 ID
    store_name?: string;
    store_id?: number;
}

// --- 新增/修改映射表 ---
// (假設 therapy_sell 表的 payment_method 和 sale_category 的 ENUM 已改為英文)
const therapyPaymentMethodValueToDisplayMap: { [key: string]: string } = {
  "Cash": "現金",
  "CreditCard": "信用卡",
  "Transfer": "轉帳",
  "MobilePayment": "行動支付", // 如果資料庫有這些值
  "Others": "其他",        // 如果資料庫有這些值
};

const therapySaleCategoryValueToDisplayMap: { [key: string]: string } = {
  "Sell": "銷售",
  "Gift": "贈送",
  "Discount": "折扣",
  "Ticket": "票卷", // Figma 是 "票卷"
  // "PreOrder": "預購", // 根據您資料庫的 ENUM('Sale', 'Gift', 'Discount', 'Ticket')
  // "Loan": "暫借",
};
// 從 localStorage 判斷是否具有總店或管理員權限
const isAdmin = (() => {
    const level = localStorage.getItem('store_level');
    const perm = localStorage.getItem('permission');
    return level === '總店' || perm === 'admin';
})();
// --- 結束新增/修改映射表 ---

const TherapySell: React.FC = () => {
    const navigate = useNavigate();
    const [sales, setSales] = useState<TherapySellRow[]>([]);
    const [searchKeyword, setSearchKeyword] = useState("");
    const [selectedItems, setSelectedItems] = useState<number[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [bundleMap, setBundleMap] = useState<Record<number, { name: string; contents: string }>>({});
    const { checkPermission, modal: permissionModal } = usePermissionGuard();



    const storeId = (() => { // IIFE to get storeId once
        try {
            const id = localStorage.getItem('store_id');
            return id ? Number(id) : undefined;
        } catch (error) {
            console.error("獲取用戶店鋪 ID 失敗:", error);
            return undefined;
        }
    })();
    
    useEffect(() => {
        if (!storeId) {
            setError("請先設定店鋪或登入具有店鋪權限的帳號。後續操作可能無法正常執行。");
        }
    }, [storeId]);
    
    
    useEffect(() => {
        fetchSales();
    }, []); // storeId 通常在登入後固定，如果會變動則加入依賴

    useEffect(() => {
        const loadBundles = async () => {
            try {
                const bundles = await fetchAllTherapyBundles("");
                const map: Record<number, { name: string; contents: string }> = {};
                bundles.forEach((b: TherapyBundle) => {
                    map[b.bundle_id] = { name: b.name || b.bundle_contents, contents: b.bundle_contents };
                });
                setBundleMap(map);
            } catch (err) {
                console.error("載入療程組合失敗", err);
            }
        };
        loadBundles();
    }, []);
    

    const normalizeSalesResponse = (response: any): TherapySellRow[] => {
        if (!response) {
            return [];
        }

        if (Array.isArray(response)) {
            return response;
        }

        if (Array.isArray(response.data)) {
            return response.data;
        }

        if (response.data && Array.isArray(response.data.data)) {
            return response.data.data;
        }

        return [];
    };

    const fetchSales = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await getAllTherapySells(storeId);
            const parsed = normalizeSalesResponse(response);
            const anyResponse = response as { success?: boolean; error?: string; message?: string; data?: unknown } | null;
            const isApiResponse = !!anyResponse && typeof anyResponse === "object" && typeof anyResponse.success !== "undefined";

            if (isApiResponse && anyResponse?.success === false) {
                setError(anyResponse.error || anyResponse.message || "獲取療程銷售數據失敗，請重試");
                setSales([]);
                return;
            }

            if (parsed.length === 0 && !isApiResponse && response && !(Array.isArray(response))) {
                setError("無法正確解析療程銷售數據");
            }
            setSales(parsed);
        } catch (error) {
            setSales([]);
            setError("獲取療程銷售數據失敗，請重試");
        } finally {
            setLoading(false);
        }
    };
    
    
    const handleSearch = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await (isAdmin ? searchTherapySells(searchKeyword) : searchTherapySells(searchKeyword, storeId));
            const parsed = normalizeSalesResponse(response);
            const anyResponse = response as { success?: boolean; error?: string; message?: string; data?: unknown } | null;
            const isApiResponse = !!anyResponse && typeof anyResponse === "object" && typeof anyResponse.success !== "undefined";

            if (isApiResponse && anyResponse?.success === false) {
                setError(anyResponse.error || anyResponse.message || "搜索失敗，請重試");
                setSales([]);
                return;
            }

            if (parsed.length === 0 && !isApiResponse && response && !(Array.isArray(response))) {
                console.error("API 返回的搜尋結果不是預期的格式:", response);
                setError("無法正確解析搜尋結果");
            }
            setSales(parsed);
        } catch (error) {
            console.error("搜索療程銷售失敗:", error);
            setError("搜索失敗，請重試");
            setSales([]);
        } finally {
            setLoading(false);
        }
    };

    const getDisplayName = (sale: TherapySellRow) => {
        const match = sale.Note?.match(/\[bundle:(\d+)\]/);
        if (match) {
            const id = parseInt(match[1], 10);
            return bundleMap[id]?.name || sale.PackageName || "-";
        }
        return sale.PackageName || "-";
    };

    const getNote = (sale: TherapySellRow) => {
        const match = sale.Note?.match(/\[bundle:(\d+)\]/);
        if (match) {
            const id = parseInt(match[1], 10);
            const contents = bundleMap[id]?.contents;
            if (contents) {
                return contents.split(/[,，]/).join("\n");
            }
            return "-";
        }
        return sale.Note || "-";
    };
    

    const handleDelete = async () => {
        if (selectedItems.length === 0) {
            alert("請先選擇要刪除的項目");
            return;
        }
        if (!checkPermission()) {
            setError('無操作權限');
            return;
        }
        if (window.confirm(`確定要刪除選定的 ${selectedItems.length} 筆紀錄嗎？`)) {
            setLoading(true);
            try {
                for (const id of selectedItems) {
                    const result = await deleteTherapySell(id); // 假設 deleteTherapySell 返回 { success: boolean, error?: string }
                    if (!(result && result.success)) { // 根據實際 API 回應調整
                        throw new Error( (result as any)?.error || "刪除過程中發生錯誤");
                    }
                }
                alert("刪除成功！");
                fetchSales(); // 重新獲取數據
                setSelectedItems([]);
            } catch (error: any) {
                console.error("刪除療程銷售失敗:", error);
                const message = error.message || "刪除失敗，請重試";
                setError(message);
                if (message === '無操作權限') {
                    checkPermission();
                }
            } finally {
                setLoading(false);
            }
        }
    };

    const handleCheckboxChange = (id: number) => {
        setSelectedItems(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    // 表格頭部 - 依照 Figma 修改
    const sortedSales = useMemo(
        () =>
            sortByStoreAndMemberCode(
                sales,
                (sale) => sale.store_name ?? sale.store_id ?? "",
                (sale) => sale.MemberCode ?? "",
                (sale) => sale.Order_ID
            ),
        [sales]
    );

    const tableHeader = (
        <tr>
            <th style={{ width: '50px' }}>勾選</th>
            <th className="text-center">店別</th>
            <th className="text-center">會員編號</th>
            <th className="text-center">購買人</th>
            <th className="text-center">購買日期</th>
            <th className="text-center">購買品項</th>
            <th className="text-center">堂數</th> 
            <th className="text-center">價錢</th>  
            <th className="text-center">付款方式</th>
            <th className="text-center">銷售人員</th>
            <th className="text-center">銷售類別</th>
            <th className="text-center">備註</th>   
        </tr>
    );

    // 表格內容 - 依照 Figma 修改
    const tableBody = loading ? (
        <tr>
            <td colSpan={12} className="text-center py-5"> {/* 更新 colSpan */}
                <Spinner animation="border" variant="info"/>
            </td>
        </tr>
    ) : sortedSales.length > 0 ? (
        sortedSales.map((sale) => (
            <tr key={sale.Order_ID}>
                <td className="text-center align-middle">
                    <Form.Check
                        type="checkbox"
                        checked={selectedItems.includes(sale.Order_ID)}
                        onChange={() => handleCheckboxChange(sale.Order_ID)}
                    />
                </td>
                <td className="align-middle">{sale.store_name ?? '-'}</td>
                <td className="align-middle">{sale.MemberCode || "-"}</td>
                <td className="align-middle">{sale.MemberName || "-"}</td>
                <td className="align-middle">{formatDateToYYYYMMDD(sale.PurchaseDate) || "-"}</td>
                <td className="align-middle">{getDisplayName(sale)}</td>
                <td className="text-center align-middle">{sale.Sessions || "-"}</td>
                <td className="text-end align-middle">{formatCurrency(sale.Price) || "-"}</td>
                <td className="align-middle">
                    {therapyPaymentMethodValueToDisplayMap[sale.PaymentMethod] || sale.PaymentMethod}
                </td>
                <td className="align-middle">{sale.StaffName || "-"}</td>
                <td className="align-middle">
                    {(() => {
                        const cat = (sale as any).SaleCategory ?? (sale as any).sale_category;
                        return therapySaleCategoryValueToDisplayMap[cat] || cat || "-";
                    })()}
                </td>
                <td className="align-middle" style={{ maxWidth: '150px', whiteSpace: 'pre-line' }}>{getNote(sale)}</td>
            </tr>
        ))
    ) : (
        <tr>
            <td colSpan={12} className="text-center text-muted py-5">尚無資料</td> {/* 更新 colSpan */}
        </tr>
    );

    const content = (
        <>
            <Container className="my-4">
                <Row className="align-items-center">
                    <Col xs={12} md={6} className="mb-3 mb-md-0">
                        <Form.Control
                            type="text"
                            placeholder="姓名/會員編號"
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        />
                    </Col>
                    <Col xs={10} md={6} className="d-flex justify-content-end gap-3">
                        <Button variant="info" className="text-white px-4" onClick={handleSearch} disabled={loading}>
                            搜尋
                        </Button>
                        <Button variant="info" className="text-white px-4" onClick={() => navigate("/therapy-sell/add")} disabled={loading}>
                            新增
                        </Button>
                    </Col>
                </Row>
            </Container>

            {error && (<Container><div className="alert alert-danger">{error}</div></Container>)}

            <Container>
                <ScrollableTable
                    tableHeader={tableHeader}
                    tableBody={tableBody}
                    tableProps={{ bordered: true, hover: true, className: "align-middle" }}
                    height="calc(100vh - 320px)" // 調整高度以適應搜尋欄
                />
            </Container>

            {/* 底部按鈕 - 依照 Figma 修改 */}
            <Container className="my-4">
                <Row className="justify-content-end g-3">
                    <Col xs="auto">
                        <Button
                            variant="info" // 修改 variant
                            className="text-white px-4"
                            onClick={handleDelete}
                            disabled={loading || selectedItems.length === 0}
                        >
                            刪除
                        </Button>
                    </Col>
                    <Col xs="auto">
                        <Button
                            variant="info"
                            className="text-white px-4"
                            onClick={() => {
                                if (!checkPermission()) {
                                    setError('無操作權限');
                                    return;
                                }
                                if (selectedItems.length === 1) {
                                    const sale = sales.find(s => s.Order_ID === selectedItems[0]);
                                    navigate('/therapy-sell/add', { state: { editSale: sale } });
                                }
                            }}
                            disabled={loading || selectedItems.length !== 1}
                        >
                            修改
                        </Button>
                    </Col>
                    
                </Row>
            </Container>
        </>
    );

    return (
        <>
            <Header />
            <DynamicContainer content={content} />
            {permissionModal}
        </>
    );
};

export default TherapySell;