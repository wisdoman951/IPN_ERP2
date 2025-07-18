// IPN_ERP/client/src/pages/therapy/AddTherapyRecord.tsx

import React, { useState, useEffect } from 'react';
import { Form, Button, Container, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import DynamicContainer from '../../components/DynamicContainer';
import { getAllStaffForDropdown } from '../../services/StaffService';
import { getAllTherapiesForDropdown } from '../../services/TherapyService';
import { getAllMembers, Member } from '../../services/MemberService';
import { fetchRemainingSessions } from '../../services/TherapySellService';
import { addTherapyRecord } from '../../services/TherapyService';

interface DropdownItem {
  staff_id?: number;
  therapy_id?: number;
  name: string;
}

const AddTherapyRecord: React.FC = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        member_id: '',
        staff_id: '',
        therapy_id: '',
        date: new Date().toISOString().split('T')[0],
        note: '',
    });

    const [members, setMembers] = useState<Member[]>([]);
    const [staffList, setStaffList] = useState<DropdownItem[]>([]);
    const [therapyList, setTherapyList] = useState<DropdownItem[]>([]);
    const [remainingSessions, setRemainingSessions] = useState<number | null>(null);
    const [isFetchingSessions, setIsFetchingSessions] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [membersData, staffData, therapyData] = await Promise.all([
                    getAllMembers(),
                    getAllStaffForDropdown(),
                    getAllTherapiesForDropdown(),
                ]);

                setMembers(Array.isArray(membersData) ? membersData : []);
                setStaffList(Array.isArray(staffData) ? staffData : []);
                setTherapyList(Array.isArray(therapyData) ? therapyData : []);
            } catch (err) {
                setError('載入初始資料失敗');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        const getSessions = async () => {
            if (formData.member_id && formData.therapy_id) {
                setIsFetchingSessions(true);
                setRemainingSessions(null);
                try {
                    const result = await fetchRemainingSessions(formData.member_id, formData.therapy_id);
                    setRemainingSessions(result.remaining_sessions);
                } catch (err) {
                    setError('查詢剩餘堂數失敗');
                } finally {
                    setIsFetchingSessions(false);
                }
            }
        };
        getSessions();
    }, [formData.member_id, formData.therapy_id]);
    useEffect(() => {
        console.log('staffList:', staffList);
    }, [staffList]);
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        // --- 修正這個函式 ---
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (remainingSessions !== null && remainingSessions <= 0) {
            setError('剩餘堂數不足，無法新增紀錄。');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await addTherapyRecord(formData);
            alert('療程紀錄新增成功！');
            navigate('/therapy-record');
        } catch (err) {
            setError('新增失敗，請檢查所有欄位。');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const content = (
        <Container>
            {error && <Alert variant="danger">{error}</Alert>}
            <Form onSubmit={handleSubmit}>
                <Row className="mb-3">
                    <Form.Group as={Col} controlId="formMember">
                        <Form.Label>會員姓名</Form.Label>
                        <Form.Select name="member_id" value={formData.member_id} onChange={handleChange} required disabled={loading}>
                            <option value="" disabled>{loading ? '載入中...' : '請選擇會員'}</option>
                            {members.map((member) => (
                                <option key={member.Member_ID} value={member.Member_ID}>{member.Name}</option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                </Row>
                <Row className="mb-3">
                    <Form.Group as={Col} controlId="formTherapist">
                        <Form.Label>療癒師</Form.Label>
                        <Form.Select name="staff_id" value={formData.staff_id} onChange={handleChange} required disabled={loading}>
                            <option value="" disabled>{loading ? '載入中...' : '請選擇療程師'}</option>
                            {staffList.map((staff) => (
                                <option key={staff.staff_id} value={staff.staff_id?.toString()}>
                                    {staff.name}
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                </Row>
                <Row className="mb-3">
                    <Form.Group as={Col} controlId="formTherapy">
                        <Form.Label>療程方案</Form.Label>
                        <Form.Select name="therapy_id" value={formData.therapy_id} onChange={handleChange} required disabled={loading}>
                            <option value="" disabled>{loading ? '載入中...' : '請選擇療程方案'}</option>
                            {therapyList.map((therapy) => (
                                <option key={therapy.therapy_id} value={therapy.therapy_id}>{therapy.name}</option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                </Row>
                <Row className="mb-3">
                    <Form.Group as={Col} controlId="formRemaining">
                        <Form.Label>療程剩餘數</Form.Label>
                        <div className="form-control bg-light" style={{ minHeight: '38px' }}>
                            {isFetchingSessions ? (
                                <Spinner animation="border" size="sm" />
                            ) : (
                                remainingSessions !== null ? `${remainingSessions} 堂` : '請先選擇會員和方案'
                            )}
                        </div>
                    </Form.Group>
                </Row>
                <Row className="mb-3">
                    <Form.Group as={Col} controlId="formDate">
                        <Form.Label>紀錄日期</Form.Label>
                        <Form.Control type="date" name="date" value={formData.date} onChange={handleChange} required />
                    </Form.Group>
                </Row>
                <Row className="mb-3">
                    <Form.Group as={Col} controlId="formNote">
                        <Form.Label>備註</Form.Label>
                        <Form.Control as="textarea" rows={3} name="note" value={formData.note} onChange={handleChange} />
                    </Form.Group>
                </Row>
                <div className="d-flex gap-2 mt-3">
                    <Button variant="info" className="text-white" onClick={() => {}} disabled={loading || isFetchingSessions}>取消</Button>
                    <Button variant="info" className="text-white" onClick={() => {}} disabled={loading || isFetchingSessions}>列印</Button>
                    <Button variant="info" className="text-white" type="submit" disabled={loading || isFetchingSessions}>儲存</Button>
                </div>
            </Form>
        </Container>
    );

    return (
        <div className="d-flex flex-column min-vh-100 bg-white">
            <Header title="新增療程紀錄 1.1.1.3.1" />
            <DynamicContainer content={content} />
        </div>
    );
};

export default AddTherapyRecord;