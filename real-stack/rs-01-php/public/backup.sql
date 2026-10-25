-- NordKart database backup, taken 2026-09-30 by the old host
-- left here "temporarily" during the migration
CREATE TABLE users (id INTEGER, name TEXT, email TEXT, password TEXT, role TEXT);
INSERT INTO users VALUES (1,'Ingrid Solberg','ingrid@nordkart.example','Fjord!Admin22','admin');
INSERT INTO users VALUES (2,'Lars Pettersen','lars.pettersen@example.no','Sommer2023!','customer');
-- full dump continues in the real file: every customer, every password, in plaintext
