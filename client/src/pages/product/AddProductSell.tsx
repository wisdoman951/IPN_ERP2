import React, { useState, useEffect } from "react";
import { Button, Container, Row, Col, Form, InputGroup, Alert } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import DynamicContainer from "../../components/DynamicContainer";
import MemberColumn from "../../components/MemberColumn";
import { addProductSell, ProductSellData } from "../../services/ProductSellService";
import { getStoreId } from "../../services/LoginService";
import { getStaffMembers, StaffMember } from "../../services/TherapyDropdownService";

interface SelectedProduct {
  product_id: number;
  name: string;
  price: number;
  quantity: number;
  inventory_id: number;
}

const paymentMethodDisplayMap: { [key: string]: string } = {
  "現金": "Cash",
  "信用卡": "CreditCard",
  "轉帳": "Transfer",
  "行動支付": "MobilePayment",
  "待付款": "Pending",
  "其他": "Others",
};

const AddProductSell: React.FC = () => {
  const [selectedStore, setSelectedStore] = useState<string>("");
  const storeOptions = ["店別A", "店別B", "店別C"];
  const navigate = useNavigate();

  const [storeId, setStoreId] = useState<string>("");
  const [memberId, setMemberId] = useState<string>("");
  const [memberName, setMemberName] = useState<string>("");
  const [purchaseDate, setPurchaseDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const paymentMethodOptions = Object.keys(paymentMethodDisplayMap);
  const [paymentMethod, setPaymentMethod] = useState<string>(paymentMethodOptions[0]);
  const [transferCode, setTransferCode] = useState<string>("");
  const [cardNumber, setCardNumber] = useState<string>("");
  const saleCategoryOptions = ["銷售", "贈品", "折扣", "預購", "暫借"];
  const [saleCategory, setSaleCategory] = useState<string>(saleCategoryOptions[0]);
  const [note, setNote] = useState<string>("");
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [productsOriginalTotal, setProductsOriginalTotal] = useState<number>(0);
  const [orderDiscountAmount, setOrderDiscountAmount] = useState<number>(0);
  const [finalPayableAmount, setFinalPayableAmount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [formSubmitted, setFormSubmitted] = useState<boolean>(false);

  useEffect(() => {
    const currentStoreId = getStoreId();
    if (currentStoreId) setStoreId(currentStoreId);
    else setError("無法獲取當前門市資訊，請重新登入。");

    const fetchStaffMembers = async () => {
      try {
        const data = await getStaffMembers();
        setStaffMembers(data);
        if (data.length > 0 && !localStorage.getItem('productSellFormState')) {
          setSelectedStaffId(data[0].staff_id.toString());
        }
      } catch (err) { 
        console.error("載入銷售人員資料失敗：", err); 
        setError("載入銷售人員資料失敗"); 
      }
    };
    fetchStaffMembers();

    // ---- 資料還原在這邊 ----
    const selectedProductsData = localStorage.getItem('selectedProducts');
    const formStateData = localStorage.getItem('productSellFormState');
    let initialProducts: SelectedProduct[] = [];
    if (selectedProductsData) {
      try { 
        initialProducts = JSON.parse(selectedProductsData); 
        setSelectedProducts(initialProducts); 
      }
      catch (e) { console.error("解析 selectedProducts 失敗", e); }
    }
    let currentTotalFromProds = 0;
    initialProducts.forEach(p => {
      currentTotalFromProds += (p.price || 0) * (p.quantity || 0);
    });
    setProductsOriginalTotal(currentTotalFromProds);

    let currentDiscAmount = 0;
    if (formStateData) {
      try {
        const formState = JSON.parse(formStateData);
        if (formState.memberId) setMemberId(formState.memberId);
        if (formState.memberName) setMemberName(formState.memberName);
        if (formState.purchaseDate) setPurchaseDate(formState.purchaseDate);
        if (formState.paymentMethod && paymentMethodOptions.includes(formState.paymentMethod)) {
          setPaymentMethod(formState.paymentMethod);
        }
        if (formState.transferCode) setTransferCode(formState.transferCode);
        if (formState.cardNumber) setCardNumber(formState.cardNumber);
        if (formState.saleCategory) setSaleCategory(formState.saleCategory);
        if (formState.note) setNote(formState.note);
        if (formState.selectedStaffId) setSelectedStaffId(formState.selectedStaffId);
        if (formState.selectedStore) setSelectedStore(formState.selectedStore);
        if (typeof formState.discountAmount === 'number') {
          currentDiscAmount = formState.discountAmount;
          setOrderDiscountAmount(currentDiscAmount);
        }
      } catch (e) { console.error("解析 productSellFormState 失敗", e); }
    }
    setFinalPayableAmount(currentTotalFromProds - currentDiscAmount);

    // 千萬不要在這裡清除 localStorage！
    // return () => {
    //   localStorage.removeItem('selectedProducts');
    //   localStorage.removeItem('productSellFormState');
    // };
  }, []);

  useEffect(() => {
    const newTotal = selectedProducts.reduce((sum, p) => sum + (p.price || 0) * (p.quantity || 0), 0);
    setProductsOriginalTotal(newTotal);
  }, [selectedProducts]);

  useEffect(() => {
    setFinalPayableAmount(productsOriginalTotal - orderDiscountAmount);
  }, [productsOriginalTotal, orderDiscountAmount]);

  const handleMemberChange = (id: string, name: string) => {
    setMemberId(id);
    setMemberName(name);
    setError(null);
  };
  const handleError = (errorMsg: string) => setError(errorMsg);
  const openProductSelection = () => {
    const formState = {
      selectedStore,
      memberId, memberName, purchaseDate, paymentMethod,
      transferCode, cardNumber, saleCategory, note,
      selectedStaffId, discountAmount: orderDiscountAmount,
    };
    localStorage.setItem('productSellFormState', JSON.stringify(formState));
    localStorage.setItem('selectedProducts', JSON.stringify(selectedProducts));
    navigate('/product-selection', { state: { fromSellPage: true } });
  };
  const handlePrint = () => { window.print(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
    setError(null);

    const today = new Date();
    today.setHours(0,0,0,0);
    const selectedDate = new Date(purchaseDate);
    selectedDate.setHours(0,0,0,0);

    if (selectedDate > today) { setError("購買日期不能選擇未來日期。"); return; }
    if (!storeId) { setError("無法獲取門市資訊，請重新登入。"); return; }
    if (!memberId || !memberName) { setError("請選擇會員並確認姓名。"); return; }
    if (selectedProducts.length === 0) { setError("請選擇至少一項購買品項。"); return; }
    if (!paymentMethod) { setError("請選擇付款方式。"); return; }
    if (!selectedStaffId) { setError("請選擇銷售人員。"); return; }
    if (!saleCategory) { setError("請選擇銷售類別。"); return; }
    if (orderDiscountAmount < 0) { setError("折價金額不能為負數。"); return; }
    if (finalPayableAmount < 0) { setError("應收金額低於零，請檢查產品總價和折價。"); return;}

    setLoading(true);
    try {
      const paymentMethodInEnglish = paymentMethodDisplayMap[paymentMethod] || paymentMethod;

      for (const product of selectedProducts) {
        let itemFinalPrice = product.price * product.quantity;
        let itemDiscountAmount = 0;
        if (productsOriginalTotal > 0 && orderDiscountAmount > 0 && selectedProducts.length > 0) {
            const productOriginalValue = product.price * product.quantity;
            const proportion = productOriginalValue / productsOriginalTotal;
            itemDiscountAmount = parseFloat((orderDiscountAmount * proportion).toFixed(2));
            itemFinalPrice = parseFloat((productOriginalValue - itemDiscountAmount).toFixed(2));
        } else if (productsOriginalTotal === 0 && orderDiscountAmount > 0 && selectedProducts.length === 1 && product.quantity > 0) {
            itemDiscountAmount = orderDiscountAmount / product.quantity;
            itemFinalPrice = (product.price * product.quantity) - orderDiscountAmount;
        }

        const sellData: ProductSellData = {
          product_id: product.product_id,
          member_id: parseInt(memberId),
          store_id: parseInt(storeId),
          staff_id: selectedStaffId ? parseInt(selectedStaffId) : undefined,
          date: purchaseDate,
          payment_method: paymentMethodInEnglish,
          transfer_code: paymentMethod === "轉帳" ? transferCode : undefined,
          card_number: paymentMethod === "信用卡" ? cardNumber : undefined,
          sale_category: saleCategory,
          quantity: product.quantity,
          note: note,
          unit_price: product.price,
          discount_amount: itemDiscountAmount,
          final_price: itemFinalPrice,
        };
        await addProductSell(sellData);
      }

      // 只在送出成功時清除
      localStorage.removeItem('productSellFormState');
      localStorage.removeItem('selectedProducts');
      alert("銷售記錄已成功新增！");
      navigate('/product-sell', { state: { refresh: true } });
    } catch (err: any) {
      console.error("新增產品銷售失敗:", err);
      setError(err.response?.data?.error || err.message || "新增產品銷售失敗，請檢查輸入並重試。");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    localStorage.removeItem('selectedProducts');
    localStorage.removeItem('productSellFormState');
    navigate(-1);
  };
  
  const content = (
    <Container className="my-4">
      {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}
      <Form onSubmit={handleSubmit} noValidate>
        <Row className="g-3">
          {/* --- Left Column --- */}
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>店別</Form.Label>
              <Form.Select value={selectedStore} onChange={(e) => setSelectedStore(e.target.value)} required>
                <option value="" disabled>請選擇店別</option>
                {storeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>購買人姓名</Form.Label>
              <MemberColumn memberId={memberId} name={memberName} onMemberChange={handleMemberChange} onError={handleError} triggerSearchOnMount={false} />
              {formSubmitted && !memberName && <div className="text-danger d-block small mt-1">請選擇購買會員</div>}
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>購買品項</Form.Label>
              <div className="d-flex gap-2">
                <div className="flex-grow-1 border rounded p-2" style={{ minHeight: "40px", maxHeight: "120px", overflowY: "auto" }}>
                  {selectedProducts.length > 0 ? ( selectedProducts.map((p, i) => ( <div key={i}>{p.name} (單價: NT${p.price.toLocaleString()}) x {p.quantity}</div>))
                  ) : ( <span className="text-muted">點擊「選取」按鈕選擇產品</span> )}
                </div>
                <Button variant="info" className="text-white align-self-start px-3" onClick={openProductSelection}>選取</Button>
              </div>
              <Form.Text muted>可複選，跳出新視窗選取。</Form.Text>
              {formSubmitted && selectedProducts.length === 0 && <div className="text-danger d-block small mt-1">請選擇購買品項</div>}
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>付款方式</Form.Label>
              <Form.Select value={paymentMethod} onChange={(e) => {
                setPaymentMethod(e.target.value);
                if (e.target.value !== "信用卡") setCardNumber("");
                if (e.target.value !== "轉帳") setTransferCode("");
              }} required>
                {paymentMethodOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </Form.Select>
              <Form.Text muted>下拉式：現金、轉帳(輸入末五碼)、信用卡(輸入卡號後五碼)、行動支付。</Form.Text>
            </Form.Group>

            {paymentMethod === "信用卡" && ( <Form.Group className="mb-3"><Form.Label>卡號後五碼</Form.Label><Form.Control type="text" maxLength={5} pattern="\d*" value={cardNumber} onChange={(e) => setCardNumber(e.target.value.replace(/\D/g,'').slice(0,5))} placeholder="請輸入信用卡號後五碼" /></Form.Group> )}
            {paymentMethod === "轉帳" && ( <Form.Group className="mb-3"><Form.Label>轉帳帳號末五碼</Form.Label><Form.Control type="text" maxLength={5} pattern="\d*" value={transferCode} onChange={(e) => setTransferCode(e.target.value.replace(/\D/g,'').slice(0,5))} placeholder="請輸入轉帳帳號末五碼" /></Form.Group> )}
            
            <Form.Group className="mb-3">
              <Form.Label>銷售類別</Form.Label>
              <Form.Select value={saleCategory} onChange={(e) => setSaleCategory(e.target.value)} required>
                {saleCategoryOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </Form.Select>
              <Form.Text muted>下拉式：銷售、贈品、折扣、預購、暫借，需連動後台系統。</Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
                <Form.Label>總價</Form.Label>
                <Form.Control type="text" value={`NT$ ${productsOriginalTotal.toLocaleString()}`} readOnly disabled className="bg-light text-end" />
            </Form.Group>

            <Form.Group className="mb-3">
                <Form.Label>應收</Form.Label>
                <Form.Control type="text" value={`NT$ ${finalPayableAmount.toLocaleString()}`} readOnly disabled className="bg-light text-end" />
            </Form.Group>
          </Col>

          {/* --- Right Column --- */}
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>會員編號</Form.Label>
              <Form.Control type="text" value={memberId} readOnly disabled className="bg-light"/>
              {formSubmitted && !memberId && <div className="text-danger d-block small mt-1">請選擇會員</div>}
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>購買日期</Form.Label>
              <Form.Control type="date" value={purchaseDate} max={new Date().toISOString().split("T")[0]} onChange={(e) => setPurchaseDate(e.target.value)} required />
              <Form.Text muted>選擇購買日期。會跳出日曆，無法選取未來日期。</Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>價錢</Form.Label>
              <Form.Control type="text" value={`NT$ ${productsOriginalTotal.toLocaleString()}`} readOnly disabled className="bg-light text-end" />
              <Form.Text muted>自動帶出，價格固定不能修改。</Form.Text>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>銷售人員</Form.Label>
              <Form.Select value={selectedStaffId} onChange={(e) => setSelectedStaffId(e.target.value)} required>
                <option value="">請選擇銷售人員</option>
                {staffMembers.map(staff => ( <option key={staff.staff_id} value={staff.staff_id.toString()}> {staff.name || staff.Staff_Name} </option> ))}
              </Form.Select>
              <Form.Text muted>下拉式：連動各店後台系統、報表。</Form.Text>
              {formSubmitted && !selectedStaffId && <div className="text-danger d-block small mt-1">請選擇銷售人員</div>}
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>備註</Form.Label>
              <Form.Control as="textarea" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="不須必填" />
              <Form.Text muted>非必填。</Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>折價</Form.Label>
              <InputGroup>
                <InputGroup.Text>NT$</InputGroup.Text>
                <Form.Control type="number" min="0" step="any" value={orderDiscountAmount} onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setOrderDiscountAmount(isNaN(val) || val < 0 ? 0 : val);
                }} placeholder="輸入整筆訂單折價金額" />
              </InputGroup>
            </Form.Group>
          </Col>
        </Row>

        <Row className="mt-4">
          <Col className="d-flex justify-content-end gap-2">
            <Button variant="info" className="text-white" type="submit" disabled={loading}>
              {loading ? "處理中..." : "確認"}
            </Button>
            <Button variant="info" className="text-white" onClick={() => {handleCancel}} disabled={loading}>
              取消
            </Button>
            <Button variant="info" className="text-white" onClick={handlePrint} disabled={loading}>
              列印
            </Button>
          </Col>
        </Row>
      </Form>
    </Container>
  );

  return (
    <>
      <Header />
      <DynamicContainer content={content} className="p-0" />
    </>
  );
};

export default AddProductSell;