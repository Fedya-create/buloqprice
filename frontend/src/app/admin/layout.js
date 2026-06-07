'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { Home, Shield, Users, BarChart3, LogOut } from 'lucide-react';
import clsx from 'clsx';

const menuItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: Home },
  { href: '/admin/moderation', label: 'Moderatsiya', icon: Shield },
  { href: '/admin/users', label: 'Foydalanuvchilar', icon: Users },
  { href: '/admin/statistics', label: 'Statistika', icon: BarChart3 },
];

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const { user, logout, hydrated, hydrate } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white shadow-sm border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b">
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="font-bold text-gray-900">Admin Panel</span>
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
                  isActive ? 'bg-red-50 text-red-700' : 'text-gray-600 hover:bg-gray-50'
                )}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t">
          <div className="text-sm text-gray-600 mb-2 px-4">{hydrated ? user?.email : ''}</div>
          <button onClick={logout} className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg w-full">
            <LogOut className="w-5 h-5" /> Chiqish
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  );
}
