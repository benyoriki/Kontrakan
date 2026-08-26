/* ==========================================================================
   CARTOK — properties.js
   Property card rendering, search/filter/sort logic, favorite toggling,
   and property detail page rendering.
   ========================================================================== */

function isPublic(p){ return p.status === "aktif"; }

function propertyCardHtml(p){
  const user = getCurrentUser();
  const fav = user ? isFavorite(user.id, p.id) : false;
  return `
    <article class="card" onclick="goToDetail('${p.id}')">
      <div class="card-media">
        <img src="${p.photos[0]}" alt="${p.name}" loading="lazy"/>
        <div class="card-badges">
          <span class="badge badge-type">${typeLabel(p.type)}</span>
          <button class="fav-btn ${fav?'active':''}" onclick="event.stopPropagation(); handleFavClick('${p.id}', this)">${fav ? '❤️' : '🤍'}</button>
        </div>
      </div>
      <div class="card-body">
        <span class="badge ${availabilityBadgeClass(p.availability)}" style="align-self:flex-start;">${availabilityLabel(p.availability)}</span>
        <div class="card-title">${p.name}</div>
        <div class="card-loc">📍 ${p.district}, ${p.city}</div>
        <div class="card-price">${formatRupiah(p.price)} <span>/ bulan</span></div>
        <div class="card-meta">
          <span>🛏 ${p.bedrooms} Kamar</span>
          <span>🚿 ${p.bathrooms} KM</span>
          <span>🅿️ ${p.facilities.includes('Parkir Motor')||p.facilities.includes('Parkir Mobil') ? 'Parkir' : '-'}</span>
        </div>
        <div class="card-rating">⭐ ${p.rating} <span class="text-tertiary" style="font-weight:600;">(${p.reviewCount} ulasan)</span></div>
      </div>
    </article>
  `;
}

function goToDetail(id){
  window.location.href = `detail.html?id=${id}`;
}

function handleFavClick(id, btnEl){
  const user = getCurrentUser();
  if(!user){
    openLoginRequiredModal("Masuk untuk menyimpan properti favorit kamu.");
    return;
  }
  const isFav = toggleFavorite(user.id, id);
  if(btnEl){
    btnEl.classList.toggle("active", isFav);
    btnEl.textContent = isFav ? "❤️" : "🤍";
  }
  toast(isFav ? "Properti berhasil disimpan" : "Properti dihapus dari favorit", "success");
  document.dispatchEvent(new CustomEvent("favorites-changed"));
}

function renderSkeletonCards(container, count=8){
  container.innerHTML = Array.from({length:count}).map(()=>`<div class="skeleton skeleton-card"></div>`).join("");
}

function renderEmptyState(container, {icon="🏠", title="Tidak Ada Properti", text="Belum ada kontrakan yang sesuai dengan pencarianmu.", actionHtml=""}={}){
  container.innerHTML = `
    <div class="empty-state" style="grid-column:1/-1;">
      <div class="icon">${icon}</div>
      <h3>${title}</h3>
      <p>${text}</p>
      ${actionHtml}
    </div>`;
}

/* ---------------- Home page sections ---------------- */
function initHomeSections(){
  const popularEl = document.getElementById("popular-grid");
  const newestEl = document.getElementById("newest-grid");
  if(!popularEl && !newestEl) return;

  if(popularEl) renderSkeletonCards(popularEl, 4);
  if(newestEl) renderSkeletonCards(newestEl, 4);

  setTimeout(()=>{
    const active = getProperties().filter(isPublic);
    if(popularEl){
      const popular = [...active].sort((a,b)=> (b.viewCount+b.favoriteCount*3) - (a.viewCount+a.favoriteCount*3)).slice(0,4);
      popularEl.innerHTML = popular.map(propertyCardHtml).join("") || "";
      if(!popular.length) renderEmptyState(popularEl);
    }
    if(newestEl){
      const newest = [...active].sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt)).slice(0,4);
      newestEl.innerHTML = newest.map(propertyCardHtml).join("") || "";
      if(!newest.length) renderEmptyState(newestEl);
    }
  }, 450);

  // stat counters (animated on scroll into view)
  const props = getProperties().filter(isPublic);
  const totalUnits = props.reduce((s,p)=>s+p.totalUnit,0);
  const availableUnits = props.reduce((s,p)=>s+p.unitKosong,0);
  const verifiedOwners = getUsers().filter(u=>u.role==="owner" && u.verified).length;
  animateStatIfExists("stat-properties", props.length);
  animateStatIfExists("stat-units", totalUnits);
  animateStatIfExists("stat-available", availableUnits);
  animateStatIfExists("stat-owners", verifiedOwners);
}
function setStatIfExists(id, val){
  const el = document.getElementById(id);
  if(el) el.textContent = val;
}
function animateStatIfExists(id, target){
  const el = document.getElementById(id);
  if(!el) return;
  if(typeof animateCounterOnView === "function"){
    animateCounterOnView(el, target, { suffix:"+" });
  } else {
    el.textContent = target + "+";
  }
}

/* ---------------- Search page ---------------- */
function getFilterStateFromForm(){
  const val = id => document.getElementById(id)?.value || "";
  const checked = name => Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(i=>i.value);
  return {
    q: val("f-query"),
    city: val("f-city"),
    types: checked("f-type"),
    priceMin: parseInt(val("f-price-min")) || 0,
    priceMax: parseInt(val("f-price-max")) || Infinity,
    bedrooms: val("f-bedrooms"),
    furnished: checked("f-furnished"),
    facilities: checked("f-facilities"),
    availability: checked("f-availability"),
    sort: val("f-sort") || "terbaru"
  };
}

function applyFilters(props, f){
  let out = props.filter(isPublic);
  if(f.q){
    const q = f.q.toLowerCase();
    out = out.filter(p=> p.name.toLowerCase().includes(q) || p.city.toLowerCase().includes(q) || p.district.toLowerCase().includes(q));
  }
  if(f.city) out = out.filter(p=>p.city === f.city);
  if(f.types && f.types.length) out = out.filter(p=>f.types.includes(p.type));
  out = out.filter(p=>p.price >= f.priceMin && p.price <= f.priceMax);
  if(f.bedrooms) out = out.filter(p=> f.bedrooms==="4" ? p.bedrooms>=4 : p.bedrooms === parseInt(f.bedrooms));
  if(f.furnished && f.furnished.length) out = out.filter(p=>f.furnished.includes(p.furnished));
  if(f.facilities && f.facilities.length) out = out.filter(p=>f.facilities.every(fa=>p.facilities.includes(fa)));
  if(f.availability && f.availability.length) out = out.filter(p=>f.availability.includes(p.availability));

  switch(f.sort){
    case "termurah": out.sort((a,b)=>a.price-b.price); break;
    case "termahal": out.sort((a,b)=>b.price-a.price); break;
    case "rating": out.sort((a,b)=>b.rating-a.rating); break;
    default: out.sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt));
  }
  return out;
}

function runSearch(){
  const resultsGrid = document.getElementById("results-grid");
  const resultsCount = document.getElementById("results-count");
  if(!resultsGrid) return;
  renderSkeletonCards(resultsGrid, 6);
  setTimeout(()=>{
    const f = getFilterStateFromForm();
    const filtered = applyFilters(getProperties(), f);
    resultsGrid.innerHTML = filtered.map(propertyCardHtml).join("");
    if(resultsCount) resultsCount.textContent = `${filtered.length} kontrakan ditemukan`;
    renderActiveFilterChips(f);
    if(!filtered.length){
      renderEmptyState(resultsGrid, {
        title:"Tidak Ada Properti",
        text:"Belum ada kontrakan yang sesuai dengan pencarianmu. Coba ubah atau reset filter.",
        actionHtml:`<button class="btn btn-primary" onclick="resetFilters()">Reset Filter</button>`
      });
    }
  }, 380);
}

const FILTER_LABELS = {
  types: { kontrakan:"Kontrakan", kos_putra:"Kos Putra", kos_putri:"Kos Putri", kos_campur:"Kos Campur" },
  furnished: { furnished:"Furnished", semi_furnished:"Semi Furnished", unfurnished:"Unfurnished" },
  facilities: {},
  availability: { tersedia:"Tersedia", hampir_penuh:"Hampir Penuh", penuh:"Penuh" }
};

function renderActiveFilterChips(f){
  const wrap = document.getElementById("active-chips");
  if(!wrap) return;
  const chips = [];
  if(f.q) chips.push({ label:`"${f.q}"`, clear:()=>{ document.getElementById("f-query").value=""; } });
  if(f.city) chips.push({ label:f.city, clear:()=>{ document.getElementById("f-city").value=""; } });
  f.types.forEach(t=> chips.push({ label:FILTER_LABELS.types[t], clear:()=>uncheckOne("f-type",t) }));
  if(f.priceMin) chips.push({ label:`Min ${formatRupiah(f.priceMin)}`, clear:()=>{ document.getElementById("f-price-min").value=""; } });
  if(f.priceMax && f.priceMax !== Infinity) chips.push({ label:`Maks ${formatRupiah(f.priceMax)}`, clear:()=>{ document.getElementById("f-price-max").value=""; } });
  if(f.bedrooms) chips.push({ label:`${f.bedrooms}${f.bedrooms==="4"?"+":""} Kamar`, clear:()=>{ document.getElementById("f-bedrooms").value=""; } });
  f.furnished.forEach(v=> chips.push({ label:FILTER_LABELS.furnished[v], clear:()=>uncheckOne("f-furnished",v) }));
  f.facilities.forEach(v=> chips.push({ label:v, clear:()=>uncheckOne("f-facilities",v) }));
  f.availability.forEach(v=> chips.push({ label:FILTER_LABELS.availability[v], clear:()=>uncheckOne("f-availability",v) }));

  if(!chips.length){ wrap.innerHTML = ""; return; }
  wrap.innerHTML = chips.map((c,i)=>`<span class="chip">${c.label} <button onclick="clearActiveChip(${i})">✕</button></span>`).join("");
  window.__activeChipHandlers = chips.map(c=>c.clear);
}
function clearActiveChip(i){
  if(window.__activeChipHandlers && window.__activeChipHandlers[i]){
    window.__activeChipHandlers[i]();
    runSearch();
  }
}
function uncheckOne(name, value){
  const box = document.querySelector(`input[name="${name}"][value="${value}"]`);
  if(box) box.checked = false;
}

function resetFilters(){
  document.querySelectorAll('.filter-panel input[type=checkbox]').forEach(i=>i.checked=false);
  document.querySelectorAll('.filter-panel input[type=text],.filter-panel input[type=number]').forEach(i=>i.value="");
  document.querySelectorAll('.filter-panel select').forEach(i=>i.selectedIndex=0);
  const q = document.getElementById("f-query"); if(q) q.value="";
  const sortInput = document.getElementById("f-sort");
  if(sortInput){
    sortInput.value = "terbaru";
    document.querySelectorAll(".sort-pill").forEach(b=>b.classList.toggle("active", b.dataset.sort==="terbaru"));
  }
  runSearch();
}

function populateCityFilter(){
  const sel = document.getElementById("f-city");
  if(!sel) return;
  const cities = [...new Set(getProperties().map(p=>p.city))].sort();
  sel.innerHTML = `<option value="">Semua Kota</option>` + cities.map(c=>`<option value="${c}">${c}</option>`).join("");
}

function initSearchPageFromURL(){
  const params = new URLSearchParams(window.location.search);
  const typeParam = params.get("type");
  if(typeParam === "kontrakan"){
    const box = document.querySelector('input[name="f-type"][value="kontrakan"]');
    if(box) box.checked = true;
  } else if(typeParam === "kos"){
    ["kos_putra","kos_putri","kos_campur"].forEach(v=>{
      const box = document.querySelector(`input[name="f-type"][value="${v}"]`);
      if(box) box.checked = true;
    });
  }
  const q = params.get("q");
  if(q){ const qi = document.getElementById("f-query"); if(qi) qi.value = q; }
  const priceMin = params.get("priceMin");
  const priceMax = params.get("priceMax");
  const bedrooms = params.get("bedrooms");
  if(priceMin){ const el=document.getElementById("f-price-min"); if(el) el.value = priceMin; }
  if(priceMax){ const el=document.getElementById("f-price-max"); if(el) el.value = priceMax; }
  if(bedrooms){ const el=document.getElementById("f-bedrooms"); if(el) el.value = bedrooms; }
}

/* ---------------- Detail Page ---------------- */
function initDetailPage(){
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const root = document.getElementById("detail-root");
  if(!root) return;
  const p = getPropertyById(id);
  if(!p){
    root.innerHTML = `<div class="empty-state"><div class="icon">😕</div><h3>Properti tidak ditemukan</h3><p>Properti yang kamu cari mungkin sudah dihapus.</p><a href="search.html" class="btn btn-primary">Cari Properti Lain</a></div>`;
    return;
  }
  incrementView(p.id);
  const user = getCurrentUser();
  if(user) addViewedHistory(user.id, p.id);

  document.title = `${p.name} — Cartok`;

  const bc = document.getElementById("breadcrumb");
  if(bc){
    bc.innerHTML = `<a href="index.html">Beranda</a><span>/</span><a href="search.html">Cari Kontrakan</a><span>/</span><a href="search.html?type=${p.type==='kontrakan'?'kontrakan':'kos'}">${typeLabel(p.type)}</a><span>/</span><span class="current">${p.name}</span>`;
  }

  const fav = user ? isFavorite(user.id, p.id) : false;
  const owner = getUsers().find(u=>u.id===p.ownerId);
  const pct = Math.round((p.unitTerisi / p.totalUnit) * 100);

  root.innerHTML = `
    <div class="gallery ${p.photos.length < 2 ? 'gallery-single' : ''}">
      <div class="gallery-main" ${p.photos.length > 1 ? 'onclick="openLightbox(0)"' : ''}>
        <img src="${p.photos[0]}" alt="${p.name}"/>
      </div>
      ${p.photos.length > 1 ? `
        <div class="gallery-side">
          <div onclick="openLightbox(1)"><img src="${p.photos[1]||p.photos[0]}" alt=""/></div>
          <div onclick="openLightbox(2)">
            <img src="${p.photos[2]||p.photos[0]}" alt=""/>
            ${p.photos.length>3 ? `<div class="gallery-more">+${p.photos.length-3} Foto</div>` : ''}
          </div>
        </div>
      ` : ''}
    </div>

    <div class="detail-layout">
      <div>
        <div class="detail-head">
          <div>
            <span class="badge ${availabilityBadgeClass(p.availability)}">${availabilityLabel(p.availability)}</span>
            <h1 class="detail-title mt-8">${p.name}</h1>
            <div class="detail-loc">📍 ${p.address}</div>
            <div class="detail-rating">⭐ ${p.rating} <span class="text-tertiary" style="font-weight:500;">(${p.reviewCount} ulasan · ${p.viewCount} dilihat)</span></div>
          </div>
          <div style="text-align:right;">
            <div class="card-price" style="font-size:23px;">${formatRupiah(p.price)}<span>/bulan</span></div>
            <div class="flex gap-8 mt-8" style="justify-content:flex-end;">
              <button class="btn btn-secondary btn-sm" onclick="handleFavClick('${p.id}', this)">
                ${fav ? '❤️ Tersimpan' : '🤍 Simpan'}
              </button>
              <button class="btn btn-secondary btn-sm" onclick="shareProperty('${p.id}')">🔗 Bagikan</button>
            </div>
          </div>
        </div>
        <p class="mt-16">${p.description}</p>

        <div class="info-panel">
          <h3>Informasi Properti</h3>
          <div class="info-grid">
            <div class="info-item"><span class="lbl">Jenis</span><span class="val">${typeLabel(p.type)}</span></div>
            <div class="info-item"><span class="lbl">Furnitur</span><span class="val">${({furnished:"Furnished",semi_furnished:"Semi Furnished",unfurnished:"Unfurnished"})[p.furnished]}</span></div>
            <div class="info-item"><span class="lbl">Luas Bangunan</span><span class="val">${p.buildingArea} m²</span></div>
            <div class="info-item"><span class="lbl">Luas Tanah</span><span class="val">${p.landArea} m²</span></div>
            <div class="info-item"><span class="lbl">Kamar</span><span class="val">${p.bedrooms} Kamar Tidur</span></div>
            <div class="info-item"><span class="lbl">Kamar Mandi</span><span class="val">${p.bathrooms} Kamar Mandi</span></div>
            <div class="info-item"><span class="lbl">Daya Listrik</span><span class="val">${p.electricity}</span></div>
            <div class="info-item"><span class="lbl">Sumber Air</span><span class="val">${p.waterSource}</span></div>
            <div class="info-item"><span class="lbl">Tahun Bangun</span><span class="val">${p.yearBuilt}</span></div>
            <div class="info-item"><span class="lbl">Minimal Sewa</span><span class="val">${p.minRent}</span></div>
          </div>
        </div>

        <div class="info-panel">
          <h3>Fasilitas</h3>
          <div class="chips">${p.facilities.map(f=>`<span class="chip">✓ ${f}</span>`).join("")}</div>
        </div>

        <div class="info-panel">
          <h3>Kelebihan &amp; Kekurangan</h3>
          <div class="pros-cons">
            <div>
              <div class="filter-group-title" style="color:var(--forest);">Kelebihan</div>
              <ul class="pc-list pros">${p.pros.map(x=>`<li>${x}</li>`).join("")}</ul>
            </div>
            <div>
              <div class="filter-group-title" style="color:var(--amber);">Kekurangan</div>
              <ul class="pc-list cons">${p.cons.map(x=>`<li>${x}</li>`).join("")}</ul>
            </div>
          </div>
        </div>

        <div class="info-panel">
          <h3>Ketersediaan Unit</h3>
          <div class="info-grid" style="grid-template-columns:repeat(${p.unitPerbaikan>0?4:3},1fr);text-align:center;">
            <div class="info-item"><span class="val" style="font-size:20px;">${p.totalUnit}</span><span class="lbl">Total Unit</span></div>
            <div class="info-item"><span class="val" style="font-size:20px;">${p.unitTerisi}</span><span class="lbl">Terisi</span></div>
            ${p.unitPerbaikan>0 ? `<div class="info-item"><span class="val" style="font-size:20px;color:var(--amber);">${p.unitPerbaikan}</span><span class="lbl">Perbaikan</span></div>` : ''}
            <div class="info-item"><span class="val" style="font-size:20px;color:var(--forest);">${p.unitKosong}</span><span class="lbl">Kosong</span></div>
          </div>
          <div class="progress-track"><div class="progress-fill" style="width:${pct}%;"></div></div>
          <div class="avail-row"><span>${pct}% Terisi</span><span>${availabilityLabel(p.availability)}</span></div>
        </div>

        ${p.units && p.units.length > 1 ? `
        <div class="info-panel">
          <h3>🗺️ Peta Unit — Cek Nomor Satu per Satu</h3>
          <p class="text-sm mb-16">Klik nomor unit untuk melihat statusnya, seperti memilih kursi bioskop.</p>
          <div class="unit-legend">
            <span class="unit-legend-item"><i class="unit-dot kosong"></i> Kosong</span>
            <span class="unit-legend-item"><i class="unit-dot terisi"></i> Terisi</span>
            ${p.unitPerbaikan>0 ? `<span class="unit-legend-item"><i class="unit-dot perbaikan"></i> Perbaikan</span>` : ''}
          </div>
          <div class="unit-grid" id="unit-grid">
            ${p.units.map(u=>`<button type="button" class="unit-slot ${u.status}" onclick="showUnitInfo('${p.id}', ${u.number})">${u.number}</button>`).join("")}
          </div>
          <div class="unit-info-box" id="unit-info-box">👆 Klik salah satu nomor unit di atas untuk melihat statusnya.</div>
        </div>
        ` : ''}

        <div class="info-panel">
          <h3>Lokasi</h3>
          <div class="map-placeholder">
            <span class="map-pin">📍</span>
            <span style="margin-top:60px;">${p.district}, ${p.city}, ${p.province}</span>
          </div>
        </div>
      </div>

      <div class="sticky-box">
        <div class="info-panel">
          <h3>Pemilik Kontrakan</h3>
          ${user ? `
            <div class="owner-card">
              <img src="${owner.avatar}" class="avatar-lg" alt="${owner.name}"/>
              <div>
                <div class="name">${owner.name} ${owner.verified ? '<span class="verified-tick">✔️</span>' : ''}</div>
                <div class="text-sm text-tertiary">${owner.verified ? 'Pemilik Terverifikasi' : 'Belum Terverifikasi'}</div>
                <div class="text-sm text-tertiary">${getProperties().filter(x=>x.ownerId===owner.id).length} properti terdaftar</div>
              </div>
            </div>
            <a href="tel:${owner.phone}" class="btn btn-primary btn-block mt-16">📞 Hubungi ${owner.phone}</a>
            <button class="btn btn-secondary btn-block mt-8" onclick="toast('Pesan terkirim ke pemilik (demo)','success')">💬 Kirim Pesan</button>
          ` : `
            <div class="locked-box">
              <img src="${owner.avatar}" class="avatar-lg" style="margin:0 auto 12px;filter:blur(3px);opacity:.6;" alt=""/>
              <p class="mb-16">Masuk untuk melihat kontak lengkap dan mengirim pesan ke pemilik kontrakan ini.</p>
              <button type="button" class="btn btn-primary btn-block" onclick="openLoginRequiredModal('Masuk untuk mengirim pesan ke pemilik kontrakan ini.')">💬 Kirim Pesan ke Pemilik</button>
              <a href="login.html" class="btn btn-secondary btn-block mt-8">Masuk</a>
              <a href="register.html" class="btn btn-ghost btn-block mt-8">Daftar</a>
            </div>
          `}
        </div>
      </div>
    </div>
  `;

  renderRelatedProperties(p);
  renderMobileCtaBar(p, user);

  if(!user){
    setTimeout(()=>openLoginRequiredModal("Masuk untuk melihat informasi lengkap properti ini, termasuk semua foto dan kontak pemilik."), 500);
  }
}

function renderRelatedProperties(p){
  const section = document.getElementById("related-section");
  if(!section) return;
  const related = getProperties()
    .filter(isPublic)
    .filter(x=>x.id!==p.id && (x.city===p.city || x.type===p.type))
    .slice(0,4);
  if(!related.length){ section.innerHTML = ""; return; }
  section.innerHTML = `
    <div class="section-head">
      <div>
        <span class="eyebrow">Rekomendasi</span>
        <h2 class="section-title" style="font-size:22px;">Properti Serupa</h2>
      </div>
    </div>
    <div class="grid-cards">${related.map(propertyCardHtml).join("")}</div>
  `;
}

function renderMobileCtaBar(p, user){
  const bar = document.getElementById("mobile-cta-bar");
  if(!bar) return;
  bar.innerHTML = `
    <div>
      <div class="price">${formatRupiah(p.price)}<span>/bulan</span></div>
      <div class="text-tertiary" style="font-size:11.5px;">${availabilityLabel(p.availability)} · ${p.unitKosong} unit kosong</div>
    </div>
    ${user
      ? `<a href="tel:${getUsers().find(u=>u.id===p.ownerId)?.phone}" class="btn btn-primary">📞 Hubungi</a>`
      : `<button type="button" class="btn btn-primary" onclick="openLoginRequiredModal('Masuk untuk mengirim pesan ke pemilik kontrakan ini.')">💬 Kirim Pesan</button>`
    }
  `;
}

function shareProperty(id){
  const url = window.location.origin + window.location.pathname + "?id=" + id;
  if(navigator.share){
    navigator.share({ title: "Cartok", url }).catch(()=>{});
  } else if(navigator.clipboard){
    navigator.clipboard.writeText(url).then(()=>toast("Tautan properti disalin","success"));
  } else {
    toast("Tautan: " + url, "success");
  }
}

/* ---------------- Unit map (cinema-seat-style availability picker) ---------------- */
const UNIT_STATUS_META = {
  kosong: { label:"Kosong", desc:"Unit ini masih kosong dan siap disewa.", icon:"🟢" },
  terisi: { label:"Terisi", desc:"Unit ini sedang dihuni penyewa lain.", icon:"🔴" },
  perbaikan: { label:"Sedang Perbaikan", desc:"Unit ini sedang dalam perbaikan dan belum bisa disewa.", icon:"🟡" }
};

function showUnitInfo(propId, unitNumber){
  const p = getPropertyById(propId);
  if(!p || !p.units) return;
  const unit = p.units.find(u=>u.number===unitNumber);
  if(!unit) return;

  document.querySelectorAll("#unit-grid .unit-slot").forEach(el=>el.classList.remove("active"));
  const btn = document.querySelector(`#unit-grid .unit-slot:nth-child(${unitNumber})`);
  if(btn) btn.classList.add("active");

  const meta = UNIT_STATUS_META[unit.status];
  const box = document.getElementById("unit-info-box");
  if(!box) return;

  let actionHtml = "";
  if(unit.status === "kosong"){
    const user = getCurrentUser();
    actionHtml = user
      ? `<button class="btn btn-sm btn-primary mt-8" onclick="document.querySelector('.owner-card')?.scrollIntoView({behavior:'smooth',block:'center'})">Hubungi Pemilik untuk Unit Ini</button>`
      : `<button class="btn btn-sm btn-primary mt-8" onclick="openLoginRequiredModal('Masuk untuk menghubungi pemilik soal unit ini.')">Masuk untuk Hubungi Pemilik</button>`;
  }

  box.innerHTML = `
    <div class="unit-info-head">
      <span class="unit-info-num">${meta.icon} Unit No. ${unit.number}</span>
      <span class="badge ${unit.status==='kosong'?'badge-available':unit.status==='perbaikan'?'badge-almost':'badge-full'}">${meta.label}</span>
    </div>
    <p class="text-sm mt-8">${meta.desc}</p>
    ${actionHtml}
  `;
}


function openLightbox(startIdx){
  const params = new URLSearchParams(window.location.search);
  const p = getPropertyById(params.get("id"));
  if(!p) return;
  if(!getCurrentUser()){
    openLoginRequiredModal("Masuk untuk melihat semua foto properti ini.");
    return;
  }
  openModal(`
    <h3>Galeri Foto — ${p.name}</h3>
    <img id="lightbox-img" src="${p.photos[startIdx]}" style="width:100%;border-radius:12px;margin-top:10px;aspect-ratio:16/10;object-fit:cover;"/>
    <div class="flex gap-8 mt-16" style="overflow-x:auto;">
      ${p.photos.map((ph,i)=>`<img src="${ph}" style="width:70px;height:56px;object-fit:cover;border-radius:8px;cursor:pointer;opacity:${i===startIdx?1:0.55};" onclick="document.getElementById('lightbox-img').src='${ph}'"/>`).join("")}
    </div>
  `, { large:true });
}
