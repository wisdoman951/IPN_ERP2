// .\src\pages\health\pure_medical_record\AddPureMedicalRecord.tsx
import React, { useState, useEffect } from "react";
import { Button, Col, Container, Form, Row, Spinner, Alert, Card } from "react-bootstrap"; // 新增 Card
import { useNavigate } from "react-router-dom";
import Header from "../../../components/Header";
import DynamicContainer from "../../../components/DynamicContainer";
import MemberColumn from "../../../components/MemberColumn";
import { addPureRecord } from "../../../services/PureMedicalRecordService";
import { getAllStaff } from "../../../services/TherapySellService"; // searchMemberById 已被 MemberColumn 內部處理
import { calculateBMI, getTodayDateString } from "../../../utils/pureMedicalUtils";

// 更新 interface 以匹配新的欄位名稱
interface PureMedicalFormRow {
  姓名: string;
  會員ID: string;
  血壓: string;
  日期: string;
  // 身高: string; // <--- 1) 刪除 身高
  體重: string;
  體脂肪: string; // <--- 2) 不是內脂肪，是 “體脂肪”
  基礎代謝: string;
  體年: string; // Figma 中是 "體年"，這裡保持一致
  BMI: string;
  淨化項目: string;
  服務人: string;   // <--- 3) “服務人員” 修改為 “服務人”
  備註欄: string;
  [key: string]: string;
}

interface Staff {
  Staff_ID: number;
  Staff_Name: string;
  Name?: string; // 有些 API 可能返回 Name
}

interface MemberData { // MemberColumn 會返回這個結構
  member_id: number;
  name: string;
}

const AddPureMedicalRecord: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staffList, setStaffList] = useState<Staff[]>([]);

  const initialFormData: PureMedicalFormRow = {
    姓名: "",
    會員ID: "",
    血壓: "",
    日期: getTodayDateString(),
    體重: "", 
    內脂肪: "", // 初始化
    體脂肪: "",
    基礎代謝: "",
    體年: "",
    BMI: "",
    淨化項目: "",
    服務人: "",
    備註欄: ""
   };

  const [formData, setFormData] = useState<PureMedicalFormRow>(() => {
    const savedData = localStorage.getItem("pureMedicalFormData");
    // 如果有儲存的資料，要確保它的欄位與 initialFormData 一致，避免舊的 "身高" 或 "內脂肪" 欄位干擾
    if (savedData) {
        try {
            const parsed = JSON.parse(savedData);
            // 只取我們定義在 initialFormData 中的欄位
            const validatedSavedData: Partial<PureMedicalFormRow> = {};
            Object.keys(initialFormData).forEach(key => {
                if (parsed.hasOwnProperty(key)) {
                    validatedSavedData[key as keyof PureMedicalFormRow] = parsed[key];
                } else if (key === '日期' && !parsed.hasOwnProperty(key)) { // 確保日期有預設值
                     validatedSavedData[key as keyof PureMedicalFormRow] = getTodayDateString();
                }
            });
            // 如果舊資料有 "內脂肪"，可以考慮轉移到 "體脂肪" (如果邏輯允許)
            // if (parsed.hasOwnProperty("內脂肪") && !parsed.hasOwnProperty("體脂肪")) {
            //   validatedSavedData["體脂肪"] = parsed["內脂肪"];
            // }
            return { ...initialFormData, ...validatedSavedData };
        } catch (e) {
            console.error("Error parsing saved form data:", e);
            return initialFormData;
        }
    }
    return initialFormData;
  });

  useEffect(() => {
    const fetchStaffList = async () => {
      try {
        const response = await getAllStaff();
        if (response.success && response.data) {
          setStaffList(response.data);
        }
      } catch (err) {
        console.error("獲取員工列表失敗:", err);
      }
    };
    fetchStaffList();
  }, []);

  useEffect(() => {
    localStorage.setItem("pureMedicalFormData", JSON.stringify(formData));
  }, [formData]);

  // 自動計算BMI - 現在不依賴身高，如果沒有身高，BMI 邏輯需要調整或移除
  // 由於 Figma 中仍有 BMI 欄位，但沒有身高，這裡的 BMI 計算會失效
  // 我將保留 BMI 欄位，但其計算邏輯會因為缺少身高而無法運作
  // 您需要決定 BMI 如何產生，或者是否移除 BMI 欄位
  useEffect(() => {
    // const height = parseFloat(formData.身高 || "0"); // 身高已移除
    const weight = parseFloat(formData.體重 || "0");

    // if (height > 0 && weight > 0) { // 無法計算 BMI 若沒有身高
    //   const bmi = calculateBMI(height, weight);
    //   setFormData(prev => ({ ...prev, BMI: bmi }));
    // } else {
    //   setFormData(prev => ({ ...prev, BMI: "" })); // 如果無法計算，清空BMI
    // }
    // 暫時將 BMI 欄位改為手動輸入或留空，因為沒有身高無法自動計算
    // 如果 BMI 是從其他設備讀取，則應改為手動輸入欄位
  }, [formData.體重]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleMemberChange = (memberId: string, name: string) => {
   setFormData(prev => ({ ...prev, 會員ID: memberId, 姓名: name }));
    if(error) setError(null);
   };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  useEffect(() => {
    if (error && error.includes("會員") && formData.會員ID) {
      setError(null);
    }
  }, [formData.會員ID, error]);

  const convertFormDataToApiData = () => {
    const selectedStaff = staffList.find(staff =>
      staff.Staff_Name === formData.服務人 || staff.Name === formData.服務人
    );

    return {
      member_id: formData.會員ID,
      staff_id: selectedStaff?.Staff_ID.toString(),
      blood_preasure: formData.血壓 || undefined,
      visceral_fat: formData.內脂肪 || undefined,
      body_fat_percentage: formData.體脂肪 || undefined,
      basal_metabolic_rate: formData.基礎代謝 || undefined,
      body_age: formData.體年 || undefined,
      weight: formData.體重 || undefined,
      bmi: formData.BMI || undefined,
      pure_item: formData.淨化項目 || undefined,
      note: formData.備註欄 || "",
      date: formData.日期 || getTodayDateString()
    };
  };

  // "確認" 按鈕的功能 - 即儲存
  const handleConfirmSubmit = async () => {
    if (!formData.姓名 || !formData.會員ID) {
      setError("姓名和會員ID為必填欄位");
      // 自動滾動到 MemberColumn 附近或頂部
      const memberColumnElement = document.getElementById("member-column-section"); // 假設 MemberColumn 有 id
      if (memberColumnElement) {
        memberColumnElement.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }
    setError(null); // 清除舊錯誤

    setLoading(true);
    try {
      const apiData = convertFormDataToApiData();
      await addPureRecord(apiData);
      localStorage.removeItem("pureMedicalFormData");
      alert("資料已成功儲存");
      navigate("/health-data-analysis/pure-medical-record");
    } catch (err) {
      console.error("提交淨化健康紀錄時出錯:", err);
      setError(err instanceof Error ? err.message : "提交資料時發生錯誤");
    } finally {
      setLoading(false);
    }
  };

  // "刪除" 按鈕的功能 - 清空表單
  const handleDeleteForm = () => {
    if(window.confirm("您確定要清空目前表單的所有資料嗎？")){
        setFormData(initialFormData); // 重置為初始空表單
        localStorage.removeItem("pureMedicalFormData"); // 同時清除 localStorage
        setError(null); // 清除錯誤訊息
        // 使 MemberColumn 也清空
        const memberColumnInstance = document.getElementById("member-column-internal-reset"); // 假設 MemberColumn 內部有一個可觸發重置的機制或按鈕
        if (memberColumnInstance) {
            // 這裡需要 MemberColumn 內部提供一個重置方法或依賴外部狀態清空
            // 或者，直接操作 MemberColumn 的輸入框 (不推薦)
            // 最好的方式是 MemberColumn 能接收一個重置信號或空的 memberId/name
        }
        // 簡易做法：直接清空 formData 中的姓名和會員ID，MemberColumn 會響應
        setFormData(prev => ({...initialFormData, 姓名: "", 會員ID: ""}));

    }
  };

  // "報表匯出" 按鈕的功能 - 暫時未定義，可根據需求實現
  const handleExportCurrentData = () => {
    // 實際功能：可能將當前 formData 轉換為特定格式 (如CSV, PDF) 並下載
    // 或將其發送到後端進行報表生成
    alert("報表匯出功能尚待實現。\n當前資料：\n" + JSON.stringify(formData, null, 2));
  };
  
  const handleTodayDate = () => {
    setFormData(prev => ({ ...prev, 日期: getTodayDateString() }));
  };

  const renderContent = () => (
    <Container> {/* 新增外層 Container 以便更好地控制整體佈局和間距 */}
      <Form className="w-100 py-3"> {/* 增加一些垂直間距 */}
        {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}
        
        <div id="member-column-section"> {/* 給 MemberColumn 一個 ID 以便滾動定位 */}
            <MemberColumn
                memberId={formData.會員ID}
                name={formData.姓名}
                onMemberChange={handleMemberChange}
                onError={handleError}
            />
        </div>
        
        <Row className="g-3"> {/* 使用 g-3 增加欄位間的 gutter */}
          <Col md={6} lg={4}> {/* 調整 Col 佈局以符合 Figma */}
            <Form.Group>
              <Form.Label>血壓</Form.Label>
              <Form.Control type="text" name="血壓" value={formData.血壓} onChange={handleInputChange} />
            </Form.Group>
          </Col>
          <Col md={6} lg={4}>
            <Form.Group>
              <Form.Label>日期</Form.Label>
              <div className="d-flex">
                <Form.Control type="date" name="日期" value={formData.日期} onChange={handleInputChange} className="me-2"/>
                <Button variant="outline-info" size="sm" onClick={handleTodayDate} title="今天日期">今天</Button>
              </div>
            </Form.Group>
          </Col>
          {/* 身高欄位已根據需求移除 */}
          {/* <Col md={6} lg={4}>
            <Form.Group>
              <Form.Label>身高</Form.Label>
              <Form.Control type="text" name="身高" value={formData.身高} onChange={handleInputChange}/>
            </Form.Group>
          </Col> */}
          <Col md={6} lg={4}>
            <Form.Group>
              <Form.Label>體重</Form.Label>
              <Form.Control type="text" name="體重" value={formData.體重} onChange={handleInputChange}/>
            </Form.Group>
          </Col>
          <Col md={6} lg={4}>
            <Form.Group>
              <Form.Label>體脂肪</Form.Label> {/* <--- 2) 修改標籤 */}
              <Form.Control type="text" name="體脂肪" value={formData.體脂肪} onChange={handleInputChange}/>
            </Form.Group>
          </Col>
          <Col md={6} lg={4}>
            <Form.Group>
              <Form.Label>內脂肪</Form.Label>
              <Form.Control type="text" name="內脂肪" value={formData.內脂肪} onChange={handleInputChange}/>
            </Form.Group>
          </Col>
          <Col md={6} lg={4}>
            <Form.Group>
              <Form.Label>基礎代謝</Form.Label>
              <Form.Control type="text" name="基礎代謝" value={formData.基礎代謝} onChange={handleInputChange}/>
            </Form.Group>
          </Col>
          <Col md={6} lg={4}>
            <Form.Group>
              <Form.Label>體年</Form.Label>
              <Form.Control type="text" name="體年" value={formData.體年} onChange={handleInputChange}/>
            </Form.Group>
          </Col>
          <Col md={6} lg={4}>
            <Form.Group>
              <Form.Label>BMI</Form.Label>
              <Form.Control type="text" name="BMI" value={formData.BMI} onChange={handleInputChange} 
                // disabled // 因為沒有身高，BMI 可能需要手動輸入或從外部獲取，所以不應 disabled
                placeholder="請輸入BMI或由設備讀取"
              />
            </Form.Group>
          </Col>
          <Col md={6} lg={4}>
            <Form.Group>
              <Form.Label>淨化項目</Form.Label>
              <Form.Control type="text" name="淨化項目" value={formData.淨化項目} onChange={handleInputChange}/>
            </Form.Group>
          </Col>
          <Col md={6} lg={4}>
            <Form.Group>
              <Form.Label>服務人</Form.Label> {/* <--- 3) 修改標籤 */}
              <Form.Select name="服務人" value={formData.服務人} onChange={handleInputChange} >
                <option value="">請選擇服務人</option>
                {staffList.map(staff => (
                  <option key={staff.Staff_ID} value={staff.Staff_Name || staff.Name || ""}>
                    {staff.Staff_Name || staff.Name || ""}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={12}> {/* 備註欄佔滿一行 */}
            <Form.Group>
              <Form.Label>備註欄</Form.Label>
              <Form.Control as="textarea" rows={3} name="備註欄" value={formData.備註欄} onChange={handleInputChange}/>
            </Form.Group>
          </Col>
        </Row>

        {/* 4) 新增提示文字區域 */}
        <Card className="mt-4 mb-3 bg-light border-0"> {/* 使用 Card 並調整樣式 */}
            <Card.Body className="p-3" style={{fontSize: '0.85rem', color: '#555'}}>
                <p className="mb-1"><strong>體脂肪率正常值：</strong></p>
                <ul className="list-unstyled mb-2 ps-3">
                    <li>男性：30歲以下 14-20%</li>
                    <li>男性：30歲以上 17-23% （以上肥胖）</li>
                    <li>女性：30歲以下 17-24%</li>
                    <li>女性：30歲以上 20-27% （以上肥胖）</li>
                </ul>
                <p className="mb-1"><strong>內臟脂肪正常值：</strong> 3-5</p>
                <p className="mb-0"><strong>基礎代謝：</strong> 男性 1500-1700 kcal； 女性 1200-1400 kcal</p>
            </Card.Body>
        </Card>
        
        {/* 5) 修改下方按鈕 */}
        <div className="d-flex justify-content-end gap-3 mt-4"> {/* Figma 中按鈕靠右 */}
            <Button
                variant="info"
                className="text-white"
                onClick={handleExportCurrentData}
                disabled={loading}
            >
                報表匯出
            </Button>
            <Button
                variant="info"
                className="text-white"
                onClick={handleDeleteForm}
                disabled={loading}
            >
                刪除
            </Button>
            <Button
                variant="info"
                className="text-white"
                onClick={handleConfirmSubmit}
                disabled={loading}
            >
                {loading ? <Spinner animation="border" size="sm" /> : "確認"}
            </Button>
        </div>
      </Form>
    </Container>
  );

  return (
    <>
      <Header title="新增 iPN淨化健康紀錄表 1.1.1.4.2.1" />
      <DynamicContainer
        content={renderContent()}
        className="p-0" // DynamicContainer 的 padding 已由內層 Container 控制
      />
    </>
  );
};

export default AddPureMedicalRecord;