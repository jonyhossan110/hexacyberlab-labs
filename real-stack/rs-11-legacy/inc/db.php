<?php
/* Database layer — ported from mysql_* to PDO in 2013 by a contractor.
   The queries were left exactly as they were. Passwords are MD5, because
   "MD5 is encryption" (it is not, and it never was). */
function db(){
    static $pdo = null;
    if ($pdo) return $pdo;
    $cfg = require __DIR__ . '/config.php';
    $fresh = !is_file($cfg['db_file']);
    $pdo = new PDO('sqlite:' . $cfg['db_file']);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    if ($fresh) bt_seed($pdo);
    return $pdo;
}
function bt_seed($pdo){
    $pdo->exec("CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT UNIQUE, fullname TEXT, email TEXT, passhash TEXT, role TEXT, created TEXT)");
    $pdo->exec("CREATE TABLE hotels (id INTEGER PRIMARY KEY, name TEXT, city TEXT, country TEXT, stars INTEGER, price REAL, description TEXT, photo TEXT)");
    $pdo->exec("CREATE TABLE packages (id INTEGER PRIMARY KEY, title TEXT, days INTEGER, price REAL, blurb TEXT)");
    $pdo->exec("CREATE TABLE bookings (id INTEGER PRIMARY KEY, user_id INTEGER, hotel_id INTEGER, guest_name TEXT, guest_email TEXT, phone TEXT, checkin TEXT, checkout TEXT, guests INTEGER, total REAL, status TEXT, notes TEXT)");
    $pdo->exec("CREATE TABLE guestbook (id INTEGER PRIMARY KEY, name TEXT, message TEXT, created TEXT)");
    // username, fullname, email, PLAINTEXT (kept here the way the old dev kept it — in a comment), role
    $users = [
        ['admin',        'Margaret Cole',  'margaret@brighttravel.example', 'sunshine',    'admin',    '2009-03-14'],
        ['siteadmin',    'Installer Account', 'siteadmin@brighttravel.example', 'admin', 'admin',    '2009-03-14'],
        ['tom.clerk',    'Tom Becker',     'tom@brighttravel.example',      'Harbour!2012','staff',    '2011-06-02'],
        ['priya.sharma', 'Priya Sharma',   'priya.sharma@example.in',        'Monsoon#44',  'customer', '2019-04-18'],
        ['diego.f',      'Diego Fernandez','diego.fernandez@example.es',    'Fernweh!7',   'customer', '2020-01-25'],
        ['hannah.w',     'Hannah Wilson',  'hannah.wilson@example.co.uk',   'SkiLodge#3',  'customer', '2018-11-30'],
        ['kenji.t',      'Kenji Tanaka',   'kenji.tanaka@example.jp',       'Sakura*88',   'customer', '2021-07-09'],
        ['amelie.m',     'Amelie Moreau',  'amelie.moreau@example.fr',      'Croissant!5', 'customer', '2017-05-21'],
        ['pavel.n',      'Pavel Novak',    'pavel.novak@example.cz',        'Pivo#2024',   'customer', '2022-02-14'],
    ];
    $st = $pdo->prepare("INSERT INTO users (username,fullname,email,passhash,role,created) VALUES (?,?,?,?,?,?)");
    foreach ($users as $u) $st->execute([$u[0], $u[1], $u[2], md5($u[3]), $u[4], $u[5]]);
    $hotels = [
        ['Azure Palms Resort & Spa','Albufeira','Portugal',5,189.00,'Palm-shaded pools, a cliff lift to the beach, and the Algarve\'s longest breakfast buffet.'],
        ['Hotel Fjordlight','Bergen','Norway',4,142.00,'Harbour-view rooms five minutes from Bryggen wharf; the sauna is included, the weather is not.'],
        ['The Amalfi Lemon House','Amalfi','Italy',4,167.00,'A family-run house above the lemon terraces, with a shuttle down to the cathedral steps.'],
        ['Pension Alpenrose','Innsbruck','Austria',3,84.00,'Wood-panelled rooms, edelweiss in the window boxes, and ski storage by the door.'],
        ['Santorini Cave Suites','Oia','Greece',5,260.00,'Carved-stone suites with private plunge pools facing the caldera sunset.'],
        ['Baltic Grand Hotel','Tallinn','Estonia',4,98.00,'A 1930s grand hotel on the edge of the Old Town, famous for its rye-bread pudding.'],
        ['Loire Chateau Stays','Amboise','France',5,310.00,'Sleep in a real chateau wing; breakfast under a ceiling painted in 1741.'],
        ['Highland Heather Lodge','Inverness','Scotland',3,76.00,'A walker\'s lodge on the Ness with drying room, packed lunches and no midges indoors.'],
        ['Dubrovnik Old Town Rooms','Dubrovnik','Croatia',3,69.00,'Stone rooms inside the city walls, two streets from Stradun.'],
        ['Aurora Igloo Camp','Rovaniemi','Finland',4,205.00,'Glass igloos on a frozen lake shore; the aurora alarm is very serious about its job.'],
    ];
    $st = $pdo->prepare("INSERT INTO hotels (name,city,country,stars,price,description,photo) VALUES (?,?,?,?,?,?,'')");
    foreach ($hotels as $h) $st->execute($h);
    $packages = [
        ['Algarve Sun Week',7,899.00,'Flights, Azure Palms Resort, two boat trips and a pastéis de nata budget you will exceed.'],
        ['Northern Lights Long Weekend',4,1150.00,'Rovaniemi igloos, husky sledding and one very hopeful night of clear sky.'],
        ['Italy by Slow Train',10,1640.00,'Amalfi to Innsbruck by rail, with the Lemon House and Pension Alpenrose as your pillows.'],
        ['Baltic Capitals Mini-Tour',5,720.00,'Tallinn base with day trips, old towns and strong coffee.'],
        ['Greek Island Hopping',9,1420.00,'Santorini cave suites plus ferries you only have to survive, not organise.'],
        ['Loire Chateaux & Wine Roads',6,1380.00,'Chateau stays, cellar doors and a driver who knows every shortcut.'],
    ];
    $st = $pdo->prepare("INSERT INTO packages (title,days,price,blurb) VALUES (?,?,?,?)");
    foreach ($packages as $p) $st->execute($p);
    // user_id, hotel_id, guest_name, guest_email, phone, checkin, checkout, guests, total, status, notes
    $bookings = [
        [4,5,'Priya Sharma','priya.sharma@example.in','+91 98200 44513','2026-11-02','2026-11-09',2,1820.00,'confirmed','Honeymoon — please arrange flowers and a late checkout. Passport verified at office.'],
        [4,1,'Priya Sharma','priya.sharma@example.in','+91 98200 44513','2027-01-15','2027-01-22',2,1323.00,'confirmed','Sea-view room requested, high floor.'],
        [5,3,'Diego Fernandez','diego.fernandez@example.es','+34 612 884 207','2026-12-01','2026-12-05',3,668.00,'confirmed','Travelling with one child (7). Needs a cot.'],
        [6,4,'Hannah Wilson','hannah.wilson@example.co.uk','+44 7700 900 482','2027-02-10','2027-02-14',2,336.00,'paid','Ski passes to be added at reception. Dietary: vegetarian.'],
        [7,10,'Kenji Tanaka','kenji.tanaka@example.jp','+81 90 5550 2214','2026-12-20','2026-12-23',2,615.00,'confirmed','Aurora alarm requested. Anniversary trip.'],
        [8,7,'Amelie Moreau','amelie.moreau@example.fr','+33 6 42 18 90 55','2027-03-05','2027-03-11',2,1860.00,'paid','Wine tour on day 3. Guest is a returning customer since 2017.'],
        [9,6,'Pavel Novak','pavel.novak@example.cz','+420 603 771 208','2026-11-19','2026-11-22',1,294.00,'confirmed','Late arrival, approx 23:40 — key box code sent by SMS.'],
        [5,2,'Diego Fernandez','diego.fernandez@example.es','+34 612 884 207','2027-01-08','2027-01-10',2,284.00,'pending','Awaiting card authorisation.'],
        [6,8,'Hannah Wilson','hannah.wilson@example.co.uk','+44 7700 900 482','2027-04-02','2027-04-06',4,304.00,'confirmed','Two rooms if possible, walking group of four.'],
        [9,9,'Pavel Novak','pavel.novak@example.cz','+420 603 771 208','2026-10-29','2026-10-31',2,138.00,'paid',''],
    ];
    $st = $pdo->prepare("INSERT INTO bookings (user_id,hotel_id,guest_name,guest_email,phone,checkin,checkout,guests,total,status,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?)");
    foreach ($bookings as $b) $st->execute($b);
    $gb = [
        ['Hannah W.','Booked the Alpenrose through BrightTravel in February — Tom sorted our ski passes before we even asked. Lovely people.','2026-08-14'],
        ['Diego F.','The Lemon House was exactly like the photos. First agency that answered the phone on a Sunday.','2026-09-02'],
        ['The Novak Family','Our Dubrovnik rooms were tiny and perfect. See you next summer!','2026-09-19'],
        ['Kenji T.','The aurora alarm woke us at 2am and it was worth every second.','2026-10-05'],
    ];
    $st = $pdo->prepare("INSERT INTO guestbook (name,message,created) VALUES (?,?,?)");
    foreach ($gb as $g) $st->execute($g);
}
