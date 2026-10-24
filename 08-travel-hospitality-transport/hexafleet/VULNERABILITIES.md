# HexaFleet (LAB 75) — Vulnerabilities

Complete map of the 26 scored tests, grouped by feature. Each maps to a real, working flaw in the app.

## Login & Authentication

### SQL injection login bypass
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- What it teaches: String-built SQL queries let an attacker rewrite the login check itself and walk in as the first account in the table — usually the admin.
- Client impact: On a real fleet platform this means instant takeover of the admin account: every vehicle, driver record and expense is exposed or editable.

### Brute force — no rate limiting or lockout
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- What it teaches: Without throttling or lockout, an attacker can try thousands of passwords against a driver or manager account until one works.
- Client impact: A guessed fleet-manager password hands an attacker the whole operation: assignments, expenses and driver data.

### User enumeration via login and forgot-password responses
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- What it teaches: Different error messages for "no such account" and "wrong password" let attackers build a list of valid accounts before attacking passwords.
- Client impact: Attackers confirm which driver/manager emails are real, then focus phishing and password attacks only on accounts that exist.

### Weak and published default credentials
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- What it teaches: Demo and factory-default credentials left active are the first thing an attacker tries — they are printed in manuals and, here, on the login page itself.
- Client impact: Anyone on the internet can sign in with the printed demo account — and the untouched admin password — and operate the fleet platform as staff.

### Predictable password-reset token
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Intermediate
- What it teaches: Reset tokens must be unguessable random secrets. A token derived from the user id with arithmetic can be computed for any account, including the admin.
- Client impact: An attacker computes the manager or admin reset token from a public user id and takes over the account in seconds — no inbox access needed.

### Session role cookie tampering
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- What it teaches: Authorization data must live server-side. When the server trusts a role stored in a client cookie, every user is one edit away from being a manager.
- Client impact: Any driver can promote themselves to fleet manager in their browser and approve expenses, reassign vehicles and read the whole fleet.

## Registration & Profile

### Weak password policy on registration
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- What it teaches: A password policy that accepts one-character passwords guarantees some accounts will be trivially guessable.
- Client impact: Driver accounts with passwords like "x" are taken over by the first automated guess, exposing trips, expenses and personal data.

### Mass assignment — self-assign a privileged role
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- What it teaches: Binding a whole request body to a user object lets attackers set fields the form never showed — like their own role.
- Client impact: Anyone can register themselves as fleet manager or admin, skipping every approval step the business thinks it has.

### Stored XSS in display name
- OWASP: A03:2021 Injection
- Difficulty: Intermediate
- What it teaches: Any field that is stored and later rendered — names included — must be output-encoded, or it becomes a stored XSS delivery vehicle.
- Client impact: A driver name carrying a script fires in the fleet manager’s and admin’s browsers, stealing sessions and acting as staff.

### CSRF on profile update
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- What it teaches: State-changing forms need an unforgeable CSRF token. A marker the server never verifies is decoration, not protection.
- Client impact: A malicious page open in a manager’s browser can silently rewrite their profile — the first step in account-takeover chains.

## Vehicles & Documents

### Vehicle IDOR — view another driver’s vehicle and documents
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- What it teaches: Every object access must check that the object belongs to the requester. Sequential ids plus no check equals full fleet exposure.
- Client impact: Drivers (or anyone with a stolen driver login) can read every vehicle’s registration and insurance documents — prime material for fraud and cloning.

### Path traversal on document download
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- What it teaches: File paths built from user input must be normalised and confined to the intended directory, or the whole filesystem is a download menu.
- Client impact: Attackers download server source code, configuration and any file the process can read — turning one download link into full system disclosure.

### Driver reassigns a vehicle to themselves
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- What it teaches: Sensitive workflow actions need server-side role checks; hiding the button in the UI is not authorization.
- Client impact: A driver can steal the best vehicle, break another driver’s schedule, and corrupt the assignment records the business runs on.

## Trip Logs & Mileage

### Trip log IDOR — read another driver’s trips
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- What it teaches: Trip logs are personal operational data; object-level authorization is required on every read, not just on lists.
- Client impact: Movements of every driver become visible to any account — a privacy breach and a safety risk for the workforce.

### Mileage tampering on an approved trip
- OWASP: A04:2021 Insecure Design
- Difficulty: Intermediate
- What it teaches: Records that drive payments must be locked after approval; any later change needs a new approval trail.
- Client impact: Drivers inflate approved mileage and get paid for kilometres never driven — quiet, repeatable payroll fraud.

### Delete another driver’s trip log
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- What it teaches: Destructive actions need the strictest authorization checks; a missing check turns any account into a wrecking ball for records.
- Client impact: Trip evidence can be erased to hide fraud or sabotage operations — with no audit trail to recover it.

## Fuel Expenses

### Fuel expense amount inflation
- OWASP: A04:2021 Insecure Design
- Difficulty: Beginner
- What it teaches: Money amounts must always be computed server-side from trusted inputs. A client-supplied total is an invitation to inflate claims.
- Client impact: Every driver can multiply fuel claims at will; across a fleet this is direct, ongoing cash loss.

### Driver approves their own fuel expense
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- What it teaches: Separation of duties only exists if the server enforces it. Self-approval turns the whole expense workflow into an honour system.
- Client impact: Combined with inflated amounts, drivers can claim and approve their own money end-to-end — complete expense fraud with valid-looking records.

## Maintenance & Work Orders

### Close another driver’s maintenance work order
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- What it teaches: Workflow transitions must verify the actor’s relationship to the record — anyone-can-close breaks maintenance safety chains.
- Client impact: Safety repairs can be marked done without being done: vehicles go back on the road with known faults, and the paper trail says "closed".

### Work order cost tampering by a driver
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- What it teaches: Financial fields on operational records need role checks and change history; otherwise budgets and supplier billing can be rewritten by anyone.
- Client impact: Maintenance costs can be inflated for kickback fraud or zeroed to hide spending — the finance reports stop meaning anything.

## Search

### SQL injection in vehicle search
- OWASP: A03:2021 Injection
- Difficulty: Intermediate
- What it teaches: Search boxes are injection points like any other input; parameterisation is not optional just because the field is "only search".
- Client impact: Attackers dump the entire fleet register — including decommissioned and internal vehicles — through a single search request.

### Reflected XSS in search results
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- What it teaches: Reflected input must be encoded on output even when it "only" echoes the user’s own query — the victim is whoever is sent the crafted link.
- Client impact: A crafted search link runs script in a manager’s browser, enabling session theft and actions taken as staff.

## Admin Panel

### Admin panel open to any signed-in user
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- What it teaches: Admin surfaces must verify the admin role server-side on every request; obscurity of the URL is not a control.
- Client impact: Every driver account can read all credentials in the system — total compromise of the platform from the lowest-privilege login.

### CSRF on admin user deactivation
- OWASP: A01:2021 Broken Access Control
- Difficulty: Advanced
- What it teaches: Admin actions are the highest-value CSRF targets; tokens must be verified, not merely present in the form.
- Client impact: One malicious page visited by the admin silently deactivates accounts — operations halt and the audit trail blames the admin.

## Platform & API

### Unauthenticated debug endpoint dumps all data
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- What it teaches: Debug and diagnostic endpoints must never ship to production; unauthenticated ones are a complete data breach in a single request.
- Client impact: Anyone on the network can download the entire user database with plaintext passwords — no account, no attack skill required.

### Weak API token — base64 of the user’s email
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Intermediate
- What it teaches: API tokens must be random secrets issued per account. A token anyone can derive from a public identifier is not authentication.
- Client impact: Knowing a manager’s email address — public information — is enough to use the API as them and pull fleet data at scale.
