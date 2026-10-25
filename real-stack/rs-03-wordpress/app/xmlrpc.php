<?php
/* xmlrpc.php — the legacy remote-publishing endpoint, still enabled because
   "the mobile app from 2019 uses it". It accepts single credential checks
   and system.multicall batches, and it will happily try passwords all day:
   no lockout, no delay, no CAPTCHA, no log alert. That is the test. */
header('Content-Type: text/xml');
$xml = file_get_contents('php://input');
if ($_SERVER['REQUEST_METHOD'] !== 'POST' || trim($xml) === '') {
    echo 'XML-RPC server accepts POST requests only.';
    return;
}
function xp_esc($s){ return htmlspecialchars($s, ENT_XML1); }
function xp_check($user, $pass){
    $st = db()->prepare("SELECT * FROM users WHERE email = ? OR slug = ?");
    $st->execute([$user, $user]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
    return ($row && $pass === $row['password']) ? $row : null;
}
function xp_try($user, $pass){
    $n = rs_attempt('xmlrpc:' . strtolower($user));
    hp_log('XMLRPC credential guess #' . $n . ' for ' . $user);
    if ($n >= 10) rs_pass('xmlrpc-brute'); // ten guesses accepted — the door never closes
    return xp_check($user, $pass);
}
function xp_fault_struct(){
    return '<value><struct>' .
        '<member><name>faultCode</name><value><int>403</int></value></member>' .
        '<member><name>faultString</name><value><string>Bad login/pass combination.</string></value></member>' .
        '</struct></value>';
}
function xp_success_struct($row){
    return '<value><struct>' .
        '<member><name>blogid</name><value><string>1</string></value></member>' .
        '<member><name>url</name><value><string>http://wanderpress.example/</string></value></member>' .
        '<member><name>blogName</name><value><string>WanderPress</string></value></member>' .
        '<member><name>xmlrpc</name><value><string>http://wanderpress.example/xmlrpc.php</string></value></member>' .
        '</struct></value>';
}
$isMulticall = strpos($xml, 'system.multicall') !== false;
preg_match('#<methodName>([^<]+)</methodName>#', $xml, $mm);
$method = $mm[1] ?? '';
$attempts = []; // list of [username, password]
if ($isMulticall) {
    // inner calls appear as <string>wp.getUsersBlogs</string> followed, in
    // order, by the username and password <string> values of their params
    preg_match_all('#<string>([^<]*)</string>#', $xml, $sm);
    $vals = $sm[1];
    for ($i = 0; $i < count($vals); $i++) {
        if ($vals[$i] === 'wp.getUsersBlogs' || $vals[$i] === 'wp.getProfile') {
            if (isset($vals[$i + 1], $vals[$i + 2])) $attempts[] = [$vals[$i + 1], $vals[$i + 2]];
        }
    }
} elseif ($method === 'system.listMethods') {
    echo '<?xml version="1.0"?><methodResponse><params><param><value><array><data>' .
        '<value><string>system.multicall</string></value><value><string>system.listMethods</string></value>' .
        '<value><string>wp.getUsersBlogs</string></value><value><string>wp.getProfile</string></value>' .
        '</data></array></value></param></params></methodResponse>';
    return;
} elseif ($method === 'wp.getUsersBlogs' || $method === 'wp.getProfile') {
    preg_match_all('#<string>([^<]*)</string>#', $xml, $sm);
    if (isset($sm[1][0], $sm[1][1])) $attempts[] = [$sm[1][0], $sm[1][1]];
}
$results = [];
foreach ($attempts as $a) {
    $row = xp_try($a[0], $a[1]);
    $results[] = $row ? xp_success_struct($row) : xp_fault_struct();
}
if ($isMulticall) {
    $inner = '';
    foreach ($results as $r) {
        // multicall wraps each reply: successes as a one-element array, faults as structs
        $inner .= (strpos($r, 'faultCode') !== false)
            ? $r
            : '<value><array><data>' . $r . '</data></array></value>';
    }
    echo '<?xml version="1.0"?><methodResponse><params><param><value><array><data>' . $inner . '</data></array></value></param></params></methodResponse>';
    return;
}
if ($results) {
    $r = $results[0];
    if (strpos($r, 'faultCode') !== false) {
        echo '<?xml version="1.0"?><methodResponse><fault>' . $r . '</fault></methodResponse>';
    } else {
        echo '<?xml version="1.0"?><methodResponse><params><param><value><array><data>' . $r . '</data></array></value></param></params></methodResponse>';
    }
    return;
}
echo '<?xml version="1.0"?><methodResponse><fault><value><struct>' .
    '<member><name>faultCode</name><value><int>-32601</int></value></member>' .
    '<member><name>faultString</name><value><string>server error. requested method not specified.</string></value></member>' .
    '</struct></value></fault></methodResponse>';
