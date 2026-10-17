const db = require('../config/db');

/**
 * Resolves a single location object or string against COUNTRY, STATE_REGION, and CITY tables
 * and performs strict hierarchy validation.
 */
async function resolveSingleLocation(locInput = {}) {
  let countryVal = (locInput.country || '').trim();
  let stateVal = (locInput.state || '').trim();
  let cityVal = (locInput.city || '').trim();
  let localityVal = (locInput.locality || '').trim();

  // If raw location string exists without separate fields, try fallback parsing
  if (!cityVal && !stateVal && !countryVal && locInput.location_text) {
    const parts = locInput.location_text.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length >= 4) {
      localityVal = parts[0];
      cityVal = parts[1];
      stateVal = parts[2];
      countryVal = parts[3];
    } else if (parts.length === 3) {
      const lastPart = parts[2];
      let isCountry = false;
      try {
        const cCheck = await db.query('SELECT id FROM COUNTRY WHERE LOWER(name) = LOWER(?) OR LOWER(iso_code) = LOWER(?) LIMIT 1', [lastPart, lastPart]);
        if (cCheck && cCheck.length > 0) isCountry = true;
      } catch (_) {}

      if (isCountry) {
        cityVal = parts[0];
        stateVal = parts[1];
        countryVal = parts[2];
      } else {
        localityVal = parts[0];
        cityVal = parts[1];
        stateVal = parts[2];
        countryVal = 'India';
      }
    } else if (parts.length === 2) {
      cityVal = parts[0];
      stateVal = parts[1];
    } else if (parts.length === 1) {
      cityVal = parts[0];
    }
  } else if (!cityVal && !stateVal && !countryVal && locInput.location) {
    const parts = locInput.location.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length >= 4) {
      localityVal = parts[0];
      cityVal = parts[1];
      stateVal = parts[2];
      countryVal = parts[3];
    } else if (parts.length === 3) {
      const lastPart = parts[2];
      let isCountry = false;
      try {
        const cCheck = await db.query('SELECT id FROM COUNTRY WHERE LOWER(name) = LOWER(?) OR LOWER(iso_code) = LOWER(?) LIMIT 1', [lastPart, lastPart]);
        if (cCheck && cCheck.length > 0) isCountry = true;
      } catch (_) {}

      if (isCountry) {
        cityVal = parts[0];
        stateVal = parts[1];
        countryVal = parts[2];
      } else {
        localityVal = parts[0];
        cityVal = parts[1];
        stateVal = parts[2];
        countryVal = 'India';
      }
    } else if (parts.length === 2) {
      cityVal = parts[0];
      stateVal = parts[1];
    } else if (parts.length === 1) {
      cityVal = parts[0];
    }
  }

  let countryObj = null;
  let stateObj = null;
  let cityObj = null;

  // 1. Resolve Country
  if (countryVal) {
    try {
      const cRows = await db.query(
        'SELECT id, name FROM COUNTRY WHERE id = ? OR LOWER(name) = LOWER(?) OR LOWER(iso_code) = LOWER(?) LIMIT 1',
        [countryVal, countryVal, countryVal]
      );
      if (cRows.length > 0) {
        countryObj = cRows[0];
      } else {
        countryObj = { id: null, name: countryVal };
      }
    } catch (_) {
      countryObj = { id: null, name: countryVal };
    }
  }

  // 2. Resolve State / Region
  if (stateVal) {
    try {
      let sRows = [];
      if (countryObj && countryObj.id) {
        sRows = await db.query(
          'SELECT id, country_id, name FROM STATE_REGION WHERE (id = ? OR LOWER(name) = LOWER(?)) AND country_id = ? LIMIT 1',
          [stateVal, stateVal, countryObj.id]
        );
      }
      if (sRows.length === 0) {
        sRows = await db.query(
          'SELECT id, country_id, name FROM STATE_REGION WHERE id = ? OR LOWER(name) = LOWER(?) LIMIT 1',
          [stateVal, stateVal]
        );
      }
      if (sRows.length > 0) {
        stateObj = sRows[0];
        if (countryObj && countryObj.id && stateObj.country_id && String(stateObj.country_id) !== String(countryObj.id)) {
          let isSameCountry = false;
          try {
            const cCheck = await db.query('SELECT name FROM COUNTRY WHERE id = ?', [stateObj.country_id]);
            if (cCheck.length > 0 && cCheck[0].name.toLowerCase() === countryObj.name.toLowerCase()) {
              isSameCountry = true;
            }
          } catch (_) {}

          if (!isSameCountry) {
            return {
              isValid: false,
              message: `Invalid location hierarchy: State "${stateObj.name}" does not belong to Country "${countryObj.name}".`
            };
          }
        }
      } else {
        stateObj = { id: null, country_id: countryObj ? countryObj.id : null, name: stateVal };
      }
    } catch (_) {
      stateObj = { id: null, country_id: countryObj ? countryObj.id : null, name: stateVal };
    }
  }

  // 3. Resolve City
  if (cityVal) {
    try {
      let ctRows = [];
      if (stateObj && stateObj.id) {
        ctRows = await db.query(
          'SELECT id, country_id, state_region_id, name FROM CITY WHERE (id = ? OR LOWER(name) = LOWER(?)) AND state_region_id = ? LIMIT 1',
          [cityVal, cityVal, stateObj.id]
        );
      }
      if (ctRows.length === 0) {
        ctRows = await db.query(
          'SELECT id, country_id, state_region_id, name FROM CITY WHERE id = ? OR LOWER(name) = LOWER(?) LIMIT 1',
          [cityVal, cityVal]
        );
      }
      if (ctRows.length > 0) {
        cityObj = ctRows[0];
        if (stateObj && stateObj.id && cityObj.state_region_id && String(cityObj.state_region_id) !== String(stateObj.id)) {
          let isSameState = false;
          try {
            const sCheck = await db.query('SELECT name FROM STATE_REGION WHERE id = ?', [cityObj.state_region_id]);
            if (sCheck.length > 0 && sCheck[0].name.toLowerCase() === stateObj.name.toLowerCase()) {
              isSameState = true;
            }
          } catch (_) {}

          if (!isSameState) {
            return {
              isValid: false,
              message: `Invalid location hierarchy: City "${cityObj.name}" does not belong to State "${stateObj.name}".`
            };
          }
        }
      } else {
        cityObj = { id: null, state_region_id: stateObj ? stateObj.id : null, name: cityVal };
      }
    } catch (_) {
      cityObj = { id: null, state_region_id: stateObj ? stateObj.id : null, name: cityVal };
    }
  }

  const countryName = countryObj ? countryObj.name : (countryVal || 'Not specified');
  const stateName = stateObj ? stateObj.name : (stateVal || 'Not specified');
  const cityName = cityObj ? cityObj.name : (cityVal || 'Not specified');
  const localityName = localityVal || 'Not specified';

  return {
    isValid: true,
    country: countryName,
    state: stateName,
    city: cityName,
    locality: localityName,
    country_id: countryObj ? countryObj.id : null,
    state_region_id: stateObj ? stateObj.id : null,
    city_id: cityObj ? cityObj.id : null
  };
}

/**
 * Resolves ALL locations for a JOB (supporting multiple hubs/locations)
 * and returns formatted multi-location AI context and hierarchy validation status.
 */
async function resolveAndValidateJobLocation(jobRecord = {}) {
  if (!jobRecord) {
    return {
      isValid: true,
      formattedText: 'Location: Flexible / Not specified',
      locations: []
    };
  }

  let rawLocationItems = [];

  // 1. Try loading from relational JOB_LOCATION table if job ID is available
  if (jobRecord.id) {
    try {
      const dbLocations = await db.query(
        'SELECT * FROM JOB_LOCATION WHERE job_id = ? ORDER BY is_primary DESC, created_at ASC',
        [jobRecord.id]
      );
      if (dbLocations && dbLocations.length > 0) {
        rawLocationItems = dbLocations;
      }
    } catch (_) {}
  }

  // 2. If no JOB_LOCATION rows found, check selected_locations array or location string
  if (rawLocationItems.length === 0) {
    if (Array.isArray(jobRecord.selected_locations) && jobRecord.selected_locations.length > 0) {
      rawLocationItems = jobRecord.selected_locations.map(locStr => ({ location_text: locStr }));
    } else if (jobRecord.location && typeof jobRecord.location === 'string') {
      const parts = jobRecord.location.split(';').map(s => s.trim()).filter(Boolean);
      if (parts.length > 0) {
        rawLocationItems = parts.map(p => ({ location_text: p }));
      }
    }
  }

  // 3. Fallback to primary location fields if still empty
  if (rawLocationItems.length === 0) {
    rawLocationItems = [{
      country: jobRecord.country,
      state: jobRecord.state,
      city: jobRecord.city,
      locality: jobRecord.locality,
      location_text: jobRecord.location
    }];
  }

  // Resolve and validate each location item
  const resolvedLocations = [];
  for (const item of rawLocationItems) {
    const res = await resolveSingleLocation(item);
    if (!res.isValid) {
      return {
        isValid: false,
        message: res.message
      };
    }
    resolvedLocations.push(res);
  }

  if (resolvedLocations.length === 0) {
    return {
      isValid: true,
      formattedText: 'No job location has been specified.',
      locations: []
    };
  }

  // Format multi-location string for Gemini AI context
  const formattedText = resolvedLocations
    .map((loc, idx) => {
      const prefix = resolvedLocations.length > 1 ? `Job Location ${idx + 1}:\n` : '';
      return `${prefix}Country: ${loc.country}\nState/Province/Region: ${loc.state}\nCity: ${loc.city}\nLocality: ${loc.locality}`;
    })
    .join('\n\n');

  return {
    isValid: true,
    formattedText,
    locations: resolvedLocations,
    country: resolvedLocations[0].country,
    state: resolvedLocations[0].state,
    city: resolvedLocations[0].city,
    locality: resolvedLocations[0].locality
  };
}

module.exports = {
  resolveSingleLocation,
  resolveAndValidateJobLocation
};
