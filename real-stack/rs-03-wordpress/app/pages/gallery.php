<?php
/* The gallery page is provided by the Hexa Gallery plugin. Visitors can
   switch the layout template — grid or list — via the template parameter,
   which the plugin passes to an include. See hg_include_template(). */
$tpl = $_GET['template'] ?? 'grid.php';
layout_head('Gallery');
echo '<h1>📷 Photo gallery</h1>' .
'<p class="muted">Layout: <a href="/gallery?template=grid.php">Grid</a> · <a href="/gallery?template=list.php">List</a> — rendered by the Hexa Gallery plugin template <code>' . htmlspecialchars($tpl) . '</code>.</p>' .
hg_include_template($tpl);
layout_foot();
