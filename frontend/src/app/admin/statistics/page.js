'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function StatisticsPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/admin/statistics');
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p className="text-gray-500">Yuklanmoqda...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Umumiy Statistika</h1>

      {/* Daily orders chart */}
      <div className="card mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Kunlik buyurtmalar (oxirgi 30 kun)</h2>
        {stats?.dailyOrders?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b text-gray-500">
                  <th className="pb-2 font-medium">Sana</th>
                  <th className="pb-2 font-medium">Buyurtmalar soni</th>
                  <th className="pb-2 font-medium">Daromad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.dailyOrders.map((day, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="py-2">{new Date(day.date).toLocaleDateString('uz-UZ')}</td>
                    <td className="py-2 font-medium">{day.count}</td>
                    <td className="py-2 font-bold text-gray-900">{Number(day.revenue).toLocaleString()} so'm</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">Ma'lumot yo'q</p>
        )}
      </div>

      {/* Region stats */}
      <div className="card">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Hududlar bo'yicha</h2>
        {stats?.regionStats?.length > 0 ? (
          <div className="space-y-3">
            {stats.regionStats.map((region, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-bold">
                    {i + 1}
                  </span>
                  <span className="font-medium text-gray-900">{region.region || 'Noma\'lum'}</span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{Number(region.revenue).toLocaleString()} so'm</p>
                  <p className="text-xs text-gray-500">{region.order_count} buyurtma</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">Ma'lumot yo'q</p>
        )}
      </div>
    </div>
  );
}
