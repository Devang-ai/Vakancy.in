import React, { useState, useEffect, useRef } from 'react';

/**
 * DependentLocationSelector
 * Centralized, dependent location selector for Vakancy.in
 * Country -> State / Province / Region -> City -> Locality (Free-text)
 */
export default function DependentLocationSelector({
  country = '',
  state = '',
  city = '',
  locality = '',
  country_id = '',
  state_region_id = '',
  city_id = '',
  onChangeLocation,
  errors = {},
  disabled = false,
  showLocality = true,
  layout = 'grid'
}) {
  const [countriesList, setCountriesList] = useState([]);
  const [statesList, setStatesList] = useState([]);
  const [citiesList, setCitiesList] = useState([]);

  const [isFetchingStates, setIsFetchingStates] = useState(false);
  const [isFetchingCities, setIsFetchingCities] = useState(false);

  const [countrySearch, setCountrySearch] = useState('');
  const [stateSearch, setStateSearch] = useState('');
  const [citySearch, setCitySearch] = useState('');

  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  const countryRef = useRef(null);
  const stateRef = useRef(null);
  const cityRef = useRef(null);

  // Normalize string/object props
  const countryNameStr = typeof country === 'object' && country !== null ? (country.name || '') : country;
  const countryIdStr = country_id || (typeof country === 'object' && country !== null ? country.id : (countryNameStr === 'India' ? 'ctr-india' : ''));

  const stateNameStr = typeof state === 'object' && state !== null ? (state.name || '') : state;
  const stateIdStr = state_region_id || (typeof state === 'object' && state !== null ? state.id : '');

  const cityNameStr = typeof city === 'object' && city !== null ? (city.name || '') : city;
  const cityIdStr = city_id || (typeof city === 'object' && city !== null ? city.id : '');

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (countryRef.current && !countryRef.current.contains(e.target)) {
        setShowCountryDropdown(false);
      }
      if (stateRef.current && !stateRef.current.contains(e.target)) {
        setShowStateDropdown(false);
      }
      if (cityRef.current && !cityRef.current.contains(e.target)) {
        setShowCityDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch countries list on mount
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const res = await fetch('/api/locations/countries');
        const data = await res.json();
        if (data.success && Array.isArray(data.countries)) {
          const normalized = data.countries.map(c => typeof c === 'string' ? { id: c, name: c } : c);
          setCountriesList(normalized);
        }
      } catch (_) {
        setCountriesList([]);
      }
    };
    fetchCountries();
  }, []);

  // Fetch states when country or country_id changes
  useEffect(() => {
    let canceled = false;
    if (!countryNameStr && !countryIdStr) {
      setStatesList([]);
      setCitiesList([]);
      return;
    }

    const fetchStates = async () => {
      setIsFetchingStates(true);
      try {
        const queryParam = countryIdStr
          ? `country_id=${encodeURIComponent(countryIdStr)}`
          : `country=${encodeURIComponent(countryNameStr)}`;
        const res = await fetch(`/api/locations/states?${queryParam}`);
        const data = await res.json();
        if (!canceled) {
          if (data.success && Array.isArray(data.states)) {
            const normalized = data.states.map(s => (typeof s === 'string' ? { id: s, name: s } : s));
            setStatesList(normalized);
          } else {
            setStatesList([]);
          }
        }
      } catch (_) {
        if (!canceled) setStatesList([]);
      } finally {
        if (!canceled) setIsFetchingStates(false);
      }
    };

    fetchStates();
    return () => { canceled = true; };
  }, [countryNameStr, countryIdStr]);

  // Fetch cities when state or state_region_id changes
  useEffect(() => {
    let canceled = false;
    if ((!stateNameStr && !stateIdStr) || (!countryNameStr && !countryIdStr)) {
      setCitiesList([]);
      return;
    }

    const fetchCities = async () => {
      setIsFetchingCities(true);
      try {
        const stateParam = stateIdStr
          ? `state_region_id=${encodeURIComponent(stateIdStr)}`
          : `state=${encodeURIComponent(stateNameStr)}`;
        const countryParam = countryIdStr
          ? `country_id=${encodeURIComponent(countryIdStr)}`
          : `country=${encodeURIComponent(countryNameStr)}`;
        const res = await fetch(`/api/locations/cities?${stateParam}&${countryParam}`);
        const data = await res.json();
        if (!canceled) {
          if (data.success && Array.isArray(data.cities)) {
            const normalized = data.cities.map(c => (typeof c === 'string' ? { id: c, name: c } : c));
            setCitiesList(normalized);
          } else {
            setCitiesList([]);
          }
        }
      } catch (_) {
        if (!canceled) setCitiesList([]);
      } finally {
        if (!canceled) setIsFetchingCities(false);
      }
    };

    fetchCities();
    return () => { canceled = true; };
  }, [countryNameStr, countryIdStr, stateNameStr, stateIdStr]);

  // Handle Country Selection
  const handleCountryChange = (newCountryVal) => {
    const matchedObj = countriesList.find(c => c.name === newCountryVal || c.id === newCountryVal);
    const newId = matchedObj ? matchedObj.id : (newCountryVal === 'India' ? 'ctr-india' : '');
    const newName = matchedObj ? matchedObj.name : newCountryVal;

    onChangeLocation({
      country: newName,
      country_id: newId,
      state: '',
      state_region_id: '',
      city: '',
      city_id: '',
      locality: ''
    });
    setStateSearch('');
    setCitySearch('');
  };

  // Handle State Selection
  const handleStateSelect = (stateObj) => {
    const selectedName = typeof stateObj === 'string' ? stateObj : stateObj.name;
    const selectedId = typeof stateObj === 'string' ? stateObj : (stateObj.id || '');

    onChangeLocation({
      country: countryNameStr,
      country_id: countryIdStr,
      state: selectedName,
      state_region_id: selectedId,
      city: '',
      city_id: '',
      locality: ''
    });
    setStateSearch('');
    setShowStateDropdown(false);
    setCitySearch('');
  };

  // Handle City Selection
  const handleCitySelect = (cityObj) => {
    const selectedName = typeof cityObj === 'string' ? cityObj : cityObj.name;
    const selectedId = typeof cityObj === 'string' ? cityObj : (cityObj.id || '');

    onChangeLocation({
      country: countryNameStr,
      country_id: countryIdStr,
      state: stateNameStr,
      state_region_id: stateIdStr,
      city: selectedName,
      city_id: selectedId,
      locality
    });
    setCitySearch('');
    setShowCityDropdown(false);
  };

  // Handle Locality Change
  const handleLocalityChange = (e) => {
    onChangeLocation({
      country: countryNameStr,
      country_id: countryIdStr,
      state: stateNameStr,
      state_region_id: stateIdStr,
      city: cityNameStr,
      city_id: cityIdStr,
      locality: e.target.value
    });
  };

  const filteredCountries = countriesList.filter(c => {
    if (!c) return false;
    const name = typeof c === 'string' ? c : (c.name || '');
    return name.toLowerCase().includes((countrySearch || '').toLowerCase());
  });

  const filteredStates = statesList.filter(s => {
    if (!s) return false;
    const name = typeof s === 'string' ? s : (s.name || '');
    return name.toLowerCase().includes((stateSearch || '').toLowerCase());
  });

  const filteredCities = citiesList.filter(c => {
    if (!c) return false;
    const name = typeof c === 'string' ? c : (c.name || '');
    return name.toLowerCase().includes((citySearch || '').toLowerCase());
  });

  const gridColsClass = showLocality
    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'
    : 'grid grid-cols-1 sm:grid-cols-3 gap-4';

  return (
    <div className={layout === 'grid' ? gridColsClass : 'flex flex-col gap-4'}>
      {/* 1. COUNTRY */}
      <div className="flex flex-col gap-1 relative" ref={countryRef}>
        <label className="text-xs font-bold text-[#0b1c30]">
          Country <span className="text-[#ba1a1a] font-bold">*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={countryNameStr || countrySearch}
            disabled={disabled}
            placeholder="Search country..."
            onFocus={() => setShowCountryDropdown(true)}
            onChange={(e) => {
              setCountrySearch(e.target.value);
              setShowCountryDropdown(true);
              if (countryNameStr) {
                handleCountryChange('');
              }
            }}
            className={`w-full px-3.5 py-2.5 bg-[#eff4ff] text-[#0b1c30] rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-[#00288e] outline-none border ${
              errors.country ? 'border-[#ba1a1a]' : 'border-transparent'
            } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
          />
          {countryNameStr && !disabled && (
            <button
              type="button"
              onClick={() => {
                handleCountryChange('');
                setCountrySearch('');
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              &times;
            </button>
          )}
        </div>

        {/* Country Autocomplete Dropdown */}
        {showCountryDropdown && !disabled && (
          <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg z-30 divide-y divide-slate-100">
            {filteredCountries.length > 0 ? (
              filteredCountries.map((cObj) => {
                const name = typeof cObj === 'string' ? cObj : cObj.name;
                return (
                  <button
                    key={typeof cObj === 'string' ? cObj : (cObj.id || cObj.name)}
                    type="button"
                    onClick={() => {
                      handleCountryChange(name);
                      setShowCountryDropdown(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs font-medium hover:bg-[#eff4ff] transition-colors ${
                      countryNameStr === name ? 'bg-[#eff4ff] text-[#00288e] font-bold' : 'text-[#0b1c30]'
                    }`}
                  >
                    {name}
                  </button>
                );
              })
            ) : (
              <div className="px-3.5 py-2.5 text-xs text-slate-400 italic">No countries found</div>
            )}
          </div>
        )}
        {errors.country && <span className="text-[11px] text-[#ba1a1a]">{errors.country}</span>}
      </div>

      {/* 2. STATE / PROVINCE / REGION */}
      <div className="flex flex-col gap-1 relative" ref={stateRef}>
        <label className="text-xs font-bold text-[#0b1c30]">
          State / Province / Region <span className="text-[#ba1a1a] font-bold">*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={stateNameStr || stateSearch}
            disabled={disabled || !countryNameStr || isFetchingStates}
            placeholder={
              !countryNameStr
                ? 'Select country first...'
                : isFetchingStates
                ? 'Loading states...'
                : 'Search state / region...'
            }
            onFocus={() => {
              if (countryNameStr) setShowStateDropdown(true);
            }}
            onChange={(e) => {
              setStateSearch(e.target.value);
              setShowStateDropdown(true);
              if (stateNameStr) {
                onChangeLocation({ country: countryNameStr, country_id: countryIdStr, state: '', state_region_id: '', city: '', city_id: '', locality: '' });
              }
            }}
            className={`w-full px-3.5 py-2.5 bg-[#eff4ff] text-[#0b1c30] rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-[#00288e] outline-none border ${
              errors.state ? 'border-[#ba1a1a]' : 'border-transparent'
            } ${(!countryNameStr || disabled) ? 'opacity-60 cursor-not-allowed' : ''}`}
          />
          {stateNameStr && !disabled && (
            <button
              type="button"
              onClick={() => {
                onChangeLocation({ country: countryNameStr, country_id: countryIdStr, state: '', state_region_id: '', city: '', city_id: '', locality: '' });
                setStateSearch('');
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              &times;
            </button>
          )}
        </div>

        {/* State Autocomplete Dropdown */}
        {showStateDropdown && countryNameStr && !disabled && (
          <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg z-30 divide-y divide-slate-100">
            {filteredStates.length > 0 ? (
              filteredStates.map((stObj) => {
                const name = typeof stObj === 'string' ? stObj : stObj.name;
                return (
                  <button
                    key={typeof stObj === 'string' ? stObj : (stObj.id || stObj.name)}
                    type="button"
                    onClick={() => handleStateSelect(stObj)}
                    className={`w-full text-left px-3.5 py-2 text-xs font-medium hover:bg-[#eff4ff] transition-colors ${
                      stateNameStr === name ? 'bg-[#eff4ff] text-[#00288e] font-bold' : 'text-[#0b1c30]'
                    }`}
                  >
                    {name}
                  </button>
                );
              })
            ) : (
              <div className="px-3.5 py-2.5 text-xs text-slate-400 italic">No states found</div>
            )}
          </div>
        )}
        {errors.state && <span className="text-[11px] text-[#ba1a1a]">{errors.state}</span>}
      </div>

      {/* 3. CITY */}
      <div className="flex flex-col gap-1 relative" ref={cityRef}>
        <label className="text-xs font-bold text-[#0b1c30]">
          City <span className="text-[#ba1a1a] font-bold">*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={cityNameStr || citySearch}
            disabled={disabled || !stateNameStr || isFetchingCities}
            placeholder={
              !stateNameStr
                ? 'Select state first...'
                : isFetchingCities
                ? 'Loading cities...'
                : 'Search city...'
            }
            onFocus={() => {
              if (stateNameStr) setShowCityDropdown(true);
            }}
            onChange={(e) => {
              setCitySearch(e.target.value);
              setShowCityDropdown(true);
              if (cityNameStr) {
                onChangeLocation({ country: countryNameStr, country_id: countryIdStr, state: stateNameStr, state_region_id: stateIdStr, city: '', city_id: '', locality });
              }
            }}
            className={`w-full px-3.5 py-2.5 bg-[#eff4ff] text-[#0b1c30] rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-[#00288e] outline-none border ${
              errors.city ? 'border-[#ba1a1a]' : 'border-transparent'
            } ${(!stateNameStr || disabled) ? 'opacity-60 cursor-not-allowed' : ''}`}
          />
          {cityNameStr && !disabled && (
            <button
              type="button"
              onClick={() => {
                onChangeLocation({ country: countryNameStr, country_id: countryIdStr, state: stateNameStr, state_region_id: stateIdStr, city: '', city_id: '', locality });
                setCitySearch('');
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              &times;
            </button>
          )}
        </div>

        {/* City Autocomplete Dropdown */}
        {showCityDropdown && stateNameStr && !disabled && (
          <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg z-30 divide-y divide-slate-100">
            {filteredCities.length > 0 ? (
              filteredCities.map((ctObj) => {
                const name = typeof ctObj === 'string' ? ctObj : ctObj.name;
                return (
                  <button
                    key={typeof ctObj === 'string' ? ctObj : (ctObj.id || ctObj.name)}
                    type="button"
                    onClick={() => handleCitySelect(ctObj)}
                    className={`w-full text-left px-3.5 py-2 text-xs font-medium hover:bg-[#eff4ff] transition-colors ${
                      cityNameStr === name ? 'bg-[#eff4ff] text-[#00288e] font-bold' : 'text-[#0b1c30]'
                    }`}
                  >
                    {name}
                  </button>
                );
              })
            ) : (
              <div className="px-3.5 py-2.5 text-xs text-slate-400 italic">
                {citySearch ? `Use custom city "${citySearch}"` : 'No predefined cities found'}
              </div>
            )}
          </div>
        )}
        {errors.city && <span className="text-[11px] text-[#ba1a1a]">{errors.city}</span>}
      </div>

      {/* 4. LOCALITY / AREA (MANUAL FREE-TEXT) */}
      {showLocality && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-[#0b1c30]">
            Locality / Area <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <input
            type="text"
            value={locality}
            disabled={disabled}
            onChange={handleLocalityChange}
            placeholder="e.g. Prahlad Nagar, Bandra West, Downtown"
            className="w-full px-3.5 py-2.5 bg-[#eff4ff] text-[#0b1c30] rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-[#00288e] outline-none border border-transparent"
          />
        </div>
      )}
    </div>
  );
}
