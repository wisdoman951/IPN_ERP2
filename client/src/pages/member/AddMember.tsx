// IPN_ERP/client/src/pages/member/AddMember.tsx (完整修正版)

import React, { useState, useEffect } from "react";
import { Button, Form, Row, Col, Container, Alert, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import DynamicContainer from "../../components/DynamicContainer";
import { createMember, getNextMemberCode } from "../../services/MemberService";
import { calculateAge } from "../../utils/memberUtils";
import axios from "axios";

const AddMember: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const initialFormState = {
        member_code: '載入中...',
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

    useEffect(() => {
        const fetchNextCode = async () => {
            try {
                const result = await getNextMemberCode();
                if (result.success && result.next_code) {
                    setForm(prev => ({ ...prev, member_code: result.next_code }));
                } else {
                    setForm(prev => ({ ...prev, member_code: "無法獲取" }));
                    setError(result.error || "無法獲取會員編號");
                }
            } catch (err: any) {
                setForm(prev => ({ ...prev, member_code: "查詢錯誤" }));
                setError(err.message);
            }
        };
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
    };

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm({ ...form, [name]: value });
    };
    const handlePrint = () => {
        // 創建一個新的打印窗口
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('請允許打開彈出窗口以列印');
            return;
        }
        
        // 添加基本的HTML結構和樣式
        printWindow.document.write(`
            <html>
            <head>
                <title>會員基本資料表</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        padding: 20px;
                    }
                    h1 {
                        text-align: center;
                        margin-bottom: 20px;
                    }
                    .form-row {
                        display: flex;
                        flex-wrap: wrap;
                        margin-bottom: 15px;
                    }
                    .form-group {
                        width: 50%;
                        padding: 0 10px;
                        box-sizing: border-box;
                        margin-bottom: 15px;
                    }
                    .form-label {
                        font-weight: bold;
                        display: block;
                        margin-bottom: 5px;
                    }
                    .form-value {
                        border: 1px solid #ccc;
                        padding: 8px;
                        width: 100%;
                        box-sizing: border-box;
                    }
                </style>
            </head>
            <body>
                <h1>會員基本資料表</h1>
                <div class="form-container">
                    <div class="form-row">
                        <div class="form-group">
                            <div class="form-label">姓名</div>
                            <div class="form-value">${form.name || '&nbsp;'}</div>
                        </div>
                        <div class="form-group">
                            <div class="form-label">生日</div>
                            <div class="form-value">${form.birthday || '&nbsp;'}</div>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <div class="form-label">年齡</div>
                            <div class="form-value">${age ? `${age}歲` : '&nbsp;'}</div>
                        </div>
                        <div class="form-group">
                            <div class="form-label">電話</div>
                            <div class="form-value">${form.phone || '&nbsp;'}</div>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <div class="form-label">住址</div>
                            <div class="form-value">${form.address || '&nbsp;'}</div>
                        </div>
                        <div class="form-group">
                            <div class="form-label">性別</div>
                            <div class="form-value">${
                                form.gender === 'Male' ? '男' : 
                                form.gender === 'Female' ? '女' : 
                                form.gender === 'Other' ? '不想透露' : '&nbsp;'
                            }</div>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <div class="form-label">血型</div>
                            <div class="form-value">${form.bloodType || '&nbsp;'}</div>
                        </div>
                        <div class="form-group">
                            <div class="form-label">Line ID</div>
                            <div class="form-value">${form.lineId || '&nbsp;'}</div>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <div class="form-label">介紹人</div>
                            <div class="form-value">${form.preferredTherapist || '&nbsp;'}</div>
                        </div>
                        <div class="form-group">
                            <div class="form-label">備註</div>
                            <div class="form-value">${form.specialRequests || '&nbsp;'}</div>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `);
        
        // 關閉文檔流
        printWindow.document.close();
        
        // 等待資源加載完成後打印
        printWindow.onload = function() {
            printWindow.focus(); // 確保焦點在打印窗口
            printWindow.print(); // 調用打印功能
            
            // 打印完成後關閉窗口（可選）
            // printWindow.close();
        };
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
        
        // 確保 member_code 不是 '載入中...' 或錯誤訊息
        if (!form.member_code || form.member_code.includes('載入中') || form.member_code.includes('無法獲取') || form.member_code.includes('查詢錯誤')) {
            setError("會員編號無效，無法新增。請刷新頁面重試。");
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
                                readOnly
                                disabled
                                className="bg-light"
                            />
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
                    <Button variant="info" className="text-white" onClick={() => navigate(-1)} disabled={loading}>確認</Button>
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