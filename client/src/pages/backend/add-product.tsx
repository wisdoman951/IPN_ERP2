import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import IconButton from '../../components/IconButton';

const AddProduct: React.FC = () => {
  const navigate = useNavigate();
  const [productCode, setProductCode] = useState('');
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: 'Noto Sans TC, sans-serif' }}>
      {/* Header (match previous page) */}
      <header className="d-flex justify-content-between align-items-center bg-info px-4 py-3 app-header">
        <h1 className="text-white fw-bold fs-2 m-0">新增產品 1.2.6.3.1.1.1</h1>
        <div className="d-flex gap-3">
          <IconButton.HomeButton onClick={() => navigate('/home')} />
        </div>
      </header>
      {/* Form */}
      <form style={{ maxWidth: 480, margin: '64px auto 0 auto', background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '48px 40px 32px 40px', display: 'flex', flexDirection: 'column', gap: 32 }}>
        {/* Product Code */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <label htmlFor="productCode" style={{ flex: 1, fontWeight: 500, color: '#333', fontSize: 18 }}>設定編號</label>
          <input
            id="productCode"
            type="text"
            value={productCode}
            onChange={e => setProductCode(e.target.value)}
            style={{ flex: 2, background: '#f5f5f5', border: '1px solid #fff', borderRadius: 6, padding: '10px 16px', fontSize: 16, color: '#222', outline: 'none' }}
            placeholder="請輸入產品編號"
            autoComplete="off"
          />
        </div>
        {/* Product Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <label htmlFor="productName" style={{ flex: 1, fontWeight: 500, color: '#333', fontSize: 18 }}>設定產品名稱</label>
          <input
            id="productName"
            type="text"
            value={productName}
            onChange={e => setProductName(e.target.value)}
            style={{ flex: 2, background: '#f5f5f5', border: '1px solid #fff', borderRadius: 6, padding: '10px 16px', fontSize: 16, color: '#222', outline: 'none' }}
            placeholder="請輸入產品名稱"
            autoComplete="off"
          />
        </div>
        {/* Product Price */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <label htmlFor="productPrice" style={{ flex: 1, fontWeight: 500, color: '#333', fontSize: 18 }}>設定售價</label>
          <input
            id="productPrice"
            type="number"
            min="0"
            value={productPrice}
            onChange={e => setProductPrice(e.target.value)}
            style={{ flex: 2, background: '#f5f5f5', border: '1px solid #fff', borderRadius: 6, padding: '10px 16px', fontSize: 16, color: '#222', outline: 'none' }}
            placeholder="請輸入售價"
            autoComplete="off"
          />
        </div>
        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, marginTop: 32 }}>
          <button
            type="button"
            className="btn btn-info text-white"
            onClick={() => navigate(-1)}
          >取消</button>
          <button
            type="submit"
            className="btn btn-info text-white"
          >確認儲存</button>
        </div>
      </form>
    </div>
  );
};

export default AddProduct; 