'use strict';
/*
 * HexaCraft — INTENTIONALLY VULNERABLE handmade-goods marketplace practice lab.
 * Zero-dependency Node.js (built-ins only). Local use ONLY. Binds 127.0.0.1:3015.
 * All data is synthetic and lives in memory — restart the server to reset.
 * DO NOT deploy this anywhere. See VULNERABILITIES.md for the planted flaws.
 */
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring');

const HOST = '127.0.0.1';
const PORT = 3015;

/* ================= LAB SYSTEM (LAB 7 — HexaCraft) ================= */
const LAB_NUMBER = 7;
const LAB_NAME = 'HexaCraft';
const PROGRESS_PATH = path.join(__dirname, 'progress.json');
const LOGO_PATH = path.join(__dirname, 'logo.png');

/* Key material is never stored whole — only encoded shards, scattered (§7).
   Assembler: base64-decode each shard, reverse it, join. */

const _cA = ['MEwtWEg=', 'M0s4LTg='];
const _unshard = (arr) => arr.map((s) => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('')).join('');

/* ---------------- In-memory data (reset = restart) ---------------- */
let seq = { user: 100, shop: 100, product: 100, order: 100, review: 100, dispute: 100 };
const nextId = (k) => ++seq[k];

const users = [
  { id: 1, name: 'Lab Admin',        email: 'admin@hexacraft.local', password: 'Admin@123',  role: 'admin',  shopId: null },
  { id: 2, name: 'Ayesha Rahman',    email: 'shopa@hexacraft.local', password: 'Seller@123', role: 'seller', shopId: 1 },
  { id: 3, name: 'Bijoy Sarker',     email: 'shopb@hexacraft.local', password: 'Seller@123', role: 'seller', shopId: 2 },
  { id: 4, name: 'Chen Wei',         email: 'shopc@hexacraft.local', password: 'Seller@123', role: 'seller', shopId: 3 },
  { id: 5, name: 'Ruma Khatun',      email: 'ruma@hexacraft.local',  password: 'User@123',   role: 'buyer',  shopId: null },
  { id: 6, name: 'Karim Islam',      email: 'karim@hexacraft.local', password: 'User@123',   role: 'buyer',  shopId: null },
  { id: 7, name: 'Sara Nguyen',      email: 'sara@hexacraft.local',  password: 'User@123',   role: 'buyer',  shopId: null },
];

const shops = [
  { id: 1, ownerId: 2, name: 'Clay & Thread',      bio: 'Hand-thrown pottery and woven textiles from Dhaka.', commissionRate: 12, verifiedSeller: true,  featured: true,  payoutBank: 'Dhaka Bank', payoutAccount: 'BD-100-2231', payoutName: 'Ayesha Rahman' },
  { id: 2, ownerId: 3, name: 'Woodland Crafts',    bio: 'Reclaimed-wood furniture and carvings.',            commissionRate: 12, verifiedSeller: false, featured: false, payoutBank: 'Sonali Bank', payoutAccount: 'BD-200-8812', payoutName: 'Bijoy Sarker' },
  { id: 3, ownerId: 4, name: 'Paper Bloom Studio', bio: 'Handmade paper goods, journals and origami art.',   commissionRate: 15, verifiedSeller: false, featured: false, payoutBank: 'City Bank', payoutAccount: 'BD-300-5519', payoutName: 'Chen Wei' },
];

const products = [];
function addProduct(shopId, name, price, stock, salesCount, desc) {
  products.push({ id: products.length + 1, shopId, name, price, stock, salesCount, desc, commissionRate: null, images: [] });
}
addProduct(1, 'Terracotta Dinner Set (6 pc)', 64.00, 20, 41, 'Hand-thrown terracotta plates and bowls, food-safe glaze.');
addProduct(1, 'Handwoven Jamdani Scarf', 38.50, 35, 57, 'Traditional jamdani weave, natural dyes, 180cm.');
addProduct(1, 'Clay Incense Holder', 12.00, 120, 89, 'Small lotus-shaped incense holder, matte finish.');
addProduct(1, 'Embroidered Wall Hanging', 45.00, 15, 12, 'Nakshi kantha inspired embroidery on cotton.');
addProduct(1, 'Studio Pottery Vase', 29.99, 25, 23, 'Wheel-thrown stoneware vase, speckled glaze.');
addProduct(2, 'Reclaimed Teak Serving Board', 42.00, 30, 34, 'Made from reclaimed teak, food-safe oil finish.');
addProduct(2, 'Hand-Carved Wooden Elephant', 24.50, 50, 61, 'Carved from a single block of rain-tree wood.');
addProduct(2, 'Rustic Oak Wall Shelf', 78.00, 12, 9, 'Floating shelf with hidden brackets, 80cm.');
addProduct(2, 'Wooden Spice Box (9 compartments)', 33.00, 40, 27, 'Hinged spice box with brass fittings.');
addProduct(2, 'Carved Jewelry Organizer', 51.00, 18, 15, 'Three-drawer organizer, felt-lined.');
addProduct(3, 'Handmade Paper Journal (A5)', 16.00, 200, 132, '120 pages of cotton-rag paper, lay-flat binding.');
addProduct(3, 'Origami Crane Mobile', 22.00, 60, 44, '100 folded cranes on bamboo frame.');
addProduct(3, 'Pressed-Flower Greeting Cards (set of 8)', 11.50, 150, 98, 'Real pressed flowers on handmade card stock.');
addProduct(3, 'Paper Quilling Art — Peacock', 36.00, 22, 18, 'Framed quilling artwork, 30x30cm.');
addProduct(3, 'Recycled Paper Gift Wrap (5 sheets)', 8.00, 300, 210, 'Block-printed recycled paper sheets.');

const orders = [
  { id: 1, buyerId: 5, items: [{ productId: 11, qty: 2, price: 16.00 }], total: 32.00, status: 'Paid',    coupon: null },
  { id: 2, buyerId: 6, items: [{ productId: 1, qty: 1, price: 64.00 }], total: 64.00, status: 'Pending', coupon: null },
  { id: 3, buyerId: 7, items: [{ productId: 7, qty: 1, price: 24.50 }, { productId: 13, qty: 1, price: 11.50 }], total: 36.00, status: 'Shipped', coupon: 'CRAFT10' },
];
seq.order = 3;

const reviews = [
  { id: 1, productId: 1, userId: 5, author: 'Ruma Khatun', rating: 5, text: 'Beautiful set, arrived well packed.' },
  { id: 2, productId: 1, userId: 6, author: 'Karim Islam', rating: 2, text: 'One plate had a chip on the rim. Disappointed.' },
  { id: 3, productId: 11, userId: 7, author: 'Sara Nguyen', rating: 5, text: 'Paper quality is gorgeous.' },
  { id: 4, productId: 7, userId: 5, author: 'Ruma Khatun', rating: 4, text: 'Lovely carving, slightly smaller than expected.' },
];
seq.review = 4;

const coupons = [ { code: 'CRAFT10', percent: 10 }, { code: 'ARTISAN5', percent: 5 } ];
const couponUses = []; // NOTE (vuln): never enforced — a coupon can be reused forever.

const disputes = [
  { id: 1, orderId: 2, openedBy: 'Karim Islam', reason: 'Item not received after 10 days', status: 'Open' },
  { id: 2, orderId: 3, openedBy: 'Sara Nguyen', reason: 'Cards arrived bent', status: 'In review' },
];
seq.dispute = 2;

const uploads = []; // { productId, filename, content }
const sessions = new Map(); // sid -> { userId, cart: [{productId, qty}] }

/* Unlisted draft product — never shown in the catalogue; the search injection reveals it. */
products.push({ id: 16, shopId: 3, name: 'UNLISTED DRAFT — Wholesale Crate of Journals (bulk lot)', price: 240.00, stock: 4, salesCount: 0, desc: 'Internal draft listing — not for public sale.', commissionRate: null, images: [], hidden: true });

/* ================= TESTS REGISTRY ================= */
const F = {
  AUTH: 'Login & Authentication',
  ACCT: 'Accounts & Profile',
  SEARCH: 'Search & Catalogue',
  SELLER: 'Seller Products',
  REVIEWS: 'Reviews',
  CHECKOUT: 'Cart & Checkout',
  ORDERS: 'Orders',
  PAYOUT: 'Payouts & Shop Settings',
  ADMIN: 'Admin Panel',
};
const TESTS = [
  { id: 'sqli-login', feature: F.AUTH, name: 'SQL injection login bypass', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: ['The login form has a second, legacy lookup path that builds its query by gluing your input into a string.', "Try a classic tautology in the email field — something that makes the WHERE clause always true.", "Email: ' OR '1'='1 — any password. You land in the first account the query returns: the admin."],
    lesson: 'String-built queries turn user input into query logic; a login is only as strong as its parameter binding.',
    impact: "On a client's site this is full account takeover — often straight into the admin account — with no password and no trace beyond a strange login line.",
    report: { title: 'SQL Injection in Authentication (Login Bypass)', severity: 'Critical', remediation: 'Use parameterised queries everywhere; never concatenate input into SQL.' },
    guide: "POST /login with email ' OR '1'='1 and any password. The legacy lookup treats your input as query text, the condition matches every row, and the app starts a session as the first user — the admin." },
  { id: 'brute-force', feature: F.AUTH, name: 'Brute force — no rate limiting or lockout', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['How many wrong passwords can you try for one account in a minute?', 'Nothing slows you down — no counter, no lockout, no CAPTCHA. Script it.', 'Send 10+ failed logins for ruma@hexacraft.local; the 10th is still processed like the 1st. That absence of throttling is the flaw.'],
    lesson: 'Authentication endpoints without throttling let attackers try unlimited passwords against known accounts.',
    impact: 'Attackers can grind through password lists against real customer accounts at full speed; weak passwords fall first, then account data and stored value follow.',
    report: { title: 'Missing Rate Limiting on Login (Brute Force)', severity: 'High', remediation: 'Throttle per account and per IP, add progressive delays/lockout and alerting.' },
    guide: 'POST /login 10 times with a wrong password for the same account. Every attempt is accepted for processing — there is no rate limit, lockout or delay. The test passes when the 10th failure is still processed.' },
  { id: 'user-enumeration', feature: F.AUTH, name: 'User enumeration via differing responses', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['Compare the login error for an email that exists with one that does not.', 'The forgot-password flow answers differently too — one shows a reset link, the other a generic note.', 'Probe /login once with ruma@hexacraft.local (wrong password) and once with an invented email; the two different messages confirm which accounts exist.'],
    lesson: 'Different responses for "no such user" vs "wrong password" hand attackers a free list of valid accounts.',
    impact: 'Attackers harvest the valid customer email list, then aim phishing and password attacks only at accounts that definitely exist — far higher success for them.',
    report: { title: 'Account Enumeration via Authentication Responses', severity: 'Medium', remediation: 'Return one generic message for all failed logins and reset requests.' },
    guide: 'POST /login with a registered email + wrong password, then with an unregistered email. The messages differ ("Wrong password" vs "No account with that email"), so you can enumerate valid accounts. The test passes once both kinds of response have been observed.' },
  { id: 'predictable-reset', feature: F.AUTH, name: 'Predictable password-reset token', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Intermediate',
    hints: ['The lab shows you a reset link — study how its token is built.', 'The token depends only on something public about the account. Compute it offline.', 'token = first 8 hex characters of md5(email). Compute it for admin@hexacraft.local and open /reset with it.'],
    lesson: 'A reset token derived from public data is not a secret — it is a password-change form anyone can drive.',
    impact: 'Anyone who knows a customer\u2019s (or the admin\u2019s) email can reset their password and own the account — support-desk and takeover risk in one step.',
    report: { title: 'Predictable Password Reset Token', severity: 'Critical', remediation: 'Use crypto.randomBytes tokens, hashed at rest, single-use, expiring in ~15 minutes.' },
    guide: 'Compute md5(victim email), take the first 8 hex chars, then GET /reset?email=<email>&token=<computed> and POST a new password. Works for any account, including admin.' },
  { id: 'weak-password-policy', feature: F.AUTH, name: 'Weak password policy at registration', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['What is the shortest password the registration form accepts?', 'Try registering with a 1-character password.', 'Register a fresh account with password "x" — it is created, proving there is no minimum length or complexity rule.'],
    lesson: 'If the app accepts one-character passwords, its password database is full of instantly-guessable credentials.',
    impact: 'Customers pick terrible passwords when allowed, and those accounts fall to the first guessing attempt — the breach starts with the policy, not the user.',
    report: { title: 'Weak Password Policy', severity: 'Medium', remediation: 'Enforce minimum length (12+) and check against known-breached password lists.' },
    guide: 'POST /register with a new email and a password shorter than 6 characters (e.g. "x"). The account is created — there is no password policy.' },
  { id: 'mass-assignment-profile', feature: F.ACCT, name: 'Mass assignment on profile update', owasp: 'A03:2021 / API3 Improper Inventory — Mass Assignment', difficulty: 'Intermediate',
    hints: ['The profile form only shows a name field — but what does the endpoint do with extra fields?', 'The server copies submitted fields onto your user record. Which field controls your powers?', 'POST /profile with name plus role=admin. Your account record itself becomes admin.'],
    lesson: 'Binding every submitted field to the data model lets clients write fields the UI never offered — including role.',
    impact: 'Any registered user can promote themselves to admin by adding one field to a form post — full platform compromise from a free account.',
    report: { title: 'Mass Assignment Allows Privilege Escalation', severity: 'Critical', remediation: 'Bind an explicit allowlist of editable fields per role; never copy raw request bodies onto models.' },
    guide: 'While logged in, POST /profile including an extra field the form never shows: role=admin. The endpoint copies it onto your user record — your real account role becomes admin (check /profile).' },
  { id: 'search-sqli', feature: F.SEARCH, name: 'SQL injection in product search', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: ['The catalogue search builds its query from your text the same legacy way the login does.', 'A tautology does not just match everything — ask what else is in the table that the catalogue never shows.', "Search for ' OR '1'='1 — an unlisted draft product appears that no normal search or page links to."],
    lesson: 'Search boxes are query builders; unparameterised search leaks rows the interface was never meant to show.',
    impact: 'Attackers dump the full product table — including draft pricing, unreleased products and cost data — straight through the search box.',
    report: { title: 'SQL Injection in Product Search', severity: 'High', remediation: 'Parameterise search queries; return only published products regardless of input.' },
    guide: "GET /search?q=' OR '1'='1 — the injected condition is always true, so the search returns every row including the hidden UNLISTED DRAFT product." },
  { id: 'reflected-xss', feature: F.SEARCH, name: 'Reflected XSS in search results', owasp: 'A03:2021 Injection (XSS)', difficulty: 'Beginner',
    hints: ['The results page repeats your search term back to you. In what form?', 'View the page source after searching for a tag.', 'Search for <script>alert(1)</script> — your input is written into the page unescaped and executes.'],
    lesson: 'Reflected input must be encoded for the context it lands in; a search echo is a classic XSS sink.',
    impact: 'Attackers send victims a crafted search link that runs script in the victim\u2019s session — stealing carts, accounts and trust from a real-looking URL on the client\u2019s own domain.',
    report: { title: 'Reflected Cross-Site Scripting in Search', severity: 'High', remediation: 'HTML-encode all reflected values; add a Content-Security-Policy.' },
    guide: 'GET /search?q=<script>alert(1)</script> — the term is reflected into the results heading with no escaping, so the payload executes in the browser.' },
  { id: 'seller-product-idor', feature: F.SELLER, name: 'Broken seller isolation — edit/delete another seller\u2019s product', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Your dashboard edit links follow a pattern. Whose products does the pattern reach?', 'Log in as Seller A and open the edit URL of a Woodland Crafts product (IDs 6–10).', 'Save a change (or POST the delete) on product 6 as Seller A — it applies, although the product belongs to Seller B.'],
    lesson: 'Every object mutation needs a server-side ownership check; hiding other sellers\u2019 links is not isolation.',
    impact: 'A rival seller can reprice, corrupt or delete a competitor\u2019s best listings overnight — lost sales and a marketplace that sellers stop trusting.',
    report: { title: 'Missing Ownership Check on Product Edit/Delete (IDOR)', severity: 'High', remediation: 'Verify product.shopId === session shop on every product read/write.' },
    guide: 'Login as shopa@, then POST /seller/products/6/edit (Seller B\u2019s product) with a new name/price, or POST /seller/products/6/delete. No ownership check stops you.' },
  { id: 'commission-tampering', feature: F.SELLER, name: 'Commission tampering via hidden form field', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['Create/edit product forms carry more than you can see. View source.', 'A hidden field decides what the marketplace keeps. Who chooses its value?', 'Intercept the product save and set commission=0. The shop\u2019s rate becomes 0% — fees erased.'],
    lesson: 'Financial parameters sent by the client are attacker-controlled; fees must come from server-side records.',
    impact: 'Sellers quietly set their own commission to 0% and the marketplace loses its fee on every sale — revenue bleeding that normal reports never show.',
    report: { title: 'Client-Controlled Commission Rate', severity: 'High', remediation: 'Remove fee fields from client requests; read the rate from the shop record server-side.' },
    guide: 'As a seller, save a product (create or edit) with the hidden field commission=0 added/changed in the POST. The shop\u2019s commission rate is overwritten with your value.' },
  { id: 'stored-xss-desc', feature: F.SELLER, name: 'Stored XSS in product description', owasp: 'A03:2021 Injection (XSS)', difficulty: 'Intermediate',
    hints: ['One field in the whole app is rendered raw while everything else is escaped.', 'It is the field buyers and admins read on every product page.', 'As a seller set a product description to <script>alert(document.cookie)</script> and view the product — it fires for every visitor.'],
    lesson: 'Stored content must be encoded on output; one unescaped field is a persistent script-injection point for all viewers.',
    impact: 'A single malicious listing runs script for every shopper and admin who views it — session theft and admin actions performed in the victim\u2019s browser.',
    report: { title: 'Stored Cross-Site Scripting in Product Description', severity: 'High', remediation: 'Escape descriptions on render (or sanitise with an allowlist); add CSP.' },
    guide: 'As a seller, save a product whose desc is <script>alert(1)</script> (or an <img onerror> payload). The description is stored and rendered unescaped on the product page.' },
  { id: 'unrestricted-upload', feature: F.SELLER, name: 'Unrestricted file upload — stored HTML served from app origin', owasp: 'A03:2021 / A08:2021 Unsafe File Handling', difficulty: 'Intermediate',
    hints: ['The product-image uploader never asks what the file really is.', 'The server picks a Content-Type from the file NAME you give it.', 'Upload a file named promo.html with HTML/JS content, then open it from the product page — it is served as text/html and runs.'],
    lesson: 'Uploads need type allowlists and safe delivery; extension-based content types turn uploads into hosted pages.',
    impact: 'Attackers host phishing pages and script under the marketplace\u2019s own trusted domain — customers see the real URL and believe the fake page.',
    report: { title: 'Unrestricted File Upload Leading to Stored XSS', severity: 'High', remediation: 'Allowlist image types, verify content, random names, serve as attachment from a separate origin.' },
    guide: 'On a product edit page, use the upload form with filename promo.html and any HTML content. It is stored and later served as text/html from /uploads/<id>/promo.html.' },
  { id: 'own-product-review', feature: F.REVIEWS, name: 'Sellers can review their own products', owasp: 'A04:2021 Insecure Design', difficulty: 'Beginner',
    hints: ['Who is allowed to post a review? Is the product\u2019s owner excluded?', 'The review form appears for every logged-in user — including the seller of that very product.', 'As Seller A, post a 5-star review on your own product #1. It publishes under your name.'],
    lesson: 'Review integrity is a business rule the server must enforce — sellers reviewing themselves is fake social proof by design.',
    impact: 'Sellers flood their listings with five-star self-reviews; buyers are misled, honest sellers lose, and the review system stops meaning anything.',
    report: { title: 'Missing Business Rule: Self-Reviews Allowed', severity: 'Medium', remediation: 'Reject reviews where reviewer owns the product; require a verified purchase.' },
    guide: 'Login as a seller, open one of your own products and POST a review. It is published — no rule stops the owner reviewing their own goods.' },
  { id: 'delete-negative-review', feature: F.REVIEWS, name: 'Sellers can delete negative reviews on their products', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Look at the buttons under reviews on your own product page.', 'The delete control is offered to the product\u2019s seller — the very person the review criticises.', 'As Seller A, delete Karim\u2019s 2-star review on product #1. It disappears for everyone.'],
    lesson: 'Moderation power over criticism of yourself is a conflict of interest that must never ship.',
    impact: 'Every bad review can be erased by the seller, so buyers lose their warning system — complaints, returns and chargebacks climb.',
    report: { title: 'Sellers Can Delete Reviews of Their Own Products', severity: 'Medium', remediation: 'Only authors or independent moderators may delete reviews; give sellers a report flow instead.' },
    guide: 'Login as Seller A, open product #1 and POST /reviews/2/delete (Karim\u2019s 2-star review). The seller of the product can delete any review on it.' },
  { id: 'price-tampering', feature: F.CHECKOUT, name: 'Price tampering at checkout', owasp: 'A04:2021 Insecure Design', difficulty: 'Beginner',
    hints: ['The cart page helpfully posts the prices back to the server. In editable fields.', 'Checkout never re-checks them against the catalogue.', 'Edit the hidden total (or price_<id>) in the cart form to 0.01 and check out — the order is created at your price.'],
    lesson: 'Prices are server data; the client may choose items and quantities, never amounts.',
    impact: 'Buyers check out a $64 item for $0.01 while the order looks normal in the system — direct theft that finance only finds by manual reconciliation.',
    report: { title: 'Client-Side Price Trust at Checkout', severity: 'Critical', remediation: 'Recompute all prices and totals server-side from the catalogue at checkout.' },
    guide: 'Add an item to the cart, then POST /checkout with the hidden total field changed (e.g. total=0.01) or a price_<id> field lowered. The order is created at the submitted amount.' },
  { id: 'quantity-tampering', feature: F.CHECKOUT, name: 'Quantity tampering — negative quantities at checkout', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['The cart form also posts a quantity per line. What values does checkout accept?', 'The add-to-cart form clamps quantity — the checkout form does not re-validate it.', 'POST /checkout with qty_<id>=-5 for an item in your cart. The line total goes negative and drags the order total down.'],
    lesson: 'Quantities are money math; every numeric input needs range validation on the server, at the point of use.',
    impact: 'Negative quantities turn an order into a credit — buyers can make expensive baskets cost nothing, or less than nothing.',
    report: { title: 'Missing Quantity Validation at Checkout', severity: 'High', remediation: 'Validate quantity as a positive integer server-side and recompute line totals from the cart.' },
    guide: 'With an item in your cart, POST /checkout adding qty_<productId>=-5 (the cart page posts qty fields you can edit). The server accepts the negative quantity and reduces the total.' },
  { id: 'coupon-reuse', feature: F.CHECKOUT, name: 'Unlimited coupon reuse', owasp: 'A04:2021 Insecure Design', difficulty: 'Beginner',
    hints: ['The app records every coupon use. Does it ever say no?', 'CRAFT10 works on your first checkout. Try it on your second, third…', 'Complete two checkouts with CRAFT10 as the same buyer — the 10% discount applies every single time.'],
    lesson: 'Recording usage without enforcing limits is not a control; promotions are financial rules.',
    impact: 'One leaked code becomes a permanent sitewide discount — a silent 10% margin leak on every order, forever.',
    report: { title: 'Coupon Redemption Limits Not Enforced', severity: 'Medium', remediation: 'Enforce per-user and global redemption caps transactionally at checkout.' },
    guide: 'Checkout twice as the same buyer with coupon CRAFT10. The discount applies both times — usage is logged but never limited. The test passes on the second discounted checkout.' },
  { id: 'order-idor', feature: F.ORDERS, name: 'Order IDOR — view any buyer\u2019s order', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Order URLs are short numbers. What happens when you change one?', 'Your own orders start at /orders/1 — whose are 2 and 3?', 'Login as Ruma and open /orders/2 — Karim\u2019s order, name, email and items are all shown.'],
    lesson: 'Sequential IDs plus a missing ownership check equals full disclosure of every order in the system.',
    impact: 'Every customer\u2019s purchases, name and email are readable by any other customer — a privacy breach and a phishing goldmine.',
    report: { title: 'Insecure Direct Object Reference on Orders', severity: 'High', remediation: 'Scope order reads to the owner (or the selling shop\u2019s own lines); return 404 for others.' },
    guide: 'Login as any buyer and GET /orders/<id of another buyer\u2019s order>, e.g. /orders/2 as Ruma. The full order with the buyer\u2019s name and email is served.' },
  { id: 'fake-sales', feature: F.ORDERS, name: 'Fake sales — payment-free order completion inflates counters', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['Order pages carry a "complete order" link. What does it verify before marking Paid?', 'Nothing — and it also moves the public "sold" numbers.', 'Visit /orders/2/complete repeatedly: the order turns Paid and the product\u2019s sold counter climbs every time.'],
    lesson: 'State changes that move money or reputation must be driven by verified events, not by visiting a URL.',
    impact: 'Anyone can fake purchases to push a product up the best-seller rankings and trigger fulfilment/payouts for orders that never paid.',
    report: { title: 'Unauthenticated Payment State Transition (Fake Sales)', severity: 'High', remediation: 'Change order status only via verified payment webhooks; make completion idempotent and buyer-only.' },
    guide: 'Login as anyone and GET /orders/2/complete. The Pending order becomes Paid and each product\u2019s public sales counter increases — no payment exists anywhere in the flow. Repeat to inflate further.' },
  { id: 'payout-csrf', feature: F.PAYOUT, name: 'Payout-account hijack — no verification, no CSRF token', owasp: 'A01:2021 CSRF / Broken Access Control', difficulty: 'Advanced',
    hints: ['Payout settings change bank details instantly. What proves the request came from the seller\u2019s intent?', 'There is no password re-entry and no anti-CSRF token — a cross-site form can submit it.', 'POST /seller/payout with attacker account details and NO hx_tok token (or a foreign Origin) while logged in as a seller — it applies silently.'],
    lesson: 'Money-movement settings need step-up authentication AND request-intent proof (CSRF tokens).',
    impact: 'A seller who visits the wrong page while logged in has their marketplace payouts silently redirected to an attacker\u2019s bank account.',
    report: { title: 'CSRF on Payout Account Change Without Re-authentication', severity: 'Critical', remediation: 'Require password re-entry + email confirmation for payout changes; verify CSRF tokens on all state-changing forms.' },
    guide: 'While logged in as a seller, POST /seller/payout with new payoutBank/payoutAccount values and no hx_tok field (a cross-site auto-form does exactly this). The payout account changes instantly with no verification.' },
  { id: 'mass-assignment-shop', feature: F.PAYOUT, name: 'Mass assignment on shop settings — forged badges and 0% commission', owasp: 'A03:2021 / API3 Mass Assignment', difficulty: 'Advanced',
    hints: ['The shop-settings endpoint copies more than the form shows.', 'Which shop fields do buyers trust on sight? Badges. Which field does the marketplace live on? Commission.', 'Add verifiedSeller=true&featured=true&commissionRate=0 to the shop-settings POST — all three are applied.'],
    lesson: 'Copying arbitrary request fields onto a model hands clients write access to admin-only attributes.',
    impact: 'A seller becomes "verified" and "featured" and drops their commission to 0% in one request — forged trust signals that directly convert into sales.',
    report: { title: 'Mass Assignment on Shop Settings', severity: 'High', remediation: 'Allowlist editable fields (name, bio); admin-only flags change only via admin endpoints.' },
    guide: 'POST /seller/shop with extra fields verifiedSeller=true, featured=true, commissionRate=0. The endpoint copies them onto your shop — badges and rate change immediately.' },
  { id: 'cookie-role-admin', feature: F.ADMIN, name: 'Role tampering via cookie — full admin access', owasp: 'A01:2021 Broken Access Control / A07:2021', difficulty: 'Beginner',
    hints: ['The admin gate reads something your browser sends. It is not the session.', 'DevTools → Application → Cookies shows two cookies after login. One of them names your powers.', 'Set the role cookie to "admin" (no admin login needed) and open /admin — full dashboard, payout accounts included.'],
    lesson: 'Authorization data must live server-side; anything the client can edit will be edited.',
    impact: 'One forged cookie opens the whole admin dashboard — every seller\u2019s payout bank details, commissions and disputes — with no account at all.',
    report: { title: 'Client-Controlled Role Cookie Grants Admin Access', severity: 'Critical', remediation: 'Read roles from the server-side session/user record only; ignore client-supplied role data.' },
    guide: 'Set a cookie role=admin for the site (DevTools or curl -b) and GET /admin. The gate trusts the cookie, not a server-side session, and serves the full admin dashboard.' },
];
const TEST_BY_ID = Object.fromEntries(TESTS.map((t) => [t.id, t]));
const FEATURES = [...new Set(TESTS.map((t) => t.feature))];

/* ================= PROGRESS STATE (persisted) ================= */
function freshState() { return { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false, flags: {} }; }
let state = freshState();
try {
  if (fs.existsSync(PROGRESS_PATH)) state = Object.assign(freshState(), JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8')));
} catch (e) { state = freshState(); }
function saveState() { try { fs.writeFileSync(PROGRESS_PATH, JSON.stringify(state, null, 2)); } catch (e) {} }
if (!fs.existsSync(PROGRESS_PATH)) saveState();

const loginFails = new Map(); // email -> consecutive failed logins (brute-force detection, runtime only)
function pass(id) {
  if (!TEST_BY_ID[id] || state.tests[id]) return;
  state.tests[id] = true;
  if (TESTS.every((t) => state.tests[t.id])) {
    if (!state.completedAt) state.completedAt = new Date().toISOString();
    state.keyRevealed = true;
  }
  saveState();
}
function attempt(feature) {
  if (!feature) return;
  state.attempts[feature] = (state.attempts[feature] || 0) + 1;
  saveState();
}
function progress() {
  const total = TESTS.length;
  const done = TESTS.filter((t) => state.tests[t.id]).length;
  const features = {};
  for (const f of FEATURES) {
    const ft = TESTS.filter((t) => t.feature === f);
    features[f] = { total: ft.length, done: ft.filter((t) => state.tests[t.id]).length, attempts: state.attempts[f] || 0 };
  }
  return { lab: LAB_NAME, number: LAB_NUMBER, total, done, pct: total ? Math.floor((done / total) * 100) : 0, features, complete: done === total };
}
const XSS_RE = /<script|<svg|<iframe|onerror\s*=|onload\s*=|onclick\s*=|javascript:/i;
const INJ_RE = /'\s*(or|and)\b|'\s*--|'\s*or\s*'|"\s*(or|and)\b/i;

/* ---------------- Helpers ---------------- */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// NOTE (vuln #9): product descriptions are rendered WITHOUT escaping on purpose (stored XSS).

function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
function currentSession(req) {
  const sid = parseCookies(req).sid;
  return sid ? sessions.get(sid) : null;
}
function currentUser(req) {
  const s = currentSession(req);
  return s ? users.find((u) => u.id === s.userId) : null;
}
function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 2e6) req.destroy(); });
    req.on('end', () => resolve(querystring.parse(data)));
  });
}
const money = (n) => '$' + Number(n).toFixed(2);
const shopOf = (id) => shops.find((s) => s.id === Number(id));
const productOf = (id) => products.find((p) => p.id === Number(id));
const userOf = (id) => users.find((u) => u.id === Number(id));

function layout(req, title, body) {
  const u = currentUser(req);
  const s = currentSession(req);
  const cartCount = s ? s.cart.reduce((a, i) => a + i.qty, 0) : 0;
  const nav = u
    ? `<span>Hi, ${esc(u.name)} (${esc(u.role)})</span>
       <a href="/cart">Cart (${cartCount})</a>
       <a href="/orders">My Orders</a>
       ${u.role === 'seller' ? '<a href="/seller">Seller Dashboard</a>' : ''}
       ${u.role === 'admin' ? '<a href="/admin">Admin</a>' : ''}
       <a href="/profile">Profile</a>
       <a href="/logout">Logout</a>`
    : `<a href="/cart">Cart (${cartCount})</a> <a href="/login">Login</a> <a href="/register">Register</a>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)} — HexaCraft</title>
<style>
  body{font-family:Georgia,'Times New Roman',serif;background:#faf6ef;color:#3b2f2f;margin:0}
  header{background:#7a4a21;color:#fdf8f0;padding:14px 24px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px}
  header a{color:#ffd9a0;margin-left:12px;text-decoration:none} header a:hover{text-decoration:underline}
  .brand{font-size:26px;font-weight:bold;letter-spacing:1px} .brand a{color:#fdf8f0;margin:0}
  main{max-width:1020px;margin:24px auto;padding:0 16px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px}
  .card{background:#fff;border:1px solid #e3d5c0;border-radius:10px;padding:14px;box-shadow:0 1px 3px rgba(90,60,20,.08)}
  .card h3{margin:6px 0} .price{color:#a35b14;font-weight:bold;font-size:18px}
  .badge{display:inline-block;background:#efe0c8;border-radius:10px;padding:1px 8px;font-size:12px;margin-right:4px}
  button,.btn{background:#a35b14;color:#fff;border:0;border-radius:6px;padding:8px 14px;cursor:pointer;font-size:14px;text-decoration:none;display:inline-block}
  button:hover,.btn:hover{background:#8a4c10} .danger{background:#b03a2e} .muted{color:#8a7a68;font-size:13px}
  input,select,textarea{width:100%;padding:8px;margin:4px 0 12px;border:1px solid #cbb894;border-radius:6px;box-sizing:border-box;font-family:inherit}
  table{width:100%;border-collapse:collapse;background:#fff} th,td{border:1px solid #e3d5c0;padding:8px;text-align:left;font-size:14px}
  th{background:#f3e8d5} .flash{background:#fdeecd;border:1px solid #e5c15c;padding:10px;border-radius:6px;margin-bottom:14px}
  .stars{color:#d9940d} footer{max-width:1020px;margin:30px auto;padding:0 16px;color:#8a7a68;font-size:12px}
</style></head><body>
<div style="background:#241708;color:#f5e7d0;padding:8px 24px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;font-family:Arial,sans-serif">
  <img src="/logo.png" alt="HexaCyberLab" style="height:30px;background:#fff;border-radius:6px;padding:2px">
  <b>LAB ${LAB_NUMBER} — ${LAB_NAME}</b>
  <span>Progress: ${(() => { const P = progress(); return `${P.done}/${P.total} tests · ${P.pct}%`; })()}</span>
  <span style="flex:1;min-width:120px;background:#4a3520;border-radius:6px;height:12px;overflow:hidden"><span style="display:block;height:100%;width:${progress().pct}%;background:linear-gradient(90deg,#7b5cff,#00c2ff)"></span></span>
  <a href="/tests" style="color:#ffd9a0">Mission / Tests</a>
  ${progress().complete ? '<a href="/complete" style="color:#8affc1">★ Complete!</a>' : ''}
</div>
<header><div class="brand"><a href="/">🧶 HexaCraft</a></div><nav>${nav}</nav></header>
<main>${body}</main>
<footer>HexaCraft practice lab — intentionally vulnerable, synthetic data, local use only.</footer>
${chatWidget()}
</body></html>`;
}

function gatePage(err) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Locked — LAB ${LAB_NUMBER} ${LAB_NAME}</title>
<style>body{font-family:Georgia,serif;background:#faf6ef;color:#3b2f2f;margin:0}main{max-width:560px;margin:60px auto;padding:0 16px}.card{background:#fff;border:1px solid #e3d5c0;border-radius:10px;padding:24px;box-shadow:0 1px 3px rgba(90,60,20,.08)}input{width:100%;padding:10px;margin:8px 0 14px;border:1px solid #cbb894;border-radius:6px;box-sizing:border-box}button{background:#a35b14;color:#fff;border:0;border-radius:6px;padding:10px 18px;cursor:pointer;font-size:15px}.err{background:#fdecea;border:1px solid #e5a19c;padding:10px;border-radius:6px;margin-bottom:12px}</style></head><body>
<main><div class="card" style="text-align:center">
  <img src="/logo.png" alt="HexaCyberLab" style="height:64px">
  <h2>🔒 LAB ${LAB_NUMBER} — ${LAB_NAME}</h2>
  <p>This lab is locked. Paste the completion key from Lab ${LAB_NUMBER - 1} to start.</p>
  ${err ? '<div class="err">Invalid key.</div>' : ''}
  <form method="POST" action="/unlock">
    <input name="key" placeholder="Completion key from Lab ${LAB_NUMBER - 1}" autocomplete="off" required>
    <button>Unlock Lab ${LAB_NUMBER}</button>
  </form>
  <p style="color:#8a7a68;font-size:13px">Finish Lab ${LAB_NUMBER - 1} at 100% to receive its completion key — it appears on that lab's completion page.</p>
</div></main>
${chatWidget()}
</body></html>`;
}
function send(res, code, html, headers = {}) {
  res.writeHead(code, { 'Content-Type': 'text/html; charset=utf-8', ...headers });
  res.end(html);
}
function redirect(res, to, headers = {}) {
  res.writeHead(302, { Location: to, ...headers });
  res.end();
}
function stars(n) { return '<span class="stars">' + '★'.repeat(n) + '☆'.repeat(5 - n) + '</span>'; }


const _cB = ['VUc2UTk='];


const _cC = ['OTM0Ry0=', 'REpIQg=='];
const ENTRY_KEY_SHA256 = '8a7baebd012ab3317eef9f5a90e9828096cbc2bc1be07e715bb5c9147046bf0c';
function entryKeyMatches(given) { const c = require('node:crypto'); const h = c.createHash('sha256').update(String(given == null ? '' : given)).digest('hex'); try { return c.timingSafeEqual(Buffer.from(h), Buffer.from(ENTRY_KEY_SHA256)); } catch (e) { return h === ENTRY_KEY_SHA256; } }
/* Entry key check is hash-only: this lab's source no longer contains its entry key. */
const completionKey = () => _unshard([..._cA, ..._cB, ..._cC]);

/* ---------------- Chatbot ---------------- */
function featureFromText(msg) {
  const m = msg.toLowerCase();
  const table = [
    ['Admin Panel', ['admin']],
    ['Payouts & Shop Settings', ['payout', 'shop setting', 'bank account']],
    ['Cart & Checkout', ['checkout', 'cart', 'coupon', 'quantity', 'price']],
    ['Seller Products', ['product', 'commission', 'upload', 'seller']],
    ['Search & Catalogue', ['search', 'catalogue', 'catalog']],
    ['Login & Authentication', ['login', 'log in', 'password', 'reset token', 'brute', 'enumerat', 'sign in']],
    ['Accounts & Profile', ['profile', 'account', 'register', 'mass assignment']],
    ['Reviews', ['review']],
    ['Orders', ['order']],
  ];
  for (const [f, words] of table) if (words.some((w) => m.includes(w))) return f;
  return null;
}
function chatReply(raw) {
  const msg = String(raw || '');
  const m = msg.toLowerCase();
  const P = progress();
  if (/\b(who|whom)\b.*(built|made|created|build|author|founder)|who built|who made|who created|founder/.test(m)) {
    return "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
  }
  if (/key/.test(m) && /(next|unlock|completion|lab ?8|give|what|tell|show)/.test(m)) {
    if (state.keyRevealed) return `You completed LAB ${LAB_NUMBER} at 100%, so I can share it now: the completion key is ${completionKey()} — paste it into Lab ${LAB_NUMBER + 1} to unlock it.`;
    return `I don't have the completion key yet — it is only revealed to me when this lab is completed 100%. Right now you are at ${P.pct}% (${P.done}/${P.total} tests). Finish every test and the key will appear on the completion page, and I'll be able to share it then too.`;
  }
  if (/progress|score|how am i|status|percent/.test(m)) {
    const next = TESTS.find((t) => !state.tests[t.id]);
    return `You have completed ${P.done} of ${P.total} tests (${P.pct}%). ${next ? `Next open test: "${next.name}" in ${next.feature} — open the Mission page (/tests) for its hints, or ask me about that feature after a few tries.` : 'Everything is done — see /complete for your key and certificate.'}`;
  }
  if (/feature|how many|list|tests|vulnerabilit/.test(m) && !/how (do|to|can)/.test(m)) {
    const f = featureFromText(m);
    if (f) {
      const ts = TESTS.filter((t) => t.feature === f);
      return `${f} has ${ts.length} test(s): ${ts.map((t) => `"${t.name}"${state.tests[t.id] ? ' ✓' : ''}`).join(', ')}. Attempts so far on this feature: ${state.attempts[f] || 0}. Ask me "how do I test ${f}" after you've tried it at least 3 times and I'll walk you through it.`;
    }
    return `LAB ${LAB_NUMBER} — ${LAB_NAME} has ${FEATURES.length} features and ${P.total} tests: ${FEATURES.map((x) => `${x} (${P.features[x].total})`).join(' · ')}. Progress: ${P.done}/${P.total} (${P.pct}%).`;
  }
  if (/how|help|guide|stuck|hint|solve|do i|can i/.test(m)) {
    const f = featureFromText(m);
    if (f) {
      const ts = TESTS.filter((t) => t.feature === f);
      const att = state.attempts[f] || 0;
      const open = ts.filter((t) => !state.tests[t.id]);
      if (!open.length) return `You've already completed every test in ${f}. Well done — ${P.done}/${P.total} overall (${P.pct}%).`;
      if (att >= 3) {
        return `You've put in ${att} attempt(s) on ${f} — here's the guided walkthrough:\n` + open.map((t) => `• ${t.name}: ${t.guide}`).join('\n');
      }
      return `That feature is locked for help. First try the ${f} tests yourself at least 3 times — I can see you've tried ${att} time(s) so far. After 3 real tries, ask me again and I'll guide you step by step. The Mission page (/tests) also has graded hints beside every test.`;
    }
    return `Tell me which feature you're stuck on (e.g. "how do I test Orders?"). Remember my rule: I can only walk you through a feature after you've genuinely tried it at least 3 times — I keep count. The Mission page (/tests) lists every test with hints.`;
  }
  if (/^(hi|hello|hey|yo)\b/.test(m) || /what can you do|who are you/.test(m)) {
    return `Hi! I'm the LAB ${LAB_NUMBER} assistant for ${LAB_NAME}. This lab has ${FEATURES.length} features and ${P.total} security tests; you're at ${P.done}/${P.total} (${P.pct}%). Ask me about a feature ("how many tests in Orders?"), your progress, or — after at least 3 real attempts on a feature — ask "how do I test <feature>" and I'll guide you step by step.`;
  }
  return `I can help with: the feature/test map ("list features"), your progress ("progress"), and step-by-step guidance for a feature once you've tried it at least 3 times ("how do I test Orders?"). Full test list with hints: /tests.`;
}
const CHAT_JS = `<script>
function hxToggleChat(){var p=document.getElementById('hxchat');p.style.display=(p.style.display==='flex')?'none':'flex';}
function hxSendChat(){var i=document.getElementById('hxchatin'),b=document.getElementById('hxchatlog');var v=i.value.trim();if(!v)return;i.value='';
 b.innerHTML+='<div style="text-align:right;margin:6px 0"><span style="background:#a35b14;color:#fff;border-radius:10px;padding:6px 10px;display:inline-block;max-width:85%">'+v.replace(/</g,'&lt;')+'</span></div>';
 fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:v})}).then(function(r){return r.json()}).then(function(d){
 b.innerHTML+='<div style="margin:6px 0"><span style="background:#f3e8d5;border-radius:10px;padding:6px 10px;display:inline-block;max-width:85%;white-space:pre-wrap">'+String(d.reply).replace(/</g,'&lt;')+'</span></div>';b.scrollTop=b.scrollHeight;});}
</script>`;
function chatWidget() {
  return `<button onclick="hxToggleChat()" style="position:fixed;right:18px;bottom:18px;z-index:60;border-radius:24px;padding:12px 18px;box-shadow:0 4px 14px rgba(0,0,0,.3)">💬 Lab Assistant</button>
<div id="hxchat" style="display:none;position:fixed;right:18px;bottom:74px;z-index:60;width:340px;max-width:92vw;height:430px;background:#fff;border:1px solid #cbb894;border-radius:12px;flex-direction:column;box-shadow:0 8px 30px rgba(0,0,0,.3)">
  <div style="background:#7a4a21;color:#fdf8f0;padding:10px 12px;border-radius:12px 12px 0 0"><b>HexaCraft Lab Assistant</b><div style="font-size:12px">Guidance unlocks after 3 real attempts per feature</div></div>
  <div id="hxchatlog" style="flex:1;overflow-y:auto;padding:10px;font-size:13px"></div>
  <div style="display:flex;gap:6px;padding:8px;border-top:1px solid #e3d5c0"><input id="hxchatin" placeholder="Ask about a feature…" style="flex:1;margin:0" onkeydown="if(event.key==='Enter')hxSendChat()"><button onclick="hxSendChat()">Send</button></div>
</div>${CHAT_JS}`;
}

/* ---------------- Server & routes ---------------- */
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${HOST}:${PORT}`);
    const path = url.pathname;
    const method = req.method;
    const user = currentUser(req);
    const session = currentSession(req);
    let m;

    /* ================= LAB SYSTEM ROUTES ================= */
    if (method === 'GET' && path === '/logo.png') {
      try {
        const data = fs.readFileSync(LOGO_PATH);
        res.writeHead(200, { 'Content-Type': 'image/png' });
        return res.end(data);
      } catch (e) { return send(res, 404, 'logo missing'); }
    }
    if (method === 'POST' && path === '/unlock') {
      const body = await readBody(req);
      const given = String(body.key || '').trim();
      if (entryKeyMatches(given)) { state.unlocked = true; saveState(); return redirect(res, '/'); }
      return send(res, 403, gatePage(true));
    }
    if (method === 'GET' && path === '/api/progress') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(state.unlocked ? progress() : { locked: true, lab: LAB_NAME, number: LAB_NUMBER, total: TESTS.length, done: 0, pct: 0 }));
    }
    if (method === 'POST' && path === '/api/chat') {
      let raw = '';
      req.on('data', (c) => { raw += c; });
      return req.on('end', () => {
        let message = '';
        try { message = JSON.parse(raw).message || ''; } catch (e) { message = ''; }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ reply: chatReply(message) }));
      });
    }

    /* ----- Lock gate: every page shows ONLY the gate until unlocked ----- */
    if (!state.unlocked) return send(res, 200, gatePage(false));

    /* ----- Search & catalogue (legacy string-built query — injectable by design) ----- */
    if (method === 'GET' && path === '/search') {
      attempt(F.SEARCH);
      const q = url.searchParams.get('q') || '';
      let rows;
      if (INJ_RE.test(q)) {
        pass('search-sqli');
        rows = products.slice(); // injection: the "query" matches EVERY row, incl. unlisted drafts
      } else {
        rows = products.filter((p) => !p.hidden && p.name.toLowerCase().includes(q.toLowerCase()));
      }
      if (XSS_RE.test(q)) pass('reflected-xss');
      const items = rows.map((p) => `<div class="card"><div class="muted">${esc(shopOf(p.shopId).name)}${p.hidden ? ' · UNLISTED DRAFT' : ''}</div><h3><a href="/products/${p.id}">${esc(p.name)}</a></h3><div class="price">${money(p.price)}</div><div class="muted">${p.salesCount} sold · ${p.stock} in stock</div></div>`).join('');
      // NOTE: the raw search term is echoed into the heading UNESCAPED below -> reflected XSS.
      return send(res, 200, layout(req, 'Search', `<h2>Search results for "${q}"</h2>
        <form method="GET" action="/search"><label>Search the marketplace <input name="q" value="${esc(q)}"></label><button>Search</button></form>
        <div class="grid">${items || '<p class="muted">No products matched.</p>'}</div>`));
    }

    /* ----- Mission page ----- */
    if (method === 'GET' && path === '/tests') {
      const P = progress();
      const sections = FEATURES.map((f) => {
        const ts = TESTS.filter((t) => t.feature === f);
        const rows = ts.map((t, ti) => {
          const done = !!state.tests[t.id];
          const hintLis = t.hints.map((h, hi) => `<div class="hxhint" id="hint-${t.id}-${hi}" style="display:none;margin-top:6px;background:#fdf6e3;border:1px solid #e5c15c;border-radius:6px;padding:8px">💡 Hint ${hi + 1}: ${esc(h)}</div>`).join('');
          return `<div class="card" style="margin-bottom:10px">
            <div>${done ? '✅' : '○'} <b>${esc(t.name)}</b> <span class="badge">${esc(t.owasp)}</span> <span class="badge">${esc(t.difficulty)}</span> ${done ? '<span class="badge" style="background:#cdeecd">COMPLETED</span>' : ''}</div>
            <div class="muted">Feature attempts so far: ${P.features[f].attempts} · Graded hints beside every test — try first, then reveal one at a time.</div>
            <button type="button" onclick="var n=this.parentNode.querySelectorAll('.hxhint:not([data-open])');if(n.length){n[0].style.display='block';n[0].setAttribute('data-open','1');}">Reveal next hint (${t.hints.length})</button>
            ${hintLis}</div>`;
        }).join('');
        return `<h2>${esc(f)} — ${P.features[f].done}/${P.features[f].total} tests</h2>${rows}`;
      }).join('');
      return send(res, 200, layout(req, 'Mission — Tests', `<h2>🎯 Mission — LAB ${LAB_NUMBER} ${LAB_NAME}</h2>
        <div class="flash">Progress: <b>${P.done}/${P.total} tests · ${P.pct}%</b> ${P.complete ? '— LAB COMPLETE! See <a href="/complete">your completion page</a>.' : '— complete every test to reach 100%, reveal the completion key and earn your certificate.'}</div>
        <p class="muted">Tests complete by <b>doing</b> — the lab detects each successful exploit itself. The Lab Assistant (bottom-right) gives step-by-step guidance for a feature only after you've tried that feature at least 3 times.</p>
        ${sections}`));
    }

    /* ----- Completion page ----- */
    if (method === 'POST' && path === '/complete/name') {
      const body = await readBody(req);
      state.testerName = String(body.name || '').slice(0, 60);
      saveState();
      return redirect(res, '/certificate');
    }
    if (method === 'GET' && path === '/complete') {
      const P = progress();
      if (!P.complete) {
        const left = TESTS.filter((t) => !state.tests[t.id]).map((t) => `<li>${esc(t.name)} <span class="muted">(${esc(t.feature)})</span></li>`).join('');
        return send(res, 200, layout(req, 'Completion', `<h2>Completion — not yet</h2>
          <p>You are at <b>${P.done}/${P.total} tests · ${P.pct}%</b>. This page unlocks at 100%.</p>
          <h3>Still to complete</h3><ul>${left}</ul><p><a class="btn" href="/tests">Go to the Mission page</a></p>`));
      }
      const byFeature = FEATURES.map((f) => {
        const ts = TESTS.filter((t) => t.feature === f);
        return `<tr><td>${esc(f)}</td><td>${ts.length}</td><td>${ts.map((t) => esc(t.name)).join('<br>')}</td></tr>`;
      }).join('');
      const techniques = TESTS.map((t) => `<li><b>${esc(t.name)}</b> — ${esc(t.owasp)}</li>`).join('');
      const lessons = TESTS.map((t) => `<li><b>${esc(t.name)}:</b> ${esc(t.lesson)}</li>`).join('');
      const impacts = TESTS.map((t) => `<li><b>${esc(t.name)}:</b> ${esc(t.impact)}</li>`).join('');
      const reports = TESTS.map((t) => `<li><b>${esc(t.report.title)}</b> — Severity: ${esc(t.report.severity)}. Remediation: ${esc(t.report.remediation)}</li>`).join('');
      return send(res, 200, layout(req, 'Lab Complete!', `<h2>🎉 LAB ${LAB_NUMBER} — ${LAB_NAME}: 100% COMPLETE</h2>
        <div class="flash">Every test in this lab is complete. The completion key for Lab ${LAB_NUMBER + 1} is revealed below — it was assembled only now; before completion it existed nowhere whole, not even with the Lab Assistant.</div>
        <h3>1 · What this lab contained</h3>
        <p>This lab had <b>${FEATURES.length} features</b> and <b>${P.total} vulnerabilities/tests</b> in total:</p>
        <table><tr><th>Feature</th><th>Vulnerabilities</th><th>Tests</th></tr>${byFeature}</table>
        <h3>2 · How many ways the testing was done</h3>
        <p>You tested this application in <b>${P.total} different ways</b>:</p><ul>${techniques}</ul>
        <h3>3 · What you learned</h3><ul>${lessons}</ul>
        <h3>4 · What this means for a real client</h3>
        <p>Found on a real client's website, these same flaws would mean:</p><ul>${impacts}</ul>
        <h3>5 · Writing it in a real report</h3><ul>${reports}</ul>
        <h3>6 · Your completion key for Lab ${LAB_NUMBER + 1}</h3>
        <div class="card" style="text-align:center"><div class="muted">Paste this key into Lab ${LAB_NUMBER + 1} to unlock it</div>
        <div style="font-size:24px;font-weight:bold;letter-spacing:2px;margin:10px 0">${completionKey()}</div></div>
        <h3>Your certificate</h3>
        <form method="POST" action="/complete/name">
          <label>Your name for the certificate <input name="name" value="${esc(state.testerName || (user ? user.name : ''))}"></label>
          <button>Save name & view certificate</button></form>
        <p><a class="btn" href="/certificate">View certificate</a></p>`));
    }

    /* ----- Certificate ----- */
    if (method === 'GET' && path === '/certificate') {
      const P = progress();
      if (!P.complete) return redirect(res, '/complete');
      const name = state.testerName || (user ? user.name : 'HexaCraft Tester');
      const date = state.completedAt ? new Date(state.completedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
      return send(res, 200, `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate — LAB ${LAB_NUMBER} ${LAB_NAME}</title>
<style>body{font-family:Georgia,serif;background:#e9e2d2;margin:0;padding:30px}.cert{max-width:760px;margin:20px auto;background:#fffdf7;border:3px solid #a35b14;border-radius:14px;padding:44px;text-align:center;box-shadow:0 6px 30px rgba(90,60,20,.25)}.cert img{height:84px}h1{color:#7a4a21;margin:10px 0}.name{font-size:32px;font-weight:bold;color:#3b2f2f;border-bottom:2px solid #e5c15c;display:inline-block;padding:0 26px 6px;margin:14px 0}.muted{color:#8a7a68}@media print{body{background:#fff;padding:0}.noPrint{display:none}}</style></head><body>
<div class="cert">
  <img src="/logo.png" alt="HexaCyberLab logo">
  <h1>Certificate of Completion</h1>
  <p class="muted">This certifies that</p>
  <div class="name">${esc(name)}</div>
  <p>has completed <b>100%</b> of the security tests in</p>
  <h2 style="margin:6px 0">LAB ${LAB_NUMBER} — ${LAB_NAME}</h2>
  <p>${P.total} tests across ${FEATURES.length} features · Completed ${date}</p>
  <p style="margin-top:26px" class="muted">HexaCyberLab — Built by Md. Jony Hassain, Founder</p>
</div>
<p class="noPrint" style="text-align:center"><a href="/complete">Back to completion page</a> · Use your browser's Print → Save as PDF to keep this certificate.</p>
</body></html>`);
    }

    /* ----- Public catalogue ----- */
    if (method === 'GET' && path === '/') {
      const cards = products.filter((p) => !p.hidden).map((p) => {
        const sh = shopOf(p.shopId);
        return `<div class="card"><div class="muted">${esc(sh.name)} ${sh.verifiedSeller ? '✔ verified' : ''} ${sh.featured ? '⭐ featured' : ''}</div>
          <h3><a href="/products/${p.id}">${esc(p.name)}</a></h3>
          <div class="price">${money(p.price)}</div>
          <div class="muted">${p.salesCount} sold · ${p.stock} in stock</div>
          <form method="POST" action="/cart/add"><input type="hidden" name="productId" value="${p.id}">
          <input type="hidden" name="qty" value="1"><button>Add to cart</button></form></div>`;
      }).join('');
      const shopList = shops.map((s) => `<a href="/shops/${s.id}">${esc(s.name)}</a>`).join(' · ');
      return send(res, 200, layout(req, 'Marketplace', `<h2>Handmade marketplace</h2><p class="muted">Shops: ${shopList}</p>
        <form method="GET" action="/search"><label>Search products <input name="q" placeholder="try: scarf, journal…"></label><button>Search</button></form>
        <div class="grid">${cards}</div>`));
    }

    if (method === 'GET' && (m = path.match(/^\/shops\/(\d+)$/))) {
      const shop = shopOf(m[1]);
      if (!shop) return send(res, 404, layout(req, 'Not found', '<h2>Shop not found</h2>'));
      const items = products.filter((p) => p.shopId === shop.id && !p.hidden)
        .map((p) => `<div class="card"><h3><a href="/products/${p.id}">${esc(p.name)}</a></h3><div class="price">${money(p.price)}</div><div class="muted">${p.salesCount} sold</div></div>`).join('');
      return send(res, 200, layout(req, shop.name, `<h2>${esc(shop.name)} ${shop.verifiedSeller ? '✔' : ''}</h2><p>${esc(shop.bio)}</p><p class="muted">Marketplace commission on this shop: ${shop.commissionRate}%</p><div class="grid">${items}</div>`));
    }

    if (method === 'GET' && (m = path.match(/^\/products\/(\d+)$/))) {
      const p = productOf(m[1]);
      if (!p) return send(res, 404, layout(req, 'Not found', '<h2>Product not found</h2>'));
      const sh = shopOf(p.shopId);
      const rs = reviews.filter((r) => r.productId === p.id);
      const reviewHtml = rs.map((r) => `<div class="card">${stars(r.rating)} <b>${esc(r.author)}</b>
        <p>${esc(r.text)}</p>
        ${user && (user.id === r.userId || (user.role === 'seller' && user.shopId === p.shopId))
          ? `<form method="POST" action="/reviews/${r.id}/delete"><button class="danger">Delete review</button></form>` : ''}
        </div>`).join('') || '<p class="muted">No reviews yet.</p>';
      const imgs = uploads.filter((u) => u.productId === p.id)
        .map((u) => `<div><a href="/uploads/${p.id}/${encodeURIComponent(u.filename)}">${esc(u.filename)}</a></div>`).join('');
      // NOTE (vuln #9): description inserted RAW below -> stored XSS.
      return send(res, 200, layout(req, p.name, `
        <h2>${esc(p.name)}</h2>
        <p class="muted">Sold by <a href="/shops/${sh.id}">${esc(sh.name)}</a> · ${p.salesCount} sold · ${p.stock} in stock</p>
        <div class="price">${money(p.price)}</div>
        <div class="card"><h3>Description</h3><div>${p.desc}</div></div>
        ${imgs ? `<div class="card"><h3>Seller uploads</h3>${imgs}</div>` : ''}
        <form method="POST" action="/cart/add"><input type="hidden" name="productId" value="${p.id}">
          <label>Quantity <input type="number" name="qty" value="1" min="1"></label><button>Add to cart</button></form>
        <h3>Reviews</h3>${reviewHtml}
        ${user ? `<div class="card"><h3>Write a review</h3>
          <form method="POST" action="/products/${p.id}/reviews">
            <label>Rating <select name="rating"><option>5</option><option>4</option><option>3</option><option>2</option><option>1</option></select></label>
            <label>Review <textarea name="text" rows="3"></textarea></label>
            <button>Post review</button></form></div>`
        : '<p><a href="/login">Login</a> to review.</p>'}`));
    }

    /* ----- Reviews ----- */
    if (method === 'POST' && (m = path.match(/^\/products\/(\d+)\/reviews$/))) {
      if (!user) return redirect(res, '/login');
      const p = productOf(m[1]);
      if (!p) return send(res, 404, 'Not found');
      const body = await readBody(req);
      attempt(F.REVIEWS);
      // NOTE (vuln #4): no check that the reviewer OWNS this product -> sellers can review their own products.
      if (user.role === 'seller' && user.shopId === p.shopId) pass('own-product-review');
      reviews.push({ id: ++seq.review, productId: p.id, userId: user.id, author: user.name, rating: Math.min(5, Math.max(1, parseInt(body.rating) || 5)), text: String(body.text || '') });
      return redirect(res, `/products/${p.id}`);
    }
    if (method === 'POST' && (m = path.match(/^\/reviews\/(\d+)\/delete$/))) {
      if (!user) return redirect(res, '/login');
      const r = reviews.find((x) => x.id === Number(m[1]));
      if (!r) return send(res, 404, 'Not found');
      const p = productOf(r.productId);
      // NOTE (vuln #5): the product's SELLER may delete ANY review on their product (incl. negative ones).
      attempt(F.REVIEWS);
      if (user.id === r.userId || (user.role === 'seller' && user.shopId === p.shopId) || user.role === 'admin') {
        if (user.role === 'seller' && user.shopId === p.shopId && r.userId !== user.id) pass('delete-negative-review');
        reviews.splice(reviews.indexOf(r), 1);
      }
      return redirect(res, `/products/${p.id}`);
    }

    /* ----- Stored uploads are served back raw (vuln #11) ----- */
    if (method === 'GET' && (m = path.match(/^\/uploads\/(\d+)\/(.+)$/))) {
      const up = uploads.find((u) => u.productId === Number(m[1]) && u.filename === decodeURIComponent(m[2]));
      if (!up) return send(res, 404, 'Not found');
      const ext = up.filename.split('.').pop().toLowerCase();
      const type = ext === 'html' || ext === 'htm' ? 'text/html' : ext === 'svg' ? 'image/svg+xml' : ext === 'txt' ? 'text/plain' : 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type });
      return res.end(up.content);
    }

    /* ----- Auth ----- */
    if (method === 'GET' && path === '/register') {
      return send(res, 200, layout(req, 'Register', `<h2>Create account</h2>
        <form method="POST" action="/register">
          <label>Name <input name="name" required></label>
          <label>Email <input name="email" type="email" required></label>
          <label>Password <input name="password" type="password" required></label>
          <label>Account type <select name="role"><option value="buyer">Buyer</option><option value="seller">Seller</option></select></label>
          <button>Register</button></form>`));
    }
    if (method === 'POST' && path === '/register') {
      const body = await readBody(req);
      attempt(F.AUTH);
      // NOTE: no password policy at all — even a 1-character password is accepted.
      if (String(body.password || '').length < 6) pass('weak-password-policy');
      if (users.some((u) => u.email === body.email)) return send(res, 400, layout(req, 'Register', '<p>Email already registered.</p>'));
      const role = body.role === 'seller' ? 'seller' : 'buyer';
      const nu = { id: ++seq.user, name: String(body.name || 'New user'), email: String(body.email), password: String(body.password), role, shopId: null };
      if (role === 'seller') {
        const ns = { id: shops.length + 1, ownerId: nu.id, name: nu.name + "'s Shop", bio: '', commissionRate: 12, verifiedSeller: false, featured: false, payoutBank: '', payoutAccount: '', payoutName: nu.name };
        shops.push(ns); nu.shopId = ns.id;
      }
      users.push(nu);
      return redirect(res, '/login');
    }
    if (method === 'GET' && path === '/login') {
      return send(res, 200, layout(req, 'Login', `<h2>Login</h2>
        <form method="POST" action="/login">
          <label>Email <input name="email" type="email" required></label>
          <label>Password <input name="password" type="password" required></label>
          <button>Login</button></form>
        <p><a href="/forgot">Forgot password?</a></p>
        <div class="card"><b>Test accounts</b><br>admin@hexacraft.local / Admin@123<br>
        shopa@hexacraft.local, shopb@hexacraft.local, shopc@hexacraft.local / Seller@123<br>
        ruma@hexacraft.local / User@123</div>`));
    }
    if (method === 'POST' && path === '/login') {
      const body = await readBody(req);
      attempt(F.AUTH);
      const startSession = (u) => {
        const sid = crypto.randomBytes(16).toString('hex');
        sessions.set(sid, { userId: u.id, cart: [], csrfTok: crypto.randomBytes(8).toString('hex') });
        // NOTE (vuln #10): role is ALSO mirrored into a client cookie that /admin trusts.
        return redirect(res, '/', { 'Set-Cookie': [`sid=${sid}; Path=/; HttpOnly`, `role=${u.role}; Path=/`] });
      };
      // NOTE: legacy lookup path — the email is glued into a query string, so an
      // injection tautology "matches" the first row (the admin) and logs in as them.
      if (INJ_RE.test(String(body.email || '')) || INJ_RE.test(String(body.password || ''))) {
        pass('sqli-login');
        return startSession(users[0]);
      }
      const acct = users.find((x) => x.email === body.email);
      if (!acct) {
        state.flags.enumUnknown = true; saveState();
        if (state.flags.enumKnown && state.flags.enumUnknown) pass('user-enumeration');
        return send(res, 401, layout(req, 'Login', '<p>No account with that email.</p>'));
      }
      if (acct.password !== body.password) {
        state.flags.enumKnown = true; saveState();
        if (state.flags.enumKnown && state.flags.enumUnknown) pass('user-enumeration');
        const n = (loginFails.get(acct.email) || 0) + 1;
        loginFails.set(acct.email, n);
        if (n >= 10) pass('brute-force'); // the 10th failure is still processed — nothing throttles it
        return send(res, 401, layout(req, 'Login', '<p>Wrong password.</p>'));
      }
      loginFails.delete(acct.email);
      return startSession(acct);
    }
    if (method === 'GET' && path === '/logout') {
      const sid = parseCookies(req).sid;
      if (sid) sessions.delete(sid);
      return redirect(res, '/', { 'Set-Cookie': ['sid=; Path=/; Max-Age=0', 'role=; Path=/; Max-Age=0'] });
    }

    /* ----- Password reset with PREDICTABLE token (vuln #12) ----- */
    if (method === 'GET' && path === '/forgot') {
      return send(res, 200, layout(req, 'Forgot password', `<h2>Forgot password</h2>
        <form method="POST" action="/forgot"><label>Email <input name="email" type="email" required></label><button>Send reset link</button></form>`));
    }
    if (method === 'POST' && path === '/forgot') {
      const body = await readBody(req);
      attempt(F.AUTH);
      const u = users.find((x) => x.email === body.email);
      if (!u) {
        state.flags.enumUnknown = true; saveState();
        if (state.flags.enumKnown && state.flags.enumUnknown) pass('user-enumeration');
        return send(res, 200, layout(req, 'Forgot password', '<p>If that email exists, a reset link was sent.</p>'));
      }
      state.flags.enumKnown = true; saveState();
      if (state.flags.enumKnown && state.flags.enumUnknown) pass('user-enumeration');
      // NOTE (vuln #12): token is a deterministic hash of the email alone — anyone can compute it.
      const token = crypto.createHash('md5').update(u.email).digest('hex').slice(0, 8);
      return send(res, 200, layout(req, 'Forgot password', `<div class="flash">Lab note: in a real app this link is emailed. Reset link: <a href="/reset?email=${encodeURIComponent(u.email)}&token=${token}">/reset?email=${esc(u.email)}&token=${token}</a></div>`));
    }
    if (method === 'GET' && path === '/reset') {
      const email = url.searchParams.get('email') || '';
      return send(res, 200, layout(req, 'Reset password', `<h2>Reset password</h2>
        <form method="POST" action="/reset">
          <input type="hidden" name="email" value="${esc(email)}">
          <input type="hidden" name="token" value="${esc(url.searchParams.get('token') || '')}">
          <label>New password <input name="password" type="password" required></label>
          <button>Set new password</button></form>`));
    }
    if (method === 'POST' && path === '/reset') {
      const body = await readBody(req);
      const u = users.find((x) => x.email === body.email);
      const expected = u ? crypto.createHash('md5').update(u.email).digest('hex').slice(0, 8) : null;
      if (!u || body.token !== expected) return send(res, 400, layout(req, 'Reset password', '<p>Invalid reset token.</p>'));
      u.password = String(body.password);
      pass('predictable-reset'); // the only way in is the deterministic md5(email) token
      return redirect(res, '/login');
    }

    /* ----- Buyer profile ----- */
    if (method === 'GET' && path === '/profile') {
      if (!user) return redirect(res, '/login');
      return send(res, 200, layout(req, 'Profile', `<h2>Profile & settings</h2>
        <form method="POST" action="/profile">
          <input type="hidden" name="hx_tok" value="${esc(session ? session.csrfTok || '' : '')}">
          <label>Display name <input name="name" value="${esc(user.name)}"></label>
          <label>Email <input value="${esc(user.email)}" disabled></label>
          <label>Role <input value="${esc(user.role)}" disabled></label>
          <button>Save</button></form>`));
    }
    if (method === 'POST' && path === '/profile') {
      if (!user) return redirect(res, '/login');
      const body = await readBody(req);
      attempt(F.ACCT);
      const roleBefore = user.role;
      if (body.name) user.name = String(body.name);
      // NOTE: mass assignment — every extra submitted field is copied onto the user
      // record too, including ones the form never offered (role, shopId, ...).
      for (const k of Object.keys(body)) {
        if (['id', 'email', 'password', 'name', 'hx_tok'].includes(k)) continue;
        user[k] = body[k];
      }
      if (body.role !== undefined && user.role !== roleBefore) pass('mass-assignment-profile');
      return redirect(res, '/profile');
    }

    /* ----- Cart & checkout ----- */
    if (method === 'POST' && path === '/cart/add') {
      if (!session) return redirect(res, '/login');
      const body = await readBody(req);
      attempt(F.CHECKOUT);
      const p = productOf(body.productId);
      if (p) {
        const line = session.cart.find((i) => i.productId === p.id);
        const qty = Math.max(1, parseInt(body.qty) || 1);
        if (line) line.qty += qty; else session.cart.push({ productId: p.id, qty });
      }
      return redirect(res, '/cart');
    }
    if (method === 'GET' && path === '/cart') {
      if (!session) return redirect(res, '/login');
      const rows = session.cart.map((i) => {
        const p = productOf(i.productId);
        return `<tr><td>${esc(p.name)}</td><td>${i.qty}</td><td>${money(p.price)}</td><td>${money(p.price * i.qty)}</td></tr>`;
      }).join('');
      const total = session.cart.reduce((a, i) => a + productOf(i.productId).price * i.qty, 0);
      // NOTE (vuln #7): unit prices, QUANTITIES and total are posted back as hidden fields and TRUSTED at checkout.
      const hidden = session.cart.map((i) => {
        const p = productOf(i.productId);
        return `<input type="hidden" name="price_${p.id}" value="${p.price}"><input type="hidden" name="qty_${p.id}" value="${i.qty}">`;
      }).join('') + `<input type="hidden" name="total" value="${total.toFixed(2)}">`;
      return send(res, 200, layout(req, 'Cart', `<h2>Your cart</h2>
        ${session.cart.length ? `<table><tr><th>Item</th><th>Qty</th><th>Unit price</th><th>Line total</th></tr>${rows}</table>
        <p><b>Total: ${money(total)}</b></p>
        <form method="POST" action="/checkout">${hidden}
          <label>Coupon code <input name="coupon" placeholder="CRAFT10"></label>
          <button>Checkout</button></form>` : '<p>Your cart is empty.</p>'}`));
    }
    if (method === 'POST' && path === '/checkout') {
      if (!session || !user) return redirect(res, '/login');
      const body = await readBody(req);
      attempt(F.CHECKOUT);
      // NOTE (vuln #7): prices taken from the submitted form, never re-checked against the catalogue.
      const items = session.cart.map((i) => {
        const qtySubmitted = body['qty_' + i.productId] !== undefined ? parseInt(body['qty_' + i.productId]) : i.qty;
        const priceSubmitted = parseFloat(body['price_' + i.productId]);
        if (!isNaN(priceSubmitted) && priceSubmitted !== productOf(i.productId).price) pass('price-tampering');
        if (!isNaN(qtySubmitted) && qtySubmitted !== i.qty) pass('quantity-tampering');
        return { productId: i.productId, qty: isNaN(qtySubmitted) ? i.qty : qtySubmitted, price: isNaN(priceSubmitted) ? 0 : priceSubmitted };
      });
      if (body.total !== undefined) {
        const honestTotal = session.cart.reduce((a, i) => a + productOf(i.productId).price * i.qty, 0);
        if (Math.abs(parseFloat(body.total) - honestTotal) > 0.001) pass('price-tampering');
      }
      let total = parseFloat(body.total) || items.reduce((a, i) => a + i.price * i.qty, 0);
      let couponNote = '';
      if (body.coupon) {
        const c = coupons.find((x) => x.code === String(body.coupon).toUpperCase());
        if (c) {
          // NOTE (vuln #13): coupon use is recorded but NEVER limited — same buyer can reuse it forever.
          if (couponUses.some((x) => x.code === c.code && x.userId === user.id)) pass('coupon-reuse');
          couponUses.push({ code: c.code, userId: user.id, at: Date.now() });
          total = total * (1 - c.percent / 100);
          couponNote = ` (coupon ${c.code} -${c.percent}% applied)`;
        }
      }
      const order = { id: ++seq.order, buyerId: user.id, items, total: Math.round(total * 100) / 100, status: 'Pending', coupon: body.coupon || null };
      orders.push(order);
      session.cart = [];
      return send(res, 200, layout(req, 'Order placed', `<div class="flash">Order #${order.id} placed — total charged: ${money(order.total)}${esc(couponNote)}. Status: Pending payment. <a href="/orders/${order.id}">View order</a></div>`));
    }

    /* ----- Orders ----- */
    if (method === 'GET' && path === '/orders') {
      if (!user) return redirect(res, '/login');
      const mine = orders.filter((o) => o.buyerId === user.id);
      const rows = mine.map((o) => `<tr><td><a href="/orders/${o.id}">#${o.id}</a></td><td>${money(o.total)}</td><td>${esc(o.status)}</td></tr>`).join('');
      return send(res, 200, layout(req, 'My orders', `<h2>My orders</h2><table><tr><th>Order</th><th>Total</th><th>Status</th></tr>${rows || '<tr><td colspan="3">No orders yet.</td></tr>'}</table>`));
    }
    if (method === 'GET' && (m = path.match(/^\/orders\/(\d+)$/))) {
      if (!user) return redirect(res, '/login');
      const o = orders.find((x) => x.id === Number(m[1]));
      if (!o) return send(res, 404, 'Not found');
      // NOTE (vuln #8): NO ownership check — any logged-in user can view ANY order by ID (IDOR).
      attempt(F.ORDERS);
      if (o.buyerId !== user.id && user.role !== 'admin') pass('order-idor');
      const buyer = userOf(o.buyerId);
      const rows = o.items.map((i) => {
        const p = productOf(i.productId);
        return `<tr><td>${esc(p ? p.name : 'Product ' + i.productId)}</td><td>${i.qty}</td><td>${money(i.price)}</td></tr>`;
      }).join('');
      return send(res, 200, layout(req, 'Order #' + o.id, `<h2>Order #${o.id}</h2>
        <p class="muted">Buyer: ${esc(buyer ? buyer.name : '?')} (${esc(buyer ? buyer.email : '')}) · Status: <b>${esc(o.status)}</b> · Total: ${money(o.total)}</p>
        <table><tr><th>Item</th><th>Qty</th><th>Price paid</th></tr>${rows}</table>
        <p><a class="btn" href="/orders/${o.id}/complete">Simulate payment / complete order</a></p>`));
    }
    if (method === 'GET' && (m = path.match(/^\/orders\/(\d+)\/complete$/))) {
      if (!user) return redirect(res, '/login');
      const o = orders.find((x) => x.id === Number(m[1]));
      if (!o) return send(res, 404, 'Not found');
      // NOTE (vuln #6): no payment verification at all — hitting this URL marks the order Paid
      // and bumps each product's public sales counter, every single time it is called.
      attempt(F.ORDERS);
      pass('fake-sales');
      o.status = 'Paid';
      o.items.forEach((i) => { const p = productOf(i.productId); if (p) { p.salesCount += i.qty; p.stock = Math.max(0, p.stock - i.qty); } });
      return redirect(res, `/orders/${o.id}`);
    }

    /* ----- Seller area ----- */
    if (path.startsWith('/seller')) {
      if (!user) return redirect(res, '/login');
      if (user.role !== 'seller') return send(res, 403, layout(req, 'Forbidden', '<h2>Sellers only.</h2>'));
      const shop = shopOf(user.shopId);

      if (method === 'GET' && path === '/seller') {
        const mine = products.filter((p) => p.shopId === shop.id);
        const myOrders = orders.filter((o) => o.items.some((i) => mine.some((p) => p.id === i.productId)));
        const gross = myOrders.filter((o) => o.status === 'Paid').reduce((a, o) => a + o.items.filter((i) => mine.some((p) => p.id === i.productId)).reduce((x, i) => x + i.price * i.qty, 0), 0);
        const commission = gross * shop.commissionRate / 100;
        const rows = mine.map((p) => `<tr><td>${p.id}</td><td><a href="/products/${p.id}">${esc(p.name)}</a></td><td>${money(p.price)}</td><td>${p.stock}</td><td>${p.salesCount}</td>
          <td><a href="/seller/products/${p.id}/edit">Edit</a> · <form method="POST" action="/seller/products/${p.id}/delete" style="display:inline"><button class="danger">Delete</button></form></td></tr>`).join('');
        return send(res, 200, layout(req, 'Seller dashboard', `<h2>Seller dashboard — ${esc(shop.name)}</h2>
          <p>${shop.verifiedSeller ? '✔ Verified seller' : 'Not verified'} ${shop.featured ? '· ⭐ Featured shop' : ''}</p>
          <div class="grid">
            <div class="card"><h3>Sales (paid)</h3><p class="price">${money(gross)}</p></div>
            <div class="card"><h3>Marketplace commission (${shop.commissionRate}%)</h3><p class="price">${money(commission)}</p></div>
            <div class="card"><h3>You receive</h3><p class="price">${money(gross - commission)}</p></div>
            <div class="card"><h3>Payout account</h3><p>${esc(shop.payoutBank)} · ${esc(shop.payoutAccount)}</p><a href="/seller/payout">Payout settings</a></div>
          </div>
          <p><a class="btn" href="/seller/products/new">+ Add product</a> <a class="btn" href="/seller/shop">Shop settings</a></p>
          <h3>My products</h3><table><tr><th>ID</th><th>Name</th><th>Price</th><th>Stock</th><th>Sold</th><th>Actions</th></tr>${rows}</table>
          <h3>Orders containing my products</h3>
          <table><tr><th>Order</th><th>Total</th><th>Status</th></tr>${myOrders.map((o) => `<tr><td><a href="/orders/${o.id}">#${o.id}</a></td><td>${money(o.total)}</td><td>${esc(o.status)}</td></tr>`).join('') || '<tr><td colspan="3">None yet.</td></tr>'}</table>`));
      }

      if (method === 'GET' && path === '/seller/products/new') {
        return send(res, 200, layout(req, 'Add product', `<h2>Add product</h2>
          <form method="POST" action="/seller/products">
            <label>Name <input name="name" required></label>
            <label>Price (USD) <input name="price" type="number" step="0.01" required></label>
            <label>Stock <input name="stock" type="number" value="10"></label>
            <label>Description <textarea name="desc" rows="4"></textarea></label>
            <!-- marketplace fee for this listing -->
            <input type="hidden" name="commission" value="${shop.commissionRate}">
            <button>Create product</button></form>`));
      }
      if (method === 'POST' && path === '/seller/products') {
        const body = await readBody(req);
        attempt(F.SELLER);
        // NOTE (vuln #2): the per-product commission is read from a hidden form field the seller controls.
        if (body.commission !== undefined && parseFloat(body.commission) !== shop.commissionRate) pass('commission-tampering');
        if (XSS_RE.test(String(body.desc || ''))) pass('stored-xss-desc');
        const p = { id: products.length ? Math.max(...products.map((x) => x.id)) + 1 : 1, shopId: shop.id,
          name: String(body.name || 'Untitled'), price: parseFloat(body.price) || 0, stock: parseInt(body.stock) || 0,
          salesCount: 0, desc: String(body.desc || ''), commissionRate: body.commission !== undefined ? parseFloat(body.commission) : null, images: [] };
        products.push(p);
        return redirect(res, '/seller');
      }
      if (method === 'GET' && (m = path.match(/^\/seller\/products\/(\d+)\/edit$/))) {
        const p = productOf(m[1]);
        if (!p) return send(res, 404, 'Not found');
        // NOTE (vuln #1): no ownership check — the form loads ANY seller's product.
        return send(res, 200, layout(req, 'Edit product', `<h2>Edit product #${p.id}</h2>
          <form method="POST" action="/seller/products/${p.id}/edit">
            <label>Name <input name="name" value="${esc(p.name)}"></label>
            <label>Price (USD) <input name="price" type="number" step="0.01" value="${p.price}"></label>
            <label>Stock <input name="stock" type="number" value="${p.stock}"></label>
            <label>Description <textarea name="desc" rows="4">${esc(p.desc)}</textarea></label>
            <input type="hidden" name="commission" value="${p.commissionRate ?? shopOf(p.shopId).commissionRate}">
            <button>Save changes</button></form>
          <h3>Upload a product file</h3>
          <form method="POST" action="/seller/products/${p.id}/image">
            <label>File name <input name="filename" placeholder="photo.jpg or promo.html"></label>
            <label>File content <textarea name="content" rows="4" placeholder="Paste file contents here (lab upload simulation)"></textarea></label>
            <button>Upload</button></form>`));
      }
      if (method === 'POST' && (m = path.match(/^\/seller\/products\/(\d+)\/edit$/))) {
        const p = productOf(m[1]);
        if (!p) return send(res, 404, 'Not found');
        const body = await readBody(req);
        attempt(F.SELLER);
        if (p.shopId !== user.shopId) pass('seller-product-idor');
        if (body.commission !== undefined && parseFloat(body.commission) !== shopOf(p.shopId).commissionRate) pass('commission-tampering');
        if (XSS_RE.test(String(body.desc || ''))) pass('stored-xss-desc');
        // NOTE (vuln #1 + #2): ANY seller can save ANY product, and the hidden commission field is trusted.
        if (body.name !== undefined) p.name = String(body.name);
        if (body.price !== undefined) p.price = parseFloat(body.price) || 0;
        if (body.stock !== undefined) p.stock = parseInt(body.stock) || 0;
        if (body.desc !== undefined) p.desc = String(body.desc);
        if (body.commission !== undefined) { p.commissionRate = parseFloat(body.commission); shopOf(p.shopId).commissionRate = parseFloat(body.commission); }
        return redirect(res, '/seller');
      }
      if (method === 'POST' && (m = path.match(/^\/seller\/products\/(\d+)\/delete$/))) {
        const p = productOf(m[1]);
        attempt(F.SELLER);
        // NOTE (vuln #1): delete also skips the ownership check.
        if (p && p.shopId !== user.shopId) pass('seller-product-idor');
        if (p) products.splice(products.indexOf(p), 1);
        return redirect(res, '/seller');
      }
      if (method === 'POST' && (m = path.match(/^\/seller\/products\/(\d+)\/image$/))) {
        const p = productOf(m[1]);
        if (!p) return send(res, 404, 'Not found');
        const body = await readBody(req);
        attempt(F.SELLER);
        // NOTE (vuln #11): ANY file type/content accepted, stored and later served raw (see /uploads).
        const fn = String(body.filename || 'file.txt');
        const ext = fn.split('.').pop().toLowerCase();
        if (['html', 'htm', 'svg', 'php', 'jsp', 'asp', 'aspx'].includes(ext) || /<script|<html/i.test(String(body.content || ''))) pass('unrestricted-upload');
        uploads.push({ productId: p.id, filename: fn, content: String(body.content || '') });
        return redirect(res, `/seller/products/${p.id}/edit`);
      }

      if (method === 'GET' && path === '/seller/payout') {
        return send(res, 200, layout(req, 'Payout settings', `<h2>Payout settings</h2>
          <p class="muted">Payouts are sent to this account. Current: ${esc(shop.payoutBank)} · ${esc(shop.payoutAccount)} · ${esc(shop.payoutName)}</p>
          <form method="POST" action="/seller/payout">
            <input type="hidden" name="hx_tok" value="${esc(session ? session.csrfTok || '' : '')}">
            <label>Bank name <input name="payoutBank" value="${esc(shop.payoutBank)}"></label>
            <label>Account number <input name="payoutAccount" value="${esc(shop.payoutAccount)}"></label>
            <label>Account holder <input name="payoutName" value="${esc(shop.payoutName)}"></label>
            <button>Save payout account</button></form>`));
      }
      if (method === 'POST' && path === '/seller/payout') {
        const body = await readBody(req);
        attempt(F.PAYOUT);
        // NOTE (vuln #3): payout account changes instantly — no password re-entry, no email
        // confirmation, and the form's hx_tok token is NEVER verified -> a malicious page
        // (a cross-site auto-submitting form carries no token) can change it silently.
        const foreignOrigin = req.headers.origin && !String(req.headers.origin).includes(`${HOST}:${PORT}`);
        if (body.hx_tok !== (session ? session.csrfTok : undefined) || foreignOrigin) pass('payout-csrf');
        shop.payoutBank = String(body.payoutBank || '');
        shop.payoutAccount = String(body.payoutAccount || '');
        shop.payoutName = String(body.payoutName || '');
        return redirect(res, '/seller/payout');
      }

      if (method === 'GET' && path === '/seller/shop') {
        return send(res, 200, layout(req, 'Shop settings', `<h2>Shop settings</h2>
          <form method="POST" action="/seller/shop">
            <label>Shop name <input name="name" value="${esc(shop.name)}"></label>
            <label>Bio <textarea name="bio" rows="3">${esc(shop.bio)}</textarea></label>
            <button>Save</button></form>
          <p class="muted">Badges: verifiedSeller = ${shop.verifiedSeller}, featured = ${shop.featured} (admin-managed).</p>`));
      }
      if (method === 'POST' && path === '/seller/shop') {
        const body = await readBody(req);
        attempt(F.PAYOUT);
        // NOTE (vuln #14): mass assignment — EVERY submitted field is copied onto the shop,
        // including admin-only flags like verifiedSeller, featured and commissionRate.
        if (['verifiedSeller', 'featured', 'commissionRate'].some((k) => k in body)) pass('mass-assignment-shop');
        for (const k of Object.keys(body)) {
          if (k === 'id' || k === 'ownerId') continue;
          let v = body[k];
          if (v === 'true') v = true; else if (v === 'false') v = false;
          else if (!isNaN(parseFloat(v)) && String(v).trim() !== '') v = parseFloat(v);
          shop[k] = v;
        }
        return redirect(res, '/seller/shop');
      }
    }

    /* ----- Admin ----- */
    if (path.startsWith('/admin')) {
      attempt(F.ADMIN);
      // NOTE (vuln #10): admin access is decided by the client-controlled "role" cookie.
      const roleCookie = parseCookies(req).role;
      if (roleCookie !== 'admin') return send(res, 403, layout(req, 'Forbidden', '<h2>Admins only.</h2>'));
      if (!user || user.role !== 'admin') pass('cookie-role-admin');
      if (method === 'GET' && path === '/admin') {
        const paidGross = orders.filter((o) => o.status === 'Paid').reduce((a, o) => a + o.total, 0);
        const estCommission = orders.filter((o) => o.status === 'Paid').reduce((a, o) => a + o.items.reduce((x, i) => {
          const p = productOf(i.productId); if (!p) return x;
          return x + i.price * i.qty * (p.commissionRate ?? shopOf(p.shopId).commissionRate) / 100;
        }, 0), 0);
        const sellerRows = shops.map((s) => {
          const owner = userOf(s.ownerId);
          return `<tr><td>${esc(s.name)}</td><td>${esc(owner ? owner.email : '')}</td><td>${s.commissionRate}%</td><td>${s.verifiedSeller ? '✔' : '—'}</td><td>${s.featured ? '⭐' : '—'}</td><td>${esc(s.payoutBank)} · ${esc(s.payoutAccount)}</td></tr>`;
        }).join('');
        const orderRows = orders.map((o) => `<tr><td><a href="/orders/${o.id}">#${o.id}</a></td><td>${esc(userOf(o.buyerId)?.email || '')}</td><td>${money(o.total)}</td><td>${esc(o.status)}</td></tr>`).join('');
        const disputeRows = disputes.map((dsp) => `<tr><td>#${dsp.id}</td><td>Order ${dsp.orderId}</td><td>${esc(dsp.openedBy)}</td><td>${esc(dsp.reason)}</td><td>${esc(dsp.status)}</td></tr>`).join('');
        return send(res, 200, layout(req, 'Admin', `<h2>Admin dashboard</h2>
          <div class="grid">
            <div class="card"><h3>Paid GMV</h3><p class="price">${money(paidGross)}</p></div>
            <div class="card"><h3>Commission earned (est.)</h3><p class="price">${money(estCommission)}</p></div>
            <div class="card"><h3>Sellers</h3><p class="price">${shops.length}</p></div>
            <div class="card"><h3>Open disputes</h3><p class="price">${disputes.filter((x) => x.status === 'Open').length}</p></div>
          </div>
          <h3>All sellers & commissions</h3><table><tr><th>Shop</th><th>Owner</th><th>Commission</th><th>Verified</th><th>Featured</th><th>Payout account</th></tr>${sellerRows}</table>
          <h3>All orders</h3><table><tr><th>Order</th><th>Buyer</th><th>Total</th><th>Status</th></tr>${orderRows}</table>
          <h3>Disputes</h3><table><tr><th>ID</th><th>Order</th><th>Opened by</th><th>Reason</th><th>Status</th></tr>${disputeRows}</table>`));
      }
    }

    return send(res, 404, layout(req, 'Not found', '<h2>404 — page not found</h2>'));
  } catch (err) {
    // Lab must stay stable on bad input.
    try { send(res, 500, 'Internal error (lab caught it): ' + esc(err.message)); } catch (_) {}
  }
});

server.listen(PORT, HOST, () => {
  console.log(`HexaCraft lab running at http://${HOST}:${PORT} (intentionally vulnerable — local only)`);
});
