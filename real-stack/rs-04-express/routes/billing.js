const express = require('express');
const { getDb } = require('../app/db');
const auth = require('../app/auth');
const progress = require('../app/progress');
const config = require('../app/config');
const { logEvent } = require('../app/log');
const layout = require('../app/layout');
const views = require('../app/views');
const router = express.Router();
const sleep = ms => new Promise(r => setTimeout(r, ms));

router.get('/billing', auth.requireLogin, (req, res) => {
  res.send(layout.head('Billing', req.user) + views.billing(req.user, '') + layout.foot());
});
/* Coupon redemption, written the way it ships in real SaaS:
   1. check "has this user redeemed this code?"  2. a slow call to the
   payment gateway  3. record + credit. Check and act are not atomic and
   there is no unique constraint — two requests inside the gateway window
   both pass the check and both get paid. */
router.post('/billing/redeem', auth.requireLogin, async (req, res) => {
  const db = getDb();
  const code = String(req.body.code || '').trim().toUpperCase();
  if (code !== config.couponCode) {
    return res.send(layout.head('Billing', req.user) + views.billing(req.user, 'That coupon code is not valid.') + layout.foot());
  }
  const already = db.prepare('SELECT COUNT(*) c FROM redemptions WHERE user_id = ? AND code = ?').get(req.user.id, code).c;
  await sleep(150); // "verifying with the payment gateway" — the race window
  db.prepare("INSERT INTO redemptions (user_id,code,amount,created) VALUES (?,?,?,datetime('now'))").run(req.user.id, code, config.couponAmount);
  db.prepare('UPDATE users SET credits = credits + ? WHERE id = ?').run(config.couponAmount, req.user.id);
  const total = db.prepare('SELECT COUNT(*) c FROM redemptions WHERE user_id = ? AND code = ?').get(req.user.id, code).c;
  if (total >= 2) progress.pass('race-coupon'); // the same one-per-user coupon paid out twice
  req.user = auth.userById(req.user.id);
  logEvent(req, `COUPON ${code} redeemed (total for user: ${total})`);
  res.send(layout.head('Billing', req.user) + views.billing(req.user,
    already >= 1 ? `Coupon applied again — ${config.couponAmount} more credits. (One-per-user, the page said…)` : `Coupon applied: +${config.couponAmount} credits.`) + layout.foot());
});
module.exports = router;
