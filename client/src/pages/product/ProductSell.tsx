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

const normalizeBundleText = (text: string | undefined | null) =>
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
                    normalized: normalizeBundleText(name),
                    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
                };
            }
            return {
                name: part,
                normalized: normalizeBundleText(part),
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

const hasBundleTag = (note?: string | null) => Boolean(note && /\[bundle:/i.test(note));

const pickFirstDefined = <T,>(values: (T | undefined | null)[]): T | undefined => {
    for (const value of values) {
        if (value !== undefined && value !== null) {
            return value;
        }
    }
    return undefined;
};

const mergeBundleMetadataList = (
    metadataList: (BundleMetadata | null | undefined)[],
): BundleMetadata | undefined => {
    const merged: BundleMetadata = {};
    metadataList.forEach((metadata) => {
        if (!metadata) {
            return;
        }
        if (metadata.id !== undefined && merged.id === undefined) {
            merged.id = metadata.id;
        }
        if (metadata.quantity !== undefined && merged.quantity === undefined) {
            merged.quantity = metadata.quantity;
        }
        if (metadata.total !== undefined && merged.total === undefined) {
            merged.total = metadata.total;
        }
        if (metadata.name && !merged.name) {
            merged.name = metadata.name;
        }
    });
    return Object.keys(merged).length > 0 ? merged : undefined;
};

const determineBundleContext = (
    items: ProductSellType[],
    metadataList: (BundleMetadata | null)[],
) => {
    let hasIndicator = false;
    const idCandidates = new Set<number>();

    items.forEach((item, index) => {
        const metadata = metadataList[index];
        if (metadata) {
            hasIndicator = true;
            if (metadata.id !== undefined) {
                idCandidates.add(metadata.id);
            }
            if (
                metadata.name ||
                metadata.total !== undefined ||
                metadata.quantity !== undefined
            ) {
                hasIndicator = true;
            }
        }

        if (!metadata || metadata.id === undefined) {
            const fallbackId = extractBundleId(item.note);
            if (fallbackId !== null) {
                hasIndicator = true;
                idCandidates.add(fallbackId);
            } else if (hasBundleTag(item.note)) {
                hasIndicator = true;
            }
        }
    });

    return {
        isBundleGroup: hasIndicator && idCandidates.size <= 1,
        bundleId: idCandidates.size === 1 ? Array.from(idCandidates)[0] : null,
        hasIndicator,
    };
};

const getComponentLines = (bundleInfo?: BundleInfo) =>
    bundleInfo?.contents
        ? bundleInfo.contents
              .split(/[,，]/)
              .map((line) => line.trim())
              .filter((line) => line.length > 0)
        : [];

const computeBundleQuantityFromSale = (
    sale: ProductSellType,
    bundleInfo: BundleInfo | undefined,
): number | undefined => {
    if (!bundleInfo || !sale.quantity) {
        return undefined;
    }
    const normalizedName = normalizeBundleText(sale.product_name);
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

    const resolveDisplayNameForSale = (sale: ProductSellType) => {
        const metadata = extractBundleMetadata(sale.note);
        if (metadata?.name) {
            return metadata.name;
        }
        const bundleId = metadata?.id ?? extractBundleId(sale.note);
        if (bundleId !== null) {
            return bundleMap[bundleId]?.name || sale.product_name || "-";
        }
        return sale.product_name || "-";
    };

    const resolveNoteForSale = (sale: ProductSellType) => {
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

    const getDisplayName = (sale: DisplaySale) => {
        if (sale.combined_display_name) {
            return sale.combined_display_name;
        }
        return resolveDisplayNameForSale(sale);
    };

    const getNote = (sale: DisplaySale) => {
        if (sale.combined_note) {
            return sale.combined_note;
        }
        return resolveNoteForSale(sale);
    };

    const createAggregatedBundleGroup = (
        items: ProductSellType[],
        metadataList: (BundleMetadata | null)[],
    ): DisplaySale => {
        const base: DisplaySale = { ...items[0] };
        base.product_sell_ids = items.map((item) => item.product_sell_id);

        const mergedMetadata = mergeBundleMetadataList(metadataList);
        if (mergedMetadata) {
            base.bundle_metadata = { ...mergedMetadata };
        } else {
            base.bundle_metadata = undefined;
        }

        const metadataTotal = mergedMetadata?.total ?? pickFirstDefined(metadataList.map((meta) => meta?.total));
        const aggregatedPrice =
            metadataTotal !== undefined
                ? metadataTotal
                : items.reduce(
                      (sum, item) => sum + Number(item.final_price ?? item.unit_price ?? 0),
                      0,
                  );
        base.final_price = aggregatedPrice;

        const context = determineBundleContext(items, metadataList);
        const bundleId = context.bundleId;
        if (bundleId !== null) {
            base.bundle_metadata = {
                ...(base.bundle_metadata ?? {}),
                id: bundleId,
            };
        }

        const bundleInfo = bundleId !== null ? bundleMap[bundleId] : undefined;
        const explicitQuantity =
            mergedMetadata?.quantity ?? pickFirstDefined(metadataList.map((meta) => meta?.quantity));
        const computedQuantity = computeBundleQuantityForGroup(items, bundleInfo);
        base.quantity =
            explicitQuantity !== undefined
                ? explicitQuantity
                : computedQuantity !== undefined
                ? computedQuantity
                : items.reduce((sum, item) => sum + (item.quantity || 0), 0);

        const resolvedName =
            bundleInfo?.name ?? mergedMetadata?.name ?? pickFirstDefined(metadataList.map((meta) => meta?.name));
        if (resolvedName) {
            base.combined_display_name = resolvedName;
        }

        const manualNotes = new Set<string>();
        items.forEach((item) => {
            const rawNote = cleanBundleTags(item.note);
            if (rawNote.length > 0) {
                manualNotes.add(rawNote);
            }
        });

        const componentLines = getComponentLines(bundleInfo);
        componentLines.forEach((line) => manualNotes.add(line));

        base.combined_note = manualNotes.size > 0 ? Array.from(manualNotes).join("\n") : undefined;

        return base;
    };

    const createAggregatedNonBundleGroup = (items: ProductSellType[]): DisplaySale => {
        const base: DisplaySale = { ...items[0] };
        base.product_sell_ids = items.map((item) => item.product_sell_id);
        base.bundle_metadata = undefined;

        base.quantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
        base.final_price = items.reduce(
            (sum, item) => sum + Number(item.final_price ?? item.unit_price ?? 0),
            0,
        );

        const nameSet = new Set<string>();
        items.forEach((item) => {
            const name = resolveDisplayNameForSale(item);
            if (name && name !== "-") {
                nameSet.add(name);
            }
        });
        base.combined_display_name = nameSet.size > 0 ? Array.from(nameSet).join("\n") : undefined;

        const noteSet = new Set<string>();
        items.forEach((item) => {
            const note = resolveNoteForSale(item);
            if (!note || note === "-") {
                return;
            }
            note
                .split("\n")
                .map((line) => line.trim())
                .filter((line) => line.length > 0)
                .forEach((line) => noteSet.add(line));
        });
        base.combined_note = noteSet.size > 0 ? Array.from(noteSet).join("\n") : undefined;

        return base;
    };

    const groupedSales = useMemo(() => {
        const orderGrouped = new Map<string, ProductSellType[]>();
        const remainder: ProductSellType[] = [];

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

            const metadataList = items.map((item) => extractBundleMetadata(item.note));
            const bundleGroupsMap = new Map<
                string,
                { items: ProductSellType[]; metadataList: (BundleMetadata | null)[] }
            >();
            const nonBundleItems: ProductSellType[] = [];

            items.forEach((item, index) => {
                const metadata = metadataList[index];
                const context = determineBundleContext([item], [metadata]);
                if (context.isBundleGroup) {
                    const key =
                        context.bundleId !== null
                            ? `id:${context.bundleId}`
                            : metadata?.name
                            ? `name:${normalizeBundleText(metadata.name)}`
                            : `product:${normalizeBundleText(item.product_name) || item.product_sell_id}`;
                    const group = bundleGroupsMap.get(key) ?? { items: [], metadataList: [] };
                    group.items.push(item);
                    group.metadataList.push(metadata);
                    bundleGroupsMap.set(key, group);
                } else {
                    nonBundleItems.push(item);
                }
            });

            bundleGroupsMap.forEach(({ items: bundleItems, metadataList: bundleMetadataList }) => {
                if (bundleItems.length > 0) {
                    aggregatedOrders.push(createAggregatedBundleGroup(bundleItems, bundleMetadataList));
                }
            });

            if (nonBundleItems.length > 0) {
                aggregatedOrders.push(createAggregatedNonBundleGroup(nonBundleItems));
            }
        });

        const remainderBundleGroups = new Map<
            string,
            { items: ProductSellType[]; metadataList: (BundleMetadata | null)[] }
        >();
        const remainderSingles: DisplaySale[] = [];

        remainder.forEach((sale) => {
            const metadata = extractBundleMetadata(sale.note);
            const context = determineBundleContext([sale], [metadata]);
            if (context.isBundleGroup) {
                const keyParts = [
                    context.bundleId ?? metadata?.id ?? metadata?.name ?? normalizeBundleText(sale.product_name) ?? "bundle",
                    sale.member_id ?? "",
                    sale.date ?? "",
                    sale.payment_method ?? "",
                    sale.staff_id ?? "",
                    sale.store_id ?? "",
                ];
                const key = keyParts.join("-");
                const group = remainderBundleGroups.get(key) ?? { items: [], metadataList: [] };
                group.items.push(sale);
                group.metadataList.push(metadata);
                remainderBundleGroups.set(key, group);
            } else {
                remainderSingles.push({ ...sale });
            }
        });

        const aggregatedRemainderBundles = Array.from(remainderBundleGroups.values()).map(({ items, metadataList }) =>
            createAggregatedBundleGroup(items, metadataList),
        );

        return [...aggregatedOrders, ...aggregatedRemainderBundles, ...remainderSingles];
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
