// client/src/pages/finance/AddSalesOrder.tsx (新檔案)
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Card, Alert, Spinner } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../../components/Header';
import DynamicContainer from '../../components/DynamicContainer';
import { SalesOrderItemData, SalesOrderPayload, addSalesOrder, getSalesOrderById, updateSalesOrder } from '../../services/SalesOrderService';
import { getAllMembers, Member } from '../../services/MemberService';
import { getStaffMembers, StaffMember } from '../../services/TherapyDropdownService';
import { getStoreName } from '../../services/AuthUtils';
import { formatDateForInput } from '../../utils/dateUtils';
import './printStyles.css';
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
    const [saleCategory, setSaleCategory] = useState(""); // 銷售類別
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

    const normalizeItems = (arr: any[]): Partial<SalesOrderItemData>[] =>
        arr.map(item => ({
            ...item,
            unit_price: Number(item.unit_price) || 0,
            quantity: Number(item.quantity) || 0,
            subtotal: Number(item.subtotal) || 0,
        }));

    // 金額計算
    const [subtotal, setSubtotal] = useState(0);
    const [totalDiscount, setTotalDiscount] = useState(0); // 總折價
    const [grandTotal, setGrandTotal] = useState(0);

    const selectedMemberName = memberId
        ? members.find(member => String(member.Member_ID) === String(memberId))?.Name || ''
        : '';
    const selectedStaffName = staffId
        ? staffMembers.find(staff => String(staff.staff_id) === String(staffId))?.name || ''
        : '';

    // 動態更新項目
    const handleItemChange = (index: number, field: keyof SalesOrderItemData, value: string | number) => {
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
        setSaleUnit(getStoreName() || "");
        const storedSelected = localStorage.getItem('selectedSalesOrderItems');
        const storedCurrent = localStorage.getItem('currentSalesOrderItems');
        if (storedSelected) {
            try {
                const parsed = normalizeItems(JSON.parse(storedSelected));
                setItems(parsed);
            } catch (e) {
                console.error("解析已選品項失敗", e);
            }
        } else if (storedCurrent) {
            // 若從品項選擇頁取消返回，恢復先前暫存的項目
            try {
                const parsed = normalizeItems(JSON.parse(storedCurrent));
                setItems(parsed);
            } catch (e) {
                console.error("解析暫存品項失敗", e);
            }
        }
        localStorage.removeItem('selectedSalesOrderItems');
        localStorage.removeItem('currentSalesOrderItems');
        const preSale = localStorage.getItem('preSaleData');
        if (preSale) {
            try {
                const parsed = JSON.parse(preSale);
                if (parsed.orderDate) setOrderDate(parsed.orderDate);
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
                    setOrderDate(formatDateForInput(detail.order_date));
                    setMemberId(detail.member_id ? String(detail.member_id) : "");
                    setStaffId(detail.staff_id ? String(detail.staff_id) : "");
                    setStoreId(detail.store_id);
                    setSaleCategory(detail.sale_category || "");
                    setNote(detail.note || "");
                    setItems(detail.items || [{}]);
                    setSubtotal(detail.subtotal);
                    setTotalDiscount(detail.total_discount);
                    setGrandTotal(detail.grand_total);
                } catch {
                    setError('載入銷售單失敗');
                }
            };
            fetchOrder();
        }
    }, [location.search]);
    const openItemSelection = () => {
        // 將目前已填寫的項目（排除空白行）暫存，讓品項選擇頁或返回時能夠保留
        const filled = items.filter(i => i.item_description);
        if (filled.length > 0) {
            localStorage.setItem('currentSalesOrderItems', JSON.stringify(filled));
        } else {
            localStorage.removeItem('currentSalesOrderItems');
        }
        navigate('/finance/item-selection'); // 跳轉到品項選擇頁
    };
    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    // 計算總金額
    useEffect(() => {
        const newSubtotal = items.reduce(
            (sum, item) => sum + (Number(item.subtotal) || 0),
            0
        );
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
            const sanitizedItems: SalesOrderItemData[] = items.map(item => ({
                product_id: item.product_id ?? null,
                therapy_id: item.therapy_id ?? null,
                item_description: item.item_description || '',
                item_type: item.item_type as 'Product' | 'Therapy',
                unit: item.unit || '',
                unit_price: Number(item.unit_price) || 0,
                quantity: Number(item.quantity) || 0,
                subtotal: Number(item.subtotal) || 0,
                category: item.category || '',
                note: item.note || ''
            }));
            const orderPayload: SalesOrderPayload = {
                order_number: orderNumber,
                order_date: formatDateForInput(orderDate),
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
            } catch (err: unknown) {
                if (err && typeof err === 'object' && 'error' in err) {
                    setError((err as { error: string }).error);
                } else {
                    setError('提交時發生錯誤');
                }
        } finally {
            setLoading(false);
        }
    };

    // 列印銷售單內容
    const handlePrint = () => {
        window.print();
    };

    const formatNumber = (value: number | string | undefined | null) => {
        if (value === undefined || value === null || value === '') {
            return '';
        }
        const numeric = typeof value === 'number' ? value : Number(value);
        if (Number.isNaN(numeric)) {
            return '';
        }
        return numeric.toLocaleString();
    };

    const printableItems = items.filter(item =>
        item.item_description ||
        item.item_code ||
        item.unit ||
        item.unit_price ||
        item.quantity ||
        item.subtotal ||
        item.category ||
        item.note
    );

    const renderPrintableCard = (copyLabel: string) => (
        <Card className="print-card">
            <Card.Header className="text-center">
                <h4>全崴國際無限充能館</h4>
                <h3>銷售單</h3>
                <div className="text-end copy-label">{copyLabel}</div>
            </Card.Header>
            <Card.Body>
                <Row className="mb-3">
                    <Col md={3} sm={6} className="mb-2">
                        <div><strong>銷售單號：</strong>{orderNumber}</div>
                    </Col>
                    <Col md={3} sm={6} className="mb-2">
                        <div><strong>銷售單位：</strong>{saleUnit}</div>
                    </Col>
                    <Col md={3} sm={6} className="mb-2">
                        <div><strong>銷售類別：</strong>{saleCategory}</div>
                    </Col>
                    <Col md={3} sm={6} className="mb-2">
                        <div><strong>銷售日期：</strong>{orderDate}</div>
                    </Col>
                </Row>

                <div className="table-responsive">
                    <table className="table table-bordered print-table">
                        <thead>
                            <tr>
                                <th>序號</th>
                                <th>編號</th>
                                <th style={{ minWidth: '400px' }}>產品名稱/規格型號</th>
                                <th>單位</th>
                                <th>單價</th>
                                <th>數量</th>
                                <th>小計</th>
                                <th>分類</th>
                                <th>備註</th>
                            </tr>
                        </thead>
                        <tbody>
                            {printableItems.length > 0 ? (
                                printableItems.map((item, index) => (
                                    <tr key={`print-${index}`}>
                                        <td>{index + 1}</td>
                                        <td>{item.item_code || ''}</td>
                                        <td style={{ minWidth: '300px' }}>{item.item_description || ''}</td>
                                        <td>{item.unit || ''}</td>
                                        <td>{formatNumber(item.unit_price)}</td>
                                        <td>{formatNumber(item.quantity)}</td>
                                        <td>{formatNumber(item.subtotal)}</td>
                                        <td>{item.category || ''}</td>
                                        <td>{item.note || ''}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={9} className="text-center">無品項資料</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <Row className="mt-3">
                    <Col md={6} className="mb-2">
                        <div className="mb-2"><strong>金額(大寫)：</strong></div>
                        <div><strong>購買人：</strong>{selectedMemberName}</div>
                    </Col>
                    <Col md={6} className="mb-2">
                        <div className="mb-2"><strong>金額(小寫)：</strong>{formatNumber(grandTotal)}</div>
                        <div><strong>銷售人：</strong>{selectedStaffName}</div>
                    </Col>
                </Row>
                {note && (
                    <Row className="mt-2">
                        <Col>
                            <div><strong>備註：</strong>{note}</div>
                        </Col>
                    </Row>
                )}
            </Card.Body>
            <Card.Footer className="d-flex justify-content-between print-footer">
                <div>使用者簽名：____________________</div>
                <div>門市簽收：____________________</div>
            </Card.Footer>
        </Card>
    );

    const interactiveContent = (
        <Container className="p-4">
            <Card>
                <Card.Header className="text-center">
                    <h4>全崴國際無限充能館</h4>
                    <h3>銷售單</h3>
                </Card.Header>
                <Card.Body>
                    {error && <Alert variant="danger">{error}</Alert>}
                    <Row className="mb-3">
                        <Col md={3}><Form.Group><Form.Label>銷售單號</Form.Label><Form.Control value={orderNumber} readOnly /></Form.Group></Col>
                        <Col md={3}><Form.Group><Form.Label>銷售單位</Form.Label><Form.Control value={saleUnit} readOnly disabled /></Form.Group></Col>
                        <Col md={3}><Form.Group><Form.Label>銷售類別</Form.Label><Form.Control value={saleCategory} onChange={e => setSaleCategory(e.target.value)}/></Form.Group></Col>
                        <Col md={3}><Form.Group><Form.Label>銷售日期</Form.Label><Form.Control type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)}/></Form.Group></Col>
                    </Row>

                    {/* 表格化項目輸入 */}
                    <div className="table-responsive">
                        <table className="table table-bordered print-table">
                            <thead>
                                <tr>
                                    <th>序號</th>
                                    <th>編號</th>
                                    <th style={{ minWidth: '400px' }}>產品名稱/規格型號</th>
                                    <th>單位</th>
                                    <th>單價</th>
                                    <th>數量</th>
                                    <th>小計</th>
                                    <th>分類</th>
                                    <th>備註</th>
                                    <th className="no-print">操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, index) => (
                                    <tr key={index}>
                                        <td>{index + 1}</td>
                                        <td><Form.Control size="sm" value={item.item_code || ""} readOnly /></td>
                                        <td style={{ minWidth: '300px' }}>
                                            <Form.Control
                                                size="sm"
                                                value={item.item_description || ''}
                                                onChange={e => handleItemChange(index, 'item_description', e.target.value)}
                                            />
                                        </td>
                                        <td><Form.Control size="sm" value={item.unit || ""} onChange={e => handleItemChange(index, 'unit', e.target.value)} /></td>
                                        <td><Form.Control type="number" size="sm" value={item.unit_price || ""} onChange={e => handleItemChange(index, 'unit_price', Number(e.target.value))} /></td>
                                        <td><Form.Control type="number" size="sm" value={item.quantity || ""} onChange={e => handleItemChange(index, 'quantity', Number(e.target.value))} /></td>
                                        <td><Form.Control size="sm" value={item.subtotal || ""} readOnly disabled /></td>
                                        <td><Form.Control size="sm" value={item.category || ""} onChange={e => handleItemChange(index, 'category', e.target.value)} /></td>
                                        <td><Form.Control size="sm" value={item.note || ""} onChange={e => handleItemChange(index, 'note', e.target.value)} /></td>
                                        <td className="no-print"><Button variant="outline-danger" size="sm" onClick={() => removeItem(index)}>X</Button></td>
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
                <Card.Footer className="text-center no-print">
                    <Button variant="info" className="mx-1 text-white" onClick={handlePrint}>列印</Button>
                    <Button variant="info" className="mx-1 text-white" onClick={() => setItems([{}])}>刪除</Button>
                    <Button variant="info" className="mx-1 text-white" onClick={handleSubmit} disabled={loading}>
                        {loading ? <Spinner as="span" size="sm" /> : "確認"}
                    </Button>
                </Card.Footer>
            </Card>
        </Container>
    );

    const printableContent = (
        <Container className="p-4">
            <div className="print-duplicate">
                {renderPrintableCard('顧客聯')}
                {renderPrintableCard('門市聯')}
            </div>
        </Container>
    );

    // --- JSX 部分 ---
    const content = (
        <>
            <div className="screen-only">{interactiveContent}</div>
            <div className="print-only">{printableContent}</div>
        </>
    );

    return (
        <div className="d-flex flex-column min-vh-100 bg-light">
            <Header />
            <DynamicContainer content={content} className="print-container" />
        </div>
    );
};

export default AddSalesOrder;

