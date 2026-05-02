const { getPool } = require('./db');
const { requireAdmin } = require('./auth-helper');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  'Content-Type': 'application/json',
};

function orderNum() {
  return 'ORD' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 100);
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  const db = getPool();
  const path = event.path.replace('/.netlify/functions/orders', '').replace('/api/orders', '');

  try {
    // POST /api/orders — public, place order
    if (event.httpMethod === 'POST' && path === '') {
      const { customer_name, customer_phone, items, table_id = null, notes = '' } = JSON.parse(event.body || '{}');
      if (!customer_name || !customer_phone || !items?.length)
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required fields' }) };

      const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
      const num = orderNum();
      await db.execute(
        'INSERT INTO orders (order_number,table_id,customer_name,customer_phone,items,subtotal,total_amount,notes) VALUES (?,?,?,?,?,?,?,?)',
        [num, table_id, customer_name, customer_phone, JSON.stringify(items), subtotal, subtotal, notes]
      );
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, order_number: num, total: subtotal }) };
    }

    // ── ADMIN ONLY below ──────────────────────────────────────────────────────
    const admin = requireAdmin(event);
    if (!admin) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };

    // GET /api/orders/sales
    if (event.httpMethod === 'GET' && path === '/sales') {
      const period = event.queryStringParameters?.period || 'today';
      const where = period === 'today'
        ? "DATE(created_at) = CURDATE()"
        : period === 'week'
        ? "created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)"
        : "created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";

      const [[stats]] = await db.execute(
        `SELECT COUNT(*) as total_orders, SUM(total_amount) as revenue, AVG(total_amount) as avg_order FROM orders WHERE status != 'cancelled' AND ${where}`
      );
      const [daily] = await db.execute(
        `SELECT DATE(created_at) as date, COUNT(*) as orders, SUM(total_amount) as revenue FROM orders WHERE status != 'cancelled' AND ${where} GROUP BY DATE(created_at) ORDER BY date DESC`
      );
      return { statusCode: 200, headers, body: JSON.stringify({ stats, daily }) };
    }

    // GET /api/orders
    if (event.httpMethod === 'GET' && path === '') {
      const status = event.queryStringParameters?.status;
      let rows;
      if (status) {
        [rows] = await db.execute(
          'SELECT o.*, t.table_number, t.table_type FROM orders o LEFT JOIN tables_seats t ON o.table_id=t.id WHERE o.status=? ORDER BY o.created_at DESC',
          [status]
        );
      } else {
        [rows] = await db.execute(
          'SELECT o.*, t.table_number, t.table_type FROM orders o LEFT JOIN tables_seats t ON o.table_id=t.id ORDER BY o.created_at DESC LIMIT 100'
        );
      }
      return { statusCode: 200, headers, body: JSON.stringify(rows) };
    }

    // PATCH /api/orders/:id
    if (event.httpMethod === 'PATCH') {
      const id = path.replace('/', '');
      const { status } = JSON.parse(event.body || '{}');
      if (!status) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Status required' }) };
      await db.execute('UPDATE orders SET status=? WHERE id=?', [status, id]);
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };

  } catch (err) {
    console.error('[orders]', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
