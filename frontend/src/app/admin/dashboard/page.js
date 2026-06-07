'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Users, Package, DollarSign, Clock } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/admin/statistics');
      setStats(data.overview);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p className="text-gray-500">Yuklanmoqda...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard icon={<Users />} label="Jami foydalanuvchilar" value={stats?.totalUsers || 0} color="bg-blue-100 text-blue-700" />
        <StatCard icon={<Package />} label="Dorixonalar" value={stats?.totalPharmacies || 0} color="bg-green-100 text-green-700" />
        <StatCard icon={<Package />} label="Firmalar" value={stats?.totalDistributors || 0} color="bg-purple-100 text-purple-700" />
        <StatCard icon={<Clock />} label="Tasdiq kutilmoqda" value={stats?.pendingApprovals || 0} color="bg-yellow-100 text-yellow-700" />
        <StatCard icon={<DollarSign />} label="Buyurtmalar" value={stats?.totalOrders || 0} color="bg-indigo-100 text-indigo-700" />
        <StatCard icon={<DollarSign />} label="Umumiy aylanma" value={`${Number(stats?.totalRevenue || 0).toLocaleString()}`} color="bg-red-100 text-red-700" suffix="so'm" />
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, suffix }) {
  return (
    <div className="card text-center">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2 ${color}`}>
        {icon}
      </div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-lg font-bold text-gray-900">{value}{suffix && <span className="text-xs"> {suffix}</span>}</p>
    </div>
  );
}
