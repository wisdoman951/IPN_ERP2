import React, { useState } from 'react';
import { Container, Form, Button, Row, Col, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import IconButton from "../../../components/IconButton";
import { useStressTest } from '../../../hooks/StressTestContext'; // <--- 改用新的 Hook

// 定義會員資料結構接口
interface Member {
  Member_ID: number;
  Name: string;
  Phone: string;
  Address?: string;
  Birthday?: string;
  Gender?: string;
  BloodType?: string;
  LineID?: string;
  AllergyNotes?: string;
  SpecialRequests?: string;
  PreferredTherapist?: string;
}

const SelectMember: React.FC = () => {
  console.log("SelectMember component rendered");
  const navigate = useNavigate();
  const [memberId, setMemberId] = useState('');
  const [member, setMember] = useState<Member | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleMemberIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMemberId(e.target.value);
    setMember(null);
    setError('');
  };

  const handleSearch = async () => {
    if (!memberId) {
      setError('請輸入會員編號');
      return;
    }

    try {
      setLoading(true);
      console.log('開始請求會員資料，ID:', memberId);
      
      const response = await fetch(`/api/member/${memberId}`);
      const data = await response.json();
      
      console.log('API 回傳資料:', data);
      
      if (response.ok) {
        // 現在API返回的資料格式已經正確，直接使用即可
        setMember(data);
        setError('');
      } else {
        console.error('API 返回錯誤:', data);
        setError(data.error || '找不到會員');
        setMember(null);
      }
    } catch (error) {
      console.error('請求會員資料時發生錯誤:', error);
      setError('查詢失敗，請稍後再試');
      setMember(null);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (member) {
      localStorage.setItem('selectedMemberId', member.Member_ID.toString());
      navigate('/health-data-analysis/stress-test/add/page1');
    } else {
      setError('請先查詢並確認會員資料');
    }
  };

  // 格式化日期顯示
  const formatDate = (dateString?: string) => {
    if (!dateString) return '未設定';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('zh-TW');
    } catch (e) {
      return dateString;
    }
  };
  const { handleSelectAndNext } = useStressTest(); 

    // 當使用者點擊某個會員時，直接呼叫此函式
    const handleSelectMember = (memberId: string) => {
        handleSelectAndNext(memberId);
    };
  return (
    <div className="d-flex flex-column min-vh-100 bg-white">
      {/* Header */}
      <header className="d-flex justify-content-between align-items-center bg-info px-4 py-3 app-header">
        <h1 className="text-white fw-bold fs-3 m-0">
          新增壓力測試 <span className="fs-5">1.1.1.4.1.1</span>
        </h1>
        <div className="d-flex gap-3">
          <IconButton.HomeButton onClick={() => navigate("/")}/>
          <IconButton.CloseButton onClick={() => navigate('/health-data-analysis/stress-test')}/>
        </div>
      </header>

      <Col xs={12} md={9} className="ms-auto">
        {/* 會員查詢區域 */}
        <Container className="my-4">
          <Card className="mb-4">
            <Card.Header className="bg-light">
              <h5 className="mb-0">會員查詢</h5>
            </Card.Header>
            <Card.Body>
              <Row className="align-items-end mb-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>會員編號</Form.Label>
                    <Form.Control
                      type="text"
                      value={memberId}
                      onChange={handleSelectMember(member.id)}
                      placeholder="請輸入會員編號"
                    />
                  </Form.Group>
                </Col>
                <Col md={2}>
                  <Button 
                    variant="primary" 
                    onClick={handleSearch}
                    className="w-100"
                    disabled={loading}
                  >
                    {loading ? '查詢中...' : '查詢'}
                  </Button>
                </Col>
              </Row>
              
              {error && (
                <div className="text-danger">{error}</div>
              )}
            </Card.Body>
          </Card>

          {/* 會員資料顯示區域 */}
          {member && (
            <Card>
              <Card.Header className="bg-light">
                <h5 className="mb-0">會員資料</h5>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>姓名</Form.Label>
                      <Form.Control
                        type="text"
                        value={member.Name}
                        disabled
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>電話</Form.Label>
                      <Form.Control
                        type="text"
                        value={member.Phone || '未設定'}
                        disabled
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>生日</Form.Label>
                      <Form.Control
                        type="text"
                        value={formatDate(member.Birthday)}
                        disabled
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>性別</Form.Label>
                      <Form.Control
                        type="text"
                        value={member.Gender || '未設定'}
                        disabled
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>血型</Form.Label>
                      <Form.Control
                        type="text"
                        value={member.BloodType || '未設定'}
                        disabled
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>LINE ID</Form.Label>
                      <Form.Control
                        type="text"
                        value={member.LineID || '未設定'}
                        disabled
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          )}

          {/* 底部按鈕 */}
          <div className="d-flex justify-content-between mt-4">
            <Button 
              variant="secondary" 
              onClick={() => navigate('/health-data-analysis/stress-test')}
              disabled={loading}
            >
              返回
            </Button>
            <Button 
              variant="primary" 
              onClick={handleNext}
              disabled={!member || loading}
            >
              下一步
            </Button>
          </div>
        </Container>
      </Col>
    </div>
  );
};

export default SelectMember; 