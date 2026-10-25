/* HexaDesk — entry point. A real Express app: middleware, routers per
   feature, server-rendered pages, a JSON API, and one diagnostic route
   somebody forgot to remove. Runs on $PORT (default 3204). */
const express = require('express');
const path = require('path');
const config = require('./app/config');
const { attachUser } = require('./app/auth');
const { requestLogger } = require('./app/log');
const { getDb } = require('./app/db');

getDb(); // create + seed data.sqlite on first run

const app = express();
app.disable('x-powered-by'); // (someone read one hardening blog post, once)
app.use(requestLogger);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(attachUser);
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));

app.use(require('./routes/auth'));
app.use(require('./routes/projects'));
app.use(require('./routes/tickets'));
app.use(require('./routes/profile'));
app.use(require('./routes/settings'));
app.use(require('./routes/billing'));
app.use(require('./routes/files'));
app.use(require('./routes/admin'));
app.use(require('./routes/debug'));
app.use(require('./routes/lab'));

app.use((req, res) => { res.status(404).send('Cannot ' + req.method + ' ' + req.path); });
// debug is ON in this app — errors are printed with full stack traces
app.use((err, req, res, next) => {
  res.status(500).type('text/plain').send(config.debug ? String(err.stack || err) : 'Internal Server Error');
});

const PORT = process.env.PORT || 3204;
app.listen(PORT, () => console.log(`HexaDesk (RS-04) listening on http://localhost:${PORT}`));
