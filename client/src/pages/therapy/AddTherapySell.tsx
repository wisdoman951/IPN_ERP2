/* client/src/pages/therapy/AddTherapySell.tsx */
import React, { useState, useEffect } from "react";
import {
  Form,
  Button,
  Container,
  Row,
  Col,
  Alert,
  Card,
  InputGroup,
} from "react-bootstrap";
import MemberColumn from "../../components/MemberColumn";
import { useNavigate, useLocation } from "react-router-dom";
import Header from "../../components/Header";
import DynamicContainer from "../../components/DynamicContainer";
import { getStaffMembers, addTherapySell, SelectedTherapyPackageUIData, TherapySellRow, updateTherapySell } from "../../services/TherapySellService";
import { SalesOrderItemData } from "../../services/SalesOrderService";
import { getStoreName } from "../../utils/authUtils";
import { fetchTherapyBundlesForSale, TherapyBundle } from "../../services/TherapyBundleService";

interface DropdownItem {
  id: number;
  name: string;
  price?: number;
}

const AddTherapySell: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const editSale = (location.state as { editSale?: TherapySellRow } | undefined)?.editSale;
  const isEditMode = Boolean(editSale);
  const [formData, setFormData] = useState({
    memberId: "",
    memberCode: "",
    staffId: "",
    date: new Date().toISOString().split("T")[0],
    paymentMethod: "Cash",
    saleCategory: "銷售",
    transferCode: "",
    cardNumber: "",
    discountAmount: 0,
    note: "",
  });
  const paymentMethodDisplayMap: { [key: string]: string } = {
    "現金": "Cash",
    "信用卡": "CreditCard",
    "轉帳": "Transfer",
    "行動支付": "MobilePayment",
    "待付款": "Pending",
    "其他": "Others",
  };
  const paymentMethodOptions = Object.keys(paymentMethodDisplayMap);
  const saleCategoryOptions = ["銷售", "贈品", "折扣", "預購", "暫借"];

  const [memberName, setMemberName] = useState<string>("");
  const [staffList, setStaffList] = useState<DropdownItem[]>([]);
  const [therapyPackages, setTherapyPackages] = useState<SelectedTherapyPackageUIData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [packagesOriginalTotal, setPackagesOriginalTotal] = useState<number>(0);
  const [finalPayableAmount, setFinalPayableAmount] = useState<number>(0);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const storeId = localStorage.getItem('store_id');
        const staffRes = await getStaffMembers(storeId ? Number(storeId) : undefined);
        if (staffRes.success && staffRes.data) {
          setStaffList(staffRes.data.map(s => ({ id: s.staff_id, name: s.name })));
        }
      } catch (err) {
        setError("無法載入初始資料");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    const restoreState = async () => {
      let formStateData: string | null = null;
      let storedPkgs: string | null = null;

      if (!isEditMode) {
        formStateData = localStorage.getItem('addTherapySellFormState');
        storedPkgs = localStorage.getItem('selectedTherapyPackagesWithSessions');
      } else {
        localStorage.removeItem('addTherapySellFormState');
        localStorage.removeItem('selectedTherapyPackagesWithSessions');
      }

      if (formStateData) {
        try {
          const formState = JSON.parse(formStateData);
          if (formState.memberId) setFormData(prev => ({ ...prev, memberId: formState.memberId }));
          if (formState.memberCode) setFormData(prev => ({ ...prev, memberCode: formState.memberCode }));
          if (formState.memberName) setMemberName(formState.memberName);
          if (formState.staffId) setFormData(prev => ({ ...prev, staffId: formState.staffId }));
          if (formState.date) setFormData(prev => ({ ...prev, date: formState.date }));
          if (formState.paymentMethod) setFormData(prev => ({ ...prev, paymentMethod: formState.paymentMethod }));
          if (formState.saleCategory) setFormData(prev => ({ ...prev, saleCategory: formState.saleCategory }));
          if (formState.transferCode) setFormData(prev => ({ ...prev, transferCode: formState.transferCode }));
          if (formState.cardNumber) setFormData(prev => ({ ...prev, cardNumber: formState.cardNumber }));
          if (typeof formState.discountAmount === 'number') setFormData(prev => ({ ...prev, discountAmount: formState.discountAmount }));
          if (formState.note) setFormData(prev => ({ ...prev, note: formState.note }));
          if (Array.isArray(formState.selectedTherapyPackages)) {
            setTherapyPackages(formState.selectedTherapyPackages);
          }
        } catch (e) {
          console.error('解析 addTherapySellFormState 失敗', e);
        }
      }

      if (storedPkgs) {
        try {
          const pkgs = JSON.parse(storedPkgs);
          if (Array.isArray(pkgs)) {
            setTherapyPackages(pkgs);
          }
        } catch (e) {
          console.error('解析 selectedTherapyPackagesWithSessions 失敗', e);
        }
      }

      if (!formStateData && !storedPkgs && isEditMode && editSale) {
        setFormData(prev => ({
          ...prev,
          memberId: editSale.Member_ID?.toString() || "",
          memberCode: editSale.MemberCode || "",
          staffId: editSale.Staff_ID?.toString() || "",
          date: editSale.PurchaseDate?.split("T")[0] || prev.date,
          paymentMethod: editSale.PaymentMethod || prev.paymentMethod,
          saleCategory: editSale.SaleCategory || prev.saleCategory,
          note: editSale.Note || "",
        }));
        setMemberName(editSale.MemberName || "");

        const bundleMatch = editSale.Note?.match(/\[bundle:(\d+)\]/);
        if (bundleMatch) {
          const bundleId = Number(bundleMatch[1]);
          try {
            const bundles: TherapyBundle[] = await fetchTherapyBundlesForSale();
            const bundle = bundles.find(b => b.bundle_id === bundleId);
            if (bundle) {
              setTherapyPackages([
                {
                  bundle_id: bundle.bundle_id,
                  type: 'bundle',
                  TherapyCode: bundle.bundle_code,
                  TherapyName: bundle.name,
                  TherapyContent: bundle.bundle_contents,
                  TherapyPrice: editSale.UnitPrice || ((editSale.Price || 0) / (editSale.Sessions || 1)),
                  userSessions: editSale.Sessions?.toString() || "1",
                },
              ]);
              return;
            }
          } catch (e) {
            console.error('載入療程組合失敗', e);
          }

          setTherapyPackages([
            {
              bundle_id: bundleId,
              type: 'bundle',
              TherapyCode: '',
              TherapyName: editSale.PackageName,
              TherapyContent: editSale.PackageName,
              TherapyPrice: editSale.UnitPrice || ((editSale.Price || 0) / (editSale.Sessions || 1)),
              userSessions: editSale.Sessions?.toString() || "1",
            },
          ]);
        } else {
          setTherapyPackages([
            {
              therapy_id: editSale.therapy_id,
              type: 'therapy',
              TherapyCode: editSale.TherapyCode,
              TherapyName: editSale.PackageName,
              TherapyContent: editSale.PackageName,
              TherapyPrice: editSale.UnitPrice || ((editSale.Price || 0) / (editSale.Sessions || 1)),
              userSessions: editSale.Sessions?.toString() || "1",
            },
          ]);
        }
      }
    };

    const init = async () => {
      await fetchInitialData();
      await restoreState();
    };
    init();
  }, []);

  // 重新計算金額
  useEffect(() => {
    let total = 0;
    therapyPackages.forEach(pkg => {
      total += (pkg.TherapyPrice || 0) * (Number(pkg.userSessions) || 0);
    });
    setPackagesOriginalTotal(total);
  }, [therapyPackages]);

  useEffect(() => {
    setFinalPayableAmount(packagesOriginalTotal - Number(formData.discountAmount || 0));
  }, [packagesOriginalTotal, formData.discountAmount]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'discountAmount' ? parseFloat(value) || 0 : value,
    }));
  };

  const openPackageSelection = () => {
    const formState = {
      memberId: formData.memberId,
      memberCode: formData.memberCode,
      memberName,
      staffId: formData.staffId,
      date: formData.date,
      paymentMethod: formData.paymentMethod,
      saleCategory: formData.saleCategory,
      transferCode: formData.transferCode,
      cardNumber: formData.cardNumber,
      discountAmount: formData.discountAmount,
      note: formData.note,
      selectedTherapyPackages: therapyPackages,
    };
    localStorage.setItem('addTherapySellFormState', JSON.stringify(formState));
    localStorage.setItem('selectedTherapyPackagesWithSessions', JSON.stringify(therapyPackages));
    navigate('/therapy-package-selection', { state: { fromSellPage: true } });
  };

  const handleCancel = () => {
    localStorage.removeItem('addTherapySellFormState');
    localStorage.removeItem('selectedTherapyPackages');
    localStorage.removeItem('selectedTherapyPackagesWithSessions');
    navigate(-1);
  };

  const processSale = async (): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      if (therapyPackages.length === 0) {
        setError('請選擇至少一項療程');
        setLoading(false);
        return false;
      }
      if (isEditMode && therapyPackages.length !== 1) {
        setError('修改模式不支援新增多個療程品項，請使用新增功能');
        setLoading(false);
        return false;
      }
      const storeId = localStorage.getItem('store_id');
      const paymentMethod = paymentMethodDisplayMap[formData.paymentMethod] || formData.paymentMethod;
      const saleCategoryMap: { [key: string]: string } = {
        '銷售': 'Sell',
        '贈品': 'Gift',
        '贈送': 'Gift',
        '折扣': 'Discount',
        '預購': 'Ticket',
        '暫借': 'Ticket',
        '票卷': 'Ticket',
      };
      if (isEditMode && editSale) {
        const pkg = therapyPackages[0];
        const itemTotal = (pkg.TherapyPrice || 0) * (Number(pkg.userSessions) || 0);
        let itemDiscount = 0;
        if (packagesOriginalTotal > 0 && formData.discountAmount > 0) {
          itemDiscount = parseFloat((formData.discountAmount).toFixed(2));
        }
        const itemFinalPrice = itemTotal - itemDiscount;
        const payload = {
          memberId: Number(formData.memberId),
          therapy_id: pkg.type === 'bundle' ? undefined : pkg.therapy_id,
          bundle_id: pkg.type === 'bundle' ? pkg.bundle_id : undefined,
          staffId: Number(formData.staffId),
          purchaseDate: formData.date,
          amount: Number(pkg.userSessions),
          storeId: storeId ? Number(storeId) : undefined,
          paymentMethod,
          saleCategory: saleCategoryMap[formData.saleCategory] || formData.saleCategory,
          transferCode: formData.paymentMethod === '轉帳' ? formData.transferCode : undefined,
          cardNumber: formData.paymentMethod === '信用卡' ? formData.cardNumber : undefined,
          discount: itemDiscount,
          finalPrice: itemFinalPrice,
          note: formData.note,
        };
        await updateTherapySell(editSale.Order_ID, payload);
      } else {
        const payloads = therapyPackages.map(pkg => {
          const itemTotal = (pkg.TherapyPrice || 0) * (Number(pkg.userSessions) || 0);
          let itemDiscount = 0;
          if (packagesOriginalTotal > 0 && formData.discountAmount > 0) {
            const proportion = itemTotal / packagesOriginalTotal;
            itemDiscount = parseFloat((formData.discountAmount * proportion).toFixed(2));
          }
          const itemFinalPrice = itemTotal - itemDiscount;
          return {
            memberId: Number(formData.memberId),
            therapy_id: pkg.type === 'bundle' ? undefined : pkg.therapy_id,
            bundle_id: pkg.type === 'bundle' ? pkg.bundle_id : undefined,
            staffId: Number(formData.staffId),
            purchaseDate: formData.date,
            amount: Number(pkg.userSessions),
            storeId: storeId ? Number(storeId) : undefined,
            paymentMethod,
            saleCategory: saleCategoryMap[formData.saleCategory] || formData.saleCategory,
            transferCode: formData.paymentMethod === '轉帳' ? formData.transferCode : undefined,
            cardNumber: formData.paymentMethod === '信用卡' ? formData.cardNumber : undefined,
            discount: itemDiscount,
            finalPrice: itemFinalPrice,
            note: formData.note,
          };
        });
        await addTherapySell(payloads);
      }
      localStorage.removeItem('addTherapySellFormState');
      localStorage.removeItem('selectedTherapyPackages');
      localStorage.removeItem('selectedTherapyPackagesWithSessions');
      return true;
    } catch (err) {
      setError(isEditMode ? '修改失敗，請檢查所有欄位。' : '新增失敗，請檢查所有欄位。');
      console.error(err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await processSale();
    if (success) {
      alert(isEditMode ? '銷售紀錄修改成功！' : '銷售紀錄新增成功！');
      navigate('/therapy-sell');
    }
  };

  const handlePrint = async () => {
    const success = await processSale();
    if (success) {
      alert('銷售資料已儲存，跳轉至列印頁面。');
      const itemsForOrder: SalesOrderItemData[] = therapyPackages.map(pkg => ({
        therapy_id: pkg.type === 'bundle' ? undefined : pkg.therapy_id,
        item_code: pkg.TherapyCode || '',
        item_description: pkg.TherapyName || '',
        item_type: 'Therapy',
        unit: '次',
        unit_price: pkg.TherapyPrice || 0,
        quantity: Number(pkg.userSessions) || 0,
        subtotal: (pkg.TherapyPrice || 0) * (Number(pkg.userSessions) || 0),
        note: pkg.TherapyContent || '',
      }));
      localStorage.setItem('selectedSalesOrderItems', JSON.stringify(itemsForOrder));
      const staffName = staffList.find(s => s.id === Number(formData.staffId))?.name || '';
      const preSaleData = {
        orderDate: formData.date,
        saleUnit: getStoreName() || '',
        saleCategory: formData.saleCategory,
        buyer: memberName,
        buyerId: formData.memberId,
        salesperson: staffName,
        staffId: formData.staffId,
      };
      localStorage.setItem('preSaleData', JSON.stringify(preSaleData));
      navigate('/finance/sales/add');
    }
  };


  const content = (
    <Container className="my-4">
      <Row>
        <Col md={{ span: 8, offset: 2 }}>
          <Card className="shadow-sm">
            <Card.Header as="h5" className="bg-info text-white">
              {isEditMode ? '修改療程銷售' : '新增療程銷售'}
            </Card.Header>
            <Card.Body>
              {error && <Alert variant="danger">{error}</Alert>}
              <Form onSubmit={handleSubmit}>

                <Row className="mb-3">
                  <Col>
                    <MemberColumn
                      memberCode={formData.memberCode}
                      name={memberName}
                      isEditMode={isEditMode}
                        onMemberChange={(code, name, data) => {
                          setFormData(prev => ({ ...prev, memberCode: code, memberId: data?.member_id?.toString() || "" }));
                          setMemberName(name);
                          if (data) {
                            setError(null);
                          }
                        }}
                      onError={(msg) => setError(msg)}
                    />
                  </Col>
                </Row>
                <Row className="mb-3">
                  <Form.Group as={Col} controlId="therapyPackages">
                    <Form.Label>療程品項</Form.Label>
                    <div className="d-flex gap-2">
                      <div className="flex-grow-1 border rounded p-2" style={{ minHeight: '40px', maxHeight: '120px', overflowY: 'auto' }}>
                        {therapyPackages.length > 0 ? (
                          therapyPackages.map((pkg, i) => (
                            <div key={i}>{pkg.TherapyContent || pkg.TherapyName} x {pkg.userSessions} (單價: NT${pkg.TherapyPrice?.toLocaleString()})</div>
                          ))
                        ) : (
                          <span className="text-muted">點擊「選取」按鈕選擇療程</span>
                        )}
                      </div>
                      <Button
                        variant="info"
                        type="button"
                        className="text-white align-self-start px-3"
                        onClick={openPackageSelection}
                        disabled={isEditMode}
                      >選取</Button>
                    </div>
                    {isEditMode ? (
                      <Form.Text className="text-danger">修改模式無法新增療程品項，若需新增請使用新增功能。</Form.Text>
                    ) : (
                      <Form.Text muted>可複選，跳出新視窗選取。</Form.Text>
                    )}
                  </Form.Group>
                </Row>

                <Row className="mb-3">
                  <Form.Group as={Col} controlId="staffId">
                    <Form.Label>服務人員</Form.Label>
                    <Form.Select name="staffId" value={formData.staffId} onChange={handleChange} required>
                      <option value="">請選擇服務人員</option>
                      {staffList.map((staff) => (
                        <option key={staff.id} value={staff.id}>
                          {staff.name}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                  <Form.Group as={Col} controlId="paymentMethod">
                    <Form.Label>付款方式</Form.Label>
                    <Form.Select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} required>
                      {paymentMethodOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Row>

                {formData.paymentMethod === '信用卡' && (
                  <Form.Group className="mb-3" controlId="cardNumber">
                    <Form.Label>卡號後五碼</Form.Label>
                    <Form.Control type="text" name="cardNumber" maxLength={5} pattern="\d*" value={formData.cardNumber}
                      onChange={handleChange} placeholder="請輸入信用卡號後五碼" />
                  </Form.Group>
                )}
                {formData.paymentMethod === '轉帳' && (
                  <Form.Group className="mb-3" controlId="transferCode">
                    <Form.Label>轉帳帳號末五碼</Form.Label>
                    <Form.Control type="text" name="transferCode" maxLength={5} pattern="\d*" value={formData.transferCode}
                      onChange={handleChange} placeholder="請輸入轉帳帳號末五碼" />
                  </Form.Group>
                )}

                <Row className="mb-3">
                  <Form.Group as={Col} controlId="saleCategory">
                    <Form.Label>銷售類別</Form.Label>
                    <Form.Select name="saleCategory" value={formData.saleCategory} onChange={handleChange} required>
                      {saleCategoryOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                  <Form.Group as={Col} controlId="discountAmount">
                    <Form.Label>折價</Form.Label>
                    <InputGroup>
                      <InputGroup.Text>NT$</InputGroup.Text>
                      <Form.Control type="number" name="discountAmount" min="0" step="any" value={formData.discountAmount} onChange={handleChange} placeholder="輸入折價金額" />
                    </InputGroup>
                  </Form.Group>
                </Row>

                <Row className="mb-3">
                  <Form.Group as={Col}>
                    <Form.Label>總價</Form.Label>
                    <Form.Control type="text" value={`NT$ ${packagesOriginalTotal.toLocaleString()}`} readOnly disabled className="bg-light text-end" />
                  </Form.Group>
                  <Form.Group as={Col}>
                    <Form.Label>應收</Form.Label>
                    <Form.Control type="text" value={`NT$ ${finalPayableAmount.toLocaleString()}`} readOnly disabled className="bg-light text-end" />
                  </Form.Group>
                </Row>

                <Form.Group className="mb-3" controlId="date">
                  <Form.Label>購買日期</Form.Label>
                  <Form.Control type="date" lang="en-CA" name="date" value={formData.date} onChange={handleChange} required />
                </Form.Group>

                <Form.Group className="mb-3" controlId="note">
                  <Form.Label>備註</Form.Label>
                  <Form.Control as="textarea" rows={3} name="note" value={formData.note} onChange={handleChange} />
                </Form.Group>

                <div className="d-flex justify-content-end gap-2">
                  <Button variant="info" type="submit" className="text-white" disabled={loading}>
                    {loading ? "儲存中..." : "確認"}
                  </Button>
                  <Button variant="info" type="button" className="text-white" onClick={handleCancel}>
                    取消
                  </Button>
                  <Button variant="info" type="button" className="text-white" onClick={handlePrint}>
                    列印
                  </Button>
                </div>
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
      <DynamicContainer content={content} />
    </>
  );
};

export default AddTherapySell;

