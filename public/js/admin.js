/* ── White House Cafe – Admin JS (Netlify) ── */

// ── Token helpers ─────────────────────────────────────────────────────────
function getToken() { return localStorage.getItem('admin_token'); }
function setToken(t) { localStorage.setItem('admin_token', t); }
function clearToken() { localStorage.removeItem('admin_token'); }

function authHeaders() {
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` };
}

// ── Auth guard ────────────────────────────────────────────────────────────
(async function checkAuth() {
  if (!getToken()) { window.location.href = '/login.html'; return; }
  try {
    const res = await fetch('/api/admin/me', { headers: authHeaders() });
    if (!res.ok) { clearToken(); window.location.href = '/login.html'; return; }
    const me = await res.json();
    document.getElementById('admin-name').textContent = me.name;
  } catch {
    window.location.href = '/login.html';
  }
  init();
})();

document.getElementById('logout-btn').addEventListener('click', async () => {
  clearToken();
  window.location.href = '/login.html';
});

// ── Tab navigation ────────────────────────────────────────────────────────
document.querySelectorAll('.nav-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    const tab = btn.dataset.tab;
    if (tab === 'orders') loadOrders();
    if (tab === 'menu')   loadMenu();
    if (tab === 'tables') loadTables();
    if (tab === 'sales')  loadSales();
  });
});

function init() {
  loadOrders();
  document.getElementById('refresh-orders').addEventListener('click', loadOrders);
  document.getElementById('order-status-filter').addEventListener('change', loadOrders);
  document.getElementById('sales-period').addEventListener('change', loadSales);
  document.getElementById('add-item-btn').addEventListener('click', () => openItemModal());
  document.getElementById('add-cat-btn').addEventListener('click', () => openCatModal());
  document.getElementById('add-table-btn').addEventListener('click', () => openTableModal());
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });
}

// ── ORDERS ────────────────────────────────────────────────────────────────
async function loadOrders() {
  const status = document.getElementById('order-status-filter').value;
  const url = '/api/orders' + (status ? `?status=${status}` : '');
  const res = await fetch(url, { headers: authHeaders() });
  const orders = await res.json();
  const list = document.getElementById('orders-list');
  if (!orders.length) { list.innerHTML = '<div class="card" style="text-align:center;color:#aaa">No orders found.</div>'; return; }
  list.innerHTML = orders.map(o => {
    const items = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
    const itemsHtml = items.map(i => `<li>${i.name} × ${i.qty} — ₹${(i.price * i.qty).toFixed(0)}</li>`).join('');
    const tableLabel = o.table_number ? `${o.table_type === 'sofa' ? '🛋️' : '🪑'} ${o.table_number}` : 'Walk-in';
    const time = new Date(o.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    return `<div class="order-card">
      <div class="order-card-header">
        <span class="order-num">#${o.order_number}</span>
        <span class="badge badge-${o.status}">${o.status}</span>
        <span class="order-meta">${tableLabel} · ${o.customer_name} · ${o.customer_phone}</span>
        <span class="order-meta" style="margin-left:auto">${time}</span>
      </div>
      <ul class="order-items-list">${itemsHtml}</ul>
      ${o.notes ? `<p style="font-size:.83rem;color:#666;margin-bottom:.5rem">📝 ${o.notes}</p>` : ''}
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.5rem">
        <strong>Total: ₹${parseFloat(o.total_amount).toFixed(0)}</strong>
        <div class="order-actions">
          <select onchange="updateOrderStatus(${o.id}, this.value)">
            ${['pending','confirmed','preparing','served','cancelled'].map(s =>
              `<option value="${s}"${s===o.status?' selected':''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`
            ).join('')}
          </select>
        </div>
      </div>
    </div>`;
  }).join('');
}

async function updateOrderStatus(id, status) {
  await fetch(`/api/orders/${id}`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ status }) });
  loadOrders();
}

// ── MENU ──────────────────────────────────────────────────────────────────
let allCategories = [];
let selectedCatId = null;

async function loadMenu() {
  const [catRes, itemRes] = await Promise.all([
    fetch('/api/menu/categories', { headers: authHeaders() }),
    fetch('/api/menu/items', { headers: authHeaders() }),
  ]);
  allCategories = await catRes.json();
  const allItems = await itemRes.json();
  const catList = document.getElementById('categories-list');
  catList.innerHTML = [{ id: null, name: 'All Items', icon: '🍽️' }, ...allCategories].map(c => `
    <div class="cat-row${selectedCatId===c.id?' active':''}" onclick="filterByCat(${c.id})">
      <span>${c.icon||'🍽️'} ${c.name}</span>
      ${c.id ? `<span onclick="event.stopPropagation();openCatModal(${c.id})" style="font-size:.75rem;opacity:.7">✏️</span>` : ''}
    </div>`).join('');
  renderAdminItems(selectedCatId ? allItems.filter(i => i.category_id === selectedCatId) : allItems);
}

window.filterByCat = function(catId) { selectedCatId = catId; loadMenu(); };

function renderAdminItems(items) {
  document.getElementById('items-heading').textContent = selectedCatId
    ? (allCategories.find(c => c.id === selectedCatId)?.name || 'Items') : 'All Items';
  const list = document.getElementById('items-list');
  if (!items.length) { list.innerHTML = '<p style="color:#aaa;padding:.75rem">No items here yet.</p>'; return; }
  list.innerHTML = items.map(i => `
    <div class="item-row">
      <div><span class="item-row-name">${i.name}</span><span style="font-size:.78rem;color:#aaa;margin-left:.4rem">${i.cat_name}</span></div>
      <div style="display:flex;align-items:center;gap:.4rem">
        <span class="item-row-price">₹${parseFloat(i.price).toFixed(0)}</span>
        <div class="item-row-actions">
          <button class="btn-edit" onclick="openItemModal(${i.id})">Edit</button>
          <button class="btn-del" onclick="deleteItem(${i.id})">Del</button>
        </div>
      </div>
    </div>`).join('');
}

window.openItemModal = async function(id) {
  let item = null;
  if (id) { const res = await fetch('/api/menu/items', { headers: authHeaders() }); const items = await res.json(); item = items.find(i => i.id === id); }
  openModal(item ? 'Edit Menu Item' : 'Add Menu Item', `
    <div class="form-row"><label>Category *</label><select id="m-cat">${allCategories.map(c => `<option value="${c.id}"${item?.category_id===c.id?' selected':''}>${c.name}</option>`).join('')}</select></div>
    <div class="form-row"><label>Name *</label><input id="m-name" value="${item?.name||''}" /></div>
    <div class="form-row"><label>Description</label><textarea id="m-desc" rows="2">${item?.description||''}</textarea></div>
    <div class="form-row"><label>Price (₹) *</label><input id="m-price" type="number" value="${item?.price||''}" /></div>
    <div class="form-row"><label>Image URL</label><input id="m-img" value="${item?.image_url||''}" /></div>
    <div class="form-row"><label>Available</label><select id="m-avail"><option value="1"${item?.is_available!=0?' selected':''}>Yes</option><option value="0"${item?.is_available==0?' selected':''}>No</option></select></div>
    <div class="modal-actions"><button class="btn-ghost" onclick="closeModal()">Cancel</button><button class="btn-primary" onclick="saveItem(${id||'null'})">Save</button></div>`);
};

window.saveItem = async function(id) {
  const body = { id: id||undefined, category_id: +document.getElementById('m-cat').value, name: document.getElementById('m-name').value.trim(), description: document.getElementById('m-desc').value.trim(), price: parseFloat(document.getElementById('m-price').value), image_url: document.getElementById('m-img').value.trim()||null, is_available: +document.getElementById('m-avail').value };
  if (!body.name || !body.price) return alert('Name and price are required.');
  await fetch('/api/menu/items', { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) });
  closeModal(); loadMenu();
};

window.deleteItem = async function(id) {
  if (!confirm('Delete this item?')) return;
  await fetch(`/api/menu/items/${id}`, { method: 'DELETE', headers: authHeaders() });
  loadMenu();
};

window.openCatModal = async function(id) {
  const cat = allCategories.find(c => c.id === id);
  openModal(cat ? 'Edit Category' : 'Add Category', `
    <div class="form-row"><label>Name *</label><input id="c-name" value="${cat?.name||''}" /></div>
    <div class="form-row"><label>Icon (emoji)</label><input id="c-icon" value="${cat?.icon||'🍽️'}" /></div>
    <div class="form-row"><label>Description</label><textarea id="c-desc" rows="2">${cat?.description||''}</textarea></div>
    <div class="form-row"><label>Sort Order</label><input id="c-sort" type="number" value="${cat?.sort_order||0}" /></div>
    <div class="form-row"><label>Active</label><select id="c-active"><option value="1"${cat?.is_active!=0?' selected':''}>Yes</option><option value="0"${cat?.is_active==0?' selected':''}>No</option></select></div>
    <div class="modal-actions">${cat?`<button class="btn-danger" onclick="deleteCat(${id})">Delete</button>`:''}<button class="btn-ghost" onclick="closeModal()">Cancel</button><button class="btn-primary" onclick="saveCat(${id||'null'})">Save</button></div>`);
};

window.saveCat = async function(id) {
  const body = { id:id||undefined, name:document.getElementById('c-name').value.trim(), icon:document.getElementById('c-icon').value.trim(), description:document.getElementById('c-desc').value.trim(), sort_order:+document.getElementById('c-sort').value, is_active:+document.getElementById('c-active').value };
  if (!body.name) return alert('Name is required.');
  await fetch('/api/menu/categories', { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) });
  closeModal(); loadMenu();
};

window.deleteCat = async function(id) {
  if (!confirm('Delete category and ALL its items?')) return;
  await fetch(`/api/menu/categories/${id}`, { method: 'DELETE', headers: authHeaders() });
  selectedCatId = null; closeModal(); loadMenu();
};

// ── TABLES ────────────────────────────────────────────────────────────────
async function loadTables() {
  const res = await fetch('/api/tables', { headers: authHeaders() });
  const tables = await res.json();
  document.getElementById('tables-grid').innerHTML = tables.map(t => `
    <div class="table-card">
      <div class="table-icon">${t.table_type==='sofa'?'🛋️':'🪑'}</div>
      <div class="table-num">${t.table_number}</div>
      <div class="table-type">${t.table_type}</div>
      <div class="table-cap">Capacity: ${t.capacity}</div>
      <a class="qr-link" href="/?table=${t.id}" target="_blank">Customer Link ↗</a>
      <div class="table-card-actions">
        <button class="btn-edit" onclick="openTableModal(${t.id})">Edit</button>
        <button class="btn-del" onclick="deleteTable(${t.id})">Del</button>
      </div>
    </div>`).join('');
}

window.openTableModal = async function(id) {
  let t = null;
  if (id) { const res = await fetch('/api/tables', { headers: authHeaders() }); const tables = await res.json(); t = tables.find(x => x.id === id); }
  openModal(t ? 'Edit Table' : 'Add Table', `
    <div class="form-row"><label>Table Number *</label><input id="t-num" value="${t?.table_number||''}" placeholder="T1, S1…" /></div>
    <div class="form-row"><label>Type</label><select id="t-type"><option value="table"${t?.table_type!=='sofa'?' selected':''}>Table 🪑</option><option value="sofa"${t?.table_type==='sofa'?' selected':''}>Sofa 🛋️</option></select></div>
    <div class="form-row"><label>Capacity</label><input id="t-cap" type="number" value="${t?.capacity||4}" /></div>
    <div class="modal-actions"><button class="btn-ghost" onclick="closeModal()">Cancel</button><button class="btn-primary" onclick="saveTable(${id||'null'})">Save</button></div>`);
};

window.saveTable = async function(id) {
  const body = { id:id||undefined, table_number:document.getElementById('t-num').value.trim(), table_type:document.getElementById('t-type').value, capacity:+document.getElementById('t-cap').value||4 };
  if (!body.table_number) return alert('Table number is required.');
  await fetch('/api/tables', { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) });
  closeModal(); loadTables();
};

window.deleteTable = async function(id) {
  if (!confirm('Delete this table?')) return;
  await fetch(`/api/tables/${id}`, { method: 'DELETE', headers: authHeaders() });
  loadTables();
};

// ── SALES ─────────────────────────────────────────────────────────────────
async function loadSales() {
  const period = document.getElementById('sales-period').value;
  const res = await fetch(`/api/orders/sales?period=${period}`, { headers: authHeaders() });
  const { stats, daily } = await res.json();
  document.getElementById('sales-stats').innerHTML = `
    <div class="stat-card"><div class="stat-label">Total Orders</div><div class="stat-value">${stats.total_orders||0}</div></div>
    <div class="stat-card"><div class="stat-label">Revenue</div><div class="stat-value">₹${parseFloat(stats.revenue||0).toFixed(0)}</div></div>
    <div class="stat-card"><div class="stat-label">Avg Order</div><div class="stat-value">₹${parseFloat(stats.avg_order||0).toFixed(0)}</div></div>`;
  document.getElementById('sales-daily').innerHTML = daily.length ? `
    <table class="sales-table"><thead><tr><th>Date</th><th>Orders</th><th>Revenue</th></tr></thead>
    <tbody>${daily.map(d=>`<tr><td>${d.date}</td><td>${d.orders}</td><td>₹${parseFloat(d.revenue).toFixed(0)}</td></tr>`).join('')}</tbody></table>`
    : '<p style="color:#aaa;margin-top:1rem">No data for this period.</p>';
}

// ── Modal ─────────────────────────────────────────────────────────────────
function openModal(title, bodyHtml) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHtml;
  document.getElementById('modal').classList.remove('hidden');
}
function closeModal() { document.getElementById('modal').classList.add('hidden'); }
window.closeModal = closeModal;
