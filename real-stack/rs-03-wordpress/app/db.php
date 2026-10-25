<?php
/* Database layer. PDO + SQLite so the site runs anywhere with zero setup.
   Tables are named and shaped the way a WordPress-style core names them. */
function db(){
    static $pdo = null;
    if ($pdo) return $pdo;
    $cfg = require __DIR__ . '/config.php';
    $fresh = !is_file($cfg['db_file']);
    $pdo = new PDO('sqlite:' . $cfg['db_file']);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    if ($fresh) hp_seed($pdo);
    return $pdo;
}
function hp_seed($pdo){
    $pdo->exec("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT UNIQUE, password TEXT, role TEXT, slug TEXT, bio TEXT, registered TEXT)");
    $pdo->exec("CREATE TABLE posts (id INTEGER PRIMARY KEY, author_id INTEGER, title TEXT, slug TEXT, excerpt TEXT, content TEXT, status TEXT, created TEXT)");
    $pdo->exec("CREATE TABLE comments (id INTEGER PRIMARY KEY, post_id INTEGER, author TEXT, author_email TEXT, body TEXT, approved INTEGER, created TEXT)");
    $pdo->exec("CREATE TABLE media (id INTEGER PRIMARY KEY, title TEXT, caption TEXT, file TEXT, uploaded_by INTEGER, created TEXT)");
    $pdo->exec("CREATE TABLE hc_messages (id INTEGER PRIMARY KEY, name TEXT, email TEXT, body TEXT, is_private INTEGER, created TEXT)");
    $pdo->exec("CREATE TABLE options (key TEXT PRIMARY KEY, value TEXT)");
    $users = [
        // name, email, password, role, slug, bio
        ['Elena Marsh','elena@wanderpress.example','Summit!Admin24','administrator','elena-marsh','Founder of WanderPress. Former guidebook editor, full-time slow traveller.'],
        ['Mateo Rossi','mateo.rossi@example.it','Dolomiti#7','editor','mateo-rossi','Editor. Mountains, railways, and strong opinions about espresso.'],
        ['Priya Nair','priya.nair@example.in','Monsoon!9','author','priya-nair','Author. Writes about trains, monsoon journeys and street food.'],
        ['Tomas Lindqvist','tomas.lindqvist@example.se','Fjord#Light3','author','tomas-lindqvist','Author. Chases northern light with a film camera.'],
        ['Diego Fuentes','diego.fuentes@example.es','Andes!Pass2','contributor','diego-fuentes','Contributor. Walks long trails and writes them up slowly.'],
        ['Liam O\u{2019}Connor','liam.oconnor@example.ie','Emerald!5','subscriber','liam-oconnor','Reader since 2023. Planning a year on the road.'],
        ['Hana Kim','hana.kim@example.kr','Seoul!Rain8','subscriber','hana-kim','Reader. Collects night-train timetables.'],
        ['Chloe Dubois','chloe.dubois@example.fr','Loire!Sun4','subscriber','chloe-dubois','Reader. Cycles the Loire every spring.'],
        ['Oliver Bennett','oliver.bennett@example.co.uk','Thames!Fog6','subscriber','oliver-bennett','Reader. Mostly here for the rail guides.'],
    ];
    $st = $pdo->prepare("INSERT INTO users (name,email,password,role,slug,bio,registered) VALUES (?,?,?,?,?,?,date('now'))");
    foreach ($users as $u) $st->execute($u);
    $posts = [
        [2,'Packing Light for the Dolomites','packing-light-for-the-dolomites','Seven kilos, five days, one very smug backpack.','Seven kilos is a promise you make to your future self — the one standing at 2,100 metres in sideways rain.\n\nThis is the exact list that got me through five days hut-to-hut: one merino base layer, one change, a shell that actually shells, and boots already broken in at home.\n\nLeave the just-in-case shoes. They are never just in case; they are just in the way.', 'publish', '2026-09-18'],
        [3,'Slow Trains Through the Alps','slow-trains-through-the-alps','The Glacier line at walking pace, and why that is the point.','Everyone wants the fastest train. The Alps reward the opposite.\n\nThe regional services stop at villages the expresses fly through — and those villages have the bakeries.\n\nOur gallery from the September run:\n\n[hexagallery]\n\nBook the window seat on the left heading south. You will thank us at the viaduct.', 'publish', '2026-09-26'],
        [1,'A Food Lover\u{2019}s Guide to Lisbon','a-food-lovers-guide-to-lisbon','Pastéis, tascas, and the custard tart hierarchy.','Lisbon eats late, eats standing up, and eats better than cities three times its price.\n\nStart at a tasca with no menu in English. Order what the table next to you is having. Finish with a ginjinha because everyone does.\n\nThe custard tart hierarchy is real and we will defend it in the comments.', 'publish', '2026-10-02'],
        [4,'Northern Lights on a Budget: Tromsø','northern-lights-on-a-budget-tromso','Aurora season without the aurora-season prices.','The aurora does not check your hotel bill. Stay outside the centre, cook one meal a day, and put the savings into a second night out under the sky.\n\nClear skies matter more than luxury. So does a thermos.\n\nWe tracked three seasons of trips to build the budget table in this post.', 'publish', '2026-10-09'],
        [3,'Island Hopping in Greece Without the Crowds','island-hopping-in-greece','Skip the famous two; the ferry map is bigger than you think.','The ferry map of Greece has over two hundred inhabited stops. Tourists use about six of them.\n\nGo one island past the one in the photos. The harbour tavernas are cheaper, the water is the same blue, and the sunset has room to breathe.\n\nFerry schedules change with the wind — build slack into every hop.', 'publish', '2026-10-13'],
        [5,'What I Learned Walking the Camino','what-i-learned-walking-the-camino','Thirty-four days, one blister strategy, zero regrets.','Day one you walk with your plans. By day ten you walk with your feet, and they have opinions.\n\nPack for the walker you are on day twenty, not the athlete you imagine on day one.\n\nThe albergue dinners are the real itinerary. Everything else is just how you get to them.', 'publish', '2026-10-16'],
    ];
    $st = $pdo->prepare("INSERT INTO posts (author_id,title,slug,excerpt,content,status,created) VALUES (?,?,?,?,?,'publish',?)");
    foreach ($posts as $p) $st->execute([$p[0], $p[1], $p[2], $p[3], $p[4], $p[5]]);
    $comments = [
        [1,'Hana Kim','hana.kim@example.kr','Used this list for the Alta Via in August — the merino tip alone saved my shoulders.','2026-09-19'],
        [1,'Oliver Bennett','oliver.bennett@example.co.uk','Seven kilos including the camera? Asking for my spine.','2026-09-20'],
        [2,'Liam O\u{2019}Connor','liam.oconnor@example.ie','The night-train section is gold. [badge]Top tip[/badge] Book the couchette early, it sells out weeks ahead.','2026-09-27'],
        [2,'Chloe Dubois','chloe.dubois@example.fr','Took the regional line in June because of this post. The bakery in the third village — worth the whole trip.','2026-09-28'],
        [3,'Mateo Rossi','mateo.rossi@example.it','Third place in the tart hierarchy is a hill I will die on, Elena.','2026-10-03'],
        [4,'Hana Kim','hana.kim@example.kr','The thermos advice sounds small until you are at -12C waiting for the sky. Can confirm.','2026-10-10'],
        [5,'Diego Fuentes','diego.fuentes@example.es','One island past — this is exactly how I found my favourite taverna in the Cyclades.','2026-10-14'],
        [6,'Priya Nair','priya.nair@example.in','Walked the Francés in 2024. The albergue dinners line is the truest sentence on this site.','2026-10-17'],
    ];
    $st = $pdo->prepare("INSERT INTO comments (post_id,author,author_email,body,approved,created) VALUES (?,?,?,?,1,?)");
    foreach ($comments as $c) $st->execute($c);
    $media = [
        ['Dolomites at dawn','The Tre Cime trailhead, 6:12 am, before the day buses.','dolomites-dawn.jpg',2],
        ['Glacier line viaduct','The regional train crossing the Landwasser viaduct.','glacier-viaduct.jpg',3],
        ['Lisbon tasca counter','Lunch hour at a tasca in Alfama — order what they are having.','lisbon-tasca.jpg',1],
        ['Aurora over the fjord','Tromsø, night two. No filter, one thermos.','tromso-aurora.jpg',4],
    ];
    $st = $pdo->prepare("INSERT INTO media (title,caption,file,uploaded_by,created) VALUES (?,?,?,?,date('now'))");
    foreach ($media as $m) $st->execute($m);
    $messages = [
        ['Greta Lindholm','greta@fjordhostels.example','We loved your Lisbon guide — may we reprint the tasca list in our hostel newsletter, with credit?',0,'2026-10-05'],
        ['Marco Bellini','marco.bellini@example.it','Booking question: do you run guided Dolomites trips in October, or can you recommend a local guide?',0,'2026-10-08'],
        ['Press Office','press@northrail.example','CONFIDENTIAL — media portal credentials for the press trip: user northrail_press, password FjordPress!9. Please do not publish or forward.',1,'2026-10-11'],
        ['Ana Souza','ana.souza@example.pt','Your packing list saved our honeymoon in the Dolomites. Thank you!',0,'2026-10-15'],
    ];
    $st = $pdo->prepare("INSERT INTO hc_messages (name,email,body,is_private,created) VALUES (?,?,?,?,?)");
    foreach ($messages as $m) $st->execute($m);
    $pdo->prepare("INSERT INTO options (key,value) VALUES ('hc_notify_email','elena@wanderpress.example')")->execute();
    $pdo->prepare("INSERT INTO options (key,value) VALUES ('hc_per_page','10')")->execute();
}
