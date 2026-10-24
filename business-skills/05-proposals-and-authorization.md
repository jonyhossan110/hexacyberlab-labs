# Lesson 05 — Proposals and Authorization

*Unlocked by completing Category 05 at 100%. Business Skills ladder, step 5 of 11.*

This is the lesson that keeps you out of legal trouble and gets you hired over cheaper competitors. Two documents live here: the **proposal** (why a client says yes) and the **authorization letter** (why what you do next is legal). Master both.

*This lesson teaches professional practice, not law. Contract and computer-misuse law differs by country — have a local lawyer review your documents before your first paid engagement.*

## The proposal

A proposal converts the discovery call (Lesson 04) into a decision. Keep it short — two to four pages. Clients are busy; clarity is persuasion. Structure:

1. **Situation** — two or three sentences in the client's own terms: what the application does, why they are testing now (their trigger from the discovery call), what is at stake. This proves you listened.
2. **Scope summary** — what will be tested, environments, roles, and what is excluded. Summarize Lesson 02's document; attach the full scope.
3. **Approach** — how you test: manual testing guided by OWASP methodology, business-logic and access-control focus, the tools supporting (not replacing) human testing. One short paragraph. Clients buy method and judgment, not a tool list.
4. **Deliverables** — the report (Lesson 07), the fix-and-retest cycle (Lesson 08), the delivery walkthrough. Name them, with dates.
5. **Timeline** — start date, testing window, report date, retest window.
6. **Price** — the fixed number or tier from Lesson 03, what it includes, payment terms (Lesson 09: deposit, balance on delivery).
7. **Assumptions and client responsibilities** — accounts, access, a reachable contact, a stable environment during testing.
8. **Next step** — "Sign the authorization letter and return it with the deposit, and your testing window is reserved." One clear action.

What a proposal never contains: fear-mongering, guarantees of findings ("we will find critical vulnerabilities!"), or claims about past clients you cannot make. Confidence and specifics sell; hype repels serious buyers.

## The authorization letter — the document that makes it legal

Authorization is the written permission from the system owner that turns "hacking" into "testing." Without it, the exact same actions can be a criminal offense in most jurisdictions — regardless of good intentions, regardless of what was said on a call. **Verbal permission is not permission. An email saying "sounds good" from someone without authority is not permission.**

The letter (sometimes called a permission letter or rules-of-engagement authorization) is signed by a person with legal authority over the target systems — a founder, CTO, or officer of the owning company — and contains:

- **The parties:** client legal name, tester legal name/business.
- **The targets:** the exact systems from the scope document, quoted or attached.
- **The permission:** an explicit statement authorizing the named tester to perform security testing, including attempts to exploit vulnerabilities, against those targets.
- **The window:** start and end dates and permitted hours.
- **The limits:** the rules of engagement — prohibited actions (e.g., denial-of-service, data destruction), data-handling rules (access the minimum data needed as proof; do not download real customer databases; stop and report if you encounter evidence of an existing breach).
- **The safe-harbor line:** a statement that the tester acting within this document acts with the owner's consent — the sentence you would one day show a hosting provider, a payment processor, or a court.
- **Signature, name, title, and date** of the authorizing person.

### Authorization essentials — checklist

- [ ] Signed by someone with provable authority over the target (ask: "Are you authorized to sign for these systems?" — and note the answer)
- [ ] Targets match the scope document exactly
- [ ] Dates and hours cover the whole planned test — including the retest
- [ ] Prohibited actions and data-handling limits are written down
- [ ] You hold a copy before the first packet is sent — and you keep it after the engagement ends
- [ ] If the client asks you to test a system they do not own (a SaaS they merely use, a partner's portal): refuse. Their permission does not extend to other people's systems.

## The contract around it

Beyond the authorization, your agreement (which the proposal + signed acceptance can form, though a short services agreement is better) should cover: scope and price; payment terms; confidentiality — you will see their vulnerabilities and possibly sensitive data, and your silence about it is absolute and forever (Lesson 11); liability limits proportionate to the engagement; data handling and deletion after the engagement; and what happens if either side cancels.

## The rule, once more

**No written authorization, no testing.** Not for money, not for a friend, not "just a quick look," not because they sounded legit on the phone. Every legitimate client will sign — it protects them too. Every refusal to sign is information: believe it, and walk away.

Next on the ladder: [Lesson 06 — Running the Engagement](06-running-the-engagement.md).
