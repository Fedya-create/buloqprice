'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { Home, Search, ShoppingCart, ClipboardList, LogOut } from 'lucide-react';
import clsx from 'clsx';

const menuItems = [
  { href: '/pharmacy/dashboard', label: 'Dashboard', icon: Home },
  { href: '/pharmacy/catalog', label: 'Dori Qidirish', icon: Search },
  { href: '/pharmacy/cart', label: 'Savatcha', icon: ShoppingCart },
  { href: '/pharmacy/orders', label: 'Buyurtmalar', icon: ClipboardList },
];

export default function PharmacyLayout({ children }) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-sm border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b">
          <Link href="/pharmacy/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">B</span>
            </div>
            <span className="font-bold text-gray-900">BuloqPrice</span>
          </Link>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition',
                  isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'
                )}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t">
          <div className="text-sm text-gray-600 mb-2 px-4">{user?.email}</div>
          <button
            onClick={logout}
            className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg w-full"
          >
            <LogOut className="w-5 h-5" />
            Chiqish
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  );
}
