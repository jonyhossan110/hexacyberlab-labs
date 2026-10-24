# Lesson 07 — Writing the Report

*Unlocked by completing Category 07 at 100%. Business Skills ladder, step 7 of 11.*

Your findings are worth nothing until they are a report. The report is the product the client actually keeps (Lesson 01) — it is read by founders who cannot spell "IDOR," forwarded to customers doing due diligence, and used by developers as a work list. It decides whether you look like a professional or a person who ran some tools. Write it like your next five clients depend on it. They do.

## Report structure

**1. Cover and engagement summary.** Client, target, dates, tester, scope reference. Two lines on what was tested (and what was not — the scope boundary, restated).

**2. Executive summary (one page, no jargon).** Written for the busiest, least technical reader. It contains: why the test happened; the overall risk picture in plain words; the findings counted by severity; the two or three issues that matter most and what they mean for the business; and a honest positive note where deserved (e.g., "authentication controls were strong"). If a founder reads only this page — many will — they must leave understanding their situation and their first action.

**3. Methodology and scope.** How you tested (manual testing per OWASP guidance, tools used in support), roles and accounts used, dates and hours. This section is your credibility and your boundary: it documents exactly what the conclusions rest on.

**4. Findings summary table.** Every finding, one row: ID, title, severity, location, status. A map of the section that follows.

**5. Detailed findings.** One section per finding, in the format below.

**6. Remediation roadmap.** The findings re-ordered as a fix plan: fix-now (critical/high), fix-next (medium), fix-later (low), with rough effort hints. This turns your report from criticism into a plan — clients love it and developers use it.

**7. Appendix.** Scope document reference, testing log summary, tools and versions, any raw evidence too bulky for the findings. And the retest terms (Lesson 08): what is included and how to request it.

## The finding format

Every finding, the same anatomy, every time:

```markdown
### F-01 — Broken Access Control: Users Can View Other Customers' Invoices
Severity: HIGH        Location: GET /api/invoices/{invoice_id}

**Business impact (plain language):**
Any logged-in customer can view other customers' invoices by changing
a number in the request. Invoices contain names, addresses, and
purchase amounts. This exposes personal data of the entire customer
base to any single customer account.

**Technical description:**
The endpoint returns invoice data based solely on the ID in the URL.
No check verifies that the invoice belongs to the requesting user.

**Evidence:**
1. Logged in as test user A (account #1042).
2. Requested own invoice: GET /api/invoices/5021 → 200 OK.
3. Changed only the ID: GET /api/invoices/5022 → 200 OK,
   returning customer B's invoice (name/address visible — screenshot).
[request/response excerpts attached]

**Risk reasoning:** Severity is High because exploitation needs only a
free account and no special tools, and the data is personal data at
full-database scale — though no payment data is exposed (that is why
it is not Critical).

**Remediation:**
- Enforce server-side ownership checks on every object access:
  return data only when invoice.owner_id == current_user.id.
- Apply the same check pattern to all ID-based endpoints (orders,
  addresses, support tickets) — the pattern, not just this instance.
- Add authorization tests to the CI suite for object access.

**References:** OWASP Top 10 — A01 Broken Access Control; CWE-862.
```

## Writing rules that matter

- **Business impact first, always.** Every finding opens with what it costs the business — data exposed, money movable, trust lost — in sentences a founder understands. Technical detail follows for the developer who must fix it. Two audiences, one finding, both served.
- **Severity is a judgment — show your reasoning.** Rate by exploitability × impact, in context: the same SQL injection is Critical in a payment app and merely serious in a read-only brochure site. A short "why this severity" line (as above) makes your ratings defensible and teaches the client to trust them.
- **Evidence, not adjectives.** "Totally insecure" is noise. A request, a response, and a result is proof. If you cannot show it, you cannot claim it.
- **Remediation must be actionable.** Name the fix pattern, where it applies, and how they will know it worked (which is your retest, Lesson 08). "Improve security" is not remediation.
- **Be honest about the negative space.** State what you tested and found solid, and what was out of scope or untestable (missing access, time). A report that pretends to be total coverage is a lie that returns as blame.
- **Proofread like a stranger will judge you** — because one will. Dates, IDs, severity counts, and the executive summary must agree with each other exactly.

## Checklist

- [ ] Executive summary readable by a non-technical founder in two minutes
- [ ] Every finding: business impact → technical description → evidence → severity reasoning → remediation
- [ ] Summary table, findings, and counts all match
- [ ] Fixes are specific patterns, not slogans
- [ ] Scope limits and untested areas stated honestly
- [ ] No client data in the report beyond minimum proof evidence

Next on the ladder: [Lesson 08 — Fix, Retest, and Delivery](08-fix-retest-and-delivery.md).
