import React, { useState, useEffect } from "react";
import { Button, Container, Row, Col, Form, Table } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import IconButton from "../../components/IconButton";
import { base_url } from "../../services/BASE_URL";

interface ProductSale {
  Order_ID: number;
  MemberName: string;
  Member_ID: number;
  ProductName: string;
  ProductPrice: number;
  Quantity: number;
  TotalAmount: number;
  PurchaseDate: string;
  PaymentMethod: string;
  StaffName: string;
  SaleCategory: string;
  Note?: string;
}

const ProductSale: React.FC = () => {
    const navigate = useNavigate();
    const [keyword, setKeyword] = useState("");
    const [sales, setSales] = useState<ProductSale[]>([]);
    const [selectedSales, setSelectedSales] = useState<number[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchSales();
    }, []);

    const fetchSales = async () => {
        try {
            setLoading(true);
            console.log("開始獲取銷售記錄...");
            const response = await axios.get(`${base_url}/product-sale/list`);
            console.log("銷售記錄API響應:", response.data);
            setSales(response.data);
        } catch (error) {
            console.error("獲取產品銷售記錄失敗：", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${base_url}/product-sale/search?keyword=${keyword}`);
            setSales(response.data);
        } catch (error) {
            console.error("搜尋產品銷售記錄失敗：", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (selectedSales.length === 0) {
            alert("請先選擇要刪除的記錄！");
            return;
        }

        if (window.confirm("確定要刪除選中的記錄嗎？")) {
            try {
                setLoading(true);
                for (const id of selectedSales) {
                    await axios.delete(`${base_url}/product-sale/delete/${id}`);
                }
                alert("刪除成功！");
                setSelectedSales([]);
                fetchSales();
            } catch (error) {
                console.error("刪除產品銷售記錄失敗：", error);

                if (axios.isAxiosError(error) && error.response) {
                    const { status, data } = error.response;
                    const serverMessage = typeof data === "string" ? data : data?.error;

                    if (status === 403) {
                        const message = serverMessage === "無操作權限"
                            ? "沒有權限刪除"
                            : (serverMessage || "沒有權限刪除");
                        alert(message);
                    } else if (serverMessage) {
                        alert(serverMessage);
                    } else {
                        alert("刪除失敗，請稍後再試！");
                    }
                } else {
                    alert("刪除失敗，請稍後再試！");
                }
            } finally {
                setLoading(false);
            }
        }
    };

    const handleCheckboxChange = (saleId: number, checked: boolean) => {
        if (checked) {
            setSelectedSales([...selectedSales, saleId]);
        } else {
            setSelectedSales(selectedSales.filter(id => id !== saleId));
        }
    };

    const formatDate = (dateString: string): string => {
        if (!dateString) return '';
        
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString;
            
            return date.toLocaleDateString('zh-TW');
        } catch (error) {
            return dateString;
        }
    };

    const formatCurrency = (amount: number): string => {
        return amount.toLocaleString('zh-TW', { style: 'currency', currency: 'TWD' });
    };

    const getPaymentMethodText = (method: string): string => {
        switch (method) {
            case 'Cash': return '現金';
            case 'Credit Card': return '信用卡';
            case 'Transfer': return '轉帳';
            default: return method;
        }
    };

    return (
        <div className="d-flex flex-column min-vh-100 bg-white">
            {/* Header */}
            <header className="d-flex justify-content-between align-items-center bg-info px-4 py-3 app-header">
                <h1 className="text-white fw-bold fs-3 m-0">銷售產品 1.1.2</h1>
                <div className="d-flex gap-3">
                    <IconButton.HomeButton onClick={() => navigate('/')} />
                    <IconButton.CloseButton onClick={() => navigate(-1)} />
                </div>
            </header>

            <Col xs={12} md={9} className="ms-auto">
                {/* Search & Create */}
                <Container className="my-4">
                    <Row className="align-items-center">
                        <Col xs={12} md={6} className="mb-3 mb-md-0">
                            <Form.Control
                                type="text"
                                placeholder="搜尋：會員姓名/產品名稱/員工"
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                            />
                        </Col>
                        <Col
                            xs={12}
                            md={6}
                            className="d-flex justify-content-end gap-3"
                        >
                            <Button 
                                variant="info" 
                                className="text-white px-4"
                                onClick={handleSearch}
                                disabled={loading}
                            >
                                搜尋
                            </Button>
                            <Button 
                                onClick={() => navigate("/products/add-product")} 
                                variant="info" 
                                className="text-white px-4"
                                disabled={loading}
                            >
                                新增
                            </Button>
                        </Col>
                    </Row>
                </Container>

                {/* Table */}
                <Container>
                    <Table bordered hover responsive>
                        <thead className="text-center">
                            <tr>
                                <th>勾選</th>
                                <th>會員編號</th>
                                <th>購買人</th>
                                <th>購買日期</th>
                                <th>購買品項</th>
                                <th>數量</th>
                                <th>價錢</th>
                                <th>付款方式</th>
                                <th>銷售人員</th>
                                <th>銷售類別</th>
                                <th>備註</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={11} className="text-center py-4">
                                        載入中...
                                    </td>
                                </tr>
                            ) : sales.length === 0 ? (
                                <tr>
                                    <td colSpan={11} className="text-center text-muted py-5">
                                        尚無資料
                                    </td>
                                </tr>
                            ) : (
                                sales.map((sale) => (
                                    <tr key={sale.Order_ID}>
                                        <td className="text-center">
                                            <Form.Check
                                                type="checkbox"
                                                checked={selectedSales.includes(sale.Order_ID)}
                                                onChange={(e) => handleCheckboxChange(sale.Order_ID, e.target.checked)}
                                            />
                                        </td>
                                        <td>{sale.Member_ID}</td>
                                        <td>{sale.MemberName}</td>
                                        <td>{formatDate(sale.PurchaseDate)}</td>
                                        <td>{sale.ProductName}</td>
                                        <td>{sale.Quantity}</td>
                                        <td>{formatCurrency(sale.TotalAmount)}</td>
                                        <td>{getPaymentMethodText(sale.PaymentMethod)}</td>
                                        <td>{sale.StaffName}</td>
                                        <td>{sale.SaleCategory || '-'}</td>
                                        <td>{sale.Note || '-'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </Table>
                </Container>

                {/* Bottom buttons */}
                <Container className="my-4 ">
                    <Row className="justify-content-end g-3">
                        <Col xs="auto">
                            <Button
                                variant="info"
                                className="text-white px-4"
                                onClick={handleDelete}
                                disabled={loading || selectedSales.length === 0}
                            >
                                刪除
                            </Button>
                        </Col>
                        <Col xs="auto">
                            <Button 
                                variant="info" 
                                className="text-white px-4"
                                onClick={() => navigate("/product-sale")}
                            >
                                修改
                            </Button>
                        </Col>
                        <Col xs="auto">
                            <Button 
                                variant="info" 
                                className="text-white px-4"
                                onClick={() => fetchSales()}
                                disabled={loading}
                            >
                                確認
                            </Button>
                        </Col>
                    </Row>
                </Container>
            </Col>
        </div>
    );
};

export default ProductSale;

