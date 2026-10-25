<h1>Welcome back</h1>
@if($error)
<p class="err">{{ $error }}</p>
@endif
<form method="post" action="/login" class="form">
<?php echo csrf_field(); ?>
<input type="hidden" name="intended" value="{{ $intended }}">
<label>Email<input name="email" type="text" required></label>
<label>Password<input name="password" type="password" required></label>
<button>Log in</button>
</form>
<p class="muted">Demo accounts — owner: mara@brightpath.example / Studio!Owner7 · accountant: sara@fjellmedia.example / Konto#Sun42</p>
