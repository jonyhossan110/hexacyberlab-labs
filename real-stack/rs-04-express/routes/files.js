const express = require('express');
const fs = require('fs');
const path = require('path');
const auth = require('../app/auth');
const progress = require('../app/progress');
const { logEvent } = require('../app/log');
const router = express.Router();

const FILES_DIR = path.join(__dirname, '..', 'files');
router.get('/download', auth.requireLogin, (req, res) => {
  const file = String(req.query.file || '');
  // the file parameter is joined straight onto the folder — traversal lives here
  const full = path.join(FILES_DIR, file);
  if (!fs.existsSync(full) || !fs.statSync(full).isFile()) { res.status(404).send('File not found'); return; }
  const content = fs.readFileSync(full, 'utf8');
  if (file.includes('..') && (content.includes('HEXADESK_') || content.includes('JWT_SECRET'))) progress.pass('path-traversal');
  logEvent(req, 'DOWNLOAD ' + file);
  res.type('text/plain').send(content);
});
module.exports = router;
