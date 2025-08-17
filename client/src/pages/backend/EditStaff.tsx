import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Form, Button, Container, Spinner, Alert } from 'react-bootstrap';
import Header from '../../components/Header';
import DynamicContainer from '../../components/DynamicContainer';
import { getStaffDetails, updateStaff } from '../../services/StaffService';

interface StaffForm {
  name: string;
  national_id: string;
  phone: string;
  gender: string;
  email: string;
  birthday: string;
  address: string;
  join_date: string;
  emergency_contact: string;
  emergency_phone: string;
}

const EditStaff: React.FC = () => {
  const { staffId } = useParams<{ staffId: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<StaffForm>({
    name: '',
    national_id: '',
    phone: '',
    gender: '',
    email: '',
    birthday: '',
    address: '',
    join_date: '',
    emergency_contact: '',
    emergency_phone: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStaff = async () => {
      if (!staffId) return;
      try {
        const res = await getStaffDetails(Number(staffId));
        if (res.success && res.data && res.data.basic_info) {
          const info = res.data.basic_info;
          setFormData({
            name: info.Staff_Name || '',
            national_id: info.Staff_ID_Number || '',
            phone: info.Staff_Phone || '',
            gender: info.Staff_Sex || '',
            email: info.Staff_Email || '',
            birthday: info.Staff_Birthday || '',
            address: info.Staff_Address || '',
            join_date: info.Staff_JoinDate || '',
            emergency_contact: info.Staff_EmergencyContact || '',
            emergency_phone: info.Staff_EmergencyPhone || '',
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
          Staff_Email: formData.email,
          Staff_Birthday: formData.birthday,
          Staff_Address: formData.address,
          Staff_JoinDate: formData.join_date,
          Staff_EmergencyContact: formData.emergency_contact,
          Staff_EmergencyPhone: formData.emergency_phone,
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
        <Form.Group className="mb-3" controlId="email">
          <Form.Label>電子郵件</Form.Label>
          <Form.Control name="email" value={formData.email} onChange={handleChange} />
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
        <Form.Group className="mb-3" controlId="birthday">
          <Form.Label>生日</Form.Label>
          <Form.Control type="date" name="birthday" value={formData.birthday} onChange={handleChange} />
        </Form.Group>
        <Form.Group className="mb-3" controlId="address">
          <Form.Label>地址</Form.Label>
          <Form.Control name="address" value={formData.address} onChange={handleChange} />
        </Form.Group>
        <Form.Group className="mb-3" controlId="join_date">
          <Form.Label>入職日期</Form.Label>
          <Form.Control type="date" name="join_date" value={formData.join_date} onChange={handleChange} />
        </Form.Group>
        <Form.Group className="mb-3" controlId="emergency_contact">
          <Form.Label>緊急聯絡人</Form.Label>
          <Form.Control name="emergency_contact" value={formData.emergency_contact} onChange={handleChange} />
        </Form.Group>
        <Form.Group className="mb-3" controlId="emergency_phone">
          <Form.Label>緊急聯絡電話</Form.Label>
          <Form.Control name="emergency_phone" value={formData.emergency_phone} onChange={handleChange} />
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
