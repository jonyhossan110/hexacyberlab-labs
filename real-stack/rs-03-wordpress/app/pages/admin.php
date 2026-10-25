<?php
/* wp-admin — the dashboard. Everything a logged-in user may do lives here:
   upload media, and (for administrators) read the contact inbox and change
   the Hexa Contact plugin's settings. */
require_login();
$u = current_user();
$msg = '';

/* --- Media upload -------------------------------------------------------
   The library checks the FINAL extension of the filename and refuses .php.
   It never looks at the rest of the name — and the server in front of the
   uploads folder (see router.php) treats a file the classic Apache way:
   any .php segment in the name makes it a script. shell.php.bak sails
   through both. That gap between checker and server is the bypass. */
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['do']) && $_POST['do'] === 'media' && !empty($_FILES['media']['name'])) {
    $name = basename($_FILES['media']['name']);
    $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
    if ($ext === 'php') {
        $msg = 'Upload rejected: PHP files are not allowed in the media library.';
        hp_log('UPLOAD rejected (php extension) ' . $name . ' by ' . $u['email']);
    } else {
        $dest = LAB_ROOT . '/wp-content/uploads/' . $name;
        if (move_uploaded_file($_FILES['media']['tmp_name'], $dest)) {
            db()->prepare("INSERT INTO media (title,caption,file,uploaded_by,created) VALUES (?,?,?, ?,date('now'))")
                ->execute([trim($_POST['media_title'] ?? $name), trim($_POST['media_caption'] ?? ''), $name, $u['id']]);
            $msg = 'Uploaded: /wp-content/uploads/' . $name;
            hp_log('UPLOAD ok ' . $name . ' by ' . $u['email']);
        } else $msg = 'Upload failed.';
    }
    $u = current_user();
}

/* --- Hexa Contact settings (administrators) ---------------------------- */
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['do']) && $_POST['do'] === 'hc-settings' && is_admin($u)) {
    $msg = hc_save_settings();
    $u = current_user();
}

$counts = [
    'posts' => db()->query("SELECT COUNT(*) FROM posts")->fetchColumn(),
    'comments' => db()->query("SELECT COUNT(*) FROM comments")->fetchColumn(),
    'users' => db()->query("SELECT COUNT(*) FROM users")->fetchColumn(),
    'media' => db()->query("SELECT COUNT(*) FROM media")->fetchColumn(),
];
layout_head('Dashboard');
echo '<h1>Dashboard</h1><p>Welcome back, ' . htmlspecialchars($u['name']) . ' — you are logged in as <b>' . htmlspecialchars($u['role']) . '</b>.</p>' .
($msg ? '<p class="ok">' . htmlspecialchars($msg) . '</p>' : '') .
'<div class="grid">' .
'<div class="card"><h3>' . $counts['posts'] . '</h3><p>Posts</p></div>' .
'<div class="card"><h3>' . $counts['comments'] . '</h3><p>Comments</p></div>' .
'<div class="card"><h3>' . $counts['users'] . '</h3><p>Users</p></div>' .
'<div class="card"><h3>' . $counts['media'] . '</h3><p>Media items</p></div></div>' .

'<h2>Media library — upload</h2>' .
'<p class="muted">Images only, please: the library refuses files whose name ends in .php.</p>' .
'<form method="post" enctype="multipart/form-data" class="form"><input type="hidden" name="do" value="media">' .
'<input type="file" name="media" required><label>Title<input name="media_title"></label><label>Caption<input name="media_caption"></label><button>Upload media</button></form>';

$media = db()->query("SELECT * FROM media ORDER BY id DESC")->fetchAll(PDO::FETCH_ASSOC);
echo '<h3>Library</h3>';
foreach ($media as $m) echo '<div class="review">🖼 <b>' . htmlspecialchars($m['title']) . '</b> — <a href="/wp-content/uploads/' . htmlspecialchars($m['file']) . '">' . htmlspecialchars($m['file']) . '</a> <span class="muted">' . htmlspecialchars($m['caption']) . '</span></div>';

if (is_admin($u)) {
    $latest = db()->query("SELECT * FROM hc_messages ORDER BY id DESC LIMIT 5")->fetchAll(PDO::FETCH_ASSOC);
    echo '<h2>Contact messages — Hexa Contact inbox</h2>' .
    '<p class="muted">Live search runs through the plugin\u{2019}s admin-ajax handler (<code>action=hc_search_messages</code>).</p>' .
    '<form class="searchbar" onsubmit="return hcSearch(event)"><input id="hc-term" placeholder="Search message text…"><button>Search</button></form>' .
    '<pre id="hc-results" class="log" style="display:none"></pre>';
    foreach ($latest as $m) echo '<div class="review"><b>' . htmlspecialchars($m['name']) . '</b> <span class="muted">' . htmlspecialchars($m['email']) . ($m['is_private'] ? ' · 🔒 private' : '') . '</span><p>' . htmlspecialchars($m['body']) . '</p></div>';
    echo '<h2>Hexa Contact — settings</h2>' .
    '<form method="post" class="form"><input type="hidden" name="do" value="hc-settings">' .
    '<label>Notification email<input name="hc_notify_email" value="' . htmlspecialchars(hc_option('hc_notify_email')) . '"></label>' .
    '<label>Messages per page<input name="hc_per_page" value="' . htmlspecialchars(hc_option('hc_per_page')) . '"></label>' .
    '<button>Save settings</button></form>' .
    '<script>function hcSearch(e){e.preventDefault();var t=document.getElementById("hc-term").value;' .
    'fetch("/wp-admin/admin-ajax.php?action=hc_search_messages&term="+encodeURIComponent(t)).then(function(r){return r.text()}).then(function(x){var b=document.getElementById("hc-results");b.style.display="block";b.textContent=x});return false}</script>';
} else {
    echo '<h2>Contact messages & plugin settings</h2><p class="muted">Administrators only. Your role is ' . htmlspecialchars($u['role']) . '.</p>';
}
layout_foot();
