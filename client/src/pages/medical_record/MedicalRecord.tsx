import React from "react";
import { Button, Form, Row, Col } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import DynamicContainer from "../../components/DynamicContainer";
import ScrollableTable from "../../components/ScrollableTable";
import { useMedicalRecordManagement, HealthRecordIndex } from "../../hooks/useMedicalRecord";
import { formatMedicalHistory, formatMicroSurgery } from "../../utils/medicalUtils";
import "./medicalRecord.css";
import usePermissionGuard from "../../hooks/usePermissionGuard";

const MedicalRecord: React.FC = () => {
    const navigate = useNavigate();
    const {
        records,
        searchValue, 
        setSearchValue, 
        selectedIds, 
        handleCheckboxChange, 
        handleDelete, 
        handleSearch, 
        handleExport,
    } = useMedicalRecordManagement();

    // 定義表格標頭
    const tableHeader = (
        <tr>
            <th>勾選</th>
            <th>店別</th>
            <th style={{ minWidth: '8ch' }}>會員編號</th>
            <th>姓名</th>
            <th>身高</th>
            <th>體重</th>
            <th>血壓</th>
            <th>病史</th>
            <th>微整型</th>
            <th>備註</th>
        </tr>
    );
    const { checkPermission: checkEditPermission, modal: editPermissionModal } = usePermissionGuard();
    const { checkPermission: checkDeletePermission, modal: deletePermissionModal } = usePermissionGuard({
        disallowedRoles: ["basic", "therapist"],
    });

    // 新增處理修改按鈕點擊的函數
    const handleEdit = () => {
        if (!checkEditPermission()) {
            return;
        }
      // 必須檢查是否只勾選了「一個」項目
      if (selectedIds.length === 1) {
          // 獲取勾選的第一個 ID (也是唯一一個)
            const idToEdit = selectedIds[0];

            // **最重要的部分**：
            // 導航路徑必須是一個包含 ID 的動態字串
            navigate(`/medical-record/edit/${idToEdit}`);
        }
    };
    // 定義表格內容
    const tableBody = (
        records.length > 0 ? (
            records.map((r) => (
                <tr key={r[HealthRecordIndex.ID]}>
                    <td>
                        <Form.Check
                            type="checkbox"
                            checked={selectedIds.includes(r[HealthRecordIndex.ID])}
                            onChange={(e) => handleCheckboxChange(r[HealthRecordIndex.ID], e.target.checked)}
                        />
                    </td>
                    <td>{r[HealthRecordIndex.STORE_NAME] ?? '-'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{r[HealthRecordIndex.MEMBER_CODE]}</td>
                    <td>{r[HealthRecordIndex.NAME] || "-"}</td>
                    <td>{r[HealthRecordIndex.HEIGHT]}</td>
                    <td>{r[HealthRecordIndex.WEIGHT]}</td>
                    <td>{r[HealthRecordIndex.BLOOD_PRESSURE]}</td>
                    <td>{formatMedicalHistory(r[HealthRecordIndex.MEDICAL_HISTORY])}</td>
                    <td>{formatMicroSurgery(r[HealthRecordIndex.MICRO_SURGERY])}</td>
                    <td>{r[HealthRecordIndex.MICRO_SURGERY_NOTES]}</td>
                </tr>
            ))
        ) : (
            <tr>
                <td colSpan={10} className="text-muted">
                    無資料
                </td>
            </tr>
        )
    );

    const handleDeleteWithPermission = async () => {
        if (!checkDeletePermission()) {
            return;
        }
        await handleDelete();
    };

    // 定義頁面內容
    const content = (
        <div className="w-100">
            {/* 搜索區域 */}
            <div className="search-area mb-4">
                <Row className="align-items-center">
                    <Col md={6} className="mb-3 mb-md-0">
                        <Form.Control
                            type="text"
                            placeholder="姓名/會員編號"
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                        />
                    </Col>
                    <Col md={6} className="d-flex justify-content-end gap-2">
                        <Button variant="info" className="text-white" onClick={handleSearch}>搜尋</Button>
                        <Button variant="info" className="text-white" 
                            onClick={() => {
                                localStorage.removeItem('medicalRecordData');
                                navigate('/medical-record/add-medical-record');
                            }}
                            >
                            新增
                        </Button>
                    </Col>
                </Row>
            </div>

            {/* 使用 ScrollableTable 元件 */}
            <ScrollableTable
                tableHeader={tableHeader}
                tableBody={tableBody}
                tableProps={{ bordered: true, hover: true, responsive: true, className: "text-center" }}
            />

            {/* 底部按鈕區域 */}
            <div className="button-area mt-4">
                <Row className="justify-content-end g-3">
                    <Col xs="auto">
                        <Button variant="info" className="text-white" onClick={handleExport}>報表匯出</Button>
                    </Col>
                    <Col xs="auto">
                        <Button variant="info" className="text-white" onClick={handleDeleteWithPermission}>刪除</Button>
                    </Col>
                    <Col xs="auto">
                        {/* 修改此按鈕 */}
                        <Button 
                            variant="info" 
                            className="text-white"
                            onClick={handleEdit}
                            disabled={selectedIds.length !== 1} // <--- 當勾選數量不為 1 時禁用
                        >
                            修改
                        </Button>
                    </Col>
                </Row>
            </div>
        </div>
    );

    return (
        <>
            <div className="d-flex flex-column min-vh-100 bg-white">
                {/* 使用 Header 元件 */}
                <Header />

                {/* 使用 DynamicContainer */}
                <DynamicContainer content={content} className="p-4 align-items-start" />
            </div>
            {editPermissionModal}
            {deletePermissionModal}
        </>
    );
};

export default MedicalRecord;
