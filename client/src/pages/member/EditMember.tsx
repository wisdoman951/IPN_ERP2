// client/src/pages/member/EditMember.tsx (完整修改版)

import React, { useState, useEffect } from 'react';
import { Container, Form, Row, Col, Button, Spinner, Alert } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../../components/Header';
import DynamicContainer from '../../components/DynamicContainer';
import { getMemberById, updateMember, Member } from '../../services/MemberService';
import { calculateAge } from '../../utils/memberUtils';

// MemberFormData interface (保持不變)
interface MemberFormData {
    member_code: string;
    name: string;
    birthday: string;
    age: string;
    gender: string;
    bloodType: string;
    lineId: string;
    address: string;
    inferrer_id: string;
    phone: string;
    occupation: string;
    note: string;
}

const EditMember: React.FC = () => {
    const navigate = useNavigate();
    const { memberId } = useParams<{ memberId: string }>();

    const [form, setForm] = useState<Partial<MemberFormData>>({});
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 載入要編輯的會員資料
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
                    // 將從服務獲取的資料填充到表單 state
                    setForm({
                        member_code: data.Member_ID || "",
                        name: data.Name || "",
                        birthday: data.Birth ? new Date(data.Birth).toISOString().split('T')[0] : "",
                        gender: data.Gender || "Male",
                        bloodType: data.BloodType || "A",
                        lineId: data.LineID || "",
                        address: data.Address || "",
                        inferrer_id: data.Referrer || "",
                        phone: data.Phone || "",
                        occupation: data.Occupation || "",
                        note: data.Note || "",
                        age: data.Birth ? calculateAge(data.Birth).toString() : ""
                    });
                } else {
                    setError("找不到該會員的資料。");
                }
            } catch (err) {
                setError("載入會員資料失敗。");
            } finally {
                setFetchLoading(false);
            }
        };

        fetchMemberData();
    }, [memberId]);

    // 當生日改變時，自動計算年齡
    useEffect(() => {
        if (form.birthday) {
            const calculatedAge = calculateAge(form.birthday);
            setForm(prev => ({ ...prev, age: calculatedAge.toString() }));
        } else if (form.age) { // 如果生日被清空，年齡也應該清空
             setForm(prev => ({ ...prev, age: '' }));
        }
    }, [form.birthday]); // 依賴於 form.birthday

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!memberId) {
            setError("無法更新，會員 ID 缺失。");
            return;
        }
        
        // 增加前端驗證
        if (!form.name || !form.birthday || !form.phone) {
            setError("姓名、生日和聯絡電話為必填欄位。");
            return;
        }

        setLoading(true);
        setError(null);
        try {
            // 將 form state 轉換為 Member service 期望的格式 (大寫鍵)
            const payload: Partial<Member> = {
                Name: form.name,
                Birth: form.birthday,
                Gender: form.gender,
                BloodType: form.bloodType,
                LineID: form.lineId,
                Address: form.address,
                Referrer: form.inferrer_id,
                Phone: form.phone,
                Occupation: form.occupation,
                Note: form.note,
            };

            await updateMember(memberId, payload);
            alert("會員資料更新成功！");
            navigate("/member-info"); // 更新成功後返回列表頁
        } catch (err: any) {
            setError(err.message || "更新會員資料失敗。");
        } finally {
            setLoading(false);
        }
    };
    
    // JSX 中渲染表單的部分
    const content = (
        <Container className="p-4">
            {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}
            {fetchLoading ? (
                <div className="text-center p-5"><Spinner animation="border" /> 載入資料中...</div>
            ) : (
                <Form onSubmit={handleSubmit}>
                    <Row className="g-3">
                        <Col md={6}><Form.Group><Form.Label>編號</Form.Label><Form.Control type="text" value={form.member_code || ''} readOnly disabled /></Form.Group></Col>
                        <Col md={6}></Col> {/* 空白佔位 */}
                        
                        <Col md={6}><Form.Group><Form.Label>姓名</Form.Label><Form.Control name="name" value={form.name || ''} onChange={handleChange} required /></Form.Group></Col>
                        <Col md={3}><Form.Group><Form.Label>生日</Form.Label><Form.Control type="date" name="birthday" value={form.birthday || ''} onChange={handleChange} required /></Form.Group></Col>
                        <Col md={3}><Form.Group><Form.Label>年齡</Form.Label><Form.Control type="text" value={form.age ? `${form.age}歲` : ''} readOnly disabled placeholder="自動計算" /></Form.Group></Col>

                        <Col md={6}><Form.Group><Form.Label>性別</Form.Label><Form.Select name="gender" value={form.gender || ''} onChange={handleChange} required><option value="Male">男</option><option value="Female">女</option><option value="Other">其他</option></Form.Select></Form.Group></Col>
                        <Col md={6}><Form.Group><Form.Label>血型</Form.Label><Form.Select name="bloodType" value={form.bloodType || ''} onChange={handleChange}><option value="">請選擇</option><option value="A">A</option><option value="B">B</option><option value="AB">AB</option><option value="O">O</option></Form.Select></Form.Group></Col>
                        
                        <Col md={6}><Form.Group><Form.Label>Line ID</Form.Label><Form.Control name="lineId" value={form.lineId || ''} onChange={handleChange} /></Form.Group></Col>
                        <Col md={6}><Form.Group><Form.Label>介紹人</Form.Label><Form.Control name="inferrer_id" value={form.inferrer_id || ''} onChange={handleChange} placeholder="請輸入介紹人的會員編號 (選填)" /></Form.Group></Col>
                        
                        <Col md={12}><Form.Group><Form.Label>地址</Form.Label><Form.Control name="address" value={form.address || ''} onChange={handleChange} /></Form.Group></Col>
                        
                        <Col md={6}><Form.Group><Form.Label>聯絡電話</Form.Label><Form.Control type="tel" name="phone" value={form.phone || ''} onChange={handleChange} required /></Form.Group></Col>
                        <Col md={6}><Form.Group><Form.Label>職業</Form.Label><Form.Control name="occupation" value={form.occupation || ''} onChange={handleChange} /></Form.Group></Col>

                        <Col md={12}><Form.Group><Form.Label>備註</Form.Label><Form.Control as="textarea" rows={3} name="note" value={form.note || ''} onChange={handleChange} /></Form.Group></Col>
                    </Row>
                    <div className="d-flex justify-content-end gap-2 mt-4">
                        <Button variant="secondary" onClick={() => navigate('/member-info')} disabled={loading}>取消</Button>
                        <Button variant="primary" type="submit" disabled={loading || fetchLoading}>
                            {loading ? <Spinner as="span" size="sm" /> : "儲存更新"}
                        </Button>
                    </div>
                </Form>
            )}
        </Container>
    );

    return (
        <div className="d-flex flex-column min-vh-100 bg-light">
            {/* ***** 關鍵修改：使用 form.name ***** */}
            <Header title={`編輯會員資料 (${form.name || '載入中...'})`} />
            {/* ***** 結束修改 ***** */}
            <DynamicContainer content={content} />
        </div>
    );
};

export default EditMember;