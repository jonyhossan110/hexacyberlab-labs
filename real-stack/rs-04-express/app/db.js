/* Data layer — Node's built-in SQLite (node:sqlite, DatabaseSync).
   The schema and seed are created on first run, like a real SaaS that
   bootstraps its own tenant data. Queries here use prepared statements —
   this lab's problems live elsewhere. */
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');
const config = require('./config');

let db;
function getDb() {
  if (db) return db;
  const fresh = !fs.existsSync(config.dbFile);
  db = new DatabaseSync(config.dbFile);
  if (fresh) seed(db);
  return db;
}
function seed(d) {
  d.exec(`CREATE TABLE workspaces (id INTEGER PRIMARY KEY, name TEXT, support_email TEXT, timezone TEXT);
          CREATE TABLE users (id INTEGER PRIMARY KEY, workspace_id INTEGER, name TEXT, email TEXT UNIQUE, password TEXT, role TEXT, title TEXT, plan TEXT, credits INTEGER);
          CREATE TABLE projects (id INTEGER PRIMARY KEY, workspace_id INTEGER, name TEXT, description TEXT, status TEXT);
          CREATE TABLE tickets (id INTEGER PRIMARY KEY, workspace_id INTEGER, project_id INTEGER, author_id INTEGER, title TEXT, body TEXT, status TEXT, priority TEXT);
          CREATE TABLE comments (id INTEGER PRIMARY KEY, ticket_id INTEGER, author_id INTEGER, body TEXT, created TEXT);
          CREATE TABLE redemptions (id INTEGER PRIMARY KEY, user_id INTEGER, code TEXT, amount INTEGER, created TEXT);`);
  const ws = d.prepare('INSERT INTO workspaces (name,support_email,timezone) VALUES (?,?,?)');
  ws.run('Northwind Traders', 'support@northwind.example', 'Europe/Oslo');
  ws.run('Globex Support Co', 'help@globex.example', 'Europe/Berlin');
  // passwords are stored in PLAINTEXT — noted in the README, fair game for a report
  const u = d.prepare('INSERT INTO users (workspace_id,name,email,password,role,title,plan,credits) VALUES (?,?,?,?,?,?,?,?)');
  u.run(1, 'Amelia Hart', 'amelia.hart@northwind.example', 'Harbour#Light9', 'admin', 'Head of Support', 'growth', 240);
  u.run(1, 'Priya Nair', 'priya.nair@northwind.example', 'Monsoon!Tea4', 'agent', 'Support Agent', 'growth', 100);
  u.run(1, 'Tom Becker', 'tom.becker@northwind.example', 'Alpine#Desk7', 'agent', 'Support Agent', 'growth', 100);
  u.run(1, 'Sara Lindqvist', 'sara.lindqvist@northwind.example', 'Fjord!View3', 'viewer', 'Support Observer', 'growth', 40);
  u.run(2, 'Jonas Weber', 'jonas.weber@globex.example', 'Waldweg#9', 'admin', 'Support Lead', 'starter', 180);
  u.run(2, 'Aisha Rahman', 'aisha.rahman@globex.example', 'Nordlys!6', 'agent', 'Support Agent', 'starter', 100);
  u.run(2, 'Noah Berg', 'noah.berg@globex.example', 'Tromso!Night1', 'agent', 'Night-shift Agent', 'starter', 100);
  const p = d.prepare('INSERT INTO projects (workspace_id,name,description,status) VALUES (?,?,?,?)');
  p.run(1, 'Website relaunch support', 'Customer questions about the new Northwind storefront, checkout errors and order lookups.', 'active');
  p.run(1, 'VIP onboarding programme', 'White-glove onboarding for Northwind enterprise accounts.', 'active');
  p.run(2, 'Globex SLA migration', 'Moving Globex enterprise customers to the new SLA tiers. Internal timelines are confidential.', 'active');
  p.run(2, 'Confidential — pricing pilot', 'Unannounced pricing experiment. Do not discuss outside Globex.', 'planning');
  const t = d.prepare('INSERT INTO tickets (workspace_id,project_id,author_id,title,body,status,priority) VALUES (?,?,?,?,?,?,?)');
  t.run(1, 1, 2, 'Checkout page returns 502 for EU customers', 'Since the relaunch, customers in the EU hit a 502 at payment. US customers are fine. Started around 09:12 CET.', 'open', 'high');
  t.run(1, 1, 3, 'SSO login loop on Safari', 'Enterprise users on Safari bounce between our login and their IdP. Chrome works. Cookies look correct.', 'investigating', 'medium');
  t.run(2, 3, 6, 'Migration runbook — database cutover', 'Cutover window is Sunday 02:00–04:00 CET. Rollback snapshot must be verified before step 3. Internal only.', 'open', 'high');
  t.run(2, 4, 5, 'Pricing pilot — talking points', 'If a pilot customer asks about the new tiers, use the approved script. The pilot prices are not public yet.', 'open', 'medium');
  const c = d.prepare('INSERT INTO comments (ticket_id,author_id,body,created) VALUES (?,?,?,?)');
  c.run(1, 1, 'Reproduced from a Bergen IP — it is the new CDN rule, not the app. Fix going out tonight.', '2026-10-24 09:41');
  c.run(1, 2, 'Thanks Amelia — two more customers confirmed the same error at checkout step 3.', '2026-10-24 10:05');
  c.run(2, 3, 'Safari blocks the third-party cookie in the IdP iframe. Workaround: open the IdP in a full tab.', '2026-10-23 15:22');
  c.run(3, 5, 'Snapshot verified. Cutover stays on schedule.', '2026-10-24 18:03');
}
module.exports = { getDb };
