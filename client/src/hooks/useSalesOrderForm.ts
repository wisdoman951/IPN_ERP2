import { useState, useEffect } from 'react';
import SalesOrderService, { SalesOrderData, SalesOrderItemData } from '../services/SalesOrderService';

// 銷售單項目
const initialItemState: SalesOrderItemData = {
  id: 1,
  productCode: '',
  productName: '',
  spec: '',
  unit: '',
  price: 0,
  quantity: 0,
  category: '',
  notes: '',
};

// 銷售單完整資料
const initialState: SalesOrderData = {
  salesOrderNumber: `SO-${Date.now()}`, // 產生一個唯一的單號
  salesUnit: '',
  salesCategory: '',
  salesDate: new Date().toISOString().split('T')[0], // 預設為今天
  items: [initialItemState],
  totalAmountText: '',
  totalAmount: 0,
  buyer: '',
  seller: '',
};

export const useSalesOrderForm = (salesOrderId?: string) => {
  const [formData, setFormData] = useState<SalesOrderData>(initialState);

  // 計算總金額
  useEffect(() => {
    const total = formData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    setFormData(prev => ({ ...prev, totalAmount: total }));
  }, [formData.items]);
  
  // 如果是編輯模式，載入現有資料
  useEffect(() => {
    if (salesOrderId) {
      // 在此處呼叫 SalesOrderService.get(salesOrderId) 來取得資料
      // 這部分先保留，待後端 API 完成
      console.log(`Fetching data for sales order: ${salesOrderId}`);
    }
  }, [salesOrderId]);

  // 處理一般欄位變動
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 處理銷售項目欄位變動
  const handleItemChange = (index: number, field: keyof SalesOrderItemData, value: string | number) => {
    const newItems = [...formData.items];
    const item = newItems[index] as any;
    item[field] = value;
    
    // 自動計算小計
    const price = Number(newItems[index].price);
    const quantity = Number(newItems[index].quantity);
    if (!isNaN(price) && !isNaN(quantity)) {
        newItems[index].subtotal = price * quantity;
    }

    setFormData(prev => ({ ...prev, items: newItems }));
  };

  // 新增一個銷售項目
  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { ...initialItemState, id: Date.now() }], // 使用時間戳確保 key 唯一
    }));
  };

  // 移除一個銷售項目
  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };
  
  // 提交表單
  const handleSubmit = async () => {
    try {
      // 在此處可以加上表單驗證邏輯
      console.log('Form data to be submitted:', formData);
      // await SalesOrderService.create(formData);
      alert('銷售單已成功建立！');
    } catch (error) {
      console.error('Failed to create sales order:', error);
      alert('建立銷售單失敗！');
    }
  };


  return {
    formData,
    handleInputChange,
    handleItemChange,
    addItem,
    removeItem,
    handleSubmit,
  };
};
