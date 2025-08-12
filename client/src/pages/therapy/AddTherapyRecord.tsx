// IPN_ERP/client/src/pages/therapy/AddTherapyRecord.tsx

import React, { useState, useEffect } from 'react';
import { Form, Button, Container, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../../components/Header';
import DynamicContainer from '../../components/DynamicContainer';
import { getAllStaffForDropdown } from '../../services/StaffService';
import {
    getAllTherapiesForDropdown,
    getTherapyRecordById,
    addTherapyRecord,
    updateTherapyRecord,
} from '../../services/TherapyService';
import { getAllMembers, Member } from '../../services/MemberService';
import { fetchRemainingSessions, fetchRemainingSessionsBulk } from '../../services/TherapySellService';

interface DropdownItem {
  staff_id?: number;
  therapy_id?: number;
  name: string;
}

const AddTherapyRecord: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const locationState = location.state as { memberId?: string; recordId?: number } | undefined;
    const presetMemberId = locationState?.memberId || '';
    const recordId = locationState?.recordId;
    const [formData, setFormData] = useState({
        member_id: presetMemberId,
        staff_id: '',
        therapy_id: '',
        date: new Date().toISOString().split('T')[0],
        note: '',
    });
    const [memberLocked] = useState(Boolean(presetMemberId || recordId));

    const [members, setMembers] = useState<Member[]>([]);
    const [staffList, setStaffList] = useState<DropdownItem[]>([]);
    const [allTherapyList, setAllTherapyList] = useState<DropdownItem[]>([]);
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
                setAllTherapyList(Array.isArray(therapyData) ? therapyData : []);

                if (recordId) {
                    const record = await getTherapyRecordById(recordId);
                    setFormData({
                        member_id: record.member_id.toString(),
                        staff_id: record.staff_id?.toString() || '',
                        therapy_id: record.therapy_id?.toString() || '',
                        date: record.date.split('T')[0],
                        note: record.note || '',
                    });
                }
            } catch (err) {
                setError('載入初始資料失敗');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [recordId]);

    useEffect(() => {
        const filterTherapiesForMember = async () => {
            if (!formData.member_id) {
                setTherapyList([]);
                if (formData.therapy_id) {
                    setFormData((prev) => ({ ...prev, therapy_id: '' }));
                }
                return;
            }

            const therapyIds = allTherapyList
                .map((t) => t.therapy_id)
                .filter((id): id is number => typeof id === 'number');
            if (therapyIds.length === 0) {
                setTherapyList([]);
                return;
            }

            try {
                const res = await fetchRemainingSessionsBulk(formData.member_id, therapyIds);
                const remainingMap = res.data || {};
                const filtered = allTherapyList.filter(
                    (t) => (remainingMap[t.therapy_id ?? 0] || 0) > 0
                );
                setTherapyList(filtered);
                if (
                    formData.therapy_id &&
                    !filtered.some(
                        (t) => t.therapy_id?.toString() === formData.therapy_id
                    )
                ) {
                    setFormData((prev) => ({ ...prev, therapy_id: '' }));
                }
            } catch (err) {
                console.error(err);
                setTherapyList([]);
                if (formData.therapy_id) {
                    setFormData((prev) => ({ ...prev, therapy_id: '' }));
                }
            }
        };
        filterTherapiesForMember();
    }, [formData.member_id, allTherapyList]);

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
    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!recordId && remainingSessions !== null && remainingSessions <= 0) {
            setError('剩餘堂數不足，無法新增紀錄。');
            return;
        }
        setLoading(true);
        setError('');
        try {
            if (recordId) {
                await updateTherapyRecord(recordId, formData);
                alert('療程紀錄更新成功！');
            } else {
                await addTherapyRecord(formData);
                alert('療程紀錄新增成功！');
            }
            navigate('/therapy-record');
        } catch (err) {
            setError(recordId ? '更新失敗，請檢查所有欄位。' : '新增失敗，請檢查所有欄位。');
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
                        <Form.Select name="member_id" value={formData.member_id} onChange={handleChange} required disabled={loading || memberLocked}>
                            <option value="" disabled>{loading ? '載入中...' : '請選擇會員'}</option>
                            {members.map((member) => (
                                <option key={member.Member_ID} value={member.Member_ID}>{member.Name}</option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                </Row>
                <Row className="mb-3">
                    <Form.Group as={Col} controlId="formMemberId">
                        <Form.Label>會員編號</Form.Label>
                        <Form.Control type="text" value={formData.member_id} disabled readOnly />
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
                    <Button
                        variant="info"
                        className="text-white"
                        onClick={() => navigate(-1)}
                        disabled={loading || isFetchingSessions}
                    >
                        取消
                    </Button>
                    <Button
                        variant="info"
                        className="text-white"
                        onClick={() => {}}
                        disabled={loading || isFetchingSessions}
                    >
                        列印
                    </Button>
                    <Button
                        variant="info"
                        className="text-white"
                        type="submit"
                        disabled={loading || isFetchingSessions}
                    >
                        儲存
                    </Button>
                </div>
            </Form>
        </Container>
    );

    return (
        <div className="d-flex flex-column min-vh-100 bg-white">
            <Header />
            <DynamicContainer content={content} />
        </div>
    );
};

export default AddTherapyRecord;
