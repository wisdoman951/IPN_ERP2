import { useState, useEffect } from 'react';
import { 
    Member, 
    getAllMembers, 
    searchMembers, 
    deleteMember, 
    exportMembers 
} from '../services/MemberService';

/**
 * 成員管理相關的自定義 Hook
 */
export const useMemberManagement = () => {
    const [members, setMembers] = useState<Member[]>([]);
    const [keyword, setKeyword] = useState("");
    const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

    // 頁面載入時取得所有會員
    useEffect(() => {
        fetchAllMembers();
    }, []);

    // 處理checkbox的判斷邏輯
    const handleCheckboxChange = (memberId: string, checked: boolean) => {
        if (checked) {
            setSelectedMemberIds([...selectedMemberIds, memberId]);
        } else {
            setSelectedMemberIds(selectedMemberIds.filter(id => id !== memberId));
        }
    };

    // 處理刪除邏輯
    const handleDelete = async () => {
        if (selectedMemberIds.length === 0) {
            alert("請先選擇要刪除的會員！");
            return;
        }
    
        if (!window.confirm("確定要刪除選中的會員嗎？")) return;
    
        try {
            for (const id of selectedMemberIds) {
                await deleteMember(id);
            }
            alert("刪除成功！");
            setSelectedMemberIds([]);
            fetchAllMembers(); // refresh
        } catch (err) {
            console.error("刪除失敗：", err);
            alert("刪除會員時發生錯誤！");
        }
    };
    
    // 獲取所有Member
    const fetchAllMembers = async () => {
        try {
            const data = await getAllMembers();
            setMembers(data);
        } catch (err) {
            console.error("載入會員失敗：", err);
        }
    };

    // 處理搜尋Member
    const handleSearch = async () => {
        try {
            const data = await searchMembers(keyword);
            setMembers(data);
        } catch (err) {
            console.error("搜尋失敗：", err);
        }
    };

    // 處理匯出報表
    const handleExport = async () => {
        try {
            const blob = await exportMembers();
            const url = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", "會員資料.xlsx");
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error("匯出失敗：", err);
            alert("匯出報表失敗！");
        }
    };

    return {
        members,
        keyword,
        setKeyword,
        selectedMemberIds,
        handleCheckboxChange,
        handleDelete,
        handleSearch,
        fetchAllMembers,
        handleExport
    };
}; 