/* ==========================================================================
   CARTOK — auth.js
   Session management + login/register/logout + role guarding.
   ========================================================================== */

function getCurrentUser(){
  const session = JSON.parse(localStorage.getItem(DB_KEYS.session) || "null");
  if(!session) return null;
  return getUsers().find(u=>u.id===session.userId) || null;
}

function isLoggedIn(){ return !!getCurrentUser(); }

function login(email, password){
  const users = getUsers();
  const user = users.find(u=>u.email.toLowerCase()===email.toLowerCase() && u.password===password);
  if(!user) return { ok:false, message:"Email atau kata sandi salah." };
  localStorage.setItem(DB_KEYS.session, JSON.stringify({ userId:user.id }));
  return { ok:true, user };
}

function logout(){
  localStorage.removeItem(DB_KEYS.session);
  window.location.href = "index.html";
}

function register({ name, email, password, role, phone }){
  const users = getUsers();
  if(users.some(u=>u.email.toLowerCase()===email.toLowerCase())){
    return { ok:false, message:"Email sudah terdaftar. Gunakan email lain." };
  }
  const newUser = {
    id: (role==="owner"?"owner-":"user-") + Date.now(),
    name, email, password,
    role: role || "user",
    phone: phone || "-",
    avatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(email)}`,
    verified: role === "owner" ? false : true,
    createdAt: new Date().toISOString().slice(0,10)
  };
  users.push(newUser);
  saveUsers(users);
  localStorage.setItem(DB_KEYS.session, JSON.stringify({ userId:newUser.id }));
  return { ok:true, user:newUser };
}

/**
 * Guards a dashboard page: redirect if not logged in or wrong role.
 * Call at top of dashboard pages.
 */
function requireRole(requiredRole){
  const user = getCurrentUser();
  if(!user){
    window.location.href = "login.html?redirect=" + encodeURIComponent(window.location.pathname.split("/").pop());
    return null;
  }
  if(user.role !== requiredRole){
    renderAccessDenied(requiredRole);
    return null;
  }
  return user;
}

function renderAccessDenied(requiredRole){
  document.body.innerHTML = `
    <div class="access-denied">
      <div class="icon">🚫</div>
      <h2>Akses Ditolak</h2>
      <p style="max-width:380px">Halaman ini khusus untuk akun <b>${requiredRole}</b>. Akun kamu tidak memiliki izin untuk membuka halaman ini.</p>
      <div class="flex gap-12 mt-16">
        <a href="index.html" class="btn btn-primary">Kembali ke Beranda</a>
      </div>
    </div>`;
}

const DEMO_ACCOUNTS = {
  user: { email:"user@demo.com", password:"123456" },
  owner: { email:"owner@demo.com", password:"123456" },
  admin: { email:"admin@demo.com", password:"admin123" }
};
