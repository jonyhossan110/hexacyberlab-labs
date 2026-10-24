# Burp Suite Guide — Testing the HexaCyberLab Labs Like a Professional

Most working penetration testers do the majority of their web testing in one tool: **Burp Suite**. The browser shows you what an application *wants* you to see; Burp shows you what is actually being sent and received — and lets you change it. This guide takes you from zero (never opened Burp) to confidently running the core Burp workflow against your local HexaCyberLab labs.

You will use Burp against labs running on **your own machine**, e.g. HexaShop at `http://127.0.0.1:3000`. Everything in this guide is written for that local, legal practice setup.

---

## 1. What Burp Suite is

Burp Suite, made by PortSwigger, is an **intercepting proxy** and testing toolkit for web applications. It sits between your browser and the web app:

```
Browser  →  Burp Suite  →  Web application
```

Every request and response passes through Burp first. That gives you superpowers a normal browser doesn't:

- **See** every request exactly as it leaves the browser (headers, cookies, parameters, JSON).
- **Pause and edit** a request before it reaches the server — change a price, an ID, a role.
- **Replay** a request as many times as you like, with small changes each time (Repeater).
- **Automate** hundreds of variations of a request (Intruder) — password guessing, ID enumeration, fuzzing.
- **Decode/encode** values (Base64, URL encoding, JWTs) and **compare** two responses side by side.

### Community vs Professional — which do you need?

| | Community Edition | Professional |
|---|---|---|
| Price | **Free** | Paid (per user, per year) |
| Proxy, Repeater, Decoder, Comparer | ✅ Full | ✅ Full |
| Intruder | ✅ Works, but **deliberately speed-limited (throttled)** | ✅ Full speed |
| Vulnerability scanner, extensions | Limited / none | ✅ Full |

**For these labs, Community Edition is enough.** Every technique in this guide — and every Burp-based test in the programme — works in the free edition. The one thing you will feel is Intruder: Community throttles attack speed on purpose, so a 1,000-password attack runs slowly. For learning, that is fine — you are watching *how* it works, not racing. Professionals upgrade mainly for the scanner, extensions, and unthrottled Intruder.

---

## 2. Installing Burp Suite

1. Go to the official PortSwigger download page: **https://portswigger.net/burp/downloads**
2. Choose **Burp Suite Community Edition** and your operating system:
   - **Windows** — download the installer (`.exe`) and run it. 
   - **macOS** — download the `.dmg`, open it, and drag Burp Suite into Applications.
   - **Linux** — download the `.sh` installer, make it executable (`chmod +x burpsuite_community_linux_*.sh`) and run it (a `.jar` "standalone" version also exists).
3. The installers **bundle their own Java runtime** — you do **not** need to install Java separately.
4. Launch Burp. On first run, accept the terms, choose **Temporary project**, and **Use Burp defaults** for the configuration. You don't need to change anything yet.

> Only ever download Burp from portswigger.net. "Cracked" copies floating around the internet are a classic way to get malware installed on your own machine.

---

## 3. First-run setup

### Check the proxy listener

Burp's proxy listens, by default, at **`127.0.0.1:8080`**. Confirm it under **Proxy → Proxy settings → Proxy listeners** — you should see `127.0.0.1:8080` ticked as *Running*. Leave this as it is.

### Option A (recommended): use Burp's built-in browser

This is by far the easiest path, and the one to use for these labs:

1. In Burp, go to the **Proxy** tab.
2. Click **Open browser** (in newer versions this is under **Proxy → Intercept**, an "Open browser" button).

A special Chromium window opens. **Everything in that browser is already proxied through Burp** — no settings, no certificates, no extensions. Just type your lab's address (e.g. `http://127.0.0.1:3000`) and browse.

### Option B: your normal browser + FoxyProxy + CA certificate

If you prefer your everyday browser:

1. Install the **FoxyProxy** extension (Firefox/Chrome) and add a proxy: `127.0.0.1`, port `8080`, then switch it on while testing.
2. **CA certificate:** to proxy **HTTPS** sites without browser warnings, Burp must be able to decrypt TLS, which requires installing Burp's CA certificate into your browser/OS. With the proxy on, visit `http://burpsuite` in your browser, click **CA Certificate**, download `cacert.der`, and import it into your browser's certificate store (Firefox: Settings → Privacy & Security → Certificates → View Certificates → Import; Chrome uses the OS store: on Windows, double-click the file and install it into *Trusted Root Certification Authorities*).

> **Honest note for these labs:** the HexaCyberLab labs are served over **plain HTTP on localhost** — there is no TLS to decrypt. So for the labs themselves, the CA certificate is **not strictly required**; your browser will happily proxy `http://127.0.0.1:3000` through Burp without it. The certificate matters when you move on to real **HTTPS** websites (with proper authorisation, in real engagements). Install it anyway if you plan to keep learning — it takes two minutes and you'll need it for everything beyond these labs.

---

## 4. The core workflow with a lab

This is the loop you will repeat hundreds of times across the programme. Learn it once; it applies to every lab.

1. **Start the lab.** In a terminal:
   ```bash
   cd 01-ecommerce-retail/hexashop
   node server.js
   ```
2. **Open the lab in Burp's browser** (`http://127.0.0.1:3000`) and click around — log in, view pages, use features normally first. Understanding the normal flow is what lets you spot the abnormal one.
3. **Proxy → Intercept:** click **Intercept on** and perform an action (submit a form, click a link). The request appears, frozen, in the Intercept tab. Read it. Edit it if you want. Click **Forward** to let it go, **Drop** to kill it. Turn intercept **off** when you just want to browse freely — requests are still recorded.
4. **Proxy → HTTP history:** every request/response pair is logged here, intercept or not. Click any row to inspect it. This is your flight recorder.
5. **Send to Repeater:** find an interesting request in HTTP history (or the Intercept tab), **right-click → Send to Repeater**. In the **Repeater** tab you can edit *anything* — URL, parameters, headers, cookies, body — and click **Send** to fire it again, as many times as you like, comparing responses. This is where most manual testing happens.
6. **Send to Intruder:** right-click a request → **Send to Intruder** when you want to automate many variations of it (password lists, ID ranges, payload lists). Mark the variable parts as positions, load a payload, and start the attack.
7. **Decoder:** paste any encoded value (Base64, URL-encoded, hex) and decode it — or encode your own payloads. Essential for cookies and tokens.
8. **Comparer:** load two responses (or requests) and Comparer highlights exactly what differs — perfect for "did changing this one thing change the result?"

**Scoring note:** the labs detect exploits server-side, by their real effect. It doesn't matter whether the winning request came from the browser, Repeater, or Intruder — do the exploit through Burp and the lab's progress moves exactly the same.

---

## 5. Worked example 1 — IDOR with Repeater (HexaShop orders)

**The bug:** HexaShop never checks that an order actually belongs to the person asking for it (Insecure Direct Object Reference / broken access control).

1. Start HexaShop and open it in Burp's browser.
2. Log in as **Alice** — `alice@test.local` / `alice123` (demo accounts are printed on the lab's login page).
3. Open **Orders** (My Orders). Alice owns orders **#1** and **#2**. Click order #2 — behind the scenes the browser requests `GET /api/orders/2`, and the JSON response contains Alice's order.
4. In Burp, go to **Proxy → HTTP history**, find the `GET /api/orders/2` request, **right-click → Send to Repeater**.
5. In Repeater, change the URL to:
   ```
   GET /api/orders/3
   ```
   and click **Send**.
6. **Look at the response.** Order #3 is **Bob's** order — his items, his total, his delivery details — returned to Alice's session without any complaint from the server. You never logged in as Bob; the server simply never asked "does this order belong to you?"

**What "proof" looks like:** a response, in *your* (Alice's) session, containing data that belongs to a *different* user, obtained by changing nothing but the ID. That request/response pair from Repeater is exactly what you would paste into a real penetration-test report as evidence. Try the web-page twins too — `/order/3`, `/invoice/3` — and watch the lab's IDOR test score.

---

## 6. Worked example 2 — Login brute force with Intruder (HexaShop)

**The bug:** HexaShop's login has no rate limiting and no lockout — you can guess passwords forever.

1. In Burp's browser, go to HexaShop's login page and submit a deliberately wrong login for Bob: email `bob@test.local`, password `wrongpass`. (First make sure **Intercept is off**, so the request goes through and gets recorded.)
2. In **Proxy → HTTP history**, find `POST /login`, **right-click → Send to Intruder**.
3. In **Intruder → Positions**, Burp auto-marks variables with `§...§`. Clear all positions (select all → **Clear §**), then select **only the password value** (`wrongpass`) in the body and click **Add §**. Leave the attack type as **Sniper** (one position, one payload set).
4. Go to **Payloads**, choose payload type **Simple list**, and add a short practice list, one per line:
   ```
   password
   123456
   letmein
   bob123
   ```
   (In real work you'd load a wordlist file; a tiny list keeps this fast and clear.)
5. Click **Start attack**. A results window opens. Watch two columns:
   - **Status** — failed logins return the login page again (HTTP 200 with the form). 
   - **Length** — nearly identical for every failure… except one row. The correct password produces a **different response**: a redirect (302) to the logged-in area and a noticeably different length. That odd-one-out row is your hit — here, `bob123`.
6. Confirm manually: log in through the browser with the found password. You're in as Bob. The lab's brute-force test scores.

> **Community Edition reality check:** Intruder in the free edition is intentionally throttled — attacks run at a trickle, and Burp reminds you of this. That's acceptable here: your list is 4 passwords, not 4 million. On a real engagement you'd do exactly this on Professional, with a proper wordlist — and the defence you'd recommend (rate limiting, lockout, MFA) is the one HexaShop deliberately lacks.

---

## 7. Worked example 3 — Price tampering (HexaShop checkout)

**The bug:** HexaShop's checkout form carries the prices and total in **hidden form fields** — and the server trusts whatever the browser sends back.

1. In Burp's browser, log in (any demo account), add any product to the cart — say a $69 item — and go to **Checkout**. The page shows your total and a *Place Order* button.
2. In Burp, go to **Proxy → Intercept** and turn **Intercept on**.
3. Back in the browser, click **Place Order**. The request freezes in Burp's Intercept tab:
   ```
   POST /checkout
   …&total=69.00&price_0=69&name_0=…&qty_0=1&…
   ```
4. Edit the values before the server sees them: change `total=69.00` to `total=1.00` and `price_0=69` to `price_0=1`.
5. Click **Forward** (keep forwarding until the browser moves again, then turn Intercept off).
6. The browser lands on **"Order Placed!"** — and your order history now shows the order with a **$1 total** for a $69 product. The server never recomputed the price from its own database; it billed whatever the form claimed.

The same flaw exists at **Add to Cart**: the product form also sends a hidden `price` field with `POST /cart/add`. Intercept that request instead and the cart itself is built at your price. In a real report this is a business-logic / price-manipulation finding — and the fix (recompute all prices server-side) is exactly what the lab's `FIX-AND-RETEST.md` walks you through.

---

## 8. Which Burp tool for which lab test?

| Lab test type | Best Burp tool | Why |
|---|---|---|
| **IDOR / broken access control** | Repeater | Change one ID at a time by hand and read each response carefully — judgement, not volume. |
| **Login brute force / credential stuffing** | Intruder | Automates a password list against one field; watch Status/Length for the odd one out. |
| **SQL injection** | Repeater (+ Intruder for fuzzing) | Repeater lets you craft and refine payloads step by step, watching errors change; Intruder can spray a payload list to find a working one. |
| **Stored / reflected XSS** | Proxy Intercept + Repeater | Intercept to plant the payload exactly where you want it; Repeater to re-send and confirm it stored/executed. |
| **Price / business-logic tampering** | Proxy Intercept | The attack *is* editing one live request (price, total, quantity, coupon) before it reaches the server. |
| **JWT tampering** | Repeater + Decoder | Decoder (and the JSON Web Token handling) to read/alter token claims, Repeater to replay the forged token. |
| **Cookie / session tampering** | Repeater + Decoder | Decode the cookie, change the role/user value, re-encode, replay — e.g. HexaShop's role cookie. |
| **File upload bypass** | Repeater | Take one real upload request and mutate it — extension, content-type, filename — faster than re-uploading through the UI each time. |
| **Path traversal** | Repeater | Step `../` sequences one at a time and watch the response change as you escape the uploads folder. |
| **SSRF** | Repeater | Swap the target URL parameter repeatedly and compare responses/timing to map what the server will fetch. |
| **CSRF** | Repeater (to study the request) | First read a state-changing request in Repeater: is there an anti-CSRF token at all? That absence is the finding. |
| **Enumeration (users, IDs, coupons)** | Intruder | Lists and number ranges are Intruder's home turf; sort results by Length to spot the valid entries. |
| **Response comparison (any test)** | Comparer | "Did my change actually matter?" — Comparer shows the exact byte-level difference between two responses. |

---

## 9. Troubleshooting

**"My browser traffic isn't appearing in Burp."**
- If you use the **built-in browser** (Open browser), this should never happen — use it whenever in doubt.
- With your own browser: check FoxyProxy is actually **switched on** and points at `127.0.0.1:8080`, and that Burp's listener is *Running* (Proxy → Proxy settings).
- **The localhost trap:** several browsers and proxy extensions **bypass the proxy for localhost/127.0.0.1 by default** ("don't proxy local addresses"). That means lab traffic goes direct and Burp sees nothing. In FoxyProxy, make sure no bypass/exclusion rule covers `127.0.0.1` or `localhost`; in Firefox's manual proxy settings, clear `127.0.0.1, localhost` from the **No proxy for** box.

**"Burp says the port is already in use (8080)."**
Another application is holding port 8080. Either close that application, or change Burp's listener to e.g. `127.0.0.1:8081` (Proxy → Proxy settings → Edit listener) — and update your browser/FoxyProxy to the same port so both ends agree.

**"The lab page won't load at all."**
Check the lab is actually running: the terminal where you ran `node server.js` should still be open with no crash, and the address must be right — HexaShop is `http://127.0.0.1:3000`, and every other lab has its **own** port (HexaFashion `3010`, HexaSaaS `3020`, HexaAPI `3030`, HexaAI `3040`, … see the main README's port tables). A very common slip is browsing the *previous* lab's port.

**"Every request hangs / the page spins forever."**
**Intercept is on** and Burp is holding your request hostage in the Intercept tab. Forward it — or turn Intercept off.

**"I get certificate warnings on other (HTTPS) sites."**
That's the CA certificate from §3 not being installed/trusted yet. It does not affect the labs (plain HTTP), but install the cert if you want to browse HTTPS sites through Burp.

---

## 10. Ethics and safety — non-negotiable

Burp Suite is a professional security tool, and the skills in this guide are real offensive skills. Use them **only** on:

- **Your local HexaCyberLab labs** — your machine, your copies; and
- Systems you **own**, or systems you have **explicit, written authorisation** to test (a signed scope, a bug-bounty programme whose rules cover what you're doing).

Testing systems without authorisation is illegal in most countries — no matter how curious you are or how harmless it feels. Keep the labs on `127.0.0.1`, never deploy a lab publicly, and never point Burp at a stranger's website "just to look". Professional testers are defined by authorisation and scope, not by tools.

---

*Next steps: pick the lab you're working on, open its `VULNERABILITIES.md`, and for each test ask: "Which Burp tool fits this?" — the table in §8 is your starting answer. Happy (legal) hacking.*
