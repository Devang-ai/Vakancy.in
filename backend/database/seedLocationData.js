const { LOCATION_HIERARCHY } = require('./locationData');

// Alias mapping to handle common name variations (e.g. UAE <-> United Arab Emirates)
const COUNTRY_ALIASES = {
  'uae': 'United Arab Emirates',
  'united arab emirates': 'United Arab Emirates',
  'usa': 'United States',
  'us': 'United States',
  'united states': 'United States',
  'united states / canada': 'United States',
  'uk': 'United Kingdom',
  'united kingdom': 'United Kingdom',
  'kdr': 'Democratic Republic of the Congo',
  'dr congo': 'Democratic Republic of the Congo'
};

const COUNTRY_ISO_CODES = {
  'India': { iso2: 'IN', iso3: 'IND' },
  'United Arab Emirates': { iso2: 'AE', iso3: 'ARE' },
  'Saudi Arabia': { iso2: 'SA', iso3: 'SAU' },
  'Qatar': { iso2: 'QA', iso3: 'QAT' },
  'Kuwait': { iso2: 'KW', iso3: 'KWT' },
  'Bahrain': { iso2: 'BH', iso3: 'BHR' },
  'Oman': { iso2: 'OM', iso3: 'OMN' },
  'Singapore': { iso2: 'SG', iso3: 'SGP' },
  'Malaysia': { iso2: 'MY', iso3: 'MYS' },
  'Indonesia': { iso2: 'ID', iso3: 'IDN' },
  'Kenya': { iso2: 'KE', iso3: 'KEN' },
  'South Africa': { iso2: 'ZA', iso3: 'ZAF' },
  'Nigeria': { iso2: 'NG', iso3: 'NGA' },
  'United Kingdom': { iso2: 'GB', iso3: 'GBR' },
  'United States': { iso2: 'US', iso3: 'USA' },
  'Canada': { iso2: 'CA', iso3: 'CAN' },
  'Germany': { iso2: 'DE', iso3: 'DEU' },
  'France': { iso2: 'FR', iso3: 'FRA' },
  'Netherlands': { iso2: 'NL', iso3: 'NLD' },
  'Australia': { iso2: 'AU', iso3: 'AUS' }
};

// Generate deterministic IDs for relational seed records
const generateSlugId = (type, str) => {
  const clean = String(str).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return `${type}-${clean}`;
};

// Build relational records from LOCATION_HIERARCHY
const buildRelationalSeedData = () => {
  const countries = [];
  const states = [];
  const cities = [];

  Object.keys(LOCATION_HIERARCHY).forEach((countryName) => {
    const countryId = generateSlugId('ctr', countryName);
    const codes = COUNTRY_ISO_CODES[countryName] || { iso2: '', iso3: '' };

    countries.push({
      id: countryId,
      name: countryName,
      iso_code: codes.iso2,
      iso3_code: codes.iso3,
      status: 1
    });

    const stateMap = LOCATION_HIERARCHY[countryName] || {};
    Object.keys(stateMap).forEach((stateName) => {
      const stateId = generateSlugId('st', `${countryName}-${stateName}`);

      states.push({
        id: stateId,
        country_id: countryId,
        country_name: countryName,
        name: stateName,
        type: 'State/Region',
        code: stateName.slice(0, 3).toUpperCase(),
        status: 1
      });

      const cityList = stateMap[stateName] || [];
      cityList.forEach((cityName) => {
        const cityId = generateSlugId('ct', `${countryName}-${stateName}-${cityName}`);

        cities.push({
          id: cityId,
          country_id: countryId,
          country_name: countryName,
          state_region_id: stateId,
          state_name: stateName,
          name: cityName,
          status: 1
        });
      });
    });
  });

  return { countries, states, cities };
};

const relationalSeed = buildRelationalSeedData();

// Helper function to resolve canonical country name from alias or ID
const resolveCanonicalCountryName = (countryInput) => {
  if (!countryInput) return null;
  const inputTrimmed = String(countryInput).trim();
  const lower = inputTrimmed.toLowerCase();

  // Check direct match
  if (LOCATION_HIERARCHY[inputTrimmed]) return inputTrimmed;

  // Check alias
  if (COUNTRY_ALIASES[lower]) return COUNTRY_ALIASES[lower];

  // Check case-insensitive match against canonical list
  const matched = Object.keys(LOCATION_HIERARCHY).find(c => c.toLowerCase() === lower);
  if (matched) return matched;

  // Check ID match
  const matchedById = relationalSeed.countries.find(c => c.id === inputTrimmed);
  if (matchedById) return matchedById.name;

  return inputTrimmed;
};

module.exports = {
  COUNTRY_ALIASES,
  relationalSeed,
  resolveCanonicalCountryName
};
