<?php
require_once __DIR__ . '/../inc/common.php';
$PAGE_TITLE = 'Home';
$hotels = db()->query("SELECT * FROM hotels ORDER BY stars DESC, id LIMIT 6")->fetchAll(PDO::FETCH_ASSOC);
$packages = db()->query("SELECT * FROM packages ORDER BY id")->fetchAll(PDO::FETCH_ASSOC);
include __DIR__ . '/../inc/header.php';
?>
<div class="hero"><h1>Sunshine holidays since 2009</h1>
<p>Family-run, phone-friendly, and proud of it. Search 10 hand-picked hotels or browse this season's packages.</p>
<form action="/search.php" method="get" class="searchbar"><input name="q" placeholder="Try: beach, Bergen, cave…"><button>Search hotels</button></form></div>
<h2>Featured hotels</h2><div class="grid">
<?php foreach ($hotels as $h) { ?>
  <a class="card" href="/hotel.php?id=<?php echo $h['id']; ?>"><h3><?php echo htmlspecialchars($h['name']); ?></h3>
  <p class="muted"><?php echo htmlspecialchars($h['city']); ?>, <?php echo htmlspecialchars($h['country']); ?> · <?php echo stars($h['stars']); ?></p>
  <p><?php echo htmlspecialchars($h['description']); ?></p><b><?php echo money($h['price']); ?> / night</b></a>
<?php } ?>
</div>
<h2>This season's packages</h2>
<?php foreach ($packages as $p) { ?>
  <div class="review"><b><a href="/package.php?id=<?php echo $p['id']; ?>"><?php echo htmlspecialchars($p['title']); ?></a></b> — <?php echo (int)$p['days']; ?> days · <?php echo money($p['price']); ?><p class="muted"><?php echo htmlspecialchars($p['blurb']); ?></p></div>
<?php } ?>
<p class="muted">Guests say lovely things in our <a href="/guestbook.php">guestbook</a>.</p>
<?php include __DIR__ . '/../inc/footer.php'; ?>
