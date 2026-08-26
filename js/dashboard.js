/* ==========================================================================
   CARTOK — dashboard.js
   Owner dashboard: overview stats, property CRUD, add/edit form, messages,
   profile. Single-page app with sidebar section switching.
   ========================================================================== */

let OWNER_EDITING_ID = null;
let OWNER_PHOTOS = [];
let OWNER_PROS = [];
let OWNER_CONS = [];

function initOwnerDashboard(){
  const user = requireRole("owner");
  if(!user) return;

  document.getElementById("dash-user-name").textContent = user.name;
  document.getElementById("dash-user-avatar").src = user.avatar;
  document.getElementById("dash-user-role").textContent = user.verified ? "Pemilik Terverifikasi" : "Menunggu Verifikasi";
  const welcomeEl = document.getElementById("welcome-name");
  if(welcomeEl) welcomeEl.textContent = `Halo, ${user.name.split(" ")[0]} 👋`;

  wireSidebarNav();
  renderOwnerOverview(user);
  renderMyProperties(user);
  setupFacilityCheckboxes();
  setupPropertyForm(user);
  renderOwnerMessages();
  renderOwnerProfile(user);
  if(typeof initScrollReveal === "function") initScrollReveal();

  document.getElementById("theme-toggle-dash").addEventListener("click", toggleTheme);
}

/* wireSidebarNav is defined in app.js (shared by both owner & admin dashboards) */

/* ---------------- Overview ---------------- */
function renderOwnerOverview(user){
  const myProps = getProperties().filter(p=>p.ownerId===user.id);
  const stat = (id,val)=>{ const el=document.getElementById(id); if(el) el.textContent = val; };
  stat("stat-total-prop", myProps.length);
  stat("stat-active-prop", myProps.filter(p=>p.status==="aktif").length);
  stat("stat-pending-prop", myProps.filter(p=>p.status==="menunggu_verifikasi").length);
  stat("stat-full-prop", myProps.filter(p=>p.availability==="penuh").length);
  stat("stat-total-unit", myProps.reduce((s,p)=>s+p.totalUnit,0));
  stat("stat-empty-unit", myProps.reduce((s,p)=>s+p.unitKosong,0));
  stat("stat-total-view", myProps.reduce((s,p)=>s+p.viewCount,0));
  stat("stat-total-fav", myProps.reduce((s,p)=>s+p.favoriteCount,0));

  const chartEl = document.getElementById("owner-chart");
  if(chartEl){
    const top = [...myProps].sort((a,b)=>b.viewCount-a.viewCount).slice(0,6);
    const max = Math.max(1, ...top.map(p=>p.viewCount));
    chartEl.innerHTML = top.map(p=>`
      <div class="bar-col">
        <div class="bar" style="height:${Math.max(6,(p.viewCount/max)*140)}px;" title="${p.viewCount} views"></div>
        <div class="bar-label">${p.name.split(" ").slice(0,2).join(" ")}</div>
      </div>
    `).join("") || `<p class="text-tertiary">Belum ada data dilihat.</p>`;
  }
}

/* ---------------- Properti Saya ---------------- */
function renderMyProperties(user){
  const tbody = document.getElementById("my-properties-body");
  if(!tbody) return;
  const myProps = getProperties().filter(p=>p.ownerId===user.id).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));

  if(!myProps.length){
    document.getElementById("my-properties-empty").classList.remove("hidden");
    document.getElementById("my-properties-table").classList.add("hidden");
    return;
  }
  document.getElementById("my-properties-empty").classList.add("hidden");
  document.getElementById("my-properties-table").classList.remove("hidden");

  tbody.innerHTML = myProps.map(p=>`
    <tr>
      <td><img src="${p.photos[0]}" class="row-thumb"/></td>
      <td>
        <div class="font-bold">${p.name}</div>
        <div class="text-sm text-tertiary">${p.city} · ${typeLabel(p.type)}</div>
      </td>
      <td>${formatRupiah(p.price)}</td>
      <td>${p.unitKosong}/${p.totalUnit}</td>
      <td><span class="status-pill ${statusBadgeClass(p.status)}">${statusLabel(p.status)}</span></td>
      <td>
        <select class="sort-select" style="padding:6px 8px;font-size:12px;" onchange="ownerChangeAvailability('${p.id}', this.value)" ${p.status!=='aktif'?'disabled':''}>
          <option value="tersedia" ${p.availability==='tersedia'?'selected':''}>Tersedia</option>
          <option value="hampir_penuh" ${p.availability==='hampir_penuh'?'selected':''}>Hampir Penuh</option>
          <option value="penuh" ${p.availability==='penuh'?'selected':''}>Penuh</option>
        </select>
      </td>
      <td>
        <div class="table-actions">
          <button class="btn btn-sm btn-secondary" onclick="editOwnerProperty('${p.id}')">✏️ Edit</button>
          <button class="btn btn-sm btn-danger" onclick="confirmDeleteProperty('${p.id}')">🗑️</button>
        </div>
      </td>
    </tr>
  `).join("");
}

function ownerChangeAvailability(id, val){
  updateProperty(id, { availability:val, manualAvailability:true });
  toast("Status ketersediaan diperbarui", "success");
  renderMyProperties(getCurrentUser());
  renderOwnerOverview(getCurrentUser());
}

function confirmDeleteProperty(id){
  openModal(`
    <div class="modal-icon" style="background:var(--red-soft);color:var(--red);">🗑️</div>
    <h3>Hapus properti ini?</h3>
    <p>Tindakan ini tidak dapat dibatalkan. Properti akan dihapus permanen dari platform.</p>
    <div class="modal-actions">
      <button class="btn btn-secondary btn-block" onclick="closeModal()">Batal</button>
      <button class="btn btn-danger btn-block" onclick="deleteProperty('${id}'); closeModal(); renderMyProperties(getCurrentUser()); renderOwnerOverview(getCurrentUser()); toast('Properti berhasil dihapus','success');">Hapus</button>
    </div>
  `);
}

/* ---------------- Add/Edit Property Form ---------------- */
function setupFacilityCheckboxes(){
  const box = document.getElementById("facility-checkboxes");
  if(!box) return;
  box.innerHTML = FACILITIES_POOL.map(f=>`
    <label class="check-row"><input type="checkbox" value="${f}" name="facility"/> ${f}</label>
  `).join("");
}

function addDynamicRow(containerId, arr, placeholder){
  const container = document.getElementById(containerId);
  const idx = arr.length;
  arr.push("");
  const row = document.createElement("div");
  row.className = "dynamic-input-row";
  row.dataset.idx = idx;
  row.innerHTML = `
    <input type="text" placeholder="${placeholder}" onchange="updateDynamicValue('${containerId}',${idx},this.value, ${containerId==='pros-list'?'true':'false'})"/>
    <button type="button" class="remove-row-btn" onclick="this.parentElement.remove()">✕</button>
  `;
  container.appendChild(row);
}
function updateDynamicValue(containerId, idx, value, isPros){
  const arr = isPros ? OWNER_PROS : OWNER_CONS;
  arr[idx] = value;
}
function collectDynamicValues(containerId){
  const rows = document.querySelectorAll(`#${containerId} .dynamic-input-row input`);
  return Array.from(rows).map(i=>i.value.trim()).filter(Boolean);
}

function handlePhotoUpload(input){
  const files = Array.from(input.files || []);
  if(OWNER_PHOTOS.length + files.length > 10){
    toast("Maksimal 10 foto per properti", "warn");
    return;
  }
  files.forEach(file=>{
    if(file.size > 900 * 1024){
      toast(`File "${file.name}" terlalu besar (maks 900KB untuk demo)`, "warn");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e)=>{
      OWNER_PHOTOS.push(e.target.result);
      renderPhotoPreview();
    };
    reader.readAsDataURL(file);
  });
  input.value = "";
}
function addPlaceholderPhoto(){
  if(OWNER_PHOTOS.length >= 10){ toast("Maksimal 10 foto per properti","warn"); return; }
  OWNER_PHOTOS.push(PLACEHOLDER_PHOTOS[Math.floor(Math.random()*PLACEHOLDER_PHOTOS.length)]);
  renderPhotoPreview();
}
function renderPhotoPreview(){
  const grid = document.getElementById("photo-preview-grid");
  grid.innerHTML = OWNER_PHOTOS.map((src,i)=>`
    <div class="photo-thumb">
      <img src="${src}"/>
      <button type="button" class="rm" onclick="removePhoto(${i})">✕</button>
    </div>
  `).join("");
  document.getElementById("photo-count").textContent = `${OWNER_PHOTOS.length}/10 foto`;
}
function removePhoto(i){
  OWNER_PHOTOS.splice(i,1);
  renderPhotoPreview();
}

function resetPropertyForm(){
  OWNER_EDITING_ID = null;
  OWNER_PHOTOS = [];
  OWNER_PROS = [];
  OWNER_CONS = [];
  const form = document.getElementById("property-form");
  if(form) form.reset();
  document.getElementById("pros-list").innerHTML = "";
  document.getElementById("cons-list").innerHTML = "";
  renderPhotoPreview();
  document.getElementById("form-title").textContent = "Tambah Properti Baru";
  document.getElementById("form-submit-btn").textContent = "Ajukan Properti";
}

function editOwnerProperty(id){
  const p = getPropertyById(id);
  if(!p) return;

  window.__editingProperty = true; // guard: prevents the sidebar nav handler from resetting the form
  OWNER_EDITING_ID = id;
  OWNER_PHOTOS = [...p.photos];
  OWNER_PROS = [];
  OWNER_CONS = [];

  document.querySelector('[data-section="add"]').click();
  document.getElementById("form-title").textContent = "Edit Properti";
  document.getElementById("form-submit-btn").textContent = "Simpan Perubahan";

  const f = document.getElementById("property-form");
  // Always go through f.elements — safer and avoids the "name" collision entirely.
  const el = f.elements;
  el.name.value = p.name;
  el.type.value = p.type;
  el.description.value = p.description;
  el.price.value = p.price;
  el.minRent.value = p.minRent;
  el.province.value = p.province;
  el.city.value = p.city;
  el.district.value = p.district;
  el.address.value = p.address;
  el.totalUnit.value = p.totalUnit;
  el.unitKosong.value = p.unitKosong;
  el.unitPerbaikan.value = p.unitPerbaikan || 0;
  el.bedrooms.value = p.bedrooms;
  el.bathrooms.value = p.bathrooms;
  el.landArea.value = p.landArea;
  el.buildingArea.value = p.buildingArea;
  el.furnished.value = p.furnished;

  document.querySelectorAll('input[name="facility"]').forEach(cb=>{
    cb.checked = p.facilities.includes(cb.value);
  });

  document.getElementById("pros-list").innerHTML = "";
  document.getElementById("cons-list").innerHTML = "";
  p.pros.forEach(val=>{
    addDynamicRow("pros-list", OWNER_PROS, "Contoh: Dekat minimarket");
    OWNER_PROS[OWNER_PROS.length-1] = val;
    document.querySelector("#pros-list .dynamic-input-row:last-child input").value = val;
  });
  p.cons.forEach(val=>{
    addDynamicRow("cons-list", OWNER_CONS, "Contoh: Area sedikit ramai");
    OWNER_CONS[OWNER_CONS.length-1] = val;
    document.querySelector("#cons-list .dynamic-input-row:last-child input").value = val;
  });

  renderPhotoPreview();
  window.__editingProperty = false;
}

function setupPropertyForm(user){
  const form = document.getElementById("property-form");
  if(!form) return;
  resetPropertyForm();

  form.addEventListener("submit", (e)=>{
    e.preventDefault();
    const fd = new FormData(form);
    const totalUnit = parseInt(fd.get("totalUnit"));
    const unitKosong = parseInt(fd.get("unitKosong"));
    const unitPerbaikan = parseInt(fd.get("unitPerbaikan")) || 0;

    if(unitKosong + unitPerbaikan > totalUnit){
      toast("Unit kosong + unit perbaikan tidak boleh lebih besar dari total unit", "error");
      return;
    }
    if(!fd.get("name") || !fd.get("price") || !fd.get("city")){
      toast("Lengkapi semua field wajib", "error");
      return;
    }
    if(OWNER_PHOTOS.length === 0){
      toast("Tambahkan minimal 1 foto properti", "error");
      return;
    }

    const facilities = Array.from(document.querySelectorAll('input[name="facility"]:checked')).map(i=>i.value);
    const pros = collectDynamicValues("pros-list");
    const cons = collectDynamicValues("cons-list");
    const unitTerisi = totalUnit - unitKosong - unitPerbaikan;

    const payload = {
      ownerId: user.id,
      name: fd.get("name"),
      type: fd.get("type"),
      description: fd.get("description"),
      price: parseInt(fd.get("price")),
      minRent: fd.get("minRent"),
      province: fd.get("province"),
      city: fd.get("city"),
      district: fd.get("district"),
      address: fd.get("address"),
      totalUnit, unitKosong, unitPerbaikan, unitTerisi,
      units: buildUnitsLayout(totalUnit, unitKosong, unitTerisi, unitPerbaikan),
      bedrooms: parseInt(fd.get("bedrooms")),
      bathrooms: parseInt(fd.get("bathrooms")),
      landArea: parseInt(fd.get("landArea")) || 0,
      buildingArea: parseInt(fd.get("buildingArea")) || 0,
      electricity: "1300 VA",
      waterSource: "PDAM",
      yearBuilt: new Date().getFullYear(),
      furnished: fd.get("furnished"),
      facilities, pros, cons,
      photos: OWNER_PHOTOS,
    };

    if(OWNER_EDITING_ID){
      updateProperty(OWNER_EDITING_ID, payload);
      toast("Properti berhasil diperbarui", "success");
    } else {
      addProperty(payload);
      toast("Properti diajukan. Menunggu verifikasi admin.", "success");
    }

    resetPropertyForm();
    document.querySelector('[data-section="properties"]').click();
    renderMyProperties(user);
    renderOwnerOverview(user);
  });
}

/* ---------------- Pesan (demo) ---------------- */
function renderOwnerMessages(){
  const list = document.getElementById("owner-messages");
  if(!list) return;
  const names = ["Reza Firmansyah","Putri Ayu","Dimas Saputra","Wulan Sari"];
  const msgs = ["Apakah kamar masih tersedia untuk bulan depan?","Boleh minta info lebih lengkap soal parkir mobil?","Saya tertarik, bisa survey lokasi akhir pekan ini?","Apakah harga bisa nego untuk sewa 1 tahun?"];
  list.innerHTML = names.map((n,i)=>`
    <div class="panel" style="margin-bottom:12px;display:flex;gap:14px;align-items:flex-start;">
      <img src="https://i.pravatar.cc/100?img=${20+i}" class="avatar" style="width:44px;height:44px;"/>
      <div style="flex:1;">
        <div class="flex justify-between"><span class="font-bold">${n}</span><span class="text-tertiary text-sm">${i+1} hari lalu</span></div>
        <p class="text-sm mt-8">${msgs[i]}</p>
        <button class="btn btn-sm btn-secondary mt-8" onclick="toast('Balasan terkirim (demo)','success')">Balas</button>
      </div>
    </div>
  `).join("");
}

/* ---------------- Profile ---------------- */
function renderOwnerProfile(user){
  const form = document.getElementById("owner-profile-form");
  if(!form) return;
  // NOTE: form.name would collide with HTMLFormElement's own reserved "name" IDL
  // attribute in every spec-compliant browser, so we go through form.elements.
  const els = form.elements;
  els.name.value = user.name;
  els.email.value = user.email;
  els.phone.value = user.phone;
  form.addEventListener("submit",(e)=>{
    e.preventDefault();
    const users = getUsers();
    const idx = users.findIndex(u=>u.id===user.id);
    users[idx].name = els.name.value;
    users[idx].phone = els.phone.value;
    saveUsers(users);
    toast("Profil berhasil diperbarui", "success");
    document.getElementById("dash-user-name").textContent = users[idx].name;
  });
}
