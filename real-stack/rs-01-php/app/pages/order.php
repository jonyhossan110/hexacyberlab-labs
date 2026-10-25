<?php
require_login();
$u = current_user();
$id = $_GET['id'] ?? '0';
// order lookup never checks who owns the order — IDOR lives here
$st = db()->prepare("SELECT * FROM orders WHERE id = ?"); $st->execute([$id]);
$o = $st->fetch(PDO::FETCH_ASSOC);
layout_head('Order');
if (!$o) { echo '<h1>Order not found</h1>'; layout_foot(); return; }
if ((int)$o['user_id'] !== (int)$u['id']) rs_pass('idor-order');
$owner = db()->query("SELECT name,email FROM users WHERE id = " . (int)$o['user_id'])->fetch(PDO::FETCH_ASSOC);
echo '<h1>Order #' . $o['id'] . '</h1><p>Customer: ' . htmlspecialchars($owner['name']) . ' (' . htmlspecialchars($owner['email']) . ')</p>' .
'<p>Items: ' . htmlspecialchars($o['items']) . '</p><p>Total: ' . money($o['total']) . '</p><p>Status: ' . htmlspecialchars($o['status']) . '</p><p>Date: ' . $o['created'] . '</p>';
layout_foot();
