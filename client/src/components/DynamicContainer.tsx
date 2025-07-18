import React, { useState, useEffect, useRef, ReactNode } from "react";
import { Container } from "react-bootstrap";

interface DynamicContainerProps {
  content: ReactNode;
  className?: string;
}

const DynamicContainer: React.FC<DynamicContainerProps> = ({ content, className = "" }) => {
  const [headerHeight, setHeaderHeight] = useState<number>(62); // 默認高度
  const [sidebarWidth, setSidebarWidth] = useState<number>(200); // 默認側邊欄寬度
  const containerRef = useRef<HTMLDivElement>(null);

  // 動態測量 header 高度和 sidebar 寬度
  useEffect(() => {
    const measureDimensions = () => {
      // 測量 header 高度
      const headerElement = document.querySelector('.app-header');
      if (headerElement) {
        const height = headerElement.getBoundingClientRect().height;
        setHeaderHeight(height);
        
        if (containerRef.current) {
          containerRef.current.style.minHeight = `calc(${height}px)`;
        }
      }
      
      // 測量 sidebar 寬度
      const sidebarElement = document.querySelector('.app-sidebar');
      if (sidebarElement) {
        const width = sidebarElement.getBoundingClientRect().width;
        setSidebarWidth(width);
        
        if (containerRef.current) {
          containerRef.current.style.width = `calc(100% - ${width}px)`;
          containerRef.current.style.marginLeft = `${width}px`;
        }
      }
    };

    // 初始測量
    measureDimensions();
    
    // 稍微延遲再測一次，確保所有元素都已完全渲染
    const timeoutId = setTimeout(measureDimensions, 100);

    // 監聽視窗大小變化，重新測量
    window.addEventListener('resize', measureDimensions);
    
    // 清理函數
    return () => {
      window.removeEventListener('resize', measureDimensions);
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <Container
      ref={containerRef}
      className={`d-flex p-0 flex-column ${className}`}
      style={{
        minHeight: `calc(${headerHeight}px)`,
        width: `calc(100% - ${sidebarWidth}px)`,
        marginLeft: `${sidebarWidth}px`,
      }}
    >
      <div className="my-auto w-100 p-4">
        {content}
      </div>
    </Container>
  );
};

export default DynamicContainer; 