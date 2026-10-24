# Lesson 06 — Running the Engagement

*Unlocked by completing Category 06 at 100%. Business Skills ladder, step 6 of 11.*

The paperwork is signed (Lesson 05), the scope is written (Lesson 02), the price is agreed (Lesson 03). Now you actually test. Running an engagement professionally is mostly invisible discipline: how you start, how you record, how you communicate, and what you do in the one moment that matters most — when you find something critical.

## Kickoff

Never start by opening a terminal. Start with a short kickoff call or written confirmation covering:

- **Scope reconfirmed** — the exact targets, environments, and out-of-scope list, read back to the client. Surprises get cheaper the earlier they surface.
- **Access verified** — test accounts received and working, VPN or allow-listing arranged (your IP added to their firewall/WAF exceptions if needed), API documentation in hand.
- **Environment stability** — confirm no major deploys are planned mid-test; a moving target wastes everyone's money. If they deploy anyway, note it in your log.
- **Communication channel and cadence** — one channel (email thread or shared channel), who receives updates, and when (see below).
- **Emergency path** — if testing appears to degrade production, who do you call, and do you stop first and call second? Answer in advance: **stop first, call second.**

Then send a one-paragraph written summary of the kickoff. Paper trails are a habit, not a chore.

## Evidence discipline

Your notes are the report before the report exists (Lesson 07). For every potential finding, capture at the moment you find it:

- The exact request and response (Burp history, curl output) — not a paraphrase.
- Screenshots or output showing the *effect*: the other user's invoice on screen, the price changed at checkout, the admin panel reached.
- Timestamp, account used, role, and the exact steps to reproduce, numbered.
- Impact reasoning while it is fresh: what data, how much, whose.

Rules that separate professionals from hobbyists:

- **Minimum proof.** Demonstrate the flaw with the least real data possible. To prove an IDOR exposes customer records, one or two records — ideally test accounts — is proof. Downloading ten thousand is a breach, not a test.
- **Never destroy or alter real data.** If a test requires modification, use your own test records. If you accidentally affect something real: stop, note it, tell the client the same day.
- **One working log.** A single chronological testing log (date, time, area tested, result) makes the report writable and proves diligence if questions ever arise.

## Communication cadence

Silence makes clients anxious; noise makes you cheap. A rhythm that works for a typical one-to-two-week engagement:

- **Day 1:** "Testing has started; access is working; first areas covered are X."
- **Mid-point:** short status — areas covered, areas remaining, any blockers (missing access, unstable environment). Do not dump raw findings here; half-verified findings cause panic and rework.
- **Critical findings:** immediately (next section).
- **End of testing:** "Testing is complete; report lands on [date]; retest window is [dates]."

Every update answers three questions: what is done, what is next, what (if anything) you need from them.

## The critical moment: a serious finding mid-test

Mid-test you find unauthenticated access to the customer database, or a live payment bypass. This is where professionalism is decided. Protocol:

1. **Verify once, carefully.** Reproduce it minimally. Make sure it is real and not a honeypot, a test fixture, or your misunderstanding. Capture the evidence compactly.
2. **Stop expanding.** Do not keep exploring the hole "to see how deep it goes." You have proof. Deeper digging adds risk, not value.
3. **Notify the same day — immediately for the worst cases.** Contact the agreed person through the agreed channel. State: what you found, what it exposes, that you have stopped at minimum proof, and your recommended immediate mitigation (e.g., "take this endpoint offline or put it behind authentication today").
4. **Follow up in writing.** Even if you called, send the summary by email. Verbal warnings evaporate; written ones protect the client and you.
5. **Adjust the plan together.** The client may pause testing to fix, or ask you to continue elsewhere. Either is fine — get the decision in writing and note the scope/timeline effect.

A special case: **evidence of an existing breach** (someone else's webshell, unknown admin accounts, data already exfiltrated). Stop testing that area, preserve what you observed without disturbing it, and notify immediately. That is now an incident, not a finding — it goes beyond your scope and possibly to their incident-response people. Do not investigate it on your own initiative.

Handled this way, a critical finding becomes the moment a client decides you are the only tester they will ever hire. Handled casually — screenshot posted in a group chat, discovery mentioned a week later in the report — it becomes the reason they never call again.

## Checklist

- [ ] Kickoff done and summarized in writing before testing starts
- [ ] Every finding logged with raw evidence, steps, timestamp, and role at the moment of discovery
- [ ] Minimum-proof and no-real-data-damage rules respected throughout
- [ ] Status rhythm kept: start, midpoint, criticals immediately, close
- [ ] Critical finding protocol: verify → stop → notify same day → written follow-up → written plan adjustment

Next on the ladder: [Lesson 07 — Writing the Report](07-writing-the-report.md).
