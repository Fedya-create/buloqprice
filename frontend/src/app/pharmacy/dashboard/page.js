'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { Package, Clock, CheckCircle, TrendingUp } from 'lucide-react';

export default function PharmacyDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentOrders();
  }, []);

  const fetchRecentOrders = async () => {
    try {
      const { data } = await api.get('/orders/my-orders?limit=5');
      setOrders(data.orders);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const statusMap = {
    pending: { label: 'Kutilmoqda', color: 'text-yellow-600 bg-yellow-50', icon: Clock },
    confirmed: { label: 'Tasdiqlandi', color: 'text-blue-600 bg-blue-50', icon: CheckCircle },
    shipping: { label: 'Yo\'lda', color: 'text-purple-600 bg-purple-50', icon: Package },
    delivered: { label: 'Yetkazildi', color: 'text-green-600 bg-green-50', icon: CheckCircle },
    cancelled: { label: 'Bekor qilindi', color: 'text-red-600 bg-red-50', icon: Clock },
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Boshqaruv paneli</h1>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link href="/pharmacy/catalog" className="card hover:shadow-md transition group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center group-hover:bg-primary-200 transition">
              <TrendingUp className="w-6 h-6 text-primary-700" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Dori qidirish</h3>
              <p className="text-sm text-gray-500">Narxlarni solishtirish</p>
            </div>
          </div>
        </Link>
        <Link href="/pharmacy/cart" className="card hover:shadow-md transition group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition">
              <Package className="w-6 h-6 text-blue-700" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Savatcha</h3>
              <p className="text-sm text-gray-500">Tanlangan dorilar</p>
            </div>
          </div>
        </Link>
        <Link href="/pharmacy/orders" className="card hover:shadow-md transition group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition">
              <CheckCircle className="w-6 h-6 text-purple-700" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Buyurtmalar</h3>
              <p className="text-sm text-gray-500">Buyurtma tarixi</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Orders */}
      <div className="card">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Oxirgi buyurtmalar</h2>
        {loading ? (
          <p className="text-gray-500">Yuklanmoqda...</p>
        ) : orders.length === 0 ? (
          <p className="text-gray-500">Hali buyurtma berilmagan</p>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const status = statusMap[order.status];
              return (
                <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Buyurtma #{order.id}</p>
                    <p className="text-sm text-gray-500">{order.distributor_name}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-gray-900">
                      {Number(order.total_amount).toLocaleString()} so'm
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
