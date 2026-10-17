const db = require('../config/db');

const allowed = [
  'India', 'Algeria', 'Angola', 'Benin', 'Botswana', 'Burkina Faso', 'Burundi', 'Cabo Verde', 'Cameroon', 'Central African Republic', 'Chad', 'Comoros', 'Democratic Republic of the Congo', 'Republic of the Congo', 'Côte d’Ivoire', 'Djibouti', 'Egypt', 'Equatorial Guinea', 'Eritrea', 'Eswatini', 'Ethiopia', 'Gabon', 'Gambia', 'Ghana', 'Guinea', 'Guinea-Bissau', 'Kenya', 'Lesotho', 'Liberia', 'Libya', 'Madagascar', 'Malawi', 'Mali', 'Mauritania', 'Mauritius', 'Morocco', 'Mozambique', 'Namibia', 'Niger', 'Nigeria', 'Rwanda', 'São Tomé and Príncipe', 'Senegal', 'Seychelles', 'Sierra Leone', 'Somalia', 'South Africa', 'South Sudan', 'Sudan', 'Tanzania', 'Togo', 'Tunisia', 'Uganda', 'Zambia', 'Zimbabwe',
  'Bahrain', 'Cyprus', 'Iran', 'Iraq', 'Israel', 'Jordan', 'Kuwait', 'Lebanon', 'Oman', 'Palestine', 'Qatar', 'Saudi Arabia', 'Syria', 'Türkiye', 'United Arab Emirates', 'Yemen',
  'Brunei', 'Cambodia', 'Indonesia', 'Laos', 'Malaysia', 'Myanmar', 'Philippines', 'Singapore', 'Thailand', 'Timor-Leste', 'Vietnam', 'Fiji', 'Papua New Guinea'
];

async function run() {
  await db.initDB();
  
  // 1. Fix mangled names
  const countries = await db.query('SELECT id, name FROM COUNTRY');
  for (const c of countries) {
    if (c.name.includes('Ivoire')) {
      await db.query('UPDATE COUNTRY SET name = ? WHERE id = ?', ['Côte d’Ivoire', c.id]);
    }
    if (c.name.includes('Pr') && c.name.includes('ncipe')) {
      await db.query('UPDATE COUNTRY SET name = ? WHERE id = ?', ['São Tomé and Príncipe', c.id]);
    }
    if (c.name.includes('rkiye')) {
      await db.query('UPDATE COUNTRY SET name = ? WHERE id = ?', ['Türkiye', c.id]);
    }
  }

  // 2. Delete countries not in allowlist
  const allowedLower = allowed.map(a => a.toLowerCase());
  const updatedCountries = await db.query('SELECT id, name FROM COUNTRY');
  
  for (const c of updatedCountries) {
    if (!allowedLower.includes(c.name.toLowerCase())) {
      console.log('Deleting not allowed:', c.name);
      
      // Delete cities
      await db.query('DELETE FROM CITY WHERE state_region_id IN (SELECT id FROM STATE_REGION WHERE country_id = ?)', [c.id]);
      // Delete states
      await db.query('DELETE FROM STATE_REGION WHERE country_id = ?', [c.id]);
      // Delete country
      await db.query('DELETE FROM COUNTRY WHERE id = ?', [c.id]);
    }
  }
  
  console.log('Done cleaning countries!');
  process.exit(0);
}
run().catch(console.error);
