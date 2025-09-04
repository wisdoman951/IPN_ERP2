// File: client/src/pages/backend/AddEditUserAccount.tsx (排版修正版)

import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Card, Spinner, Alert, Row, Col } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import {
    updateStaffAccount,
    fetchStoresForDropdown,
    getStaffByStore,
    getStaffById,
    Store
} from '../../services/StaffService';
import Header from '../../components/Header'; // 1. 引入 Header
import DynamicContainer from '../../components/DynamicContainer'; // 2. 引入 DynamicContainer

interface StaffDropdownItem {
    staff_id: number;
    name: string;
}

const AddEditUserAccount: React.FC = () => {
    const navigate = useNavigate();
    // 編輯模式的邏輯保持不變，但目前主要用於新增
    const { staffId } = useParams<{ staffId: string }>();
    const isEditMode = Boolean(staffId);

    const [stores, setStores] = useState<Store[]>([]);
    const [staffList, setStaffList] = useState<StaffDropdownItem[]>([]);
    const [selectedStore, setSelectedStore] = useState('');
    const [selectedStaff, setSelectedStaff] = useState('');
    const [employeeType, setEmployeeType] = useState('');
    const [account, setAccount] = useState('');
    const [password, setPassword] = useState('');
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchStoresForDropdown()
            .then(data => setStores(data.filter(store => store.store_name !== '總店')))
            .catch(() => setError("無法載入分店列表"));
    }, []);

    useEffect(() => {
        if (selectedStore) {
            setLoading(true);
            setStaffList([]);
            if (!isEditMode) setSelectedStaff('');
            getStaffByStore(parseInt(selectedStore))
                .then(setStaffList)
                .catch(() => setError("無法載入該分店的員工列表"))
                .finally(() => setLoading(false));
        }
    }, [selectedStore, isEditMode]);

    useEffect(() => {
        if (isEditMode && staffId) {
            setLoading(true);
            getStaffById(parseInt(staffId))
                .then((staff: any) => {
                    if (staff) {
                        if (staff.store_id) setSelectedStore(String(staff.store_id));
                        setSelectedStaff(String(staff.staff_id));
                        setEmployeeType(staff.permission || '');
                        setAccount(staff.account || '');
                        setPassword(staff.password || '');
                    } else {
                        setError('找不到該員工');
                    }
                })
                .catch(() => setError('無法載入員工資料'))
                .finally(() => setLoading(false));
        }
    }, [isEditMode, staffId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStaff || !employeeType || !account || !password) {
            setError("請填寫所有欄位");
            return;
        }

        setLoading(true);
        setError(null);
        
        try {
            const payload = { account, password, permission: employeeType };
            await updateStaffAccount(parseInt(selectedStaff), payload);
            alert('帳號設定成功！');
            navigate('/backend/user-accounts');
        } catch (err: any) {
            setError(err.response?.data?.error || '操作失敗，請檢查帳號是否重複');
        } finally {
            setLoading(false);
        }
    };

    // 3. 將所有頁面內容都放進一個名為 `content` 的變數中
    const content = (
        <Container className="d-flex justify-content-center align-items-center pt-5">
            <Card style={{ width: '500px' }} className="shadow-sm">
                <Card.Header as="h5" className="text-center bg-info text-white">
                    開通員工系統帳號
                </Card.Header>
                <Card.Body className="p-4">
                    {error && <Alert variant="danger">{error}</Alert>}
                    <Form onSubmit={handleSubmit}>
                        <Form.Group as={Row} className="mb-3 align-items-center">
                            <Form.Label column sm={3}>選擇分店</Form.Label>
                            <Col sm={9}>
                              <Form.Select
                                  value={selectedStore}
                                  onChange={e => setSelectedStore(e.target.value)}
                                  required
                              >
                                  <option value="">請選擇分店...</option>
                                  {stores.map(store => (
                                      <option key={store.store_id} value={store.store_id}>{store.store_name}</option>
                                  ))}
                              </Form.Select>
                            </Col>
                        </Form.Group>

                        <Form.Group as={Row} className="mb-3 align-items-center">
                            <Form.Label column sm={3}>選擇員工</Form.Label>
                            <Col sm={9}>
                                <Form.Select
                                    value={selectedStaff}
                                    onChange={e => setSelectedStaff(e.target.value)}
                                    required
                                    disabled={!selectedStore || loading}
                                >
                                    <option value="">請選擇員工...</option>
                                    {loading && <option>載入中...</option>}
                                    {staffList.map(staff => (
                                        <option key={staff.staff_id} value={staff.staff_id}>{staff.name}</option>
                                    ))}
                                </Form.Select>
                            </Col>
                        </Form.Group>

                        <Form.Group as={Row} className="mb-3 align-items-center">
                            <Form.Label column sm={3}>權限</Form.Label>
                            <Col sm={9}>
                                <Form.Select
                                    value={employeeType}
                                    onChange={e => setEmployeeType(e.target.value)}
                                    required
                                    disabled={!selectedStaff}
                                >
                                    <option value="">請選擇權限...</option>
                                    <option value="basic">一般權限</option>
                                    <option value="admin">管理員</option>
                                    <option value="therapist">療癒師</option>
                                </Form.Select>
                            </Col>
                        </Form.Group>

                        <hr/>

                        <Form.Group as={Row} className="mb-3 align-items-center">
                            <Form.Label column sm={3}>設定帳號</Form.Label>
                            <Col sm={9}>
                                <Form.Control type="text" placeholder="設定登入帳號" value={account} onChange={e => setAccount(e.target.value)} required disabled={!selectedStaff} />
                            </Col>
                        </Form.Group>

                        <Form.Group as={Row} className="mb-3 align-items-center">
                            <Form.Label column sm={3}>設定密碼</Form.Label>
                            <Col sm={9}>
                                <Form.Control type="password" placeholder="設定登入密碼" value={password} onChange={e => setPassword(e.target.value)} required disabled={!selectedStaff} />
                            </Col>
                        </Form.Group>

                        <div className="d-flex justify-content-end gap-2 mt-4">
                            <Button variant="info" className="text-white" onClick={() => navigate(-1)} disabled={loading}>取消</Button>
                            <Button variant="info" type="submit" className="text-white" disabled={!selectedStaff || loading}>
                                {loading ? <Spinner as="span" size="sm" /> : '確認開通'}
                            </Button>
                        </div>
                    </Form>
                </Card.Body>
            </Card>
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

// 將元件名稱改回符合檔名，避免混淆
export default AddEditUserAccount;
