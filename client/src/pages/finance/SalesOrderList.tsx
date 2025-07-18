// client/src/pages/finance/SalesOrderList.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Form, Button, Spinner, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import DynamicContainer from '../../components/DynamicContainer';
import ScrollableTable from '../../components/ScrollableTable';
import { SalesOrderListRow, getSalesOrders, deleteSalesOrders } from '../../services/SalesOrderService';
import { formatCurrency } from '../../utils/productSellUtils'; // 借用金額格式化工具

const SalesOrderList: React.FC = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState<SalesOrderListRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [keyword, setKeyword] = useState("");
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const fetchData = useCallback(async (searchKeyword?: string) => {
        setLoading(true);
        setError(null);
        try {
            const data = await getSalesOrders(searchKeyword);
            setOrders(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSearch = () => fetchData(keyword);
    const handleDelete = async () => {
        if (selectedIds.length === 0) return;
        if (window.confirm(`確定要刪除選中的 ${selectedIds.length} 筆銷售單嗎？`)) {
            try {
                const result = await deleteSalesOrders(selectedIds);
                if (result.success) {
                    alert(result.message || "刪除成功");
                    setSelectedIds([]);
                    fetchData(keyword);
                } else {
                    throw new Error(result.error);
                }
            } catch (err: any) { setError(err.message); }
        }
    };
    const handleCheckboxChange = (id: number, checked: boolean) => {
        setSelectedIds(prev => checked ? [...prev, id] : prev.filter(i => i !== id));
    };

    const tableHeader = (
        <tr>
            <th style={{ width: '50px' }}>勾選</th>
            <th>銷售單號</th>
            <th>銷售日期</th>
            <th>購買人</th>
            <th>銷售人員</th>
            <th className="text-end">總金額</th>
            <th>備註</th>
        </tr>
    );

    const tableBody = loading ? (
        <tr><td colSpan={7} className="text-center py-5"><Spinner animation="border" /></td></tr>
    ) : error ? (
        <tr><td colSpan={7} className="text-center text-danger py-5">{error}</td></tr>
    ) : orders.length === 0 ? (
        <tr><td colSpan={7} className="text-center text-muted py-5">尚無資料</td></tr>
    ) : (
        orders.map(order => (
            <tr key={order.order_id}>
                <td className="text-center"><Form.Check type="checkbox" checked={selectedIds.includes(order.order_id)} onChange={(e) => handleCheckboxChange(order.order_id, e.target.checked)} /></td>
                <td>{order.order_number}</td>
                <td>{order.order_date}</td>
                <td>{order.member_name || 'N/A'}</td>
                <td>{order.staff_name || 'N/A'}</td>
                <td className="text-end">{formatCurrency(order.grand_total)}</td>
                <td>{order.note}</td>
            </tr>
        ))
    );
    
    const content = (
        <>
            <Container className="my-4">
                <Row className="align-items-center">
                    <Col xs={12} md={6}><Form.Control type="text" placeholder="搜尋單號/購買人/銷售人" value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSearch()}/></Col>
                    <Col xs={12} md={6} className="d-flex justify-content-end gap-2 mt-2 mt-md-0">
                        <Button variant="info" className="text-white" onClick={handleSearch} disabled={loading}>搜尋</Button>
                        <Button variant="info" className="text-white" onClick={() => navigate("/finance/sales/add")}>新增</Button>
                    </Col>
                </Row>
            </Container>

            <Container>
                <ScrollableTable tableHeader={tableHeader} tableBody={tableBody} />
            </Container>

            <Container className="my-4">
                <Row className="justify-content-end g-2">
                    <Col xs="auto"><Button variant="info" className="text-white" disabled={true}>報表匯出</Button></Col>
                    <Col xs="auto"><Button variant="info" className="text-white" onClick={handleDelete} disabled={loading || selectedIds.length === 0}>刪除</Button></Col>
                    <Col xs="auto"><Button variant="info" className="text-white" onClick={() => navigate(`/finance/sales/edit/${selectedIds[0]}`)} disabled={loading || selectedIds.length !== 1}>修改</Button></Col>
                    <Col xs="auto"><Button variant="info" className="text-white" onClick={() => navigate("/finance")}>確認</Button></Col>
                </Row>
            </Container>
        </>
    );

    return (
        <div className="d-flex flex-column min-vh-100 bg-light">
            <Header title="新增銷售單 1.1.5.1" />
            <DynamicContainer content={content} />
        </div>
    );
};

export default SalesOrderList;