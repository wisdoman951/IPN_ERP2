// src/pages/product/EditProductSell.tsx
import React, { useState, useEffect } from "react";
import { Button, Container, Row, Col, Form, InputGroup, Alert, Spinner } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../../components/Header";
import DynamicContainer from "../../components/DynamicContainer";
import MemberColumn from "../../components/MemberColumn";
import { 
    getProductSellById, 
    updateProductSell, 
    ProductSellData,
    ProductSell as ProductSellType // 從 Service 匯入 ProductSell 型別
} from "../../services/ProductSellService";
import { getStoreId } from "../../services/LoginService";
import { getStaffMembers, StaffMember } from "../../services/TherapyDropdownService";
import { formatDateToChinese } from "../../utils/memberUtils"; // 用於顯示日期 (如果需要)

// SelectedProduct interface 與 AddProductSell.tsx 保持一致
interface SelectedProduct {
  product_id: number;
  name: string;
  price: number; // 產品原始單價
  quantity: number;
  inventory_id: number; // 雖然不直接存入 product_sell，但 ProductSelection 可能返回
}

interface MemberData {
  member_id: number;
  name: string;
}

// 中英文付款方式映射 (與 AddProductSell.tsx 相同)
const paymentMethodDisplayMap: { [key: string]: string } = {
  "現金": "Cash",
  "信用卡": "CreditCard",
  "轉帳": "Transfer",
  "行動支付": "MobilePayment",
  "其他": "Others",
};
const paymentMethodValueMap: { [key: string]: string } = Object.fromEntries(
  Object.entries(paymentMethodDisplayMap).map(([key, value]) => [value, key])
);


const EditProductSell: React.FC = () => {
  const navigate = useNavigate();
  const { sellId } = useParams<{ sellId: string }>(); // 從 URL 獲取 sellId

  // 表單狀態
  const [storeId, setStoreId] = useState<string>("");
  const [memberId, setMemberId] = useState<string>("");
  const [memberName, setMemberName] = useState<string>("");
  const [purchaseDate, setPurchaseDate] = useState<string>("");
  
  // 編輯時，selectedProducts 只包含當前正在編輯的那個產品項目
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

  // 價格相關 state - 針對單個編輯項目
  const [itemUnitPrice, setItemUnitPrice] = useState<number>(0); // 載入的單價
  const [itemQuantity, setItemQuantity] = useState<number>(0);   // 載入的數量
  const [itemOriginalTotal, setItemOriginalTotal] = useState<number>(0); // unit_price * quantity
  const [itemDiscountAmount, setItemDiscountAmount] = useState<number>(0); // 此項目的折價金額
  const [itemFinalPrice, setItemFinalPrice] = useState<number>(0);       // 此項目的最終價格

  const [loading, setLoading] = useState<boolean>(false);
  const [fetchLoading, setFetchLoading] = useState<boolean>(true); // 載入銷售記錄的 loading
  const [error, setError] = useState<string | null>(null);
  const [formSubmitted, setFormSubmitted] = useState<boolean>(false);

  // 載入門市ID & 銷售人員 (與 AddProductSell 類似)
  useEffect(() => {
    const currentStoreId = getStoreId();
    if (currentStoreId) setStoreId(currentStoreId);
    else setError("無法獲取當前門市資訊，請重新登入。");

    const fetchStaffMembers = async () => {
      try {
        const data = await getStaffMembers();
        setStaffMembers(data);
        // selectedStaffId 會在下面 fetchSaleData 中設定
      } catch (err) { console.error("載入銷售人員資料失敗：", err); setError("載入銷售人員資料失敗"); }
    };
    fetchStaffMembers();
  }, []);

  // 根據 sellId 載入銷售記錄數據
  useEffect(() => {
    if (sellId) {
      const fetchSaleData = async () => {
        setFetchLoading(true);
        setError(null);
        try {
          const numericSellId = parseInt(sellId);
          if (isNaN(numericSellId)) {
            setError("無效的銷售記錄ID。");
            setFetchLoading(false);
            return;
          }
          const saleData: ProductSellType = await getProductSellById(numericSellId);
          
          setMemberId(saleData.member_id.toString());
          setMemberName(saleData.member_name || ""); // 從 API 獲取 member_name
          setPurchaseDate(saleData.date ? new Date(saleData.date).toISOString().split("T")[0] : "");
          
          // 初始化 selectedProducts (只有一個產品)
          setSelectedProducts([{
            product_id: saleData.product_id || 0, // 假設 API 會返回 product_id
            name: saleData.product_name || "未知產品",
            price: saleData.unit_price || 0, // 使用記錄中的 unit_price
            quantity: saleData.quantity || 0,
            inventory_id: 0, // inventory_id 在 product_sell 表中已不存在，這裡設為0或從 product 表查詢
                           // 如果庫存更新仍依賴它，需要前端想辦法獲取或傳遞
          }]);

          setItemUnitPrice(saleData.unit_price || 0);
          setItemQuantity(saleData.quantity || 0);
          setItemDiscountAmount(saleData.discount_amount || 0);
          // itemFinalPrice 會在下面的 useEffect 中計算
          
          setPaymentMethod(paymentMethodValueMap[saleData.payment_method || "Cash"] || paymentMethodOptions[0]);
          // 假設 API 返回的 payment_method 是英文，需要轉為中文顯示
          // setTransferCode(saleData.transfer_code || ""); // 這些特定支付方式的代碼應從 API 獲取
          // setCardNumber(saleData.card_number || "");   // ProductSellType interface 需要包含這些
          setSaleCategory(saleCategoryOptions.includes(saleData.sale_category || "") ? saleData.sale_category! : saleCategoryOptions[0]);
          setSelectedStaffId(saleData.staff_id ? saleData.staff_id.toString() : "");
          setNote(saleData.note || "");

        } catch (err: any) {
          console.error("獲取銷售記錄失敗:", err);
          setError(err.response?.data?.error || err.message || "獲取銷售記錄失敗");
        } finally {
          setFetchLoading(false);
        }
      };
      fetchSaleData();
    } else {
      setError("未提供銷售記錄ID。");
      setFetchLoading(false);
    }
  }, [sellId]); // 當 sellId 變化時重新載入

  // 當單價、數量或此項目折扣改變時，重新計算此項目的原始總價和最終價格
  useEffect(() => {
    const originalTotal = (itemUnitPrice || 0) * (itemQuantity || 0);
    setItemOriginalTotal(originalTotal);
    setItemFinalPrice(originalTotal - (itemDiscountAmount || 0));
  }, [itemUnitPrice, itemQuantity, itemDiscountAmount]);

  // 當 selectedProducts (通常只有一個) 更新時，同步更新單價和數量 state
  useEffect(() => {
    if (selectedProducts.length === 1) {
      const product = selectedProducts[0];
      setItemUnitPrice(product.price); // 假設 product.price 是單價
      setItemQuantity(product.quantity);
    } else if (selectedProducts.length === 0 && !fetchLoading) { // 如果產品被清空 (非初始載入時)
        setItemUnitPrice(0);
        setItemQuantity(0);
        setItemDiscountAmount(0); // 清空產品時也清空該產品的折價
    }
  }, [selectedProducts, fetchLoading]);


  const handleMemberChange = (id: string, name: string) => {
    setMemberId(id);
    setMemberName(name);
  };
  const handleError = (errorMsg: string) => setError(errorMsg);

  // 打開產品選擇視窗 - 在編輯模式下，選擇新產品會替換現有產品
  const openProductSelection = () => {
    const formState = { // 保存當前其他表單欄位狀態
      memberId, memberName, purchaseDate, paymentMethod,
      transferCode, cardNumber, saleCategory, note,
      selectedStaffId, discountAmount: itemDiscountAmount, // 保存的是當前項目的折價
    };
    localStorage.setItem('editProductSellFormState', JSON.stringify(formState));
    // 傳遞一個標記，讓產品選擇頁面知道是編輯模式，可能只允許選擇一個產品
    navigate('/product-selection', { state: { fromEditSellPage: true, currentProduct: selectedProducts[0] } });
  };

  // 當從 ProductSelection 返回時，處理選中的產品 (假設只選一個替換)
  useEffect(() => {
    const newSelectedProductData = localStorage.getItem('selectedProductForEdit'); // 假設 ProductSelection 頁面用這個 key
    if (newSelectedProductData) {
      try {
        const newProduct = JSON.parse(newSelectedProductData) as SelectedProduct;
        setSelectedProducts([newProduct]); // 替換掉 selectedProducts
      } catch(e) { console.error("解析 selectedProductForEdit 失敗", e); }
      localStorage.removeItem('selectedProductForEdit');
    }
    // 恢復其他表單狀態
    const formStateData = localStorage.getItem('editProductSellFormState');
    if (formStateData) {
        try {
            const formState = JSON.parse(formStateData);
            // ... (恢復其他 formState 欄位，類似 AddProductSell 中的邏輯) ...
            if (formState.memberId) setMemberId(formState.memberId);
            if (formState.memberName) setMemberName(formState.memberName);
            // ...etc...
            if (typeof formState.discountAmount === 'number') setItemDiscountAmount(formState.discountAmount);

        } catch (e) { console.error("解析 editProductSellFormState 失敗", e); }
        localStorage.removeItem('editProductSellFormState');
    }
  }, []); // 這個 effect 也應該只在 mount 時執行一次

  const handlePrint = () => { window.print(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
    setError(null);
    // ... (基本驗證，與 AddProductSell 類似) ...
    if (!sellId) { setError("無效的銷售記錄ID。"); return; }
    if (!storeId) { setError("門市資訊錯誤。"); return; }
    if (!memberId || !memberName) { setError("請確認會員資料。"); return; }
    if (selectedProducts.length !== 1) { setError("編輯操作僅支援單個購買品項的修改。"); return; }
    if (!paymentMethod) { setError("請選擇付款方式。"); return; }
    if (!selectedStaffId) { setError("請選擇銷售人員。"); return; }
    if (itemDiscountAmount < 0) { setError("折價金額不能為負數。"); return; }
    if (itemFinalPrice < 0) { setError("最終價格低於零，請檢查單價、數量和折價。"); return; }


    setLoading(true);
    try {
      const productToUpdate = selectedProducts[0];
      const paymentMethodInEnglish = paymentMethodDisplayMap[paymentMethod] || paymentMethod;

      const updatedSellData: ProductSellData = {
        product_id: productToUpdate.product_id,
        member_id: parseInt(memberId),
        store_id: parseInt(storeId),
        staff_id: selectedStaffId ? parseInt(selectedStaffId) : undefined,
        date: purchaseDate,
        payment_method: paymentMethodInEnglish,
        transfer_code: paymentMethod === "轉帳" ? transferCode : undefined,
        card_number: paymentMethod === "信用卡" ? cardNumber : undefined,
        sale_category: saleCategory,
        quantity: itemQuantity, // 使用 itemQuantity state
        note: note || undefined,
        unit_price: itemUnitPrice, // 使用 itemUnitPrice state
        discount_amount: itemDiscountAmount, // 使用 itemDiscountAmount state
        final_price: itemFinalPrice,     // 使用 itemFinalPrice state
        // inventory_id_for_stock_update: productToUpdate.inventory_id, // 如果庫存更新需要
      };

      console.log("Updating sellData:", updatedSellData);
      await updateProductSell(parseInt(sellId), updatedSellData);

      alert("銷售記錄已成功更新！");
      navigate('/product-sell', { state: { refresh: true } });
    } catch (err: any) {
      console.error("更新產品銷售失敗:", err);
      setError(err.response?.data?.error || err.message || "更新產品銷售失敗，請檢查輸入並重試。");
    } finally {
      setLoading(false);
    }
  };
  
  if (fetchLoading) {
    return (
        <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
            <Spinner animation="border" variant="info" /> <span className="ms-2">載入銷售資料中...</span>
        </Container>
    );
  }
  if (error && !formSubmitted) { // 如果是 fetch 錯誤，且表單還未提交過，可以顯示一個全頁的錯誤
      // (或者將 error 顯示在表單上方，如下面的 content 內部)
  }


  // 表單內容 (與 AddProductSell 非常相似，但 value 和 onChange 對應到單個產品的 state)
  const content = (
    <Container className="my-4">
      {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}
      <Form onSubmit={handleSubmit} noValidate>
        <Row className="g-3">
          {/* --- 左欄 --- */}
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>購買人姓名</Form.Label>
              {/* MemberColumn 在編輯時可能需要禁用或有不同的行為 */}
              <MemberColumn
                memberId={memberId}
                name={memberName}
                onMemberChange={handleMemberChange}
                onError={handleError}
                initialDisabled={true} // 編輯時，會員通常不應更改，除非業務允許
              />
              {formSubmitted && !memberName && <div className="text-danger d-block small mt-1">購買人姓名無法載入</div>}
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>購買品項</Form.Label>
              <div className="d-flex gap-2">
                <div className="flex-grow-1 border rounded p-2" style={{ minHeight: "40px" }}>
                  {selectedProducts.length === 1 ? (
                    <div>{selectedProducts[0].name} (單價: NT${itemUnitPrice.toLocaleString()}) x {itemQuantity}</div>
                  ) : (
                    <span className="text-muted">點擊「選取」按鈕更改產品</span>
                  )}
                </div>
                <Button variant="info" className="text-white align-self-start px-3" onClick={openProductSelection}>選取</Button>
              </div>
              <Form.Text muted>可更改品項或調整數量。</Form.Text>
              {formSubmitted && selectedProducts.length !== 1 && <div className="text-danger d-block small mt-1">請確認購買品項</div>}
            </Form.Group>
             <Form.Group className="mb-3"> {/* 新增：數量輸入框 */}
                <Form.Label>數量</Form.Label>
                <Form.Control
                    type="number"
                    min="1"
                    value={itemQuantity}
                    onChange={(e) => setItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    required
                />
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

            {paymentMethod === "信用卡" && (
              <Form.Group className="mb-3">
                <Form.Label>卡號後五碼</Form.Label>
                <Form.Control type="text" maxLength={5} pattern="\d*" value={cardNumber} onChange={(e) => setCardNumber(e.target.value.replace(/\D/g,'').slice(0,5))} placeholder="請輸入信用卡號後五碼" />
              </Form.Group>
            )}
            {paymentMethod === "轉帳" && (
              <Form.Group className="mb-3">
                <Form.Label>轉帳帳號末五碼</Form.Label>
                <Form.Control type="text" maxLength={5} pattern="\d*" value={transferCode} onChange={(e) => setTransferCode(e.target.value.replace(/\D/g,'').slice(0,5))} placeholder="請輸入轉帳帳號末五碼" />
              </Form.Group>
            )}

            <Form.Group className="mb-3">
              <Form.Label>銷售類別</Form.Label>
              <Form.Select value={saleCategory} onChange={(e) => setSaleCategory(e.target.value)} required>
                {saleCategoryOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </Form.Select>
              <Form.Text muted>下拉式：銷售、贈品、折扣、預購、暫借，需連動後台系統。</Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
                <Form.Label>總價</Form.Label> {/* 應為折扣後 */}
                <Form.Control
                    type="text"
                    value={`NT$ ${itemFinalPrice.toLocaleString()}`}
                    readOnly
                    disabled
                    className="bg-light text-end"
                />
            </Form.Group>

             <Form.Group className="mb-3">
                <Form.Label>應收</Form.Label> {/* 同上 */}
                <Form.Control
                    type="text"
                    value={`NT$ ${itemFinalPrice.toLocaleString()}`}
                    readOnly
                    disabled
                    className="bg-light text-end"
                />
            </Form.Group>
          </Col>

          {/* --- 右欄 --- */}
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>會員編號</Form.Label>
              <Form.Control type="text" value={memberId} readOnly disabled className="bg-light"/>
              {formSubmitted && !memberId && <div className="text-danger d-block small mt-1">會員編號無法載入</div>}
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>購買日期</Form.Label>
              <Form.Control 
                type="date" 
                value={purchaseDate} 
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => setPurchaseDate(e.target.value)} 
                required 
              />
              <Form.Text muted>選擇購買日期。會跳出日曆，無法選取未來日期。</Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>價錢</Form.Label> {/* 產品原始總金額 (單價 x 數量) */}
              <Form.Control type="text" value={`NT$ ${itemOriginalTotal.toLocaleString()}`} readOnly disabled className="bg-light text-end" />
              <Form.Text muted>自動帶出，價格固定不能修改。</Form.Text>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>銷售人員</Form.Label>
              <Form.Select value={selectedStaffId} onChange={(e) => setSelectedStaffId(e.target.value)} required>
                <option value="">請選擇銷售人員</option>
                {staffMembers.map(staff => (
                  <option key={staff.staff_id} value={staff.staff_id.toString()}>
                    {staff.name || staff.Staff_Name}
                  </option>
                ))}
              </Form.Select>
              <Form.Text muted>下拉式：連動各店後台系統、報表。</Form.Text>
              {formSubmitted && !selectedStaffId && <div className="text-danger d-block small mt-1">請選擇銷售人員</div>}
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>備註</Form.Label>
              <Form.Control as="textarea" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="不須必填" /> {/* 調整 rows 以符合 Figma */}
              <Form.Text muted>不須必填。</Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>折價</Form.Label> {/* 針對此單項產品的折價金額 */}
              <InputGroup>
                <InputGroup.Text>NT$</InputGroup.Text>
                <Form.Control
                    type="number"
                    min="0"
                    step="any"
                    value={itemDiscountAmount}
                    onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setItemDiscountAmount(isNaN(val) || val < 0 ? 0 : val);
                    }}
                    placeholder="輸入此品項折價金額"
                />
                </InputGroup>
            </Form.Group>
          </Col>
        </Row>

        <Row className="mt-4">
          <Col className="d-flex justify-content-end gap-2">
            <Button variant="primary" type="submit" disabled={loading || fetchLoading}>
              {loading ? "更新中..." : "確認"}
            </Button>
            <Button variant="secondary" onClick={() => navigate('/product-sell')} disabled={loading || fetchLoading}>
              取消
            </Button>
            <Button variant="outline-secondary" onClick={handlePrint} disabled={loading || fetchLoading}>
              列印
            </Button>
          </Col>
        </Row>
      </Form>
    </Container>
  );

  return (
    <>
      <Header title={`編輯銷售產品 (ID: ${sellId || ''}) 1.1.2.1`} /> {/* 標題中加入ID */}
      <DynamicContainer content={fetchLoading ? 
        (<Container className="text-center p-5"><Spinner animation="border" variant="info" /> <p>載入資料中...</p></Container>) 
        : content
      } className="p-0" />
    </>
  );
};

export default EditProductSell;