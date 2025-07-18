// IPN_ERP/client/src/pages/health/stress_test/AddStressTestPage2.tsx
import React from "react";
import { Button, Form, Card, Alert, Spinner } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../../../components/Header";
import DynamicContainer from "../../../components/DynamicContainer";
import { useStressTest } from '../../../hooks/StressTestContext';
import { updateStressTest } from "../../../services/StressTestService";
import { useState } from 'react';

// 問卷問題定義
const questions: Question[] = [
  { id: "11", textA: "我總是預期最好的事情會發生", textB: "我喜歡用有系統的方法做事情" },
  { id: "12", textA: "我喜歡想像各種事物的可能性", textB: "我喜歡做一個強勢的人" },
  { id: "13", textA: "我對與別人合作總是感到自在", textB: "我總是有一些獨立的思考" },
  { id: "14", textA: "我總是以熱誠及友善對待別人", textB: "我對自己的方向總是精力充沛" },
  { id: "15", textA: "如果我信仰某種理由 我可能會犧牲我的興趣", textB: "我喜歡以有秩序的方式做事" },
  { id: "16", textA: "我喜歡想一些新點子", textB: "我總是以充滿興奮及精力的方式做事情" },
  { id: "17", textA: "我喜歡和別人談話", textB: "我喜歡依照特定程序" },
  { id: "18", textA: "我是個謹慎的人", textB: "我喜歡完成一些事情" },
  { id: "19", textA: "我喜歡處於一種可以行動的狀況", textB: "我常常表現體貼和同情的心態" },
  { id: "20", textA: "我喜歡和陌生人交談", textB: "我喜歡在大多數的情況下發號施令" },
];
const EditStressTestPage2: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { memberId, testDate, formA, formB } = useStressTest();
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // 整合答案
    const allAnswers = { ...formA, ...formB };

    const handleSave = async () => {
        if (!id) return;
        setLoading(true);
        try {
            // 編輯時只需要更新答案即可，member_id 與 test_date 通常不會改
            await updateStressTest(Number(id), {
                member_id: memberId,
                test_date: testDate,
                answers: allAnswers
            });
            alert("修改成功！");
            navigate("/health-data-analysis/stress-test");
        } catch {
            setError("儲存失敗，請重試！");
        } finally {
            setLoading(false);
        }
    };

    const content = loading ? (
        <Spinner animation="border" />
    ) : (
        <div className="w-100 px-4">
            {error && <Alert variant="danger">{error}</Alert>}
            <Alert variant="info" className="mb-4">
                會員 ID: <strong>{memberId || '未知'}</strong> (日期: {testDate})
            </Alert>
            <Card>
                <Card.Header className="bg-info text-white">
                    <h5 className="mb-0">壓力測試問卷 (C/D)</h5>
                </Card.Header>
                <Card.Body>
                    <Form>
                        {questions.map((q, index) => (
                            <Form.Group className="mb-3" key={q.id}>
                                <span className="fw-bold">{index + 11}. </span>
                                <Form.Check inline type="radio" label={`（甲）${q.textA}`} name={`q${q.id}`}
                                    checked={formB[q.id] === "A"} onChange={() => formB && formB[q.id] !== "A" && formB && setTimeout(() => formB[q.id] = "A", 0)} />
                                <Form.Check inline type="radio" label={`（乙）${q.textB}`} name={`q${q.id}`}
                                    checked={formB[q.id] === "B"} onChange={() => formB && formB[q.id] !== "B" && formB && setTimeout(() => formB[q.id] = "B", 0)} />
                            </Form.Group>
                        ))}
                    </Form>
                </Card.Body>
            </Card>

            <div className="d-flex justify-content-between mt-4">
                <Button variant="secondary" onClick={() => navigate(`/health-data-analysis/stress-test/edit/${id}/page1`)} className="px-5">
                    上一頁
                </Button>
                <Button variant="info" className="px-5 text-white" onClick={handleSave} disabled={loading}>
                    送出
                </Button>
            </div>
        </div>
    );

    return (
        <div className="d-flex flex-column min-vh-100 bg-white">
            <Header title="編輯iPN壓力源測試 (2/2)" />
            <DynamicContainer content={content} className="p-0 align-items-start" />
        </div>
    );
};

export default EditStressTestPage2;