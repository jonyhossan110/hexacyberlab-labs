<?php
layout_head('Real Website Guide');
echo '<h1>📖 Real Website Guide — testing a REST API like a professional</h1>' .
'<h2>Step 1 — become a user, keep the token safe</h2>' .
'<p>Register or log in and capture the token. In Burp, add it once in <b>Project options → Sessions</b> (or paste the <code>Authorization: Bearer …</code> header into Repeater) so every request you send carries it. On real engagements, write down exactly which account each token belongs to — half of API testing is "same request, different user".</p>' .
'<h2>Step 2 — map the object graph</h2>' .
'<p>APIs are nouns with ids: <code>/accounts/{id}</code>, <code>/users/{id}</code>, <code>/transfers/{id}</code>. Note your own ids, then ask the professional question: <i>what happens if I change the number?</i> That single question — broken object level authorization — is the #1 API vulnerability in the world.</p>' .
'<h2>Step 3 — interrogate the token</h2>' .
'<p>Look at your token the way you would a suspect: is it random, or is it built from something you know? Hashes of public values (emails, usernames, ids) are a classic. If you can state the recipe, you can mint tokens for strangers.</p>' .
'<h2>Step 4 — fuzz the inputs the UI never shows</h2>' .
'<ul><li><b>Extra fields:</b> send profile fields the app never displays — APIs often bind whatever JSON you give them.</li>' .
'<li><b>Filters &amp; sorts:</b> query parameters reach SQL in ways path parameters don\'t. Quote, comment, compare.</li>' .
'<li><b>Methods:</b> replay a POST as a GET. State should never change on GET — verify that it doesn\'t.</li>' .
'<li><b>Origins:</b> send a foreign <code>Origin</code> and read the CORS headers that come back.</li></ul>' .
'<h2>Step 5 — attack the flows, not just the endpoints</h2>' .
'<p>Multi-step flows hide time-of-check/time-of-use bugs: a balance checked at authorize time may not be re-checked at capture. OTP endpoints without throttling fall to patience and Intruder. Webhook "test ping" features make the server call URLs <i>you</i> choose — including addresses only the server can see.</p>' .
'<h2>Burp workflow for this lab</h2>' .
'<p>Proxy nothing — this API is curl-first. Keep two Repeater tabs per endpoint (your token, and a second user\'s) and diff the responses. Use Intruder on numeric ids and on the OTP verify endpoint; watch the Tests page flip as each result really lands.</p>' .
'<h2>The professional habit</h2>' .
'<p>Record for every flaw: the exact request, the response that proves it, whose data or money moved, and the business sentence it translates to. The Complete page will ask you to write one up properly.</p>';
layout_foot();
