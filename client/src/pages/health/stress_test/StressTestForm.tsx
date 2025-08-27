// client\src\pages\health\stress_test\StressTestForm.tsx
import React, { useState, useEffect } from "react";
import { Button, Col, Form, Row, Card, Alert } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../../../components/Header";
import DynamicContainer from "../../../components/DynamicContainer";
import { getMemberByCode } from '../../../services/MemberService';
import { getStressTestByIdWithAnswers, addStressTestWithAnswers, updateStressTestWithAnswers } from '../../../services/StressTestService';

// 問卷題目（1-20題）
const questions = [
  // A/B
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
  // C/D
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

const StressTestForm: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>(); // id 有值就是編輯，沒值就是新增
    const isEditMode = !!id;
    const [memberCode, setMemberCode] = useState("");
    const [memberId, setMemberId] = useState("");
    const [memberName, setMemberName] = useState("");
    const [testDate, setTestDate] = useState("");
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
  
    // 編輯模式：自動帶入舊資料
    useEffect(() => {
      if (isEditMode && id) {
        setLoading(true);
        getStressTestByIdWithAnswers(id)
          .then((data) => {
            const fetchedMemberId = data.member_id?.toString() || "";
            const fetchedMemberCode = data.member_code?.toString() || "";
            setMemberId(fetchedMemberId);
            setMemberCode(fetchedMemberCode);
            setMemberName(data.name || "");
            setTestDate((typeof data.test_date === "string" && data.test_date.length >= 10)
                ? data.test_date.slice(0, 10)
                : "");
            setAnswers(data.answers || {});
            if (fetchedMemberId) {
              return getMemberById(fetchedMemberId);
            }
            return null;
          })
          .then((member) => {
            if (member) setMemberName(member.Name);
          })
          .catch(() => setError("載入失敗"))
          .finally(() => setLoading(false));
      }
    }, [isEditMode, id]);

    // 根據會員代碼自動取得會員資訊
    useEffect(() => {
      if (!memberCode) {
        setMemberName("");
        setMemberId("");
        return;
      }
      getMemberByCode(memberCode)
        .then(member => {
          setMemberName(member?.Name || "");
          setMemberId(member?.Member_ID || "");
        })
        .catch(() => {
          setMemberName("");
          setMemberId("");
        });
    }, [memberCode]);
  
    // 填答
    const handleAnswerChange = (qid: string, val: string) => {
      setAnswers((prev) => ({ ...prev, [qid]: val }));
    };
  
    // 送出
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError("");
      try {
        if (!memberId || !testDate) {
          setError("請輸入會員編號並填寫檢測日期！");
          setLoading(false);
          return;
        }
        if (isEditMode && id) {
          await updateStressTestWithAnswers(id, memberId, testDate, answers);
          alert("修改成功！");
        } else {
          await addStressTestWithAnswers(memberId, testDate, answers);
          alert("新增成功！");
        }
        navigate("/health-data-analysis/stress-test");
      } catch (e: any) {
        setError(e?.message || "送出失敗");
      } finally {
        setLoading(false);
      }
    };
  
    // 這裡就是你的表單畫面（不用分頁，全部一起）
    return (
      <div className="d-flex flex-column min-vh-100 bg-white">
        <Header />
        <DynamicContainer
          content={
            <div className="w-100 px-4">
              {error && <Alert variant="danger">{error}</Alert>}
              <Card className="mb-4">
                <Card.Header className="bg-light">
                  <h5 className="mb-0 text-secondary">受測者資訊</h5>
                </Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>會員編號</Form.Label>
                        <Form.Control
                          type="text"
                          value={memberCode}
                          onChange={e => setMemberCode(e.target.value)}
                          disabled={isEditMode}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>姓名</Form.Label>
                        <Form.Control type="text" value={memberName} disabled />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>檢測日期</Form.Label>
                        <Form.Control
                          type="date"
                          value={testDate}
                          onChange={e => setTestDate(e.target.value)}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
  
              <Form onSubmit={handleSubmit}>
                <Card>
                  <Card.Header className="bg-info text-white">
                    <h5 className="mb-0">壓力測試問卷</h5>
                  </Card.Header>
                  <Card.Body>
                    {questions.map((q, idx) => (
                      <Form.Group className="mb-3" key={q.id}>
                        <span className="fw-bold">{idx + 1}. </span>
                        <Form.Check
                          inline
                          type="radio"
                          label={`（甲）${q.textA}`}
                          name={`q${q.id}`}
                          checked={answers[q.id] === "A"}
                          onChange={() => handleAnswerChange(q.id, "A")}
                        />
                        <Form.Check
                          inline
                          type="radio"
                          label={`（乙）${q.textB}`}
                          name={`q${q.id}`}
                          checked={answers[q.id] === "B"}
                          onChange={() => handleAnswerChange(q.id, "B")}
                        />
                      </Form.Group>
                    ))}
                  </Card.Body>
                </Card>
                <div className="d-flex justify-content-end mt-4">
                  <Button type="submit" variant="info" className="px-5 text-white" disabled={loading}>
                    {isEditMode ? "修改" : "送出"}
                  </Button>
                </div>
              </Form>
            </div>
          }
          className="p-0 align-items-start"
        />
      </div>
    );
  };
  
  export default StressTestForm;