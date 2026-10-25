<?php
require_once __DIR__ . '/../inc/common.php';
$u = require_admin();
/* The chain completes here: an admin session that ARRIVED through an
   exploit (not a seeded, documented login) reaching this panel. */
if (!empty($_SESSION['exploit_path'])) {
    rs_pass('admin-takeover');
    bt_log('ADMIN PANEL reached via ' . $_SESSION['exploit_path'] . ' as ' . $u['username']);
}
$PAGE_TITLE = 'Admin panel';
$msg = '';

/* --- "Add user" — built as a GET link in 2009 so Margaret could bookmark it.
       No token, no method check, no referer check. It still works. --- */
if (isset($_GET['action']) && $_GET['action'] === 'adduser' && !empty($_GET['username'])) {
    $nu = $_GET['username']; $np = isset($_GET['password']) ? $_GET['password'] : 'changeme';
    $nr = isset($_GET['role']) ? $_GET['role'] : 'customer';
    try {
        $st = db()->prepare("INSERT INTO users (username,fullname,email,passhash,role,created) VALUES (?,?,?,?,?,date('now'))");
        $st->execute(array($nu, $nu, $nu . '@brighttravel.example', md5($np), $nr));
        $msg = 'User ' . $nu . ' (' . $nr . ') created.';
        bt_log('ADMIN adduser ' . $nu . ' role=' . $nr . ' by ' . $u['username']);
        if ($nr === 'admin') {
            $ref = isset($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : '';
            $refHost = $ref ? parse_url($ref, PHP_URL_HOST) . ':' . (parse_url($ref, PHP_URL_PORT) ? parse_url($ref, PHP_URL_PORT) : '') : '';
            if (empty($_GET['token']) && ($ref === '' || $refHost !== $_SERVER['HTTP_HOST'])) {
                rs_pass('csrf-admin');
                $prog = rs_progress(); $prog['csrf_admin_user'] = $nu; rs_save($prog);
                bt_log('CSRF admin creation detected (tokenless, cross-origin) -> ' . $nu);
            }
        }
    } catch (Exception $e) { $msg = 'Could not create user: ' . $e->getMessage(); }
}

/* --- "Import hotel photo from URL" — the server fetches whatever it is given. --- */
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['do']) && $_POST['do'] === 'import') {
    $url = trim($_POST['url'] ?? '');
    $ctx = stream_context_create(array('http' => array('timeout' => 4)));
    $content = ($url !== '') ? @file_get_contents($url, false, $ctx) : false;
    if ($content !== false && strlen($content) > 0) {
        $saved = '/uploads/imported-' . time() . '.jpg';
        file_put_contents(LAB_ROOT . $saved, $content);
        $msg = 'Imported ' . strlen($content) . ' bytes to ' . $saved;
        bt_log('IMPORT fetched ' . $url . ' (' . strlen($content) . ' bytes)');
        $host = parse_url($url, PHP_URL_HOST); $scheme = parse_url($url, PHP_URL_SCHEME);
        if ($scheme === 'file' || in_array($host, array('127.0.0.1', 'localhost', '::1'), true)
            || strpos($content, 'BT-CONFIG') !== false || strpos($content, 'BT-INTRANET') !== false) {
            rs_pass('ssrf-import');
            bt_log('SSRF import of an internal target: ' . $url);
        }
    } else $msg = 'Import failed — nothing came back from that URL.';
}

$users = db()->query("SELECT * FROM users ORDER BY id")->fetchAll(PDO::FETCH_ASSOC);
$bookings = db()->query("SELECT b.*, h.name AS hotel FROM bookings b JOIN hotels h ON h.id = b.hotel_id ORDER BY b.id DESC LIMIT 12")->fetchAll(PDO::FETCH_ASSOC);
include __DIR__ . '/../inc/header.php';
?>
<h1>Admin panel</h1>
<p class="muted">Signed in as <?php echo htmlspecialchars($u['username']); ?> (<?php echo htmlspecialchars($u['role']); ?>). Handle with care — everything on this page works exactly as dangerously as it looks.</p>
<?php if ($msg) echo '<p class="ok">' . htmlspecialchars($msg) . '</p>'; ?>
<h2>Users (with password hashes — "for support")</h2>
<table class="gridtable"><tr><th>ID</th><th>Username</th><th>Name</th><th>Email</th><th>MD5 hash</th><th>Role</th></tr>
<?php foreach ($users as $x) { ?>
<tr><td><?php echo $x['id']; ?></td><td><?php echo htmlspecialchars($x['username']); ?></td><td><?php echo htmlspecialchars($x['fullname']); ?></td>
<td><?php echo htmlspecialchars($x['email']); ?></td><td><code><?php echo htmlspecialchars($x['passhash']); ?></code></td><td><?php echo htmlspecialchars($x['role']); ?></td></tr>
<?php } ?>
</table>
<h2>Add a user</h2>
<form method="get" action="/admin.php" class="form">
<input type="hidden" name="action" value="adduser">
<label>Username<input name="username" required></label>
<label>Password<input name="password" value="changeme"></label>
<label>Role<select name="role"><option>customer</option><option>staff</option><option>admin</option></select></label>
<button>Create user</button></form>
<h2>Import a hotel photo from a URL</h2>
<form method="post" class="form"><input type="hidden" name="do" value="import">
<label>Image URL<input name="url" placeholder="http://partner-photos.example/hotel1.jpg"></label><button>Import</button></form>
<h2>Latest bookings</h2>
<table class="gridtable"><tr><th>#</th><th>Guest</th><th>Hotel</th><th>Stay</th><th>Total</th><th>Status</th></tr>
<?php foreach ($bookings as $b) { ?>
<tr><td><?php echo $b['id']; ?></td><td><?php echo htmlspecialchars($b['guest_name']); ?></td><td><?php echo htmlspecialchars($b['hotel']); ?></td>
<td><?php echo $b['checkin']; ?> → <?php echo $b['checkout']; ?></td><td><?php echo money($b['total']); ?></td><td><?php echo htmlspecialchars($b['status']); ?></td></tr>
<?php } ?>
</table>
<?php include __DIR__ . '/../inc/footer.php'; ?>
