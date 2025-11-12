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
    order_group_key?: string;
}

type DisplayTherapySellRow = TherapySellRow & {
    therapy_sell_ids: number[];
    purchaseItems?: { name: string; quantity: number }[];
};

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

const renderMultilineText = (text: string) => {
    const lines = text.split(/\r?\n/);
    return lines.map((line, index) => (
        <React.Fragment key={`${line}-${index}`}>
            {line}
            {index < lines.length - 1 && <br />}
        </React.Fragment>
    ));
};

const ORDER_META_REGEX = /\[\[order_meta\s+({.*?})\]\]/i;
const ORDER_META_GLOBAL_REGEX = /\[\[order_meta\s+({.*?})\]\]/gi;
const BUNDLE_META_GLOBAL_REGEX = /\[\[bundle_meta\s+({.*?})\]\]/gi;
const BUNDLE_TAG_GLOBAL_REGEX = /\[bundle:[^\]]*\]/gi;

const stripMetadataFromNote = (note?: string | null) =>
    (note ?? "")
        .replace(ORDER_META_GLOBAL_REGEX, "")
        .replace(BUNDLE_META_GLOBAL_REGEX, "")
        .replace(BUNDLE_TAG_GLOBAL_REGEX, "")
        .trim();

const sanitizeNoteForGrouping = (note?: string | null) => stripMetadataFromNote(note).replace(/\s+/g, " ").trim();

const extractOrderGroupKey = (note?: string | null) => {
    if (!note) {
        return null;
    }
    const match = note.match(ORDER_META_REGEX);
    if (!match) {
        return null;
    }
    try {
        const parsed = JSON.parse(match[1]);
        if (parsed && typeof parsed === "object" && typeof parsed.group === "string") {
            return parsed.group;
        }
    } catch (error) {
        console.error("解析 order_meta 失敗", error);
    }
    return null;
};

const TherapySell: React.FC = () => {
    const navigate = useNavigate();
    const [sales, setSales] = useState<TherapySellRow[]>([]);
    const [searchKeyword, setSearchKeyword] = useState("");
    const [selectedItems, setSelectedItems] = useState<number[]>([]);
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
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

    const extractBundleId = (note?: string | null) => {
        const match = note?.match(/\[bundle:(\d+)\]/);
        return match ? parseInt(match[1], 10) : null;
    };

    const getDisplayName = (sale: TherapySellRow) => {
        const bundleId = extractBundleId(sale.Note);
        if (bundleId) {
            return bundleMap[bundleId]?.name || sale.PackageName || "-";
        }
        return sale.PackageName || "-";
    };

    const getNote = (sale: TherapySellRow) => {
        const bundleId = extractBundleId(sale.Note);
        if (bundleId) {
            const contents = bundleMap[bundleId]?.contents;
            if (contents) {
                return contents.split(/[,，]/).join("\n");
            }
            return "-";
        }
        const cleaned = stripMetadataFromNote(sale.Note);
        return cleaned.length > 0 ? cleaned : "-";
    };

    const resolvePriceValue = (sale: TherapySellRow): number | undefined => {
        if (sale.Price !== undefined && sale.Price !== null) {
            const price = Number(sale.Price);
            if (Number.isFinite(price)) {
                return price;
            }
        }
        if (sale.UnitPrice !== undefined && sale.Sessions !== undefined) {
            const unit = Number(sale.UnitPrice);
            const sessions = Number(sale.Sessions);
            if (Number.isFinite(unit) && Number.isFinite(sessions)) {
                return unit * sessions;
            }
        }
        return undefined;
    };

    const buildGroupKey = (sale: TherapySellRow) => {
        const storeKey = sale.store_id ?? sale.store_name ?? "";
        const orderGroupKey = sale.order_group_key ?? extractOrderGroupKey(sale.Note);
        if (orderGroupKey) {
            return `${storeKey}|orderGroup:${orderGroupKey}`;
        }

        const staffKey = (sale as any).Staff_ID ?? sale.StaffName ?? "";
        const baseParts = [
            sale.Member_ID ?? "",
            storeKey,
            staffKey,
            sale.PurchaseDate ?? "",
            sale.PaymentMethod ?? "",
            sale.SaleCategory ?? "",
            sanitizeNoteForGrouping(sale.Note)
        ];

        const composed = baseParts.join("|");
        return composed.length > 0 ? composed : `${storeKey}|id:${sale.Order_ID}`;
    };
    

    const aggregatedSales: DisplayTherapySellRow[] = useMemo(() => {
        const groupMap = new Map<string, TherapySellRow[]>();
        sales.forEach((sale) => {
            const key = buildGroupKey(sale);
            const existing = groupMap.get(key);
            if (existing) {
                existing.push(sale);
            } else {
                groupMap.set(key, [sale]);
            }
        });

        return Array.from(groupMap.values()).map((items) => {
            const sortedItems = [...items].sort((a, b) => a.Order_ID - b.Order_ID);
            const uniqueIds = Array.from(new Set(sortedItems.map((item) => item.Order_ID)));
            const base: DisplayTherapySellRow = {
                ...sortedItems[0],
                therapy_sell_ids: uniqueIds,
            };

            const resolvedOrderGroupKey = sortedItems.reduce<string | undefined>((acc, item) => {
                if (acc && acc.length > 0) {
                    return acc;
                }
                return item.order_group_key ?? extractOrderGroupKey(item.Note) ?? undefined;
            }, base.order_group_key ?? undefined);
            if (resolvedOrderGroupKey) {
                base.order_group_key = resolvedOrderGroupKey;
            }

            let totalSessions = 0;
            let aggregatedPrice: number | undefined;
            const nameQuantityMap = new Map<string, number>();
            const noteLineCounts = new Map<string, number>();

            sortedItems.forEach((item) => {
                const sessions = Number(item.Sessions || 0);
                totalSessions += sessions;

                const displayName = getDisplayName(item);
                if (displayName && displayName !== "-") {
                    nameQuantityMap.set(displayName, (nameQuantityMap.get(displayName) ?? 0) + sessions);
                }

                const displayNote = getNote(item);
                if (displayNote && displayNote !== "-") {
                    displayNote
                        .split("\n")
                        .map((line) => line.trim())
                        .filter((line) => line.length > 0)
                        .forEach((line) => {
                            noteLineCounts.set(line, (noteLineCounts.get(line) ?? 0) + 1);
                        });
                }

                const priceValue = resolvePriceValue(item);
                if (priceValue !== undefined) {
                    aggregatedPrice = (aggregatedPrice ?? 0) + priceValue;
                }
            });

            base.Sessions = totalSessions;
            if (aggregatedPrice !== undefined) {
                base.Price = aggregatedPrice;
            } else {
                base.Price = undefined;
            }

            if (nameQuantityMap.size > 0) {
                const itemEntries = Array.from(nameQuantityMap.entries())
                    .map(([name, qty]) => {
                        const quantity = Math.abs(qty - Math.round(qty)) < 1e-6 ? Math.round(qty) : Number(qty.toFixed(2));
                        return {
                            name,
                            quantity,
                        };
                    })
                    .filter((entry) => entry.name);

                if (itemEntries.length > 0) {
                    base.purchaseItems = itemEntries;
                    base.PackageName = itemEntries
                        .map((entry) => (entry.quantity ? `${entry.name} x${entry.quantity}` : entry.name))
                        .join("\n");
                }
            }

            if (noteLineCounts.size > 0) {
                const aggregatedNoteLines = Array.from(noteLineCounts.entries()).map(([line, count]) => {
                    if (count <= 1) {
                        return line;
                    }

                    const match = line.match(/^(.*?)(?:\s*[xX×]\s*(\d+(?:\.\d+)?))$/);
                    if (match) {
                        const baseLabel = match[1].trim();
                        const quantity = Number(match[2]);
                        if (Number.isFinite(quantity)) {
                            const totalQuantity = quantity * count;
                            const formattedQuantity = Number.isInteger(totalQuantity)
                                ? totalQuantity.toString()
                                : totalQuantity.toFixed(2);
                            return `${baseLabel} x${formattedQuantity}`;
                        }
                    }

                    return `${line} (x${count})`;
                });

                base.Note = aggregatedNoteLines.join("\n");
            } else if (typeof base.Note === "string" && base.Note.length > 0) {
                base.Note = stripMetadataFromNote(base.Note);
            }

            return base;
        });
    }, [sales, bundleMap]);

    const getRowKey = (sale: DisplayTherapySellRow) => sale.therapy_sell_ids.join(":");

    const handleDelete = async () => {
        if (selectedItems.length === 0) {
            alert("請先選擇要刪除的項目");
            return;
        }
        if (!checkPermission()) {
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
                setSelectedRowKeys([]);
            } catch (error: any) {
                console.error("刪除療程銷售失敗:", error);
                const message = error.message || "刪除失敗，請重試";
                if (message === '無操作權限') {
                    checkPermission();
                } else {
                    setError(message);
                }
            } finally {
                setLoading(false);
            }
        }
    };

    const handleRowSelection = (rowKey: string, ids: number[], checked: boolean) => {
        setSelectedRowKeys((prev) => {
            if (checked) {
                return prev.includes(rowKey) ? prev : [...prev, rowKey];
            }
            return prev.filter((key) => key !== rowKey);
        });

        setSelectedItems((prev) => {
            if (checked) {
                const set = new Set(prev);
                ids.forEach((id) => set.add(id));
                return Array.from(set);
            }
            return prev.filter((id) => !ids.includes(id));
        });
    };

    // 表格頭部 - 依照 Figma 修改
    const sortedSales = useMemo(
        () =>
            sortByStoreAndMemberCode(
                aggregatedSales,
                (sale) => sale.store_name ?? sale.store_id ?? "",
                (sale) => sale.MemberCode ?? "",
                (sale) => sale.Order_ID
            ),
        [aggregatedSales]
    );

    useEffect(() => {
        setSelectedRowKeys((prev) => {
            if (prev.length === 0) {
                return prev;
            }
            const validKeys = new Set(sortedSales.map(getRowKey));
            const filtered = prev.filter((key) => validKeys.has(key));
            return filtered.length === prev.length ? prev : filtered;
        });
    }, [sortedSales]);

    useEffect(() => {
        const validIds = new Set(sales.map((sale) => sale.Order_ID));
        setSelectedItems((prev) => prev.filter((id) => validIds.has(id)));
    }, [sales]);

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
        sortedSales.map((sale) => {
            const relatedIds = sale.therapy_sell_ids && sale.therapy_sell_ids.length > 0
                ? sale.therapy_sell_ids
                : [sale.Order_ID];
            const rowKey = getRowKey(sale);
            const isChecked = relatedIds.every((id) => selectedItems.includes(id));
            return (
                <tr key={rowKey}>
                    <td className="text-center align-middle">
                        <Form.Check
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => handleRowSelection(rowKey, relatedIds, e.target.checked)}
                        />
                    </td>
                    <td className="align-middle">{sale.store_name ?? '-'}</td>
                    <td className="align-middle">{sale.MemberCode || "-"}</td>
                    <td className="align-middle">{sale.MemberName || "-"}</td>
                    <td className="align-middle">{formatDateToYYYYMMDD(sale.PurchaseDate) || "-"}</td>
                    <td className="align-middle" style={{ whiteSpace: 'pre-line' }}>
                        {sale.purchaseItems && sale.purchaseItems.length > 0 ? (
                            <div className="d-flex flex-column gap-1">
                                {sale.purchaseItems.map((item, index) => (
                                    <div
                                        key={`${sale.therapy_sell_ids[index] ?? sale.Order_ID ?? 'row'}-${index}`}
                                        className="d-flex justify-content-between"
                                    >
                                        <span>{item.name}</span>
                                        {item.quantity ? <span className="ms-2">x{item.quantity}</span> : null}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            getDisplayName(sale)
                        )}
                    </td>
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
            );
        })
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

            {error && (
                <Container>
                    <div className="alert alert-danger">{renderMultilineText(error)}</div>
                </Container>
            )}

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