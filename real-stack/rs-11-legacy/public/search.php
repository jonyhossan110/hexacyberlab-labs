<?php
require_once __DIR__ . '/../inc/common.php';
$PAGE_TITLE = 'Search hotels';
$q = isset($_GET['q']) ? $_GET['q'] : '';
// the 2009 search: the words go straight into the LIKE clause
$sql = "SELECT id, name, city, stars, price FROM hotels WHERE name LIKE '%" . $q . "%' OR city LIKE '%" . $q . "%' OR country LIKE '%" . $q . "%' ORDER BY id";
try { $rows = db()->query($sql)->fetchAll(PDO::FETCH_ASSOC); }
catch (Exception $e) { $rows = array(); $err = $e->getMessage(); }
// UNION detection: a users-table row dragged into the hotel columns shows
// either a 32-hex MD5 hash or a seeded email address where a city should be
if (stripos((string)$q, 'union') !== false) {
    foreach ($rows as $r) { foreach ($r as $v) {
        if (is_string($v) && (preg_match('/^[a-f0-9]{32}$/', trim($v)) || (strpos($v, '@') !== false && strpos($v, 'example') !== false))) { rs_pass('sqli-union'); break 2; }
    } }
}
include __DIR__ . '/../inc/header.php';
?>
<h1>Search hotels</h1>
<form action="/search.php" method="get" class="searchbar"><input name="q" value="<?php echo $q; ?>"><button>Search</button></form>
<?php if (isset($err)) echo '<pre class="err">Database error: ' . $err . '</pre>'; ?>
<p class="muted"><?php echo count($rows); ?> result(s) for "<?php echo $q; ?>"</p>
<table class="gridtable"><tr><th>Hotel</th><th>City</th><th>Stars</th><th>Price</th></tr>
<?php foreach ($rows as $r) { ?>
<tr><td><a href="/hotel.php?id=<?php echo $r['id']; ?>"><?php echo htmlspecialchars((string)$r['name']); ?></a></td>
<td><?php echo htmlspecialchars((string)$r['city']); ?></td><td><?php echo htmlspecialchars((string)$r['stars']); ?></td>
<td><?php echo is_numeric($r['price']) ? money($r['price']) : htmlspecialchars((string)$r['price']); ?></td></tr>
<?php } ?>
</table>
<?php include __DIR__ . '/../inc/footer.php'; ?>
