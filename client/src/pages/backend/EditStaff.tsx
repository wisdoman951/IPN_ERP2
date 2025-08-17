import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Form, Button, Container, Spinner, Alert } from 'react-bootstrap';
import Header from '../../components/Header';
import DynamicContainer from '../../components/DynamicContainer';
import { getStaffById, updateStaff } from '../../services/StaffService';

interface StaffForm {
  name: string;
  national_id: string;
  phone: string;
  gender: string;
}

const EditStaff: React.FC = () => {
  const { staffId } = useParams<{ staffId: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<StaffForm>({
    name: '',
    national_id: '',
    phone: '',
    gender: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStaff = async () => {
      if (!staffId) return;
      try {
        const res = await getStaffById(Number(staffId));
        if (res.success && res.data) {
          setFormData({
            name: res.data.name || '',
            national_id: res.data.national_id || '',
            phone: res.data.phone || '',
            gender: res.data.gender || '',
          });
        } else {
          setError('載入員工資料失敗');
        }
      } catch (err) {
        console.error(err);
        setError('載入員工資料失敗');
      } finally {
        setLoading(false);
      }
    };
    fetchStaff();
  }, [staffId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffId) return;
    setSaving(true);
    setError('');
    try {
      const res = await updateStaff(Number(staffId), {
        basic_info: {
          Staff_Name: formData.name,
          Staff_Phone: formData.phone,
          Staff_Sex: formData.gender,
          Staff_ID_Number: formData.national_id,
        },
      });
      if (res.success) {
        navigate('/backend/staff');
      } else {
        setError(res.message || '更新失敗');
      }
    } catch (err) {
      console.error(err);
      setError('更新失敗');
    } finally {
      setSaving(false);
    }
  };

  const content = loading ? (
    <div className="text-center py-5"><Spinner /></div>
  ) : (
    <Container className="my-4" style={{ maxWidth: '600px' }}>
      {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3" controlId="name">
          <Form.Label>姓名</Form.Label>
          <Form.Control name="name" value={formData.name} onChange={handleChange} required />
        </Form.Group>
        <Form.Group className="mb-3" controlId="national_id">
          <Form.Label>身分證字號</Form.Label>
          <Form.Control name="national_id" value={formData.national_id} onChange={handleChange} />
        </Form.Group>
        <Form.Group className="mb-3" controlId="phone">
          <Form.Label>手機號碼</Form.Label>
          <Form.Control name="phone" value={formData.phone} onChange={handleChange} />
        </Form.Group>
        <Form.Group className="mb-3" controlId="gender">
          <Form.Label>性別</Form.Label>
          <Form.Select name="gender" value={formData.gender} onChange={handleChange}>
            <option value="">請選擇</option>
            <option value="Male">男</option>
            <option value="Female">女</option>
            <option value="Other">其他</option>
          </Form.Select>
        </Form.Group>
        <div className="text-end">
          <Button variant="secondary" className="me-2" onClick={() => navigate('/backend/staff')} disabled={saving}>
            取消
          </Button>
          <Button variant="info" type="submit" className="text-white" disabled={saving}>
            儲存
          </Button>
        </div>
      </Form>
    </Container>
  );

  return (
    <div className="d-flex flex-column" style={{ minHeight: '100vh' }}>
      <Header />
      <DynamicContainer content={content} />
    </div>
  );
};

export default EditStaff;
