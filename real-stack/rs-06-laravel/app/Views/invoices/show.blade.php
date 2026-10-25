<h1>Invoice {{ $invoice['number'] }}</h1>
<p>Bill to: <b>{{ $client['name'] ?? '' }}</b> ({{ $client['company'] ?? '' }}) · status: <b>{{ $invoice['status'] }}</b></p>
<p>{{ $invoice['description'] }} — <b>€{{ number_format($invoice['amount'], 2) }}</b> · due {{ $invoice['due'] }} · issued {{ $invoice['created'] }}</p>
<p><a href="/invoices/{{ $invoice['id'] }}/pdf">⬇ Download PDF export</a></p>
<h2>Attachments</h2>
@foreach($attachments as $a)
<div class="review">📎 <a href="/storage/attachments/{{ $a['filename'] }}">{{ $a['filename'] }}</a></div>
@endforeach
<form method="post" action="/invoices/{{ $invoice['id'] }}/attachment" enctype="multipart/form-data" class="form">
<?php echo csrf_field(); ?>
<label>Add an attachment (receipt, signed copy…)<input type="file" name="attachment" required></label>
<button>Upload attachment</button>
</form>
<h2>Actions</h2>
<form method="post" action="/invoices/{{ $invoice['id'] }}/paid" class="inline">
<?php echo csrf_field(); ?>
<button>Mark as paid</button>
</form>
<form method="post" action="/invoices/{{ $invoice['id'] }}/void" class="inline">
<button class="danger">Void invoice</button>
</form>
<p class="muted">Voiding is permanent and notifies the client.</p>
