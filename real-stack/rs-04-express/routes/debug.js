const express = require('express');
const config = require('../app/config');
const progress = require('../app/progress');
const router = express.Router();

/* A diagnostic page left over from staging. It answers anyone who asks. */
router.get('/debug', (req, res) => {
  progress.pass('debug-exposure'); // the config was simply there for the fetching
  res.json({
    app: config.appName,
    debug: config.debug,
    jwtSecret: config.jwtSecret,
    dbFile: config.dbFile,
    node: process.version,
    platform: process.platform,
    uptimeSeconds: Math.round(process.uptime()),
    env: { NODE_ENV: process.env.NODE_ENV || '(unset)', PORT: process.env.PORT || '(default 3204)' },
    lastErrors: [
      'Error: Cannot read properties of undefined (reading \'workspace\')\n    at renderTicket (/app/routes/tickets.js:14:11)\n    at Layer.handle [as handle_request] (express/lib/router/layer.js:95:5)',
      'Error: connect ECONNREFUSED 127.0.0.1:9000 (metrics sidecar, known, ignore)',
    ],
    note: 'TODO before launch: remove this route. (It launched.)',
  });
});
module.exports = router;
