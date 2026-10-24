# HexaWriter — Fix & Retest (LAB 32)

For every scored test: the secure implementation and a regression check that proves the fix.

## SQL injection login bypass (Login & Authentication)
- **Finding:** SQL Injection in Login Form Allows Authentication Bypass — Severity: Critical
- **Fix:** Use parameterised queries / prepared statements for all database access and never concatenate user input into SQL.
- **Retest:** Re-run the original exploit from the Practice Guide. It must now fail (access denied, generic error, correct server-side charge, or a safe response), while the legitimate workflow keeps working for authorised users.

## Brute force — no rate limit or lockout (Login & Authentication)
- **Finding:** No Rate Limiting or Account Lockout on Login — Severity: High
- **Fix:** Add progressive delays / lockout after repeated failures, breach-password screening and MFA.
- **Retest:** Re-run the original exploit from the Practice Guide. It must now fail (access denied, generic error, correct server-side charge, or a safe response), while the legitimate workflow keeps working for authorised users.

## User enumeration via different error messages (Login & Authentication)
- **Finding:** Account Enumeration Through Distinct Authentication Error Messages — Severity: Medium
- **Fix:** Return one generic error ("invalid email or password") for all failed logins and reset requests.
- **Retest:** Re-run the original exploit from the Practice Guide. It must now fail (access denied, generic error, correct server-side charge, or a safe response), while the legitimate workflow keeps working for authorised users.

## Weak / default administrator credentials (Login & Authentication)
- **Finding:** Default Administrator Credentials in Use — Severity: Critical
- **Fix:** Force a unique strong password at first setup, disable shipped defaults, and enable MFA for admin accounts.
- **Retest:** Re-run the original exploit from the Practice Guide. It must now fail (access denied, generic error, correct server-side charge, or a safe response), while the legitimate workflow keeps working for authorised users.

## Predictable password-reset token (Login & Authentication)
- **Finding:** Password Reset Token Is Predictable (Derived From Email Address) — Severity: High
- **Fix:** Generate reset tokens with a CSPRNG (>=128 bits), store only a hash, expire them quickly and make them single-use.
- **Retest:** Re-run the original exploit from the Practice Guide. It must now fail (access denied, generic error, correct server-side charge, or a safe response), while the legitimate workflow keeps working for authorised users.

## Role stored in a client cookie the server trusts (Login & Authentication)
- **Finding:** Privilege Escalation via Client-Controlled Role Cookie — Severity: High
- **Fix:** Keep roles in the server-side session record only; never trust role claims from cookies or other client input.
- **Retest:** Re-run the original exploit from the Practice Guide. It must now fail (access denied, generic error, correct server-side charge, or a safe response), while the legitimate workflow keeps working for authorised users.

## Weak password policy at signup (Registration & Profile)
- **Finding:** No Minimum Password Strength Enforced at Registration — Severity: Medium
- **Fix:** Require at least 8–12 characters, screen against breached-password lists, and encourage passphrases.
- **Retest:** Re-run the original exploit from the Practice Guide. It must now fail (access denied, generic error, correct server-side charge, or a safe response), while the legitimate workflow keeps working for authorised users.

## Mass assignment — plan, credits and role at signup/profile (Registration & Profile)
- **Finding:** Mass Assignment Allows Setting Plan, Credits and Role — Severity: High
- **Fix:** Whitelist bindable fields per endpoint; never assign privileged fields (plan, credits, role) from request data.
- **Retest:** Re-run the original exploit from the Practice Guide. It must now fail (access denied, generic error, correct server-side charge, or a safe response), while the legitimate workflow keeps working for authorised users.

## Stored XSS in display name (Registration & Profile)
- **Finding:** Stored Cross-Site Scripting via Display Name — Severity: High
- **Fix:** HTML-encode all user-controlled output and add a Content-Security-Policy as defence in depth.
- **Retest:** Re-run the original exploit from the Practice Guide. It must now fail (access denied, generic error, correct server-side charge, or a safe response), while the legitimate workflow keeps working for authorised users.

## CSRF on profile update (Registration & Profile)
- **Finding:** Cross-Site Request Forgery on Profile Update — Severity: Medium
- **Fix:** Use per-session anti-CSRF tokens verified on every state-changing request, plus SameSite cookies.
- **Retest:** Re-run the original exploit from the Practice Guide. It must now fail (access denied, generic error, correct server-side charge, or a safe response), while the legitimate workflow keeps working for authorised users.

## Read another user's private document (IDOR) (Documents)
- **Finding:** Insecure Direct Object Reference — Private Documents readable by ID — Severity: High
- **Fix:** Enforce per-object authorisation on every document read, checking owner/workspace membership server-side.
- **Retest:** Re-run the original exploit from the Practice Guide. It must now fail (access denied, generic error, correct server-side charge, or a safe response), while the legitimate workflow keeps working for authorised users.

## Edit another user's document (IDOR write) (Documents)
- **Finding:** Insecure Direct Object Reference — Documents Editable by Non-Owners — Severity: High
- **Fix:** Authorise edits per object (owner or editor role in that workspace) before applying any change.
- **Retest:** Re-run the original exploit from the Practice Guide. It must now fail (access denied, generic error, correct server-side charge, or a safe response), while the legitimate workflow keeps working for authorised users.

## Export/download another user's document (IDOR) (Documents)
- **Finding:** Insecure Direct Object Reference — Document Export Lacks Authorisation — Severity: High
- **Fix:** Apply the same per-object authorisation checks to export/download endpoints as to views.
- **Retest:** Re-run the original exploit from the Practice Guide. It must now fail (access denied, generic error, correct server-side charge, or a safe response), while the legitimate workflow keeps working for authorised users.

## Stored XSS in document title/body (Documents)
- **Finding:** Stored Cross-Site Scripting in Document Title and Body — Severity: High
- **Fix:** Encode user content on output in every view; sanitise any allowed markup with a vetted sanitiser.
- **Retest:** Re-run the original exploit from the Practice Guide. It must now fail (access denied, generic error, correct server-side charge, or a safe response), while the legitimate workflow keeps working for authorised users.

## Template system prompt leaked via API (AI Generation & Templates)
- **Finding:** Sensitive System Prompt Exposed Through Template API Response — Severity: High
- **Fix:** Return DTOs with only client-needed fields; keep system prompts server-side only.
- **Retest:** Re-run the original exploit from the Practice Guide. It must now fail (access denied, generic error, correct server-side charge, or a safe response), while the legitimate workflow keeps working for authorised users.

## Prompt injection makes the AI reveal its instructions (AI Generation & Templates)
- **Finding:** Prompt Injection Allows Extraction of System Instructions — Severity: High
- **Fix:** Separate system/user channels, filter override patterns, never place secrets in prompts, and scan outputs for instruction leakage.
- **Retest:** Re-run the original exploit from the Practice Guide. It must now fail (access denied, generic error, correct server-side charge, or a safe response), while the legitimate workflow keeps working for authorised users.

## Free AI generation by tampering the billable-words field (AI Generation & Templates)
- **Finding:** Billing Bypass — Client-Supplied Billable Amount Trusted for AI Generation — Severity: High
- **Fix:** Compute generation cost server-side from measured output; ignore any client-supplied billing fields.
- **Retest:** Re-run the original exploit from the Practice Guide. It must now fail (access denied, generic error, correct server-side charge, or a safe response), while the legitimate workflow keeps working for authorised users.

## Credit top-up amount tampering (AI Generation & Templates)
- **Finding:** Credit Purchase Tampering — Granted Credits Taken From Request Body — Severity: Critical
- **Fix:** Resolve pack contents server-side from the pack id and the verified payment; ignore client-sent amounts.
- **Retest:** Re-run the original exploit from the Practice Guide. It must now fail (access denied, generic error, correct server-side charge, or a safe response), while the legitimate workflow keeps working for authorised users.

## View another team's workspace (cross-access) (Workspaces & Teams)
- **Finding:** Broken Tenant Isolation — Workspace Pages Accessible to Non-Members — Severity: High
- **Fix:** Check workspace membership server-side on every workspace route and object query.
- **Retest:** Re-run the original exploit from the Practice Guide. It must now fail (access denied, generic error, correct server-side charge, or a safe response), while the legitimate workflow keeps working for authorised users.

## Member promotes themselves to workspace owner (Workspaces & Teams)
- **Finding:** Privilege Escalation — Non-Owner Can Assign Workspace Roles Including Owner — Severity: Critical
- **Fix:** Only workspace owners may change roles; verify caller role server-side before applying role changes.
- **Retest:** Re-run the original exploit from the Practice Guide. It must now fail (access denied, generic error, correct server-side charge, or a safe response), while the legitimate workflow keeps working for authorised users.

## Workspace settings changed by a non-owner member (Workspaces & Teams)
- **Finding:** Missing Authorisation on Workspace Settings Update — Severity: Medium
- **Fix:** Restrict settings changes to the workspace owner role and verify server-side.
- **Retest:** Re-run the original exploit from the Practice Guide. It must now fail (access denied, generic error, correct server-side charge, or a safe response), while the legitimate workflow keeps working for authorised users.

## Read another user's private brand voice (IDOR) (Brand Voices & Sharing)
- **Finding:** Insecure Direct Object Reference — Private Brand Voices Readable by ID — Severity: Medium
- **Fix:** Enforce ownership checks on brand-voice reads and generation use.
- **Retest:** Re-run the original exploit from the Practice Guide. It must now fail (access denied, generic error, correct server-side charge, or a safe response), while the legitimate workflow keeps working for authorised users.

## Guessable document share link exposes private drafts (Brand Voices & Sharing)
- **Finding:** Predictable Share Tokens Expose Private Documents — Severity: High
- **Fix:** Generate share tokens with a CSPRNG (>=128 bits), decouple them from object ids, and support revocation/expiry.
- **Retest:** Re-run the original exploit from the Practice Guide. It must now fail (access denied, generic error, correct server-side charge, or a safe response), while the legitimate workflow keeps working for authorised users.

## API key is just the base64 of the user's email (API & Admin)
- **Finding:** Weak API Key Derivation (Base64 of Email Address) — Severity: High
- **Fix:** Issue random per-user API keys, store hashes, support rotation and revocation.
- **Retest:** Re-run the original exploit from the Practice Guide. It must now fail (access denied, generic error, correct server-side charge, or a safe response), while the legitimate workflow keeps working for authorised users.

## Admin user deletion via a simple GET link (CSRF) (API & Admin)
- **Finding:** State-Changing GET — Admin User Deletion Without CSRF Protection — Severity: High
- **Fix:** Require POST with a valid CSRF token and confirmation for destructive admin actions.
- **Retest:** Re-run the original exploit from the Practice Guide. It must now fail (access denied, generic error, correct server-side charge, or a safe response), while the legitimate workflow keeps working for authorised users.

## Debug page exposes all users and passwords (API & Admin)
- **Finding:** Sensitive Data Exposure — Debug Page Lists All Users With Plaintext Passwords — Severity: Critical
- **Fix:** Remove debug endpoints from production builds; if needed, restrict to admin role and never include credentials.
- **Retest:** Re-run the original exploit from the Practice Guide. It must now fail (access denied, generic error, correct server-side charge, or a safe response), while the legitimate workflow keeps working for authorised users.
