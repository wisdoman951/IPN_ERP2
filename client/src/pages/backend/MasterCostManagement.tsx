import React, { useEffect, useState } from "react";
import { Container, Card, Row, Col, Form, Button, Table, Spinner, Alert } from "react-bootstrap";
import Header from "../../components/Header";
import DynamicContainer from "../../components/DynamicContainer";
import {
    getMasterProductCosts,
    updateMasterProductCost,
    MasterProductCostRow
} from "../../services/InventoryService";

const MasterCostManagement: React.FC = () => {
    const [keyword, setKeyword] = useState("");
    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState<MasterProductCostRow[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [savingRow, setSavingRow] = useState<number | null>(null);
    const [draftValues, setDraftValues] = useState<Record<number, { direct?: string; franchise?: string }>>({});

    const loadCosts = async (search?: string) => {
        setLoading(true);
        try {
            const data = await getMasterProductCosts(search ? { keyword: search } : undefined);
            setRows(Array.isArray(data) ? data : []);
            setError(null);
        } catch (err) {
            console.error("載入進貨成本失敗:", err);
            setRows([]);
            setError("載入進貨成本失敗，請稍後再試");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCosts();
    }, []);

    const handleSearch = async (event: React.FormEvent) => {
        event.preventDefault();
        await loadCosts(keyword.trim());
    };

    const resolveValue = (row: MasterProductCostRow, field: "direct" | "franchise") => {
        const override = draftValues[row.master_product_id]?.[field];
        if (override !== undefined) {
            return override;
        }
        const baseValue = field === "direct" ? row.direct_cost_price : row.franchise_cost_price;
        return baseValue !== undefined && baseValue !== null ? String(baseValue) : "";
    };

    const updateDraft = (rowId: number, field: "direct" | "franchise", value: string) => {
        setDraftValues(prev => ({
            ...prev,
            [rowId]: {
                ...prev[rowId],
                [field]: value
            }
        }));
    };

    const handleSave = async (row: MasterProductCostRow) => {
        const overrides = draftValues[row.master_product_id] || {};
        const nextDirect = overrides.direct ?? resolveValue(row, "direct");
        const nextFranchise = overrides.franchise ?? resolveValue(row, "franchise");

        const updates: { store_type: "DIRECT" | "FRANCHISE"; cost: number }[] = [];

        const parseCost = (value: string) => {
            if (value === "" || value === undefined || value === null) {
                return null;
            }
            const num = Number(value);
            if (!Number.isFinite(num) || num < 0) {
                throw new Error("進貨價需為大於等於 0 的數字");
            }
            return num;
        };

        try {
            const directCost = parseCost(nextDirect);
            if (directCost !== null && directCost !== row.direct_cost_price) {
                updates.push({ store_type: "DIRECT", cost: directCost });
            }
            const franchiseCost = parseCost(nextFranchise);
            if (franchiseCost !== null && franchiseCost !== row.franchise_cost_price) {
                updates.push({ store_type: "FRANCHISE", cost: franchiseCost });
            }
            if (updates.length === 0) {
                setError(null);
                setMessage("進貨價未變更");
                return;
            }
            setSavingRow(row.master_product_id);
            setError(null);
            setMessage(null);
            for (const update of updates) {
                await updateMasterProductCost({
                    master_product_id: row.master_product_id,
                    cost_price: update.cost,
                    store_type: update.store_type
                });
            }
            await loadCosts(keyword.trim());
            setDraftValues(prev => ({ ...prev, [row.master_product_id]: {} }));
            setMessage("進貨價已更新");
        } catch (err: any) {
            console.error("更新進貨價失敗:", err);
            setError(err?.message || "更新進貨價失敗，請確認輸入數值");
        } finally {
            setSavingRow(null);
        }
    };

    const content = (
        <Container className="mt-4">
            <Card className="shadow-sm">
                <Card.Header as="h4"></Card.Header>
                <Card.Body>
                    <p className="text-muted">
                        修改價格後即會套用至「更新庫存資料」頁面顯示的進貨價。
                    </p>
                    <Form onSubmit={handleSearch} className="mb-4">
                        <Row className="g-2 align-items-end">
                            <Col xs={12} md={6}>
                                <Form.Label>搜尋品項</Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="輸入商品名稱或邏輯編號"
                                    value={keyword}
                                    onChange={(e) => setKeyword(e.target.value)}
                                />
                            </Col>
                            <Col xs="auto">
                                <Button type="submit" variant="info" className="text-white px-4" disabled={loading}>
                                    {loading ? <Spinner animation="border" size="sm" className="me-2" /> : null}
                                    搜尋
                                </Button>
                            </Col>
                        </Row>
                    </Form>

                    {error && (
                        <Alert variant="danger" onClose={() => setError(null)} dismissible>
                            {error}
                        </Alert>
                    )}
                    {message && (
                        <Alert variant="success" onClose={() => setMessage(null)} dismissible>
                            {message}
                        </Alert>
                    )}

                    <Table responsive hover>
                        <thead>
                            <tr>
                                <th>產品編號</th>
                                <th>品項</th>
                                <th style={{ minWidth: "160px" }}>直營店進貨價</th>
                                <th style={{ minWidth: "160px" }}>加盟店進貨價</th>
                                <th style={{ width: "120px" }} className="text-center">動作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-4">
                                        <Spinner animation="border" variant="info" />
                                    </td>
                                </tr>
                            ) : rows.length > 0 ? (
                                rows.map(row => (
                                    <tr key={row.master_product_id}>
                                        <td>{row.master_product_code}</td>
                                        <td>{row.name}</td>
                                        <td>
                                            <Form.Control
                                                type="number"
                                                min="0"
                                                value={resolveValue(row, "direct")}
                                                onChange={(e) => updateDraft(row.master_product_id, "direct", e.target.value)}
                                            />
                                        </td>
                                        <td>
                                            <Form.Control
                                                type="number"
                                                min="0"
                                                value={resolveValue(row, "franchise")}
                                                onChange={(e) => updateDraft(row.master_product_id, "franchise", e.target.value)}
                                            />
                                        </td>
                                        <td className="text-center">
                                            <Button
                                                variant="info"
                                                className="text-white px-3"
                                                disabled={savingRow === row.master_product_id}
                                                onClick={() => handleSave(row)}
                                            >
                                                {savingRow === row.master_product_id && (
                                                    <Spinner animation="border" size="sm" className="me-2" />
                                                )}
                                                儲存
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="text-center text-muted py-4">
                                        查無符合條件的品項
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>
        </Container>
    );

    return (
        <>
            <Header />
            <DynamicContainer content={content} />
        </>
    );
};

export default MasterCostManagement;
