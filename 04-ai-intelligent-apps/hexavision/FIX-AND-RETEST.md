# HexaVision — Fix & Retest Guide (LAB 33)

For every scored test: the secure implementation and the regression check that proves the fix. Apply the fix in a copy of the lab, restart, and re-run the exploit — it must now fail.

## Login & Authentication

### SQL Injection Login Bypass (Critical)
- **Secure implementation:** Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.
- **Retest:** repeat the original exploit from PRACTICE-GUIDE.md ("auth-sqli"). Expected after the fix: the exploit no longer succeeds and the test can no longer be passed by that route.

### Brute Force — No Rate Limit or Lockout (High)
- **Secure implementation:** Add rate limiting, progressive delays / lockout and MFA; alert on repeated failures.
- **Retest:** repeat the original exploit from PRACTICE-GUIDE.md ("auth-brute"). Expected after the fix: the exploit no longer succeeds and the test can no longer be passed by that route.

### User Enumeration via Login & Forgot-Password (Medium)
- **Secure implementation:** Return one generic message ("invalid credentials" / "if an account exists…") for all cases.
- **Retest:** repeat the original exploit from PRACTICE-GUIDE.md ("auth-enum"). Expected after the fix: the exploit no longer succeeds and the test can no longer be passed by that route.

### Default / Demo Credentials Still Active (High)
- **Secure implementation:** Remove or disable demo/default accounts before production; enforce unique strong passwords.
- **Retest:** repeat the original exploit from PRACTICE-GUIDE.md ("auth-default"). Expected after the fix: the exploit no longer succeeds and the test can no longer be passed by that route.

### Predictable Password-Reset Token (High)
- **Secure implementation:** Generate reset tokens with a CSPRNG (≥128 bits), expire them quickly and make them single-use.
- **Retest:** repeat the original exploit from PRACTICE-GUIDE.md ("auth-reset"). Expected after the fix: the exploit no longer succeeds and the test can no longer be passed by that route.

### Session Role Cookie Tampering (Critical)
- **Secure implementation:** Keep roles in the server-side session; never trust client-supplied role claims.
- **Retest:** repeat the original exploit from PRACTICE-GUIDE.md ("auth-cookie"). Expected after the fix: the exploit no longer succeeds and the test can no longer be passed by that route.

## Registration & Profile

### Weak Password Policy at Registration (Medium)
- **Secure implementation:** Enforce a minimum length (≥10) and block common/breached passwords.
- **Retest:** repeat the original exploit from PRACTICE-GUIDE.md ("reg-weakpw"). Expected after the fix: the exploit no longer succeeds and the test can no longer be passed by that route.

### Mass Assignment — Plan, Credits and Role (High)
- **Secure implementation:** Whitelist bindable fields per endpoint; set role/plan/credits only in server-side logic.
- **Retest:** repeat the original exploit from PRACTICE-GUIDE.md ("reg-massassign"). Expected after the fix: the exploit no longer succeeds and the test can no longer be passed by that route.

### Stored XSS in Display Name (High)
- **Secure implementation:** Escape all user output by context and add a Content-Security-Policy.
- **Retest:** repeat the original exploit from PRACTICE-GUIDE.md ("reg-xss"). Expected after the fix: the exploit no longer succeeds and the test can no longer be passed by that route.

### CSRF on Profile Update (Medium)
- **Secure implementation:** Add per-session CSRF tokens to all state-changing forms and verify Origin/Referer.
- **Retest:** repeat the original exploit from PRACTICE-GUIDE.md ("reg-csrf"). Expected after the fix: the exploit no longer succeeds and the test can no longer be passed by that route.

## Galleries & Images

### Private Gallery IDOR (High)
- **Secure implementation:** Authorise every object access against the session user; deny by default.
- **Retest:** repeat the original exploit from PRACTICE-GUIDE.md ("gal-idor"). Expected after the fix: the exploit no longer succeeds and the test can no longer be passed by that route.

### Private Image IDOR (High)
- **Secure implementation:** Check ownership/visibility on the media endpoint itself, not just in the UI.
- **Retest:** repeat the original exploit from PRACTICE-GUIDE.md ("img-idor"). Expected after the fix: the exploit no longer succeeds and the test can no longer be passed by that route.

### Reflected XSS in Gallery Search (Medium)
- **Secure implementation:** Contextually escape all reflected values; validate input.
- **Retest:** repeat the original exploit from PRACTICE-GUIDE.md ("gal-searchxss"). Expected after the fix: the exploit no longer succeeds and the test can no longer be passed by that route.

### Gallery / Image Enumeration (Medium)
- **Secure implementation:** Use unguessable ids (UUIDs) for sensitive objects and rate-limit object access.
- **Retest:** repeat the original exploit from PRACTICE-GUIDE.md ("gal-enum"). Expected after the fix: the exploit no longer succeeds and the test can no longer be passed by that route.

## Uploads & Import

### Upload Type Confusion — HTML Served Inline (High)
- **Secure implementation:** Whitelist image types by magic bytes, store outside web root, serve with Content-Disposition: attachment or a safe type.
- **Retest:** repeat the original exploit from PRACTICE-GUIDE.md ("upl-type"). Expected after the fix: the exploit no longer succeeds and the test can no longer be passed by that route.

### Path Traversal on File Download (High)
- **Secure implementation:** Resolve the final path and verify it stays inside the allowed directory; whitelist file names.
- **Retest:** repeat the original exploit from PRACTICE-GUIDE.md ("upl-traversal"). Expected after the fix: the exploit no longer succeeds and the test can no longer be passed by that route.

### SSRF via Image-URL Import (High)
- **Secure implementation:** Allowlist hosts, block private/link-local ranges, and disable redirects to internal addresses.
- **Retest:** repeat the original exploit from PRACTICE-GUIDE.md ("upl-ssrf"). Expected after the fix: the exploit no longer succeeds and the test can no longer be passed by that route.

## AI Analysis Jobs

### Analysis Job Result IDOR (Medium)
- **Secure implementation:** Authorise job access against the owning account on every request.
- **Retest:** repeat the original exploit from PRACTICE-GUIDE.md ("job-idor"). Expected after the fix: the exploit no longer succeeds and the test can no longer be passed by that route.

### Analysis Result Tampering by Non-Owner (High)
- **Secure implementation:** Verify ownership (or an explicit reviewer role) before allowing result changes; log all edits.
- **Retest:** repeat the original exploit from PRACTICE-GUIDE.md ("job-tamper"). Expected after the fix: the exploit no longer succeeds and the test can no longer be passed by that route.

### Credit Abuse via Client-Supplied Job Cost (High)
- **Secure implementation:** Compute charges server-side; ignore any client-supplied price/cost fields.
- **Retest:** repeat the original exploit from PRACTICE-GUIDE.md ("job-credit"). Expected after the fix: the exploit no longer succeeds and the test can no longer be passed by that route.

## Collections & Sharing

### Private Collection Leakage (High)
- **Secure implementation:** Enforce visibility + ownership checks on the collection route.
- **Retest:** repeat the original exploit from PRACTICE-GUIDE.md ("col-leak"). Expected after the fix: the exploit no longer succeeds and the test can no longer be passed by that route.

### Predictable Share Token (High)
- **Secure implementation:** Generate share tokens with a CSPRNG, store them hashed, and allow revocation.
- **Retest:** repeat the original exploit from PRACTICE-GUIDE.md ("col-share"). Expected after the fix: the exploit no longer succeeds and the test can no longer be passed by that route.

## API Access

### Predictable API Key Derived from Email (High)
- **Secure implementation:** Issue random API keys (≥128 bits), show them once, store only hashes.
- **Retest:** repeat the original exploit from PRACTICE-GUIDE.md ("api-weak"). Expected after the fix: the exploit no longer succeeds and the test can no longer be passed by that route.

### API Returns All Users’ Private Images (BOLA) (High)
- **Secure implementation:** Scope every API query by the token owner; filter private objects by permission.
- **Retest:** repeat the original exploit from PRACTICE-GUIDE.md ("api-bola"). Expected after the fix: the exploit no longer succeeds and the test can no longer be passed by that route.

## Admin Panel

### State-Changing Admin Action via GET (CSRF) (Medium)
- **Secure implementation:** Use POST with CSRF tokens for all state changes; never mutate on GET.
- **Retest:** repeat the original exploit from PRACTICE-GUIDE.md ("adm-csrf"). Expected after the fix: the exploit no longer succeeds and the test can no longer be passed by that route.

## Platform & Exposure

### Debug Endpoint Exposes Internal Configuration (Medium)
- **Secure implementation:** Remove debug endpoints in production; restrict diagnostics to admin + localhost.
- **Retest:** repeat the original exploit from PRACTICE-GUIDE.md ("plt-debug"). Expected after the fix: the exploit no longer succeeds and the test can no longer be passed by that route.
