import React, { useState } from "react";
import { Container, Form, Button, Alert, Spinner } from "react-bootstrap";
import { forgotPassword } from "../services/LoginService";
import { useNavigate } from "react-router-dom";

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  
  const [account, setAccount] = useState("");
  const [alertMsg, setAlertMsg] = useState("");
  const [alertVariant, setAlertVariant] = useState<"success" | "danger" | "info">("info");
  const [isLoading, setIsLoading] = useState(false);
  const [validated, setValidated] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    // 表單驗證
    const form = event.currentTarget;
    if (form.checkValidity() === false) {
      event.stopPropagation();
      setValidated(true);
      return;
    }
    
    setValidated(true);
    await handleForgotPassword();
  };

  const handleForgotPassword = async () => {
    // 檢查帳號是否填寫
    if (!account) {
      setAlertMsg("請輸入帳號");
      setAlertVariant("danger");
      return;
    }

    setIsLoading(true);
    try {
      await forgotPassword(account);
      setAlertMsg("已提交重設密碼申請，請聯絡管理員協助重設");
      setAlertVariant("success");
    } catch (err: any) {
      const msg = err.response?.data?.error || "請求失敗，請稍後再試";
      setAlertMsg(msg);
      setAlertVariant("danger");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate("/");
  };

  return (
    <Container
      fluid
      className="d-flex flex-column justify-content-center align-items-center min-vh-100 bg-white"
    >
      <h2 className="text-info fw-bold mb-4">忘記密碼</h2>

      {alertMsg && (
        <Alert variant={alertVariant} className="w-100" style={{ maxWidth: 300 }}>
          {alertMsg}
        </Alert>
      )}

      <Form
        noValidate
        validated={validated}
        onSubmit={handleSubmit}
        style={{ width: "300px" }}
      >
        <Form.Group className="mb-3" controlId="formAccount">
          <Form.Label>請輸入您的帳號</Form.Label>
          <Form.Control
            type="text"
            placeholder="帳號"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            className="bg-light border-0"
            required
          />
          <Form.Control.Feedback type="invalid">
            請輸入帳號
          </Form.Control.Feedback>
        </Form.Group>

        <div className="d-grid gap-2">
          <Button
            variant="info"
            type="submit"
            className="text-white"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                處理中...
              </>
            ) : (
              "送出"
            )}
          </Button>
          <Button
            variant="outline-secondary"
            onClick={handleBackToLogin}
            disabled={isLoading}
          >
            返回登入頁
          </Button>
        </div>
      </Form>
    </Container>
  );
};

export default ForgotPassword; 