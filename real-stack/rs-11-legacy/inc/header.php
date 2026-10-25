<?php
/* header.php — the 2009 header, included by every page on the site. */
require_once __DIR__ . '/labbar.php';
$bt_user = function_exists('current_user') ? current_user() : null;
?>
<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title><?php echo isset($PAGE_TITLE) ? htmlspecialchars($PAGE_TITLE) . ' · ' : ''; ?>BrightTravel — Sunshine holidays since 2009</title>
<link rel="stylesheet" href="/assets/style.css"></head>
<body>
<?php lab_bar(); ?>
<div class="masthead">
  <a class="brand" href="/index.php">☀ BrightTravel</a>
  <div class="tagline">Sunshine holidays since 2009 · Call us: 01632 960 555</div>
</div>
<div class="navbar">
  <a href="/index.php">Home</a><a href="/search.php">Search hotels</a><a href="/guestbook.php">Guestbook</a><a href="/page.php?show=about">About us</a><a href="/page.php?show=contact">Contact</a>
  <?php if ($bt_user) { ?>
    <a href="/bookings.php">My bookings</a><a href="/account.php">My account</a>
    <?php if ($bt_user['role'] === 'admin') echo '<a href="/admin.php">Admin panel</a>'; ?>
    <?php if ($bt_user['role'] === 'staff') echo '<a href="/admin.php">Staff</a>'; ?>
    <a href="/logout.php">Log out (<?php echo htmlspecialchars($bt_user['username']); ?>)</a>
  <?php } else { ?>
    <a href="/login.php">Log in</a><a href="/register.php">Register</a>
  <?php } ?>
</div>
<div class="wrap">
