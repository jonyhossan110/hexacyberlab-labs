# RS-03 — HexaPress: WordPress-Style Blog

**Real Stack Milestone 03** (after core Lab 30) · PHP 8 · WordPress-style
core + 2 plugins · PDO/SQLite · multi-file

A believable travel blog, *WanderPress*, running on **HexaPress** — a small
WordPress-*style* core (not real WordPress) with `wp-login.php`, a wp-admin
dashboard, a `/wp-json` REST API, an `xmlrpc.php` endpoint, author archives,
and two custom plugins written by a freelancer in 2022. Twelve scored
security tests, detected server-side as you perform them — and, as on real
WordPress sites, almost all of them live in the plugins and the leftovers,
not in the core.

## Run it

Through the Hexa Gateway (recommended): start RS-03 from the dashboard.
Standalone:

```bash
php -S 127.0.0.1:3203 -t public router.php
# open http://localhost:3203
```

Needs only PHP 8+ (with `pdo_sqlite`). The database (`data.sqlite`) is
created and seeded on first run. Delete `data.sqlite` + `progress.json` to
reset (or use the gateway's Reset button).

## Seeded accounts

| Role | Email | Password |
|---|---|---|
| Administrator | elena@wanderpress.example | Summit!Admin24 |
| Editor | mateo.rossi@example.it | Dolomiti#7 |
| Author | priya.nair@example.in | Monsoon!9 |
| Contributor | diego.fuentes@example.es | Andes!Pass2 |
| Subscriber | liam.oconnor@example.ie | Emerald!5 |

…plus more authors and subscribers in the seed. New registrations are
subscribers. Passwords are stored in **plaintext** — one of the site's many
problems, and fair game for your report.

## Layout (the point of a real-stack lab)

```
router.php            dev-server router (wp-content handling, uploads
                      execution — classic Apache multi-extension behaviour)
public/index.php      front controller — every dynamic request lands here
public/readme.html    announces the exact core version (test: debug-log)
wp-config.php         DB password + salts in plain text, WP_DEBUG true
wp-content/debug.log  the site's PHP debug log, web-readable (test: debug-log)
wp-content/uploads/   media uploads land here — and code can run here
wp-content/plugins/hexa-contact/   contact form: AJAX search (SQLi),
                                   settings page (CSRF, no nonce)
wp-content/plugins/hexa-gallery/  [badge] shortcode (stored XSS),
                                   template include (LFI)
app/config.php        site config (version, debug on)
app/db.php            PDO + schema + realistic seed data
app/auth.php          session helpers   app/layout.php   page chrome + lab bar
app/progress.php      the lab's scoring (progress.json, same shape as core labs)
app/log.php           application log — read it on the Logs page afterwards
app/prefs.php         the HexaPress_Prefs gadget class (__wakeup)
app/rest.php          /wp-json routes (users route overshares — REST exposure)
app/xmlrpc.php        multicall credential checking, no lockout (brute force)
app/ajax.php          admin-ajax dispatcher
app/pages/…           home, post, author, contact, gallery, wp-login,
                      register, wp-admin, profile
app/lab/…             brief, tests, guide, code review, logs, complete + report
.env                  the file the gallery LFI must never reach
```

## The 12 tests

Plugin AJAX SQL injection · plugin stored XSS via shortcode · plugin LFI ·
media upload extension bypass · author-archive user enumeration · XML-RPC
multicall brute force · REST API email/slug exposure · plugin settings CSRF ·
debug.log + version disclosure · subscriber-to-admin role trust · PHP object
injection via serialized cookie · one professional mini-report.

Work **black-box first**; the Code Review page is your second pass.
