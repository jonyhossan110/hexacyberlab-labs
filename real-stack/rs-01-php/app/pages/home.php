<?php
$featured = db()->query("SELECT * FROM products ORDER BY id LIMIT 8")->fetchAll(PDO::FETCH_ASSOC);
layout_head('Home');
echo '<section class="hero"><h1>Scandinavian home goods, delivered</h1><p>Honest materials, northern light, free returns for 60 days.</p>' .
'<form action="/shop" method="get" class="searchbar"><input name="q" placeholder="Search throws, lamps, kayaking…"><button>Search</button></form></section><div class="grid">';
foreach ($featured as $p) {
    echo '<a class="card" href="/product?id=' . $p['id'] . '"><h3>' . htmlspecialchars($p['name']) . '</h3><p>' . htmlspecialchars($p['description']) . '</p><b>' . money($p['price']) . '</b></a>';
}
echo '</div>';
layout_foot();
