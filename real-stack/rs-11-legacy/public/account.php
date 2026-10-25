<?php
require_once __DIR__ . '/../inc/common.php';
require_login();
$u = current_user();
$PAGE_TITLE = 'My account';
$msg = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['do']) && $_POST['do'] === 'photo' && !empty($_FILES['photo']['name'])) {
    // holiday-photo upload: keeps its name, lands in uploads/, no checks at all
    $name = $_FILES['photo']['name'];
    $dest = LAB_ROOT . '/uploads/' . $name;
    if (move_uploaded_file($_FILES['photo']['tmp_name'], $dest)) {
        $msg = 'Photo uploaded: /uploads/' . $name;
        bt_log('PHOTO upload ' . $name . ' by ' . $u['username']);
    } else $msg = 'Upload failed.';
}
include __DIR__ . '/../inc/header.php';
?>
<h1>My account</h1>
<p><?php echo htmlspecialchars($u['fullname']); ?> · <?php echo htmlspecialchars($u['email']); ?> · username: <?php echo htmlspecialchars($u['username']); ?> · role: <?php echo htmlspecialchars($u['role']); ?></p>
<?php if ($msg) echo '<p class="ok">' . htmlspecialchars($msg) . '</p>'; ?>
<h2>Share a holiday photo</h2>
<p class="muted">Upload a photo from your trip and it appears in your holiday album straight away.</p>
<form method="post" enctype="multipart/form-data" class="form"><input type="hidden" name="do" value="photo"><input type="file" name="photo" required><button>Upload photo</button></form>
<p><a href="/bookings.php">My bookings</a></p>
<?php include __DIR__ . '/../inc/footer.php'; ?>
