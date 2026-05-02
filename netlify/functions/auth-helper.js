const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'whitehouse_cafe_jwt_secret';

function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '24h' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

function getToken(event) {
  const auth = event.headers['authorization'] || event.headers['Authorization'] || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  // Also check cookie
  const cookie = event.headers['cookie'] || '';
  const match = cookie.match(/admin_token=([^;]+)/);
  return match ? match[1] : null;
}

function requireAdmin(event) {
  const token = getToken(event);
  if (!token) return null;
  return verifyToken(token);
}

module.exports = { signToken, verifyToken, getToken, requireAdmin };
