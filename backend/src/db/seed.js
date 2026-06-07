require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./pool');

/**
 * BuloqPrice - Dori bazasi seed
 * 
 * Dori ma'lumotlari manbalari:
 * 1. regmed.uz — O'zbekistonda ro'yxatdan o'tgan dorilar davlat reestri
 * 2. tasnif.soliq.uz — MXIK kodlari (Soliq qo'mitasi API)
 *    API: https://tasnif.soliq.uz/api/cls-api/search/by-name?search_text=paracetamol
 *    npm: mxik-js (https://github.com/azabroflovski/mxik-js)
 * 3. AslBelgi (aslbelgi.uz) — shtrix-kod tekshirish tizimi
 * 
 * MXIK dori guruhlari: 10612 — Dori-darmon vositalari
 */

// O'zbekistonda eng ko'p ishlatiladigan dorilar
const drugs = [
  // === ANALGETIKLAR va ANTIPRETIKLAR ===
  { name: 'Paracetamol 500mg tabletka', name_latin: 'Paracetamolum', generic_name: 'Paracetamol', manufacturer: 'Nobel Pharmsanoat', country: "O'zbekiston", dosage: '500mg', form: 'Tabletka', barcode: '4780005001001', mxik_code: '10612001001000', atc_code: 'N02BE01' },
  { name: 'Paracetamol 200mg tabletka', name_latin: 'Paracetamolum', generic_name: 'Paracetamol', manufacturer: 'Nika Pharm', country: "O'zbekiston", dosage: '200mg', form: 'Tabletka', barcode: '4780005001002', mxik_code: '10612001001001', atc_code: 'N02BE01' },
  { name: 'Ibuprofen 400mg tabletka', name_latin: 'Ibuprofenum', generic_name: 'Ibuprofen', manufacturer: 'Nobel Pharmsanoat', country: "O'zbekiston", dosage: '400mg', form: 'Tabletka', barcode: '4780005001003', mxik_code: '10612001002000', atc_code: 'M01AE01' },
  { name: 'Ibuprofen 200mg tabletka', name_latin: 'Ibuprofenum', generic_name: 'Ibuprofen', manufacturer: 'Dentafill', country: "O'zbekiston", dosage: '200mg', form: 'Tabletka', barcode: '4780005001004', mxik_code: '10612001002001', atc_code: 'M01AE01' },
  { name: 'Analgin 500mg tabletka', name_latin: 'Metamizolum', generic_name: 'Metamizol', manufacturer: 'Nobel Pharmsanoat', country: "O'zbekiston", dosage: '500mg', form: 'Tabletka', barcode: '4780005001005', mxik_code: '10612001003000', atc_code: 'N02BB02' },
  { name: 'Aspirin 100mg tabletka', name_latin: 'Acidum acetylsalicylicum', generic_name: 'Atsetilsalitsil kislota', manufacturer: 'Bayer', country: 'Germaniya', dosage: '100mg', form: 'Tabletka', barcode: '4780005001006', mxik_code: '10612001004000', atc_code: 'B01AC06' },
  { name: 'Aspirin 500mg tabletka', name_latin: 'Acidum acetylsalicylicum', generic_name: 'Atsetilsalitsil kislota', manufacturer: 'Bayer', country: 'Germaniya', dosage: '500mg', form: 'Tabletka', barcode: '4780005001007', mxik_code: '10612001004001', atc_code: 'N02BA01' },
  { name: 'Ketonal 100mg tabletka', name_latin: 'Ketoprofenum', generic_name: 'Ketoprofen', manufacturer: 'Lek (Sandoz)', country: 'Sloveniya', dosage: '100mg', form: 'Tabletka', barcode: '4780005001008', mxik_code: '10612001005000', atc_code: 'M01AE03' },
  { name: 'Diklofenak 75mg ampula', name_latin: 'Diclofenacum', generic_name: 'Diklofenak', manufacturer: 'Nobel Pharmsanoat', country: "O'zbekiston", dosage: '75mg/3ml', form: 'Ampula', barcode: '4780005001009', mxik_code: '10612001006000', atc_code: 'M01AB05' },
  { name: 'Diklofenak 50mg tabletka', name_latin: 'Diclofenacum', generic_name: 'Diklofenak', manufacturer: 'KRKA', country: 'Sloveniya', dosage: '50mg', form: 'Tabletka', barcode: '4780005001010', mxik_code: '10612001006001', atc_code: 'M01AB05' },
  { name: 'Nimesulid 100mg tabletka', name_latin: 'Nimesulidum', generic_name: 'Nimesulid', manufacturer: 'Nobel Pharmsanoat', country: "O'zbekiston", dosage: '100mg', form: 'Tabletka', barcode: '4780005001011', mxik_code: '10612001007000', atc_code: 'M01AX17' },

  // === ANTIBIOTIKLAR ===
  { name: 'Amoksitsillin 500mg kapsula', name_latin: 'Amoxicillinum', generic_name: 'Amoksitsillin', manufacturer: 'Dentafill Servis', country: "O'zbekiston", dosage: '500mg', form: 'Kapsula', barcode: '4780005002001', mxik_code: '10612002001000', atc_code: 'J01CA04' },
  { name: 'Amoksitsillin 250mg suspenziya', name_latin: 'Amoxicillinum', generic_name: 'Amoksitsillin', manufacturer: 'Nobel Pharmsanoat', country: "O'zbekiston", dosage: '250mg/5ml', form: 'Suspenziya', barcode: '4780005002002', mxik_code: '10612002001001', atc_code: 'J01CA04' },
  { name: 'Azitromitsin 500mg tabletka', name_latin: 'Azithromycinum', generic_name: 'Azitromitsin', manufacturer: 'Nika Pharm', country: "O'zbekiston", dosage: '500mg', form: 'Tabletka', barcode: '4780005002003', mxik_code: '10612002002000', atc_code: 'J01FA10' },
  { name: 'Azitromitsin 250mg kapsula', name_latin: 'Azithromycinum', generic_name: 'Azitromitsin', manufacturer: 'Nobel Pharmsanoat', country: "O'zbekiston", dosage: '250mg', form: 'Kapsula', barcode: '4780005002004', mxik_code: '10612002002001', atc_code: 'J01FA10' },
  { name: 'Cefiksim 400mg tabletka', name_latin: 'Cefiximum', generic_name: 'Cefiksim', manufacturer: 'Lupin', country: 'Hindiston', dosage: '400mg', form: 'Tabletka', barcode: '4780005002005', mxik_code: '10612002003000', atc_code: 'J01DD08' },
  { name: 'Seftriakson 1g flakon', name_latin: 'Ceftriaxonum', generic_name: 'Seftriakson', manufacturer: 'Nobel Pharmsanoat', country: "O'zbekiston", dosage: '1g', form: 'Flakon (in\'ektsiya)', barcode: '4780005002006', mxik_code: '10612002004000', atc_code: 'J01DD04' },
  { name: 'Siprofloksatsin 500mg tabletka', name_latin: 'Ciprofloxacinum', generic_name: 'Siprofloksatsin', manufacturer: 'Nobel Pharmsanoat', country: "O'zbekiston", dosage: '500mg', form: 'Tabletka', barcode: '4780005002007', mxik_code: '10612002005000', atc_code: 'J01MA02' },
  { name: 'Levofloksatsin 500mg tabletka', name_latin: 'Levofloxacinum', generic_name: 'Levofloksatsin', manufacturer: 'KRKA', country: 'Sloveniya', dosage: '500mg', form: 'Tabletka', barcode: '4780005002008', mxik_code: '10612002006000', atc_code: 'J01MA12' },
  { name: 'Metronidazol 250mg tabletka', name_latin: 'Metronidazolum', generic_name: 'Metronidazol', manufacturer: 'Nobel Pharmsanoat', country: "O'zbekiston", dosage: '250mg', form: 'Tabletka', barcode: '4780005002009', mxik_code: '10612002007000', atc_code: 'J01XD01' },
  { name: 'Doksitsiklin 100mg kapsula', name_latin: 'Doxycyclinum', generic_name: 'Doksitsiklin', manufacturer: 'Nobel Pharmsanoat', country: "O'zbekiston", dosage: '100mg', form: 'Kapsula', barcode: '4780005002010', mxik_code: '10612002008000', atc_code: 'J01AA02' },
  { name: 'Amoksiklav 625mg tabletka', name_latin: 'Amoxicillinum + Acidum clavulanicum', generic_name: 'Amoksitsillin/Klavulan kislota', manufacturer: 'Lek (Sandoz)', country: 'Sloveniya', dosage: '500mg/125mg', form: 'Tabletka', barcode: '4780005002011', mxik_code: '10612002009000', atc_code: 'J01CR02' },

  // === KARDIOVASKULYAR (Yurak-qon tomir) ===
  { name: 'Enalapril 10mg tabletka', name_latin: 'Enalaprilum', generic_name: 'Enalapril', manufacturer: 'KRKA', country: 'Sloveniya', dosage: '10mg', form: 'Tabletka', barcode: '4780005003001', mxik_code: '10612003001000', atc_code: 'C09AA02' },
  { name: 'Enalapril 20mg tabletka', name_latin: 'Enalaprilum', generic_name: 'Enalapril', manufacturer: 'Nobel Pharmsanoat', country: "O'zbekiston", dosage: '20mg', form: 'Tabletka', barcode: '4780005003002', mxik_code: '10612003001001', atc_code: 'C09AA02' },
  { name: 'Losartan 50mg tabletka', name_latin: 'Losartanum', generic_name: 'Losartan', manufacturer: 'KRKA', country: 'Sloveniya', dosage: '50mg', form: 'Tabletka', barcode: '4780005003003', mxik_code: '10612003002000', atc_code: 'C09CA01' },
  { name: 'Amlodipin 5mg tabletka', name_latin: 'Amlodipinum', generic_name: 'Amlodipin', manufacturer: 'Nobel Pharmsanoat', country: "O'zbekiston", dosage: '5mg', form: 'Tabletka', barcode: '4780005003004', mxik_code: '10612003003000', atc_code: 'C08CA01' },
  { name: 'Amlodipin 10mg tabletka', name_latin: 'Amlodipinum', generic_name: 'Amlodipin', manufacturer: 'KRKA', country: 'Sloveniya', dosage: '10mg', form: 'Tabletka', barcode: '4780005003005', mxik_code: '10612003003001', atc_code: 'C08CA01' },
  { name: 'Bisoprolol 5mg tabletka', name_latin: 'Bisoprololum', generic_name: 'Bisoprolol', manufacturer: 'Merck', country: 'Germaniya', dosage: '5mg', form: 'Tabletka', barcode: '4780005003006', mxik_code: '10612003004000', atc_code: 'C07AB07' },
  { name: 'Atorvastatin 20mg tabletka', name_latin: 'Atorvastatinum', generic_name: 'Atorvastatin', manufacturer: 'KRKA', country: 'Sloveniya', dosage: '20mg', form: 'Tabletka', barcode: '4780005003007', mxik_code: '10612003005000', atc_code: 'C10AA05' },
  { name: 'Klopidogrel 75mg tabletka', name_latin: 'Clopidogrelum', generic_name: 'Klopidogrel', manufacturer: 'KRKA', country: 'Sloveniya', dosage: '75mg', form: 'Tabletka', barcode: '4780005003008', mxik_code: '10612003006000', atc_code: 'B01AC04' },
  { name: 'Nifedipin 20mg tabletka', name_latin: 'Nifedipinum', generic_name: 'Nifedipin', manufacturer: 'Bayer', country: 'Germaniya', dosage: '20mg', form: 'Tabletka', barcode: '4780005003009', mxik_code: '10612003007000', atc_code: 'C08CA05' },

  // === OSHQOZON-ICHAK TIZIMI ===
  { name: 'Omeprazol 20mg kapsula', name_latin: 'Omeprazolum', generic_name: 'Omeprazol', manufacturer: 'Gufic', country: 'Hindiston', dosage: '20mg', form: 'Kapsula', barcode: '4780005004001', mxik_code: '10612004001000', atc_code: 'A02BC01' },
  { name: 'Pantoprazol 40mg tabletka', name_latin: 'Pantoprazolum', generic_name: 'Pantoprazol', manufacturer: 'KRKA', country: 'Sloveniya', dosage: '40mg', form: 'Tabletka', barcode: '4780005004002', mxik_code: '10612004002000', atc_code: 'A02BC02' },
  { name: 'Ranitidin 150mg tabletka', name_latin: 'Ranitidinum', generic_name: 'Ranitidin', manufacturer: 'Nobel Pharmsanoat', country: "O'zbekiston", dosage: '150mg', form: 'Tabletka', barcode: '4780005004003', mxik_code: '10612004003000', atc_code: 'A02BA02' },
  { name: 'Smekta 3g paket', name_latin: 'Smectite', generic_name: 'Diosmektit', manufacturer: 'Ipsen', country: 'Frantsiya', dosage: '3g', form: 'Kukun', barcode: '4780005004004', mxik_code: '10612004004000', atc_code: 'A07BC05' },
  { name: 'Loperamid 2mg kapsula', name_latin: 'Loperamidum', generic_name: 'Loperamid', manufacturer: 'Nobel Pharmsanoat', country: "O'zbekiston", dosage: '2mg', form: 'Kapsula', barcode: '4780005004005', mxik_code: '10612004005000', atc_code: 'A07DA03' },
  { name: 'Almagel 170ml suspenziya', name_latin: 'Algeldratum + Magnesii hydroxydum', generic_name: 'Almagel', manufacturer: 'Balkanpharma', country: 'Bolgariya', dosage: '170ml', form: 'Suspenziya', barcode: '4780005004006', mxik_code: '10612004006000', atc_code: 'A02AD01' },
  { name: 'Domperidon 10mg tabletka', name_latin: 'Domperidonum', generic_name: 'Domperidon', manufacturer: 'Nobel Pharmsanoat', country: "O'zbekiston", dosage: '10mg', form: 'Tabletka', barcode: '4780005004007', mxik_code: '10612004007000', atc_code: 'A03FA03' },

  // === DIABET (Qandli diabet) ===
  { name: 'Metformin 850mg tabletka', name_latin: 'Metforminum', generic_name: 'Metformin', manufacturer: 'Nobel Pharmsanoat', country: "O'zbekiston", dosage: '850mg', form: 'Tabletka', barcode: '4780005005001', mxik_code: '10612005001000', atc_code: 'A10BA02' },
  { name: 'Metformin 500mg tabletka', name_latin: 'Metforminum', generic_name: 'Metformin', manufacturer: 'KRKA', country: 'Sloveniya', dosage: '500mg', form: 'Tabletka', barcode: '4780005005002', mxik_code: '10612005001001', atc_code: 'A10BA02' },
  { name: 'Glibenklamid 5mg tabletka', name_latin: 'Glibenclamidum', generic_name: 'Glibenklamid', manufacturer: 'Berlin-Chemie', country: 'Germaniya', dosage: '5mg', form: 'Tabletka', barcode: '4780005005003', mxik_code: '10612005002000', atc_code: 'A10BB01' },
  { name: 'Insulin Aktrapid 10ml flakon', name_latin: 'Insulinum', generic_name: 'Insulin (odam)', manufacturer: 'Novo Nordisk', country: 'Daniya', dosage: '100IU/ml', form: 'Flakon', barcode: '4780005005004', mxik_code: '10612005003000', atc_code: 'A10AB01' },

  // === ALLERGIYA va ANTIGISTARINLAR ===
  { name: 'Setirizin 10mg tabletka', name_latin: 'Cetirizinum', generic_name: 'Setirizin', manufacturer: 'Nobel Pharmsanoat', country: "O'zbekiston", dosage: '10mg', form: 'Tabletka', barcode: '4780005006001', mxik_code: '10612006001000', atc_code: 'R06AE07' },
  { name: 'Loratadin 10mg tabletka', name_latin: 'Loratadinum', generic_name: 'Loratadin', manufacturer: 'Nobel Pharmsanoat', country: "O'zbekiston", dosage: '10mg', form: 'Tabletka', barcode: '4780005006002', mxik_code: '10612006002000', atc_code: 'R06AX13' },
  { name: 'Suprastin 25mg tabletka', name_latin: 'Chloropyramine', generic_name: 'Xloropiramin', manufacturer: 'Egis', country: 'Vengriya', dosage: '25mg', form: 'Tabletka', barcode: '4780005006003', mxik_code: '10612006003000', atc_code: 'R06AC03' },
  { name: 'Prednizolon 5mg tabletka', name_latin: 'Prednisolonum', generic_name: 'Prednizolon', manufacturer: 'Gedeon Richter', country: 'Vengriya', dosage: '5mg', form: 'Tabletka', barcode: '4780005006004', mxik_code: '10612006004000', atc_code: 'H02AB06' },
  { name: 'Deksametazon 4mg/ml ampula', name_latin: 'Dexamethasonum', generic_name: 'Deksametazon', manufacturer: 'KRKA', country: 'Sloveniya', dosage: '4mg/ml', form: 'Ampula', barcode: '4780005006005', mxik_code: '10612006005000', atc_code: 'H02AB02' },

  // === VITAMINLAR ===
  { name: 'Askorbin kislota 500mg tabletka', name_latin: 'Acidum ascorbicum', generic_name: 'Vitamin C', manufacturer: 'Nobel Pharmsanoat', country: "O'zbekiston", dosage: '500mg', form: 'Tabletka', barcode: '4780005007001', mxik_code: '10612007001000', atc_code: 'A11GA01' },
  { name: 'Vitamin D3 1000IU tabletka', name_latin: 'Cholecalciferolum', generic_name: 'Vitamin D3', manufacturer: 'Solgar', country: 'AQSH', dosage: '1000IU', form: 'Tabletka', barcode: '4780005007002', mxik_code: '10612007002000', atc_code: 'A11CC05' },
  { name: 'Foliy kislota 1mg tabletka', name_latin: 'Acidum folicum', generic_name: 'Vitamin B9', manufacturer: 'Nobel Pharmsanoat', country: "O'zbekiston", dosage: '1mg', form: 'Tabletka', barcode: '4780005007003', mxik_code: '10612007003000', atc_code: 'B03BB01' },
  { name: 'Ferum temir 100mg tabletka', name_latin: 'Ferri hydroxidi polymaltosas', generic_name: 'Temir preparati', manufacturer: 'Vifor', country: 'Shveytsariya', dosage: '100mg', form: 'Tabletka', barcode: '4780005007004', mxik_code: '10612007004000', atc_code: 'B03AB05' },

  // === YO'TAL va SHAMOLLASH ===
  { name: 'Ambroksol 30mg tabletka', name_latin: 'Ambroxolum', generic_name: 'Ambroksol', manufacturer: 'Nobel Pharmsanoat', country: "O'zbekiston", dosage: '30mg', form: 'Tabletka', barcode: '4780005008001', mxik_code: '10612008001000', atc_code: 'R05CB06' },
  { name: 'ACC 200mg kukun', name_latin: 'Acetylcysteinum', generic_name: 'Atsetilsistein', manufacturer: 'Sandoz', country: 'Sloveniya', dosage: '200mg', form: 'Kukun', barcode: '4780005008002', mxik_code: '10612008002000', atc_code: 'R05CB01' },
  { name: 'Naftizin 0.1% tomchi', name_latin: 'Naphazolinum', generic_name: 'Nafazolin', manufacturer: 'Nobel Pharmsanoat', country: "O'zbekiston", dosage: '0.1%', form: 'Burun tomchisi', barcode: '4780005008003', mxik_code: '10612008003000', atc_code: 'R01AA08' },
  { name: 'Faringosept tabletka', name_latin: 'Ambazonum', generic_name: 'Ambazon', manufacturer: 'Terapia', country: 'Ruminiya', dosage: '10mg', form: 'So\'rib eriydigan tabletka', barcode: '4780005008004', mxik_code: '10612008004000', atc_code: 'R02AA01' },

  // === ASAB TIZIMI ===
  { name: 'Diazepam 5mg tabletka', name_latin: 'Diazepamum', generic_name: 'Diazepam', manufacturer: 'Gedeon Richter', country: 'Vengriya', dosage: '5mg', form: 'Tabletka', barcode: '4780005009001', mxik_code: '10612009001000', atc_code: 'N05BA01', prescription_required: true },
  { name: 'Fenibut 250mg tabletka', name_latin: 'Phenibutum', generic_name: 'Fenibut', manufacturer: 'Olainfarm', country: 'Latviya', dosage: '250mg', form: 'Tabletka', barcode: '4780005009002', mxik_code: '10612009002000', atc_code: 'N05BX' },
  { name: 'Glitsin 100mg tabletka', name_latin: 'Glycinum', generic_name: 'Glitsin', manufacturer: 'Biotiki', country: 'Rossiya', dosage: '100mg', form: 'Tabletka', barcode: '4780005009003', mxik_code: '10612009003000', atc_code: 'N06BX' },

  // === TASHQI VOSITALAR (maz, krem) ===
  { name: 'Levomekol maz 40g', name_latin: 'Chloramphenicolum + Methyluracilum', generic_name: 'Levomekol', manufacturer: 'Nika Pharm', country: "O'zbekiston", dosage: '40g', form: 'Maz', barcode: '4780005010001', mxik_code: '10612010001000', atc_code: 'D06AX' },
  { name: 'Voltaren gel 50g', name_latin: 'Diclofenacum', generic_name: 'Diklofenak gel', manufacturer: 'Novartis', country: 'Shveytsariya', dosage: '1%/50g', form: 'Gel', barcode: '4780005010002', mxik_code: '10612010002000', atc_code: 'M02AA15' },
  { name: 'Klotrimazol krem 20g', name_latin: 'Clotrimazolum', generic_name: 'Klotrimazol', manufacturer: 'Nobel Pharmsanoat', country: "O'zbekiston", dosage: '1%/20g', form: 'Krem', barcode: '4780005010003', mxik_code: '10612010003000', atc_code: 'D01AC01' },
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 12);
    await client.query(`
      INSERT INTO users (email, password_hash, role, status) 
      VALUES ('admin@buloqprice.uz', $1, 'admin', 'approved')
      ON CONFLICT (email) DO NOTHING
    `, [adminPassword]);

    // Seed drugs
    let inserted = 0;
    for (const drug of drugs) {
      const result = await client.query(`
        INSERT INTO drugs (name, name_latin, generic_name, manufacturer, country, dosage, form, barcode, mxik_code, atc_code, prescription_required)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT DO NOTHING
        RETURNING id
      `, [drug.name, drug.name_latin, drug.generic_name, drug.manufacturer, drug.country, drug.dosage, drug.form, drug.barcode, drug.mxik_code, drug.atc_code, drug.prescription_required || false]);
      
      if (result.rows.length > 0) inserted++;
    }

    await client.query('COMMIT');
    console.log('✅ Seed data inserted successfully!');
    console.log(`   Admin: admin@buloqprice.uz / admin123`);
    console.log(`   ${inserted} ta dori bazaga qo'shildi (jami ${drugs.length} ta)`);
    console.log('');
    console.log('📋 Dori manbalari:');
    console.log('   - tasnif.soliq.uz (MXIK kodlari) — API: /api/cls-api/search/by-name?search_text=...');
    console.log('   - regmed.uz (Davlat dori reestri)');
    console.log('   - aslbelgi.uz (Shtrix-kod tekshirish)');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
