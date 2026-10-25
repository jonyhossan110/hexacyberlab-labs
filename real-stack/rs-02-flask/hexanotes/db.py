"""Database layer — Python sqlite3 stdlib, one shared helper.
The schema and the seed live here, like the single db.py the startup grew."""
import os
import sqlite3

from .config import DATABASE


def get_db():
    fresh = not os.path.isfile(DATABASE)
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    if fresh:
        from .seed import seed
        seed(conn)
    return conn


def query(sql, params=()):
    conn = get_db()
    try:
        return conn.execute(sql, params).fetchall()
    finally:
        conn.close()


def query_one(sql, params=()):
    rows = query(sql, params)
    return rows[0] if rows else None


def execute(sql, params=()):
    conn = get_db()
    try:
        cur = conn.execute(sql, params)
        conn.commit()
        return cur.lastrowid
    finally:
        conn.close()
