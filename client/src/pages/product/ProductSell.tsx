// .\src\pages\product\ProductSell.tsx
import React, { useEffect, useState, useMemo } from "react";
import { Button, Container, Row, Col, Form, Spinner } from "react-bootstrap"; // Spinner 已在原程式碼但未匯入
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import DynamicContainer from "../../components/DynamicContainer";
import ScrollableTable from "../../components/ScrollableTable";
import { formatDateToYYYYMMDD } from "../../utils/dateUtils";
import { formatCurrency } from "../../utils/productSellUtils"; // formatDiscount 可能不再需要
import { useProductSell } from "../../hooks/useProductSell";
import { ProductSell as ProductSellType } from "../../services/ProductSellService"; // 匯入更新後的型別
import { fetchAllBundles, Bundle } from "../../services/ProductBundleService";
import { sortByStoreAndMemberCode } from "../../utils/storeMemberSort";
import usePermissionGuard from "../../hooks/usePermissionGuard";

type BundleInfo = {
    name: string;
    contents: string;
    items: {
        name: string;
        normalized: string;
        quantity: number;
    }[];
};

type BundleMetadata = {
    id?: number;
    quantity?: number;
    total?: number;
    name?: string;
};

type DisplaySale = ProductSellType & {
    product_sell_ids?: number[];
    combined_display_name?: string;
    combined_note?: string;
    bundle_metadata?: BundleMetadata;
};

const normalizeText = (text: string | undefined | null) =>
    (text ?? "")
        .replace(/\s+/g, "")
        .replace(/[　]/g, "")
        .toLowerCase();

const parseBundleItems = (contents: string | undefined | null): BundleInfo["items"] => {
    if (!contents) {
        return [];
    }
    return contents
        .split(/[,，]/)
        .map((part) => part.trim())
        .filter((part) => part.length > 0)
        .map((part) => {
            const match = part.match(/(.+?)[x×＊*]\s*(\d+)/i);
            if (match) {
                const name = match[1].trim();
                const quantity = Number.parseInt(match[2], 10);
                return {
                    name,
                    normalized: normalizeText(name),
                    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
                };
            }
            return {
                name: part,
                normalized: normalizeText(part),
                quantity: 1,
            };
        });
};

const extractBundleMetadata = (note?: string | null): BundleMetadata | null => {
    if (!note) {
        return null;
    }

    const metaMatch = note.match(/\[\[bundle_meta\s+({.*?})\]\]/i);
    if (metaMatch) {
        try {
            const parsed = JSON.parse(metaMatch[1]);
            if (parsed && typeof parsed === "object") {
                const metadata: BundleMetadata = {};
                if (parsed.id !== undefined) {
                    const id = Number(parsed.id);
                    if (Number.isFinite(id)) {
                        metadata.id = id;
                    }
                }
                if (parsed.qty !== undefined) {
                    const quantity = Number(parsed.qty);
                    if (Number.isFinite(quantity)) {
                        metadata.quantity = quantity;
                    }
                }
                if (parsed.quantity !== undefined && metadata.quantity === undefined) {
                    const quantity = Number(parsed.quantity);
                    if (Number.isFinite(quantity)) {
                        metadata.quantity = quantity;
                    }
                }
                if (parsed.total !== undefined) {
                    const total = Number(parsed.total);
                    if (Number.isFinite(total)) {
                        metadata.total = total;
                    }
                }
                if (parsed.price !== undefined && metadata.total === undefined) {
                    const total = Number(parsed.price);
                    if (Number.isFinite(total)) {
                        metadata.total = total;
                    }
                }
                if (typeof parsed.name === "string" && parsed.name.trim().length > 0) {
                    metadata.name = parsed.name.trim();
                }

                return Object.keys(metadata).length > 0 ? metadata : null;
            }
        } catch (error) {
            console.warn("解析 bundle JSON 資料失敗", error);
        }
    }

    const legacyMatch = note.match(/\[bundle:([^\]]+)\]/i);
    if (!legacyMatch) {
        return null;
    }

    const segments = legacyMatch[1].split("|").map((segment) => segment.trim());
    const metadata: BundleMetadata = {};
    const [idSegment, ...restSegments] = segments;
    const id = Number.parseInt(idSegment, 10);
    if (Number.isFinite(id)) {
        metadata.id = id;
    }

    restSegments.forEach((segment) => {
        const [rawKey, rawValue] = segment.split(":");
        if (!rawKey || rawValue === undefined) {
            return;
        }
        const key = rawKey.trim().toLowerCase();
        const value = rawValue.trim();
        if (!value) {
            return;
        }

        if (key === "qty" || key === "quantity") {
            const quantity = Number.parseFloat(value);
            if (Number.isFinite(quantity)) {
                metadata.quantity = quantity;
            }
        } else if (key === "total" || key === "price") {
            const normalized = value.replace(/,/g, "");
            const total = Number.parseFloat(normalized);
            if (Number.isFinite(total)) {
                metadata.total = total;
            }
        } else if (key === "name") {
            metadata.name = value;
        }
    });

    return Object.keys(metadata).length > 0 ? metadata : null;
};

const extractBundleId = (note?: string | null) => {
    const metadata = extractBundleMetadata(note);
    if (metadata?.id !== undefined) {
        return metadata.id;
    }
    if (!note) {
        return null;
    }
    const match = note.match(/\[bundle:(\d+)\]/);
    if (!match) {
        return null;
    }
    const id = Number.parseInt(match[1], 10);
    return Number.isFinite(id) ? id : null;
};

const cleanBundleTags = (note?: string | null) =>
    (note ?? "")
        .replace(/\[\[bundle_meta\s+({.*?})\]\]/gi, "")
        .replace(/\[bundle:[^\]]*\]/gi, "")
        .trim();

const computeBundleQuantityFromSale = (
    sale: ProductSellType,
    bundleInfo: BundleInfo | undefined,
): number | undefined => {
    if (!bundleInfo || !sale.quantity) {
        return undefined;
    }
    const normalizedName = normalizeText(sale.product_name);
    if (!normalizedName) {
        return undefined;
    }
    const targetItem =
        bundleInfo.items.find((item) => item.normalized === normalizedName) ||
        bundleInfo.items.find(
            (item) =>
                item.normalized.includes(normalizedName) ||
                normalizedName.includes(item.normalized),
        );
    if (!targetItem || !targetItem.quantity) {
        return undefined;
    }
    const bundleQuantity = sale.quantity / targetItem.quantity;
    if (!Number.isFinite(bundleQuantity) || bundleQuantity <= 0) {
        return undefined;
    }
    return bundleQuantity;
};

const computeBundleQuantityForGroup = (
    items: ProductSellType[],
    bundleInfo: BundleInfo | undefined,
): number | undefined => {
    if (!bundleInfo || items.length === 0) {
        return undefined;
    }
    let referenceQuantity: number | undefined;
    for (const item of items) {
        const quantity = computeBundleQuantityFromSale(item, bundleInfo);
        if (quantity === undefined) {
            return undefined;
        }
        if (referenceQuantity === undefined) {
            referenceQuantity = quantity;
        } else if (Math.abs(referenceQuantity - quantity) > 1e-6) {
            return undefined;
        }
    }
    return referenceQuantity;
};

const normalizeText = (text: string | undefined | null) =>
    (text ?? "")
        .replace(/\s+/g, "")
        .replace(/[　]/g, "")
        .toLowerCase();

const parseBundleItems = (contents: string | undefined | null): BundleInfo["items"] => {
    if (!contents) {
        return [];
    }
    return contents
        .split(/[,，]/)
        .map((part) => part.trim())
        .filter((part) => part.length > 0)
        .map((part) => {
            const match = part.match(/(.+?)[x×＊*]\s*(\d+)/i);
            if (match) {
                const name = match[1].trim();
                const quantity = Number.parseInt(match[2], 10);
                return {
                    name,
                    normalized: normalizeText(name),
                    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
                };
            }
            return {
                name: part,
                normalized: normalizeText(part),
                quantity: 1,
            };
        });
};

const extractBundleId = (note?: string | null) => {
    if (!note) {
        return null;
    }
    const match = note.match(/\[bundle:(\d+)\]/);
    if (!match) {
        return null;
    }
    const id = Number.parseInt(match[1], 10);
    return Number.isFinite(id) ? id : null;
};

const computeBundleQuantityFromSale = (
    sale: ProductSellType,
    bundleInfo: BundleInfo | undefined,
): number | undefined => {
    if (!bundleInfo || !sale.quantity) {
        return undefined;
    }
    const normalizedName = normalizeText(sale.product_name);
    if (!normalizedName) {
        return undefined;
    }
    const targetItem =
        bundleInfo.items.find((item) => item.normalized === normalizedName) ||
        bundleInfo.items.find(
            (item) =>
                item.normalized.includes(normalizedName) ||
                normalizedName.includes(item.normalized),
        );
    if (!targetItem || !targetItem.quantity) {
        return undefined;
    }
    const bundleQuantity = sale.quantity / targetItem.quantity;
    if (!Number.isFinite(bundleQuantity) || bundleQuantity <= 0) {
        return undefined;
    }
    return bundleQuantity;
};

const computeBundleQuantityForGroup = (
    items: ProductSellType[],
    bundleInfo: BundleInfo | undefined,
): number | undefined => {
    if (!bundleInfo || items.length === 0) {
        return undefined;
    }
    let referenceQuantity: number | undefined;
    for (const item of items) {
        const quantity = computeBundleQuantityFromSale(item, bundleInfo);
        if (quantity === undefined) {
            return undefined;
        }
        if (referenceQuantity === undefined) {
            referenceQuantity = quantity;
        } else if (Math.abs(referenceQuantity - quantity) > 1e-6) {
            return undefined;
        }
    }
    return referenceQuantity;
};

const paymentMethodValueToDisplayMap: { [key: string]: string } = {
    Cash: "現金",
    CreditCard: "信用卡",
    Transfer: "轉帳",
    MobilePayment: "行動支付",
    Pending: "待付款",
    Others: "其他",
};

const ProductSell: React.FC = () => {
    const navigate = useNavigate();
    const [bundleMap, setBundleMap] = useState<Record<number, BundleInfo>>({});
    const { checkPermission, modal: permissionModal } = usePermissionGuard();
    const {
        sales,
        selectedSales,
        loading,
        error,
        keyword,
        setKeyword,
        handleSearch,
        handleDelete,
        // handleExport, // Figma 中沒有此按鈕，暫時移除
        handleCheckboxChange
    } = useProductSell();

    useEffect(() => {
        const loadBundles = async () => {
            try {
                const bundles = await fetchAllBundles("");
                const map: Record<number, BundleInfo> = {};
                bundles.forEach((b: Bundle) => {
                    map[b.bundle_id] = {
                        name: b.name || b.bundle_contents,
                        contents: b.bundle_contents,
                        items: parseBundleItems(b.bundle_contents),
                    };
                });
                setBundleMap(map);
            } catch (err) {
                console.error("載入產品組合失敗", err);
            }
        };
        loadBundles();
    }, []);

    const getDisplayName = (sale: DisplaySale) => {
        if (sale.combined_display_name) {
            return sale.combined_display_name;
        }
        const metadata = extractBundleMetadata(sale.note);
        if (metadata?.name) {
            return metadata.name;
        }
        const bundleId = extractBundleId(sale.note);
        if (bundleId !== null) {
            return bundleMap[bundleId]?.name || sale.product_name || "-";
        }
        return sale.product_name || "-";
    };

    const getNote = (sale: DisplaySale) => {
        if (sale.combined_note) {
            return sale.combined_note;
        }
        const metadata = extractBundleMetadata(sale.note);
        const bundleId = metadata?.id ?? extractBundleId(sale.note);
        const manualNote = cleanBundleTags(sale.note);
        if (bundleId !== null) {
            if (manualNote.length > 0) {
                return manualNote;
            }
            const contents = bundleMap[bundleId]?.contents;
            if (contents) {
                return contents
                    .split(/[,，]/)
                    .map((line) => line.trim())
                    .filter((line) => line.length > 0)
                    .join("\n") || "-";
            }
            return "-";
        }
        return manualNote.length > 0 ? manualNote : sale.note || "-";
    };

    const groupedSales = useMemo(() => {
        const orderGrouped = new Map<string, DisplaySale[]>();
        const remainder: DisplaySale[] = [];

        sales.forEach((sale) => {
            if (sale.order_reference) {
                const group = orderGrouped.get(sale.order_reference) ?? [];
                group.push(sale);
                orderGrouped.set(sale.order_reference, group);
            } else {
                remainder.push(sale);
            }
        });

        const aggregatedOrders: DisplaySale[] = [];
        orderGrouped.forEach((items) => {
            if (items.length === 1) {
                aggregatedOrders.push(items[0]);
                return;
            }
            const base: DisplaySale = { ...items[0] };
            base.product_sell_ids = items.map((item) => item.product_sell_id);

            const metadataList = items.map((item) => extractBundleMetadata(item.note));
            const aggregatedPrice = items.reduce((sum, item, index) => {
                const metadata = metadataList[index];
                if (metadata?.total !== undefined) {
                    return sum + metadata.total;
                }
                return sum + Number(item.final_price ?? item.unit_price ?? 0);
            }, 0);
            base.final_price = aggregatedPrice;

            const primaryMetadata = metadataList[0];
            const bundleId = primaryMetadata?.id ?? extractBundleId(items[0].note);
            const isBundleGroup =
                bundleId !== null &&
                items.every((item, index) => {
                    const metadata = metadataList[index];
                    const id = metadata?.id ?? extractBundleId(item.note);
                    return id === bundleId;
                });

            if (primaryMetadata) {
                base.bundle_metadata = { ...primaryMetadata };
            } else {
                base.bundle_metadata = undefined;
            }

            if (isBundleGroup) {
                const bundleInfo = bundleId !== null ? bundleMap[bundleId] : undefined;
                const explicitQuantity = primaryMetadata?.quantity;
                const computedQuantity = computeBundleQuantityForGroup(items, bundleInfo);
                base.quantity =
                    explicitQuantity !== undefined
                        ? explicitQuantity
                        : computedQuantity !== undefined
                        ? computedQuantity
                        : items.reduce((sum, item) => sum + (item.quantity || 0), 0);

                if (primaryMetadata?.total !== undefined) {
                    base.final_price = primaryMetadata.total;
                }

                if (bundleInfo) {
                    base.combined_display_name = bundleInfo.name || base.product_name;
                    const manualNotes = new Set<string>();
                    items.forEach((item) => {
                        const rawNote = cleanBundleTags(item.note);
                        if (rawNote.length > 0) {
                            manualNotes.add(rawNote);
                        }
                    });
                    const componentNote = bundleInfo.contents
                        ? bundleInfo.contents
                              .split(/[,，]/)
                              .map((line) => line.trim())
                              .filter((line) => line.length > 0)
                              .join("\n")
                        : undefined;
                    const noteParts = [
                        ...Array.from(manualNotes),
                        ...(componentNote ? [componentNote] : []),
                    ].filter((part) => part && part.length > 0);
                    base.combined_note = noteParts.length > 0 ? noteParts.join("\n") : undefined;
                } else {
                    const metadataName = primaryMetadata?.name;
                    base.combined_display_name = metadataName || getDisplayName(base);
                    const manualNote = cleanBundleTags(base.note);
                    base.combined_note = manualNote.length > 0 ? manualNote : getNote(base);
                }
            } else {
                base.quantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
                base.combined_display_name = items
                    .map((item) => getDisplayName(item as DisplaySale))
                    .join("\n");
                const noteSet = new Set<string>();
                items.forEach((item) => {
                    const text = getNote(item as DisplaySale);
                    if (!text || text === "-") {
                        return;
                    }
                    text.split("\n").forEach((line) => {
                        const trimmed = line.trim();
                        if (trimmed.length > 0) {
                            noteSet.add(trimmed);
                        }
                    });
                });
                base.combined_note = noteSet.size ? Array.from(noteSet).join("\n") : undefined;
                base.bundle_metadata = undefined;
            }

            aggregatedOrders.push(base);
        });

        const bundleGroups: Record<string, DisplaySale> = {};
        const singles: DisplaySale[] = [];

        remainder.forEach((sale) => {
            const metadata = extractBundleMetadata(sale.note);
            const bundleId = metadata?.id ?? extractBundleId(sale.note);
            if (bundleId !== null) {
                const key = `${bundleId}-${sale.member_id}-${sale.date}-${sale.payment_method}-${sale.staff_id}-${sale.store_id ?? ''}`;
                const existing = bundleGroups[key];
                const fallbackPrice = Number(sale.final_price ?? sale.unit_price ?? 0);
                const metadataTotal = metadata?.total;
                const bundleInfo = bundleMap[bundleId];
                const bundleQuantity =
                    metadata?.quantity ?? computeBundleQuantityFromSale(sale, bundleInfo);
                if (existing) {
                    if (metadataTotal === undefined) {
                        const existingPrice = Number(existing.final_price ?? 0);
                        existing.final_price = existingPrice + fallbackPrice;
                    } else if (existing.bundle_metadata?.total === undefined) {
                        existing.final_price = metadataTotal;
                    }
                    existing.product_sell_ids = [
                        ...(existing.product_sell_ids ?? [existing.product_sell_id]),
                        sale.product_sell_id,
                    ];
                    if (bundleQuantity === undefined) {
                        existing.quantity = (existing.quantity || 0) + (sale.quantity || 0);
                    } else if (!existing.quantity || existing.quantity < bundleQuantity) {
                        existing.quantity = bundleQuantity;
                    }
                    if (bundleInfo || metadata?.name) {
                        existing.combined_display_name = bundleInfo?.name || metadata?.name;
                        const manualNotes = new Set<string>();
                        const rawNote = cleanBundleTags(sale.note);
                        if (rawNote.length > 0) {
                            manualNotes.add(rawNote);
                        }
                        if (existing.combined_note) {
                            existing.combined_note
                                .split("\n")
                                .map((line) => line.trim())
                                .filter((line) => line.length > 0)
                                .forEach((line) => manualNotes.add(line));
                        }
                        const componentNote = bundleInfo?.contents
                            ? bundleInfo.contents
                                  .split(/[,，]/)
                                  .map((line) => line.trim())
                                  .filter((line) => line.length > 0)
                            : [];
                        componentNote.forEach((line) => manualNotes.add(line));
                        existing.combined_note = manualNotes.size
                            ? Array.from(manualNotes).join("\n")
                            : existing.combined_note;
                    }
                    if (metadata) {
                        existing.bundle_metadata = {
                            ...(existing.bundle_metadata ?? {}),
                            ...metadata,
                            total:
                                metadataTotal !== undefined
                                    ? metadataTotal
                                    : existing.bundle_metadata?.total,
                        };
                    }
                } else {
                    bundleGroups[key] = {
                        ...sale,
                        final_price: metadataTotal !== undefined ? metadataTotal : fallbackPrice,
                        product_sell_ids: [sale.product_sell_id],
                        quantity: bundleQuantity ?? sale.quantity ?? 1,
                        combined_display_name: bundleInfo?.name || metadata?.name,
                        combined_note: (() => {
                            const manualNotes = new Set<string>();
                            const rawNote = cleanBundleTags(sale.note);
                            if (rawNote.length > 0) {
                                manualNotes.add(rawNote);
                            }
                            const componentNote = bundleInfo?.contents
                                ? bundleInfo.contents
                                      .split(/[,，]/)
                                      .map((line) => line.trim())
                                      .filter((line) => line.length > 0)
                                : [];
                            componentNote.forEach((line) => manualNotes.add(line));
                            return manualNotes.size ? Array.from(manualNotes).join("\n") : undefined;
                        })(),
                        bundle_metadata: metadata
                            ? {
                                  ...metadata,
                              }
                            : undefined,
                    };
                }
            } else {
                singles.push(sale);
            }
        });
        return [...aggregatedOrders, ...Object.values(bundleGroups), ...singles];
    }, [sales, bundleMap]);

    const sortedGroupedSales = useMemo(
        () =>
            sortByStoreAndMemberCode(
                groupedSales,
                (sale) => sale.store_name ?? sale.store_id ?? "",
                (sale) => sale.member_code ?? "",
                (sale) => sale.product_sell_id
            ),
        [groupedSales]
    );

    const tableHeader = (
        <tr>
            <th style={{ width: '50px' }}>勾選</th>
            <th>店別</th>
            <th>會員編號</th>
            <th>購買人</th>
            <th>購買日期</th>
            <th>購買品項</th>
            <th className="text-center">數量</th> {/* 調整對齊 */}
            <th className="text-end">價錢</th>   {/* 調整對齊和標題 */}
            <th>付款方式</th>
            <th>銷售人員</th>
            <th>銷售類別</th>
            <th>備註</th>
        </tr>
    );

    const tableBody = loading ? (
        <tr>
            {/* 更新 colSpan 以匹配新的欄位數量 (12欄) */}
            <td colSpan={12} className="text-center py-5">
                <Spinner animation="border" variant="info" /> {/* 使用 Spinner 並指定 variant */}
            </td>
        </tr>
    ) : sortedGroupedSales.length > 0 ? (
        sortedGroupedSales.map((sale: DisplaySale) => {
            const relatedIds = sale.product_sell_ids && sale.product_sell_ids.length > 0
                ? sale.product_sell_ids
                : [sale.product_sell_id];
            const isChecked = relatedIds.every((id) => selectedSales.includes(id));
            const handleRowSelection = (checked: boolean) => {
                relatedIds.forEach((id) => handleCheckboxChange(id, checked));
            };

            return (
                <tr key={`${sale.product_sell_id}-${sale.order_reference ?? 'single'}`}>
                    <td className="text-center align-middle">
                        <Form.Check
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => handleRowSelection(e.target.checked)}
                    />
                </td>
                <td className="align-middle">{sale.store_name ?? '-'}</td>
                <td className="align-middle">{sale.member_code || "-"}</td>
                <td className="align-middle">{sale.member_name || "-"}</td>
                <td className="align-middle">{formatDateToYYYYMMDD(sale.date) || "-"}</td>
                <td className="align-middle" style={{ whiteSpace: 'pre-line' }}>{getDisplayName(sale)}</td>
                <td className="text-center align-middle">{sale.quantity || "-"}</td>
                <td className="text-end align-middle">
                    {/* 顯示 final_price，如果沒有則顯示 product_price 或計算值 */}
                    {formatCurrency(
                        sale.final_price !== undefined
                            ? Number(sale.final_price)
                            : sale.product_price !== undefined
                            ? Number(sale.product_price)
                            : undefined
                    ) || "-"}
                </td>
                <td className="align-middle">
                    {sale.payment_method
                        ? paymentMethodValueToDisplayMap[sale.payment_method] || sale.payment_method
                        : "-"}
                    </td>
                    <td className="align-middle">{sale.staff_name || "-"}</td>
                    <td className="align-middle">{sale.sale_category || "-"}</td>
                    <td className="align-middle" style={{ maxWidth: '200px', whiteSpace: 'pre-line' }}>{getNote(sale)}</td>
                </tr>
            );
        })
    ) : (
        <tr>
            <td colSpan={12} className="text-center text-muted py-5">
                尚無資料
            </td>
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
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        />
                    </Col>
                    <Col xs={12} md={6} className="d-flex justify-content-end gap-3">
                        <Button
                            variant="info"
                            className="text-white px-4"
                            onClick={handleSearch}
                            disabled={loading}
                        >
                            搜尋
                        </Button>
                        <Button
                            onClick={() => navigate("/add-product-sell")} // 假設新增頁面路由
                            variant="info"
                            className="text-white px-4"
                            disabled={loading}
                        >
                            新增
                        </Button>
                    </Col>
                </Row>
            </Container>

            {error && (
                <Container>
                    <div className="alert alert-danger">{error}</div>
                </Container>
            )}

            <Container>
                <ScrollableTable
                    tableHeader={tableHeader}
                    tableBody={tableBody}
                    tableProps={{ bordered: true, hover: true, className: "align-middle" }} // 添加 align-middle class 到 table
                    height="calc(100vh - 320px)" // 可能需要根據搜尋區域高度調整
                />
            </Container>

            {/* 底部按鈕 - 依照 Figma 修改 */}
            <Container className="my-4">
                <Row className="justify-content-end g-3">
                    {/* 移除 "報表匯出" 按鈕 */}
                    {/* <Col xs="auto">
                        <Button 
                            variant="info" 
                            className="text-white px-4"
                            onClick={handleExport}
                            disabled={loading || sales.length === 0}
                        >
                            報表匯出
                        </Button>
                    </Col> */}
                    <Col xs="auto">
                        <Button
                            variant="info" // "刪除"按鈕使用更合適的 variant
                            className="text-white px-4"
                            onClick={handleDelete}
                            disabled={loading || selectedSales.length === 0}
                        >
                            刪除
                        </Button>
                    </Col>
                    <Col xs="auto">
                        <Button
                            variant="info" // "修改"按鈕使用更合適的 variant
                            className="text-white px-4" // warning 配 text-dark 可能較好
                            disabled={loading || selectedSales.length !== 1}
                            onClick={() => {
                                if (!checkPermission()) {
                                    return;
                                }
                                if (selectedSales.length === 1) {
                                    navigate(`/add-product-sell/${selectedSales[0]}`);
                                }
                            }} // 使用新增頁面進行修改
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
            {/* 修改頁面標題 */}
            <Header />
            <DynamicContainer content={content} />
            {permissionModal}
        </>
    );
};

export default ProductSell;
