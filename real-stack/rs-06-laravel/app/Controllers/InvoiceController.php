<?php
class InvoiceController {
    public static function index(){
        $u = current_user();
        $st = db()->prepare("SELECT i.*, c.name AS client_name FROM invoices i JOIN clients c ON c.id = i.client_id WHERE i.workspace_id = ? ORDER BY i.id DESC");
        $st->execute([$u['workspace_id']]);
        echo view('invoices.index', ['title' => 'Invoices', 'invoices' => $st->fetchAll(PDO::FETCH_ASSOC)]);
    }
    public static function show($id){
        $u = current_user();
        $invoice = Invoice::find($id);
        if (!$invoice) { http_response_code(404); layout_head('Not Found'); echo '<h1>Invoice not found</h1>'; layout_foot(); return; }
        /* Authenticated? yes. Authorised for THIS workspace? The controller
           never asks. Any signed-in user can open any invoice by id. */
        if ((int)$invoice->workspace_id !== (int)$u['workspace_id']) {
            rs_pass('idor-invoice');
            hb_log('IDOR invoice #' . $invoice->id . ' (workspace ' . $invoice->workspace_id . ') opened by workspace ' . $u['workspace_id']);
        }
        $client = Client::find($invoice->client_id);
        $st = db()->prepare("SELECT * FROM attachments WHERE invoice_id = ? ORDER BY id");
        $st->execute([$invoice->id]);
        echo view('invoices.show', ['title' => 'Invoice ' . $invoice->number, 'invoice' => $invoice->attrs,
            'client' => $client ? $client->attrs : [], 'attachments' => $st->fetchAll(PDO::FETCH_ASSOC)]);
    }
    public static function pdf($id){
        require_login();
        $file = $_GET['file'] ?? '';
        if ($file === '') {
            $invoice = Invoice::find($id);
            $file = $invoice ? 'invoice-' . $invoice->number . '.txt' : '';
        }
        // the "PDF export" joins the requested name straight onto the folder
        $path = LAB_ROOT . '/storage/invoices/' . $file;
        if (!is_file($path)) { http_response_code(404); layout_head('Not Found'); echo '<h1>Export not found</h1>'; layout_foot(); return; }
        $content = file_get_contents($path);
        if (strpos($file, '..') !== false && (strpos($content, 'APP_KEY') !== false || strpos($content, 'HEXABILLING') !== false || strpos($content, '<?php') !== false)) {
            rs_pass('path-traversal');
        }
        hb_log('INVOICE export download ' . $file);
        header('Content-Type: text/plain');
        echo $content;
    }
    public static function attach($id){
        $u = current_user();
        $invoice = Invoice::find($id);
        if (!$invoice) { http_response_code(404); echo 'Not found'; return; }
        if (!empty($_FILES['attachment']['name'])) {
            /* No extension check, no MIME check, original filename kept, and
               the folder is web-reachable storage where PHP executes. */
            $name = $_FILES['attachment']['name'];
            $dest = LAB_ROOT . '/storage/attachments/' . $name;
            if (move_uploaded_file($_FILES['attachment']['tmp_name'], $dest)) {
                db()->prepare("INSERT INTO attachments (invoice_id, filename, uploaded_by) VALUES (?,?,?)")
                    ->execute([$invoice->id, $name, $u['id']]);
                hb_log('ATTACHMENT uploaded ' . $name . ' to invoice #' . $invoice->id);
            }
        }
        redirect_to('/invoices/' . $id);
    }
    public static function paid($id){
        $invoice = Invoice::find($id);
        if ($invoice) { $invoice->fill(['status' => 'paid']); $invoice->save(); hb_log('INVOICE #' . $id . ' marked paid'); }
        redirect_to('/invoices/' . $id);
    }
    public static function void($id){
        /* This route was registered WITHOUT the CSRF middleware (see
           routes/web.php) and its form carries no _token. Detection mirrors
           RS-01: the state change succeeded on a tokenless request that did
           not come from this app's own pages. */
        $invoice = Invoice::find($id);
        if ($invoice) {
            $invoice->fill(['status' => 'void']); $invoice->save();
            hb_log('INVOICE #' . $id . ' VOIDED');
            $hasToken = !empty($_POST['_token']);
            $ref = $_SERVER['HTTP_REFERER'] ?? '';
            $refHost = $ref ? parse_url($ref, PHP_URL_HOST) . ':' . (parse_url($ref, PHP_URL_PORT) ?: '') : '';
            if (!$hasToken && ($ref === '' || $refHost !== ($_SERVER['HTTP_HOST'] ?? ''))) rs_pass('csrf-missing');
        }
        redirect_to('/invoices/' . $id);
    }
}
