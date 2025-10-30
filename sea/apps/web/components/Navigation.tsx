"use client";

import { ConnectButton } from '@mysten/dapp-kit';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, Gift, CreditCard, Anchor, Shield, FileText } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/seal/legacy', label: 'Legacy', icon: Anchor },
  { href: '/seal/heir', label: 'Heir', icon: Shield },
  { href: '/smartwill', label: 'Smart Will', icon: FileText },
  { href: '/memberWithdraw', label: 'Member Withdraw', icon: Gift },
  { href: '/subscription', label: 'Subscription', icon: CreditCard },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 backdrop-blur supports-[backdrop-filter]:bg-slate-900/50 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="font-bold tracking-tight hover:text-primary transition-colors">
            Sea Vault Console
          </Link>
          <nav className="hidden md:flex items-center gap-1 text-sm">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || 
                (item.href !== '/' && pathname.startsWith(item.href));
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-lg flex items-center gap-2 transition ${
                    isActive
                      ? 'bg-white/10 border border-white/10'
                      : 'hover:bg-white/10'
                  }`}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div>
          <ConnectButton />
        </div>
      </div>
      
      {/* Mobile Navigation */}
      <div className="md:hidden border-t border-white/10 px-4 py-2 overflow-x-auto">
        <div className="flex items-center gap-2 text-xs whitespace-nowrap">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || 
              (item.href !== '/' && pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-lg flex items-center gap-2 transition ${
                  isActive
                    ? 'bg-white/10 border border-white/10'
                    : 'hover:bg-white/10'
                }`}
              >
                <Icon size={14} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
