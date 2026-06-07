'use client';

import Link from 'next/link';
import { Search, ShoppingCart, TrendingUp, Shield, Truck, BarChart3 } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">B</span>
              </div>
              <span className="text-xl font-bold text-gray-900">BuloqPrice</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/auth/login" className="text-gray-600 hover:text-gray-900 font-medium">
                Kirish
              </Link>
              <Link href="/auth/register" className="btn-primary text-sm">
                Ro'yxatdan o'tish
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-600 via-primary-700 to-green-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              Dori narxlarini <span className="text-primary-200">soniyalarda</span> solishtiring
            </h1>
            <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
              O'zbekistondagi dorixonalar va distribyutor firmalar uchun yagona B2B platforma. 
              Minglab dorilarni arzon narxda toping va buyurtma bering.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/register" className="bg-white text-primary-700 px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-50 transition">
                Bepul boshlash
              </Link>
              <a href="#features" className="border-2 border-white text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-white/10 transition">
                Batafsil
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Platforma imkoniyatlari</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Search className="w-8 h-8" />}
              title="Tez qidiruv"
              description="Dori nomini yoki shtrix-kodni kiriting — tizim barcha firmalar narxlarini arzonidan qimmatiga ko'rsatadi."
            />
            <FeatureCard
              icon={<ShoppingCart className="w-8 h-8" />}
              title="Aqlli savatcha"
              description="Turli firmalardan dorilarni tanlang — tizim buyurtmalarni avtomatik firma bo'yicha ajratib beradi."
            />
            <FeatureCard
              icon={<TrendingUp className="w-8 h-8" />}
              title="Firmalar uchun"
              description="Excel faylni yuklang — narxlar va ombor ma'lumotlari soniyalarda yangilanadi. 1000+ dorixonaga yeting."
            />
            <FeatureCard
              icon={<Shield className="w-8 h-8" />}
              title="Xavfsiz tizim"
              description="Barcha foydalanuvchilar litsenziya tekshiruvidan o'tadi. Faqat tasdiqlangan apteka va firmalar ishlaydi."
            />
            <FeatureCard
              icon={<Truck className="w-8 h-8" />}
              title="Buyurtma kuzatuvi"
              description="Buyurtma holatini real vaqtda kuzating: tasdiqlangan, yo'lda, yetkazildi."
            />
            <FeatureCard
              icon={<BarChart3 className="w-8 h-8" />}
              title="Tahlil va statistika"
              description="Savdo hajmi, eng ko'p sotilgan dorilar va hududiy tahlillarni ko'ring."
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Qanday ishlaydi?</h2>
          <div className="grid md:grid-cols-2 gap-16">
            {/* For Pharmacies */}
            <div>
              <h3 className="text-2xl font-bold text-primary-700 mb-6">Dorixonalar uchun</h3>
              <div className="space-y-4">
                <Step number="1" text="Ro'yxatdan o'ting va litsenziyangizni yuklang" />
                <Step number="2" text="Admin tasdiqlashini kuting (1-2 soat)" />
                <Step number="3" text="Dori nomini qidiring va narxlarni solishtiring" />
                <Step number="4" text="Arzon narxni tanlang va buyurtma bering" />
                <Step number="5" text="Dori eshigingizgacha yetkazib beriladi" />
              </div>
            </div>
            {/* For Distributors */}
            <div>
              <h3 className="text-2xl font-bold text-primary-700 mb-6">Firmalar uchun</h3>
              <div className="space-y-4">
                <Step number="1" text="Firma sifatida ro'yxatdan o'ting" />
                <Step number="2" text="Excel faylda dorilar ro'yxatini yuklang" />
                <Step number="3" text="Minglab dorixonalar sizning narxlaringizni ko'radi" />
                <Step number="4" text="Buyurtmalarni qabul qiling va yetkazing" />
                <Step number="5" text="Savdo statistikangizni kuzating" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary-700 text-white text-center">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-4">Hoziroq platformaga qo'shiling!</h2>
          <p className="text-primary-100 mb-8 text-lg">
            O'zbekiston bo'ylab 100+ distribyutor va 500+ dorixona allaqachon BuloqPrice'da
          </p>
          <Link href="/auth/register" className="bg-white text-primary-700 px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-50 transition inline-block">
            Bepul ro'yxatdan o'tish
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">B</span>
              </div>
              <span className="text-lg font-bold text-white">BuloqPrice</span>
            </div>
            <p className="text-sm">2024 BuloqPrice. Barcha huquqlar himoyalangan.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center text-primary-700 mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function Step({ number, text }) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
        {number}
      </div>
      <p className="text-gray-700">{text}</p>
    </div>
  );
}
