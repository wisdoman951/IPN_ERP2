// src/pages/therapy/TherapyPackageSelection.tsx
import React, { useState, useEffect } from 'react';
import { Container, Form, Button, ListGroup, Spinner, Alert, Row, Col, Card, InputGroup } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../../components/Header';
import DynamicContainer from '../../components/DynamicContainer';
import {
    getAllTherapyPackages as fetchAllTherapyPackagesService,
    searchTherapyPackages, // 假設您有此服務函數用於後端搜尋
    TherapyPackage as TherapyPackageBaseType,
    fetchRemainingSessions,
    fetchRemainingSessionsBulk
} from '../../services/TherapySellService';

// 與 AddTherapySell.tsx 中 SelectedTherapyPackageUIData 結構對應，但此頁面只關心基礎資訊和 userSessions
export interface PackageInSelection extends TherapyPackageBaseType {
  userSessions: string; 
}

const TherapyPackageSelection: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [allPackages, setAllPackages] = useState<TherapyPackageBaseType[]>([]);
    const [displayedPackages, setDisplayedPackages] = useState<TherapyPackageBaseType[]>([]);
    const [selectedPackagesMap, setSelectedPackagesMap] = useState<Map<number, PackageInSelection>>(new Map());
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [pageError, setPageError] = useState<string | null>(null); // 用於此頁面特定的錯誤，如堂數無效
    const [memberId, setMemberId] = useState<string>('');
    const [remainingMap, setRemainingMap] = useState<Map<number, number>>(new Map());


    useEffect(() => {
        const formStateData = localStorage.getItem('addTherapySellFormState');
        if (formStateData) {
            try {
                const formState = JSON.parse(formStateData);
                if (formState.memberId) {
                    setMemberId(formState.memberId);
                }
                // formState.selectedTherapyPackages 存的是 AddTherapySell.tsx 中的 SelectedTherapyPackageUIData[]
                // 我們只需要其中的基礎套餐資訊和 userSessions
                if (Array.isArray(formState.selectedTherapyPackages)) {
                    const initialMap = new Map<number, PackageInSelection>();
                    // formState.selectedTherapyPackages 中的每個 pkg 結構比 PackageInSelection 多一些計算欄位
                    // 但它肯定包含 PackageInSelection 需要的所有欄位
                    formState.selectedTherapyPackages.forEach((pkgFromState: any) => {
                        if (pkgFromState && pkgFromState.therapy_id !== undefined) {
                            initialMap.set(pkgFromState.therapy_id, {
                                therapy_id: pkgFromState.therapy_id,
                                TherapyCode: pkgFromState.TherapyCode,
                                TherapyName: pkgFromState.TherapyName,
                                TherapyContent: pkgFromState.TherapyContent,
                                TherapyPrice: pkgFromState.TherapyPrice,
                                userSessions: String(pkgFromState.userSessions || '1')
                            });
                        }
                    });
                    setSelectedPackagesMap(initialMap);
                }
            } catch (e) {
                console.error('解析 addTherapySellFormState (for packages in selection page) 失敗', e);
            }
        }
    }, []); // 僅在 mount 時執行一次

    const fetchPackages = async () => {
        setLoading(true); setPageError(null);
        try {
            const response = await fetchAllTherapyPackagesService();
            if (response.success && response.data) {
                setAllPackages(response.data);
                setDisplayedPackages(response.data);
            } else {
                setPageError(response.error || "無法載入療程套餐列表");
                setAllPackages([]); setDisplayedPackages([]);
            }
        } catch (err: any) { 
            setPageError(err.message || "載入療程套餐時發生嚴重錯誤");
            setAllPackages([]); setDisplayedPackages([]);
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchPackages(); }, []);

    useEffect(() => {
        const fetchRemaining = async () => {
            if (!memberId || allPackages.length === 0) {
                setRemainingMap(new Map());
                return;
            }
            try {
                const therapyIds = allPackages.map(pkg => pkg.therapy_id);
                const res = await fetchRemainingSessionsBulk(memberId, therapyIds);
                const map = new Map<number, number>();
                if (res && res.data) {
                    Object.entries(res.data).forEach(([id, remaining]) => {
                        if (remaining !== undefined) {
                            map.set(Number(id), Number(remaining as any));
                        }
                    });
                }
                setRemainingMap(map);
            } catch (e) {
                console.error('獲取剩餘堂數失敗', e);
            }
        };
        fetchRemaining();
    }, [memberId, allPackages]);

    useEffect(() => { // 前端篩選
        if (searchTerm.trim() === "") {
            setDisplayedPackages(allPackages);
        } else {
            const lowerSearchTerm = searchTerm.toLowerCase();
            setDisplayedPackages(
                allPackages.filter(pkg =>
                    (pkg.TherapyName?.toLowerCase() || '').includes(lowerSearchTerm) ||
                    (pkg.TherapyContent?.toLowerCase() || '').includes(lowerSearchTerm) ||
                    (pkg.TherapyCode?.toLowerCase() || '').includes(lowerSearchTerm)
                )
            );
        }
    }, [searchTerm, allPackages]);

    const handleTogglePackage = (pkg: TherapyPackageBaseType) => {
        setPageError(null);
        setSelectedPackagesMap(prevMap => {
            const newMap = new Map(prevMap);
            if (newMap.has(pkg.therapy_id)) {
                newMap.delete(pkg.therapy_id);
            } else {
                newMap.set(pkg.therapy_id, { ...pkg, userSessions: "1" }); // 新增時預設堂數為 "1"
            }
            return newMap;
        });
    };

    const handleSessionChange = (therapy_id: number, sessions: string) => {
        setPageError(null);
        setSelectedPackagesMap(prevMap => {
            const newMap = new Map(prevMap);
            const existingPkg = newMap.get(therapy_id);
            if (existingPkg) {
                const validSessions = sessions.trim() === "" ? "" : Math.max(1, parseInt(sessions) || 1).toString();
                newMap.set(therapy_id, { ...existingPkg, userSessions: validSessions });
            }
            return newMap;
        });
    };

    const handleConfirmSelection = () => {
        setPageError(null);
        const selectedArray: PackageInSelection[] = Array.from(selectedPackagesMap.values());
        const invalidPackage = selectedArray.find(pkg => !pkg.userSessions || Number(pkg.userSessions) <= 0);

        if (invalidPackage) {
            setPageError(`所選套餐「${invalidPackage.TherapyContent || invalidPackage.TherapyName}」的堂數（${invalidPackage.userSessions}）無效，請至少輸入1。`);
            return;
        }
        // 儲存的是 PackageInSelection[]，它已經包含了 userSessions
        localStorage.setItem('newlySelectedTherapyPackagesWithSessions', JSON.stringify(selectedArray));
        // 與產品選單一致，直接返回上一頁
        navigate(-1);
    };

    const calculatePageTotal = () => {
        let total = 0;
        selectedPackagesMap.forEach(pkg => {
            total += (pkg.TherapyPrice || 0) * (Number(pkg.userSessions) || 0);
        });
        return total;
    };

    const content = (
        <Container className="my-4">
            {pageError && <Alert variant="danger" dismissible onClose={() => setPageError(null)}>{pageError}</Alert>}
             {error && <Alert variant="warning" >{error}</Alert>} {/* API 載入錯誤 */}
            <Card>
                <Card.Header as="h5">選擇療程套餐並設定堂數</Card.Header>
                <Card.Body>
                    <Row className="mb-3 gx-2">
                        <Col>
                            <Form.Control
                                type="text"
                                placeholder="輸入療程名稱、代碼或內容進行篩選..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </Col>
                    </Row>

                    {loading && (
                        <div className="text-center p-5"><Spinner animation="border" variant="info" /> <p className="mt-2">載入中...</p></div>
                    )}
                    {!loading && displayedPackages.length === 0 && !error && (
                        <Alert variant="secondary">目前沒有符合條件的療程套餐。</Alert>
                    )}
                    {!loading && displayedPackages.length > 0 && (
                        <ListGroup variant="flush" style={{maxHeight: 'calc(100vh - 380px)', overflowY: 'auto'}}>
                            {displayedPackages.map(pkg => {
                                const currentSelection = selectedPackagesMap.get(pkg.therapy_id);
                                const isSelected = !!currentSelection;
                                return (
                                    <ListGroup.Item key={pkg.therapy_id || pkg.TherapyCode} className="py-2 px-2">
                                        <Row className="align-items-center gx-2">
                                            <Col xs={12} sm={5} md={5}>
                                                <Form.Check 
                                                    type="checkbox"
                                                    className="mb-2 mb-sm-0"
                                                    id={`pkg-select-${pkg.therapy_id}`}
                                                    label={
                                                        <div style={{fontSize:'0.9rem'}}>
                                                            <strong>{pkg.TherapyContent || pkg.TherapyName}</strong>
                                                            <div><small className="text-muted">代碼: {pkg.TherapyCode} / 單價: NT$ {pkg.TherapyPrice.toLocaleString()}</small></div>
                                                            {memberId && remainingMap.has(pkg.therapy_id) && (
                                                                <div><small className="text-success">剩餘 {remainingMap.get(pkg.therapy_id)} 堂</small></div>
                                                            )}
                                                        </div>
                                                    }
                                                    checked={isSelected}
                                                    onChange={() => handleTogglePackage(pkg)}
                                                />
                                            </Col>
                                            {isSelected && currentSelection && (
                                                <Col xs={12} sm={7} md={7} className="mt-1 mt-sm-0">
                                                    <InputGroup size="sm">
                                                        <InputGroup.Text>堂數:</InputGroup.Text>
                                                        <Form.Control
                                                            type="number"
                                                            min="1"
                                                            value={currentSelection.userSessions}
                                                            onChange={(e) => handleSessionChange(pkg.therapy_id, e.target.value)}
                                                            style={{ maxWidth: '70px', textAlign:'center' }}
                                                            onClick={(e) => e.stopPropagation()} // 避免點擊輸入框觸發 ListGroup.Item 的 onClick
                                                        />
                                                        <InputGroup.Text>
                                                            小計: NT$ {( (pkg.TherapyPrice || 0) * Number(currentSelection.userSessions || 0)).toLocaleString()}
                                                        </InputGroup.Text>
                                                    </InputGroup>
                                                </Col>
                                            )}
                                        </Row>
                                    </ListGroup.Item>
                                );
                            })}
                        </ListGroup>
                    )}
                </Card.Body>
                { !loading && (
                    <Card.Footer>
                         <div className="d-flex justify-content-between align-items-center">
                            <div>總計金額: <strong className="h5 mb-0" style={{color: '#00b1c8'}}>NT$ {calculatePageTotal().toLocaleString()}</strong></div>
                            <div>
                                <Button variant="outline-secondary" type="button" onClick={() => navigate(-1)} className="me-2">
                                    取消
                                </Button>
                                <Button variant="primary" type="button" onClick={handleConfirmSelection} disabled={selectedPackagesMap.size === 0}>
                                    確認選取 ({selectedPackagesMap.size} 項)
                                </Button>
                            </div>
                        </div>
                    </Card.Footer>
                )}
            </Card>
        </Container>
    );

    return (
        <>
            <Header />
            <DynamicContainer content={content} className="p-0" />
        </>
    );
};

export default TherapyPackageSelection;