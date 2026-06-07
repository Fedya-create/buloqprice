'use client';

import { useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Search, ShoppingCart, Plus } from 'lucide-react';

export default function CatalogPage() {
  const [query, setQuery] = useState('');
  const [drugs, setDrugs] = useState([]);
  const [prices, setPrices] = useState([]);
  const [selectedDrug, setSelectedDrug] = useState(null);
  const [loading, setLoading] = useState(false);

  const searchDrugs = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setPrices([]);
    setSelectedDrug(null);
    try {
      const { data } = await api.get(`/drugs/search?q=${encodeURIComponent(query)}`);
      setDrugs(data.drugs);
    } catch (err) {
      toast.error('Qidiruv xatosi');
    } finally {
      setLoading(false);
    }
  };

  const comparePrices = async (drug) => {
    setSelectedDrug(drug);
    try {
      const { data } = await api.get(`/drugs/${drug.id}/prices`);
      setPrices(data.prices);
    } catch (err) {
      toast.error('Narxlarni yuklashda xatolik');
    }
  };

  const addToCart = async (distributorDrugId) => {
    try {
      await api.post('/cart', { distributorDrugId, quantity: 1 });
      toast.success('Savatchaga qo\'shildi!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Xatolik');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dori qidirish va solishtirish</h1>

      {/* Search bar */}
      <form onSubmit={searchDrugs} className="mb-6">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              className="input-field pl-12"
              placeholder="Dori nomini, shtrix-kodni yoki MXIK kodini kiriting..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Qidirilmoqda...' : 'Qidirish'}
          </button>
        </div>
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Drug list */}
        <div>
          <h2 className="font-bold text-gray-700 mb-3">Topilgan dorilar</h2>
          {drugs.length === 0 ? (
            <div className="card text-center text-gray-500 py-12">
              Dori nomini yoki shtrix-kodni kiriting va qidiring
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {drugs.map((drug) => (
                <div
                  key={drug.id}
                  onClick={() => comparePrices(drug)}
                  className={`card cursor-pointer hover:border-primary-300 transition ${
                    selectedDrug?.id === drug.id ? 'border-primary-500 ring-2 ring-primary-100' : ''
                  }`}
                >
                  <h3 className="font-medium text-gray-900">{drug.name}</h3>
                  <div className="flex gap-4 text-sm text-gray-500 mt-1">
                    {drug.manufacturer && <span>{drug.manufacturer}</span>}
                    {drug.dosage && <span>{drug.dosage}</span>}
                    {drug.form && <span>{drug.form}</span>}
                  </div>
                  {drug.barcode && <p className="text-xs text-gray-400 mt-1">Shtrix-kod: {drug.barcode}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Price comparison */}
        <div>
          <h2 className="font-bold text-gray-700 mb-3">
            {selectedDrug ? `"${selectedDrug.name}" narxlari` : 'Narxlar'}
          </h2>
          {!selectedDrug ? (
            <div className="card text-center text-gray-500 py-12">
              Narxlarni ko'rish uchun chapdan dori tanlang
            </div>
          ) : prices.length === 0 ? (
            <div className="card text-center text-gray-500 py-12">
              Bu dori hozircha hech bir firmada mavjud emas
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {prices.map((price, idx) => (
                <div key={price.id} className="card flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      {idx === 0 && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                          Eng arzon
                        </span>
                      )}
                      <h4 className="font-medium text-gray-900">{price.company_name}</h4>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{price.city}, {price.region}</p>
                    <p className="text-sm text-gray-500">Qoldiq: {price.quantity} dona</p>
                    {price.discount_percent > 0 && (
                      <span className="text-xs text-red-600 font-medium">-{price.discount_percent}% chegirma</span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-900">{Number(price.price).toLocaleString()}</p>
                    <p className="text-xs text-gray-500">so'm</p>
                    <button
                      onClick={() => addToCart(price.id)}
                      className="mt-2 flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      <Plus className="w-4 h-4" /> Savatga
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
