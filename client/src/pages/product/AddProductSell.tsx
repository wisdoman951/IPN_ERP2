import React, { useState, useEffect } from "react";
import { Button, Container, Row, Col, Form, InputGroup, Alert, Card } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../../components/Header";
import DynamicContainer from "../../components/DynamicContainer";
import MemberColumn from "../../components/MemberColumn";
import { MemberData } from "../../types/medicalTypes";
import type { MemberIdentity } from "../../types/memberIdentity";
import { normalizeMemberIdentity } from "../../utils/memberIdentity";
import { addProductSell, ProductSellData, getProductSellById, getProductSellsByOrderReference, updateProductSell, ProductSell } from "../../services/ProductSellService";
import { getStoreId } from "../../services/LoginService";
import { fetchAllStores, Store } from "../../services/StoreService";
import { getStaffMembers, StaffMember } from "../../services/TherapyDropdownService";
import { SalesOrderItemData } from "../../services/SalesOrderService";
import { getUserRole, getStoreName } from "../../utils/authUtils";

interface SelectedProduct {
  type?: 'product' | 'bundle';
  product_id?: number;
  bundle_id?: number;
  code?: string;
  name?: string;
  content?: string;
  price: number;
  quantity: number;
  inventory_id?: number;
  basePrice?: number;
  price_tiers?: Partial<Record<MemberIdentity, number>>;
  product_sell_id?: number;
  linkedSaleIds?: number[];
  order_reference?: string | null;
}

interface BundleMetadata {
  id?: number;
  quantity?: number;
  total?: number;
  name?: string;
}

const normalizeNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const computeSaleFinalTotal = (sale: ProductSell): number => {
  const explicitFinal = normalizeNumber(sale.final_price);
  if (explicitFinal > 0) {
    return explicitFinal;
  }

  const unitPrice = normalizeNumber(sale.unit_price);
  const quantity = normalizeNumber(sale.quantity);
  const discount = normalizeNumber(sale.discount_amount);
  const fallback = unitPrice * quantity;
  const derived = fallback - discount;

  if (derived > 0) {
    return derived;
  }

  return fallback > 0 ? fallback : 0;
};

const computeSaleOriginalTotal = (sale: ProductSell, finalTotal: number): number => {
  const unitPrice = normalizeNumber(sale.unit_price);
  const quantity = normalizeNumber(sale.quantity);
  if (unitPrice > 0 && quantity > 0) {
    return unitPrice * quantity;
  }

  const discount = normalizeNumber(sale.discount_amount);
  const derived = finalTotal + discount;
  return derived > 0 ? derived : finalTotal;
};

const extractBundleMetadata = (note?: string | null): BundleMetadata | null => {
  if (!note) {
    return null;
  }

  const metaMatch = note.match(/\[\[bundle_meta\s+({.*?})\]\]/i);
  if (metaMatch) {
    try {
      const parsed = JSON.parse(metaMatch[1]);
      if (parsed && typeof parsed === 'object') {
        const metadata: BundleMetadata = {};
        if (parsed.id !== undefined) {
          const id = Number(parsed.id);
          if (Number.isFinite(id)) {
            metadata.id = id;
          }
        }
        const quantityValue = parsed.qty ?? parsed.quantity;
        if (quantityValue !== undefined) {
          const quantity = Number(quantityValue);
          if (Number.isFinite(quantity)) {
            metadata.quantity = quantity;
          }
        }
        const totalValue = parsed.total ?? parsed.price;
        if (totalValue !== undefined) {
          const total = Number(totalValue);
          if (Number.isFinite(total)) {
            metadata.total = total;
          }
        }
        if (typeof parsed.name === 'string' && parsed.name.trim().length > 0) {
          metadata.name = parsed.name.trim();
        }
        if (Object.keys(metadata).length > 0) {
          return metadata;
        }
      }
    } catch (error) {
      console.warn('解析 bundle metadata 失敗', error);
    }
  }

  const legacyMatch = note.match(/\[bundle:([^\]]+)\]/i);
  if (!legacyMatch) {
    return null;
  }

  const segments = legacyMatch[1].split('|').map(segment => segment.trim());
  const metadata: BundleMetadata = {};
  if (segments[0]) {
    const id = Number(segments[0]);
    if (Number.isFinite(id)) {
      metadata.id = id;
    }
  }
  segments.slice(1).forEach(segment => {
    const [rawKey, rawValue] = segment.split(':');
    if (!rawKey || rawValue === undefined) {
      return;
    }
    const key = rawKey.trim().toLowerCase();
    const value = rawValue.trim();
    if (!value) {
      return;
    }
    if (key === 'qty' || key === 'quantity') {
      const quantity = Number(value);
      if (Number.isFinite(quantity)) {
        metadata.quantity = quantity;
      }
    } else if (key === 'total' || key === 'price') {
      const total = Number(value.replace(/,/g, ''));
      if (Number.isFinite(total)) {
        metadata.total = total;
      }
    } else if (key === 'name') {
      metadata.name = value;
    }
  });

  return Object.keys(metadata).length > 0 ? metadata : null;
};

const cleanBundleNote = (note?: string | null): string => {
  if (!note) {
    return '';
  }
  return note
    .replace(/\[\[bundle_meta\s+({.*?})\]\]/gi, '')
    .replace(/\[bundle:[^\]]*\]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const buildBundleGroupKey = (sale: ProductSell, metadata: BundleMetadata, cleanNote: string): string => {
  const parts = [
    sale.order_reference ? `order:${sale.order_reference}` : '',
    metadata.id !== undefined ? `id:${metadata.id}` : '',
    metadata.name ? `name:${metadata.name}` : '',
    metadata.quantity !== undefined ? `qty:${metadata.quantity}` : '',
    cleanNote ? `note:${cleanNote}` : '',
  ].filter(Boolean);
  if (parts.length === 0) {
    parts.push(`sale:${sale.product_sell_id}`);
  }
  return parts.join('|');
};

const transformSalesToSelectedProducts = (sales: ProductSell[]): {
  products: SelectedProduct[];
  originalTotal: number;
  totalDiscount: number;
  totalFinal: number;
  cleanedNote: string;
} => {
  if (sales.length === 0) {
    return { products: [], originalTotal: 0, totalDiscount: 0, totalFinal: 0, cleanedNote: '' };
  }

  const saleEntries = sales.map(sale => ({
    sale,
    metadata: extractBundleMetadata(sale.note),
    cleanNote: cleanBundleNote(sale.note),
  }));

  const bundleGroups = new Map<string, { metadata: BundleMetadata; cleanNote: string; items: ProductSell[] }>();
  saleEntries.forEach(({ sale, metadata, cleanNote }) => {
    if (!metadata) {
      return;
    }
    const key = buildBundleGroupKey(sale, metadata, cleanNote);
    const existing = bundleGroups.get(key);
    if (existing) {
      existing.items.push(sale);
    } else {
      bundleGroups.set(key, { metadata, cleanNote, items: [sale] });
    }
  });

  const handledBundleKeys = new Set<string>();
  const products: SelectedProduct[] = [];

  saleEntries.forEach(({ sale, metadata, cleanNote }) => {
    if (metadata) {
      const key = buildBundleGroupKey(sale, metadata, cleanNote);
      if (handledBundleKeys.has(key)) {
        return;
      }
      handledBundleKeys.add(key);
      const group = bundleGroups.get(key);
      if (!group) {
        return;
      }
      const bundleQuantityCandidate = group.metadata.quantity;
      const inferredQuantity = bundleQuantityCandidate && bundleQuantityCandidate > 0
        ? bundleQuantityCandidate
        : normalizeNumber(group.items[0]?.quantity);
      const bundleQuantity = inferredQuantity > 0 ? inferredQuantity : 1;
      const groupFinalFromMetadata = Number.isFinite(Number(group.metadata.total))
        ? Number(group.metadata.total)
        : undefined;
      const totalFinalForGroup = groupFinalFromMetadata !== undefined
        ? groupFinalFromMetadata
        : group.items.reduce((sum, item) => sum + computeSaleFinalTotal(item), 0);
      const totalOriginalForGroup = group.items.reduce((sum, item) => {
        const itemFinal = computeSaleFinalTotal(item);
        return sum + computeSaleOriginalTotal(item, itemFinal);
      }, 0);
      const pricePerBundleFinal = bundleQuantity > 0
        ? totalFinalForGroup / bundleQuantity
        : totalFinalForGroup;
      const pricePerBundleOriginal = bundleQuantity > 0
        ? totalOriginalForGroup / bundleQuantity
        : totalOriginalForGroup;
      const roundedFinalPrice = Number(pricePerBundleFinal.toFixed(2));
      const roundedBasePrice = Number(pricePerBundleOriginal.toFixed(2));
      const contentParts = group.items
        .map(item => {
          const quantity = bundleQuantity > 0
            ? normalizeNumber(item.quantity) / bundleQuantity
            : normalizeNumber(item.quantity);
          const roundedQuantity = Math.abs(quantity - Math.round(quantity)) < 1e-6
            ? Math.round(quantity)
            : Number(quantity.toFixed(2));
          const name = item.product_name || '';
          return name ? `${name} x${roundedQuantity}` : '';
        })
        .filter(part => part.length > 0);
      const linkedIds = group.items
        .map(item => item.product_sell_id)
        .filter((id): id is number => typeof id === 'number');

      products.push({
        type: 'bundle',
        bundle_id: typeof group.metadata.id === 'number' && Number.isFinite(group.metadata.id)
          ? group.metadata.id
          : undefined,
        name: group.metadata.name || group.cleanNote || sale.product_name || '產品組合',
        content: contentParts.length > 0 ? contentParts.join(', ') : (group.cleanNote || undefined),
        price: roundedFinalPrice,
        quantity: bundleQuantity,
        basePrice: roundedBasePrice,
        product_sell_id: linkedIds[0],
        linkedSaleIds: linkedIds.length > 0 ? linkedIds : undefined,
        order_reference: sale.order_reference ?? null,
      });
      return;
    }

    const saleFinalTotal = computeSaleFinalTotal(sale);
    const saleOriginalTotal = computeSaleOriginalTotal(sale, saleFinalTotal);
    const quantity = normalizeNumber(sale.quantity);
    const resolvedQuantity = quantity > 0 ? quantity : 1;
    const pricePerUnitFinal = resolvedQuantity > 0
      ? saleFinalTotal / resolvedQuantity
      : saleFinalTotal;
    const pricePerUnitOriginal = resolvedQuantity > 0
      ? saleOriginalTotal / resolvedQuantity
      : saleOriginalTotal;
    products.push({
      type: 'product',
      product_id: sale.product_id ?? undefined,
      code: sale.product_code ?? undefined,
      name: sale.product_name || '',
      price: Number(pricePerUnitFinal.toFixed(2)),
      quantity: resolvedQuantity,
      basePrice: Number(pricePerUnitOriginal.toFixed(2)),
      product_sell_id: sale.product_sell_id,
      linkedSaleIds: sale.product_sell_id ? [sale.product_sell_id] : undefined,
      order_reference: sale.order_reference ?? null,
    });
  });

  const originalTotal = products.reduce((sum, product) => {
    const base = product.basePrice ?? product.price ?? 0;
    return sum + base * (product.quantity || 0);
  }, 0);
  const totalFinal = products.reduce((sum, product) => {
    return sum + (product.price || 0) * (product.quantity || 0);
  }, 0);
  const totalDiscount = originalTotal - totalFinal;
  const cleanedNote = cleanBundleNote(saleEntries[0]?.sale.note ?? '') || (saleEntries[0]?.sale.note ?? '');

  return {
    products,
    originalTotal: Number(originalTotal.toFixed(2)),
    totalDiscount: Number(totalDiscount.toFixed(2)),
    totalFinal: Number(totalFinal.toFixed(2)),
    cleanedNote,
  };
};

const paymentMethodDisplayMap: { [key: string]: string } = {
  "現金": "Cash",
  "信用卡": "CreditCard",
  "轉帳": "Transfer",
  "行動支付": "MobilePayment",
  "待付款": "Pending",
  "其他": "Others",
};

const paymentMethodValueMap: { [key: string]: string } = Object.fromEntries(
  Object.entries(paymentMethodDisplayMap).map(([key, value]) => [value, key])
);

const AddProductSell: React.FC = () => {
  const userRole = getUserRole();
  const isTherapist = userRole === 'therapist';
  const navigate = useNavigate();
  const { sellId } = useParams<{ sellId?: string }>();
  const isEditMode = Boolean(sellId);

  const [stores, setStores] = useState<Store[]>([]);
  const [storeNameToId, setStoreNameToId] = useState<{ [name: string]: number }>({});
  const [selectedStore, setSelectedStore] = useState<string>(getStoreName() || "");

  const [storeId, setStoreId] = useState<string>("");
  const [memberCode, setMemberCode] = useState<string>("");
  const [memberId, setMemberId] = useState<string>("");
  const [memberName, setMemberName] = useState<string>("");
  const [purchaseDate, setPurchaseDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const paymentMethodOptions = Object.keys(paymentMethodDisplayMap);
  const [paymentMethod, setPaymentMethod] = useState<string>(paymentMethodOptions[0]);
  const [transferCode, setTransferCode] = useState<string>("");
  const [cardNumber, setCardNumber] = useState<string>("");
  const saleCategoryOptions = ["銷售", "贈品", "折扣", "預購", "暫借"];
  const [saleCategory, setSaleCategory] = useState<string>(saleCategoryOptions[0]);
  const [note, setNote] = useState<string>("");
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [productsOriginalTotal, setProductsOriginalTotal] = useState<number>(0);
  const [orderDiscountAmount, setOrderDiscountAmount] = useState<number>(0);
  const [finalPayableAmount, setFinalPayableAmount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [formSubmitted, setFormSubmitted] = useState<boolean>(false);
  const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);
  const [memberIdentity, setMemberIdentity] = useState<MemberIdentity | null>(null);
  const [orderReference, setOrderReference] = useState<string | null>(null);

  const generateOrderReference = () => {
    const now = new Date();
    const pad = (value: number) => value.toString().padStart(2, '0');
    return `PS${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}${now.getMilliseconds().toString().padStart(3, '0')}`;
  };

  useEffect(() => {
    const init = async () => {
      const currentStoreId = getStoreId();
      const currentStoreName = getStoreName();
      if (currentStoreId) setStoreId(currentStoreId);
      else setError("無法獲取當前門市資訊，請重新登入。");

      let nameToIdMap: { [name: string]: number } = {};
      if (userRole === 'admin') {
        try {
          const data = await fetchAllStores();
          const uniqueStores = Array.from(new Map(data.map(s => [s.store_name, s])).values());
          setStores(uniqueStores);
          const map: { [name: string]: number } = {};
          uniqueStores.forEach(s => { map[s.store_name] = s.store_id; });
          nameToIdMap = map;
          setStoreNameToId(map);
          if (!isEditMode && !localStorage.getItem('productSellFormState')) {
            if (uniqueStores.length > 0) {
              setSelectedStore(uniqueStores[0].store_name);
              setStoreId(uniqueStores[0].store_id.toString());
            }
          }
        } catch (err) {
          console.error("載入分店資料失敗：", err);
          setError("載入分店資料失敗");
        }
      } else {
        if (currentStoreName) setSelectedStore(currentStoreName);
      }

      const fetchStaffMembersData = async () => {
        try {
          const data = await getStaffMembers(currentStoreId ? parseInt(currentStoreId) : undefined);
          setStaffMembers(data);
          if (!isEditMode && data.length > 0 && !localStorage.getItem('productSellFormState')) {
            setSelectedStaffId(data[0].staff_id.toString());
          }
        } catch (err) {
          console.error("載入銷售人員資料失敗：", err);
          setError("載入銷售人員資料失敗");
        }
      };
      await fetchStaffMembersData();

      if (isEditMode && sellId) {
        try {
          const saleData: ProductSell = await getProductSellById(parseInt(sellId));
          const relatedSales = saleData.order_reference
            ? await getProductSellsByOrderReference(saleData.order_reference)
            : [saleData];
          const {
            products,
            originalTotal,
            totalDiscount,
            totalFinal,
            cleanedNote,
          } = transformSalesToSelectedProducts(relatedSales);

          setSelectedProducts(products);
          setProductsOriginalTotal(Number(originalTotal.toFixed(2)));
          setOrderDiscountAmount(Number(totalDiscount.toFixed(2)));
          setFinalPayableAmount(Number(totalFinal.toFixed(2)));

          setMemberCode(saleData.member_code || "");
          setMemberId(saleData.member_id ? saleData.member_id.toString() : "");
          setMemberName(saleData.member_name || "");
          setPurchaseDate(
            saleData.date
              ? new Date(saleData.date).toISOString().split("T")[0]
              : new Date().toISOString().split("T")[0]
          );

          const resolvedPayment = paymentMethodValueMap[saleData.payment_method || 'Cash'] || paymentMethodOptions[0];
          setPaymentMethod(resolvedPayment);
          setTransferCode(saleData.transfer_code || "");
          setCardNumber(saleData.card_number || "");

          setSaleCategory(
            saleCategoryOptions.includes(saleData.sale_category || '')
              ? saleData.sale_category!
              : saleCategoryOptions[0]
          );
          setSelectedStaffId(saleData.staff_id ? saleData.staff_id.toString() : '');
          setNote(cleanedNote);
          if (saleData.store_id) setStoreId(saleData.store_id.toString());
          if (saleData.store_name) setSelectedStore(saleData.store_name);
          setOrderReference(saleData.order_reference ?? (products[0]?.order_reference ?? null));
        } catch (err) {
          console.error("載入銷售資料失敗：", err);
          setError("載入銷售資料失敗");
        }
        return;
      }

      // ---- 資料還原在這邊 ----
      const selectedProductsData = localStorage.getItem('selectedProducts');
      const formStateData = localStorage.getItem('productSellFormState');
      let initialProducts: SelectedProduct[] = [];
      if (selectedProductsData) {
        try {
          initialProducts = JSON.parse(selectedProductsData);
          initialProducts = initialProducts.map(p => ({
            ...p,
            basePrice: p.basePrice ?? p.price,
          }));
          setSelectedProducts(initialProducts);
        }
        catch (e) { console.error("解析 selectedProducts 失敗", e); }
      }
      let currentTotalFromProds = 0;
      initialProducts.forEach(p => {
        const base = p.basePrice ?? p.price ?? 0;
        currentTotalFromProds += base * (p.quantity || 0);
      });
      setProductsOriginalTotal(currentTotalFromProds);

      let currentDiscAmount = 0;
      if (formStateData) {
        try {
          const formState = JSON.parse(formStateData);
          if (formState.memberCode) setMemberCode(formState.memberCode);
          if (formState.memberId) setMemberId(formState.memberId);
          if (formState.memberName) setMemberName(formState.memberName);
          if (formState.memberIdentity) {
            setMemberIdentity(normalizeMemberIdentity(formState.memberIdentity));
          }
          if (formState.purchaseDate) setPurchaseDate(formState.purchaseDate);
          if (formState.paymentMethod && paymentMethodOptions.includes(formState.paymentMethod)) {
            setPaymentMethod(formState.paymentMethod);
          }
          if (formState.transferCode) setTransferCode(formState.transferCode);
          if (formState.cardNumber) setCardNumber(formState.cardNumber);
          if (formState.saleCategory) setSaleCategory(formState.saleCategory);
          if (formState.note) setNote(formState.note);
          if (formState.selectedStaffId) setSelectedStaffId(formState.selectedStaffId);
          if (formState.selectedStore && formState.selectedStore === currentStoreName) {
            setSelectedStore(formState.selectedStore);
            const id = nameToIdMap[formState.selectedStore] || currentStoreId;
            if (id) setStoreId(id.toString());
          } else {
            if (currentStoreName) setSelectedStore(currentStoreName);
            if (currentStoreId) setStoreId(currentStoreId);
          }
          if (typeof formState.discountAmount === 'number') {
            currentDiscAmount = formState.discountAmount;
            setOrderDiscountAmount(currentDiscAmount);
          }
        } catch (e) { console.error("解析 productSellFormState 失敗", e); }
      }
      setFinalPayableAmount(currentTotalFromProds - currentDiscAmount);
    };
    init();
  }, [isEditMode, sellId]);

  useEffect(() => {
    const newTotal = selectedProducts.reduce((sum, p) => {
      const base = p.basePrice ?? p.price ?? 0;
      return sum + base * (p.quantity || 0);
    }, 0);
    setProductsOriginalTotal(newTotal);
  }, [selectedProducts]);

  useEffect(() => {
    setFinalPayableAmount(productsOriginalTotal - orderDiscountAmount);
  }, [productsOriginalTotal, orderDiscountAmount]);

  const handleMemberChange = (code: string, name: string, data: MemberData | null) => {
    setMemberCode(code);
    setMemberName(name);
    setMemberId(data?.member_id?.toString() || "");
    setError(null);
    setSelectedMember(data);
    setMemberIdentity(normalizeMemberIdentity(data?.identity_type));
  };
  const handleError = (errorMsg: string) => {
    setError(errorMsg);
  };
  const handleMemberError = (errorMsg: string) => {
    setError(errorMsg);
    setSelectedMember(null);
    setMemberIdentity(null);
  };
  const openProductSelection = () => {
    if (!memberCode || !memberId) {
      setError("請先輸入會員編號並確認會員資料。");
      return;
    }
    const normalizedIdentity =
      memberIdentity ||
      normalizeMemberIdentity(selectedMember?.identity_type) ||
      ('一般售價' as MemberIdentity);
    const formState = {
      selectedStore,
      memberCode,
      memberId,
      memberName,
      memberIdentity: normalizedIdentity,
      purchaseDate,
      paymentMethod,
      transferCode,
      cardNumber,
      saleCategory,
      note,
      selectedStaffId,
      discountAmount: orderDiscountAmount,
    };
    localStorage.setItem('productSellFormState', JSON.stringify(formState));
    const enrichedProducts = selectedProducts.map(product => ({
      ...product,
      basePrice: product.basePrice ?? product.price,
      price_tiers: product.price_tiers,
    }));
    localStorage.setItem('selectedProducts', JSON.stringify(enrichedProducts));
    navigate('/product-selection', { state: { fromSellPage: true } });
  };
  const processSale = async (): Promise<boolean> => {
    setFormSubmitted(true);
    setError(null);

    const today = new Date();
    today.setHours(0,0,0,0);
    const selectedDate = new Date(purchaseDate);
    selectedDate.setHours(0,0,0,0);

    if (selectedDate > today) { setError("購買日期不能選擇未來日期。"); return false; }
    if (!storeId) { setError("無法獲取當前門市資訊，請重新登入。"); return false; }
    if (!memberCode || !memberId) { setError("請選擇會員並確認姓名。"); return false; }
    if (selectedProducts.length === 0) { setError("請選擇至少一項購買品項。"); return false; }
    if (!paymentMethod) { setError("請選擇付款方式。"); return false; }
    if (!selectedStaffId) { setError("請選擇銷售人員。"); return false; }
    if (!saleCategory) { setError("請選擇銷售類別。"); return false; }
    if (orderDiscountAmount < 0) { setError("折價金額不能為負數。"); return false; }
    if (finalPayableAmount < 0) { setError("應收金額低於零，請檢查產品總價和折價。"); return false; }

    setLoading(true);
    try {
      const currentOrderReference = orderReference ?? generateOrderReference();
      if (!orderReference) {
        setOrderReference(currentOrderReference);
      }
      const paymentMethodInEnglish = paymentMethodDisplayMap[paymentMethod] || paymentMethod;

      if (isEditMode && sellId) {
        const product = selectedProducts[0];
        let itemFinalPrice = product.price * product.quantity;
        let itemDiscountAmount = orderDiscountAmount;
        if (productsOriginalTotal > 0 && orderDiscountAmount > 0) {
          itemFinalPrice = productsOriginalTotal - orderDiscountAmount;
        }

        const sellData: ProductSellData = {
          member_id: parseInt(memberId),
          store_id: parseInt(storeId),
          staff_id: selectedStaffId ? parseInt(selectedStaffId) : undefined,
          date: purchaseDate,
          payment_method: paymentMethodInEnglish,
          transfer_code: paymentMethod === "轉帳" ? transferCode : undefined,
          card_number: paymentMethod === "信用卡" ? cardNumber : undefined,
          sale_category: saleCategory,
          quantity: product.quantity,
          note: note,
          unit_price: product.price,
          discount_amount: itemDiscountAmount,
          final_price: itemFinalPrice,
          order_reference: currentOrderReference,
        };

        if (product.product_id) {
          sellData.product_id = product.product_id;
        } else if (product.bundle_id) {
          sellData.bundle_id = product.bundle_id;
        }

        await updateProductSell(parseInt(sellId), sellData);
      } else {
        for (const product of selectedProducts) {
          let itemFinalPrice = product.price * product.quantity;
          let itemDiscountAmount = 0;
          if (productsOriginalTotal > 0 && orderDiscountAmount > 0 && selectedProducts.length > 0) {
              const productOriginalValue = product.price * product.quantity;
              const proportion = productOriginalValue / productsOriginalTotal;
              itemDiscountAmount = parseFloat((orderDiscountAmount * proportion).toFixed(2));
              itemFinalPrice = parseFloat((productOriginalValue - itemDiscountAmount).toFixed(2));
          } else if (productsOriginalTotal === 0 && orderDiscountAmount > 0 && selectedProducts.length === 1 && product.quantity > 0) {
              itemDiscountAmount = orderDiscountAmount / product.quantity;
              itemFinalPrice = (product.price * product.quantity) - orderDiscountAmount;
          }

          const sellData: ProductSellData = {
            member_id: parseInt(memberId),
            store_id: parseInt(storeId),
            staff_id: selectedStaffId ? parseInt(selectedStaffId) : undefined,
            date: purchaseDate,
            payment_method: paymentMethodInEnglish,
            transfer_code: paymentMethod === "轉帳" ? transferCode : undefined,
            card_number: paymentMethod === "信用卡" ? cardNumber : undefined,
            sale_category: saleCategory,
            quantity: product.quantity,
            note: note,
            unit_price: product.price,
            discount_amount: itemDiscountAmount,
            final_price: itemFinalPrice,
            order_reference: currentOrderReference,
          };

          if (product.product_id) {
            sellData.product_id = product.product_id;
          } else if (product.bundle_id) {
            sellData.bundle_id = product.bundle_id;
          }

          await addProductSell(sellData);
        }
      }

      // 只在送出成功時清除
      localStorage.removeItem('productSellFormState');
      localStorage.removeItem('selectedProducts');
      return true;
    } catch (err: unknown) {
      console.error("新增產品銷售失敗:", err);
      const error = err as { response?: { data?: { error?: string } }; message?: string };
      setError(error.response?.data?.error || error.message || "新增產品銷售失敗，請檢查輸入並重試。");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await processSale();
    if (success) {
      alert(isEditMode ? "銷售記錄已成功更新！" : "銷售記錄已成功新增！");
      navigate('/product-sell', { state: { refresh: true } });
    }
  };

  const handlePrint = async () => {
    const success = await processSale();
    if (success) {
      const itemsForOrder: SalesOrderItemData[] = selectedProducts.map(p => ({
        product_id: p.product_id ?? p.bundle_id ?? undefined,
        item_description: p.name || p.content,
        item_type: 'Product',
        item_code: p.code,
        unit: '個',
        unit_price: p.price,
        quantity: p.quantity,
        subtotal: p.price * p.quantity,
      }));
      localStorage.setItem('selectedSalesOrderItems', JSON.stringify(itemsForOrder));
      const staffName = staffMembers.find(st => st.staff_id === parseInt(selectedStaffId))?.name || '';
      const preSaleData = {
        orderDate: purchaseDate,
        saleUnit: selectedStore,
        saleCategory,
        buyer: memberName,
        buyerId: memberId,
        salesperson: staffName,
        staffId: selectedStaffId,
      };
      localStorage.setItem('preSaleData', JSON.stringify(preSaleData));
      alert("銷售資料已儲存，跳轉至列印頁面。");
      navigate('/finance/sales/add');
    }
  };

  const handleCancel = () => {
    localStorage.removeItem('selectedProducts');
    localStorage.removeItem('productSellFormState');
    navigate(-1);
  };
  
  const content = (
    <Container className="my-4">
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      <Row className="justify-content-center">
        <Col md={10}>
          <Card className="shadow-sm">
            <Card.Header className="bg-info text-white">新增產品銷售</Card.Header>
            <Card.Body>
      <Form onSubmit={handleSubmit} noValidate>
        <Row className="g-3">
          {/* --- Left Column --- */}
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>店別</Form.Label>
              {userRole === 'admin' ? (
                <Form.Select
                  value={selectedStore}
                  onChange={(e) => {
                    const name = e.target.value;
                    setSelectedStore(name);
                    const id = storeNameToId[name];
                    if (id) setStoreId(id.toString());
                  }}
                  required
                >
                  {stores.map(store => (
                    <option key={store.store_id} value={store.store_name}>{store.store_name}</option>
                  ))}
                </Form.Select>
              ) : (
                <Form.Control value={selectedStore} readOnly disabled />
              )}
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>購買人姓名</Form.Label>
              <MemberColumn memberCode={memberCode} name={memberName} isEditMode={false} onMemberChange={handleMemberChange} onError={handleMemberError} />
              {formSubmitted && (!memberCode || !memberId) && <div className="text-danger d-block small mt-1">請選擇購買會員</div>}
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>購買品項</Form.Label>
              <div className="d-flex gap-2">
                <div className="flex-grow-1 border rounded p-2" style={{ minHeight: "40px", maxHeight: "120px", overflowY: "auto" }}>
                  {selectedProducts.length > 0 ? ( selectedProducts.map((p, i) => ( <div key={i}>{p.name || p.content} (單價: NT${p.price.toLocaleString()}) x {p.quantity}</div>))
                  ) : ( <span className="text-muted">點擊「選取」按鈕選擇產品</span> )}
                </div>
                <Button variant="info" type="button" className="text-white align-self-start px-3" onClick={openProductSelection}>選取</Button>
              </div>
              <Form.Text muted>可複選，跳出新視窗選取。</Form.Text>
              {formSubmitted && selectedProducts.length === 0 && <div className="text-danger d-block small mt-1">請選擇購買品項</div>}
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>付款方式</Form.Label>
              <Form.Select value={paymentMethod} onChange={(e) => {
                setPaymentMethod(e.target.value);
                if (e.target.value !== "信用卡") setCardNumber("");
                if (e.target.value !== "轉帳") setTransferCode("");
              }} required>
                {paymentMethodOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </Form.Select>
              <Form.Text muted>下拉式：現金、轉帳(輸入末五碼)、信用卡(輸入卡號後五碼)、行動支付。</Form.Text>
            </Form.Group>

            {paymentMethod === "信用卡" && ( <Form.Group className="mb-3"><Form.Label>卡號後五碼</Form.Label><Form.Control type="text" maxLength={5} pattern="\d*" value={cardNumber} onChange={(e) => setCardNumber(e.target.value.replace(/\D/g,'').slice(0,5))} placeholder="請輸入信用卡號後五碼" /></Form.Group> )}
            {paymentMethod === "轉帳" && ( <Form.Group className="mb-3"><Form.Label>轉帳帳號末五碼</Form.Label><Form.Control type="text" maxLength={5} pattern="\d*" value={transferCode} onChange={(e) => setTransferCode(e.target.value.replace(/\D/g,'').slice(0,5))} placeholder="請輸入轉帳帳號末五碼" /></Form.Group> )}
            
            <Form.Group className="mb-3">
              <Form.Label>銷售類別</Form.Label>
              <Form.Select value={saleCategory} onChange={(e) => setSaleCategory(e.target.value)} required>
                {saleCategoryOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </Form.Select>
              <Form.Text muted>下拉式：銷售、贈品、折扣、預購、暫借，需連動後台系統。</Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
                <Form.Label>總價</Form.Label>
                <Form.Control type="text" value={`NT$ ${productsOriginalTotal.toLocaleString()}`} readOnly disabled className="bg-light text-end" />
            </Form.Group>

            <Form.Group className="mb-3">
                <Form.Label>應收</Form.Label>
                <Form.Control type="text" value={`NT$ ${finalPayableAmount.toLocaleString()}`} readOnly disabled className="bg-light text-end" />
            </Form.Group>
          </Col>

          {/* --- Right Column --- */}
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>購買日期</Form.Label>
              <Form.Control type="date" lang="en-CA" value={purchaseDate} max={new Date().toISOString().split("T")[0]} onChange={(e) => setPurchaseDate(e.target.value)} required />
              <Form.Text muted>選擇購買日期。會跳出日曆，無法選取未來日期。</Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>價錢</Form.Label>
              <Form.Control type="text" value={`NT$ ${productsOriginalTotal.toLocaleString()}`} readOnly disabled className="bg-light text-end" />
              <Form.Text muted>自動帶出，價格固定不能修改。</Form.Text>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>銷售人員</Form.Label>
              <Form.Select value={selectedStaffId} onChange={(e) => setSelectedStaffId(e.target.value)} required>
                <option value="">請選擇銷售人員</option>
                {staffMembers.map(staff => ( <option key={staff.staff_id} value={staff.staff_id.toString()}> {staff.name || staff.Staff_Name} </option> ))}
              </Form.Select>
              <Form.Text muted>下拉式：連動各店後台系統、報表。</Form.Text>
              {formSubmitted && !selectedStaffId && <div className="text-danger d-block small mt-1">請選擇銷售人員</div>}
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>備註</Form.Label>
              <Form.Control as="textarea" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="不須必填" />
              <Form.Text muted>非必填。</Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>折價</Form.Label>
              <InputGroup>
                <InputGroup.Text>NT$</InputGroup.Text>
                <Form.Control
                  type="number"
                  min="0"
                  step="any"
                  value={orderDiscountAmount}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setOrderDiscountAmount(isNaN(val) || val < 0 ? 0 : val);
                  }}
                  placeholder="輸入整筆訂單折價金額"
                  disabled={isTherapist}
                />
              </InputGroup>
            </Form.Group>
          </Col>
        </Row>

        <Row className="mt-4">
          <Col className="d-flex justify-content-end gap-2">
            <Button variant="info" className="text-white" type="submit" disabled={loading}>
              {loading ? "處理中..." : "確認"}
            </Button>
            <Button variant="info" type="button" className="text-white" onClick={handleCancel} disabled={loading}>
              取消
            </Button>
            <Button variant="info" type="button" className="text-white" onClick={handlePrint} disabled={loading}>
              列印
            </Button>
          </Col>
        </Row>
      </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );

  return (
    <>
      <Header />
      <DynamicContainer content={content} className="p-0" />
    </>
  );
};

export default AddProductSell;