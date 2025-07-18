import { useState, useEffect } from "react";
import { Button, Form, Row, Col, Alert } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import IconButton from "../../components/IconButton";
import { base_url } from "../../services/BASE_URL";

interface Product {
    Product_ID: number;
    ProductName: string;
    ProductCode: string;
    ProductPrice: number;
    ProductCategory: string;
    StockQuantity: number;
}

const AddProductSale = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [products, setProducts] = useState<Product[]>([]);

    const [form, setForm] = useState({
        store: "",
        memberName: "",
        productId: "",
        memberId: "",
        staffId: "",
        purchaseDate: new Date().toISOString().split("T")[0],
        quantity: "1",
        paymentMethod: "Cash",
        transferCode: "",
        cardNumber: "",
        saleCategory: "原價",
        note: "",
        discount: "0"
    });

    const calculatePrice = (): number => {
        if (!form.productId) return 0;
        const selectedProduct = products.find(product => product.Product_ID === parseInt(form.productId));
        if (!selectedProduct) return 0;
        const quantity = parseInt(form.quantity) || 0;
        return selectedProduct.ProductPrice * quantity;
    };

    const calculateActual = (): number => {
        const total = calculatePrice();
        const discount = parseFloat(form.discount) || 0;
        return Math.max(total - discount, 0);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setForm({ ...form, [name]: value });
    };

    const handleSubmit = async () => {
        if (!form.store || !form.productId || !form.memberId || !form.staffId || !form.purchaseDate || !form.quantity) {
            setErrorMessage("請填寫所有必填欄位");
            return;
        }

        const saleData = {
            productId: parseInt(form.productId),
            memberId: parseInt(form.memberId),
            staffId: parseInt(form.staffId),
            purchaseDate: form.purchaseDate,
            paymentMethod: form.paymentMethod,
            transferCode: form.transferCode,
            cardNumber: form.cardNumber,
            saleCategory: form.saleCategory,
            quantity: parseInt(form.quantity),
            note: form.note,
            discount: parseFloat(form.discount),
            store: form.store,
            memberName: form.memberName
        };

        try {
            setLoading(true);
            setErrorMessage("");
            const response = await axios.post(`${base_url}/product-sale/add`, saleData);
            setSubmitSuccess(true);
            setForm({
                store: "",
                memberName: "",
                productId: "",
                memberId: "",
                staffId: "",
                purchaseDate: new Date().toISOString().split("T")[0],
                quantity: "1",
                paymentMethod: "Cash",
                transferCode: "",
                cardNumber: "",
                saleCategory: "原價",
                note: "",
                discount: "0"
            });
            setTimeout(() => navigate("/products"), 2000);
        } catch (error) {
            setErrorMessage("新增產品銷售失敗，請稍後再試");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const response = await axios.get(`${base_url}/product-sale/products`);
            setProducts(response.data);
        } catch (error) {
            setErrorMessage("獲取產品列表失敗，請重試");
        }
    };

    const formatCurrency = (amount: number): string => {
        return amount.toLocaleString('zh-TW', { style: 'currency', currency: 'TWD' });
    };

    return (
        <div className="d-flex flex-column min-vh-100 bg-white">
            <header className="d-flex justify-content-between align-items-center bg-info px-4 py-3 app-header">
                <h1 className="text-white fw-bold fs-3 m-0">新增銷售產品 1.1.2.1</h1>
                <div className="d-flex gap-3">
                    <IconButton.HomeButton onClick={() => navigate("/")} />
                    <IconButton.CloseButton onClick={() => navigate(-1)} />
                </div>
            </header>
            <Col xs={12} md={10} className="p-5 ms-auto">
                {submitSuccess && <Alert variant="success">產品銷售紀錄新增成功！將在2秒內返回產品銷售列表。</Alert>}
                {errorMessage && <Alert variant="danger">{errorMessage}</Alert>}
                <Form>
                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>店別 *</Form.Label>
                                <Form.Select name="store" value={form.store} onChange={handleChange} required>
                                    
                                    <option value="A">A 店</option>
                                    <option value="B">B 店</option>
                                </Form.Select>
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>購買人姓名</Form.Label>
                                <Form.Control name="memberName" value={form.memberName} onChange={handleChange} />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>購買品項 *</Form.Label>
                                <Form.Select name="productId" value={form.productId} onChange={handleChange} required>
                                    <option value="">可複選</option>
                                    {products.map(p => (
                                        <option key={p.Product_ID} value={p.Product_ID}>{p.ProductName}</option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>付款方式 *</Form.Label>
                                <Form.Select name="paymentMethod" value={form.paymentMethod} onChange={handleChange} required>
                                    <option value="Cash">現金</option>
                                    <option value="Transfer">轉帳</option>
                                    <option value="Credit Card">刷卡</option>
                                    <option value="Credit Card">行動支付</option>
                                </Form.Select>
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>銷售類別</Form.Label>
                                <Form.Select name="saleCategory" value={form.saleCategory} onChange={handleChange}>
                                    <option value="原價">原價</option>
                                    <option value="贈品">贈品</option>
                                    <option value="折扣">折扣</option>
                                    <option value="預購">預購</option>
                                    <option value="暫借">暫借</option>
                                </Form.Select>
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>總價</Form.Label>
                                <Form.Control readOnly value={formatCurrency(calculatePrice())} />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>會員編號 *</Form.Label>
                                <Form.Control name="memberId" value={form.memberId} onChange={handleChange} required />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>購買日期 *</Form.Label>
                                <Form.Control type="date" name="purchaseDate" value={form.purchaseDate} onChange={handleChange} required />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>價錢</Form.Label>
                                
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>銷售人員 *</Form.Label>
                                <Form.Control name="staffId" value={form.staffId} onChange={handleChange} required />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>備註</Form.Label>
                                <Form.Control name="note" value={form.note} onChange={handleChange} />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>折價</Form.Label>
                                <Form.Control name="discount" value={form.discount} onChange={handleChange} />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>應收</Form.Label>
                                <Form.Control readOnly value={formatCurrency(calculateActual())} />
                            </Form.Group>
                        </Col>
                    </Row>
                    <div className="d-flex gap-3 mt-4">
    <Button className="text-white bg-info border-0" onClick={handleSubmit} disabled={loading}>
        {loading ? "處理中..." : "確認"}
    </Button>
    <Button className="text-white bg-info border-0" onClick={() => navigate(-1)}>
        取消
    </Button>
    <Button className="text-white bg-info border-0" disabled>
        列印
    </Button>
</div>

                </Form>
            </Col>
        </div>
    );
};

export default AddProductSale;

