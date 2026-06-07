'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import api from '@/lib/api';

export default function WaitingPage() {
  const router = useRouter();
  const { user, token, hydrate, hydrated, logout } = useAuthStore();
  const [dots, setDots] = useState('');

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Animated dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Poll status every 5 seconds
  useEffect(() => {
    if (!hydrated || !token) return;

    const checkStatus = async () => {
      try {
        const { data } = await api.get('/auth/me');
        if (data.user.status === 'approved') {
          // Update local storage with new status
          localStorage.setItem('user', JSON.stringify(data.user));
          // Redirect based on role
          if (data.user.role === 'pharmacy') router.push('/pharmacy/dashboard');
          else if (data.user.role === 'distributor') router.push('/distributor/dashboard');
          else if (data.user.role === 'admin') router.push('/admin/dashboard');
        } else if (data.user.status === 'rejected') {
          // If rejected, show message and logout
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          router.push('/auth/login');
        }
      } catch (err) {
        console.error('Status check error:', err);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [hydrated, token, router]);

  // If no token, redirect to login
  useEffect(() => {
    if (hydrated && !token) {
      router.push('/auth/login');
    }
  }, [hydrated, token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-green-50 px-4">
      <div className="max-w-md w-full text-center">
        {/* Animated icon */}
        <div className="mb-8 relative">
          <div className="w-32 h-32 mx-auto relative">
            {/* Outer spinning ring */}
            <div className="absolute inset-0 rounded-full border-4 border-primary-100 animate-[spin_3s_linear_infinite]">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-primary-500 rounded-full"></div>
            </div>
            {/* Inner pulsing circle */}
            <div className="absolute inset-4 rounded-full bg-primary-100 animate-[pulse_2s_ease-in-out_infinite] flex items-center justify-center">
              <div className="absolute inset-2 rounded-full bg-primary-200 animate-[pulse_2s_ease-in-out_infinite_0.5s] flex items-center justify-center">
                <svg className="w-12 h-12 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Text */}
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          Arizangiz ko'rib chiqilmoqda{dots}
        </h1>
        <p className="text-gray-600 mb-6 leading-relaxed">
          Admin jamoamiz sizning hujjatlaringizni tekshirmoqda. <br />
          Bu odatda <span className="font-semibold text-primary-700">1-2 soat</span> ichida amalga oshiriladi.
        </p>

        {/* Status indicator */}
        <div className="card inline-block px-6 py-3 mb-8">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
              <div className="absolute inset-0 w-3 h-3 bg-yellow-400 rounded-full animate-ping"></div>
            </div>
            <span className="text-sm font-medium text-gray-700">Status: Tasdiq kutilmoqda</span>
          </div>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-1 gap-3 mb-8 text-left">
          <div className="card flex items-start gap-3 py-4">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Ro'yxatdan o'tish muvaffaqiyatli</p>
              <p className="text-xs text-gray-500">Ma'lumotlaringiz qabul qilindi</p>
            </div>
          </div>
          <div className="card flex items-start gap-3 py-4">
            <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 animate-[pulse_2s_ease-in-out_infinite]">
              <svg className="w-4 h-4 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Hujjatlar tekshirilmoqda</p>
              <p className="text-xs text-gray-500">Litsenziya va guvohnomalar ko'rib chiqilmoqda</p>
            </div>
          </div>
          <div className="card flex items-start gap-3 py-4 opacity-50">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Tizimga kirish</p>
              <p className="text-xs text-gray-400">Tasdiqlanganidan keyin avtomatik yo'naltirilasiz</p>
            </div>
          </div>
        </div>

        {/* Note */}
        <p className="text-xs text-gray-400 mb-4">
          Sahifani yopmang — tasdiqlanishi bilan avtomatik platformaga o'tasiz
        </p>

        <button
          onClick={logout}
          className="text-sm text-gray-500 hover:text-red-600 transition"
        >
          Boshqa akkaunt bilan kirish
        </button>
      </div>
    </div>
  );
}
