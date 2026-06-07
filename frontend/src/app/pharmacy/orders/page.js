'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Clock, CheckCircle, Truck, Package, XCircle } from 'lucide-react';

export default function PharmacyOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, [filter]);

  const fetchOrders = async () => {
    try {
      const params = filter ? `?status=${filter}` : '';
      const { data } = await api.get(`/orders/my-orders${params}`);
      setOrders(data.orders);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const statusConfig = {
    pending: { label: 'Kutilmoqda', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
    confirmed: { label: 'Tasdiqlandi', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
    shipping: { label: 'Yo\'lda', color: 'bg-purple-100 text-purple-700', icon: Truck },
    delivered: { label: 'Yetkazildi', color: 'bg-green-100 text-green-700', icon: Package },
    cancelled: { label: 'Bekor', color: 'bg-red-100 text-red-700', icon: XCircle },
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Buyurtmalar tarixi</h1>

      {/* Filter buttons */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setFilter('')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${!filter ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border'}`}
        >
          Barchasi
        </button>
        {Object.entries(statusConfig).map(([key, val]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === key ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border'}`}
          >
            {val.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-500">Yuklanmoqda...</p>
      ) : orders.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">Buyurtmalar topilmadi</div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const status = statusConfig[order.status];
            const Icon = status.icon;
            return (
              <div key={order.id} className="card flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${status.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Buyurtma #{order.id}</p>
                    <p className="text-sm text-gray-500">{order.distributor_name}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(order.created_at).toLocaleDateString('uz-UZ')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{Number(order.total_amount).toLocaleString()} so'm</p>
                  <span className={`inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                    {status.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
