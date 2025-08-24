// client/src/pages/finance/AddSalesOrder.tsx (新檔案)
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Card, InputGroup, Alert, Spinner } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../../components/Header';
import DynamicContainer from '../../components/DynamicContainer';
import { SalesOrderItemData, SalesOrderPayload, addSalesOrder, getSalesOrderById, SalesOrderDetail, updateSalesOrder } from '../../services/SalesOrderService';
import { getAllMembers, Member } from '../../services/MemberService';
import { getStaffMembers, StaffMember } from '../../services/TherapyDropdownService';
// 假設您有獲取會員、員工、產品、療程的服務
// import { searchMembers } from '../../services/MemberService';
// import { getStaffMembers } from '../../services/StaffService';
// import { getProducts } from '../../services/ProductService';
// import { getTherapies } from '../../services/TherapyService';

const AddSalesOrder: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editingOrderId, setEditingOrderId] = useState<number | null>(null);

    // 訂單主體資訊
    const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
    const [saleUnit, setSaleUnit] = useState(""); // 銷售單位 (店家名稱)
    const [saleCategory, setSaleCategory] = useState(""); // 銷售列別
    const [members, setMembers] = useState<Member[]>([]);
    const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
    const [staffId, setStaffId] = useState(""); // 銷售人
    const [orderNumber, setOrderNumber] = useState(""); // 銷售單號
    const [memberId, setMemberId] = useState<string>("");
    const [note, setNote] = useState<string>("");
    const [storeId, setStoreId] = useState<number | null>(null);

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

    const getStorePrefix = (id: string | null): string => {
        switch (id) {
            case '2':
                return 'TC';
            case '3':
                return 'TP';
            case '4':
                return 'PH';
            case '5':
                return 'TY';
            case '1':
            default:
                return 'TP';
        }
    };

    useEffect(() => {
        const id = localStorage.getItem('store_id');
        setStoreId(id ? parseInt(id) : null);
        setOrderNumber(generateOrderNumber(getStorePrefix(id)));
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
                if (parsed.buyerId) setMemberId(String(parsed.buyerId));
                if (parsed.staffId) setStaffId(String(parsed.staffId));
            } catch (e) { console.error("解析 preSaleData 失敗", e); }
            localStorage.removeItem('preSaleData');
        }
    }, []); // 僅在初次載入時執行

    useEffect(() => {
        const loadOptions = async () => {
            try {
                const memberList = await getAllMembers();
                setMembers(memberList);
                const staffList = await getStaffMembers(storeId ?? undefined);
                setStaffMembers(staffList);
            } catch (e) {
                console.error('載入選項失敗', e);
            }
        };
        loadOptions();
    }, [storeId]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const oid = params.get('order_id');
        if (oid) {
            const idNum = Number(oid);
            setEditingOrderId(idNum);
            const fetchOrder = async () => {
                try {
                    const detail = await getSalesOrderById(idNum);
                    setOrderNumber(detail.order_number);
                    setOrderDate(detail.order_date);
                    setMemberId(detail.member_id ? String(detail.member_id) : "");
                    setStaffId(detail.staff_id ? String(detail.staff_id) : "");
                    setStoreId(detail.store_id);
                    setSaleCategory(detail.sale_category || "");
                    setNote(detail.note || "");
                    setItems(detail.items || [{}]);
                    setSubtotal(detail.subtotal);
                    setTotalDiscount(detail.total_discount);
                    setGrandTotal(detail.grand_total);
                } catch (e) {
                    setError('載入銷售單失敗');
                }
            };
            fetchOrder();
        }
    }, [location.search]);
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
        // 必填欄位檢查
        if (!orderDate) {
            alert('請填寫銷售日期');
            return;
        }
        if (!memberId) {
            alert('請填寫購買人');
            return;
        }
        if (!staffId) {
            alert('請填寫銷售人');
            return;
        }
        if (grandTotal === 0) {
            alert('請填寫金額(小寫)');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const sanitizedItems: SalesOrderItemData[] = items.map(({ item_code, ...rest }) => ({
                product_id: rest.product_id ?? null,
                therapy_id: rest.therapy_id ?? null,
                item_description: rest.item_description || '',
                item_type: rest.item_type as 'Product' | 'Therapy',
                unit: rest.unit || '',
                unit_price: Number(rest.unit_price) || 0,
                quantity: Number(rest.quantity) || 0,
                subtotal: Number(rest.subtotal) || 0,
                category: rest.category || '',
                note: rest.note || ''
            }));
            const orderPayload: SalesOrderPayload = {
                order_number: orderNumber,
                order_date: orderDate,
                member_id: memberId ? parseInt(memberId) : null,
                staff_id: staffId ? parseInt(staffId) : null,
                store_id: storeId ?? 0,
                subtotal: subtotal,
                total_discount: totalDiscount,
                grand_total: grandTotal,
                sale_category: saleCategory,
                note: note,
                items: sanitizedItems,
            };
            
            const result = editingOrderId
                ? await updateSalesOrder(editingOrderId, orderPayload)
                : await addSalesOrder(orderPayload);
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
                            <Form.Group as={Row}><Form.Label column sm="3">購買人</Form.Label><Col sm="9"><Form.Select value={memberId} onChange={e => setMemberId(e.target.value)}><option value="">請選擇</option>{members.map(m => (<option key={m.Member_ID} value={m.Member_ID}>{m.Name}</option>))}</Form.Select></Col></Form.Group>
                        </Col>
                        <Col md={6}>
                             <Form.Group as={Row} className="mb-2"><Form.Label column sm="3">金額(小寫)</Form.Label><Col sm="9"><Form.Control value={grandTotal.toLocaleString()} readOnly /></Col></Form.Group>
                             <Form.Group as={Row}><Form.Label column sm="3">銷售人</Form.Label><Col sm="9"><Form.Select value={staffId} onChange={e => setStaffId(e.target.value)}><option value="">請選擇</option>{staffMembers.map(s => (<option key={s.staff_id} value={s.staff_id}>{s.name}</option>))}</Form.Select></Col></Form.Group>
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

