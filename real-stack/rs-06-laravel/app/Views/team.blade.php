<h1>Team — {{ $user['company'] }}</h1>
<p class="muted">Everyone in your workspace. API tokens are shown so admins can help teammates debug integrations.</p>
@foreach($members as $m)
<div class="review"><b>{{ $m['name'] }}</b> — {{ $m['email'] }} · {{ $m['role'] }}<br><span class="muted">API token:</span> <code>{{ $m['api_token'] }}</code></div>
@endforeach
