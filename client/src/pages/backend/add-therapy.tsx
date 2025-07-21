import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import IconButton from '../../components/IconButton';

const AddTherapy: React.FC = () => {
  const navigate = useNavigate();
  const [therapyCode, setTherapyCode] = useState('');
  const [therapyName, setTherapyName] = useState('');
  const [therapyPrice, setTherapyPrice] = useState('');

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: 'Noto Sans TC, sans-serif' }}>
      {/* Header */}
      <header className="d-flex justify-content-between align-items-center bg-info px-4 py-3 app-header">
        <h1 className="text-white fw-bold fs-2 m-0">建立療程 1.2.6.3.1.1</h1>
        <div className="d-flex gap-2">
          <IconButton.HomeButton onClick={() => navigate('/home')} />
          <IconButton.CloseButton onClick={() => navigate(-1)} />
        </div>
      </header>
      {/* Form */}
      <form style={{ maxWidth: 480, margin: '64px auto 0 auto', background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '48px 40px 32px 40px', display: 'flex', flexDirection: 'column', gap: 32 }}>
        {/* Therapy Code */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <label htmlFor="therapyCode" style={{ flex: 1, fontWeight: 500, color: '#333', fontSize: 18 }}>設定編號</label>
          <input
            id="therapyCode"
            type="text"
            value={therapyCode}
            onChange={e => setTherapyCode(e.target.value)}
            style={{ flex: 2, background: '#f5f5f5', border: '1px solid #fff', borderRadius: 6, padding: '10px 16px', fontSize: 16, color: '#222', outline: 'none' }}
            placeholder="請輸入療程編號"
            autoComplete="off"
          />
        </div>
        {/* Therapy Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <label htmlFor="therapyName" style={{ flex: 1, fontWeight: 500, color: '#333', fontSize: 18 }}>設定療程名稱</label>
          <input
            id="therapyName"
            type="text"
            value={therapyName}
            onChange={e => setTherapyName(e.target.value)}
            style={{ flex: 2, background: '#f5f5f5', border: '1px solid #fff', borderRadius: 6, padding: '10px 16px', fontSize: 16, color: '#222', outline: 'none' }}
            placeholder="請輸入療程名稱"
            autoComplete="off"
          />
        </div>
        {/* Therapy Price */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <label htmlFor="therapyPrice" style={{ flex: 1, fontWeight: 500, color: '#333', fontSize: 18 }}>設定售價</label>
          <input
            id="therapyPrice"
            type="number"
            min="0"
            value={therapyPrice}
            onChange={e => setTherapyPrice(e.target.value)}
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

export default AddTherapy; 