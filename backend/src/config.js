const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ quiet: true });

const rootDir = path.resolve(__dirname, '..', '..');

module.exports = {
  isProduction: process.env.NODE_ENV === 'production',
  cookieSecure:
    process.env.COOKIE_SECURE === 'true' ||
    (process.env.NODE_ENV === 'production' &&
      (process.env.FRONTEND_URL || 'http://localhost:5173').startsWith('https://')),
  port: Number(process.env.PORT || 3000),
  jwtSecret: process.env.JWT_SECRET || 'replace-this-in-production',
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin123456',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  databasePath:
    process.env.DB_PATH || path.resolve(rootDir, 'storage', 'app.db'),
  snapshotsDir:
    process.env.SNAPSHOTS_DIR ||
    path.resolve(rootDir, 'storage', 'snapshots'),
  frontendDistPath:
    process.env.FRONTEND_DIST_PATH ||
    path.resolve(rootDir, 'frontend', 'dist'),
};
