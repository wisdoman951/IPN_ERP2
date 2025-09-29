import React, { useState, useEffect } from "react";
import { Button, Container, Row, Col, Form, InputGroup, Alert, Card } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../../components/Header";
import DynamicContainer from "../../components/DynamicContainer";
import MemberColumn from "../../components/MemberColumn";
import MemberSummaryCard from "../../components/MemberSummaryCard";
import { MemberData } from "../../types/medicalTypes";
import { addProductSell, ProductSellData, getProductSellById, updateProductSell, ProductSell } from "../../services/ProductSellService";
import { getStoreId } from "../../services/LoginService";
import { fetchAllStores, Store } from "../../services/StoreService";
import { getStaffMembers, StaffMember } from "../../services/TherapyDropdownService";
import { SalesOrderItemData } from "../../services/SalesOrderService";
import { getUserRole, getStoreName } from "../../utils/authUtils";

interface SelectedProduct {
  type?: 'product' | 'bundle';
  product_id?: number;
  bundle_id?: number;
  code?: string;
  name?: string;
  content?: string;
  price: number;
  quantity: number;
  inventory_id?: number;
}

const paymentMethodDisplayMap: { [key: string]: string } = {
  "現金": "Cash",
  "信用卡": "CreditCard",
  "轉帳": "Transfer",
  "行動支付": "MobilePayment",
  "待付款": "Pending",
  "其他": "Others",
};

const paymentMethodValueMap: { [key: string]: string } = Object.fromEntries(
  Object.entries(paymentMethodDisplayMap).map(([key, value]) => [value, key])
);

const AddProductSell: React.FC = () => {
  const userRole = getUserRole();
  const navigate = useNavigate();
  const { sellId } = useParams<{ sellId?: string }>();
  const isEditMode = Boolean(sellId);

  const [stores, setStores] = useState<Store[]>([]);
  const [storeNameToId, setStoreNameToId] = useState<{ [name: string]: number }>({});
  const [selectedStore, setSelectedStore] = useState<string>(getStoreName() || "");

  const [storeId, setStoreId] = useState<string>("");
  const [memberCode, setMemberCode] = useState<string>("");
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
  const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);

  useEffect(() => {
    const init = async () => {
      const currentStoreId = getStoreId();
      const currentStoreName = getStoreName();
      if (currentStoreId) setStoreId(currentStoreId);
      else setError("無法獲取當前門市資訊，請重新登入。");

      let nameToIdMap: { [name: string]: number } = {};
      if (userRole === 'admin') {
        try {
          const data = await fetchAllStores();
          const uniqueStores = Array.from(new Map(data.map(s => [s.store_name, s])).values());
          setStores(uniqueStores);
          const map: { [name: string]: number } = {};
          uniqueStores.forEach(s => { map[s.store_name] = s.store_id; });
          nameToIdMap = map;
          setStoreNameToId(map);
          if (!isEditMode && !localStorage.getItem('productSellFormState')) {
            if (uniqueStores.length > 0) {
              setSelectedStore(uniqueStores[0].store_name);
              setStoreId(uniqueStores[0].store_id.toString());
            }
          }
        } catch (err) {
          console.error("載入分店資料失敗：", err);
          setError("載入分店資料失敗");
        }
      } else {
        if (currentStoreName) setSelectedStore(currentStoreName);
      }

      const fetchStaffMembersData = async () => {
        try {
          const data = await getStaffMembers(currentStoreId ? parseInt(currentStoreId) : undefined);
          setStaffMembers(data);
          if (!isEditMode && data.length > 0 && !localStorage.getItem('productSellFormState')) {
            setSelectedStaffId(data[0].staff_id.toString());
          }
        } catch (err) {
          console.error("載入銷售人員資料失敗：", err);
          setError("載入銷售人員資料失敗");
        }
      };
      await fetchStaffMembersData();

      if (isEditMode && sellId) {
        try {
          const saleData: ProductSell = await getProductSellById(parseInt(sellId));
          setMemberCode(saleData.member_code || "");
          setMemberId(saleData.member_id.toString());
          setMemberName(saleData.member_name || "");
          setPurchaseDate(saleData.date ? new Date(saleData.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);

          const product: SelectedProduct = {
            type: saleData.bundle_id ? 'bundle' : 'product',
            product_id: saleData.product_id || undefined,
            bundle_id: saleData.bundle_id || undefined,
            code: saleData.product_code || '',
            name: saleData.product_name || "",
            price: saleData.unit_price || 0,
            quantity: saleData.quantity || 0,
          };
          setSelectedProducts([product]);
          const originalTotal = (saleData.unit_price || 0) * (saleData.quantity || 0);
          setProductsOriginalTotal(originalTotal);
          setOrderDiscountAmount(saleData.discount_amount || 0);
          setFinalPayableAmount(saleData.final_price ?? originalTotal - (saleData.discount_amount || 0));
          setPaymentMethod(paymentMethodValueMap[saleData.payment_method || 'Cash'] || paymentMethodOptions[0]);
          setSaleCategory(saleCategoryOptions.includes(saleData.sale_category || '') ? saleData.sale_category! : saleCategoryOptions[0]);
          setSelectedStaffId(saleData.staff_id ? saleData.staff_id.toString() : '');
          setNote(saleData.note || '');
          if (saleData.store_id) setStoreId(saleData.store_id.toString());
          if (saleData.store_name) setSelectedStore(saleData.store_name);
        } catch (err) {
          console.error("載入銷售資料失敗：", err);
          setError("載入銷售資料失敗");
        }
        return;
      }

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
          if (formState.memberCode) setMemberCode(formState.memberCode);
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
          if (formState.selectedStore && formState.selectedStore === currentStoreName) {
            setSelectedStore(formState.selectedStore);
            const id = nameToIdMap[formState.selectedStore] || currentStoreId;
            if (id) setStoreId(id.toString());
          } else {
            if (currentStoreName) setSelectedStore(currentStoreName);
            if (currentStoreId) setStoreId(currentStoreId);
          }
          if (typeof formState.discountAmount === 'number') {
            currentDiscAmount = formState.discountAmount;
            setOrderDiscountAmount(currentDiscAmount);
          }
        } catch (e) { console.error("解析 productSellFormState 失敗", e); }
      }
      setFinalPayableAmount(currentTotalFromProds - currentDiscAmount);
    };
    init();
  }, [isEditMode, sellId]);

  useEffect(() => {
    const newTotal = selectedProducts.reduce((sum, p) => sum + (p.price || 0) * (p.quantity || 0), 0);
    setProductsOriginalTotal(newTotal);
  }, [selectedProducts]);

  useEffect(() => {
    setFinalPayableAmount(productsOriginalTotal - orderDiscountAmount);
  }, [productsOriginalTotal, orderDiscountAmount]);

  const handleMemberChange = (code: string, name: string, data: MemberData | null) => {
    setMemberCode(code);
    setMemberName(name);
    setMemberId(data?.member_id?.toString() || "");
    setError(null);
    setSelectedMember(data);
  };
  const handleError = (errorMsg: string) => {
    setError(errorMsg);
    setSelectedMember(null);
  };
  const handleError = (errorMsg: string) => {
    setError(errorMsg);
  };
  const handleMemberError = (errorMsg: string) => {
    setError(errorMsg);
  };
  const openProductSelection = () => {
    const formState = {
      selectedStore,
      memberCode,
      memberId,
      memberName,
      purchaseDate,
      paymentMethod,
      transferCode,
      cardNumber,
      saleCategory,
      note,
      selectedStaffId,
      discountAmount: orderDiscountAmount,
    };
    localStorage.setItem('productSellFormState', JSON.stringify(formState));
    localStorage.setItem('selectedProducts', JSON.stringify(selectedProducts));
    navigate('/product-selection', { state: { fromSellPage: true } });
  };
  const processSale = async (): Promise<boolean> => {
    setFormSubmitted(true);
    setError(null);

    const today = new Date();
    today.setHours(0,0,0,0);
    const selectedDate = new Date(purchaseDate);
    selectedDate.setHours(0,0,0,0);

    if (selectedDate > today) { setError("購買日期不能選擇未來日期。"); return false; }
    if (!storeId) { setError("無法獲取當前門市資訊，請重新登入。"); return false; }
    if (!memberCode || !memberId) { setError("請選擇會員並確認姓名。"); return false; }
    if (selectedProducts.length === 0) { setError("請選擇至少一項購買品項。"); return false; }
    if (!paymentMethod) { setError("請選擇付款方式。"); return false; }
    if (!selectedStaffId) { setError("請選擇銷售人員。"); return false; }
    if (!saleCategory) { setError("請選擇銷售類別。"); return false; }
    if (orderDiscountAmount < 0) { setError("折價金額不能為負數。"); return false; }
    if (finalPayableAmount < 0) { setError("應收金額低於零，請檢查產品總價和折價。"); return false; }

    setLoading(true);
    try {
      const paymentMethodInEnglish = paymentMethodDisplayMap[paymentMethod] || paymentMethod;

      if (isEditMode && sellId) {
        const product = selectedProducts[0];
        let itemFinalPrice = product.price * product.quantity;
        let itemDiscountAmount = orderDiscountAmount;
        if (productsOriginalTotal > 0 && orderDiscountAmount > 0) {
          itemFinalPrice = productsOriginalTotal - orderDiscountAmount;
        }

        const sellData: ProductSellData = {
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

        if (product.product_id) {
          sellData.product_id = product.product_id;
        } else if (product.bundle_id) {
          sellData.bundle_id = product.bundle_id;
        }

        await updateProductSell(parseInt(sellId), sellData);
      } else {
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

          if (product.product_id) {
            sellData.product_id = product.product_id;
          } else if (product.bundle_id) {
            sellData.bundle_id = product.bundle_id;
          }

          await addProductSell(sellData);
        }
      }

      // 只在送出成功時清除
      localStorage.removeItem('productSellFormState');
      localStorage.removeItem('selectedProducts');
      return true;
    } catch (err: unknown) {
      console.error("新增產品銷售失敗:", err);
      const error = err as { response?: { data?: { error?: string } }; message?: string };
      setError(error.response?.data?.error || error.message || "新增產品銷售失敗，請檢查輸入並重試。");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await processSale();
    if (success) {
      alert(isEditMode ? "銷售記錄已成功更新！" : "銷售記錄已成功新增！");
      navigate('/product-sell', { state: { refresh: true } });
    }
  };

  const handlePrint = async () => {
    const success = await processSale();
    if (success) {
      const itemsForOrder: SalesOrderItemData[] = selectedProducts.map(p => ({
        product_id: p.product_id ?? p.bundle_id ?? undefined,
        item_description: p.name || p.content,
        item_type: 'Product',
        item_code: p.code,
        unit: '個',
        unit_price: p.price,
        quantity: p.quantity,
        subtotal: p.price * p.quantity,
      }));
      localStorage.setItem('selectedSalesOrderItems', JSON.stringify(itemsForOrder));
      const staffName = staffMembers.find(st => st.staff_id === parseInt(selectedStaffId))?.name || '';
      const preSaleData = {
        orderDate: purchaseDate,
        saleUnit: selectedStore,
        saleCategory,
        buyer: memberName,
        buyerId: memberId,
        salesperson: staffName,
        staffId: selectedStaffId,
      };
      localStorage.setItem('preSaleData', JSON.stringify(preSaleData));
      alert("銷售資料已儲存，跳轉至列印頁面。");
      navigate('/finance/sales/add');
    }
  };

  const handleCancel = () => {
    localStorage.removeItem('selectedProducts');
    localStorage.removeItem('productSellFormState');
    navigate(-1);
  };
  
  const content = (
    <Container className="my-4">
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      <Row className="justify-content-center">
        <Col md={10}>
          <Card className="shadow-sm">
            <Card.Header className="bg-info text-white">新增產品銷售</Card.Header>
            <Card.Body>
      <Form onSubmit={handleSubmit} noValidate>
        <Row className="g-3">
          {/* --- Left Column --- */}
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>店別</Form.Label>
              {userRole === 'admin' ? (
                <Form.Select
                  value={selectedStore}
                  onChange={(e) => {
                    const name = e.target.value;
                    setSelectedStore(name);
                    const id = storeNameToId[name];
                    if (id) setStoreId(id.toString());
                  }}
                  required
                >
                  {stores.map(store => (
                    <option key={store.store_id} value={store.store_name}>{store.store_name}</option>
                  ))}
                </Form.Select>
              ) : (
                <Form.Control value={selectedStore} readOnly disabled />
              )}
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>購買人姓名</Form.Label>
              <MemberColumn memberCode={memberCode} name={memberName} isEditMode={false} onMemberChange={handleMemberChange} onError={handleMemberError} />
              {formSubmitted && (!memberCode || !memberId) && <div className="text-danger d-block small mt-1">請選擇購買會員</div>}
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>購買品項</Form.Label>
              <div className="d-flex gap-2">
                <div className="flex-grow-1 border rounded p-2" style={{ minHeight: "40px", maxHeight: "120px", overflowY: "auto" }}>
                  {selectedProducts.length > 0 ? ( selectedProducts.map((p, i) => ( <div key={i}>{p.name || p.content} (單價: NT${p.price.toLocaleString()}) x {p.quantity}</div>))
                  ) : ( <span className="text-muted">點擊「選取」按鈕選擇產品</span> )}
                </div>
                <Button variant="info" type="button" className="text-white align-self-start px-3" onClick={openProductSelection}>選取</Button>
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
            <MemberSummaryCard
              member={selectedMember}
              memberCode={memberCode}
              fallbackName={memberName}
              className="mb-3 shadow-sm"
            />
            <Form.Group className="mb-3">
              <Form.Label>購買日期</Form.Label>
              <Form.Control type="date" lang="en-CA" value={purchaseDate} max={new Date().toISOString().split("T")[0]} onChange={(e) => setPurchaseDate(e.target.value)} required />
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
            <Button variant="info" type="button" className="text-white" onClick={handleCancel} disabled={loading}>
              取消
            </Button>
            <Button variant="info" type="button" className="text-white" onClick={handlePrint} disabled={loading}>
              列印
            </Button>
          </Col>
        </Row>
      </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
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