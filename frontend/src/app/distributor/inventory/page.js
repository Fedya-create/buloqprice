'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Upload, Search, Edit3 } from 'lucide-react';

export default function InventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchInventory();
  }, [search]);

  const fetchInventory = async () => {
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const { data } = await api.get(`/distributor/inventory${params}`);
      setInventory(data.inventory);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data } = await api.post('/distributor/upload-pricelist', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(`Yuklandi! ${data.results.matched} ta mos keldi, ${data.results.unmatched} ta topilmadi`);
      fetchInventory();
    } catch (err) {
      toast.error('Fayl yuklashda xatolik');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ombor va narxlar</h1>
        <label className="btn-primary cursor-pointer flex items-center gap-2">
          <Upload className="w-5 h-5" />
          {uploading ? 'Yuklanmoqda...' : 'Excel yuklash'}
          <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
        </label>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          className="input-field pl-12"
          placeholder="Dori nomi bo'yicha qidirish..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Excel format info */}
      <div className="card bg-blue-50 border-blue-200 mb-6">
        <p className="text-sm text-blue-800">
          <strong>Excel fayl formati:</strong> Ustun nomlari - "Nomi" (yoki "name"), "Narx" (yoki "price"), 
          "Soni" (yoki "Qoldiq"), "Shtrix-kod" (yoki "barcode"), "MXIK", "Yaroqlilik", "Partiya"
        </p>
      </div>

      {/* Inventory table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b text-gray-500">
              <th className="pb-3 font-medium">Dori nomi</th>
              <th className="pb-3 font-medium">Dozaj</th>
              <th className="pb-3 font-medium">Narx (so'm)</th>
              <th className="pb-3 font-medium">Qoldiq</th>
              <th className="pb-3 font-medium">Holat</th>
              <th className="pb-3 font-medium">Yangilangan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {inventory.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="py-3">
                  <p className="font-medium text-gray-900">{item.drug_name}</p>
                  {item.barcode && <p className="text-xs text-gray-400">{item.barcode}</p>}
                </td>
                <td className="py-3 text-gray-600">{item.dosage} {item.form}</td>
                <td className="py-3 font-bold text-gray-900">{Number(item.price).toLocaleString()}</td>
                <td className="py-3">
                  <span className={item.quantity > 0 ? 'text-green-600' : 'text-red-600'}>
                    {item.quantity}
                  </span>
                </td>
                <td className="py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    item.is_available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {item.is_available ? 'Faol' : 'Nofaol'}
                  </span>
                </td>
                <td className="py-3 text-gray-500 text-xs">
                  {new Date(item.updated_at).toLocaleDateString('uz-UZ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {inventory.length === 0 && !loading && (
          <p className="text-center text-gray-500 py-8">
            Hali dori qo'shilmagan. Excel fayl yuklang yoki qo'lda qo'shing.
          </p>
        )}
      </div>
    </div>
  );
}
