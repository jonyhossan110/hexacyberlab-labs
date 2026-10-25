<?php
require_once __DIR__ . '/../inc/common.php';
$id = isset($_GET['id']) ? $_GET['id'] : '1';
$sql = "SELECT * FROM packages WHERE id = " . $id;
try { $p = db()->query($sql)->fetch(PDO::FETCH_ASSOC); } catch (Exception $e) { $p = null; $err = $e->getMessage(); }
$PAGE_TITLE = $p ? $p['title'] : 'Package';
include __DIR__ . '/../inc/header.php';
if (isset($err)) echo '<pre class="err">Database error: ' . $err . '</pre>';
if (!$p) { echo '<h1>Package not found</h1>'; include __DIR__ . '/../inc/footer.php'; return; }
?>
<h1><?php echo htmlspecialchars($p['title']); ?></h1>
<p><b><?php echo (int)$p['days']; ?> days · <?php echo money($p['price']); ?> per person</b></p>
<p><?php echo htmlspecialchars($p['blurb']); ?></p>
<p>Call 01632 960 555 to book this package.</p>
<?php include __DIR__ . '/../inc/footer.php'; ?>
