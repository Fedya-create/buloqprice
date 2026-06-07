'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Trash2, ShoppingCart } from 'lucide-react';

export default function CartPage() {
  const [cart, setCart] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      const { data } = await api.get('/cart');
      setCart(data.cart);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const removeItem = async (id) => {
    try {
      await api.delete(`/cart/${id}`);
      toast.success('O\'chirildi');
      fetchCart();
    } catch (err) {
      toast.error('Xatolik');
    }
  };

  const placeOrder = async () => {
    try {
      const { data } = await api.post('/orders');
      toast.success(data.message);
      setCart([]);
      setTotal(0);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Buyurtma xatosi');
    }
  };

  if (loading) return <p className="text-gray-500">Yuklanmoqda...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Savatcha</h1>

      {cart.length === 0 ? (
        <div className="card text-center py-16">
          <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Savat bo'sh</p>
          <p className="text-gray-400 text-sm mt-1">Dori qidirish sahifasidan dorilarni qo'shing</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Grouped by distributor */}
          {cart.map((group) => (
            <div key={group.distributor_id} className="card">
              <div className="flex items-center justify-between mb-4 pb-3 border-b">
                <h3 className="font-bold text-gray-900">{group.distributor_name}</h3>
                <span className="text-sm font-medium text-gray-600">
                  Jami: {Number(group.subtotal).toLocaleString()} so'm
                </span>
              </div>
              <div className="space-y-3">
                {group.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium text-gray-900">{item.drug_name}</p>
                      <p className="text-sm text-gray-500">
                        {item.dosage} {item.form} | {Number(item.price).toLocaleString()} x {item.quantity}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-gray-900">
                        {Number(item.total).toLocaleString()} so'm
                      </span>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Order summary */}
          <div className="card bg-primary-50 border-primary-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Umumiy summa:</p>
                <p className="text-2xl font-bold text-gray-900">{Number(total).toLocaleString()} so'm</p>
                <p className="text-sm text-gray-500 mt-1">
                  {cart.length} ta firmaga {cart.reduce((s, g) => s + g.items.length, 0)} ta dori
                </p>
              </div>
              <button onClick={placeOrder} className="btn-primary text-lg px-8">
                Buyurtma berish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
