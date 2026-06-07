'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Package, DollarSign, Clock, BarChart3 } from 'lucide-react';

export default function DistributorDashboard() {
  const [stats, setStats] = useState(null);
  const [topDrugs, setTopDrugs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const { data } = await api.get('/distributor/dashboard');
      setStats(data.stats);
      setTopDrugs(data.topDrugs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p className="text-gray-500">Yuklanmoqda...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Firma Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<Clock className="w-6 h-6" />}
          label="Bugungi buyurtmalar"
          value={stats?.todayOrders || 0}
          color="bg-blue-100 text-blue-700"
        />
        <StatCard
          icon={<Package className="w-6 h-6" />}
          label="Kutilayotgan"
          value={stats?.pendingOrders || 0}
          color="bg-yellow-100 text-yellow-700"
        />
        <StatCard
          icon={<DollarSign className="w-6 h-6" />}
          label="Umumiy daromad"
          value={`${Number(stats?.totalRevenue || 0).toLocaleString()}`}
          color="bg-green-100 text-green-700"
          suffix="so'm"
        />
        <StatCard
          icon={<BarChart3 className="w-6 h-6" />}
          label="Dorilar soni"
          value={stats?.totalProducts || 0}
          color="bg-purple-100 text-purple-700"
        />
      </div>

      {/* Top selling drugs */}
      <div className="card">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Eng ko'p sotilgan dorilar</h2>
        {topDrugs.length === 0 ? (
          <p className="text-gray-500">Hali sotuvlar yo'q</p>
        ) : (
          <div className="space-y-3">
            {topDrugs.map((drug, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-bold">
                    {idx + 1}
                  </span>
                  <span className="font-medium text-gray-900">{drug.drug_name}</span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{Number(drug.total_qty).toLocaleString()} dona</p>
                  <p className="text-xs text-gray-500">{Number(drug.total_revenue).toLocaleString()} so'm</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, suffix }) {
  return (
    <div className="card">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-3 ${color}`}>
        {icon}
      </div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900">
        {value} {suffix && <span className="text-sm font-normal text-gray-500">{suffix}</span>}
      </p>
    </div>
  );
}
