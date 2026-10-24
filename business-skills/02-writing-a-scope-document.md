# Lesson 02 — Writing a Scope Document

*Unlocked by completing Category 02 at 100%. Business Skills ladder, step 2 of 11.*

The scope document is the most important page in your business. It defines exactly what you will test, how, and under what limits. It protects the client from surprises, and it protects you from the two disasters of freelance security work: testing something you had no right to touch, and being blamed for something you were never asked to check.

If it is not in the scope, it does not get tested. If it is in the scope, it gets tested properly. Everything else is an argument waiting to happen.

## What a scope document must contain

**1. Target identification.** Exact domains, subdomains, applications, API base URLs, and mobile/API endpoints. "Their website" is not a target. `app.example.com` and `api.example.com` are targets. Environments matter: production and staging are different systems with different risks — name which ones are included.

**2. In scope / out of scope.** Two explicit lists. Out-of-scope is not an insult; it is clarity. Typical exclusions: third-party services (payment processors, chat widgets), employee social engineering, physical access, denial-of-service testing, and any system the client does not own. If the client asks you to test something they merely *use* but don't own — refuse, in writing.

**3. Test accounts and access.** Which user roles you will test with (anonymous, normal user, admin), who provides the accounts, and whether you may create your own test data. Testing access control and IDOR properly requires at least two accounts at the same privilege level — say so in the scope.

**4. Permitted techniques.** What you may do: automated scanning, manual testing, file upload attempts, rate-limit testing, and so on — plus explicit limits: maximum request rates, no destructive payloads against real data, no exfiltration beyond the minimum proof needed.

**5. Time window.** Start and end dates, testing hours (business hours vs. 24/7), and any freeze periods (for example, not during their big sale weekend).

**6. Contacts and escalation.** Who receives progress updates, who gets the phone call if production breaks or you find an actively exploited hole, and their contact details.

**7. Deliverables and timeline.** The report, the retest (Lesson 08), the delivery walkthrough, and when each lands.

**8. Assumptions and dependencies.** What the client must provide (accounts, documentation, a stable environment, a contact who answers), and what happens to the timeline if they don't.

## Common scope mistakes

- **Scope creep, accepted silently.** Mid-test the client says "oh, also check this other app." The professional answer: "Happy to — let's add it as a written amendment with adjusted time and price." Never just absorb it.
- **Vague targets.** "Test everything" from a client who owns twelve domains means disputes later. Enumerate.
- **No out-of-scope list.** The first time something breaks, everyone blames the tester. Your exclusions are your shield.
- **Testing accounts not arranged in advance.** You cannot test authorization bugs with one account and good intentions.

## Scope template — copy, adapt, use

```markdown
# WEB APPLICATION PENETRATION TEST — SCOPE DOCUMENT

Client:        [Company legal name]
Tester:        [Your name / business name]
Date:          [YYYY-MM-DD]
Engagement:    [Name, e.g. "Customer portal security assessment"]

## 1. Targets IN SCOPE
- Web application:  [https://app.example.com]
- API:              [https://api.example.com/v1]
- Environment:      [ ] Production   [ ] Staging

## 2. OUT OF SCOPE
- Third-party services (payment, chat, analytics providers)
- Denial-of-service / stress testing
- Social engineering of staff or customers
- Any system not listed in Section 1
- [Client-specific exclusions]

## 3. TESTING APPROACH
- Manual testing per OWASP Testing Guide / OWASP Top 10
- Authenticated testing with roles: [anonymous / user A / user B / admin]
- Test accounts provided by client by: [date]
- No destructive actions against real user data; proof-of-concept only

## 4. TIME WINDOW
- Testing period: [start] to [end]
- Testing hours:  [e.g. 08:00–20:00, client timezone]
- Freeze periods: [dates / none]

## 5. RULES OF ENGAGEMENT
- Max automated request rate: [e.g. 10 req/sec]
- If a critical issue or signs of an existing breach are found,
  testing pauses and the client contact is notified immediately.
- Emergency contact: [name, phone, email]

## 6. DELIVERABLES
- Written report within [X] business days of test end
- One fix-and-retest cycle included (see report for terms)
- Delivery walkthrough call: [duration]

## 7. CLIENT RESPONSIBILITIES
- Signed authorization letter before testing begins
- Test accounts, documentation, and a reachable technical contact
- Notification of any major deployment during the test window

Agreed by:  Client ______________   Tester ______________   Date ______
```

## Checklist

- [ ] Every target is an exact URL or domain — no "the website"
- [ ] Out-of-scope list is written, not assumed
- [ ] Test accounts and roles are named, with a delivery date
- [ ] Time window, hours, and freeze periods are set
- [ ] Emergency contact and critical-finding procedure are agreed
- [ ] Both parties sign — and testing starts only after Lesson 05's authorization is in place

Next on the ladder: [Lesson 03 — Pricing an Audit](03-pricing-an-audit.md).
