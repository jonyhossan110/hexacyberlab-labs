<?php
class ClientController {
    public static function index(){
        $u = current_user();
        $q = $_GET['q'] ?? '';
        $err = null; $rows = [];
        /* The one raw query in the app ("needed the LIKE to be flexible").
           The workspace scope is glued onto the end of the same string, so a
           comment payload strips it away entirely. DB::raw in spirit.
           out of the quotes breaks out of the tenancy. DB::raw in spirit. */
        $sql = "SELECT * FROM clients WHERE (name LIKE '%" . $q . "%' OR company LIKE '%" . $q . "%' OR email LIKE '%" . $q . "%')" .
               " AND workspace_id = " . (int)$u['workspace_id'] . " ORDER BY id";
        try {
            $rows = db()->query($sql)->fetchAll(PDO::FETCH_ASSOC);
            foreach ($rows as $r) {
                if ((int)$r['workspace_id'] !== (int)$u['workspace_id']) { rs_pass('sqli-raw'); break; }
            }
        } catch (Exception $e) { $err = $e->getMessage(); }
        echo view('clients.index', ['title' => 'Clients', 'clients' => $rows, 'q' => $q, 'err' => $err]);
    }
    public static function show($id){
        $u = current_user();
        $client = Client::find($id);
        if (!$client || (int)$client->workspace_id !== (int)$u['workspace_id']) {
            http_response_code(404);
            layout_head('Not Found'); echo '<h1>Client not found</h1>'; layout_foot(); return;
        }
        /* Stored-XSS detection, RS-01 style: the notes are about to be printed
           RAW by the view ({!! !!}). If markup is sitting in them, it lands. */
        $notes = (string)$client->notes;
        if (strpos($notes, '<script') !== false || strpos($notes, 'onerror') !== false || strpos($notes, '<svg') !== false || strpos($notes, '<img') !== false) {
            rs_pass('blade-xss');
        }
        $st = db()->prepare("SELECT * FROM invoices WHERE client_id = ? ORDER BY id DESC");
        $st->execute([$client->id]);
        echo view('clients.show', ['title' => $client->name, 'client' => $client->attrs, 'invoices' => $st->fetchAll(PDO::FETCH_ASSOC)]);
    }
    public static function store(){
        $u = current_user();
        $client = new Client();
        $client->fill($_POST);   // Client is fillable-guarded — only the listed fields land
        db()->prepare("INSERT INTO clients (workspace_id,name,company,email,notes,created) VALUES (?,?,?,?,?,date('now'))")
            ->execute([$u['workspace_id'], $client->name, $client->company, $client->email, $client->notes]);
        hb_log('CLIENT created ' . $client->name);
        redirect_to('/clients/' . db()->lastInsertId());
    }
    public static function updateNotes($id){
        $u = current_user();
        $client = Client::find($id);
        if (!$client || (int)$client->workspace_id !== (int)$u['workspace_id']) { http_response_code(404); echo 'Not found'; return; }
        db()->prepare("UPDATE clients SET notes = ? WHERE id = ?")->execute([$_POST['notes'] ?? '', $id]);
        hb_log('CLIENT notes updated #' . $id);
        redirect_to('/clients/' . $id);
    }
}
