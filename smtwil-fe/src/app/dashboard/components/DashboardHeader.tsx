'use client';

import { ConnectButton } from "@mysten/dapp-kit";

export default function DashboardHeader() {
  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 shadow-sm">
      <div className="flex items-center">
        <div className="relative">
          <input
            type="text"
            placeholder="search services"
            className="border border-gray-300 rounded-full px-4 py-2 pl-10 w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="absolute left-3 top-2.5">🔍</span>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <ConnectButton />
      </div>
    </header>
  );
}