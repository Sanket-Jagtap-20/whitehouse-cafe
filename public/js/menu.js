/* ── White House Cafe – Customer Menu JS ── */

const state = {
  menu: [],
  cart: {},        // itemId → { name, price, qty }
  tableId: null,
};

// ── Init ──────────────────────────────────────────────────────────────────
(async function init() {
  // Check table from URL ?table=<id>
  const params = new URLSearchParams(location.search);
  const tableParam = params.get('table');
  if (tableParam) {
    try {
      const res = await fetch(`/api/tables/${tableParam}`);
      if (res.ok) {
        const t = await res.json();
        state.tableId = t.id;
        const badge = document.getElementById('table-badge');
        badge.textContent = `${t.table_type === 'sofa' ? '🛋️' : '🪑'} ${t.table_number}`;
        badge.classList.remove('hidden');
      }
    } catch {}
  }

  await loadMenu();
})();

// ── Load Menu ─────────────────────────────────────────────────────────────
async function loadMenu() {
  try {
    const res = await fetch('/api/menu');
    state.menu = await res.json();
    renderCategoryTabs();
    renderItems('all');
  } catch (e) {
    document.getElementById('menu-items').innerHTML =
      '<p style="color:red">Failed to load menu. Please refresh.</p>';
  }
}

// ── Render category tabs ──────────────────────────────────────────────────
function renderCategoryTabs() {
  const container = document.getElementById('category-tabs');
  container.innerHTML = '';

  const allBtn = makeTab('All', 'all', true);
  container.appendChild(allBtn);

  state.menu.forEach(cat => {
    if (!cat.items.length) return;
    container.appendChild(makeTab(`${cat.icon} ${cat.name}`, cat.id));
  });
}

function makeTab(label, value, active = false) {
  const btn = document.createElement('button');
  btn.className = 'cat-tab' + (active ? ' active' : '');
  btn.textContent = label;
  btn.addEventListener('click', () => {
    document.querySelectorAll('.cat-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderItems(value);
  });
  return btn;
}

// ── Render items ──────────────────────────────────────────────────────────
function renderItems(catId) {
  const grid = document.getElementById('menu-items');
  grid.innerHTML = '';

  const cats = catId === 'all' ? state.menu : state.menu.filter(c => c.id === catId);
  cats.forEach(cat => {
    cat.items.forEach(item => {
      grid.appendChild(buildItemCard(item));
    });
  });

  if (!grid.children.length) {
    grid.innerHTML = '<p style="color:#aaa;text-align:center">No items in this category.</p>';
  }
}

function buildItemCard(item) {
  const qty = state.cart[item.id]?.qty || 0;
  const card = document.createElement('div');
  card.className = 'menu-item-card';
  card.innerHTML = `
    ${item.image_url ? `<img src="${item.image_url}" alt="${item.name}" class="item-img" onerror="this.style.display='none'" />` : ''}
    <div class="item-name"><span class="veg-dot"></span>${item.name}</div>
    ${item.description ? `<div class="item-desc">${item.description}</div>` : ''}
    <div class="item-footer">
      <div class="item-price">₹${parseFloat(item.price).toFixed(0)}</div>
      <div class="qty-control" id="qty-${item.id}">
        ${qty > 0
          ? `<button class="qty-btn" onclick="changeQty(${item.id}, -1)">−</button>
             <span class="qty-num">${qty}</span>
             <button class="qty-btn" onclick="changeQty(${item.id}, 1)">+</button>`
          : `<button class="qty-btn" onclick="changeQty(${item.id}, 1)" style="width:auto;border-radius:8px;padding:0 .75rem">Add</button>`
        }
      </div>
    </div>`;
  return card;
}

// ── Cart ──────────────────────────────────────────────────────────────────
window.changeQty = function(itemId, delta) {
  // find item
  let item;
  for (const cat of state.menu) {
    item = cat.items.find(i => i.id === itemId);
    if (item) break;
  }
  if (!item) return;

  const current = state.cart[itemId]?.qty || 0;
  const next = current + delta;
  if (next <= 0) {
    delete state.cart[itemId];
  } else {
    state.cart[itemId] = { name: item.name, price: parseFloat(item.price), qty: next };
  }

  // Re-render that card's qty section
  const ctrl = document.getElementById(`qty-${itemId}`);
  if (ctrl) {
    const q = state.cart[itemId]?.qty || 0;
    ctrl.innerHTML = q > 0
      ? `<button class="qty-btn" onclick="changeQty(${itemId}, -1)">−</button>
         <span class="qty-num">${q}</span>
         <button class="qty-btn" onclick="changeQty(${itemId}, 1)">+</button>`
      : `<button class="qty-btn" onclick="changeQty(${itemId}, 1)" style="width:auto;border-radius:8px;padding:0 .75rem">Add</button>`;
  }

  updateCartUI();
};

function cartItems() { return Object.entries(state.cart).map(([id, v]) => ({ id: +id, ...v })); }
function cartTotal() { return cartItems().reduce((s, i) => s + i.price * i.qty, 0); }
function cartCount() { return cartItems().reduce((s, i) => s + i.qty, 0); }

function updateCartUI() {
  const items = cartItems();
  const total = cartTotal();
  const count = cartCount();

  const fab = document.getElementById('cart-fab');
  const panel = document.getElementById('cart-panel');

  if (count === 0) {
    fab.classList.add('hidden');
    panel.classList.add('hidden');
    return;
  }

  fab.classList.remove('hidden');
  document.getElementById('cart-count').textContent = count;
  document.getElementById('cart-fab-total').textContent = `₹${total.toFixed(0)}`;

  const cartList = document.getElementById('cart-items');
  cartList.innerHTML = items.map(i => `
    <div class="cart-item">
      <span class="cart-item-name">${i.name} × ${i.qty}</span>
      <span class="cart-item-price">₹${(i.price * i.qty).toFixed(0)}</span>
    </div>`).join('');

  document.getElementById('cart-total').textContent = `₹${total.toFixed(0)}`;
}

// Show/hide cart panel via FAB
document.getElementById('cart-fab').addEventListener('click', () => {
  document.getElementById('cart-panel').classList.toggle('hidden');
});
document.getElementById('clear-cart').addEventListener('click', () => {
  state.cart = {};
  updateCartUI();
  renderItems(
    document.querySelector('.cat-tab.active')?.dataset?.val || 'all'
  );
  // Re-render all qty controls
  document.querySelectorAll('[id^="qty-"]').forEach(el => {
    const id = +el.id.replace('qty-', '');
    el.innerHTML = `<button class="qty-btn" onclick="changeQty(${id}, 1)" style="width:auto;border-radius:8px;padding:0 .75rem">Add</button>`;
  });
});

// ── Place Order ───────────────────────────────────────────────────────────
document.getElementById('place-order-btn').addEventListener('click', placeOrder);

async function placeOrder() {
  const name  = document.getElementById('cust-name').value.trim();
  const phone = document.getElementById('cust-phone').value.trim();
  const notes = document.getElementById('cust-notes').value.trim();

  if (!name || !phone) {
    alert('Please fill in your name and phone number above.');
    document.getElementById('cart-panel').classList.add('hidden');
    document.getElementById('cust-name').focus();
    return;
  }
  if (!/^\d{10}$/.test(phone)) {
    alert('Please enter a valid 10-digit phone number.');
    return;
  }
  if (!cartItems().length) {
    alert('Your cart is empty!');
    return;
  }

  const btn = document.getElementById('place-order-btn');
  btn.disabled = true;
  btn.textContent = 'Placing…';

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: name,
        customer_phone: phone,
        notes,
        table_id: state.tableId,
        items: cartItems().map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty })),
      }),
    });
    const data = await res.json();
    if (data.success) {
      document.getElementById('modal-order-num').textContent = data.order_number;
      document.getElementById('modal-total').textContent = `₹${parseFloat(data.total).toFixed(0)}`;
      document.getElementById('confirm-modal').classList.remove('hidden');
    } else {
      alert(data.error || 'Order failed. Please try again.');
      btn.disabled = false;
      btn.textContent = 'Place Order';
    }
  } catch {
    alert('Server error. Please try again.');
    btn.disabled = false;
    btn.textContent = 'Place Order';
  }
}
