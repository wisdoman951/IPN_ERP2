// File: client/src/pages/backend/UserAccountManagement.tsx (排版修正版)

import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Form, Button, Table, Spinner, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { getStaffAccounts, deleteMultipleStaff, StaffAccount, exportStaffAccounts, exportSelectedStaffAccounts } from '../../services/StaffService';
import Header from '../../components/Header'; // 1. 引入 Header
import DynamicContainer from '../../components/DynamicContainer'; // 2. 引入 DynamicContainer

const PERMISSION_LABELS: Record<string, string> = {
    basic: '一般權限',
    admin: '管理員',
    therapist: '療癒師',
};

const UserAccountManagement: React.FC = () => {
    const navigate = useNavigate();
    const [accounts, setAccounts] = useState<StaffAccount[]>([]);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [keyword, setKeyword] = useState('');

    const fetchAccounts = useCallback(async (searchKeyword?: string) => {
        setLoading(true);
        setError(null);
        try {
            const data = await getStaffAccounts(searchKeyword);
            setAccounts(data);
        } catch (err) {
            setError('無法獲取帳號列表');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAccounts();
    }, [fetchAccounts]);
    
    const handleSearch = () => fetchAccounts(keyword);

    const handleCheckboxChange = (id: number, checked: boolean) => {
        setSelectedIds(prev => checked ? [...prev, id] : prev.filter(i => i !== id));
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(accounts.map(acc => acc.staff_id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleDelete = async () => {
        if (selectedIds.length === 0) return;
        if (!window.confirm(`確定要刪除選中的 ${selectedIds.length} 個帳號嗎？`)) return;
        try {
            setLoading(true);
            const result = await deleteMultipleStaff(selectedIds);
            alert(result.success ? '刪除成功！' : result.message || '刪除失敗');
            setSelectedIds([]);
            fetchAccounts(keyword);
        } catch (err) {
            console.error('刪除帳號失敗：', err);
            alert('刪除帳號失敗');
        } finally {
            setLoading(false);
        }
    };
    
    const handleEdit = () => {
        if (selectedIds.length !== 1) {
            alert("請選擇一個帳號進行修改。");
            return;
        }
        // 注意：這裡我們假設編輯帳號的頁面是 GrantUserAccessPage，因為流程相似
        // 您也可以為其建立一個獨立的編輯頁面
        navigate(`/backend/user-accounts/edit/${selectedIds[0]}`);
    };

    const handleExport = async () => {
        try {
            setLoading(true);
            const blob = await exportStaffAccounts(keyword);
            const url = window.URL.createObjectURL(new Blob([blob]));
            const a = document.createElement('a');
            a.href = url;
            a.download = '員工帳號資料.xlsx';
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('匯出帳號資料失敗：', err);
            alert('匯出帳號資料失敗');
        } finally {
            setLoading(false);
        }
    };

    const handleExportSelected = async () => {
        if (selectedIds.length === 0) return;
        try {
            setLoading(true);
            const blob = await exportSelectedStaffAccounts(selectedIds);
            const url = window.URL.createObjectURL(new Blob([blob]));
            const a = document.createElement('a');
            a.href = url;
            a.download = '員工帳號資料.xlsx';
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('匯出勾選帳號資料失敗：', err);
            alert('匯出帳號資料失敗');
        } finally {
            setLoading(false);
        }
    };

    // 3. 將所有頁面內容都放進一個名為 `content` 的變數中
    const content = (
        <Container fluid className="p-4">
            {error && <Alert variant="info">{error}</Alert>}
            <Row className="align-items-center mb-3">
                <Col md={5}>
                    <Form.Control 
                        type="text" 
                        placeholder="搜尋姓名/電話/員工編號" 
                        value={keyword}
                        onChange={e => setKeyword(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && handleSearch()}
                    />
                </Col>
                <Col>
                    {/* 按鈕樣式統一 */}
                    <Button variant="info" className="me-2 text-white" onClick={handleSearch} disabled={loading}>搜尋</Button>
                    <Button variant="info" className="text-white" onClick={() => navigate('/backend/user-accounts/add')}>新增</Button>
                </Col>
            </Row>
            
            <Table striped bordered hover responsive>
                <thead>
                    <tr>
                        <th><Form.Check type="checkbox" onChange={handleSelectAll} checked={accounts.length > 0 && selectedIds.length === accounts.length} /><span className="ms-1">勾選</span></th>
                        <th>姓名</th>
                        <th>電話</th>
                        <th>員工編號</th>
                        <th>店別</th>
                        <th>帳號</th>
                        <th>權限</th>
                        <th>密碼</th>
                        <th>備註</th>
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        <tr><td colSpan={9} className="text-center py-5"><Spinner animation="border" /></td></tr>
                    ) : accounts.length === 0 ? (
                        <tr><td colSpan={9} className="text-center text-muted py-5">尚無資料</td></tr>
                    ) : accounts.map(acc => (
                        <tr key={acc.staff_id} className={acc.reset_requested ? 'table-warning' : ''}>
                            <td className="text-center align-middle"><Form.Check type="checkbox" checked={selectedIds.includes(acc.staff_id)} onChange={e => handleCheckboxChange(acc.staff_id, e.target.checked)} /></td>
                            <td className="align-middle">{acc.name}</td>
                            <td className="align-middle">{acc.phone || '-'}</td>
                            <td className="align-middle">{acc.staff_id}</td>
                            <td className="align-middle">{acc.store_name || '-'}</td>
                            <td className="align-middle">{acc.account || '-'}</td>
                            <td className="align-middle">{acc.permission ? PERMISSION_LABELS[acc.permission] || acc.permission : '-'}</td>
                            <td className="align-middle">{'******'}</td>
                            <td className="align-middle text-danger">{acc.reset_requested ? '此員工已申請密碼重設' : '-'}</td>
                        </tr>
                    ))}
                </tbody>
            </Table>
            <div className="d-flex justify-content-end gap-2 mt-4">
                <Button variant="info" className="text-white" onClick={handleExport} disabled={loading}>報表匯出</Button>
                <Button variant="info" className="text-white" onClick={handleExportSelected} disabled={loading || selectedIds.length === 0}>勾選匯出</Button>
                <Button variant="info" className="text-white" onClick={handleDelete} disabled={selectedIds.length === 0}>刪除</Button>
                <Button variant="info" className="text-white" onClick={handleEdit} disabled={selectedIds.length !== 1}>修改</Button>
            </div>
        </Container>
    );
    
    // 4. 使用您專案的標準版面結構來渲染頁面
    return (
        <div className="d-flex flex-column" style={{ minHeight: '100vh' }}>
            <Header />
            <DynamicContainer content={content} />
        </div>
    );
};

export default UserAccountManagement;
