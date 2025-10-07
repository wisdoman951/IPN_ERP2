import React, { useEffect, useState } from "react";
import { Button, Form, Row, Col, Container, Alert, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import DynamicContainer from "../../components/DynamicContainer";
import {
  createMember,
  checkMemberCodeExists,
  getNextMemberCode,
  fetchIdentityTypes,
  IdentityTypeOption,
  CreateMemberRequest,
} from "../../services/MemberService";
import { calculateAge } from "../../utils/memberUtils";
import axios from "axios";

interface MemberFormState {
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

const initialFormState: MemberFormState = {
  member_code: "",
  identity_type_code: "",
  name: "",
  birthday: "",
  age: "",
  gender: "Male",
  blood_type: "A",
  line_id: "",
  address: "",
  inferrer_id: "",
  phone: "",
  occupation: "",
  note: "",
};

const AddMember: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<MemberFormState>(initialFormState);
  const [identityOptions, setIdentityOptions] = useState<IdentityTypeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingIdentityTypes, setLoadingIdentityTypes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeAvailable, setCodeAvailable] = useState(true);

  useEffect(() => {
    const fetchNextCode = async () => {
      try {
        const result = await getNextMemberCode();
        if (result.success && (result.next_code || result.data)) {
          setForm((prev) => ({
            ...prev,
            member_code: result.next_code || result.data || "",
          }));
        } else if (result.error) {
          console.error("Failed to fetch next member code:", result.error);
        }
      } catch (err) {
        console.error("Failed to fetch next member code:", err);
      }
    };

    fetchNextCode();
  }, []);

  useEffect(() => {
    const loadIdentityTypes = async () => {
      setLoadingIdentityTypes(true);
      try {
        const types = await fetchIdentityTypes();
        setIdentityOptions(types);
        const defaultType = types.find((option) => option.is_default) ?? types[0];
        setForm((prev) => ({
          ...prev,
          identity_type_code:
            prev.identity_type_code || defaultType?.identity_type_code || "",
        }));
      } catch (err) {
        console.error("Failed to load identity types:", err);
        setError("載入身份別選項時發生錯誤，請稍後再試。");
      } finally {
        setLoadingIdentityTypes(false);
      }
    };

    loadIdentityTypes();
  }, []);

  useEffect(() => {
    if (form.birthday) {
      const calculatedAge = calculateAge(form.birthday);
      setForm((prev) => ({ ...prev, age: calculatedAge.toString() }));
    } else if (form.age) {
      setForm((prev) => ({ ...prev, age: "" }));
    }
  }, [form.birthday]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === "member_code") {
      setCodeAvailable(true);
    }
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCodeBlur = async () => {
    if (!form.member_code) return;
    try {
      const exists = await checkMemberCodeExists(form.member_code);
      setCodeAvailable(!exists);
      if (exists) {
        setError("會員代碼已存在，請使用其他代碼。");
      }
    } catch {
      setError("檢查會員代碼時發生錯誤。");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!form.name || !form.birthday || !form.phone) {
      setError("姓名、生日和聯絡電話為必填欄位。");
      setLoading(false);
      return;
    }

    if (!form.member_code) {
      setError("會員代碼為必填欄位。");
      setLoading(false);
      return;
    }

    if (!codeAvailable) {
      setError("會員代碼已存在，請使用其他代碼。");
      setLoading(false);
      return;
    }

    if (!form.identity_type_code) {
      setError("請選擇會員身份別。");
      setLoading(false);
      return;
    }

    try {
      const payload: CreateMemberRequest = {
        member_code: form.member_code,
        name: form.name,
        identity_type_code: form.identity_type_code,
        birthday: form.birthday,
        gender: form.gender,
        blood_type: form.blood_type || undefined,
        line_id: form.line_id || undefined,
        address: form.address || undefined,
        phone: form.phone || undefined,
        inferrer_id: form.inferrer_id ? form.inferrer_id.trim() : null,
        occupation: form.occupation || undefined,
        note: form.note || undefined,
      };

      await createMember(payload);
      alert("新增成功！");
      navigate("/member-info");
    } catch (error) {
      console.error("新增失敗詳情：", error);
      if (axios.isAxiosError(error)) {
        const errorMsg = error.response?.data?.error || error.message;
        setError(`新增會員時發生錯誤：${errorMsg}`);
      } else {
        setError("新增會員時發生未知錯誤！");
      }
    } finally {
      setLoading(false);
    }
  };

  const renderIdentityOptions = () => {
    if (loadingIdentityTypes) {
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
        <Alert variant="danger" onClose={() => setError(null)} dismissible>
          {error}
        </Alert>
      )}
      <Form onSubmit={handleSubmit}>
        <Row className="g-3">
          <Col md={6}>
            <Form.Group>
              <Form.Label>編號</Form.Label>
              <Form.Control
                type="text"
                name="member_code"
                value={form.member_code}
                onChange={handleChange}
                onBlur={handleCodeBlur}
                required
              />
              {!codeAvailable && (
                <div className="text-danger small mt-1">會員代碼已存在</div>
              )}
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group>
              <Form.Label>身份別</Form.Label>
              <Form.Select
                name="identity_type_code"
                value={form.identity_type_code}
                onChange={handleSelectChange}
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
                className="bg-light"
              />
            </Form.Group>
          </Col>

          <Col md={6}>
            <Form.Group>
              <Form.Label>性別</Form.Label>
              <Form.Select
                name="gender"
                value={form.gender}
                onChange={handleSelectChange}
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
                onChange={handleSelectChange}
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
                placeholder="請輸入介紹人的會員ID (選填)"
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
            onClick={() => navigate(-1)}
            disabled={loading}
          >
            取消
          </Button>
          <Button
            variant="info"
            className="text-white"
            type="submit"
            disabled={loading}
          >
            {loading ? <Spinner as="span" size="sm" /> : "儲存"}
          </Button>
        </div>
      </Form>
    </Container>
  );

  return (
    <div className="d-flex flex-column min-vh-100 bg-light">
      <Header />
      <DynamicContainer content={content} />
    </div>
  );
};

export default AddMember;
