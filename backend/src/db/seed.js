require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./pool');

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

    // Seed some sample drugs (from Uzbekistan drug registry)
    const drugs = [
      { name: 'Paracetamol 500mg', name_latin: 'Paracetamolum', manufacturer: 'Nobel Pharmsanoat', country: 'O\'zbekiston', dosage: '500mg', form: 'Tabletka', barcode: '4780005001234', mxik_code: '10612001001' },
      { name: 'Amoksitsillin 500mg', name_latin: 'Amoxicillinum', manufacturer: 'Dentafill Servis', country: 'O\'zbekiston', dosage: '500mg', form: 'Kapsula', barcode: '4780005002345', mxik_code: '10612001002' },
      { name: 'Ibuprofen 400mg', name_latin: 'Ibuprofenum', manufacturer: 'Nobel Pharmsanoat', country: 'O\'zbekiston', dosage: '400mg', form: 'Tabletka', barcode: '4780005003456', mxik_code: '10612001003' },
      { name: 'Aspirin 100mg', name_latin: 'Acidum acetylsalicylicum', manufacturer: 'Bayer', country: 'Germaniya', dosage: '100mg', form: 'Tabletka', barcode: '4780005004567', mxik_code: '10612001004' },
      { name: 'Omeprazol 20mg', name_latin: 'Omeprazolum', manufacturer: 'Gufic', country: 'Hindiston', dosage: '20mg', form: 'Kapsula', barcode: '4780005005678', mxik_code: '10612001005' },
      { name: 'Metformin 850mg', name_latin: 'Metforminum', manufacturer: 'Nobel Pharmsanoat', country: 'O\'zbekiston', dosage: '850mg', form: 'Tabletka', barcode: '4780005006789', mxik_code: '10612001006' },
      { name: 'Losartan 50mg', name_latin: 'Losartanum', manufacturer: 'KRKA', country: 'Sloveniya', dosage: '50mg', form: 'Tabletka', barcode: '4780005007890', mxik_code: '10612001007' },
      { name: 'Diklofenak 75mg', name_latin: 'Diclofenacum', manufacturer: 'Nobel Pharmsanoat', country: 'O\'zbekiston', dosage: '75mg', form: 'Ampula', barcode: '4780005008901', mxik_code: '10612001008' },
      { name: 'Azitromitsin 250mg', name_latin: 'Azithromycinum', manufacturer: 'Nika Pharm', country: 'O\'zbekiston', dosage: '250mg', form: 'Tabletka', barcode: '4780005009012', mxik_code: '10612001009' },
      { name: 'Cefiksim 400mg', name_latin: 'Cefiximum', manufacturer: 'Lupin', country: 'Hindiston', dosage: '400mg', form: 'Tabletka', barcode: '4780005010123', mxik_code: '10612001010' },
      { name: 'Enalapril 10mg', name_latin: 'Enalaprilum', manufacturer: 'KRKA', country: 'Sloveniya', dosage: '10mg', form: 'Tabletka', barcode: '4780005011234', mxik_code: '10612001011' },
      { name: 'Amlodipin 5mg', name_latin: 'Amlodipinum', manufacturer: 'Nobel Pharmsanoat', country: 'O\'zbekiston', dosage: '5mg', form: 'Tabletka', barcode: '4780005012345', mxik_code: '10612001012' },
      { name: 'Prednizolon 5mg', name_latin: 'Prednisolonum', manufacturer: 'Gedeon Richter', country: 'Vengriya', dosage: '5mg', form: 'Tabletka', barcode: '4780005013456', mxik_code: '10612001013' },
      { name: 'Deksametazon 4mg/ml', name_latin: 'Dexamethasonum', manufacturer: 'KRKA', country: 'Sloveniya', dosage: '4mg/ml', form: 'Ampula', barcode: '4780005014567', mxik_code: '10612001014' },
      { name: 'Ketonal 100mg', name_latin: 'Ketoprofenum', manufacturer: 'Lek (Sandoz)', country: 'Sloveniya', dosage: '100mg', form: 'Tabletka', barcode: '4780005015678', mxik_code: '10612001015' },
    ];

    for (const drug of drugs) {
      await client.query(`
        INSERT INTO drugs (name, name_latin, manufacturer, country, dosage, form, barcode, mxik_code)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT DO NOTHING
      `, [drug.name, drug.name_latin, drug.manufacturer, drug.country, drug.dosage, drug.form, drug.barcode, drug.mxik_code]);
    }

    await client.query('COMMIT');
    console.log('✅ Seed data inserted successfully!');
    console.log('   Admin: admin@buloqprice.uz / admin123');
    console.log(`   ${drugs.length} ta dori bazaga qo'shildi`);
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
