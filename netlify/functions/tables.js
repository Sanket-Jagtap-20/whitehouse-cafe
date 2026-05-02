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
  const path = event.path.replace('/.netlify/functions/tables', '').replace('/api/tables', '');

  try {
    // GET /api/tables/:id — public (QR scan)
    if (event.httpMethod === 'GET' && path.length > 1 && !path.includes('/')) {
      const id = path.replace('/', '');
      const [rows] = await db.execute('SELECT * FROM tables_seats WHERE id=? AND is_active=1', [id]);
      if (!rows[0]) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Table not found' }) };
      return { statusCode: 200, headers, body: JSON.stringify(rows[0]) };
    }

    // ── ADMIN ONLY below ──────────────────────────────────────────────────────
    const admin = requireAdmin(event);
    if (!admin) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };

    if (event.httpMethod === 'GET' && path === '') {
      const [rows] = await db.execute('SELECT * FROM tables_seats ORDER BY table_type, table_number');
      return { statusCode: 200, headers, body: JSON.stringify(rows) };
    }

    if (event.httpMethod === 'POST') {
      const { id, table_number, table_type = 'table', capacity = 4 } = JSON.parse(event.body || '{}');
      if (!table_number) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Table number required' }) };
      if (id) {
        await db.execute('UPDATE tables_seats SET table_number=?,table_type=?,capacity=? WHERE id=?',
          [table_number, table_type, capacity, id]);
      } else {
        await db.execute('INSERT INTO tables_seats (table_number,table_type,capacity) VALUES (?,?,?)',
          [table_number, table_type, capacity]);
      }
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    if (event.httpMethod === 'DELETE') {
      const id = path.replace('/', '');
      await db.execute('DELETE FROM tables_seats WHERE id=?', [id]);
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };

  } catch (err) {
    console.error('[tables]', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
