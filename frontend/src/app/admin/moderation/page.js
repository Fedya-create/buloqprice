'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, User } from 'lucide-react';

export default function ModerationPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    try {
      const { data } = await api.get('/admin/moderation?status=pending');
      setUsers(data.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (userId, action) => {
    try {
      await api.patch(`/admin/moderation/${userId}`, { action });
      toast.success(action === 'approve' ? 'Tasdiqlandi!' : 'Rad etildi');
      setUsers(users.filter(u => u.id !== userId));
    } catch (err) {
      toast.error('Xatolik');
    }
  };

  if (loading) return <p className="text-gray-500">Yuklanmoqda...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Moderatsiya - Tasdiqlash</h1>

      {users.length === 0 ? (
        <div className="card text-center py-12">
          <CheckCircle className="w-16 h-16 text-green-300 mx-auto mb-4" />
          <p className="text-gray-500">Barcha so'rovlar ko'rib chiqilgan</p>
        </div>
      ) : (
        <div className="space-y-4">
          {users.map((user) => (
            <div key={user.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">
                      {user.profile?.name || user.profile?.company_name || user.email}
                    </h3>
                    <p className="text-sm text-gray-500">{user.email} | {user.phone}</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      user.role === 'pharmacy' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {user.role === 'pharmacy' ? 'Dorixona' : 'Firma'}
                    </span>
                    {user.profile && (
                      <div className="mt-2 text-sm text-gray-600 space-y-1">
                        {user.profile.license_number && <p>Litsenziya: {user.profile.license_number}</p>}
                        {user.profile.inn && <p>INN: {user.profile.inn}</p>}
                        {user.profile.city && <p>Shahar: {user.profile.city}, {user.profile.region}</p>}
                        {user.profile.address && <p>Manzil: {user.profile.address}</p>}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAction(user.id, 'approve')}
                    className="flex items-center gap-1 px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200"
                  >
                    <CheckCircle className="w-4 h-4" /> Tasdiqlash
                  </button>
                  <button
                    onClick={() => handleAction(user.id, 'reject')}
                    className="flex items-center gap-1 px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200"
                  >
                    <XCircle className="w-4 h-4" /> Rad etish
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
