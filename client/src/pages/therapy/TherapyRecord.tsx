// .\src\pages\therapy\TherapyRecord.tsx
import React, { useState, useEffect } from "react";
import { Button, Container, Row, Col, Form, InputGroup } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import DynamicContainer from "../../components/DynamicContainer";
import ScrollableTable from "../../components/ScrollableTable";
import { useTherapyRecord } from "../../hooks/useTherapyRecord";
import { formatDate, truncateText, formatNumber } from "../../utils/therapyUtils";
import { getTherapyPackages, getStaffMembers, TherapyPackage, StaffMember } from "../../services/TherapyDropdownService";
import { downloadBlob } from "../../utils/downloadBlob";
import { exportTherapyRecords } from "../../services/TherapyService";

const TherapyRecord: React.FC = () => {
    const navigate = useNavigate();
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [therapist, setTherapist] = useState("");
    const [packageName, setPackageName] = useState("");
    const [salesperson, setSalesperson] = useState("");
    
    // 下拉選單資料
    const [therapyPackages, setTherapyPackages] = useState<TherapyPackage[]>([]);
    const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
    const [loadingOptions, setLoadingOptions] = useState(false);
    
    // 使用自定義 Hook 獲取數據和操作方法
    const {
        records,
        loading,
        error,
        keyword,
        setKeyword,
        selectedIds,
        handleCheckboxChange,
        handleSearch,
    } = useTherapyRecord();

    const handleExport = async () => {
        try {
            const blob = await exportTherapyRecords();
            downloadBlob(blob, "療程紀錄.xlsx");
        } catch (err) {
            console.error("匯出失敗：", err);
            alert("匯出報表失敗！");
        }
    };

    // 載入下拉選單資料
    useEffect(() => {
        const fetchDropdownData = async () => {
            setLoadingOptions(true);
            try {
                // 並行載入所有下拉選單數據
                const [packagesData, staffData] = await Promise.all([
                    getTherapyPackages(),
                    getStaffMembers()
                ]);
                
                setTherapyPackages(packagesData);
                setStaffMembers(staffData);
            } catch (error) {
                console.error('載入下拉選單資料失敗:', error);
            } finally {
                setLoadingOptions(false);
            }
        };
        
        fetchDropdownData();
    }, []);

    // 處理搜尋
    const handleSearchClick = () => {
        // 將所有篩選條件傳遞給搜尋函數
        handleSearch({
            keyword,
            startDate,
            endDate,
            therapist,
            packageName,
            salesperson
        });
    };

    // 主要內容
    const content = (
        <>
            {/* 搜尋區塊 */}
            <Container className="my-4">
                <Row className="align-items-center mb-3">
                    <Col md={6}>
                        <Form.Group>
                            <Form.Label>姓名/電話/會員編號</Form.Label>
                            <Form.Control
                                type="text"
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearchClick()}
                            />
                        </Form.Group>
                    </Col>
                    <Col md={6}>
                        <Form.Group>
                            <Form.Label>方案</Form.Label>
                            <Form.Select
                                value={packageName}
                                onChange={(e) => setPackageName(e.target.value)}
                                disabled={loadingOptions}
                            >
                                <option value="">請選擇方案</option>
                                {therapyPackages.map((pkg) => (
                                    <option
                                        key={pkg.therapy_id}
                                        value={pkg.therapy_id.toString()}
                                    >
                                        {pkg.TherapyName || pkg.TherapyContent}
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    </Col>
                </Row>
                <Row className="align-items-center mb-3">
                    <Col md={4}>
                        <Form.Group>
                            <Form.Label>可選取日曆</Form.Label>
                            <InputGroup>
                                <Form.Control
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                                <InputGroup.Text>~</InputGroup.Text>
                                <Form.Control
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </InputGroup>
                        </Form.Group>
                    </Col>
                    <Col md={4}>
                        <Form.Group>
                            <Form.Label>療癒師</Form.Label>
                            <Form.Select
                                value={therapist}
                                onChange={(e) => setTherapist(e.target.value)}
                                disabled={loadingOptions}
                            >
                                <option value="">請選擇療癒師</option>
                                {staffMembers.map((staff) => (
                                    <option 
                                        key={staff.staff_id} 
                                        value={staff.staff_id.toString()}
                                    >
                                        {staff.name}
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    </Col>
                    <Col md={4}>
                        <Form.Group>
                            <Form.Label>銷售人</Form.Label>
                            <Form.Select
                                value={salesperson}
                                onChange={(e) => setSalesperson(e.target.value)}
                                disabled={loadingOptions}
                            >
                                <option value="">請選擇銷售人</option>
                                {staffMembers.map((staff) => (
                                    <option 
                                        key={staff.staff_id} 
                                        value={staff.staff_id.toString()}
                                    >
                                        {staff.name}
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    </Col>
                </Row>
                <Row className="mt-3 mb-4">
                    <Col className="d-flex justify-content-end gap-3">
                        <Button 
                            variant="info" 
                            className="text-white px-4"
                            onClick={handleSearchClick}
                            disabled={loading || loadingOptions}
                        >
                            搜尋
                        </Button>
                        <Button 
                            onClick={()=>navigate('/therapy-record/add-therapy-record')} 
                            variant="info" 
                            className="text-white px-4"
                            disabled={loading}
                        >
                            新增
                        </Button>
                    </Col>
                </Row>
            </Container>

            {/* 錯誤訊息 */}
            {error && (
                <Container>
                    <div className="alert alert-danger">{error}</div>
                </Container>
            )}

            {/* 表格區塊 */}
            <Container>
                <ScrollableTable
                    tableHeader={
                        <tr>
                            <th style={{ width: '50px' }}>勾選</th>
                            <th>店別</th>
                            <th>姓名</th>
                            <th>會員編號</th>
                            <th>療程日期</th>
                            <th>方案</th>
                            <th>使用療程內容</th>
                            <th>扣除堂數</th>
                            <th>療程剩餘數</th>
                            <th>療癒師</th>
                            <th>備註</th>
                        </tr>
                    }
                    tableBody={
                        loading ? (
                            <tr>
                                <td colSpan={11} className="text-center py-5">
                                    <div className="spinner-border text-info" role="status">
                                        <span className="visually-hidden">Loading...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : records.length > 0 ? (
                            records.map((record) => (
                                <tr key={record.therapy_record_id}>
                                    <td className="text-center align-middle">
                                        <Form.Check
                                            type="checkbox"
                                            checked={selectedIds.includes(record.therapy_record_id)}
                                            onChange={(e) => handleCheckboxChange(record.therapy_record_id, e.target.checked)}
                                        />
                                    </td>
                                    <td className="align-middle">{record.store_name || '-'}</td>
                                    <td className="align-middle">{record.member_name || "-"}</td>
                                    <td className="align-middle">{record.member_code || "-"}</td>
                                    <td className="align-middle">{formatDate(record.date)}</td>
                                    <td className="align-middle">{record.package_name || "-"}</td>
                                    <td className="align-middle">{record.therapy_content || "-"}</td>
                                    <td className="align-middle">{formatNumber(record.deduct_sessions)}</td>
                                    <td className="align-middle">{formatNumber(record.remaining_sessions)}</td>
                                    <td className="align-middle">{record.staff_name || "-"}</td>
                                    <td className="align-middle">{record.note ? truncateText(record.note, 30) : "-"}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={11} className="text-center text-muted py-5">
                                    尚無資料
                                </td>
                            </tr>
                        )
                    }
                    tableProps={{ bordered: true, hover: true }}
                    height="calc(100vh - 450px)"
                />
            </Container>

            {/* 底部按鈕 */}
            <Container className="my-4">
                <Row className="justify-content-end g-3">
                    <Col xs="auto">
                        <Button
                            variant="info"
                            className="text-white px-4"
                            onClick={handleExport}
                            disabled={loading}
                        >
                            報表匯出
                        </Button>
                    </Col>
                    <Col xs="auto">
                        <Button
                            variant="info"
                            className="text-white px-4"
                            onClick={() =>
                                navigate('/therapy-record/add-therapy-record', {
                                    state: { recordId: selectedIds[0] },
                                })
                            }
                            disabled={loading || selectedIds.length !== 1}
                        >
                            修改
                        </Button>
                    </Col>
                </Row>
            </Container>
        </>
    );

    return (
        <>
            <Header />
            <DynamicContainer content={content} />
        </>
    );
};

export default TherapyRecord;
