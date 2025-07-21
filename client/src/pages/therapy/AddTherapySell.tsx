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
  Spinner,
  InputGroup,
} from "react-bootstrap";
import MemberColumn from "../../components/MemberColumn";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import DynamicContainer from "../../components/DynamicContainer";
import { getStaffMembers, getAllTherapyPackages, addTherapySell, fetchRemainingSessions } from "../../services/TherapySellService";

interface DropdownItem {
  id: number;
  name: string;
  price?: number;
}

const AddTherapySell: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    memberId: "",
    therapyId: "",
    staffId: "",
    date: new Date().toISOString().split("T")[0],
    amount: 1,
    paymentMethod: "Cash",
    saleCategory: "銷售",
    transferCode: "",
    cardNumber: "",
    discountAmount: 0,
    note: "",
  });
  const [selectedStore, setSelectedStore] = useState<string>("");

  const storeOptions = ["店別A", "店別B", "店別C"];
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
  const [therapyList, setTherapyList] = useState<DropdownItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [remainingSessions, setRemainingSessions] = useState<number | null>(null);
  const [isFetchingSessions, setIsFetchingSessions] = useState(false);

  const selectedTherapy = therapyList.find(t => String(t.id) === formData.therapyId);
  const totalPrice = (selectedTherapy?.price || 0) * Number(formData.amount);
  const finalPayableAmount = totalPrice - Number(formData.discountAmount);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const [staffRes, therapyRes] = await Promise.all([
          getStaffMembers(),
          getAllTherapyPackages(),
        ]);
        if (staffRes.success && staffRes.data) {
          setStaffList(staffRes.data.map(s => ({ id: s.staff_id, name: s.name })));
        }
        if (therapyRes.success && therapyRes.data) {
          setTherapyList(
            therapyRes.data.map(t => ({ id: t.therapy_id, name: t.TherapyName || t.name, price: t.TherapyPrice }))
          );
        }
      } catch (err) {
        setError("無法載入初始資料");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    const getSessions = async () => {
      if (formData.memberId && formData.therapyId) {
        setIsFetchingSessions(true);
        setRemainingSessions(null);
        try {
          const result = await fetchRemainingSessions(formData.memberId, formData.therapyId);
          setRemainingSessions(result.remaining_sessions);
        } catch (err) {
          setError("查詢剩餘堂數失敗，可能無購買紀錄");
          setRemainingSessions(0);
        } finally {
          setIsFetchingSessions(false);
        }
      } else {
        setRemainingSessions(null);
      }
    };
    getSessions();
  }, [formData.memberId, formData.therapyId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const storeId = localStorage.getItem('store_id');
      const payload = {
        memberId: Number(formData.memberId),
        therapy_id: Number(formData.therapyId),
        staffId: Number(formData.staffId),
        purchaseDate: formData.date,
        amount: Number(formData.amount),
        storeId: storeId ? Number(storeId) : undefined,
        paymentMethod: paymentMethodDisplayMap[formData.paymentMethod] || formData.paymentMethod,
        saleCategory: formData.saleCategory,
        transferCode: formData.paymentMethod === '轉帳' ? formData.transferCode : undefined,
        cardNumber: formData.paymentMethod === '信用卡' ? formData.cardNumber : undefined,
        discount: Number(formData.discountAmount) || 0,
        note: formData.note,
      };
      await addTherapySell([payload]);
      alert("銷售紀錄新增成功！");
      navigate("/therapy-sell");
    } catch (err) {
      setError("新增失敗，請檢查所有欄位。");
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
                  <Form.Group as={Col} controlId="store">
                    <Form.Label>店別</Form.Label>
                    <Form.Select value={selectedStore} onChange={(e) => setSelectedStore(e.target.value)} required>
                      <option value="" disabled>請選擇店別</option>
                      {storeOptions.map(opt => (<option key={opt} value={opt}>{opt}</option>))}
                    </Form.Select>
                  </Form.Group>
                </Row>

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
                  <Form.Group as={Col} controlId="therapyId">
                    <Form.Label>療程方案</Form.Label>
                    <Form.Select name="therapyId" value={formData.therapyId} onChange={handleChange} required>
                      <option value="">請選擇療程</option>
                      {therapyList.map((therapy) => (
                        <option key={therapy.id} value={therapy.id}>
                          {therapy.name}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Row>
                
                <Row className="mb-3">
                    <Form.Group as={Col} controlId="formRemaining">
                        <Form.Label>目前剩餘堂數</Form.Label>
                        <div className="form-control bg-light" style={{ minHeight: '38px', paddingTop: '0.5rem' }}>
                            {isFetchingSessions ? (
                                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                            ) : (
                                remainingSessions !== null ? `${remainingSessions} 堂` : '請先選擇會員和方案'
                            )}
                        </div>
                    </Form.Group>
                  <Form.Group as={Col} controlId="amount">
                    <Form.Label>購買堂數</Form.Label>
                    <Form.Control type="number" name="amount" value={formData.amount} onChange={handleChange} required min="1" />
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
                    <Form.Control type="text" value={`NT$ ${totalPrice.toLocaleString()}`} readOnly disabled className="bg-light text-end" />
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
                  <Button variant="info" className="text-white" onClick={() => navigate(-1)}>
                    取消
                  </Button>
                  <Button variant="info" className="text-white" onClick={() => window.print()}>
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
