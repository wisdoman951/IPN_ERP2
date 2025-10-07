import React, { useEffect, useState } from "react";
import { Container, Form, Row, Col, Button, Spinner, Alert } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../../components/Header";
import DynamicContainer from "../../components/DynamicContainer";
import {
  getMemberById,
  updateMember,
  Member,
  fetchIdentityTypes,
  IdentityTypeOption,
} from "../../services/MemberService";
import { calculateAge } from "../../utils/memberUtils";

interface MemberFormData {
  member_code: string;
  identity_type_code: string;
  name: string;
  birthday: string;
  age: string;
  gender: string;
  blood_type: string;
  line_id: string;
  address: string;
  inferrer_id: string;
  phone: string;
  occupation: string;
  note: string;
}

const initialForm: MemberFormData = {
  member_code: "",
  identity_type_code: "",
  name: "",
  birthday: "",
  age: "",
  gender: "Male",
  blood_type: "",
  line_id: "",
  address: "",
  inferrer_id: "",
  phone: "",
  occupation: "",
  note: "",
};

const EditMember: React.FC = () => {
  const navigate = useNavigate();
  const { memberId } = useParams<{ memberId: string }>();

  const [form, setForm] = useState<MemberFormData>(initialForm);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [identityOptions, setIdentityOptions] = useState<IdentityTypeOption[]>([]);
  const [loadingIdentities, setLoadingIdentities] = useState(false);

  useEffect(() => {
    const loadIdentityTypes = async () => {
      setLoadingIdentities(true);
      try {
        const types = await fetchIdentityTypes();
        setIdentityOptions(types);
      } catch (err) {
        console.error("Failed to load identity types:", err);
        setError("載入身份別選項時發生錯誤。");
      } finally {
        setLoadingIdentities(false);
      }
    };

    loadIdentityTypes();
  }, []);

  useEffect(() => {
    if (!memberId) {
      setError("無效的會員 ID");
      setFetchLoading(false);
      return;
    }

    const fetchMemberData = async () => {
      setFetchLoading(true);
      try {
        const data = await getMemberById(memberId);
        if (data) {
          setForm({
            member_code: data.member_code || "",
            identity_type_code: data.IdentityTypeCode || "",
            name: data.Name || "",
            birthday: data.Birth ? new Date(data.Birth).toISOString().split("T")[0] : "",
            gender: data.Gender || "Male",
            blood_type: data.BloodType || "",
            line_id: data.LineID || "",
            address: data.Address || "",
            inferrer_id: data.Referrer || "",
            phone: data.Phone || "",
            occupation: data.Occupation || "",
            note: data.Note || "",
            age: data.Birth ? calculateAge(data.Birth).toString() : "",
          });
        } else {
          setError("找不到該會員的資料。");
        }
      } catch (err) {
        console.error("Failed to load member data:", err);
        setError("載入會員資料失敗。");
      } finally {
        setFetchLoading(false);
      }
    };

    fetchMemberData();
  }, [memberId]);

  useEffect(() => {
    if (!form.birthday) {
      if (form.age) {
        setForm((prev) => ({ ...prev, age: "" }));
      }
      return;
    }
    const calculatedAge = calculateAge(form.birthday);
    if (calculatedAge.toString() !== form.age) {
      setForm((prev) => ({ ...prev, age: calculatedAge.toString() }));
    }
  }, [form.birthday]);

  useEffect(() => {
    if (identityOptions.length === 0) {
      return;
    }
    setForm((prev) => {
      if (prev.identity_type_code) {
        return prev;
      }
      const defaultType = identityOptions.find((option) => option.is_default) ?? identityOptions[0];
      return {
        ...prev,
        identity_type_code: defaultType?.identity_type_code || "",
      };
    });
  }, [identityOptions]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId) {
      setError("無法更新，會員 ID 缺失。");
      return;
    }

    if (!form.name || !form.birthday || !form.phone) {
      setError("姓名、生日和聯絡電話為必填欄位。");
      return;
    }

    if (!form.identity_type_code) {
      setError("請選擇會員身份別。");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const payload: Partial<Member> = {
        Name: form.name,
        IdentityTypeCode: form.identity_type_code,
        Birth: form.birthday,
        Gender: form.gender,
        BloodType: form.blood_type,
        LineID: form.line_id,
        Address: form.address,
        Referrer: form.inferrer_id,
        Phone: form.phone,
        Occupation: form.occupation,
        Note: form.note,
      };

      await updateMember(memberId, payload);
      alert("會員資料更新成功！");
      navigate("/member-info");
    } catch (err: any) {
      console.error("Failed to update member:", err);
      setError(err?.response?.data?.error || err.message || "更新會員資料失敗。");
    } finally {
      setLoading(false);
    }
  };

  const renderIdentityOptions = () => {
    if (loadingIdentities) {
      return <option value="">載入中...</option>;
    }
    if (identityOptions.length === 0) {
      return <option value="">無身份別選項</option>;
    }
    return identityOptions.map((option) => (
      <option key={option.identity_type_code} value={option.identity_type_code}>
        {option.display_name}
      </option>
    ));
  };

  const content = (
    <Container className="p-4">
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {fetchLoading ? (
        <div className="text-center p-5">
          <Spinner animation="border" /> 載入資料中...
        </div>
      ) : (
        <Form onSubmit={handleSubmit}>
          <Row className="g-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label>編號</Form.Label>
                <Form.Control type="text" value={form.member_code} readOnly disabled />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>身份別</Form.Label>
                <Form.Select
                  name="identity_type_code"
                  value={form.identity_type_code}
                  onChange={handleChange}
                  required
                >
                  {renderIdentityOptions()}
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label>姓名</Form.Label>
                <Form.Control
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>生日</Form.Label>
                <Form.Control
                  type="date"
                  name="birthday"
                  value={form.birthday}
                  onChange={handleChange}
                  required
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>年齡</Form.Label>
                <Form.Control
                  type="text"
                  value={form.age ? `${form.age}歲` : ""}
                  readOnly
                  disabled
                  placeholder="自動計算"
                />
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label>性別</Form.Label>
                <Form.Select
                  name="gender"
                  value={form.gender}
                  onChange={handleChange}
                  required
                >
                  <option value="Male">男</option>
                  <option value="Female">女</option>
                  <option value="Other">其他</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>血型</Form.Label>
                <Form.Select
                  name="blood_type"
                  value={form.blood_type}
                  onChange={handleChange}
                >
                  <option value="">請選擇</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="AB">AB</option>
                  <option value="O">O</option>
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label>Line ID</Form.Label>
                <Form.Control
                  name="line_id"
                  value={form.line_id}
                  onChange={handleChange}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>介紹人</Form.Label>
                <Form.Control
                  name="inferrer_id"
                  value={form.inferrer_id}
                  onChange={handleChange}
                  placeholder="請輸入介紹人的會員編號 (選填)"
                />
              </Form.Group>
            </Col>

            <Col md={12}>
              <Form.Group>
                <Form.Label>地址</Form.Label>
                <Form.Control
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                />
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label>聯絡電話</Form.Label>
                <Form.Control
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  required
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>職業</Form.Label>
                <Form.Control
                  name="occupation"
                  value={form.occupation}
                  onChange={handleChange}
                />
              </Form.Group>
            </Col>

            <Col md={12}>
              <Form.Group>
                <Form.Label>備註</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  name="note"
                  value={form.note}
                  onChange={handleChange}
                />
              </Form.Group>
            </Col>
          </Row>
          <div className="d-flex justify-content-end gap-2 mt-4">
            <Button
              variant="info"
              className="text-white"
              onClick={() => navigate("/member-info")}
              disabled={loading}
            >
              取消
            </Button>
            <Button
              variant="info"
              className="text-white"
              type="submit"
              disabled={loading || fetchLoading}
            >
              {loading ? <Spinner as="span" size="sm" /> : "儲存更新"}
            </Button>
          </div>
        </Form>
      )}
    </Container>
  );

  return (
    <div className="d-flex flex-column min-vh-100 bg-light">
      <Header />
      <DynamicContainer content={content} />
    </div>
  );
};

export default EditMember;
