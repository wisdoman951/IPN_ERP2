// client\src\pages\medical_record\AddMedicalRecord.tsx
import { Button, Form, Row, Col, Alert } from "react-bootstrap"; // 新增 Alert
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import DynamicContainer from "../../components/DynamicContainer";
import MemberColumn from "../../components/MemberColumn";
import { useMedicalRecordForm } from "../../hooks/useMedicalRecordForm";
import { useParams } from "react-router-dom";

const AddMedicalRecord = () => {
    const navigate = useNavigate();
    const { id } = useParams(); // 這樣就拿到了
    const formHook = useMedicalRecordForm(id); // <-- 傳進去！
    const {
        form,
        error,
        validated,
        submitLoading,
        memberData, // 假設您可能在 MemberColumn 中用到
        isContraindicated, // <--- 獲取 isContraindicated
        handleMemberChange,
        handleChange,
        handleSelectChange,
        handleOpenSelectionsPage,
        handleSubmit,
        setError,
        isEditMode
    } = formHook;

    // 新增列印處理函數
    const handlePrint = () => {
        // 觸發瀏覽器的列印功能
        // 在實際列印前，您可能需要隱藏一些不希望列印的元素 (例如按鈕本身、導航欄等)
        // 這通常通過 CSS @media print 規則來實現
        window.print();
    };
    const pageTitle = isEditMode ? "修改健康檢查紀錄" : "新增健康檢查紀錄 1.1.1.2.1"; // <--- 動態標題

    // 定義頁面內容
    const content = (
        <div className="w-100">
            <Row>
                <Col md={isContraindicated ? 8 : 12}>
                    {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
                    <Form noValidate validated={validated} onSubmit={formHook.handleSubmit}>
                        {/* ... (MemberColumn, 身高, 體重, 血壓, 備註, 健康狀態, 平時症狀, 家族病史, 微整型等欄位保持不變) ... */}
                        <MemberColumn
                            memberId={form.memberId}
                            name={form.name}
                            onMemberChange={handleMemberChange}
                            onError={setError}
                        />
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>身高</Form.Label>
                                    <Form.Control type="text" name="height" value={form.height} onChange={handleChange} required />
                                    <Form.Control.Feedback type="invalid">請輸入身高</Form.Control.Feedback>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>體重</Form.Label>
                                    <Form.Control type="text" name="weight" value={form.weight} onChange={handleChange} required />
                                    <Form.Control.Feedback type="invalid">請輸入體重</Form.Control.Feedback>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>血壓</Form.Label>
                                    <Form.Control type="text" name="bloodPressure" value={form.bloodPressure} onChange={handleChange} />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>備註</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="remark"
                                        value={form.remark}
                                        onChange={handleChange}
                                        aria-describedby="remarkHelpBlock"
                                    />
                                    <Form.Text id="remarkHelpBlock" muted>
                                        (用藥過敏，特殊需求，固定療癒師)
                                    </Form.Text>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>健康狀態</Form.Label>
                                    <div
                                        className="form-control d-flex align-items-center justify-content-between"
                                        style={{ cursor: 'pointer', backgroundColor: form.healthStatusSummary ? '#e8f4f8' : '#f8f9fa', height: 'auto', minHeight: '38px', padding: '8px 12px', whiteSpace: 'normal', lineHeight: '1.5' }}
                                        onClick={handleOpenSelectionsPage}
                                    >
                                        {form.healthStatusSummary ? <span style={{ wordBreak: 'break-word' }}>{form.healthStatusSummary}</span> : <span className="text-muted">點此選擇</span>}
                                        <i className="bi bi-chevron-right"></i>
                                    </div>
                                    <Form.Control type="hidden" required={!form.healthStatusSummary} />
                                    {!form.healthStatusSummary && validated && <div className="invalid-feedback d-block">請選擇健康狀態</div>}
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>平時症狀</Form.Label>
                                    <div
                                        className="form-control d-flex align-items-center justify-content-between"
                                        style={{ cursor: 'pointer', backgroundColor: form.symptomSummary ? '#e8f4f8' : '#f8f9fa', height: 'auto', minHeight: '38px', padding: '8px 12px', whiteSpace: 'normal', lineHeight: '1.5' }}
                                        onClick={handleOpenSelectionsPage}
                                    >
                                        {form.symptomSummary ? <span style={{ wordBreak: 'break-word' }}>{form.symptomSummary}</span> : <span className="text-muted">點此選擇</span>}
                                        <i className="bi bi-chevron-right"></i>
                                    </div>
                                    <Form.Control type="hidden" required={!form.symptomSummary} />
                                     {!form.symptomSummary && validated && <div className="invalid-feedback d-block">請選擇平時症狀</div>}
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>家族病史</Form.Label>
                                    <div
                                        className="form-control d-flex align-items-center justify-content-between"
                                        style={{ cursor: 'pointer', backgroundColor: form.familySummary ? '#e8f4f8' : '#f8f9fa', height: 'auto', minHeight: '38px', padding: '8px 12px', whiteSpace: 'normal', lineHeight: '1.5' }}
                                        onClick={handleOpenSelectionsPage}
                                    >
                                        {form.familySummary ? <span style={{ wordBreak: 'break-word' }}>{form.familySummary}</span> : <span className="text-muted">點此選擇</span>}
                                        <i className="bi bi-chevron-right"></i>
                                    </div>
                                     <Form.Control type="hidden" required={!form.familySummary} />
                                     {!form.familySummary && validated && <div className="invalid-feedback d-block">請選擇家族病史</div>}
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>微整型</Form.Label>
                                    <Form.Select name="cosmeticSurgery" value={form.cosmeticSurgery} onChange={handleSelectChange} required >
                                        <option value="">請選擇...</option>
                                        <option value="Yes">Yes</option>
                                        <option value="No">No</option>
                                    </Form.Select>
                                    <Form.Control.Feedback type="invalid">請選擇是否有微整型</Form.Control.Feedback>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>微整型說明</Form.Label>
                                    <Form.Control type="text" name="cosmeticDesc" value={form.cosmeticDesc} onChange={handleChange} required={form.cosmeticSurgery === "Yes"} disabled={form.cosmeticSurgery !== "Yes"} />
                                    {form.cosmeticSurgery === "Yes" && !form.cosmeticDesc && validated && (<div className="invalid-feedback d-block">請輸入微整型說明</div>)}
                                </Form.Group>
                            </Col>
                            <Col md={12} className="mt-3">
                                <p className="text-danger">
                                    不適用對象：孕婦，出血期(腦癌血、腸胃出血)、急性病，心臟搭橋，支架手術，裝起搏器，器官移植及打干擾素，粉碎性骨折，三個月內做過手術。
                                </p>
                            </Col>
                        </Row>

                        {/* 按鈕區域修改 */}
                        <div className="d-flex gap-3 mt-4">
                            <Button
                                type="submit" // "確認" 按鈕觸發 handleSubmit
                                variant="info" // 您可以根據喜好調整 variant，例如 "primary"
                                className="text-white"
                                disabled={submitLoading || !form.name || !form.height || !form.weight || !form.cosmeticSurgery || (form.cosmeticSurgery === "Yes" && !form.cosmeticDesc) || !form.symptomSummary || !form.familySummary || !form.healthStatusSummary}
                            >
                                {submitLoading ? "處理中..." : "確認"} {/* 文字修改為 "確認" */}
                            </Button>
                            <Button
                                onClick={() => navigate('/medical-record')}
                                variant="info"
                                className="text-white"
                                type="button"
                                disabled={submitLoading} // "取消" 按鈕在 submitLoading 時通常也應禁用
                            >
                                取消
                            </Button>
                            <Button
                                onClick={handlePrint} // 綁定新的列印處理函數
                                variant="info" // 例如使用 "info" variant，您可以選擇其他
                                className="text-white" // 如果 variant 本身沒有白色文字，則需要
                                type="button"
                                // 通常列印按鈕不一定需要在 submitLoading 時禁用，除非有特殊邏輯
                                // disabled={submitLoading} 
                            >
                                列印
                            </Button>
                        </div>
                    </Form>
                </Col>

                {isContraindicated && (
                    <Col md={4}>
                        <Alert variant="danger" className="mt-md-5">
                            <Alert.Heading><i className="bi bi-exclamation-triangle-fill"></i> 注意！</Alert.Heading>
                            <p>此對象的健康狀態、平時症狀或家族病史中，包含不適用此服務的項目。</p>
                            <hr />
                            <p className="mb-0"><strong>列為不適用對象</strong></p>
                        </Alert>
                    </Col>
                )}
            </Row>
        </div>
    );

    return (
        <div className="d-flex flex-column min-vh-100 bg-white">
            <Header title={pageTitle} className="d-print-none" />
            <DynamicContainer content={content} className="p-4 align-items-start" />
        </div>
    );
};

export default AddMedicalRecord;