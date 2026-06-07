'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Users } from 'lucide-react';

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const { data } = await api.get('/distributor/clients');
      setClients(data.clients);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p className="text-gray-500">Yuklanmoqda...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Mijozlar (Dorixonalar)</h1>

      {clients.length === 0 ? (
        <div className="card text-center py-12">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Hali mijozlar yo'q</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b text-gray-500">
                <th className="pb-3 font-medium">Dorixona nomi</th>
                <th className="pb-3 font-medium">Shahar</th>
                <th className="pb-3 font-medium">Buyurtmalar</th>
                <th className="pb-3 font-medium">Jami xarid</th>
                <th className="pb-3 font-medium">Oxirgi buyurtma</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50">
                  <td className="py-3">
                    <p className="font-medium text-gray-900">{client.name}</p>
                    {client.contact_person && <p className="text-xs text-gray-400">{client.contact_person}</p>}
                  </td>
                  <td className="py-3 text-gray-600">{client.city}, {client.region}</td>
                  <td className="py-3 font-medium">{client.total_orders}</td>
                  <td className="py-3 font-bold text-gray-900">{Number(client.total_spent).toLocaleString()} so'm</td>
                  <td className="py-3 text-gray-500 text-xs">
                    {client.last_order_date ? new Date(client.last_order_date).toLocaleDateString('uz-UZ') : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
