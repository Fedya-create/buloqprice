'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Search, Ban, CheckCircle } from 'lucide-react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, [search, roleFilter]);

  const fetchUsers = async () => {
    try {
      let params = '?';
      if (search) params += `search=${encodeURIComponent(search)}&`;
      if (roleFilter) params += `role=${roleFilter}&`;
      const { data } = await api.get(`/admin/users${params}`);
      setUsers(data.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleBlock = async (userId, currentStatus) => {
    const blocked = currentStatus !== 'blocked';
    try {
      await api.patch(`/admin/users/${userId}/block`, { blocked });
      toast.success(blocked ? 'Bloklandi' : 'Blokdan chiqarildi');
      fetchUsers();
    } catch (err) {
      toast.error('Xatolik');
    }
  };

  const statusColors = {
    approved: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    rejected: 'bg-red-100 text-red-700',
    blocked: 'bg-gray-100 text-gray-700',
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Foydalanuvchilar boshqaruvi</h1>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            className="input-field pl-12"
            placeholder="Email bo'yicha qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input-field w-48"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">Barchasi</option>
          <option value="pharmacy">Dorixonalar</option>
          <option value="distributor">Firmalar</option>
          <option value="admin">Adminlar</option>
        </select>
      </div>

      {/* Users table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b text-gray-500">
              <th className="pb-3 font-medium">ID</th>
              <th className="pb-3 font-medium">Email</th>
              <th className="pb-3 font-medium">Role</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium">Ro'yxatdan</th>
              <th className="pb-3 font-medium">Amallar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="py-3 text-gray-500">#{user.id}</td>
                <td className="py-3 font-medium text-gray-900">{user.email}</td>
                <td className="py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user.role === 'pharmacy' ? 'bg-blue-100 text-blue-700' :
                    user.role === 'distributor' ? 'bg-purple-100 text-purple-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {user.role === 'pharmacy' ? 'Dorixona' : user.role === 'distributor' ? 'Firma' : 'Admin'}
                  </span>
                </td>
                <td className="py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[user.status]}`}>
                    {user.status}
                  </span>
                </td>
                <td className="py-3 text-gray-500 text-xs">
                  {new Date(user.created_at).toLocaleDateString('uz-UZ')}
                </td>
                <td className="py-3">
                  <button
                    onClick={() => toggleBlock(user.id, user.status)}
                    className={`p-2 rounded-lg text-sm ${
                      user.status === 'blocked'
                        ? 'text-green-600 hover:bg-green-50'
                        : 'text-red-600 hover:bg-red-50'
                    }`}
                    title={user.status === 'blocked' ? 'Blokdan chiqarish' : 'Bloklash'}
                  >
                    {user.status === 'blocked' ? <CheckCircle className="w-5 h-5" /> : <Ban className="w-5 h-5" />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
