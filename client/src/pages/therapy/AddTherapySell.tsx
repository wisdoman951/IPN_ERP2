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
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import DynamicContainer from "../../components/DynamicContainer";
import { getStaffMembers, addTherapySell, SelectedTherapyPackageUIData } from "../../services/TherapySellService";

interface DropdownItem {
  id: number;
  name: string;
  price?: number;
}

const AddTherapySell: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    memberId: "",
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
        const staffRes = await getStaffMembers();
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

    const restoreState = () => {
      const formStateData = localStorage.getItem('addTherapySellFormState');
      if (formStateData) {
        try {
          const formState = JSON.parse(formStateData);
          if (formState.memberId) setFormData(prev => ({ ...prev, memberId: formState.memberId }));
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

      const newSelected = localStorage.getItem('newlySelectedTherapyPackagesWithSessions');
      if (newSelected) {
        try {
          const pkgs = JSON.parse(newSelected);
          if (Array.isArray(pkgs)) {
            setTherapyPackages(pkgs);
          }
        } catch (e) {
          console.error('解析 newlySelectedTherapyPackagesWithSessions 失敗', e);
        }
        localStorage.removeItem('newlySelectedTherapyPackagesWithSessions');
      }
    };

    fetchInitialData();
    restoreState();
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
      [name]: value,
    }));
  };

  const openPackageSelection = () => {
    const formState = {
      memberId: formData.memberId,
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
    navigate('/therapy-package-selection', { state: { fromSellPage: true } });
  };

  const handleCancel = () => {
    localStorage.removeItem('addTherapySellFormState');
    localStorage.removeItem('selectedTherapyPackages');
    navigate(-1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (therapyPackages.length === 0) {
        setError('請選擇至少一項療程');
        setLoading(false);
        return;
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

      const payloads = therapyPackages.map(pkg => {
        const itemTotal = (pkg.TherapyPrice || 0) * (Number(pkg.userSessions) || 0);
        let itemDiscount = 0;
        if (packagesOriginalTotal > 0 && formData.discountAmount > 0) {
          const proportion = itemTotal / packagesOriginalTotal;
          itemDiscount = parseFloat((formData.discountAmount * proportion).toFixed(2));
        }
        return {
          memberId: Number(formData.memberId),
          therapy_id: pkg.therapy_id,
          staffId: Number(formData.staffId),
          purchaseDate: formData.date,
          amount: Number(pkg.userSessions),
          storeId: storeId ? Number(storeId) : undefined,
          paymentMethod,
          saleCategory: saleCategoryMap[formData.saleCategory] || formData.saleCategory,
          transferCode: formData.paymentMethod === '轉帳' ? formData.transferCode : undefined,
          cardNumber: formData.paymentMethod === '信用卡' ? formData.cardNumber : undefined,
          discount: itemDiscount,
          note: formData.note,
        };
      });

      await addTherapySell(payloads);
      localStorage.removeItem('addTherapySellFormState');
      localStorage.removeItem('selectedTherapyPackages');
      alert('銷售紀錄新增成功！');
      navigate('/therapy-sell');
    } catch (err) {
      setError('新增失敗，請檢查所有欄位。');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <Container className="my-4">
      <Row>
        <Col md={{ span: 8, offset: 2 }}>
          <Card className="shadow-sm">
            <Card.Header as="h5" className="bg-info text-white">
              新增療程銷售
            </Card.Header>
            <Card.Body>
              {error && <Alert variant="danger">{error}</Alert>}
              <Form onSubmit={handleSubmit}>

                <Row className="mb-3">
                  <Col>
                    <MemberColumn
                      memberId={formData.memberId}
                      name={memberName}
                      isEditMode={false}
                      onMemberChange={(id, name) => {
                        setFormData(prev => ({ ...prev, memberId: id }));
                        setMemberName(name);
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
                      <Button variant="info" type="button" className="text-white align-self-start px-3" onClick={openPackageSelection}>選取</Button>
                    </div>
                    <Form.Text muted>可複選，跳出新視窗選取。</Form.Text>
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
                  <Form.Control type="date" name="date" value={formData.date} onChange={handleChange} required />
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
                  <Button variant="info" type="button" className="text-white" onClick={() => window.print()}>
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
