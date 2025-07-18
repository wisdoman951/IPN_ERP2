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
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import DynamicContainer from "../../components/DynamicContainer";
import { getAllMembers, Member } from "../../services/MemberService";
import { getAllStaffForDropdown } from "../../services/StaffService";
import { getAllTherapiesForDropdown } from "../../services/TherapyService";
import { addTherapySell, fetchRemainingSessions } from "../../services/TherapySellService";

interface DropdownItem {
  id: number;
  name: string;
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
    note: "",
  });

  const [members, setMembers] = useState<Member[]>([]);
  const [staffList, setStaffList] = useState<DropdownItem[]>([]);
  const [therapyList, setTherapyList] = useState<DropdownItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [remainingSessions, setRemainingSessions] = useState<number | null>(null);
  const [isFetchingSessions, setIsFetchingSessions] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const [membersData, staffData, therapyData] = await Promise.all([
          getAllMembers(),
          getAllStaffForDropdown(),
          getAllTherapiesForDropdown(),
        ]);
        setMembers(Array.isArray(membersData) ? membersData : []);
        setStaffList(staffData.map(s => ({ id: s.staff_id, name: s.name })));
        setTherapyList(therapyData.map(t => ({ id: t.therapy_id, name: t.name })));
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
      await addTherapySell(formData);
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
                  <Form.Group as={Col} controlId="memberId">
                    <Form.Label>會員</Form.Label>
                    <Form.Select name="memberId" value={formData.memberId} onChange={handleChange} required>
                      <option value="">請選擇會員</option>
                      {members.map((member) => (
                        <option key={member.Member_ID} value={member.Member_ID}>
                          {member.Name}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
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
                    <Form.Select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange}>
                      <option value="Cash">現金</option>
                      <option value="CreditCard">信用卡</option>
                      <option value="Transfer">銀行轉帳</option>
                      <option value="MobilePayment">行動支付</option>
                      <option value="Pending">待付款</option>
                      <option value="Others">其他</option>
                    </Form.Select>
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
                  <Button variant="info" className="text-white" onClick={() => {}}>
                    取消
                  </Button>
                  <Button variant="info" className="text-white" onClick={() => {}}>
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
      <Header title="新增銷售紀錄 1.1.3.1.1" />
      <DynamicContainer content={content} />
    </>
  );
};

export default AddTherapySell;
