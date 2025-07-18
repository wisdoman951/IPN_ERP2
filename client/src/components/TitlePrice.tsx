import React from "react";
import { Card, Row, Col } from "react-bootstrap";

interface TitlePriceProps {
  price: number;
  amount: number | string;
  discount: number | string;
  paymentMethod?: string;
  salesCategory?: string;
  className?: string;
}

const TitlePrice: React.FC<TitlePriceProps> = ({
  price,
  amount,
  discount,
  paymentMethod,
  salesCategory,
  className = ""
}) => {
  // Convert values to numbers to ensure proper calculation
  const numericAmount = Number(amount) || 0;
  const numericDiscount = Number(discount) || 0;
  
  // Calculate total price with discount
  const totalPrice = price * numericAmount * (1 - numericDiscount / 100);

  return (
    <Card bg="light" className={className}>
      <Card.Body>
        <Row>
          <Col>
            <p className="mb-1">單價: ${price}</p>
            <p className="mb-1">數量: {numericAmount}</p>
            <p className="mb-1">折扣: {numericDiscount}%</p>
            {paymentMethod && <p className="mb-1">付款方式: {paymentMethod}</p>}
            {salesCategory && <p className="mb-1">銷售類別: {salesCategory}</p>}
          </Col>
          <Col className="text-end">
            <h4>總價: ${totalPrice.toFixed(2)}</h4>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

export default TitlePrice; 