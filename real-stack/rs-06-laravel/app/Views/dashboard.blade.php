<h1>Hei, {{ $user['name'] }} 👋</h1>
<p class="muted">{{ $user['company'] }} · {{ $user['role'] }} · plan: <b>{{ $user['plan'] }}</b></p>
<div class="grid">
<div class="card"><h3>{{ $counts['clients'] }}</h3><p>Clients</p></div>
<div class="card"><h3>{{ $counts['invoices'] }}</h3><p>Invoices</p></div>
<div class="card"><h3>€{{ number_format($counts['outstanding'], 2) }}</h3><p>Outstanding</p></div>
<div class="card"><h3>€{{ number_format($counts['paid'], 2) }}</h3><p>Collected</p></div>
</div>
<h2>Recent invoices</h2>
@foreach($recent as $inv)
<div class="review"><b><a href="/invoices/{{ $inv['id'] }}">{{ $inv['number'] }}</a></b> — {{ $inv['client_name'] }} · €{{ number_format($inv['amount'], 2) }} · {{ $inv['status'] }} · due {{ $inv['due'] }}</div>
@endforeach
