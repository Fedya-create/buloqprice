'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, loading } = useAuthStore();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const result = await login(formData.email, formData.password);
      
      // If pending, redirect to waiting page
      if (result.user.status === 'pending') {
        router.push('/auth/waiting');
        return;
      }

      toast.success('Muvaffaqiyatli kirdingiz!');
      
      // Redirect based on role
      if (result.user.role === 'pharmacy') router.push('/pharmacy/dashboard');
      else if (result.user.role === 'distributor') router.push('/distributor/dashboard');
      else if (result.user.role === 'admin') router.push('/admin/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Kirish xatosi');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">B</span>
            </div>
            <span className="text-2xl font-bold">BuloqPrice</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Tizimga kirish</h1>
          <p className="text-gray-600 mt-2">Email va parolingizni kiriting</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              className="input-field"
              placeholder="email@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Parol</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="input-field pr-12"
                placeholder="Parolingiz"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
            {loading ? 'Kirilmoqda...' : 'Kirish'}
          </button>
        </form>

        <p className="text-center mt-6 text-gray-600">
          Akkauntingiz yo'qmi?{' '}
          <Link href="/auth/register" className="text-primary-600 font-medium hover:underline">
            Ro'yxatdan o'ting
          </Link>
        </p>
      </div>
    </div>
  );
}
