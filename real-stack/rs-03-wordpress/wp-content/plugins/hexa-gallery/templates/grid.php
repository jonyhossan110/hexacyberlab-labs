<?php
/* Hexa Gallery template: grid. Included by hg_include_template(). */
$items = db()->query("SELECT * FROM media ORDER BY id")->fetchAll(PDO::FETCH_ASSOC);
echo '<div class="grid">';
foreach ($items as $m) {
    echo '<div class="card"><div class="thumb">🖼</div><h3>' . htmlspecialchars($m['title']) . '</h3><p>' . htmlspecialchars($m['caption']) . '</p><p class="muted">' . htmlspecialchars($m['file']) . '</p></div>';
}
echo '</div>';
