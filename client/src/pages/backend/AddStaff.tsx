// client\src/pages\backend\AddStaff.tsx
import React, { useState, useEffect } from "react";
import { Container, Row, Col, Form, Button, Card, Spinner } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../../components/Header"; // 建議使用您專案中統一的 Header
import DynamicContainer from "../../components/DynamicContainer"; // 建議使用您專案中統一的 DynamicContainer
import { addStaff, getStaffDetails, updateStaff } from "../../services/StaffService";

const AddStaff: React.FC = () => {
    const navigate = useNavigate();
    const { staffId } = useParams<{ staffId?: string }>();
    const isEditMode = !!staffId;
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(isEditMode);

    const initialFormData = {
        // 步驟 1: 基本資料
        fillDate: "",
        onboardDate: "",
        name: "",
        gender: "",
        birthday: "",
        nationality: "",
        education: "",
        maritalStatus: "Single", // Figma 是 "婚否"
        applyPosition: "",
        positionLevel: "", // Figma 是 "入職職位"
        phone: "",
        idNumber: "",
        address1: "", // 戶籍地
        contactPhone1: "", // 連絡電話 (戶籍地旁)
        address2: "", // 通訊地
        contactPhone2: "", // 連絡電話 (通訊地旁)

        family_information_id: null as number | null,
        emergency_contact_id: null as number | null,
        work_experience_id: null as number | null,
        hiring_information_id: null as number | null,

        // 步驟 2: 家庭與學歷
        familyName: "", familyRelation: "", familyAge: "",
        familyJobUnit: "", familyJob: "", familyPhone: "",
        emergencyName: "", emergencyRelation: "", emergencyAge: "",
        emergencyJobUnit: "", emergencyJob: "", emergencyPhone: "",
        graduationDegree: "", // 學籍
        graduationSchool: "", // 學校
        major: "", // 專業科目
        graduationDate: "",

        // 步驟 3: 工作經驗與公司內部資料
        workPeriod: "", // 工作總時間
        companyName: "",
        deptJob: "", // 部門/職務
        supervisor: "", // 主管名稱
        workPhone: "",
        salary: "", // 月薪金額
        hasOtherJob: "No", // 是否有其他工作 (預設為 'No')
        otherJobUnit: "",

        // 公司填寫部分
        probationPeriod: "", // 試用期
        probationTime: "",   // 時間
        probationSalary: "", // 薪資
        officialPeriod: "",  // 正式錄用期 (Figma 有此欄位)
        probationRemark: "", // 備註

        licenseApprovedDate: "", // 批准日期
        licenseNotApprovedDate: "", // 不適用日期
    };

    // 狀態管理，與 Figma 欄位對應
    const [formData, setFormData] = useState(initialFormData);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            if (!isEditMode || !staffId) return;
            try {
                const res = await getStaffDetails(Number(staffId));
                if (res.success && res.data && res.data.basic_info) {
                    const info = res.data.basic_info;
                    const family = res.data.family_information || {};
                    const emergency = res.data.emergency_contact || {};
                    const work = res.data.work_experience || {};
                    const hiring = res.data.hiring_information || {};
                    setFormData(prev => ({
                        ...prev,
                        fillDate: info.fill_date || "",
                        onboardDate: info.onboard_date || "",
                        name: info.name || "",
                        gender: info.gender || "",
                        nationality: info.nationality || "",
                        education: info.education || "",
                        maritalStatus: info.married === 1 ? "Married" : "Single",
                        applyPosition: info.position || "",
                        phone: info.phone || "",
                        idNumber: info.national_id || "",
                        address1: info.registered_address || "",
                        address2: info.mailing_address || "",
                        familyName: family.name || "",
                        familyRelation: family.relationship || "",
                        familyAge: family.age ? String(family.age) : "",
                        familyJobUnit: family.company || "",
                        familyJob: family.occupation || "",
                        familyPhone: family.phone || "",
                        emergencyName: emergency.name || "",
                        emergencyRelation: emergency.relationship || "",
                        emergencyAge: emergency.age ? String(emergency.age) : "",
                        emergencyJobUnit: emergency.company || "",
                        emergencyJob: emergency.occupation || "",
                        emergencyPhone: emergency.phone || "",
                        companyName: work.company_name || "",
                        deptJob: work.job_title || "",
                        supervisor: work.supervise_name || "",
                        workPhone: work.department_telephone || "",
                        salary: work.salary ? String(work.salary) : "",
                        hasOtherJob: work.is_still_on_work ? "Yes" : "No",
                        otherJobUnit: work.working_department || "",
                        probationPeriod: hiring.probation_period ? String(hiring.probation_period) : "",
                        probationTime: hiring.duration ? String(hiring.duration) : "",
                        probationSalary: hiring.salary ? String(hiring.salary) : "",
                        officialPeriod: hiring.official_employment_date || "",
                        probationRemark: hiring.note || "",
                        licenseApprovedDate: hiring.approval_date || "",
                        licenseNotApprovedDate: hiring.disqualification_date || "",
                        family_information_id: info.family_information_id || null,
                        emergency_contact_id: info.emergency_contact_id || null,
                        work_experience_id: info.work_experience_id || null,
                        hiring_information_id: info.hiring_information_id || null,
                    }));
                } else {
                    setError("載入員工資料失敗");
                }
            } catch (err) {
                console.error(err);
                setError("載入員工資料失敗");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [isEditMode, staffId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        // 如果是 checkbox，處理方式不同
        if (type === 'checkbox') {
            const checkbox = e.target as HTMLInputElement;
            setFormData({ ...formData, [name]: checkbox.checked });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleRadioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
         const { name, value } = e.target;
         setFormData({ ...formData, [name]: value });
    }

    const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, 3));
    const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1)); // 可以考慮新增一個"上一頁"按鈕

    // 處理表單提交
    const handleSave = async () => {
        setSaving(true);
        setError("");
        try {
            const payload: any = {
                basic_info: {
                    family_information_id: formData.family_information_id,
                    emergency_contact_id: formData.emergency_contact_id,
                    work_experience_id: formData.work_experience_id,
                    hiring_information_id: formData.hiring_information_id,
                    name: formData.name,
                    phone: formData.phone,
                    gender: formData.gender,
                    national_id: formData.idNumber,
                    fill_date: formData.fillDate || null,
                    onboard_date: formData.onboardDate || null,
                    nationality: formData.nationality || "",
                    education: formData.education || "",
                    married: formData.maritalStatus === "Married" ? 1 : 0,
                    position: formData.applyPosition || "",
                    mailing_address: formData.address2 || "",
                    registered_address: formData.address1 || "",
                    account: "",
                    password: "",
                    store_id: null,
                    permission: "",
                },
            };

            if (formData.familyName) {
                payload.family_information = {
                    name: formData.familyName,
                    relationship: formData.familyRelation,
                    age: formData.familyAge ? parseInt(formData.familyAge) : null,
                    company: formData.familyJobUnit,
                    occupation: formData.familyJob,
                    phone: formData.familyPhone,
                };
            }

            if (formData.emergencyName) {
                payload.emergency_contact = {
                    name: formData.emergencyName,
                    relationship: formData.emergencyRelation,
                    age: formData.emergencyAge ? parseInt(formData.emergencyAge) : null,
                    company: formData.emergencyJobUnit,
                    occupation: formData.emergencyJob,
                    phone: formData.emergencyPhone,
                };
            }

            if (formData.companyName) {
                payload.work_experience = {
                    company_name: formData.companyName,
                    job_title: formData.deptJob,
                    supervise_name: formData.supervisor,
                    department_telephone: formData.workPhone,
                    salary: formData.salary ? parseFloat(formData.salary) : null,
                    is_still_on_work: formData.hasOtherJob === "Yes" ? 1 : 0,
                    working_department: formData.otherJobUnit,
                };
            }

            if (
                formData.probationPeriod ||
                formData.probationTime ||
                formData.probationSalary ||
                formData.officialPeriod ||
                formData.probationRemark ||
                formData.licenseApprovedDate ||
                formData.licenseNotApprovedDate
            ) {
                payload.hiring_information = {
                    probation_period: formData.probationPeriod ? parseInt(formData.probationPeriod) : null,
                    duration: formData.probationTime ? parseInt(formData.probationTime) : null,
                    salary: formData.probationSalary ? parseFloat(formData.probationSalary) : null,
                    official_employment_date: formData.officialPeriod || null,
                    approval_date: formData.licenseApprovedDate || null,
                    disqualification_date: formData.licenseNotApprovedDate || null,
                    note: formData.probationRemark || "",
                };
            }

            let res;
            if (isEditMode && staffId) {
                res = await updateStaff(Number(staffId), payload);
            } else {
                res = await addStaff(payload);
            }

            if (res.success) {
                alert(isEditMode ? "員工更新成功" : "員工新增成功");
                navigate("/backend/staff");
            } else {
                setError(res.message || (isEditMode ? "更新失敗" : "新增失敗"));
            }
        } catch (err) {
            console.error(err);
            setError(isEditMode ? "更新失敗" : "新增失敗");
        } finally {
            setSaving(false);
        }
    };

    // 渲染第一步的表單
    const renderStep1 = () => (
        <Card.Body>
            <Row className="g-3"> {/* 使用 g-3 增加欄位間距 */}
                <Col md={6}><Form.Group><Form.Label>填表日期</Form.Label><Form.Control type="date" name="fillDate" value={formData.fillDate} onChange={handleChange} /></Form.Group></Col>
                <Col md={6}><Form.Group><Form.Label>入職日期</Form.Label><Form.Control type="date" name="onboardDate" value={formData.onboardDate} onChange={handleChange} /></Form.Group></Col>
                
                <Col md={4}><Form.Group><Form.Label>姓名</Form.Label><Form.Control name="name" value={formData.name} onChange={handleChange} /></Form.Group></Col>
                <Col md={4}><Form.Group><Form.Label>性別</Form.Label><Form.Select name="gender" value={formData.gender} onChange={handleChange}><option value="">請選擇</option><option value="Male">男</option><option value="Female">女</option><option value="Other">其他</option></Form.Select></Form.Group></Col>
                <Col md={4}><Form.Group><Form.Label>出生年月日</Form.Label><Form.Control type="date" name="birthday" value={formData.birthday} onChange={handleChange} /></Form.Group></Col>

                <Col md={4}><Form.Group><Form.Label>國籍</Form.Label><Form.Control name="nationality" value={formData.nationality} onChange={handleChange} /></Form.Group></Col>
                <Col md={4}><Form.Group><Form.Label>學歷</Form.Label><Form.Control name="education" value={formData.education} onChange={handleChange} /></Form.Group></Col>
                <Col md={4}><Form.Group><Form.Label>婚否</Form.Label><Form.Select name="maritalStatus" value={formData.maritalStatus} onChange={handleChange}><option value="">請選擇</option><option value="Single">未婚</option><option value="Married">已婚</option></Form.Select></Form.Group></Col>
                
                <Col md={6}><Form.Group><Form.Label>應聘職位</Form.Label><Form.Control name="applyPosition" value={formData.applyPosition} onChange={handleChange} /></Form.Group></Col>
                <Col md={6}><Form.Group><Form.Label>入職職位</Form.Label><Form.Control name="positionLevel" value={formData.positionLevel} onChange={handleChange} /></Form.Group></Col>

                <Col md={6}><Form.Group><Form.Label>手機號碼</Form.Label><Form.Control type="tel" name="phone" value={formData.phone} onChange={handleChange} /></Form.Group></Col>
                <Col md={6}><Form.Group><Form.Label>身份證字號</Form.Label><Form.Control name="idNumber" value={formData.idNumber} onChange={handleChange} /></Form.Group></Col>
                
                <Col md={8}><Form.Group><Form.Label>戶籍地</Form.Label><Form.Control name="address1" value={formData.address1} onChange={handleChange} /></Form.Group></Col>
                <Col md={4}><Form.Group><Form.Label>連絡電話</Form.Label><Form.Control type="tel" name="contactPhone1" value={formData.contactPhone1} onChange={handleChange} /></Form.Group></Col>

                <Col md={8}><Form.Group><Form.Label>通訊地</Form.Label><Form.Control name="address2" value={formData.address2} onChange={handleChange} /></Form.Group></Col>
                <Col md={4}><Form.Group><Form.Label>連絡電話</Form.Label><Form.Control type="tel" name="contactPhone2" value={formData.contactPhone2} onChange={handleChange} /></Form.Group></Col>
            </Row>
        </Card.Body>
    );

    // 渲染第二步的表單
    const renderStep2 = () => (
        <Card.Body>
            <h5 className="fw-bold mb-3">家庭狀況</h5>
            <Row className="g-3 mb-3">
                <Col md={4}><Form.Group><Form.Label>姓名</Form.Label><Form.Control name="familyName" value={formData.familyName} onChange={handleChange} /></Form.Group></Col>
                <Col md={4}><Form.Group><Form.Label>關係</Form.Label><Form.Control name="familyRelation" value={formData.familyRelation} onChange={handleChange} /></Form.Group></Col>
                <Col md={4}><Form.Group><Form.Label>年齡</Form.Label><Form.Control type="number" name="familyAge" value={formData.familyAge} onChange={handleChange} /></Form.Group></Col>
                <Col md={4}><Form.Group><Form.Label>工作單位</Form.Label><Form.Control name="familyJobUnit" value={formData.familyJobUnit} onChange={handleChange} /></Form.Group></Col>
                <Col md={4}><Form.Group><Form.Label>職業</Form.Label><Form.Control name="familyJob" value={formData.familyJob} onChange={handleChange} /></Form.Group></Col>
                <Col md={4}><Form.Group><Form.Label>連絡電話</Form.Label><Form.Control type="tel" name="familyPhone" value={formData.familyPhone} onChange={handleChange} /></Form.Group></Col>
            </Row>
            
            <h5 className="fw-bold mb-3">緊急連絡人</h5>
            <Row className="g-3 mb-3">
                <Col md={4}><Form.Group><Form.Label>姓名</Form.Label><Form.Control name="emergencyName" value={formData.emergencyName} onChange={handleChange} /></Form.Group></Col>
                <Col md={4}><Form.Group><Form.Label>關係</Form.Label><Form.Control name="emergencyRelation" value={formData.emergencyRelation} onChange={handleChange} /></Form.Group></Col>
                <Col md={4}><Form.Group><Form.Label>年齡</Form.Label><Form.Control type="number" name="emergencyAge" value={formData.emergencyAge} onChange={handleChange} /></Form.Group></Col>
                <Col md={4}><Form.Group><Form.Label>工作單位</Form.Label><Form.Control name="emergencyJobUnit" value={formData.emergencyJobUnit} onChange={handleChange} /></Form.Group></Col>
                <Col md={4}><Form.Group><Form.Label>職業</Form.Label><Form.Control name="emergencyJob" value={formData.emergencyJob} onChange={handleChange} /></Form.Group></Col>
                <Col md={4}><Form.Group><Form.Label>連絡電話</Form.Label><Form.Control type="tel" name="emergencyPhone" value={formData.emergencyPhone} onChange={handleChange} /></Form.Group></Col>
            </Row>

            <h5 className="fw-bold mb-3">畢業學校</h5>
            <Row className="g-3">
                <Col md={3}><Form.Group><Form.Label>學籍</Form.Label><Form.Control name="graduationDegree" value={formData.graduationDegree} onChange={handleChange} /></Form.Group></Col>
                <Col md={3}><Form.Group><Form.Label>學校</Form.Label><Form.Control name="graduationSchool" value={formData.graduationSchool} onChange={handleChange} /></Form.Group></Col>
                <Col md={3}><Form.Group><Form.Label>專業科目</Form.Label><Form.Control name="major" value={formData.major} onChange={handleChange} /></Form.Group></Col>
                <Col md={3}><Form.Group><Form.Label>畢業日期</Form.Label><Form.Control type="date" name="graduationDate" value={formData.graduationDate} onChange={handleChange} /></Form.Group></Col>
            </Row>
        </Card.Body>
    );

    // 渲染第三步的表單
    const renderStep3 = () => (
        <Card.Body>
            <h5 className="fw-bold mb-3">工作經驗</h5>
            <Row className="g-3 mb-3">
                <Col md={4}><Form.Group><Form.Label>工作總時間</Form.Label><Form.Control name="workPeriod" value={formData.workPeriod} onChange={handleChange} /></Form.Group></Col>
                <Col md={4}><Form.Group><Form.Label>公司名稱</Form.Label><Form.Control name="companyName" value={formData.companyName} onChange={handleChange} /></Form.Group></Col>
                <Col md={4}><Form.Group><Form.Label>主管名稱</Form.Label><Form.Control name="supervisor" value={formData.supervisor} onChange={handleChange} /></Form.Group></Col>
                <Col md={4}><Form.Group><Form.Label>部門/職務</Form.Label><Form.Control name="deptJob" value={formData.deptJob} onChange={handleChange} /></Form.Group></Col>
                <Col md={4}><Form.Group><Form.Label>連絡電話</Form.Label><Form.Control type="tel" name="workPhone" value={formData.workPhone} onChange={handleChange} /></Form.Group></Col>
                <Col md={4}><Form.Group><Form.Label>月薪金額</Form.Label><Form.Control type="number" name="salary" value={formData.salary} onChange={handleChange} /></Form.Group></Col>
            </Row>
            <Form.Group className="mb-4">
                <Form.Label as="legend" column sm={12}>是否在職期間仍有其他工作</Form.Label>
                <Col sm={12}>
                    <Form.Check inline type="radio" label="否" name="hasOtherJob" value="No" checked={formData.hasOtherJob === "No"} onChange={handleRadioChange}/>
                    <Form.Check inline type="radio" label="是" name="hasOtherJob" value="Yes" checked={formData.hasOtherJob === "Yes"} onChange={handleRadioChange}/>
                </Col>
                {formData.hasOtherJob === "Yes" && (
                    <Col md={6} className="mt-2">
                        <Form.Control name="otherJobUnit" value={formData.otherJobUnit} onChange={handleChange} placeholder="請輸入具體單位名稱"/>
                    </Col>
                )}
            </Form.Group>

            <h5 className="fw-bold mb-3">以下內容由公司填寫</h5>
            <Card className="p-3 mb-3 bg-light">
                <Row className="g-3">
                    <Col md={12}><strong className="text-info">薪資</strong></Col>
                    <Col md={3}><Form.Group><Form.Label>試用期</Form.Label><Form.Control name="probationPeriod" value={formData.probationPeriod} onChange={handleChange} /></Form.Group></Col>
                    <Col md={3}><Form.Group><Form.Label>時間</Form.Label><Form.Control name="probationTime" value={formData.probationTime} onChange={handleChange} /></Form.Group></Col>
                    <Col md={3}><Form.Group><Form.Label>薪資</Form.Label><Form.Control name="probationSalary" value={formData.probationSalary} onChange={handleChange} /></Form.Group></Col>
                    <Col md={3}></Col> {/* 空白佔位 */}
                    <Col md={3}><Form.Group><Form.Label>正式錄用期</Form.Label><Form.Control name="officialPeriod" value={formData.officialPeriod} onChange={handleChange} /></Form.Group></Col>
                    <Col md={9}><Form.Group><Form.Label>備註</Form.Label><Form.Control name="probationRemark" value={formData.probationRemark} onChange={handleChange} /></Form.Group></Col>
                </Row>
            </Card>
            <Card className="p-3 bg-light">
                <Row className="g-3">
                    <Col md={12}><strong className="text-info">批准資格</strong></Col>
                    <Col md={6}><Form.Group><Form.Label>批准日期</Form.Label><Form.Control type="date" name="licenseApprovedDate" value={formData.licenseApprovedDate} onChange={handleChange} /></Form.Group></Col>
                    <Col md={6}><Form.Group><Form.Label>不適用日期</Form.Label><Form.Control type="date" name="licenseNotApprovedDate" value={formData.licenseNotApprovedDate} onChange={handleChange} /></Form.Group></Col>
                </Row>
            </Card>
        </Card.Body>
    );

    const content = loading ? (
        <div className="text-center py-5"><Spinner /></div>
    ) : (
        <Container className="my-4">
            {error && <div className="alert alert-danger" role="alert">{error}</div>}
            <Row className="justify-content-center">
                <Col lg={10} xl={9}>
                    <Card>
                        <Card.Header>
                            {/* 可以加入步驟指示器 */}
                            <div className="d-flex justify-content-between">
                                <span>步驟 {currentStep} / 3</span>
                                <div>
                                    <Button variant="link" onClick={() => setCurrentStep(1)} disabled={currentStep === 1}>基本資料</Button>
                                    <Button variant="link" onClick={() => setCurrentStep(2)} disabled={currentStep === 2}>家庭與學歷</Button>
                                    <Button variant="link" onClick={() => setCurrentStep(3)} disabled={currentStep === 3}>工作與公司資訊</Button>
                                </div>
                            </div>
                        </Card.Header>
                        <Form>
                            {currentStep === 1 && renderStep1()}
                            {currentStep === 2 && renderStep2()}
                            {currentStep === 3 && renderStep3()}

                            <Card.Footer className="text-end">
                                <Button variant="info" className="me-2 text-white" onClick={() => { if(window.confirm("確定要清除所有已填寫的資料嗎？")) setFormData(initialFormData); }}>
                                    清除
                                </Button>
                                <Button variant="info" className="me-auto text-white" onClick={prevStep} disabled={currentStep === 1}>
                                    上一頁
                                </Button>
                                {currentStep < 3 && <Button variant="info" className="text-white" onClick={nextStep}>下一頁</Button>}
                                {currentStep === 3 && <Button variant="info" className="text-white" onClick={handleSave} disabled={saving}>{saving ? "儲存中..." : "儲存"}</Button>}
                            </Card.Footer>
                        </Form>
                    </Card>
                </Col>
            </Row>
        </Container>
    );

    return (
        <div className="d-flex flex-column min-vh-100 bg-light">
            <Header />
            <DynamicContainer content={content} />
        </div>
    );
};

export default AddStaff;