<h1>{{ $client['name'] }}</h1>
<p>{{ $client['company'] }} · {{ $client['email'] }} · client since {{ $client['created'] }}</p>
<h2>Internal notes</h2>
<div class="review">{!! $client['notes'] !!}</div>
<form method="post" action="/clients/{{ $client['id'] }}/notes" class="form">
<?php echo csrf_field(); ?>
<label>Update notes<textarea name="notes">{{ $client['notes'] }}</textarea></label>
<button>Save notes</button>
</form>
<h2>Invoices</h2>
@foreach($invoices as $inv)
<div class="review"><b><a href="/invoices/{{ $inv['id'] }}">{{ $inv['number'] }}</a></b> — €{{ number_format($inv['amount'], 2) }} · {{ $inv['status'] }} · due {{ $inv['due'] }}</div>
@endforeach
