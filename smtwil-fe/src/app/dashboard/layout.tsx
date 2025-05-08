import { ReactNode } from 'react';
import DashboardSidebar from './components/DashboardSidebar';
import DashboardHeader from './components/DashboardHeader';
import DashboardFooter from './components/DashboardFooter';

export default function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      {/* 側邊欄會使用fixed定位，因此不會推擠其他元素 */}
      <DashboardSidebar />
      
      {/* 主內容區域始終佔據整個螢幕寬度 */}
        {/* <DashboardHeader /> */}
      <div className="flex flex-col w-full">
        <main className="flex-1 pl-10">
          {/* pl-20 提供左側間距，確保內容不會被側邊欄覆蓋 */}
          {children}
        </main>
        <DashboardFooter/>
      </div>
    </div>
  );
}