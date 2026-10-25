<h1>Profile</h1>
<p class="muted">{{ $me['company'] }} · role: <b>{{ $me['role'] }}</b> · plan: <b>{{ $me['plan'] }}</b>@if($me['is_admin']) · <b>PLATFORM ADMIN</b>@endif</p>
<form method="post" action="/profile" class="form">
<?php echo csrf_field(); ?>
<label>Full name<input name="name" value="{{ $me['name'] }}"></label>
<label>Email<input name="email" value="{{ $me['email'] }}"></label>
<label>Company<input name="company" value="{{ $me['company'] }}"></label>
<button>Save profile</button>
</form>
<h2>API access</h2>
<p class="muted">Use this token with the HexaBilling API (Authorization: Bearer …). Keep it secret — it never expires.</p>
<pre class="src">{{ $me['api_token'] }}</pre>
