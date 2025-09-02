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
import MemberColumn from '../../components/MemberColumn';
import { MemberData } from '../../types/medicalTypes';
import { getMemberById } from '../../services/MedicalService';
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
        member_code: '',
        name: '',
        staff_id: '',
        therapy_id: '',
        deduct_sessions: '1',
        date: new Date().toISOString().split('T')[0],
        note: '',
    });
    const [memberLocked] = useState(Boolean(presetMemberId || recordId));

    const [staffList, setStaffList] = useState<DropdownItem[]>([]);
    const [allTherapyList, setAllTherapyList] = useState<DropdownItem[]>([]);
    const [therapyList, setTherapyList] = useState<DropdownItem[]>([]);
    const [remainingSessions, setRemainingSessions] = useState<number | null>(null);
    const [isFetchingSessions, setIsFetchingSessions] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (remainingSessions !== null && Number(formData.deduct_sessions) > remainingSessions) {
            setFormData(prev => ({ ...prev, deduct_sessions: remainingSessions.toString() }));
        }
    }, [remainingSessions]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [staffData, therapyData] = await Promise.all([
                    getAllStaffForDropdown(),
                    getAllTherapiesForDropdown(),
                ]);

                setStaffList(Array.isArray(staffData) ? staffData : []);
                setAllTherapyList(Array.isArray(therapyData) ? therapyData : []);

                if (recordId) {
                    const record = await getTherapyRecordById(recordId);
                    const member = await getMemberById(record.member_id.toString());
                    setFormData({
                        member_id: record.member_id.toString(),
                        member_code: member?.member_code || '',
                        name: member?.name || '',
                        staff_id: record.staff_id?.toString() || '',
                        therapy_id: record.therapy_id?.toString() || '',
                        deduct_sessions: record.deduct_sessions?.toString() || '1',
                        date: record.date.split('T')[0],
                        note: record.note || '',
                    });
                } else if (presetMemberId) {
                    const member = await getMemberById(presetMemberId);
                    setFormData(prev => ({
                        ...prev,
                        member_code: member?.member_code || '',
                        name: member?.name || '',
                    }));
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

    const handleMemberChange = (memberCode: string, name: string, data: MemberData | null) => {
        setFormData(prev => ({
            ...prev,
            member_code: memberCode,
            name,
            member_id: data?.member_id ? data.member_id.toString() : '',
        }));
        if (error) setError('');
    };

    const handleMemberError = (msg: string) => setError(msg);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const deduct = Number(formData.deduct_sessions);
        if (!formData.member_id) {
            setError('請先輸入會員編號並確認姓名');
            return;
        }
        if (!recordId && remainingSessions !== null && remainingSessions < deduct) {
            setError('扣除堂數大於剩餘堂數，無法新增紀錄。');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const payload = {
                member_id: Number(formData.member_id),
                staff_id: formData.staff_id ? Number(formData.staff_id) : undefined,
                therapy_id: formData.therapy_id ? Number(formData.therapy_id) : undefined,
                deduct_sessions: deduct,
                date: formData.date,
                note: formData.note,
            };
            if (recordId) {
                await updateTherapyRecord(recordId, payload);
                alert('療程紀錄更新成功！');
            } else {
                await addTherapyRecord(payload);
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
                <MemberColumn
                    memberCode={formData.member_code}
                    name={formData.name}
                    isEditMode={memberLocked}
                    onMemberChange={handleMemberChange}
                    onError={handleMemberError}
                />
                <Row className="mb-3">
                    <Form.Group as={Col} controlId="formTherapist">
                        <Form.Label>療癒師</Form.Label>
                        <Form.Select name="staff_id" value={formData.staff_id} onChange={handleChange} required disabled={loading}>
                            <option value="" disabled>{loading ? '載入中...' : '請選擇療癒師'}</option>
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
                    <Form.Group as={Col} controlId="formDeduct">
                        <Form.Label>療程扣除數</Form.Label>
                        <Form.Select
                            name="deduct_sessions"
                            value={formData.deduct_sessions}
                            onChange={handleChange}
                            required
                            disabled={loading || isFetchingSessions || remainingSessions === null}
                        >
                            {Array.from({ length: remainingSessions ?? 1 }, (_, i) => i + 1).map((n) => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </Form.Select>
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
                        onClick={() => window.print()}
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
