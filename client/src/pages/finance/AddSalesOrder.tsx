// client/src/pages/finance/AddSalesOrder.tsx (新檔案)
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Card, InputGroup, Alert, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import DynamicContainer from '../../components/DynamicContainer';
import { SalesOrderItemData, SalesOrderPayload, addSalesOrder } from '../../services/SalesOrderService';
// 假設您有獲取會員、員工、產品、療程的服務
// import { searchMembers } from '../../services/MemberService';
// import { getStaffMembers } from '../../services/StaffService';
// import { getProducts } from '../../services/ProductService';
// import { getTherapies } from '../../services/TherapyService';

const AddSalesOrder: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 訂單主體資訊
    const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
    const [saleUnit, setSaleUnit] = useState(""); // 銷售單位 (店家名稱)
    const [saleCategory, setSaleCategory] = useState(""); // 銷售列別
    const [buyer, setBuyer] = useState(""); // 購買人
    const [salesperson, setSalesperson] = useState(""); // 銷售人
    const [orderNumber, setOrderNumber] = useState(""); // 銷售單號
    const [memberId, setMemberId] = useState<string>("");
    const [note, setNote] = useState<string>("");

    // 訂單項目
    const [items, setItems] = useState<Partial<SalesOrderItemData>[]>([
        {} // 初始顯示一個空行
    ]);

    // 金額計算
    const [subtotal, setSubtotal] = useState(0);
    const [totalDiscount, setTotalDiscount] = useState(0); // 總折價
    const [grandTotal, setGrandTotal] = useState(0);

    // 動態更新項目
    const handleItemChange = (index: number, field: keyof SalesOrderItemData, value: any) => {
        const newItems = [...items];
        const item = { ...newItems[index], [field]: value };

        // 自動計算小計
        if (field === 'quantity' || field === 'unit_price') {
            item.subtotal = (Number(item.unit_price) || 0) * (Number(item.quantity) || 0);
        }
        newItems[index] = item;
        setItems(newItems);
    };
    const generateOrderNumber = (prefix: string = 'TP') => {
        const now = new Date();
        const pad = (num: number, size: number) => num.toString().padStart(size, '0');
        return `${prefix}${now.getFullYear()}${pad(now.getMonth() + 1, 2)}${pad(now.getDate(), 2)}${pad(now.getHours(), 2)}${pad(now.getMinutes(), 2)}${pad(now.getSeconds(), 2)}${pad(now.getMilliseconds(), 3)}`;
    };

    useEffect(() => {
        setOrderNumber(generateOrderNumber());
        const storedItems = localStorage.getItem('selectedSalesOrderItems');
        if (storedItems) {
            try {
                const parsedItems = JSON.parse(storedItems);
                setItems(parsedItems);
            } catch (e) { console.error("解析已選品項失敗", e); }
            localStorage.removeItem('selectedSalesOrderItems');
        }
        const preSale = localStorage.getItem('preSaleData');
        if (preSale) {
            try {
                const parsed = JSON.parse(preSale);
                if (parsed.orderDate) setOrderDate(parsed.orderDate);
                if (parsed.saleUnit) setSaleUnit(parsed.saleUnit);
                if (parsed.saleCategory) setSaleCategory(parsed.saleCategory);
                if (parsed.buyer) setBuyer(parsed.buyer);
                if (parsed.salesperson) setSalesperson(parsed.salesperson);
            } catch (e) { console.error("解析 preSaleData 失敗", e); }
            localStorage.removeItem('preSaleData');
        }
    }, []); // 僅在初次載入時執行
     const openItemSelection = () => {
        // 在跳轉前，可以選擇性地將當前已選的項目存起來，以便選擇頁可以預選
        // localStorage.setItem('currentSalesOrderItems', JSON.stringify(items));
        navigate('/finance/item-selection'); // 跳轉到品項選擇頁
    };
    const addItem = () => {
        setItems([...items, {}]);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    // 計算總金額
    useEffect(() => {
        const newSubtotal = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
        setSubtotal(newSubtotal);
        setGrandTotal(newSubtotal - totalDiscount);
    }, [items, totalDiscount]);


    const handleSubmit = async () => {
        setLoading(true);
        setError(null);
        try {
            // 在這裡進行表單驗證...

            const sanitizedItems = items.map(({ item_code, ...rest }) => rest as SalesOrderItemData);
            const orderPayload: SalesOrderPayload = {
                order_number: orderNumber,
                order_date: orderDate,
                member_id: memberId ? parseInt(memberId) : null,
                staff_id: salesperson ? parseInt(salesperson) : null,
                store_id: 1, // 暫用假資料，應從 state 獲取
                subtotal: subtotal,
                total_discount: totalDiscount,
                grand_total: grandTotal,
                sale_category: saleCategory,
                note: note,
                items: sanitizedItems,
            };
            
            const result = await addSalesOrder(orderPayload);
            if (result.success) {
                alert(result.message);
                navigate('/finance'); // 假設返回帳務管理主頁
            } else {
                setError(result.error || "新增失敗");
            }
        } catch (err: any) {
            setError(err.error || "提交時發生錯誤");
        } finally {
            setLoading(false);
        }
    };

    // 列印功能尚未實作，點擊僅顯示提示
    const handlePrint = () => {
        alert('列印功能待實現');
    };
    
    // --- JSX 部分 ---
    const content = (
        <Container className="p-4">
            <Card>
                <Card.Header className="text-center">
                    <h4>全崴國際無限充能館</h4>
                    <h3>銷售單</h3>
                </Card.Header>
                <Card.Body>
                    <Row className="mb-3">
                        <Col md={3}><Form.Group><Form.Label>銷售單號</Form.Label><Form.Control value={orderNumber} readOnly /></Form.Group></Col>
                        <Col md={3}><Form.Group><Form.Label>銷售單位</Form.Label><Form.Control value={saleUnit} onChange={e => setSaleUnit(e.target.value)}/></Form.Group></Col>
                        <Col md={3}><Form.Group><Form.Label>銷售列別</Form.Label><Form.Control value={saleCategory} onChange={e => setSaleCategory(e.target.value)}/></Form.Group></Col>
                        <Col md={3}><Form.Group><Form.Label>銷售日期</Form.Label><Form.Control type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)}/></Form.Group></Col>
                    </Row>
                    
                    {/* 表格化項目輸入 */}
                    <div className="table-responsive">
                        <table className="table table-bordered">
                            <thead>
                                <tr>
                                    <th>序號</th><th>編號</th><th>產品名稱/規格型號</th><th>單位</th><th>單價</th><th>數量</th><th>小計</th><th>分類</th><th>備註</th><th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, index) => (
                                    <tr key={index}>
                                        <td>{index + 1}</td>
                                        <td><Form.Control size="sm" value={item.item_code || ""} readOnly /></td>
                                        <td><Form.Control size="sm" value={item.item_description || ""} onChange={e => handleItemChange(index, 'item_description', e.target.value)} /></td>
                                        <td><Form.Control size="sm" value={item.unit || ""} onChange={e => handleItemChange(index, 'unit', e.target.value)} /></td>
                                        <td><Form.Control type="number" size="sm" value={item.unit_price || ""} onChange={e => handleItemChange(index, 'unit_price', Number(e.target.value))} /></td>
                                        <td><Form.Control type="number" size="sm" value={item.quantity || ""} onChange={e => handleItemChange(index, 'quantity', Number(e.target.value))} /></td>
                                        <td><Form.Control size="sm" value={item.subtotal || ""} readOnly disabled /></td>
                                        <td><Form.Control size="sm" /></td>
                                        <td><Form.Control size="sm" /></td>
                                        <td><Button variant="outline-danger" size="sm" onClick={() => removeItem(index)}>X</Button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Button variant="outline-info" size="sm" onClick={openItemSelection} className="w-100 mt-2">
                        選取品項 (產品或療程)
                    </Button>
                    <hr />

                    <Row className="mt-3">
                        <Col md={6}>
                            <Form.Group as={Row} className="mb-2"><Form.Label column sm="3">金額(大寫)</Form.Label><Col sm="9"><Form.Control readOnly /></Col></Form.Group>
                            <Form.Group as={Row}><Form.Label column sm="3">購買人</Form.Label><Col sm="9"><Form.Control value={buyer} onChange={e => setBuyer(e.target.value)} /></Col></Form.Group>
                        </Col>
                        <Col md={6}>
                             <Form.Group as={Row} className="mb-2"><Form.Label column sm="3">金額(小寫)</Form.Label><Col sm="9"><Form.Control value={grandTotal.toLocaleString()} readOnly /></Col></Form.Group>
                             <Form.Group as={Row}><Form.Label column sm="3">銷售人</Form.Label><Col sm="9"><Form.Control value={salesperson} onChange={e => setSalesperson(e.target.value)}/></Col></Form.Group>
                        </Col>
                    </Row>
                </Card.Body>
                <Card.Footer className="text-center">
                    <Button variant="info" className="mx-1 text-white" onClick={handlePrint}>列印</Button>
                    <Button variant="info" className="mx-1 text-white" onClick={() => setItems([{}])}>刪除</Button>
                    <Button variant="info" className="mx-1 text-white">修改</Button>
                    <Button variant="info" className="mx-1 text-white" onClick={handleSubmit} disabled={loading}>
                        {loading ? <Spinner as="span" size="sm" /> : "確認"}
                    </Button>
                </Card.Footer>
            </Card>
        </Container>
    );

    return (
        <div className="d-flex flex-column min-vh-100 bg-light">
            <Header />
            <DynamicContainer content={content} />
        </div>
    );
};

export default AddSalesOrder;
