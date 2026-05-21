/* =============================================
   routes/admin.js
   POST /api/admin/login
   GET  /api/admin/enquiries   (dashboard page)
   GET  /api/admin/stats
   ============================================= */
const express = require('express');
const router  = express.Router();
const { db }  = require('../db');

/* ── Simple token store (in-memory, stateless) ── */
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'secret_admin_token';

/* ────────────────────────────────────────────
   POST /api/admin/login
   Body: { username, password }
   Returns: { success, token }
   ──────────────────────────────────────────── */
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Username and password required.' });
  }

  db.get(
    'SELECT * FROM admin_users WHERE username = ? AND password = ?',
    [username, password],
    (err, row) => {
      if (err)  return res.status(500).json({ success: false, error: 'DB error.' });
      if (!row) return res.status(401).json({ success: false, error: 'Invalid credentials.' });

      // Return the shared secret token (for simplicity; swap for JWT in production)
      res.json({ success: true, token: ADMIN_SECRET, username: row.username });
    }
  );
});

/* ── Auth middleware ── */
function requireAdmin(req, res, next) {
  const auth  = req.headers['authorization'] || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token || token !== ADMIN_SECRET) {
    return res.status(401).json({ success: false, error: 'Unauthorized.' });
  }
  next();
}

/* ────────────────────────────────────────────
   GET /api/admin/stats
   Returns summary counts for dashboard
   ──────────────────────────────────────────── */
router.get('/stats', requireAdmin, (req, res) => {
  const sql = `
    SELECT
      COUNT(*)                                              AS total,
      SUM(CASE WHEN status = 'new'       THEN 1 ELSE 0 END) AS new_leads,
      SUM(CASE WHEN status = 'contacted' THEN 1 ELSE 0 END) AS contacted,
      SUM(CASE WHEN status = 'converted' THEN 1 ELSE 0 END) AS converted,
      SUM(CASE WHEN status = 'closed'    THEN 1 ELSE 0 END) AS closed,
      SUM(CASE WHEN date(created_at) = date('now','localtime') THEN 1 ELSE 0 END) AS today
    FROM enquiries
  `;

  const topServicesSql = `
    SELECT enquiry, COUNT(*) as count
    FROM enquiries
    GROUP BY enquiry
    ORDER BY count DESC
    LIMIT 5
  `;

  db.get(sql, [], (err, stats) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    db.all(topServicesSql, [], (err2, topServices) => {
      if (err2) return res.status(500).json({ success: false, error: err2.message });
      res.json({ success: true, stats, topServices });
    });
  });
});

/* ────────────────────────────────────────────
   GET /api/admin/enquiries
   HTML admin dashboard page
   ──────────────────────────────────────────── */
router.get('/enquiries', (req, res) => {
  // Serve a self-contained HTML admin panel
  res.send(adminHTML());
});

/* ── Admin dashboard HTML ── */
function adminHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Startupwala — Admin Dashboard</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',sans-serif;background:#f0f2f5;color:#333}
  /* Login */
  #login-screen{display:flex;align-items:center;justify-content:center;min-height:100vh;background:linear-gradient(135deg,#0f0c29,#1a1a3e)}
  .login-box{background:#fff;padding:40px;border-radius:16px;width:360px;box-shadow:0 20px 60px rgba(0,0,0,0.3)}
  .login-box h2{text-align:center;margin-bottom:24px;color:#1a1a3e;font-size:22px}
  .login-box .logo{text-align:center;font-size:24px;font-weight:800;color:#F7941D;margin-bottom:6px}
  .login-box input{width:100%;padding:11px 14px;margin-bottom:14px;border:1.5px solid #ddd;border-radius:8px;font-size:14px;outline:none}
  .login-box input:focus{border-color:#F7941D}
  .login-box button{width:100%;background:#F7941D;color:#fff;border:none;padding:13px;border-radius:8px;font-size:15px;font-weight:700;cursor:pointer}
  .login-box button:hover{background:#e0850f}
  #login-error{color:#e53935;font-size:12px;text-align:center;margin-top:8px}
  /* Dashboard */
  #dashboard{display:none}
  .topbar{background:#1a1a3e;color:#fff;padding:14px 28px;display:flex;align-items:center;justify-content:space-between}
  .topbar .brand{font-size:20px;font-weight:800;color:#F7941D}
  .topbar .logout-btn{background:rgba(255,255,255,0.12);border:none;color:#fff;padding:8px 18px;border-radius:6px;cursor:pointer;font-size:13px}
  .topbar .logout-btn:hover{background:#F7941D}
  .content{padding:28px}
  /* Stats */
  .stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:18px;margin-bottom:28px}
  .stat-card{background:#fff;border-radius:12px;padding:22px 18px;text-align:center;box-shadow:0 2px 10px rgba(0,0,0,0.07)}
  .stat-card .num{font-size:32px;font-weight:800;color:#1a1a3e}
  .stat-card .label{font-size:12px;color:#888;margin-top:4px}
  .stat-card.orange .num{color:#F7941D}
  .stat-card.green  .num{color:#27ae60}
  /* Filters */
  .filters{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:18px;align-items:center}
  .filters input,.filters select{padding:9px 14px;border:1.5px solid #ddd;border-radius:8px;font-size:13px;outline:none}
  .filters input:focus,.filters select:focus{border-color:#F7941D}
  .filters button{background:#1a1a3e;color:#fff;border:none;padding:9px 20px;border-radius:8px;cursor:pointer;font-size:13px}
  .filters button:hover{background:#F7941D}
  /* Table */
  .table-wrap{background:#fff;border-radius:12px;box-shadow:0 2px 10px rgba(0,0,0,0.07);overflow:auto}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th{background:#1a1a3e;color:#fff;padding:12px 14px;text-align:left;white-space:nowrap}
  td{padding:11px 14px;border-bottom:1px solid #f0f0f0;vertical-align:middle}
  tr:last-child td{border-bottom:none}
  tr:hover td{background:#fafafa}
  .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700}
  .badge.new{background:#e3f2fd;color:#1565c0}
  .badge.contacted{background:#fff8e1;color:#f57f17}
  .badge.converted{background:#e8f5e9;color:#2e7d32}
  .badge.closed{background:#f5f5f5;color:#757575}
  .status-select{border:1px solid #ddd;border-radius:5px;padding:4px 8px;font-size:12px;cursor:pointer}
  /* Pagination */
  .pagination{display:flex;justify-content:center;gap:8px;margin-top:20px;flex-wrap:wrap}
  .pagination button{padding:7px 14px;border:1.5px solid #ddd;background:#fff;border-radius:7px;cursor:pointer;font-size:13px}
  .pagination button.active{background:#F7941D;border-color:#F7941D;color:#fff;font-weight:700}
  .pagination button:hover:not(.active){border-color:#F7941D;color:#F7941D}
  /* Export */
  .export-btn{background:#27ae60;color:#fff;border:none;padding:9px 20px;border-radius:8px;cursor:pointer;font-size:13px}
  .export-btn:hover{background:#219a52}
  /* Responsive */
  @media(max-width:600px){.content{padding:14px}.stats-grid{grid-template-columns:1fr 1fr}}
</style>
</head>
<body>

<!-- LOGIN -->
<div id="login-screen">
  <div class="login-box">
    <div class="logo">Startupwala</div>
    <h2>Admin Dashboard</h2>
    <input type="text" id="adminUser" placeholder="Username" value="admin">
    <input type="password" id="adminPass" placeholder="Password" value="">
    <button onclick="doLogin()">Sign In</button>
    <p id="login-error"></p>
  </div>
</div>

<!-- DASHBOARD -->
<div id="dashboard">
  <div class="topbar">
    <div class="brand">Startupwala Admin</div>
    <div style="display:flex;align-items:center;gap:14px">
      <span id="topbar-user" style="font-size:13px;opacity:0.8"></span>
      <button class="logout-btn" onclick="doLogout()">Logout</button>
    </div>
  </div>
  <div class="content">
    <!-- Stats -->
    <div class="stats-grid" id="stats-grid">
      <div class="stat-card orange"><div class="num" id="s-total">—</div><div class="label">Total Leads</div></div>
      <div class="stat-card"><div class="num" id="s-new">—</div><div class="label">New</div></div>
      <div class="stat-card"><div class="num" id="s-contacted">—</div><div class="label">Contacted</div></div>
      <div class="stat-card green"><div class="num" id="s-converted">—</div><div class="label">Converted</div></div>
      <div class="stat-card"><div class="num" id="s-today">—</div><div class="label">Today</div></div>
    </div>

    <!-- Filters -->
    <div class="filters">
      <input type="text" id="f-search" placeholder="Search name / email / phone…" style="width:240px">
      <select id="f-status">
        <option value="">All Status</option>
        <option value="new">New</option>
        <option value="contacted">Contacted</option>
        <option value="converted">Converted</option>
        <option value="closed">Closed</option>
      </select>
      <button onclick="loadEnquiries(1)">🔍 Search</button>
      <button class="export-btn" onclick="exportCSV()">⬇ Export CSV</button>
    </div>

    <!-- Table -->
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th><th>Date</th><th>Name</th><th>Email</th>
            <th>Phone</th><th>City</th><th>Service</th>
            <th>WhatsApp</th><th>Status</th>
          </tr>
        </thead>
        <tbody id="enquiry-tbody"></tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="pagination" id="pagination"></div>
  </div>
</div>

<script>
  let TOKEN = '';
  let currentPage = 1;
  let totalPages  = 1;

  /* ── Login ── */
  async function doLogin() {
    const u = document.getElementById('adminUser').value.trim();
    const p = document.getElementById('adminPass').value.trim();
    document.getElementById('login-error').textContent = '';
    try {
      const r = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p })
      });
      const d = await r.json();
      if (!d.success) { document.getElementById('login-error').textContent = d.error; return; }
      TOKEN = d.token;
      document.getElementById('topbar-user').textContent = '👤 ' + d.username;
      document.getElementById('login-screen').style.display = 'none';
      document.getElementById('dashboard').style.display    = 'block';
      loadStats();
      loadEnquiries(1);
    } catch(e) {
      document.getElementById('login-error').textContent = 'Network error.';
    }
  }

  document.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

  function doLogout() {
    TOKEN = '';
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('dashboard').style.display    = 'none';
  }

  /* ── Stats ── */
  async function loadStats() {
    try {
      const r = await fetch('/api/admin/stats', { headers: { Authorization: 'Bearer ' + TOKEN } });
      const d = await r.json();
      if (!d.success) return;
      document.getElementById('s-total').textContent     = d.stats.total     || 0;
      document.getElementById('s-new').textContent       = d.stats.new_leads || 0;
      document.getElementById('s-contacted').textContent = d.stats.contacted  || 0;
      document.getElementById('s-converted').textContent = d.stats.converted  || 0;
      document.getElementById('s-today').textContent     = d.stats.today      || 0;
    } catch(e) { console.warn('Stats error', e); }
  }

  /* ── Enquiries ── */
  async function loadEnquiries(page) {
    currentPage = page;
    const search = encodeURIComponent(document.getElementById('f-search').value.trim());
    const status = encodeURIComponent(document.getElementById('f-status').value);
    const url    = '/api/enquiries?page=' + page + '&limit=20&search=' + search + '&status=' + status;
    try {
      const r = await fetch(url, { headers: { Authorization: 'Bearer ' + TOKEN } });
      const d = await r.json();
      if (!d.success) return;
      totalPages = d.pages || 1;
      renderTable(d.data);
      renderPagination(d.total, d.page, d.pages);
    } catch(e) { console.warn('Enquiries error', e); }
  }

  function renderTable(rows) {
    const tbody = document.getElementById('enquiry-tbody');
    if (!rows || rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:30px;color:#aaa">No enquiries found.</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(r => \`
      <tr>
        <td>\${r.id}</td>
        <td style="white-space:nowrap">\${r.created_at ? r.created_at.split(' ')[0] : ''}</td>
        <td><strong>\${esc(r.salutation)} \${esc(r.first_name)}</strong></td>
        <td>\${esc(r.email)}</td>
        <td>\${esc(r.phone)}</td>
        <td>\${esc(r.city) || '—'}</td>
        <td>\${esc(r.enquiry)}</td>
        <td style="text-align:center">\${r.whatsapp_consent ? '✅' : '❌'}</td>
        <td>
          <select class="status-select" onchange="updateStatus(\${r.id}, this.value)">
            \${['new','contacted','converted','closed'].map(s =>
              '<option value="' + s + '"' + (r.status === s ? ' selected' : '') + '>' + cap(s) + '</option>'
            ).join('')}
          </select>
        </td>
      </tr>
    \`).join('');
  }

  function renderPagination(total, page, pages) {
    const el = document.getElementById('pagination');
    if (pages <= 1) { el.innerHTML = ''; return; }
    let html = '';
    for (let i = 1; i <= pages; i++) {
      html += \`<button class="\${i === page ? 'active' : ''}" onclick="loadEnquiries(\${i})">\${i}</button>\`;
    }
    el.innerHTML = html;
  }

  async function updateStatus(id, status) {
    try {
      await fetch('/api/enquiries/' + id + '/status', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOKEN },
        body:    JSON.stringify({ status })
      });
      loadStats();
    } catch(e) { console.warn('Status update error', e); }
  }

  /* ── Export CSV ── */
  function exportCSV() {
    const search = encodeURIComponent(document.getElementById('f-search').value.trim());
    const status = encodeURIComponent(document.getElementById('f-status').value);
    // Fetch all and download
    fetch('/api/enquiries?page=1&limit=10000&search=' + search + '&status=' + status, {
      headers: { Authorization: 'Bearer ' + TOKEN }
    })
    .then(r => r.json())
    .then(d => {
      if (!d.success || !d.data.length) return alert('No data to export.');
      const cols = ['id','created_at','salutation','first_name','email','phone','city','enquiry','whatsapp_consent','status'];
      const csv  = [cols.join(','), ...d.data.map(r => cols.map(c => '"' + String(r[c] || '').replace(/"/g,'""') + '"').join(','))].join('\\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const a    = document.createElement('a');
      a.href     = URL.createObjectURL(blob);
      a.download = 'enquiries_' + new Date().toISOString().split('T')[0] + '.csv';
      a.click();
    });
  }

  function esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
</script>
</body>
</html>`;
}

module.exports = router;
