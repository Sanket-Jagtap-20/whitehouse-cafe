const bcrypt = require('bcryptjs');
const { getPool } = require('./db');
const { signToken, requireAdmin } = require('./auth-helper');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  const path = event.path.replace('/.netlify/functions/admin', '').replace('/api/admin', '');
  const db = getPool();

  try {
    // POST /api/admin/login
    if (event.httpMethod === 'POST' && path === '/login') {
      const { email, password } = JSON.parse(event.body || '{}');
      if (!email || !password)
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Email and password required' }) };

      const [rows] = await db.execute('SELECT * FROM admins WHERE email = ?', [email]);
      const admin = rows[0];
      if (!admin || !(await bcrypt.compare(password, admin.password)))
        return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid credentials' }) };

      const token = signToken({ id: admin.id, name: admin.name, email: admin.email });
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Set-Cookie': `admin_token=${token}; Path=/; HttpOnly; Max-Age=86400; SameSite=Lax`,
        },
        body: JSON.stringify({ success: true, name: admin.name, token }),
      };
    }

    // POST /api/admin/logout
    if (event.httpMethod === 'POST' && path === '/logout') {
      return {
        statusCode: 200,
        headers: { ...headers, 'Set-Cookie': 'admin_token=; Path=/; Max-Age=0' },
        body: JSON.stringify({ success: true }),
      };
    }

    // GET /api/admin/me
    if (event.httpMethod === 'GET' && path === '/me') {
      const admin = requireAdmin(event);
      if (!admin) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
      return { statusCode: 200, headers, body: JSON.stringify({ id: admin.id, name: admin.name }) };
    }

    // POST /api/admin/register
    if (event.httpMethod === 'POST' && path === '/register') {
      const { name, email, password } = JSON.parse(event.body || '{}');
      if (!name || !email || !password)
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'All fields required' }) };
      const hash = await bcrypt.hash(password, 10);
      try {
        await db.execute('INSERT INTO admins (name, email, password) VALUES (?, ?, ?)', [name, email, hash]);
        return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
      } catch (e) {
        if (e.code === 'ER_DUP_ENTRY')
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Email already exists' }) };
        throw e;
      }
    }

    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };

  } catch (err) {
    console.error('[admin]', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
