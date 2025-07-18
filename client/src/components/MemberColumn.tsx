// client/src/components/MemberColumn.tsx

import React, { useState, useEffect, useRef } from "react";
import { Form, Col, Row } from "react-bootstrap";
import { getMemberById } from "../services/ＭedicalService"; // 確保路徑正確
import { MemberData } from "../types/medicalTypes"; // 確保路徑正確

// ***** 修正 1：在 Props 中加入 isEditMode *****
interface MemberColumnProps {
    memberId: string;
    name: string;
    isEditMode: boolean; // 接收來自父元件的「修改模式」旗標
    onMemberChange: (memberId: string, name: string, memberData: MemberData | null) => void;
    onError?: (error: string) => void;
}

const MemberColumn: React.FC<MemberColumnProps> = ({ 
    memberId, 
    name, 
    isEditMode, // 解構出 isEditMode
    onMemberChange,
    onError,
}) => {
    // debounce 的 useRef 保持不變
    const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    
    // 我們不再需要這麼多本地狀態，可以直接使用從父元件傳來的 props
    // 這可以簡化元件邏輯，並確保資料源唯一

    useEffect(() => {
        // 如果是修改模式，就什麼都不要做，直接退出這個 effect
        if (isEditMode) {
            return;
        }

        // --- 以下的邏輯只會在「新增模式」下執行 ---

        // 如果 memberId 是空的，也不執行
        if (!memberId) {
            return;
        }

        // 清除上一個計時器
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        // 設置新的計時器，延遲 500ms 後才去 call API
        debounceTimeoutRef.current = setTimeout(async () => {
            try {
                const member = await getMemberById(memberId);
                if (member) {
                    // 找到會員，呼叫 onMemberChange 更新父元件的表單
                    onMemberChange(memberId, member.name, member);
                } else {
                    if (onError) onError(`會員編號 ${memberId} 不存在`);
                    onMemberChange(memberId, "未找到會員", null);
                }
            } catch (err) {
                console.error("獲取會員資料失敗", err);
                if (onError) onError("獲取會員資料失敗");
                onMemberChange(memberId, "查詢失敗", null);
            }
        }, 500);

        // 清理函式
        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
        };
    // 依賴項現在更簡潔
    }, [memberId, isEditMode, onMemberChange, onError]);

    return (
        <Row>
            <Col md={6}>
                <Form.Group className="mb-3">
                    <Form.Label>會員編號</Form.Label>
                    <Form.Control
                        type="text"
                        name="memberId"
                        value={memberId} // 直接使用 props 傳入的 memberId
                        // ***** 修正 3：在 onChange 中直接呼叫 onMemberChange *****
                        // 這樣父元件的狀態才能即時更新
                        onChange={(e) => onMemberChange(e.target.value, name, null)}
                        required
                        // ***** 修正 4：在修改模式時，禁用輸入框 *****
                        disabled={isEditMode}
                    />
                    <Form.Control.Feedback type="invalid">
                        請輸入會員編號
                    </Form.Control.Feedback>
                </Form.Group>
            </Col>
            <Col md={6}>
                <Form.Group className="mb-3">
                    <Form.Label>姓名</Form.Label>
                    <Form.Control
                        type="text"
                        name="name"
                        value={name} // 直接使用 props 傳入的 name
                        // 姓名欄位通常是唯讀的，由系統帶出
                        readOnly
                        required
                        // 在修改模式時，禁用輸入框
                        disabled={isEditMode} 
                    />
                    <Form.Control.Feedback type="invalid">
                        請輸入姓名
                    </Form.Control.Feedback>
                </Form.Group>
            </Col>
        </Row>
    );
};

export default MemberColumn;