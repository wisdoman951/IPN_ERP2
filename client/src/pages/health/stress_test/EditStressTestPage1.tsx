// ./src/pages/health/stress_test/EditStressTestPage1.tsx
import { Col, Button, Form, Row, Card, Spinner, Alert } from "react-bootstrap";
import Header from "../../../components/Header";
import DynamicContainer from "../../../components/DynamicContainer";
import { useStressTest } from '../../../hooks/StressTestContext';
import { getStressTestById } from "../../../services/StressTestService";
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

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

const EditStressTestPage1: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const {
        memberId, setMemberId,
        testDate, setTestDate,
        formA, setFormA, setFormB,
    } = useStressTest();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // 取得現有資料、填入 Context
    useEffect(() => {
        if (!id) return;
        setLoading(true);
        getStressTestById(Number(id))
            .then(data => {
                if (!data) {
                    setError("查無資料！");
                    return;
                }
                setMemberId(data.member_id);
                setTestDate(data.test_date ? data.test_date.slice(0,10) : "");
                // 假設你的 answers 是 { '01': 'A', ... }
                const answersA: Record<string, string> = {};
                const answersB: Record<string, string> = {};
                if (data.answers) {
                    Object.entries(data.answers).forEach(([qid, val]) => {
                        if (parseInt(qid, 10) <= 10) answersA[qid] = val;
                        else answersB[qid] = val;
                    });
                }
                setFormA(answersA);
                setFormB(answersB);
            })
            .catch((err) => setError("載入資料失敗"))
            .finally(() => setLoading(false));
    }, [id, setMemberId, setTestDate, setFormA, setFormB]);

    // 跟新增頁一樣，但資訊是 disable 的
    const content = loading ? (
        <div className="text-center py-5"><Spinner animation="border" /></div>
    ) : error ? (
        <Alert variant="danger">{error}</Alert>
    ) : (
        <div className="w-100 px-4">
            <Card className="mb-4">
                <Card.Header className="bg-light">
                    <h5 className="mb-0 text-secondary">受測者資訊</h5>
                </Card.Header>
                <Card.Body>
                    <Row className="g-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>會員ID</Form.Label>
                                <Form.Control value={memberId || ''} disabled />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>檢測日期</Form.Label>
                                <Form.Control type="date" value={testDate} disabled />
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
                                    checked={formA[q.id] === "A"} onChange={() => setFormA({ ...formA, [q.id]: "A" })} />
                                <Form.Check inline type="radio" label={`（乙）${q.textB}`} name={`q${q.id}`}
                                    checked={formA[q.id] === "B"} onChange={() => setFormA({ ...formA, [q.id]: "B" })} />
                            </Form.Group>
                        ))}
                    </Form>
                </Card.Body>
            </Card>
            <div className="d-flex justify-content-end mt-4">
                <Button variant="info" className="px-5 text-white" onClick={() => navigate(`/health-data-analysis/stress-test/edit/${id}/page2`)}>
                    下一頁
                </Button>
            </div>
        </div>
    );

    return (
        <div className="d-flex flex-column min-vh-100 bg-white">
            <Header title="編輯iPN壓力源測試 (1/2)" />
            <DynamicContainer content={content} className="p-0 align-items-start" />
        </div>
    );
};

export default EditStressTestPage1;
