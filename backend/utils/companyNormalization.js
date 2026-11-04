/**
 * Vakancy.in — Company Normalization & Duplicate Prevention Utility
 * Normalizes corporate entity names and web domains for duplicate detection.
 */

function normalizeCompanyName(name) {
  if (!name || typeof name !== 'string') return '';
  let clean = name.toLowerCase().trim();

  // Replace punctuation and symbols with spaces
  clean = clean.replace(/[^a-z0-9\s]/g, ' ');

  // Corporate suffixes to strip (ordered by length descending)
  const suffixes = [
    'private limited',
    'pvt ltd',
    'pvt. ltd.',
    'pvt. ltd',
    'pvt',
    'limited',
    'ltd',
    'inc',
    'incorporated',
    'llc',
    'llp',
    'international',
    'technologies',
    'technology',
    'innovations',
    'innovation',
    'solutions',
    'services',
    'corporation',
    'corp',
    'enterprises',
    'systems',
    'global',
    'group',
    'labs',
    'co',
    'company'
  ];

  for (const suffix of suffixes) {
    const regex = new RegExp(`\\b${suffix.replace('.', '\\.')}\\b`, 'gi');
    clean = clean.replace(regex, ' ');
  }

  return clean.replace(/\s+/g, ' ').trim();
}

function normalizeDomain(input) {
  if (!input || typeof input !== 'string') return null;
  let str = input.trim().toLowerCase();

  // If input contains '@', extract the part after '@'
  if (str.includes('@')) {
    str = str.split('@')[1] || '';
  }

  // Remove protocols
  str = str.replace(/^[a-z]+:\/\//i, '');

  // Remove path, query string, hash
  str = str.split('/')[0].split('?')[0].split('#')[0];

  // Remove port
  str = str.split(':')[0];

  // Remove leading www.
  str = str.replace(/^www\./i, '');

  str = str.trim();
  // Basic validation that it contains at least one dot and valid characters
  if (!str.includes('.') || str.length < 3) return null;

  return str;
}

module.exports = {
  normalizeCompanyName,
  normalizeDomain
};
