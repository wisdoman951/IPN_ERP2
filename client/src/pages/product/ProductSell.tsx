// .\src\pages\product\ProductSell.tsx
import React, { useEffect, useState, useMemo } from "react";
import { Button, Container, Row, Col, Form, Spinner } from "react-bootstrap"; // Spinner 已在原程式碼但未匯入
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import DynamicContainer from "../../components/DynamicContainer";
import ScrollableTable from "../../components/ScrollableTable";
import { formatDateToChinese } from "../../utils/memberUtils"; // 假設日期格式化函數適用
import { formatCurrency } from "../../utils/productSellUtils"; // formatDiscount 可能不再需要
import { useProductSell } from "../../hooks/useProductSell";
import { ProductSell as ProductSellType } from "../../services/ProductSellService"; // 匯入更新後的型別
import { fetchAllBundles, Bundle } from "../../services/ProductBundleService";

const ProductSell: React.FC = () => {
    const navigate = useNavigate();
    const [bundleMap, setBundleMap] = useState<Record<number, { name: string; contents: string }>>({});
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
                const bundles = await fetchAllBundles();
                const map: Record<number, { name: string; contents: string }> = {};
                bundles.forEach((b: Bundle) => {
                    map[b.bundle_id] = { name: b.name || b.bundle_contents, contents: b.bundle_contents };
                });
                setBundleMap(map);
            } catch (err) {
                console.error("載入產品組合失敗", err);
            }
        };
        loadBundles();
    }, []);

    const getDisplayName = (sale: ProductSellType) => {
        const match = sale.note?.match(/\[bundle:(\d+)\]/);
        if (match) {
            const id = parseInt(match[1], 10);
            return bundleMap[id]?.name || sale.product_name || "-";
        }
        return sale.product_name || "-";
    };

    const getNote = (sale: ProductSellType) => {
        const match = sale.note?.match(/\[bundle:(\d+)\]/);
        if (match) {
            const id = parseInt(match[1], 10);
            return bundleMap[id]?.contents || "-";
        }
        return sale.note || "-";
    };

    const groupedSales = useMemo(() => {
        const bundles: Record<string, ProductSellType & { product_sell_ids: number[] }> = {};
        const singles: (ProductSellType & { product_sell_ids?: number[] })[] = [];

        sales.forEach((sale) => {
            const match = sale.note?.match(/\[bundle:(\d+)\]/);
            if (match) {
                const bundleId = match[1];
                const key = `${bundleId}-${sale.member_id}-${sale.date}-${sale.payment_method}-${sale.staff_id}`;
                const existing = bundles[key];
                if (existing) {
                    existing.final_price =
                        (existing.final_price || 0) + (sale.final_price || sale.product_price || 0);
                    existing.product_sell_ids.push(sale.product_sell_id);
                } else {
                    bundles[key] = {
                        ...sale,
                        product_sell_id: sale.product_sell_id,
                        product_sell_ids: [sale.product_sell_id],
                        quantity: 1
                    } as ProductSellType & { product_sell_ids: number[] };
                }
            } else {
                singles.push(sale);
            }
        });

        return [...Object.values(bundles), ...singles];
    }, [sales]);

    const tableHeader = (
        <tr>
            <th style={{ width: '50px' }}>勾選</th>
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
            {/* 更新 colSpan 以匹配新的欄位數量 (11欄) */}
            <td colSpan={11} className="text-center py-5">
                <Spinner animation="border" variant="info" /> {/* 使用 Spinner 並指定 variant */}
            </td>
        </tr>
    ) : groupedSales.length > 0 ? (
        groupedSales.map((sale: ProductSellType & { product_sell_ids?: number[] }) => (
            <tr key={sale.product_sell_id}>
                <td className="text-center align-middle">
                    <Form.Check
                        type="checkbox"
                        checked={selectedSales.includes(sale.product_sell_id)}
                        onChange={(e) => handleCheckboxChange(sale.product_sell_id, e.target.checked)}
                    />
                </td>
                <td className="align-middle">{sale.member_code || "-"}</td>
                <td className="align-middle">{sale.member_name || "-"}</td>
                <td className="align-middle">{formatDateToChinese(sale.date) || "-"}</td>
                <td className="align-middle">{getDisplayName(sale)}</td>
                <td className="text-center align-middle">{sale.quantity || "-"}</td>
                <td className="text-end align-middle">
                    {/* 顯示 final_price，如果沒有則顯示 product_price 或計算值 */}
                    {formatCurrency(sale.final_price !== undefined ? sale.final_price : sale.product_price) || "-"}
                </td>
                <td className="align-middle">{sale.payment_method || "-"}</td>
                <td className="align-middle">{sale.staff_name || "-"}</td>
                <td className="align-middle">{sale.sale_category || "-"}</td>
                <td className="align-middle" style={{ maxWidth: '200px', whiteSpace: 'normal' }}>{getNote(sale)}</td>
            </tr>
        ))
    ) : (
        <tr>
            <td colSpan={11} className="text-center text-muted py-5">
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
                            onClick={() => selectedSales.length === 1 && navigate(`/product-sell/edit/${selectedSales[0]}`)} // 假設修改頁面路由
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
        </>
    );
};

export default ProductSell;
