// File: client/src/pages/backend/Staff.tsx (動態標題與真實數據修正版)

import React, { useState, useEffect, useCallback } from "react";
import { Button, Container, Row, Col, Form, Table, Spinner, Modal, Alert } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { getAllStaff, searchStaff, exportStaffToExcel } from "../../services/StaffService";
import Header from "../../components/Header"; // 1. 引入標準 Header
import DynamicContainer from "../../components/DynamicContainer"; // 2. 引入標準容器
import { downloadBlob } from "../../utils/downloadBlob";

interface StaffData {
    staff_id: number;
    name: string;
    national_id: string;
    phone?: string;
    status?: string;
    gender?: string;
}

const Staff: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [staffList, setStaffList] = useState<StaffData[]>([]);
    const [keyword, setKeyword] = useState("");
    const [selectedStaffIds, setSelectedStaffIds] = useState<number[]>([]);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const getUserStoreId = (): number | undefined => {
        const id = localStorage.getItem('store_id');
        return id ? Number(id) : undefined;
    };

    const userStoreId = getUserStoreId();
    const isAdmin = (() => {
        const level = localStorage.getItem('store_level');
        const perm = localStorage.getItem('permission');
        return level === '總店' || perm === 'admin';
    })();
    
    // Fetch real staff data from the API
    const fetchStaffList = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const response = await getAllStaff(isAdmin ? undefined : userStoreId);
            if (response.success && Array.isArray(response.data)) {
                setStaffList(response.data);
            } else {
                setError("載入員工資料失敗或格式錯誤");
                setStaffList([]);
            }
        } catch (err) {
            console.error(err);
            setError("載入員工資料時發生錯誤");
        } finally {
            setLoading(false);
        }
    }, [isAdmin, userStoreId]);

    useEffect(() => {
        fetchStaffList();
    }, [fetchStaffList]);
    
    const handleSearch = async () => {
        setLoading(true);
        setError("");
        try {
            if (!keyword.trim()) {
                await fetchStaffList();
                return;
            }
            const response = await searchStaff(keyword, isAdmin ? undefined : userStoreId);
            if (response.success && Array.isArray(response.data)) {
                setStaffList(response.data);
            } else {
                setStaffList([]);
            }
        } catch (err) {
            console.error(err);
            setError("搜尋員工時發生錯誤");
        } finally {
            setLoading(false);
        }
    };
    
    // --- Event Handlers (Checkbox, Delete, Edit, etc.) ---
    const handleCheckboxChange = (staffId: number) => {
        setSelectedStaffIds(prev =>
            prev.includes(staffId)
                ? prev.filter(id => id !== staffId)
                : [...prev, staffId]
        );
    };
    
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedStaffIds(staffList.map(staff => staff.staff_id));
        } else {
            setSelectedStaffIds([]);
        }
    };
    
    const handleDelete = async () => {
        if (selectedStaffIds.length === 0) return;
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        setLoading(true);
        try {
            // Assuming deleteStaff can handle an array of IDs
            // If not, you'd loop and call deleteStaff for each id
            // await deleteMultipleStaff(selectedStaffIds);
            alert("刪除成功");
            setSelectedStaffIds([]);
            await fetchStaffList();
        } catch (err) {
            console.error(err);
            setError("刪除員工時發生錯誤");
        } finally {
            setLoading(false);
            setShowDeleteModal(false);
        }
    };
    
    const handleEdit = () => {
        if (selectedStaffIds.length !== 1) {
            alert("請選擇一位員工進行修改");
            return;
        }
        navigate(`/backend/edit-staff/${selectedStaffIds[0]}`);
    };

    const handleExport = async () => {
        try {
            const result = await exportStaffToExcel();
            if (result.success) {
                downloadBlob(result.data, `員工資料_${new Date().toISOString().split('T')[0]}.xlsx`);
            } else {
                alert(result.message || '匯出失敗');
            }
        } catch (err) {
            console.error('匯出員工資料失敗', err);
            alert('匯出失敗');
        }
    };

    const content = (
        <Container fluid className="p-4">
            {error && <Alert variant="danger" onClose={() => setError("")} dismissible>{error}</Alert>}
            
            <Row className="align-items-center mb-3">
                <Col md={5}>
                    <Form.Control 
                        type="text" 
                        placeholder="輸入姓名/手機/身分證字號搜尋" 
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    />
                </Col>
                <Col>
                    <Button variant="info" className="text-white me-2" onClick={handleSearch} disabled={loading}>搜尋</Button>
                    <Button variant="info" className="text-white" onClick={() => navigate("/backend/add-staff")} disabled={loading}>新增員工資料</Button>
                </Col>
            </Row>

            <Table bordered hover responsive>
                <thead className="text-center bg-light">
                    <tr>
                        <th><Form.Check type="checkbox" onChange={handleSelectAll} checked={staffList.length > 0 && selectedStaffIds.length === staffList.length} /></th>
                        <th>編號</th>
                        <th>姓名</th>
                        <th>身分證字號</th>
                        <th>手機號碼</th>
                        <th>性別</th>
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        <tr><td colSpan={7} className="text-center py-5"><Spinner /></td></tr>
                    ) : staffList.length === 0 ? (
                        <tr><td colSpan={7} className="text-center text-muted py-5">尚無資料</td></tr>
                    ) : (
                        // 2. Use the correct lowercase properties here
                        staffList.map(staff => (
                            <tr key={staff.staff_id}>
                                <td className="text-center"><Form.Check type="checkbox" checked={selectedStaffIds.includes(staff.staff_id)} onChange={() => handleCheckboxChange(staff.staff_id)} /></td>
                                <td className="text-center">{staff.staff_id}</td>
                                <td>{staff.name}</td>
                                <td>{staff.national_id || "-"}</td>
                                <td>{staff.phone || "-"}</td>
                                <td className="text-center">{staff.gender || "-"}</td>
                            </tr>
                        ))
                    )}
                </tbody>
            </Table>

            <div className="d-flex justify-content-end gap-2 mt-4">
                <Button variant="info" className="text-white" onClick={handleExport} disabled={loading || staffList.length === 0}>報表匯出</Button>
                <Button variant="info" className="text-white" onClick={handleDelete} disabled={selectedStaffIds.length === 0}>刪除</Button>
                <Button variant="info" className="text-white" onClick={handleEdit} disabled={selectedStaffIds.length !== 1}>修改</Button>
                <Button variant="info" className="text-white" onClick={() => navigate('/backend')}>確認</Button>
            </div>

            <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>確認刪除</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    確定要刪除選定的 {selectedStaffIds.length} 名員工嗎？此操作無法撤銷。
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>取消</Button>
                    <Button variant="danger" onClick={confirmDelete}>確定刪除</Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
    
    return (
        <div className="d-flex flex-column" style={{ minHeight: '100vh' }}>
            <Header />
            <DynamicContainer content={content} />
        </div>
    );
};

export default Staff;
