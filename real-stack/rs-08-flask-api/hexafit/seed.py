"""Schema + realistic seed data, created on first run when hexafit.db
is new. Every person, workout and password below is fictional.

Passwords are stored as a bare unsalted SHA-256 hex digest — fast to
check, fast to crack, and (thanks to the user serializer) printed by the
API for anyone who asks. That is the data-exposure test's ammunition.
"""
import hashlib


def hash_pw(text):
    return hashlib.sha256(text.encode()).hexdigest()


USERS = [
    # name, email, password (plaintext here only), is_admin, is_premium,
    # points, bio
    ('Dana Whitfield', 'admin@hexafit.example', 'AdminStride#1', 1, 1, 5000,
     'HexaFit founder. I review every leaderboard personally.'),
    ('Marco Ruiz', 'marco.ruiz@example.com', 'TrailRun!42', 0, 1, 150,
     'Marathoner. Chasing a sub-3 in Valencia this spring.'),
    ('Sara Lindqvist', 'sara.lindqvist@example.se', 'MorningMiles#7', 0, 0,
     340, '5k before breakfast, every day since March.'),
    ('Ken Watanabe', 'ken.watanabe@example.jp', 'SushiPower!3', 0, 0, 90,
     'Lifter. Squat PR 140kg.'),
    ('Aisha Bello', 'aisha.bello@example.ng', 'DesertRose#9', 0, 0, 720,
     'Cyclist. Lagos to Ibadan and back, twice.'),
    ('Tom Becker', 'tom.becker@example.de', 'AlpineAir!5', 0, 0, 45,
     'Trail runner, part-time couch enthusiast.'),
    ('Lena Fischer', 'lena.fischer@example.de', 'RiverStone#2', 0, 0, 100,
     'Rower. On the water before the city wakes.'),
    ('Omar Haddad', 'omar.haddad@example.lb', 'CedarPeak#8', 0, 1, 260,
     'Premium member. Training for the Beirut marathon.'),
]

WORKOUTS = [
    # user index (1-based), type, minutes, calories, km, notes, date
    (2, 'Run', 68, 720, 12.4, 'Tempo run along the river', '2026-10-20'),
    (2, 'Run', 35, 390, 6.1, 'Easy recovery miles', '2026-10-22'),
    (2, 'Strength', 50, 310, 0, 'Legs — squats and deadlifts', '2026-10-23'),
    (3, 'Run', 24, 260, 5.0, 'Morning 5k, new PB', '2026-10-21'),
    (3, 'Yoga', 45, 150, 0, 'Sunrise flow', '2026-10-24'),
    (4, 'Strength', 70, 420, 0, 'Squat day — top set 140kg', '2026-10-19'),
    (4, 'Strength', 55, 360, 0, 'Bench and rows', '2026-10-22'),
    (5, 'Ride', 155, 1450, 62.0, 'Coastal loop, headwind home', '2026-10-18'),
    (5, 'Ride', 90, 880, 38.5, 'Hill repeats', '2026-10-23'),
    (6, 'Run', 41, 430, 7.3, 'Forest trails after rain', '2026-10-20'),
    (7, 'Row', 38, 350, 8.0, '2k pieces on the erg', '2026-10-21'),
    (7, 'Swim', 30, 280, 1.5, 'Technique drills', '2026-10-24'),
    (8, 'Run', 52, 560, 9.6, 'Long slow distance', '2026-10-22'),
    (1, 'Run', 28, 300, 5.2, 'Founder miles — testing the app', '2026-10-15'),
]


def seed(conn):
    conn.executescript("""
    CREATE TABLE users (
        id INTEGER PRIMARY KEY,
        name TEXT,
        email TEXT UNIQUE,
        password_hash TEXT,
        is_admin INTEGER DEFAULT 0,
        is_premium INTEGER DEFAULT 0,
        bio TEXT DEFAULT '',
        avatar_url TEXT DEFAULT '',
        avatar_file TEXT DEFAULT '',
        points INTEGER DEFAULT 0,
        created TEXT DEFAULT '2026-10-01'
    );
    CREATE TABLE workouts (
        id INTEGER PRIMARY KEY,
        user_id INTEGER,
        type TEXT,
        duration_min INTEGER,
        calories INTEGER,
        distance_km REAL,
        notes TEXT,
        performed_on TEXT
    );
    CREATE TABLE redemptions (
        id INTEGER PRIMARY KEY,
        user_id INTEGER,
        item TEXT,
        cost INTEGER,
        balance_before INTEGER,
        created_ts REAL
    );
    CREATE TABLE issued_tokens (
        token_hash TEXT PRIMARY KEY,
        user_id INTEGER,
        created_ts REAL
    );
    """)
    for name, email, pw, admin, premium, points, bio in USERS:
        conn.execute(
            'INSERT INTO users (name, email, password_hash, is_admin, '
            'is_premium, points, bio) VALUES (?, ?, ?, ?, ?, ?, ?)',
            (name, email, hash_pw(pw), admin, premium, points, bio))
    for uid, wtype, mins, kcal, km, notes, day in WORKOUTS:
        conn.execute(
            'INSERT INTO workouts (user_id, type, duration_min, calories, '
            'distance_km, notes, performed_on) VALUES (?, ?, ?, ?, ?, ?, ?)',
            (uid, wtype, mins, kcal, km, notes, day))
    conn.commit()
