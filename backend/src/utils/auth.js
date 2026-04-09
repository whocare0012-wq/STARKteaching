const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config');

function signSessionToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      username: user.username,
      role: user.role,
      displayName: user.display_name || user.displayName || user.username,
    },
    jwtSecret,
    { expiresIn: '7d' },
  );
}

function verifySessionToken(token) {
  return jwt.verify(token, jwtSecret);
}

module.exports = {
  signSessionToken,
  verifySessionToken,
};
