<?php
require_once __DIR__ . '/../inc/common.php';
/* hotel.php — the oldest page on the site. In 2009 the developer used
   extract() on the request "to save typing". Nobody has dared touch it. */
extract($_GET);
$id = isset($id) ? $id : 1;
$sql = "SELECT * FROM hotels WHERE id = " . $id;
try { $h = db()->query($sql)->fetch(PDO::FETCH_ASSOC); } catch (Exception $e) { $h = null; $err = $e->getMessage(); }
$PAGE_TITLE = $h ? $h['name'] : 'Hotel';
include __DIR__ . '/../inc/header.php';
if (isset($err)) echo '<pre class="err">Database error: ' . $err . '</pre>';
if (!$h) { echo '<h1>Hotel not found</h1>'; include __DIR__ . '/../inc/footer.php'; return; }
?>
<h1><?php echo htmlspecialchars($h['name']); ?></h1>
<p class="muted"><?php echo htmlspecialchars($h['city']); ?>, <?php echo htmlspecialchars($h['country']); ?> · <?php echo stars($h['stars']); ?></p>
<p><?php echo htmlspecialchars($h['description']); ?></p>
<p><b><?php echo money($h['price']); ?> per night</b></p>
<?php if (!empty($h['photo'])) echo '<p><img src="' . htmlspecialchars($h['photo']) . '" style="max-width:420px;border-radius:10px"></p>'; ?>
<p>To book, call 01632 960 555 or <a href="/register.php">register</a> and we will set your booking up — the online booking button has been "coming soon" since 2014.</p>
<?php include __DIR__ . '/../inc/footer.php'; ?>
