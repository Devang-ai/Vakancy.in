const db = require('../config/db');
const { Country, State, City } = require('country-state-city');
const { v4: uuidv4 } = require('uuid');

const targetCountries = require('../config/locationCountries');

const nameMapping = {
  'cabo verde': 'cape verde',
  'côte d’ivoire': 'ivory coast',
  'eswatini': 'swaziland',
  'são tomé and príncipe': 'sao tome and principe',
  'palestine': 'palestinian territory',
  'türkiye': 'turkey',
  'timor-leste': 'east timor',
  'republic of the congo': 'congo',
  'micronesia': 'micronesia, federated states of'
};

async function run() {
  await db.initDB();
  console.log('Fetching all DB locations to memory...');
  
  const dbCountries = await db.query('SELECT id, name FROM COUNTRY');
  const dbStates = await db.query('SELECT id, country_id, name FROM STATE_REGION');
  const dbCities = await db.query('SELECT id, state_region_id, name FROM CITY');
  
  const countryMap = new Map(dbCountries.map(c => [c.name.toLowerCase().trim(), c.id]));
  // Fallback for 'png' existing record
  const pngMatch = dbCountries.find(c => c.name.toLowerCase() === 'png');
  if (pngMatch) countryMap.set('papua new guinea', pngMatch.id);

  const stateMap = new Map(dbStates.map(s => [`${s.country_id}_${s.name.toLowerCase().trim()}`, s.id]));
  const cityMap = new Map(dbCities.map(c => [`${c.state_region_id}_${c.name.toLowerCase().trim()}`, c.id]));
  
  const allLibCountries = Country.getAllCountries();

  let insertedCountries = 0;
  let insertedStates = 0;
  let insertedCities = 0;

  for (const tName of targetCountries) {
    // 1. Find library country
    const searchName = nameMapping[tName.toLowerCase()] || tName.toLowerCase();
    let libC = allLibCountries.find(c => c.name.toLowerCase() === searchName);
    if (!libC) {
      libC = allLibCountries.find(c => c.name.toLowerCase().includes(searchName));
    }
    
    if (!libC) {
      console.log('CRITICAL: Library data missing for:', tName);
      continue;
    }

    // 2. Resolve Country ID
    let countryId = countryMap.get(tName.toLowerCase());
    if (!countryId) {
      countryId = uuidv4();
      await db.query('INSERT INTO COUNTRY (id, name, created_at) VALUES (?, ?, NOW())', [countryId, tName]);
      countryMap.set(tName.toLowerCase(), countryId);
      insertedCountries++;
    }

    // 3. States
    const libStates = State.getStatesOfCountry(libC.isoCode);
    for (const libS of libStates) {
      const stateKey = `${countryId}_${libS.name.toLowerCase().trim()}`;
      let stateId = stateMap.get(stateKey);
      if (!stateId) {
        stateId = uuidv4();
        await db.query('INSERT INTO STATE_REGION (id, country_id, name, created_at) VALUES (?, ?, ?, NOW())', [stateId, countryId, libS.name]);
        stateMap.set(stateKey, stateId);
        insertedStates++;
      }

      // 4. Cities
      const libCities = City.getCitiesOfState(libC.isoCode, libS.isoCode);
      
      // Batch inserts for cities for performance
      if (libCities.length > 0) {
        let cityValues = [];
        let cityParams = [];
        for (const libCity of libCities) {
          const cityKey = `${stateId}_${libCity.name.toLowerCase().trim()}`;
          if (!cityMap.has(cityKey)) {
            const cityId = uuidv4();
            cityValues.push('(?, ?, ?)');
            cityParams.push(cityId, stateId, libCity.name);
            cityMap.set(cityKey, cityId);
            insertedCities++;
          }
        }
        
        if (cityValues.length > 0) {
          // split into chunks of 1000
          const chunkSize = 1000;
          for (let i = 0; i < cityValues.length; i += chunkSize) {
            const chunkValues = cityValues.slice(i, i + chunkSize);
            const chunkParams = cityParams.slice(i * 3, (i + chunkSize) * 3);
            const sql = 'INSERT INTO CITY (id, state_region_id, name) VALUES ' + chunkValues.join(',');
            await db.query(sql, chunkParams);
          }
        }
      }
    }
    console.log(`Processed ${tName} -> ${libStates.length} states`);
  }

  console.log('\n=========================================');
  console.log('VALIDATION REPORT');
  console.log('=========================================');
  console.log(`Inserted Countries: ${insertedCountries}`);
  console.log(`Inserted States: ${insertedStates}`);
  console.log(`Inserted Cities: ${insertedCities}`);
  
  const cCount = await db.query('SELECT COUNT(*) as c FROM COUNTRY');
  const sCount = await db.query('SELECT COUNT(*) as c FROM STATE_REGION');
  const ciCount = await db.query('SELECT COUNT(*) as c FROM CITY');
  
  console.log(`Total Countries in DB: ${cCount[0].c}`);
  console.log(`Total States in DB: ${sCount[0].c}`);
  console.log(`Total Cities in DB: ${ciCount[0].c}`);

  const zeroStates = await db.query('SELECT c.name FROM COUNTRY c LEFT JOIN STATE_REGION s ON c.id = s.country_id GROUP BY c.id HAVING COUNT(s.id) = 0');
  console.log(`Countries with 0 states: ${zeroStates.length}`, zeroStates.map(z => z.name));
  
  const zeroCities = await db.query('SELECT s.name FROM STATE_REGION s LEFT JOIN CITY c ON s.id = c.state_region_id GROUP BY s.id HAVING COUNT(c.id) = 0 LIMIT 10');
  console.log(`States with 0 cities (sample of 10): ${zeroCities.length}`, zeroCities.map(z => z.name));
  
  process.exit(0);
}

run().catch(console.error);
