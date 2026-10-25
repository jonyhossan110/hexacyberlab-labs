<?php
/* Hexa Gallery template: list. Included by hg_include_template(). */
$items = db()->query("SELECT * FROM media ORDER BY id")->fetchAll(PDO::FETCH_ASSOC);
foreach ($items as $m) {
    echo '<div class="review"><b>🖼 ' . htmlspecialchars($m['title']) . '</b> — ' . htmlspecialchars($m['caption']) . ' <span class="muted">(' . htmlspecialchars($m['file']) . ')</span></div>';
}
