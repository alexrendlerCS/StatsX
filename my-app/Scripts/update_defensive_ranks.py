#!/usr/bin/env python3
import os
from dotenv import load_dotenv
import psycopg2

# Load credentials from .env
load_dotenv()

SUPABASE_HOST = os.getenv("SUPABASE_HOST")
SUPABASE_PORT = os.getenv("SUPABASE_PORT")
SUPABASE_DB = os.getenv("SUPABASE_DB")
SUPABASE_USER = os.getenv("SUPABASE_USER")
SUPABASE_PASSWORD = os.getenv("SUPABASE_PASSWORD")

def connect_db():
    return psycopg2.connect(
        host=SUPABASE_HOST,
        port=SUPABASE_PORT,
        dbname=SUPABASE_DB,
        user=SUPABASE_USER,
        password=SUPABASE_PASSWORD,
        sslmode="require"
    )


SQL_FILE_PATH = os.path.join(os.path.dirname(__file__), 'sql', 'create_defense_rankings_view.sql')


def ensure_materialized_view_and_refresh(conn):
    cur = conn.cursor()
    # Read SQL file and run create/refresh
    with open(SQL_FILE_PATH, 'r') as f:
        sql = f.read()

    # Attempt to create/refresh the materialized view. The SQL file uses
    # CREATE MATERIALIZED VIEW IF NOT EXISTS so it is safe to execute.
    try:
        print("Ensuring materialized view 'defense_rankings' exists (SQL file).")
        cur.execute(sql)
        conn.commit()
    except Exception:
        # If creation failed because it already exists with a different signature,
        # fall back to refreshing.
        conn.rollback()
    try:
        print("Refreshing materialized view 'defense_rankings'...")
        cur.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY defense_rankings;")
        conn.commit()
    except Exception:
        conn.rollback()
        print("Concurrent refresh failed; attempting non-concurrent refresh...")
        cur.execute("REFRESH MATERIALIZED VIEW defense_rankings;")
        conn.commit()

    cur.close()


def upsert_into_persistent_table(conn):
    cur = conn.cursor()

    # Create persistent table if it doesn't exist
    cur.execute("""
    CREATE TABLE IF NOT EXISTS defense_rankings_table (
      team_id TEXT NOT NULL,
      position_id TEXT NOT NULL,
      pass_rank INTEGER,
      rush_rank INTEGER,
      receive_rank INTEGER,
      composite_rank NUMERIC,
      last_updated TIMESTAMPTZ DEFAULT now(),
      PRIMARY KEY (team_id, position_id)
    )
    """)

    # Upsert from materialized view
    cur.execute("""
    INSERT INTO defense_rankings_table (team_id, position_id, pass_rank, rush_rank, receive_rank, composite_rank, last_updated)
    SELECT team_id, position_id, pass_rank, rush_rank, receive_rank, composite_rank, now()
    FROM defense_rankings
    ON CONFLICT (team_id, position_id) DO UPDATE SET
      pass_rank = EXCLUDED.pass_rank,
      rush_rank = EXCLUDED.rush_rank,
      receive_rank = EXCLUDED.receive_rank,
      composite_rank = EXCLUDED.composite_rank,
      last_updated = EXCLUDED.last_updated;
    """)

    conn.commit()
    cur.close()


def main():
    conn = connect_db()
    try:
        ensure_materialized_view_and_refresh(conn)
        upsert_into_persistent_table(conn)
        print("Defensive ranks refreshed and persisted to 'defense_rankings_table'.")
    finally:
        conn.close()


if __name__ == '__main__':
    import sys
    # Allow optional scheduling note: run without args to refresh the current rankings
    main()
