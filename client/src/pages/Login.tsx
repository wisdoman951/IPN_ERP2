import React, { useState, useEffect } from "react";
import { Container, Form, Button, Alert, Spinner } from "react-bootstrap";
import { login } from "../services/LoginService";
import { useNavigate } from "react-router-dom";
import { isLoggedIn } from "../services/AuthUtils";

const Login: React.FC = () => {
  const navigate = useNavigate();
  
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [alertMsg, setAlertMsg] = useState("");
  const [alertVariant, setAlertVariant] = useState<"success" | "danger">("success");
  const [isLoading, setIsLoading] = useState(false);
  const [validated, setValidated] = useState(false);

  // 如果用戶已登入，直接跳轉到首頁
  useEffect(() => {
    if (isLoggedIn()) {
      navigate("/home");
    }
  }, [navigate]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>, storeType: "總店" | "分店") => {
    event.preventDefault();
    
    // 表單驗證
    const form = event.currentTarget;
    if (form.checkValidity() === false) {
      event.stopPropagation();
      setValidated(true);
      return;
    }
    
    setValidated(true);
    await handleLogin(storeType);
  };

  const handleLogin = async (storeType: "總店" | "分店") => {
    // 檢查帳號密碼是否填寫
    if (!account || !password) {
      setAlertMsg("請輸入帳號與密碼");
      setAlertVariant("danger");
      return;
    }

    setIsLoading(true);
    try {
      console.log(`開始登入: ${account} (${storeType})`);
      const result = await login(account, password);

      // 檢查店鋪類型是否符合登入類型
      if (result.store_level !== storeType) {
        setAlertMsg(`此帳號不屬於${storeType}`);
        setAlertVariant("danger");
        // 清除登入信息
        localStorage.removeItem('token');
        localStorage.removeItem('store_id');
        localStorage.removeItem('store_level');
        localStorage.removeItem('store_name');
        setIsLoading(false);
        return;
      }

      setAlertMsg("登入成功！");
      setAlertVariant("success");

      // 導向home
      navigate("/home");

    } catch (err: any) {
      // 處理錯誤訊息
      let errorMessage = "登入失敗，請稍後再試";
      
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      }
      
      console.error("登入失敗:", errorMessage);
      setAlertMsg(errorMessage);
      setAlertVariant("danger");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    // 導向忘記密碼頁面
    navigate("/forgot-password");
  };

  return (
    <Container
      fluid
      className="d-flex flex-column justify-content-center align-items-center min-vh-100 bg-white"
    >
      <h2 className="text-info fw-bold mb-4">全崴國際管理系統</h2>

      {alertMsg && (
        <Alert 
          variant={alertVariant} 
          className="w-100" 
          style={{ maxWidth: 300 }}
          dismissible
          onClose={() => setAlertMsg("")}
        >
          {alertMsg}
        </Alert>
      )}


      <Form 
        noValidate 
        validated={validated} 
        onSubmit={(e) => handleSubmit(e, "分店")} 
        style={{ width: "300px" }}
      >
        <Form.Group className="mb-3" controlId="formAccount">
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

        <Form.Group className="mb-4" controlId="formPassword">
          <Form.Control
            type="password"
            placeholder="密碼"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-light border-0"
            required
          />
          <Form.Control.Feedback type="invalid">
            請輸入密碼
          </Form.Control.Feedback>
        </Form.Group>

        <div className="d-grid gap-2">
          <Button
            variant="info"
            size="lg"
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
                登入中...
              </>
            ) : (
              "分店登入"
            )}
          </Button>
          <Button
            variant="info"
            size="lg"
            className="text-white"
            onClick={() => handleLogin("總店")}
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
                登入中...
              </>
            ) : (
              "總部登入"
            )}
          </Button>
          <Button 
            variant="info" 
            size="sm" 
            className="text-white"
            onClick={handleForgotPassword}
            disabled={isLoading}
          >
            忘記密碼（總部使用）
          </Button>
          <Button
            variant="info"
            size="lg"
            className="text-white"
            onClick={() => {}}
            disabled={isLoading}
          >
            療癒師登入
          </Button>
        </div>
      </Form>
    </Container>
  );
};

export default Login;
