'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { CheckCircle, Truck, Package, XCircle } from 'lucide-react';

export default function DistributorOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, [filter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = filter ? `?status=${filter}` : '';
      const { data } = await api.get(`/distributor/orders${params}`);
      setOrders(data.orders);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId, status) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status });
      toast.success('Status yangilandi!');
      fetchOrders();
    } catch (err) {
      toast.error('Xatolik');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Kelib tushgan buyurtmalar</h1>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { key: 'pending', label: 'Yangi' },
          { key: 'confirmed', label: 'Tasdiqlangan' },
          { key: 'shipping', label: 'Yo\'lda' },
          { key: 'delivered', label: 'Yetkazilgan' },
          { key: '', label: 'Barchasi' }
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === key ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-500">Yuklanmoqda...</p>
      ) : orders.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">Buyurtmalar topilmadi</div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="card">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-gray-900">Buyurtma #{order.id}</h3>
                  <p className="text-sm text-gray-500">
                    {order.pharmacy_name} - {order.pharmacy_city}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(order.created_at).toLocaleString('uz-UZ')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-gray-900">
                    {Number(order.total_amount).toLocaleString()} so'm
                  </p>
                </div>
              </div>

              {/* Action buttons based on current status */}
              {order.status === 'pending' && (
                <div className="flex gap-2 pt-3 border-t">
                  <button
                    onClick={() => updateStatus(order.id, 'confirmed')}
                    className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200"
                  >
                    <CheckCircle className="w-4 h-4" /> Tasdiqlash
                  </button>
                  <button
                    onClick={() => updateStatus(order.id, 'cancelled')}
                    className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200"
                  >
                    <XCircle className="w-4 h-4" /> Rad etish
                  </button>
                </div>
              )}
              {order.status === 'confirmed' && (
                <div className="flex gap-2 pt-3 border-t">
                  <button
                    onClick={() => updateStatus(order.id, 'shipping')}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200"
                  >
                    <Truck className="w-4 h-4" /> Yo'lga chiqdi
                  </button>
                </div>
              )}
              {order.status === 'shipping' && (
                <div className="flex gap-2 pt-3 border-t">
                  <button
                    onClick={() => updateStatus(order.id, 'delivered')}
                    className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200"
                  >
                    <Package className="w-4 h-4" /> Yetkazildi
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
