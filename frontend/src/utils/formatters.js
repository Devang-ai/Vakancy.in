/**
 * Reusable formatting utilities for internationalization / globalization.
 * Supports multi-market recruitment (India, Middle East / GCC, Africa, Southeast Asia, Europe, USA, UK).
 */

/**
 * Currency configuration metadata
 */
export const CURRENCY_MAP = {
  INR: { symbol: '₹', name: 'Indian Rupee', locale: 'en-IN', defaultPeriod: '/year', useLakhs: true },
  USD: { symbol: '$', name: 'US Dollar', locale: 'en-US', defaultPeriod: '/year', useLakhs: false },
  EUR: { symbol: '€', name: 'Euro', locale: 'en-IE', defaultPeriod: '/year', useLakhs: false },
  GBP: { symbol: '£', name: 'British Pound', locale: 'en-GB', defaultPeriod: '/year', useLakhs: false },
  AED: { symbol: 'AED', name: 'UAE Dirham', locale: 'en-AE', defaultPeriod: '/year', useLakhs: false },
  SAR: { symbol: 'SAR', name: 'Saudi Riyal', locale: 'en-SA', defaultPeriod: '/year', useLakhs: false },
  QAR: { symbol: 'QAR', name: 'Qatari Riyal', locale: 'en-QA', defaultPeriod: '/year', useLakhs: false },
  KWD: { symbol: 'KWD', name: 'Kuwaiti Dinar', locale: 'en-KW', defaultPeriod: '/year', useLakhs: false },
  BHD: { symbol: 'BHD', name: 'Bahraini Dinar', locale: 'en-BH', defaultPeriod: '/year', useLakhs: false },
  OMR: { symbol: 'OMR', name: 'Omani Rial', locale: 'en-OM', defaultPeriod: '/year', useLakhs: false },
  SGD: { symbol: 'SGD', name: 'Singapore Dollar', locale: 'en-SG', defaultPeriod: '/year', useLakhs: false },
  MYR: { symbol: 'MYR', name: 'Malaysian Ringgit', locale: 'en-MY', defaultPeriod: '/year', useLakhs: false },
  IDR: { symbol: 'IDR', name: 'Indonesian Rupiah', locale: 'id-ID', defaultPeriod: '/year', useLakhs: false },
  ZAR: { symbol: 'ZAR', name: 'South African Rand', locale: 'en-ZA', defaultPeriod: '/year', useLakhs: false },
  NGN: { symbol: 'NGN', name: 'Nigerian Naira', locale: 'en-NG', defaultPeriod: '/year', useLakhs: false }
};

/**
 * Formats a salary range or single amount cleanly based on currency and period.
 * 
 * @param {number|string|{min?: number, max?: number, amount?: number}} salary - Salary number or object
 * @param {string} [currency='INR'] - Currency ISO code (INR, USD, AED, SAR, EUR, etc.)
 * @param {string} [period='/year'] - Period denominator ('/year', '/month', '/hr')
 * @returns {string} Formatted salary string (e.g., "₹45L - ₹65L/year", "$140,000 - $180,000/year", "AED 250,000/year")
 */
export function formatSalary(salary, currency = 'INR', period = '/year') {
  if (!salary && salary !== 0) return 'Competitive compensation';

  // If already a pre-formatted display string like "₹45L - ₹65L/yr", return it safely
  if (typeof salary === 'string' && (salary.includes('₹') || salary.includes('$') || salary.includes('AED') || salary.includes('SAR') || salary.includes('€') || salary.includes('£'))) {
    return salary;
  }

  const currConfig = CURRENCY_MAP[currency.toUpperCase()] || { symbol: currency, useLakhs: false, locale: 'en-US' };
  const sym = currConfig.symbol;
  const isPrefix = sym === '₹' || sym === '$' || sym === '€' || sym === '£';

  const formatSingle = (val) => {
    const num = Number(val);
    if (isNaN(num)) return val;

    if (currConfig.useLakhs) {
      if (num >= 10000000) {
        return `${isPrefix ? sym : ''}${(num / 10000000).toFixed(1).replace(/\.0$/, '')} Cr${!isPrefix ? ' ' + sym : ''}`;
      }
      if (num >= 100000) {
        return `${isPrefix ? sym : ''}${(num / 100000).toFixed(0)}L${!isPrefix ? ' ' + sym : ''}`;
      }
    }

    // Standard thousands formatting
    const formattedNum = num.toLocaleString(currConfig.locale || 'en-US');
    return isPrefix ? `${sym}${formattedNum}` : `${sym} ${formattedNum}`;
  };

  if (typeof salary === 'object') {
    if (salary.min != null && salary.max != null) {
      return `${formatSingle(salary.min)} - ${formatSingle(salary.max)}${period ? period : ''}`;
    }
    if (salary.amount != null) {
      return `${formatSingle(salary.amount)}${period ? period : ''}`;
    }
  }

  return `${formatSingle(salary)}${period ? period : ''}`;
}

/**
 * Strips category/industry suffix from company names.
 * e.g. "Zepto • Quick Commerce" -> "Zepto"
 *      "Razorpay — Fintech Payments" -> "Razorpay"
 */
export function cleanCompanyName(name) {
  if (!name || typeof name !== 'string') return '';
  return name
    .replace(/\s*[—•–-]\s*(Quick Commerce|Enterprise|AdTech|FinTech|Fintech|Logistics|Supply Chain|Payments|Infrastructure|Healthcare|B2B SaaS|EdTech|AI & ML).*$/i, '')
    .trim();
}

/**
 * Standard phone country codes for global selection
 */
export const GLOBAL_DIAL_CODES = [
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '+974', country: 'Qatar', flag: '🇶🇦' },
  { code: '+965', country: 'Kuwait', flag: '🇰🇼' },
  { code: '+973', country: 'Bahrain', flag: '🇧🇭' },
  { code: '+968', country: 'Oman', flag: '🇴🇲' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬' },
  { code: '+60', country: 'Malaysia', flag: '🇲🇾' },
  { code: '+62', country: 'Indonesia', flag: '🇮🇩' },
  { code: '+254', country: 'Kenya', flag: '🇰🇪' },
  { code: '+27', country: 'South Africa', flag: '🇿🇦' },
  { code: '+234', country: 'Nigeria', flag: '🇳🇬' },
  { code: '+44', country: 'United Kingdom', flag: '🇬🇧' },
  { code: '+1', country: 'United States / Canada', flag: '🇺🇸' },
  { code: '+49', country: 'Germany', flag: '🇩🇪' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+31', country: 'Netherlands', flag: '🇳🇱' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' }
];
