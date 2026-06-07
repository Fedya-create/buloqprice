'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Upload, Search, X, FileSpreadsheet, CheckCircle, AlertTriangle, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';

export default function InventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);

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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ombor va narxlar</h1>
        <button
          onClick={() => setShowUploadModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Upload className="w-5 h-5" />
          Excel yuklash
        </button>
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
            Hali dori qo'shilmagan. "Excel yuklash" tugmasini bosing.
          </p>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false);
            fetchInventory();
          }}
        />
      )}
    </div>
  );
}

// ===== UPLOAD MODAL COMPONENT =====
function UploadModal({ onClose, onSuccess }) {
  const [step, setStep] = useState(1); // 1: file select, 2: mapping & preview, 3: result
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null); // parsed preview data from backend
  const [mapping, setMapping] = useState({});
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  // Required fields for mapping
  const requiredFields = [
    { key: 'name', label: 'Dori nomi', required: true },
    { key: 'price', label: 'Narx', required: true },
    { key: 'quantity', label: 'Qoldiq / Soni', required: false },
    { key: 'barcode', label: 'Shtrix-kod (barcode)', required: false },
    { key: 'mxik', label: 'MXIK kodi', required: false },
    { key: 'expiry', label: 'Yaroqlilik muddati', required: false },
    { key: 'batch', label: 'Partiya raqami', required: false },
  ];

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = async (selectedFile) => {
    if (!selectedFile) return;
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(xlsx|xls)$/i)) {
      toast.error('Faqat Excel fayllar (.xlsx, .xls) qabul qilinadi');
      return;
    }
    setFile(selectedFile);

    // Upload to get preview (parse only, don't save)
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const { data } = await api.post('/distributor/preview-pricelist', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setPreview(data);
      // Auto-map columns if possible
      autoMapColumns(data.columns);
      setStep(2);
    } catch (err) {
      toast.error('Faylni o\'qishda xatolik');
    }
  };

  const autoMapColumns = (columns) => {
    const newMapping = {};
    const lowerCols = columns.map(c => c.toLowerCase());

    // Auto-detect column mappings
    const namePatterns = ['nomi', 'name', 'dori nomi', 'tovar nomi', 'наименование', 'препарат', 'номи', 'наименования'];
    const pricePatterns = ['narx', 'price', 'цена', 'summa', 'narxi', 'цена со скидкой'];
    const qtyPatterns = ['soni', 'quantity', 'qty', 'qoldiq', 'остаток', 'miqdor', 'количество', 'кол-во', 'кол'];
    const barcodePatterns = ['shtrix', 'barcode', 'bar-code', 'штрих', 'ean', 'код'];
    const mxikPatterns = ['mxik', 'мхик', 'ikpu', 'икпу'];
    const expiryPatterns = ['yaroqlilik', 'expiry', 'срок', 'muddati', 'exp', 'годност'];
    const batchPatterns = ['partiya', 'batch', 'серия', 'lot'];

    const findMatch = (patterns) => {
      for (let i = 0; i < lowerCols.length; i++) {
        for (const p of patterns) {
          if (lowerCols[i].includes(p)) return columns[i];
        }
      }
      return '';
    };

    newMapping.name = findMatch(namePatterns);
    newMapping.price = findMatch(pricePatterns);
    newMapping.quantity = findMatch(qtyPatterns);
    newMapping.barcode = findMatch(barcodePatterns);
    newMapping.mxik = findMatch(mxikPatterns);
    newMapping.expiry = findMatch(expiryPatterns);
    newMapping.batch = findMatch(batchPatterns);

    setMapping(newMapping);
  };

  const handleUpload = async () => {
    if (!mapping.name || !mapping.price) {
      toast.error('Dori nomi va Narx ustunlarini tanlang');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mapping', JSON.stringify(mapping));

    try {
      const { data } = await api.post('/distributor/upload-pricelist', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(data.results);
      setStep(3);
    } catch (err) {
      toast.error('Yuklashda xatolik yuz berdi');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Excel narx-noma yuklash</h2>
            <p className="text-sm text-gray-500">
              {step === 1 && 'Faylni tanlang'}
              {step === 2 && 'Ustunlarni moslashtiring'}
              {step === 3 && 'Natija'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Step indicator */}
            <div className="flex items-center gap-1">
              {[1, 2, 3].map((s) => (
                <div key={s} className={`w-2.5 h-2.5 rounded-full ${s === step ? 'bg-primary-600' : s < step ? 'bg-primary-300' : 'bg-gray-200'}`} />
              ))}
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Step 1: File Select */}
          {step === 1 && (
            <div>
              <div
                className={`border-2 border-dashed rounded-xl p-12 text-center transition ${
                  dragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <FileSpreadsheet className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Excel faylni bu yerga tashlang
                </h3>
                <p className="text-gray-500 mb-6">yoki</p>
                <label className="btn-primary cursor-pointer inline-flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Faylni tanlang
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => handleFileSelect(e.target.files[0])}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-gray-400 mt-4">.xlsx yoki .xls formatdagi fayllar qabul qilinadi (10MB gacha)</p>
              </div>

              <div className="mt-6 card bg-blue-50 border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">Excel fayl qanday bo'lishi kerak?</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Birinchi qatorda ustun nomlari bo'lishi kerak</li>
                  <li>• <strong>Dori nomi</strong> va <strong>Narx</strong> ustunlari majburiy</li>
                  <li>• Shtrix-kod yoki MXIK kodi bo'lsa, dori avtomatik bazaga bog'lanadi</li>
                  <li>• 1C, Apteka+, yoki boshqa dasturlardan eksport qilingan fayllar ishlaydi</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 2: Mapping & Preview */}
          {step === 2 && preview && (
            <div>
              {/* File info */}
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg mb-6">
                <FileSpreadsheet className="w-8 h-8 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900">{file?.name}</p>
                  <p className="text-sm text-gray-500">{preview.totalRows} qator topildi</p>
                </div>
              </div>

              {/* Column Mapping */}
              <h3 className="font-bold text-gray-900 mb-3">Ustunlarni moslashtiring</h3>
              <p className="text-sm text-gray-500 mb-4">
                Har bir maydon uchun Excel'dagi mos ustunni tanlang. Tizim avtomatik aniqlashga harakat qildi.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {requiredFields.map((field) => (
                  <div key={field.key} className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700 mb-1">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    <select
                      className="input-field text-sm"
                      value={mapping[field.key] || ''}
                      onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                    >
                      <option value="">— Tanlanmagan —</option>
                      {preview.columns.map((col) => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {/* Preview table */}
              <h3 className="font-bold text-gray-900 mb-3">Ko'rib chiqish (dastlabki 5 qator)</h3>
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      {preview.columns.map((col) => (
                        <th key={col} className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">
                          {col}
                          {Object.values(mapping).includes(col) && (
                            <span className="ml-1 text-primary-600">
                              ({requiredFields.find(f => mapping[f.key] === col)?.label})
                            </span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {preview.sampleRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        {preview.columns.map((col) => (
                          <td key={col} className="px-3 py-2 text-gray-700 whitespace-nowrap">
                            {row[col] !== undefined ? String(row[col]).slice(0, 30) : '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Step 3: Result */}
          {step === 3 && result && (
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Yuklash yakunlandi!</h3>
              <p className="text-gray-500 mb-8">Faylingiz muvaffaqiyatli qayta ishlandi</p>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="card text-center py-4">
                  <p className="text-2xl font-bold text-gray-900">{result.totalRows}</p>
                  <p className="text-xs text-gray-500">Jami qatorlar</p>
                </div>
                <div className="card text-center py-4 bg-green-50 border-green-200">
                  <p className="text-2xl font-bold text-green-700">{result.matched}</p>
                  <p className="text-xs text-green-600">Bazaga bog'landi</p>
                </div>
                <div className="card text-center py-4 bg-yellow-50 border-yellow-200">
                  <p className="text-2xl font-bold text-yellow-700">{result.unmatched}</p>
                  <p className="text-xs text-yellow-600">Topilmadi</p>
                </div>
              </div>

              {/* Unmatched items */}
              {result.unmatchedItems && result.unmatchedItems.length > 0 && (
                <div className="text-left">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    <h4 className="font-medium text-gray-900">Bazada topilmagan dorilar:</h4>
                  </div>
                  <div className="max-h-48 overflow-y-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-gray-600 font-medium">Nomi</th>
                          <th className="px-3 py-2 text-left text-gray-600 font-medium">Shtrix-kod</th>
                          <th className="px-3 py-2 text-left text-gray-600 font-medium">Narx</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {result.unmatchedItems.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2 text-gray-900">{item.name || '—'}</td>
                            <td className="px-3 py-2 text-gray-500">{item.barcode || '—'}</td>
                            <td className="px-3 py-2 text-gray-500">{item.price ? Number(item.price).toLocaleString() : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Bu dorilar bazamizda hali yo'q. Admin qo'shganidan keyin avtomatik bog'lanadi.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
          <div>
            {step === 2 && (
              <button onClick={() => setStep(1)} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-4 h-4" /> Orqaga
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {step === 3 ? (
              <button onClick={onSuccess} className="btn-primary">
                Tayyor
              </button>
            ) : step === 2 ? (
              <button
                onClick={handleUpload}
                disabled={uploading || !mapping.name || !mapping.price}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Yuklanmoqda...
                  </>
                ) : (
                  <>
                    Yuklash <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
