/* ==========================================================================
   CARTOK — admin.js
   Super Admin dashboard: platform stats, owner verification, property
   verification, user management, reports.
   ========================================================================== */

function initAdminDashboard(){
  const user = requireRole("admin");
  if(!user) return;

  document.getElementById("dash-user-name").textContent = user.name;
  document.getElementById("dash-user-avatar").src = user.avatar;
  document.getElementById("dash-user-role").textContent = "Super Admin";
  const welcomeEl = document.getElementById("welcome-name");
  if(welcomeEl) welcomeEl.textContent = `Halo, ${user.name.split(" ")[0]} 👋`;

  wireSidebarNav();
  renderAdminOverview();
  renderPendingOwners();
  renderPendingProperties();
  renderAllProperties();
  renderAllUsers();
  if(typeof initScrollReveal === "function") initScrollReveal();

  document.getElementById("theme-toggle-dash").addEventListener("click", toggleTheme);
  document.getElementById("reset-demo-btn")?.addEventListener("click", ()=>{
    openModal(`
      <div class="modal-icon" style="background:var(--red-soft);color:var(--red);">⚠️</div>
      <h3>Reset seluruh data demo?</h3>
      <p>Semua data pengguna, properti, dan favorit akan dikembalikan ke kondisi awal. Tindakan ini tidak dapat dibatalkan.</p>
      <div class="modal-actions">
        <button class="btn btn-secondary btn-block" onclick="closeModal()">Batal</button>
        <button class="btn btn-danger btn-block" onclick="resetDemoData(); toast('Data demo berhasil direset','success'); setTimeout(()=>location.reload(),700); closeModal();">Reset</button>
      </div>
    `);
  });
}

function renderAdminOverview(){
  const props = getProperties();
  const users = getUsers();
  const stat = (id,val)=>{ const el=document.getElementById(id); if(el) el.textContent = val; };
  stat("stat-total-properties", props.length);
  stat("stat-active-properties", props.filter(p=>p.status==="aktif").length);
  stat("stat-pending-properties", props.filter(p=>p.status==="menunggu_verifikasi").length);
  stat("stat-total-owners", users.filter(u=>u.role==="owner").length);
  stat("stat-total-users", users.filter(u=>u.role==="user").length);
  stat("stat-pending-owners", users.filter(u=>u.role==="owner" && !u.verified).length);
  stat("stat-total-units", props.reduce((s,p)=>s+p.totalUnit,0));
  stat("stat-empty-units", props.reduce((s,p)=>s+p.unitKosong,0));

  const chartEl = document.getElementById("admin-chart");
  if(chartEl){
    const byCity = {};
    props.forEach(p=>{ byCity[p.city] = (byCity[p.city]||0)+1; });
    const entries = Object.entries(byCity).sort((a,b)=>b[1]-a[1]).slice(0,7);
    const max = Math.max(1,...entries.map(e=>e[1]));
    chartEl.innerHTML = entries.map(([city,count])=>`
      <div class="bar-col">
        <div class="bar" style="height:${Math.max(6,(count/max)*140)}px;" title="${count} properti"></div>
        <div class="bar-label">${city}</div>
      </div>
    `).join("");
  }
}

/* ---------------- Owner verification ---------------- */
function renderPendingOwners(){
  const tbody = document.getElementById("pending-owners-body");
  if(!tbody) return;
  const users = getUsers();
  const pending = users.filter(u=>u.role==="owner" && !u.verified);
  const emptyEl = document.getElementById("pending-owners-empty");
  const tableEl = document.getElementById("pending-owners-table");

  if(!pending.length){ emptyEl.classList.remove("hidden"); tableEl.classList.add("hidden"); return; }
  emptyEl.classList.add("hidden"); tableEl.classList.remove("hidden");

  tbody.innerHTML = pending.map(u=>`
    <tr>
      <td><img src="${u.avatar}" class="row-thumb" style="border-radius:50%;"/></td>
      <td class="font-bold">${u.name}</td>
      <td>${u.email}</td>
      <td>${u.phone}</td>
      <td>${getProperties().filter(p=>p.ownerId===u.id).length}</td>
      <td>${u.createdAt}</td>
      <td>
        <div class="table-actions">
          <button class="btn btn-sm btn-primary" onclick="approveOwner('${u.id}')">✓ Setujui</button>
          <button class="btn btn-sm btn-danger" onclick="rejectOwner('${u.id}')">✕ Tolak</button>
        </div>
      </td>
    </tr>
  `).join("");
}
function approveOwner(id){
  const users = getUsers();
  const u = users.find(x=>x.id===id);
  u.verified = true;
  saveUsers(users);
  toast(`${u.name} berhasil diverifikasi`, "success");
  renderPendingOwners(); renderAllUsers(); renderAdminOverview();
}
function rejectOwner(id){
  const users = getUsers();
  const u = users.find(x=>x.id===id);
  saveUsers(users.filter(x=>x.id!==id));
  toast(`Pendaftaran ${u.name} ditolak`, "warn");
  renderPendingOwners(); renderAllUsers(); renderAdminOverview();
}
function suspendOwner(id){
  openModal(`
    <div class="modal-icon" style="background:var(--amber-soft);color:var(--amber);">⏸</div>
    <h3>Suspend pemilik ini?</h3>
    <p>Pemilik tidak akan bisa menambah properti baru sampai diaktifkan kembali oleh admin.</p>
    <div class="modal-actions">
      <button class="btn btn-secondary btn-block" onclick="closeModal()">Batal</button>
      <button class="btn btn-danger btn-block" onclick="doSuspendOwner('${id}')">Suspend</button>
    </div>
  `);
}
function doSuspendOwner(id){
  const users = getUsers();
  const u = users.find(x=>x.id===id);
  u.verified = false;
  saveUsers(users);
  toast(`${u.name} disuspend`, "warn");
  closeModal();
  renderAllUsers(); renderPendingOwners(); renderAdminOverview();
}

/* ---------------- Property verification ---------------- */
function renderPendingProperties(){
  const grid = document.getElementById("pending-properties-grid");
  if(!grid) return;
  const pending = getProperties().filter(p=>p.status==="menunggu_verifikasi");
  if(!pending.length){
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="icon">✅</div><h3>Semua properti sudah ditinjau</h3><p>Tidak ada pengajuan properti baru saat ini.</p></div>`;
    return;
  }
  const users = getUsers();
  grid.innerHTML = pending.map(p=>{
    const owner = users.find(u=>u.id===p.ownerId);
    return `
    <div class="panel verify-card">
      <div class="verify-card-media">
        <img src="${p.photos[0]}"/>
      </div>
      <div class="verify-card-body">
        <div class="verify-card-head">
          <div>
            <span class="badge badge-pending" style="margin-bottom:6px;">⏳ Menunggu Verifikasi</span>
            <div class="font-bold" style="font-family:var(--font-display);font-size:16px;">${p.name}</div>
            <div class="text-sm text-tertiary">📍 ${p.district}, ${p.city} · ${typeLabel(p.type)}</div>
            <div class="text-sm text-tertiary">🧑‍💼 Pemilik: ${owner?.name || '-'}</div>
          </div>
          <div class="verify-card-price">
            <div class="font-bold" style="font-family:var(--font-display);color:var(--text-primary);font-size:17px;">${formatRupiah(p.price)}</div>
            <div class="text-sm text-tertiary">${p.unitKosong}/${p.totalUnit} unit kosong</div>
          </div>
        </div>
        <div class="table-actions mt-16">
          <button class="btn btn-sm btn-primary" onclick="approveProperty('${p.id}')">✓ Approve</button>
          <button class="btn btn-sm btn-secondary" onclick="requestRevision('${p.id}')">✎ Revisi</button>
          <button class="btn btn-sm btn-danger" onclick="rejectProperty('${p.id}')">✕ Reject</button>
          <a href="detail.html?id=${p.id}" target="_blank" class="btn btn-sm btn-ghost">👁 Lihat</a>
          </div>
        </div>
      </div>
    </div>`;
  }).join("");
}
function approveProperty(id){
  updateProperty(id, { status:"aktif" });
  toast("Properti disetujui dan tayang di halaman publik", "success");
  renderPendingProperties(); renderAllProperties(); renderAdminOverview();
}
function rejectProperty(id){
  updateProperty(id, { status:"ditolak" });
  toast("Properti ditolak", "warn");
  renderPendingProperties(); renderAllProperties(); renderAdminOverview();
}
function requestRevision(id){
  updateProperty(id, { status:"tidak_aktif" });
  toast("Permintaan revisi dikirim ke pemilik", "warn");
  renderPendingProperties(); renderAllProperties(); renderAdminOverview();
}

/* ---------------- All properties ---------------- */
function renderAllProperties(){
  const tbody = document.getElementById("all-properties-body");
  if(!tbody) return;
  const users = getUsers();
  const props = getProperties();
  tbody.innerHTML = props.map(p=>{
    const owner = users.find(u=>u.id===p.ownerId);
    return `
    <tr>
      <td><img src="${p.photos[0]}" class="row-thumb"/></td>
      <td><div class="font-bold">${p.name}</div><div class="text-sm text-tertiary">${p.city}</div></td>
      <td>${owner?.name || '-'}</td>
      <td>${formatRupiah(p.price)}</td>
      <td><span class="status-pill ${statusBadgeClass(p.status)}">${statusLabel(p.status)}</span></td>
      <td>
        <div class="table-actions">
          <a href="detail.html?id=${p.id}" target="_blank" class="btn btn-sm btn-ghost">👁</a>
          <button class="btn btn-sm btn-danger" onclick="adminDeleteProperty('${p.id}')">🗑️</button>
        </div>
      </td>
    </tr>`;
  }).join("");
}
function adminDeleteProperty(id){
  deleteProperty(id);
  toast("Properti dihapus oleh admin", "success");
  renderAllProperties(); renderPendingProperties(); renderAdminOverview();
}

/* ---------------- All users ---------------- */
function renderAllUsers(){
  const tbody = document.getElementById("all-users-body");
  if(!tbody) return;
  const users = getUsers().filter(u=>u.role!=="admin");
  tbody.innerHTML = users.map(u=>`
    <tr>
      <td><img src="${u.avatar}" class="row-thumb" style="border-radius:50%;"/></td>
      <td class="font-bold">${u.name}</td>
      <td>${u.email}</td>
      <td><span class="chip">${u.role==='owner'?'Pemilik':'Pencari Kontrakan'}</span></td>
      <td><span class="status-pill ${u.verified ? 'badge-available':'badge-pending'}">${u.verified ? 'Aktif':'Belum Verifikasi'}</span></td>
      <td>
        ${u.role==='owner' ? `<button class="btn btn-sm ${u.verified?'btn-danger':'btn-primary'}" onclick="${u.verified?`suspendOwner('${u.id}')`:`approveOwner('${u.id}')`}">${u.verified?'Suspend':'Aktifkan'}</button>` : ''}
      </td>
    </tr>
  `).join("");
}
