/* ==========================================================================
   CARTOK — storage.js
   Data model + localStorage persistence layer.
   Everything the app touches for "database" access goes through here so
   swapping localStorage for a real API later only means editing this file.
   ========================================================================== */

const DB_KEYS = {
  users: "cartok_users",
  properties: "cartok_properties",
  favorites: "cartok_favorites",
  session: "cartok_session",
  theme: "cartok_theme",
  viewed: "cartok_viewed_history",
  seeded: "cartok_seeded_v3"
};

/* ---------------- Seed data generation ---------------- */

const CITIES = [
  { city: "Bekasi", district: "Bekasi Timur", province: "Jawa Barat" },
  { city: "Cikarang", district: "Cikarang Selatan", province: "Jawa Barat" },
  { city: "Karawang", district: "Karawang Barat", province: "Jawa Barat" },
  { city: "Jakarta Timur", district: "Cakung", province: "DKI Jakarta" },
  { city: "Bandung", district: "Coblong", province: "Jawa Barat" },
  { city: "Bogor", district: "Tanah Sareal", province: "Jawa Barat" },
  { city: "Depok", district: "Beji", province: "Jawa Barat" },
  { city: "Tangerang", district: "Cikokol", province: "Banten" }
];

const OWNER_NAMES = [
  "Andi Pratama", "Siti Rahmawati", "Rizky Maulana", "Dewi Lestari",
  "Budi Santoso", "Ahmad Fauzan", "Nur Aisyah", "Rian Kurniawan",
  "Fitriani Handayani", "Yusuf Firmansyah", "Ibu Joko"
];

const USER_NAMES = [
  "Reza Firmansyah", "Putri Ayu", "Dimas Saputra", "Lina Marlina", "Fajar Nugroho",
  "Wulan Sari", "Bagus Setiawan", "Intan Permata", "Hendra Gunawan", "Ayu Kartika",
  "Doni Prasetyo", "Melati Anggraini", "Fajar Ramadhan", "Sri Wahyuni", "Agus Salim",
  "Nadia Ramadhani", "Taufik Hidayat", "Rina Oktaviani", "Iqbal Maulana", "Vina Kusuma"
];

const FACILITIES_POOL = ["WiFi","Parkir Motor","Parkir Mobil","Dapur","AC","Lemari","Tempat Tidur","CCTV","Keamanan 24 Jam","Taman","Laundry","Kamar Mandi Dalam","Sumur/PDAM","Jemuran"];

function seededRandom(seed){
  let s = seed;
  return function(){
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}
const rng = seededRandom(20260822);
function pick(arr){ return arr[Math.floor(rng()*arr.length)]; }
function randInt(min,max){ return Math.floor(rng()*(max-min+1))+min; }

/* Real photos supplied for the demo — kept local so the site has zero external
   image dependency (fast, works offline, nothing to break if a hotlink dies). */
const PLACEHOLDER_PHOTOS = [
  "img/kontrak_01.jpg", "img/kontrak_02.jpg", "img/kontrak_03.jpg",
  "img/kontrak_04.jpg", "img/kontrkan_05.jpg", "img/kos_kosan_01.jpg",
  "img/kos_kosan_02.jpg", "img/kos_kosan_03.jpg", "img/perumahan_01.jpg",
  "img/perumahan_02.jpg"
];
const OWNER_AVATARS = [
  "https://i.pravatar.cc/150?img=12","https://i.pravatar.cc/150?img=32","https://i.pravatar.cc/150?img=15",
  "https://i.pravatar.cc/150?img=48","https://i.pravatar.cc/150?img=5","https://i.pravatar.cc/150?img=53",
  "https://i.pravatar.cc/150?img=45","https://i.pravatar.cc/150?img=13","https://i.pravatar.cc/150?img=47",
  "https://i.pravatar.cc/150?img=8"
];

function computeStatus(totalUnit, unitKosong){
  if(unitKosong <= 0) return "penuh";
  if(unitKosong / totalUnit <= 0.25) return "hampir_penuh";
  return "tersedia";
}

/* Builds a per-slot unit map — like a cinema seat chart — so renters can see
   exactly which numbered unit is free, occupied, or under repair, instead of
   just an aggregate count. Order is shuffled with the same seeded RNG used
   for the rest of the seed data, so it looks natural but stays deterministic. */
function buildUnitsLayout(total, kosong, terisi, perbaikan){
  const tokens = [];
  for(let i=0;i<kosong;i++) tokens.push("kosong");
  for(let i=0;i<terisi;i++) tokens.push("terisi");
  for(let i=0;i<perbaikan;i++) tokens.push("perbaikan");
  for(let i=tokens.length-1;i>0;i--){
    const j = Math.floor(rng()*(i+1));
    [tokens[i],tokens[j]] = [tokens[j],tokens[i]];
  }
  return tokens.map((status,idx)=>({ number:idx+1, status }));
}

function buildSeedUsers(){
  const users = [];
  users.push({ id:"admin-1", name:"Super Admin", email:"admin@demo.com", password:"admin123", role:"admin", phone:"081200000000", avatar:OWNER_AVATARS[0], verified:true, createdAt:"2025-01-10" });
  users.push({ id:"user-demo", name:"Pencari Demo", email:"user@demo.com", password:"123456", role:"user", phone:"081211112222", avatar:OWNER_AVATARS[1], verified:true, createdAt:"2025-02-01" });
  users.push({ id:"owner-demo", name:"Pemilik Demo", email:"owner@demo.com", password:"123456", role:"owner", phone:"081233334444", avatar:OWNER_AVATARS[2], verified:true, createdAt:"2025-01-20" });

  OWNER_NAMES.forEach((name,i)=>{
    users.push({
      id:"owner-"+(i+1),
      name,
      email:name.toLowerCase().replace(/\s+/g,".")+"@mail.com",
      password:"123456",
      role:"owner",
      phone:"0812"+randInt(10000000,99999999),
      avatar: OWNER_AVATARS[i % OWNER_AVATARS.length],
      verified: rng() > 0.15,
      createdAt: `2025-0${randInt(1,9)}-${String(randInt(1,28)).padStart(2,"0")}`
    });
  });

  USER_NAMES.forEach((name,i)=>{
    users.push({
      id:"user-"+(i+1),
      name,
      email:name.toLowerCase().replace(/\s+/g,".")+"@mail.com",
      password:"123456",
      role:"user",
      phone:"0813"+randInt(10000000,99999999),
      avatar: OWNER_AVATARS[i % OWNER_AVATARS.length],
      verified:true,
      createdAt:`2025-0${randInt(1,9)}-${String(randInt(1,28)).padStart(2,"0")}`
    });
  });

  return users;
}

/* Curated real-photo dataset — 10 actual listings supplied for the demo.
   Kontrakan: Rp600rb–800rb/bln (price scales with facility count).
   Kos: Rp800rb–1,1jt/bln. Perumahan: Rp1,5jt/bln with varying minimum
   rental term (1 or 3 bulan), matching the brief exactly. */
function cityOf(name){ return CITIES.find(c=>c.city===name); }

function buildSeedProperties(){
  const raw = [
    {
      id:"prop-1", ownerId:"owner-demo", name:"Kontrakan Griya Biru Asri",
      type:"kontrakan", price:700000, cityName:"Bekasi",
      desc:"Kontrakan nyaman dengan gerbang dan pagar besi kokoh berwarna biru, cocok untuk keluarga kecil yang mengutamakan keamanan.",
      totalUnit:1, unitKosong:1, unitPerbaikan:0, bedrooms:2, bathrooms:1, landArea:78, buildingArea:52, yearBuilt:2019,
      minRent:"6 Bulan", furnished:"unfurnished",
      facilities:["WiFi","Parkir Motor","Parkir Mobil","Dapur","Kamar Mandi Dalam","Sumur/PDAM"],
      pros:["Gerbang & pagar besi kokoh","Halaman depan cukup luas","Lingkungan perumahan tenang"],
      cons:["Jalan masuk cukup sempit untuk mobil besar"],
      photos:["img/kontrak_01.jpg"], rating:"4.5", reviewCount:28, viewCount:340, favoriteCount:12,
      status:"aktif", createdAt:"2026-06-12"
    },
    {
      id:"prop-2", ownerId:"owner-1", name:"Kontrakan Pintu Utama Sentosa",
      type:"kontrakan", price:650000, cityName:"Cikarang",
      desc:"Kontrakan dua pintu bersebelahan dengan teras keramik bersih, pas untuk yang ingin tinggal berdekatan dengan saudara atau teman.",
      totalUnit:2, unitKosong:1, unitPerbaikan:0, bedrooms:2, bathrooms:1, landArea:70, buildingArea:48, yearBuilt:2017,
      minRent:"3 Bulan", furnished:"unfurnished",
      facilities:["Parkir Motor","Dapur","Kamar Mandi Dalam","Sumur/PDAM"],
      pros:["Teras keramik bersih","Pintu kayu kokoh dengan ventilasi","Dekat minimarket"],
      cons:["Kamar mandi berada di luar unit"],
      photos:["img/kontrak_02.jpg"], rating:"4.2", reviewCount:15, viewCount:210, favoriteCount:6,
      status:"aktif", createdAt:"2026-05-20"
    },
    {
      id:"prop-3", ownerId:"owner-2", name:"Kontrakan Syariah Griya Kuning",
      type:"kontrakan", price:750000, cityName:"Karawang",
      desc:"Deretan kontrakan syariah dengan cat kuning cerah, sudah terpasang AC dan halaman depan yang nyaman untuk bersantai.",
      totalUnit:3, unitKosong:1, unitPerbaikan:1, bedrooms:2, bathrooms:1, landArea:84, buildingArea:56, yearBuilt:2020,
      minRent:"1 Tahun", furnished:"semi_furnished",
      facilities:["WiFi","AC","Parkir Motor","Parkir Mobil","Dapur","Taman","Kamar Mandi Dalam"],
      pros:["Sudah terpasang AC","Suasana kekeluargaan & islami","Halaman depan nyaman"],
      cons:["Area cukup ramai saat jam pulang kerja"],
      photos:["img/kontrak_03.jpg"], rating:"4.6", reviewCount:41, viewCount:512, favoriteCount:22,
      status:"aktif", createdAt:"2026-07-02"
    },
    {
      id:"prop-4", ownerId:"owner-demo", name:"Kontrakan Lorong Rapi Sejahtera",
      type:"kontrakan", price:680000, cityName:"Jakarta Timur",
      desc:"Kontrakan model lorong dengan lantai keramik bersih dan pintu kayu solid di setiap unit, terawat rapi.",
      totalUnit:5, unitKosong:2, unitPerbaikan:1, bedrooms:2, bathrooms:1, landArea:90, buildingArea:60, yearBuilt:2018,
      minRent:"6 Bulan", furnished:"unfurnished",
      facilities:["Parkir Motor","Dapur","Lemari","Kamar Mandi Dalam","Jemuran"],
      pros:["Lorong & lantai keramik bersih","Pintu kayu solid tiap unit","Akses jalan bagus"],
      cons:["Parkir motor terbatas saat weekend"],
      photos:["img/kontrak_04.jpg"], rating:"0.0", reviewCount:0, viewCount:0, favoriteCount:0,
      status:"menunggu_verifikasi", createdAt:"2026-08-18"
    },
    {
      id:"prop-5", ownerId:"owner-3", name:"Kontrakan Gang Nyaman Bahagia",
      type:"kontrakan", price:620000, cityName:"Bogor",
      desc:"Kontrakan di dalam gang yang tenang dengan tetangga yang ramah, harga paling terjangkau di kelasnya.",
      totalUnit:4, unitKosong:1, unitPerbaikan:0, bedrooms:1, bathrooms:1, landArea:60, buildingArea:40, yearBuilt:2015,
      minRent:"3 Bulan", furnished:"unfurnished",
      facilities:["Parkir Motor","Sumur/PDAM","Jemuran"],
      pros:["Harga paling terjangkau","Tetangga ramah & guyub","Dekat pusat kota"],
      cons:["Jalan masuk gang cukup sempit untuk mobil"],
      photos:["img/kontrkan_05.jpg"], rating:"4.0", reviewCount:9, viewCount:145, favoriteCount:3,
      status:"aktif", createdAt:"2026-04-11"
    },
    {
      id:"prop-6", ownerId:"owner-4", name:"Kos Eksklusif Lorong Elegan",
      type:"kos_putri", price:950000, cityName:"Depok",
      desc:"Kos putri eksklusif dengan lorong elegan, lantai marmer mengilap, dan rak sepatu di setiap sudut untuk kerapian.",
      totalUnit:12, unitKosong:2, unitPerbaikan:1, bedrooms:1, bathrooms:1, landArea:220, buildingArea:180, yearBuilt:2021,
      minRent:"1 Bulan", furnished:"furnished",
      facilities:["WiFi","AC","Lemari","Tempat Tidur","CCTV","Keamanan 24 Jam","Laundry","Kamar Mandi Dalam"],
      pros:["Lorong & lantai marmer mengilap","Rak sepatu tersedia tiap kamar","Dekat kawasan industri"],
      cons:["Sinyal provider tertentu kurang stabil"],
      photos:["img/kos_kosan_01.jpg"], rating:"4.8", reviewCount:63, viewCount:890, favoriteCount:34,
      status:"aktif", createdAt:"2026-03-05"
    },
    {
      id:"prop-7", ownerId:"owner-5", name:"Kos NRP Grand Residence",
      type:"kos_putra", price:1050000, cityName:"Bandung",
      desc:"Kos putra modern dengan desain minimalis, taman kecil asri di depan setiap unit, dan keamanan yang terjamin.",
      totalUnit:10, unitKosong:4, unitPerbaikan:1, bedrooms:1, bathrooms:1, landArea:300, buildingArea:240, yearBuilt:2022,
      minRent:"1 Bulan", furnished:"furnished",
      facilities:["WiFi","AC","Parkir Motor","Lemari","Tempat Tidur","CCTV","Keamanan 24 Jam","Taman","Laundry","Kamar Mandi Dalam"],
      pros:["Desain modern minimalis","Taman kecil di depan unit","Keamanan 24 jam"],
      cons:["Tidak ada lift untuk lantai atas"],
      photos:["img/kos_kosan_02.jpg"], rating:"4.7", reviewCount:55, viewCount:760, favoriteCount:29,
      status:"aktif", createdAt:"2026-02-27"
    },
    {
      id:"prop-8", ownerId:"owner-6", name:"Kos Griya Sederhana",
      type:"kos_campur", price:850000, cityName:"Tangerang",
      desc:"Kos campur dengan teras keramik merah di tiap unit, sederhana namun terawat dan bersih.",
      totalUnit:8, unitKosong:0, unitPerbaikan:1, bedrooms:1, bathrooms:1, landArea:180, buildingArea:140, yearBuilt:2016,
      minRent:"1 Bulan", furnished:"semi_furnished",
      facilities:["WiFi","Lemari","Tempat Tidur","Kamar Mandi Dalam","Jemuran"],
      pros:["Teras keramik tiap unit","Bersih & terawat","Dekat sekolah"],
      cons:["Area sedikit ramai pada jam tertentu"],
      photos:["img/kos_kosan_03.jpg"], rating:"4.3", reviewCount:19, viewCount:230, favoriteCount:8,
      status:"aktif", createdAt:"2026-01-30"
    },
    {
      id:"prop-9", ownerId:"owner-7", name:"Perumahan Modern Minimalis Asri",
      type:"perumahan", price:1500000, cityName:"Bekasi",
      desc:"Rumah modern minimalis siap huni dengan carport luas, jendela kayu, dan taman depan yang asri.",
      totalUnit:1, unitKosong:1, unitPerbaikan:0, bedrooms:2, bathrooms:1, landArea:90, buildingArea:60, yearBuilt:2024,
      minRent:"1 Bulan", furnished:"unfurnished",
      facilities:["WiFi","AC","Parkir Mobil","Parkir Motor","Dapur","Taman","CCTV","Keamanan 24 Jam","Kamar Mandi Dalam"],
      pros:["Desain modern & baru","Carport luas muat 1 mobil","Taman depan asri"],
      cons:["Sebagian rumah tetangga masih dalam pembangunan"],
      photos:["img/perumahan_01.jpg"], rating:"4.9", reviewCount:12, viewCount:420, favoriteCount:25,
      status:"aktif", createdAt:"2026-08-01"
    },
    {
      id:"prop-10", ownerId:"owner-8", name:"Perumahan Cluster Griya Asri",
      type:"perumahan", price:1500000, cityName:"Cikarang",
      desc:"Rumah cluster baru dengan aksen dinding batu alam, cocok untuk keluarga yang mencari kontrakan bersih dan modern.",
      totalUnit:1, unitKosong:1, unitPerbaikan:0, bedrooms:3, bathrooms:2, landArea:84, buildingArea:58, yearBuilt:2024,
      minRent:"3 Bulan", furnished:"unfurnished",
      facilities:["WiFi","AC","Parkir Mobil","Parkir Motor","Dapur","Kamar Mandi Dalam","Sumur/PDAM"],
      pros:["Aksen dinding batu alam","Kontrakan baru & bersih","Lingkungan cluster tertata"],
      cons:["Sebagian akses jalan cluster belum final"],
      photos:["img/perumahan_02.jpg"], rating:"4.4", reviewCount:7, viewCount:180, favoriteCount:11,
      status:"aktif", createdAt:"2026-07-25"
    },
    {
      id:"prop-11", ownerId:"owner-11", name:"Kontrakan Ibu Joko",
      type:"kontrakan", price:700000, cityName:"Depok",
      desc:"Kontrakan 15 pintu milik Ibu Joko yang sudah lama beroperasi, tiap pintu bisa dicek satu per satu statusnya lewat peta unit di bawah sebelum kamu datang survei langsung.",
      totalUnit:15, unitKosong:6, unitPerbaikan:2, bedrooms:2, bathrooms:1, landArea:400, buildingArea:320, yearBuilt:2014,
      minRent:"3 Bulan", furnished:"unfurnished",
      facilities:["Parkir Motor","Dapur","Kamar Mandi Dalam","Sumur/PDAM","Jemuran"],
      pros:["Sudah lama beroperasi & terpercaya","Ibu kos ramah dan responsif","Dekat pasar & minimarket"],
      cons:["2 unit sedang dalam perbaikan atap"],
      photos:["img/kontrak_04.jpg"], rating:"4.3", reviewCount:37, viewCount:610, favoriteCount:18,
      status:"aktif", createdAt:"2026-05-05"
    }
  ];

  return raw.map(r=>{
    const loc = cityOf(r.cityName);
    const unitPerbaikan = r.unitPerbaikan || 0;
    const unitTerisi = r.totalUnit - r.unitKosong - unitPerbaikan;
    const units = buildUnitsLayout(r.totalUnit, r.unitKosong, unitTerisi, unitPerbaikan);
    return {
      id:r.id, ownerId:r.ownerId, name:r.name, type:r.type, price:r.price,
      province:loc.province, city:loc.city, district:loc.district,
      address:`Jl. ${pick(["Merdeka","Mawar","Kenanga","Anggrek","Kartini","Diponegoro","Sudirman","Cempaka"])} No. ${randInt(1,99)}, ${loc.district}`,
      description:r.desc,
      totalUnit:r.totalUnit, unitKosong:r.unitKosong, unitPerbaikan, unitTerisi, units,
      bedrooms:r.bedrooms, bathrooms:r.bathrooms, landArea:r.landArea, buildingArea:r.buildingArea,
      electricity: pick(["900 VA","1300 VA","2200 VA"]),
      waterSource: pick(["PDAM","Sumur Bor"]),
      yearBuilt:r.yearBuilt, minRent:r.minRent, furnished:r.furnished,
      facilities:r.facilities, pros:r.pros, cons:r.cons, photos:r.photos,
      rating:r.rating, reviewCount:r.reviewCount, viewCount:r.viewCount, favoriteCount:r.favoriteCount,
      status:r.status, availability: computeStatus(r.totalUnit, r.unitKosong),
      createdAt:r.createdAt
    };
  });
}

function initializeData(){
  if(localStorage.getItem(DB_KEYS.seeded)) return;
  const users = buildSeedUsers();
  const properties = buildSeedProperties();
  localStorage.setItem(DB_KEYS.users, JSON.stringify(users));
  localStorage.setItem(DB_KEYS.properties, JSON.stringify(properties));
  localStorage.setItem(DB_KEYS.favorites, JSON.stringify({}));
  localStorage.setItem(DB_KEYS.viewed, JSON.stringify({}));
  if(!localStorage.getItem(DB_KEYS.theme)) localStorage.setItem(DB_KEYS.theme, "light");
  localStorage.setItem(DB_KEYS.seeded, "true");
}

function resetDemoData(){
  Object.values(DB_KEYS).forEach(k=>{ if(k!==DB_KEYS.theme) localStorage.removeItem(k); });
  initializeData();
}

/* ---------------- Generic getters/setters ---------------- */
function getUsers(){ return JSON.parse(localStorage.getItem(DB_KEYS.users) || "[]"); }
function saveUsers(users){ localStorage.setItem(DB_KEYS.users, JSON.stringify(users)); }

function getProperties(){ return JSON.parse(localStorage.getItem(DB_KEYS.properties) || "[]"); }
function saveProperties(props){ localStorage.setItem(DB_KEYS.properties, JSON.stringify(props)); }

function getFavorites(){ return JSON.parse(localStorage.getItem(DB_KEYS.favorites) || "{}"); }
function saveFavorites(favs){ localStorage.setItem(DB_KEYS.favorites, JSON.stringify(favs)); }

function getViewedHistory(){ return JSON.parse(localStorage.getItem(DB_KEYS.viewed) || "{}"); }
function addViewedHistory(userId, propertyId){
  const v = getViewedHistory();
  v[userId] = v[userId] || [];
  v[userId] = v[userId].filter(id=>id!==propertyId);
  v[userId].unshift(propertyId);
  v[userId] = v[userId].slice(0,20);
  localStorage.setItem(DB_KEYS.viewed, JSON.stringify(v));
}

/* ---------------- Property CRUD ---------------- */
function addProperty(prop){
  const props = getProperties();
  prop.id = "prop-" + (Date.now());
  prop.status = "menunggu_verifikasi";
  prop.unitPerbaikan = prop.unitPerbaikan || 0;
  prop.unitTerisi = prop.totalUnit - prop.unitKosong - prop.unitPerbaikan;
  prop.units = buildUnitsLayout(prop.totalUnit, prop.unitKosong, prop.unitTerisi, prop.unitPerbaikan);
  prop.availability = computeStatus(prop.totalUnit, prop.unitKosong);
  prop.rating = "0.0";
  prop.reviewCount = 0;
  prop.viewCount = 0;
  prop.favoriteCount = 0;
  prop.createdAt = new Date().toISOString().slice(0,10);
  props.unshift(prop);
  saveProperties(props);
  return prop;
}

function updateProperty(id, updates){
  const props = getProperties();
  const idx = props.findIndex(p=>p.id===id);
  if(idx===-1) return null;
  props[idx] = { ...props[idx], ...updates };
  if(updates.totalUnit !== undefined || updates.unitKosong !== undefined || updates.unitPerbaikan !== undefined){
    const p = props[idx];
    p.unitPerbaikan = p.unitPerbaikan || 0;
    p.unitTerisi = p.totalUnit - p.unitKosong - p.unitPerbaikan;
    if(updates.totalUnit !== undefined || updates.unitKosong !== undefined || updates.unitPerbaikan !== undefined){
      p.units = buildUnitsLayout(p.totalUnit, p.unitKosong, p.unitTerisi, p.unitPerbaikan);
    }
    if(!updates.manualAvailability){
      p.availability = computeStatus(p.totalUnit, p.unitKosong);
    }
  }
  saveProperties(props);
  return props[idx];
}

function deleteProperty(id){
  saveProperties(getProperties().filter(p=>p.id!==id));
}

function getPropertyById(id){
  return getProperties().find(p=>p.id===id) || null;
}

function incrementView(id){
  const props = getProperties();
  const p = props.find(x=>x.id===id);
  if(p){ p.viewCount = (p.viewCount||0) + 1; saveProperties(props); }
}

/* ---------------- Favorites ---------------- */
function toggleFavorite(userId, propertyId){
  const favs = getFavorites();
  favs[userId] = favs[userId] || [];
  const props = getProperties();
  const prop = props.find(p=>p.id===propertyId);
  let isNowFav;
  if(favs[userId].includes(propertyId)){
    favs[userId] = favs[userId].filter(id=>id!==propertyId);
    if(prop) prop.favoriteCount = Math.max(0,(prop.favoriteCount||1)-1);
    isNowFav = false;
  } else {
    favs[userId].push(propertyId);
    if(prop) prop.favoriteCount = (prop.favoriteCount||0)+1;
    isNowFav = true;
  }
  saveFavorites(favs);
  saveProperties(props);
  return isNowFav;
}
function isFavorite(userId, propertyId){
  const favs = getFavorites();
  return !!(favs[userId] && favs[userId].includes(propertyId));
}
function getFavoriteProperties(userId){
  const favs = getFavorites();
  const ids = favs[userId] || [];
  return getProperties().filter(p=>ids.includes(p.id));
}
