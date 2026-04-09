const { getUserById } = require('../db');
const { verifySessionToken } = require('../utils/auth');

function readToken(req) {
  const headerToken = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : null;

  return req.cookies.session_token || headerToken || null;
}

function requireAuth(req, res, next) {
  const token = readToken(req);

  if (!token) {
    return res.status(401).json({ message: '请先登录后再访问。' });
  }

  try {
    const payload = verifySessionToken(token);
    const user = getUserById(payload.userId);

    if (!user) {
      return res.status(401).json({ message: '当前登录用户不存在。' });
    }

    req.user = user;
    return next();
  } catch (_error) {
    return res.status(401).json({ message: '登录状态已失效，请重新登录。' });
  }
}

function requireSuperAdmin(req, res, next) {
  if (!req.user) {
    return res.status(500).json({ message: '鉴权状态异常。' });
  }

  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ message: '当前账号没有管理权限。' });
  }

  return next();
}

module.exports = {
  requireAuth,
  requireSuperAdmin,
};
