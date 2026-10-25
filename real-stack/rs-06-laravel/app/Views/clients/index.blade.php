<h1>Clients</h1>
<form method="get" action="/clients" class="searchbar"><input name="q" value="{{ $q }}" placeholder="Search clients by name, company or email"><button>Search</button></form>
@if($err)
<pre class="err">Database error: {{ $err }}</pre>
@endif
<p class="muted">{{ count($clients) }} client(s)</p>
@foreach($clients as $c)
<div class="review"><b><a href="/clients/{{ $c['id'] }}">{{ $c['name'] }}</a></b> — {{ $c['company'] }} · {{ $c['email'] }}</div>
@endforeach
<h2>Add a client</h2>
<form method="post" action="/clients" class="form">
<?php echo csrf_field(); ?>
<label>Contact name<input name="name" required></label>
<label>Company<input name="company"></label>
<label>Billing email<input name="email" type="email"></label>
<label>Notes (shown on the client page)<textarea name="notes"></textarea></label>
<button>Add client</button>
</form>
