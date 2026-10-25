<?php
class DashboardController {
    public static function home(){
        if (current_user()) { redirect_to('/dashboard'); }
        echo view('home', ['title' => 'Invoicing that feels effortless']);
    }
    public static function index(){
        $u = current_user();
        $ws = (int)$u['workspace_id'];
        $counts = [
            'clients'  => db()->query("SELECT COUNT(*) FROM clients WHERE workspace_id = $ws")->fetchColumn(),
            'invoices' => db()->query("SELECT COUNT(*) FROM invoices WHERE workspace_id = $ws")->fetchColumn(),
            'outstanding' => db()->query("SELECT COALESCE(SUM(amount),0) FROM invoices WHERE workspace_id = $ws AND status IN ('sent','overdue')")->fetchColumn(),
            'paid' => db()->query("SELECT COALESCE(SUM(amount),0) FROM invoices WHERE workspace_id = $ws AND status = 'paid'")->fetchColumn(),
        ];
        $st = db()->prepare("SELECT i.*, c.name AS client_name FROM invoices i JOIN clients c ON c.id = i.client_id WHERE i.workspace_id = ? ORDER BY i.id DESC LIMIT 6");
        $st->execute([$ws]);
        echo view('dashboard', ['title' => 'Dashboard', 'counts' => $counts, 'recent' => $st->fetchAll(PDO::FETCH_ASSOC)]);
    }
}
