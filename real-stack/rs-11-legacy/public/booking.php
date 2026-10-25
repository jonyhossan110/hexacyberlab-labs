<?php
require_once __DIR__ . '/../inc/common.php';
require_login();
$u = current_user();
$PAGE_TITLE = 'Booking details';
$id = isset($_GET['id']) ? $_GET['id'] : '0';
// booking lookup, 2009 style: by number alone. Whose number? Never asked.
$sql = "SELECT b.*, h.name AS hotel, h.city AS city FROM bookings b JOIN hotels h ON h.id = b.hotel_id WHERE b.id = " . $id;
try { $b = db()->query($sql)->fetch(PDO::FETCH_ASSOC); } catch (Exception $e) { $b = null; $err = $e->getMessage(); }
if ($b && (int)$b['user_id'] !== (int)$u['id']) {
    rs_pass('idor-booking');
    bt_log('IDOR booking #' . $b['id'] . ' viewed by ' . $u['username']);
}
include __DIR__ . '/../inc/header.php';
if (isset($err)) echo '<pre class="err">Database error: ' . $err . '</pre>';
if (!$b) { echo '<h1>Booking not found</h1>'; include __DIR__ . '/../inc/footer.php'; return; }
?>
<h1>Booking #<?php echo $b['id']; ?></h1>
<table class="gridtable">
<tr><th>Guest</th><td><?php echo htmlspecialchars($b['guest_name']); ?></td></tr>
<tr><th>Email</th><td><?php echo htmlspecialchars($b['guest_email']); ?></td></tr>
<tr><th>Phone</th><td><?php echo htmlspecialchars($b['phone']); ?></td></tr>
<tr><th>Hotel</th><td><?php echo htmlspecialchars($b['hotel']); ?> (<?php echo htmlspecialchars($b['city']); ?>)</td></tr>
<tr><th>Stay</th><td><?php echo $b['checkin']; ?> → <?php echo $b['checkout']; ?> · <?php echo (int)$b['guests']; ?> guest(s)</td></tr>
<tr><th>Total</th><td><?php echo money($b['total']); ?> · <?php echo htmlspecialchars($b['status']); ?></td></tr>
<tr><th>Notes</th><td><?php echo htmlspecialchars($b['notes']); ?></td></tr>
</table>
<?php include __DIR__ . '/../inc/footer.php'; ?>
