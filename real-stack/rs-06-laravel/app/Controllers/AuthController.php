<?php
class AuthController {
    public static function showLogin(){
        echo view('auth.login', ['title' => 'Login', 'intended' => $_GET['intended'] ?? '', 'error' => $_SESSION['flash_error'] ?? null]);
        unset($_SESSION['flash_error']);
    }
    public static function login(){
        $email = $_POST['email'] ?? ''; $pass = $_POST['password'] ?? '';
        $st = db()->prepare("SELECT * FROM users WHERE email = ?");
        $st->execute([$email]);
        $row = $st->fetch(PDO::FETCH_ASSOC);
        if ($row && $pass === $row['password']) {
            $_SESSION['user_id'] = $row['id'];
            $_SESSION['user'] = ['email' => $row['email']];
            hb_log('LOGIN ok ' . $row['email']);
            $intended = $_POST['intended'] ?? '';
            if ($intended !== '') {
                // "redirect to intended" — never validated against this host
                if (preg_match('#^https?://#i', $intended) && parse_url($intended, PHP_URL_HOST) !== ($_SERVER['HTTP_HOST'] ?? '')) {
                    rs_pass('open-redirect');
                    hb_log('REDIRECT external to ' . $intended);
                }
                redirect_to($intended);
            }
            redirect_to('/dashboard');
        }
        /* The throttle that Laravel ships (ThrottlesLogins) was commented out
           "until the demo is over". There is no lockout and no delay — the
           counter below exists for the log, not for defence. */
        $n = rs_attempt('login:' . strtolower($email));
        hb_log('LOGIN fail ' . $email . ' (attempt ' . $n . ', throttle: disabled)');
        if ($n >= 10) rs_pass('brute-force');
        $_SESSION['flash_error'] = 'These credentials do not match our records.';
        redirect_to('/login' . (!empty($_POST['intended']) ? '?intended=' . urlencode($_POST['intended']) : ''));
    }
    public static function showRegister(){ echo view('auth.register', ['title' => 'Register']); }
    public static function register(){
        $name = $_POST['name'] ?? ''; $email = $_POST['email'] ?? ''; $pass = $_POST['password'] ?? ''; $company = $_POST['company'] ?? $name;
        db()->prepare("INSERT INTO workspaces (name, plan) VALUES (?, 'free')")->execute([$company]);
        $wsId = db()->lastInsertId();
        $token = 'hb_live_' . bin2hex(random_bytes(16));
        db()->prepare("INSERT INTO users (workspace_id,name,email,password,role,company,plan,is_admin,api_token) VALUES (?,?,?,?,'owner',?,'free',0,?)")
            ->execute([$wsId, $name, $email, $pass, $company, $token]);
        $_SESSION['user_id'] = db()->lastInsertId();
        $_SESSION['user'] = ['email' => $email];
        redirect_to('/dashboard');
    }
    public static function logout(){
        session_destroy();
        redirect_to('/');
    }
}
