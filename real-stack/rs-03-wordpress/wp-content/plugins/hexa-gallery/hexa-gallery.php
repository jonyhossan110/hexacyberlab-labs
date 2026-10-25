<?php
/*
Plugin Name: Hexa Gallery
Description: Photo galleries with switchable templates, plus a little
             [badge] shortcode readers can use in comments to flag top tips.
Version: 2.1.3
*/

/* The gallery grid itself. Captions are escaped — this part was written
   carefully, which is what makes the other parts so easy to miss. */
function hg_gallery_html(){
    $items = db()->query("SELECT * FROM media ORDER BY id")->fetchAll(PDO::FETCH_ASSOC);
    $out = '<div class="grid">';
    foreach ($items as $m) {
        $out .= '<div class="card"><div class="thumb">🖼</div><h3>' . htmlspecialchars($m['title']) . '</h3><p>' . htmlspecialchars($m['caption']) . '</p><p class="muted">' . htmlspecialchars($m['file']) . '</p></div>';
    }
    return $out . '</div>';
}

/* Shortcodes inside post content: [hexagallery] becomes the grid. */
function hg_do_shortcode($html){
    return preg_replace_callback('#\[hexagallery[^\]]*\]#', function(){ return hg_gallery_html(); }, $html);
}

/* The [badge] shortcode inside comments. The comment text around it is
   escaped by the core — but the shortcode handler builds its HTML from the
   RAW attribute and RAW content, so markup placed inside a badge is printed
   into the page exactly as written. That is the stored XSS. */
function hg_comment_shortcode($rawBody){
    $badges = [];
    $text = preg_replace_callback('#\[badge(?:\s+color="([^"]*)")?\](.*?)\[/badge\]#s', function($m) use (&$badges){
        $badges[] = '<span class="badge" style="background:' . (!empty($m[1]) ? $m[1] : '#14524a') . '">' . $m[2] . '</span>';
        return "\x00BADGE" . (count($badges) - 1) . "\x00";
    }, $rawBody);
    $text = htmlspecialchars($text);
    foreach ($badges as $i => $html) $text = str_replace("\x00BADGE" . $i . "\x00", $html, $text);
    return nl2br($text);
}

/* The gallery page lets visitors switch templates — and the template name is
   included as a file path, unsanitised. grid.php and list.php are the only
   real templates; the parameter accepts rather more than that. */
function hg_include_template($tpl){
    $file = LAB_ROOT . '/wp-content/plugins/hexa-gallery/templates/' . $tpl;
    if (!is_file($file)) return '<p class="err">Template not found.</p>';
    ob_start();
    include $file;
    $out = ob_get_clean();
    // Detection: a template render may only ever produce gallery HTML. If the
    // output carries the site's secrets, the include walked out of its folder.
    if (strpos($out, 'HEXAPRESS_DB_PASS') !== false || strpos($out, 'WP_DEBUG') !== false) rs_pass('lfi');
    return $out;
}
