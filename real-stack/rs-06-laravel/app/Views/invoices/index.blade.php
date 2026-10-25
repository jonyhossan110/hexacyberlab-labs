<h1>Invoices</h1>
@foreach($invoices as $inv)
<div class="review"><b><a href="/invoices/{{ $inv['id'] }}">{{ $inv['number'] }}</a></b> — {{ $inv['client_name'] }} · €{{ number_format($inv['amount'], 2) }} · <b>{{ $inv['status'] }}</b> · due {{ $inv['due'] }}</div>
@endforeach
