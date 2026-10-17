/**
 * Centralized Geographic Location Data for Vakancy.in
 * Country -> State / Province / Region -> Cities
 */

const LOCATION_HIERARCHY = {
  'India': {
    'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Tirupati', 'Kakinada', 'Rajahmundry', 'Nellore', 'Anantapur', 'Kurnool', 'Eluru', 'Ongole'],
    'Arunachal Pradesh': ['Itanagar', 'Naharlagun', 'Pasighat', 'Tawang', 'Ziro', 'Tezu'],
    'Assam': ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tinsukia', 'Tezpur', 'Bongaigaon'],
    'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Purnia', 'Darbhanga', 'Bihar Sharif', 'Arrah', 'Begusarai'],
    'Chhattisgarh': ['Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Durg', 'Rajnandgaon', 'Jagdalpur'],
    'Goa': ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda', 'Bicholim'],
    'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Gandhinagar', 'Anand', 'Junagadh', 'Bharuch', 'Navsari', 'Morbi', 'Vapi'],
    'Haryana': ['Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Karnal', 'Hisar', 'Rohtak', 'Sonipat', 'Yamunanagar', 'Panchkula'],
    'Himachal Pradesh': ['Shimla', 'Dharamshala', 'Mandi', 'Solan', 'Kullu', 'Baddi', 'Hamirpur', 'Bilaspur'],
    'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Hazaribagh', 'Deoghar', 'Giridih'],
    'Karnataka': ['Bengaluru', 'Mysuru', 'Hubballi-Dharwad', 'Mangaluru', 'Belagavi', 'Kalaburagi', 'Davangere', 'Shivamogga', 'Ballari', 'Udupi', 'Tumakuru'],
    'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam', 'Kannur', 'Kottayam', 'Palakkad', 'Alappuzha', 'Malappuram'],
    'Madhya Pradesh': ['Bhopal', 'Indore', 'Gwalior', 'Jabalpur', 'Ujjain', 'Sagar', 'Satna', 'Rewa', 'Ratlam'],
    'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Chhatrapati Sambhajinagar', 'Solapur', 'Navi Mumbai', 'Amravati', 'Kolhapur', 'Sangli', 'Jalgaon'],
    'Manipur': ['Imphal', 'Churachandpur', 'Thoubal', 'Bishnupur'],
    'Meghalaya': ['Shillong', 'Tura', 'Jowai', 'Nongpoh'],
    'Mizoram': ['Aizawl', 'Lunglei', 'Champhai'],
    'Nagaland': ['Kohima', 'Dimapur', 'Mokokchung', 'Tuensang'],
    'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur', 'Puri', 'Balasore', 'Baripada'],
    'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Mohali (SAS Nagar)', 'Bathinda', 'Pathankot', 'Hoshiarpur'],
    'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer', 'Bikaner', 'Bhilwara', 'Alwar', 'Sikar'],
    'Sikkim': ['Gangtok', 'Namchi', 'Gyalshing', 'Mangan'],
    'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tiruppur', 'Erode', 'Vellore', 'Thanjavur', 'Tuticorin', 'Nagercoil'],
    'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam', 'Ramagundam', 'Mahbubnagar'],
    'Tripura': ['Agartala', 'Udaipur', 'Dharmanagar', 'Kailashahar'],
    'Uttar Pradesh': ['Noida', 'Greater Noida', 'Lucknow', 'Kanpur', 'Agra', 'Varanasi', 'Prayagraj', 'Ghaziabad', 'Meerut', 'Bareilly', 'Aligarh', 'Moradabad', 'Gorakhpur', 'Jhansi'],
    'Uttarakhand': ['Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Rishikesh', 'Kashipur', 'Rudrapur'],
    'West Bengal': ['Kolkata', 'Howrah', 'Siliguri', 'Durgapur', 'Asansol', 'Kharagpur', 'Haldia', 'Malda', 'Bardhaman'],
    'Delhi NCR': ['New Delhi', 'Delhi', 'Gurugram', 'Noida', 'Greater Noida', 'Faridabad', 'Ghaziabad'],
    'Chandigarh': ['Chandigarh'],
    'Puducherry': ['Puducherry', 'Karaikal', 'Mahe', 'Yanam'],
    'Jammu & Kashmir': ['Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Udhampur'],
    'Ladakh': ['Leh', 'Kargil']
  },
  'United Arab Emirates': {
    'Abu Dhabi': ['Abu Dhabi City', 'Al Ain', 'Al Dhafra', 'Ruwais', 'Mussafah'],
    'Dubai': ['Dubai City', 'Jebel Ali', 'Deira', 'Bur Dubai', 'Business Bay', 'Downtown Dubai', 'Dubai Marina', 'Internet City', 'Silicon Oasis'],
    'Sharjah': ['Sharjah City', 'Khor Fakkan', 'Kalba', 'Al Dhaid'],
    'Ajman': ['Ajman City', 'Masfout', 'Manama'],
    'Ras Al Khaimah': ['Ras Al Khaimah City', 'Al Jazirah Al Hamra', 'Digdaga'],
    'Fujairah': ['Fujairah City', 'Dibba Al-Fujairah'],
    'Umm Al Quwain': ['Umm Al Quwain City', 'Falaj Al Mualla']
  },
  'Saudi Arabia': {
    'Riyadh Region': ['Riyadh', 'Al Kharj', 'Al Majma\'ah', 'Dawadmi', 'Diriyah'],
    'Makkah Region': ['Jeddah', 'Makkah', 'Taif', 'Rabigh', 'Al Lith'],
    'Eastern Province': ['Dammam', 'Khobar', 'Dhahran', 'Jubail', 'Al Ahsa', 'Qatif', 'Hafar Al Batin'],
    'Madinah Region': ['Madinah', 'Yanbu', 'Al Ula'],
    'Asir Region': ['Abha', 'Khamis Mushait', 'Bisha'],
    'Tabuk Region': ['Tabuk', 'NEOM', 'Duba', 'Umluj'],
    'Al Qassim Region': ['Buraidah', 'Unaizah', 'Al Rass'],
    'Hail Region': ['Hail'],
    'Jazan Region': ['Jazan', 'Sabya'],
    'Najran Region': ['Najran'],
    'Al Jawf Region': ['Sakaka', 'Qurayyat']
  },
  'Qatar': {
    'Ad Dawhah': ['Doha', 'West Bay', 'The Pearl', 'Al Sadd', 'Old Airport'],
    'Al Rayyan': ['Al Rayyan', 'Education City', 'Al Wajbah', 'Abu Hamour'],
    'Al Wakrah': ['Al Wakrah', 'Mesaieed', 'Al Wukair'],
    'Al Khor': ['Al Khor', 'Ras Laffan'],
    'Umm Salal': ['Umm Salal Muhammad', 'Umm Salal Ali'],
    'Al Daayen': ['Lusail', 'Al Ebb']
  },
  'Kuwait': {
    'Capital Governorate': ['Kuwait City', 'Sharq', 'Al Asimah', 'Mirqab'],
    'Hawalli Governorate': ['Hawalli', 'Salmiya', 'Jabriya', 'Rumaithiya'],
    'Farwaniya Governorate': ['Farwaniya', 'Khaitan', 'Jleeb Al-Shuyoukh', 'Ardiya'],
    'Ahmadi Governorate': ['Ahmadi', 'Fahaheel', 'Mangaf', 'Mahboula'],
    'Mubarak Al-Kabeer Governorate': ['Mubarak Al-Kabeer', 'Sabah Al-Salem', 'Qurain'],
    'Jahra Governorate': ['Jahra', 'Sulaibiya']
  },
  'Bahrain': {
    'Capital Governorate': ['Manama', 'Juffair', 'Seef', 'Diplomatic Area'],
    'Muharraq Governorate': ['Muharraq', 'Amwaj Islands', 'Diyar Al Muharraq', 'Busaiteen'],
    'Northern Governorate': ['Budaiya', 'Diraz', 'Hamad Town', 'Saar'],
    'Southern Governorate': ['Riffa', 'Isa Town', 'Sitra', 'Zallaq']
  },
  'Oman': {
    'Muscat Governorate': ['Muscat', 'Ruwi', 'Seeb', 'Muttrah', 'Qurum', 'Bawshar', 'Azaiba'],
    'Dhofar Governorate': ['Salalah', 'Taqah', 'Mirbat'],
    'Al Batinah North Governorate': ['Sohar', 'Saham', 'Shinas'],
    'Al Dakhiliyah Governorate': ['Nizwa', 'Bahla', 'Samail'],
    'Al Sharqiyah South Governorate': ['Sur', 'Jalan Bani Bu Ali']
  },
  'Singapore': {
    'Central Region': ['Central Business District', 'Orchard', 'Marina Bay', 'Novena', 'Queenstown', 'Bukit Timah', 'Bishan'],
    'East Region': ['Tampines', 'Pasir Ris', 'Bedok', 'Changi', 'Paya Lebar'],
    'North Region': ['Woodlands', 'Yishun', 'Sembawang'],
    'North-East Region': ['Sengkang', 'Punggol', 'Serangoon', 'Hougang'],
    'West Region': ['Jurong East', 'Jurong West', 'Clementi', 'Bukit Batok']
  },
  'Malaysia': {
    'Kuala Lumpur': ['Kuala Lumpur City Center (KLCC)', 'Bangsar', 'Mont Kiara', 'Cheras', 'Bukit Bintang', 'Kepong'],
    'Selangor': ['Petaling Jaya', 'Shah Alam', 'Subang Jaya', 'Klang', 'Puchong', 'Cyberjaya', 'Rawang'],
    'Penang': ['George Town', 'Bayan Lepas', 'Seberang Perai', 'Butterworth'],
    'Johor': ['Johor Bahru', 'Iskandar Puteri', 'Batu Pahat', 'Muar', 'Kluang'],
    'Sabah': ['Kota Kinabalu', 'Sandakan', 'Tawau'],
    'Sarawak': ['Kuching', 'Miri', 'Sibu', 'Bintulu']
  },
  'Indonesia': {
    'Jakarta (DKI)': ['Central Jakarta', 'South Jakarta', 'West Jakarta', 'North Jakarta', 'East Jakarta'],
    'West Java': ['Bandung', 'Bekasi', 'Depok', 'Bogor', 'Cimahi', 'Cirebon'],
    'East Java': ['Surabaya', 'Malang', 'Sidoarjo', 'Kediri', 'Gresik'],
    'Central Java': ['Semarang', 'Surakarta (Solo)', 'Magelang', 'Tegal', 'Purwokerto'],
    'Bali': ['Denpasar', 'Kuta', 'Ubud', 'Seminyak', 'Canggu', 'Sanur'],
    'Banten': ['Tangerang', 'South Tangerang', 'Serang', 'Cilegon']
  },
  'Kenya': {
    'Nairobi County': ['Nairobi CBD', 'Westlands', 'Upper Hill', 'Kilimani', 'Karen', 'Gigiri', 'Parklands'],
    'Mombasa County': ['Mombasa City', 'Nyali', 'Likoni', 'Kisauni'],
    'Kiambu County': ['Thika', 'Kiambu', 'Ruiru', 'Karuri'],
    'Nakuru County': ['Nakuru', 'Naivasha'],
    'Kisumu County': ['Kisumu']
  },
  'South Africa': {
    'Gauteng': ['Johannesburg', 'Sandton', 'Pretoria', 'Centurion', 'Midrand', 'Soweto', 'Kempton Park'],
    'Western Cape': ['Cape Town', 'Stellenbosch', 'Bellville', 'Paarl', 'Somerset West'],
    'KwaZulu-Natal': ['Durban', 'Umhlanga', 'Pietermaritzburg', 'Ballito'],
    'Eastern Cape': ['Gqeberha (Port Elizabeth)', 'East London']
  },
  'Nigeria': {
    'Lagos State': ['Lagos Island', 'Victoria Island', 'Ikoyi', 'Ikeja', 'Lekki', 'Yaba', 'Surulere'],
    'Federal Capital Territory': ['Abuja', 'Garki', 'Wuse', 'Maitama', 'Asokoro'],
    'Rivers State': ['Port Harcourt'],
    'Oyo State': ['Ibadan'],
    'Kano State': ['Kano']
  },
  'United Kingdom': {
    'England': ['London', 'Manchester', 'Birmingham', 'Leeds', 'Liverpool', 'Bristol', 'Cambridge', 'Oxford', 'Sheffield', 'Newcastle', 'Nottingham', 'Leicester'],
    'Scotland': ['Edinburgh', 'Glasgow', 'Aberdeen', 'Dundee', 'Inverness'],
    'Wales': ['Cardiff', 'Swansea', 'Newport', 'Wrexham'],
    'Northern Ireland': ['Belfast', 'Derry', 'Lisburn']
  },
  'United States': {
    'California': ['Los Angeles', 'San Francisco', 'San Jose', 'San Diego', 'Sacramento', 'Irvine', 'Palo Alto', 'Oakland', 'Fresno', 'Santa Clara'],
    'New York': ['New York City', 'Brooklyn', 'Manhattan', 'Queens', 'Albany', 'Buffalo', 'Rochester', 'Syracuse'],
    'Texas': ['Houston', 'Dallas', 'Austin', 'San Antonio', 'Fort Worth', 'Arlington', 'El Paso', 'Plano'],
    'Washington': ['Seattle', 'Bellevue', 'Redmond', 'Spokane', 'Tacoma'],
    'Illinois': ['Chicago', 'Naperville', 'Evanston', 'Peoria', 'Springfield'],
    'Florida': ['Miami', 'Orlando', 'Tampa', 'Jacksonville', 'Fort Lauderdale', 'Tallahassee'],
    'Massachusetts': ['Boston', 'Cambridge', 'Worcester', 'Springfield'],
    'Georgia': ['Atlanta', 'Alpharetta', 'Savannah', 'Augusta'],
    'Colorado': ['Denver', 'Boulder', 'Colorado Springs', 'Fort Collins'],
    'Pennsylvania': ['Philadelphia', 'Pittsburgh', 'Harrisburg', 'Allentown']
  },
  'Canada': {
    'Ontario': ['Toronto', 'Ottawa', 'Mississauga', 'Brampton', 'Hamilton', 'Waterloo', 'London', 'Markham'],
    'British Columbia': ['Vancouver', 'Victoria', 'Surrey', 'Burnaby', 'Richmond', 'Kelowna'],
    'Quebec': ['Montreal', 'Quebec City', 'Laval', 'Gatineau'],
    'Alberta': ['Calgary', 'Edmonton', 'Red Deer', 'Lethbridge']
  },
  'Germany': {
    'Bavaria': ['Munich', 'Nuremberg', 'Augsburg', 'Regensburg', 'Würzburg'],
    'Berlin': ['Berlin'],
    'North Rhine-Westphalia': ['Cologne', 'Düsseldorf', 'Dortmund', 'Essen', 'Bonn', 'Duisburg'],
    'Hesse': ['Frankfurt am Main', 'Wiesbaden', 'Darmstadt', 'Kassel'],
    'Baden-Württemberg': ['Stuttgart', 'Karlsruhe', 'Mannheim', 'Heidelberg', 'Freiburg'],
    'Hamburg': ['Hamburg']
  },
  'France': {
    'Île-de-France': ['Paris', 'Boulogne-Billancourt', 'Saint-Denis', 'Versailles', 'Nanterre'],
    'Auvergne-Rhône-Alpes': ['Lyon', 'Grenoble', 'Saint-Étienne', 'Villeurbanne'],
    'Provence-Alpes-Côte d\'Azur': ['Marseille', 'Nice', 'Cannes', 'Aix-en-Provence'],
    'Occitanie': ['Toulouse', 'Montpellier']
  },
  'Netherlands': {
    'North Holland': ['Amsterdam', 'Haarlem', 'Hilversum', 'Amstelveen', 'Zaandam'],
    'South Holland': ['Rotterdam', 'The Hague', 'Leiden', 'Delft', 'Gouda'],
    'Utrecht': ['Utrecht', 'Amersfoort', 'Veenendaal'],
    'North Brabant': ['Eindhoven', 'Tilburg', 'Breda', '\'s-Hertogenbosch']
  },
  'Australia': {
    'New South Wales': ['Sydney', 'Newcastle', 'Wollongong', 'Central Coast'],
    'Victoria': ['Melbourne', 'Geelong', 'Ballarat', 'Bendigo'],
    'Queensland': ['Brisbane', 'Gold Coast', 'Sunshine Coast', 'Cairns', 'Townsville'],
    'Western Australia': ['Perth', 'Fremantle', 'Mandurah'],
    'South Australia': ['Adelaide'],
    'Australian Capital Territory': ['Canberra']
  }
};

const SUPPORTED_COUNTRIES = Object.keys(LOCATION_HIERARCHY).sort();

module.exports = {
  LOCATION_HIERARCHY,
  SUPPORTED_COUNTRIES
};
