// .\src\pages\health\pure_medical_record\PureMedicalRecord.tsx
import React from "react";
import { Button, Col, Container, Form, Row, Spinner, Badge } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import Header from "../../../components/Header";
import DynamicContainer from "../../../components/DynamicContainer";
import ScrollableTable from "../../../components/ScrollableTable";
import { formatDate, getBMIStatus } from "../../../utils/pureMedicalUtils";
import { usePureMedicalRecord } from "../../../hooks/usePureMedicalRecord";

const PureMedicalRecord: React.FC = () => {
  const navigate = useNavigate();

  const {
    records,
    loading,
    error,
    searchKeyword,
    setSearchKeyword,
    selectedIds,
    handleCheckboxChange,
    handleSearch,
    handleDelete,
    handleExport
  } = usePureMedicalRecord();

  const content = (
    <>
      {/* 搜尋區塊 (保持不變) */}
      <Container className="my-4">
        <Row className="align-items-center">
          <Col xs={12} md={6} className="mb-3 mb-md-0">
            <Form.Control
              type="text"
              placeholder="姓名／淨化項目／服務人" // 搜尋提示文字中的 "服務人員" 已符合 Figma 的 "服務人"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </Col>
          <Col xs={12} md={6} className="d-flex justify-content-end gap-3">
            <Button
              variant="info"
              className="text-white px-4"
              onClick={handleSearch}
              disabled={loading}
            >
              {loading ? <Spinner animation="border" size="sm" /> : "搜尋"}
            </Button>
            <Button
              variant="info"
              className="text-white px-4"
              onClick={() => navigate("/health-data-analysis/add-pure-medical-record")}
              disabled={loading}
            >新增</Button>
          </Col>
        </Row>
      </Container>

      {error && (
        <Container>
          <div className="alert alert-danger">{error}</div>
        </Container>
      )}

      <Container>
        <ScrollableTable
          tableHeader={
            <tr>
              <th style={{ width: '50px' }}>勾選</th>
              <th>姓名</th>
              <th>血壓</th>
              <th>日期</th>
              {/* <th>身高</th> */}{/* <--- 1) 刪除 身高 */}
              <th>體重</th>
              <th>體脂肪</th> {/* <--- 2) 增加 “體脂肪” */}
              <th>內脂肪</th>
              <th>基礎代謝</th>
              <th>體年</th>   {/* <--- 3) “體年齡” 修改為 “體年” */}
              <th>BMI</th>
              <th>淨化項目</th>
              <th>服務人</th> {/* <--- 4) “服務人員” 修改為 “服務人” */}
              <th>備註欄</th>
            </tr>
          }
          tableBody={
            loading ? (
              <tr>
                {/* 更新 colSpan 以匹配新的欄位數量 (13欄 -> 13欄，因為刪除身高，增加體脂肪) */}
                <td colSpan={13} className="text-center py-5">
                  <Spinner animation="border" />
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={13} className="text-center text-muted py-5">尚無資料</td>
              </tr>
            ) : (
              records.map(record => {
                const bmiStatus = getBMIStatus(record.bmi || '-');

                return (
                  <tr key={record.ipn_pure_id}>
                    <td className="text-center align-middle">
                      <Form.Check
                        type="checkbox"
                        checked={selectedIds.includes(record.ipn_pure_id)}
                        onChange={(e) => handleCheckboxChange(record.ipn_pure_id, e.target.checked)}
                      />
                    </td>
                    <td className="align-middle fw-bold">{record.Name || "-"}</td>
                    <td className="align-middle">{record.blood_preasure || "-"}</td>
                    <td className="align-middle">{formatDate(record.date)}</td>
                    {/* <td className="align-middle">
                      {record.height ? `${record.height} cm` : "-"}
                    </td> */} {/* <--- 1) 刪除 身高 */}
                    <td className="align-middle">
                      {record.weight ? `${record.weight} kg` : "-"}
                    </td>
                    <td className="align-middle">{record.body_fat_percentage || "-"}</td> {/* <--- 2) 顯示體脂肪 (假設 API 回傳的欄位是 body_fat_percentage) */}
                    <td className="align-middle">{record.visceral_fat || "-"}</td>
                    <td className="align-middle">{record.basal_metabolic_rate || "-"}</td>
                    <td className="align-middle">{record.body_age || "-"}</td> {/* <--- 3) 顯示體年 (API 欄位可能仍是 body_age) */}
                    <td className="align-middle">
                      {record.bmi ? (
                        <div>
                          {record.bmi}
                          {bmiStatus && (
                            <div>
                              <Badge bg={bmiStatus.variant} className="mt-1">
                                {bmiStatus.status}
                              </Badge>
                            </div>
                          )}
                        </div>
                      ) : "-"}
                    </td>
                    <td className="align-middle">{record.pure_item || "-"}</td>
                    <td className="align-middle">{record.staff_name || "-"}</td> {/* <--- 4) 顯示服務人 (API 欄位是 staff_name) */}
                    <td className="align-middle" style={{ maxWidth: '200px', whiteSpace: 'normal' }}>
                      {record.note || "-"}
                    </td>
                  </tr>
                );
              })
            )
          }
          tableProps={{ bordered: true, hover: true }}
          height="calc(100vh - 350px)" // 您可能需要根據搜尋區域高度變化調整此值
        />
      </Container>

      {/* 底部按鈕 (保持不變，已符合Figma圖示) */}
      <Container className="my-4">
        <Row className="justify-content-end g-3">
          <Col xs="auto">
            <Button
              variant="info"
              className="text-white px-4"
              onClick={handleExport}
              disabled={loading || records.length === 0}
            >
              報表匯出
            </Button>
          </Col>
          <Col xs="auto">
            <Button
              variant="info"
              className="text-white px-4"
              onClick={handleDelete}
              disabled={loading || selectedIds.length === 0}
            >
              刪除
            </Button>
          </Col>
          <Col xs="auto">
            <Button
              variant="info"
              className="text-white px-4"
              onClick={() => navigate(-1)} // "確認" 按鈕的功能是返回
            >
              確認
            </Button>
          </Col>
        </Row>
      </Container>
    </>
  );

  return (
    <>
      <Header title="iPN淨化健康紀錄表 1.1.1.4.2" />
      <DynamicContainer content={content} />
    </>
  );
};

export default PureMedicalRecord;