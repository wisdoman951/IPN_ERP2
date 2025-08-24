// IPN_ERP/client/src/pages/member/AddMember.tsx (完整修正版)

import React, { useState, useEffect } from "react";
import { Button, Form, Row, Col, Container, Alert, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import DynamicContainer from "../../components/DynamicContainer";
import { createMember, checkMemberCodeExists, getNextMemberCode } from "../../services/MemberService";
import { calculateAge } from "../../utils/memberUtils";
import axios from "axios";

const AddMember: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const initialFormState = {
        member_code: "",
        name: "",
        birthday: "",
        age: "",
        gender: "Male",
        blood_type: "A", // 改為 snake_case 以匹配後端
        line_id: "",
        address: "",
        inferrer_id: "",
        phone: "",
        occupation: "",
        note: "",
    };

    const [form, setForm] = useState(initialFormState);
    const [codeAvailable, setCodeAvailable] = useState(true);

    const fetchNextCode = async () => {
        try {
            const result = await getNextMemberCode();
            if (result.success && (result.next_code || result.data)) {
                setForm(prev => ({ ...prev, member_code: result.next_code || result.data || "" }));
            } else if (result.error) {
                console.error("Failed to fetch next member code:", result.error);
            }
        } catch (err) {
            console.error("Failed to fetch next member code:", err);
        }
    };

    useEffect(() => {
        fetchNextCode();
    }, []);

    useEffect(() => {
        if (form.birthday) {
            const calculatedAge = calculateAge(form.birthday);
            setForm(prev => ({ ...prev, age: calculatedAge.toString() }));
        } else {
            setForm(prev => ({ ...prev, age: '' }));
        }
    }, [form.birthday]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setForm({ ...form, [name]: value });
        if (name === 'member_code') {
            setCodeAvailable(true);
        }
        if (name === 'name' && !form.member_code) {
            fetchNextCode();
        }
    };

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm({ ...form, [name]: value });
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

        try {
        const dataToSubmit = { // <-- 我們先將要提交的資料建立成一個物件
            member_code: form.member_code,
            name: form.name,
            birthday: form.birthday,
            address: form.address,
            phone: form.phone,
            gender: form.gender,
            blood_type: form.blood_type,
            line_id: form.line_id,
            inferrer_id: form.inferrer_id || null,
            occupation: form.occupation,
            note: form.note,
        };

        // --- 請在這裡加入 console.log ---
        console.log("準備提交到後端的會員資料:", dataToSubmit);
        // -----------------------------------

        await createMember(dataToSubmit); // 將物件傳入
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

    const content = (
        <Container className="p-4">
            {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
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
                    <Col md={6}></Col>

                    <Col md={6}>
                        <Form.Group>
                            <Form.Label>姓名</Form.Label>
                            <Form.Control name="name" value={form.name} onChange={handleChange} required />
                        </Form.Group>
                    </Col>
                    <Col md={3}>
                        <Form.Group>
                            <Form.Label>生日</Form.Label>
                            <Form.Control type="date" name="birthday" value={form.birthday} onChange={handleChange} required />
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
                            <Form.Select name="gender" value={form.gender} onChange={handleSelectChange} required>
                                <option value="Male">男</option>
                                <option value="Female">女</option>
                                <option value="Other">其他</option>
                            </Form.Select>
                        </Form.Group>
                    </Col>
                    <Col md={6}>
                        <Form.Group>
                            <Form.Label>血型</Form.Label>
                            <Form.Select name="blood_type" value={form.blood_type} onChange={handleSelectChange}>
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
                            <Form.Control name="line_id" value={form.line_id} onChange={handleChange} />
                        </Form.Group>
                    </Col>
                    <Col md={6}>
                        <Form.Group>
                            <Form.Label>介紹人</Form.Label>
                            <Form.Control name="inferrer_id" value={form.inferrer_id} onChange={handleChange} placeholder="請輸入介紹人的會員ID (選填)" />
                        </Form.Group>
                    </Col>
                    
                    <Col md={12}>
                        <Form.Group>
                            <Form.Label>地址</Form.Label>
                            <Form.Control name="address" value={form.address} onChange={handleChange} />
                        </Form.Group>
                    </Col>

                    <Col md={6}>
                        <Form.Group>
                            <Form.Label>聯絡電話</Form.Label>
                            <Form.Control type="tel" name="phone" value={form.phone} onChange={handleChange} required />
                        </Form.Group>
                    </Col>
                    
                    <Col md={12}>
                        <Form.Group>
                            <Form.Label>備註</Form.Label>
                            <Form.Control as="textarea" rows={3} name="note" value={form.note} onChange={handleChange} />
                        </Form.Group>
                    </Col>
                </Row>
                
                <div className="d-flex justify-content-end gap-2 mt-4">
                    <Button variant="info" className="text-white" onClick={() => navigate(-1)} disabled={loading}>取消</Button>
                    <Button variant="info" className="text-white" type="submit" disabled={loading}>
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