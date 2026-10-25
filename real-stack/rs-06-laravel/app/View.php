<?php
/* A pocket Blade-style template engine, the way Laravel's Blade feels:
     {{ $expr }}    — echo ESCAPED (htmlspecialchars)
     {!! $expr !!}  — echo RAW, unescaped. Powerful, and dangerous: this is
                      where the lab's stored-XSS test lives.
     @if/@foreach   — compiled to plain PHP control structures. */
class View {
    public static function render($name, $data = []){
        $file = LAB_ROOT . '/app/Views/' . str_replace('.', '/', $name) . '.blade.php';
        $tpl = file_get_contents($file);
        $php = self::compile($tpl);
        extract($data);
        ob_start();
        eval('?>' . $php);
        return ob_get_clean();
    }
    public static function compile($tpl){
        // raw echoes FIRST, so the escaped pass cannot see their braces
        $tpl = preg_replace('/\{!!\s*(.+?)\s*!!\}/s', '<?php echo $1; ?>', $tpl);
        $tpl = preg_replace('/\{\{\s*(.+?)\s*\}\}/s', '<?php echo htmlspecialchars((string)($1), ENT_QUOTES, \'UTF-8\'); ?>', $tpl);
        $tpl = preg_replace('/@foreach\s*(\((?:[^()]|\([^()]*\))*\))/', '<?php foreach $1: ?>', $tpl);
        $tpl = preg_replace('/@endforeach/', '<?php endforeach; ?>', $tpl);
        $tpl = preg_replace('/@if\s*(\((?:[^()]|\([^()]*\))*\))/', '<?php if $1: ?>', $tpl);
        $tpl = preg_replace('/@elseif\s*(\((?:[^()]|\([^()]*\))*\))/', '<?php elseif $1: ?>', $tpl);
        $tpl = preg_replace('/@else/', '<?php else: ?>', $tpl);
        $tpl = preg_replace('/@endif/', '<?php endif; ?>', $tpl);
        return $tpl;
    }
}
function view($name, $data = []){
    $data = array_merge(['user' => current_user(), 'title' => 'HexaBilling'], $data);
    $content = View::render($name, $data);
    return View::render('layout', array_merge($data, ['content' => $content]));
}
