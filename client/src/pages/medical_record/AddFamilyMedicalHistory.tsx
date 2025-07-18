import { useState, useEffect } from "react";
import { Button, Form, Row, Col, Alert } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import IconButton from "../../components/IconButton";
import { createMedicalRecord } from "../../services/ＭedicalService";

// 第一頁表單數據的類型
interface MedicalFormData {
    memberId: string;
    name: string;
    height: string;
    weight: string;
    bloodPressure: string;
    remark: string;
    cosmeticSurgery: string;
    cosmeticDesc: string;
    restrictedGroup: string;
}

const symptomOptions = {
    HPA: ["頭暈", "偏頭痛", "睡眠不足或不佳", "注意力不集中", "壓力大"],
    meridian: ["下半身易水腫", "膝蓋疼痛", "腿部痠痛無力", "靜脈曲張"],
    shoulder: ["背緊肩周痛", "肩頸痠痛", "時常昏沉", "腫子僵硬", "易緊張"],
    shenGate: ["消化不良", "排便不順", "腰部酸痛", "新陳代謝差", "易脹氣"],
    familyHistory: ["糖尿病", "高血壓", "腸胃疾病", "自體免疫疾病", "癌症"]
};

const AddFamilyMedicalHistoryForm = () => {
    const navigate = useNavigate();
    const [page1Data, setPage1Data] = useState<MedicalFormData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // 從localStorage加載第一頁表單數據
    useEffect(() => {
        const savedData = localStorage.getItem('medicalRecordData');
        if (savedData) {
            setPage1Data(JSON.parse(savedData));
        } else {
            // 如果找不到第一頁數據，導回第一頁
            alert("請先填寫基本資料");
            navigate("/medical-record/add");
        }
    }, [navigate]);

    const [form, setForm] = useState({
        HPA: [] as string[],
        meridian: [] as string[],
        shoulder: [] as string[],
        shenGate: [] as string[],
        familyHistory: [] as string[],
        other: ""
    });

    const handleCheckboxChange = (category: keyof typeof form, value: string) => {
        const current = form[category] as string[];
        const updated = current.includes(value)
            ? current.filter(item => item !== value)
            : [...current, value];
        setForm({ ...form, [category]: updated });
    };

    const handleOtherChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, other: e.target.value });
    };
    
    // 儲存到資料庫
    const handleSave = async () => {
        if (!page1Data) {
            setError("找不到第一頁表單數據，請返回填寫");
            return;
        }
        
        setLoading(true);
        setError("");
        
        try {
            // 將兩頁數據合併
            const combinedData = {
                memberId: page1Data.memberId,
                height: page1Data.height,
                weight: page1Data.weight,
                bloodPressure: page1Data.bloodPressure,
                remark: page1Data.remark,
                // 微整型資訊 (Yes/No) - 這是整數欄位
                symptom: page1Data.cosmeticSurgery === "Yes" ? 1 : 0,
                // 症狀和病史資訊 - 這是微整型備註欄位
                familyHistory: JSON.stringify({
                    symptoms: {
                        HPA: form.HPA,
                        meridian: form.meridian,
                        shoulder: form.shoulder,
                        shenGate: form.shenGate,
                    },
                    familyHistory: {
                        diseases: form.familyHistory,
                        other: form.other
                    },
                    cosmeticDesc: page1Data.cosmeticDesc
                }),
                restrictedGroup: page1Data.restrictedGroup || "孕婦，出血期(腦癌血、腸胃出血)、急性病，粉碎性骨折，三個月內做過手術"
            };
            
            await createMedicalRecord(combinedData);
            localStorage.removeItem('medicalRecordData'); // 清除暫存數據
            alert("健康檢查紀錄新增成功");
            navigate("/medical-record");
        } catch (err: any) {
            console.error("新增紀錄失敗", err);
            // 如果伺服器回傳的是會員不存在的錯誤，顯示友善訊息
            if (err.response?.status === 400 && err.response?.data?.error?.includes("會員編號不存在")) {
                setError("會員編號不存在，請先建立會員資料");
            } else {
                setError(err.response?.data?.error || "新增紀錄時發生錯誤");
            }
        } finally {
            setLoading(false);
        }
    };

    // 合併兩頁表單數據並生成列印視圖
    const handlePrint = () => {
        // 創建一個新的列印窗口
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('請允許開啟彈出窗口以進行列印');
            return;
        }

        // 準備列印視圖的HTML
        const printContent = `
            <html>
            <head>
                <title>健康檢查紀錄</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        padding: 20px;
                    }
                    h1 {
                        text-align: center;
                        margin-bottom: 20px;
                    }
                    h2 {
                        margin-top: 30px;
                        border-bottom: 1px solid #ddd;
                        padding-bottom: 5px;
                    }
                    .section {
                        margin-bottom: 30px;
                    }
                    .info-row {
                        display: flex;
                        margin-bottom: 10px;
                    }
                    .info-label {
                        font-weight: bold;
                        width: 150px;
                    }
                    .info-value {
                        flex: 1;
                    }
                    .checkbox-group {
                        margin-top: 10px;
                    }
                    .checkbox-item {
                        margin-right: 20px;
                        display: inline-block;
                        margin-bottom: 8px;
                    }
                    .checkbox-item::before {
                        content: "✓ ";
                        font-weight: bold;
                    }
                    .note-box {
                        border: 1px solid #ddd;
                        padding: 10px;
                        margin-top: 10px;
                        border-radius: 5px;
                        background-color: #f9f9f9;
                    }
                </style>
            </head>
            <body>
                <h1>健康檢查紀錄表</h1>
                
                <div class="section">
                    <h2>基本資料</h2>
                    <div class="info-row">
                        <div class="info-label">會員編號：</div>
                        <div class="info-value">${page1Data?.memberId || ''}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">姓名：</div>
                        <div class="info-value">${page1Data?.name || ''}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">身高：</div>
                        <div class="info-value">${page1Data?.height || ''}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">體重：</div>
                        <div class="info-value">${page1Data?.weight || ''}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">血壓：</div>
                        <div class="info-value">${page1Data?.bloodPressure || ''}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">微整型：</div>
                        <div class="info-value">${page1Data?.cosmeticSurgery || ''}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">微整型說明：</div>
                        <div class="info-value">${page1Data?.cosmeticDesc || ''}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">備註：</div>
                        <div class="info-value">${page1Data?.remark || ''}</div>
                    </div>
                </div>
                
                <div class="section">
                    <h2>檢測項目</h2>
                    
                    <h3>HPA檢測</h3>
                    <div class="checkbox-group">
                        ${form.HPA.map(item => `<span class="checkbox-item">${item}</span>`).join('')}
                    </div>
                    
                    <h3>十二經絡檢測</h3>
                    <div class="checkbox-group">
                        ${form.meridian.map(item => `<span class="checkbox-item">${item}</span>`).join('')}
                    </div>
                    
                    <h3>肩頸檢測</h3>
                    <div class="checkbox-group">
                        ${form.shoulder.map(item => `<span class="checkbox-item">${item}</span>`).join('')}
                    </div>
                    
                    <h3>神之門檢測</h3>
                    <div class="checkbox-group">
                        ${form.shenGate.map(item => `<span class="checkbox-item">${item}</span>`).join('')}
                    </div>
                    
                    <h3>家族病史</h3>
                    <div class="checkbox-group">
                        ${form.familyHistory.map(item => `<span class="checkbox-item">${item}</span>`).join('')}
                    </div>
                    
                    <h3>其他備註</h3>
                    <div class="note-box">
                        ${form.other || ''}
                    </div>
                </div>
            </body>
            </html>
        `;

        // 寫入內容到新開啟的窗口
        printWindow.document.write(printContent);
        printWindow.document.close();
        
        // 確保內容載入完成後列印
        printWindow.onload = function() {
            printWindow.focus();
            printWindow.print();
        };
    };

    return (
        <div className="d-flex flex-column min-vh-100 bg-white">
            <header className="d-flex justify-content-between align-items-center bg-info px-4 py-3 app-header">
                <h1 className="text-white fw-bold fs-3 m-0">平時症狀 家族病史 1.1.1.2.1.1</h1>
                <div className="d-flex gap-3">
                    <IconButton.HomeButton onClick={() => navigate("/")} />
                    <IconButton.CloseButton onClick={() => navigate(-1)} />
                </div>
            </header>

            <Col xs={12} md={9} className="p-5 ms-auto">
                {error && <Alert variant="danger">{error}</Alert>}
                <Form>
                    <Form.Group className="mb-4">
                        <Form.Label className="fw-bold">HPA檢測：</Form.Label>
                        <Row>
                            {symptomOptions.HPA.map(option => (
                                <Col xs={6} md={4} key={option}>
                                    <Form.Check
                                        type="checkbox"
                                        label={option}
                                        checked={form.HPA.includes(option)}
                                        onChange={() => handleCheckboxChange("HPA", option)}
                                    />
                                </Col>
                            ))}
                        </Row>
                    </Form.Group>

                    <Form.Group className="mb-4">
                        <Form.Label className="fw-bold">十二經絡檢測：</Form.Label>
                        <Row>
                            {symptomOptions.meridian.map(option => (
                                <Col xs={6} md={4} key={option}>
                                    <Form.Check
                                        type="checkbox"
                                        label={option}
                                        checked={form.meridian.includes(option)}
                                        onChange={() => handleCheckboxChange("meridian", option)}
                                    />
                                </Col>
                            ))}
                        </Row>
                    </Form.Group>

                    <Form.Group className="mb-4">
                        <Form.Label className="fw-bold">肩頸檢測：</Form.Label>
                        <Row>
                            {symptomOptions.shoulder.map(option => (
                                <Col xs={6} md={4} key={option}>
                                    <Form.Check
                                        type="checkbox"
                                        label={option}
                                        checked={form.shoulder.includes(option)}
                                        onChange={() => handleCheckboxChange("shoulder", option)}
                                    />
                                </Col>
                            ))}
                        </Row>
                    </Form.Group>

                    <Form.Group className="mb-4">
                        <Form.Label className="fw-bold">神之門檢測：</Form.Label>
                        <Row>
                            {symptomOptions.shenGate.map(option => (
                                <Col xs={6} md={4} key={option}>
                                    <Form.Check
                                        type="checkbox"
                                        label={option}
                                        checked={form.shenGate.includes(option)}
                                        onChange={() => handleCheckboxChange("shenGate", option)}
                                    />
                                </Col>
                            ))}
                        </Row>
                    </Form.Group>

                    <Form.Group className="mb-4">
                        <Form.Label className="fw-bold">家族病史：</Form.Label>
                        <Row>
                            {symptomOptions.familyHistory.map(option => (
                                <Col xs={6} md={4} key={option}>
                                    <Form.Check
                                        type="checkbox"
                                        label={option}
                                        checked={form.familyHistory.includes(option)}
                                        onChange={() => handleCheckboxChange("familyHistory", option)}
                                    />
                                </Col>
                            ))}
                        </Row>
                    </Form.Group>

                    <Form.Group className="mb-4">
                        <Form.Label className="fw-bold">其他：</Form.Label>
                        <Form.Control
                            type="text"
                            value={form.other}
                            onChange={handleOtherChange}
                        />
                    </Form.Group>

                    <div className="d-flex gap-3 mt-4">
                        <Button
                            onClick={handleSave}
                            variant="success"
                            className="text-white"
                            disabled={loading}
                        >
                            {loading ? "處理中..." : "儲存"}
                        </Button>
                        <Button 
                            onClick={()=>navigate(-1)} 
                            variant="info" 
                            className="text-white"
                            disabled={loading}
                        >
                            回上一頁
                        </Button>
                        <Button 
                            variant="secondary" 
                            className="text-white" 
                            onClick={handlePrint}
                            disabled={loading}
                        >
                            列印
                        </Button>
                    </div>
                </Form>
            </Col>
        </div>
    );
};

export default AddFamilyMedicalHistoryForm;
