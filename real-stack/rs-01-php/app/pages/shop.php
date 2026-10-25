<?php
$q = $_GET['q'] ?? '';
layout_head('Shop');
// the developer built search by gluing the query straight into the SQL
$sql = "SELECT * FROM products WHERE name LIKE '%" . $q . "%' OR category LIKE '%" . $q . "%' ORDER BY id";
try { $rows = db()->query($sql)->fetchAll(PDO::FETCH_ASSOC); }
catch (Exception $e) { $rows = []; $err = $e->getMessage(); }
echo '<h1>Shop</h1><form action="/shop" method="get" class="searchbar"><input name="q" value="' . $q . '" placeholder="Search the store"><button>Search</button></form>';
// NOTE: $q is printed back into the page without escaping — reflected XSS lives here
if (isset($err)) echo '<pre class="err">Database error: ' . $err . '</pre>';
echo '<p class="muted">' . count($rows) . ' result(s) for "' . $q . '"</p><div class="grid">';
foreach ($rows as $p) echo '<a class="card" href="/product?id=' . $p['id'] . '"><h3>' . htmlspecialchars($p['name']) . '</h3><p>' . htmlspecialchars($p['description']) . '</p><b>' . money($p['price']) . '</b></a>';
echo '</div>';
layout_foot();
