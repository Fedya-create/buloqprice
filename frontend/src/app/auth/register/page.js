'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { register, loading } = useAuthStore();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    profileData: {}
  });

  const handleRoleSelect = (selectedRole) => {
    setRole(selectedRole);
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error('Parollar mos kelmaydi');
      return;
    }
    try {
      const result = await register({ ...formData, role });
      // Save token for waiting page polling
      if (result.token) {
        localStorage.setItem('token', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));
      }
      toast.success('Ro\'yxatdan muvaffaqiyatli o\'tdingiz!');
      router.push('/auth/waiting');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ro\'yxatdan o\'tish xatosi');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">B</span>
            </div>
            <span className="text-2xl font-bold">BuloqPrice</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Ro'yxatdan o'tish</h1>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <p className="text-center text-gray-600 mb-6">Siz kim sifatida ro'yxatdan o'tmoqchisiz?</p>
            <button
              onClick={() => handleRoleSelect('pharmacy')}
              className="card w-full text-left hover:border-primary-500 hover:shadow-md transition cursor-pointer"
            >
              <h3 className="text-lg font-bold text-gray-900">Men Dorixonaman</h3>
              <p className="text-gray-600 mt-1">Dorilarni arzon narxda topish va buyurtma berish uchun</p>
            </button>
            <button
              onClick={() => handleRoleSelect('distributor')}
              className="card w-full text-left hover:border-primary-500 hover:shadow-md transition cursor-pointer"
            >
              <h3 className="text-lg font-bold text-gray-900">Men Firmaman (Distribyutor)</h3>
              <p className="text-gray-600 mt-1">Dorilarimni dorixonalarga taklif qilish va sotish uchun</p>
            </button>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit} className="card space-y-4">
            <button type="button" onClick={() => setStep(1)} className="text-sm text-primary-600 hover:underline">
              &larr; Orqaga
            </button>

            <h3 className="font-bold text-gray-700">
              {role === 'pharmacy' ? 'Dorixona' : 'Firma'} ma'lumotlari
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {role === 'pharmacy' ? 'Dorixona nomi' : 'Firma nomi'}
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder={role === 'pharmacy' ? 'Masalan: Salomatlik dorixonasi' : 'Masalan: MedPharm OOO'}
                  onChange={(e) => setFormData({
                    ...formData,
                    profileData: { ...formData.profileData, [role === 'pharmacy' ? 'name' : 'companyName']: e.target.value }
                  })}
                  required
                />
              </div>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                <input
                  type="tel"
                  className="input-field"
                  placeholder="+998 90 123 45 67"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parol</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="input-field pr-12"
                    placeholder="Kamida 6 ta belgi"
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parolni tasdiqlang</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="input-field pr-12"
                    placeholder="Parolni takrorlang"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">INN</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="123456789"
                  onChange={(e) => setFormData({
                    ...formData,
                    profileData: { ...formData.profileData, inn: e.target.value }
                  })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Litsenziya raqami</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Litsenziya raqami"
                  onChange={(e) => setFormData({
                    ...formData,
                    profileData: { ...formData.profileData, licenseNumber: e.target.value }
                  })}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Manzil</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="To'liq manzil"
                  onChange={(e) => setFormData({
                    ...formData,
                    profileData: { ...formData.profileData, address: e.target.value }
                  })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shahar</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Toshkent"
                  onChange={(e) => setFormData({
                    ...formData,
                    profileData: { ...formData.profileData, city: e.target.value }
                  })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Viloyat</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Toshkent viloyati"
                  onChange={(e) => setFormData({
                    ...formData,
                    profileData: { ...formData.profileData, region: e.target.value }
                  })}
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full mt-4 disabled:opacity-50">
              {loading ? 'Yuborilmoqda...' : 'Ro\'yxatdan o\'tish'}
            </button>
          </form>
        )}

        <p className="text-center mt-6 text-gray-600">
          Akkauntingiz bormi?{' '}
          <Link href="/auth/login" className="text-primary-600 font-medium hover:underline">
            Kirish
          </Link>
        </p>
      </div>
    </div>
  );
}
