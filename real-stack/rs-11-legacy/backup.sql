-- BrightTravel database backup — nightly cron, 2026-09-30 02:15
-- Host: localhost  Database: brighttravel  (MySQL 5.1 dump, restored into the SQLite port)
-- Left in the web root "just for the migration weekend". The migration was in 2013.

CREATE TABLE users (id INTEGER, username TEXT, fullname TEXT, email TEXT, passhash TEXT, role TEXT, created TEXT);
INSERT INTO users VALUES (1,'admin','Margaret Cole','margaret@brighttravel.example','0571749e2ac330a7455809c6b0e7af90','admin','2009-03-14');
INSERT INTO users VALUES (2,'siteadmin','Installer Account','siteadmin@brighttravel.example','21232f297a57a5a743894a0e4a801fc3','admin','2009-03-14');
INSERT INTO users VALUES (3,'tom.clerk','Tom Becker','tom@brighttravel.example','411340a12c27eed94b8fb5ead284a5d8','staff','2011-06-02');
INSERT INTO users VALUES (4,'priya.sharma','Priya Sharma','priya.sharma@example.in','efc9e258085a6827f3dda6e5d42010bc','customer','2019-04-18');
INSERT INTO users VALUES (5,'diego.f','Diego Fernandez','diego.fernandez@example.es','8a9420080379cd7c2f829130265e777f','customer','2020-01-25');
INSERT INTO users VALUES (6,'hannah.w','Hannah Wilson','hannah.wilson@example.co.uk','c996a90de02e34f76b313488061aff29','customer','2018-11-30');
INSERT INTO users VALUES (7,'kenji.t','Kenji Tanaka','kenji.tanaka@example.jp','093cf75bb5348fe0ab5f64ab61a104e8','customer','2021-07-09');
INSERT INTO users VALUES (8,'amelie.m','Amelie Moreau','amelie.moreau@example.fr','1bc8f1274de6a4f16d1cc041ada94934','customer','2017-05-21');
INSERT INTO users VALUES (9,'pavel.n','Pavel Novak','pavel.novak@example.cz','a926436c117e998441f3c476c8bdec36','customer','2022-02-14');

CREATE TABLE bookings (id INTEGER, user_id INTEGER, hotel_id INTEGER, guest_name TEXT, guest_email TEXT, phone TEXT, total REAL, status TEXT);
INSERT INTO bookings VALUES (1,4,5,'Priya Sharma','priya.sharma@example.in','+91 98200 44513',1820.00,'confirmed');
INSERT INTO bookings VALUES (7,9,6,'Pavel Novak','pavel.novak@example.cz','+420 603 771 208',294.00,'confirmed');
-- dump continues in the real file: every hotel, every booking, every guest
