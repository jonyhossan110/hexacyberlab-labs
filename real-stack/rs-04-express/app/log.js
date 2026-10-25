/* Application log — the blue team reads this. Every request the app handles
   is written here, exactly like a real server's access/application log. */
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'logs', 'app.log');
function stamp() { return new Date().toISOString().replace('T', ' ').slice(0, 19); }
function logEvent(req, msg) {
  const who = req && req.user ? req.user.email : 'guest';
  const ip = req ? (req.ip || '-') : '-';
  try { fs.appendFileSync(FILE, `[${stamp()}] ${ip} ${who} ${msg}\n`); } catch (e) { /* logging must never crash the app */ }
}
function requestLogger(req, res, next) {
  const q = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : '';
  logEvent(req, `${req.method} ${req.path}${q}`);
  next();
}
module.exports = { logEvent, requestLogger };
