import React, { useEffect, useRef, useState } from "react";
import { Table, TableProps } from "react-bootstrap";
import "./ScrollableTable.css";

interface ScrollableTableProps {
  /**
   * 表格標頭部分，應該是<tr>或<tr>的數組
   */
  tableHeader: React.ReactNode;
  
  /**
   * 表格內容部分，可以是完整的JSX元素、條件渲染或數組映射
   */
  tableBody: React.ReactNode;
  
  /**
   * 表格高度 (可選)，預設為 "calc(100vh - 250px)"
   */
  height?: string;
  
  /**
   * React-Bootstrap Table 屬性 (可選)
   * 允許傳遞任何標準的 Table 屬性，如 striped, bordered 等
   */
  tableProps?: TableProps;
  
  /**
   * 可選的CSS類名
   */
  className?: string;
  
  /**
   * 是否自動計算高度
   */
  autoHeight?: boolean;
  
  /**
   * 要排除的兄弟元素選擇器
   */
  excludeSelectors?: string[];
}

/**
 * 可滾動表格組件
 * 
 * 用法示例:
 * ```tsx
 * <ScrollableTable
 *   tableHeader={
 *     <tr>
 *       <th>ID</th>
 *       <th>姓名</th>
 *     </tr>
 *   }
 *   tableBody={
 *     data.length > 0 ? (
 *       data.map(item => (
 *         <tr key={item.id}>
 *           <td>{item.id}</td>
 *           <td>{item.name}</td>
 *         </tr>
 *       ))
 *     ) : (
 *       <tr>
 *         <td colSpan={2} className="text-center">無數據</td>
 *       </tr>
 *     )
 *   }
 *   height="400px"
 *   tableProps={{ striped: true, size: "sm" }}
 * />
 * ```
 */
const ScrollableTable: React.FC<ScrollableTableProps> = ({ 
  tableHeader, 
  tableBody, 
  height,
  tableProps = { bordered: true, hover: true, responsive: true },
  className = "",
  autoHeight = false,
  excludeSelectors = [".app-header", ".app-footer", ".page-title", ".filters-container"]
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [calculatedHeight, setCalculatedHeight] = useState<string | undefined>(undefined);
  
  useEffect(() => {
    if (!autoHeight) return;
    
    const calculateHeight = () => {
      let totalExcludedHeight = 0;
      
      excludeSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          totalExcludedHeight += el.getBoundingClientRect().height;
        });
      });
      
      const padding = 40;
      
      const availableHeight = window.innerHeight - totalExcludedHeight - padding;
      
      setCalculatedHeight(`${Math.max(availableHeight, 200)}px`);
    };
    
    calculateHeight();
    
    window.addEventListener('resize', calculateHeight);
    
    return () => window.removeEventListener('resize', calculateHeight);
  }, [autoHeight, excludeSelectors]);
  
  const containerStyle = autoHeight && calculatedHeight 
    ? { height: calculatedHeight } 
    : height 
      ? { height } 
      : undefined;
  
  return (
    <div 
      ref={containerRef} 
      className={`table-container ${className}`} 
      style={containerStyle}
    >
      <div className="table-scroll-container">
        <Table {...tableProps}>
          <thead className="table-header-sticky">
            {tableHeader}
          </thead>
          <tbody>
            {tableBody}
          </tbody>
        </Table>
      </div>
    </div>
  );
};

export default ScrollableTable; 