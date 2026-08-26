/* ==========================================================================
   CARTOK — app.js
   Shared UI shell: navbar, footer, theme toggle, toast, modal, formatters.
   Runs on every page after storage.js + auth.js are loaded.
   ========================================================================== */

/* ---------------- Theme ---------------- */
function applyTheme(){
  const theme = localStorage.getItem(DB_KEYS.theme) || "light";
  document.documentElement.setAttribute("data-theme", theme);
}
function toggleTheme(){
  const current = localStorage.getItem(DB_KEYS.theme) || "light";
  const next = current === "light" ? "dark" : "light";
  localStorage.setItem(DB_KEYS.theme, next);
  applyTheme();
  document.querySelectorAll(".theme-toggle").forEach(btn=>{
    btn.textContent = next === "dark" ? "☀️" : "🌙";
  });
}
applyTheme(); // run immediately to avoid flash

/* ---------------- Formatters ---------------- */
function formatRupiah(n){
  return "Rp" + Number(n).toLocaleString("id-ID");
}
function typeLabel(type){
  return { kontrakan:"Kontrakan", kos_putra:"Kos Putra", kos_putri:"Kos Putri", kos_campur:"Kos Campur", perumahan:"Perumahan" }[type] || type;
}
function availabilityLabel(a){
  return { tersedia:"Tersedia", hampir_penuh:"Hampir Penuh", penuh:"Penuh" }[a] || a;
}
function availabilityBadgeClass(a){
  return { tersedia:"badge-available", hampir_penuh:"badge-almost", penuh:"badge-full" }[a] || "badge-pending";
}
function statusLabel(s){
  return {
    aktif:"Aktif", menunggu_verifikasi:"Menunggu Verifikasi", ditolak:"Ditolak",
    tidak_aktif:"Tidak Aktif"
  }[s] || s;
}
function statusBadgeClass(s){
  return {
    aktif:"badge-available", menunggu_verifikasi:"badge-pending",
    ditolak:"badge-full", tidak_aktif:"badge-pending"
  }[s] || "badge-pending";
}

/* ---------------- Toast ---------------- */
function ensureToastWrap(){
  let wrap = document.querySelector(".toast-wrap");
  if(!wrap){
    wrap = document.createElement("div");
    wrap.className = "toast-wrap";
    document.body.appendChild(wrap);
  }
  return wrap;
}
function toast(message, type="success"){
  const wrap = ensureToastWrap();
  const icon = { success:"✓", error:"✕", warn:"⚠" }[type] || "✓";
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  wrap.appendChild(el);
  setTimeout(()=>{
    el.classList.add("leaving");
    setTimeout(()=>el.remove(), 220);
  }, 2800);
}

/* ---------------- Modal ---------------- */
function ensureModalRoot(){
  let root = document.getElementById("modal-root");
  if(!root){
    root = document.createElement("div");
    root.id = "modal-root";
    document.body.appendChild(root);
  }
  return root;
}
function openModal(innerHtml, opts={}){
  const root = ensureModalRoot();
  root.innerHTML = `
    <div class="modal-overlay open" id="active-modal-overlay">
      <div class="modal ${opts.large ? 'modal-lg' : ''}">
        <button class="modal-close" onclick="closeModal()">✕</button>
        ${innerHtml}
      </div>
    </div>`;
  document.getElementById("active-modal-overlay").addEventListener("click", (e)=>{
    if(e.target.id === "active-modal-overlay") closeModal();
  });
}
function closeModal(){
  const root = document.getElementById("modal-root");
  if(root) root.innerHTML = "";
}

function openLoginRequiredModal(message){
  openModal(`
    <div class="modal-icon">🔒</div>
    <h3>Masuk untuk melanjutkan</h3>
    <p>${message || "Masuk untuk melihat informasi lengkap properti ini."}</p>
    <div class="modal-actions">
      <a href="login.html" class="btn btn-primary btn-block">Masuk</a>
      <a href="register.html" class="btn btn-secondary btn-block">Daftar</a>
    </div>
  `);
}

/* ---------------- Navbar / Footer ---------------- */
function renderNavbar(active){
  const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
  const theme = localStorage.getItem(DB_KEYS.theme) || "light";

  const navItems = [
    { href:"index.html", label:"Beranda", key:"home" },
    { href:"search.html?type=kontrakan", label:"Cari Kontrakan", key:"kontrakan" },
    { href:"search.html?type=kos", label:"Cari Kos", key:"kos" },
    { href:"index.html#cara-kerja", label:"Cara Kerja", key:"cara-kerja" },
    { href:"index.html#tentang", label:"Tentang Kami", key:"tentang" },
  ];

  const navLinksHtml = navItems.map(i=>`<a href="${i.href}" class="${active===i.key?'active':''}">${i.label}</a>`).join("");

  let rightHtml = "";
  if(user){
    let dashHref = "index.html";
    if(user.role==="owner") dashHref = "dashboard-owner.html";
    if(user.role==="admin") dashHref = "dashboard-admin.html";
    rightHtml = `
      <a href="favorites.html" class="btn-icon btn-ghost" title="Favorit" style="font-size:18px;display:flex;align-items:center;justify-content:center;">❤️</a>
      <div class="user-chip" onclick="window.location.href='${user.role==='user' ? 'favorites.html' : dashHref}'">
        <img src="${user.avatar}" class="avatar" alt="${user.name}"/>
        <span>${user.name.split(' ')[0]}</span>
      </div>
      ${user.role!=='user' ? `<a href="${dashHref}" class="btn btn-primary btn-sm">Dashboard</a>` : ''}
      <button class="btn btn-ghost btn-sm" onclick="logout()">Keluar</button>
    `;
  } else {
    rightHtml = `
      <a href="login.html" class="btn btn-secondary btn-sm">Masuk</a>
      <a href="register.html" class="btn btn-primary btn-sm">Daftar</a>
    `;
  }

  const html = `
    <div class="navbar-inner container">
      <a href="index.html" class="brand"><img src="img/icon-96.png" class="brand-mark" alt="Cartok"><span class="brand-text">Cartok<span class="brand-tagline">Cari Kontrakan</span></span></a>
      <nav class="nav-links">${navLinksHtml}</nav>
      <div class="nav-actions">
        <button class="theme-toggle" onclick="toggleTheme()">${theme==='dark'?'☀️':'🌙'}</button>
        ${rightHtml}
        <button class="hamburger" onclick="toggleMobileMenu()">☰</button>
      </div>
    </div>
    <div class="mobile-menu" id="mobile-menu">
      ${navItems.map(i=>`<a href="${i.href}">${i.label}</a>`).join("")}
      <hr style="border-color:var(--border);width:100%;margin:8px 0;">
      ${user ? `
        <a href="favorites.html">❤️ Favorit Saya</a>
        ${user.role!=='user' ? `<a href="${user.role==='owner'?'dashboard-owner.html':'dashboard-admin.html'}">📊 Dashboard</a>` : ''}
        <a href="#" onclick="logout();return false;">🚪 Keluar</a>
      ` : `
        <a href="login.html">Masuk</a>
        <a href="register.html">Daftar</a>
      `}
    </div>
  `;
  const target = document.getElementById("site-navbar");
  if(target){
    target.innerHTML = html;
    target.className = "navbar";
  }
  initNavbarElevation();
}

function toggleMobileMenu(){
  document.getElementById("mobile-menu").classList.toggle("open");
}

function renderFooter(){
  const target = document.getElementById("site-footer");
  if(!target) return;
  target.innerHTML = `
    <div class="container">
      <div class="footer-grid">
        <div>
          <a href="index.html" class="brand" style="margin-bottom:12px;"><img src="img/icon-96.png" class="brand-mark" alt="Cartok"><span class="brand-text">Cartok<span class="brand-tagline">Cari Kontrakan</span></span></a>
          <p style="max-width:280px;">Platform pencarian dan pendaftaran kontrakan &amp; kos-kosan terpercaya di Indonesia. Temukan kontrakan yang tepat sebelum datang ke lokasi.</p>
          <div class="socials mt-16">
            <a href="#" aria-label="Instagram">📷</a>
            <a href="#" aria-label="Facebook">📘</a>
            <a href="#" aria-label="Twitter">🐦</a>
            <a href="#" aria-label="TikTok">🎵</a>
          </div>
        </div>
        <div>
          <h5>Tentang</h5>
          <ul>
            <li><a href="index.html#tentang">Tentang Kami</a></li>
            <li><a href="index.html#cara-kerja">Cara Kerja</a></li>
            <li><a href="register.html">Karier</a></li>
            <li><a href="#">Blog</a></li>
          </ul>
        </div>
        <div>
          <h5>Bantuan</h5>
          <ul>
            <li><a href="#">Pusat Bantuan</a></li>
            <li><a href="#">Hubungi Kami</a></li>
            <li><a href="#">FAQ</a></li>
            <li><a href="#">Panduan Pemilik</a></li>
          </ul>
        </div>
        <div>
          <h5>Legal</h5>
          <ul>
            <li><a href="#">Kebijakan Privasi</a></li>
            <li><a href="#">Syarat &amp; Ketentuan</a></li>
            <li><a href="#">Kebijakan Cookie</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© 2026 Cartok. Seluruh hak cipta dilindungi.</span>
        <span>Dibuat dengan ❤️ untuk pencari kontrakan di Indonesia.</span>
      </div>
    </div>
  `;
}

/* ---------------- Motion: scroll reveal + counters ---------------- */
function initScrollReveal(){
  const items = document.querySelectorAll(".reveal");
  if(!items.length) return;
  if(!("IntersectionObserver" in window)){
    items.forEach(el=>el.classList.add("in-view"));
    return;
  }
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add("in-view");
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0, rootMargin: "0px 0px 120px 0px" }); // positive bottom margin: reveal ~120px before it enters the viewport, so scrolling never shows a blank gap
  items.forEach(el=>io.observe(el));
}

function animateCounter(el, target, opts={}){
  const duration = opts.duration || 1100;
  const suffix = opts.suffix || "";
  const start = performance.now();
  function step(now){
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(eased * target).toLocaleString("id-ID") + suffix;
    if(p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
function animateCounterOnView(el, target, opts={}){
  if(!("IntersectionObserver" in window)){ animateCounter(el, target, opts); return; }
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){ animateCounter(el, target, opts); io.unobserve(entry.target); }
    });
  }, { threshold: 0.4 });
  io.observe(el);
}

/* Duplicates marquee content once so the CSS translateX(-50%) loop is seamless */
function initMarquee(trackId){
  const track = document.getElementById(trackId);
  if(!track) return;
  track.innerHTML += track.innerHTML;
}

function wireSidebarNav(){
  document.querySelectorAll(".dash-nav a[data-section]").forEach(a=>{
    a.addEventListener("click", (e)=>{
      e.preventDefault();
      document.querySelectorAll(".dash-nav a").forEach(x=>x.classList.remove("active"));
      a.classList.add("active");
      document.querySelectorAll(".dash-section").forEach(s=>s.classList.add("hidden"));
      document.getElementById("section-"+a.dataset.section).classList.remove("hidden");
      document.getElementById("dash-sidebar")?.classList.remove("open");
      document.getElementById("dash-sidebar-scrim")?.classList.remove("open");
      if(a.dataset.section === "add" && typeof resetPropertyForm === "function" && !window.__editingProperty){
        resetPropertyForm();
      }
      if(typeof initScrollReveal === "function") initScrollReveal();
    });
  });
  document.getElementById("dash-menu-btn")?.addEventListener("click", ()=>{
    document.getElementById("dash-sidebar").classList.toggle("open");
    document.getElementById("dash-sidebar-scrim")?.classList.toggle("open");
  });
  document.getElementById("dash-sidebar-scrim")?.addEventListener("click", ()=>{
    document.getElementById("dash-sidebar").classList.remove("open");
    document.getElementById("dash-sidebar-scrim").classList.remove("open");
  });
}

/* ---------------- Page loader ----------------
   Pure CSS animation (transform/opacity only, GPU-cheap) so it never adds
   real weight. Shows for a small minimum time so it reads as an intentional
   moment rather than a flash, but never blocks longer than necessary — and
   never longer than 2.5s even if something stalls. */
function initPageLoader(){
  const loader = document.getElementById("page-loader");
  if(!loader) return;
  const start = performance.now();
  const minDisplay = 7000; // matches the 7s CSS progress-bar animation
  let hidden = false;
  const hide = ()=>{
    if(hidden) return;
    hidden = true;
    loader.classList.add("loader-hidden");
    setTimeout(()=>loader.remove(), 500);
  };
  const scheduleHide = ()=>{
    const elapsed = performance.now() - start;
    setTimeout(hide, Math.max(0, minDisplay - elapsed));
  };
  if(document.readyState === "complete"){
    scheduleHide();
  } else {
    window.addEventListener("load", scheduleHide);
  }
  setTimeout(hide, minDisplay + 2000); // safety net, in case 'load' never fires
}
initPageLoader();

/* ---------------- Sticky navbar elevation on scroll ---------------- */
function initNavbarElevation(){
  const nav = document.getElementById("site-navbar");
  if(!nav) return;
  const onScroll = ()=>{
    nav.classList.toggle("scrolled", window.scrollY > 8);
  };
  window.addEventListener("scroll", onScroll, { passive:true });
  onScroll();
}

/* ---------------- Init on every page ----------------
   Runs immediately (not on DOMContentLoaded) because storage.js/auth.js/app.js
   are loaded synchronously via <script src> before any inline page script
   runs, and those inline scripts need seeded data + correct theme right away. */
initializeData();
applyTheme();
