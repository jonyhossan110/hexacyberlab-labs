# HexaSocial — Vulnerability Map (LAB 81)

All 26 scored tests, grouped by feature. Every entry is a real, working flaw in this app, detected server-side when the exploit actually succeeds.

## Login & Authentication

### SQL Injection Login Bypass
- OWASP: A03:2021 Injection · Difficulty: Beginner
- What it is: String-built queries let attacker input change the meaning of the query itself, bypassing the password check entirely.
- Impact: On a real client site this means anyone can sign in as the administrator without knowing any password — full account takeover in seconds.
- Report title: "SQL Injection in Login Form Allows Authentication Bypass" (Critical)

### Brute Force — No Rate Limit or Lockout
- OWASP: A07:2021 Identification & Authentication Failures · Difficulty: Beginner
- What it is: Without throttling or lockout, an attacker can try unlimited passwords until one works.
- Impact: Attackers can grind through password lists against a client’s real users and eventually walk in through the front door.
- Report title: "Missing Rate Limiting and Account Lockout on Login" (High)

### User Enumeration via Login & Forgot-Password Responses
- OWASP: A07:2021 Identification & Authentication Failures · Difficulty: Beginner
- What it is: Different error messages for "no such account" and "wrong password" reveal exactly which email addresses are registered.
- Impact: Attackers harvest a client’s real user list and aim phishing and password attacks only at accounts that exist.
- Report title: "User Enumeration Through Differential Authentication Responses" (Medium)

### Demo / Default Credentials Published on the Login Page
- OWASP: A07:2021 Identification & Authentication Failures · Difficulty: Beginner
- What it is: Demo and default accounts left active in production are pre-made doors for attackers.
- Impact: Anyone on the internet can sign in to a live client account using credentials the site itself advertises.
- Report title: "Active Demo Account with Credentials Published on Login Page" (High)

### Predictable Password-Reset Token
- OWASP: A07:2021 Identification & Authentication Failures · Difficulty: Intermediate
- What it is: Reset tokens must be long, random, and single-use — anything derived from the user id can be computed by an attacker.
- Impact: An attacker who knows a victim’s user id can reset their password and take over the account without touching their inbox.
- Report title: "Predictable Password Reset Token Allows Account Takeover" (High)

### Role Cookie Tampering into the Moderator Queue
- OWASP: A01:2021 Broken Access Control · Difficulty: Intermediate
- What it is: Authorization data must live on the server; anything stored client-side can be edited by the user.
- Impact: Ordinary users can promote themselves to moderator on a client’s platform and read or act on private moderation data.
- Report title: "Client-Side Role Cookie Trusted for Authorization (Privilege Escalation)" (High)

## Registration & Profile

### Weak Password Policy — 1-Character Passwords Accepted
- OWASP: A07:2021 Identification & Authentication Failures · Difficulty: Beginner
- What it is: A password policy that accepts anything guarantees weak credentials across the user base.
- Impact: Client users end up with passwords that fall to the first guesses of any automated attack.
- Report title: "No Minimum Password Strength Enforced at Registration" (Medium)

### Mass Assignment — Role & Follower Count at Registration
- OWASP: A01:2021 Broken Access Control · Difficulty: Intermediate
- What it is: Binding request bodies directly to data models lets attackers set privileged fields the UI never exposed.
- Impact: Attackers self-register as administrators — or inflate their follower counts — on a client’s platform from day one.
- Report title: "Mass Assignment in Registration Allows Privilege and Metric Manipulation" (High)

### Stored XSS in Display Name
- OWASP: A03:2021 Injection · Difficulty: Beginner
- What it is: User-controlled text that is stored and rendered unescaped executes in other people’s browsers.
- Impact: An attacker’s profile can run scripts in the browsers of every visitor — stealing sessions and defacing a client’s community.
- Report title: "Stored Cross-Site Scripting via Display Name" (High)

### CSRF on Profile Update
- OWASP: A01:2021 Broken Access Control · Difficulty: Intermediate
- What it is: State-changing requests without an anti-CSRF token can be forged by any site the victim visits.
- Impact: Attackers can silently rewrite a client user’s profile, bio, or settings while they browse an unrelated page.
- Report title: "Cross-Site Request Forgery on Profile Update" (Medium)

## Search & Discovery

### SQL Injection in People Search Dumps Private Accounts
- OWASP: A03:2021 Injection · Difficulty: Intermediate
- What it is: Injection in a search feature leaks whatever the underlying query can reach, not just what the UI shows.
- Impact: Private members’ names and email addresses can be dumped in bulk from a client’s community.
- Report title: "SQL Injection in Search Exposes Private User Records" (High)

### Reflected XSS in Search Results
- OWASP: A03:2021 Injection · Difficulty: Beginner
- What it is: Echoing request input into HTML without encoding turns a link into a script-delivery vehicle.
- Impact: Attackers send crafted search links that run scripts in a client user’s browser under the site’s own domain.
- Report title: "Reflected Cross-Site Scripting in Search" (Medium)

## Posts & Feed

### IDOR — Read Private & Followers-Only Posts
- OWASP: A01:2021 Broken Access Control · Difficulty: Beginner
- What it is: Sequential ids plus missing ownership checks expose every object in the system.
- Impact: Private posts and followers-only content on a client’s network can be read by complete strangers.
- Report title: "Insecure Direct Object Reference Exposes Private Posts" (High)

### IDOR — Edit Another User’s Post
- OWASP: A01:2021 Broken Access Control · Difficulty: Intermediate
- What it is: Write endpoints need the same ownership checks as read endpoints — often they are forgotten.
- Impact: Attackers can rewrite other people’s posts on a client’s platform, planting scams or defamation under a trusted name.
- Report title: "Missing Ownership Check Allows Editing Other Users’ Posts" (High)

### IDOR — Delete Another User’s Post
- OWASP: A01:2021 Broken Access Control · Difficulty: Intermediate
- What it is: Destructive actions are the highest-value IDOR targets and must be authorized per object.
- Impact: A single request can erase a client community’s content — posts, announcements, evidence — with no recovery path.
- Report title: "Missing Ownership Check Allows Deleting Other Users’ Posts" (High)

### Stored XSS in Post Body
- OWASP: A03:2021 Injection · Difficulty: Beginner
- What it is: Feed content is the highest-reach stored-XSS surface on any social platform.
- Impact: One malicious post can execute scripts for every follower who scrolls past it on a client’s network.
- Report title: "Stored Cross-Site Scripting in Post Body" (High)

## Social Graph

### Forced Follow — Follow Action Forged for Another User
- OWASP: A01:2021 Broken Access Control · Difficulty: Advanced
- What it is: The acting user must always come from the session, never from request parameters.
- Impact: Attackers can manufacture followers and fake social proof, or implicate victims in follows they never made.
- Report title: "Follow Action Trusts Client-Supplied Actor Id (Forced Follow)" (Medium)

### Private-Account Follow Approval Bypass
- OWASP: A01:2021 Broken Access Control · Difficulty: Intermediate
- What it is: Workflow states must be set by the party who owns the decision — here, the account being followed.
- Impact: Private accounts on a client’s platform can be silently infiltrated, exposing content shared with close friends only.
- Report title: "Follow-Approval Workflow Bypass for Private Accounts" (High)

## Comments & Likes

### IDOR — Delete Another User’s Comment
- OWASP: A01:2021 Broken Access Control · Difficulty: Intermediate
- What it is: Every object-level action — read, edit, delete — needs its own authorization check.
- Impact: Attackers can censor discussions and remove evidence of abuse on a client’s platform at will.
- Report title: "Missing Ownership Check Allows Deleting Other Users’ Comments" (Medium)

### Like Forgery — Like Recorded as Another User
- OWASP: A01:2021 Broken Access Control · Difficulty: Intermediate
- What it is: Engagement actions must be attributed to the session user only.
- Impact: Like counts — a trust and ranking signal on a client’s platform — can be inflated or framed onto innocent users.
- Report title: "Like Action Trusts Client-Supplied User Id (Engagement Forgery)" (Medium)

## Direct Messages

### IDOR — Read Other People’s Private Conversations
- OWASP: A01:2021 Broken Access Control · Difficulty: Beginner
- What it is: Private messaging is the most sensitive IDOR surface there is; participant checks are non-negotiable.
- Impact: Every private conversation on a client’s platform can be read by any signed-in user — a catastrophic privacy breach.
- Report title: "Insecure Direct Object Reference Exposes Private Direct Messages" (Critical)

### Send a Direct Message as Another User
- OWASP: A01:2021 Broken Access Control · Difficulty: Advanced
- What it is: Message authorship must come from the session; trusting a from-field enables perfect impersonation.
- Impact: Attackers can impersonate any user in private messages — ideal for fraud and social engineering inside a client’s community.
- Report title: "Direct Message Sender Spoofing via Client-Supplied From Field" (High)

## Groups

### Join a Private Group Without Approval
- OWASP: A01:2021 Broken Access Control · Difficulty: Intermediate
- What it is: Membership gates must be enforced in the join action itself, not just hidden in the UI.
- Impact: Closed communities on a client’s platform — support groups, paid circles — can be entered by anyone.
- Report title: "Private Group Join Lacks Approval Enforcement" (High)

### Read a Private Group’s Posts as a Non-Member
- OWASP: A01:2021 Broken Access Control · Difficulty: Beginner
- What it is: Hiding a link is not access control; the data endpoint must check membership every time.
- Impact: Everything shared inside a client’s private groups can leak to the whole platform.
- Report title: "Private Group Content Served Without Membership Check" (High)

## Admin & Platform

### Admin Panel Open to Any Signed-In User
- OWASP: A01:2021 Broken Access Control · Difficulty: Beginner
- What it is: Admin routes must verify the role on the server for every single request.
- Impact: Any registered user reaches the client’s control panel and its full user/password listing — total platform compromise.
- Report title: "Broken Access Control on Admin Panel (No Role Verification)" (Critical)

### Unauthenticated /api/debug Dumps All User Records
- OWASP: A05:2021 Security Misconfiguration · Difficulty: Beginner
- What it is: Debug and diagnostic endpoints must never ship to production — they bypass every other control.
- Impact: The entire user database of a client’s platform is one unauthenticated request away from any attacker.
- Report title: "Unauthenticated Debug Endpoint Exposes Full User Database" (Critical)
