<?php
require_once __DIR__ . '/../inc/common.php';
require_login();
$u = current_user();
$PAGE_TITLE = 'My bookings';
// one of the few queries on the site written properly, by the 2019 temp
$st = db()->prepare("SELECT b.*, h.name AS hotel FROM bookings b JOIN hotels h ON h.id = b.hotel_id WHERE b.user_id = ? ORDER BY b.id DESC");
$st->execute(array($u['id']));
$rows = $st->fetchAll(PDO::FETCH_ASSOC);
include __DIR__ . '/../inc/header.php';
?>
<h1>My bookings</h1>
<?php if (!$rows) echo '<p>No bookings yet — call us and we will put that right.</p>'; ?>
<?php foreach ($rows as $b) { ?>
<div class="review"><b>Booking #<?php echo $b['id']; ?> — <?php echo htmlspecialchars($b['hotel']); ?></b>
· <?php echo $b['checkin']; ?> → <?php echo $b['checkout']; ?> · <?php echo money($b['total']); ?> · <?php echo htmlspecialchars($b['status']); ?>
<a href="/booking.php?id=<?php echo $b['id']; ?>">details</a></div>
<?php } ?>
<?php include __DIR__ . '/../inc/footer.php'; ?>
