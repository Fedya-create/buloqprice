/**
 * BuloqPrice — Davlat dori reestri import skripti
 * 
 * Bu skript O'zbekiston ochiq ma'lumotlar portalidan (data.gov.uz / data.egov.uz)
 * dori vositalari reestri ma'lumotlarini yuklab olib, PostgreSQL bazaga import qiladi.
 * 
 * MANBA VARIANTLARI:
 * 
 * 1. data.gov.uz / data.egov.uz — Ochiq ma'lumotlar portali
 *    URL: https://data.gov.uz yoki https://data.egov.uz
 *    Yo'l: "Sog'liqni saqlash" → "Ro'yxatdan o'tgan dori vositalari reestri"
 *    Formatlar: JSON, CSV, XML
 * 
 * 2. regmed.uz — Davlat dori ro'yxatga olish agentligi
 *    URL: https://regmed.uz
 *    Ma'lumot: Ro'yxatdan o'tgan barcha dorilar
 * 
 * 3. tasnif.soliq.uz — Soliq qo'mitasi MXIK kodlari
 *    API: https://tasnif.soliq.uz/api/cls-api/search/by-name?search_text=paracetamol
 *    Dori guruhi: 10612 (Dori-darmon vositalari)
 * 
 * ISHLATISH:
 * 
 * Variant A) data.gov.uz dan JSON/CSV yuklab import:
 *   1. data.gov.uz ga kiring
 *   2. "Dori vositalari reestri" datasetni toping
 *   3. JSON yoki CSV formatda yuklab oling
 *   4. Faylni backend/data/ papkaga saqlang
 *   5. node src/db/import-drugs.js --file=./data/drugs.json
 * 
 * Variant B) tasnif.soliq.uz API dan import:
 *   node src/db/import-drugs.js --from-mxik
 * 
 * Variant C) CSV fayldan import:
 *   node src/db/import-drugs.js --file=./data/drugs.csv
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./pool');

// ============================================================
// KONFIGURATSIYA
// ============================================================
const args = process.argv.slice(2);
const fileArg = args.find(a => a.startsWith('--file='));
const fromMxik = args.includes('--from-mxik');
const filePath = fileArg ? fileArg.split('=')[1] : null;

// ============================================================
// 1. JSON/CSV FAYLDAN IMPORT
// ============================================================
async function importFromFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  let drugs = [];

  if (ext === '.json') {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    
    // data.gov.uz JSON formati (massiv yoki {data: [...]})
    const items = Array.isArray(data) ? data : (data.data || data.results || data.items || []);
    
    drugs = items.map(item => ({
      name: item.name || item.nomi || item.trade_name || item.naimenovanie || item['Nomi'] || item['Торговое наименование'] || item['Наименование'],
      name_latin: item.name_latin || item.latin_name || item.inn || item['МНН'] || item['INN'],
      generic_name: item.generic_name || item.inn || item.mnn || item['МНН'],
      manufacturer: item.manufacturer || item.ishlab_chiqaruvchi || item.proizvoditel || item['Производитель'] || item['Ishlab chiqaruvchi'],
      country: item.country || item.mamlakat || item.strana || item['Страна'] || item['Mamlakat'],
      dosage: item.dosage || item.doza || item.dozrovka || item['Дозировка'] || item['Doza'],
      form: item.form || item.shakl || item.forma_vypuska || item['Форма выпуска'] || item['Shakli'],
      barcode: item.barcode || item.shtrix_kod || item['Штрих-код'],
      mxik_code: item.mxik_code || item.mxik || item['MXIK'] || item['МХИК'],
      atc_code: item.atc_code || item.atc || item['АТС'] || item['ATC'],
      reg_number: item.reg_number || item.reg_nomer || item['Рег. номер'] || item['Reg raqami'],
      prescription_required: item.prescription_required || item.retsept || false,
    })).filter(d => d.name);

  } else if (ext === '.csv' || ext === '.xlsx' || ext === '.xls') {
    const XLSX = require('xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    // Auto-detect header row (look for row with 4+ text cells)
    const range = XLSX.utils.decode_range(sheet['!ref']);
    let headerRow = 0;
    for (let r = range.s.r; r <= Math.min(range.e.r, 30); r++) {
      let textCellCount = 0;
      for (let c = range.s.c; c <= Math.min(range.e.c, 20); c++) {
        const cell = sheet[XLSX.utils.encode_cell({ r, c })];
        if (cell && cell.t === 's' && cell.v && cell.v.toString().trim().length > 2) {
          textCellCount++;
        }
      }
      if (textCellCount >= 4) { headerRow = r; break; }
    }

    const data = XLSX.utils.sheet_to_json(sheet, { range: headerRow });
    const cols = Object.keys(data[0] || {});
    console.log(`   Header row: ${headerRow + 1}, Ustunlar: ${cols.slice(0, 8).join(', ')}...`);

    drugs = data.map(item => {
      // tasnif.soliq.uz MXIK catalog formati (41000+ dori)
      const mxikNomi = item['MXIK NOMI'] || item['MXIK_NOMI'] || item['mxik_nomi'];
      const brendNomi = item['BREND NOMI'] || item['BREND_NOMI'] || item['brend_nomi'];
      const atributNomi = item['ATRIBUT NOMI'] || item['ATRIBUT_NOMI'] || item['atribut_nomi'];
      const pozitsiyaNomi = item['POZITSIYA NOMI'] || item['POZITSIYA_NOMI'];
      const subpozitsiyaNomi = item['SUBPOZITSIYA NOMI'] || item['SUBPOZITSIYA_NOMI'];

      // Dori nomi: ATRIBUT NOMI (eng to'liq) yoki MXIK NOMI yoki BREND NOMI
      const name = atributNomi || mxikNomi || brendNomi || pozitsiyaNomi
        || item['Nomi'] || item['Наименование'] || item['Торговое наименование'] 
        || item['name'] || item['Name'];
      
      if (!name) return null;

      return {
        name: name.toString().trim(),
        name_latin: null,
        generic_name: brendNomi || pozitsiyaNomi || subpozitsiyaNomi || null,
        manufacturer: item['Производитель'] || item['Ishlab chiqaruvchi'] || item['Manufacturer'] || null,
        country: item['Страна'] || item['Mamlakat'] || item['Country'] || null,
        dosage: null,
        form: null,
        barcode: (item['SHTRIX KODI'] || item['SHTRIX_KODI'] || item['Штрих-код'] || item['Barcode'] || item['shtrix_kodi'] || '').toString().trim() || null,
        mxik_code: (item['MXIK KODI'] || item['MXIK_KODI'] || item['MXIK'] || item['МХИК'] || item['mxik_kodi'] || '').toString().trim() || null,
        atc_code: item['АТС'] || item['ATC'] || null,
        reg_number: item['Рег. номер'] || item['Reg raqami'] || null,
        prescription_required: false,
      };
    }).filter(d => d && d.name && d.name.length > 1);
  } else {
    throw new Error(`Noma'lum fayl formati: ${ext}. .json, .csv, .xlsx qo'llab-quvvatlanadi.`);
  }

  return drugs;
}

// ============================================================
// 2. TASNIF.SOLIQ.UZ API DAN IMPORT (MXIK)
// ============================================================
async function importFromMxik() {
  const https = require('https');

  // Eng ko'p ishlatiladigan dori nomlari bo'yicha qidirish
  const searchTerms = [
    'парацетамол', 'ибупрофен', 'амоксициллин', 'азитромицин',
    'цефтриаксон', 'ципрофлоксацин', 'метронидазол', 'омепразол',
    'метформин', 'лозартан', 'амлодипин', 'эналаприл',
    'аторвастатин', 'преднизолон', 'дексаметазон', 'диклофенак',
    'кетопрофен', 'нимесулид', 'цетиризин', 'лоратадин',
    'амброксол', 'ацетилцистеин', 'бисопролол', 'нифедипин',
    'пантопразол', 'лоперамид', 'домперидон', 'инсулин',
    'витамин', 'железо', 'кальций', 'фолиевая',
    'левофлоксацин', 'доксициклин', 'клотримазол', 'флуконазол',
    'аспирин', 'анальгин', 'нафтизин', 'амброгексал',
    'верошпирон', 'фуросемид', 'индапамид', 'варфарин',
    'клопидогрел', 'нитроглицерин', 'каптоприл', 'валсартан',
    'глибенкламид', 'диазепам', 'феназепам', 'карбамазепин',
    'габапентин', 'трамадол', 'кеторолак', 'мелоксикам',
  ];

  const drugs = [];
  const seen = new Set();

  for (const term of searchTerms) {
    try {
      const response = await new Promise((resolve, reject) => {
        const url = `https://tasnif.soliq.uz/api/cls-api/search/by-name?search_text=${encodeURIComponent(term)}&count=100`;
        const req = https.get(url, { rejectUnauthorized: false, timeout: 10000 }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try { resolve(JSON.parse(data)); }
            catch { resolve(null); }
          });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
      });

      if (response && response.data) {
        for (const item of response.data) {
          // Faqat 10612 (dori-darmon) guruhidagilarni olish
          const code = item.class_code || item.code || '';
          if (code.startsWith('10612') && !seen.has(code)) {
            seen.add(code);
            drugs.push({
              name: item.name_uz || item.name_ru || item.name || item.group_name,
              name_latin: null,
              generic_name: null,
              manufacturer: null,
              country: null,
              dosage: null,
              form: null,
              barcode: null,
              mxik_code: code,
              atc_code: null,
              prescription_required: false,
            });
          }
        }
      }

      process.stdout.write(`  🔍 "${term}" — ${drugs.length} ta topildi\r`);
      // Rate limiting
      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      // Skip errors silently
    }
  }

  console.log(`\n  ✅ tasnif.soliq.uz dan ${drugs.length} ta dori topildi`);
  return drugs;
}

// ============================================================
// 3. BAZAGA SAQLASH (BATCH INSERT - 41000+ dori uchun tez)
// ============================================================
async function saveToDB(drugs) {
  const client = await pool.connect();
  let inserted = 0;
  let skipped = 0;
  const BATCH_SIZE = 500;

  try {
    await client.query('BEGIN');

    // Process in batches
    for (let i = 0; i < drugs.length; i += BATCH_SIZE) {
      const batch = drugs.slice(i, i + BATCH_SIZE);
      
      for (const drug of batch) {
        try {
          const result = await client.query(`
            INSERT INTO drugs (name, name_latin, generic_name, manufacturer, country, dosage, form, barcode, mxik_code, atc_code, prescription_required)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT DO NOTHING
            RETURNING id
          `, [
            drug.name,
            drug.name_latin || null,
            drug.generic_name || null,
            drug.manufacturer || null,
            drug.country || null,
            drug.dosage || null,
            drug.form || null,
            drug.barcode || null,
            drug.mxik_code || null,
            drug.atc_code || null,
            drug.prescription_required || false,
          ]);

          if (result.rows.length > 0) inserted++;
          else skipped++;
        } catch (err) {
          skipped++;
        }
      }

      // Progress
      const progress = Math.min(100, Math.round(((i + batch.length) / drugs.length) * 100));
      process.stdout.write(`\r   💾 Progress: ${progress}% (${i + batch.length}/${drugs.length})`);
    }

    await client.query('COMMIT');
    console.log(''); // New line after progress
    return { inserted, skipped };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log('');
  console.log('🏥 BuloqPrice — Dori bazasi import skripti');
  console.log('='.repeat(50));

  let drugs = [];

  if (filePath) {
    console.log(`\n📄 Fayldan import: ${filePath}`);
    if (!fs.existsSync(filePath)) {
      console.error(`\n❌ Fayl topilmadi: ${filePath}`);
      console.log('\n💡 data.gov.uz dan faylni yuklab oling:');
      console.log('   1. https://data.gov.uz ga kiring');
      console.log('   2. "Dori vositalari" yoki "Farmatsevtika" bo\'limini qidiring');
      console.log('   3. JSON/CSV formatda yuklab, backend/data/ papkaga saqlang');
      console.log('   4. Qayta bajaring: node src/db/import-drugs.js --file=./data/drugs.json');
      process.exit(1);
    }
    drugs = await importFromFile(filePath);

  } else if (fromMxik) {
    console.log('\n🌐 tasnif.soliq.uz API dan import qilinmoqda...');
    console.log('   (Bu 1-2 daqiqa vaqt olishi mumkin)\n');
    drugs = await importFromMxik();

  } else {
    console.log('');
    console.log('📖 ISHLATISH:');
    console.log('');
    console.log('  1️⃣  data.gov.uz dan yuklab olgan fayldan:');
    console.log('     node src/db/import-drugs.js --file=./data/drugs.json');
    console.log('     node src/db/import-drugs.js --file=./data/drugs.csv');
    console.log('     node src/db/import-drugs.js --file=./data/drugs.xlsx');
    console.log('');
    console.log('  2️⃣  tasnif.soliq.uz MXIK API dan (avtomatik, internet kerak):');
    console.log('     node src/db/import-drugs.js --from-mxik');
    console.log('');
    console.log('📌 QAYERDAN OLISH:');
    console.log('');
    console.log('  • data.gov.uz — "Ro\'yxatdan o\'tgan dori vositalari reestri"');
    console.log('    Bo\'lim: Sog\'liqni saqlash → Dori vositalari');
    console.log('');
    console.log('  • tasnif.soliq.uz — MXIK kodlari (dori guruhi: 10612)');
    console.log('    API: /api/cls-api/search/by-name?search_text=...');
    console.log('');
    console.log('  • regmed.uz — Davlat dori reestri (PDF/Excel)');
    console.log('');
    process.exit(0);
  }

  console.log(`\n📊 Jami ${drugs.length} ta dori topildi`);

  if (drugs.length === 0) {
    console.log('⚠️  Dori topilmadi. Fayl formati to\'g\'riligini tekshiring.');
    process.exit(1);
  }

  // Show sample
  console.log('\n📋 Namuna (dastlabki 5 ta):');
  drugs.slice(0, 5).forEach((d, i) => {
    console.log(`   ${i+1}. ${d.name} | ${d.manufacturer || '—'} | ${d.dosage || '—'} | MXIK: ${d.mxik_code || '—'}`);
  });

  // Save to DB
  console.log('\n💾 Bazaga yozilmoqda...');
  const { inserted, skipped } = await saveToDB(drugs);

  console.log('');
  console.log('═'.repeat(50));
  console.log('✅ Import yakunlandi!');
  console.log(`   ➕ Yangi qo'shildi: ${inserted}`);
  console.log(`   ⏭️  O'tkazib yuborildi (dublikat): ${skipped}`);
  console.log(`   📊 Jami qayta ishlandi: ${drugs.length}`);
  console.log('═'.repeat(50));

  await pool.end();
}

main().catch(err => {
  console.error('❌ Import xatosi:', err.message);
  process.exit(1);
});
