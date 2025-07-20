// IPN_ERP/client/src/pages/health/stress_test/AddStressTestPage1.tsx (流程B 修正版)
import { Col, Button, Form, Row, Card } from "react-bootstrap";
import Header from "../../../components/Header";
import DynamicContainer from "../../../components/DynamicContainer";
import { useStressTest } from '../../../hooks/StressTestContext';
import { getAllMembers, Member } from '../../../services/MemberService'; // 引入 MemberService
import React, { useState, useEffect } from "react";

const questions = [
    { id: "01", textA: "我對我的行動是果斷而且堅定不移", textB: "我在防衛我的動機時，總會表現極度的熱誠" },
    { id: "02", textA: "我喜歡非常和諧的狀況", textB: "我喜歡和新朋友見面" },
    { id: "03", textA: "我喜歡計畫一些未來的事情", textB: "我喜歡根據程序做事情" },
    { id: "04", textA: "我是個有創造性的人", textB: "我是個富進取心的人" },
    { id: "05", textA: "我很喜歡友善地對待其他人", textB: "我很喜歡依照細節及規格做事情" },
    { id: "06", textA: "我總是想尋找一些例外的事情", textB: "我很喜歡想一些替代方案" },
    { id: "07", textA: "我喜歡有人被我指導", textB: "我喜歡檢查一些事情以求精確" },
    { id: "08", textA: "我喜歡以新的方式看待一些事情", textB: "我喜歡待在一群人所組成的團體中" },
    { id: "09", textA: "我把自己看成一個有創意的人", textB: "我在工作上總是力求控制和秩序感" },
    { id: "10", textA: "我喜歡做一些我感覺到正確的事情", textB: "我喜歡做一些體力勞動的事情" },
];

const AddStressTestPage1: React.FC = () => {
    const { memberId, setMemberId, testDate, setTestDate, formA, handleInputChange, handleNextPage } = useStressTest();
    const [members, setMembers] = useState<Member[]>([]); // 新增 state 來存放會員列表
    const [loading, setLoading] = useState(true); // 新增 loading 狀態

    // 在元件載入時，獲取所有會員列表
    useEffect(() => {
        const fetchMembers = async () => {
            try {
                const memberList = await getAllMembers();
                setMembers(memberList);
            } catch (error) {
                console.error("獲取會員列表失敗:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchMembers();
    }, []);

    const content = (
        <div className="w-100 px-4">
            <Card className="mb-4">
                <Card.Header className="bg-light">
                    <h5 className="mb-0 text-secondary">受測者資訊</h5>
                </Card.Header>
                <Card.Body>
                    <Row className="g-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>選擇會員</Form.Label>
                                <Form.Select
                                    value={memberId || ''}
                                    onChange={(e) => setMemberId(e.target.value)}
                                    disabled={loading}
                                >
                                    <option value="" disabled>{loading ? '載入中...' : '請選擇一位會員'}</option>
                                    {members.map(member => (
                                        <option key={member.Member_ID} value={member.Member_ID}>
                                            {member.Name} (ID: {member.Member_ID})
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>檢測日期</Form.Label>
                                <Form.Control
                                    type="date"
                                    value={testDate}
                                    onChange={(e) => setTestDate(e.target.value)}
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            <Card id="questionnaire">
                <Card.Header className="bg-info text-white">
                    <h5 className="mb-0">壓力測試問卷 (A/B)</h5>
                </Card.Header>
                <Card.Body>
                    <Form>
                        {questions.map((q, index) => (
                            <Form.Group className="mb-3" key={q.id}>
                                <span className="fw-bold">{index + 1}. </span>
                                <Form.Check inline type="radio" label={`（甲）${q.textA}`} name={`q${q.id}`}
                                    checked={formA[q.id] === "A"} onChange={() => handleInputChange('A', q.id, "A")} />
                                <Form.Check inline type="radio" label={`（乙）${q.textB}`} name={`q${q.id}`}
                                    checked={formA[q.id] === "B"} onChange={() => handleInputChange('A', q.id, "B")} />
                            </Form.Group>
                        ))}
                    </Form>
                </Card.Body>
            </Card>

            <div className="d-flex justify-content-end mt-4">
                <Button variant="info" className="px-5 text-white" onClick={handleNextPage}>
                    下一頁
                </Button>
            </div>
        </div>
    );

    return (
        <div className="d-flex flex-column min-vh-100 bg-white">
            <Header />
            <DynamicContainer content={content} className="p-0 align-items-start" />
        </div>
    );
};

export default AddStressTestPage1;