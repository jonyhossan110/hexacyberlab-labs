/* HexaSocial — entry point. A real Express app: middleware, routers per
   feature, server-rendered pages beside a small JSON API, cookie auth via
   a hand-rolled JWT, and a document store in the MongoDB style. Runs on
   $PORT (default 3209). */
const express = require('express');
const path = require('path');
const config = require('./app/config');
const { attachUser } = require('./app/auth');
const { requestLogger } = require('./app/log');
const { collection } = require('./lib/mongo');
const { seedIfFresh } = require('./lib/seed');

seedIfFresh(collection('users'), collection('posts')); // create + seed data/ on first run

const app = express();
app.use(requestLogger);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(attachUser);
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));

app.use(require('./routes/auth'));
app.use(require('./routes/posts'));
app.use(require('./routes/profile'));
app.use(require('./routes/lab'));

app.use((req, res) => { res.status(404).send('Cannot ' + req.method + ' ' + req.path); });
// debug is ON in this app — errors are printed with full stack traces
app.use((err, req, res, next) => {
  res.status(500).type('text/plain').send(config.debug ? String(err.stack || err) : 'Internal Server Error');
});

const PORT = process.env.PORT || 3209;
app.listen(PORT, () => console.log(`HexaSocial (RS-09) listening on http://localhost:${PORT}`));
