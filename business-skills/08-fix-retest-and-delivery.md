# Lesson 08 — Fix, Retest, and Delivery

*Unlocked by completing Category 08 at 100%. Business Skills ladder, step 8 of 11.*

A report sitting in an inbox fixes nothing. The engagement is only finished when the client has fixed the findings, you have verified the fixes, and both sides have closed the work properly. This closing phase — done well — is the single biggest source of repeat business and retainers (Lesson 10). Done badly (report dumped, silence), it is where client relationships go to die.

## The retest: what it is

A retest is a focused verification pass: for each finding in the report, you re-run the original proof and determine whether the vulnerability is actually gone. Your original engagement terms (Lessons 03 and 05) define it — typically: one retest round included, requested within a set window (for example 30–60 days after report delivery), covering the reported findings.

Set those terms before the engagement, not during an argument after it.

## The retest workflow

1. **Client signals readiness.** They send a list: which findings they believe are fixed, which are pending, which they accept as risk. Get this in writing — it becomes the retest scope.
2. **You re-run the exact original tests.** Same accounts, same requests, same evidence standard as Lesson 06. A fix claim is not evidence; your retest is.
3. **Judge each finding into one of three states:**
   - **Fixed** — the original exploit fails, and the fix is the right kind of fix (server-side check), not a cosmetic block (hiding the button while the API still leaks is not fixed).
   - **Partially fixed** — the specific instance is closed but the same pattern survives elsewhere (the classic: invoice IDOR fixed, order IDOR untouched). Say so precisely, with the surviving example.
   - **Not fixed** — the exploit still works. Report it plainly, without blame; fixes fail for ordinary reasons — wrong layer, wrong endpoint, deployment lag.
4. **Check for regressions and by-products.** Fixes sometimes break features or introduce new issues at the edges of the changed code. A light pass around the changed areas is part of a real retest.
5. **Issue a retest report or an updated findings table:** finding → status → evidence. Short, exact, dated. Many clients show this document to *their* customers as proof of remediation — write it so it can be shown.

## What "verified fixed" really requires

Developers often fix the *symptom you demonstrated* rather than the *flaw you described*. Your job is to test the flaw class, briefly, wherever it was reported: if the report said "apply ownership checks across ID-based endpoints," then spot-check the sibling endpoints, not only the one in your screenshot. This is why Lesson 07 insists remediation text describe the pattern, not just the instance — the retest then has a standard to verify against.

If a client disputes a "not fixed" result, respond with evidence, not ego: the request, the response, the timestamp. Evidence ends arguments (Lesson 06's discipline pays off here).

## The delivery meeting

Close with a walkthrough call (30–45 minutes), not an email attachment:

- **Lead with the story:** what you tested, the overall picture, the top risks — five minutes, business language (Lesson 07's executive summary, spoken).
- **Walk the critical and high findings** with evidence on screen. Let their developer ask "how exactly?" — precise answers here build the trust that produces referrals.
- **Agree the fix order** using the remediation roadmap, and realistic dates.
- **Explain the retest:** what is included, the window, how to request it, what "fixed" will be judged against.
- **Name the next step beyond this engagement** — only if genuine: a retest date, a future re-test of the next release, a check-in in six months. You are planting Lesson 10's seed, not hard-selling.

Send a short written summary after the call: decisions, fix order, retest date. Same paper-trail habit as the kickoff (Lesson 6).

## Closing professionally

- Deliver final documents (report + retest report) in their final form, through the agreed channel — these contain sensitive detail; treat transmission accordingly.
- Confirm what happens to engagement data: you retain the report and authorization per your agreement; test data and credentials are handed back or deleted as agreed. Say it in the closing note.
- Final invoice per the agreed terms (Lesson 09) — attached to the closing message, not floating separately weeks later.
- Thank them specifically: name what their team did well (fast fixes, good questions). Specific gratitude is remembered; generic thanks is not.
- Log the engagement in your own records: scope, dates, findings count, retest result, payment received. This log becomes Lesson 11's proof-of-work material — without ever exposing client details.

## Checklist

- [ ] Retest terms were defined in the proposal — before anyone needed them
- [ ] Every finding retested with the original method and judged: fixed / partial / not fixed
- [ ] "Fixed" means the flaw pattern is closed, not just the demonstrated instance
- [ ] Retest results issued as a clean, dated, showable document
- [ ] Delivery walkthrough held; closing summary, final invoice, and data-handling note sent

Next on the ladder: [Lesson 09 — Getting Paid](09-getting-paid.md).
