import { ReactNode } from 'react';
import DashboardSidebar from './components/DashboardSidebar';
import DashboardHeader from './components/DashboardHeader';
import DashboardFooter from './components/DashboardFooter';
import useMoveStore from '../../store/moveStore';
import { useCurrentAccount } from '@mysten/dapp-kit';

export default function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const { walletOwner, setWalletOwner } = useMoveStore();
  const currentAccount = useCurrentAccount();
  setWalletOwner(currentAccount?.address);
  return (
    <div className="flex min-h-screen">
      {/* 側邊欄會使用fixed定位，因此不會推擠其他元素 */}
      <DashboardSidebar />
      
      {/* 主內容區域始終佔據整個螢幕寬度 */}
      <div className="flex flex-col w-full">
        {/* <DashboardHeader /> */}
        <main className="w-full pl-10 flex-grow">
          {/* pl-20 提供左側間距，確保內容不會被側邊欄覆蓋 */}
          <div className="min-h-full">
            {children}
          </div>
        </main>
        <div className="mt-auto">
          <DashboardFooter />
        </div>
      </div>
    </div>
  );
}