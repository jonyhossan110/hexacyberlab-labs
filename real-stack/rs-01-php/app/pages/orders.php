<?php
require_login();
$u = current_user();
$rows = db()->query("SELECT * FROM orders WHERE user_id = " . (int)$u['id'] . " ORDER BY id DESC")->fetchAll(PDO::FETCH_ASSOC);
layout_head('My Orders');
echo '<h1>My orders</h1>';
if (!$rows) echo '<p>No orders yet.</p>';
foreach ($rows as $o) echo '<div class="review"><b>Order #' . $o['id'] . '</b> — ' . htmlspecialchars($o['items']) . ' · ' . money($o['total']) . ' · ' . htmlspecialchars($o['status']) . ' · ' . $o['created'] . ' <a href="/order?id=' . $o['id'] . '">details</a></div>';
layout_foot();
