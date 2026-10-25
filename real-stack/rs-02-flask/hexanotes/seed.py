"""Schema + realistic seed data, created on first run when notes.db is new.

Passwords are hashed with unsalted MD5 — the 2021 way, and one of this
lab's scored problems. Every person, note and password below is fictional.
"""
import hashlib
import os

from .config import ATTACHMENTS


def md5(text):
    return hashlib.md5(text.encode()).hexdigest()


USERS = [
    # name, email, password (plaintext here only, stored as MD5), role, bio
    ('HexaNotes Admin', 'admin@hexanotes.example', 'HexaAdmin#2024!', 'admin',
     'Workspace administrator.'),
    ('Priya Nair', 'priya.nair@example.com', 'PaperTrail!9', 'admin',
     'Co-founder. Product, roadmap, and too many open tabs.'),
    ('Marcus Webb', 'marcus.webb@example.net', 'Sunflower!23', 'user',
     'Support lead. Answers tickets faster than anyone alive.'),
    ('Elena Petrova', 'elena.petrova@example.org', 'BlueWhale#7', 'user',
     'Engineering. Distributed systems and strong tea.'),
    ('David Kim', 'david.kim@example.com', 'Mountain#42', 'user',
     'Design. Keeps the design system honest.'),
    ('Sofia Marino', 'sofia.marino@example.it', 'CoffeeBean!5', 'user',
     'Marketing. Writes the words you read on the landing page.'),
    ("James O'Connor", 'james.oconnor@example.ie', 'NightOwl#88', 'user',
     'Customer success. Works the night shift by choice.'),
    ('Yuki Tanaka', 'tanaka.yuki@example.jp', 'SilverFox!3', 'user',
     'Engineering. Search and sync infrastructure.'),
    ('Anna Kowalska', 'anna.kowalska@example.pl', 'AutumnLeaf#6', 'user',
     'Operations. Spreadsheets fear her.'),
    ('Team Bot', 'bot@hexanotes.example', 'BotPass#000!', 'user',
     'Automated account for workspace announcements.'),
]

NOTES = [
    # title, owner index (1-based into USERS), shared, body, attachment
    ('Welcome to HexaNotes 🎉', 10, 1,
     'Welcome aboard! This shared note is the team\'s front door: the '
     'getting-started guide is attached, and the shortcuts doc lives in '
     'Marcus\'s note. Be kind, write things down, share what helps.',
     'welcome-guide.txt'),
    ('Q4 roadmap — draft', 2, 1,
     'DRAFT — leadership only until Friday. Themes for Q4: mobile capture, '
     'offline mode done properly, and the template gallery Sofia keeps '
     'asking for. Revenue target and the pricing change are in the '
     'attached draft. Do not circulate outside the leadership group yet.',
     'pricing-2026.txt'),
    ('Board update — October', 2, 0,
     'Talking points for Thursday: churn is down to 2.1%, the sync '
     'incident cost us two enterprise pilots, and I need a calmer answer '
     'on security reviews — the last prospect asked about penetration '
     'testing three times. Prepare the one-pager before the call.', None),
    ('Support macros refresh', 3, 1,
     'Refreshed the top twenty support macros. The billing ones now link '
     'to the new help centre. My personal shortcut sheet is attached — '
     'it has the keystrokes the macros were built from.', 'up_3_shortcuts.txt'),
    ('Personal journal — Lisbon trip', 3, 0,
     'Day 3: the tram 28 trick actually works if you board at Graça. '
     'Apartment near Alfama is loud but perfect. Note to self: renew the '
     'passport before March, and stop booking red-eyes before big demos.',
     None),
    ('Salary negotiation prep', 4, 0,
     'CONFIDENTIAL — my own prep. Market band for senior infra in Berlin '
     'is up 12%. Anchors: the sync rewrite I led, on-call load I absorbed '
     'in Q2, two rescues during the March outage. Ask: band top + '
     'conference budget. Walk-away point noted in my paper diary.', None),
    ('Reading list — distributed systems', 4, 1,
     'For the study group: Designing Data-Intensive Applications ch. 5–9, '
     'the Raft paper again (slowly this time), and the postmortem from '
     'the March sync outage. Offsite reading picks are attached.',
     'team-offsite-notes.txt'),
    ('1:1 notes with manager', 5, 0,
     'Growth plan: lead the design-system audit in November, present at '
     'the all-hands in December. Feedback to work on: speak earlier in '
     'crits. Raise in next 1:1 — tooling budget for the icon library.',
     None),
    ('Café recommendations — Milan', 6, 1,
     'For anyone visiting the Milan studio: Pasticceria Marchesi for '
     'espresso, the place on Via Tortona for working lunches, and never '
     'the café by the station. Add yours below the line.', None),
    ('Novel outline — chapter beats', 7, 0,
     'Ch 1: the lighthouse keeper finds the letter. Ch 2: Dublin, 1911. '
     'Ch 3: the sister\'s version contradicts everything. The twist stays '
     'in the paper notebook — some things should not live in a SaaS.',
     None),
    ('Apartment hunting — Kyoto', 8, 0,
     'Shortlist: the machiya near Demachiyanagi (beautiful, cold), the '
     'flat by the Kamo river (practical, boring), and the long shot in '
     'Arashiyama. Viewing appointments the week of the 14th.', None),
    ('HexaNotes tips & shortcuts', 9, 1,
     'Community tips: double-tap Space to quick-capture, drag a note onto '
     'a person to share it, and #later files a note into your evening '
     'review. Add your own tip as a comment-free edit — it is a shared '
     'note, be nice.', None),
]

UPLOAD_FIXTURES = {
    'up_3_shortcuts.txt':
        'Marcus\'s HexaNotes shortcuts\n'
        '------------------------------\n'
        'Ctrl+K ....... command palette\n'
        'Ctrl+Shift+N . new shared note\n'
        'Alt+↑ / Alt+↓  move paragraph\n'
        'Type /date ... insert today\'s date\n',
}


def seed(conn):
    conn.executescript(
        """
        CREATE TABLE users (
            id INTEGER PRIMARY KEY,
            name TEXT, email TEXT UNIQUE, password_hash TEXT,
            role TEXT DEFAULT 'user', bio TEXT DEFAULT '',
            avatar_url TEXT DEFAULT '', website TEXT DEFAULT ''
        );
        CREATE TABLE notes (
            id INTEGER PRIMARY KEY,
            owner_id INTEGER, title TEXT, body TEXT,
            shared INTEGER DEFAULT 0, attach_name TEXT,
            created TEXT DEFAULT (datetime('now'))
        );
        """
    )
    for name, email, password, role, bio in USERS:
        conn.execute(
            'INSERT INTO users (name, email, password_hash, role, bio) '
            'VALUES (?,?,?,?,?)',
            (name, email, md5(password), role, bio))
    for title, owner, shared, body, attach in NOTES:
        conn.execute(
            'INSERT INTO notes (owner_id, title, body, shared, attach_name) '
            'VALUES (?,?,?,?,?)', (owner, title, body, shared, attach))
    uploads = os.path.join(ATTACHMENTS, 'uploads')
    os.makedirs(uploads, exist_ok=True)
    for fname, text in UPLOAD_FIXTURES.items():
        path = os.path.join(uploads, fname)
        if not os.path.isfile(path):
            with open(path, 'w') as f:
                f.write(text)
    conn.commit()
