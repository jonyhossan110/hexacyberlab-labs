# RS-09 — HexaSocial: Express + Mongo-style Social App

**Real Stack Milestone 09** (after core Lab 90) · Advanced · Node.js · Express · JWT · multi-file

A believable small social network — members, public and private posts,
likes, profiles, a people directory — written the way real MEAN/MERN-stack
startups write Express: routers per feature, server-rendered pages beside
a JSON API, cookie auth via a hand-rolled JWT, and a document database
queried with MongoDB-style operators. Twelve scored security tests are
detected server-side as you perform them.

## Data store — an honest note (read this first)

There is **no real MongoDB** in this environment, and this lab does not
pretend otherwise. In its place stands a small **Mongo-style query
engine** (`lib/mongo.js`): collections persisted as JSON files under
`data/`, queried through `find()` / `findOne()` with the same operator
semantics MongoDB and Mongoose use — `$ne`, `$gt`, `$gte`, `$regex`,
`$in`, `$or` and friends. **The injection mechanics are identical**,
because the vulnerabilities were never in the database — they are in
code that hands raw request JSON to a query engine and trusts the
result. Everything you learn here transfers one-to-one to a real
Express + Mongoose + MongoDB target.

## Run it

Through the Hexa Gateway (recommended): start RS-09 from the dashboard.
Standalone:

```bash
bash run.sh
# open http://localhost:3209
```

`run.sh` runs `npm install` on first start (only dependency: **express**)
and then `node server.js`. The port comes from `$PORT` (default 3209).
Data lives in `data/` (the document store's JSON files), created and
seeded on first run. Delete `data/` + `progress.json` to reset (or use
the gateway's Reset button for progress).

## Seeded accounts

| Role | Email | Password |
|---|---|---|
| Admin (founder) | admin@hexasocial.example | Admin!Roam22 |
| Member | felix.wagner@example.de | Berg!pfad8 |
| Member | priya.sharma@example.in | Monsoon!Post5 |
| Member | diego.alvarez@example.es | Sol!Playa3 |

…plus four more members in the seed (Yuki, Amara, Elias, Chloe).
Passwords are stored in **plaintext** — one of the app's many problems,
and fair game for your report. Seeded posts include two **private**
posts (Diego's and Elias's) that their owners believe only they can read.

## Layout (the point of a real-stack lab)

```
server.js           entry point — middleware, routers, error handler
run.sh              npm install (first run) + node server.js, port from $PORT
app/config.js       configuration (debug on, JWT secret is the app's name)
app/jwt.js          hand-rolled HS256 sign/verify — verify() trusts the kid header
app/auth.js         JWT-cookie auth + issued-token tracking
app/progress.js     the lab's scoring (progress.json, same shape as core labs)
app/log.js          application log — read it on the Logs page afterwards
app/layout.js       page chrome + the lab bar      app/views.js  templates
lib/mongo.js        the Mongo-STYLE query engine (see the honest note above)
lib/seed.js         eight fictional members + their posts, seeded on first run
routes/auth.js      login (operator objects welcome, no throttle), register, feed
routes/posts.js     posts, private-post detail, like, link-preview fetcher
routes/profile.js   profile merge, avatar upload, uploads serving, directory
routes/lab.js       brief, tests, guide, code review, logs, complete + report
keys/main.key       the live JWT signing key, a file — as the kid header expects
keys/legacy.key     a retired key file, emptied and left behind (read jwt.js)
logs/               application log        uploads/  avatar uploads land here
.env                the file nobody should ever have committed
```

Your completion code (shown in full on the Complete page at 100%) is
`RS09-` + the first 10 hex chars of SHA-256 of the string
`rs-09-express-mongo:hexasocial`, uppercased.

## The 12 tests

NoSQL operator injection (login bypass) · NoSQL regex data extraction ·
prototype pollution via profile merge · IDOR on a private post · stored
XSS in a post · JWT kid/secret weakness · SSRF link-preview fetcher ·
avatar upload without validation · CSRF on the profile (cookie auth) ·
login brute force with no throttling · race condition on the like
counter · one professional mini-report.

Work **black-box first**; the Code Review page is your second pass.
