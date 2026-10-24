# Lesson 10 — Retainers and Recurring Revenue

*Unlocked by completing Category 10 at 100%. Business Skills ladder, step 10 of 11.*

One-off audits pay bills. Recurring revenue builds a business. The difference between a freelancer who hunts for work every month and a practice with a waiting list is usually this lesson: turning a finished engagement into an ongoing security relationship with the same client.

## Why clients want this (your pitch is their problem)

Applications are not static. Your client ships new features monthly, adds integrations, hires developers, changes infrastructure. The application you certified in March is not the application running in September — its security decays by itself. Smart clients feel this. Your retainer offer simply names it and prices it:

- **New code reintroduces old bug classes.** The IDOR you fixed in one module returns in the next feature, written by a developer who never read your report.
- **Their customers keep asking.** Enterprise buyers send security questionnaires every quarter. "We test continuously, here is our cadence" is a stronger answer than one old report.
- **Fixing early is cheap.** A flaw found in a monthly check costs an afternoon. The same flaw found after a breach costs a company.

Sell the decay problem and the cadence — never fear.

## Retainer structures that work

**1. Scheduled retest cycles.** A fixed rhythm of testing tied to their release pattern: for example, a focused retest of new/changed features every quarter, plus one full-scope test annually. Fixed dates, fixed price per cycle. This is the easiest retainer to sell because it is just Lesson 08's retest, productized and scheduled.

**2. Security check-in retainer (advisory hours).** A small monthly block of your time — a few hours — for: reviewing security questions from their customers, advising developers on a fix approach, sanity-checking a new feature's design before it ships. Low effort per month, high perceived value, and it keeps you inside their world when big needs arise.

**3. Monitoring and hygiene checks.** Periodic lightweight checks between full tests: SSL/configuration review, exposed-file and subdomain checks, dependency and patch posture, re-verification that old critical fixes are still in place. Define exactly what the check is and is not (it is not a pentest) — Lesson 02's clarity applies to retainers too.

**4. Retest-as-you-fix.** For clients in active development: an open arrangement where each significant release gets a targeted mini-assessment at a pre-agreed per-release rate.

Combine them: many mature client relationships are (1) + (2), with (3) quarterly.

## How to propose it — timing and framing

**Timing:** at the delivery meeting (Lesson 08), when the value of your work is at its most visible, and again briefly in the retest closing note. Never in the first sales conversation — retainers are bought on experienced trust, not promised trust.

**Framing that works:**

> "This report covers the application as it stands today. Your team ships new features every month — that's where risk creeps back in. Most of my clients handle it with a quarterly retest of whatever changed, plus a full test once a year. Fixed price, scheduled in advance, and your customers get a current answer whenever they ask about security. Want me to put that structure in writing?"

**Pricing logic:** retainer cycles price like Lesson 03 (days × rate), with a modest continuity benefit for the client — a slightly better rate or priority scheduling — in exchange for committed, predictable work for you. Predictability is worth a small discount; it is not worth a large one. State the term (for example 12 months), the review point, and how either side exits (notice period, e.g., 30 days). Written, signed, invoiced on the same calm system as Lesson 09 (monthly or per-cycle, in advance).

## Delivering retainer value without scope rot

- Every cycle produces a short written artifact: findings or a clean bill with what was checked. No silent months — a client paying monthly must *see* the work monthly.
- Track the application's change story: features added, areas retested, recurring bug classes. After a year, this trend view ("authorization flaws down 70% since we started") becomes your most powerful renewal argument — and Lesson 11 material, with client confidentiality intact.
- Guard the boundary: retainer hours are for the defined services. A full new application is a new scoped engagement (Lesson 02), quoted separately. Generosity is fine; undefined generosity is how retainers become losses.

## Checklist

- [ ] I can explain the security-decay problem in two sentences, without fear tactics
- [ ] I offer at least two concrete structures (retest cycles; advisory check-ins) with written terms
- [ ] I propose retainers at delivery/retest — after trust is earned, never as a hard sell upfront
- [ ] Every retainer cycle produces a visible written artifact
- [ ] Retainer boundaries are written: what is included, what is a separate engagement, how to exit

Next on the ladder: [Lesson 11 — Building Your Brand](11-building-your-brand.md).
