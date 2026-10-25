<?php
/* Database layer. PDO + SQLite so the app runs anywhere with zero setup —
   schema and seed model a real multi-tenant billing SaaS. */
function db(){
    static $pdo = null;
    if ($pdo) return $pdo;
    $fresh = !is_file(cfg('db_file'));
    $pdo = new PDO('sqlite:' . cfg('db_file'));
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    if ($fresh) hb_seed($pdo);
    return $pdo;
}
function hb_seed($pdo){
    $pdo->exec("CREATE TABLE workspaces (id INTEGER PRIMARY KEY, name TEXT, plan TEXT)");
    $pdo->exec("CREATE TABLE users (id INTEGER PRIMARY KEY, workspace_id INTEGER, name TEXT, email TEXT UNIQUE, password TEXT, role TEXT, company TEXT, plan TEXT, is_admin INTEGER DEFAULT 0, api_token TEXT)");
    $pdo->exec("CREATE TABLE clients (id INTEGER PRIMARY KEY, workspace_id INTEGER, name TEXT, company TEXT, email TEXT, notes TEXT, created TEXT)");
    $pdo->exec("CREATE TABLE invoices (id INTEGER PRIMARY KEY, workspace_id INTEGER, client_id INTEGER, number TEXT, description TEXT, amount REAL, status TEXT, due TEXT, created TEXT)");
    $pdo->exec("CREATE TABLE attachments (id INTEGER PRIMARY KEY, invoice_id INTEGER, filename TEXT, uploaded_by INTEGER)");
    $ws = $pdo->prepare("INSERT INTO workspaces (name, plan) VALUES (?,?)");
    foreach ([['Brightpath Studio AS','pro'],['Fjell Media AS','free'],['Casa Verde Interiors','pro']] as $w) $ws->execute($w);
    $users = [
        [1,'Mara Ellingsen','mara@brightpath.example','Studio!Owner7','owner','Brightpath Studio AS','pro','hb_live_7f3a9c1e54b248d6a0e5f917c2b84d30'],
        [1,'Tomas Lindqvist','tomas@brightpath.example','Ledger#2024','accountant','Brightpath Studio AS','pro','hb_live_2b8f04d7a1c94e63b5d208f7a93e6c51'],
        [1,'Ingrid Voss','ingrid@brightpath.example','Viewer!Pass3','viewer','Brightpath Studio AS','pro','hb_live_9d41c7a2e6b04f85a3d19c27e5f60b84'],
        [2,'Henrik Aas','henrik@fjellmedia.example','Fjell!Media8','owner','Fjell Media AS','free','hb_live_51ae93c08d724b6f9c1a47e2d805b369'],
        [2,'Sara Lindholm','sara@fjellmedia.example','Konto#Sun42','accountant','Fjell Media AS','free','hb_live_c6048f2d97a14b3e85d6c019f47a2b95'],
        [3,'Lucia Ferrero','lucia@casaverde.example','Verde!Casa6','owner','Casa Verde Interiors','pro','hb_live_86b2d519f0a34c7d94e6a821c5f93047'],
        [3,'Marco Bianchi','marco@casaverde.example','Fattura#911','accountant','Casa Verde Interiors','pro','hb_live_3f97a0c5d8e24b61a4c730e9d52f186a'],
    ];
    $st = $pdo->prepare("INSERT INTO users (workspace_id,name,email,password,role,company,plan,api_token) VALUES (?,?,?,?,?,?,?,?)");
    foreach ($users as $u) $st->execute($u);
    $clients = [
        [1,'Nordwind Logistics','Nordwind Logistics AS','accounts@nordwind.example','Pays on the 15th, always. Prefers PDF by email.','2026-08-14'],
        [1,'Kaffa Roasters','Kaffa Roasters ApS','billing@kaffa.example','Small roastery in Copenhagen. Net-14 terms agreed.','2026-08-29'],
        [1,'Elv & Co Architects','Elv og Co Arkitekter AS','office@elvco.example','Retainer client since 2024.','2026-09-05'],
        [1,'Pirbadet Gym','Pirbadet Treningssenter AS','post@pirbadet.example','Seasonal — invoices pause in July.','2026-09-19'],
        [2,'Tromsø Tours','Tromsø Opplevelser AS','faktura@tromsotours.example','Winter season is their whole year.','2026-09-02'],
        [2,'Polar Eiendom','Polar Eiendom AS','post@polareiendom.example','Property management, three buildings.','2026-09-11'],
        [2,'Havbris Fisheries','Havbris Fiskeri AS','regnskap@havbris.example','Pays late but always pays.','2026-09-25'],
        [3,'Olio Toscano','Olio Toscano SRL','amministrazione@oliotoscano.example','Olive oil exporter, Siena.','2026-08-21'],
        [3,'Albergo Luna','Albergo Luna SRL','contabilita@albergoluna.example','Family hotel, monthly retainer.','2026-09-08'],
        [3,'Studio Legale Romano','Studio Legale Romano','segreteria@legaleromano.example','Law firm — wants itemised invoices.','2026-09-30'],
    ];
    $st = $pdo->prepare("INSERT INTO clients (workspace_id,name,company,email,notes,created) VALUES (?,?,?,?,?,?)");
    foreach ($clients as $c) $st->execute($c);
    $invoices = [
        [1,1,'INV-1001','Brand identity package — final milestone',4200.00,'paid','2026-10-01','2026-09-16'],
        [1,2,'INV-1002','Packaging design for winter blend',1350.00,'sent','2026-10-20','2026-10-06'],
        [1,3,'INV-1003','Monthly retainer — October',2800.00,'sent','2026-10-31','2026-10-01'],
        [1,1,'INV-1004','Warehouse signage set',760.00,'draft','2026-11-05','2026-10-12'],
        [1,4,'INV-1005','Campaign photography day',990.00,'overdue','2026-10-05','2026-09-20'],
        [2,5,'INV-2001','Website hosting & care — Q4',540.00,'paid','2026-10-10','2026-09-25'],
        [2,6,'INV-2002','Tenant portal maintenance',1875.00,'sent','2026-10-28','2026-10-08'],
        [2,7,'INV-2003','Onboard connectivity survey',3200.00,'sent','2026-11-02','2026-10-13'],
        [3,8,'INV-3001','Label redesign — harvest 2026',2140.00,'paid','2026-09-30','2026-09-15'],
        [3,9,'INV-3002','Monthly bookkeeping retainer',850.00,'sent','2026-10-25','2026-10-03'],
        [3,10,'INV-3003','VAT filing support — Q3',1275.00,'draft','2026-11-08','2026-10-14'],
        [1,2,'INV-1006','Menu boards for two cafés',615.00,'paid','2026-09-18','2026-09-02'],
        [2,5,'INV-2004','Northern lights season landing page',1490.00,'sent','2026-10-22','2026-10-07'],
    ];
    $st = $pdo->prepare("INSERT INTO invoices (workspace_id,client_id,number,description,amount,status,due,created) VALUES (?,?,?,?,?,?,?,?)");
    foreach ($invoices as $i) $st->execute($i);
}
