<?php
/* Database layer. PDO + SQLite so the shop runs anywhere with zero setup —
   the SQL is written exactly the way the original developer wrote it. */
function db(){
    static $pdo = null;
    if ($pdo) return $pdo;
    $cfg = require __DIR__ . '/config.php';
    $fresh = !is_file($cfg['db_file']);
    $pdo = new PDO('sqlite:' . $cfg['db_file']);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    if ($fresh) nk_seed($pdo);
    return $pdo;
}
function nk_seed($pdo){
    $pdo->exec("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT UNIQUE, password TEXT, role TEXT, avatar TEXT, balance REAL)");
    $pdo->exec("CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT, category TEXT, price REAL, description TEXT, stock INTEGER)");
    $pdo->exec("CREATE TABLE orders (id INTEGER PRIMARY KEY, user_id INTEGER, items TEXT, total REAL, status TEXT, created TEXT)");
    $pdo->exec("CREATE TABLE reviews (id INTEGER PRIMARY KEY, product_id INTEGER, user_id INTEGER, author TEXT, body TEXT, created TEXT)");
    $pdo->exec("CREATE TABLE transfers (id INTEGER PRIMARY KEY, from_id INTEGER, to_id INTEGER, amount REAL, created TEXT)");
    $users = [
        ['Ingrid Solberg','ingrid@nordkart.example','Fjord!Admin22','admin',8120.00],
        ['Lars Pettersen','lars.pettersen@example.no','Sommer2023!','customer',1240.50],
        ['Amelia Hart','amelia.hart@example.co.uk','Teatime!42','customer',860.75],
        ['Jonas Weber','jonas.weber@example.de','Waldweg#9','customer',432.10],
        ['Sofia Rossi','sofia.rossi@example.it','Venezia!7','customer',975.00],
        ['Mikkel Lund','mikkel.lund@example.dk','Hygge#2024','customer',2210.40],
        ['Emma Novak','emma.novak@example.cz','Praha!sun5','customer',318.90],
        ['Oliver Reed','oliver.reed@example.co.uk','London#bus8','customer',1544.20],
        ['Freya Nilsen','freya.nilsen@example.no','Bergen!rain3','customer',689.30],
        ['Tomasz Kral','tomasz.kral@example.pl','Gdansk!22','manager',1980.00],
        ['Aisha Rahman','aisha.rahman@example.se','Nordlys!6','customer',745.60],
        ['Noah Berg','noah.berg@example.no','Tromso!night1','customer',259.99],
    ];
    $st = $pdo->prepare("INSERT INTO users (name,email,password,role,balance) VALUES (?,?,?,?,?)");
    foreach ($users as $u) $st->execute($u);
    $products = [
        ['Bergen Wool Throw','Textiles',79.00,'Hand-loomed Norwegian wool throw in deep fjord blue.',34],
        ['Aurland Oak Table Lamp','Lighting',129.50,'Solid oak lamp with a linen shade, made in Aurland.',12],
        ['Svalbard Insulated Flask 1L','Outdoor',34.95,'Keeps drinks hot for 24 hours, even at -20C.',120],
        ['Hardanger Ceramic Dinner Set','Kitchen',189.00,'Sixteen-piece stoneware set, glazed by hand.',8],
        ['Troms Stoneware Mug Pair','Kitchen',28.50,'Two 350ml mugs with a matte aurora glaze.',64],
        ['Geilo Down Duvet — Winter','Bedroom',219.00,'Ethically sourced down, 800 fill power.',15],
        ['Lofoten Rain Jacket','Outdoor',159.00,'Three-layer shell rated for coastal storms.',27],
        ['Roros Picnic Blanket','Outdoor',45.00,'Waxed canvas backing, wool top.',41],
        ['Alta Cedar Candle Set','Home',39.50,'Cedar, juniper and smoke — set of three.',58],
        ['Flam Railway Model Kit','Gifts',54.95,'1:87 scale model of the famous Flam line.',19],
        ['Nordlys Wall Print A2','Home',24.00,'Aurora over Senja, printed on recycled stock.',73],
        ['Voss Granite Coasters','Kitchen',19.95,'Set of four, cut from local granite.',88],
        ['Sognefjord Kayak Tour Voucher','Experiences',249.00,'Full-day guided kayak tour for two.',6],
        ['Heddal Stave Church Puzzle','Gifts',21.50,'1000 pieces, matte finish.',52],
        ['Beitostolen Ski Socks 3-Pack','Outdoor',26.00,'Merino blend, reinforced heel.',97],
        ['Aurora Borealis Tea Blend','Pantry',14.50,'Black tea with bergamot and dried bilberry.',140],
    ];
    $st = $pdo->prepare("INSERT INTO products (name,category,price,description,stock) VALUES (?,?,?,?,?)");
    foreach ($products as $p) $st->execute($p);
    $orders = [
        [2,'Bergen Wool Throw x1',79.00,'delivered','2026-09-28'],
        [2,'Voss Granite Coasters x2',39.90,'delivered','2026-10-02'],
        [3,'Hardanger Ceramic Dinner Set x1',189.00,'shipped','2026-10-11'],
        [4,'Lofoten Rain Jacket x1',159.00,'delivered','2026-09-19'],
        [5,'Alta Cedar Candle Set x2',79.00,'delivered','2026-10-05'],
        [6,'Sognefjord Kayak Tour Voucher x1',249.00,'confirmed','2026-10-14'],
        [7,'Troms Stoneware Mug Pair x1',28.50,'delivered','2026-09-30'],
        [8,'Geilo Down Duvet — Winter x1',219.00,'shipped','2026-10-09'],
        [9,'Aurland Oak Table Lamp x1',129.50,'delivered','2026-10-01'],
        [11,'Nordlys Wall Print A2 x3',72.00,'delivered','2026-10-07'],
        [12,'Svalbard Insulated Flask 1L x2',69.90,'processing','2026-10-15'],
        [3,'Beitostolen Ski Socks 3-Pack x2',52.00,'delivered','2026-10-03'],
    ];
    $st = $pdo->prepare("INSERT INTO orders (user_id,items,total,status,created) VALUES (?,?,?,?,?)");
    foreach ($orders as $o) $st->execute($o);
    $reviews = [
        [1,2,'Lars Pettersen','Survived a whole winter in our cabin. Heavy, warm, perfect.','2026-10-03'],
        [1,9,'Freya Nilsen','The blue is even deeper in person.','2026-10-06'],
        [3,3,'Amelia Hart','Arrived with one chipped plate — support replaced it within days.','2026-10-12'],
        [8,8,'Oliver Reed','Like sleeping inside a cloud. Worth every penny.','2026-10-10'],
    ];
    $st = $pdo->prepare("INSERT INTO reviews (product_id,user_id,author,body,created) VALUES (?,?,?,?,?)");
    foreach ($reviews as $r) $st->execute($r);
}
