// src/pages/medical_record/UsualSymptomsAndFamilyHistory.tsx
import React from "react"; // 確保 React 已匯入
import { Button, Form, Row, Col, Card } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import DynamicContainer from "../../components/DynamicContainer";
import { useSymptomAndHistory } from "../../hooks/useSymptomAndHistory"; // 確認路徑
import { symptomOptions, healthStatusOptions } from "../../utils/symptomUtils"; // 確認路徑

const UsualSymptomsAndFamilyHistory = () => {
    const navigate = useNavigate();
    const {
        selectedSymptoms,
        selectedFamilyHistory,
        selectedHealth,
        generalOthers,
        handleSymptomCheckboxChange,
        handleFamilyHistoryCheckboxChange,
        handleHealthStatusCheckboxChange,
        handleHealthOtherTextChange,
        handleGeneralOthersChange,
        handleSave,
    } = useSymptomAndHistory();

    const onSave = () => {
        const success = handleSave();
        // 錯誤處理已在 handleSave 中，或可以根據 success 在此處添加
        // if (!success) {
        //     alert("儲存時發生問題，請重試。");
        // }
    };
    
    // 檢查平時症狀某個選項是否已選中
    const isSymptomChecked = (category: keyof Omit<typeof selectedSymptoms, 'symptomOthers'>, option: string) => {
        return selectedSymptoms[category].includes(option);
    };

    // 檢查家族病史某個選項是否已選中
    const isFamilyHistoryChecked = (option: string) => {
        return selectedFamilyHistory.familyHistory.includes(option);
    };

    // 檢查健康狀態某個選項是否已選中
    const isHealthStatusChecked = (optionName: string) => {
        return selectedHealth.selectedStates.includes(optionName);
    };
    
    // 定義頁面內容
 
    const content = (
        <div className="w-100">
            <Form>
                {/* 健康狀態部分 - 移到最上方或您認為合適的位置 */}
                <Card className="mb-4">
                    <Card.Header className="bg-danger text-white"> {/* 改為更醒目的顏色 */}
                        <h5 className="mb-0">健康狀態</h5>
                    </Card.Header>
                    <Card.Body>
                        <Row>
                            {healthStatusOptions.map((option) => (
                                <Col md={4} key={option.name} className="mb-3"> {/* 調整 Col 大小以容納更多 */}
                                    <Form.Check
                                        type="checkbox"
                                        id={`health-status-${option.name}`}
                                        label={
                                            <span style={{ color: option.isCritical ? 'red' : 'inherit', fontWeight: option.isCritical ? 'bold' : 'normal' }}>
                                                {option.details ? `${option.name} ${option.details}` : option.name}
                                            </span>
                                        }
                                        checked={isHealthStatusChecked(option.name)}
                                        onChange={(e) => handleHealthStatusCheckboxChange(option.name, e.target.checked)}
                                    />
                                </Col>
                            ))}
                        </Row>
                        <Form.Group as={Row} className="mb-0"> {/* 減少下方間距 */}
                            <Form.Label column sm={2} className="fw-bold">
                                其他健康狀態:
                            </Form.Label>
                            <Col sm={10}>
                                <Form.Control
                                    type="text"
                                    placeholder="請輸入其他健康狀態說明"
                                    value={selectedHealth.otherText}
                                    onChange={handleHealthOtherTextChange}
                                    size="sm"
                                />
                            </Col>
                        </Form.Group>
                    </Card.Body>
                </Card>

                {/* 平時症狀部分 */}
                <Card className="mb-4">
                    <Card.Header className="bg-primary text-white">
                        <h5 className="mb-0">平時症狀</h5>
                    </Card.Header>
                    <Card.Body>
                        {Object.entries(symptomOptions)
                         .filter(([key]) => key !== 'familyHistory') // 排除 familyHistory (它有自己的 Card)
                         .map(([categoryKey, options]) => {
                            // 根據 categoryKey 給予中文標題
                            let categoryTitle = "";
                            if (categoryKey === 'HPA') categoryTitle = "HPV檢測";
                            else if (categoryKey === 'meridian') categoryTitle = "十二經絡檢測";
                            else if (categoryKey === 'neckAndShoulder') categoryTitle = "肩頸檢測";
                            else if (categoryKey === 'anus') categoryTitle = "神之門檢測";
                            // else if (categoryKey === 'familyHistory') categoryTitle = "選擇家族病史"; // familyHistory 單獨處理

                            if (!categoryTitle) return null; // 如果沒有對應的標題，則不渲染 (例如 familyHistory 在此處被排除)

                            return (
                                <div key={categoryKey} className="mb-3">
                                    <Form.Label className="fw-bold">{categoryTitle}</Form.Label>
                                    <Row>
                                        {options.map((option) => (
                                            <Col md={6} key={`${categoryKey}-${option}`}>
                                                <Form.Check
                                                    type="checkbox"
                                                    id={`${categoryKey}-${option}`}
                                                    label={option}
                                                    checked={isSymptomChecked(categoryKey as keyof Omit<typeof selectedSymptoms, 'symptomOthers'>, option)}
                                                    onChange={(e) => handleSymptomCheckboxChange(categoryKey as keyof Omit<typeof selectedSymptoms, 'symptomOthers'>, option, e.target.checked)}
                                                    className="mb-2"
                                                />
                                            </Col>
                                        ))}
                                    </Row>
                                </div>
                            );
                        })}
                         {/* 如果平時症狀有自己的 "其他" 欄位
                         <Form.Group as={Row} className="mb-3">
                            <Form.Label column sm={2} className="fw-bold">其他平時症狀:</Form.Label>
                            <Col sm={10}>
                                <Form.Control
                                    type="text"
                                    placeholder="請輸入其他平時症狀"
                                    value={selectedSymptoms.symptomOthers}
                                    onChange={(e) => setSelectedSymptoms(prev => ({...prev, symptomOthers: e.target.value}))} // 假設 hook 中有 setSelectedSymptoms
                                />
                            </Col>
                        </Form.Group>
                        */}
                    </Card.Body>
                </Card>
                
                {/* 家族病史部分 */}
                <Card className="mb-4">
                    <Card.Header className="bg-primary text-white">
                        <h5 className="mb-0">家族病史</h5>
                    </Card.Header>
                    <Card.Body>
                        <Form.Label className="fw-bold">選擇家族病史</Form.Label>
                        <Row>
                        {symptomOptions.familyHistory.map((option) => (
                            <Col md={4} key={`familyHistory-${option}`} className="mb-2"> {/* 調整 Col 大小 */}
                                <Form.Check
                                    type="checkbox"
                                    id={`familyHistory-${option}`}
                                    label={option}
                                    checked={isFamilyHistoryChecked(option)}
                                    onChange={(e) => handleFamilyHistoryCheckboxChange(option, e.target.checked)}
                                />
                            </Col>
                        ))}
                        </Row>
                        {/* 如果家族病史有自己的 "其他" 欄位
                        <Form.Group as={Row} className="mt-3 mb-0">
                            <Form.Label column sm={2} className="fw-bold">其他家族病史:</Form.Label>
                            <Col sm={10}>
                                <Form.Control
                                    type="text"
                                    placeholder="請輸入其他家族病史"
                                    value={selectedFamilyHistory.familyHistoryOthers}
                                    onChange={(e) => setSelectedFamilyHistory(prev => ({...prev, familyHistoryOthers: e.target.value}))} // 假設 hook 中有 setSelectedFamilyHistory
                                    size="sm"
                                />
                            </Col>
                        </Form.Group>
                        */}
                    </Card.Body>
                </Card>
                
                {/* 其他說明 (通用) */}
                <Form.Group className="mb-4">
                    <Form.Label className="fw-bold">其他症狀或說明 (通用)</Form.Label>
                    <Form.Control
                        as="textarea"
                        rows={3}
                        value={generalOthers}
                        onChange={handleGeneralOthersChange}
                        placeholder="請輸入其他共通的症狀或說明"
                    />
                </Form.Group>
                
                <div className="d-flex gap-3 mt-4">
                    <Button onClick={onSave} variant="primary" className="text-white">
                        儲存並返回
                    </Button>
                    <Button onClick={() => navigate("/medical-record/add")} variant="secondary" className="text-white">
                        取消
                    </Button>
                </div>
            </Form>
        </div>
    );

    return (
        <div className="d-flex flex-column min-vh-100 bg-white">
            <Header title="症狀、病史與健康狀態選擇" /> {/* 更新標題 */}
            <DynamicContainer content={content} className="p-4 align-items-start" />
        </div>
    );
};

export default UsualSymptomsAndFamilyHistory;