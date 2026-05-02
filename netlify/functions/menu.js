const { getPool } = require('./db');
const { requireAdmin } = require('./auth-helper');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  const db = getPool();
  const path = event.path.replace('/.netlify/functions/menu', '').replace('/api/menu', '');

  try {
    // ── PUBLIC: GET /api/menu ─────────────────────────────────────────────────
    if (event.httpMethod === 'GET' && path === '') {
      const [cats] = await db.execute('SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order');
      const [items] = await db.execute('SELECT * FROM menu_items WHERE is_available = 1');
      const menu = cats.map(c => ({ ...c, items: items.filter(i => i.category_id === c.id) }));
      return { statusCode: 200, headers, body: JSON.stringify(menu) };
    }

    // ── ADMIN ONLY below ───────────────────────────────────────────────────────
    const admin = requireAdmin(event);
    if (!admin) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };

    if (event.httpMethod === 'GET' && path === '/categories') {
      const [rows] = await db.execute('SELECT * FROM categories ORDER BY sort_order');
      return { statusCode: 200, headers, body: JSON.stringify(rows) };
    }

    if (event.httpMethod === 'POST' && path === '/categories') {
      const { id, name, icon = '🍽️', description = '', is_active = 1, sort_order = 0 } = JSON.parse(event.body || '{}');
      if (!name) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Name required' }) };
      if (id) {
        await db.execute('UPDATE categories SET name=?,icon=?,description=?,is_active=?,sort_order=? WHERE id=?',
          [name, icon, description, is_active, sort_order, id]);
      } else {
        await db.execute('INSERT INTO categories (name,icon,description,is_active,sort_order) VALUES (?,?,?,?,?)',
          [name, icon, description, is_active, sort_order]);
      }
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    if (event.httpMethod === 'DELETE' && path.startsWith('/categories/')) {
      const id = path.split('/').pop();
      await db.execute('DELETE FROM categories WHERE id=?', [id]);
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    if (event.httpMethod === 'GET' && path === '/items') {
      const cat = event.queryStringParameters?.category_id;
      let rows;
      if (cat) {
        [rows] = await db.execute(
          'SELECT m.*, c.name as cat_name FROM menu_items m JOIN categories c ON m.category_id=c.id WHERE m.category_id=?', [cat]);
      } else {
        [rows] = await db.execute(
          'SELECT m.*, c.name as cat_name FROM menu_items m JOIN categories c ON m.category_id=c.id ORDER BY c.sort_order, m.name');
      }
      return { statusCode: 200, headers, body: JSON.stringify(rows) };
    }

    if (event.httpMethod === 'POST' && path === '/items') {
      const { id, category_id, name, description = '', price, is_veg = 1, is_available = 1, image_url = null } = JSON.parse(event.body || '{}');
      if (!category_id || !name || !price)
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Required fields missing' }) };
      if (id) {
        await db.execute('UPDATE menu_items SET category_id=?,name=?,description=?,price=?,is_veg=?,is_available=?,image_url=? WHERE id=?',
          [category_id, name, description, price, is_veg, is_available, image_url, id]);
      } else {
        await db.execute('INSERT INTO menu_items (category_id,name,description,price,is_veg,is_available,image_url) VALUES (?,?,?,?,?,?,?)',
          [category_id, name, description, price, is_veg, is_available, image_url]);
      }
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    if (event.httpMethod === 'DELETE' && path.startsWith('/items/')) {
      const id = path.split('/').pop();
      await db.execute('DELETE FROM menu_items WHERE id=?', [id]);
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };

  } catch (err) {
    console.error('[menu]', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
