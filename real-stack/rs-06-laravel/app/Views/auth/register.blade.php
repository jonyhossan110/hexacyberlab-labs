<h1>Create your workspace</h1>
<form method="post" action="/register" class="form">
<?php echo csrf_field(); ?>
<label>Your name<input name="name" required></label>
<label>Company / workspace<input name="company" required></label>
<label>Email<input name="email" type="email" required></label>
<label>Password<input name="password" type="password" required></label>
<button>Start free</button>
</form>
<p class="muted">Free plan: 3 clients, 10 invoices a month. No card required.</p>
