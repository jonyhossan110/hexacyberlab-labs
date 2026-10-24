# HexaTelemed — Practice Guide (LAB 66)

Work through the challenges feature by feature. Each challenge is scored automatically when the exploit's real effect happens — watch the header progress bar or the Mission Board at `/tests`. Stuck? Every test shows 3 graded hints on the Mission Board, and the Lab Coach gives step-by-step help after 3 genuine attempts on a feature.

## Login & Authentication

### SQL Injection Login Bypass (Beginner)
- **Objective:** Make the exploit's real effect happen against the running app (server-detected).
- **Hints:**
  1. The login form glues your input straight into its lookup query.
  2. A classic tautology in the email field can make the query match the first account.
  3. Try email: ' OR '1'='1 with any password.
- **You learned:** String-built queries let an attacker rewrite the login logic itself and walk in as the first account in the table.

### Brute Force — No Rate Limiting or Lockout (Beginner)
- **Objective:** Make the exploit's real effect happen against the running app (server-detected).
- **Hints:**
  1. Nothing slows you down when a password guess fails.
  2. Script 10 or more wrong passwords for one account and watch what does NOT happen.
  3. After 10 failures the account still accepts guesses — and the right password still works.
- **You learned:** Without throttling or lockout, patient and doctor passwords fall to simple guessing.

### User Enumeration via Login & Forgot-Password (Beginner)
- **Objective:** Make the exploit's real effect happen against the running app (server-detected).
- **Hints:**
  1. Compare the answers for an email that exists and one that does not.
  2. The forgot-password form is especially talkative.
  3. Probe at least 5 different emails and note how the responses differ.
- **You learned:** Different responses for real and fake accounts let attackers build a target list of patients and doctors before attacking.

### Default / Demo Credentials Still Active (Beginner)
- **Objective:** Make the exploit's real effect happen against the running app (server-detected).
- **Hints:**
  1. The platform shipped with well-known starter passwords that were never changed.
  2. The admin account is the most interesting one.
  3. Try the classic factory password admin123 on the admin account.
- **You learned:** Default credentials are public knowledge — leaving them live is the same as having no password at all.

### Predictable Password Reset Token (Intermediate)
- **Objective:** Make the exploit's real effect happen against the running app (server-detected).
- **Hints:**
  1. Request a reset and study the shape of the token — it is not random.
  2. The token is derived from something public about the account: its numeric id.
  3. Token = TM<id>-<base36(id*137+42)>. Compute it for another user and reset their password.
- **You learned:** Reset tokens must be unguessable random values; a formula based on the user id protects nothing.

### Role Cookie Tampering — Client-Supplied Role Trusted (Intermediate)
- **Objective:** Make the exploit's real effect happen against the running app (server-detected).
- **Hints:**
  1. After login, look at the cookies the app sets — one of them describes your role.
  2. The doctor area believes that cookie instead of the server-side account.
  3. Set hx_role=doctor in your browser while logged in as a patient, then open /doctor.
- **You learned:** Authorization data must live on the server. A role stored in a cookie is a suggestion the user can edit.

## Registration & Profile

### Weak Password Policy (1-Character Passwords) (Beginner)
- **Objective:** Make the exploit's real effect happen against the running app (server-detected).
- **Hints:**
  1. Register a new account and see how little the password field demands.
  2. One character is enough.
  3. Create an account with the password "a" — it is accepted.
- **You learned:** A password policy that accepts anything guarantees weak accounts across the whole patient base.

### Mass Assignment — Role Escalation at Registration (Intermediate)
- **Objective:** Make the exploit's real effect happen against the running app (server-detected).
- **Hints:**
  1. The registration endpoint binds more form fields than the form shows.
  2. What if the request simply includes the field that decides your role?
  3. POST /register with an extra field role=doctor (or admin) and check your new account.
- **You learned:** Binding request bodies directly to data models lets attackers set fields the UI never offered.

### Stored XSS in Display Name (Beginner)
- **Objective:** Make the exploit's real effect happen against the running app (server-detected).
- **Hints:**
  1. Your display name is shown on many pages — including staff views.
  2. It is rendered exactly as typed.
  3. Register or update your profile with a name like <svg onload=alert(1)> and view a page that shows it.
- **You learned:** Any user-controlled text rendered without escaping becomes code in other users’ browsers.

### CSRF on Profile Update (Intermediate)
- **Objective:** Make the exploit's real effect happen against the running app (server-detected).
- **Hints:**
  1. Legit profile forms carry a hidden hx_marker field. The server never checks it.
  2. A state-changing POST from another origin is accepted just the same.
  3. POST /profile with new details but WITHOUT hx_marker — the change still saves.
- **You learned:** State-changing forms need an anti-CSRF token that the server actually verifies.

## Doctors & Availability

### SQL Injection in Doctor Search (Beginner)
- **Objective:** Make the exploit's real effect happen against the running app (server-detected).
- **Hints:**
  1. The specialty search builds its filter the same sloppy way as the login.
  2. A tautology makes the filter match every doctor.
  3. Search for: ' OR '1'='1 and compare the result count with a normal search.
- **You learned:** Every input that reaches a query needs parameterisation — search boxes are queries too.

### Reflected XSS in Doctor Search (Beginner)
- **Objective:** Make the exploit's real effect happen against the running app (server-detected).
- **Hints:**
  1. The results page echoes your search term back to you.
  2. It echoes it raw.
  3. Search for <script>alert(1)</script> and view the page source.
- **You learned:** Reflected input must be escaped in the response, every time, even in “harmless” echoes.

### Doctor Availability Manipulation by Patients (Intermediate)
- **Objective:** Make the exploit's real effect happen against the running app (server-detected).
- **Hints:**
  1. Doctors manage their slots at POST /doctors/<id>/availability.
  2. The endpoint asks “are you logged in?” but not “is this YOUR schedule?” — or even “are you a doctor?”
  3. As a patient, POST new availability for a doctor and watch their booking page change.
- **You learned:** Function-level authorization matters: every sensitive action must check the actor’s role AND ownership.

## Appointments & Sessions

### Consultation Fee Tampering (Beginner)
- **Objective:** Make the exploit's real effect happen against the running app (server-detected).
- **Hints:**
  1. The booking form carries the fee as a hidden field.
  2. The server trusts whatever fee arrives.
  3. Book a consultation but send fee=1 instead of the listed price.
- **You learned:** Prices must always be recomputed server-side from the catalogue; hidden fields are visible — and editable.

### Appointment IDOR — Other Patients' Bookings Exposed (Beginner)
- **Objective:** Make the exploit's real effect happen against the running app (server-detected).
- **Hints:**
  1. Appointment pages live at /appointments/<id> with small sequential ids.
  2. Nothing checks that the booking is yours.
  3. Open /appointments/2 while logged in as a different patient.
- **You learned:** Object ids are not authorization. Every object access needs an ownership check.

### Predictable Session Room — Join Another Patient's Consultation (Intermediate)
- **Objective:** Make the exploit's real effect happen against the running app (server-detected).
- **Hints:**
  1. Video sessions live under /session/<room code>. Look at the pattern of the codes.
  2. They are sequential: room-1001, room-1002, …
  3. Guess the room code of another patient’s booked session and open it while logged in as someone else.
- **You learned:** Meeting links are capability tokens — they must be long, random, and checked against the participant list.

### Follow-up Booking on Another Patient's Record (Intermediate)
- **Objective:** Make the exploit's real effect happen against the running app (server-detected).
- **Hints:**
  1. Follow-ups are created from an existing appointment: POST /appointments/<id>/followup.
  2. The new booking inherits the ORIGINAL patient — and nobody checks whose record that is.
  3. Create a follow-up on another patient’s appointment id.
- **You learned:** Derived actions inherit the parent object’s ownership rules — and must enforce them.

### Cancel Another Patient's Appointment (Beginner)
- **Objective:** Make the exploit's real effect happen against the running app (server-detected).
- **Hints:**
  1. Cancelling is a simple POST to /appointments/<id>/cancel.
  2. The server never asks whose appointment it is.
  3. As one patient, cancel a booking that belongs to someone else.
- **You learned:** Destructive actions need the same ownership checks as reads — usually stronger ones.

## Consultation Notes

### Consultation Notes IDOR — Private Doctor Notes Exposed (Beginner)
- **Objective:** Make the exploit's real effect happen against the running app (server-detected).
- **Hints:**
  1. Notes live under the appointment: /appointments/<id>/notes.
  2. The same missing check as the appointment page applies — worse, this is the clinical content.
  3. Read the notes of an appointment that is not yours.
- **You learned:** Clinical notes are the most sensitive data in the system; they need the strictest object-level checks.

### Patient Writes the Doctor's Consultation Notes (Intermediate)
- **Objective:** Make the exploit's real effect happen against the running app (server-detected).
- **Hints:**
  1. Adding a note is a POST to the same notes URL.
  2. The form is only SHOWN to doctors — the endpoint itself never checks the role.
  3. As a patient, POST a note to your own appointment and see it stored as a clinical note.
- **You learned:** Hiding a form is not authorization. Write endpoints must enforce who may create clinical records.

## Prescriptions

### Self-Prescribing Without Any Consultation (Intermediate)
- **Objective:** Make the exploit's real effect happen against the running app (server-detected).
- **Hints:**
  1. Prescriptions are created at POST /prescriptions.
  2. The UI shows the form to doctors. The endpoint trusts whoever calls it.
  3. As a patient, create a prescription naming yourself as the patient, with any medication.
- **You learned:** Clinical actions must verify the actor’s professional role on the server, not just present the right screen.

### Prescription IDOR — Other Patients' Medication Exposed (Beginner)
- **Objective:** Make the exploit's real effect happen against the running app (server-detected).
- **Hints:**
  1. Prescriptions have their own pages: /prescriptions/<id>.
  2. Sequential ids, no ownership check — the usual story.
  3. Open a prescription that belongs to another patient.
- **You learned:** Medication lists are highly sensitive; per-object authorization is non-negotiable in health systems.

### Refill Beyond the Prescribed Limit (Intermediate)
- **Objective:** Make the exploit's real effect happen against the running app (server-detected).
- **Hints:**
  1. Each prescription carries a “refills left” counter.
  2. The refill endpoint never looks at it.
  3. Find a prescription with 0 refills left and POST /prescriptions/<id>/refill anyway.
- **You learned:** Business limits (quotas, counters, allowances) must be enforced where the action happens — on the server.

## Admin Panel

### Admin Panel Open to Any Logged-in User (Beginner)
- **Objective:** Make the exploit's real effect happen against the running app (server-detected).
- **Hints:**
  1. The admin console lives at /admin.
  2. It checks that you are logged in. It forgets to check WHAT you are.
  3. Open /admin while logged in as a plain patient.
- **You learned:** “Logged in” is not “authorized”. Every privileged surface needs an explicit role check.

## Platform & API

### Forgeable API Token (Base64 of the Email Address) (Intermediate)
- **Objective:** Make the exploit's real effect happen against the running app (server-detected).
- **Hints:**
  1. The JSON API at /api/appointments takes a Bearer token.
  2. Real tokens look random. The API also accepts something much simpler derived from the account email.
  3. Try Authorization: Bearer base64(email) for a victim account.
- **You learned:** API tokens must be random secrets. Anything derivable from public data is not a credential.

### Unauthenticated Debug Endpoint Exposes All Accounts (Beginner)
- **Objective:** Make the exploit's real effect happen against the running app (server-detected).
- **Hints:**
  1. Development leftovers often survive into production.
  2. Try /api/debug — no login needed.
  3. The response includes every account… and its password.
- **You learned:** Debug and diagnostics endpoints must never ship enabled — they bypass every other control at once.
