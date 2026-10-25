<?php
class TeamController {
    public static function index(){
        $u = current_user();
        $st = db()->prepare("SELECT * FROM users WHERE workspace_id = ? ORDER BY id");
        $st->execute([$u['workspace_id']]);
        echo view('team', ['title' => 'Team', 'members' => $st->fetchAll(PDO::FETCH_ASSOC)]);
    }
}
