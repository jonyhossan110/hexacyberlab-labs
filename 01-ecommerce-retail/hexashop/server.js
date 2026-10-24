'use strict';
// HexaShop — Deliberately Vulnerable E-commerce Lab (LOCAL ONLY)
// Run: node server.js  -> http://localhost:3000
// WARNING: Never deploy publicly. For authorized local pentest practice only.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { exec } = require('node:child_process');
const { DatabaseSync } = require('node:sqlite');

const PORT = 3000;
const ROOT = __dirname;
const DB_PATH = path.join(ROOT, 'shop.db');
const UPLOAD_DIR = path.join(ROOT, 'uploads');
const PUBLIC_DIR = path.join(ROOT, 'public');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

function md5(s){ return crypto.createHash('md5').update(String(s)).digest('hex'); }
// VULN(weak-crypto): passwords stored as unsalted MD5
function esc(s){ if(s==null) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
const _sA=['TC1YSA==']; // ui config fragment

// ---------- DB ----------
const db = new DatabaseSync(DB_PATH);
db.exec(`
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT,email TEXT UNIQUE,password TEXT,name TEXT,phone TEXT,role TEXT DEFAULT 'customer',avatar TEXT,wallet REAL DEFAULT 0,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS products(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT,category TEXT,brand TEXT,price REAL,old_price REAL,stock INTEGER,rating REAL,description TEXT,specs TEXT,emoji TEXT,color TEXT);
CREATE TABLE IF NOT EXISTS orders(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,total REAL,status TEXT DEFAULT 'Processing',items TEXT,address TEXT,payment TEXT,coupon TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS reviews(id INTEGER PRIMARY KEY AUTOINCREMENT,product_id INTEGER,user_id INTEGER,user_name TEXT,rating INTEGER,text TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS cart_items(id INTEGER PRIMARY KEY AUTOINCREMENT,owner_key TEXT,product_id INTEGER,qty INTEGER,price REAL);
CREATE TABLE IF NOT EXISTS addresses(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,label TEXT,address TEXT,city TEXT,phone TEXT);
CREATE TABLE IF NOT EXISTS wishlist(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,product_id INTEGER);
CREATE TABLE IF NOT EXISTS coupons(code TEXT PRIMARY KEY,discount INTEGER,description TEXT);
CREATE TABLE IF NOT EXISTS tickets(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,name TEXT,email TEXT,subject TEXT,message TEXT,status TEXT DEFAULT 'Open',created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS questions(id INTEGER PRIMARY KEY AUTOINCREMENT,product_id INTEGER,user_name TEXT,question TEXT,answer TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS giftcards(code TEXT PRIMARY KEY,balance REAL,used_by INTEGER);
CREATE TABLE IF NOT EXISTS logs(id INTEGER PRIMARY KEY AUTOINCREMENT,msg TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
`);
function logMsg(m){ try{ db.prepare('INSERT INTO logs(msg) VALUES(?)').run(m);}catch(e){} }
function seed(){
  const c = db.prepare('SELECT COUNT(*) c FROM products').get();
  if(c.c>0) return;
  const products=[
    ['Sony WH-1000XM5 Wireless Headphones','Electronics','Sony',299,399,42,4.8,'Industry-leading noise cancelling, 30h battery, multipoint Bluetooth.','Battery 30h | ANC | Bluetooth 5.2 | Weight 250g','🎧','#667eea'],
    ['Apple iPhone 15 Pro 128GB','Electronics','Apple',999,1099,18,4.9,'Titanium body, A17 Pro chip, 48MP camera system.','Display 6.1" OLED | A17 Pro | 128GB | USB-C','📱','#764ba2'],
    ['Samsung 55" QLED 4K Smart TV','Electronics','Samsung',649,899,12,4.7,'Quantum Dot 4K, HDR10+, Smart Hub streaming.','55" QLED | 4K | HDR10+ | Tizen','📺','#f093fb'],
    ['Dell XPS 13 Laptop i7 16GB','Electronics','Dell',1099,1299,9,4.8,'Ultra-thin aluminium laptop for work and travel.','Intel i7 | 16GB RAM | 512GB SSD | 13.4" FHD+','💻','#4facfe'],
    ['Logitech MX Master 3S Mouse','Electronics','Logitech',99,129,80,4.7,'Ergonomic wireless mouse, 8K DPI, quiet clicks.','8K DPI | USB-C | 70 days battery','🖱️','#43e97b'],
    ['Nike Air Max Running Shoes','Fashion','Nike',129,180,60,4.6,'Lightweight mesh, Air cushioning for daily runs.','Mesh upper | Air sole | Sizes 40-46','👟','#fa709a'],
    ['Levi\'s Classic Denim Jacket','Fashion','Levis',89,130,35,4.5,'Timeless denim jacket, durable cotton.','100% Cotton | Button closure','🧥','#30cfd0'],
    ['Ray-Ban Aviator Sunglasses','Fashion','RayBan',149,199,44,4.6,'Gold frame, G-15 green lenses, UV protection.','UV400 | Metal frame | Case included','🕶️','#a8edea'],
    ['Fossil Leather Wallet','Fashion','Fossil',59,85,90,4.4,'Genuine leather bifold with RFID protection.','Leather | RFID | 8 card slots','👛','#fed6e3'],
    ['IKEA Ergonomic Office Chair','Home & Living','IKEA',179,249,22,4.5,'Adjustable lumbar, breathable mesh back.','Mesh | Adjustable arms | 110kg max','🪑','#d299c2'],
    ['Philips Air Fryer XL 6.2L','Home & Living','Philips',139,199,30,4.7,'Rapid Air tech, 90% less fat, app recipes.','6.2L | 1700W | Digital display','🍳','#fef9d7'],
    ['Dyson V11 Cordless Vacuum','Home & Living','Dyson',449,599,14,4.8,'60 min runtime, LCD screen, powerful suction.','60min | HEPA | LCD','🧹','#667eea'],
    ['Ceramic Dinner Set 16pc','Home & Living','Generic',79,120,50,4.3,'Stoneware plates and bowls, dishwasher safe.','16 pieces | Stoneware','🍽️','#89f7fe'],
    ['PlayStation 5 DualSense Controller','Gaming','Sony',69,79,70,4.9,'Haptic feedback, adaptive triggers.','Wireless | USB-C | Haptics','🎮','#4facfe'],
    ['Xbox Series X 1TB Console','Gaming','Microsoft',499,549,7,4.9,'12 TFLOPS, 1TB SSD, Game Pass ready.','1TB SSD | 4K 120fps','🕹️','#43e97b'],
    ['Razer BlackWidow V4 Keyboard','Gaming','Razer',169,229,28,4.7,'Mechanical switches, Chroma RGB.','Mechanical | RGB | Wrist rest','⌨️','#fa709a'],
    ['Gaming Chair Pro RGB','Gaming','Secretlab',329,449,11,4.6,'Memory foam, 4D armrests, recline 165°.','Foam | Steel frame','🎯','#764ba2'],
    ['L\'Oreal Revitalift Face Cream','Beauty','LOreal',24,35,120,4.4,'Anti-wrinkle day cream with Pro-Retinol.','50ml | All skin types','✨','#fed6e3'],
    ['The Ordinary Vitamin C Serum','Beauty','Ordinary',14,22,200,4.5,'Brightening serum, 23% Vitamin C.','30ml | Vegan','💧','#a8edea'],
    ['MAC Matte Lipstick Set','Beauty','MAC',39,55,65,4.6,'6 matte shades, long-lasting colour.','6 shades | Matte','💄','#f093fb'],
    ['Adidas Yoga Mat Pro 6mm','Sports','Adidas',34,49,85,4.5,'Non-slip, extra cushioning, carry strap.','6mm | 183x61cm','🧘','#43e97b'],
    ['Wilson Tennis Racket Pro','Sports','Wilson',119,169,19,4.6,'Graphite frame, balanced for control.','Graphite | 270g','🎾','#30cfd0'],
    ['Fitbit Charge 6 Tracker','Sports','Fitbit',129,159,40,4.5,'Heart rate, GPS, sleep tracking.','GPS | HR | 7-day battery','⌚','#667eea'],
    ['Coleman 4-Person Tent','Sports','Coleman',149,210,16,4.4,'Weatherproof, 10-min setup, dark room tech.','4 person | Waterproof','⛺','#d299c2'],
    ['Instant Pot Duo 7-in-1 5.7L','Home & Living','Instant',89,129,33,4.7,'Pressure cooker, slow cooker, rice cooker in one.','5.7L | 1000W | 7-in-1','🥘','#fef9d7'],
    ['Kindle Paperwhite 16GB','Electronics','Amazon',149,169,27,4.8,'Glare-free 6.8" display, waterproof, weeks of battery.','6.8" | 16GB | Waterproof','📖','#89f7fe'],
  ];
  const ins=db.prepare('INSERT INTO products(name,category,brand,price,old_price,stock,rating,description,specs,emoji,color) VALUES(?,?,?,?,?,?,?,?,?,?,?)');
  for(const p of products) ins.run(...p);
  const uins=db.prepare('INSERT INTO users(email,password,name,phone,role,avatar,wallet) VALUES(?,?,?,?,?,?,?)');
  uins.run('admin@hexashop.local',md5('admin123'),'Admin User','+8801000000000','admin','',500);
  uins.run('alice@test.local',md5('alice123'),'Alice Rahman','+8801711111111','customer','',120);
  uins.run('bob@test.local',md5('bob123'),'Bob Karim','+8801722222222','customer','',45);
  db.prepare('INSERT INTO coupons(code,discount,description) VALUES(?,?,?)').run('WELCOME10',10,'10% off welcome');
  db.prepare('INSERT INTO coupons(code,discount,description) VALUES(?,?,?)').run('HEXA20',20,'20% off special');
  db.prepare('INSERT INTO coupons(code,discount,description) VALUES(?,?,?)').run('FLASH30',30,'Flash sale 30%');
  for(let i=1;i<=10;i++) db.prepare('INSERT INTO giftcards(code,balance) VALUES(?,?)').run('HEXA-'+(1000+i),25);
  // VULN(business-logic): gift-card codes are sequential/guessable HEXA-1001..HEXA-1010
  const items1=JSON.stringify([{id:1,name:products[0][0],price:299,qty:1},{id:6,name:products[5][0],price:129,qty:1}]);
  const items2=JSON.stringify([{id:14,name:products[13][0],price:69,qty:1}]);
  const items3=JSON.stringify([{id:19,name:products[18][0],price:14,qty:2}]);
  db.prepare('INSERT INTO orders(user_id,total,status,items,address,payment) VALUES(?,?,?,?,?,?)').run(2,428,'Delivered',items1,'House 12, Dhaka','Card ****4242');
  db.prepare('INSERT INTO orders(user_id,total,status,items,address,payment) VALUES(?,?,?,?,?,?)').run(2,69,'Shipped',items2,'House 12, Dhaka','Card ****4242');
  db.prepare('INSERT INTO orders(user_id,total,status,items,address,payment) VALUES(?,?,?,?,?,?)').run(3,28,'Processing',items3,'Road 5, Chattogram','Cash on Delivery');
  db.prepare('INSERT INTO addresses(user_id,label,address,city,phone) VALUES(?,?,?,?,?)').run(2,'Home','House 12, Dhanmondi','Dhaka','+8801711111111');
  db.prepare('INSERT INTO addresses(user_id,label,address,city,phone) VALUES(?,?,?,?,?)').run(3,'Home','Road 5, GEC','Chattogram','+8801722222222');
  const rins=db.prepare('INSERT INTO reviews(product_id,user_id,user_name,rating,text) VALUES(?,?,?,?,?)');
  rins.run(1,2,'Alice Rahman',5,'Amazing sound quality, totally worth it!');
  rins.run(1,3,'Bob Karim',4,'Great ANC, battery lasts forever.');
  rins.run(2,2,'Alice Rahman',5,'Camera is incredible.');
  rins.run(15,3,'Bob Karim',5,'Best console I have owned.');
  db.prepare('INSERT INTO questions(product_id,user_name,question,answer) VALUES(?,?,?,?)').run(1,'Visitor','Does it support iPhone?','Yes, Bluetooth works with iOS and Android.');
  logMsg('DB seeded');
}
seed();
const _sB=['Ny0yMA==']; // catalogue config fragment

// ---------- helpers ----------
function parseCookies(req){ const o={}; const h=req.headers.cookie||''; h.split(';').forEach(p=>{ const i=p.indexOf('='); if(i>0) o[p.slice(0,i).trim()]=decodeURIComponent(p.slice(i+1).trim()); }); return o; }
function parseBody(req){ return new Promise(res=>{ let d=''; req.on('data',c=>d+=c); req.on('end',()=>res(d)); }); }
function readBodyBuffer(req){ return new Promise(res=>{ const ch=[]; req.on('data',c=>ch.push(c)); req.on('end',()=>res(Buffer.concat(ch))); }); }
function parseForm(body){ const o={}; new URLSearchParams(body).forEach((v,k)=>o[k]=v); return o; }
function parseMultipart(bodyBuf, boundary){
  const fields={}; let file=null;
  const text=bodyBuf.toString('binary');
  const parts=text.split('--'+boundary);
  for(const part of parts){
    if(!part.includes('Content-Disposition')) continue;
    const nameM=part.match(/name="([^"]+)"/); if(!nameM) continue;
    const fnM=part.match(/filename="([^"]*)"/);
    const headerEnd=part.indexOf('\r\n\r\n'); if(headerEnd<0) continue;
    let content=part.slice(headerEnd+4); if(content.endsWith('\r\n')) content=content.slice(0,-2);
    if(fnM && fnM[1]){ file={field:nameM[1],filename:fnM[1],data:Buffer.from(content,'binary')}; fields[nameM[1]+'_filename']=fnM[1]; }
    else fields[nameM[1]]=content;
  }
  return {fields,file};
}
// VULN(broken-access-control): session cookie is unsigned base64 of "userid:role" — tamper role to admin
function makeSession(user){ return Buffer.from(user.id+':'+user.role).toString('base64'); }
function getUser(req){
  const c=parseCookies(req); if(!c.session) return null;
  try{ const dec=Buffer.from(c.session,'base64').toString(); const [id]=dec.split(':'); const u=db.prepare('SELECT * FROM users WHERE id=?').get(parseInt(id)); return u||null; }catch(e){ return null; }
}
function getRoleFromCookie(req){ const c=parseCookies(req); if(!c.session) return null; try{ const dec=Buffer.from(c.session,'base64').toString(); return dec.split(':')[1]||null; }catch(e){ return null; } }
function isAdmin(req){ return getRoleFromCookie(req)==='admin'; }
const _sC=['Rk1NNQ==']; // session config fragment
function ownerKey(req){ const u=getUser(req); if(u) return 'user:'+u.id; const c=parseCookies(req); return 'guest:'+(c.guest||'anon'); }
function cartCount(key){ try{ const r=db.prepare('SELECT COALESCE(SUM(qty),0) s FROM cart_items WHERE owner_key=?').get(key); return r.s||0; }catch(e){ return 0; } }
function cartItems(key){ return db.prepare('SELECT ci.*,p.name,p.emoji,p.color FROM cart_items ci JOIN products p ON p.id=ci.product_id WHERE ci.owner_key=?').all(key); }

// ---------- HexaCyberLab lab system: progress, tests registry, chatbot ----------
const LAB_NUMBER=1, LAB_NAME='HexaShop';
const FEATURES=['Login & Authentication','Search & Catalogue','Products & Reviews','Orders & Invoices','Cart & Checkout','Profile & Account','File Upload & Download','API & Tokens','Admin Panel','Platform & Configuration'];
const TESTS=[
{id:'sqli-login',feature:'Login & Authentication',name:'SQL Injection — Login Bypass',owasp:'A03 Injection',difficulty:'Beginner',keys:['sql','injection','sqli','login bypass'],
 hints:["The login form builds its SQL query by gluing your input into a string. What happens if your email contains a single quote?","Close the email string with a quote, then make the rest of the query a comment: -- ","Try email: ' OR '1'='1' -- with any password. Or target the admin directly: admin@hexashop.local' -- "],
 lesson:'Login forms that concatenate input into SQL let attackers rewrite the query itself. Parameterized queries make input data, never code.',
 impact:"On a real store this is instant takeover of any account — including admin — without knowing a single password. Customer data, orders and the whole back office are exposed.",
 report:{title:'SQL Injection in Authentication (Login Form)',severity:'Critical',remediation:'Use parameterized queries/prepared statements for all database access; never concatenate user input into SQL.'},
 guide:"Step by step: 1) Open the login page. 2) In the email field enter: ' OR '1'='1' -- (keep the trailing space). 3) Type any password and submit — the query now matches the first user (admin) and never checks the password. Variant: admin@hexashop.local' -- logs you in as admin directly. The same flaw exists in POST /api/login."},
{id:'brute-force',feature:'Login & Authentication',name:'Brute Force — No Rate Limiting',owasp:'A07 Auth Failures',difficulty:'Beginner',keys:['brute','rate limit','lockout','throttle','password guessing'],
 hints:['Nothing slows you down when a login fails. How many wrong passwords can you submit in a row?','There is no lockout, no delay and no CAPTCHA — a script can try thousands of passwords.','Make 10 failed login attempts for alice@test.local — the app keeps accepting them instantly. That is the flaw, proven.'],
 lesson:'Without throttling, lockout or MFA, any weak password falls to automated guessing. Rate limiting turns a minutes-long attack into an impractical one.',
 impact:"Attackers grind through password lists against a client's customer accounts at full speed. One reused or weak password means a drained wallet and stolen personal data.",
 report:{title:'Missing Rate Limiting / Account Lockout on Login',severity:'Medium',remediation:'Add progressive rate limiting and temporary lockout per account+IP, log authentication anomalies, and offer MFA.'},
 guide:'Step by step: 1) Pick a target account, e.g. alice@test.local. 2) Submit a wrong password. 3) Repeat at least 10 times — observe that every attempt is processed instantly, with no lockout, delay or CAPTCHA. A real attack uses Burp Intruder or Hydra to try thousands per minute.'},
{id:'user-enumeration',feature:'Login & Authentication',name:'User Enumeration via Forgot Password',owasp:'A07 Auth Failures',difficulty:'Beginner',keys:['enumeration','enumerate','which accounts','forgot'],
 hints:['Ask for a password reset for an email that exists — then for one that does not. Does the app answer differently?','The forgot-password page openly confirms whether an account exists.','Try alice@test.local (exists) and nobody@example.com (does not) on /forgot and compare the two messages.'],
 lesson:'Different responses for existing vs non-existing accounts hand attackers a free list of valid users to target. Uniform responses close the leak.',
 impact:"Attackers first harvest which of their leaked emails hold accounts on a client's store, then aim phishing and credential stuffing only at real customers.",
 report:{title:'Account Enumeration via Password Reset Responses',severity:'Low',remediation:'Return an identical generic message for all reset requests, whether or not the account exists.'},
 guide:'Step by step: 1) Go to /forgot and request a reset for alice@test.local — the app confirms the account (and even shows a reset link). 2) Request a reset for an address that is not registered. 3) Compare the messages: the app openly says no account exists for the second. That difference is the enumeration oracle.'},
{id:'weak-password',feature:'Login & Authentication',name:'Weak Password Policy at Registration',owasp:'A07 Auth Failures',difficulty:'Beginner',keys:['weak password','password policy','short password','register'],
 hints:['How short can a new account password be?','The register form accepts almost anything — there is no length or complexity check.','Register a new account with a 1-character password. It is accepted and you are logged in.'],
 lesson:'A password policy is the cheapest defence a store owns. Allowing 1-character passwords invites instant compromise of customer accounts.',
 impact:'Customers who pick trivial passwords lose their accounts — with stored addresses, order history and wallet balance — to the simplest guessing attacks.',
 report:{title:'Weak Password Policy on Registration',severity:'Low',remediation:'Enforce a minimum length (12+ recommended) and block common/breached passwords at registration and password reset.'},
 guide:'Step by step: 1) Open /register. 2) Create an account with the password set to a single character, e.g. "a". 3) The account is created and you are logged straight in — no policy stood in the way.'},
{id:'default-creds',feature:'Login & Authentication',name:'Default Administrator Credentials',owasp:'A07 Auth Failures',difficulty:'Beginner',keys:['default','admin123','credentials','demo account'],
 hints:['The shop itself tells you its demo accounts — and one of them is the administrator.','Check the login page: the credentials are printed right on it.','Log in as admin@hexashop.local / admin123. On a real site, shipped and documented default credentials are a Critical finding.'],
 lesson:'Default and publicly documented credentials are the first thing every attacker tries. Production systems must force a unique password at first login.',
 impact:'Anyone on the internet can become admin of a store that ships with known credentials — full control of products, prices, orders and customer data.',
 report:{title:'Default Credentials for Administrative Account',severity:'Critical',remediation:'Remove default accounts from production builds; generate per-install secrets and force a password change at first login.'},
 guide:'Step by step: 1) Read the login page — it prints the demo accounts. 2) Sign in with admin@hexashop.local / admin123. 3) You now hold the full admin panel. On a real engagement, publicly known defaults are reported as Critical.'},
{id:'reset-token',feature:'Login & Authentication',name:'Predictable Password-Reset Token',owasp:'A02 Crypto Failures',difficulty:'Intermediate',keys:['reset','token','predictable','md5'],
 hints:['The reset token is a hash of something public. What do you know about every user? Their email address.','The token has a familiar 32-hex shape — the same shape as the password hashes in /api/users.','The token is exactly md5(email). Compute md5 of bob@test.local yourself and open /reset?email=bob@test.local&token=<that hash> — without ever requesting a reset.'],
 lesson:'Reset tokens must be random, single-use and expiring. A token derived from public data is not a secret — it is an account-takeover link anyone can mint.',
 impact:"Anyone who knows a customer's email can reset their password and take over the account. Support teams see this exact attack in real breaches.",
 report:{title:'Predictable Password Reset Token (Derived from Email)',severity:'High',remediation:'Generate reset tokens from a CSPRNG, store only their hash, expire them within 30–60 minutes and invalidate after use.'},
 guide:'Step by step: 1) Do NOT request a reset link for your target — that just hands you the answer. 2) Compute the MD5 of the target email, e.g. md5 of bob@test.local (one command in any terminal). 3) Browse to /reset?email=bob@test.local&token=<md5> and set a new password. 4) Log in as Bob. The token was predictable because it is only a hash of a public value.'},
{id:'sqli-search',feature:'Search & Catalogue',name:'SQL Injection — Search (UNION)',owasp:'A03 Injection',difficulty:'Advanced',keys:['union','search','select'],
 hints:['The shop search glues your text into a LIKE clause. A quote changes the structure of the query.','UNION SELECT needs the same number of columns as the original query — products has 12 columns.',"Try in the search box: ' UNION SELECT 1,2,3,4,5,6,7,8,9,10,11,12 -- and watch rows appear that are not products."],
 lesson:'UNION injection turns a search box into a database reader. Any concatenated query — search, filters, APIs — can dump the entire database.',
 impact:'A single search field can leak every customer record and password hash in the store. This is how mass breaches start.',
 report:{title:'SQL Injection in Product Search (UNION-Based)',severity:'Critical',remediation:'Parameterize all queries; validate and type-check identifiers; apply least-privilege database accounts.'},
 guide:"Step by step: 1) Search normally and note the result format. 2) Search for: ' UNION SELECT 1,2,3,4,5,6,7,8,9,10,11,12 -- — the count must match the products columns (12). 3) The page now renders rows that are not products. 4) Replace numbers with real columns from another table (users: id,email,password,name,phone,role,avatar,wallet,created_at — padded to 12) to extract data. /api/search and /api/product/<id> share the flaw."},
{id:'sqli-sort',feature:'Search & Catalogue',name:'SQL Injection — Sort Parameter (ORDER BY)',owasp:'A03 Injection',difficulty:'Intermediate',keys:['sort','order by','orderby'],
 hints:['The sort value lands directly in ORDER BY. What if you supply your own SQL expression instead of a column name?','ORDER BY cannot be parameterized like a value — the app just pastes your text in.','Request /shop?sort=(CASE WHEN 1=1 THEN price ELSE id END) and see the ordering obey your expression.'],
 lesson:'ORDER BY injection survives naive parameterization, because expression positions cannot be bound as values. Sort parameters need a strict allowlist.',
 impact:'Attackers run boolean- and error-based extraction through the sort parameter — a quieter path to the same full database dump.',
 report:{title:'SQL Injection via Sort Parameter (ORDER BY)',severity:'High',remediation:'Map sort parameters through a server-side allowlist of permitted columns and directions; never interpolate raw input.'},
 guide:'Step by step: 1) Open /shop and sort normally — watch the sort= value in the URL. 2) Replace it with: (CASE WHEN 1=1 THEN price ELSE id END). 3) Products come back ordered by price — your expression executed inside the query. 4) Flip 1=1 to 1=2 and watch behaviour change: that true/false channel is boolean-based injection.'},
{id:'verbose-errors',feature:'Search & Catalogue',name:'Verbose SQL Error Disclosure',owasp:'A05 Misconfiguration',difficulty:'Beginner',keys:['error','verbose','sql error','disclosure'],
 hints:['The developers left database errors switched on. Break a query and read what the page tells you.','A single quote in the search box is enough to break it.',"Search for just: ' — the page prints the SQL error AND the full query text. That text is a map for every other injection in this lab."],
 lesson:'Error messages that include SQL text teach attackers your schema for free. Users get generic errors; details belong in server logs only.',
 impact:'Every failed attack becomes reconnaissance: error output reveals table names, column names and query structure, making the real injection far easier.',
 report:{title:'Verbose Error Messages Disclosing SQL Queries',severity:'Medium',remediation:'Return generic error pages to users; log detailed errors server-side only; disable debug output in production.'},
 guide:"Step by step: 1) In the shop search, enter a single quote: ' 2) Submit. 3) The page answers with 'SQL Error:' plus the raw database error and the complete SQL statement — information no visitor should ever see. The product page (/product/abc) and the login fail the same way."},
{id:'reflected-xss',feature:'Search & Catalogue',name:'Reflected XSS in Search',owasp:'A03 Injection',difficulty:'Beginner',keys:['reflected','xss','cross-site','script'],
 hints:['Your search text is echoed back on the results page. Is it encoded?','View the page source after searching for an HTML tag.',"Search for <script>alert(1)</script> — it lands in the page unescaped and executes."],
 lesson:"Any input reflected into a page without contextual output encoding becomes script in a victim's browser. Encode on output, always.",
 impact:"Attackers send customers a crafted search link that runs script in their session — stealing carts, sessions and payment details on a store they trust.",
 report:{title:'Reflected Cross-Site Scripting in Search Results',severity:'Medium',remediation:'Apply contextual output encoding to all reflected data and deploy a Content-Security-Policy.'},
 guide:'Step by step: 1) Search for <script>alert(document.domain)</script>. 2) The results page echoes your text inside "Results for:" with no escaping, and the script executes. 3) In a real attack this link is sent to a victim and runs in their logged-in session.'},
{id:'stored-xss',feature:'Products & Reviews',name:'Stored XSS — Reviews, Q&A, Tickets, Profile Name',owasp:'A03 Injection',difficulty:'Intermediate',keys:['stored','xss','review','persistent','ticket'],
 hints:['Some text you save is later shown to other people — including admins. Where does the shop print stored text without escaping?','Reviews are the classic spot: the payload waits on the product page for the next visitor.',"Post a review containing <script>alert(1)</script>. It is stored and fires for everyone who opens that product. The same flaw lives in Q&A, support tickets and your profile display name."],
 lesson:'Stored XSS is the persistent variant: one submission attacks every future viewer, including staff. Output encoding on every render is the only safe default.',
 impact:"A poisoned review or ticket executes in the admin's browser during routine moderation — session theft and actions performed in the admin's name by the attacker's script.",
 report:{title:'Stored Cross-Site Scripting in User-Generated Content',severity:'High',remediation:'Escape all stored user content on output in every view (storefront and admin); add CSP as defence-in-depth.'},
 guide:'Step by step: 1) Open any product. 2) Submit a review whose text is <script>alert(1)</script> (or an <img src=x onerror=alert(1)> variant). 3) Re-open the product page — your payload executes from the database. 4) The same stored-payload pattern works in Q&A, in a support ticket (it fires in /admin/tickets) and in your profile display name (it fires site-wide in the header).'},
{id:'idor-orders',feature:'Orders & Invoices',name:'IDOR — Orders, Invoices & Addresses',owasp:'A01 Broken Access Control',difficulty:'Beginner',keys:['idor','bola','order','invoice','address','object'],
 hints:["Your order pages use simple sequential numbers. What stops you opening someone else's number?",'Log in as Alice and look at her order URLs: /order/1 and /order/2.','Alice owns orders 1 and 2. Open /order/3 — that is Bob\'s order. The invoice, address view and /api/orders/<id> have the same flaw.'],
 lesson:'Checking "is the user logged in" is not authorization. Every object access must verify the object belongs to that user.',
 impact:"Every customer's orders, invoices and addresses are readable by any other customer — names, addresses, phone numbers and purchase history, at scale.",
 report:{title:'Insecure Direct Object Reference (IDOR) on Orders / Invoices / Addresses',severity:'High',remediation:'Enforce server-side ownership checks on every object access (WHERE user_id = session user); deny by default.'},
 guide:"Step by step: 1) Log in as Alice and open /my-orders — her orders are #1 and #2. 2) Change the URL to /order/3. 3) Bob's order, items and delivery address are shown — no ownership check happens. 4) Repeat with /invoice/3, /address/1 (while logged in as Bob) and the JSON twin /api/orders/3."},
{id:'price-tampering',feature:'Cart & Checkout',name:'Price Tampering at Checkout',owasp:'A04 Insecure Design',difficulty:'Beginner',keys:['price','tampering','tamper','checkout','hidden','total'],
 hints:['The checkout form carries the prices and the total inside hidden fields. Who says they are still true when they come back?','Intercept the checkout request (browser dev tools or Burp) and edit it before sending.','Add something to the cart, open checkout, then submit with total changed to 1.00 and the hidden price_ fields lowered. The order is created at your price.'],
 lesson:'Prices and totals must be recomputed on the server from the catalogue at order time. Anything the browser sends is a request, not a fact.',
 impact:'Customers check out a $999 phone for $1. On a real store this is direct revenue theft that finance may not notice for weeks.',
 report:{title:'Client-Side Price Tampering in Checkout',severity:'High',remediation:'Recompute all prices and totals server-side from the database at checkout; ignore client-supplied amounts.'},
 guide:'Step by step: 1) Add a product to the cart and open /checkout. 2) Inspect the form: total, price_0, qty_0 are hidden inputs. 3) Change total to 1.00 (dev tools or an intercepting proxy) and place the order. 4) Open the order — it was recorded at your tampered price.'},
{id:'business-logic',feature:'Cart & Checkout',name:'Business Logic — Coupons, Gift Cards & Quantities',owasp:'A04 Insecure Design',difficulty:'Intermediate',keys:['coupon','gift','business logic','negative','quantity','stacking','logic'],
 hints:['Three small logic flaws stack up: quantities, coupons and gift cards. Probe each rule the shop assumes but never checks.','Coupons: what happens with two codes separated by a comma — or the same code on a second order? Gift cards: look at the code pattern. Quantities: try a negative number.','Working examples: cart quantity of -5; checkout coupon "WELCOME10,HEXA20" (both apply together); gift card HEXA-1001 — codes are sequential (HEXA-1001 to HEXA-1010).'],
 lesson:'Business-logic flaws are rule violations, not syntax bugs: the code runs exactly as written, but the rules themselves are missing. Model abuse cases for every money flow.',
 impact:'Stacked discounts, reused coupons, guessed gift cards and negative quantities quietly convert a profitable store into a giveaway — no "hack" required.',
 report:{title:'Business Logic Flaws in Cart/Checkout (Coupons, Gift Cards, Quantities)',severity:'High',remediation:'Validate quantities server-side (> 0); single-use, non-stackable coupons; long random gift-card codes with a redemption ledger.'},
 guide:'Step by step — any one proves it: 1) Add an item with quantity -5 and watch the cart total drop. 2) At checkout enter coupon "WELCOME10,HEXA20" — both discounts apply together. 3) Reuse the same coupon on a second order — it works again. 4) Guess a gift card: codes are HEXA-1001 through HEXA-1010; enter one at checkout and $25 disappears from the total.'},
{id:'csrf',feature:'Profile & Account',name:'CSRF — No Anti-CSRF Tokens',owasp:'A01 Broken Access Control',difficulty:'Intermediate',keys:['csrf','token','cross-site request','forgery'],
 hints:["State-changing forms in this shop carry no token. If you are logged in and a malicious page auto-submits a form here, what stops it?",'Nothing does — the session cookie rides along automatically.','From any other origin (or a bare HTTP client holding only the session cookie), POST to /profile/update with a new email — it just works. Even deletes ride on GET: /address/delete?id=...'],
 lesson:'Without per-session tokens and SameSite cookies, any website a logged-in user visits can act in their name. GET requests must never change state.',
 impact:"A booby-trapped page or ad silently changes a customer's email — then the attacker uses 'forgot password' to own the account completely.",
 report:{title:'Cross-Site Request Forgery on Account & Admin Actions',severity:'Medium',remediation:'Add per-session anti-CSRF tokens to all state-changing forms; set SameSite=Lax/Strict cookies; use POST for state changes.'},
 guide:"Step by step: 1) Log in as Alice. 2) From a plain HTTP client (curl) send POST /profile/update carrying ONLY her session cookie — no other site cookie and no token — with changed name/email fields. 3) The profile is updated: the site cannot tell this request did not come from its own form. 4) Note the GET-based deletions (/address/delete, /admin/products/delete) — an <img> tag on any page would trigger them in a victim's browser."},
{id:'mass-assignment',feature:'Profile & Account',name:'Mass Assignment — Profile Update (role & wallet)',owasp:'A01 Broken Access Control',difficulty:'Intermediate',keys:['mass assignment','role','wallet','extra fields','bind'],
 hints:['The profile form shows name, email and phone. Does the server only accept those fields — or anything else you add to the POST?','Try adding fields the form never offered.','POST /profile/update with extra fields role=admin and wallet=9999. The server binds them straight onto your user record.'],
 lesson:'Binding request bodies directly to data models lets attackers write fields that were never on the form. Update endpoints need explicit field allowlists.',
 impact:'A customer promotes themselves to admin and inflates their wallet in one request — privilege escalation and free money with no exploit code at all.',
 report:{title:'Mass Assignment in Profile Update (Role & Wallet Writable)',severity:'High',remediation:'Allowlist writable fields per endpoint (name, email, phone only); never bind model objects directly from request bodies.'},
 guide:'Step by step: 1) Log in as a normal customer. 2) Send POST /profile/update with the usual fields PLUS role=admin and wallet=9999. 3) Open /profile: your role and wallet were rewritten by the server. 4) At your next login the session is even issued with the admin role — you are now a "real" admin.'},
{id:'file-upload',feature:'File Upload & Download',name:'Unrestricted File Upload',owasp:'A01 Broken Access Control',difficulty:'Intermediate',keys:['upload','file','avatar','html','svg'],
 hints:['Avatar and product-image uploads ask for a file — but do they check what kind of file it really is?','Uploaded files are served back from /uploads/ with a content type guessed from the extension.','Upload a file named x.html containing a script as your avatar. Then open /uploads/x.html — it is served as text/html and the script runs on the shop origin.'],
 lesson:'An upload feature without type allowlisting, random names and safe serving is a stored-XSS and webshell delivery system. Treat every upload as hostile.',
 impact:"Attackers host script and phishing pages on the store's own domain — abusing its reputation and stealing the sessions of anyone who opens the link, staff included.",
 report:{title:'Unrestricted File Upload Leading to Stored Content Execution',severity:'High',remediation:'Allowlist extensions and verify content type; store uploads under random names; serve them as attachments from a separate, non-executable location.'},
 guide:'Step by step: 1) Create a text file x.html containing <script>alert(document.domain)</script>. 2) Upload it as your avatar on /profile (or as a product image in the admin panel). 3) Browse to /uploads/x.html — the shop serves it as HTML and the script executes in the shop origin. 4) SVG files with embedded script behave the same way.'},
{id:'path-traversal',feature:'File Upload & Download',name:'Path Traversal — Arbitrary File Read',owasp:'A01 Broken Access Control',difficulty:'Intermediate',keys:['traversal','download','file read','../','path'],
 hints:['The /download endpoint turns a filename into a filesystem path. What if the name climbs out of its folder?','Try relatives: the handler joins your text to the shop folder without checking where it lands.','GET /download?file=server.js reads the application source itself. shop.db — the whole database — is reachable the same way.'],
 lesson:'User-controlled paths must be resolved and confined to an allowed directory. One traversal flaw turns a download link into the entire server filesystem.',
 impact:'Source code and the live database file — every customer and order — can be downloaded through one innocent-looking parameter.',
 report:{title:'Path Traversal in File Download (Arbitrary File Read)',severity:'High',remediation:'Resolve the requested path and verify it stays inside the allowed directory; address downloads by ID, never by user-supplied filename.'},
 guide:'Step by step: 1) Open /download?file=server.js — the full application source comes back. 2) Try /download?file=shop.db for the database file itself. 3) Add ../ segments to climb further up the filesystem. Nothing validates that the file lives in an allowed folder.'},
{id:'ssrf',feature:'File Upload & Download',name:'SSRF — Server-Side URL Fetch',owasp:'A10 SSRF',difficulty:'Intermediate',keys:['ssrf','fetch','url','import','server-side'],
 hints:['Two features make the server fetch a URL you supply: avatar-from-URL and the admin product import. The server will happily talk to itself.','Point the fetch at the shop\'s own internal pages — /debug is a rich target.','POST /profile/avatar-url with url=http://localhost:3000/debug, or as admin use /admin/import-url against http://127.0.0.1:3000/api/users and read what the server fetched for you.'],
 lesson:'When a server fetches arbitrary URLs it becomes the attacker\'s proxy inside the network — reaching admin panels and cloud metadata that outsiders cannot.',
 impact:'Internal services, debug pages and cloud metadata endpoints become readable — a classic stepping stone from one web bug to full cloud account compromise.',
 report:{title:'Server-Side Request Forgery in URL Import Features',severity:'High',remediation:'Allowlist permitted hosts/schemes; block private and loopback ranges after DNS resolution; disable redirects to internal targets.'},
 guide:'Step by step: 1) As a customer, use "Avatar from URL" on /profile with http://127.0.0.1:3000/api/users — the server fetches its own API. 2) As admin, /admin/import-url shows you the fetched content directly: try http://localhost:3000/debug. 3) The request was made by the server, from inside — that is SSRF.'},
{id:'data-exposure',feature:'API & Tokens',name:'Sensitive Data Exposure — /api/users, /debug, /backup.sql',owasp:'A01 Broken Access Control',difficulty:'Beginner',keys:['exposure','api/users','debug','backup','sensitive','leak'],
 hints:['Some doors were left wide open: an API that lists users, a debug page, a backup file. None of them ask who you are.','Start with GET /api/users — no login needed.','Then fetch /debug (environment variables plus the API secret) and /backup.sql (a full database dump). All three answer anonymous requests.'],
 lesson:'Debug pages, backups and over-sharing APIs are production data leaks hiding in plain sight. If an endpoint is not needed in production, it must not exist there.',
 impact:'One anonymous request downloads every account with its password hash — and the debug page even hands out the token-signing secret. Total compromise with zero exploitation skill.',
 report:{title:'Sensitive Data Exposure via Unauthenticated Endpoints',severity:'Critical',remediation:'Require authentication and minimize returned fields (never password hashes); remove debug and backup endpoints from production entirely.'},
 guide:'Step by step: 1) Log out completely. 2) GET /api/users — every user, with their MD5 password hash, no questions asked. 3) GET /debug — environment variables and the API token secret. 4) GET /backup.sql — a ready-made dump of users, products, orders and coupons.'},
{id:'jwt-weak',feature:'API & Tokens',name:'Weak API Token — alg=none & Guessable Secret',owasp:'A02 Crypto Failures',difficulty:'Advanced',keys:['jwt','token','alg','none','secret','forge'],
 hints:['The API issues JWT-style tokens signed with a secret. Where have you already seen that secret?','/debug prints it. And the verifier trusts the token header more than it should.','Two roads: (1) build a token with header {"alg":"none"} and any payload — /api/me accepts it unsigned; (2) sign a forged admin payload with HMAC-SHA256 using the leaked secret.'],
 lesson:'Tokens are only as strong as their secret and algorithm checks. Accepting alg=none or using a published secret reduces authentication to a text file anyone can write.',
 impact:'Attackers mint admin tokens at will — full API access as any user, no password needed, and nothing in the logs looks like a login.',
 report:{title:'API Token Forgery (alg=none Accepted, Weak Hardcoded Secret)',severity:'Critical',remediation:'Use a strong random per-install secret; pin and verify the algorithm server-side with a vetted JWT library; set short token expiries.'},
 guide:'Step by step: 1) Get a real token from POST /api/login and base64url-decode its payload to learn the format. 2) Road A: build header {"alg":"none","typ":"JWT"} and payload {"id":1,"email":"admin@hexashop.local","role":"admin"}, join with dots and no signature — GET /api/me accepts it. 3) Road B: sign any payload with HMAC-SHA256 using the secret leaked in /debug. Either way the API treats you as admin.'},
{id:'cookie-role',feature:'Admin Panel',name:'Session Cookie Tampering — Role Escalation',owasp:'A01 Broken Access Control',difficulty:'Beginner',keys:['cookie','session','role','tamper','escalation'],
 hints:['After login, decode your session cookie. It is just base64 — what two things does it say about you?','The server trusts the role written inside the cookie instead of checking the database.','Your cookie decodes to "<id>:customer". Re-encode it as "<id>:admin" and reload /admin — the gate opens.'],
 lesson:'Identity and role are server-side facts. Anything stored client-side — cookies included — is attacker-editable and must never be trusted for authorization.',
 impact:'Every customer becomes admin in ten seconds: product prices, orders, user roles and the admin toolkit all surrender to a copy-paste.',
 report:{title:'Broken Access Control via Unsigned Session Cookie (Role Tampering)',severity:'Critical',remediation:'Use opaque server-side sessions (or signed tokens); always load the role from the database on each request.'},
 guide:'Step by step: 1) Log in as Alice and copy the session cookie. 2) Base64-decode it: it reads "2:customer". 3) Change it to "2:admin", re-encode, and replace the cookie in your browser. 4) Open /admin — the full dashboard appears. The server never asked the database what Alice\'s role really is. (This is also the combined session-tampering finding: the web session and the API token are two parallel client-trusted mechanisms.)'},
{id:'command-injection',feature:'Admin Panel',name:'Command Injection — Admin Ping Tool',owasp:'A03 Injection',difficulty:'Intermediate',keys:['command','injection','ping','shell','rce','exec'],
 hints:['The ping tool builds a shell command out of your host input. Shells listen to more than hostnames.','Chain a second command with a shell separator.','In /admin/ping enter: 127.0.0.1; echo PWNED (&& and | work too). The extra command\'s output appears in the result — the shell obeyed you, not the app.'],
 lesson:'Passing user input to a shell is remote code execution with extra steps. Use argument-array execution APIs and validate input as data.',
 impact:'Whoever reaches this tool runs operating-system commands as the server — reading files, planting backdoors, pivoting into the internal network.',
 report:{title:'OS Command Injection in Admin Ping Utility',severity:'Critical',remediation:'Never build shell strings from input; call execFile with an argument array and enforce a strict host/IP allowlist format.'},
 guide:'Step by step: 1) Get admin (a real admin login, or the cookie-tampering test first). 2) Open /admin/ping. 3) Enter the host: 127.0.0.1; id — or append ; ls. 4) The result page shows the injected command\'s output: the app concatenated your text straight into a shell command.'},

{id:'open-redirect',feature:'Platform & Configuration',name:'Open Redirect — /go & Login next',owasp:'A01 Broken Access Control',difficulty:'Beginner',keys:['redirect','go','next','phishing'],
 hints:['Links that bounce you elsewhere take the destination from the URL. Does anything check where "elsewhere" is?','The /go endpoint and the login form\'s next field both trust the supplied address.','Open /go?url=https://example.com — you land there. A phishing mail can do the same with the login page: log in, end up on a lookalike site.'],
 lesson:'Redirect targets must be allowlisted to relative, in-app paths. An unchecked redirector lends your domain\'s trust to any phishing page.',
 impact:"Attackers send customers a link on the real shop domain that ends on a fake payment page — the victim checked the first domain and trusted it.",
 report:{title:'Open Redirect in /go and Login next Parameter',severity:'Low',remediation:'Only allow relative paths (or an explicit allowlist) for redirect targets; reject absolute external URLs.'},
 guide:'Step by step: 1) Browse to /go?url=https://example.com — the shop 302-redirects you off-site with no check at all. 2) Same trick via /login?next=https://example.com — after a successful login you are delivered to the external site.'},
{id:'security-misconfig',feature:'Platform & Configuration',name:'Security Misconfiguration — CORS & Missing Headers',owasp:'A05 Misconfiguration',difficulty:'Beginner',keys:['cors','headers','misconfiguration','clickjacking','origin'],
 hints:['Send a request with a foreign Origin header and read the response headers carefully.','The shop reflects ANY origin back with credentials allowed — and sets no X-Frame-Options or CSP.','Request the homepage with header Origin: https://evil.example — Access-Control-Allow-Origin echoes your evil origin with Allow-Credentials: true. The pages can also be framed by anyone (clickjacking).'],
 lesson:'CORS reflection with credentials lets any website read a logged-in user\'s responses cross-origin. Security headers are cheap, standard hardening — their absence is a finding.',
 impact:"A malicious site can read a signed-in customer's account data through their own browser, and frame the shop inside a clickjacking page that tricks their clicks.",
 report:{title:'Security Misconfiguration (Permissive CORS, Missing Security Headers)',severity:'Medium',remediation:'Use a strict CORS allowlist; add CSP, X-Frame-Options/frame-ancestors, X-Content-Type-Options and HSTS; remove the server banner.'},
 guide:'Step by step: 1) Request any page with the header Origin: https://evil.example. 2) Read the response: Access-Control-Allow-Origin repeats YOUR origin and Access-Control-Allow-Credentials is true — a browser would let evil.example read responses as the victim. 3) Check for X-Frame-Options and Content-Security-Policy: both are missing, and a Server banner advertises the stack.'}
];
const PROGRESS_PATH=path.join(ROOT,'progress.json');
let progress={unlocked:true,testerName:'',tests:{},attempts:{},completedAt:null,keyRevealed:false};
try{ if(fs.existsSync(PROGRESS_PATH)){ const p=JSON.parse(fs.readFileSync(PROGRESS_PATH,'utf8')); progress={...progress,...p}; } }catch(e){}
function saveProgress(){ try{ fs.writeFileSync(PROGRESS_PATH+'.tmp',JSON.stringify(progress,null,2)); fs.renameSync(PROGRESS_PATH+'.tmp',PROGRESS_PATH); }catch(e){} }
function assembleCompletionKey(){ const sh=[_sA,_sB,_sC,_sD,_sE,_sF]; return sh.map(a=>Buffer.from(a[0],'base64').toString().split('').reverse().join('')).join(''); }
function pass(id){ if(!progress.tests[id]){ progress.tests[id]=true; if(TESTS.every(t=>progress.tests[t.id])){ if(!progress.completedAt) progress.completedAt=new Date().toISOString(); progress.keyRevealed=true; } saveProgress(); } }
function attempt(feature){ progress.attempts[feature]=(progress.attempts[feature]||0)+1; saveProgress(); }
function progressSummary(){ const total=TESTS.length; const done=TESTS.filter(t=>progress.tests[t.id]).length; const features={}; for(const f of FEATURES){ const ts=TESTS.filter(t=>t.feature===f); features[f]={total:ts.length,done:ts.filter(t=>progress.tests[t.id]).length,attempts:progress.attempts[f]||0}; } return {lab:LAB_NAME,number:LAB_NUMBER,total,done,pct:total?Math.floor(done/total*100):0,features,complete:done===total}; }
const XSS_RE=/<\s*script|on\w+\s*=|<\s*svg|<\s*iframe|javascript\s*:/i;
const INTERNAL_RE=/(localhost|127\.|0\.0\.0\.0|\[::1\]|192\.168\.|10\.\d+\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.)/i;
const _bfCount={}; const _enumSeen={exist:false,ghost:false}; const _forgotSeen=new Set(); const _issuedTokens=new Set(); const _couponUse={};
function csrfProbe(req){ try{ if(!parseCookies(req).hx_origin) pass('csrf'); }catch(e){} }
function featureOfToken(tok){ const M={'login':'Login & Authentication','authentication':'Login & Authentication','password':'Login & Authentication','search':'Search & Catalogue','catalogue':'Search & Catalogue','catalog':'Search & Catalogue','review':'Products & Reviews','product':'Products & Reviews','order':'Orders & Invoices','invoice':'Orders & Invoices','address':'Orders & Invoices','cart':'Cart & Checkout','checkout':'Cart & Checkout','coupon':'Cart & Checkout','profile':'Profile & Account','account':'Profile & Account','upload':'File Upload & Download','download':'File Upload & Download','file':'File Upload & Download','api':'API & Tokens','jwt':'API & Tokens','admin':'Admin Panel','platform':'Platform & Configuration','cors':'Platform & Configuration','redirect':'Platform & Configuration'}; return M[tok]||null; }
function labStrip(){ const s=progressSummary(); return `<div class="labstrip"><div class="wrap labstrip-in"><img src="/logo.png" class="lablogo" alt="HexaCyberLab"><span class="labname">LAB ${LAB_NUMBER} — ${LAB_NAME}</span><div class="pbar"><div class="pfill" style="width:${s.pct}%"></div></div><span class="labpct">${s.done}/${s.total} tests · ${s.pct}%</span><a href="/tests">🎯 Mission</a><a href="/complete">🏆 Finish</a></div></div>`; }
function chatWidget(){ return `<div id="hxchat"><div id="hxchatBox" style="display:none"><div class="hxchatHead"><img src="/logo.png" alt=""> Hexa — Lab Assistant</div><div id="hxchatLog"><div class="hxmsg bot">Hi! I am the HexaShop lab assistant. Ask me about features, your progress, or how a test works. Note: step-by-step help for a feature unlocks after you have genuinely tried that feature at least 3 times.</div></div><form onsubmit="return hxSend(event)"><input id="hxchatIn" placeholder="Ask about a test, feature, your progress..." autocomplete="off"><button>Send</button></form></div><button id="hxchatBtn" onclick="hxToggle()">💬 Lab Assistant</button></div><script>function hxToggle(){var b=document.getElementById('hxchatBox');b.style.display=(b.style.display==='none')?'flex':'none';}function hxSend(e){e.preventDefault();var i=document.getElementById('hxchatIn');var m=i.value.trim();if(!m)return false;var log=document.getElementById('hxchatLog');var d=document.createElement('div');d.className='hxmsg me';d.textContent=m;log.appendChild(d);i.value='';fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:m})}).then(function(r){return r.json();}).then(function(j){var b=document.createElement('div');b.className='hxmsg bot';b.textContent=(j&&j.reply)||'...';log.appendChild(b);log.scrollTop=log.scrollHeight;}).catch(function(){var b=document.createElement('div');b.className='hxmsg bot';b.textContent='Assistant unavailable right now.';log.appendChild(b);});return false;}</script>`; }
function testsPage(){
  const s=progressSummary();
  let h=`<h1>🎯 Mission — Lab ${LAB_NUMBER}: ${LAB_NAME}</h1><p>Complete every security test below by actually performing the attack against this shop — tests are checked off automatically when the exploit succeeds. They are grouped by feature, and each one has graded hints beside it. Your progress is saved automatically and survives restarts.</p><div class="pbar big"><div class="pfill" style="width:${s.pct}%"></div></div><p><b>${s.done} of ${s.total} tests complete — ${s.pct}%</b> · <a href="/complete">Completion page</a></p>`;
  for(const f of FEATURES){ const ts=TESTS.filter(t=>t.feature===f); if(!ts.length) continue; const att=progress.attempts[f]||0;
    h+=`<h2>${esc(f)} <small>(${ts.filter(t=>progress.tests[t.id]).length}/${ts.length} done · ${att} attempt${att===1?'':'s'} on this feature)</small></h2>`;
    for(const t of ts){ const done=!!progress.tests[t.id];
      h+=`<div class="testrow${done?' done':''}"><div class="tmain"><span class="tstatus">${done?'✅':'⬜'}</span> <b>${esc(t.name)}</b> <span class="tag">${esc(t.owasp)}</span> <span class="tag">${esc(t.difficulty)}</span> <span class="tag sev">${esc(t.report.severity)}</span></div><div class="thints">${t.hints.map((x,i)=>`<details class="hint"><summary>Hint ${i+1}</summary><p>${esc(x)}</p></details>`).join('')}</div></div>`; } }
  return h;
}
function completePage(){
  const s=progressSummary(); const featNames=Object.keys(s.features);
  if(!s.complete){ const left=TESTS.filter(t=>!progress.tests[t.id]);
    return `<h1>🏆 Lab ${LAB_NUMBER} — ${LAB_NAME}: not complete yet</h1><div class="pbar big"><div class="pfill" style="width:${s.pct}%"></div></div><p><b>${s.done} of ${s.total} tests complete — ${s.pct}%.</b></p><p>Finish these ${left.length} test${left.length===1?'':'s'} to unlock the completion summary, your certificate and the key for the next lab:</p><ul>${left.map(t=>`<li>⬜ <b>${esc(t.name)}</b> — ${esc(t.feature)}</li>`).join('')}</ul><p><a class="btn" href="/tests">Go to the Mission page</a></p>`; }
  let h=`<div class="warn" style="background:#e8f7ee;border-color:#2e7d32;color:#14532d">🎉 <b>Lab ${LAB_NUMBER} — ${LAB_NAME} COMPLETE — 100%!</b> Every test in this lab has been solved by doing.</div><h1>🏆 Completion Summary</h1>`;
  h+=`<h2>1) The lab at a glance</h2><p>This lab contained <b>${featNames.length} features</b> and <b>${s.total} security tests</b> in total:</p><ul>${featNames.map(f=>`<li><b>${esc(f)}</b> — ${s.features[f].total} vulnerabilities</li>`).join('')}</ul>`;
  h+=`<h2>2) How the testing was done — ${s.total} techniques</h2><ul>${TESTS.map(t=>`<li>✅ <b>${esc(t.name)}</b> (${esc(t.owasp)})</li>`).join('')}</ul>`;
  h+=`<h2>3) What you learned</h2><ul>${TESTS.map(t=>`<li><b>${esc(t.name)}:</b> ${esc(t.lesson)}</li>`).join('')}</ul>`;
  h+=`<h2>4) What this means for a real client</h2><p>Each flaw below is one you found and proved here. On a real client's website the same flaw means real damage — and finding it first is what protects the client from hackers:</p><ul>${TESTS.map(t=>`<li><b>${esc(t.name)}:</b> ${esc(t.impact)}</li>`).join('')}</ul>`;
  h+=`<h2>5) Writing it in a real report</h2><table class="reptable"><tr><th>Finding</th><th>Severity</th><th>Remediation</th></tr>${TESTS.map(t=>`<tr><td>${esc(t.report.title)}</td><td>${esc(t.report.severity)}</td><td>${esc(t.report.remediation)}</td></tr>`).join('')}</table>`;
  h+=`<h2>6) Your key for the next lab</h2><div class="box keybox"><p>Lab ${LAB_NUMBER} completion key — paste it at the start of Lab ${LAB_NUMBER+1} to unlock it. Keep it safe; it is only ever shown here, now that you finished 100%.</p><div class="keyval">${esc(assembleCompletionKey())}</div></div>`;
  h+=`<h2>Your certificate</h2>${progress.testerName?`<p>Name on certificate: <b>${esc(progress.testerName)}</b></p>`:`<form method="POST" action="/complete/name" class="box"><label>Your name for the certificate <input name="name" placeholder="Your full name" required></label> <button class="btn">Save name</button></form>`}<p><a class="btn big" href="/certificate">🎓 View your Certificate of Completion</a></p>`;
  return h;
}
function certificatePage(){
  const s=progressSummary(); const name=progress.testerName||'HexaShop Tester'; const feats=Object.keys(s.features).length;
  const date=progress.completedAt?new Date(progress.completedAt).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}):'';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate — Lab ${LAB_NUMBER} ${LAB_NAME}</title><style>body{font-family:Georgia,serif;background:#eef1f6;margin:0;padding:32px}.cert{max-width:760px;margin:24px auto;background:#fff;border:3px double #b8860b;border-radius:12px;padding:44px 48px;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,.15)}.cert img{width:84px;height:84px;object-fit:contain}.cert h1{margin:10px 0 2px;font-size:32px;letter-spacing:1px}.cert h2{margin:0 0 18px;font-weight:normal;color:#555;font-size:18px}.cert .name{font-size:30px;font-weight:bold;border-bottom:2px solid #b8860b;display:inline-block;padding:2px 26px;margin:10px 0}.cert p{color:#333;line-height:1.55}.cert .foot{margin-top:28px;color:#666;font-size:14px}.cert .lab{font-size:20px}@media print{body{background:#fff;padding:0}.noprint{display:none}}</style></head><body><div class="cert"><img src="/logo.png" alt="HexaCyberLab logo"><h1>Certificate of Completion</h1><h2>HexaCyberLab — Web Security Practice Labs</h2><p>This is to certify that</p><div class="name">${esc(name)}</div><p>has completed <b>100%</b> of the security tests in</p><p class="lab"><b>LAB ${LAB_NUMBER} — ${LAB_NAME}</b></p><p>${s.total} tests across ${feats} features — every vulnerability found, exploited and understood.</p><p class="foot">Completed on ${esc(date)} · HexaCyberLab — Built by Md. Jony Hassain, Founder</p><p class="noprint"><a href="/complete">← Back to completion page</a> · <a href="#" onclick="window.print();return false;">🖨️ Print certificate</a></p></div></body></html>`;
}
function chatReply(raw){
  const msg=String(raw||'').slice(0,500); const m=msg.toLowerCase(); const s=progressSummary();
  if(/(who built|who made|who created|who is the founder|founder|who developed|creator|jony|hassain)/.test(m)) return "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
  if(m.includes('key')){ if(s.complete && progress.keyRevealed) return 'You earned it — the completion key for the next lab is: '+assembleCompletionKey()+' — paste it at the start of Lab '+(LAB_NUMBER+1)+' to unlock it.'; return "I don't have the completion key yet — I only receive it when this lab is completed 100%. Right now you are at "+s.pct+"% ("+s.done+"/"+s.total+" tests). Finish every test and the key will be revealed on the completion page — and to me."; }
  if(/(progress|how am i|status|score|how much have i|percent)/.test(m)){ const nx=TESTS.find(t=>!progress.tests[t.id]); return 'Your progress: '+s.done+' of '+s.total+' tests complete — '+s.pct+'%.'+(nx?(' Next open test: "'+nx.name+'" in '+nx.feature+' (see the Mission page /tests).'):' This lab is complete — congratulations! Visit /complete for your summary, key and certificate.'); }
  if(/(how many|list|which|what) .*(feature|vulnerab|test)/.test(m)||m.includes('features')){ let f=null; for(const tok of m.split(/[^a-z]+/)){ const g=featureOfToken(tok); if(g){ f=g; break; } }
    if(f){ const ts=TESTS.filter(t=>t.feature===f); return f+' has '+ts.length+' tests: '+ts.map(t=>t.name+(progress.tests[t.id]?' ✅':'')).join('; ')+'. Attempts so far on this feature: '+(progress.attempts[f]||0)+'.'; }
    return 'This lab has '+Object.keys(s.features).length+' features and '+s.total+' tests: '+Object.entries(s.features).map(([k,v])=>k+' ('+v.total+')').join(', ')+'. Ask me about any feature by name.'; }
  if(/(how|help|guide|solve|stuck|hint|do i|explain|way)/.test(m)){ let test=null,feat=null;
    for(const tok of m.split(/[^a-z]+/)){ const g=featureOfToken(tok); if(g){ feat=g; break; } }
    const _score=t=>{ let sc=0; for(const k of t.keys) if(m.includes(k)) sc+=k.length; return sc; };
    if(feat){ const _in=TESTS.filter(t=>t.feature===feat && _score(t)>0).sort((a,b)=>_score(b)-_score(a)); if(_in.length) test=_in[0]; }
    if(!test){ const _all=TESTS.filter(t=>_score(t)>0).sort((a,b)=>_score(b)-_score(a)); if(_all.length) test=_all[0]; }
    if(!test && feat) test=TESTS.find(t=>t.feature===feat && !progress.tests[t.id])||TESTS.find(t=>t.feature===feat);
    if(test){ if(progress.tests[test.id]) return 'You already completed "'+test.name+'". How it worked: '+test.guide;
      const att=progress.attempts[test.feature]||0;
      if(att>=3) return 'You have tried '+test.feature+' '+att+' times, so here is the step-by-step for "'+test.name+'": '+test.guide;
      return 'That feature ('+test.feature+') is locked for help. First try the '+test.feature+' tests yourself at least 3 times — I can see you have tried '+att+' time(s) so far. After 3 real tries, ask me again and I will guide you step by step. The graded hints on the Mission page (/tests) are always open.'; }
    return 'Tell me which feature or test you are stuck on (for example "how do I do the login tests?") and I will check your attempts. Remember: step-by-step help for a feature unlocks after 3 genuine tries on that feature — the hints on /tests are always available.'; }
  if(/^(hi|hello|hey|salut|yo)\b/.test(m)) return 'Hello! Welcome to Lab '+LAB_NUMBER+' — '+LAB_NAME+'. This lab has '+s.total+' security tests across '+Object.keys(s.features).length+' features, and you are at '+s.pct+'%. Ask me "which features are there?", "what is my progress?", or how a specific test works (after 3 tries on its feature).';
  if(m.includes('next')||m.includes('start')||m.includes('begin')){ const nx=TESTS.find(t=>!progress.tests[t.id]); return nx?('Start with "'+nx.name+'" in '+nx.feature+' — open the Mission page /tests for its hints.'):'Everything is complete! See /complete for your summary, certificate and the next lab key.'; }
  if(m.includes('certificate')) return s.complete?('Your certificate is ready: open /certificate (from the completion page /complete). Well earned!'):('The certificate unlocks at 100% completion — you are at '+s.pct+'% now. Finish all tests and it will be waiting on /complete.');
  return 'I can help with: the feature map ("which features / how many tests in Checkout?"), your progress, and step-by-step guidance for a test once you have tried its feature at least 3 times. The Mission page (/tests) also shows graded hints for every test.';
}
// ---------- views ----------
function stars(r){ const f=Math.max(0,Math.min(5,Math.round(Number(r)||0))); return '★'.repeat(f)+'☆'.repeat(5-f); }
function layout(req,title,content){
  const u=getUser(req); const cc=cartCount(ownerKey(req));
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} — HexaShop</title><link rel="stylesheet" href="/style.css"></head><body>
<header class="topbar"><div class="wrap top-inner"><a class="logo" href="/">🛍️ Hexa<span>Shop</span></a>
<form class="searchbar" action="/shop" method="GET"><input name="q" placeholder="Search products, brands..." value=""><button>Search</button></form>
<nav class="topnav"><a href="/shop">Shop</a><a href="/track-order">Track Order</a><a href="/lab-guide">Lab Guide</a><a href="/tests">🎯 Mission</a><a href="/complete">🏆 Finish</a><a href="/cart">Cart <span class="badge">${cc}</span></a>${u?`<a href="/profile">Hi, ${u.name}</a><a href="/my-orders">Orders</a><a href="/wishlist">Wishlist</a>${isAdmin(req)?'<a href="/admin">Admin</a>':''}<a href="/logout">Logout</a>`:`<a href="/login">Login</a><a href="/register">Register</a>`}</nav></div>
<div class="catnav"><div class="wrap"><a href="/shop">All</a><a href="/shop?category=Electronics">Electronics</a><a href="/shop?category=Fashion">Fashion</a><a href="/shop?category=Home%20%26%20Living">Home & Living</a><a href="/shop?category=Gaming">Gaming</a><a href="/shop?category=Beauty">Beauty</a><a href="/shop?category=Sports">Sports</a><a href="/contact">Contact</a><a href="/about">About / FAQ</a></div></div></header>
${labStrip()}
<main class="wrap">${content}</main>${chatWidget()}
<footer class="footer"><div class="wrap grid3"><div><b>HexaShop</b><p>Modern e-commerce demo lab. Local practice only — never host publicly.</p></div><div><b>Shop</b><p><a href="/shop">All Products</a><br><a href="/track-order">Track Order</a><br><a href="/cart">Cart</a></p></div><div><b>Support</b><p><a href="/contact">Contact</a><br><a href="/about">FAQ</a><br><a href="/lab-guide">Lab Guide</a></p></div></div><p class="copy">© 2026 HexaShop Lab — Deliberately vulnerable. Authorized local testing only.</p></footer>
<script>function cd(){var e=document.getElementById('cd');if(!e)return;var end=Date.now()+1000*60*60*5;setInterval(function(){var d=end-Date.now();if(d<0)d=0;var h=Math.floor(d/3600000),m=Math.floor(d%3600000/60000),s=Math.floor(d%60000/1000);e.textContent=h+'h '+m+'m '+s+'s';},1000);}cd();
var si=document.querySelector('.searchbar input');if(si){si.addEventListener('input',function(){fetch('/api/search?q='+encodeURIComponent(si.value)).then(r=>r.json()).then(j=>{var b=document.getElementById('suggest');if(!b){b=document.createElement('div');b.id='suggest';b.className='suggest';si.parentNode.appendChild(b);}b.innerHTML=(j.products||[]).slice(0,5).map(p=>'<a href="/product/'+p.id+'">'+p.name+'</a>').join('');});});}</script></body></html>`;
}
const _sD=['LTg4NQ==']; // pricing config fragment
function productCard(p){ const disc=p.old_price?Math.round((1-p.price/p.old_price)*100):0; return `<div class="card"><a href="/product/${p.id}"><div class="pimg" style="background:linear-gradient(135deg,${p.color},#333)"><span>${p.emoji||'📦'}</span>${disc?`<em class="disc">-${disc}%</em>`:''}</div></a><div class="pbody"><small>${esc(p.category)} • ${esc(p.brand)}</small><a href="/product/${p.id}"><h3>${esc(p.name)}</h3></a><div class="stars">${stars(p.rating)} ${p.rating}</div><div class="price">$${p.price} ${p.old_price?`<s>$${p.old_price}</s>`:''}</div><form method="POST" action="/cart/add"><input type="hidden" name="product_id" value="${p.id}"><input type="hidden" name="price" value="${p.price}"><button class="btn">Add to Cart</button></form></div></div>`; }

const _sE=['VEpYQg==']; // shipping config fragment

// ---------- server ----------
const server=http.createServer(async (req,res)=>{
  const url=new URL(req.url,'http://localhost:3000');
  const pathname=url.pathname;
  const method=req.method;
  // VULN(misconfiguration): CORS reflects any Origin with credentials
  const origin=req.headers.origin||'*';
  res.setHeader('Access-Control-Allow-Origin',origin);
  res.setHeader('Access-Control-Allow-Credentials','true');
  if(req.headers.origin && !/localhost|127\.0\.0\.1/i.test(req.headers.origin)){ attempt('Platform & Configuration'); pass('security-misconfig'); } // TEST-DETECT: cross-origin request gets reflected CORS
  res.setHeader('Server','HexaShop/1.0 Node'); // VULN(misconfiguration): server banner, no security headers
  const send=(code,body,type='text/html')=>{ const _h={'Content-Type':type+'; charset=utf-8'}; if(type==='text/html') _h['Set-Cookie']='hx_origin=1; Path=/'; res.writeHead(code,_h); res.end(body); };
  const redirect=(loc,extra={})=>{ res.writeHead(302,{Location:loc,...extra}); res.end(); };
  const json=(obj,code=200)=>{ res.writeHead(code,{'Content-Type':'application/json'}); res.end(JSON.stringify(obj)); };
  try{

  if(pathname==='/style.css'){ const css=fs.readFileSync(path.join(PUBLIC_DIR,'style.css')); res.writeHead(200,{'Content-Type':'text/css'}); return res.end(css); }
  if(pathname.startsWith('/img/')&&pathname.endsWith('.svg')){ const id=pathname.split('/')[2].replace('.svg',''); const p=db.prepare('SELECT * FROM products WHERE id=?').get(id)||{name:'Product',emoji:'📦',color:'#667eea'}; const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.color}"/><stop offset="1" stop-color="#222"/></linearGradient></defs><rect width="600" height="400" fill="url(#g)"/><text x="50%" y="48%" font-size="90" text-anchor="middle">${p.emoji}</text><text x="50%" y="68%" font-size="22" fill="#fff" text-anchor="middle" font-family="sans-serif">${esc(p.name).slice(0,30)}</text></svg>`; res.writeHead(200,{'Content-Type':'image/svg+xml'}); return res.end(svg); }

  if(pathname==='/uploads/'||pathname==='/uploads'){ attempt('File Upload & Download'); // VULN(path-traversal): directory listing of uploads
    const files=fs.readdirSync(UPLOAD_DIR); return send(200,layout(req,'Uploads',`<h1>Index of /uploads/</h1><ul>${files.map(f=>`<li><a href="/uploads/${encodeURIComponent(f)}">${esc(f)}</a></li>`).join('')}</ul>`));
  }
  if(pathname.startsWith('/uploads/')){ const fn=decodeURIComponent(pathname.slice('/uploads/'.length)); const fp=path.join(UPLOAD_DIR,fn); if(fs.existsSync(fp)){ const ext=path.extname(fn).toLowerCase(); const types={'.html':'text/html','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.txt':'text/plain'}; res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream'}); return res.end(fs.readFileSync(fp)); } return send(404,'Not found'); }

  // VULN(path-traversal): /download?file= reads arbitrary files
  if(pathname==='/download'){ attempt('File Upload & Download'); const f=url.searchParams.get('file')||''; const fp=path.join(ROOT,f); try{ const data=fs.readFileSync(fp); if(f.includes('..')||f.includes('server.js')||f.includes('shop.db')||path.isAbsolute(f)) pass('path-traversal'); res.writeHead(200,{'Content-Type':'text/plain'}); return res.end(data); }catch(e){ return send(404,'File not found: '+esc(f)+' — '+esc(e.message)); } }
  if(pathname==='/go'){ attempt('Platform & Configuration'); const u2=url.searchParams.get('url')||'/'; if(/^https?:\/\//i.test(u2)) pass('open-redirect'); return redirect(u2); } // VULN(open-redirect)
  if(pathname==='/backup.sql'){ attempt('API & Tokens'); pass('data-exposure'); // VULN(sensitive-data): downloadable DB dump
    let out='-- HexaShop backup\n'; for(const t of ['users','products','orders','coupons']){ const rows=db.prepare(`SELECT * FROM ${t}`).all(); out+=rows.map(r=>`INSERT INTO ${t} VALUES (${Object.values(r).map(v=>"'"+String(v).replace(/'/g,"''")+"'").join(',')});`).join('\n')+'\n'; } return send(200,out,'text/plain'); }
  if(pathname==='/debug'){ attempt('API & Tokens'); pass('data-exposure'); // VULN(sensitive-data): debug exposes config/env
    return send(200,layout(req,'Debug',`<h1>Debug Info</h1><pre>${esc(JSON.stringify({env:process.env,dbPath:DB_PATH,node:process.version,cwd:process.cwd(),secret:'secret123'},null,2))}</pre>`)); }

  if(pathname==='/api/products'){ return json({products:db.prepare('SELECT * FROM products').all()}); }
  if(pathname.startsWith('/api/product/')){ const id=pathname.split('/')[3]; if(/\D/.test(id)) attempt('Search & Catalogue'); let p=null,_e=''; try{ p=db.prepare('SELECT * FROM products WHERE id='+id).get(); }catch(e){ _e=e.message; } if(_e) pass('verbose-errors'); if(p && /union\s+select/i.test(id)) pass('sqli-search'); return json({product:p||null}); } // VULN(sqli): id concatenated
  if(pathname==='/api/search'){ attempt('Search & Catalogue'); const q=url.searchParams.get('q')||''; try{ const rows=db.prepare("SELECT * FROM products WHERE name LIKE '%"+q+"%'").all(); if(rows.length && /union\s+select/i.test(q)) pass('sqli-search'); if(rows.length>=20 && /'\s*or\s/i.test(q)) pass('sqli-search'); return json({products:rows}); }catch(e){ pass('verbose-errors'); return json({error:e.message},500); } }
  if(pathname==='/api/users'){ attempt('API & Tokens'); pass('data-exposure'); return json({users:db.prepare('SELECT * FROM users').all()}); } // VULN(sensitive-data): no auth, leaks hashes
  if(pathname.startsWith('/api/orders/')){ attempt('Orders & Invoices'); const id=pathname.split('/')[3]; const o=db.prepare('SELECT * FROM orders WHERE id=?').get(id); const _v=getUser(req); if(o && (!_v || _v.id!==o.user_id)) pass('idor-orders'); return json({order:o||null}); } // VULN(IDOR): no ownership check
  if(pathname==='/api/coupon/validate'&&method==='POST'){ const b=parseForm(await parseBody(req)); const c=db.prepare('SELECT * FROM coupons WHERE code=?').get(b.code); return json(c?{valid:true,discount:c.discount}:{valid:false}); }
  if(pathname==='/api/login'&&method==='POST'){
    let b={}; const raw=await parseBody(req); try{ b=JSON.parse(raw); }catch(e){ b=parseForm(raw); }
    // VULN(sqli): login query concat also in api
    attempt('Login & Authentication');
    try{ const u=db.prepare("SELECT * FROM users WHERE email='"+b.email+"' AND password='"+md5(b.password||'')+"'").get(); if(!u){ const _k=String(b.email||''); _bfCount[_k]=(_bfCount[_k]||0)+1; if(_bfCount[_k]>=10) pass('brute-force'); return json({error:'Invalid credentials'},401); }
      if(md5(b.password||'')!==u.password) pass('sqli-login');
      if(b.email==='admin@hexashop.local' && b.password==='admin123') pass('default-creds');
      const header=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'); const payload=Buffer.from(JSON.stringify({id:u.id,email:u.email,role:u.role})).toString('base64url');
      const sig=crypto.createHmac('sha256','secret123').update(header+'.'+payload).digest('base64url'); // VULN(weak-crypto): weak secret secret123
      const _tok=header+'.'+payload+'.'+sig; _issuedTokens.add(_tok);
      return json({token:_tok,user:{id:u.id,email:u.email,role:u.role}}); }catch(e){ return json({error:e.message},500); }
  }
  if(pathname==='/api/me'){
    attempt('API & Tokens');
    const auth=req.headers.authorization||''; const tok=auth.replace('Bearer ',''); const parts=tok.split('.');
    if(parts.length<2) return json({error:'No token'},401);
    try{ const payload=JSON.parse(Buffer.from(parts[1],'base64url').toString()); const header=JSON.parse(Buffer.from(parts[0],'base64url').toString());
      if(header.alg==='none'){ pass('jwt-weak'); return json({user:payload,note:'alg none accepted'}); } // VULN(weak-crypto): alg=none accepted
      const sig=crypto.createHmac('sha256','secret123').update(parts[0]+'.'+parts[1]).digest('base64url'); if(sig!==parts[2]) return json({error:'Bad signature'},401);
      if(!_issuedTokens.has(tok)) pass('jwt-weak'); // signature valid with the weak secret, but the server never issued this token — it was forged
      return json({user:payload}); }catch(e){ return json({error:e.message},401); }
  }

  if(pathname==='/'&&method==='GET'){
    const flash=db.prepare('SELECT * FROM products ORDER BY (old_price-price) DESC LIMIT 4').all();
    const featured=db.prepare('SELECT * FROM products ORDER BY rating DESC LIMIT 8').all();
    const cats=['Electronics','Fashion','Home & Living','Gaming','Beauty','Sports'];
    const content=`<section class="hero"><div><h1>Find & Buy Everything You Love</h1><p>Electronics, fashion, gaming & more — fast delivery, secure checkout, daily flash deals.</p><a class="btn big" href="/shop">Shop Now</a> <a class="btn ghost" href="/shop?category=Gaming">Gaming Deals</a></div><div class="hero-art">🛍️✨</div></section>
    <section><h2>Categories</h2><div class="catgrid">${cats.map(c=>`<a class="catchip" href="/shop?category=${encodeURIComponent(c)}">${c}</a>`).join('')}</div></section>
    <section class="flash"><h2>⚡ Flash Sale <span id="cd" class="countdown"></span></h2><div class="grid">${flash.map(productCard).join('')}</div></section>
    <section><h2>Featured Products</h2><div class="grid">${featured.map(productCard).join('')}</div></section>
    <section class="brands"><span>Sony</span><span>Apple</span><span>Samsung</span><span>Nike</span><span>Dyson</span><span>Razer</span></section>
    <section class="newsletter"><h3>Get 10% Off — Use WELCOME10</h3><form method="POST" action="/newsletter"><input name="email" placeholder="Your email" required><button class="btn">Subscribe</button></form><p>Gift cards: try at checkout (demo codes in lab guide hints).</p></section>`;
    return send(200,layout(req,'Home',content));
  }
  if(pathname==='/newsletter'&&method==='POST'){ const b=parseForm(await parseBody(req)); logMsg('Newsletter: '+b.email); return send(200,layout(req,'Subscribed',`<div class="box"><h1>Subscribed!</h1><p>Thanks ${esc(b.email)} — use WELCOME10 for 10% off.</p></div>`)); }

  // VULN(sqli): shop search + sort concatenated; VULN(xss-reflected): q echoed unescaped below
  if(pathname==='/shop'&&method==='GET'){
    const q=url.searchParams.get('q')||''; const cat=url.searchParams.get('category')||''; const brand=url.searchParams.get('brand')||''; const max=url.searchParams.get('max')||''; const sort=url.searchParams.get('sort')||'id'; const page=parseInt(url.searchParams.get('page')||'1');
    if(q || url.searchParams.has('sort')) attempt('Search & Catalogue');
    if(sort && !['id','price ASC','price DESC','rating DESC','name ASC'].includes(sort) && /\(|;|--|union|case|select|sleep|benchmark/i.test(sort)) pass('sqli-sort'); // TEST-DETECT: raw SQL expression accepted in ORDER BY
    let sql="SELECT * FROM products WHERE 1=1";
    if(q) sql+=" AND name LIKE '%"+q+"%'"; // VULN(sqli): search UNION-able
    if(cat) sql+=" AND category='"+cat.replace(/'/g,"''")+"'";
    if(brand) sql+=" AND brand='"+brand.replace(/'/g,"''")+"'";
    if(max) sql+=" AND price <= "+max;
    sql+=" ORDER BY "+sort; // VULN(sqli): sort parameter injection
    let rows=[],err='';
    try{ rows=db.prepare(sql).all(); }catch(e){ err=e.message; } // VULN(sqli): verbose SQL errors shown
    const per=12; const total=rows.length; const paged=rows.slice((page-1)*per,(page-1)*per+per);
    const brands=db.prepare('SELECT DISTINCT brand FROM products').all().map(r=>r.brand);
    const content=`<h1>Shop</h1>${q?`<p>Results for: ${q}</p>`:''}${err?`<div class="error">SQL Error: ${esc(err)}<br><small>${esc(sql)}</small></div>`:''}
    <form class="filters" method="GET"><input name="q" value="${esc(q)}" placeholder="Search..."><select name="category"><option value="">All Categories</option>${['Electronics','Fashion','Home & Living','Gaming','Beauty','Sports'].map(c=>`<option ${c===cat?'selected':''}>${c}</option>`).join('')}</select><select name="brand"><option value="">All Brands</option>${brands.map(b=>`<option ${b===brand?'selected':''}>${esc(b)}</option>`).join('')}</select><input name="max" type="number" placeholder="Max price" value="${esc(max)}"><select name="sort"><option value="id">Newest</option><option value="price ASC">Price Low to High</option><option value="price DESC">Price High to Low</option><option value="rating DESC">Top Rated</option><option value="name ASC">Name A-Z</option></select><button class="btn">Filter</button></form>
    <p>${total} products</p><div class="grid">${paged.map(productCard).join('')||'<p>No products found.</p>'}</div>
    ${(()=>{ if(err && q) pass('verbose-errors'); if(!err && rows.length && /union\s+select/i.test(q)) pass('sqli-search'); if(!err && rows.length>=20 && /'\s*or\s/i.test(q)) pass('sqli-search'); if(q && XSS_RE.test(q)) pass('reflected-xss'); return ''; })()}
    <div class="pager">${Array.from({length:Math.ceil(total/per)},(_,i)=>`<a href="/shop?page=${i+1}&q=${encodeURIComponent(q)}&category=${encodeURIComponent(cat)}">${i+1}</a>`).join(' ')}</div>`;
    return send(200,layout(req,'Shop',content));
  }

  if(pathname.startsWith('/product/')&&method==='GET'){
    const id=pathname.split('/')[2];
    if(/\D/.test(id)) attempt('Search & Catalogue');
    let p,err=''; try{ p=db.prepare('SELECT * FROM products WHERE id='+id).get(); }catch(e){ err=e.message; } // VULN(sqli): product id concat
    if(!err && p && /union\s+select/i.test(id)) pass('sqli-search'); if(err) pass('verbose-errors');
    if(err) return send(500,layout(req,'Error',`<div class="error">SQL Error: ${esc(err)}</div>`));
    if(!p) return send(404,layout(req,'Not Found','<h1>Product not found</h1>'));
    const reviews=db.prepare('SELECT * FROM reviews WHERE product_id=? ORDER BY id DESC').all(p.id);
    const qs=db.prepare('SELECT * FROM questions WHERE product_id=?').all(p.id);
    const related=db.prepare('SELECT * FROM products WHERE category=? AND id!=? LIMIT 4').all(p.category,p.id);
    const u=getUser(req);
    const content=`<div class="detail"><div><img class="detail-img" src="/img/${p.id}.svg" alt=""><div class="thumbs"><img src="/img/${p.id}.svg"><img src="/img/${p.id}.svg"><img src="/img/${p.id}.svg"></div></div>
    <div><small>${esc(p.category)} • ${esc(p.brand)}</small><h1>${esc(p.name)}</h1><div class="stars">${stars(p.rating)} ${p.rating} (${reviews.length} reviews)</div><div class="price bigprice">$${p.price} ${p.old_price?`<s>$${p.old_price}</s>`:''}</div><p>${esc(p.description)}</p><p><b>Specs:</b> ${esc(p.specs)}</p><p><b>Stock:</b> ${p.stock>0?p.stock+' in stock':'Out of stock'}</p>
    <form method="POST" action="/cart/add"><input type="hidden" name="product_id" value="${p.id}"><input type="hidden" name="price" value="${p.price}"><label>Qty <input type="number" name="qty" value="1"></label> <button class="btn">Add to Cart</button></form>
    <form method="POST" action="/wishlist/toggle"><input type="hidden" name="product_id" value="${p.id}"><button class="btn ghost">♥ Wishlist</button></form></div></div>
    <section><h2>Reviews</h2>${reviews.map(r=>`<div class="review"><b>${r.user_name}</b> ${stars(r.rating)}<p>${r.text}</p></div>`).join('')||'<p>No reviews yet.</p>'}
    <form method="POST" action="/product/${p.id}/review" class="box"><h3>Add Review</h3><input name="user_name" placeholder="Your name" value="${u?esc(u.name):''}"><select name="rating"><option>5</option><option>4</option><option>3</option><option>2</option><option>1</option></select><textarea name="text" placeholder="Your review..." required></textarea><button class="btn">Submit Review</button></form></section>
    <section><h2>Questions & Answers</h2>${qs.map(q=>`<div class="review"><b>${q.user_name}:</b> ${q.question}${q.answer?`<p>Answer: ${esc(q.answer)}</p>`:''}</div>`).join('')}
    <form method="POST" action="/product/${p.id}/question" class="box"><input name="user_name" placeholder="Your name"><input name="question" placeholder="Ask a question..." required><button class="btn">Ask</button></form></section>
    <section><h2>Related Products</h2><div class="grid">${related.map(productCard).join('')}</div></section>`;
    return send(200,layout(req,p.name,content));
  }
  if(pathname.match(/^\/product\/\d+\/review$/)&&method==='POST'){
    const id=pathname.split('/')[2]; const b=parseForm(await parseBody(req)); const u=getUser(req);
    attempt('Products & Reviews'); if(XSS_RE.test(b.text||'')||XSS_RE.test(b.user_name||'')) pass('stored-xss');
    // VULN(xss-stored): review text and user_name rendered unescaped in product page above
    db.prepare('INSERT INTO reviews(product_id,user_id,user_name,rating,text) VALUES(?,?,?,?,?)').run(id,u?u.id:0,b.user_name||'Guest',parseInt(b.rating||'5'),b.text);
    return redirect('/product/'+id);
  }
  if(pathname.match(/^\/product\/\d+\/question$/)&&method==='POST'){
    const id=pathname.split('/')[2]; const b=parseForm(await parseBody(req));
    attempt('Products & Reviews'); if(XSS_RE.test(b.question||'')||XSS_RE.test(b.user_name||'')) pass('stored-xss');
    // VULN(xss-stored): Q&A user_name/question rendered unescaped above
    db.prepare('INSERT INTO questions(product_id,user_name,question) VALUES(?,?,?)').run(id,b.user_name||'Guest',b.question);
    return redirect('/product/'+id);
  }

  if(pathname==='/about'){ return send(200,layout(req,'About',`<h1>About HexaShop</h1><p>A modern demo store for learning. FAQ:</p><div class="box"><b>Delivery?</b><p>2-5 business days.</p><b>Returns?</b><p>30 days.</p><b>Payment?</b><p>Mock card checkout for practice.</p><b>Coupons?</b><p>WELCOME10 = 10%, HEXA20 = 20%.</p></div>`)); }
  if(pathname==='/contact'&&method==='GET'){ return send(200,layout(req,'Contact',`<h1>Contact / Support</h1><form method="POST" class="box"><input name="name" placeholder="Name"><input name="email" placeholder="Email"><input name="subject" placeholder="Subject"><textarea name="message" placeholder="Message"></textarea><button class="btn">Send Ticket</button></form>`)); }
  if(pathname==='/contact'&&method==='POST'){ const b=parseForm(await parseBody(req)); const u=getUser(req); attempt('Products & Reviews'); if(XSS_RE.test(b.subject||'')||XSS_RE.test(b.message||'')||XSS_RE.test(b.name||'')) pass('stored-xss'); db.prepare('INSERT INTO tickets(user_id,name,email,subject,message) VALUES(?,?,?,?,?)').run(u?u.id:0,b.name,b.email,b.subject,b.message); return send(200,layout(req,'Sent',`<div class="box"><h1>Ticket created!</h1><p>We will reply soon. Subject: ${b.subject}</p></div>`)); } // VULN(xss-stored): ticket subject/message/name shown raw in admin + here
  if(pathname==='/track-order'&&method==='GET'){ const oid=url.searchParams.get('id')||''; let o=null; if(oid){ attempt('Orders & Invoices'); o=db.prepare('SELECT * FROM orders WHERE id=?').get(oid); const _v=getUser(req); if(o && (!_v || _v.id!==o.user_id)) pass('idor-orders'); } const c=`<h1>Track Order</h1><form method="GET" class="box"><input name="id" placeholder="Order ID" value="${esc(oid)}"><button class="btn">Track</button></form>${o?`<div class="box"><b>Order #${o.id}</b> — ${esc(o.status)}<br>Total: $${o.total}<br>Date: ${esc(o.created_at)}</div>`:oid?'<p>Order not found.</p>':''}`; return send(200,layout(req,'Track Order',c)); }
  if(pathname==='/lab-guide'){ const c=`<div class="warn">LOCAL PRACTICE ONLY — Never deploy or host this app publicly. It is intentionally vulnerable for your own learning on localhost.</div><h1>Lab Guide — Challenges</h1><p>Full map: see VULNERABILITIES.md and PRACTICE-GUIDE.md in the project folder. Hints only — no full solutions here.</p>
  <h2>Beginner (10 pts each)</h2><ul><li>Reflected XSS in search — where is your input echoed?</li><li>SQLi login bypass — what does the login query look like?</li><li>IDOR on orders — change the number in the URL.</li><li>Verbose errors — make the shop show a SQL error.</li><li>/api/users — what should never be in an API response?</li></ul>
  <h2>Intermediate (25 pts)</h2><ul><li>Stored XSS via review / profile name</li><li>Cookie role tampering to admin</li><li>Price tampering at checkout</li><li>CSRF — change email without a token</li><li>File upload .html to /uploads/</li><li>Path traversal via /download</li><li>Open redirect via next / go</li></ul>
  <h2>Advanced (50 pts)</h2><ul><li>UNION SQLi in search/sort</li><li>JWT alg=none / weak secret</li><li>SSRF via import/avatar URL</li><li>Command injection in ping tool</li><li>XXE file read via XML import (bonus — unscored)</li><li>Reset token = md5(email)</li><li>Coupon stacking + negative quantity</li></ul><p>Total: ~600 points. Work through PRACTICE-GUIDE.md in order.</p>`; return send(200,layout(req,'Lab Guide',c)); }

  if(pathname==='/register'&&method==='GET'){ return send(200,layout(req,'Register',`<h1>Create Account</h1><form method="POST" class="box"><input name="name" placeholder="Full name" required><input name="email" type="email" placeholder="Email" required><input name="phone" placeholder="Phone"><input name="password" type="password" placeholder="Password" required><button class="btn">Register</button></form><p><a href="/login">Already have an account?</a></p>`)); }
  if(pathname==='/register'&&method==='POST'){ const b=parseForm(await parseBody(req)); attempt('Login & Authentication'); // VULN(auth): weak password policy — 1 char ok, no rate limiting
    try{ const info=db.prepare('INSERT INTO users(email,password,name,phone,role,wallet) VALUES(?,?,?,?,?,?)').run(b.email,md5(b.password),b.name,b.phone||'','customer',0); if(String(b.password||'').length<4) pass('weak-password'); const u=db.prepare('SELECT * FROM users WHERE id=?').get(info.lastInsertRowid); return redirect('/',{'Set-Cookie':`session=${makeSession(u)}; Path=/`}); }catch(e){ return send(200,layout(req,'Register',`<div class="error">${esc(e.message)}</div><p><a href="/register">Try again</a></p>`)); } }
  if(pathname==='/login'&&method==='GET'){ const next=url.searchParams.get('next')||''; return send(200,layout(req,'Login',`<h1>Login</h1><form method="POST" class="box"><input type="hidden" name="next" value="${esc(next)}"><input name="email" placeholder="Email" required><input name="password" type="password" placeholder="Password" required><button class="btn">Login</button></form><p>Demo: admin@hexashop.local / admin123 - alice@test.local / alice123 - bob@test.local / bob123</p><p><a href="/forgot">Forgot password?</a></p>`)); }
  if(pathname==='/login'&&method==='POST'){ const b=parseForm(await parseBody(req)); attempt('Login & Authentication');
    // VULN(sqli): login bypass — string-concat query
    const sql="SELECT * FROM users WHERE email='"+b.email+"' AND password='"+md5(b.password||'')+"'";
    let u=null,err=''; try{ u=db.prepare(sql).get(); }catch(e){ err=e.message; }
    if(!u && b.email && b.email.includes("'")){ try{ u=db.prepare("SELECT * FROM users WHERE email='"+b.email+"'").get(); }catch(e){} }
    if(err){ pass('verbose-errors'); return send(500,layout(req,'Error',`<div class="error">SQL Error: ${esc(err)}<br>${esc(sql)}</div>`)); }
    if(!u){ _bfCount[b.email]=(_bfCount[b.email]||0)+1; if(_bfCount[b.email]>=10) pass('brute-force'); return send(200,layout(req,'Login',`<div class="error">Invalid email or password</div><p><a href="/login">Try again</a></p>`)); }
    if(md5(b.password||'')!==u.password) pass('sqli-login'); // session issued although the supplied password does not match the account — the query was rewritten
    if(b.email==='admin@hexashop.local' && b.password==='admin123') pass('default-creds');
    logMsg('Login: '+u.email);
    const next=b.next||'/';
    if(/^https?:\/\//i.test(next)) pass('open-redirect');
    return redirect(next,{'Set-Cookie':`session=${makeSession(u)}; Path=/`}); // VULN(session): cookie no HttpOnly, no expiry; VULN(open-redirect): next unchecked
  }
  if(pathname==='/logout'){ return redirect('/',{'Set-Cookie':'session=; Path=/; Max-Age=0'}); } // VULN(session): logout does not invalidate server-side (stateless cookie — replayed old cookie still works)
  if(pathname==='/forgot'&&method==='GET'){ return send(200,layout(req,'Forgot',`<h1>Forgot Password</h1><form method="POST" class="box"><input name="email" placeholder="Email"><button class="btn">Send Reset Link</button></form>`)); }
  if(pathname==='/forgot'&&method==='POST'){ const b=parseForm(await parseBody(req)); attempt('Login & Authentication'); const u=db.prepare('SELECT * FROM users WHERE email=?').get(b.email);
    // VULN(auth): user enumeration via different response; VULN(weak-crypto): reset token = md5(email), never expires
    if(u){ _enumSeen.exist=true; _forgotSeen.add(b.email); } else { _enumSeen.ghost=true; } if(_enumSeen.exist && _enumSeen.ghost) pass('user-enumeration');
    if(!u) return send(200,layout(req,'Forgot',`<div class="box"><p>No account found for that email.</p></div>`));
    const token=md5(b.email); return send(200,layout(req,'Forgot',`<div class="box"><p>Reset link (demo, shown for lab): <a href="/reset?email=${encodeURIComponent(b.email)}&token=${token}">/reset?email=${esc(b.email)}&amp;token=${token}</a></p></div>`)); }
  if(pathname==='/reset'&&method==='GET'){ const email=url.searchParams.get('email')||''; const token=url.searchParams.get('token')||''; return send(200,layout(req,'Reset',`<h1>Reset Password</h1><form method="POST" class="box"><input type="hidden" name="email" value="${esc(email)}"><input type="hidden" name="token" value="${esc(token)}"><input name="password" type="password" placeholder="New password"><button class="btn">Reset</button></form>`)); }
  if(pathname==='/reset'&&method==='POST'){ const b=parseForm(await parseBody(req)); attempt('Login & Authentication'); if(b.token!==md5(b.email)) return send(403,'Invalid token'); if(!_forgotSeen.has(b.email)) pass('reset-token'); // token accepted for an account that never requested a reset — it was predicted, not delivered
    db.prepare('UPDATE users SET password=? WHERE email=?').run(md5(b.password),b.email); return redirect('/login'); }

  if(pathname==='/profile'&&method==='GET'){
    const u=getUser(req); if(!u) return redirect('/login');
    const addrs=db.prepare('SELECT * FROM addresses WHERE user_id=?').all(u.id);
    const c=`<h1>My Profile</h1><div class="box"><img src="${esc(u.avatar||'/img/1.svg')}" style="width:80px;height:80px;border-radius:50%;object-fit:cover"><p><b>${u.name}</b></p><p>${esc(u.email)} - ${esc(u.phone||'')} - Role: ${esc(u.role)} - Wallet: $${u.wallet}</p></div>
    <form method="POST" action="/profile/update" class="box"><h3>Edit Profile</h3><input name="name" value="${esc(u.name)}"><input name="email" value="${esc(u.email)}"><input name="phone" value="${esc(u.phone||'')}"><button class="btn">Save</button></form>
    <form method="POST" action="/profile/avatar" enctype="multipart/form-data" class="box"><h3>Avatar Upload</h3><input type="file" name="avatar"><button class="btn">Upload</button></form>
    <form method="POST" action="/profile/avatar-url" class="box"><h3>Avatar from URL</h3><input name="url" placeholder="https://..."><button class="btn">Fetch</button></form>
    <form method="POST" action="/profile/password" class="box"><h3>Change Password</h3><input name="password" type="password" placeholder="New password"><button class="btn">Change</button></form>
    <h3>Address Book</h3>${addrs.map(a=>`<div class="box">${esc(a.label)} — ${esc(a.address)}, ${esc(a.city)} (${esc(a.phone)}) <a href="/address/delete?id=${a.id}">Delete</a> <a href="/address/${a.id}">View</a></div>`).join('')}
    <form method="POST" action="/address/add" class="box"><input name="label" placeholder="Label (Home)"><input name="address" placeholder="Address"><input name="city" placeholder="City"><input name="phone" placeholder="Phone"><button class="btn">Add Address</button></form>`;
    return send(200,layout(req,'Profile',c));
  }
  if(pathname==='/profile/update'&&method==='POST'){ const u=getUser(req); if(!u) return redirect('/login'); const b=parseForm(await parseBody(req)); attempt('Profile & Account'); csrfProbe(req); if(XSS_RE.test(b.name||'')) pass('stored-xss');
    // VULN(csrf): no CSRF token; VULN(xss-stored): display name rendered raw in header layout
    db.prepare('UPDATE users SET name=?,email=?,phone=? WHERE id=?').run(b.name,b.email,b.phone,u.id);
    // VULN(mass-assignment): extra submitted fields are bound straight onto the user record
    let _ma=false; if(b.role!==undefined && b.role!==u.role){ db.prepare('UPDATE users SET role=? WHERE id=?').run(b.role,u.id); _ma=true; } if(b.wallet!==undefined && !isNaN(parseFloat(b.wallet)) && parseFloat(b.wallet)!==u.wallet){ db.prepare('UPDATE users SET wallet=? WHERE id=?').run(parseFloat(b.wallet),u.id); _ma=true; } if(_ma) pass('mass-assignment');
    return redirect('/profile'); }
  if(pathname==='/profile/password'&&method==='POST'){ const u=getUser(req); if(!u) return redirect('/login'); attempt('Profile & Account'); csrfProbe(req); const b=parseForm(await parseBody(req)); db.prepare('UPDATE users SET password=? WHERE id=?').run(md5(b.password),u.id); return redirect('/profile'); } // VULN(csrf): no token, no old-password check
  if(pathname==='/profile/avatar'&&method==='POST'){ const u=getUser(req); if(!u) return redirect('/login'); attempt('File Upload & Download'); const ct=req.headers['content-type']||''; const boundary=ct.split('boundary=')[1]; const buf=await readBodyBuffer(req);
    const parsed=parseMultipart(buf,boundary); if(parsed.file){ // VULN(upload): unrestricted file upload — no type/size check, served from /uploads/
      if(/\.(html?|svg|php|js|txt)$/i.test(parsed.file.filename||'') || XSS_RE.test(parsed.file.data.toString('utf8'))) pass('file-upload');
      fs.writeFileSync(path.join(UPLOAD_DIR,parsed.file.filename),parsed.file.data); db.prepare('UPDATE users SET avatar=? WHERE id=?').run('/uploads/'+parsed.file.filename,u.id); } return redirect('/profile'); }
  if(pathname==='/profile/avatar-url'&&method==='POST'){ const u=getUser(req); if(!u) return redirect('/login'); attempt('File Upload & Download'); const b=parseForm(await parseBody(req));
    if(INTERNAL_RE.test(b.url||'')) pass('ssrf');
    // VULN(ssrf): avatar-from-URL fetches arbitrary URL server-side
    try{ const r=await fetch(b.url); const data=Buffer.from(await r.arrayBuffer()); const fn='avatar-'+Date.now()+'.bin'; fs.writeFileSync(path.join(UPLOAD_DIR,fn),data); db.prepare('UPDATE users SET avatar=? WHERE id=?').run('/uploads/'+fn,u.id); }catch(e){} return redirect('/profile'); }
  if(pathname==='/address/add'&&method==='POST'){ const u=getUser(req); if(!u) return redirect('/login'); attempt('Profile & Account'); const b=parseForm(await parseBody(req)); db.prepare('INSERT INTO addresses(user_id,label,address,city,phone) VALUES(?,?,?,?,?)').run(u.id,b.label,b.address,b.city,b.phone); return redirect('/profile'); }
  if(pathname==='/address/delete'){ attempt('Profile & Account'); csrfProbe(req); const id=url.searchParams.get('id'); db.prepare('DELETE FROM addresses WHERE id=?').run(id); return redirect('/profile'); } // VULN(csrf): GET delete; VULN(IDOR): no ownership check
  if(pathname.startsWith('/address/')&&method==='GET'){ attempt('Orders & Invoices'); const id=pathname.split('/')[2]; const a=db.prepare('SELECT * FROM addresses WHERE id=?').get(id); if(!a) return send(404,'Not found'); const _v=getUser(req); if(!_v || _v.id!==a.user_id) pass('idor-orders'); return send(200,layout(req,'Address',`<div class="box"><h1>Address #${a.id}</h1><p>${esc(a.label)} — ${esc(a.address)}, ${esc(a.city)}</p><p>User ID: ${a.user_id}</p></div>`)); } // VULN(IDOR)

  if(pathname==='/my-orders'){ const u=getUser(req); if(!u) return redirect('/login'); const orders=db.prepare('SELECT * FROM orders WHERE user_id=? ORDER BY id DESC').all(u.id); return send(200,layout(req,'My Orders',`<h1>My Orders</h1>${orders.map(o=>`<div class="box"><a href="/order/${o.id}">Order #${o.id}</a> — $${o.total} — ${esc(o.status)} — ${esc(o.created_at)} <a href="/invoice/${o.id}">Invoice</a></div>`).join('')||'<p>No orders yet.</p>'}`)); }
  if(pathname.startsWith('/order/')&&method==='GET'){ attempt('Orders & Invoices'); const id=pathname.split('/')[2]; const o=db.prepare('SELECT * FROM orders WHERE id=?').get(id); if(!o) return send(404,'Not found'); const _v=getUser(req); if(!_v || _v.id!==o.user_id) pass('idor-orders'); // VULN(IDOR): order detail — no ownership check
    let items=[]; try{ items=JSON.parse(o.items); }catch(e){} return send(200,layout(req,'Order '+id,`<div class="box"><h1>Order #${o.id}</h1><p>Status: ${esc(o.status)} - Total: $${o.total} - User: ${o.user_id}</p><ul>${items.map(i=>`<li>${esc(i.name)} x${i.qty} — $${i.price}</li>`).join('')}</ul><p>Address: ${esc(o.address||'')}</p><p><a href="/invoice/${o.id}">View Invoice</a></p></div>`)); }
  if(pathname.startsWith('/invoice/')&&method==='GET'){ attempt('Orders & Invoices'); const id=pathname.split('/')[2]; const o=db.prepare('SELECT * FROM orders WHERE id=?').get(id); if(!o) return send(404,'Not found'); const _v2=getUser(req); if(!_v2 || _v2.id!==o.user_id) pass('idor-orders'); // VULN(IDOR): invoice no ownership check
    return send(200,layout(req,'Invoice',`<div class="box"><h1>Invoice #${o.id}</h1><p>Total: $${o.total}</p><p>${esc(o.items)}</p><a class="btn" href="/invoice-download/${o.id}">Download Invoice</a></div>`)); }
  if(pathname.startsWith('/invoice-download/')){ attempt('Orders & Invoices'); const id=pathname.split('/')[2]; const o=db.prepare('SELECT * FROM orders WHERE id=?').get(id); if(!o) return send(404,'Not found'); const _v3=getUser(req); if(!_v3 || _v3.id!==o.user_id) pass('idor-orders'); res.writeHead(200,{'Content-Type':'text/plain','Content-Disposition':'attachment; filename=invoice-'+id+'.txt'}); return res.end(`HexaShop Invoice #${o.id}\nTotal: $${o.total}\nItems: ${o.items}\nStatus: ${o.status}`); }
  if(pathname==='/wishlist'&&method==='GET'){ const u=getUser(req); if(!u) return redirect('/login'); const rows=db.prepare('SELECT p.* FROM wishlist w JOIN products p ON p.id=w.product_id WHERE w.user_id=?').all(u.id); return send(200,layout(req,'Wishlist',`<h1>Wishlist</h1><div class="grid">${rows.map(productCard).join('')||'<p>Empty.</p>'}</div>`)); }
  if(pathname==='/wishlist/toggle'&&method==='POST'){ const u=getUser(req); if(!u) return redirect('/login'); const b=parseForm(await parseBody(req)); const ex=db.prepare('SELECT * FROM wishlist WHERE user_id=? AND product_id=?').get(u.id,b.product_id); if(ex) db.prepare('DELETE FROM wishlist WHERE id=?').run(ex.id); else db.prepare('INSERT INTO wishlist(user_id,product_id) VALUES(?,?)').run(u.id,b.product_id); return redirect('/wishlist'); }

  if(pathname==='/cart/add'&&method==='POST'){ const b=parseForm(await parseBody(req)); attempt('Cart & Checkout'); const key=ownerKey(req); const qty=parseInt(b.qty||'1'); const price=parseFloat(b.price||'0'); if(!isNaN(qty) && qty<1) pass('business-logic'); // VULN(business-logic): negative/zero qty accepted
    const ex=db.prepare('SELECT * FROM cart_items WHERE owner_key=? AND product_id=?').get(key,b.product_id); if(ex) db.prepare('UPDATE cart_items SET qty=qty+? WHERE id=?').run(qty,ex.id); else db.prepare('INSERT INTO cart_items(owner_key,product_id,qty,price) VALUES(?,?,?,?)').run(key,b.product_id,qty,price); return redirect('/cart'); }
  if(pathname==='/cart'&&method==='GET'){ const items=cartItems(ownerKey(req)); const total=items.reduce((s,i)=>s+i.price*i.qty,0); const c=`<h1>Your Cart</h1>${items.map(i=>`<div class="box cartrow"><span>${i.emoji} ${esc(i.name)} — $${i.price}</span><form method="POST" action="/cart/update"><input type="hidden" name="id" value="${i.id}"><input type="number" name="qty" value="${i.qty}"><button class="btn">Update</button></form><form method="POST" action="/cart/remove"><input type="hidden" name="id" value="${i.id}"><button class="btn ghost">Remove</button></form></div>`).join('')||'<p>Cart empty.</p>'}<h3>Total: $${total.toFixed(2)}</h3><a class="btn big" href="/checkout">Proceed to Checkout</a>`; return send(200,layout(req,'Cart',c)); }
  if(pathname==='/cart/update'&&method==='POST'){ const b=parseForm(await parseBody(req)); attempt('Cart & Checkout'); if(parseInt(b.qty)<1) pass('business-logic'); db.prepare('UPDATE cart_items SET qty=? WHERE id=?').run(parseInt(b.qty),b.id); return redirect('/cart'); }
  if(pathname==='/cart/remove'&&method==='POST'){ const b=parseForm(await parseBody(req)); db.prepare('DELETE FROM cart_items WHERE id=?').run(b.id); return redirect('/cart'); }
  if(pathname==='/checkout'&&method==='GET'){ const items=cartItems(ownerKey(req)); const total=items.reduce((s,i)=>s+i.price*i.qty,0);
    const rowsHtml=items.map((i,idx)=>`<div class="box">${esc(i.name)} x${i.qty} — $${i.price} <input type="hidden" name="price_${idx}" value="${i.price}"><input type="hidden" name="name_${idx}" value="${esc(i.name)}"><input type="hidden" name="qty_${idx}" value="${i.qty}"></div>`).join('');
    const c=`<h1>Checkout</h1><div class="steps">1 Cart - <b>2 Checkout</b> - 3 Done</div><form method="POST" class="box"><input type="hidden" name="count" value="${items.length}"><input type="hidden" name="total" value="${total.toFixed(2)}">${rowsHtml}
    <label>Address <input name="address" value="House 12, Dhaka" required></label><label>Shipping <select name="shipping"><option>Standard - Free</option><option>Express - $9</option></select></label>
    <label>Coupon <input name="coupon" placeholder="WELCOME10"></label><label>Gift Card <input name="giftcard" placeholder="HEXA-1001"></label>
    <label>Card Number <input name="card" value="4242 4242 4242 4242"></label><label>Expiry <input name="exp" value="12/28"></label><label>CVV <input name="cvv" value="123"></label>
    <h3>Total: $${total.toFixed(2)}</h3><button class="btn big">Place Order</button></form>`;
    return send(200,layout(req,'Checkout',c)); }
  if(pathname==='/checkout'&&method==='POST'){ const b=parseForm(await parseBody(req)); attempt('Cart & Checkout'); const u=getUser(req); const key=ownerKey(req); const items=cartItems(key);
    // TEST-DETECT: compare what the client submitted against the server-side catalogue truth
    { let _truth=0,_tamper=false,_neg=false; for(const _it of items){ const _p=db.prepare('SELECT price FROM products WHERE id=?').get(_it.product_id); const _cp=_p?_p.price:_it.price; _truth+=_cp*_it.qty; }
      if(b.total!==undefined && Math.abs(parseFloat(b.total)-Math.round(_truth*100)/100)>0.001) _tamper=true;
      if(b.count){ const _n=parseInt(b.count); for(let _i=0;_i<_n;_i++){ if(b['price_'+_i]!==undefined && items[_i]){ const _p=db.prepare('SELECT price FROM products WHERE id=?').get(items[_i].product_id); if(_p && Math.abs(parseFloat(b['price_'+_i])-_p.price)>0.001) _tamper=true; } if(b['qty_'+_i]!==undefined && parseInt(b['qty_'+_i])<1) _neg=true; } }
      if(_tamper) pass('price-tampering'); if(_neg) pass('business-logic');
      if(b.coupon){ const _codes=b.coupon.split(',').map(s=>s.trim()).filter(Boolean); const _valid=_codes.filter(c=>db.prepare('SELECT * FROM coupons WHERE code=?').get(c)); if(_valid.length>=2) pass('business-logic'); for(const c of _valid){ _couponUse[c]=(_couponUse[c]||0)+1; if(_couponUse[c]>=2) pass('business-logic'); } }
      if(b.giftcard){ const _gc=db.prepare('SELECT * FROM giftcards WHERE code=?').get(b.giftcard); if(_gc && !_gc.used_by) pass('business-logic'); } }
    // VULN(price-tampering): checkout trusts client-submitted total/prices hidden fields
    let total=parseFloat(b.total||'0');
    let orderItems=items.map(i=>({id:i.product_id,name:i.name,price:i.price,qty:i.qty}));
    if(b.count){ const n=parseInt(b.count); const tampered=[]; for(let i=0;i<n;i++){ if(b['price_'+i]!==undefined) tampered.push({id:items[i]?items[i].product_id:0,name:b['name_'+i]||'',price:parseFloat(b['price_'+i]),qty:parseInt(b['qty_'+i]||'1')}); } if(tampered.length) orderItems=tampered; }
    // VULN(business-logic): coupon reusable unlimited + stackable (comma-separated)
    if(b.coupon){ const codes=b.coupon.split(',').map(s=>s.trim()).filter(Boolean); for(const code of codes){ const cp=db.prepare('SELECT * FROM coupons WHERE code=?').get(code); if(cp) total=total*(1-cp.discount/100); } }
    if(b.giftcard){ const gc=db.prepare('SELECT * FROM giftcards WHERE code=?').get(b.giftcard); if(gc && !gc.used_by){ total=Math.max(0,total-gc.balance); db.prepare('UPDATE giftcards SET used_by=? WHERE code=?').run(u?u.id:0,b.giftcard); } }
    total=Math.round(total*100)/100;
    const info=db.prepare('INSERT INTO orders(user_id,total,status,items,address,payment,coupon) VALUES(?,?,?,?,?,?,?)').run(u?u.id:0,total,'Processing',JSON.stringify(orderItems),b.address||'','Card '+(b.card||''),b.coupon||'');
    db.prepare('DELETE FROM cart_items WHERE owner_key=?').run(key);
    return redirect('/order-success?id='+info.lastInsertRowid); }
  if(pathname==='/order-success'){ const id=url.searchParams.get('id'); return send(200,layout(req,'Success',`<div class="box"><h1>Order Placed!</h1><p>Order #${esc(id||'')} confirmed.</p><a class="btn" href="/order/${esc(id||'')}">View Order</a> <a href="/shop">Continue Shopping</a></div>`)); }
  // ADMIN — VULN(broken-access-control): checks cookie role only (tamperable); some checks only "logged in"
  if(pathname.startsWith('/admin')){
    attempt('Admin Panel');
    if(!getUser(req)) return redirect('/login');
    if(!isAdmin(req)) return send(403,layout(req,'Forbidden','<h1>403 — Admin only</h1><p>Hint: how is your role stored?</p>'));
    { const _u=getUser(req); if(_u && _u.role!=='admin') pass('cookie-role'); } // gate passed on the cookie's word, not the database's
    if(pathname==='/admin'&&method==='GET'){ const pc=db.prepare('SELECT COUNT(*) c FROM products').get().c; const oc=db.prepare('SELECT COUNT(*) c FROM orders').get().c; const uc=db.prepare('SELECT COUNT(*) c FROM users').get().c; const rev=db.prepare('SELECT COALESCE(SUM(total),0) s FROM orders').get().s;
      const byCat=db.prepare('SELECT category,COUNT(*) c FROM products GROUP BY category').all(); const maxC=Math.max(...byCat.map(r=>r.c),1);
      const c=`<h1>Admin Dashboard</h1><div class="stats"><div class="stat">Products<b>${pc}</b></div><div class="stat">Orders<b>${oc}</b></div><div class="stat">Users<b>${uc}</b></div><div class="stat">Revenue<b>$${rev}</b></div></div>
      <h3>Products by Category</h3>${byCat.map(r=>`<div class="barrow"><span>${esc(r.category)}</span><div class="bar" style="width:${r.c/maxC*60}%">${r.c}</div></div>`).join('')}
      <nav class="adminnav"><a href="/admin/products">Products</a><a href="/admin/orders">Orders</a><a href="/admin/users">Users</a><a href="/admin/coupons">Coupons</a><a href="/admin/tickets">Tickets</a><a href="/admin/ping">Ping Tool</a><a href="/admin/logs">Logs</a><a href="/debug">Debug</a></nav>
      <div class="box"><h3>Import Product from URL (SSRF demo)</h3><form method="POST" action="/admin/import-url"><input name="url" placeholder="https://example.com/product.json" style="width:70%"><button class="btn">Import</button></form>
      <h3>Import Products XML (XXE demo)</h3><form method="POST" action="/admin/import-xml"><textarea name="xml" placeholder="<products><product><name>X</name></product></products>"></textarea><button class="btn">Import XML</button></form></div>`;
      return send(200,layout(req,'Admin',c)); }
    if(pathname==='/admin/products'&&method==='GET'){ const rows=db.prepare('SELECT * FROM products').all(); return send(200,layout(req,'Admin Products',`<h1>Products</h1><a class="btn" href="/admin/products/new">+ New Product</a>${rows.map(p=>`<div class="box">${esc(p.name)} — $${p.price} — Stock ${p.stock} <a href="/admin/products/edit?id=${p.id}">Edit</a> <a href="/admin/products/delete?id=${p.id}">Delete</a></div>`).join('')}
      <div class="box"><h3>Upload Product Image</h3><form method="POST" action="/admin/product-image" enctype="multipart/form-data"><input type="file" name="image"><button class="btn">Upload</button></form></div>`)); }
    if(pathname==='/admin/products/new'){ if(method==='GET') return send(200,layout(req,'New Product',`<h1>New Product</h1><form method="POST" class="box"><input name="name" placeholder="Name"><input name="category" placeholder="Category" value="Electronics"><input name="brand" placeholder="Brand"><input name="price" placeholder="Price"><input name="stock" placeholder="Stock" value="10"><textarea name="description" placeholder="Description"></textarea><button class="btn">Create</button></form>`));
      const b=parseForm(await parseBody(req)); db.prepare('INSERT INTO products(name,category,brand,price,old_price,stock,rating,description,specs,emoji,color) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(b.name,b.category,b.brand,parseFloat(b.price||'0'),0,parseInt(b.stock||'0'),4.5,b.description||'','','📦','#667eea'); return redirect('/admin/products'); }
    if(pathname==='/admin/products/edit'){ const id=url.searchParams.get('id'); if(method==='GET'){ const p=db.prepare('SELECT * FROM products WHERE id=?').get(id); return send(200,layout(req,'Edit',`<h1>Edit Product</h1><form method="POST" class="box"><input type="hidden" name="id" value="${p.id}"><input name="name" value="${esc(p.name)}"><input name="price" value="${p.price}"><input name="stock" value="${p.stock}"><textarea name="description">${esc(p.description)}</textarea><button class="btn">Save</button></form>`)); }
      const b=parseForm(await parseBody(req)); db.prepare('UPDATE products SET name=?,price=?,stock=?,description=? WHERE id=?').run(b.name,parseFloat(b.price),parseInt(b.stock),b.description,b.id); return redirect('/admin/products'); }
    if(pathname==='/admin/products/delete'){ csrfProbe(req); const id=url.searchParams.get('id'); db.prepare('DELETE FROM products WHERE id=?').run(id); return redirect('/admin/products'); } // VULN(csrf): GET delete, no token
    if(pathname==='/admin/product-image'&&method==='POST'){ attempt('File Upload & Download'); const ct=req.headers['content-type']||''; const boundary=ct.split('boundary=')[1]; const buf=Buffer.concat(await new Promise(r=>{ const ch=[]; req.on('data',c=>ch.push(c)); req.on('end',()=>r(ch)); })); const {file}=parseMultipart(buf,boundary); if(file){ if(/\.(html?|svg|php|js|txt)$/i.test(file.filename||'') || XSS_RE.test(file.data.toString('utf8'))) pass('file-upload'); fs.writeFileSync(path.join(UPLOAD_DIR,file.filename),file.data); } return redirect('/admin/products'); } // VULN(upload)
    if(pathname==='/admin/import-url'&&method==='POST'){ attempt('File Upload & Download'); const b=parseForm(await parseBody(req)); if(INTERNAL_RE.test(b.url||'')) pass('ssrf'); // VULN(ssrf): fetches arbitrary URL
      try{ const r=await fetch(b.url); const text=await r.text(); return send(200,layout(req,'Import Result',`<h1>Fetched URL</h1><p>${esc(b.url)} — status ${r.status}</p><pre>${esc(text.slice(0,3000))}</pre>`)); }catch(e){ return send(200,layout(req,'Import',`<div class="error">${esc(e.message)}</div>`)); } }
    if(pathname==='/admin/import-xml'&&method==='POST'){ const b=parseForm(await parseBody(req)); let xml=b.xml||'';
      // VULN(xxe): naive entity resolver reads local files
      const m=xml.match(/<!ENTITY\s+\w+\s+SYSTEM\s+"file:\/\/\/([^"]+)">/); let leaked=''; let _xxeOk=false; if(m){ try{ leaked=fs.readFileSync('/'+m[1],'utf8'); _xxeOk=true; xml=xml.replace(/&\w+;/,leaked); }catch(e){ leaked='[read error: '+e.message+']'; } }
      if(_xxeOk) pass('xxe'); // the external entity was followed and the local file was read (contents may legitimately be short/empty)
      const nameM=xml.match(/<name>([^<]+)<\/name>/); if(nameM) db.prepare('INSERT INTO products(name,category,brand,price,old_price,stock,rating,description,specs,emoji,color) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(nameM[1].trim(),'Electronics','Imported',49,0,10,4.0,'Imported via XML','','📦','#999');
      return send(200,layout(req,'XML Import',`<h1>XML Import Done</h1><pre>${esc(xml.slice(0,3000))}</pre>${leaked?`<p>Entity resolved content included above.</p>`:''}<p><a href="/admin/products">View products</a></p>`)); }
    if(pathname==='/admin/orders'&&method==='GET'){ const rows=db.prepare('SELECT * FROM orders ORDER BY id DESC').all(); return send(200,layout(req,'Admin Orders',`<h1>Orders</h1>${rows.map(o=>`<div class="box">#${o.id} User ${o.user_id} — $${o.total} — ${esc(o.status)}<form method="POST" action="/admin/orders/status"><input type="hidden" name="id" value="${o.id}"><select name="status"><option>Processing</option><option>Shipped</option><option>Delivered</option><option>Cancelled</option></select><button class="btn">Update</button></form></div>`).join('')}`)); }
    if(pathname==='/admin/orders/status'&&method==='POST'){ csrfProbe(req); const b=parseForm(await parseBody(req)); db.prepare('UPDATE orders SET status=? WHERE id=?').run(b.status,b.id); return redirect('/admin/orders'); }
    if(pathname==='/admin/users'&&method==='GET'){ const rows=db.prepare('SELECT * FROM users').all(); return send(200,layout(req,'Admin Users',`<h1>Users</h1>${rows.map(x=>`<div class="box">${esc(x.email)} — ${x.name} — ${esc(x.role)} <form method="POST" action="/admin/users/role" style="display:inline"><input type="hidden" name="id" value="${x.id}"><select name="role"><option>customer</option><option>admin</option></select><button class="btn">Set Role</button></form></div>`).join('')}`)); } // note: name rendered raw below in profile header; here esc for list safety except stored-xss via profile page header path
    if(pathname==='/admin/users/role'&&method==='POST'){ csrfProbe(req); const b=parseForm(await parseBody(req)); db.prepare('UPDATE users SET role=? WHERE id=?').run(b.role,b.id); return redirect('/admin/users'); } // VULN(csrf): no token
    if(pathname==='/admin/coupons'){ const rows=db.prepare('SELECT * FROM coupons').all(); const gcs=db.prepare('SELECT * FROM giftcards').all(); return send(200,layout(req,'Coupons',`<h1>Coupons</h1>${rows.map(c=>`<div class="box">${esc(c.code)} — ${c.discount}% — ${esc(c.description)}</div>`).join('')}<h2>Gift Cards</h2>${gcs.map(g=>`<div class="box">${esc(g.code)} — $${g.balance} ${g.used_by?'used by '+g.used_by:''}</div>`).join('')}`)); }
    if(pathname==='/admin/tickets'){ const rows=db.prepare('SELECT * FROM tickets ORDER BY id DESC').all(); return send(200,layout(req,'Tickets',`<h1>Support Tickets</h1>${rows.map(t=>`<div class="box"><b>${t.subject}</b> from ${t.name} (${esc(t.email)})<p>${t.message}</p><small>${esc(t.status)}</small></div>`).join('')||'<p>No tickets.</p>'}`)); } // VULN(xss-stored): subject/message/name raw
    if(pathname==='/admin/ping'){ if(method==='GET') return send(200,layout(req,'Ping',`<h1>Ping Supplier Server</h1><form method="POST" class="box"><input name="host" placeholder="127.0.0.1" value="127.0.0.1"><button class="btn">Ping</button></form>`));
      const b=parseForm(await parseBody(req)); // VULN(command-injection): exec with concatenated input
      if(/[;&|`$><\\\n]/.test(b.host||'')) pass('command-injection');
      return new Promise(done=>{ exec('ping -c 1 '+b.host+' || ping -n 1 '+b.host,{timeout:8000},(err,stdout,stderr)=>{ send(200,layout(req,'Ping Result',`<h1>Ping Result</h1><pre>${esc(stdout||'')}${esc(stderr||'')}${err?esc(err.message):''}</pre><p>Host: ${esc(b.host)}</p>`)); done(); }); }); }
    if(pathname==='/admin/logs'){ const rows=db.prepare('SELECT * FROM logs ORDER BY id DESC LIMIT 100').all(); return send(200,layout(req,'Logs',`<h1>Server Logs</h1><pre>${rows.map(r=>esc(r.created_at)+' '+esc(r.msg)).join('\n')}</pre>`)); }
    return send(404,layout(req,'Admin','<h1>Admin page not found</h1>'));
  }

  // ---------- lab system routes ----------
  if(pathname==='/logo.png'){ try{ const img=fs.readFileSync(path.join(ROOT,'logo.png')); res.writeHead(200,{'Content-Type':'image/png'}); return res.end(img); }catch(e){ return send(404,'Not found'); } }
  if(pathname==='/tests'&&method==='GET'){ return send(200,layout(req,'Mission — Lab Tests',testsPage())); }
  if(pathname==='/complete'&&method==='GET'){ return send(200,layout(req,'Completion',completePage())); }
  if(pathname==='/complete/name'&&method==='POST'){ const b=parseForm(await parseBody(req)); if(b.name){ progress.testerName=String(b.name).slice(0,80); saveProgress(); } return redirect('/complete'); }
  if(pathname==='/certificate'&&method==='GET'){ if(!progressSummary().complete) return redirect('/complete'); res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Set-Cookie':'hx_origin=1; Path=/'}); return res.end(certificatePage()); }
  if(pathname==='/api/progress'&&method==='GET'){ return json(progressSummary()); }
  if(pathname==='/api/chat'&&method==='POST'){ const raw=await parseBody(req); let msg=''; try{ msg=JSON.parse(raw).message||''; }catch(e){ msg=parseForm(raw).message||''; } return json({reply:chatReply(msg)}); }

  return send(404,layout(req,'404','<h1>404 — Page Not Found</h1><p><a href="/">Go home</a></p>'));
  }catch(e){ // verbose error page
    try{ res.writeHead(500,{'Content-Type':'text/html'}); res.end('<h1>500 Error</h1><pre>'+esc(e.stack||e.message)+'</pre>'); }catch(_){}
  }
});
const _sF=['UVZXRA==']; // footer config fragment
server.listen(PORT,()=>{ console.log(`HexaShop running at http://localhost:${PORT}  (LOCAL ONLY — deliberately vulnerable lab)`); console.log('Test accounts: admin@hexashop.local/admin123, alice@test.local/alice123, bob@test.local/bob123'); });
