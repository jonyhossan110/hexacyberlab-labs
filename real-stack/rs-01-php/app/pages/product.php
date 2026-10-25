<?php
$id = $_GET['id'] ?? '1';
layout_head('Product');
// product id glued straight into the query — UNION extraction lives here
$sql = "SELECT * FROM products WHERE id = " . $id;
try {
    $res = db()->query($sql)->fetchAll(PDO::FETCH_ASSOC);
    if (stripos((string)$id, 'union') !== false) {
        foreach ($res as $r) { foreach ($r as $v) { if (is_string($v) && strpos($v, '@') !== false && strpos($v, 'example') !== false) { rs_pass('sqli-union'); break 2; } } }
    }
} catch (Exception $e) { $res = []; $err = $e->getMessage(); }
$p = $res[0] ?? null;
if (isset($err)) echo '<pre class="err">Database error: ' . $err . '</pre>';
if (!$p) { echo '<h1>Product not found</h1>'; layout_foot(); return; }
echo '<h1>' . htmlspecialchars($p['name'] ?? '') . '</h1><p>' . htmlspecialchars($p['description'] ?? '') . '</p>' .
'<p><b>' . money($p['price'] ?? 0) . '</b> · ' . htmlspecialchars($p['category'] ?? '') . ' · ' . (int)($p['stock'] ?? 0) . ' in stock</p>';
$pid = (int)$p['id'];
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['review'])) {
    require_login();
    $u = current_user();
    $st = db()->prepare("INSERT INTO reviews (product_id,user_id,author,body,created) VALUES (?,?,?,?,date('now'))");
    $st->execute([$pid, $u['id'], $u['name'], $_POST['review']]);
    header('Location: /product?id=' . $pid); exit;
}
$reviews = db()->query("SELECT * FROM reviews WHERE product_id = " . $pid . " ORDER BY id")->fetchAll(PDO::FETCH_ASSOC);
echo '<h2>Reviews</h2>';
foreach ($reviews as $r) {
    // review bodies are printed raw — stored XSS lives here
    echo '<div class="review"><b>' . htmlspecialchars($r['author']) . '</b> <span class="muted">' . $r['created'] . '</span><p>' . $r['body'] . '</p></div>';
    if (strpos($r['body'], '<script') !== false || strpos($r['body'], 'onerror') !== false || strpos($r['body'], '<svg') !== false) rs_pass('xss-stored');
}
if (current_user()) {
    echo '<form method="post" class="form"><label>Write a review<textarea name="review" required></textarea></label><button>Post review</button></form>';
} else echo '<p><a href="/login">Log in</a> to write a review.</p>';
layout_foot();
